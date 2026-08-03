import { Router } from 'express';
import { getStorageStats, scanUploadsBot, getSystemSettings, updateSystemSettings, uploadSystemLogo } from '../controllers/systemController';
import { authenticate, requireAdmin } from '../middlewares/authMiddleware';
import { systemUpload } from '../middlewares/uploadMiddleware';

const router = Router();

// Only admin can view system stats
router.get('/storage', authenticate, requireAdmin, getStorageStats);

// Public route for the scanner bot
router.get('/scan-uploads', scanUploadsBot);

// System settings routes
router.get('/settings', getSystemSettings); // Public, since frontend needs it to style the app
router.put('/settings', authenticate, requireAdmin, updateSystemSettings);
router.post('/upload-logo/:type', authenticate, requireAdmin, systemUpload.single('file'), uploadSystemLogo);

export default router;
