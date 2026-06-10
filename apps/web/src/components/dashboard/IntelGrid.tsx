import type { DeepIntel } from "../../types";

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="metric-card">
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">{value || "—"}</strong>
      {sub ? <span className="metric-card__sub">{sub}</span> : null}
    </div>
  );
}

export function IntelGrid({ intel }: { intel: DeepIntel }) {
  return (
    <div className="intel-grid">
      <section className="panel panel--accent">
        <div className="panel__head">
          <h3>流动性脉冲</h3>
          <span className="panel__tag">平时看不到</span>
        </div>
        <div className="metric-row">
          <Metric label="流动性" value={intel.liquidity ? `$${Number(intel.liquidity).toLocaleString()}` : "—"} />
          <Metric label="24h 成交量" value={intel.volume?.h24 ? `$${Number(intel.volume.h24).toLocaleString()}` : "—"} />
          <Metric label="24h 交易笔数" value={intel.txs?.h24 || "—"} />
          <Metric label="持有人" value={intel.holders || "—"} />
        </div>
      </section>

      <section className="panel panel--risk">
        <div className="panel__head">
          <h3>风险雷达</h3>
          <span className={`risk-badge risk-badge--${intel.risk?.level === "低" ? "low" : "mid"}`}>
            {intel.risk?.level || "—"}
          </span>
        </div>
        <div className="metric-row">
          <Metric label="Top10 持仓" value={intel.risk?.top10Hold ? `${intel.risk.top10Hold}%` : "—"} />
          <Metric label="狙击手持仓" value={intel.risk?.sniperHold ? `${intel.risk.sniperHold}%` : "—"} />
          <Metric label="捆绑持仓" value={intel.risk?.bundleHold ? `${intel.risk.bundleHold}%` : "—"} />
          <Metric label="Dev Rug 次数" value={intel.risk?.devRugCount || "0"} />
        </div>
        <div className="tag-row">
          {(intel.risk?.tags || []).map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__head"><h3>社交热度</h3></div>
        <div className="metric-row">
          <Metric label="曝光量" value={intel.vibe?.impressions || "—"} sub={intel.vibe?.impressionsChange ? `${intel.vibe.impressionsChange}%` : undefined} />
          <Metric label="互动量" value={intel.vibe?.engagement || "—"} />
          <Metric label="提及数" value={intel.vibe?.mentions || "—"} />
        </div>
      </section>

      <section className="panel panel--wide">
        <div className="panel__head"><h3>多周期涨跌</h3></div>
        <div className="change-grid">
          {[
            ["5分钟", intel.change?.m5],
            ["1小时", intel.change?.h1],
            ["4小时", intel.change?.h4],
            ["24小时", intel.change?.h24],
          ].map(([label, val]) => (
            <div key={label as string} className={`change-cell ${Number(val) >= 0 ? "up" : "down"}`}>
              <span>{label}</span>
              <strong>{val ? `${Number(val) >= 0 ? "+" : ""}${val}%` : "—"}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}