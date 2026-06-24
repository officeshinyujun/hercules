import { LLMClient } from '../core/LLMClient';
import { PromptLoader } from '../core/PromptLoader';
import { KnowledgeItem } from '../extractor/KnowledgeExtractor';
import { TrapPattern } from '../analyzer/TrapPatternAnalyzer';
import { ConceptHighlight } from '../analyzer/ConceptHighlightAnalyzer';
import { Blueprint, BlueprintGenerationParams, Difficulty, ItemType } from './types';

const DIFFICULTY_INSTRUCTIONS: Record<Difficulty, string> = {
  LOW: '단순 사실 확인형. 개념과 정보를 1:1로 매칭하는 수준의 문항을 설계하세요. 용어 정의, 기본 사실, 명시적 정보를 직접 묻는 수준입니다.',
  MIDDLE: '원리 적용형. 기본적인 인과관계와 개념 적용을 요구하는 문항을 설계하세요. 개념을 이해하고 이를 새로운 상황에 적용할 수 있어야 합니다.',
  HIGH: '복합 추론형. 다중 조건을 중첩하고 유사 개념을 변별해야 하는 문항을 설계하세요. 두 가지 이상의 개념을 동시에 적용하거나, 자료를 해석하여 추론해야 합니다.',
  SUPER: '킬러형. 예외 조항, 추상적 원리, 고차원적 사고를 요구하는 고난도 문항을 설계하세요. 정답이 즉시 드러나지 않으며, 여러 단계의 추론을 거쳐야 합니다.',
};

export class BlueprintGenerator {
  private promptLoader = new PromptLoader();

  constructor(private llm: LLMClient) {}

  async generate(params: BlueprintGenerationParams): Promise<Blueprint[]> {
    const trapInstructions = params.applyTraps.length > 0
      ? `특히 다음 함정 패턴들을 오답 선지에 강제 적용하세요: ${params.applyTraps.join(', ')}`
      : '';

    const typeInstructions = params.itemTypes && params.itemTypes.length > 0
      ? `다음 문항 유형만 사용하세요: ${params.itemTypes.join(', ')}`
      : '';

    const prompt = this.promptLoader.load('blueprint_generate', {
      QUESTION_COUNT: String(params.count),
      TRAP_INSTRUCTIONS: [trapInstructions, typeInstructions].filter(Boolean).join('\n'),
      DIFFICULTY: params.difficulty,
      DIFFICULTY_INSTRUCTIONS: DIFFICULTY_INSTRUCTIONS[params.difficulty],
      KNOWLEDGE_LIST: JSON.stringify(params.knowledgeList, null, 2),
      HIGHLIGHTS: JSON.stringify(params.highlights, null, 2),
      TRAP_PATTERNS: JSON.stringify(params.trapPatterns, null, 2),
    });

    const result = await this.llm.generateJson<{ blueprints: Blueprint[] }>([
      { role: 'system', content: 'You are an expert exam question designer who creates logical blueprints for exam items.' },
      { role: 'user', content: prompt }
    ]);

    return result.blueprints;
  }
}
