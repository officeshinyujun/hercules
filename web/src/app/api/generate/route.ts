import { NextRequest, NextResponse } from 'next/server';
import { Hercules } from 'hercules';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const apiKey = formData.get('apiKey') as string;
    const textbookText = formData.get('textbookText') as string;
    const countStr = formData.get('count') as string;
    const applyTraps = formData.getAll('applyTraps') as string[];
    
    if (!apiKey || !textbookText) {
      return NextResponse.json({ error: 'Missing apiKey or textbookText' }, { status: 400 });
    }

    const count = countStr ? parseInt(countStr, 10) : 1;
    const files = formData.getAll('exams') as File[];

    const hercules = new Hercules({ apiKey, model: 'gpt-4o' });

    // Save uploaded files to temp dir
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hercules-'));
    const pastExams: string[] = [];

    for (const file of files) {
      if (file.name.endsWith('.pdf') || file.name.endsWith('.txt')) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = path.join(tempDir, file.name);
        fs.writeFileSync(filePath, buffer);
        pastExams.push(filePath);
      }
    }

    // 1. Extract Knowledge
    const knowledge = await hercules.extractKnowledge(textbookText);

    // 2. Learn from Exams
    const patterns = await hercules.learnFromExams({
      knowledge,
      pastExams
    });

    // 3. Generate Questions
    const questions = await hercules.generateQuestions({
      knowledge,
      patterns,
      applyTraps,
      count
    });

    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
