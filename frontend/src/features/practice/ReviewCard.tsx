import { t } from '../../i18n/id';
import type { Review } from '../../lib/types';
import { VisualView } from '../visuals/VisualView';

/** Shown ONLY after the student found the answer (reinforcement, not a giveaway). */
export function ReviewCard({ review, feedback }: { review: Review; feedback: string }) {
  return (
    <div className="space-y-3">
      <p className="rounded-2xl bg-green-50 px-4 py-3 text-center text-base font-extrabold text-correct">{feedback}</p>
      <h3 className="text-sm font-extrabold uppercase tracking-wider text-plum-700">{t.practice.reviewHeading}</h3>
      {review.model && (
        <div className="rounded-2xl bg-lavender-50 px-4 py-3">
          <p className="text-xs font-bold text-ink-muted">{t.practice.model}</p>
          <p className="text-xl font-black text-ink">
            {review.model} = {review.answer_text}
          </p>
        </div>
      )}
      {review.trace.length > 0 && (
        <ol className="space-y-1.5">
          {review.trace.map((step, i) => (
            <li key={i} className="rounded-2xl border border-lavender-200 px-4 py-2.5">
              <p className="font-extrabold text-ink">
                {step.expr} = {step.result_text}
              </p>
              <p className="text-xs text-ink-muted">{step.explain}</p>
            </li>
          ))}
        </ol>
      )}
      {review.interpretation && (
        <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm font-bold text-ink">
          {t.practice.meaning}: {review.interpretation}
        </p>
      )}
      <VisualView script={review.visual} />
      <p className="rounded-2xl border-2 border-dashed border-lavender-300 px-4 py-3 text-sm text-ink">
        💭 <span className="font-extrabold">{t.practice.reflection}:</span> {review.reflection}
      </p>
    </div>
  );
}
