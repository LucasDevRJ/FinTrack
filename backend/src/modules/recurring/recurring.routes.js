import { Router } from "express";
import { protect } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as recurringController from "./recurring.controller.js";
import {
  confirmOccurrenceSchema,
  createRecurringTransactionSchema,
  idParamSchema,
  skipOccurrenceSchema,
  updateRecurringTransactionSchema,
} from "./recurring.schema.js";

const router = Router();

router.use(protect);

router.post("/", validate(createRecurringTransactionSchema), recurringController.create);
router.get("/", recurringController.list);
// Static path registered before the /:id routes (see backend/CLAUDE.md: Ordem das rotas).
router.get("/pending", recurringController.pending);
router.post(
  "/:id/confirm",
  validate(idParamSchema, "params"),
  validate(confirmOccurrenceSchema),
  recurringController.confirm
);
router.post(
  "/:id/skip",
  validate(idParamSchema, "params"),
  validate(skipOccurrenceSchema),
  recurringController.skip
);
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateRecurringTransactionSchema),
  recurringController.update
);
router.delete("/:id", validate(idParamSchema, "params"), recurringController.remove);

export default router;
