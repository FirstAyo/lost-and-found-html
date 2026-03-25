import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

router.get('/dashboard', requireAuth, requireRole('admin'), adminController.renderDashboard);

export default router;
