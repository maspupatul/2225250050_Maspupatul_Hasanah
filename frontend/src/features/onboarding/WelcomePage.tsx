import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { InstallCard } from '../../components/ui/InstallCard';
import { t } from '../../i18n/id';
import { useProgress } from '../../store/progress';

export function WelcomePage() {
  const savedName = useProgress((s) => s.name);
  const setName = useProgress((s) => s.setName);
  const markActive = useProgress((s) => s.markActive);
  const [name, setLocalName] = useState('');
  const navigate = useNavigate();

  if (savedName) return <Navigate to="/" replace />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setName(name);
    markActive();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-plum-800 px-6 pb-8 pt-[calc(env(safe-area-inset-top)+48px)] text-white">
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-accent text-4xl font-black shadow-card" aria-hidden="true">
        ±
      </div>
      <h1 className="mt-6 text-4xl font-black tracking-tight">{t.appName}</h1>
      <p className="mt-2 max-w-xs text-white/75">{t.tagline}</p>

      <form onSubmit={submit} className="mt-10 rounded-4xl bg-white p-6 text-ink shadow-card">
        <label htmlFor="name" className="text-lg font-extrabold">
          {t.welcome.title}
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setLocalName(e.target.value)}
          placeholder={t.welcome.placeholder}
          maxLength={30}
          autoComplete="nickname"
          className="mt-3 w-full rounded-2xl border-2 border-lavender-200 bg-lavender-50 px-4 py-3 text-base font-bold outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-4 w-full rounded-2xl bg-accent py-3.5 text-base font-extrabold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          {t.welcome.start}
        </button>
        <p className="mt-3 text-center text-xs text-ink-muted">{t.welcome.note}</p>
      </form>

      <div className="mt-6">
        <InstallCard dark />
      </div>
    </div>
  );
}
