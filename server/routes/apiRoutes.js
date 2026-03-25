import { Router } from 'express';
import { itemController } from '../controllers/itemController.js';

const router = Router();

router.get('/items', itemController.listItemsApi);
router.get('/items/:id', itemController.getItemApi);

export default router;
