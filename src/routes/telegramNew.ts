import express from 'express';
import { PrismaClient } from '@prisma/client';
import { telegramService } from '../services/telegramService';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/telegram/webhook
 * 
 * Input: Telegram webhook update object containing:
 *   - update_id: number
 *   - message?: { message_id, from: { id, username, language_code }, chat: { id }, text, date }
 *   - callback_query?: { id, from, message, data }
 * 
 * Output: HTTP 200 OK (empty body - required by Telegram API)
 * 
 * Functionality:
 *   1. Receives webhook updates from Telegram when users send messages
 *   2. Validates and parses incoming message data
 *   3. Extracts user info (telegram_user_id, username, language)
 *   4. Routes to AI-powered conversation handler via telegramService
 *   5. Logs all interactions in ChatHistory table
 *   6. Creates/updates Lead records based on conversation analysis
 *   7. Creates FollowUp records for high-intent interactions
 *   8. Handles real estate specific queries (properties, valuations, visits)
 * 
 * Error Handling:
 *   - Always returns 200 OK to prevent Telegram retries
 *   - Logs all errors to console for debugging
 *   - Gracefully handles malformed or unexpected updates
 *   - Ignores non-text messages and commands (handled by service)
 * 
 * Database Operations:
 *   - ChatHistory: INSERT (all messages and responses)
 *   - Lead: UPSERT (create new or update existing by telegramUserId)
 *   - FollowUp: INSERT (for visit requests, high-intent leads)
 *   - Property: SELECT (for property suggestions and availability)
 */
router.post('/webhook', async (req, res) => {
  try {
    console.log('Received webhook update:', JSON.stringify(req.body, null, 2));
    // The actual message processing is now handled by telegramService using polling
    // This webhook endpoint exists for compatibility
    return res.sendStatus(200);
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return res.sendStatus(200);
  }
});

/**
 * GET /api/telegram/bot-info
 * 
 * Input: None (GET request)
 * 
 * Output: JSON object containing:
 *   - status: string ("active" | "inactive")
 *   - bot_username: string
 *   - bot_id: number
 *   - supports_inline_queries: boolean
 * 
 * Functionality:
 *   - Returns current Telegram bot status and configuration
 *   - Used for health checks and debugging
 *   - Shows bot username and capabilities
 * 
 * Error Handling:
 *   - Returns 500 if bot service is not available
 *   - Returns error details in JSON format
 */
router.get('/bot-info', async (req, res) => {
  try {
    const botInfo = await telegramService.bot.getMe();
    res.json({
      status: 'active',
      bot_username: botInfo.username,
      bot_id: botInfo.id,
      is_bot: botInfo.is_bot
    });
  } catch (error) {
    console.error('Error getting bot info:', error);
    res.status(500).json({ 
      error: 'Failed to get bot information',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/telegram/stats
 * 
 * Input: None (GET request, optional query params for date range)
 * 
 * Output: JSON object containing:
 *   - total_users: number
 *   - active_users_today: number
 *   - total_messages: number
 *   - leads_by_status: { HIGH: number, MEDIUM: number, NOT_QUALIFIED: number }
 * 
 * Functionality:
 *   - Returns Telegram bot usage statistics
 *   - Counts unique users, messages, and lead distribution
 *   - Used for analytics and monitoring
 * 
 * Database Operations:
 *   - ChatHistory: COUNT and GROUP BY operations
 *   - Lead: COUNT and GROUP BY status
 */
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, activeUsersToday, totalMessages, leadsByStatus] = await Promise.all([
      // Count unique telegram users
      prisma.chatHistory.findMany({
        distinct: ['telegramUserId'],
        select: { telegramUserId: true }
      }).then(users => users.length),

      // Count users active today
      prisma.chatHistory.findMany({
        where: { timestamp: { gte: today } },
        distinct: ['telegramUserId'],
        select: { telegramUserId: true }
      }).then(users => users.length),

      // Count total messages
      prisma.chatHistory.count(),

      // Count leads by status
      prisma.lead.groupBy({
        by: ['status'],
        _count: { status: true }
      })
    ]);

    const leadDistribution = leadsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      total_users: totalUsers,
      active_users_today: activeUsersToday,
      total_messages: totalMessages,
      leads_by_status: leadDistribution
    });
  } catch (error) {
    console.error('Error getting Telegram stats:', error);
    res.status(500).json({ 
      error: 'Failed to get statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as telegramRoutes };
