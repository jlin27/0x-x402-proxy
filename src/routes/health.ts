import { Router } from "express";
import { config, isMainnet } from "../config.js";

export const healthRouter = Router();

// ── GET / ────────────────────────────────────────────────────────────────────
// Service info / x402 discovery metadata
healthRouter.get("/", (_req, res) => {
  res.json({
    name: "0x Swap API — x402 Gateway",
    version: "0.1.0",
    description:
      "Pay-per-request access to the 0x Swap API using x402 HTTP payments (USDC on-chain).",
    network: config.X402_NETWORK,
    isMainnet,
    endpoints: [
      {
        path: "/swap/price",
        method: "GET",
        price: `$${config.PRICE_INDICATIVE_PRICE} USDC`,
        description: "Indicative swap price (no calldata)",
        params: ["chainId", "sellToken", "buyToken", "sellAmount|buyAmount", "taker?"],
      },
      {
        path: "/swap/quote",
        method: "GET",
        price: `$${config.PRICE_FIRM_QUOTE} USDC`,
        description: "Firm quote with Permit2 calldata",
        params: ["chainId", "sellToken", "buyToken", "sellAmount|buyAmount", "taker", "slippageBps?"],
      },
    ],
    facilitator: config.FACILITATOR_URL,
    docs: "https://github.com/your-org/0x-x402-proxy",
  });
});

// ── GET /health ───────────────────────────────────────────────────────────────
healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});
