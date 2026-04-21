import "dotenv/config";
import express from "express";
import { config } from "./config.js";
import { buildPaymentMiddleware } from "./middleware/x402.js";
import { swapRouter } from "./routes/swap.js";
import { healthRouter } from "./routes/health.js";

const app = express();
app.use(express.json());

// ── Request logging (dev) ─────────────────────────────────────────────────────
if (config.NODE_ENV === "development") {
  app.use((req, _res, next) => {
    const paid = (req.headers["payment-signature"] || req.headers["x-payment"]) ? "💰 paid" : "⬜ unpaid";
    console.log(`${req.method} ${req.path} ${paid}`);
    next();
  });
}

// ── Health / info (no payment required) ──────────────────────────────────────
app.use(healthRouter);

// ── x402 payment middleware (guards /swap/*) ──────────────────────────────────
//
// Any request to /swap/price or /swap/quote without a valid X-Payment header
// will receive a 402 response with payment instructions. The client pays,
// retries with the X-Payment header, and middleware lets it through.
app.use(buildPaymentMiddleware());

// ── Swap routes (only reached after payment is verified) ──────────────────────
app.use("/swap", swapRouter);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(config.PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║       0x Swap API  ×  x402 Payment Gateway               ║
╠══════════════════════════════════════════════════════════╣
║  Server  : http://localhost:${config.PORT}                      ║
║  Network : ${config.X402_NETWORK.padEnd(46)}║
║  Prices  : price=$${String(config.PRICE_INDICATIVE_PRICE).padEnd(10)} quote=$${String(config.PRICE_FIRM_QUOTE).padEnd(19)}║
║  Env     : ${config.NODE_ENV.padEnd(46)}║
╚══════════════════════════════════════════════════════════╝
  `);
});

export default app;
