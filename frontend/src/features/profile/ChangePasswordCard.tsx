import { useState, type FormEvent } from 'react';
import { Icon } from '../../components/ui/Icon';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import { useAuth } from '../../store/auth';

const STUDENT_MIN = 6;
const field =
  'mt-1 w-full rounded-2xl border-2 border-lavender-200 bg-white px-4 py-2.5 text-base font-bold text-ink outline-none placeholder:text-sm placeholder:font-semibold focus:border-accent';
const label = 'block text-sm font-extrabold text-ink';

/**
 * Profil → Ubah kata sandi. Collapsed by default (like Kelasku); asks for the current
 * password, the new one and a repeat, so a typo cannot lock the student out.
 */
export function ChangePasswordCard() {
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  if (!user || user.role !== 'siswa') return null;

  const mismatch = repeat.length > 0 && next !== repeat;
  const ready = current.length > 0 && next.length >= STUDENT_MIN && next === repeat && !busy;

  const close = () => {
    setOpen(false);
    setCurrent('');
    setNext('');
    setRepeat('');
    setShow(false);
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await api.changePassword(current, next);
      close();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  const type = show ? 'text' : 'password';

  return (
    <section className="rounded-4xl bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender-100 text-plum-700">
          <Icon name="lock" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-ink">{t.profile.passwordTitle}</h2>
          <p className="text-sm text-ink-muted">{t.profile.passwordLead}</p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setSaved(false);
            }}
            className="shrink-0 rounded-full border-2 border-lavender-200 px-3 py-1.5 text-xs font-extrabold text-plum-700 shadow-pop-soft active:translate-y-0.5 active:shadow-none"
          >
            {t.profile.passwordChange}
          </button>
        )}
      </div>

      {saved && (
        <p
          className="mt-3 flex items-center gap-1.5 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-correct"
          role="status"
        >
          <Icon name="check-circle" size={18} className="shrink-0" />
          {t.profile.passwordSaved}
        </p>
      )}

      {open && (
        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3" noValidate>
          <label className={label}>
            {t.profile.passwordCurrent}
            <input
              className={field}
              type={type}
              value={current}
              maxLength={64}
              autoComplete="current-password"
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label className={label}>
            {t.profile.passwordNew}
            <input
              className={field}
              type={type}
              value={next}
              maxLength={64}
              autoComplete="new-password"
              onChange={(e) => setNext(e.target.value)}
            />
            <span className="mt-1 block text-xs font-semibold leading-5 text-ink-muted">{t.profile.passwordHint}</span>
          </label>
          <label className={label}>
            {t.profile.passwordRepeat}
            <input
              className={field}
              type={type}
              value={repeat}
              maxLength={64}
              autoComplete="new-password"
              aria-invalid={mismatch}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink-muted">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            {t.profile.passwordShow}
          </label>

          {(mismatch || error) && (
            <p className="text-sm font-bold text-amber-800" role="alert">
              {mismatch ? t.profile.passwordMismatch : error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!ready}
              className="btn-3d-primary flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {t.profile.passwordSave}
            </button>
            <button type="button" onClick={close} className="btn-3d-soft flex-1 px-4 py-2.5 text-sm">
              {t.teacher.cancel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
