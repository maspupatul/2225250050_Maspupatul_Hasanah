export const MINUS = '−';

export function fmtInt(value: number, thousands = false): string {
  const magnitude = thousands
    ? Math.abs(value).toLocaleString('id-ID')
    : String(Math.abs(value));
  return value < 0 ? MINUS + magnitude : magnitude;
}

export function fmtOperand(value: number, thousands = false): string {
  return value < 0 ? `(${fmtInt(value, thousands)})` : fmtInt(value, thousands);
}

/** Short tick labels, e.g. 5000 -> "5rb". */
export function fmtTick(value: number, thousands = false): string {
  if (thousands && Math.abs(value) >= 1000) return `${fmtInt(value / 1000)}rb`;
  return fmtInt(value);
}

export function fmtWithUnit(value: number, unit = '', thousands = false): string {
  switch (unit) {
    case 'Rp':
      return `${value < 0 ? MINUS : ''}Rp${Math.abs(value).toLocaleString('id-ID')}`;
    case '°C':
      return `${fmtInt(value)} °C`;
    case 'm':
      return `${fmtInt(value)} m`;
    case 'lantai':
      if (value === 0) return 'Lantai dasar';
      return value < 0 ? `Basement ${Math.abs(value)} (${fmtInt(value)})` : `Lantai ${value}`;
    default:
      return fmtInt(value, thousands);
  }
}

// ---------------------------------------------------------------- expressions

export type Operator = '+' | '-' | '*' | '/' | '(' | ')';
export type Token = { kind: 'num'; value: number } | { kind: 'op'; value: Operator };

/** Expression sent to the API, e.g. "(-4) + 6". */
export function serializeTokens(tokens: Token[]): string {
  return tokens
    .map((tok) => (tok.kind === 'num' ? (tok.value < 0 ? `(${tok.value})` : String(tok.value)) : tok.value))
    .join(' ');
}

const OP_DISPLAY: Record<Operator, string> = { '+': '+', '-': MINUS, '*': '×', '/': ':', '(': '(', ')': ')' };

export function displayToken(tok: Token, thousands = false): string {
  return tok.kind === 'num' ? fmtOperand(tok.value, thousands) : OP_DISPLAY[tok.value];
}

export function parseIntInput(raw: string): number | null {
  const cleaned = raw.replace(/−/g, '-').replace(/[.\s]/g, '');
  if (!/^-?\d+$/.test(cleaned)) return null;
  return Number.parseInt(cleaned, 10);
}

// ---------------------------------------------------------------- misc

export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Split "a **b** c" into plain and bold parts. */
export function richParts(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('**') && part.endsWith('**')
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    );
}
