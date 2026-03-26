import { Router } from "express";
import { itemController } from "../controllers/itemController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { uploadSingleItemImage } from "../middleware/uploadMiddleware.js";

const router = Router();

router.get("/new/lost", requireAuth, itemController.renderCreateLost);
router.get("/new/found", requireAuth, itemController.renderCreateFound);
router.get("/mine", requireAuth, itemController.renderMyItems);

/**
 * EDIT FLOW
 * ----------------------------------------
 * Reuses the same post-item.ejs page.
 */
router.get("/edit/:id", requireAuth, itemController.renderEditItem);
router.post(
  "/edit/:id",
  requireAuth,
  uploadSingleItemImage,
  itemController.handleUploadError,
  itemController.updateItem,
);

/**
 * OWNER ACTIONS
 */
router.post("/resolve/:id", requireAuth, itemController.markAsResolved);
router.post("/delete/:id", requireAuth, itemController.deleteItem);

/**
 * DETAILS PAGE
 * Keep this near the bottom so it does not swallow
 * more specific routes like /edit/:id
 */
router.get("/:id", itemController.renderDetails);

/**
 * CREATE ITEM
 */
router.post(
  "/:type",
  requireAuth,
  uploadSingleItemImage,
  itemController.handleUploadError,
  itemController.createItem,
);

export default router;
