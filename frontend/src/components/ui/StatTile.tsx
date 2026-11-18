import { motion } from 'framer-motion';
import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  value: number | string;
  label: string;
  /** Pastel badge behind the icon + icon colour (Tailwind classes). Never the sign colours. */
  tone?: string;
  index?: number;
};

/** Compact statistic tile for grids (no horizontal scrolling, fits 360 px). */
export function StatTile({ icon, value, label, tone = 'bg-lavender-100 text-plum-700', index = 0 }: Props) {
  return (
    <motion.li
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26, delay: index * 0.05 }}
      className="card-3d flex min-w-0 flex-col items-center px-2 py-3 text-center"
    >
      <span className={`grid h-10 w-10 place-items-center rounded-full ${tone}`}>
        <Icon name={icon} size={22} />
      </span>
      <span className="mt-1.5 text-2xl font-black leading-tight text-ink">{value}</span>
      <span className="text-[11px] font-bold leading-tight text-ink-muted">{label}</span>
    </motion.li>
  );
}
