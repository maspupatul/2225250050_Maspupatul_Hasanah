// Pastel badge + icon colour for each kind of statistic, the same on every screen.
// Never blue/red: those mean positive/negative numbers (CLAUDE.md §5.4).
export const STAT_TONE = {
  correct: 'bg-emerald-100 text-correct',
  selfFound: 'bg-amber-100 text-amber-600',
  hints: 'bg-violet-100 text-hint',
  deferred: 'bg-accent-soft text-accent',
  streak: 'bg-orange-100 text-orange-600',
  days: 'bg-lavender-100 text-plum-700',
} as const;
