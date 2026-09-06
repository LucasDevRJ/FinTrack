import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./modules/auth/auth.routes.js";
import budgetsRoutes from "./modules/budgets/budgets.routes.js";
import recurringRoutes from "./modules/recurring/recurring.routes.js";
import transactionsRoutes from "./modules/transactions/transactions.routes.js";

const app = express();

// Railway sits behind a reverse proxy, so without this Express (and therefore
// express-rate-limit) sees the proxy's IP for every request instead of the
// client's real one — the rate limiter would then key off a single shared IP.
app.set("trust proxy", 1);

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
app.use("/api/recurring", recurringRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;