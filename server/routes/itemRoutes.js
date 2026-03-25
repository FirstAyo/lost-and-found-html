import { Router } from "express";
import { itemController } from "../controllers/itemController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { uploadSingleItemImage } from "../middleware/uploadMiddleware.js";

const router = Router();

router.get("/new/lost", requireAuth, itemController.renderCreateLost);
router.get("/new/found", requireAuth, itemController.renderCreateFound);
router.get("/mine", requireAuth, itemController.renderMyItems);
router.get("/:id/edit", requireAuth, itemController.renderEditItem);
router.get("/:id", itemController.renderDetails);
router.post(
  "/:type",
  requireAuth,
  uploadSingleItemImage,
  itemController.createItem,
);
router.post(
  "/:id/edit",
  requireAuth,
  uploadSingleItemImage,
  itemController.handleUploadError,
  itemController.updateItem,
);
router.post("/:id/resolve", requireAuth, itemController.markResolved);
router.post("/:id/delete", requireAuth, itemController.deleteItem);

export default router;
