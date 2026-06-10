import type { TokenMarket } from "../types";
import { Sparkline } from "./Sparkline";
import { TokenIcon } from "./TokenIcon";

interface MarketTableProps {
  tokens: TokenMarket[];
  loading: boolean;
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
}

function formatVolume(value: number) {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatChange(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function MarketTable({
  tokens,
  loading,
  selectedSymbol,
  onSelect,
}: MarketTableProps) {
  return (
    <section className="market" id="markets">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="eyebrow">H Rails Markets</div>
            <h2>实时行情面板</h2>
          </div>
          <p>点击代币查看详情与 24 小时走势，数据每 30 秒沿轨道自动同步。</p>
        </div>

        <div className="market-table-wrap">
          <table className="market-table">
            <thead>
              <tr>
                <th>#</th>
                <th>代币</th>
                <th>价格</th>
                <th>24h 涨跌</th>
                <th>24h 成交量</th>
                <th>24h 走势</th>
                <th>链</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="market-table__skeleton">
                      <td colSpan={7}>
                        <div className="skeleton-line" />
                      </td>
                    </tr>
                  ))
                : tokens.map((token, index) => (
                    <tr
                      key={token.symbol}
                      className={selectedSymbol === token.symbol ? "is-selected" : ""}
                      onClick={() => onSelect(token.symbol)}
                    >
                      <td className="muted">{index + 1}</td>
                      <td>
                        <div className="token-cell">
                          <TokenIcon
                            symbol={token.symbol}
                            iconUrl={token.iconUrl}
                            color={token.color}
                          />
                          <div>
                            <strong>{token.symbol}</strong>
                            <span>{token.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="mono price-cell">${token.priceFormatted}</td>
                      <td>
                        <span
                          className={`change-pill ${
                            token.change24h >= 0 ? "change-pill--up" : "change-pill--down"
                          }`}
                        >
                          {formatChange(token.change24h)}
                        </span>
                      </td>
                      <td className="mono">{formatVolume(token.volume24h)}</td>
                      <td>
                        <Sparkline
                          data={token.sparkline}
                          color={token.color}
                          positive={token.change24h >= 0}
                        />
                      </td>
                      <td>
                        <span className="chain-pill">{token.chain}</span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}