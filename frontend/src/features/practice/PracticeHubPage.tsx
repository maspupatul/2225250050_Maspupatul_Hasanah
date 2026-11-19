import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../components/ui/Icon';
import { BrandName } from '../../components/ui/BrandName';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { lessonStates, useProgress } from '../../store/progress';
import { RANDOM_COUNT, randomPool } from './randomPool';

const MotionLink = motion.create(Link);

// Tactile "game button" card: thick bottom edge that flattens when pressed.
const TACTILE =
  'block rounded-4xl border-2 border-b-4 border-slate-200 bg-white outline-none transition-[transform,border-width] duration-100 focus-visible:ring-4 focus-visible:ring-accent/30';
const TACTILE_ON = 'hover:scale-[1.015] active:translate-y-[2px] active:scale-[0.98] active:border-b-2';

// One soft tone per module, matching the module badges on the home path. Never blue/red.
const TOPICS: { id: string; icon: IconName; tone: string }[] = [
  { id: 'm1', icon: 'plus-minus', tone: 'bg-orange-100 text-orange-600' },
  { id: 'm2', icon: 'times-divide', tone: 'bg-amber-100 text-amber-600' },
  { id: 'm3', icon: 'swap', tone: 'bg-fuchsia-100 text-fuchsia-600' },
  { id: 'm4', icon: 'book-open', tone: 'bg-lavender-200 text-plum-700' },
];

function HubCard(props: { to: string; icon: IconName; title: string; body: string; enabled: boolean; tone: string }) {
  const content = (
    <span className="flex items-center gap-4">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${props.tone}`}>
        <Icon name={props.icon} size={30} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-extrabold text-ink">{props.title}</span>
        <span className="block text-sm text-ink-muted">{props.body}</span>
      </span>
      {props.enabled && <Icon name="chevron-right" size={24} className="text-accent" />}
    </span>
  );
  return props.enabled ? (
    <MotionLink to={props.to} className={`${TACTILE} ${TACTILE_ON} p-5`}>
      {content}
    </MotionLink>
  ) : (
    <div className={`${TACTILE} p-5 opacity-70`}>{content}</div>
  );
}

function TopicCard(props: { to: string; icon: IconName; tone: string; number: number; title: string; body: string; enabled: boolean }) {
  const content = (
    <>
      <span className="flex items-start justify-between">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${props.enabled ? props.tone : 'bg-lavender-100 text-ink-muted'}`}>
          <Icon name={props.enabled ? props.icon : 'lock'} size={props.enabled ? 24 : 20} />
        </span>
        <span className="text-xs font-black text-lavender-300">{props.number}</span>
      </span>
      <span className="mt-3 block text-[15px] font-extrabold leading-tight text-ink">{props.title}</span>
      <span className="mt-0.5 block text-xs text-ink-muted">{props.body}</span>
    </>
  );
  return props.enabled ? (
    <MotionLink to={props.to} className={`${TACTILE} ${TACTILE_ON} h-full rounded-3xl p-4`}>
      {content}
    </MotionLink>
  ) : (
    <div className={`${TACTILE} h-full rounded-3xl p-4 opacity-70`}>{content}</div>
  );
}

/** `/latihan`: random mixed practice, the Antrean Ulang, and practice per topic (module). */
export function PracticeHubPage() {
  const { data: modules } = useApi(() => api.modules(), []);
  const lessons = useProgress((s) => s.lessons);
  const queue = useProgress((s) => s.reviewQueue.length);
  const states = modules ? lessonStates(modules, lessons) : {};
  const pool = modules ? randomPool(modules, states) : [];

  return (
    <div className="min-h-dvh bg-lavender-50 pb-32">
      <header className="rounded-b-[2.5rem] bg-plum-800 px-6 pb-12 pt-[calc(env(safe-area-inset-top)+24px)] text-white">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/60">
          <BrandName />
        </p>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight">{t.practiceHub.title}</h1>
        <p className="text-sm text-white/70">{t.practiceHub.subtitle}</p>
      </header>
      <main className="-mt-6 space-y-4 px-4">
        <HubCard
          to="/latihan/acak"
          icon="target"
          title={t.practiceHub.randomTitle}
          body={pool.length > 0 ? t.practiceHub.randomBody(RANDOM_COUNT) : t.practiceHub.randomLocked}
          enabled={pool.length > 0}
          tone="bg-amber-100 text-accent"
        />
        <HubCard
          to="/latihan/ulang"
          icon="refresh"
          title={t.practiceHub.reviewTitle}
          body={t.practiceHub.reviewBody(queue)}
          enabled={queue > 0}
          tone="bg-accent-soft text-accent"
        />

        {modules && (
          <section className="pt-2">
            <h2 className="mb-3 px-1 font-extrabold text-ink">{t.practiceHub.topicsTitle}</h2>
            <ul className="grid grid-cols-2 gap-3">
              {TOPICS.map((topic, i) => {
                const open = randomPool(modules, states, topic.id).length;
                return (
                  <motion.li
                    key={topic.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.05 * i }}
                  >
                    <TopicCard
                      to={`/latihan/acak?topik=${topic.id}`}
                      icon={topic.icon}
                      tone={topic.tone}
                      number={i + 1}
                      title={t.practiceHub.topics[topic.id]}
                      body={open > 0 ? t.practiceHub.topicBody(open) : t.practiceHub.topicLocked}
                      enabled={open > 0}
                    />
                  </motion.li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
