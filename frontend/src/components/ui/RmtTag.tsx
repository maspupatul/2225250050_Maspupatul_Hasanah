import { t } from '../../i18n/id';

type Props = { phase: 1 | 2 | 3; action: string; className?: string };

/**
 * Small marker of the RMT phase and the thinking action (cognitive function) on this screen.
 * Plum on lavender: never the positive/negative signal colours.
 */
export function RmtTag({ phase, action, className = '' }: Props) {
  return (
    <p
      className={`inline-flex max-w-full flex-wrap items-center gap-x-1.5 rounded-full bg-lavender-100 px-2.5 py-1 text-[11px] font-bold leading-snug text-plum-700 ${className}`}
      title={`${t.rmt.phase(phase)}: ${t.rmt.phaseName[phase]}`}
    >
      <span className="font-extrabold uppercase tracking-wide">{t.rmt.phase(phase)}</span>
      <span aria-hidden="true">·</span>
      <span>{action}</span>
    </p>
  );
}
