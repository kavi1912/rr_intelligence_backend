"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteChatHistory = exports.searchChatHistory = exports.getChatSummary = exports.getActiveChatSessions = exports.saveChatMessage = exports.getChatHistoryByTelegramUserId = void 0;
const database_1 = require("../utils/database");
const errorHandler_1 = require("../middleware/errorHandler");
const validation_1 = require("../utils/validation");
exports.getChatHistoryByTelegramUserId = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { telegramUserId } = req.params;
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    if (!telegramUserId) {
        res.status(400).json({ error: 'Telegram user ID is required' });
        return;
    }
    const [chatHistory, totalCount, lead] = await Promise.all([
        database_1.prisma.chatHistory.findMany({
            where: {
                telegramUserId: (0, validation_1.sanitizeInput)(telegramUserId)
            },
            orderBy: { timestamp: 'asc' },
            skip,
            take: limitNum
        }),
        database_1.prisma.chatHistory.count({
            where: {
                telegramUserId: (0, validation_1.sanitizeInput)(telegramUserId)
            }
        }),
        database_1.prisma.lead.findFirst({
            where: {
                telegramUserId: (0, validation_1.sanitizeInput)(telegramUserId)
            },
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                status: true,
                language: true,
                createdAt: true
            }
        })
    ]);
    res.json({
        telegramUserId,
        lead,
        chatHistory,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            pages: Math.ceil(totalCount / limitNum)
        }
    });
});
exports.saveChatMessage = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { telegramUserId, message, response, messageType = 'text', language = 'en' } = req.body;
    if (!telegramUserId || !message) {
        res.status(400).json({ error: 'Telegram user ID and message are required' });
        return;
    }
    let lead = await database_1.prisma.lead.findFirst({
        where: { telegramUserId: (0, validation_1.sanitizeInput)(telegramUserId) }
    });
    let leadId = null;
    if (!lead) {
        lead = await database_1.prisma.lead.create({
            data: {
                telegramUserId: (0, validation_1.sanitizeInput)(telegramUserId),
                language: (0, validation_1.sanitizeInput)(language)
            }
        });
    }
    leadId = lead.id;
    const chatMessage = await database_1.prisma.chatHistory.create({
        data: {
            telegramUserId: (0, validation_1.sanitizeInput)(telegramUserId),
            leadId,
            message: (0, validation_1.sanitizeInput)(message),
            ...(response && { response: (0, validation_1.sanitizeInput)(response) }),
            messageType: (0, validation_1.sanitizeInput)(messageType),
            language: (0, validation_1.sanitizeInput)(language)
        }
    });
    res.status(201).json({
        message: 'Chat message saved successfully',
        chatMessage
    });
});
exports.getActiveChatSessions = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { page = '1', limit = '20', hours = '24' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const hoursNum = parseInt(hours, 10);
    const skip = (pageNum - 1) * limitNum;
    const cutoffTime = new Date(Date.now() - hoursNum * 60 * 60 * 1000);
    const recentChats = await database_1.prisma.chatHistory.findMany({
        where: {
            timestamp: {
                gte: cutoffTime
            }
        },
        select: {
            telegramUserId: true,
            timestamp: true
        },
        orderBy: {
            timestamp: 'desc'
        }
    });
    const uniqueSessions = new Map();
    recentChats.forEach((chat) => {
        const existing = uniqueSessions.get(chat.telegramUserId);
        if (!existing || chat.timestamp > existing) {
            uniqueSessions.set(chat.telegramUserId, chat.timestamp);
        }
    });
    const sessionList = Array.from(uniqueSessions.entries())
        .map(([telegramUserId, lastActivity]) => ({
        telegramUserId,
        lastActivity
    }))
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
        .slice(skip, skip + limitNum);
    const activeSessions = await Promise.all(sessionList.map(async (session) => {
        const [lead, lastMessage, messageCount] = await Promise.all([
            database_1.prisma.lead.findFirst({
                where: { telegramUserId: session.telegramUserId },
                select: {
                    id: true,
                    name: true,
                    phoneNumber: true,
                    status: true,
                    language: true,
                    createdAt: true
                }
            }),
            database_1.prisma.chatHistory.findFirst({
                where: { telegramUserId: session.telegramUserId },
                orderBy: { timestamp: 'desc' },
                select: {
                    message: true,
                    response: true,
                    messageType: true,
                    timestamp: true
                }
            }),
            database_1.prisma.chatHistory.count({
                where: {
                    telegramUserId: session.telegramUserId,
                    timestamp: {
                        gte: cutoffTime
                    }
                }
            })
        ]);
        return {
            telegramUserId: session.telegramUserId,
            lead,
            lastActivity: session.lastActivity,
            lastMessage,
            messageCount,
            isActive: true
        };
    }));
    const totalActiveSessions = uniqueSessions.size;
    res.json({
        activeSessions,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalActiveSessions,
            pages: Math.ceil(totalActiveSessions / limitNum)
        },
        timeFrame: {
            hours: hoursNum,
            cutoffTime
        }
    });
});
exports.getChatSummary = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { telegramUserId } = req.params;
    if (!telegramUserId) {
        res.status(400).json({ error: 'Telegram user ID is required' });
        return;
    }
    const [lead, messageCount, firstMessage, lastMessage] = await Promise.all([
        database_1.prisma.lead.findFirst({
            where: { telegramUserId: (0, validation_1.sanitizeInput)(telegramUserId) },
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                budget: true,
                expectations: true,
                status: true,
                language: true,
                createdAt: true,
                updatedAt: true
            }
        }),
        database_1.prisma.chatHistory.count({
            where: { telegramUserId: (0, validation_1.sanitizeInput)(telegramUserId) }
        }),
        database_1.prisma.chatHistory.findFirst({
            where: { telegramUserId: (0, validation_1.sanitizeInput)(telegramUserId) },
            orderBy: { timestamp: 'asc' },
            select: {
                message: true,
                timestamp: true
            }
        }),
        database_1.prisma.chatHistory.findFirst({
            where: { telegramUserId: (0, validation_1.sanitizeInput)(telegramUserId) },
            orderBy: { timestamp: 'desc' },
            select: {
                message: true,
                response: true,
                timestamp: true
            }
        })
    ]);
    if (!lead) {
        res.status(404).json({ error: 'Lead not found for this Telegram user' });
        return;
    }
    let conversationDuration = null;
    if (firstMessage && lastMessage && firstMessage.timestamp !== lastMessage.timestamp) {
        conversationDuration = lastMessage.timestamp.getTime() - firstMessage.timestamp.getTime();
    }
    res.json({
        telegramUserId,
        lead,
        chatSummary: {
            totalMessages: messageCount,
            firstMessageAt: firstMessage?.timestamp,
            lastMessageAt: lastMessage?.timestamp,
            conversationDurationMs: conversationDuration,
            firstMessage: firstMessage?.message,
            lastMessage: lastMessage?.message,
            lastResponse: lastMessage?.response
        }
    });
});
exports.searchChatHistory = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { query, telegramUserId, startDate, endDate, messageType, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
    }
    const where = {
        OR: [
            { message: { contains: (0, validation_1.sanitizeInput)(query), mode: 'insensitive' } },
            { response: { contains: (0, validation_1.sanitizeInput)(query), mode: 'insensitive' } }
        ]
    };
    if (telegramUserId) {
        where.telegramUserId = (0, validation_1.sanitizeInput)(telegramUserId);
    }
    if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) {
            where.timestamp.gte = new Date(startDate);
        }
        if (endDate) {
            where.timestamp.lte = new Date(endDate);
        }
    }
    if (messageType) {
        where.messageType = (0, validation_1.sanitizeInput)(messageType);
    }
    const [searchResults, totalCount] = await Promise.all([
        database_1.prisma.chatHistory.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            skip,
            take: limitNum,
            include: {
                lead: {
                    select: {
                        id: true,
                        name: true,
                        status: true
                    }
                }
            }
        }),
        database_1.prisma.chatHistory.count({ where })
    ]);
    res.json({
        searchQuery: query,
        results: searchResults,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            pages: Math.ceil(totalCount / limitNum)
        }
    });
});
exports.deleteChatHistory = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { telegramUserId } = req.params;
    if (!telegramUserId) {
        res.status(400).json({ error: 'Telegram user ID is required' });
        return;
    }
    const deletedCount = await database_1.prisma.chatHistory.deleteMany({
        where: {
            telegramUserId: (0, validation_1.sanitizeInput)(telegramUserId)
        }
    });
    res.json({
        message: 'Chat history deleted successfully',
        deletedCount: deletedCount.count
    });
});
//# sourceMappingURL=chatController.js.map