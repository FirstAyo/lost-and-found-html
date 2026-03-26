import { Router } from "express";
import { itemController } from "../controllers/itemController.js";

const router = Router();

router.get("/items", itemController.listItemsApi);
router.get("/items/:id", itemController.getItemApi);
router.get("/location-preview", itemController.previewCampusLocationApi);

export default router;
