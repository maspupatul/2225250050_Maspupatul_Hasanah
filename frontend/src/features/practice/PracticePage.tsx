import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import { averageWeight, type Outcome } from '../../lib/score';
import type { LessonSummary, Problem } from '../../lib/types';
import { lessonStates, useProgress } from '../../store/progress';
import { PracticeSession } from './PracticeSession';
import { pickLessons, RANDOM_COUNT, randomPool } from './randomPool';
import { SessionSummary } from './SessionSummary';

const REVIEW_BATCH = 5;

type Mode = 'lesson' | 'review' | 'random';

/** Lesson practice (`/latihan/:lessonId`), Antrean Ulang (`/latihan/ulang`) or random mix (`/latihan/acak`). */
export function PracticePage() {
  const { lessonId = '' } = useParams();
  const navigate = useNavigate();
  const mode: Mode = lessonId === 'ulang' ? 'review' : lessonId === 'acak' ? 'random' : 'lesson';

  const completeLesson = useProgress((s) => s.completeLesson);
  const addReview = useProgress((s) => s.addReview);
  const removeReview = useProgress((s) => s.removeReview);
  const queue = useRef(useProgress.getState().reviewQueue.slice(0, REVIEW_BATCH));
  const randomLessons = useRef<string[] | null>(null);

  const [lesson, setLesson] = useState<LessonSummary | null>(null);
  const [ready, setReady] = useState(mode === 'review');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (mode === 'lesson') {
      api
        .lesson(lessonId)
        .then((l) => {
          setLesson(l);
          setReady(true);
        })
        .catch(() => setFailed(true));
    } else if (mode === 'random') {
      api
        .modules()
        .then((modules) => {
          const pool = randomPool(modules, lessonStates(modules, useProgress.getState().lessons));
          randomLessons.current = pickLessons(pool, RANDOM_COUNT);
          setReady(true);
        })
        .catch(() => setFailed(true));
    }
  }, [mode, lessonId]);

  const lessonFor = (i: number) =>
    mode === 'random' ? (randomLessons.current?.[i] ?? '') : mode === 'lesson' ? lessonId : queue.current[i].lessonId;

  const fetchProblem = useCallback(
    (i: number, guided: boolean) =>
      api.nextProblem(
        mode === 'review'
          ? { template_id: queue.current[i].templateId, guided }
          : {
              lesson_id: mode === 'random' ? (randomLessons.current?.[i] ?? '') : lessonId,
              guided,
            },
      ),
    [mode, lessonId],
  );

  const indexRef = useRef(0);
  const onProblemDone = (outcome: Outcome, problem: Problem) => {
    const i = indexRef.current++;
    if (mode === 'review' && !outcome.deferred) removeReview(problem.template_id);
    if (mode !== 'review' && outcome.deferred) addReview(problem.template_id, lessonFor(i));
  };

  const onComplete = (outcomes: Outcome[]) => {
    if (mode === 'lesson' && outcomes.length > 0) completeLesson(lessonId, averageWeight(outcomes));
  };

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center bg-plum-800 px-6 text-center text-white">
        {failed ? (
          <div>
            <p className="text-sm">{t.home.loadError}</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-3 rounded-2xl bg-accent px-5 py-2 text-sm font-extrabold"
            >
              {t.summary.home}
            </button>
          </div>
        ) : (
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-accent"
            aria-label={t.common.loading}
          />
        )}
      </div>
    );
  }

  const total =
    mode === 'review'
      ? queue.current.length
      : mode === 'random'
        ? (randomLessons.current?.length ?? 0)
        : (lesson?.practice_count ?? 0);
  const title =
    mode === 'review'
      ? t.practice.reviewTitle
      : mode === 'random'
        ? t.practiceHub.sessionTitle
        : t.practice.lessonTitle(lesson?.number ?? 0, lesson?.title ?? '');
  const back = mode === 'lesson' ? '/' : '/latihan';

  return (
    <PracticeSession
      key={lessonId}
      total={total}
      fetchProblem={fetchProblem}
      title={title}
      icon={mode === 'review' ? '🔁' : mode === 'random' ? '🎯' : (lesson?.icon ?? '✏️')}
      onClose={() => navigate(back)}
      onProblemDone={onProblemDone}
      onComplete={onComplete}
      renderSummary={(outcomes, restart) => (
        <SessionSummary
          outcomes={outcomes}
          onHome={() => navigate(back)}
          onAgain={() => {
            indexRef.current = 0;
            restart();
          }}
        />
      )}
    />
  );
}
