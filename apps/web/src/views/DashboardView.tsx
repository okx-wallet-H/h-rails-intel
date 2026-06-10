import { IntelGrid } from "../components/dashboard/IntelGrid";
import { PaymentRail } from "../components/dashboard/PaymentRail";
import { SmartMoneyFeed } from "../components/dashboard/SmartMoneyFeed";
import { WhaleTape } from "../components/dashboard/WhaleTape";
import { MarketTable } from "../components/MarketTable";
import { TokenDetail } from "../components/TokenDetail";
import type { DashboardPayload } from "../types";

interface Props {
  data: DashboardPayload;
  loading: boolean;
  selected: string;
  onSelect: (s: string) => void;
}

export function DashboardView({ data, loading, selected, onSelect }: Props) {
  const token = data.market.tokens.find((t) => t.symbol === selected);

  return (
    <div className="dashboard-view">
      <div className="dashboard-hero">
        <div>
          <div className="eyebrow">Trader Dashboard</div>
          <h2>链上深度情报仪表盘</h2>
          <p className="muted">
            流动性、风险结构、聪明钱、社交热度 —— 聚合 OKX Onchain 数据层，展示交易所 K 线之外的情报。
          </p>
        </div>
        <div className="dashboard-hero__stats">
          <div><span>追踪</span><strong>{data.market.summary.tracked}</strong></div>
          <div><span>总流动性</span><strong className="mono">${(data.market.summary.totalLiquidity / 1e9).toFixed(2)}B</strong></div>
          <div><span>24h 成交量</span><strong className="mono">${(data.market.summary.totalVolume24h / 1e9).toFixed(2)}B</strong></div>
        </div>
      </div>

      <IntelGrid intel={data.intel} />

      <div className="dashboard-split">
        <SmartMoneyFeed items={data.intel.smartMoney} />
        <WhaleTape items={data.intel.whaleTape} />
      </div>

      <PaymentRail perCall={data.payment.perCall} />

      <MarketTable
        tokens={data.market.tokens}
        loading={loading}
        selectedSymbol={selected}
        onSelect={onSelect}
      />
      <TokenDetail token={token} />
    </div>
  );
}