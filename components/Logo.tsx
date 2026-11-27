export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="ps-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#ps-g)" />
      <circle cx="32" cy="32" r="15" fill="none" stroke="#fff" strokeWidth="6" />
      <circle cx="37" cy="27" r="4.5" fill="#fff" />
    </svg>
  );
}
