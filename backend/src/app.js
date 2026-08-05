import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./modules/auth/auth.routes.js";
import budgetsRoutes from "./modules/budgets/budgets.routes.js";
import transactionsRoutes from "./modules/transactions/transactions.routes.js";

const app = express();

app.use(helmet());
// exposedHeaders lets the frontend read Content-Disposition off the CSV
// export response — browsers hide response headers from JS by default
// unless the server explicitly allow-lists them via CORS.
app.use(cors({ origin: process.env.CORS_ORIGIN, exposedHeaders: ["Content-Disposition"] }));
app.use(express.json());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/budgets", budgetsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;