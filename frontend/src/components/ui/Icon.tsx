import type { ReactNode, SVGProps } from 'react';

/**
 * Duotone line icons (24 × 24, 2 px stroke). One colour via `currentColor`:
 * the outline is solid, the main shape is filled at low opacity. Replaces the OS
 * emoji so icons look the same on every device (UI-UX.md §Ikon).
 */
export type IconName =
  | 'abacus'
  | 'alert'
  | 'backpack'
  | 'book'
  | 'book-open'
  | 'calendar'
  | 'card'
  | 'chart'
  | 'check'
  | 'check-circle'
  | 'chevron-down'
  | 'chevron-right'
  | 'close'
  | 'compass'
  | 'copy'
  | 'chat'
  | 'divide'
  | 'download'
  | 'eraser'
  | 'flag'
  | 'flame'
  | 'gamepad'
  | 'hourglass'
  | 'image'
  | 'install'
  | 'lightbulb'
  | 'lock'
  | 'logout'
  | 'medal'
  | 'minus'
  | 'number-line'
  | 'pen'
  | 'pencil'
  | 'plus'
  | 'plus-circle'
  | 'plus-minus'
  | 'puzzle'
  | 'refresh'
  | 'scale'
  | 'search'
  | 'settings'
  | 'sparkles'
  | 'star'
  | 'support'
  | 'swap'
  | 'target'
  | 'teacher'
  | 'thermometer'
  | 'thought'
  | 'times'
  | 'times-divide'
  | 'trash'
  | 'trophy'
  | 'user'
  | 'users'
  | 'waves';

// the soft "second tone" of a duotone icon
const D = { fill: 'currentColor', fillOpacity: 0.2 } as const;
const DOT = { fill: 'currentColor', stroke: 'none' } as const;
const SOFT_SQUARE = <rect x="3.5" y="3.5" width="17" height="17" rx="5" {...D} stroke="none" />;

