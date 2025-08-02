import { Request, Response } from 'express';
import { prisma } from '../utils/database';
import { AuthRequest, StatsQuery, LeadStatus } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

export const getDailyStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { startDate, endDate, leadStatus }: StatsQuery = req.query;

  const today = new Date();
  const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const defaultEndDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const start = startDate ? new Date(startDate) : defaultStartDate;
  const end = endDate ? new Date(endDate) : defaultEndDate;

  const where: any = {
    createdAt: {
      gte: start,
      lt: end
    }
  };

  if (leadStatus && Object.values(LeadStatus).includes(leadStatus as LeadStatus)) {
    where.status = leadStatus as LeadStatus;
  }

  const [
    totalLeads,
    leadsByStatus,
    newLeads,
    chatMessages
  ] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true
      }
    }),
    prisma.lead.count({
      where: {
        ...where,
        createdAt: {
          gte: start,
          lt: end
        }
      }
    }),
    prisma.chatHistory.count({
      where: {
        timestamp: {
          gte: start,
          lt: end
        }
      }
    })
  ]);

  const statusCounts = leadsByStatus.reduce((acc: Record<string, number>, item: any) => {
    acc[item.status] = item._count.id;
    return acc;
  }, {} as Record<string, number>);

  // Ensure all status types are present
  Object.values(LeadStatus).forEach(status => {
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

export const getWeeklyStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { startDate, endDate, leadStatus }: StatsQuery = req.query;

  // Use provided dates or default to current week
  let startOfWeek: Date;
  let endOfWeek: Date;
  
  if (startDate && endDate) {
    startOfWeek = new Date(startDate);
    endOfWeek = new Date(endDate);
    // Ensure endDate includes the full day
    endOfWeek.setHours(23, 59, 59, 999);
  } else {
    const today = new Date();
    startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  }

  const where: any = {
    createdAt: {
      gte: startOfWeek,
      lt: endOfWeek
    }
  };

  if (leadStatus && Object.values(LeadStatus).includes(leadStatus as LeadStatus)) {
    where.status = leadStatus as LeadStatus;
  }

  // Get daily breakdown for the period
  const dailyStats = [];
  const daysDiff = Math.ceil((endOfWeek.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
  
  for (let i = 0; i < daysDiff; i++) {
    const date = new Date(startOfWeek.getTime() + (i * 24 * 60 * 60 * 1000));
    const nextDate = new Date(date.getTime() + (24 * 60 * 60 * 1000));

    const [dailyLeads, dailyNewLeads, dailyChats] = await Promise.all([
      prisma.lead.count({
        where: {
          ...where,
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      }),
      prisma.lead.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      }),
      prisma.chatHistory.count({
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

  const [
    totalLeads,
    leadsByStatus,
    totalNewLeads,
    totalChatMessages
  ] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true
      }
    }),
    prisma.lead.count({
      where: {
        createdAt: {
          gte: startOfWeek,
          lt: endOfWeek
        }
      }
    }),
    prisma.chatHistory.count({
      where: {
        timestamp: {
          gte: startOfWeek,
          lt: endOfWeek
        }
      }
    })
  ]);

  const statusCounts = leadsByStatus.reduce((acc: Record<string, number>, item: any) => {
    acc[item.status] = item._count.id;
    return acc;
  }, {} as Record<string, number>);

  Object.values(LeadStatus).forEach(status => {
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

export const getMonthlyStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { startDate, endDate, leadStatus }: StatsQuery = req.query;

  // Use provided dates or default to current month
  let startOfMonth: Date;
  let endOfMonth: Date;
  
  if (startDate && endDate) {
    startOfMonth = new Date(startDate);
    endOfMonth = new Date(endDate);
    // Ensure endDate includes the full day
    endOfMonth.setHours(23, 59, 59, 999);
  } else {
    const today = new Date();
    startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  }

  const where: any = {
    createdAt: {
      gte: startOfMonth,
      lt: endOfMonth
    }
  };

  if (leadStatus && Object.values(LeadStatus).includes(leadStatus as LeadStatus)) {
    where.status = leadStatus as LeadStatus;
  }

  const [
    totalLeads,
    leadsByStatus,
    totalNewLeads,
    totalChatMessages,
    leadsByDay
  ] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true
      }
    }),
    prisma.lead.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth
        }
      }
    }),
    prisma.chatHistory.count({
      where: {
        timestamp: {
          gte: startOfMonth,
          lt: endOfMonth
        }
      }
    }),
    prisma.lead.findMany({
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

  const statusCounts = leadsByStatus.reduce((acc: Record<string, number>, item: any) => {
    acc[item.status] = item._count.id;
    return acc;
  }, {} as Record<string, number>);

  Object.values(LeadStatus).forEach(status => {
    if (!statusCounts[status]) {
      statusCounts[status] = 0;
    }
  });

  // Group leads by date
  const leadsByDate: Record<string, number> = {};
  leadsByDay.forEach((lead: any) => {
    const date = lead.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD format
    leadsByDate[date] = (leadsByDate[date] || 0) + 1;
  });

  // Transform to expected format
  const transformedDailyBreakdown = Object.entries(leadsByDate)
    .map(([date, count]) => ({
      date,
      leads: count
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    period: 'month',
    month: startOfMonth.toISOString().slice(0, 7), // YYYY-MM-DD format
    totalLeads,
    totalNewLeads,
    totalChatMessages,
    leadsByStatus: statusCounts,
    dailyBreakdown: transformedDailyBreakdown
  });
});

export const getDashboardStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    // Today's stats
    todayLeads,
    todayNewLeads,
    todayChats,
    todayLeadsByStatus,

    // This week's stats
    weekLeads,
    weekNewLeads,
    weekChats,
    weekProperties,

    // This month's stats
    monthLeads,
    monthNewLeads,
    monthChats,
    monthProperties,

    // Overall stats
    totalLeads,
    totalProperties,
    totalUsers,
    totalChats,
    qualifiedLeads,

    // Lead status distribution (all time)
    allTimeLeadsByStatus,

    // Recent activity
    recentLeads,
    recentChats
  ] = await Promise.all([
    // Today
    prisma.lead.count({
      where: {
        createdAt: { gte: startOfToday }
      }
    }),
    prisma.lead.count({
      where: {
        createdAt: { gte: startOfToday }
      }
    }),
    prisma.chatHistory.count({
      where: {
        timestamp: { gte: startOfToday }
      }
    }),
    prisma.lead.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: startOfToday }
      },
      _count: { id: true }
    }),

    // Week
    prisma.lead.count({
      where: {
        createdAt: { gte: startOfWeek }
      }
    }),
    prisma.lead.count({
      where: {
        createdAt: { gte: startOfWeek }
      }
    }),
    prisma.chatHistory.count({
      where: {
        timestamp: { gte: startOfWeek }
      }
    }),
    prisma.property.count({
      where: {
        createdAt: { gte: startOfWeek },
        isActive: true
      }
    }),

    // Month
    prisma.lead.count({
      where: {
        createdAt: { gte: startOfMonth }
      }
    }),
    prisma.lead.count({
      where: {
        createdAt: { gte: startOfMonth }
      }
    }),
    prisma.chatHistory.count({
      where: {
        timestamp: { gte: startOfMonth }
      }
    }),
    prisma.property.count({
      where: {
        createdAt: { gte: startOfMonth },
        isActive: true
      }
    }),

    // Overall
    prisma.lead.count(),
    prisma.property.count(),
    prisma.user.count(),
    prisma.chatHistory.count(),
    prisma.lead.count({
      where: {
        status: { in: ['MEDIUM', 'HIGH'] }
      }
    }),

    // All time status distribution
    prisma.lead.groupBy({
      by: ['status'],
      _count: { id: true }
    }),

    // Recent activity
    prisma.lead.findMany({
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
    prisma.chatHistory.findMany({
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

  // Process status counts
  const todayStatusCounts = todayLeadsByStatus.reduce((acc: Record<string, number>, item: any) => {
    acc[item.status] = item._count.id;
    return acc;
  }, {} as Record<string, number>);

  const allTimeStatusCounts = allTimeLeadsByStatus.reduce((acc: Record<string, number>, item: any) => {
    acc[item.status] = item._count.id;
    return acc;
  }, {} as Record<string, number>);

  // Ensure all status types are present
  Object.values(LeadStatus).forEach(status => {
    if (!todayStatusCounts[status]) {
      todayStatusCounts[status] = 0;
    }
    if (!allTimeStatusCounts[status]) {
      allTimeStatusCounts[status] = 0;
    }
  });

  // Calculate conversion rate (qualified leads / total leads * 100)
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

export const getCustomStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { startDate, endDate, leadStatus }: StatsQuery = req.query;

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

  const where: any = {
    createdAt: {
      gte: start,
      lte: end
    }
  };

  if (leadStatus && Object.values(LeadStatus).includes(leadStatus as LeadStatus)) {
    where.status = leadStatus as LeadStatus;
  }

  const [
    totalLeads,
    leadsByStatus,
    totalNewLeads,
    totalChats,
    leadsByDay
  ] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: { id: true }
    }),
    prisma.lead.count({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      }
    }),
    prisma.chatHistory.count({
      where: {
        timestamp: {
          gte: start,
          lte: end
        }
      }
    }),
    prisma.lead.findMany({
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

  const statusCounts = leadsByStatus.reduce((acc: Record<string, number>, item: any) => {
    acc[item.status] = item._count.id;
    return acc;
  }, {} as Record<string, number>);

  Object.values(LeadStatus).forEach(status => {
    if (!statusCounts[status]) {
      statusCounts[status] = 0;
    }
  });

  // Group leads by date
  const leadsByDate: Record<string, number> = {};
  leadsByDay.forEach((lead: any) => {
    const date = lead.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD format
    leadsByDate[date] = (leadsByDate[date] || 0) + 1;
  });

  // Transform to expected format
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
