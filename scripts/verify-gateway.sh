#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../contracts"

if [[ -f ../.env ]]; then set -a; source ../.env; set +a; fi

ADDR="${1:-${GATEWAY_CONTRACT_ADDRESS:-}}"
if [[ -z "$ADDR" ]]; then
  echo "用法: bash scripts/verify-gateway.sh <合约地址>"
  exit 1
fi

API_KEY="${OKLINK_API_KEY:-${OKX_ACCESS_KEY:-}}"
if [[ -z "$API_KEY" ]]; then
  echo "需要 OKLINK_API_KEY 或 OKX_ACCESS_KEY（.env）"
  exit 1
fi

forge build
CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address,address)" \
  0x4ae46a509F6b1D9056937BA4500cb143933D2dc8 \
  0x779Ded0c9e1022225f8E0630b35a9b54bE713736)

ETHERSCAN_API_KEY="$API_KEY" forge verify-contract "$ADDR" \
  src/GatewayKey.sol:GatewayKey \
  --chain-id 196 \
  --verifier oklink \
  --verifier-url "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER" \
  --constructor-args "$CONSTRUCTOR_ARGS" \
  --compiler-version 0.8.20 \
  --num-of-optimizations 0 \
  --watch

echo ""
echo "浏览器: https://www.okx.com/explorer/xlayer/address/$ADDR"