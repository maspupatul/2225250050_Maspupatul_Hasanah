import { useState } from 'react';
import { t } from '../../i18n/id';
import type { Keyword } from '../../lib/types';

const SIGN_STYLE: Record<string, string> = {
  '+': 'decoration-positive text-positive',
  '-': 'decoration-negative text-negative',
  '0': 'decoration-zero text-zero',
  none: 'decoration-plum-600 text-plum-700',
};

type Props = { text: string; keywords: Keyword[]; highlight?: string | null };

/** Problem text with tappable keywords (signaling, F-07) and an optional highlight (hint). */
export function ProblemText({ text, keywords, highlight }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const hlStart = highlight ? text.indexOf(highlight) : -1;
  const hlEnd = hlStart >= 0 && highlight ? hlStart + highlight.length : -1;

  const cuts = new Set<number>([0, text.length]);
  keywords.forEach((k) => {
    cuts.add(k.start);
    cuts.add(k.end);
  });
  if (hlStart >= 0) {
    cuts.add(hlStart);
    cuts.add(hlEnd);
  }
  const points = [...cuts].sort((a, b) => a - b);

  const pieces = points.slice(0, -1).map((start, i) => {
    const end = points[i + 1];
    const kwIndex = keywords.findIndex((k) => k.start <= start && end <= k.end);
    const marked = hlStart >= 0 && hlStart <= start && end <= hlEnd;
    const slice = text.slice(start, end);
    const markClass = marked ? 'rounded bg-amber-200/80 px-0.5' : '';
    if (kwIndex >= 0) {
      const kw = keywords[kwIndex];
      return (
        <button
          key={start}
          type="button"
          onClick={() => setActive(active === kwIndex ? null : kwIndex)}
          className={`font-extrabold underline decoration-dotted decoration-2 underline-offset-4 ${SIGN_STYLE[kw.sign ?? 'none']} ${markClass}`}
        >
          {slice}
        </button>
      );
    }
    return (
      <span key={start} className={markClass}>
        {slice}
      </span>
    );
  });

  const activeKw = active !== null ? keywords[active] : null;
  return (
    <div>
      <p className="text-center text-[18px] font-bold leading-relaxed text-ink">{pieces}</p>
      {activeKw && (
        <div className="mt-3 rounded-2xl bg-lavender-50 px-4 py-3 text-sm" role="status">
          <p className="font-extrabold text-ink">
            🔎 {activeKw.phrase}
            {activeKw.sign && (
              <span className={`ml-2 rounded-full bg-white px-2 py-0.5 text-xs ${SIGN_STYLE[activeKw.sign]}`}>
                {t.practice.keywordSign[activeKw.sign]}
              </span>
            )}
          </p>
          <p className="mt-1 text-ink-muted">{activeKw.explanation}</p>
        </div>
      )}
    </div>
  );
}
