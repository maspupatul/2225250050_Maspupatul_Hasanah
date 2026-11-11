import { useEffect, useState } from 'react';
import { fmtWithUnit } from '../../lib/format';
import type { VisualScript } from '../../lib/types';
import { t } from '../../i18n/id';
import { NumberLine } from './NumberLine';
import { dirColor } from './scale';
import { VerticalScale } from './VerticalScale';

type Props = {
  script: VisualScript;
  /** Show ▲▼ / ◀▶ buttons that move the pointer. */
  interactive?: boolean;
  onPointerChange?: (value: number) => void;
};

/** One visual per problem; any contextual visual can be shown as a number line. */
export function VisualView({ script, interactive = false, onPointerChange }: Props) {
  const [pointer, setPointer] = useState<number | null>(script.pointer ?? null);
  const [asLine, setAsLine] = useState(false);

  useEffect(() => {
    setPointer(script.pointer ?? null);
  }, [script]);

  const kind = asLine ? 'number_line' : script.kind;
  const horizontal = kind === 'number_line';
  const step = script.step ?? 1;
  const [lo, hi] = script.range;
  const unit = script.unit ?? '';

  const move = (direction: 1 | -1) => {
    if (pointer === null) return;
    const next = Math.min(hi, Math.max(lo, pointer + direction * step));
    setPointer(next);
    onPointerChange?.(next);
  };

  const arrows = script.arrows ?? [];
  const label = pointer !== null ? `${t.visual.position}: ${fmtWithUnit(pointer, unit, script.thousands)}` : '';

  return (
    <figure className="rounded-3xl bg-lavender-50 p-3" aria-label={label || undefined}>
      {kind === 'number_line' ? (
        <NumberLine script={script} pointer={pointer} />
      ) : (
        <VerticalScale script={script} pointer={pointer} skin={kind} />
      )}

      {arrows.length > 0 && (
        <ol className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold">
          {arrows.map((a, i) => (
            <li
              key={i}
              className="rounded-full bg-white px-2.5 py-1"
              style={{ color: dirColor(a.dir) }}
            >
              {i + 1}. {a.label}
              {a.value === null && ' → ?'}
            </li>
          ))}
        </ol>
      )}

      {interactive && pointer !== null && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => move(-1)}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-xl font-bold text-negative shadow-sm active:scale-95"
            aria-label={horizontal ? t.visual.left : t.visual.down}
          >
            {horizontal ? '◀' : '▼'}
          </button>
          <output className="text-center text-base font-extrabold text-ink" aria-live="polite">
            {fmtWithUnit(pointer, unit, script.thousands)}
          </output>
          <button
            type="button"
            onClick={() => move(1)}
            className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-xl font-bold text-positive shadow-sm active:scale-95"
            aria-label={horizontal ? t.visual.right : t.visual.up}
          >
            {horizontal ? '▶' : '▲'}
          </button>
        </div>
      )}

      {script.kind !== 'number_line' && (
        <button
          type="button"
          onClick={() => setAsLine((v) => !v)}
          className="mt-2 w-full rounded-xl py-1.5 text-xs font-bold text-plum-700 underline-offset-2 hover:underline"
        >
          {asLine ? t.visual.asPicture : t.visual.asLine}
        </button>
      )}
    </figure>
  );
}
