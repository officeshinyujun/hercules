import OpenAI from 'openai';
import { HerculesConfig } from './config';

export class LLMClient {
  private clients: OpenAI[];
  private model: string;
  private currentIndex: number = 0;

  constructor(config: HerculesConfig) {
    if (!config.apiKeys || config.apiKeys.length === 0) {
      throw new Error("At least one API key is required.");
    }
    this.clients = config.apiKeys.map(key => new OpenAI({ apiKey: key.trim() }));
    this.model = config.model || 'gpt-4o';
  }

  private getNextClient(): OpenAI {
    const client = this.clients[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.clients.length;
    return client;
  }

  async generateJson<T>(messages: OpenAI.Chat.ChatCompletionMessageParam[]): Promise<T> {
    const client = this.getNextClient();
    const response = await client.chat.completions.create({
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
