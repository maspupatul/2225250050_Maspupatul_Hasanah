import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { RichText } from '../../components/ui/RichText';
import { t } from '../../i18n/id';

const pb = t.pocketBook;
type SectionId = 'numberLine' | 'addSub' | 'mulDiv' | 'order' | 'props';
const SECTIONS: SectionId[] = ['numberLine', 'addSub', 'mulDiv', 'order', 'props'];

// sign colours (CLAUDE.md §5.4): positive blue, negative red, zero grey
const signColor = (v: number) => (v < 0 ? '#dc2626' : v > 0 ? '#1d4ed8' : '#6b7280');
const fmt = (v: number) => (v < 0 ? `−${-v}` : String(v));

function Points({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-[15px] leading-6">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
          <RichText text={item} />
        </li>
      ))}
    </ul>
  );
}

/** Mini number line −9 … 2 with −8 and −3 marked (labels sit on the picture). */
function MiniNumberLine() {
  const x = (v: number) => 20 + (v + 9) * 24;
  const values = Array.from({ length: 12 }, (_, i) => i - 9);
  return (
    <svg viewBox="0 0 310 74" className="w-full" role="img" aria-label="−8 ada di kiri −3, jadi −8 < −3">
      <text x={x(1)} y="12" textAnchor="middle" fontSize="11" fontWeight="800" fill="#4a3a60">
        {pb.numberLine.bigger} →
      </text>
      <path d={`M10 40 H${x(2) + 14}`} stroke="#2b2238" strokeWidth="2" />
      <path d={`M${x(2) + 8} 35 L${x(2) + 15} 40 L${x(2) + 8} 45`} fill="none" stroke="#2b2238" strokeWidth="2" />
      {values.map((v) => (
        <g key={v}>
          <path d={`M${x(v)} 35 V45`} stroke={signColor(v)} strokeWidth="2" />
          <text x={x(v)} y="62" textAnchor="middle" fontSize="11" fontWeight="800" fill={signColor(v)}>
            {fmt(v)}
          </text>
        </g>
      ))}
      {[-8, -3].map((v) => (
        <circle key={v} cx={x(v)} cy="40" r="6" fill="#dc2626" stroke="#fff" strokeWidth="2" />
      ))}
    </svg>
  );
}

function Chip({ sign }: { sign: '+' | '−' }) {
  return (
    <span
      className={`grid h-9 w-9 place-items-center rounded-full text-lg font-black text-white ${sign === '+' ? 'bg-positive' : 'bg-negative'}`}
    >
      {sign}
    </span>
  );
}

function ZeroPair() {
  return (
    <div className="flex items-center gap-2" role="img" aria-label="+1 dan −1 membentuk 0">
      <Chip sign="+" />
      <Chip sign="−" />
      <span className="text-lg font-black text-zero">= 0</span>
      <span className="text-xs font-bold text-ink-muted">({pb.addSub.zeroPair})</span>
    </div>
  );
}

function Sign({ s }: { s: '+' | '−' }) {
  return <span className={`font-black ${s === '+' ? 'text-positive' : 'text-negative'}`}>({s})</span>;
}

function SignTable() {
  const rows: ['+' | '−', '+' | '−', '+' | '−'][] = [
    ['+', '+', '+'],
    ['−', '−', '+'],
    ['+', '−', '−'],
    ['−', '+', '−'],
  ];
  return (
    <div className="grid grid-cols-2 gap-2 font-mono text-base">
      {rows.map(([a, b, r]) => (
        <span key={`${a}${b}`} className="rounded-2xl bg-white px-3 py-2 text-center shadow-pop-soft">
          <Sign s={a} /> × <Sign s={b} /> = <Sign s={r} />
        </span>
      ))}
    </div>
  );
}

function SectionBody({ id }: { id: SectionId }) {
  switch (id) {
    case 'numberLine':
      return (
        <>
          <MiniNumberLine />
          <Points items={pb.numberLine.points} />
        </>
      );
    case 'addSub':
      return (
        <>
          <ZeroPair />
          <Points items={pb.addSub.points} />
        </>
      );
    case 'mulDiv':
      return (
        <>
          <SignTable />
          <Points items={pb.mulDiv.points} />
        </>
      );
    case 'order':
      return (
        <ol className="space-y-2">
          {pb.order.steps.map((step, i) => (
            <li key={step} className="flex items-center gap-3 text-[15px] font-bold">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-black text-white">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      );
    default:
      return (
        <>
          <dl className="space-y-2">
            {pb.props.rows.map((row) => (
              <div key={row.name} className="rounded-2xl bg-white px-3 py-2 shadow-pop-soft">
                <dt className="text-xs font-extrabold uppercase tracking-wider text-plum-700">{row.name}</dt>
                {row.rules.map((rule) => (
                  <dd key={rule} className="font-mono text-[15px] font-bold">
                    {rule}
                  </dd>
                ))}
              </div>
            ))}
          </dl>
          <Points items={pb.props.notes} />
        </>
      );
  }
}

function Section({ id, open, onToggle }: { id: SectionId; open: boolean; onToggle: () => void }) {
  const panelId = `pocket-${id}`;
  return (
    <li className="overflow-hidden rounded-3xl border-2 border-lavender-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left font-extrabold text-ink"
      >
        {pb[id].title}
        <Icon
          name="chevron-down"
          size={20}
          className={`text-accent transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div id={panelId} className="space-y-3 bg-lavender-50 px-4 pb-4 pt-3">
          <SectionBody id={id} />
        </div>
      )}
    </li>
  );
}

const isWide = () => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches;

/**
 * Buku Saku: a short summary of the integer rules, opened during practice.
 * It is an overlay only: the problem underneath keeps its answer and progress.
 * Bottom sheet on phones, side panel on wide screens. Render inside <AnimatePresence>.
 */
export function PocketBookDrawer({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState<SectionId | null>('numberLine');
  const closeRef = useRef<HTMLButtonElement>(null);
  const [wide] = useState(isWide);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hidden = wide ? { x: '100%' } : { y: '100%' };
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-plum-950/50 lg:items-stretch lg:justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="pocket-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-[480px] flex-col rounded-t-4xl bg-lavender-50 text-ink lg:h-full lg:max-h-none lg:w-[420px] lg:rounded-none lg:rounded-l-4xl"
        initial={hidden}
        animate={{ x: 0, y: 0 }}
        exit={hidden}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      >
        <header className="flex items-center gap-3 border-b border-lavender-200 px-5 pb-3 pt-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Icon name="book-open" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="pocket-title" className="text-lg font-extrabold leading-tight">
              {pb.title}
            </h2>
            <p className="text-xs text-ink-muted">{pb.subtitle}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={pb.close}
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-lavender-200 bg-white text-plum-700 active:scale-95"
          >
            <Icon name="close" size={18} />
          </button>
        </header>
        <ul className="space-y-2.5 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4">
          {SECTIONS.map((id) => (
            <Section key={id} id={id} open={open === id} onToggle={() => setOpen(open === id ? null : id)} />
          ))}
        </ul>
      </motion.aside>
    </motion.div>
  );
}
