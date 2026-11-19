import { useState } from 'react';
import { BrandText } from './BrandName';
import { t } from '../../i18n/id';
import { useInstall } from '../../lib/install';
import { Icon } from './Icon';
import { ZLogo } from './ZLogo';

/**
 * Compact horizontal card to install the PWA (no app store): logo · title + one line · action.
 * Where the browser has no install prompt (iOS, some desktops) the action opens the manual steps.
 */
export function InstallCard({ dark = false }: { dark?: boolean }) {
  const install = useInstall();
  const [steps, setSteps] = useState(false);
  const box = dark ? 'bg-plum-700/60 text-white' : 'border-2 border-lavender-200 bg-white text-ink';
  const muted = dark ? 'text-white/70' : 'text-ink-muted';
  const button =
    'shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition active:translate-y-[2px] active:shadow-none';

  return (
    <section className={`rounded-3xl px-4 py-3.5 ${box}`}>
      <div className="flex items-center gap-3">
        <ZLogo size={42} animateIn={false} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold">
            <BrandText text={t.install.title} />
          </h2>
          <p className={`text-xs ${muted}`}>{install.standalone ? <BrandText text={t.install.installed} /> : t.install.lead}</p>
        </div>
        {install.standalone ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-extrabold text-correct">
            <Icon name="check" size={14} strokeWidth={3} />
            {t.install.installedShort}
          </span>
        ) : install.canPrompt ? (
          <button
            type="button"
            onClick={() => void install.prompt()}
            className={`${button} bg-accent text-white shadow-pop-accent`}
          >
            {t.install.button}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSteps((v) => !v)}
            aria-expanded={steps}
            className={`${button} ${dark ? 'bg-white/10 text-white' : 'border-2 border-lavender-200 bg-white text-plum-700 shadow-pop-soft'}`}
          >
            {steps ? t.install.howToClose : t.install.howTo}
          </button>
        )}
      </div>
      {!install.standalone && !install.canPrompt && steps && (
        <p className={`mt-3 text-sm leading-relaxed ${muted}`}>
          {install.ios ? t.install.ios : t.install.other} {t.install.note}
        </p>
      )}
    </section>
  );
}
