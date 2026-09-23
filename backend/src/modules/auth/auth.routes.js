import { Router } from "express";
import { protect } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import * as authController from "./auth.controller.js";
import {
  changeEmailSchema,
  changePasswordSchema,
  confirmEmailChangeSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  updateNameSchema,
  verifyEmailSchema,
} from "./auth.schema.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/demo-login", authLimiter, authController.demoLogin);
router.get("/me", protect, authController.me);
router.delete("/me", protect, validate(deleteAccountSchema), authController.deleteAccount);
router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);
router.post("/verify-email", authLimiter, validate(verifyEmailSchema), authController.verifyEmail);
router.post(
  "/resend-verification",
  authLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification
);
router.patch("/me", protect, validate(updateNameSchema), authController.updateName);
router.post(
  "/me/email",
  protect,
  authLimiter,
  validate(changeEmailSchema),
  authController.requestEmailChange
);
router.post(
  "/confirm-email-change",
  authLimiter,
  validate(confirmEmailChangeSchema),
  authController.confirmEmailChange
);
router.post(
  "/me/password",
  protect,
  authLimiter,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
