// Teacher dashboard helpers (pure, tested in teacherReport.test.ts).
import type { StudentStatus, StudentSummary } from './types';

export type StatusFilter = 'semua' | StudentStatus;

export function filterStudents(students: StudentSummary[], query: string, status: StatusFilter): StudentSummary[] {
  const q = query.trim().toLowerCase();
  return students.filter(
    (s) =>
      (status === 'semua' || s.status === status) &&
      (!q || s.name.toLowerCase().includes(q) || s.username.toLowerCase().includes(q)),
  );
}

/** Students who need attention first, then by name. */
export function sortForTeacher(students: StudentSummary[]): StudentSummary[] {
  const rank: Record<StudentStatus, number> = { perlu_bimbingan: 0, berproses: 1, tuntas: 2 };
  return [...students].sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name, 'id'));
}

const cell = (value: string | number | null): string => {
  const text = value === null ? '' : String(value);
  // quote when needed; neutralise spreadsheet formulas (=, +, -, @) typed into names
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[";\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/**
 * CSV with ";" separators and a UTF-8 BOM so it opens correctly in Excel with
 * Indonesian regional settings. One column per module (subbab).
 */
export function buildCsv(
  students: StudentSummary[],
  modules: { id: string; title: string }[],
  header: readonly string[],
  statusLabel: Record<string, string>,
): string {
  const head = [...header.slice(0, 3), ...modules.map((m) => `${m.title} (%)`), ...header.slice(3)];
  const rows = students.map((s) => [
    s.name,
    s.username,
    s.kelas,
    ...modules.map((m) => s.modules.find((x) => x.id === m.id)?.percent ?? 0),
    s.percent_done,
    s.avg_mastery,
    s.exam_best,
    s.exam_attempts,
    s.correct,
    s.self_found,
    s.hints_used,
    s.deferred,
    statusLabel[s.status] ?? s.status,
    s.last_active,
  ]);
  return '\uFEFF' + [head, ...rows].map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}
