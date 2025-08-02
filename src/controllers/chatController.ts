import { Request, Response } from 'express';
import { prisma } from '../utils/database';
import { AuthRequest, ChatMessage } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { sanitizeInput } from '../utils/validation';

export const getChatHistoryByTelegramUserId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { telegramUserId } = req.params;
  const { page = '1', limit = '50' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  if (!telegramUserId) {
    res.status(400).json({ error: 'Telegram user ID is required' });
    return;
  }

  const [chatHistory, totalCount, lead] = await Promise.all([
    prisma.chatHistory.findMany({
      where: {
        telegramUserId: sanitizeInput(telegramUserId)
      },
      orderBy: { timestamp: 'asc' },
      skip,
      take: limitNum
    }),
    prisma.chatHistory.count({
      where: {
        telegramUserId: sanitizeInput(telegramUserId)
      }
    }),
    prisma.lead.findFirst({
      where: {
        telegramUserId: sanitizeInput(telegramUserId)
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

export const saveChatMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { 
    telegramUserId, 
    message, 
    response, 
    messageType = 'text', 
    language = 'en' 
  }: ChatMessage = req.body;

  // Validation
  if (!telegramUserId || !message) {
    res.status(400).json({ error: 'Telegram user ID and message are required' });
    return;
  }

  // Find or create lead for this telegram user
  let lead = await prisma.lead.findFirst({
    where: { telegramUserId: sanitizeInput(telegramUserId) }
  });

  let leadId = null;
  if (!lead) {
    // Create a new lead if one doesn't exist
    lead = await prisma.lead.create({
      data: {
        telegramUserId: sanitizeInput(telegramUserId),
        language: sanitizeInput(language)
      }
    });
  }
  leadId = lead.id;

  // Save chat message
  const chatMessage = await prisma.chatHistory.create({
    data: {
      telegramUserId: sanitizeInput(telegramUserId),
      leadId,
      message: sanitizeInput(message),
      ...(response && { response: sanitizeInput(response) }),
      messageType: sanitizeInput(messageType),
      language: sanitizeInput(language)
    }
  });

  res.status(201).json({
    message: 'Chat message saved successfully',
    chatMessage
  });
});

export const getActiveChatSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page = '1', limit = '20', hours = '24' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const hoursNum = parseInt(hours as string, 10);
  const skip = (pageNum - 1) * limitNum;

  // Get chats from the last X hours (default 24)
  const cutoffTime = new Date(Date.now() - hoursNum * 60 * 60 * 1000);

  // Get unique telegram user IDs with recent activity
  const recentChats = await prisma.chatHistory.findMany({
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

  // Group by telegramUserId and get the most recent timestamp for each
  const uniqueSessions = new Map<string, Date>();
  recentChats.forEach((chat: any) => {
    const existing = uniqueSessions.get(chat.telegramUserId);
    if (!existing || chat.timestamp > existing) {
      uniqueSessions.set(chat.telegramUserId, chat.timestamp);
    }
  });

  // Convert to array and sort by last activity
  const sessionList = Array.from(uniqueSessions.entries())
    .map(([telegramUserId, lastActivity]) => ({
      telegramUserId,
      lastActivity
    }))
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
    .slice(skip, skip + limitNum);

  // Get detailed information for each active session
  const activeSessions = await Promise.all(
    sessionList.map(async (session) => {
      const [lead, lastMessage, messageCount] = await Promise.all([
        prisma.lead.findFirst({
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
        prisma.chatHistory.findFirst({
          where: { telegramUserId: session.telegramUserId },
          orderBy: { timestamp: 'desc' },
          select: {
            message: true,
            response: true,
            messageType: true,
            timestamp: true
          }
        }),
        prisma.chatHistory.count({
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
    })
  );

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

export const getChatSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { telegramUserId } = req.params;

  if (!telegramUserId) {
    res.status(400).json({ error: 'Telegram user ID is required' });
    return;
  }

  const [lead, messageCount, firstMessage, lastMessage] = await Promise.all([
    prisma.lead.findFirst({
      where: { telegramUserId: sanitizeInput(telegramUserId) },
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
    prisma.chatHistory.count({
      where: { telegramUserId: sanitizeInput(telegramUserId) }
    }),
    prisma.chatHistory.findFirst({
      where: { telegramUserId: sanitizeInput(telegramUserId) },
      orderBy: { timestamp: 'asc' },
      select: {
        message: true,
        timestamp: true
      }
    }),
    prisma.chatHistory.findFirst({
      where: { telegramUserId: sanitizeInput(telegramUserId) },
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

  // Calculate conversation duration
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

export const searchChatHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { query, telegramUserId, startDate, endDate, messageType, page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  if (!query) {
    res.status(400).json({ error: 'Search query is required' });
    return;
  }

  const where: any = {
    OR: [
      { message: { contains: sanitizeInput(query as string), mode: 'insensitive' } },
      { response: { contains: sanitizeInput(query as string), mode: 'insensitive' } }
    ]
  };

  // Filter by telegram user ID if provided
  if (telegramUserId) {
    where.telegramUserId = sanitizeInput(telegramUserId as string);
  }

  // Filter by date range
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {
      where.timestamp.gte = new Date(startDate as string);
    }
    if (endDate) {
      where.timestamp.lte = new Date(endDate as string);
    }
  }

  // Filter by message type
  if (messageType) {
    where.messageType = sanitizeInput(messageType as string);
  }

  const [searchResults, totalCount] = await Promise.all([
    prisma.chatHistory.findMany({
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
    prisma.chatHistory.count({ where })
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

export const deleteChatHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { telegramUserId } = req.params;

  if (!telegramUserId) {
    res.status(400).json({ error: 'Telegram user ID is required' });
    return;
  }

  const deletedCount = await prisma.chatHistory.deleteMany({
    where: {
      telegramUserId: sanitizeInput(telegramUserId)
    }
  });

  res.json({
    message: 'Chat history deleted successfully',
    deletedCount: deletedCount.count
  });
});
