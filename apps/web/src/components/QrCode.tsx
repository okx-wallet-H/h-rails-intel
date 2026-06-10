import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QrCodeProps {
  value: string;
  label?: string;
  size?: number;
}

export function QrCode({ value, label, size = 168 }: QrCodeProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return (
    <div className="gateway-qr">
      {src ? (
        <img src={src} alt={label || "QR Code"} width={size} height={size} className="gateway-qr__img" />
      ) : (
        <div className="gateway-qr__placeholder" style={{ width: size, height: size }} />
      )}
      {label ? <span className="gateway-qr__label">{label}</span> : null}
    </div>
  );
}