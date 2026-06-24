import { LLMClient } from '../core/LLMClient';
import { PromptLoader } from '../core/PromptLoader';
import { Blueprint, RenderParams, RenderedQuestion } from './types';

export class QuestionRenderer {
  private promptLoader = new PromptLoader();

  constructor(private llm: LLMClient) {}

  async render(params: RenderParams): Promise<RenderedQuestion[]> {
    const prompt = this.promptLoader.load('question_render', {
      BLUEPRINTS: JSON.stringify(params.blueprints, null, 2),
      KNOWLEDGE_LIST: JSON.stringify(params.knowledgeList, null, 2),
      HIGHLIGHTS: JSON.stringify(params.highlights, null, 2),
    });

    const result = await this.llm.generateJson<{ questions: RenderedQuestion[] }>([
      { role: 'system', content: 'You are an expert exam question author that renders blueprints into polished exam items.' },
      { role: 'user', content: prompt }
    ]);

    return result.questions;
  }
}
