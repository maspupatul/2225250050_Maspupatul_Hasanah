// Shapes returned by the Z-Math API (docs/API-SPEC.md).

export type VisualKind = 'number_line' | 'thermometer' | 'sea_depth' | 'elevator';

export interface Mark {
  value: number;
  label?: string;
  tone?: 'start' | 'end' | 'given';
}

export interface Arrow {
  at: number;
  anchor: 'from' | 'to';
  dir: 'up' | 'down';
  /** null = direction only (hint mode): the landing position is hidden */
  value: number | null;
  label?: string;
}

export interface VisualScript {
  kind: VisualKind;
  unit?: string;
  range: [number, number];
  step?: number;
  thousands?: boolean;
  marks?: Mark[];
  arrows?: Arrow[];
  pointer?: number | null;
  showEnd?: boolean;
  mode: 'explore' | 'guided' | 'hint' | 'review';
}

export interface Keyword {
  phrase: string;
  sign: '+' | '-' | '0' | null;
  explanation: string;
  start: number;
  end: number;
}

export type StepKey = 'known' | 'asked' | 'model' | 'result' | 'interpret';

export interface StepDef {
  key: StepKey;
  label: string;
  prompt: string;
  input: 'number_chips' | 'choice' | 'expression_builder' | 'integer';
  options?: (number | string)[] | null;
  chips?: number[];
  operators?: string[];
  unit?: string;
}

export interface Problem {
  attempt_id: string;
  template_id: string;
  kind: 'story' | 'numeric' | 'represent';
  schema_type: string;
  context: string;
  level: number;
  text: string;
  question: string | null;
  keywords: Keyword[];
  guided: boolean;
  steps: StepDef[];
  current_step: StepKey;
  visual: VisualScript;
  hints_per_step: number;
  /** Static hints 1–3 per step (no answer inside), used when the device is offline. */
  offline_hints?: Partial<Record<StepKey, Hint[]>>;
  unit: string;
  thousands: boolean;
  /** Present only for Ujian Akhir problems. */
  exam?: ExamItem & { total: number };
}

export interface TraceStep {
  expr: string;
  result: number;
  result_text: string;
  explain: string;
}

export interface Review {
  model: string | null;
  trace: TraceStep[];
  answer: number;
  answer_text: string;
  unit: string;
  interpretation: string | null;
  visual: VisualScript;
  reflection: string;
}

export interface StepResult {
  correct: boolean;
  step: StepKey;
  feedback: string;
  attempt_status: 'open' | 'correct' | 'deferred';
  misconception?: string | null;
  next_step?: StepKey;
  interpret_options?: string[];
  next_hint_level?: number | null;
  hint_available?: boolean;
  twin_available?: boolean;
  mastery_weight?: number;
  max_hint_level?: number;
  twin_shown?: boolean;
  review?: Review;
}

export interface Hint {
  step: StepKey;
  hint_level: 1 | 2 | 3;
  kind: 'meaning' | 'visual' | 'strategy';
  text: string;
  visual: VisualScript | null;
  template: string | null;
  highlight: string | null;
  hints_remaining: number;
  /** Smart Hint: friendlier Gemini text, already checked on the server to contain no answer */
  ai_text?: string | null;
  source?: 'ai' | 'static';
}

export interface TwinStep {
  key: StepKey;
  label: string;
  content: string;
  why: string;
}

export interface Twin {
  text: string;
  steps: TwinStep[];
  visual: VisualScript | null;
}

export interface LessonSummary {
  id: string;
  module_id: string;
  /** Order inside the module. */
  order: number;
  /** Global lesson number on the home path ("Pelajaran 5"). */
  number: number;
  title: string;
  subtitle: string;
  icon: string;
  segment_count: number;
  practice_count: number;
}

export interface ModuleInfo {
  id: string;
  title: string;
  order: number;
  lessons: LessonSummary[];
}

export interface WorkedStep {
  text: string;
  why: string;
}

/** Optional layout helpers for readable lesson screens. */
export interface SegmentLayout {
  /** Math written line by line, aligned on "=", "→", "<" or ">" (e.g. a pattern table). */
  lines?: string[];
  /** Key idea shown in a highlight box. */
  callout?: string;
}

export type Segment =
  | ({ type: 'hook' | 'concept'; title?: string; text: string; visual?: VisualScript } & SegmentLayout)
  | ({
      type: 'explore';
      title?: string;
      text: string;
      visual: VisualScript;
      target: number;
      success: string;
    } & SegmentLayout)
  | {
      type: 'worked_example';
      title?: string;
      problem: string;
      steps: WorkedStep[];
      self_explain?: string;
      visual?: VisualScript;
    }
  | { type: 'summary'; title?: string; points: string[] };

export interface Lesson extends LessonSummary {
  segments: Segment[];
}

// ---------------------------------------------------------------- Ujian Akhir

export interface ExamStage {
  key: string;
  title: string;
  level: number;
  count: number;
}

export interface ExamInfo {
  id: string;
  title: string;
  total: number;
  stages: ExamStage[];
}

export interface ExamItem {
  index: number;
  stage: string;
  stage_title: string;
  stage_number: number;
  level: number;
}

export interface ExamStart extends ExamInfo {
  seed: number;
  items: ExamItem[];
}

// ---------------------------------------------------------------- accounts & teacher dashboard

export type Role = 'siswa' | 'guru';

export interface AccountUser {
  id: number;
  name: string;
  username: string;
  role: Role;
  /** Name of the joined class, e.g. "VII-A" (students only). */
  kelas: string | null;
  /** 6-character join code of that class, e.g. "ZM7A92". */
  class_code: string | null;
}

/** A class made by a teacher (Kelola Kelas). */
export interface SchoolClass {
  id: number;
  class_name: string;
  class_code: string;
  student_count: number;
  assistant_enabled: boolean;
  created_at: string;
}

/** Tanya Asisten: one chat message, kept only in memory on the device. */
export interface ChatMessage {
  role: 'siswa' | 'asisten';
  text: string;
}

export interface AssistantReply {
  reply: string;
  source: 'ai' | 'static';
  step: StepKey;
  support_level: 1 | 2 | 3;
  turns_left: number;
}

export type StudentStatus = 'tuntas' | 'berproses' | 'perlu_bimbingan';

export interface ModuleProgress {
  id: string;
  title: string;
  percent: number;
  mastery: number | null;
}

export interface StudentSummary {
  id: number;
  name: string;
  username: string;
  kelas: string | null;
  class_code: string | null;
  modules: ModuleProgress[];
  percent_done: number;
  avg_mastery: number | null;
  exam_best: number | null;
  exam_attempts: number;
  correct: number;
  self_found: number;
  hints_used: number;
  deferred: number;
  streak: number;
  last_active: string | null;
  status: StudentStatus;
}

export interface WeakLesson {
  id: string;
  number: number;
  title: string;
  status: 'done' | 'in_progress' | 'not_started';
  mastery: number;
}

export interface StudentDetail extends StudentSummary {
  exam_history: { score: number; date: string; stages?: Record<string, number> }[];
  weak_lessons: WeakLesson[];
  review_waiting: number;
  active_days: number;
}

export interface ClassSummary {
  /** Selected class (null = all of the teacher's classes). */
  kelas: string | null;
  class_code: string | null;
  class_count: number;
  kkm: number;
  modules: { id: string; title: string }[];
  class: {
    total_students: number;
    avg_exam_best: number | null;
    completion_rate: number;
    students_tuntas: number;
    students_need_help: number;
  };
  students: StudentSummary[];
}
