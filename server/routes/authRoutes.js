import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { requireAuth, requireGuest } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', requireGuest, authController.register);
router.post('/login', requireGuest, authController.login);
router.post('/logout', requireAuth, authController.logout);

export default router;
