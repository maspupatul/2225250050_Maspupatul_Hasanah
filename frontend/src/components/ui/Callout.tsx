import { RichText } from './RichText';

/** Highlight box for the key idea of a screen (soft amber, lamp icon). */
export function Callout({ text, label }: { text: string; label: string }) {
  return (
    <aside className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-100 text-lg" aria-hidden="true">
        💡
      </span>
      <p className="text-[15px] leading-7 text-ink">
        <span className="block text-[11px] font-extrabold uppercase tracking-wider text-amber-700">{label}</span>
        <RichText text={text} />
      </p>
    </aside>
  );
}
