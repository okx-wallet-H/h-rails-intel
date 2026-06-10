import type { DeepIntel } from "../../types";

export function SmartMoneyFeed({ items }: { items: DeepIntel["smartMoney"] }) {
  return (
    <section className="panel panel--feed">
      <div className="panel__head">
        <h3>聪明钱信号</h3>
        <span className="live-dot">Live</span>
      </div>
      <div className="feed-list">
        {items.length === 0 ? (
          <p className="muted">暂无信号</p>
        ) : (
          items.map((s, i) => (
            <div className="feed-item" key={`${s.symbol}-${i}`}>
              {s.logo ? <img src={s.logo} alt="" className="feed-item__logo" /> : <span className="feed-item__dot" />}
              <div className="feed-item__body">
                <strong>{s.symbol}</strong>
                <span className="muted">{s.name}</span>
              </div>
              <div className="feed-item__meta mono">
                <span className="text-up">${Number(s.amountUsd).toFixed(0)}</span>
                <span className="muted">{s.wallets} 钱包 · Top10 {s.top10}%</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}