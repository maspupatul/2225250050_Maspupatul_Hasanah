import { RichText } from './RichText';

/** Text split into short paragraphs at blank lines ("\n\n"), with relaxed line height. */
export function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {text
        .split(/\n\s*\n/)
        .filter((part) => part.trim())
        .map((part, i) => (
          <p key={i} className="text-[17px] leading-8 text-ink/90">
            <RichText text={part.trim()} />
          </p>
        ))}
    </div>
  );
}
