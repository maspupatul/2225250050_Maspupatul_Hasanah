import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { PopButton } from '../../components/ui/PopButton';
import { ProgressCard } from '../../components/ui/ProgressCard';
import { RmtTag } from '../../components/ui/RmtTag';
import { RoundButton } from '../../components/ui/RoundButton';
import { Toggle } from '../../components/ui/Toggle';
import { Icon } from '../../components/ui/Icon';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import type { Outcome } from '../../lib/score';
import type { ChatMessage, Hint, Problem, StepKey, StepResult, Twin } from '../../lib/types';
import { useProgress } from '../../store/progress';
import { VisualView } from '../visuals/VisualView';
import { AssistantSheet } from './AssistantSheet';
import { HintStack } from './HintStack';
import { isOfflineError, nextOfflineHint } from './offlineHints';
import { PocketBookDrawer } from './PocketBookDrawer';
import { ProblemText } from './ProblemText';
import { ReviewCard } from './ReviewCard';
import { ScratchpadCanvas } from './ScratchpadCanvas';
import { StepPanel } from './StepPanel';
import { TwinSheet } from './TwinSheet';

type Phase = 'loading' | 'solving' | 'done' | 'deferred' | 'summary' | 'error';

const message = (err: unknown) => (err instanceof Error ? err.message : t.errors.generic);

type Props = {
  /** Number of problems in this session (0 shows the summary right away). */
  total: number;
  fetchProblem: (index: number, guided: boolean) => Promise<Problem>;
  title: string;
  icon: ReactNode;
  onClose: () => void;
  /** Called once per problem, when it is solved or deferred. */
  onProblemDone?: (outcome: Outcome, problem: Problem) => void;
  /** Called after the last problem, before the summary is shown. */
  onComplete?: (outcomes: Outcome[]) => void;
  renderSummary: (outcomes: Outcome[], restart: () => void) => ReactNode;
  /** Show the Buku Saku button (practice only; never in the Ujian Akhir). */
  pocketBook?: boolean;
  /** Show Tanya Asisten (practice only; never in the Ujian Akhir). */
  assistant?: boolean;
};

const toolPill = (active: boolean) =>
  `flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-[11px] font-extrabold normal-case tracking-normal transition active:translate-y-px ${
    active
      ? 'border-plum-800 bg-plum-800 text-white'
      : 'border-lavender-200 bg-white text-plum-700 hover:border-lavender-300'
  }`;

/**
 * One practice session: problems one after another, step by step, with the
 * 3-level hints, Soal Kembar and deferral (docs/DESAIN-PEDAGOGIS.md §6.3).
 * Used by lesson practice, Antrean Ulang and Ujian Akhir.
 */
