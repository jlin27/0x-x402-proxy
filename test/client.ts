/**
 * test/client.ts
 *
 * End-to-end test client. Demonstrates the full x402 payment flow:
 *   1. Request /swap/price → get 402 back
 *   2. x402 client auto-pays and retries
 *   3. Receive the swap price data
 *
 * Usage:
 *   Copy .env.example → .env
 *   Set CLIENT_PRIVATE_KEY to a funded Base mainnet wallet
 *   Run: npm run test:client
 */

import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";

const PORT = process.env.PORT ?? "4021";
const BASE_URL = `http://localhost:${PORT}`;

const privateKey = process.env.CLIENT_PRIVATE_KEY;
if (!privateKey || !privateKey.startsWith("0x")) {
  console.error("❌  Set CLIENT_PRIVATE_KEY in .env (must start with 0x)");
  process.exit(1);
}

// ── Wallet + x402 client ──────────────────────────────────────────────────────
const account = privateKeyToAccount(privateKey as `0x${string}`);
const signer = toClientEvmSigner(account);

const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [
    {
      network: "eip155:8453",
      client: new ExactEvmScheme(signer, { rpcUrl: "https://mainnet.base.org" }),
    },
  ],
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatUSD(usd: string) {
  return `$${(Number(usd) / 1e6).toFixed(4)}`;
}

function logPayment(res: Response) {
  const header = res.headers.get("PAYMENT-RESPONSE") ?? res.headers.get("X-PAYMENT-RESPONSE");
  if (header) {
    const p = decodePaymentResponseHeader(header);
    console.log(`   Payment: ${p.transaction} (${p.network})`);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
async function testIndicativePrice() {
  console.log("\n📊  Indicative price (WETH → USDC)");

  const params = new URLSearchParams({
    chainId: "1",
    sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    buyToken:  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  // USDC
    sellAmount: "1000000000000000000",                          // 1 WETH
    taker: account.address,
  });

  const res = await fetchWithPayment(`${BASE_URL}/swap/price?${params}`);
  logPayment(res);

  if (!res.ok) {
    console.error("❌  Failed:", await res.text());
    return;
  }

  const data = await res.json();
  console.log(`   1 WETH → ${formatUSD(data.buyAmount)} USDC`);
  if (data.estimatedPriceImpact) {
    console.log(`   Price impact: ${data.estimatedPriceImpact}`);
  }
}

async function testFirmQuote() {
  console.log("\n📋  Firm quote (USDC → WETH)");

  const params = new URLSearchParams({
    chainId: "1",
    sellToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
    buyToken:  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // WETH
    sellAmount: "1000000000",                                   // 1000 USDC
    taker: account.address,
    slippageBps: "100",
  });

  const res = await fetchWithPayment(`${BASE_URL}/swap/quote?${params}`);
  logPayment(res);

  if (!res.ok) {
    console.error("❌  Failed:", await res.text());
    return;
  }

  const data = await res.json();
  console.log(`   1000 USDC → ${data.buyAmount} wei WETH`);
  console.log(`   Calldata: ${data.transaction?.data ? "✅" : "❌"}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🔗  Client wallet: ${account.address}`);
  console.log(`🌐  Proxy server:  ${BASE_URL}`);

  const health = await fetch(`${BASE_URL}/health`).catch(() => null);
  if (!health?.ok) {
    console.error(`❌  Server not reachable — run: npm run dev`);
    process.exit(1);
  }

  await testIndicativePrice();
  await testFirmQuote();

  console.log("\n✅  Done");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
