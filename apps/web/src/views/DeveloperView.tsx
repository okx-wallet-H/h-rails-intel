import { useState } from "react";
import { runX402AutoPay } from "../lib/gateway";

export function DeveloperView() {
  const [x402Loading, setX402Loading] = useState(false);
  const [x402Result, setX402Result] = useState<Record<string, unknown> | null>(null);
  const [x402Error, setX402Error] = useState<string | null>(null);

  const runX402 = async () => {
    setX402Loading(true);
    setX402Error(null);
    setX402Result(null);
    try {
      const result = await runX402AutoPay();
      setX402Result(result);
    } catch (e) {
      setX402Error(e instanceof Error ? e.message : "x402 失败");
    } finally {
      setX402Loading(false);
    }
  };

  return (
    <div className="developer-view">
      <div className="dashboard-hero">
        <div>
          <div className="eyebrow">Developer Gateway</div>
          <h2>Agent 开发者轨道</h2>
          <p className="muted">
            REST + x402 按次付费。Agent Wallet 遇 402 自动 EIP-3009 签名，无需人工介入。
          </p>
        </div>
      </div>

      {x402Error ? <div className="container"><div className="status-banner">{x402Error}</div></div> : null}

      <div className="dev-grid">
        <section className="panel">
          <h3>开放端点</h3>
          <ul className="api-list">
            <li><code>GET /api/v1/market/overview</code> — 市场概览（<code>x-api-key</code>）</li>
            <li><code>GET /api/v1/token/:chain/:address</code> — 深度情报</li>
            <li><code>GET /api/v1/monitor/:chain</code> — 链上监控流</li>
            <li><code>GET /api/x402/premium/deep-intel</code> — x402 付费情报</li>
            <li><code>POST /api/v1/x402/auto-pay</code> — Agent 自动 402→签名→重放</li>
            <li><code>POST /api/v1/gateway/purchase-pro-onchainos</code> — Agent 购买 Pro</li>
          </ul>
          <p className="muted" style={{ marginTop: "1rem" }}>
            Agent Key = 你的钱包地址 · 主网合约{" "}
            <code>0x1d27BcB08d77f7f7BC4BF98241c67F4569472BB1</code>
          </p>
          <button type="button" className="btn btn--primary" style={{ marginTop: "12px" }} onClick={runX402} disabled={x402Loading}>
            {x402Loading ? "Agent 签名支付中…" : "试跑 x402 自动付费"}
          </button>
        </section>

        <section className="code-panel">
          <div className="code-panel__tabs"><span className="is-active">Agent 接入</span></div>
          <pre className="code-panel__body"><code>{`# 1. Gateway（Agent 地址 = x-api-key）
curl -H "x-api-key: 0x你的地址" \\
  http://localhost:3847/api/v1/market/overview

# 2. x402 自动付费（onchainos Agent Wallet 签名）
curl -X POST http://localhost:3847/api/v1/x402/auto-pay

# 3. 监控 Agent 定时简报
HRAILS_API_KEY=0x你的地址 node scripts/agent-brief.mjs
HRAILS_API_KEY=0x你的地址 node scripts/agent-brief.mjs --watch

# 4. 生产部署
bash scripts/deploy.sh`}</code></pre>
          {x402Result ? (
            <pre className="code-panel__body" style={{ marginTop: 8, maxHeight: 200, overflow: "auto" }}>
              {JSON.stringify(x402Result, null, 2).slice(0, 2500)}
            </pre>
          ) : null}
        </section>
      </div>

      <section className="panel panel--wide dev-audience">
        <div>
          <h3>交易员</h3>
          <p>仪表盘看板、风险雷达、聪明钱信号、链上成交带。</p>
        </div>
        <div>
          <h3>开发者</h3>
          <p>REST + x402，<code>@h-rails/sdk</code> 接入，Docker 一键上云。</p>
        </div>
        <div>
          <h3>Agent</h3>
          <p>onchainos TEE 签名，402 即付即取，<code>agent-brief</code> 定时简报。</p>
        </div>
      </section>
    </div>
  );
}