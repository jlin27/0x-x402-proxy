#!/usr/bin/env bash
# scripts/test-curl.sh
#
# Sends a raw unauthenticated request and prints the 402 payment challenge.
# Useful for inspecting the x402 response structure without a wallet.
#
# Usage:  npm run test:curl
#         bash scripts/test-curl.sh

set -euo pipefail

PORT="${PORT:-4021}"
BASE_URL="http://localhost:${PORT}"

echo ""
echo "════════════════════════════════════════"
echo "  0x x402 Proxy — Raw 402 inspection"
echo "════════════════════════════════════════"
echo ""

echo "▶  GET /health"
curl -s "${BASE_URL}/health" | python3 -m json.tool
echo ""

echo "▶  GET /swap/price (no payment — expect 402)"
echo ""

RESPONSE=$(curl -s -o /tmp/x402_response.json -w "%{http_code}" \
  "${BASE_URL}/swap/price?chainId=1&sellToken=ETH&buyToken=USDC&sellAmount=1000000000000000000")

echo "HTTP status: ${RESPONSE}"
echo ""
echo "Response body:"
python3 -m json.tool /tmp/x402_response.json
echo ""

echo "▶  Payment-Required header (raw):"
curl -sI "${BASE_URL}/swap/price?chainId=1&sellToken=ETH&buyToken=USDC&sellAmount=1000000000000000000" \
  | grep -i "payment" || echo "  (no payment header — server may not be running)"

echo ""
echo "To pay programmatically, run:  npm run test:client"
echo ""
