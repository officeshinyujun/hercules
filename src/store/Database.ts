import Database from 'better-sqlite3';
import path from 'path';
import { RenderedQuestion, ScoredQuestion } from '../generator/types';

export interface CachedAnalysis {
  id: number;
  textbookHash: string;
  examHash: string;
  knowledge: string;
  trapPatterns: string;
  highlights: string;
  createdAt: string;
}

export interface StoredQuestion {
  id: number;
  setId: string;
  data: string;
  createdAt: string;
}

export interface StoredAnswer {
  id: number;
  questionId: number;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  timestamp: string;
}

export class QuestionStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || path.join(process.cwd(), 'hercules.db');
    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cached_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        textbook_hash TEXT NOT NULL,
        exam_hash TEXT NOT NULL,
        knowledge TEXT NOT NULL,
        trap_patterns TEXT NOT NULL,
        highlights TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL REFERENCES questions(id),
        selected_answer INTEGER,
        is_correct INTEGER,
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_questions_set_id ON questions(set_id);
      CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
    `);
  }

  saveQuestions(questions: RenderedQuestion[], setId: string): number[] {
    const insert = this.db.prepare(
      'INSERT INTO questions (set_id, data) VALUES (?, ?)'
    );
    const ids: number[] = [];
    const tx = this.db.transaction(() => {
      for (const q of questions) {
        const result = insert.run(setId, JSON.stringify(q));
        ids.push(result.lastInsertRowid as number);
      }
    });
    tx();
    return ids;
  }

  getQuestionsBySetId(setId: string): RenderedQuestion[] {
    const rows = this.db.prepare(
      'SELECT data FROM questions WHERE set_id = ? ORDER BY id'
    ).all(setId) as StoredQuestion[];
    return rows.map(r => JSON.parse(r.data));
  }

  getAllSets(): { setId: string; createdAt: string; count: number }[] {
    const rows = this.db.prepare(`
      SELECT set_id, created_at, COUNT(*) as count
      FROM questions
      GROUP BY set_id
      ORDER BY MAX(id) DESC
    `).all() as any[];
    return rows;
  }

  saveAnswer(questionId: number, selectedAnswer: number | null, isCorrect: boolean | null): void {
    this.db.prepare(
      'INSERT INTO answers (question_id, selected_answer, is_correct) VALUES (?, ?, ?)'
    ).run(questionId, selectedAnswer, isCorrect ? 1 : 0);
  }

  getWrongQuestions(): ScoredQuestion[] {
    const rows = this.db.prepare(`
      SELECT q.id, q.data, a.selected_answer, a.is_correct, a.timestamp
      FROM questions q
      JOIN answers a ON a.question_id = q.id
      WHERE a.is_correct = 0
      ORDER BY a.timestamp DESC
    `).all() as any[];
    return rows.map(r => ({
      question: JSON.parse(r.data),
      selectedAnswer: r.selected_answer,
      isCorrect: false,
      timestamp: new Date(r.timestamp).getTime(),
      setId: ''
    }));
  }

  close(): void {
    this.db.close();
  }
}
