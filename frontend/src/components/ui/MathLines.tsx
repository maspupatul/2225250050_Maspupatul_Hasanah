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
    <div className="rounded-2xl bg-lavender-50 px-3 py-3 ring-1 ring-lavender-200 sm:px-4">
      <div
        className={`grid gap-y-2 font-mono text-[14px] leading-snug sm:text-[15px] text-ink tabular-nums ${aligned ? 'grid-cols-[auto_auto_1fr] gap-x-2' : ''}`}
      >
        {rows.map((row, i) => {
          const sign = signOf(row.right);
          return aligned ? (
            <div key={i} className="contents">
              <span className="text-right [overflow-wrap:anywhere]">
                <RichText text={row.left} />
              </span>
              <span className="text-center font-bold text-ink-muted">{row.sep}</span>
              <span className={`font-bold [overflow-wrap:anywhere] ${sign ? SIGN_CLASS[sign] : ''}`}>
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
