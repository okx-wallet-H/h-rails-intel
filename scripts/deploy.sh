#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "缺少 .env，先 cp .env.example .env 并填写 OKX 密钥"
  exit 1
fi

echo "==> 构建并启动生产栈 (API + Web + Redis)"
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "✓ H Rails 已启动"
echo "  Web:  http://localhost:${WEB_PORT:-8080}"
echo "  API:  http://localhost:${WEB_PORT:-8080}/api/health"
echo ""
echo "注意: Agent Wallet / x402 签名需在宿主机 onchainos 环境运行，"
echo "      云端 API 负责验签 + 行情网关。"