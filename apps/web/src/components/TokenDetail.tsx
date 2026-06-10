import type { TokenMarket } from "../types";
import { Sparkline } from "./Sparkline";
import { TokenIcon } from "./TokenIcon";

interface TokenDetailProps {
  token?: TokenMarket;
  lastUpdate?: number;
}

function formatVolume(value: number) {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(0)}`;
}

export function TokenDetail({ token, lastUpdate }: TokenDetailProps) {
  if (!token) return null;

  return (
    <section className="token-detail">
      <div className="container">
        <div className="token-detail__card">
          <div className="token-detail__head">
            <div className="token-detail__identity">
              <TokenIcon
                symbol={token.symbol}
                iconUrl={token.iconUrl}
                color={token.color}
                size="lg"
              />
              <div>
                <h3>
                  {token.name} <span className="muted">({token.symbol})</span>
                </h3>
                <p className="mono muted token-detail__address">{token.address}</p>
              </div>
            </div>
            <div className="token-detail__price">
              <strong className="mono">${token.priceFormatted}</strong>
              <span
                className={`change-pill ${
                  token.change24h >= 0 ? "change-pill--up" : "change-pill--down"
                }`}
              >
                {token.change24h >= 0 ? "+" : ""}
                {token.change24h.toFixed(2)}% 24h
              </span>
            </div>
          </div>

          <div className="token-detail__chart">
            <div className="token-detail__chart-label">24h 价格轨道</div>
            <Sparkline
              data={token.sparkline}
              color={token.color}
              positive={token.change24h >= 0}
              width={900}
              height={180}
            />
          </div>

          <div className="token-detail__meta">
            <div>
              <span>链</span>
              <strong>{token.chain}</strong>
            </div>
            <div>
              <span>24h 成交量</span>
              <strong className="mono">{formatVolume(token.volume24h)}</strong>
            </div>
            <div>
              <span>Chain Index</span>
              <strong className="mono">{token.chainIndex}</strong>
            </div>
            <div>
              <span>更新时间</span>
              <strong className="mono">
                {lastUpdate ? new Date(lastUpdate).toLocaleTimeString("zh-CN") : "—"}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}