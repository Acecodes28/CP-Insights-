// Small monogram mark: a hexagon (nods to the rating-tier hex avatars CF
// communities already recognize) with a rising bar-chart tick standing in
// for the "C" and "P" — reads as an analytics mark, not a generic logomark.
// Recolored for the dark arena theme: violet-to-cyan gradient stroke with
// a soft glow filter so the mark reads as "electric" against near-black.
export default function Logo({ size = 28 }) {
  const gradientId = "logo-gradient";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="brand-logo"
    >
      <defs>
        <linearGradient id={gradientId} x1="2.5" y1="1.5" x2="29.5" y2="30.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <path
        d="M16 1.5L29.5 9V23L16 30.5L2.5 23V9L16 1.5Z"
        fill="#131019"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.4"
      />
      <path d="M10 20V15.5" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 20V11" stroke="#F3F1FA" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 20V13.5" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
