import { Router } from "express";
import { protect } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as recurringController from "./recurring.controller.js";
import {
  createRecurringTransactionSchema,
  idParamSchema,
  updateRecurringTransactionSchema,
} from "./recurring.schema.js";

const router = Router();

router.use(protect);

router.post("/", validate(createRecurringTransactionSchema), recurringController.create);
router.get("/", recurringController.list);
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateRecurringTransactionSchema),
  recurringController.update
);
router.delete("/:id", validate(idParamSchema, "params"), recurringController.remove);

export default router;
