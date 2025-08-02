import { Router } from 'express';
import { 
  mockSignUp, 
  mockSignIn, 
  mockGetProfile,
  mockGetProperties,
  mockGetLeads,
  mockGetStats
} from '../controllers/mockAuthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/signup', mockSignUp);
router.post('/signin', mockSignIn);

// Protected routes
router.get('/profile', authenticateToken, mockGetProfile);

// Mock data routes
router.get('/properties', mockGetProperties);
router.get('/leads', mockGetLeads);
router.get('/stats/overview', mockGetStats);

export { router as mockAuthRoutes };
