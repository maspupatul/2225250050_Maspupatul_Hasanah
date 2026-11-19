import { AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PopButton } from '../../components/ui/PopButton';
import { ZLogo } from '../../components/ui/ZLogo';
import { Icon, type IconName } from '../../components/ui/Icon';
import { BrandName } from '../../components/ui/BrandName';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import { todayISO } from '../../lib/format';
import { buildCsv, filterStudents, sortForTeacher, type StatusFilter } from '../../lib/teacherReport';
import type { SchoolClass, StudentSummary } from '../../lib/types';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../store/auth';
import { ClassManager } from './ClassManager';
import { ModuleBars } from './ModuleBars';
import { StatusBadge } from './StatusBadge';
import { StudentDetailModal } from './StudentDetailModal';

const FILTERS: StatusFilter[] = ['semua', 'perlu_bimbingan', 'berproses', 'tuntas'];

function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** `/guru/dashboard`: class management + read-only monitoring of the teacher's classes. */
export function TeacherDashboardPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  // null = Semua Kelas; otherwise the class_code of one class
  const [selected, setSelected] = useState<string | null>(null);
  const { data: classList, reload: reloadClasses } = useApi(() => api.classes(), []);
  const { data, error, loading, reload } = useApi(() => api.classSummary(selected), [selected]);
  const [created, setCreated] = useState<SchoolClass[]>([]);
  // classes made in this visit show at once, before the list reloads
  const classes = useMemo(() => {
    const known = classList ?? [];
    return [...known, ...created.filter((c) => !known.some((k) => k.id === c.id))];
  }, [classList, created]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('semua');
  const [openId, setOpenId] = useState<number | null>(null);

  const students = useMemo(
    () => (data ? sortForTeacher(filterStudents(data.students, query, status)) : []),
    [data, query, status],
  );

  const logout = () => {
    signOut();
    navigate('/masuk', { replace: true });
  };

  const exportCsv = () => {
    if (!data) return;
    const csv = buildCsv(sortForTeacher(data.students), data.modules, t.teacher.csvHeader, t.teacher.status);
    const scope = (data.kelas ?? 'semua-kelas').replace(/[^A-Za-z0-9-]+/g, '-');
    downloadCsv(`rekap-nilai-${scope}-${todayISO()}.csv`, csv);
  };

  const cards = data
    ? [
        {
          icon: 'users' as IconName,
          value: data.class.total_students,
          label: t.teacher.totalStudents,
          tone: 'from-plum-600 to-plum-800',
        },
        {
          icon: 'trophy' as IconName,
          value: data.class.avg_exam_best ?? '—',
          label: t.teacher.avgExam,
          tone: 'from-amber-300 to-amber-500',
        },
        {
          icon: 'chart' as IconName,
          value: `${data.class.completion_rate}%`,
          label: t.teacher.completion,
          tone: 'from-orange-400 to-accent',
        },
        {
          icon: 'support' as IconName,
          value: data.class.students_need_help,
          label: t.teacher.needHelp,
          tone: 'from-fuchsia-500 to-purple-600',
        },
      ]
    : [];

  const openStudent = (s: StudentSummary) => setOpenId(s.id);

  return (
    <div className="min-h-dvh bg-lavender-50 pb-10">
      <header className="bg-plum-800 px-5 pb-14 pt-[calc(env(safe-area-inset-top)+20px)] text-white sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ZLogo size={44} />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-widest text-white/60">
                {data?.kelas ? t.teacher.kelas(data.kelas) : <BrandName />}
              </p>
              <h1 className="text-lg font-black leading-tight sm:text-xl">{t.teacher.title}</h1>
            </div>
          </div>
          <button type="button" onClick={logout} className="btn-3d-dark shrink-0 px-4 py-2 text-sm">
            {t.auth.logout}
          </button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-white/70">
          <Icon name="teacher" size={16} />
          {user?.name}
        </p>
      </header>

      <main className="-mt-8 space-y-5 px-4 sm:px-8">
        {loading && !data && <div className="h-40 animate-pulse rounded-4xl bg-white" />}
        {error && !data && (
          <div className="card-3d p-5 text-center">
            <p className="text-sm font-bold">{t.teacher.loadError}</p>
            <PopButton onClick={reload} className="mt-3 text-sm">
              {t.home.retry}
            </PopButton>
          </div>
        )}

        <ClassManager
          classes={classes}
          onCreated={(c) => {
            setCreated((list) => [...list, c]);
            reloadClasses();
          }}
        />

        {/* class filter: recap, table and CSV follow the selected class */}
        {classes.length > 1 && (
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t.teacher.filterClass}>
            {[{ code: null, label: t.teacher.allClasses }, ...classes.map((c) => ({ code: c.class_code, label: c.class_name }))].map(
              (option) => {
                const active = selected === option.code;
                return (
                  <button
                    key={option.code ?? 'all'}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelected(option.code)}
                    className={`rounded-full px-4 py-2 text-sm font-extrabold transition active:translate-y-0.5 ${
                      active
                        ? 'bg-accent text-white shadow-pop-accent active:shadow-none'
                        : 'border-2 border-lavender-200 bg-white text-plum-700'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              },
            )}
          </div>
        )}

        {data && (
          <>
            {/* class summary */}
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {cards.map((c) => (
                <li key={c.label} className="card-3d flex items-center gap-3 p-4">
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white ${c.tone}`}
                    aria-hidden="true"
                  >
                    <Icon name={c.icon} size={24} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-2xl font-black leading-tight">{c.value}</span>
                    <span className="block text-[11px] font-bold leading-tight text-ink-muted">{c.label}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* search, filter, export */}
            <section className="card-3d space-y-3 p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.teacher.search}
                  aria-label={t.teacher.search}
                  className="min-w-0 flex-1 rounded-2xl border-2 border-lavender-200 bg-white px-4 py-2.5 font-bold outline-none focus:border-accent"
                />
                <PopButton onClick={exportCsv} disabled={data.students.length === 0} className="text-sm">
                  <Icon name="download" size={18} />
                  {t.teacher.exportCsv}
                </PopButton>
              </div>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filter status">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={status === f}
                    onClick={() => setStatus(f)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition active:translate-y-0.5 ${
                      status === f ? 'bg-plum-800 text-white shadow-[0_3px_0_#231a2f]' : 'bg-lavender-100 text-plum-700'
                    }`}
                  >
                    {t.teacher.filters[f]}
                  </button>
                ))}
              </div>
            </section>

            {data.students.length === 0 ? (
              <p className="card-3d p-5 text-center text-sm font-bold text-ink-muted">{t.teacher.empty}</p>
            ) : students.length === 0 ? (
              <p className="card-3d p-5 text-center text-sm font-bold text-ink-muted">{t.teacher.noMatch}</p>
            ) : (
              <>
                {/* phones: cards */}
                <ul className="space-y-3 md:hidden">
                  {students.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => openStudent(s)}
                        className="card-3d block w-full p-4 text-left transition-[transform,box-shadow] active:translate-y-1 active:shadow-none"
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate font-extrabold">{s.name}</span>
                            <span className="block text-xs text-ink-muted">
                              <Icon name="trophy" size={13} className="-mt-0.5 mr-0.5 inline-block" />
                              {s.exam_best ?? t.teacher.notYet} ·{' '}
                              <Icon name="lightbulb" size={13} className="-mt-0.5 mr-0.5 inline-block" />
                              {s.hints_used}
                            </span>
                          </span>
                          <StatusBadge status={s.status} />
                        </span>
                        <span className="mt-3 block">
                          <ModuleBars modules={s.modules} compact />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                {/* tablets & laptops: table */}
                <div className="card-3d hidden overflow-hidden md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-lavender-100 text-xs uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-4 py-3">{t.teacher.student}</th>
                        {data.modules.map((m) => (
                          <th key={m.id} className="px-2 py-3">
                            {t.profile.modules[m.id] ?? m.title}
                          </th>
                        ))}
                        <th className="px-2 py-3 text-right">{t.teacher.examBest}</th>
                        <th className="px-2 py-3 text-right">{t.teacher.hints}</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr
                          key={s.id}
                          onClick={() => openStudent(s)}
                          className="cursor-pointer border-t border-lavender-100 transition-colors hover:bg-accent-soft/40"
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openStudent(s)}
                              className="text-left font-extrabold hover:text-accent"
                            >
                              {s.name}
                            </button>
                            <span className="block text-xs text-ink-muted">@{s.username}</span>
                          </td>
                          {s.modules.map((m) => (
                            <td key={m.id} className="px-2 py-3">
                              <span className="block h-2 w-20 overflow-hidden rounded-full bg-lavender-200">
                                <span
                                  className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-accent"
                                  style={{ width: `${m.percent}%` }}
                                />
                              </span>
                              <span className="text-xs font-bold tabular-nums">{m.percent}%</span>
                            </td>
                          ))}
                          <td className="px-2 py-3 text-right font-black tabular-nums">{s.exam_best ?? t.teacher.notYet}</td>
                          <td className="px-2 py-3 text-right font-bold">{s.hints_used}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={s.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </main>

      <AnimatePresence>
        {openId !== null && <StudentDetailModal studentId={openId} onClose={() => setOpenId(null)} />}
      </AnimatePresence>
    </div>
  );
}
