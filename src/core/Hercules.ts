import { HerculesConfig } from './config';
import { LLMClient } from './LLMClient';
import { KnowledgeExtractor, KnowledgeItem } from '../extractor/KnowledgeExtractor';
import { TrapPatternAnalyzer, TrapPattern } from '../analyzer/TrapPatternAnalyzer';
import { ConceptHighlightAnalyzer, ConceptHighlight } from '../analyzer/ConceptHighlightAnalyzer';
import { BlueprintGenerator } from '../generator/BlueprintGenerator';
import { QuestionRenderer } from '../generator/QuestionRenderer';
import { Validator } from '../generator/Validator';
import { PdfParser } from '../analyzer/PdfParser';
import { ProgressCallback } from './ProgressReporter';
import { Difficulty, ItemType, RenderedQuestion } from '../generator/types';

const MAX_RETRIES = 3;

export class Hercules {
  public llmClient: LLMClient;
  public knowledgeExtractor: KnowledgeExtractor;
  public trapAnalyzer: TrapPatternAnalyzer;
  public highlightAnalyzer: ConceptHighlightAnalyzer;
  public blueprintGenerator: BlueprintGenerator;
  public questionRenderer: QuestionRenderer;
  public validator: Validator;
  public pdfParser: PdfParser;
  public onProgress?: ProgressCallback;

  constructor(config: HerculesConfig & { onProgress?: ProgressCallback }) {
    this.llmClient = new LLMClient(config);
    this.knowledgeExtractor = new KnowledgeExtractor(this.llmClient);
    this.trapAnalyzer = new TrapPatternAnalyzer(this.llmClient);
    this.highlightAnalyzer = new ConceptHighlightAnalyzer(this.llmClient);
    this.blueprintGenerator = new BlueprintGenerator(this.llmClient);
    this.questionRenderer = new QuestionRenderer(this.llmClient);
    this.validator = new Validator(this.llmClient);
    this.pdfParser = new PdfParser();
    this.onProgress = config.onProgress;
  }

  private async report(update: { stage: string; progress: number; message: string; status?: 'info' | 'success' | 'warning' | 'error'; detail?: string }) {
    if (this.onProgress) {
      await this.onProgress(update);
    }
  }

  async extractKnowledge(textbookText: string): Promise<KnowledgeItem[]> {
    await this.report({ stage: 'extracting', progress: 10, message: '교과서 텍스트에서 지식 명제를 추출하는 중입니다.' });
    const knowledge = await this.knowledgeExtractor.extract(textbookText);
    await this.report({ stage: 'extracting', progress: 20, status: 'success', message: `지식 명제 ${knowledge.length}개 추출 완료`, detail: JSON.stringify(knowledge.map(k => ({ id: k.id, name: k.name }))) });
    return knowledge;
  }

  async learnFromExams(params: { knowledge: KnowledgeItem[], pastExams: string[] }) {
    await this.report({ stage: 'parsing_pdfs', progress: 25, message: '기출문제 PDF를 파싱하는 중입니다.' });

    let combinedExamText = '';
    for (let i = 0; i < params.pastExams.length; i++) {
      const examPath = params.pastExams[i];
      await this.report({ stage: 'parsing_pdfs', progress: 25 + Math.round((i / params.pastExams.length) * 10), message: `PDF 파싱 중 (${i + 1}/${params.pastExams.length})` });
      if (examPath.endsWith('.pdf')) {
        const text = await this.pdfParser.parseToText(examPath);
        combinedExamText += `\n--- Exam: ${examPath} ---\n${text}`;
      } else {
        combinedExamText += `\n${examPath}`;
      }
    }

    await this.report({ stage: 'analyzing_traps', progress: 40, message: '함정 패턴(Trap Pattern)을 분석하는 중입니다.' });
    const trapPatterns = await this.trapAnalyzer.analyze(params.knowledge, combinedExamText);

    await this.report({ stage: 'analyzing_highlights', progress: 55, message: '지문 단서 구조(Concept Highlight)를 분석하는 중입니다.' });
    const highlights = await this.highlightAnalyzer.analyze(params.knowledge, combinedExamText);

    await this.report({ stage: 'analyzing', progress: 70, status: 'success', message: '기출문제 분석 완료', detail: JSON.stringify({ trapPatternCount: Object.keys(trapPatterns).length, highlightCount: Object.keys(highlights).length }) });

    return { trapPatterns, highlights };
  }

  async generateQuestions(params: {
    knowledge: KnowledgeItem[];
    patterns: { trapPatterns: Record<string, TrapPattern[]>, highlights: Record<string, ConceptHighlight> };
    applyTraps?: string[];
    count?: number;
    difficulty?: Difficulty;
    itemTypes?: ItemType[];
    validate?: boolean;
  }): Promise<RenderedQuestion[]> {
    const difficulty = params.difficulty || 'MIDDLE';
    const doValidate = params.validate !== false;
    const targetCount = params.count || 1;

    let attempts = 0;
    let allQuestions: RenderedQuestion[] = [];

    while (attempts < MAX_RETRIES && allQuestions.length < targetCount) {
      attempts++;

      // Step 1: Generate blueprints
      await this.report({ stage: 'blueprint', progress: 75, message: `Step 1: Blueprint ${targetCount}개 설계 중 (시도 ${attempts}/${MAX_RETRIES}, 난이도: ${difficulty})` });
      const blueprints = await this.blueprintGenerator.generate({
        knowledgeList: params.knowledge,
        trapPatterns: params.patterns.trapPatterns,
        highlights: params.patterns.highlights,
        applyTraps: params.applyTraps || [],
        count: targetCount,
        difficulty,
        itemTypes: params.itemTypes,
      });
      await this.report({ stage: 'blueprint', progress: 85, status: 'success', message: `Step 1 완료: ${blueprints.length}개 Blueprint 설계 완료` });

      // Step 2: Render questions
      await this.report({ stage: 'rendering', progress: 88, message: 'Step 2: Blueprint 기반 문항 렌더링 중' });
      const rendered = await this.questionRenderer.render({
        blueprints,
        knowledgeList: params.knowledge,
        highlights: params.patterns.highlights,
      });
      await this.report({ stage: 'rendering', progress: 93, status: 'success', message: `${rendered.length}개 문항 렌더링 완료` });

      // Step 3: Validate
      if (doValidate) {
        await this.report({ stage: 'validating', progress: 95, message: 'Step 3: 문항 검증 중 (LLM-as-Judge)' });
        const validated: RenderedQuestion[] = [];
        for (const q of rendered) {
          const result = await this.validator.validate(q);
          if (result.valid || result.score >= 60) {
            validated.push(q);
          } else {
            await this.report({ stage: 'validating', progress: 95, message: `문항 1개 검증 실패 (score: ${result.score}), 재생성 예정`, status: 'warning' });
          }
        }
        allQuestions.push(...validated);
      } else {
        allQuestions.push(...rendered);
      }

      if (allQuestions.length < targetCount && attempts < MAX_RETRIES) {
        await this.report({ stage: 'validating', progress: 95, message: `충분한 문항을 생성하지 못함 (${allQuestions.length}/${targetCount}). 재시도 중...`, status: 'warning' });
      }
    }

    await this.report({ stage: 'rendering', progress: 100, status: 'success', message: `최종 ${allQuestions.length}개 문항 생성 완료 (${attempts}회 시도)` });

    return allQuestions;
  }
}
