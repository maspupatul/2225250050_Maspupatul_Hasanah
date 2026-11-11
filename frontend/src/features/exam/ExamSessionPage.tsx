import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import { examScore, type Outcome } from '../../lib/score';
import type { ExamStart, Problem } from '../../lib/types';
import { useApi } from '../../lib/useApi';
import { bestExamScore, examUnlocked, useProgress } from '../../store/progress';
import { PracticeSession } from '../practice/PracticeSession';
import { ExamResult } from './ExamResult';

/** `/ujian-akhir/mulai`: one exam = one seed from the server = 12 fixed problems. */
export function ExamSessionPage() {
  const navigate = useNavigate();
  const { data: modules } = useApi(() => api.modules(), []);
  const lessons = useProgress((s) => s.lessons);
  const addReview = useProgress((s) => s.addReview);
  const recordExam = useProgress((s) => s.recordExam);

  const [exam, setExam] = useState<ExamStart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newBest, setNewBest] = useState(false);
  const starting = useRef(false);

  const start = useCallback(async () => {
    if (starting.current) return; // React StrictMode runs effects twice in development
    starting.current = true;
    setExam(null);
    setError(null);
    setNewBest(false);
    try {
      setExam(await api.startExam());
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.generic);
    } finally {
      starting.current = false;
    }
  }, []);

  useEffect(() => {
    void start();
  }, [start]);

  const fetchProblem = useCallback(
    (i: number, guided: boolean) => {
      if (!exam) return Promise.reject(new Error(t.errors.generic));
      return api.nextProblem({ exam_seed: exam.seed, exam_index: i, guided });
    },
    [exam],
  );

  if (modules && !examUnlocked(modules, lessons)) return <Navigate to="/ujian-akhir" replace />;

  if (!exam) {
    return (
      <div className="grid min-h-dvh place-items-center bg-plum-800 px-6 text-center text-white">
        {error ? (
          <div>
            <p className="text-sm">{error}</p>
            <button type="button" onClick={() => void start()} className="mt-3 rounded-2xl bg-accent px-5 py-2 text-sm font-extrabold">
              {t.home.retry}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-accent" />
            <p className="text-sm text-white/70">{t.exam.starting}</p>
          </div>
        )}
      </div>
    );
  }

  const onProblemDone = (outcome: Outcome, problem: Problem) => {
    if (outcome.deferred) addReview(problem.template_id, 'ujian-akhir');
  };

  const onComplete = (outcomes: Outcome[]) => {
    const score = examScore(outcomes);
    const best = bestExamScore(useProgress.getState().examResults);
    setNewBest(best !== null && score > best);
    recordExam(score);
  };

  return (
    <PracticeSession
      key={exam.seed}
      total={exam.total}
      fetchProblem={fetchProblem}
      title={t.exam.title}
      icon="🏆"
      onClose={() => navigate('/ujian-akhir')}
      onProblemDone={onProblemDone}
      onComplete={onComplete}
      renderSummary={(outcomes) => (
        <ExamResult
          outcomes={outcomes}
          stages={exam.stages}
          newBest={newBest}
          onHome={() => navigate('/')}
          onAgain={() => void start()}
        />
      )}
    />
  );
}
