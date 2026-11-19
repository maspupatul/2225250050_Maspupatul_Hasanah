import { motion } from 'framer-motion';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { InstallCard } from '../../components/ui/InstallCard';
import { BrandName } from '../../components/ui/BrandName';
import { PopButton } from '../../components/ui/PopButton';
import { ZLogo } from '../../components/ui/ZLogo';
import { Icon } from '../../components/ui/Icon';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import { cleanClassCode } from '../../lib/classCode';
import type { Role } from '../../lib/types';
import { homeFor, useAuth } from '../../store/auth';
import { snapshotOf, useProgress } from '../../store/progress';

const LOGIN_PATH = '/masuk';
const REGISTER_PATH = '/daftar';

const field =
  'mt-1 w-full rounded-2xl border-2 border-lavender-200 bg-white px-4 py-3 text-base font-bold text-ink outline-none transition placeholder:text-sm placeholder:font-semibold focus:border-accent';
const label = 'block text-sm font-extrabold text-ink';
const hint = 'mt-1 text-xs leading-5 text-ink-muted';

/**
 * `/masuk` (login) and `/daftar` (sign-up) for students (username + password, optional class
 * code) and teachers (username/e-mail + password + school sign-up code).
 */
export function AuthPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, signIn } = useAuth();
  const markActive = useProgress((s) => s.markActive);
  const [role, setRole] = useState<Role>('siswa');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to={homeFor(user)} replace />;

  const register = pathname === REGISTER_PATH;
  const ready =
    username.trim().length >= 3 &&
    password.length >= (register ? (role === 'guru' ? 8 : 6) : 1) &&
    (!register || (name.trim().length >= 2 && (role === 'siswa' ? consent : teacherCode.trim())));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = register
        ? await api.register({
            role,
            name: name.trim(),
            username: username.trim(),
            password,
            class_code: role === 'siswa' && classCode ? classCode : undefined,
            parent_consent: role === 'siswa' ? consent : undefined,
            teacher_code: role === 'guru' ? teacherCode.trim() : undefined,
          })
        : await api.login({ username: username.trim(), password, role });
      if (register && session.user.role === 'siswa') {
        // a new account adopts what was learnt on this device before accounts existed
        signIn({ ...session, progress: undefined });
        void api.syncProgress(snapshotOf(useProgress.getState())).catch(() => undefined);
      } else {
        signIn(session);
      }
      if (session.user.role === 'siswa') markActive();
      navigate(homeFor(session.user), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  const switchRole = (next: Role) => {
    setRole(next);
    setError(null);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-plum-800 px-5 pb-8 pt-[calc(env(safe-area-inset-top)+36px)] text-white">
      <div className="flex items-center gap-4">
        <ZLogo size={64} />
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            <BrandName className="font-brand font-extrabold" />
          </h1>
          <p className="text-sm text-white/70">{t.subject}</p>
        </div>
      </div>

      {/* role: Siswa | Guru */}
      <div
        className="mt-8 grid grid-cols-2 gap-1 rounded-full bg-plum-950/60 p-1.5"
        role="radiogroup"
        aria-label="Peran"
      >
        {(['siswa', 'guru'] as const).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={role === r}
            onClick={() => switchRole(r)}
            className={`relative rounded-full py-2.5 text-sm font-extrabold transition-colors ${role === r ? 'text-white' : 'text-white/60'}`}
          >
            {role === r && (
              <motion.span
                layoutId="authRolePill"
                className="absolute inset-0 rounded-full bg-accent shadow-[0_3px_0_#c2410c]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              <Icon name={r === 'siswa' ? 'backpack' : 'teacher'} size={18} />
              {r === 'siswa' ? t.auth.asStudent : t.auth.asTeacher}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={(e) => void submit(e)} className="card-3d mt-5 space-y-4 rounded-4xl p-5 text-ink" noValidate>
        <h2 className="text-lg font-extrabold leading-snug">
          {register ? t.auth.registerTitle[role] : t.auth.loginTitle[role]}
        </h2>

        {register && (
          <label className={label}>
            {t.auth.name}
            <input
              className={field}
              value={name}
              maxLength={40}
              autoComplete="nickname"
              placeholder={t.auth.namePlaceholder}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}

        <label className={label}>
          {t.auth.username[role]}
          <input
            className={field}
            value={username}
            maxLength={60}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t.auth.usernamePlaceholder[role]}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
          />
          {register && <span className={hint}>{t.auth.usernameHint}</span>}
        </label>

        <label className={label}>
          {t.auth.password[role]}
          <span className="relative block">
            <input
              className={`${field} pr-24`}
              type={showPassword ? 'text' : 'password'}
              value={password}
              maxLength={64}
              autoComplete={register ? 'new-password' : 'current-password'}
              placeholder={t.auth.passwordPlaceholder}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1.5 top-1/2 mt-0.5 -translate-y-1/2 rounded-xl px-2.5 py-2 text-xs font-extrabold text-plum-700"
            >
              {showPassword ? t.auth.hidePassword : t.auth.showPassword}
            </button>
          </span>
          {register && <span className={hint}>{t.auth.passwordHint[role]}</span>}
        </label>

        {register && role === 'siswa' && (
          <label className={label}>
            {t.auth.classCode}
            <input
              className={`${field} font-mono uppercase tracking-[0.3em]`}
              value={classCode}
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="ZM7A92"
              onChange={(e) => setClassCode(cleanClassCode(e.target.value))}
            />
            <span className={hint}>{t.auth.classCodeHint}</span>
          </label>
        )}

        {register && role === 'guru' && (
          <label className={label}>
            {t.auth.teacherCode}
            <input
              className={field}
              value={teacherCode}
              maxLength={64}
              onChange={(e) => setTeacherCode(e.target.value)}
            />
            <span className={hint}>{t.auth.teacherCodeHint}</span>
            <span className={hint}>{t.auth.teacherClassNote}</span>
          </label>
        )}

        {register && role === 'siswa' && (
          <label className="flex cursor-pointer gap-3 rounded-2xl bg-lavender-50 p-3 text-sm font-bold leading-6">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-accent"
            />
            {t.auth.consent}
          </label>
        )}

        {error && (
          <p
            className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800"
            role="alert"
          >
            {error}
          </p>
        )}

        <PopButton type="submit" disabled={!ready || busy} block>
          {register ? t.auth.submitRegister : t.auth.submitLogin}
        </PopButton>

        {/* students reset through their teacher; teachers are not told to ask a teacher */}
        {!register && role === 'siswa' && (
          <p className="text-center text-xs leading-5 text-ink-muted">{t.auth.forgotPassword}</p>
        )}

        <p className="text-center text-sm text-ink-muted">
          {register ? t.auth.haveAccount : t.auth.noAccount}{' '}
          <button
            type="button"
            onClick={() => {
              navigate(register ? LOGIN_PATH : REGISTER_PATH, { replace: true });
              setError(null);
            }}
            className="font-extrabold text-accent underline-offset-2 hover:underline"
          >
            {register ? t.auth.login : t.auth.register}
          </button>
        </p>
      </form>

      <p className="mt-4 text-center text-xs leading-5 text-white/60">{t.auth.privacy}</p>
      {import.meta.env.DEV && <p className="mt-1 text-center text-xs text-amber-200/80">{t.auth.demoNote}</p>}

      <div className="mt-6">
        <InstallCard />
      </div>
    </div>
  );
}
