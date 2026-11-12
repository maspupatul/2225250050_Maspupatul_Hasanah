import { fmtTick } from '../../lib/format';
import type { VisualScript } from '../../lib/types';
import { COLORS, dirColor, isLabelled, signColor, spreadLabels, tickValues } from './scale';

const W = 340;
const AXIS_Y = 104;
const LEFT = 18;
const RIGHT = W - 18;
const SHORT = 30;

type Props = {
  script: VisualScript;
  pointer: number | null;
  /** Draw the pointer as a car facing left or right (NumberLineWalker). */
  character?: { facing: 'left' | 'right' };
};

export function NumberLine({ script, pointer, character }: Props) {
  const [lo, hi] = script.range;
  const step = script.step ?? 1;
  const th = script.thousands ?? false;
  const x = (v: number) => LEFT + ((v - lo) / (hi - lo)) * (RIGHT - LEFT);
  const { values, labelEvery } = tickValues(lo, hi, step);
  const marks = script.marks ?? [];
  const arrows = script.arrows ?? [];
  const labelX = spreadLabels(
    marks.map((m) => x(m.value)),
    34,
  );

  return (
    <svg viewBox={`0 0 ${W} 170`} className="h-auto w-full" aria-hidden="true">
      <defs>
        {(['up', 'down'] as const).map((dir) => (
          <marker
            key={dir}
            id={`nl-head-${dir}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={dirColor(dir)} />
          </marker>
        ))}
      </defs>

      {/* axis */}
      <line x1={LEFT - 8} x2={RIGHT + 8} y1={AXIS_Y} y2={AXIS_Y} stroke={COLORS.ink} strokeWidth={2} />
      <path d={`M${LEFT - 12},${AXIS_Y} l8,-5 v10 z`} fill={COLORS.ink} />
      <path d={`M${RIGHT + 12},${AXIS_Y} l-8,-5 v10 z`} fill={COLORS.ink} />
      {values.map((v) => {
        const labelled = isLabelled(v, lo, step, labelEvery);
        return (
          <g key={v}>
            <line
              x1={x(v)}
              x2={x(v)}
              y1={AXIS_Y - (v === 0 ? 9 : labelled ? 6 : 3)}
              y2={AXIS_Y + (v === 0 ? 9 : labelled ? 6 : 3)}
              stroke={v === 0 ? COLORS.ink : COLORS.muted}
              strokeWidth={v === 0 ? 2.5 : 1}
            />
            {labelled && (
              <text
                x={x(v)}
                y={AXIS_Y + 24}
                textAnchor="middle"
                fontSize={11}
                fontWeight={v === 0 ? 800 : 600}
                fill={signColor(v)}
              >
                {fmtTick(v, th)}
              </text>
            )}
          </g>
        );
      })}

      {/* arrows (jumps) */}
      {arrows.map((a, i) => {
        const height = 24 + i * 12;
        let x1: number;
        let x2: number;
        if (a.value !== null) {
          x1 = x(a.at);
          x2 = x(a.at + a.value);
        } else if (a.anchor === 'from') {
          x1 = x(a.at);
          x2 = x1 + (a.dir === 'up' ? SHORT : -SHORT);
        } else {
          x2 = x(a.at);
          x1 = x2 - (a.dir === 'up' ? SHORT : -SHORT);
        }
        const mid = (x1 + x2) / 2;
        const color = dirColor(a.dir);
        return (
          <g key={i}>
            <path
              d={`M${x1},${AXIS_Y - 6} Q${mid},${AXIS_Y - 6 - 2 * height} ${x2},${AXIS_Y - 6}`}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeDasharray={a.value === null ? '5 4' : undefined}
              markerEnd={`url(#nl-head-${a.dir})`}
            />
            <circle cx={mid} cy={AXIS_Y - 6 - height} r={8} fill="#fff" stroke={color} strokeWidth={1.5} />
            <text x={mid} y={AXIS_Y - 2 - height} textAnchor="middle" fontSize={10} fontWeight={800} fill={color}>
              {i + 1}
            </text>
          </g>
        );
      })}

      {/* marks */}
      {marks.map((m, i) => (
        <g key={`m${i}`}>
          <circle cx={x(m.value)} cy={AXIS_Y} r={6} fill={signColor(m.value)} stroke="#fff" strokeWidth={2} />
          {m.label && (
            <text
              x={labelX[i]}
              y={AXIS_Y + 44}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill={signColor(m.value)}
            >
              {m.label}
            </text>
          )}
        </g>
      ))}

      {/* pointer */}
      {pointer !== null && !character && (
        <g style={{ transition: 'transform 250ms ease' }} transform={`translate(${x(pointer)}, ${AXIS_Y})`}>
          <circle r={10} fill={COLORS.accent} stroke="#fff" strokeWidth={3} />
          <path d="M-6,-24 h12 l-6,8 z" fill={COLORS.accent} />
        </g>
      )}

      {/* car: drawn facing right, mirrored when it faces left; the front light shows the direction */}
      {pointer !== null && character && (
        <g style={{ transition: 'transform 250ms ease' }} transform={`translate(${x(pointer)}, ${AXIS_Y - 4})`}>
          <g
            style={{ transition: 'transform 250ms ease' }}
            transform={character.facing === 'left' ? 'scale(-1,1)' : 'scale(1,1)'}
          >
            <path
              d="M-15,-6 h30 v-7 l-6,-1 l-5,-7 h-12 l-4,7 h-3 z"
              fill={COLORS.accent}
              stroke="#fff"
              strokeWidth={1.5}
            />
            <path d="M-9,-14 l3,-5 h8 l4,5 z" fill="#fff" opacity={0.85} />
            <circle cx={14} cy={-10} r={2} fill="#fde68a" />
            <circle cx={-8} cy={-5} r={4} fill={COLORS.ink} stroke="#fff" strokeWidth={1.5} />
            <circle cx={8} cy={-5} r={4} fill={COLORS.ink} stroke="#fff" strokeWidth={1.5} />
          </g>
          <circle r={3} cy={4} fill={COLORS.accent} />
        </g>
      )}
    </svg>
  );
}
