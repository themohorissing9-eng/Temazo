export function Logo({ className, vibrate }: { className?: string; vibrate?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="TEMAZO — banda de rock"
      className={`${className ?? ""}${vibrate ? " animate-vibrate" : ""}`}
    >
      <defs>
        <linearGradient id="temazo-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="0.5" stopColor="#f97316" />
          <stop offset="1" stopColor="#c2410c" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="15" fill="url(#temazo-logo-grad)" />

      {/* nota musical */}
      <g fill="#111827">
        <ellipse
          cx="30"
          cy="26.5"
          rx="3.4"
          ry="2.5"
          transform="rotate(-20 30 26.5)"
        />
        <rect x="32.6" y="13" width="1.9" height="13.5" rx="0.95" />
        <path d="M34.5 13 c3.8 1.4 5.4 3.4 5.4 5.9 c0 1.5 -.6 3 -1.6 4 l-1.7 -1.2 c.8 -1 1.2 -2 1.2 -2.8 c0 -1.7 -1.5 -3.5 -3.3 -4.4 z" />
      </g>

      {/* guitarrista */}
      <g fill="#111827">
        <circle cx="18.5" cy="22" r="4.5" />
        <rect x="15.1" y="27" width="6.8" height="15" rx="3.4" />
        <rect
          x="12.5"
          y="38.5"
          width="14.5"
          height="8"
          rx="4"
          transform="rotate(-35 19.75 42.5)"
        />
        <path
          d="M17.2 29.5 c-1.8 2 -2.6 4.2 -1.9 6.2"
          stroke="#111827"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* baterista */}
      <g fill="#111827">
        <circle cx="46.5" cy="22" r="4.5" />
        <rect x="43.1" y="27" width="6.8" height="14" rx="3.4" />
        {/* bombo */}
        <circle cx="45.5" cy="51" r="9" />
        <circle
          cx="45.5"
          cy="51"
          r="6.3"
          fill="none"
          stroke="#111827"
          strokeWidth="1.4"
        />
        {/* redoblante */}
        <rect x="37.5" y="42.5" width="9" height="3.6" rx="1.8" />
        <path d="M39.5 46.1 v4.5" stroke="#111827" strokeWidth="1.6" />
        {/* palillos */}
        <path
          d="M41.2 30.5 L34 21.5"
          stroke="#111827"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M49.2 30.5 L56.5 22.5"
          stroke="#111827"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* hi-hat */}
        <ellipse cx="32" cy="39.5" rx="4" ry="1.5" />
        <path d="M32 41 v6" stroke="#111827" strokeWidth="1.6" />
        {/* crash */}
        <ellipse cx="57" cy="34.5" rx="4.2" ry="1.6" />
        <path d="M57 36.1 v3.2" stroke="#111827" strokeWidth="1.6" />
      </g>
    </svg>
  );
}
