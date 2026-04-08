// server/routes/authRoutes.js

import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { requireAuth, requireGuest } from "../middleware/authMiddleware.js";

const router = Router();

/**
 * Forgot / Reset password routes
 */
router.get(
  "/forgot-password",
  requireGuest,
  authController.renderForgotPassword,
);
router.post(
  "/forgot-password",
  requireGuest,
  authController.requestPasswordReset,
);
router.get(
  "/reset-password/:token",
  requireGuest,
  authController.renderResetPassword,
);
router.post(
  "/reset-password/:token",
  requireGuest,
  authController.resetPassword,
);

/**
 * Auth routes
 */
router.post("/register", requireGuest, authController.register);
router.post("/login", requireGuest, authController.login);
router.post("/logout", requireAuth, authController.logout);

export default router;
