import { Router } from 'express';
import {
  getDailyStats,
  getWeeklyStats,
  getMonthlyStats,
  getDashboardStats,
  getCustomStats
} from '../controllers/statsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All stats routes require authentication
router.use(authenticateToken);

router.get('/daily', getDailyStats);
router.get('/weekly', getWeeklyStats);
router.get('/monthly', getMonthlyStats);
router.get('/dashboard', getDashboardStats);
router.get('/custom', getCustomStats);

export { router as statsRoutes };
