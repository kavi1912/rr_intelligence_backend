import { Router } from 'express';
import {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getUserProperties
} from '../controllers/propertyController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

// Protected routes (require authentication) - must come before /:id
router.get('/user/my-properties', authenticateToken, getUserProperties);
router.post('/', authenticateToken, createProperty);
router.put('/:id', authenticateToken, updateProperty);
router.delete('/:id', authenticateToken, deleteProperty);

// Public routes
router.get('/', getAllProperties);
router.get('/:id', getPropertyById);

export { router as propertyRoutes };