const PATHS: Record<IconName, ReactNode> = {
  abacus: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2.5" {...D} />
      <rect x="8" y="6" width="8" height="3.5" rx="1" />
      {[9, 12, 15].map((x) => (
        <g key={x}>
          <circle cx={x} cy="13.5" r="1" {...DOT} />
          <circle cx={x} cy="17" r="1" {...DOT} />
        </g>
      ))}
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" {...D} />
      <path d="M12 7.5V13" />
      <circle cx="12" cy="16.5" r="1.1" {...DOT} />
    </>
  ),
  backpack: (
    <>
      <path d="M6 10a6 6 0 0 1 12 0v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z" {...D} />
      <path d="M9.5 4.3V3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v.8M9 14.5h6v3.5H9Z" />
    </>
  ),
  book: (
    <>
      <path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2Z" {...D} />
      <path d="M5 20a1.5 1.5 0 0 0 1.5 1.5H19V18M9 7.5h6" />
    </>
  ),
  'book-open': (
    <>
      <path d="M3 5.5c3-1 6-.6 9 1.5 3-2.1 6-2.5 9-1.5V19c-3-1-6-.6-9 1.5-3-2.1-6-2.5-9-1.5Z" {...D} />
      <path d="M12 7v13.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" {...D} />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" {...D} />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
  chart: (
    <>
      <path d="M7 15l4-4 3 3 5-6v12H7Z" {...D} stroke="none" />
      <path d="M4 4v16h16M7 15l4-4 3 3 5-6" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" {...D} />
      <path d="m8 12.3 2.8 2.8L16 9.8" />
    </>
  ),
  'chevron-down': <path d="m5.5 9 6.5 6.5L18.5 9" />,
  'chevron-right': <path d="m9 5.5 6.5 6.5L9 18.5" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" {...D} />
      <path d="m15.5 8.5-2 5-5 2 2-5Z" fill="currentColor" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12.5" height="12.5" rx="2.5" {...D} />
      <path d="M16 8V5.5A2 2 0 0 0 14 3.5H5.5a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2H8" />
    </>
  ),
  chat: (
    <>
      <path d="M5 4h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 16h-8l-5 4v-4H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 4Z" {...D} />
      <path d="M8 8.5h8M8 12h5" />
    </>
  ),
  divide: (
    <>
      {SOFT_SQUARE}
      <path d="M8 12h8" />
      <circle cx="12" cy="8.3" r="1.2" {...DOT} />
      <circle cx="12" cy="15.7" r="1.2" {...DOT} />
    </>
  ),
  download: (
    <>
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3Z" {...D} stroke="none" />
      <path d="M12 4v10.5M7.5 10l4.5 4.5 4.5-4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  eraser: (
    <>
      <path d="M8.5 20 3.7 15.2a1.8 1.8 0 0 1 0-2.5L12.7 3.7a1.8 1.8 0 0 1 2.5 0l5.1 5.1a1.8 1.8 0 0 1 0 2.5L11.3 20Z" {...D} />
      <path d="M7.5 9 15 16.5M8.5 20H21" />
    </>
  ),
  flag: (
    <>
      <path d="M5 4h12l-2.5 4L17 12H5Z" {...D} />
      <path d="M5 21V4" />
    </>
  ),
  flame: (
    <path
      d="M12 2.5c.8 3.4 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.4 1.2-3.9 2.4-5 .3 1.8 1.1 2.9 2.3 3 0-3.4-.9-6.2.8-9Z"
      {...D}
    />
  ),
  gamepad: (
    <>
      <path
        d="M7 8h10a4 4 0 0 1 4 4v2.5a3 3 0 0 1-5.4 1.8L14.5 15h-5l-1.1 1.3A3 3 0 0 1 3 14.5V12a4 4 0 0 1 4-4Z"
        {...D}
      />
      <path d="M7.5 10.5v3M6 12h3" />
      <circle cx="15.5" cy="11" r="1" {...DOT} />
      <circle cx="17.5" cy="13" r="1" {...DOT} />
    </>
  ),
  hourglass: (
    <>
      <path d="M9.5 19.5c.8-2 4.2-2 5 0Z" {...D} stroke="none" />
      <path d="M7 3h10M7 21h10M8 3c0 4 8 5 8 9s-8 5-8 9M16 3c0 4-8 5-8 9s8 5 8 9" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" {...D} />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m3.5 17 5-5 4 4 2.5-2.5 5.5 5" />
    </>
  ),
  install: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="3" {...D} />
      <path d="M12 7v6.5M9.2 10.8 12 13.5l2.8-2.7M10.5 18.5h3" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.4.3.6.8.6 1.3V16h6v-.9c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3Z" {...D} />
      <path d="M9.5 19h5M10.5 21.5h3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" {...D} />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" />
    </>
  ),
  logout: (
    <>
      <path d="M3 5a2 2 0 0 1 2-2h4v18H5a2 2 0 0 1-2-2Z" {...D} stroke="none" />
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  medal: (
    <>
      <path d="M8 2.5l2.5 6.5M16 2.5 13.5 9" />
      <circle cx="12" cy="15" r="6" {...D} />
      <path d="m12 12 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5L11 14Z" fill="currentColor" strokeWidth={1} />
    </>
  ),
  minus: (
    <>
      {SOFT_SQUARE}
      <path d="M8 12h8" />
    </>
  ),
  'number-line': (
    <>
      <circle cx="12" cy="12" r="2.6" {...D} />
      <path d="M3 12h18M6.5 9.5v5M17.5 9.5v5M19 9.5l2.5 2.5-2.5 2.5M5 9.5 2.5 12 5 14.5" />
    </>
  ),
  pen: (
    <>
      <path d="m12.5 18.5 6-6 2.5 2.5-6 6Z" {...D} />
      <path d="m18 13-1.4-6.9L3.5 3.5l2.6 13.1L13 18M3.5 3.5l6.6 6.6" />
      <circle cx="11.5" cy="11.5" r="1.8" />
    </>
  ),
  pencil: (
    <>
      <path d="M15.5 4.5l4 4L9 19l-5 1 1-5Z" {...D} />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  plus: (
    <>
      {SOFT_SQUARE}
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  'plus-circle': (
    <>
      <circle cx="12" cy="12" r="9" {...D} />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  'plus-minus': (
    <>
      {SOFT_SQUARE}
      <path d="M8.5 5.5v6M5.5 8.5h6M13 15.5h5.5M17 6.5l-10 11" />
    </>
  ),
  puzzle: (
    <path
      d="M5 7.5h3.5a2 2 0 1 1 4 0H16V11a2 2 0 1 1 0 4v3.5h-3.5a2 2 0 1 0-4 0H5V15a2 2 0 1 0 0-4Z"
      {...D}
    />
  ),
  refresh: (
    <>
      <circle cx="12" cy="12" r="5" {...D} stroke="none" />
      <path d="M20 11a8 8 0 0 0-14.3-4.5L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.5l1.7-2M20 20v-4.5h-4.5" />
    </>
  ),
  scale: (
    <>
      <path d="M5 7.5 2.5 13a2.5 2.5 0 0 0 5 0ZM19 7.5 16.5 13a2.5 2.5 0 0 0 5 0Z" {...D} />
      <path d="M12 4v16M8 20h8M5 7.5h14" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" {...D} />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2.2" {...D} />
      <circle cx="10" cy="17" r="2.2" {...D} />
    </>
  ),
  sparkles: (
    <>
      <path d="M11 3.5l1.9 5.1L18 10.5l-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9Z" {...D} />
      <path d="M18.5 15v5M16 17.5h5" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" {...D} />,
  support: (
    <>
      <circle cx="12" cy="12" r="9" {...D} />
      <circle cx="12" cy="12" r="4" />
      <path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6" />
    </>
  ),
  swap: (
    <>
      {SOFT_SQUARE}
      <path d="M7 9h10l-3-3M17 15H7l3 3" />
    </>
  ),
  target: (
    <>
      <circle cx="11" cy="13" r="8" {...D} />
      <circle cx="11" cy="13" r="4" />
      <circle cx="11" cy="13" r="1.3" {...DOT} />
      <path d="m14 10 6-6M17 4h3v3" />
    </>
  ),
  teacher: (
    <>
      <rect x="3" y="3.5" width="18" height="11" rx="1.5" {...D} />
      <path d="M12 14.5V18M8.5 21l3.5-3 3.5 3M7 11l3-3 2.5 2.5 4-4" />
    </>
  ),
  thermometer: (
    <>
      <path d="M10 4.5a2 2 0 0 1 4 0v9.3a4 4 0 1 1-4 0Z" {...D} />
      <path d="M12 9v7M17 6h2M17 9.5h2" />
    </>
  ),
  thought: (
    <>
      <path d="M7.5 15A4 4 0 0 1 7 7.1 5 5 0 0 1 16.6 6a3.5 3.5 0 0 1 .4 9Z" {...D} />
      <circle cx="7" cy="18.5" r="1.3" {...DOT} />
      <circle cx="4.5" cy="21" r="0.8" {...DOT} />
    </>
  ),
  times: (
    <>
      {SOFT_SQUARE}
      <path d="m8.5 8.5 7 7M15.5 8.5l-7 7" />
    </>
  ),
  'times-divide': (
    <>
      {SOFT_SQUARE}
      <path d="m6 6 4.5 4.5M10.5 6 6 10.5M13 16.5h5.5M17 6.5l-10 11" />
      <circle cx="15.75" cy="13.8" r="0.9" {...DOT} />
      <circle cx="15.75" cy="19.2" r="0.9" {...DOT} />
    </>
  ),
  trash: (
    <>
      <path d="M6 7h12l-1 12.5a2 2 0 0 1-2 1.5H9a2 2 0 0 1-2-1.5Z" {...D} />
      <path d="M4 7h16M9.5 7V4.5h5V7M10 11v6M14 11v6" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0Z" {...D} />
      <path d="M7 6H4.5a3 3 0 0 0 3 4.5M17 6h2.5a3 3 0 0 1-3 4.5M12 14v3.5M8 20.5h8M9.5 17.5h5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" {...D} />
      <path d="M4.5 20c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" {...D} />
      <path d="M3 20c1-3.5 3.3-5 6-5s5 1.5 6 5M16 4.8a3.5 3.5 0 0 1 0 6.4M17.5 15c2 .6 3 2.2 3.5 5" />
    </>
  ),
  waves: (
    <>
      <path d="M3 13c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0V20H3Z" {...D} stroke="none" />
      <path d="M3 8c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0M3 13c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0" />
    </>
  ),
};

type Props = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName;
  /** Width and height in px. */
  size?: number;
  /** Accessible name; without it the icon is decorative (aria-hidden). */
  label?: string;
};

export function Icon({ name, size = 24, label, className, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className ?? ''}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
