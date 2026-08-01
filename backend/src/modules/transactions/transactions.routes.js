import { Router } from "express";
import { protect } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as transactionsController from "./transactions.controller.js";
import {
  createTransactionSchema,
  idParamSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
} from "./transactions.schema.js";

const router = Router();

// Applies to every route below: no transaction endpoint works without a
// valid token, since every operation is scoped to req.userId.
router.use(protect);

router.post("/", validate(createTransactionSchema), transactionsController.create);
router.get("/", validate(listTransactionsQuerySchema, "query"), transactionsController.list);
// Must come before "/:id" — otherwise Express would match "summary" as the
// :id param, and idParamSchema would reject it as an invalid UUID.
router.get("/summary", transactionsController.summary);
router.get("/:id", validate(idParamSchema, "params"), transactionsController.getOne);
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateTransactionSchema),
  transactionsController.update
);
router.delete("/:id", validate(idParamSchema, "params"), transactionsController.remove);

export default router;