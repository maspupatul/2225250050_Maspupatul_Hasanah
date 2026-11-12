import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Props = {
  /** Number or emoji shown in the round badge. */
  badge: ReactNode;
  icon?: string;
  title?: string;
  children: ReactNode;
  /** Badge gradient (Tailwind classes); never the sign colours. */
  tone?: string;
  index?: number;
  dark?: boolean;
};

/** A rule, tip or hint as a soft card with a round badge instead of a bullet point. */
export function BadgeCard({
  badge,
  icon,
  title,
  children,
  tone = 'from-amber-300 to-accent',
  index = 0,
  dark = false,
}: Props) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30, delay: index * 0.06 }}
      className={`flex gap-4 rounded-3xl p-4 ${dark ? 'bg-plum-700/80 text-white' : 'border-2 border-lavender-200 bg-white text-ink shadow-pop-soft'}`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${tone} text-base font-black text-white shadow-sm ring-4 ${dark ? 'ring-white/10' : 'ring-lavender-50'}`}
        aria-hidden="true"
      >
        {badge}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        {title && (
          <p className={`text-xs font-extrabold uppercase tracking-wider ${dark ? 'text-amber-300' : 'text-plum-700'}`}>
            {icon && <span aria-hidden="true">{icon} </span>}
            {title}
          </p>
        )}
        <div className={`text-[15px] leading-7 ${title ? 'mt-1' : ''}`}>{children}</div>
      </div>
    </motion.li>
  );
}
