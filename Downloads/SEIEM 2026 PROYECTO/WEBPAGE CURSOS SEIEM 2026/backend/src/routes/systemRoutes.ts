import { Router } from 'express';
import { getStorageStats, scanUploadsBot } from '../controllers/systemController';
import { authenticate, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Only admin can view system stats
router.get('/storage', authenticate, requireAdmin, getStorageStats);

// Public route for the scanner bot (or could be authenticated if preferred, but needed on frontend load)
router.get('/scan-uploads', scanUploadsBot);

export default router;
