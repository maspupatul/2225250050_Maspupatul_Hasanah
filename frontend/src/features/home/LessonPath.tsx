import { motion } from 'framer-motion';
import type { ModuleInfo } from '../../lib/types';
import { lessonStars, type LessonProgress, type LessonState } from '../../store/progress';
import { LANE_WIDTH, PathLesson, ROW_HEIGHT, type ModuleTone } from './PathLesson';

// One pop colour per module (category), in module order.
const MODULE_TONES: ModuleTone[] = [
  { node: 'from-orange-100 to-orange-300', badge: 'from-orange-400 to-accent shadow-pop-accent' },
  { node: 'from-amber-100 to-amber-300', badge: 'from-amber-300 to-amber-500 shadow-pop-amber' },
  { node: 'from-fuchsia-100 to-fuchsia-300', badge: 'from-fuchsia-500 to-purple-600 shadow-pop-fuchsia' },
  { node: 'from-lavender-100 to-lavender-300', badge: 'from-plum-600 to-plum-800 shadow-pop-plum' },
];

// Node centres swing gently left and right: a winding path, not a straight list.
const SWING = [30, 54, 66, 54];
const laneX = (i: number) => SWING[i % SWING.length];

type Props = {
  module: ModuleInfo;
  states: Record<string, LessonState>;
  progress: Record<string, LessonProgress>;
  onLocked: () => void;
};

/** One module of the learning path: curved connector behind the lesson rows. */
export function LessonPath({ module, states, progress, onLocked }: Props) {
  const lessons = module.lessons;
  const tone = MODULE_TONES[(module.order - 1) % MODULE_TONES.length];
  const height = lessons.length * ROW_HEIGHT;
  const center = (i: number) => i * ROW_HEIGHT + ROW_HEIGHT / 2;

  return (
    <section className="mb-2">
      <h2 className="mb-2 mt-2 flex items-center gap-3 px-1">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-sm font-black text-white ${tone.badge}`}
          aria-hidden="true"
        >
          {module.order}
        </span>
        <span className="text-sm font-extrabold leading-tight text-ink">{module.title}</span>
        <span className="h-px flex-1 bg-lavender-200" />
      </h2>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={LANE_WIDTH}
          height={height}
          viewBox={`0 0 ${LANE_WIDTH} ${height}`}
          aria-hidden="true"
        >
          {lessons.slice(0, -1).map((lesson, i) => {
            const d = `M${laneX(i)},${center(i)} C${laneX(i)},${center(i) + ROW_HEIGHT / 2} ${laneX(i + 1)},${center(i + 1) - ROW_HEIGHT / 2} ${laneX(i + 1)},${center(i + 1)}`;
            const walked = states[lesson.id] === 'done';
            return walked ? (
              <motion.path
                key={lesson.id}
                d={d}
                fill="none"
                stroke="#f26b3a"
                strokeWidth={6}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.15 * i }}
              />
            ) : (
              <path
                key={lesson.id}
                d={d}
                fill="none"
                stroke="#e3e1f0"
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray="2 12"
              />
            );
          })}
        </svg>

        <ul>
          {lessons.map((lesson, i) => {
            const p = progress[lesson.id];
            return (
              <motion.li
                key={lesson.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
              >
                <PathLesson
                  tone={tone}
                  lesson={lesson}
                  number={lesson.number}
                  state={states[lesson.id] ?? 'locked'}
                  laneX={laneX(i)}
                  segmentProgress={((p?.segment ?? 0) + 1) / Math.max(1, lesson.segment_count + 1)}
                  stars={lessonStars(p)}
                  resumable={(p?.segment ?? 0) > 0}
                  onLocked={onLocked}
                />
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
