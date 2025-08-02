"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeadsByTelegramUserId = exports.deleteLead = exports.updateLead = exports.updateLeadStatus = exports.createLead = exports.getLeadById = exports.getAllLeads = void 0;
const database_1 = require("../utils/database");
const types_1 = require("../types");
const errorHandler_1 = require("../middleware/errorHandler");
const validation_1 = require("../utils/validation");
exports.getAllLeads = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status, startDate, endDate, search, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const where = {};
    if (status && Object.values(types_1.LeadStatus).includes(status)) {
        where.status = status;
    }
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
            where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
            where.createdAt.lte = new Date(endDate);
        }
    }
    if (search) {
        const searchTerm = (0, validation_1.sanitizeInput)(search);
        where.OR = [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { phoneNumber: { contains: searchTerm, mode: 'insensitive' } },
            { telegramUserId: { contains: searchTerm, mode: 'insensitive' } }
        ];
    }
    const [leads, totalCount] = await Promise.all([
        database_1.prisma.lead.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
            include: {
                chatHistory: {
                    orderBy: { timestamp: 'desc' },
                    take: 1
                },
                followUps: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        }),
        database_1.prisma.lead.count({ where })
    ]);
    const leadsWithFollowUpStatus = leads.map(lead => ({
        ...lead,
        followUpStatus: lead.followUps[0]?.status || 'NONE',
        lastInteraction: lead.chatHistory[0]?.timestamp || null
    }));
    res.json({
        leads: leadsWithFollowUpStatus,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            pages: Math.ceil(totalCount / limitNum)
        }
    });
});
exports.getLeadById = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const lead = await database_1.prisma.lead.findUnique({
        where: { id },
        include: {
            chatHistory: {
                orderBy: { timestamp: 'asc' }
            },
            followUps: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });
    if (!lead) {
        res.status(404).json({ error: 'Lead not found' });
        return;
    }
    const leadWithFollowUpStatus = {
        ...lead,
        followUpStatus: lead.followUps[0]?.status || 'NONE',
        lastInteraction: lead.chatHistory[0]?.timestamp || null
    };
    res.json({ lead: leadWithFollowUpStatus });
});
exports.createLead = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { telegramUserId, name, phoneNumber, budget, expectations, language = 'en' } = req.body;
    if (!telegramUserId) {
        res.status(400).json({ error: 'Telegram user ID is required' });
        return;
    }
    if (phoneNumber && !(0, validation_1.validatePhoneNumber)(phoneNumber)) {
        res.status(400).json({ error: 'Invalid phone number format' });
        return;
    }
    const existingLead = await database_1.prisma.lead.findFirst({
        where: { telegramUserId: (0, validation_1.sanitizeInput)(telegramUserId) }
    });
    if (existingLead) {
        const updatedLead = await database_1.prisma.lead.update({
            where: { id: existingLead.id },
            data: {
                ...(name && { name: (0, validation_1.sanitizeInput)(name) }),
                ...(phoneNumber && { phoneNumber: (0, validation_1.sanitizeInput)(phoneNumber) }),
                ...(budget && { budget }),
                ...(expectations && { expectations: (0, validation_1.sanitizeInput)(expectations) }),
                language: (0, validation_1.sanitizeInput)(language)
            }
        });
        res.json({
            message: 'Lead updated successfully',
            lead: updatedLead
        });
        return;
    }
    const lead = await database_1.prisma.lead.create({
        data: {
            telegramUserId: (0, validation_1.sanitizeInput)(telegramUserId),
            ...(name && { name: (0, validation_1.sanitizeInput)(name) }),
            ...(phoneNumber && { phoneNumber: (0, validation_1.sanitizeInput)(phoneNumber) }),
            ...(budget && { budget }),
            ...(expectations && { expectations: (0, validation_1.sanitizeInput)(expectations) }),
            language: (0, validation_1.sanitizeInput)(language)
        }
    });
    res.status(201).json({
        message: 'Lead created successfully',
        lead
    });
});
exports.updateLeadStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !Object.values(types_1.LeadStatus).includes(status)) {
        res.status(400).json({
            error: 'Valid status is required',
            validStatuses: Object.values(types_1.LeadStatus)
        });
        return;
    }
    const lead = await database_1.prisma.lead.findUnique({
        where: { id }
    });
    if (!lead) {
        res.status(404).json({ error: 'Lead not found' });
        return;
    }
    const updatedLead = await database_1.prisma.lead.update({
        where: { id },
        data: { status }
    });
    res.json({
        message: 'Lead status updated successfully',
        lead: updatedLead
    });
});
exports.updateLead = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { name, phoneNumber, budget, expectations, status, language, followUpStatus } = req.body;
    if (phoneNumber && !(0, validation_1.validatePhoneNumber)(phoneNumber)) {
        res.status(400).json({ error: 'Invalid phone number format' });
        return;
    }
    if (status && !Object.values(types_1.LeadStatus).includes(status)) {
        res.status(400).json({
            error: 'Invalid status',
            validStatuses: Object.values(types_1.LeadStatus)
        });
        return;
    }
    const lead = await database_1.prisma.lead.findUnique({
        where: { id }
    });
    if (!lead) {
        res.status(404).json({ error: 'Lead not found' });
        return;
    }
    const updatedLead = await database_1.prisma.lead.update({
        where: { id },
        data: {
            ...(name && { name: (0, validation_1.sanitizeInput)(name) }),
            ...(phoneNumber && { phoneNumber: (0, validation_1.sanitizeInput)(phoneNumber) }),
            ...(budget !== undefined && { budget }),
            ...(expectations && { expectations: (0, validation_1.sanitizeInput)(expectations) }),
            ...(status && { status }),
            ...(language && { language: (0, validation_1.sanitizeInput)(language) })
        }
    });
    if (followUpStatus) {
        const existingFollowUp = await database_1.prisma.followUp.findFirst({
            where: { leadId: id },
            orderBy: { createdAt: 'desc' }
        });
        if (existingFollowUp) {
            await database_1.prisma.followUp.update({
                where: { id: existingFollowUp.id },
                data: {
                    status: followUpStatus,
                    activity: `Follow-up status updated to ${followUpStatus}`,
                    updatedAt: new Date()
                }
            });
        }
        else {
            await database_1.prisma.followUp.create({
                data: {
                    leadId: id,
                    activity: `Follow-up status set to ${followUpStatus}`,
                    status: followUpStatus
                }
            });
        }
    }
    const leadWithFollowUp = await database_1.prisma.lead.findUnique({
        where: { id },
        include: {
            followUps: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    });
    const responseData = {
        ...updatedLead,
        followUpStatus: leadWithFollowUp?.followUps[0]?.status || 'NONE'
    };
    res.json({
        message: 'Lead updated successfully',
        lead: responseData
    });
});
exports.deleteLead = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const lead = await database_1.prisma.lead.findUnique({
        where: { id }
    });
    if (!lead) {
        res.status(404).json({ error: 'Lead not found' });
        return;
    }
    await database_1.prisma.lead.delete({
        where: { id }
    });
    res.json({ message: 'Lead deleted successfully' });
});
exports.getLeadsByTelegramUserId = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { telegramUserId } = req.params;
    const lead = await database_1.prisma.lead.findFirst({
        where: { telegramUserId: (0, validation_1.sanitizeInput)(telegramUserId) },
        include: {
            chatHistory: {
                orderBy: { timestamp: 'desc' },
                take: 10
            }
        }
    });
    if (!lead) {
        res.status(404).json({ error: 'Lead not found' });
        return;
    }
    res.json({ lead });
});
//# sourceMappingURL=leadController.js.map