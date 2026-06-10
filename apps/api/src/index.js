import cors from "cors";
import express from "express";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { cacheBackend } from "./lib/cache.js";
import * as okx from "./lib/okx.js";
import { getContractAddress } from "./lib/gateway-key.js";
import v1Routes from "./routes/v1.js";
import x402Routes from "./routes/x402.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../../.env") });

const app = express();
const PORT = Number(process.env.PORT || 3847);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "h-rails-api",
    brand: "H Rails",
    protocol: "Agent Payments Protocol",
    network: "X Layer (eip155:196)",
    okxConfigured: okx.hasOkxKeys(),
    cache: cacheBackend(),
    gatewayContract: getContractAddress(),
    version: "0.2.0",
  });
});

app.use("/api/v1", v1Routes);
app.use("/api", v1Routes);
app.use("/api/x402", x402Routes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`H Rails API  http://localhost:${PORT}`);
  console.log(`  Dashboard    /api/dashboard`);
  console.log(`  Gateway v1   /api/v1/*  (x-api-key required)`);
  console.log(`  x402         /api/x402/*`);
});