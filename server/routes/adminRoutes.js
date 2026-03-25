import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/dashboard', adminController.renderDashboard);
router.get('/users', adminController.renderUsers);
router.post('/users/:id/toggle-status', adminController.toggleUserStatus);
router.get('/listings', adminController.renderListings);
router.post('/listings/:id/resolve', adminController.resolveItem);
router.post('/listings/:id/delete', adminController.deleteItem);

export default router;
