import { LLMClient } from '../core/LLMClient';
import { KnowledgeItem } from '../extractor/KnowledgeExtractor';
import { TrapPattern } from '../analyzer/TrapPatternAnalyzer';
import { ConceptHighlight } from '../analyzer/ConceptHighlightAnalyzer';

export interface GenerationParams {
  knowledgeList: KnowledgeItem[];
  trapPatterns: Record<string, TrapPattern[]>;
  highlights: Record<string, ConceptHighlight>;
  applyTraps: string[]; // 특정 함정 패턴명 강제 적용
  count: number;
}

export class BlueprintGenerator {
  constructor(private llm: LLMClient) {}

  async generate(params: GenerationParams): Promise<any> {
    const prompt = `
당신은 시험 문항 출제 전문위원입니다.
제시된 교과서 지식(Knowledge), 기출 지문 스타일(Highlight), 그리고 기출 함정 패턴(Trap)을 완벽히 융합하여 실전 기출문제와 100% 동일한 논리와 형태의 문항을 ${params.count}개 생성하세요.

특히 다음 함정 패턴들을 오답 선지에 강제 적용하세요: ${params.applyTraps.join(', ')}

결과 형식(JSON):
{
  "questions": [
    {
      "targetKnowledgeId": "...",
      "questionStem": "다음 가상 인터뷰를 읽고...",
      "stimulus": "지문 내용 (Highlight 스타일 적용)",
      "options": ["선지1", "선지2", "선지3", "선지4", "선지5"],
      "correctAnswer": 1,
      "explanation": {
        "correct": "정답인 이유",
        "traps": ["오답 선지에 어떤 Trap Pattern이 적용되었는지 설명"]
      }
    }
  ]
}

교과서 지식:
${JSON.stringify(params.knowledgeList, null, 2)}

기출 지문 단서 구조 (Highlight):
${JSON.stringify(params.highlights, null, 2)}

기출 함정 패턴 (Trap):
${JSON.stringify(params.trapPatterns, null, 2)}
`;

    const result = await this.llm.generateJson<{ questions: any[] }>([
      { role: 'system', content: 'You are an expert exam question author that mimics real exam structures flawlessly.' },
      { role: 'user', content: prompt }
    ]);

    return result.questions;
  }
}
