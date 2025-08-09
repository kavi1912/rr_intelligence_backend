import { Router } from 'express';
import {
  getAllLeads,
  getLeadById,
  createLead,
  updateLeadStatus,
  updateLead,
  deleteLead,
  getLeadsByTelegramUserId,
  addSampleChatHistory
} from '../controllers/leadController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

// Public routes (for Telegram bot)
router.post('/', createLead);
router.get('/telegram/:telegramUserId', getLeadsByTelegramUserId);

// Protected routes (require authentication)
router.get('/', authenticateToken, getAllLeads);
router.get('/:id', authenticateToken, getLeadById);
router.patch('/:id/status', authenticateToken, updateLeadStatus);
router.put('/:id', authenticateToken, updateLead);
router.delete('/:id', authenticateToken, deleteLead);
router.post('/:id/sample-chat', authenticateToken, addSampleChatHistory);

export { router as leadRoutes };
