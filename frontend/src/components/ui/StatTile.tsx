import { motion } from 'framer-motion';

type Props = { icon: string; value: number | string; label: string; index?: number };

/** Compact statistic tile for grids (no horizontal scrolling, fits 360 px). */
export function StatTile({ icon, value, label, index = 0 }: Props) {
  return (
    <motion.li
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26, delay: index * 0.05 }}
      className="card-3d flex min-w-0 flex-col items-center px-2 py-3 text-center"
    >
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-lavender-100 text-lg" aria-hidden="true">
        {icon}
      </span>
      <span className="mt-1 text-2xl font-black leading-tight text-ink">{value}</span>
      <span className="text-[11px] font-bold leading-tight text-ink-muted">{label}</span>
    </motion.li>
  );
}
