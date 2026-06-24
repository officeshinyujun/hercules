import { NextRequest, NextResponse } from 'next/server';
import { getSets, getSetQuestions, recordAnswer, getWrongQuestions } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const setId = searchParams.get('setId');

  try {
    switch (action) {
      case 'sets':
        return NextResponse.json({ sets: getSets() });
      case 'set':
        if (!setId) return NextResponse.json({ error: 'setId required' }, { status: 400 });
        return NextResponse.json({ questions: getSetQuestions(setId) });
      case 'wrong':
        return NextResponse.json({ questions: getWrongQuestions() });
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, questionId, selectedAnswer, isCorrect } = body;

    if (action === 'answer') {
      recordAnswer(questionId, selectedAnswer, isCorrect);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
