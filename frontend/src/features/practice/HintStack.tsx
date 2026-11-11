import { t } from '../../i18n/id';
import type { Hint } from '../../lib/types';
import { VisualView } from '../visuals/VisualView';

/** Opened hints stay visible as a stack, so students need not remember them. */
export function HintStack({ hints }: { hints: Hint[] }) {
  if (hints.length === 0) return null;
  return (
    <section className="mt-4 space-y-3" aria-label={t.practice.hint}>
      {hints.map((hint) => (
        <article key={hint.hint_level} className="rounded-3xl bg-plum-700/70 p-4 text-white">
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-300">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] text-white">{hint.hint_level}</span>
            💡 {t.practice.hint} {hint.hint_level} · {t.practice.hintLevel[hint.hint_level - 1]}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed">{hint.text}</p>
          {hint.template && (
            <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-center text-2xl font-black tracking-wide text-ink">
              {hint.template}
            </p>
          )}
          {hint.visual && (
            <div className="mt-3 text-ink">
              <VisualView script={hint.visual} />
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
