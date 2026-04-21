import { HTTPFacilitatorClient } from "@x402/core/server";
import { getAuthHeaders } from "@coinbase/cdp-sdk/auth";
import { config, isMainnet } from "../config.js";

const CDP_HOST = "api.cdp.coinbase.com";
const CDP_BASE_PATH = "/platform/v2/x402";

async function cdpHeaders(method: string, path: string): Promise<Record<string, string>> {
  return getAuthHeaders({
    apiKeyId: config.CDP_API_KEY_ID!,
    apiKeySecret: config.CDP_API_KEY_SECRET!,
    requestMethod: method,
    requestHost: CDP_HOST,
    requestPath: `${CDP_BASE_PATH}/${path}`,
  });
}

/**
 * Returns an x402 facilitator client.
 *
 * - Testnet: uses x402.org (no auth needed)
 * - Mainnet: uses CDP (requires CDP_API_KEY_ID + CDP_API_KEY_SECRET)
 */
export function buildFacilitatorClient() {
  if (isMainnet) {
    if (!config.CDP_API_KEY_ID || !config.CDP_API_KEY_SECRET) {
      throw new Error(
        "CDP_API_KEY_ID and CDP_API_KEY_SECRET are required for mainnet. " +
        "Get keys at https://portal.cdp.coinbase.com"
      );
    }

    return new HTTPFacilitatorClient({
      url: `https://${CDP_HOST}${CDP_BASE_PATH}`,
      createAuthHeaders: async () => ({
        verify:    await cdpHeaders("POST", "verify"),
        settle:    await cdpHeaders("POST", "settle"),
        supported: await cdpHeaders("GET",  "supported"),
      }),
    });
  }

  // Testnet — no auth required, Base Sepolia + Solana Devnet only
  return new HTTPFacilitatorClient({
    url: "https://x402.org/facilitator",
  });
}
