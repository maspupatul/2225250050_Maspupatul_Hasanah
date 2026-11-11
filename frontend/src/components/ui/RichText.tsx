import { richParts } from '../../lib/format';

export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {richParts(text).map((part, i) =>
        part.bold ? (
          <strong key={i} className="font-extrabold text-ink">
            {part.text}
          </strong>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}
