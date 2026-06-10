import type { DeepIntel } from "../../types";

export function WhaleTape({ items }: { items: DeepIntel["whaleTape"] }) {
  return (
    <section className="panel panel--feed">
      <div className="panel__head">
        <h3>链上成交带</h3>
        <span className="panel__tag">实时逐笔</span>
      </div>
      <div className="tape-list">
        {items.map((t, i) => (
          <div className="tape-row" key={`${t.hash}-${i}`}>
            <span className="tape-row__time mono">
              {new Date(Number(t.time)).toLocaleTimeString("zh-CN")}
            </span>
            <span className="tape-row__dex">{t.dex}</span>
            <span className="tape-row__price mono">${Number(t.price).toFixed(2)}</span>
            <span className="tape-row__hash mono muted">
              {(t.hash || "").slice(0, 8)}…
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}