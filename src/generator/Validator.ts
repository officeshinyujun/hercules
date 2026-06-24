import { LLMClient } from '../core/LLMClient';
import { RenderedQuestion, ValidationResult } from './types';

export class Validator {
  constructor(private llm: LLMClient) {}

  async validate(question: RenderedQuestion): Promise<ValidationResult> {
    const issues: string[] = [];

    // — Structure checks —
    if (question.itemType === 'single_selection') {
      if (!question.options || question.options.length !== 5) {
        issues.push(`단일 선택형: 5개 선지 필요 (${question.options?.length}개)`);
      }
      if (question.correctAnswer < 1 || question.correctAnswer > 5) {
        issues.push(`정답 번호 범위 오류: ${question.correctAnswer}`);
      }
    }

    if (question.itemType === 'combination_judgment') {
      if (!question.combinationBlock?.items || question.combinationBlock.items.length < 2) {
        issues.push('조합형: 보기(ㄱ~ㄹ)가 2개 이상 필요');
      }
    }

    if (!question.questionStem || question.questionStem.trim().length < 5) {
      issues.push('발문이 너무 짧거나 없음');
    }

    if (!question.explanation?.correct || question.explanation.correct.trim().length < 5) {
      issues.push('정답 해설이 없거나 너무 짧음');
    }

    // Return early if structure fails badly
    if (issues.length > 3) {
      return { valid: false, issues, score: 0 };
    }

    // — LLM-as-Judge semantic validation —
    try {
      const semanticResult = await this.llm.generateJson<{ valid: boolean; issues: string[]; score: number }>([
        {
          role: 'system',
          content: 'You are a strict exam question quality inspector. Validate the question and return a JSON object with "valid" (boolean), "issues" (string array of problems found), and "score" (0-100). Be critical — reject ambiguous wording, implausible distractors, and logic errors.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Validate this exam question for quality and correctness.',
            question: {
              itemType: question.itemType,
              stem: question.questionStem,
              stimulus: question.stimulus,
              options: question.options,
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              combinationBlock: question.combinationBlock,
            }
          }, null, 2)
        }
      ]);
      return {
        valid: semanticResult.valid && issues.length === 0,
        issues: [...issues, ...(semanticResult.issues || [])],
        score: semanticResult.score
      };
    } catch {
      // If LLM judge fails, fall back to structural check only
      return { valid: issues.length === 0, issues, score: issues.length === 0 ? 80 : 30 };
    }
  }
}
