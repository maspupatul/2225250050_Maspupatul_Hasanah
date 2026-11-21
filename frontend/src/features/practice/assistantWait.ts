/** When each waiting message of Tanya Asisten appears (ms after sending). Same length as
 * t.assistant.thinkingStages. The wait has no time limit for the student: only the text changes. */
export const THINKING_STAGE_MS = [0, 2500, 8000] as const;

/** Pure: index of the waiting message to show after `elapsedMs`. */
export function thinkingStage(elapsedMs: number): number {
  let stage = 0;
  THINKING_STAGE_MS.forEach((start, i) => {
    if (elapsedMs >= start) stage = i;
  });
  return stage;
}
