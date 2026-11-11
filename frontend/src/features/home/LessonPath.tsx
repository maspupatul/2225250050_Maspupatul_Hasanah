import { motion } from 'framer-motion';
import type { ModuleInfo } from '../../lib/types';
import { lessonStars, type LessonProgress, type LessonState } from '../../store/progress';
import { LANE_WIDTH, PathLesson, ROW_HEIGHT } from './PathLesson';

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
  const height = lessons.length * ROW_HEIGHT;
  const center = (i: number) => i * ROW_HEIGHT + ROW_HEIGHT / 2;

  return (
    <section className="mb-2">
      <h2 className="mb-1 flex items-center gap-2 px-1 text-xs font-extrabold uppercase tracking-wider text-ink-muted">
        <span className="h-px flex-1 bg-lavender-200" />
        {module.title}
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
