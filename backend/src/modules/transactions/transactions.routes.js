import { Router } from "express";
import { protect } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as transactionsController from "./transactions.controller.js";
import {
  createTransactionSchema,
  idParamSchema,
  updateTransactionSchema,
} from "./transactions.schema.js";

const router = Router();

// Applies to every route below: no transaction endpoint works without a
// valid token, since every operation is scoped to req.userId.
router.use(protect);

router.post("/", validate(createTransactionSchema), transactionsController.create);
router.get("/", transactionsController.list);
router.get("/:id", validate(idParamSchema, "params"), transactionsController.getOne);
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateTransactionSchema),
  transactionsController.update
);
router.delete("/:id", validate(idParamSchema, "params"), transactionsController.remove);

export default router;