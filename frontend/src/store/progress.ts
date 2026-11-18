import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { todayISO } from '../lib/format';
import { safeStorage } from '../lib/safeStorage';
import type { ModuleInfo } from '../lib/types';

// Progress lives on the device and is synced to the student's account (lib/progressSync.ts).

export interface LessonProgress {
  status: 'in_progress' | 'done';
  segment: number;
  mastery: number;
}

export interface Stats {
  correct: number;
  selfFound: number;
  hintsUsed: number;
  deferred: number;
}

export interface ExamResult {
  score: number;
  date: string;
  /** Score per stage, e.g. { dasar: 100, menengah: 75, hots: 50 } (teacher dashboard). */
  stages?: Record<string, number>;
}

/** What is synced with the server (POST /progress/sync). */
export interface ProgressSnapshot {
  lessons: Record<string, LessonProgress>;
  stats: Stats;
  examResults: ExamResult[];
  activeDays: string[];
  reviewQueue: ReviewItem[];
}

export interface ReviewItem {
  templateId: string;
  lessonId: string;
  addedAt: string;
}

interface ProgressState {
  name: string;
  guided: boolean;
  lessons: Record<string, LessonProgress>;
  activeDays: string[];
  stats: Stats;
  reviewQueue: ReviewItem[];
  examResults: ExamResult[];
  setName: (name: string) => void;
  setGuided: (guided: boolean) => void;
  saveSegment: (lessonId: string, segment: number) => void;
  completeLesson: (lessonId: string, mastery: number) => void;
  recordProblem: (r: { correct: boolean; selfFound: boolean; hints: number }) => void;
  addReview: (templateId: string, lessonId: string) => void;
  removeReview: (templateId: string) => void;
  markActive: () => void;
  recordExam: (score: number, stages?: Record<string, number>) => void;
  /** Replace the device progress with the account's progress (after login). */
  hydrate: (name: string, snapshot: ProgressSnapshot) => void;
  /** Forget everything on this device (logout or shared device). */
  signOut: () => void;
  reset: () => void;
}

const EMPTY_STATS: Stats = {
  correct: 0,
  selfFound: 0,
  hintsUsed: 0,
  deferred: 0,
};

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      name: '',
      guided: true,
      lessons: {},
      activeDays: [],
      stats: EMPTY_STATS,
      reviewQueue: [],
      examResults: [],

      setName: (name) => set({ name: name.trim().slice(0, 30) }),
      setGuided: (guided) => set({ guided }),
      saveSegment: (lessonId, segment) =>
        set((s) => {
          const prev = s.lessons[lessonId];
          return {
            lessons: {
              ...s.lessons,
              [lessonId]: {
                status: prev?.status ?? 'in_progress',
                segment,
                mastery: prev?.mastery ?? 0,
              },
            },
          };
        }),
      completeLesson: (lessonId, mastery) =>
        set((s) => {
          const prev = s.lessons[lessonId];
          return {
            lessons: {
              ...s.lessons,
              [lessonId]: {
                status: 'done',
                segment: prev?.segment ?? 0,
                mastery: Math.max(prev?.mastery ?? 0, mastery),
              },
            },
          };
        }),
      recordProblem: ({ correct, selfFound, hints }) =>
        set((s) => ({
          stats: {
            correct: s.stats.correct + (correct ? 1 : 0),
            selfFound: s.stats.selfFound + (selfFound ? 1 : 0),
            hintsUsed: s.stats.hintsUsed + hints,
            deferred: s.stats.deferred + (correct ? 0 : 1),
          },
        })),
      addReview: (templateId, lessonId) =>
        set((s) =>
          s.reviewQueue.some((r) => r.templateId === templateId)
            ? s
            : {
                reviewQueue: [...s.reviewQueue, { templateId, lessonId, addedAt: todayISO() }],
              },
        ),
      removeReview: (templateId) =>
        set((s) => {
          const index = s.reviewQueue.findIndex((r) => r.templateId === templateId);
          if (index < 0) return s;
          return { reviewQueue: s.reviewQueue.filter((_, i) => i !== index) };
        }),
      markActive: () =>
        set((s) => {
          const today = todayISO();
          if (s.activeDays.includes(today)) return s;
          return { activeDays: [...s.activeDays, today].slice(-90) };
        }),
      recordExam: (score, stages) =>
        set((s) => ({
          examResults: [...s.examResults, { score, date: todayISO(), ...(stages ? { stages } : {}) }].slice(-50),
        })),
      hydrate: (name, snapshot) =>
        set({
          name: name.trim().slice(0, 30),
          lessons: snapshot.lessons,
          stats: snapshot.stats,
          examResults: snapshot.examResults,
          activeDays: snapshot.activeDays.slice(-90),
          reviewQueue: snapshot.reviewQueue,
        }),
      signOut: () =>
        set({ name: '', lessons: {}, activeDays: [], stats: EMPTY_STATS, reviewQueue: [], examResults: [] }),
      reset: () =>
        set({
          lessons: {},
          activeDays: [todayISO()],
          stats: EMPTY_STATS,
          reviewQueue: [],
          examResults: [],
        }),
    }),
    // The storage key keeps its pre-rebrand name so students do not lose their progress.
    {
      name: 'bulatku-progress-v1',
      storage: createJSONStorage(() => safeStorage),
    },
  ),
);

