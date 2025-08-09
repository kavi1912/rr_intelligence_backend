import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest, LeadData, LeadStatus } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { sanitizeInput, validatePhoneNumber } from '../utils/validation';

export const getAllLeads = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { status, startDate, endDate, search, page = '1', limit = '10' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  // Filter by status
  if (status && Object.values(LeadStatus).includes(status as LeadStatus)) {
    where.status = status;
  }

  // Filter by date range
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate as string);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate as string);
    }
  }

  // Search by name or phone number
  if (search) {
    const searchTerm = sanitizeInput(search as string);
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { phoneNumber: { contains: searchTerm, mode: 'insensitive' } },
      { telegramUserId: { contains: searchTerm, mode: 'insensitive' } }
    ];
  }

  const [leads, totalCount] = await Promise.all([
    prisma.lead.findMany({
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
    prisma.lead.count({ where })
  ]);

  // Add followUpStatus to each lead based on latest follow-up
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

export const getLeadById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const lead = await prisma.lead.findUnique({
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

  // Add followUpStatus based on latest follow-up
  const leadWithFollowUpStatus = {
    ...lead,
    followUpStatus: lead.followUps[0]?.status || 'NONE',
    lastInteraction: lead.chatHistory[0]?.timestamp || null
  };

  res.json({ lead: leadWithFollowUpStatus });
});

export const createLead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { telegramUserId, name, phoneNumber, budget, expectations, language = 'en' }: LeadData = req.body;

  // Validation
  if (!telegramUserId) {
    res.status(400).json({ error: 'Telegram user ID is required' });
    return;
  }

  if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
    res.status(400).json({ error: 'Invalid phone number format' });
    return;
  }

  // Check if lead with this Telegram user ID already exists
  const existingLead = await prisma.lead.findFirst({
    where: { telegramUserId: sanitizeInput(telegramUserId) }
  });

  if (existingLead) {
    // Update existing lead with new information
    const updatedLead = await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        ...(name && { name: sanitizeInput(name) }),
        ...(phoneNumber && { phoneNumber: sanitizeInput(phoneNumber) }),
        ...(budget && { budget }),
        ...(expectations && { expectations: sanitizeInput(expectations) }),
        language: sanitizeInput(language)
      }
    });

    res.json({
      message: 'Lead updated successfully',
      lead: updatedLead
    });
    return;
  }

  // Create new lead
  const lead = await prisma.lead.create({
    data: {
      telegramUserId: sanitizeInput(telegramUserId),
      ...(name && { name: sanitizeInput(name) }),
      ...(phoneNumber && { phoneNumber: sanitizeInput(phoneNumber) }),
      ...(budget && { budget }),
      ...(expectations && { expectations: sanitizeInput(expectations) }),
      language: sanitizeInput(language)
    }
  });

  res.status(201).json({
    message: 'Lead created successfully',
    lead
  });
});

export const updateLeadStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  // Validation
  if (!status || !Object.values(LeadStatus).includes(status)) {
    res.status(400).json({ 
      error: 'Valid status is required',
      validStatuses: Object.values(LeadStatus)
    });
    return;
  }

  const lead = await prisma.lead.findUnique({
    where: { id }
  });

  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  const updatedLead = await prisma.lead.update({
    where: { id },
    data: { status }
  });

  res.json({
    message: 'Lead status updated successfully',
    lead: updatedLead
  });
});

