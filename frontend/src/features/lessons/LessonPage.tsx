import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProgressCard } from '../../components/ui/ProgressCard';
import { RoundButton } from '../../components/ui/RoundButton';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { useProgress } from '../../store/progress';
import { SegmentView } from './SegmentView';

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const navigate = useNavigate();
  const { data: lesson, error, reload } = useApi(() => api.lesson(lessonId), [lessonId]);
  const saved = useProgress((s) => s.lessons[lessonId]);
  const saveSegment = useProgress((s) => s.saveSegment);
  const [index, setIndex] = useState(() => (saved?.status === 'done' ? 0 : (saved?.segment ?? 0)));
  const [replayKey, setReplayKey] = useState(0);

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center bg-plum-800 p-6 text-center text-white">
        <div>
          <p>{error}</p>
          <button type="button" onClick={reload} className="mt-4 rounded-2xl bg-accent px-5 py-2 font-extrabold">
            {t.home.retry}
          </button>
        </div>
      </div>
    );
  }

  const total = lesson?.segments.length ?? 1;
  const current = Math.min(index, total - 1);
  const last = current === total - 1;
  const go = (next: number) => {
    setIndex(next);
    saveSegment(lessonId, next);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-plum-800 px-4 pb-6 pt-[calc(env(safe-area-inset-top)+16px)] text-white">
      <div className="flex items-center justify-between">
        <RoundButton label={t.common.close} onClick={() => navigate('/')}>
          ✕
        </RoundButton>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-white/60">
            {lesson ? `${t.home.lesson} ${lesson.number}` : ''}
          </p>
          <p className="font-extrabold">{lesson?.title ?? t.common.loading}</p>
        </div>
        <span className="text-2xl" aria-hidden="true">
          {lesson?.icon}
        </span>
      </div>

      <div className="mt-3 flex justify-center gap-1.5" aria-label={t.lesson.progress(current + 1, total)}>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === current ? 'w-6 bg-accent' : i < current ? 'w-3 bg-white/70' : 'w-3 bg-white/20'}`}
          />
        ))}
      </div>

      <section className="mt-4 flex-1 rounded-4xl bg-white p-5 text-ink shadow-card">
        {lesson ? (
          <SegmentView key={`${current}-${replayKey}`} segment={lesson.segments[current]} />
        ) : (
          <div className="h-64 animate-pulse rounded-3xl bg-lavender-100" />
        )}
      </section>

      <div className="mt-4 grid grid-cols-[auto_auto_1fr] gap-2">
        <button
          type="button"
          disabled={current === 0}
          onClick={() => go(current - 1)}
          className="rounded-2xl bg-plum-700 px-4 py-3 text-sm font-extrabold disabled:opacity-30"
        >
          ‹ {t.lesson.back}
        </button>
        <button
          type="button"
          onClick={() => setReplayKey((k) => k + 1)}
          className="rounded-2xl bg-plum-700 px-4 py-3 text-sm font-extrabold"
          aria-label={t.lesson.replay}
        >
          ↺
        </button>
        <button
          type="button"
          disabled={!lesson}
          onClick={() => (last ? navigate(`/latihan/${lessonId}`) : go(current + 1))}
          className="rounded-2xl bg-accent py-3 text-sm font-extrabold active:scale-[0.98] disabled:opacity-40"
        >
          {last ? `${t.lesson.startPractice} ✏️` : `${t.lesson.next} ›`}
        </button>
      </div>

      <div className="mt-4">
        <ProgressCard
          icon={lesson?.icon ?? '📘'}
          title={lesson ? `${t.home.lesson} ${lesson.number} · ${lesson.title}` : ''}
          percent={((current + 1) / total) * 100}
        />
      </div>
    </div>
  );
}
