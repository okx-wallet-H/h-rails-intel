/**
 * Minimal H Rails API client.
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {string} opts.apiKey
 */
export function createClient({ baseUrl = "http://localhost:3847", apiKey }) {
  if (!apiKey) throw new Error("apiKey is required");

  async function request(path, init = {}) {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
        ...(init.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    health: () => fetch(`${baseUrl}/api/health`).then((r) => r.json()),
    gatewayConfig: () => fetch(`${baseUrl}/api/v1/gateway/config`).then((r) => r.json()),
    marketOverview: () => request("/api/v1/market/overview"),
    tokenIntel: (chain, address) => request(`/api/v1/token/${chain}/${address}`),
    monitor: (chain) => request(`/api/v1/monitor/${chain}`),
    validateKey: () => request("/api/v1/key/validate"),
  };
}