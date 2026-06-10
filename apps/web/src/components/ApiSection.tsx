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
            <li>GET /api/market — 批量行情与 24h 指标</li>
            <li>GET /api/kline — K 线 / OHLC 数据</li>
            <li>多链格式：chainIndex:contractAddress</li>
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
            <code>{`# H Rails Market API
curl https://api.hrails.io/v1/market/prices \\
  -H "Content-Type: application/json" \\
  -d '[{
    "chainIndex": 501,
    "tokenContractAddress":
    "So11111111111111111111111111111111111111112"
  }]'

# Response
{
  "code": "0",
  "data": [{
    "price": "64.49",
    "chainIndex": "501",
    "symbol": "SOL"
  }]
}`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}