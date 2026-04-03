export type QuestionType =
  | 'single_choice'
  | 'multiple_choice';

export interface TestOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface EditableQuestion {
  id: string;
  text: string;
  type: QuestionType;
  points: number;
  options?: TestOption[];
  // legacy/optional fields supported by templates
  correctAnswers?: string[];
  explanation?: string;
  isEditing?: boolean;
}

export interface EditableBlock {
  id: string;
  title: string;
  type: QuestionType | 'closed' | 'closed-single' | 'closed-multi';
  questions: EditableQuestion[];
  isCollapsed?: boolean;
  isEditing?: boolean;
}

export interface TestMetadata {
  title: string;
  subject?: string;
  grade?: string;
  language?: string;
  duration?: string;
  totalPoints?: number;
  instructions?: string;
}

export interface TestEvaluationCriterion {
  name: string;
  maxPoints: number;
}

export interface TestEvaluationGrade {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
}

export interface TestEvaluation {
  criteria: TestEvaluationCriterion[];
  gradingScale: TestEvaluationGrade[];
}

export interface EditableTestStructure {
  metadata: TestMetadata;
  blocks: EditableBlock[];
  evaluation: TestEvaluation;
  isDirty?: boolean;
  version?: number;
}

export type TestStructure = EditableTestStructure;

export const QUESTION_TYPE_CONFIG: Record<
  QuestionType,
  { name: string; hasOptions: boolean }
> = {
  single_choice: { name: 'Одиночный выбор', hasOptions: true },
  multiple_choice: { name: 'Множественный выбор', hasOptions: true },
};


