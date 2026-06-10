export function DeveloperView() {
  return (
    <div className="developer-view">
      <div className="dashboard-hero">
        <div>
          <div className="eyebrow">Developer Gateway</div>
          <h2>开放给交易员的 API 轨道</h2>
          <p className="muted">
            标准 REST + x402 按次付费。在 X Layer 上用 USDT/USDG 完成 Agent Payments Protocol 授权，无需 Gas。
          </p>
        </div>
      </div>

      <div className="dev-grid">
        <section className="panel">
          <h3>开放端点</h3>
          <ul className="api-list">
            <li><code>GET /api/dashboard</code> — 全量仪表盘（公开，无需 Key）</li>
            <li><code>GET /api/v1/market/overview</code> — 市场概览（需 <code>x-api-key</code>）</li>
            <li><code>GET /api/v1/token/:chain/:address</code> — 深度情报</li>
            <li><code>GET /api/v1/monitor/:chain</code> — 链上监控流</li>
            <li><code>GET /api/x402/premium/deep-intel</code> — <strong>x402 付费</strong></li>
            <li><code>POST /api/x402/auto-pay-demo</code> — 自动 402 支付演示</li>
          </ul>
          <p className="muted" style={{ marginTop: "1rem" }}>
            开发 Key: <code>gw-dev-key-001</code>（Pro，60 req/min）
            <br />
            主网合约: <code>0x1d27BcB08d77f7f7BC4BF98241c67F4569472BB1</code>
          </p>
        </section>

        <section className="code-panel">
          <div className="code-panel__tabs"><span className="is-active">x402 付费调用</span></div>
          <pre className="code-panel__body"><code>{`# Gateway v1（需 API Key）
curl -H "x-api-key: gw-dev-key-001" \\
  http://localhost:3847/api/v1/market/overview

# x402 付费情报
# 1. 首次请求 → 402 + PAYMENT-REQUIRED
curl http://localhost:3847/api/x402/premium/deep-intel

# 2. X Layer EIP-3009 签名 (Agent Payments Protocol)
# 3. 重放请求
curl -H "PAYMENT-SIGNATURE: <base64>" \\
  http://localhost:3847/api/x402/premium/deep-intel

# 支付网络: X Layer (eip155:196)
# 代币: USDT / USDG
# 每次: ~0.0005 USDT`}</code></pre>
        </section>
      </div>

      <section className="panel panel--wide dev-audience">
        <div>
          <h3>交易员</h3>
          <p>仪表盘看板、风险雷达、聪明钱信号、链上成交带 —— 看见 K 线之外的市场结构。</p>
        </div>
        <div>
          <h3>开发者</h3>
          <p>REST API + x402 微支付，Agent 可自主完成付费调用，构建量化终端与监控 Bot。</p>
        </div>
        <div>
          <h3>Agent</h3>
          <p>通过 Agent Payments Protocol 在 X Layer 自动签名，遇 402 即付即取，执行链不中断。</p>
        </div>
      </section>
    </div>
  );
}