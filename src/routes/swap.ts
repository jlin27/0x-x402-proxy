import { Router, Request, Response } from "express";
import {
  getIndicativePrice,
  getFirmQuote,
  normalizeZeroXError,
  SwapPriceParams,
  SwapQuoteParams,
} from "../lib/zerox.js";

export const swapRouter = Router();

// ── GET /swap/price ──────────────────────────────────────────────────────────
//
// Query params (passed through to 0x):
//   chainId      required  e.g. 1 (Ethereum), 8453 (Base), 137 (Polygon)
//   sellToken    required  token address or symbol e.g. ETH, 0xA0b8...
//   buyToken     required  token address or symbol
//   sellAmount   required* amount in token base units (wei for ETH)
//   buyAmount    required* alternative to sellAmount
//   taker        optional  taker address (for price impact calculation)
//
// * one of sellAmount or buyAmount required

swapRouter.get("/price", async (req: Request, res: Response) => {
  const { chainId, sellToken, buyToken, sellAmount, buyAmount, taker } =
    req.query as Record<string, string>;

  if (!chainId || !sellToken || !buyToken) {
    res.status(400).json({
      error: "Missing required params: chainId, sellToken, buyToken",
    });
    return;
  }
  if (!sellAmount && !buyAmount) {
    res.status(400).json({
      error: "Provide either sellAmount or buyAmount",
    });
    return;
  }

  try {
    const params: SwapPriceParams = {
      chainId,
      sellToken,
      buyToken,
      ...(sellAmount && { sellAmount }),
      ...(buyAmount && { buyAmount }),
      ...(taker && { taker }),
    };

    const data = await getIndicativePrice(params);
    res.json(data);
  } catch (err) {
    const { status, body } = normalizeZeroXError(err);
    res.status(status).json(body);
  }
});

// ── GET /swap/quote ──────────────────────────────────────────────────────────
//
// Same as /price but also requires:
//   taker        required  address that will submit the transaction
//   slippageBps  optional  slippage tolerance in bps, e.g. 100 = 1%
//
// Returns full AllowanceHolder calldata ready to execute.

swapRouter.get("/quote", async (req: Request, res: Response) => {
  const {
    chainId,
    sellToken,
    buyToken,
    sellAmount,
    buyAmount,
    taker,
    slippageBps,
  } = req.query as Record<string, string>;

  if (!chainId || !sellToken || !buyToken || !taker) {
    res.status(400).json({
      error: "Missing required params: chainId, sellToken, buyToken, taker",
    });
    return;
  }
  if (!sellAmount && !buyAmount) {
    res.status(400).json({
      error: "Provide either sellAmount or buyAmount",
    });
    return;
  }

  try {
    const params: SwapQuoteParams = {
      chainId,
      sellToken,
      buyToken,
      taker,
      ...(sellAmount && { sellAmount }),
      ...(buyAmount && { buyAmount }),
      ...(slippageBps && { slippageBps: Number(slippageBps) }),
    };

    const data = await getFirmQuote(params);
    res.json(data);
  } catch (err) {
    const { status, body } = normalizeZeroXError(err);
    res.status(status).json(body);
  }
});