export function PracticeSession({
  total,
  fetchProblem,
  title,
  icon,
  onClose,
  onProblemDone,
  onComplete,
  renderSummary,
  pocketBook = false,
  assistant = false,
}: Props) {
  const guided = useProgress((s) => s.guided);
  const setGuided = useProgress((s) => s.setGuided);
  const recordProblem = useProgress((s) => s.recordProblem);
  const markActive = useProgress((s) => s.markActive);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(total === 0 ? 'summary' : 'loading');
  const [problem, setProblem] = useState<Problem | null>(null);
  const [stepKey, setStepKey] = useState<StepKey>('result');
  const [result, setResult] = useState<StepResult | null>(null);
  const [interpretOptions, setInterpretOptions] = useState<string[] | null>(null);
  const [hints, setHints] = useState<Hint[]>([]);
  const [hintCount, setHintCount] = useState(0);
  const [hintLoading, setHintLoading] = useState(false);
  // mirrors the server's "try before the next hint" rule for offline hints
  const [triedSinceHint, setTriedSinceHint] = useState(false);
  // hints opened offline; reported to the server before the next answer (mastery weight)
  const pendingHints = useRef<{ attemptId: string; step: StepKey }[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [twinAvailable, setTwinAvailable] = useState(false);
  const [twin, setTwin] = useState<Twin | null>(null);
  const [final, setFinal] = useState<StepResult | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [busy, setBusy] = useState(false);
  const [showVisual, setShowVisual] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // bumps on every answer so the feedback bubble pops again, even with the same text
  const [feedbackKey, setFeedbackKey] = useState(0);
  // tools: overlays only, so the current answer and progress are never reset
  const [pocketOpen, setPocketOpen] = useState(false);
  const [scratchOn, setScratchOn] = useState(false);
  const closePocket = useCallback(() => setPocketOpen(false), []);
  // Tanya Asisten: the teacher may switch it off; offline the button stays and explains itself
  const [assistantOn, setAssistantOn] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  // chat of the active step only, in memory (never stored on the device or the server)
  const [chat, setChat] = useState<{ key: string; messages: ChatMessage[] }>({ key: '', messages: [] });
  const closeAssistant = useCallback(() => setAssistantOpen(false), []);

  useEffect(() => {
    if (!assistant) return;
    let alive = true;
    api
      .assistantStatus()
      .then((s) => alive && setAssistantOn(s.enabled))
      .catch((err) => alive && setAssistantOn(isOfflineError(err, navigator.onLine)));
    return () => {
      alive = false;
    };
  }, [assistant]);

  const load = useCallback(
    async (i: number) => {
      setPhase('loading');
      setResult(null);
      setInterpretOptions(null);
      setHints([]);
      setHintCount(0);
      setTriedSinceHint(false);
      pendingHints.current = [];
      setNotice(null);
      setTwinAvailable(false);
      setTwin(null);
      setFinal(null);
      try {
        const next = await fetchProblem(i, useProgress.getState().guided);
        setProblem(next);
        setStepKey(next.current_step);
        setPhase('solving');
        window.scrollTo({ top: 0 });
      } catch (err) {
        setError(message(err));
        setPhase('error');
      }
    },
    [fetchProblem],
  );

  useEffect(() => {
    markActive();
    if (total > 0) void load(0);
    // Runs once: a session starts on mount. Parents remount it (with `key`) to start anew.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finishProblem = (outcome: Outcome, solved: Problem) => {
    const full = { ...outcome, stage: solved.exam?.stage };
    setOutcomes((list) => [...list, full]);
    recordProblem({
      correct: !outcome.deferred,
      selfFound: outcome.selfFound,
      hints: hintCount,
    });
    onProblemDone?.(full, solved);
  };

  const submit = async (answer: number | string | number[]) => {
    if (!problem) return;
    setBusy(true);
    setNotice(null);
    try {
      await syncPendingHints();
      const r = await api.submitStep(problem.attempt_id, stepKey, answer);
      setResult(r);
      if (!r.correct) setTriedSinceHint(true);
      setFeedbackKey((k) => k + 1);
      if (r.correct && r.attempt_status === 'correct') {
        setFinal(r);
        setPhase('done');
        finishProblem(
          {
            weight: r.mastery_weight ?? 0,
            selfFound: (r.max_hint_level ?? 0) === 0 && !r.twin_shown,
            deferred: false,
          },
          problem,
        );
      } else if (r.correct) {
        if (r.interpret_options) setInterpretOptions(r.interpret_options);
      } else if (r.attempt_status === 'deferred') {
        setPhase('deferred');
        finishProblem({ weight: 0, selfFound: false, deferred: true }, problem);
      } else {
        setTwinAvailable(Boolean(r.twin_available));
      }
    } catch (err) {
      setNotice(message(err));
    } finally {
      setBusy(false);
    }
  };

  const nextStep = () => {
    if (!result?.next_step) return;
    setStepKey(result.next_step);
    setResult(null);
    setHints([]);
    setTriedSinceHint(false);
    setNotice(null);
  };

  /** Report hints opened offline, in order. Stops quietly if still offline (retried later). */
  const syncPendingHints = async () => {
    while (pendingHints.current.length > 0) {
      const { attemptId, step } = pendingHints.current[0];
      try {
        await api.hint(attemptId, step);
      } catch (err) {
        if (isOfflineError(err, navigator.onLine)) return;
      }
      pendingHints.current.shift();
    }
  };

  /** Offline fallback: the static hint shipped with the problem, without an error message. */
  const showLocalHint = (current: Problem) => {
    const local = nextOfflineHint(current, stepKey, hints.length, triedSinceHint);
    if (local.kind === 'hint') {
      setHints((list) => [...list, local.hint]);
      setHintCount((n) => n + 1);
      setTriedSinceHint(false);
      pendingHints.current.push({
        attemptId: current.attempt_id,
        step: stepKey,
      });
    } else if (local.kind === 'locked') {
      setNotice(t.practice.hintLocked);
    } else {
      setNotice(t.errors.network);
    }
  };

  const askHint = async () => {
    if (!problem || phase !== 'solving' || result?.correct || hintLoading) return;
    setNotice(null);
    if (!navigator.onLine) {
      showLocalHint(problem);
      return;
    }
    setHintLoading(true);
    try {
      await syncPendingHints();
      // The server always returns the static hint; Smart Hint text is added only when
      // Gemini answered in time and passed the no-leak check.
      const hint = await api.hint(problem.attempt_id, stepKey);
      setHints((list) => [...list, hint]);
      setHintCount((n) => n + 1);
      setTriedSinceHint(false);
    } catch (err) {
      if (isOfflineError(err, navigator.onLine)) showLocalHint(problem);
      else setNotice(message(err));
    } finally {
      setHintLoading(false);
    }
  };

  const openTwin = async () => {
    if (!problem) return;
    try {
      const res = await api.twin(problem.attempt_id);
      setTwin(res.twin);
      setTwinAvailable(false);
      setResult(null);
    } catch (err) {
      setNotice(message(err));
    }
  };

  const nextProblem = () => {
    if (index + 1 < total) {
      setIndex(index + 1);
      void load(index + 1);
      return;
    }
    onComplete?.(outcomes);
    setPhase('summary');
  };

  const restart = () => {
    setOutcomes([]);
    setIndex(0);
    void load(0);
  };

  const steps = problem?.steps ?? [];
  const stepIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === stepKey),
  );
  const step = steps[stepIndex];
  const highlight = [...hints].reverse().find((h) => h.highlight)?.highlight ?? null;
  const finished = phase === 'done' || phase === 'deferred';
  const percent = ((index + (finished || phase === 'summary' ? 1 : 0)) / Math.max(1, total)) * 100;
  const headerLabel = phase === 'summary' ? t.summary.title : step ? `${step.label}…` : t.common.loading;
  const examItem = problem?.exam;
  const chatKey = problem && step ? `${problem.attempt_id}:${step.key}` : '';
  const chatMessages = chat.key === chatKey ? chat.messages : [];
  const showAssistant = assistant && assistantOn && !examItem && phase === 'solving' && Boolean(step);

  return (
    <div className="flex min-h-dvh flex-col bg-plum-800 px-4 pb-6 pt-[calc(env(safe-area-inset-top)+16px)] text-white">
      {/* top bar: close + hint (reference design) */}
      <div className="flex items-center justify-between">
        <RoundButton label={t.common.close} onClick={onClose}>
          <Icon name="close" size={20} />
        </RoundButton>
        {/* same lesson number and title as on the home path */}
        <p className="min-w-0 flex-1 px-3 text-center text-[11px] font-bold uppercase leading-snug tracking-wider text-white/70 [overflow-wrap:anywhere]">
          {title}
        </p>
        <RoundButton
          label={t.practice.hint}
          onClick={() => void askHint()}
          disabled={phase !== 'solving' || Boolean(result?.correct) || hints.length >= 3 || hintLoading}
          badge={phase === 'solving' ? 3 - hints.length : undefined}
        >
          <Icon name="lightbulb" size={20} />
        </RoundButton>
      </div>

      <div className="mt-1 flex flex-col items-center">
        <div className="relative grid h-16 w-16 place-items-center" aria-hidden="true">
          <span className="absolute inset-0 rounded-full border border-white/10" />
          <span className="absolute inset-2 rounded-full border border-white/15" />
          <Icon name={phase === 'summary' ? 'flag' : 'pencil'} size={28} className="text-amber-300" />
        </div>
        <p className="font-bold tracking-wide">{headerLabel}</p>
        {phase === 'solving' && steps.length > 1 && (
          <div className="mt-2 flex gap-1.5" aria-label={t.practice.stepOf(stepIndex + 1, steps.length)}>
            {steps.map((s, i) => (
              <span
                key={s.key}
                className={`h-1.5 rounded-full transition-all ${i === stepIndex ? 'w-6 bg-accent' : i < stepIndex ? 'w-3 bg-white/70' : 'w-3 bg-white/20'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* main white card */}
      <section className="mt-4 overflow-hidden rounded-4xl bg-white text-ink shadow-[0_6px_0_#231a2f]">
        {/* problems change instantly (no slide/fade between problems) */}
        <div className="p-5">
          {phase === 'loading' && (
            <div className="h-48 animate-pulse rounded-3xl bg-lavender-100" aria-label={t.common.loading} />
          )}

          {phase === 'error' && (
            <div className="text-center">
              <p className="text-sm">{error}</p>
              <PopButton onClick={() => void load(index)} className="mt-3 text-sm">
                {t.home.retry}
              </PopButton>
            </div>
          )}

          {phase === 'summary' && renderSummary(outcomes, restart)}

          {problem && (phase === 'solving' || finished) && (
            <>
              {examItem && (
                <p className="mb-2 text-center">
                  <span className="rounded-full bg-lavender-100 px-2.5 py-1 text-xs font-bold text-plum-700">
                    {t.exam.stage(examItem.stage_number)} · {examItem.stage_title}
                  </span>
                </p>
              )}
              {/* problem number + tools (Buku Saku, Coretan); the tools move to a second
                  line on narrow phones instead of cutting the problem number */}
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-muted">
                <span className="mr-auto whitespace-nowrap">{t.practice.problemOf(index + 1, total)}</span>
                <div className="ml-auto flex flex-wrap justify-end gap-2">
                  {showAssistant && (
                    <button
                      type="button"
                      onClick={() => setAssistantOpen(true)}
                      aria-haspopup="dialog"
                      className={toolPill(false)}
                    >
                      <Icon name="chat" size={15} />
                      {t.assistant.open}
                    </button>
                  )}
                  {pocketBook && (
                    <button
                      type="button"
                      onClick={() => setPocketOpen(true)}
                      aria-haspopup="dialog"
                      className={toolPill(false)}
                    >
                      <Icon name="book-open" size={15} />
                      {t.tools.pocketBook}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setScratchOn((v) => !v)}
                    aria-pressed={scratchOn}
                    className={toolPill(scratchOn)}
                  >
                    <Icon name="pen" size={15} />
                    {t.tools.scratchpad}
                  </button>
                </div>
              </div>
              <ProblemText text={problem.text} keywords={problem.keywords} highlight={highlight} />

              {/* new problem = new attempt_id = a clean board */}
              {scratchOn && <ScratchpadCanvas key={problem.attempt_id} />}

              {showVisual && phase === 'solving' && (
                <div className="mt-4">
                  <VisualView script={problem.visual} interactive />
                </div>
              )}

              <div className="mt-5">
                {phase === 'solving' && step && !result?.correct && (
                  <RmtTag phase={t.rmt.step[step.key].phase} action={t.rmt.step[step.key].action} className="mb-3" />
                )}
                {phase === 'solving' && step && !result?.correct && (
                  <StepPanel
                    key={`${problem.attempt_id}-${step.key}`}
                    step={step}
                    interpretOptions={interpretOptions}
                    thousands={problem.thousands}
                    busy={busy}
                    onSubmit={(answer) => void submit(answer)}
                  />
                )}

                {phase === 'solving' && result?.correct && (
                  <div className="space-y-4">
                    <motion.p
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 15,
                      }}
                      className="rounded-3xl border-2 border-green-200 bg-green-50 px-4 py-3 text-center font-extrabold text-correct"
                    >
                      {result.feedback}
                    </motion.p>
                    <PopButton onClick={nextStep} block>
                      {t.practice.continue} ›
                    </PopButton>
                  </div>
                )}

                {phase === 'done' && final?.review && <ReviewCard review={final.review} feedback={final.feedback} />}

                {phase === 'deferred' && result && (
                  <div className="rounded-3xl border-2 border-accent/30 bg-accent-soft px-4 py-4 text-center">
                    <Icon name="refresh" size={30} className="mx-auto text-accent" />
                    <p className="mt-1 font-extrabold">{t.practice.deferredTitle}</p>
                    <p className="mt-1 text-sm text-ink-muted">{result.feedback}</p>
                  </div>
                )}

                {finished && (
                  <PopButton onClick={nextProblem} block className="mt-5">
                    <span className="inline-flex items-center gap-1.5">
                      {index + 1 < total ? t.practice.nextProblem : t.practice.finish}
                      <Icon name={index + 1 < total ? 'chevron-right' : 'flag'} size={18} />
                    </span>
                  </PopButton>
                )}
              </div>

              {phase === 'solving' && result && !result.correct && (
                <motion.p
                  key={feedbackKey}
                  initial={{ x: -8, opacity: 0 }}
                  animate={{ x: [8, -5, 3, 0], opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="mt-4 rounded-3xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-800"
                  role="status"
                >
                  <Icon name="alert" size={18} className="-mt-0.5 mr-1.5 inline-block text-amber-600" />
                  {result.feedback}
                </motion.p>
              )}
              {notice && (
                <p className="mt-3 rounded-2xl bg-lavender-100 px-4 py-3 text-sm font-bold text-plum-700" role="status">
                  {notice}
                </p>
              )}
              {phase === 'solving' && twinAvailable && (
                <PopButton variant="soft" onClick={() => void openTwin()} block className="mt-4 text-sm text-accent">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="refresh" size={18} />
                    {t.practice.twinOpen}
                  </span>
                </PopButton>
              )}
            </>
          )}
        </div>

        {/* control row (reference design: pills + green toggle) */}
        {phase === 'solving' && (
          <div className="flex items-center gap-2 border-t border-lavender-100 px-5 py-3">
            <button
              type="button"
              onClick={() => setShowVisual((v) => !v)}
              aria-pressed={showVisual}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold ${showVisual ? 'bg-lavender-100 text-ink' : 'text-ink-muted'}`}
            >
              <Icon name="image" size={15} className="-mt-0.5 mr-1 inline-block" />
              {t.practice.picture}
            </button>
            <button
              type="button"
              onClick={() => void askHint()}
              disabled={Boolean(result?.correct) || hints.length >= 3 || hintLoading}
              className="rounded-xl bg-accent px-3 py-1.5 text-xs font-extrabold text-white disabled:opacity-40"
            >
              <Icon name="lightbulb" size={15} className="-mt-0.5 mr-1 inline-block" />
              {t.practice.hint}
            </button>
            <label
              className="ml-auto flex items-center gap-2 text-xs font-bold text-ink-muted"
              title={t.practice.guideNote}
            >
              {t.practice.guide}
              <Toggle checked={guided} onChange={setGuided} label={`${t.practice.guide}. ${t.practice.guideNote}`} />
            </label>
          </div>
        )}
      </section>

      {phase === 'solving' && <HintStack hints={hints} loading={hintLoading} />}

      <div className="mt-auto pt-4">
        <ProgressCard icon={icon} title={title} percent={percent} />
      </div>

      <AnimatePresence>{twin && <TwinSheet twin={twin} onClose={() => setTwin(null)} />}</AnimatePresence>
      <AnimatePresence>{pocketOpen && <PocketBookDrawer onClose={closePocket} />}</AnimatePresence>
      <AnimatePresence>
        {assistantOpen && showAssistant && problem && step && (
          <AssistantSheet
            attemptId={problem.attempt_id}
            step={step}
            messages={chatMessages}
            onMessages={(update) =>
              setChat((c) => ({ key: chatKey, messages: update(c.key === chatKey ? c.messages : []) }))
            }
            onClose={closeAssistant}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
