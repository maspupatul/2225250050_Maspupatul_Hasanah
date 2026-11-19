import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { InstallCard } from '../../components/ui/InstallCard';
import { BrandName, BrandText } from '../../components/ui/BrandName';
import { ProgressRings } from '../../components/ui/ProgressRings';
import { RoundButton } from '../../components/ui/RoundButton';
import { STAT_TONE } from '../../components/ui/statTones';
import { StatTile } from '../../components/ui/StatTile';
import { Toggle } from '../../components/ui/Toggle';
import { TrophyArt } from '../../components/ui/TrophyArt';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import { todayISO } from '../../lib/format';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../store/auth';
import { bestExamScore, moduleMastery, useProgress } from '../../store/progress';
import { ChangePasswordCard } from './ChangePasswordCard';
import { ClassCodeCard } from './ClassCodeCard';

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
  const { name, lessons, activeDays, stats, guided, examResults, setGuided } = useProgress();
  const { user, signOut } = useAuth();
  const bestExam = bestExamScore(examResults);
  const [editing, setEditing] = useState(false);

  const rings = (modules ?? []).map((m, i) => ({
    id: m.id,
    label: t.profile.modules[m.id] ?? m.title,
    value: moduleMastery(m, lessons),
    color: RING_COLORS[i % RING_COLORS.length],
  }));
  const week = currentWeek();
  const activeThisWeek = week.filter((d) => activeDays.includes(todayISO(d))).length;

  const skills = [
    { icon: 'check-circle', tone: STAT_TONE.correct, value: stats.correct, label: t.profile.correct },
    { icon: 'sparkles', tone: STAT_TONE.selfFound, value: stats.selfFound, label: t.profile.selfFound },
    { icon: 'lightbulb', tone: STAT_TONE.hints, value: stats.hintsUsed, label: t.profile.hintsUsed },
    { icon: 'refresh', tone: STAT_TONE.deferred, value: stats.deferred, label: t.profile.deferred },
  ] as const;

  return (
    <div className="min-h-dvh bg-lavender-50 pb-32">
      <header className="rounded-b-[2.5rem] bg-plum-800 px-6 pb-12 pt-[calc(env(safe-area-inset-top)+16px)] text-center text-white">
        <div className="flex items-center justify-between">
          <RoundButton label={t.common.close} onClick={() => navigate('/')}>
            <Icon name="close" size={20} />
          </RoundButton>
          <RoundButton label={t.profile.settings} onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
            <Icon name="settings" size={20} />
          </RoundButton>
        </div>
        <div className="mx-auto -mt-2 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-amber-300 to-accent font-brand text-4xl font-extrabold tracking-tight text-plum-900 shadow-card">
          {name.charAt(0).toUpperCase() || <Icon name="user" size={36} />}
        </div>
        <h1 className="mt-3 text-xl font-extrabold">{name}</h1>
        <p className="text-xs text-white/60">
          {user?.kelas ? (
            <>
              {t.teacher.kelas(user.kelas)} · <BrandName className="font-brand font-extrabold" />
            </>
          ) : (
            <BrandText text={t.profile.student} brandClassName="font-brand font-extrabold" />
          )}
        </p>
      </header>

      <main className="-mt-8 space-y-4 px-4">
        {editing && (
          <section className="card-3d space-y-4 p-5">
            <h2 className="text-sm font-extrabold text-ink">{t.profile.settings}</h2>
            <p className="text-sm text-ink-muted">
              @{user?.username}
              {user?.kelas ? ` · ${t.teacher.kelas(user.kelas)}` : ''}
            </p>
            <div className="flex items-center justify-between text-sm font-bold text-ink">
              {t.profile.guideDefault}
              <Toggle checked={guided} onChange={setGuided} label={t.profile.guideDefault} />
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t.auth.logoutConfirm)) {
                  signOut();
                  navigate('/masuk', { replace: true });
                }
              }}
              className="btn-3d-soft flex w-full items-center justify-center gap-2 text-plum-700"
            >
              <Icon name="logout" size={18} />
              {t.auth.logout}
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
                <span className="font-extrabold tabular-nums text-ink-muted">{ring.value}%</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex items-center gap-4 rounded-4xl bg-white p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#2D2142]">
            <TrophyArt size={32} />
          </span>
          <span className="flex-1 text-sm font-bold text-ink">{t.profile.examBest}</span>
          <span className="text-2xl font-black tabular-nums text-ink">{bestExam ?? t.profile.examNone}</span>
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
          {/* fixed grid: 2 × 2 on phones, 4 in a row on wider screens, never a horizontal scrollbar */}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {skills.map((s, i) => (
              <StatTile key={s.label} icon={s.icon} tone={s.tone} value={s.value} label={s.label} index={i} />
            ))}
          </ul>
        </section>

        <ClassCodeCard />

        <ChangePasswordCard />

        <InstallCard />
      </main>
    </div>
  );
}
