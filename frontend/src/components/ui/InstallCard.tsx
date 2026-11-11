import { t } from '../../i18n/id';
import { useInstall } from '../../lib/install';

/** Explains how to install the PWA on Android, Windows, Mac and iOS (no app store). */
export function InstallCard({ dark = false }: { dark?: boolean }) {
  const install = useInstall();
  const box = dark ? 'bg-plum-700/60 text-white' : 'bg-white text-ink';
  const muted = dark ? 'text-white/70' : 'text-ink-muted';

  return (
    <section className={`rounded-3xl p-5 ${box}`}>
      <h2 className="flex items-center gap-2 text-sm font-extrabold">
        <span aria-hidden="true">📲</span> {t.install.title}
      </h2>
      {install.standalone ? (
        <p className={`mt-2 text-sm ${muted}`}>{t.install.installed}</p>
      ) : install.canPrompt ? (
        <button
          type="button"
          onClick={() => void install.prompt()}
          className="mt-3 w-full rounded-2xl bg-accent py-3 text-sm font-extrabold text-white active:scale-[0.98]"
        >
          {t.install.button}
        </button>
      ) : (
        <p className={`mt-2 text-sm leading-relaxed ${muted}`}>{install.ios ? t.install.ios : t.install.other}</p>
      )}
      {!install.standalone && <p className={`mt-2 text-xs ${muted}`}>{t.install.note}</p>}
    </section>
  );
}
