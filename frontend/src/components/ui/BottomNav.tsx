import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { t } from '../../i18n/id';
import { useProgress } from '../../store/progress';
import { NavIcon, type NavIconName } from './NavIcon';

const TABS: { to: string; label: string; icon: NavIconName }[] = [
  { to: '/', label: t.nav.learn, icon: 'learn' },
  { to: '/latihan', label: t.nav.practice, icon: 'practice' },
  { to: '/ujian-akhir', label: t.nav.exam, icon: 'exam' },
  { to: '/profil', label: t.nav.profile, icon: 'profile' },
];

/** The tab bar shows only on the four tab pages (not inside a lesson, practice or exam). */
export const isTabPage = (pathname: string) => TABS.some((tab) => tab.to === pathname);

// same curve as the lesson slides (SlideIn): quick start, soft landing, no overshoot
const PILL_MOVE = { type: 'tween', duration: 0.25, ease: [0.22, 1, 0.36, 1] } as const;

/**
 * Floating pill tab bar, rendered ONCE by App (outside the routes). Because it stays
 * mounted while the page changes, the orange indicator (layoutId) can glide from the
 * old tab to the new one instead of snapping.
 */
export function BottomNav() {
  const { pathname } = useLocation();
  const queue = useProgress((s) => s.reviewQueue.length);
  if (!isTabPage(pathname)) return null;

  return (
    <nav
      aria-label="Navigasi utama"
      // own GPU layer: the bar stays put and does not flicker while the page behind it changes
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] [transform:translateZ(0)]"
    >
      <ul className="grid grid-cols-4 gap-1 rounded-full bg-plum-900/95 p-1.5 shadow-[0_5px_0_#231a2f] ring-1 ring-white/10 backdrop-blur">
        {TABS.map((tab) => {
          const active = tab.to === pathname;
          return (
            <li key={tab.to} className="min-w-0">
              <NavLink
                to={tab.to}
                aria-current={active ? 'page' : undefined}
                className="relative block touch-manipulation rounded-full outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-accent"
              >
                {/* instant press feedback in CSS (no JS wait); colours follow the indicator */}
                <span
                  className={`relative flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-extrabold leading-none transition-[color,transform] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 active:duration-150 active:ease-out ${active ? 'text-white' : 'text-white/55 hover:text-white/85'}`}
                >
                  {active && (
                    <motion.span
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 rounded-full bg-accent shadow-[0_3px_0_#c2410c]"
                      transition={PILL_MOVE}
                    />
                  )}
                  <motion.span
                    className="relative"
                    // the icon hops once when its tab becomes active
                    animate={active ? { y: [0, -4, 0], scale: [1, 1.12, 1] } : { y: 0, scale: 1 }}
                    transition={{ duration: 0.35 }}
                  >
                    <NavIcon name={tab.icon} filled={active} />
                    {tab.icon === 'practice' && queue > 0 && (
                      <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[10px] text-plum-900">
                        {queue}
                      </span>
                    )}
                  </motion.span>
                  <span className="relative max-w-full truncate">{tab.label}</span>
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
