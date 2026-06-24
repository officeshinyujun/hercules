export type Difficulty = 'LOW' | 'MIDDLE' | 'HIGH' | 'SUPER';
export type ItemType = 'single_selection' | 'combination_judgment' | 'blank_workflow' | 'direct_statement';
export type Template = 'TPL_COMPARATIVE_MATRIX' | 'TPL_FORMAL_DOCUMENT' | 'TPL_CONVERSATIONAL_FLOW' | 'TPL_CASE_DIAGNOSTIC_FRAME' | 'TPL_SEQUENTIAL_WORKFLOW' | 'TPL_INSTRUCTIONAL_SCENE' | 'TPL_DIGITAL_FORUM_INTERFACE' | 'TPL_QUANTITATIVE_CHART' | 'TPL_PROMOTIONAL_CANVAS';

export interface Blueprint {
  metadata: {
    targetKnowledgeId: string;
    itemType: ItemType;
    difficulty: Difficulty;
    template?: Template;
  };
  itemStructure: {
    judgmentAxis: string;
    optionsPlan: Array<{
      isCorrect: boolean;
      trapType?: string;
      logic: string;
    }>;
    combinationPlan?: {
      views: Array<{ key: string; truth: boolean; claim: string }>;
      correctCombination: string[];
      distractorCombinations: string[][];
    };
  };
  stimulusPlan: string;
  stemPlan: string;
}

export interface BlueprintGenerationParams {
  knowledgeList: any[];
  trapPatterns: Record<string, any[]>;
  highlights: Record<string, any>;
  applyTraps: string[];
  count: number;
  difficulty: Difficulty;
  itemTypes?: ItemType[];
}

export interface RenderParams {
  blueprints: Blueprint[];
  knowledgeList: any[];
  highlights: Record<string, any>;
}

export interface RenderedQuestion {
  targetKnowledgeId: string;
  itemType: ItemType;
  difficulty: Difficulty;
  template?: Template;
  questionStem: string;
  stimulus: string;
  options: string[];
  correctAnswer: number;
  explanation: {
    correct: string;
    traps: string[];
  };
  combinationBlock?: {
    title: string;
    items: Array<{ key: string; text: string }>;
  };
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  score: number;
}

export interface ScoredQuestion {
  question: RenderedQuestion;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  timestamp: number;
  setId: string;
}
