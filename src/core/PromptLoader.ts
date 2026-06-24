import fs from 'fs';
import path from 'path';

function findPromptsDir(): string {
  const candidates = [
    path.resolve(__dirname, '../../../prompts'),
    path.resolve(process.cwd(), 'prompts'),
    path.resolve(__dirname, '../../prompts'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0];
}

const PROMPTS_DIR = findPromptsDir();

export class PromptLoader {
  private cache: Map<string, string> = new Map();

  load(templateName: string, variables: Record<string, string>): string {
    let template = this.cache.get(templateName);
    if (!template) {
      const filePath = path.join(PROMPTS_DIR, `${templateName}.txt`);
      template = fs.readFileSync(filePath, 'utf-8');
      this.cache.set(templateName, template);
    }

    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }
}
