import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createJob, updateJobProgress, completeJob, failJob } from '@/lib/job-manager';
import { saveQuestionSet } from '@/lib/db';
import { Hercules } from 'hercules';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const apiKeyString = formData.get('apiKey') as string;
    const textbookText = formData.get('textbookText') as string;
    const countStr = formData.get('count') as string;
    const applyTraps = formData.getAll('applyTraps') as string[];
    const difficulty = (formData.get('difficulty') as string) || 'MIDDLE';
    const itemTypesStr = formData.get('itemTypes') as string;

    if (!apiKeyString || !textbookText) {
      return NextResponse.json({ error: 'Missing apiKey or textbookText' }, { status: 400 });
    }

    const apiKeys = apiKeyString.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const count = countStr ? parseInt(countStr, 10) : 1;
    const files = formData.getAll('exams') as File[];
    const itemTypes = itemTypesStr ? itemTypesStr.split(',').map(t => t.trim()).filter(Boolean) : undefined;

    const jobId = createJob();
    runGeneration(jobId, { apiKeys, textbookText, count, applyTraps, difficulty, itemTypes, files });

    return NextResponse.json({ jobId });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

async function runGeneration(
  jobId: string,
  params: {
    apiKeys: string[];
    textbookText: string;
    count: number;
    applyTraps: string[];
    difficulty: string;
    itemTypes?: string[];
    files: File[];
  }
) {
  try {
    updateJobProgress(jobId, { stage: 'initializing', progress: 5, message: 'Hercules 엔진을 초기화하는 중입니다.' });

    const hercules = new Hercules({
      apiKeys: params.apiKeys,
      model: 'gpt-4o',
      onProgress: (update: any) => {
        updateJobProgress(jobId, update);
      }
    });

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hercules-'));
    const pastExams: string[] = [];

    for (const file of params.files) {
      if (file.name.endsWith('.pdf') || file.name.endsWith('.txt')) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = path.join(tempDir, file.name);
        fs.writeFileSync(filePath, buffer);
        pastExams.push(filePath);
      }
    }

    const knowledge = await hercules.extractKnowledge(params.textbookText);

    let patterns = { trapPatterns: {} as Record<string, any[]>, highlights: {} as Record<string, any> };
    if (pastExams.length > 0) {
      patterns = await hercules.learnFromExams({ knowledge, pastExams });
    } else {
      updateJobProgress(jobId, { stage: 'analyzing', progress: 70, status: 'info', message: '기출문제가 없습니다. 설정된 함정 패턴만 적용하여 문항을 생성합니다.' });
    }

    const questions = await hercules.generateQuestions({
      knowledge,
      patterns,
      applyTraps: params.applyTraps,
      count: params.count,
      difficulty: params.difficulty as any || 'MIDDLE',
      itemTypes: params.itemTypes as any,
    });

    // Save to DB
    const setId = `gen_${Date.now()}`;
    saveQuestionSet(questions, setId);

    try { fs.rmSync(tempDir, { recursive: true }); } catch {}

    completeJob(jobId, {
      questions,
      setId,
      analysis: {
        knowledgeCount: knowledge.length,
        trapPatterns: patterns.trapPatterns,
        highlights: patterns.highlights,
      }
    });
  } catch (error: any) {
    console.error(error);
    failJob(jobId, error.message || 'Internal Server Error');
  }
}
