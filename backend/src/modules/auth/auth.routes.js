import { Router } from "express";
import { protect } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import * as authController from "./auth.controller.js";
import {
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.schema.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/demo-login", authController.demoLogin);
router.get("/me", protect, authController.me);
router.delete("/me", protect, validate(deleteAccountSchema), authController.deleteAccount);
router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

export default router;