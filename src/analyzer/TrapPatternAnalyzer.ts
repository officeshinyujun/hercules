import { LLMClient } from '../core/LLMClient';
import { KnowledgeItem } from '../extractor/KnowledgeExtractor';

export interface TrapPattern {
  patternType: string;
  commonMistake: string;
  whyWrong: string;
  exampleOption: string;
}

export class TrapPatternAnalyzer {
  constructor(private llm: LLMClient) {}

  async analyze(knowledgeList: KnowledgeItem[], examText: string): Promise<Record<string, TrapPattern[]>> {
    const prompt = `
다음 기출문제 텍스트를 분석하여, 제시된 지식(Knowledge) 요소들이 출제될 때 주로 어떤 "함정 패턴(Trap Pattern)"으로 오답 선지가 구성되는지 분석하세요.

결과 형식(JSON):
{
  "trapPatterns": {
    "k1": [
      {
        "patternType": "유사 개념 혼동",
        "commonMistake": "학생들이 A와 B를 헷갈려 함",
        "whyWrong": "A는 ~지만 B는 ~기 때문",
        "exampleOption": "오답 선지 예시"
      }
    ]
  }
}

교과서 지식(Knowledge) 리스트:
${JSON.stringify(knowledgeList, null, 2)}

기출문제 텍스트:
${examText.substring(0, 8000)} // LLM 제한을 위해 일부분만
`;

    const result = await this.llm.generateJson<{ trapPatterns: Record<string, TrapPattern[]> }>([
      { role: 'system', content: 'You are an expert exam trap pattern analyzer.' },
      { role: 'user', content: prompt }
    ]);

    return result.trapPatterns;
  }
}
