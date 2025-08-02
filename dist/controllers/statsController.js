"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomStats = exports.getDashboardStats = exports.getMonthlyStats = exports.getWeeklyStats = exports.getDailyStats = void 0;
const database_1 = require("../utils/database");
const types_1 = require("../types");
const errorHandler_1 = require("../middleware/errorHandler");
exports.getDailyStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, leadStatus } = req.query;
    const today = new Date();
    const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const defaultEndDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;
    const where = {
        createdAt: {
            gte: start,
            lt: end
        }
    };
    if (leadStatus && Object.values(types_1.LeadStatus).includes(leadStatus)) {
        where.status = leadStatus;
    }
    const [totalLeads, leadsByStatus, newLeads, chatMessages] = await Promise.all([
        database_1.prisma.lead.count({ where }),
        database_1.prisma.lead.groupBy({
            by: ['status'],
            where,
            _count: {
                id: true
            }
        }),
        database_1.prisma.lead.count({
            where: {
                ...where,
                createdAt: {
                    gte: start,
                    lt: end
                }
            }
        }),
        database_1.prisma.chatHistory.count({
            where: {
                timestamp: {
                    gte: start,
                    lt: end
                }
            }
        })
    ]);
    const statusCounts = leadsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
    }, {});
    Object.values(types_1.LeadStatus).forEach(status => {
        if (!statusCounts[status]) {
            statusCounts[status] = 0;
        }
    });
    res.json({
        date: start.toISOString().split('T')[0],
        totalLeads,
        newLeads,
        chatMessages,
        leadsByStatus: statusCounts
    });
});
exports.getWeeklyStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, leadStatus } = req.query;
    let startOfWeek;
    let endOfWeek;
    if (startDate && endDate) {
        startOfWeek = new Date(startDate);
        endOfWeek = new Date(endDate);
        endOfWeek.setHours(23, 59, 59, 999);
    }
    else {
        const today = new Date();
        startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
        endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    }
    const where = {
        createdAt: {
            gte: startOfWeek,
            lt: endOfWeek
        }
    };
    if (leadStatus && Object.values(types_1.LeadStatus).includes(leadStatus)) {
        where.status = leadStatus;
    }
    const dailyStats = [];
    const daysDiff = Math.ceil((endOfWeek.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
    for (let i = 0; i < daysDiff; i++) {
        const date = new Date(startOfWeek.getTime() + (i * 24 * 60 * 60 * 1000));
        const nextDate = new Date(date.getTime() + (24 * 60 * 60 * 1000));
        const [dailyLeads, dailyNewLeads, dailyChats] = await Promise.all([
            database_1.prisma.lead.count({
                where: {
                    ...where,
                    createdAt: {
                        gte: date,
                        lt: nextDate
                    }
                }
            }),
            database_1.prisma.lead.count({
                where: {
                    createdAt: {
                        gte: date,
                        lt: nextDate
                    }
                }
            }),
            database_1.prisma.chatHistory.count({
                where: {
                    timestamp: {
                        gte: date,
                        lt: nextDate
                    }
                }
            })
        ]);
        dailyStats.push({
            date: date.toISOString().split('T')[0],
            leads: dailyLeads,
            newLeads: dailyNewLeads,
            chatMessages: dailyChats
        });
    }
    const [totalLeads, leadsByStatus, totalNewLeads, totalChatMessages] = await Promise.all([
        database_1.prisma.lead.count({ where }),
        database_1.prisma.lead.groupBy({
            by: ['status'],
            where,
            _count: {
                id: true
            }
        }),
        database_1.prisma.lead.count({
            where: {
                createdAt: {
                    gte: startOfWeek,
                    lt: endOfWeek
                }
            }
        }),
        database_1.prisma.chatHistory.count({
            where: {
                timestamp: {
                    gte: startOfWeek,
                    lt: endOfWeek
                }
            }
        })
    ]);
    const statusCounts = leadsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
    }, {});
    Object.values(types_1.LeadStatus).forEach(status => {
        if (!statusCounts[status]) {
            statusCounts[status] = 0;
        }
    });
    res.json({
        period: 'week',
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
        totalLeads,
        totalNewLeads,
        totalChatMessages,
        leadsByStatus: statusCounts,
        dailyBreakdown: dailyStats
    });
});
exports.getMonthlyStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, leadStatus } = req.query;
    let startOfMonth;
    let endOfMonth;
    if (startDate && endDate) {
        startOfMonth = new Date(startDate);
        endOfMonth = new Date(endDate);
        endOfMonth.setHours(23, 59, 59, 999);
    }
    else {
        const today = new Date();
        startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    }
    const where = {
        createdAt: {
            gte: startOfMonth,
            lt: endOfMonth
        }
    };
    if (leadStatus && Object.values(types_1.LeadStatus).includes(leadStatus)) {
        where.status = leadStatus;
    }
    const [totalLeads, leadsByStatus, totalNewLeads, totalChatMessages, leadsByDay] = await Promise.all([
        database_1.prisma.lead.count({ where }),
        database_1.prisma.lead.groupBy({
            by: ['status'],
            where,
            _count: {
                id: true
            }
        }),
        database_1.prisma.lead.count({
            where: {
                createdAt: {
                    gte: startOfMonth,
                    lt: endOfMonth
                }
            }
        }),
        database_1.prisma.chatHistory.count({
            where: {
                timestamp: {
                    gte: startOfMonth,
                    lt: endOfMonth
                }
            }
        }),
        database_1.prisma.lead.findMany({
            where: {
                createdAt: {
                    gte: startOfMonth,
                    lt: endOfMonth
                }
            },
            select: {
                createdAt: true
            }
        })
    ]);
    const statusCounts = leadsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
    }, {});
    Object.values(types_1.LeadStatus).forEach(status => {
        if (!statusCounts[status]) {
            statusCounts[status] = 0;
        }
    });
    const leadsByDate = {};
    leadsByDay.forEach((lead) => {
        const date = lead.createdAt.toISOString().split('T')[0];
        leadsByDate[date] = (leadsByDate[date] || 0) + 1;
    });
    const transformedDailyBreakdown = Object.entries(leadsByDate)
        .map(([date, count]) => ({
        date,
        leads: count
    }))
        .sort((a, b) => a.date.localeCompare(b.date));
    res.json({
        period: 'month',
        month: startOfMonth.toISOString().slice(0, 7),
        totalLeads,
        totalNewLeads,
        totalChatMessages,
        leadsByStatus: statusCounts,
        dailyBreakdown: transformedDailyBreakdown
    });
});
exports.getDashboardStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const [todayLeads, todayNewLeads, todayChats, todayLeadsByStatus, weekLeads, weekNewLeads, weekChats, weekProperties, monthLeads, monthNewLeads, monthChats, monthProperties, totalLeads, totalProperties, totalUsers, totalChats, qualifiedLeads, allTimeLeadsByStatus, recentLeads, recentChats] = await Promise.all([
        database_1.prisma.lead.count({
            where: {
                createdAt: { gte: startOfToday }
            }
        }),
        database_1.prisma.lead.count({
            where: {
                createdAt: { gte: startOfToday }
            }
        }),
        database_1.prisma.chatHistory.count({
            where: {
                timestamp: { gte: startOfToday }
            }
        }),
        database_1.prisma.lead.groupBy({
            by: ['status'],
            where: {
                createdAt: { gte: startOfToday }
            },
            _count: { id: true }
        }),
        database_1.prisma.lead.count({
            where: {
                createdAt: { gte: startOfWeek }
            }
        }),
        database_1.prisma.lead.count({
            where: {
                createdAt: { gte: startOfWeek }
            }
        }),
        database_1.prisma.chatHistory.count({
            where: {
                timestamp: { gte: startOfWeek }
            }
        }),
        database_1.prisma.property.count({
            where: {
                createdAt: { gte: startOfWeek },
                isActive: true
            }
        }),
        database_1.prisma.lead.count({
            where: {
                createdAt: { gte: startOfMonth }
            }
        }),
        database_1.prisma.lead.count({
            where: {
                createdAt: { gte: startOfMonth }
            }
        }),
        database_1.prisma.chatHistory.count({
            where: {
                timestamp: { gte: startOfMonth }
            }
        }),
        database_1.prisma.property.count({
            where: {
                createdAt: { gte: startOfMonth },
                isActive: true
            }
        }),
        database_1.prisma.lead.count(),
        database_1.prisma.property.count(),
        database_1.prisma.user.count(),
        database_1.prisma.chatHistory.count(),
        database_1.prisma.lead.count({
            where: {
                status: { in: ['MEDIUM', 'HIGH'] }
            }
        }),
        database_1.prisma.lead.groupBy({
            by: ['status'],
            _count: { id: true }
        }),
        database_1.prisma.lead.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                telegramUserId: true,
                name: true,
                status: true,
                createdAt: true
            }
        }),
        database_1.prisma.chatHistory.findMany({
            take: 5,
            orderBy: { timestamp: 'desc' },
            select: {
                id: true,
                telegramUserId: true,
                message: true,
                messageType: true,
                timestamp: true
            }
        })
    ]);
    const todayStatusCounts = todayLeadsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
    }, {});
    const allTimeStatusCounts = allTimeLeadsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
    }, {});
    Object.values(types_1.LeadStatus).forEach(status => {
        if (!todayStatusCounts[status]) {
            todayStatusCounts[status] = 0;
        }
        if (!allTimeStatusCounts[status]) {
            allTimeStatusCounts[status] = 0;
        }
    });
    const conversionRate = totalLeads > 0 ? Number(((qualifiedLeads / totalLeads) * 100).toFixed(2)) : 0;
    const weekConversion = weekLeads > 0 ? Number(((weekLeads / weekLeads) * 100).toFixed(2)) : 0;
    const monthConversion = monthLeads > 0 ? Number(((monthLeads / monthLeads) * 100).toFixed(2)) : 0;
    res.json({
        today: {
            date: startOfToday.toISOString().split('T')[0],
            totalLeads: todayLeads,
            newLeads: todayNewLeads,
            chatMessages: todayChats,
            leadsByStatus: todayStatusCounts
        },
        thisWeek: {
            leads: weekLeads,
            newLeads: weekNewLeads,
            chatMessages: weekChats,
            properties: weekProperties,
            conversion: weekConversion
        },
        thisMonth: {
            leads: monthLeads,
            newLeads: monthNewLeads,
            chatMessages: monthChats,
            properties: monthProperties,
            conversion: monthConversion
        },
        overall: {
            totalLeads,
            totalProperties,
            totalUsers,
            totalMessages: totalChats,
            conversionRate,
            leadsByStatus: allTimeStatusCounts
        },
        recentActivity: {
            leads: recentLeads,
            chats: recentChats
        }
    });
});
exports.getCustomStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, leadStatus } = req.query;
    if (!startDate || !endDate) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
        res.status(400).json({ error: 'End date must be after start date' });
        return;
    }
    const where = {
        createdAt: {
            gte: start,
            lte: end
        }
    };
    if (leadStatus && Object.values(types_1.LeadStatus).includes(leadStatus)) {
        where.status = leadStatus;
    }
    const [totalLeads, leadsByStatus, totalNewLeads, totalChats, leadsByDay] = await Promise.all([
        database_1.prisma.lead.count({ where }),
        database_1.prisma.lead.groupBy({
            by: ['status'],
            where,
            _count: { id: true }
        }),
        database_1.prisma.lead.count({
            where: {
                createdAt: {
                    gte: start,
                    lte: end
                }
            }
        }),
        database_1.prisma.chatHistory.count({
            where: {
                timestamp: {
                    gte: start,
                    lte: end
                }
            }
        }),
        database_1.prisma.lead.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end
                }
            },
            select: {
                createdAt: true
            }
        })
    ]);
    const statusCounts = leadsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
    }, {});
    Object.values(types_1.LeadStatus).forEach(status => {
        if (!statusCounts[status]) {
            statusCounts[status] = 0;
        }
    });
    const leadsByDate = {};
    leadsByDay.forEach((lead) => {
        const date = lead.createdAt.toISOString().split('T')[0];
        leadsByDate[date] = (leadsByDate[date] || 0) + 1;
    });
    const transformedDailyBreakdown = Object.entries(leadsByDate)
        .map(([date, count]) => ({
        date,
        leads: count
    }))
        .sort((a, b) => a.date.localeCompare(b.date));
    res.json({
        period: 'custom',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        totalLeads,
        totalNewLeads,
        totalChats,
        leadsByStatus: statusCounts,
        dailyBreakdown: transformedDailyBreakdown
    });
});
//# sourceMappingURL=statsController.js.map