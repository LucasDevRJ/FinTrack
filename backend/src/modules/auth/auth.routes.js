import { Router } from "express";
import { protect } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as authController from "./auth.controller.js";
import { deleteAccountSchema, loginSchema, registerSchema } from "./auth.schema.js";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.get("/me", protect, authController.me);
router.delete("/me", protect, validate(deleteAccountSchema), authController.deleteAccount);

export default router;