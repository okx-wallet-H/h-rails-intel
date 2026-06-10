import { useState } from "react";

interface TokenIconProps {
  symbol: string;
  iconUrl?: string;
  color: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = { sm: 36, md: 44, lg: 56 };

export function TokenIcon({ symbol, iconUrl, color, size = "sm" }: TokenIconProps) {
  const [failed, setFailed] = useState(false);
  const px = SIZES[size];

  if (!iconUrl || failed) {
    return (
      <span
        className={`token-icon token-icon--fallback token-icon--${size}`}
        style={{ background: color }}
        aria-hidden="true"
      >
        {symbol.slice(0, 1)}
      </span>
    );
  }

  return (
    <span className={`token-icon token-icon--${size}`}>
      <img
        src={iconUrl}
        alt={`${symbol} logo`}
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}