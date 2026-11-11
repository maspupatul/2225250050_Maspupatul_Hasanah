import { t } from '../../i18n/id';
import type { Outcome } from '../../lib/score';

/** Three tiles: found alone, with hints, deferred. */
export function OutcomeStats({ outcomes }: { outcomes: Outcome[] }) {
  const selfFound = outcomes.filter((o) => o.selfFound).length;
  const deferred = outcomes.filter((o) => o.deferred).length;
  const stats = [
    { label: t.summary.selfFound, value: selfFound, icon: '🌟' },
    { label: t.summary.withHints, value: outcomes.length - selfFound - deferred, icon: '💡' },
    { label: t.summary.deferred, value: deferred, icon: '🔁' },
  ];
  return (
    <ul className="mt-5 grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <li key={s.label} className="rounded-2xl bg-lavender-50 px-2 py-3">
          <span className="text-xl" aria-hidden="true">{s.icon}</span>
          <p className="text-2xl font-black text-ink">{s.value}</p>
          <p className="text-[11px] font-bold leading-tight text-ink-muted">{s.label}</p>
        </li>
      ))}
    </ul>
  );
}
