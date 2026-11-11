// Split math lines for aligned display (pure, tested in mathLines.test.ts).

const SEPARATORS = [' = ', ' → ', ' < ', ' > '];

export interface MathLine {
  left: string;
  sep: string;
  right: string;
}

/** "3 × (−2) = −6" → { left: "3 × (−2)", sep: "=", right: "−6" }. A line starting with "= " continues the line above. */
export function splitMathLine(line: string): MathLine {
  const trimmed = line.trim();
  for (const sep of SEPARATORS) {
    const head = sep.trimStart();
    if (trimmed.startsWith(head)) return { left: '', sep: sep.trim(), right: trimmed.slice(head.length).trim() };
  }
  let best = -1;
  let found = '';
  for (const sep of SEPARATORS) {
    const at = trimmed.indexOf(sep);
    if (at >= 0 && (best < 0 || at < best)) {
      best = at;
      found = sep;
    }
  }
  if (best < 0) return { left: trimmed, sep: '', right: '' };
  return { left: trimmed.slice(0, best), sep: found.trim(), right: trimmed.slice(best + found.length) };
}

/** Sign of a lone integer such as "−6", "(−6)" or "6" (for colour signaling); null for anything else. */
export function signOf(text: string): 'positive' | 'negative' | 'zero' | null {
  const match = /^\(?([−-]?)(\d[\d.]*)\)?$/.exec(text.trim());
  if (!match) return null;
  if (/^0+$/.test(match[2].replace(/\./g, ''))) return 'zero';
  return match[1] ? 'negative' : 'positive';
}
