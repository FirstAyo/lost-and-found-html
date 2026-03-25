import { Router } from 'express';
import { pageController } from '../controllers/pageController.js';
import { requireAuth, requireGuest } from '../middleware/authMiddleware.js';
import { itemController } from '../controllers/itemController.js';

const router = Router();

router.get('/', pageController.renderHome);
router.get('/browse', itemController.renderBrowse);
router.get('/login', requireGuest, pageController.renderLogin);
router.get('/register', requireGuest, pageController.renderRegister);
router.get('/dashboard', requireAuth, pageController.renderDashboard);

export default router;
