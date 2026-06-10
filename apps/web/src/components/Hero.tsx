import type { MarketSummary } from "../types";
import { Logo } from "./Logo";

interface HeroProps {
  summary?: MarketSummary;
  loading: boolean;
  onEnterDashboard: () => void;
  onEnterDeveloper: () => void;
}

function formatVolume(value: number) {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(0)}`;
}

export function Hero({ summary, loading, onEnterDashboard, onEnterDeveloper }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero__grid-bg" aria-hidden="true" />
      <div className="hero__glow" aria-hidden="true" />
      <div className="container hero__grid">
        <div className="hero__copy">
          <div className="hero__badge">
            <Logo size={22} variant="mark" showWordmark={false} />
            <span>Agent Payments Protocol · X Layer</span>
          </div>
          <h1>
            链上行情轨道，
            <br />
            <span className="gradient-text">按次付费即取</span>
          </h1>
          <p className="hero__desc">
            <strong>H Rails</strong> 将 OKX Onchain 深度数据开放给交易员与开发者。
            通过 x402 协议在 X Layer 完成微支付，获取平时看不到的流动性、风险、聪明钱与链上成交情报。
          </p>
          <div className="hero__cta">
            <button type="button" className="btn btn--primary btn--lg" onClick={onEnterDashboard}>
              打开仪表盘
            </button>
            <button type="button" className="btn btn--ghost btn--lg" onClick={onEnterDeveloper}>
              开发者文档
            </button>
          </div>
          <div className="hero__tags">
            <span>x402 支付</span>
            <span>深度情报</span>
            <span>链上监控</span>
            <span>零 Gas 签名</span>
          </div>
        </div>

        <div className="hero__panel">
          <div className="panel-card">
            <div className="panel-card__header">
              <span>H Rails 数据轨道</span>
              <span className={`live-dot ${loading ? "live-dot--pulse" : ""}`}>Live</span>
            </div>
            <div className="panel-stats">
              <div className="panel-stat">
                <span className="panel-stat__label">追踪代币</span>
                <strong>{loading ? "—" : summary?.tracked ?? 0}</strong>
              </div>
              <div className="panel-stat">
                <span className="panel-stat__label">总流动性</span>
                <strong className="mono">{loading ? "—" : formatVolume(summary?.totalLiquidity ?? 0)}</strong>
              </div>
              <div className="panel-stat">
                <span className="panel-stat__label">24h 成交量</span>
                <strong className="mono">{loading ? "—" : formatVolume(summary?.totalVolume24h ?? 0)}</strong>
              </div>
              <div className="panel-stat panel-stat--wide">
                <span className="panel-stat__label">支付网络</span>
                <strong>X Layer · USDT/USDG</strong>
              </div>
            </div>
            <div className="panel-card__footer">
              <span>协议</span>
              <span>Agent Payments Protocol (x402)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}