import { Router } from 'express';
import { register, login, getMe, changePassword, requestPasswordChangePin, requestPasswordReset, resetPassword, updateProfile, googleLogin, updateUsername } from '../controllers/authController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', authenticate, getMe);
router.post('/request-change-pin', authenticate, requestPasswordChangePin);
router.put('/change-password', authenticate, changePassword);
router.put('/profile', authenticate, updateProfile);
router.put('/username', authenticate, updateUsername);

// Password recovery routes (no authentication required)
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

export default router;
