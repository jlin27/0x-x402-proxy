import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { config } from "../config.js";
import { buildFacilitatorClient } from "../lib/facilitator.js";

/**
 * Builds the x402 payment middleware with per-route pricing.
 *
 * Route keys use the format "METHOD /path" as required by @x402/express.
 * The price is in USD and settled in USDC on the configured network.
 *
 * To add dynamic pricing (e.g. price by sellAmount), you would instead
 * call paymentMiddleware inside a route-level middleware and pass a
 * custom paymentRequired response builder.
 */
export function buildPaymentMiddleware() {
  const facilitatorClient = buildFacilitatorClient();

  const resourceServer = new x402ResourceServer(facilitatorClient).register(
    config.X402_NETWORK,
    new ExactEvmScheme()
  );

  const payTo = config.PAYMENT_RECIPIENT_ADDRESS as `0x${string}`;
  const network = config.X402_NETWORK;

  return paymentMiddleware(
    {
      // ── Indicative price ──────────────────────────────────────────────────
      "GET /swap/price": {
        accepts: [
          {
            scheme: "exact",
            price: `$${config.PRICE_INDICATIVE_PRICE}`,
            network,
            payTo,
          },
        ],
        description:
          "Indicative swap price via 0x Swap API (no calldata). " +
          "Returns buy/sell amounts and price impact.",
        mimeType: "application/json",
      },

      // ── Firm quote ─────────────────────────────────────────────────────────
      "GET /swap/quote": {
        accepts: [
          {
            scheme: "exact",
            price: `$${config.PRICE_FIRM_QUOTE}`,
            network,
            payTo,
          },
        ],
        description:
          "Firm swap quote via 0x Swap API with AllowanceHolder calldata. " +
          "Ready to submit on-chain. Requires `taker` address.",
        mimeType: "application/json",
      },
    },
    resourceServer
  );
}
