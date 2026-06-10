import { useEffect, useState } from "react";
import { QrCode } from "./QrCode";
import { fetchGatewayMobileLinks, type GatewayMobileLinks } from "../lib/mobile-link";

export function GatewayMobileQr() {
  const [links, setLinks] = useState<GatewayMobileLinks | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGatewayMobileLinks()
      .then(setLinks)
      .catch((e) => setError(e instanceof Error ? e.message : "二维码加载失败"));
  }, []);

  if (error) {
    return <p className="muted gateway-wallet__subhint">{error}</p>;
  }

  if (!links) {
    return <p className="muted gateway-wallet__subhint">生成二维码中…</p>;
  }

  return (
    <div className="gateway-mobile-qr">
      <div className="gateway-mobile-qr__head">
        <h4>手机扫码连接</h4>
        <p className="muted">用 OKX Wallet App 扫码，在手机上连接钱包并领取 Key</p>
      </div>
      <div className="gateway-mobile-qr__grid">
        <QrCode value={links.okxUniversalLink} label="OKX Wallet 打开" />
        <QrCode value={links.gatewayUrl} label="手机浏览器" />
      </div>
      <p className="muted gateway-wallet__subhint">
        {links.isLocalhost && links.lanIp
          ? <>请确保手机和电脑在同一 Wi‑Fi。扫码地址：<code>{links.gatewayUrl}</code></>
          : <>扫码后点击「连接钱包」，在 X Layer 上领取 Free Key。</>}
      </p>
    </div>
  );
}