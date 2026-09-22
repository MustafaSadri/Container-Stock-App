import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { containersRouter } from "./routes/containers";
import { productsRouter } from "./routes/products";
import { stockRouter } from "./routes/stock";
import { transactionsRouter } from "./routes/transactions";
import { dashboardRouter } from "./routes/dashboard";
import { reportsRouter } from "./routes/reports";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/containers", containersRouter);
app.use("/api/products", productsRouter);
app.use("/api/stock", stockRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reports", reportsRouter);

// Serve the built frontend in production (single-service deployment)
const clientDist = path.join(__dirname, "..", "public");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
