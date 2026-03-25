import { Router } from 'express';
import { itemController } from '../controllers/itemController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { uploadSingleItemImage } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/new/lost', requireAuth, itemController.renderCreateLost);
router.get('/new/found', requireAuth, itemController.renderCreateFound);
router.get('/mine', requireAuth, itemController.renderMyItems);
router.get('/:id', itemController.renderDetails);
router.post(
  '/:type',
  requireAuth,
  uploadSingleItemImage,
  itemController.handleUploadError,
  itemController.createItem
);

export default router;
