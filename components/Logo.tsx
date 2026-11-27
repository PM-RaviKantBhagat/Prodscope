export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="ps-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="63" height="63" rx="15" fill="#0B0B12" stroke="#ffffff" strokeOpacity="0.14" />
      <rect x="16" y="13" width="7.5" height="38" rx="3.75" fill="#fff" />
      <circle cx="33.5" cy="26" r="11" fill="none" stroke="#fff" strokeWidth="7.5" />
      <circle cx="33.5" cy="26" r="4" fill="url(#ps-g)" />
    </svg>
  );
}
