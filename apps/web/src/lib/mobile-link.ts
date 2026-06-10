export interface GatewayMobileLinks {
  gatewayUrl: string;
  okxDeepLink: string;
  okxUniversalLink: string;
  lanIp: string | null;
  isLocalhost: boolean;
}

export async function fetchGatewayMobileLinks(): Promise<GatewayMobileLinks> {
  const host = window.location.hostname;
  const port = window.location.port || "5173";
  const protocol = window.location.protocol.replace(":", "");
  const qs = new URLSearchParams({ host, port, protocol });
  const res = await fetch(`/api/v1/gateway/mobile-links?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "加载失败");
  return json.data;
}