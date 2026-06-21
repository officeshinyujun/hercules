#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { Hercules } from '../src/index';

const program = new Command();

program
  .name('hercules')
  .description('Hercules CLI to generate exam questions based on textbook and past exams')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate mimic questions based on textbook and exams')
  .requiredOption('-t, --textbook <path>', 'Path to textbook text file')
  .requiredOption('-e, --exams <paths...>', 'Paths to past exam PDF files')
  .option('-c, --count <number>', 'Number of questions to generate', '1')
  .option('--traps <traps...>', 'Specific trap patterns to apply', [])
  .option('-o, --out <path>', 'Path to save output JSON file', 'result.json')
  .action(async (options) => {
    try {
      const apiKeyEnv = process.env.OPENAI_API_KEY;
      if (!apiKeyEnv) {
        console.error('Error: OPENAI_API_KEY environment variable is not set.');
        process.exit(1);
      }
      
      const apiKeys = apiKeyEnv.split(',').map(k => k.trim()).filter(k => k.length > 0);

      console.log('Initialize Hercules...');
      const hercules = new Hercules({ apiKeys, model: 'gpt-4o' });

      console.log(`Reading textbook from: ${options.textbook}`);
      const textbookText = fs.readFileSync(path.resolve(options.textbook), 'utf-8');

      console.log('Extracting knowledge...');
      const knowledge = await hercules.extractKnowledge(textbookText);
      console.log(`Extracted ${knowledge.length} knowledge propositions.`);

      console.log('Learning patterns from exams (this may take a while if PDFs are not cached)...');
      const examPaths = options.exams.map((p: string) => path.resolve(p));
      const patterns = await hercules.learnFromExams({
        knowledge,
        pastExams: examPaths
      });

      console.log('Generating questions...');
      const questions = await hercules.generateQuestions({
        knowledge,
        patterns,
        applyTraps: options.traps,
        count: parseInt(options.count, 10)
      });

      const outPath = path.resolve(options.out);
      fs.writeFileSync(outPath, JSON.stringify(questions, null, 2), 'utf-8');
      
      console.log(`✅ Successfully generated questions and saved to ${outPath}`);
    } catch (error) {
      console.error('Generation failed:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
