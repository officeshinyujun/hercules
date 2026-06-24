import { LLMClient } from '../core/LLMClient';
import { PromptLoader } from '../core/PromptLoader';

export interface KnowledgeItem {
  id: string;
  name: string;
  proposition: string; // 출제에 바로 쓸 수 있는 명제 (e.g., "A는 B이다")
  comparisonPoint?: string; // 타 개념과의 비교 포인트
  details: string[];
}

export class KnowledgeExtractor {
  private promptLoader = new PromptLoader();

  constructor(private llm: LLMClient) {}

  async extract(textbookText: string): Promise<KnowledgeItem[]> {
    const prompt = this.promptLoader.load('knowledge_extract', {
      TEXTBOOK_TEXT: textbookText,
    });

    const result = await this.llm.generateJson<{ knowledgeList: KnowledgeItem[] }>([
      { role: 'system', content: 'You are an expert educational knowledge extractor.' },
      { role: 'user', content: prompt }
    ]);

    return result.knowledgeList;
  }
}
