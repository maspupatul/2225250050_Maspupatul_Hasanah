import { useState, type FormEvent } from 'react';
import { Icon } from '../../components/ui/Icon';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import { CLASS_CODE_LENGTH, cleanClassCode } from '../../lib/classCode';
import { useAuth } from '../../store/auth';

/** Profil: join a class with the teacher's code, or switch to another class. */
export function ClassCodeCard() {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  if (!user || user.role !== 'siswa') return null;

  const joined = Boolean(user.class_code);
  const showForm = !joined || editing;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (code.length !== CLASS_CODE_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.joinClass(code);
      setUser(updated);
      setSaved(t.profile.classSaved(updated.kelas ?? code));
      setEditing(false);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-4xl bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender-100 text-plum-700">
          <Icon name="users" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-ink">{t.profile.classTitle}</h2>
          <p className="text-sm text-ink-muted [overflow-wrap:anywhere]">
            {joined && user.kelas && user.class_code
              ? t.profile.classCurrent(user.kelas, user.class_code)
              : t.profile.classNone}
          </p>
        </div>
        {joined && !editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setSaved(null);
            }}
            className="shrink-0 rounded-full border-2 border-lavender-200 px-3 py-1.5 text-xs font-extrabold text-plum-700 shadow-pop-soft active:translate-y-0.5 active:shadow-none"
          >
            {t.profile.classChange}
          </button>
        )}
      </div>

      {saved && (
        <p className="mt-3 flex items-center gap-1.5 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-correct" role="status">
          <Icon name="check-circle" size={18} />
          {saved}
        </p>
      )}

      {showForm && (
        <form onSubmit={(e) => void submit(e)} className="mt-4">
          <label className="block text-sm font-extrabold text-ink" htmlFor="profile-class-code">
            {t.auth.classCode}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="profile-class-code"
              className="min-w-0 flex-1 rounded-2xl border-2 border-lavender-200 bg-white px-4 py-2.5 font-mono text-base font-bold uppercase tracking-[0.3em] text-ink outline-none focus:border-accent"
              value={code}
              maxLength={CLASS_CODE_LENGTH}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="ZM7A92"
              onChange={(e) => setCode(cleanClassCode(e.target.value))}
            />
            <button
              type="submit"
              disabled={code.length !== CLASS_CODE_LENGTH || busy}
              className="btn-3d-primary shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {t.profile.classJoin}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm font-bold text-amber-800" role="alert">
              {error}
            </p>
          )}
          <p className="mt-2 text-xs text-ink-muted">{t.profile.classPrivacy}</p>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="mt-2 text-xs font-extrabold text-plum-700"
            >
              {t.teacher.cancel}
            </button>
          )}
        </form>
      )}
    </section>
  );
}
