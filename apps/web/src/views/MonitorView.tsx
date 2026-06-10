import type { MonitorFeed } from "../types";

export function MonitorView({ feed }: { feed: MonitorFeed }) {
  return (
    <div className="monitor-view">
      <div className="dashboard-hero">
        <div>
          <div className="eyebrow">On-Chain Monitor</div>
          <h2>链上监控台</h2>
          <p className="muted">聪明钱异动、热门代币、牛人榜、市场情绪 —— 实时滚动。</p>
        </div>
      </div>

      <div className="monitor-grid">
        <section className="panel panel--feed">
          <div className="panel__head"><h3>聪明钱雷达 · {feed.chain}</h3><span className="live-dot">Live</span></div>
          <div className="monitor-stream">
            {feed.signals.map((s) => (
              <div className="monitor-card" key={s.id}>
                {s.logo && <img src={s.logo} alt="" />}
                <div>
                  <strong>{s.symbol}</strong>
                  <p className="muted mono">${s.amountUsd} · {s.wallets} 钱包触发</p>
                </div>
                <div className="monitor-card__side">
                  <span className="text-up">Top10 {s.top10}%</span>
                  <span className="muted">MCap {s.marketCap}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head"><h3>热门代币</h3></div>
          <div className="monitor-list">
            {feed.hot.map((h, i) => (
              <div className="monitor-row" key={`${h.address}-${i}`}>
                {h.logo && <img src={h.logo} alt="" className="monitor-row__logo" />}
                <span className="strong">{h.symbol}</span>
                <span className="mono">${Number(h.price).toFixed(4)}</span>
                <span className={Number(h.change) >= 0 ? "text-up" : "text-down"}>{h.change}%</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head"><h3>牛人榜</h3></div>
          <div className="monitor-list">
            {feed.leaders.map((l, i) => (
              <div className="monitor-row" key={i}>
                <span className="mono muted">{(l.address || "").slice(0, 6)}…</span>
                <span className="text-up mono">PnL {l.pnl}</span>
                <span className="muted">胜率 {l.winRate}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head"><h3>情绪排行</h3></div>
          <div className="monitor-list">
            {feed.sentiment.map((s, i) => (
              <div className="monitor-row" key={i}>
                <span className="strong">{s.symbol}</span>
                <span className="text-up">多 {s.bullish}</span>
                <span className="text-down">空 {s.bearish}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}