import OpenAI from 'openai';
import { HerculesConfig } from './config';

export class LLMClient {
  private openai: OpenAI;
  private model: string;

  constructor(config: HerculesConfig) {
    this.openai = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model || 'gpt-4o';
  }

  async generateJson<T>(messages: OpenAI.Chat.ChatCompletionMessageParam[]): Promise<T> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No content returned from LLM');
    
    return JSON.parse(content) as T;
  }
}
