export type NavIconName = 'learn' | 'practice' | 'exam' | 'profile';

/** Tab icons: outline when idle, filled when active. */
export function NavIcon({ name, filled }: { name: NavIconName; filled: boolean }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: filled ? 'currentColor' : 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (name) {
    case 'learn': // open map
      return (
        <svg {...common}>
          <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z" />
          <path d="M9 4v13M15 6.5v13" fill="none" stroke={filled ? '#3b2d4f' : 'currentColor'} />
        </svg>
      );
    case 'practice': // target
      return (
        <svg {...common} fill="none">
          <circle cx="12" cy="12" r="9" fill={filled ? 'currentColor' : 'none'} />
          <circle cx="12" cy="12" r="5" stroke={filled ? '#3b2d4f' : 'currentColor'} />
          <circle cx="12" cy="12" r="1.5" fill={filled ? '#3b2d4f' : 'currentColor'} stroke="none" />
        </svg>
      );
    case 'exam': // trophy
      return (
        <svg {...common}>
          <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
          <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" fill="none" />
        </svg>
      );
    default: // user
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6Z" />
        </svg>
      );
  }
}
