import { Router } from "express";
import { protect } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as budgetsController from "./budgets.controller.js";
import {
  createBudgetGoalSchema,
  idParamSchema,
  updateBudgetGoalSchema,
} from "./budgets.schema.js";

const router = Router();

router.use(protect);

router.post("/", validate(createBudgetGoalSchema), budgetsController.create);
router.get("/", budgetsController.list);
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateBudgetGoalSchema),
  budgetsController.update
);
router.delete("/:id", validate(idParamSchema, "params"), budgetsController.remove);

export default router;
