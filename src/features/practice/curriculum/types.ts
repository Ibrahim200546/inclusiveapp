export type Category = 'comprehension' | 'phonetics' | 'speech' | 'math' | 'sentence';
export type Participation = 'together' | 'independent';
export interface Choice { value: string; label: string }
export type Scene = 'winter' | 'build' | 'seed' | 'birds';
interface StepBase {
  id: string; prompt?: string; audio?: string; questionAudio?: string; teacherModel?: boolean;
  stimulus?: string; supportText?: string; display?: string | null; reveal?: string;
  level?: string; speaker?: string; repetitions?: number;
  words?: string[]; stressedWordIndex?: number; syllables?: string[]; stressedSyllableIndex?: number; groups?: string[];
}
export type Step = StepBase & (
  { kind: 'choice'; options: Choice[]; answer: string } |
  { kind: 'teacher' } |
  { kind: 'order'; initialOrder: string[]; expectedOrder: string[]; orderItems?: (Choice & { scene?: Scene })[] }
);
export interface Lesson {
  id: string; title: string; grade: number; table: number; strand: string; objectiveCodes: string[];
  category: Category; steps: Step[]; pairVariant?: boolean; approvedBy?: string;
}
export interface StepResult {
  step: string; attempts: number; assessment: 'teacher' | 'choice'; supportUsed: boolean; modelledByTeacher: boolean;
}
export interface SessionState {
  index: number; total: number; complete: boolean; solved: boolean; heard: boolean; attempts: number;
  supportUsed: boolean; order: string[]; records: StepResult[];
}
export interface SavedProgress {
  grade: number; table: number; strand: string; objectiveCodes: string[]; lessonId: string;
  sequence?: string[]; completed: boolean; everCompleted: boolean; results: StepResult[];
  index: number; solved: boolean; attempts: number; order: string[]; supportUsed: boolean;
  participation: Participation; assessment: 'mixed-or-teacher' | 'choice'; updatedAt: string;
}
