export interface TokenMarket {
  symbol: string;
  name: string;
  chain: string;
  chainIndex: string;
  address: string;
  color: string;
  iconUrl: string;
  price: number;
  priceFormatted: string;
  change24h: number;
  volume24h: number;
  liquidity: number;
  holders: number;
  sparkline: number[];
}

export interface MarketSummary {
  tracked: number;
  gainers: number;
  losers: number;
  totalVolume24h: number;
  totalLiquidity: number;
  lastUpdate: number;
}

export interface DeepIntel {
  chain: string;
  address: string;
  price: string;
  change: { m5: string; h1: string; h4: string; h24: string };
  liquidity: string;
  marketCap: string;
  holders: string;
  tradeNum: string;
  volume: { m5: string; h1: string; h4: string; h24: string };
  txs: { m5: string; h1: string; h4: string; h24: string };
  risk: {
    level: string;
    top10Hold: string;
    sniperHold: string;
    bundleHold: string;
    suspiciousHold: string;
    devRugCount: string;
    tags: string[];
  };
  vibe: {
    score: string;
    impressions: string;
    impressionsChange: string;
    engagement: string;
    mentions: string;
    kols: unknown[];
  };
  whaleTape: Array<{ price: string; time: string; dex: string; hash: string; tokens: unknown[] }>;
  smartMoney: Array<{
    symbol: string; name: string; logo: string; amountUsd: string;
    wallets: string; top10: string; marketCap: string; soldRatio: string;
  }>;
}

export interface MonitorFeed {
  chain: string;
  signals: Array<{ id: string; symbol: string; logo: string; amountUsd: string; wallets: string; price: string; top10: string; marketCap: string; time: string }>;
  hot: Array<{ symbol: string; logo: string; price: string; change: string; volume: string; address: string }>;
  leaders: Array<{ address: string; pnl: string; winRate: string; volume: string }>;
  sentiment: Array<{ symbol: string; bullish: string; bearish: string; mentions: string }>;
}

export interface DashboardPayload {
  market: { tokens: TokenMarket[]; summary: MarketSummary };
  intel: DeepIntel;
  monitor: MonitorFeed;
  payment: { asset: string; network: string; perCall: string };
}