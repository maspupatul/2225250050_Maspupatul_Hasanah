import { signOf, splitMathLine } from '../../lib/mathLines';
import { RichText } from './RichText';

const SIGN_CLASS = { positive: 'text-positive', negative: 'text-negative', zero: 'text-zero' } as const;

/**
 * Math written line by line in a monospace grid, aligned on the separator, so a
 * pattern (3 × (−2) = −6, 2 × (−2) = −4, …) can be read top to bottom.
 * Lone results keep the sign colours (CLAUDE.md §5.4).
 */
export function MathLines({ lines }: { lines: string[] }) {
  const rows = lines.map(splitMathLine);
  const aligned = rows.some((r) => r.sep);
  return (
    <div className="overflow-x-auto rounded-2xl bg-lavender-50 px-4 py-3 ring-1 ring-lavender-200">
      <div
        className={`grid gap-y-2 font-mono text-[15px] leading-snug text-ink tabular-nums ${aligned ? 'grid-cols-[auto_auto_1fr] gap-x-2' : ''}`}
      >
        {rows.map((row, i) => {
          const sign = signOf(row.right);
          return aligned ? (
            <div key={i} className="contents">
              <span className="whitespace-nowrap text-right">
                <RichText text={row.left} />
              </span>
              <span className="text-center font-bold text-ink-muted">{row.sep}</span>
              <span className={`whitespace-nowrap font-bold ${sign ? SIGN_CLASS[sign] : ''}`}>
                <RichText text={row.right} />
              </span>
            </div>
          ) : (
            <span key={i}>
              <RichText text={row.left} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
