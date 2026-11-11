/** Dark card with an orange progress bar (bottom card in the reference design). */
export function ProgressCard({ icon, title, percent }: { icon: string; title: string; percent: number }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="rounded-3xl bg-plum-700/70 px-5 py-4 text-white">
      <div className="flex items-center justify-between text-sm font-bold">
        <span className="flex items-center gap-2">
          <span aria-hidden="true">{icon}</span>
          {title}
        </span>
        <span className="text-white/70">{value}%</span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-plum-900/70"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-accent transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
