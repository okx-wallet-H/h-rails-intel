#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ANVIL_PORT="${ANVIL_PORT:-18545}"
ANVIL_RPC="http://127.0.0.1:${ANVIL_PORT}"
ANVIL_SENDER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
XLAYER_FORK="${XLAYER_FORK:-https://xlayerrpc.okx.com}"

echo "==> H Rails blast (local X Layer fork)"

# 1. Redis (optional)
if command -v docker >/dev/null 2>&1; then
  docker compose up -d redis 2>/dev/null || true
  if ! grep -q '^REDIS_URL=' .env 2>/dev/null; then
    echo "REDIS_URL=redis://localhost:6379" >> .env
  fi
fi

# 2. Anvil fork
if ! curl -sf -X POST "$ANVIL_RPC" -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' >/dev/null 2>&1; then
  echo "==> Starting Anvil fork ($XLAYER_FORK)"
  lsof -ti:"$ANVIL_PORT" | xargs kill -9 2>/dev/null || true
  anvil --fork-url "$XLAYER_FORK" --port "$ANVIL_PORT" --chain-id 196 --silent &
  sleep 2
fi

# 3. Deploy GatewayKey to fork
echo "==> Deploying GatewayKey to local fork"
cd contracts
cast rpc anvil_setBalance "$ANVIL_SENDER" 0x56BC75E2D63100000 --rpc-url "$ANVIL_RPC" >/dev/null 2>&1 || true
DEPLOY_OUT=$(forge script script/DeployGatewayKey.s.sol \
  --rpc-url "$ANVIL_RPC" --sender "$ANVIL_SENDER" --unlocked --broadcast 2>&1)
echo "$DEPLOY_OUT" | tail -5

BROADCAST="$ROOT/contracts/broadcast/DeployGatewayKey.s.sol/196/run-latest.json"
if [ -f "$BROADCAST" ]; then
  CONTRACT=$(python3 -c "import json; print(json.load(open('$BROADCAST'))['transactions'][-1]['contractAddress'])")
else
  CONTRACT=$(echo "$DEPLOY_OUT" | grep -Eo '0x[a-fA-F0-9]{40}' | tail -1)
fi
cd "$ROOT"

if [ -z "$CONTRACT" ]; then
  echo "Deploy failed — check forge output above"
  exit 1
fi

echo "==> GatewayKey @ $CONTRACT"

# 4. Patch .env (idempotent keys)
touch .env
for kv in "XLAYER_RPC_URL=$ANVIL_RPC" "GATEWAY_CONTRACT_ADDRESS=$CONTRACT"; do
  key="${kv%%=*}"
  if grep -q "^${key}=" .env; then
    sed -i '' "s|^${key}=.*|${kv}|" .env
  else
    echo "$kv" >> .env
  fi
done

# 5. Kill old dev ports & start
lsof -ti:3847,5173 | xargs kill -9 2>/dev/null || true
echo "==> Starting API + Web"
npm run dev &
sleep 3

# 6. Smoke test
echo "==> Smoke tests"
curl -sf http://localhost:3847/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); print('health ok, contract:', d.get('gatewayContract'))"
curl -sf http://localhost:3847/api/v1/gateway/config | python3 -c "import sys,json; d=json.load(sys.stdin); print('gateway config contract:', d['data']['contract'])"
curl -sf -H 'x-api-key: gw-dev-key-001' http://localhost:3847/api/v1/market/overview | python3 -c "import sys,json; d=json.load(sys.stdin); print('market ok, plan:', d['meta']['plan'])"

echo ""
echo "Blast complete."
echo "  Web:      http://localhost:5173"
echo "  API:      http://localhost:3847"
echo "  Contract: $CONTRACT (Anvil fork)"
echo "  RPC:      $ANVIL_RPC"