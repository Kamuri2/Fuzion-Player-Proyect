import { Router } from 'express';
import { register, login, getMe, changePassword, requestPasswordReset, resetPassword, updateProfile, googleLogin } from '../controllers/authController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);
router.put('/profile', authenticate, updateProfile);

// Password recovery routes (no authentication required)
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

export default router;
