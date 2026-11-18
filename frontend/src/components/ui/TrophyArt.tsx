import { useId } from 'react';

type Props = {
  size?: number;
  /** Greyed-out version for a locked exam. */
  muted?: boolean;
};

/**
 * Minimal duotone trophy with a small crown (gold → orange). Used for the
 * Ujian Akhir instead of the 🏆 emoji. Never uses the sign colours blue/red.
 */
export function TrophyArt({ size = 40, muted = false }: Props) {
  const id = `trophy-${useId().replace(/:/g, '')}`;
  const light = muted ? '#cfcce3' : '#fde68a';
  const mid = muted ? '#a9a3c0' : '#fbbf24';
  const deep = muted ? '#8a8499' : '#f26b3a';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={mid} />
        </linearGradient>
      </defs>
      {/* crown */}
      <path d="M17 9.5 19.5 4l4.5 4 4.5-4L31 9.5Z" fill={deep} />
      {/* handles */}
      <path
        d="M14 15h-3.5a1.5 1.5 0 0 0-1.5 1.7c.6 4 3.3 7 7.2 7.8M34 15h3.5a1.5 1.5 0 0 1 1.5 1.7c-.6 4-3.3 7-7.2 7.8"
        fill="none"
        stroke={deep}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* cup: light face + deeper right half (duotone) */}
      <path d="M13.5 11.5h21V20a10.5 10.5 0 0 1-21 0Z" fill={`url(#${id})`} />
      <path d="M24 11.5h10.5V20A10.5 10.5 0 0 1 24 30.5Z" fill={deep} opacity="0.35" />
      <path d="M18 15.5v4.5a6 6 0 0 0 2.5 4.9" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      {/* stem + base */}
      <rect x="21.5" y="30" width="5" height="6" fill={mid} />
      <rect x="15" y="36" width="18" height="6" rx="2.5" fill={deep} />
      <rect x="19" y="38.3" width="10" height="1.6" rx="0.8" fill="#fff" opacity="0.55" />
    </svg>
  );
}
