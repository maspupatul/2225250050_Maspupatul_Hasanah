import { fmtTick } from '../../lib/format';
import type { VisualScript } from '../../lib/types';
import { t } from '../../i18n/id';
import { COLORS, dirColor, displayLevel, isLabelled, signColor, spreadLabels, tickValues } from './scale';

export type Skin = 'thermometer' | 'sea_depth' | 'elevator';

const W = 320;
const TOP = 18;
const SHORT = 34;

const LAYOUT: Record<Skin, { bottom: number; height: number; objX: number; arrowX: number; labelX: number }> = {
  thermometer: { bottom: 262, height: 304, objX: 80, arrowX: 124, labelX: 214 },
  sea_depth: { bottom: 276, height: 296, objX: 108, arrowX: 158, labelX: 226 },
  elevator: { bottom: 276, height: 296, objX: 104, arrowX: 170, labelX: 232 },
};

type Props = { script: VisualScript; pointer: number | null; skin: Skin };

export function VerticalScale({ script, pointer, skin }: Props) {
  const { bottom, height, objX, arrowX, labelX } = LAYOUT[skin];
  const [lo, hi] = script.range;
  const step = script.step ?? 1;
  const th = script.thousands ?? false;
  const y = (v: number) => TOP + ((hi - v) / (hi - lo)) * (bottom - TOP);
  const { values, labelEvery } = tickValues(lo, hi, step);
  const marks = script.marks ?? [];
  const arrows = script.arrows ?? [];
  const level = displayLevel(script, pointer);
  const labelY = spreadLabels(marks.map((m) => y(m.value)), 16);
  const unitStep = Math.abs(y(0) - y(step));

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="mx-auto h-auto w-full max-w-[360px]" aria-hidden="true">
      <defs>
        {(['up', 'down'] as const).map((dir) => (
          <marker key={dir} id={`vs-head-${dir}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={dirColor(dir)} />
          </marker>
        ))}
        <linearGradient id="sea-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bae6fd" />
          <stop offset="1" stopColor="#0c4a6e" />
        </linearGradient>
      </defs>

      {/* ---------- skin backgrounds ---------- */}
      {skin === 'sea_depth' && (
        <g>
          <rect x={44} y={TOP - 10} width={W - 50} height={y(0) - TOP + 10} rx={10} fill="#e0f2fe" />
          <rect x={44} y={y(0)} width={W - 50} height={bottom - y(0) + 10} fill="url(#sea-water)" opacity={0.85} />
          <path d={`M44,${y(0)} q12,-5 24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0`} stroke="#0284c7" strokeWidth={2} fill="none" />
          <rect x={44} y={bottom + 4} width={W - 50} height={8} rx={3} fill="#d6b98c" />
          <text x={W - 12} y={y(0) - 6} textAnchor="end" fontSize={10} fontWeight={700} fill="#0369a1">{t.visual.surface}</text>
        </g>
      )}
      {skin === 'elevator' && (
        <g>
          <rect x={60} y={TOP - 8} width={88} height={bottom - TOP + 16} rx={8} fill="#f6f5fb" stroke="#cfcce3" />
          <rect x={60} y={y(0)} width={88} height={bottom - y(0) + 8} fill="#e3e1f0" />
          {values.map((v) => (
            <line key={v} x1={60} x2={148} y1={y(v) + unitStep / 2} y2={y(v) + unitStep / 2} stroke="#cfcce3" />
          ))}
          <text x={154} y={y(0) + 4} fontSize={10} fontWeight={700} fill={COLORS.zero}>{t.visual.ground}</text>
        </g>
      )}
      {skin === 'thermometer' && (
        <g>
          <rect x={objX - 12} y={TOP - 10} width={24} height={bottom - TOP + 22} rx={12} fill="#f6f5fb" stroke="#cfcce3" strokeWidth={2} />
          <circle cx={objX} cy={bottom + 22} r={19} fill={level !== null && level >= 0 ? COLORS.positive : COLORS.negative} stroke="#cfcce3" strokeWidth={2} />
          {level !== null && (
            <rect
              x={objX - 7}
              y={y(level)}
              width={14}
              height={bottom + 12 - y(level)}
              rx={7}
              fill={level >= 0 ? COLORS.positive : COLORS.negative}
              style={{ transition: 'y 250ms ease, height 250ms ease' }}
            />
          )}
        </g>
      )}

      {/* ---------- ticks ---------- */}
      {values.map((v) => {
        const labelled = isLabelled(v, lo, step, labelEvery);
        return (
          <g key={`t${v}`}>
            <line x1={40} x2={labelled ? 50 : 46} y1={y(v)} y2={y(v)} stroke={v === 0 ? COLORS.ink : COLORS.muted} strokeWidth={v === 0 ? 2.5 : 1} />
            {labelled && (
              <text x={36} y={y(v) + 4} textAnchor="end" fontSize={11} fontWeight={v === 0 ? 800 : 600} fill={signColor(v)}>
                {fmtTick(v, th)}
              </text>
            )}
          </g>
        );
      })}
      <line x1={40} x2={W - 6} y1={y(0)} y2={y(0)} stroke={COLORS.zero} strokeWidth={1.5} strokeDasharray="4 4" />

      {/* ---------- moving object ---------- */}
      {level !== null && skin === 'sea_depth' && (
        <text x={objX} y={y(level) + 9} textAnchor="middle" fontSize={26} style={{ transition: 'y 250ms ease' }}>🤿</text>
      )}
      {level !== null && skin === 'elevator' && (
        <g style={{ transition: 'transform 250ms ease' }} transform={`translate(0, ${y(level)})`}>
          <rect x={objX - 22} y={-unitStep / 2 + 1} width={44} height={Math.max(unitStep - 2, 12)} rx={4} fill={COLORS.accent} />
          <text x={objX} y={4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">LIFT</text>
        </g>
      )}
      {pointer !== null && skin === 'thermometer' && (
        <path d={`M${objX + 16},${y(pointer)} l12,-7 v14 z`} fill={COLORS.accent} style={{ transition: 'd 250ms ease' }} />
      )}

      {/* ---------- arrows ---------- */}
      {arrows.map((a, i) => {
        const ax = arrowX + i * 18;
        let y1: number;
        let y2: number;
        if (a.value !== null) {
          y1 = y(a.at);
          y2 = y(a.at + a.value);
        } else if (a.anchor === 'from') {
          y1 = y(a.at);
          y2 = y1 + (a.dir === 'up' ? -SHORT : SHORT);
        } else {
          y2 = y(a.at);
          y1 = y2 + (a.dir === 'up' ? SHORT : -SHORT);
        }
        const color = dirColor(a.dir);
        return (
          <g key={`a${i}`}>
            <line x1={ax} x2={ax} y1={y1} y2={y2} stroke={color} strokeWidth={3} strokeDasharray={a.value === null ? '5 4' : undefined} markerEnd={`url(#vs-head-${a.dir})`} />
            <circle cx={ax} cy={(y1 + y2) / 2} r={8} fill="#fff" stroke={color} strokeWidth={1.5} />
            <text x={ax} y={(y1 + y2) / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={800} fill={color}>{i + 1}</text>
          </g>
        );
      })}

      {/* ---------- marks ---------- */}
      {marks.map((m, i) => {
        const color = signColor(m.value);
        return (
          <g key={`m${i}`}>
            <circle cx={objX} cy={y(m.value)} r={6} fill={color} stroke="#fff" strokeWidth={2} />
            <line x1={objX + 8} x2={labelX - 4} y1={y(m.value)} y2={labelY[i]} stroke={color} strokeDasharray="2 3" />
            <text x={labelX} y={labelY[i] + 4} fontSize={11} fontWeight={800} fill={color}>
              {m.label || fmtTick(m.value, th)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
