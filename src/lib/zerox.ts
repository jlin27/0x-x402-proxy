import axios, { AxiosError } from "axios";
import { config } from "../config.js";

const BASE_URL = "https://api.0x.org";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: {
    "0x-api-key": config.ZERO_X_API_KEY,
    "0x-version": "v2",
  },
});

export interface SwapPriceParams {
  chainId: string | number;
  sellToken: string;
  buyToken: string;
  sellAmount?: string;
  buyAmount?: string;
  taker?: string;
}

export interface SwapQuoteParams extends SwapPriceParams {
  taker: string; // required for firm quotes
  slippageBps?: number;
}

/**
 * Indicative price — no calldata, cheaper to call
 * Maps to GET /swap/allowance-holder/price
 */
export async function getIndicativePrice(params: SwapPriceParams) {
  const response = await client.get("/swap/allowance-holder/price", {
    params,
  });
  return response.data;
}

/**
 * Firm quote — includes calldata ready to submit on-chain
 * Maps to GET /swap/allowance-holder/quote
 */
export async function getFirmQuote(params: SwapQuoteParams) {
  const response = await client.get("/swap/allowance-holder/quote", {
    params,
  });
  return response.data;
}

/**
 * Normalise 0x API errors into a consistent shape for the proxy to forward
 */
export function normalizeZeroXError(err: unknown): {
  status: number;
  body: object;
} {
  if (err instanceof AxiosError && err.response) {
    return {
      status: err.response.status,
      body: err.response.data ?? { error: "0x API error" },
    };
  }
  return { status: 502, body: { error: "Upstream request to 0x API failed" } };
}
