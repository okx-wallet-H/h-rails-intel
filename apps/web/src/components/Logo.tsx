interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  variant?: "full" | "mark";
}

export function Logo({ size = 32, showWordmark = true, variant = "full" }: LogoProps) {
  return (
    <span className={`logo ${variant === "mark" ? "logo--mark" : ""}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="logo__svg"
      >
        <rect width="64" height="64" rx="16" fill="url(#hrails-bg)" />
        <path d="M18 14v36M46 14v36" stroke="#F59E0B" strokeWidth="5" strokeLinecap="round" />
        <path d="M18 32h28" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" />
        <path
          d="M14 22h36M14 42h36"
          stroke="#F59E0B"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.55"
        />
        <circle cx="32" cy="32" r="4" fill="#38BDF8" />
        <defs>
          <linearGradient id="hrails-bg" x1="8" y1="8" x2="56" y2="56">
            <stop stopColor="#111827" />
            <stop offset="1" stopColor="#0A0E17" />
          </linearGradient>
        </defs>
      </svg>
      {showWordmark && variant === "full" ? (
        <span className="logo__text">
          H <em>Rails</em>
        </span>
      ) : null}
    </span>
  );
}