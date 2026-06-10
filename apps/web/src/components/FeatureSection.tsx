const FEATURES = [
  {
    title: "多链轨道聚合",
    desc: "Ethereum、Solana、BSC、Arbitrum 等主流链资产统一编排，像轨道一样串联全局行情。",
    icon: "╫",
  },
  {
    title: "近实时数据流",
    desc: "价格与 K 线沿 H Rails 数据管道持续同步，适合监控大屏与量化策略。",
    icon: "⟡",
  },
  {
    title: "深度流动性洞察",
    desc: "24h 成交量、涨跌幅与走势可视化，快速识别链上市场活跃度变化。",
    icon: "◉",
  },
  {
    title: "API 即轨道接口",
    desc: "标准化 REST 端点，几行代码接入你的终端、Bot 或机构级 Dashboard。",
    icon: "⬢",
  },
];

const CHAINS = [
  "Ethereum",
  "Solana",
  "BNB Chain",
  "Arbitrum",
  "Optimism",
  "Base",
  "Polygon",
  "X Layer",
];

export function FeatureSection() {
  return (
    <>
      <section className="features" id="features">
        <div className="container">
          <div className="section-head section-head--center">
            <div className="eyebrow">Why H Rails</div>
            <h2>交易员看得见 · 开发者接得上</h2>
            <p>H Rails 通过 Agent Payments Protocol 在 X Layer 按次开放深度链上情报。</p>
          </div>

          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <div className="feature-card__icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="chains" id="chains">
        <div className="container chains__inner">
          <div>
            <div className="eyebrow">Multi-Chain Rails</div>
            <h2>一条轨道，覆盖主流公链</h2>
            <p>H Rails 持续扩展更多 L1 / L2 网络，让你的产品天然具备多链行情能力。</p>
          </div>
          <div className="chain-grid">
            {CHAINS.map((chain) => (
              <div className="chain-chip" key={chain}>
                <span className="chain-chip__dot" />
                {chain}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}