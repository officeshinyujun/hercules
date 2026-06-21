import { HerculesConfig } from './config';
import { LLMClient } from './LLMClient';
import { KnowledgeExtractor, KnowledgeItem } from '../extractor/KnowledgeExtractor';
import { TrapPatternAnalyzer, TrapPattern } from '../analyzer/TrapPatternAnalyzer';
import { ConceptHighlightAnalyzer, ConceptHighlight } from '../analyzer/ConceptHighlightAnalyzer';
import { BlueprintGenerator } from '../generator/BlueprintGenerator';
import { PdfParser } from '../analyzer/PdfParser';

export class Hercules {
  public llmClient: LLMClient;
  public knowledgeExtractor: KnowledgeExtractor;
  public trapAnalyzer: TrapPatternAnalyzer;
  public highlightAnalyzer: ConceptHighlightAnalyzer;
  public blueprintGenerator: BlueprintGenerator;
  public pdfParser: PdfParser;

  constructor(config: HerculesConfig) {
    this.llmClient = new LLMClient(config);
    this.knowledgeExtractor = new KnowledgeExtractor(this.llmClient);
    this.trapAnalyzer = new TrapPatternAnalyzer(this.llmClient);
    this.highlightAnalyzer = new ConceptHighlightAnalyzer(this.llmClient);
    this.blueprintGenerator = new BlueprintGenerator(this.llmClient);
    this.pdfParser = new PdfParser();
  }

  async extractKnowledge(textbookText: string): Promise<KnowledgeItem[]> {
    return this.knowledgeExtractor.extract(textbookText);
  }

  async learnFromExams(params: { knowledge: KnowledgeItem[], pastExams: string[] }) {
    let combinedExamText = '';
    for (const examPath of params.pastExams) {
      if (examPath.endsWith('.pdf')) {
        const text = await this.pdfParser.parseToText(examPath);
        combinedExamText += `\n--- Exam: ${examPath} ---\n${text}`;
      } else {
        combinedExamText += `\n${examPath}`;
      }
    }

    const [trapPatterns, highlights] = await Promise.all([
      this.trapAnalyzer.analyze(params.knowledge, combinedExamText),
      this.highlightAnalyzer.analyze(params.knowledge, combinedExamText)
    ]);

    return { trapPatterns, highlights };
  }

  async generateQuestions(params: {
    knowledge: KnowledgeItem[];
    patterns: { trapPatterns: Record<string, TrapPattern[]>, highlights: Record<string, ConceptHighlight> };
    applyTraps?: string[];
    count?: number;
  }) {
    return this.blueprintGenerator.generate({
      knowledgeList: params.knowledge,
      trapPatterns: params.patterns.trapPatterns,
      highlights: params.patterns.highlights,
      applyTraps: params.applyTraps || [],
      count: params.count || 1
    });
  }
}
