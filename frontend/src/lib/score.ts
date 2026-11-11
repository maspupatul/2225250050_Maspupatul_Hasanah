// Scoring from mastery weights (docs/DESAIN-PEDAGOGIS.md §6.4). Pure functions.

export interface Outcome {
  /** 1.0 without hints … 0.2 after a twin, 0 when deferred. */
  weight: number;
  selfFound: boolean;
  deferred: boolean;
  /** Ujian Akhir stage key, e.g. "dasar". */
  stage?: string;
}

export interface StageScore {
  key: string;
  title: string;
  score: number;
  count: number;
}

export function averageWeight(outcomes: Outcome[]): number {
  if (outcomes.length === 0) return 0;
  return outcomes.reduce((sum, o) => sum + o.weight, 0) / outcomes.length;
}

/** Exam score 0–100. */
export function examScore(outcomes: Outcome[]): number {
  return Math.round(averageWeight(outcomes) * 100);
}

/** Score of every stage, in the stage order given (stages without problems score 0). */
export function stageScores(outcomes: Outcome[], stages: { key: string; title: string }[]): StageScore[] {
  return stages.map(({ key, title }) => {
    const own = outcomes.filter((o) => o.stage === key);
    return { key, title, score: examScore(own), count: own.length };
  });
}
