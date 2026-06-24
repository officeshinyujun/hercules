import { LLMClient } from '../core/LLMClient';
import { PromptLoader } from '../core/PromptLoader';
import { KnowledgeItem } from '../extractor/KnowledgeExtractor';

export interface TrapPattern {
  patternType: string;
  commonMistake: string;
  whyWrong: string;
  exampleOption: string;
}

export class TrapPatternAnalyzer {
  private promptLoader = new PromptLoader();

  constructor(private llm: LLMClient) {}

  async analyze(knowledgeList: KnowledgeItem[], examText: string): Promise<Record<string, TrapPattern[]>> {
    const prompt = this.promptLoader.load('trap_pattern_analyze', {
      KNOWLEDGE_LIST: JSON.stringify(knowledgeList, null, 2),
      EXAM_TEXT: examText.substring(0, 8000),
    });

    const result = await this.llm.generateJson<{ trapPatterns: Record<string, TrapPattern[]> }>([
      { role: 'system', content: 'You are an expert exam trap pattern analyzer.' },
      { role: 'user', content: prompt }
    ]);

    return result.trapPatterns;
  }
}
