import { motion } from 'framer-motion';
import { useId } from 'react';
import { t } from '../../i18n/id';

type Props = {
  /** Width/height in px. */
  size?: number;
  /** Bounce in when the page loads. */
  animateIn?: boolean;
};

const POP = { transformBox: 'fill-box', transformOrigin: 'center' } as const;

/**
 * Brand mark: the double-struck ℤ (Zahlen, the set of integers … −2, −1, 0, 1, 2 …)
 * on an orange 3D badge. The + accent is blue and the − accent is red: the same
 * sign colours used everywhere in the app (CLAUDE.md §5.4).
 */
export function ZLogo({ size = 40, animateIn = true }: Props) {
  const gradient = `zlogo-${useId().replace(/:/g, '')}`;
  return (
    <motion.span
      role="img"
      aria-label={t.appName}
      className="inline-grid shrink-0 cursor-pointer select-none place-items-center"
      style={{ width: size, height: size }}
      initial={animateIn ? { scale: 0.4, rotate: -12, opacity: 0 } : false}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 14 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.86, rotate: 8 }}
    >
      <svg viewBox="-7 -7 80 82" width={size} height={size} aria-hidden="true" overflow="visible">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#f26b3a" />
          </linearGradient>
        </defs>

        {/* 3D badge: dark lip underneath, gradient face, soft gloss */}
        <rect x="0" y="5" width="66" height="66" rx="17" fill="#c2410c" />
        <rect x="0" y="0" width="66" height="66" rx="17" fill={`url(#${gradient})`} />
        <ellipse cx="25" cy="12" rx="20" ry="7" fill="#fff" opacity="0.22" />

        {/* double-struck Z: two bars + a diagonal band with a hairline inside */}
        <g fill="#fff">
          <rect x="16" y="14" width="34" height="8" rx="2.5" />
          <rect x="16" y="44" width="34" height="8" rx="2.5" />
          <path d="M40 22 H49 L26 44 H17 Z" />
        </g>
        <path d="M44.5 22.5 L21.5 43.5" stroke="#f26b3a" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M19.5 15.5 V20.5 M46.5 45.5 V50.5" stroke="#f26b3a" strokeWidth="1.6" strokeLinecap="round" />

        {/* sign accents pop in after the badge */}
        <motion.g
          style={POP}
          initial={animateIn ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.25 }}
        >
          <circle cx="62" cy="4" r="9" fill="#1d4ed8" stroke="#fff" strokeWidth="2.5" />
          <path d="M57.5 4 H66.5 M62 -0.5 V8.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        </motion.g>
        <motion.g
          style={POP}
          initial={animateIn ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.35 }}
        >
          <circle cx="4" cy="64" r="9" fill="#dc2626" stroke="#fff" strokeWidth="2.5" />
          <path d="M-0.5 64 H8.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        </motion.g>
      </svg>
    </motion.span>
  );
}
