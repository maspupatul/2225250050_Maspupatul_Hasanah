import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BottomNav } from '../../components/ui/BottomNav';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { lessonStates, useProgress } from '../../store/progress';
import { RANDOM_COUNT, randomPool } from './randomPool';

const MotionLink = motion.create(Link);

function HubCard(props: {
  to: string;
  icon: string;
  title: string;
  body: string;
  enabled: boolean;
  tone: string;
  children?: ReactNode;
}) {
  const content = (
    <span className="flex items-center gap-4">
      <span
        className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl ${props.tone}`}
        aria-hidden="true"
      >
        {props.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-extrabold text-ink">{props.title}</span>
        <span className="block text-sm text-ink-muted">{props.body}</span>
      </span>
      {props.enabled && (
        <span className="text-2xl text-accent" aria-hidden="true">
          ›
        </span>
      )}
    </span>
  );
  const base = 'block rounded-4xl bg-white p-5 shadow-sm ring-1 ring-lavender-200';
  return props.enabled ? (
    <MotionLink to={props.to} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} className={`${base} hover:shadow-card`}>
      {content}
    </MotionLink>
  ) : (
    <div className={`${base} opacity-70`}>{content}</div>
  );
}

/** `/latihan`: random mixed practice and the Antrean Ulang. */
export function PracticeHubPage() {
  const { data: modules } = useApi(() => api.modules(), []);
  const lessons = useProgress((s) => s.lessons);
  const queue = useProgress((s) => s.reviewQueue.length);
  const pool = modules ? randomPool(modules, lessonStates(modules, lessons)) : [];

  return (
    <div className="min-h-dvh bg-lavender-50 pb-32">
      <header className="rounded-b-[2.5rem] bg-plum-800 px-6 pb-12 pt-[calc(env(safe-area-inset-top)+24px)] text-white">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/60">{t.appName}</p>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight">{t.practiceHub.title}</h1>
        <p className="text-sm text-white/70">{t.practiceHub.subtitle}</p>
      </header>
      <main className="-mt-6 space-y-4 px-4">
        <HubCard
          to="/latihan/acak"
          icon="🎯"
          title={t.practiceHub.randomTitle}
          body={pool.length > 0 ? t.practiceHub.randomBody(RANDOM_COUNT) : t.practiceHub.randomLocked}
          enabled={pool.length > 0}
          tone="bg-gradient-to-br from-amber-200 to-accent"
        />
        <HubCard
          to="/latihan/ulang"
          icon="🔁"
          title={t.practiceHub.reviewTitle}
          body={t.practiceHub.reviewBody(queue)}
          enabled={queue > 0}
          tone="bg-accent-soft"
        />
      </main>
      <BottomNav />
    </div>
  );
}
