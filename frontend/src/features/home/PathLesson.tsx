import { motion, useAnimationControls } from 'framer-motion';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/id';
import type { LessonSummary } from '../../lib/types';
import type { LessonState } from '../../store/progress';

export const ROW_HEIGHT = 108;
const CARD_HEIGHT = 88;
export const LANE_WIDTH = 96;
const NODE = 56;
const MotionLink = motion.create(Link);

/** Pop gradient of a module (kategori): node fill and card lip. Never the sign colours. */
export interface ModuleTone {
  node: string;
  badge: string;
}

type Props = {
  tone: ModuleTone;
  lesson: LessonSummary;
  number: number;
  state: LessonState;
  /** Horizontal centre of the node inside the lane (px). */
  laneX: number;
  /** 0..1 progress through the lesson segments (current lesson only). */
  segmentProgress: number;
  stars: number;
  resumable: boolean;
  onLocked: () => void;
};

function ProgressArc({ progress }: { progress: number }) {
  const r = 31;
  const c = 2 * Math.PI * r;
  return (
    <svg className="absolute -inset-1" viewBox="0 0 66 66" aria-hidden="true">
      <circle cx="33" cy="33" r={r} fill="none" stroke="#fde6dc" strokeWidth="3" />
      <circle
        cx="33"
        cy="33"
        r={r}
        fill="none"
        stroke="#f26b3a"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${Math.max(0.06, progress) * c} ${c}`}
        transform="rotate(-90 33 33)"
      />
    </svg>
  );
}

/** One stop on the learning path: a round icon node on the path plus an info card. */
export function PathLesson({ tone, lesson, number, state, laneX, segmentProgress, stars, resumable, onLocked }: Props) {
  const shake = useAnimationControls();
  const locked = state === 'locked';
  const current = state === 'current';
  const done = state === 'done';

  const node = (
    <span
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ left: laneX, width: NODE, height: NODE }}
    >
      {current && (
        <motion.span
          className="absolute -inset-2 rounded-full bg-accent/25"
          animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        />
      )}
      <span
        className={`relative grid h-full w-full place-items-center rounded-full text-[26px] shadow-sm ring-4 ${
          locked
            ? 'bg-lavender-100 ring-lavender-50'
            : `bg-gradient-to-br ${tone.node} ${done ? 'ring-accent' : 'ring-white'}`
        }`}
      >
        {current && <ProgressArc progress={segmentProgress} />}
        <span className={locked ? 'opacity-70 saturate-50' : ''} aria-hidden="true">
          {lesson.icon}
        </span>
        {locked && (
          <span
            className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-plum-700 text-[11px] ring-2 ring-white"
            aria-hidden="true"
          >
            🔒
          </span>
        )}
        {done && (
          <span
            className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-black text-white ring-2 ring-white"
            aria-hidden="true"
          >
            ✓
          </span>
        )}
      </span>
    </span>
  );

  const card = (
    <span
      className={`flex h-[88px] items-center gap-3 rounded-3xl px-4 transition-[transform,box-shadow] duration-100 ${
        current
          ? 'border-2 border-accent bg-white shadow-pop-accent group-active:translate-y-1 group-active:shadow-none'
          : locked
            ? 'border-2 border-dashed border-lavender-300 bg-lavender-50'
            : 'card-3d group-active:translate-y-1 group-active:shadow-none'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[11px] font-extrabold uppercase tracking-wider ${current ? 'text-accent' : 'text-ink-muted'}`}
        >
          {t.home.lesson} {number}
        </span>
        <span className={`line-clamp-2 font-extrabold leading-tight ${locked ? 'text-ink-muted' : 'text-ink'}`}>
          {lesson.title}
        </span>
        <span className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{lesson.subtitle}</span>
      </span>
      {current && (
        <span className="shrink-0 rounded-full bg-accent px-3 py-2 text-[11px] font-extrabold text-white shadow-[0_3px_0_#c2410c]">
          {resumable ? t.home.resume : t.home.start} ›
        </span>
      )}
      {done && (
        <span className="shrink-0 text-sm tracking-tight" aria-label={`${stars} / 3`}>
          <span className="text-amber-400">{'★'.repeat(stars)}</span>
          <span className="text-lavender-300">{'★'.repeat(3 - stars)}</span>
        </span>
      )}
    </span>
  );

  const label = `${t.home.lesson} ${number}: ${lesson.title}`;
  const rowClass =
    'group relative block outline-none focus-visible:rounded-3xl focus-visible:ring-2 focus-visible:ring-accent';
  const inner = (
    <>
      {node}
      <span className="block" style={{ marginLeft: LANE_WIDTH }}>
        {card}
      </span>
    </>
  );

  if (locked) {
    return (
      <motion.button
        type="button"
        animate={shake}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          void shake.start({
            x: [0, -9, 9, -6, 6, -3, 0],
            transition: { duration: 0.45 },
          });
          onLocked();
        }}
        aria-label={`${label} (${t.home.locked})`}
        className={`${rowClass} w-full text-left`}
        style={{ height: ROW_HEIGHT, paddingTop: (ROW_HEIGHT - CARD_HEIGHT) / 2 - 2 }}
      >
        {inner}
      </motion.button>
    );
  }

  return (
    <MotionLink
      to={`/pelajaran/${lesson.id}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      aria-label={label}
      className={rowClass}
      style={{ height: ROW_HEIGHT, paddingTop: (ROW_HEIGHT - CARD_HEIGHT) / 2 - 2 }}
    >
      {inner}
    </MotionLink>
  );
}
