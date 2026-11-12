import type { ReactNode } from 'react';

type Props = {
  label: string;
  value: ReactNode;
  onLess: () => void;
  onMore: () => void;
  canLess: boolean;
  canMore: boolean;
  lessLabel: string;
  moreLabel: string;
};

/** − value + control with large touch targets (≥ 44 px). */
export function Stepper({ label, value, onLess, onMore, canLess, canMore, lessLabel, moreLabel }: Props) {
  const button =
    'grid h-11 w-11 place-items-center rounded-xl bg-white text-xl font-black text-ink shadow-sm ring-1 ring-lavender-200 transition active:scale-90 disabled:opacity-30';
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-lavender-50 px-3 py-2">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">{label}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          className={button}
          onClick={onLess}
          disabled={!canLess}
          aria-label={`${lessLabel} ${label}`}
        >
          −
        </button>
        <output className="min-w-12 text-center font-mono text-lg font-black tabular-nums" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className={button}
          onClick={onMore}
          disabled={!canMore}
          aria-label={`${moreLabel} ${label}`}
        >
          +
        </button>
      </span>
    </div>
  );
}
