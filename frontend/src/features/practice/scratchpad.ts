// Pure helpers for the Papan Coretan canvas (kept out of the component so they can be tested).

export type PenId = 'ink' | 'orange' | 'green';
export type Tool = PenId | 'eraser';

/**
 * Pen colours. No blue or red: those mean positive/negative numbers (CLAUDE.md §5.4),
 * so a scribble must never look like a signed number.
 */
export const PENS: Record<PenId, string> = { ink: '#2b2238', orange: '#f26b3a', green: '#15803d' };

export interface StrokeStyle {
  color: string;
  width: number;
  /** 'destination-out' erases what is already drawn. */
  composite: 'source-over' | 'destination-out';
}

export function strokeFor(tool: Tool): StrokeStyle {
  return tool === 'eraser'
    ? { color: '#000000', width: 22, composite: 'destination-out' }
    : { color: PENS[tool], width: 3, composite: 'source-over' };
}

/** Pointer position (CSS px) relative to the canvas box. */
export function canvasPoint(clientX: number, clientY: number, rect: { left: number; top: number }) {
  return { x: clientX - rect.left, y: clientY - rect.top };
}
