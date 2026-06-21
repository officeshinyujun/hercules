import { LLMClient } from '../core/LLMClient';

export interface KnowledgeItem {
  id: string;
  name: string;
  proposition: string; // 출제에 바로 쓸 수 있는 명제 (e.g., "A는 B이다")
  comparisonPoint?: string; // 타 개념과의 비교 포인트
  details: string[];
}

export class KnowledgeExtractor {
  constructor(private llm: LLMClient) {}

  async extract(textbookText: string): Promise<KnowledgeItem[]> {
    const prompt = `
다음 교과서 텍스트를 분석하여 출제 가능한 핵심 지식(Knowledge)들을 추출하세요.
단순히 개념 이름뿐만 아니라, 문제의 지문이나 선지로 바로 활용될 수 있는 구체적 명제(Proposition)와 타 개념과의 비교/대조 포인트(Comparison)를 포함해야 합니다.

결과 형식(JSON):
{
  "knowledgeList": [
    {
      "id": "k1",
      "name": "개념명",
      "proposition": "개념에 대한 핵심 명제 한 문장",
      "comparisonPoint": "A와 B의 차이점 등 (없으면 빈 문자열)",
      "details": ["상세 특징 1", "상세 특징 2"]
    }
  ]
}

교과서 텍스트:
${textbookText}
`;

    const result = await this.llm.generateJson<{ knowledgeList: KnowledgeItem[] }>([
      { role: 'system', content: 'You are an expert educational knowledge extractor.' },
      { role: 'user', content: prompt }
    ]);

    return result.knowledgeList;
  }
}
