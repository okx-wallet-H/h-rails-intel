import os from "node:os";

export function getLanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return null;
}

export function buildGatewayMobileLinks({ host, port = 5173, protocol = "http" } = {}) {
  const lanIp = getLanIp();
  const mobileHost = host === "localhost" || host === "127.0.0.1" ? lanIp || host : host;
  const gatewayUrl = `${protocol}://${mobileHost}:${port}/#gateway`;

  const encodedDapp = encodeURIComponent(gatewayUrl);
  const okxDeepLink = `okxwallet://wallet/dapp/url?dappUrl=${encodedDapp}`;
  const okxUniversalLink = `https://web3.okx.com/download?deeplink=${encodeURIComponent(okxDeepLink)}`;

  return {
    gatewayUrl,
    okxDeepLink,
    okxUniversalLink,
    lanIp,
    isLocalhost: host === "localhost" || host === "127.0.0.1",
  };
}