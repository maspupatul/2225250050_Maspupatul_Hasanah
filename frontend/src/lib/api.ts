import { t } from '../i18n/id';
import type { ProgressSnapshot } from '../store/progress';
import type {
  AccountUser,
  ClassSummary,
  ExamInfo,
  ExamStart,
  Hint,
  Lesson,
  ModuleInfo,
  Problem,
  StepKey,
  Role,
  StepResult,
  SchoolClass,
  StudentDetail,
  Twin,
} from './types';

/** Set by the auth store; read on every request so the Bearer token is always current. */
let tokenProvider: () => string | null = () => null;
let onUnauthorized: () => void = () => undefined;
export function configureAuth(provider: () => string | null, unauthorized: () => void): void {
  tokenProvider = provider;
  onUnauthorized = unauthorized;
}

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
      headers: {
        'Content-Type': 'application/json',
        ...(tokenProvider() ? { Authorization: `Bearer ${tokenProvider()}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError('NETWORK', t.errors.network, 0);
  }
  const data: unknown = await res.json().catch(() => null);
  if (res.status === 401 && tokenProvider()) onUnauthorized();
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
  hint: (attemptId: string, step: StepKey) => post<Hint>(`/practice/attempts/${attemptId}/hint`, { step }),
  twin: (attemptId: string) => post<{ twin: Twin; message: string }>(`/practice/attempts/${attemptId}/twin`),
  exam: () => request<ExamInfo>('/exam'),
  startExam: () => post<ExamStart>('/exam/start', {}),

  // accounts
  login: (body: { username: string; password: string; role: Role }) => post<AuthSession>('/auth/login', body),
  register: (body: RegisterBody) => post<AuthSession>('/auth/register', body),
  syncProgress: (snapshot: ProgressSnapshot) => post<ProgressSnapshot>('/progress/sync', snapshot),
  /** Student enters or changes their class code (null leaves the class). */
  joinClass: (classCode: string | null) =>
    request<AccountUser>('/auth/me/class', { method: 'PUT', body: JSON.stringify({ class_code: classCode }) }),
  /** Profil → Ubah kata sandi (the current password is required). */
  changePassword: (currentPassword: string, newPassword: string) =>
    request<AccountUser>('/auth/me/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),

  // teacher dashboard
  classes: () => request<SchoolClass[]>('/guru/classes'),
  createClass: (className: string) => post<SchoolClass>('/guru/classes', { class_name: className }),
  /** All of the teacher's classes, or one class when `classCode` is given. */
  classSummary: (classCode?: string | null) =>
    request<ClassSummary>(
      `/guru/students-summary${classCode ? `?class_code=${encodeURIComponent(classCode)}` : ''}`,
    ),
  studentDetail: (id: number) => request<StudentDetail>(`/guru/students/${id}`),
  /** Forgotten password: the server sets a temporary one and returns it once. */
  resetStudentPassword: (id: number) =>
    post<{ username: string; temporary_password: string }>(`/guru/students/${id}/reset-password`),
};

export interface AuthSession {
  token: string;
  user: AccountUser;
  progress?: ProgressSnapshot;
}

export interface RegisterBody {
  role: Role;
  name: string;
  username: string;
  password: string;
  /** Students: optional join code from the teacher. */
  class_code?: string;
  parent_consent?: boolean;
  teacher_code?: string;
}
