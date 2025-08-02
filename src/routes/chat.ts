import { Router } from 'express';
import {
  getChatHistoryByTelegramUserId,
  saveChatMessage,
  getActiveChatSessions,
  getChatSummary,
  searchChatHistory,
  deleteChatHistory
} from '../controllers/chatController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /api/chat/message
 * 
 * Input: JSON body containing:
 *   - telegramUserId: string (required)
 *   - message: string (required)
 *   - response?: string (optional bot response)
 *   - messageType?: string (default: "text")
 *   - language?: string (default: "en")
 * 
 * Output: JSON object containing:
 *   - id: string (chat history record ID)
 *   - success: boolean
 * 
 * Functionality:
 *   - Saves chat message to ChatHistory table
 *   - Links to Lead record if exists (by telegramUserId)
 *   - Used by Telegram bot to log conversations
 *   - No authentication required (public endpoint)
 * 
 * Database Operations:
 *   - ChatHistory: INSERT new message record
 *   - Lead: SELECT to link chat to existing lead (optional)
 */
router.post('/message', saveChatMessage);

/**
 * GET /api/chat/history/:telegramUserId
 * 
 * Input: URL parameter:
 *   - telegramUserId: string (Telegram user ID)
 *   Optional query parameters:
 *   - limit?: number (default: 50, max: 100)
 *   - offset?: number (default: 0)
 * 
 * Output: JSON array of chat history objects:
 *   - id: string
 *   - telegramUserId: string
 *   - message: string
 *   - response: string | null
 *   - messageType: string
 *   - language: string
 *   - timestamp: DateTime
 * 
 * Functionality:
 *   - Retrieves chat history for specific Telegram user
 *   - Ordered by timestamp (newest first)
 *   - Supports pagination with limit/offset
 *   - Used by bot to understand conversation context
 * 
 * Database Operations:
 *   - ChatHistory: SELECT with WHERE telegramUserId, ORDER BY timestamp DESC
 */
router.get('/history/:telegramUserId', getChatHistoryByTelegramUserId);

/**
 * GET /api/chat/summary/:telegramUserId
 * 
 * Input: URL parameter:
 *   - telegramUserId: string (Telegram user ID)
 * 
 * Output: JSON object containing:
 *   - telegramUserId: string
 *   - totalMessages: number
 *   - firstMessage: DateTime
 *   - lastMessage: DateTime
 *   - leadInfo?: { id, status, phoneNumber, budget }
 * 
 * Functionality:
 *   - Provides conversation summary for specific user
 *   - Includes message count and date range
 *   - Shows associated lead information if exists
 *   - Used for user analytics and support
 * 
 * Database Operations:
 *   - ChatHistory: COUNT, MIN(timestamp), MAX(timestamp)
 *   - Lead: SELECT associated lead data
 */
router.get('/summary/:telegramUserId', getChatSummary);

/**
 * GET /api/chat/active-sessions
 * 
 * Input: Headers:
 *   - Authorization: Bearer <JWT_TOKEN> (required)
 *   Optional query parameters:
 *   - since?: string (ISO date, default: last 24 hours)
 *   - limit?: number (default: 20)
 * 
 * Output: JSON array of active session objects:
 *   - telegramUserId: string
 *   - lastMessage: DateTime
 *   - messageCount: number
 *   - leadStatus?: string
 * 
 * Functionality:
 *   - Lists users with recent chat activity
 *   - Shows conversation activity for agents/admins
 *   - Identifies hot leads and active conversations
 *   - Protected endpoint requiring authentication
 * 
 * Database Operations:
 *   - ChatHistory: GROUP BY telegramUserId, COUNT, MAX(timestamp)
 *   - Lead: LEFT JOIN for status information
 */
router.get('/active-sessions', authenticateToken, getActiveChatSessions);

/**
 * GET /api/chat/search
 * 
 * Input: Headers:
 *   - Authorization: Bearer <JWT_TOKEN> (required)
 *   Query parameters:
 *   - q: string (search query, required)
 *   - telegramUserId?: string (filter by specific user)
 *   - dateFrom?: string (ISO date)
 *   - dateTo?: string (ISO date)
 *   - limit?: number (default: 50)
 * 
 * Output: JSON array of matching chat records:
 *   - id: string
 *   - telegramUserId: string
 *   - message: string
 *   - response: string | null
 *   - timestamp: DateTime
 *   - leadInfo?: { status, phoneNumber }
 * 
 * Functionality:
 *   - Full-text search across chat messages and responses
 *   - Filters by user, date range, keywords
 *   - Used by agents to find specific conversations
 *   - Protected endpoint requiring authentication
 * 
 * Database Operations:
 *   - ChatHistory: SELECT with WHERE message LIKE or response LIKE
 *   - Lead: LEFT JOIN for additional context
 */
router.get('/search', authenticateToken, searchChatHistory);

/**
 * DELETE /api/chat/history/:telegramUserId
 * 
 * Input: Headers:
 *   - Authorization: Bearer <JWT_TOKEN> (required)
 *   URL parameter:
 *   - telegramUserId: string (Telegram user ID)
 * 
 * Output: JSON object containing:
 *   - success: boolean
 *   - deletedCount: number
 * 
 * Functionality:
 *   - Permanently deletes all chat history for specific user
 *   - Used for GDPR compliance and data cleanup
 *   - Admin-only operation (requires authentication)
 *   - Cannot be undone
 * 
 * Database Operations:
 *   - ChatHistory: DELETE WHERE telegramUserId
 *   - Returns count of deleted records
 */
router.delete('/history/:telegramUserId', authenticateToken, deleteChatHistory);

export { router as chatRoutes };
