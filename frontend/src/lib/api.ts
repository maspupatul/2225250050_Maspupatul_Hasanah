import { t } from '../i18n/id';
import type {
  ExamInfo,
  ExamStart,
  Hint,
  Lesson,
  ModuleInfo,
  Problem,
  StepKey,
  StepResult,
  Twin,
} from './types';

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError('NETWORK', t.errors.network, 0);
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(error?.code ?? 'INTERNAL_ERROR', error?.message ?? t.errors.generic, res.status);
  }
  return data as T;
}

export interface NextProblemBody {
  lesson_id?: string;
  template_id?: string;
  /** Ujian Akhir: seed from `startExam` and the problem number. */
  exam_seed?: number;
  exam_index?: number;
  guided: boolean;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  modules: () => request<ModuleInfo[]>('/modules'),
  lesson: (id: string) => request<Lesson>(`/lessons/${encodeURIComponent(id)}`),
  nextProblem: (body: NextProblemBody) => post<Problem>('/practice/next', body),
  submitStep: (attemptId: string, step: StepKey, answer: number | string | number[]) =>
    post<StepResult>(`/practice/attempts/${attemptId}/steps`, { step, answer }),
  hint: (attemptId: string, step: StepKey) =>
    post<Hint>(`/practice/attempts/${attemptId}/hint`, { step }),
  twin: (attemptId: string) =>
    post<{ twin: Twin; message: string }>(`/practice/attempts/${attemptId}/twin`),
  exam: () => request<ExamInfo>('/exam'),
  startExam: () => post<ExamStart>('/exam/start', {}),
};
