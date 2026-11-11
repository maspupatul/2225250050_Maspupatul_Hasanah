import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { t } from '../../i18n/id';
import { useProgress } from '../../store/progress';
import { NavIcon, type NavIconName } from './NavIcon';

const items: {
  to: string;
  label: string;
  icon: NavIconName;
  match: (path: string) => boolean;
}[] = [
  { to: '/', label: t.nav.learn, icon: 'learn', match: (p) => p === '/' },
  {
    to: '/latihan',
    label: t.nav.practice,
    icon: 'practice',
    match: (p) => p.startsWith('/latihan'),
  },
  {
    to: '/ujian-akhir',
    label: t.nav.exam,
    icon: 'exam',
    match: (p) => p.startsWith('/ujian-akhir'),
  },
  {
    to: '/profil',
    label: t.nav.profile,
    icon: 'profile',
    match: (p) => p.startsWith('/profil'),
  },
];

/** Floating pill tab bar. The orange pill slides to the active tab (shared layout). */
export function BottomNav() {
  const { pathname } = useLocation();
  const queue = useProgress((s) => s.reviewQueue.length);

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
    >
      <ul className="grid grid-cols-4 gap-1 rounded-full bg-plum-900/95 p-1.5 shadow-card ring-1 ring-white/10 backdrop-blur">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className="relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <motion.span
                  whileTap={{ scale: 0.9 }}
                  className={`relative flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-extrabold leading-none transition-colors ${active ? 'text-white' : 'text-white/55 hover:text-white/85'}`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  )}
                  <span className="relative">
                    <NavIcon name={item.icon} filled={active} />
                    {item.icon === 'practice' && queue > 0 && (
                      <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[10px] text-plum-900">
                        {queue}
                      </span>
                    )}
                  </span>
                  <span className="relative whitespace-nowrap">{item.label}</span>
                </motion.span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