// ---------------------------------------------------------------- selectors

export type LessonState = 'done' | 'current' | 'open' | 'locked';

/** Lessons unlock in order: the next lesson opens when the previous one is done. */
export function lessonStates(
  modules: ModuleInfo[],
  lessons: Record<string, LessonProgress>,
): Record<string, LessonState> {
  const result: Record<string, LessonState> = {};
  let previousDone = true;
  let currentAssigned = false;
  for (const module of modules) {
    for (const lesson of module.lessons) {
      const done = lessons[lesson.id]?.status === 'done';
      if (done) result[lesson.id] = 'done';
      else if (previousDone && !currentAssigned) {
        result[lesson.id] = 'current';
        currentAssigned = true;
      } else result[lesson.id] = previousDone ? 'open' : 'locked';
      previousDone = done;
    }
  }
  return result;
}

export function percentDone(modules: ModuleInfo[], lessons: Record<string, LessonProgress>): number {
  const all = modules.flatMap((m) => m.lessons);
  if (all.length === 0) return 0;
  const done = all.filter((l) => lessons[l.id]?.status === 'done').length;
  return Math.round((done / all.length) * 100);
}

export function moduleMastery(module: ModuleInfo, lessons: Record<string, LessonProgress>): number {
  if (module.lessons.length === 0) return 0;
  const total = module.lessons.reduce((sum, l) => sum + (lessons[l.id]?.mastery ?? 0), 0);
  return Math.round((total / module.lessons.length) * 100);
}

export function bestExamScore(results: ExamResult[]): number | null {
  return results.length === 0 ? null : Math.max(...results.map((r) => r.score));
}

/** Ujian Akhir opens once every lesson is done (it summarises all material). */
export function examUnlocked(modules: ModuleInfo[], lessons: Record<string, LessonProgress>): boolean {
  return modules.length > 0 && percentDone(modules, lessons) === 100;
}

// ---------------------------------------------------------------- motivation (home badges)

/** Stars for a finished lesson, from its mastery (same thresholds as SessionSummary). */
export function lessonStars(progress: LessonProgress | undefined): number {
  if (progress?.status !== 'done') return 0;
  return progress.mastery >= 0.8 ? 3 : progress.mastery >= 0.5 ? 2 : 1;
}

/** Stars of the given lessons (lessons removed from the curriculum no longer count). */
export function totalStars(lessons: Record<string, LessonProgress>, lessonIds?: string[]): number {
  const ids = lessonIds ?? Object.keys(lessons);
  return ids.reduce((sum, id) => sum + lessonStars(lessons[id]), 0);
}

/** Days in a row with learning, counting back from today (or yesterday if today is not active yet). */
export function streakDays(activeDays: string[], today = new Date()): number {
  const active = new Set(activeDays);
  const day = new Date(today);
  if (!active.has(todayISO(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (active.has(todayISO(day))) {
    streak += 1;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

export function snapshotOf(s: ProgressSnapshot): ProgressSnapshot {
  return {
    lessons: s.lessons,
    stats: s.stats,
    examResults: s.examResults,
    activeDays: s.activeDays,
    reviewQueue: s.reviewQueue,
  };
}
