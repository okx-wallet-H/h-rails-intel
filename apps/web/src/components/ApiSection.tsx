export function ApiSection() {
  return (
    <section className="api-section" id="api">
      <div className="container api-section__grid">
        <div>
          <div className="eyebrow">H Rails API</div>
          <h2>几行代码，驶上链上行情轨道</h2>
          <p>
            通过标准 HTTP 接口获取批量价格与 K 线数据。支持 x402 微支付协议，按调用付费，无需复杂鉴权流程。
          </p>
          <ul className="api-list">
            <li>GET /api/v1/market/overview — 市场概览</li>
            <li>GET /api/v1/token/:chain/:address — 深度情报</li>
            <li>GET /api/x402/premium/deep-intel — x402 按次付费</li>
          </ul>
          <button type="button" className="btn btn--primary">
            获取 API Key
          </button>
        </div>

        <div className="code-panel">
          <div className="code-panel__tabs">
            <span className="is-active">curl</span>
            <span>JavaScript</span>
            <span>Python</span>
          </div>
          <pre className="code-panel__body">
            <code>{`# H Rails Gateway v1
curl http://localhost:3847/api/v1/market/overview \\
  -H "x-api-key: gw-dev-key-001"

# Response
{
  "success": true,
  "data": { "tokens": [...], "signals": [...] },
  "meta": { "plan": "pro", "latencyMs": 842 }
}`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}