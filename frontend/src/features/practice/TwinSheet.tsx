import { t } from '../../i18n/id';
import type { Twin } from '../../lib/types';
import { VisualView } from '../visuals/VisualView';

/** Soal Kembar: a fully worked example with different numbers and context. */
export function TwinSheet({ twin, onClose }: { twin: Twin; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-plum-950/60" role="dialog" aria-modal="true" aria-labelledby="twin-title">
      <div className="max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-4xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] text-ink">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-lavender-300" />
        <h2 id="twin-title" className="text-lg font-extrabold">🔁 {t.practice.twinTitle}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t.practice.twinOffer}</p>
        <p className="mt-4 rounded-2xl bg-lavender-50 px-4 py-3 font-bold leading-relaxed">{twin.text}</p>
        <ol className="mt-3 space-y-2">
          {twin.steps.map((step, i) => (
            <li key={step.key} className="rounded-2xl border border-lavender-200 px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-accent">
                {i + 1}. {step.label}
              </p>
              <p className="mt-1 font-bold">{step.content}</p>
              <p className="mt-1 text-xs text-ink-muted">{step.why}</p>
            </li>
          ))}
        </ol>
        {twin.visual && (
          <div className="mt-3">
            <VisualView script={twin.visual} />
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-2xl bg-accent py-3.5 font-extrabold text-white active:scale-[0.98]"
        >
          {t.practice.twinBack} ›
        </button>
      </div>
    </div>
  );
}
