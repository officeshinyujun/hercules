import { LLMClient } from '../core/LLMClient';
import { PromptLoader } from '../core/PromptLoader';
import { KnowledgeItem } from '../extractor/KnowledgeExtractor';

export interface ConceptHighlight {
  stimulusStyle: string; // 지문이 개념을 어떻게 포장하는지 (예: "가상 인터뷰 형태")
  clueDelivery: string;  // 단서를 어떻게 주는지 (예: "명시적 키워드 제외하고 사례로 제시")
}

export class ConceptHighlightAnalyzer {
  private promptLoader = new PromptLoader();

  constructor(private llm: LLMClient) {}

  async analyze(knowledgeList: KnowledgeItem[], examText: string): Promise<Record<string, ConceptHighlight>> {
    const prompt = this.promptLoader.load('concept_highlight_analyze', {
      KNOWLEDGE_LIST: JSON.stringify(knowledgeList, null, 2),
      EXAM_TEXT: examText.substring(0, 8000),
    });

    const result = await this.llm.generateJson<{ highlights: Record<string, ConceptHighlight> }>([
      { role: 'system', content: 'You are an expert exam stimulus analyzer.' },
      { role: 'user', content: prompt }
    ]);

    return result.highlights;
  }
}
