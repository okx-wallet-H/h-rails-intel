# H Rails

Agent Payments Protocol market intelligence platform on X Layer.

H Rails aggregates OKX/onchainos market data for traders and exposes a gated REST gateway plus x402 micropayments for agents and developers.

## Quick start

```bash
cp .env.example .env
# Fill OKX_ACCESS_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE

npm install
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3847

## API overview

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/health` | — | Health check |
| `GET /api/dashboard` | — | Full dashboard payload (web UI) |
| `GET /api/v1/market/overview` | `x-api-key` | Market overview |
| `GET /api/v1/token/:chain/:address` | `x-api-key` | Deep intel for a token |
| `GET /api/v1/monitor/:chain` | `x-api-key` | On-chain monitor feed |
| `GET /api/v1/key/validate` | `x-api-key` | Validate key and plan |
| `GET /api/v1/gateway/config` | — | Gateway contract + pricing config |
| `GET /api/x402/premium/deep-intel` | x402 payment | Premium intel (402 without signature) |
| `POST /api/x402/auto-pay-demo` | — | Auto 402 → sign → replay demo |

### API keys

Set `GATEWAY_KEYS` in `.env` as `key:plan:name` (comma-separated). Plans: `free` (10/min), `pro` (60/min), `enterprise` (300/min).

Default dev key when unset: `gw-dev-key-001` (Pro).

```bash
curl -H "x-api-key: gw-dev-key-001" http://localhost:3847/api/v1/market/overview
```

Wallet addresses (`0x…`) are validated on-chain when `GATEWAY_CONTRACT_ADDRESS` is set; otherwise accepted as free-tier keys.

### On-chain GatewayKey (X Layer Mainnet)

| Item | Value |
|------|-------|
| Contract (V2) | `0xc8F599633fCCaDc472c49a307C30BEad918e36Fa` |
| Explorer | https://www.okx.com/explorer/xlayer/address/0xc8F599633fCCaDc472c49a307C30BEad918e36Fa |
| V1 (legacy) | `0x1d27BcB08d77f7f7BC4BF98241c67F4569472BB1` |
| RPC | `https://xlayerrpc.okx.com` |

Web UI: **获取 Key** → onchainos Agent Wallet 自动识别 → 领取 Free / 升级 Pro。

### Agent 监控简报

```bash
HRAILS_API_KEY=0x你的地址 npm run agent:brief
npm run agent:watch   # 每 5 分钟刷新
```

### x402 自动付费（Agent Wallet）

```bash
curl -X POST http://localhost:3847/api/v1/x402/auto-pay
```

### 生产部署

```bash
npm run deploy:prod          # Docker: API + Nginx Web + Redis → :8080
fly deploy                   # 仅 API（需 flyctl + fly.toml）
```

```bash
# Local full stack (Anvil fork + Redis + dev)
npm run blast

# Redeploy to mainnet (requires DEPLOYER_PRIVATE_KEY in .env)
npm run deploy:gateway
```

### SDK

```js
import { createClient } from "@h-rails/sdk";

const client = createClient({
  baseUrl: "http://localhost:3847",
  apiKey: "gw-dev-key-001", // or your 0x wallet address
});
const { data } = await client.marketOverview();
```

### x402 demo

Requires onchainos login or `EVM_PRIVATE_KEY` in `.env`:

```bash
curl -X POST http://localhost:3847/api/x402/auto-pay-demo
```

## Monorepo layout

```
apps/
  api/     Express gateway + x402
  web/     Vite + React dashboard
packages/
  types/   Shared tier limits and labels
contracts/
  GatewayKey.sol
```

## Docker

```bash
docker compose up --build
```

## Environment

See `.env.example`. OKX Market API credentials are required for live data; without them the API returns structured fallbacks where possible.

## License

Private — okx-wallet-H