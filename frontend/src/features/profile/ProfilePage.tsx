import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../../components/ui/BottomNav';
import { InstallCard } from '../../components/ui/InstallCard';
import { ProgressRings } from '../../components/ui/ProgressRings';
import { RoundButton } from '../../components/ui/RoundButton';
import { Toggle } from '../../components/ui/Toggle';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import { todayISO } from '../../lib/format';
import { useApi } from '../../lib/useApi';
import { bestExamScore, moduleMastery, useProgress } from '../../store/progress';

const RING_COLORS = ['#22c7d6', '#f0597a', '#2bc48a', '#f5a524'];

function currentWeek(): Date[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { data: modules } = useApi(() => api.modules(), []);
  const { name, lessons, activeDays, stats, guided, examResults, setName, setGuided, reset } = useProgress();
  const bestExam = bestExamScore(examResults);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const rings = (modules ?? []).map((m, i) => ({
    id: m.id,
    label: t.profile.modules[m.id] ?? m.title,
    value: moduleMastery(m, lessons),
    color: RING_COLORS[i % RING_COLORS.length],
  }));
  const week = currentWeek();
  const activeThisWeek = week.filter((d) => activeDays.includes(todayISO(d))).length;

  const skills = [
    { icon: '✅', value: stats.correct, label: t.profile.correct },
    { icon: '🌟', value: stats.selfFound, label: t.profile.selfFound },
    { icon: '💡', value: stats.hintsUsed, label: t.profile.hintsUsed },
    { icon: '🔁', value: stats.deferred, label: t.profile.deferred },
  ];

  return (
    <div className="min-h-dvh bg-lavender-50 pb-32">
      <header className="rounded-b-[2.5rem] bg-plum-800 px-6 pb-12 pt-[calc(env(safe-area-inset-top)+16px)] text-center text-white">
        <div className="flex items-center justify-between">
          <RoundButton label={t.common.close} onClick={() => navigate('/')}>
            ✕
          </RoundButton>
          <RoundButton label={t.profile.settings} onClick={() => setEditing((v) => !v)}>
            ⚙
          </RoundButton>
        </div>
        <div className="mx-auto -mt-2 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-amber-300 to-accent text-4xl font-black text-plum-900 shadow-card">
          {name.charAt(0).toUpperCase() || '🙂'}
        </div>
        <h1 className="mt-3 text-xl font-extrabold">{name}</h1>
        <p className="text-xs text-white/60">{t.profile.student}</p>
      </header>

      <main className="-mt-8 space-y-4 px-4">
        {editing && (
          <section className="rounded-4xl bg-white p-5 shadow-card">
            <h2 className="text-sm font-extrabold text-ink">{t.profile.settings}</h2>
            <label className="mt-3 block text-xs font-bold text-ink-muted" htmlFor="profile-name">
              {t.profile.name}
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="profile-name"
                value={draft}
                maxLength={30}
                onChange={(e) => setDraft(e.target.value)}
                className="min-w-0 flex-1 rounded-2xl border-2 border-lavender-200 px-3 py-2 font-bold text-ink outline-none focus:border-accent"
              />
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={() => {
                  setName(draft);
                  setEditing(false);
                }}
                className="rounded-2xl bg-accent px-4 text-sm font-extrabold text-white disabled:opacity-40"
              >
                {t.profile.save}
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm font-bold text-ink">
              {t.profile.guideDefault}
              <Toggle checked={guided} onChange={setGuided} label={t.profile.guideDefault} />
            </div>
            <button
              type="button"
              onClick={() => window.confirm(t.profile.resetConfirm) && reset()}
              className="mt-4 w-full rounded-2xl border-2 border-negative/30 py-2.5 text-sm font-extrabold text-negative"
            >
              {t.profile.reset}
            </button>
          </section>
        )}

        <section className="flex items-center gap-5 rounded-4xl bg-white p-5 shadow-card">
          <ProgressRings rings={rings} size={116} />
          <ul className="flex-1 space-y-2.5 text-sm">
            {rings.map((ring) => (
              <li key={ring.id} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: ring.color }} />
                <span className="flex-1 font-semibold text-ink">{ring.label}</span>
                <span className="font-extrabold text-ink-muted">{ring.value}%</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex items-center gap-4 rounded-4xl bg-white p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-accent text-2xl" aria-hidden="true">
            🏆
          </span>
          <span className="flex-1 text-sm font-bold text-ink">{t.profile.examBest}</span>
          <span className="text-2xl font-black text-ink">{bestExam ?? t.profile.examNone}</span>
        </section>

        <section className="rounded-4xl bg-white p-5">
          <h2 className="font-extrabold text-ink">{t.profile.activeDays(activeThisWeek)}</h2>
          <ol className="mt-3 grid grid-cols-7 gap-1 text-center">
            {week.map((day, i) => {
              const active = activeDays.includes(todayISO(day));
              return (
                <li key={i}>
                  <span
                    className={`mx-auto grid h-9 w-9 place-items-center rounded-full text-xs font-extrabold ${active ? 'bg-accent text-white' : 'border border-lavender-200 text-ink-muted'}`}
                  >
                    {day.getDate()}
                  </span>
                  <span className="mt-1 block text-[11px] font-bold text-ink-muted">{t.profile.days[i]}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section>
          <h2 className="mb-2 px-1 font-extrabold text-ink">{t.profile.skills}</h2>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {skills.map((s) => (
              <div key={s.label} className="flex min-w-[150px] snap-start items-center gap-3 rounded-3xl bg-white p-4">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender-100 text-xl" aria-hidden="true">
                  {s.icon}
                </span>
                <span>
                  <span className="block text-xl font-black text-ink">{s.value}</span>
                  <span className="block text-[11px] font-bold leading-tight text-ink-muted">{s.label}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <InstallCard />
      </main>
      <BottomNav />
    </div>
  );
}
