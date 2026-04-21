# 0x Swap API × x402 Gateway

A thin proxy that puts the [0x Swap API](https://0x.org/docs/api) behind [x402](https://x402.org) — enabling pay-per-request access to swap quotes using on-chain USDC payments, with no API keys or accounts required for callers.

```
Client ──GET /swap/quote──▶ Proxy ──▶ 402 + payment terms
       ◀──pay USDC on-chain──────────────────────────────
       ──GET /swap/quote (X-Payment header)──▶ Proxy ──▶ 0x API ──▶ quote
```

---

## Endpoints

| Endpoint | Payment | Description |
|---|---|---|
| `GET /swap/price` | `$0.001 USDC` | Indicative price, no calldata |
| `GET /swap/quote` | `$0.01 USDC` | Firm quote with AllowanceHolder calldata |
| `GET /` | free | Service info & discovery metadata |
| `GET /health` | free | Health check |

### Query params

All swap endpoints accept:

| Param | Required | Description |
|---|---|---|
| `chainId` | ✅ | Chain ID (e.g. `1` for Ethereum, `8453` for Base) |
| `sellToken` | ✅ | Sell token address or symbol (e.g. `ETH`, `0xA0b8...`) |
| `buyToken` | ✅ | Buy token address or symbol |
| `sellAmount` | ✅* | Amount to sell in base units (wei for ETH) |
| `buyAmount` | ✅* | Alternative to `sellAmount` |
| `taker` | ✅ for `/quote` | Address that will submit the transaction |
| `slippageBps` | optional | Slippage in bps, e.g. `100` = 1% |

*One of `sellAmount` or `buyAmount` required.

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-org/0x-x402-proxy
cd 0x-x402-proxy
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env`:

```env
ZERO_X_API_KEY=your_key_from_dashboard.0x.org
PAYMENT_RECIPIENT_ADDRESS=0xYourWalletAddress
```

The defaults work on Base Sepolia testnet with no further changes.

### 3. Run

```bash
npm run dev
```

### 4. Inspect the 402 response

```bash
npm run test:curl
```

You'll see the raw 402 with payment instructions — no wallet needed to inspect.

### 5. Pay and fetch

Set `CLIENT_PRIVATE_KEY` in `.env` to a funded Base Sepolia wallet, then:

```bash
npm run test:client
```

This runs through the full x402 payment loop: request → 402 → pay → retry → data.

---

## How x402 works here

1. **No payment header**: Server returns `402 Payment Required` with a `PAYMENT-REQUIRED` header describing the USDC amount, network, and recipient.
2. **Client pays**: The client signs a `TransferWithAuthorization` (EIP-3009) payload — no gas required for USDC on Base.
3. **Retry with `X-Payment` header**: Server sends the signed payload to the facilitator for verification and settlement.
4. **Facilitator confirms**: On success, the request is forwarded to the 0x API and the result returned.

---

## Going to mainnet

Two changes in `.env`:

```env
X402_NETWORK=eip155:8453          # Base mainnet
FACILITATOR_URL=https://api.cdp.coinbase.com/platform/v2/x402
CDP_API_KEY_ID=your_cdp_key_id
CDP_API_KEY_SECRET=your_cdp_key_secret
```

Then in `src/lib/facilitator.ts`, uncomment the `CdpFacilitatorClient` block and import it:

```typescript
import { CdpFacilitatorClient } from "@x402/core/server";

return new CdpFacilitatorClient({
  apiKeyId: config.CDP_API_KEY_ID,
  apiKeySecret: config.CDP_API_KEY_SECRET,
});
```

Get CDP keys at [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com). The free tier covers 1,000 transactions/month.

---

## Dynamic pricing (next steps)

Currently all `/swap/quote` requests cost the same flat rate. To price by trade size, you'd replace the static `paymentMiddleware` config with a custom handler that inspects `sellAmount` before building the 402 response:

```typescript
app.get("/swap/quote", async (req, res, next) => {
  const sellAmount = BigInt(req.query.sellAmount as string);
  const usdPrice = derivePrice(sellAmount); // your pricing function

  // build a custom 402 if no valid payment attached
  // ...
  next();
});
```

See [x402 advanced examples](https://github.com/coinbase/x402/tree/main/examples/typescript/servers/advanced) for the full pattern.

---

## Project structure

```
0x-x402-proxy/
├── src/
│   ├── server.ts           # Express app + startup
│   ├── config.ts           # Env var validation (zod)
│   ├── middleware/
│   │   └── x402.ts         # Payment middleware config
│   ├── routes/
│   │   ├── swap.ts         # /swap/price + /swap/quote handlers
│   │   └── health.ts       # / + /health
│   └── lib/
│       ├── zerox.ts        # 0x API client
│       └── facilitator.ts  # Facilitator client builder
├── test/
│   └── client.ts           # E2E payment test
├── scripts/
│   └── test-curl.sh        # Raw 402 inspection via curl
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Resources

- [x402 docs](https://docs.cdp.coinbase.com/x402/welcome)
- [x402 GitHub](https://github.com/coinbase/x402)
- [0x Swap API docs](https://0x.org/docs/api#tag/Swap)
- [Base Sepolia faucet](https://docs.cdp.coinbase.com/faucets/introduction/quickstart)
