import { StatTile } from '../../components/ui/StatTile';
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
      {stats.map((s, i) => (
        <StatTile key={s.label} icon={s.icon} value={s.value} label={s.label} index={i} />
      ))}
    </ul>
  );
}