export const updateLead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, phoneNumber, budget, expectations, status, language, followUpStatus } = req.body;

  // Validation
  if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
    res.status(400).json({ error: 'Invalid phone number format' });
    return;
  }

  if (status && !Object.values(LeadStatus).includes(status)) {
    res.status(400).json({ 
      error: 'Invalid status',
      validStatuses: Object.values(LeadStatus)
    });
    return;
  }

  const lead = await prisma.lead.findUnique({
    where: { id }
  });

  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  // Update the lead
  const updatedLead = await prisma.lead.update({
    where: { id },
    data: {
      ...(name && { name: sanitizeInput(name) }),
      ...(phoneNumber && { phoneNumber: sanitizeInput(phoneNumber) }),
      ...(budget !== undefined && { budget }),
      ...(expectations && { expectations: sanitizeInput(expectations) }),
      ...(status && { status }),
      ...(language && { language: sanitizeInput(language) })
    }
  });

  // Handle follow-up status separately by creating/updating a follow-up record
  if (followUpStatus) {
    const existingFollowUp = await prisma.followUp.findFirst({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' }
    });

    if (existingFollowUp) {
      // Update existing follow-up
      await prisma.followUp.update({
        where: { id: existingFollowUp.id },
        data: { 
          status: followUpStatus,
          activity: `Follow-up status updated to ${followUpStatus}`,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new follow-up
      await prisma.followUp.create({
        data: {
          leadId: id,
          activity: `Follow-up status set to ${followUpStatus}`,
          status: followUpStatus
        }
      });
    }
  }

  // Return the updated lead with the latest follow-up status
  const leadWithFollowUp = await prisma.lead.findUnique({
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

export const deleteLead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const lead = await prisma.lead.findUnique({
    where: { id }
  });

  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  await prisma.lead.delete({
    where: { id }
  });

  res.json({ message: 'Lead deleted successfully' });
});

export const getLeadsByTelegramUserId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { telegramUserId } = req.params;

  const lead = await prisma.lead.findFirst({
    where: { telegramUserId: sanitizeInput(telegramUserId) },
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

// New endpoint to add sample chat history for testing
export const addSampleChatHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const lead = await prisma.lead.findUnique({
    where: { id }
  });

  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  // Check if chat history already exists
  const existingChat = await prisma.chatHistory.findFirst({
    where: { leadId: id }
  });

  if (existingChat) {
    res.status(400).json({ error: 'Chat history already exists for this lead' });
    return;
  }

  // Create sample chat history
  const sampleChats = [
    {
      leadId: id,
      telegramUserId: lead.telegramUserId,
      message: "Hi! I'm looking for a property to buy.",
      response: "Hello! I'd be happy to help you find the perfect property. What type of property are you looking for?",
      messageType: "text",
      language: lead.language || "en",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
    },
    {
      leadId: id,
      telegramUserId: lead.telegramUserId,
      message: "I'm interested in apartments, preferably with 2-3 bedrooms and a good view.",
      response: "Great! I have several apartments that match your criteria. Let me show you some options with beautiful views and spacious layouts.",
      messageType: "text",
      language: lead.language || "en",
      timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000) // 3.5 hours ago
    },
    {
      leadId: id,
      telegramUserId: lead.telegramUserId,
      message: "What's my budget range?",
      response: "Could you please let me know your budget range? This will help me recommend the most suitable properties for you.",
      messageType: "text", 
      language: lead.language || "en",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
    },
    {
      leadId: id,
      telegramUserId: lead.telegramUserId,
      message: `My budget is around $${lead.budget || 500000}.`,
      response: "Perfect! With that budget, you have some excellent options. I'll send you details of properties that fit your criteria and budget.",
      messageType: "text",
      language: lead.language || "en", 
      timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000) // 2.5 hours ago
    },
    {
      leadId: id,
      telegramUserId: lead.telegramUserId,
      message: "Can you schedule a viewing for me?",
      response: "Absolutely! I'll arrange property viewings for you. When would be a good time for you this week?",
      messageType: "text",
      language: lead.language || "en",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    }
  ];

  // Create all chat records
  await prisma.chatHistory.createMany({
    data: sampleChats
  });

  // Create a sample follow-up
  await prisma.followUp.create({
    data: {
      leadId: id,
      activity: "Schedule property viewing appointments",
      status: "PENDING",
      notes: "Client interested in 2-3 bedroom apartments with good views. Budget confirmed."
    }
  });

  res.json({
    message: 'Sample chat history and follow-up created successfully',
    chatCount: sampleChats.length
  });
});
