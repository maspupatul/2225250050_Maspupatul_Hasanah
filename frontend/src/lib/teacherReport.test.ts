import { describe, expect, it } from 'vitest';
import { buildCsv, filterStudents, sortForTeacher } from './teacherReport';
import type { StudentSummary } from './types';

const student = (over: Partial<StudentSummary>): StudentSummary => ({
  id: 1,
  name: 'Ayu',
  username: 'ayu',
  kelas: 'VII-A',
  class_code: 'ZM7A92',
  modules: [
    { id: 'm1', title: 'Tambah', percent: 100, mastery: 90 },
    { id: 'm2', title: 'Kali', percent: 50, mastery: 70 },
  ],
  percent_done: 75,
  avg_mastery: 85,
  exam_best: 88,
  exam_attempts: 2,
  correct: 20,
  self_found: 15,
  hints_used: 3,
  deferred: 0,
  streak: 2,
  last_active: '2026-11-15',
  status: 'berproses',
  ...over,
});

const students = [
  student({ id: 1, name: 'Ayu', status: 'tuntas' }),
  student({ id: 2, name: 'Citra', username: 'citra', status: 'perlu_bimbingan' }),
  student({ id: 3, name: 'Bima', username: 'bima' }),
];

describe('teacher dashboard', () => {
  it('filters by name and status', () => {
    expect(filterStudents(students, 'ci', 'semua').map((s) => s.name)).toEqual(['Citra']);
    expect(filterStudents(students, '', 'tuntas').map((s) => s.name)).toEqual(['Ayu']);
    expect(filterStudents(students, 'BIMA', 'tuntas')).toEqual([]);
  });

  it('lists students who need help first', () => {
    expect(sortForTeacher(students).map((s) => s.name)).toEqual(['Citra', 'Bima', 'Ayu']);
  });

  it('builds an Excel-friendly CSV with one column per module', () => {
    const csv = buildCsv(
      [student({ name: 'Sari; "Ana"' }), student({ name: '=HYPERLINK("x")', exam_best: null })],
      [
        { id: 'm1', title: 'Tambah' },
        { id: 'm2', title: 'Kali' },
      ],
      [
        'Nama',
        'Username',
        'Kelas',
        'Progres',
        'Penguasaan',
        'Nilai',
        'Percobaan',
        'Benar',
        'Mandiri',
        'Petunjuk',
        'Ditunda',
        'Status',
        'Aktif',
      ],
      { berproses: 'Berproses' },
    );
    const lines = csv.replace('\uFEFF', '').trim().split('\r\n');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(lines[0]).toBe(
      'Nama;Username;Kelas;Tambah (%);Kali (%);Progres;Penguasaan;Nilai;Percobaan;Benar;Mandiri;Petunjuk;Ditunda;Status;Aktif',
    );
    expect(lines[1].startsWith('"Sari; ""Ana""";ayu;VII-A;100;50;75;85;88;')).toBe(true);
    expect(lines[1]).toContain(';Berproses;2026-11-15');
    expect(lines[2].startsWith(`"'=HYPERLINK(""x"")"`)).toBe(true); // formula neutralised
    expect(lines[2].split(';')[7]).toBe(''); // no exam yet
  });
});
