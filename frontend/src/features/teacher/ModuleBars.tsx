import type { ModuleProgress } from '../../lib/types';

const SHORT: Record<string, string> = {
  m1: '±',
  m2: '×÷',
  m3: 'Sifat',
  m4: 'Cerita',
};

/**
 * Four small progress bars, one per module (subbab). Full titles use two columns on
 * phones so they wrap instead of being cut; the compact table row keeps four short labels.
 */
export function ModuleBars({ modules, compact = false }: { modules: ModuleProgress[]; compact?: boolean }) {
  return (
    <ul className={`grid ${compact ? 'grid-cols-4 gap-1.5' : 'grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-4'}`}>
      {modules.map((m) => (
        <li key={m.id} className="flex min-w-0 flex-col" title={`${m.title}: ${m.percent}%`}>
          <span
            className={`block text-[10px] font-extrabold uppercase leading-tight tracking-wide text-ink-muted ${compact ? 'truncate' : 'flex-1'}`}
          >
            {compact ? (SHORT[m.id] ?? m.title) : m.title}
          </span>
          <span className="mt-0.5 block h-2 overflow-hidden rounded-full bg-lavender-200">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-accent"
              style={{ width: `${m.percent}%` }}
            />
          </span>
          <span className="text-[11px] font-bold text-ink">{m.percent}%</span>
        </li>
      ))}
    </ul>
  );
}
