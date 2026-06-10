import type { TokenMarket } from "../types";
import { TokenIcon } from "./TokenIcon";

interface TickerBarProps {
  tokens: TokenMarket[];
}

function formatChange(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function TickerBar({ tokens }: TickerBarProps) {
  const items = [...tokens, ...tokens];

  return (
    <section className="ticker" aria-label="实时行情滚动条">
      <div className="ticker__label">LIVE</div>
      <div className="ticker__viewport">
        <div className="ticker__track">
          {items.map((token, index) => (
            <div className="ticker__item" key={`${token.symbol}-${index}`}>
              <TokenIcon
                symbol={token.symbol}
                iconUrl={token.iconUrl}
                color={token.color}
                size="sm"
              />
              <span className="ticker__symbol">{token.symbol}</span>
              <span className="ticker__price">${token.priceFormatted}</span>
              <span className={token.change24h >= 0 ? "text-up" : "text-down"}>
                {formatChange(token.change24h)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}