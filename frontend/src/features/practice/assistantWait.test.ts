import { describe, expect, it } from 'vitest';
import { t } from '../../i18n/id';
import { THINKING_STAGE_MS, thinkingStage } from './assistantWait';

describe('thinkingStage', () => {
  it('starts with reading the problem, then moves on', () => {
    expect(thinkingStage(0)).toBe(0);
    expect(thinkingStage(2499)).toBe(0);
    expect(thinkingStage(2500)).toBe(1);
    expect(thinkingStage(7999)).toBe(1);
    expect(thinkingStage(60_000)).toBe(2);
  });

  it('has a message for every stage', () => {
    expect(t.assistant.thinkingStages).toHaveLength(THINKING_STAGE_MS.length);
  });
});
