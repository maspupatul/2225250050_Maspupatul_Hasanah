import { useState } from 'react';
import { Callout } from '../../components/ui/Callout';
import { MathLines } from '../../components/ui/MathLines';
import { Paragraphs } from '../../components/ui/Paragraphs';
import { RichText } from '../../components/ui/RichText';
import { t } from '../../i18n/id';
import type { Segment } from '../../lib/types';
import { VisualView } from '../visuals/VisualView';

/** One segment = one concept per screen (segmenting principle). */
export function SegmentView({ segment }: { segment: Segment }) {
  return (
    <div className="space-y-5">
      {segment.title && <h2 className="text-xl font-extrabold leading-snug text-ink">{segment.title}</h2>}
      {segment.type === 'explore' ? (
        <Explore segment={segment} />
      ) : segment.type === 'worked_example' ? (
        <WorkedExample segment={segment} />
      ) : segment.type !== 'summary' ? (
        <>
          <Paragraphs text={segment.text} />
          {segment.lines && <MathLines lines={segment.lines} />}
          {segment.visual && <VisualView script={segment.visual} />}
          {segment.callout && <Callout label={t.lesson.keyIdea} text={segment.callout} />}
        </>
      ) : (
        <ul className="space-y-2.5">
          {segment.points.map((point) => (
            <li
              key={point}
              className="flex gap-3 rounded-2xl bg-lavender-50 px-4 py-3 text-[15px] font-semibold leading-7 text-ink"
            >
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-black text-white"
                aria-hidden="true"
              >
                ✓
              </span>
              <RichText text={point} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Explore({ segment }: { segment: Extract<Segment, { type: 'explore' }> }) {
  const [reached, setReached] = useState(segment.visual.pointer === segment.target);
  return (
    <>
      <Paragraphs text={segment.text} />
      {segment.lines && <MathLines lines={segment.lines} />}
      {segment.callout && <Callout label={t.lesson.inMath} text={segment.callout} />}
      <VisualView
        script={segment.visual}
        interactive
        onPointerChange={(v) => v === segment.target && setReached(true)}
      />
      <p
        className={`rounded-2xl px-4 py-3 text-sm font-bold leading-6 ${reached ? 'bg-green-50 text-correct' : 'bg-lavender-50 text-ink-muted'}`}
        aria-live="polite"
      >
        {reached ? `🎉 ${segment.success}` : t.lesson.exploreHint}
      </p>
    </>
  );
}

function WorkedExample({ segment }: { segment: Extract<Segment, { type: 'worked_example' }> }) {
  const [shown, setShown] = useState(1);
  const done = shown >= segment.steps.length;
  return (
    <>
      <div className="rounded-2xl bg-lavender-50 px-4 py-3">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">{t.lesson.example}</p>
        <p className="mt-0.5 text-[16px] font-bold leading-7 text-ink">
          <RichText text={segment.problem} />
        </p>
      </div>
      <ol className="space-y-2.5">
        {segment.steps.slice(0, shown).map((step, i) => (
          <li key={i} className="rounded-2xl border border-lavender-200 px-4 py-3">
            <p className="text-[15px] leading-7 text-ink">
              <span className="mr-2 font-black text-accent">{i + 1}.</span>
              <RichText text={step.text} />
            </p>
            <p className="mt-1 text-[13px] leading-6 text-ink-muted">
              <span className="font-bold">{t.lesson.why}</span> {step.why}
            </p>
          </li>
        ))}
      </ol>
      {!done ? (
        <button
          type="button"
          onClick={() => setShown((n) => n + 1)}
          className="w-full rounded-2xl border-2 border-dashed border-accent/60 py-3 text-sm font-extrabold text-accent"
        >
          {t.lesson.nextStep} ↓
        </button>
      ) : (
        <>
          {segment.visual && <VisualView script={segment.visual} />}
          {segment.self_explain && (
            <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm font-semibold leading-6 text-ink">
              💭 <span className="font-extrabold">{t.lesson.think}:</span> {segment.self_explain}
            </p>
          )}
        </>
      )}
    </>
  );
}
