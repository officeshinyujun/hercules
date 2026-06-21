import { LLMClient } from '../core/LLMClient';
import { KnowledgeItem } from '../extractor/KnowledgeExtractor';

export interface ConceptHighlight {
  stimulusStyle: string; // 지문이 개념을 어떻게 포장하는지 (예: "가상 인터뷰 형태")
  clueDelivery: string;  // 단서를 어떻게 주는지 (예: "명시적 키워드 제외하고 사례로 제시")
}

export class ConceptHighlightAnalyzer {
  constructor(private llm: LLMClient) {}

  async analyze(knowledgeList: KnowledgeItem[], examText: string): Promise<Record<string, ConceptHighlight>> {
    const prompt = `
다음 기출문제 텍스트를 분석하여, 제시된 지식(Knowledge) 요소들이 지문(Stimulus) 내에서 어떤 스타일과 단서(Clue) 구조로 출제되는지 분석하세요. (Concept Highlight V2)

결과 형식(JSON):
{
  "highlights": {
    "k1": {
      "stimulusStyle": "가상 인터뷰, 대화문 형태",
      "clueDelivery": "개념의 직접적 용어 사용을 피하고 상황적 은유로 단서를 제공"
    }
  }
}

교과서 지식(Knowledge) 리스트:
${JSON.stringify(knowledgeList, null, 2)}

기출문제 텍스트:
${examText.substring(0, 8000)}
`;

    const result = await this.llm.generateJson<{ highlights: Record<string, ConceptHighlight> }>([
      { role: 'system', content: 'You are an expert exam stimulus analyzer.' },
      { role: 'user', content: prompt }
    ]);

    return result.highlights;
  }
}
