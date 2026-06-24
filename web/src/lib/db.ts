import { QuestionStore } from 'hercules';

let store: QuestionStore | null = null;

function getStore(): QuestionStore {
  if (!store) {
    store = new QuestionStore();
  }
  return store;
}

export function saveQuestionSet(questions: any[], setId: string): number[] {
  try {
    return getStore().saveQuestions(questions, setId);
  } catch (e) {
    console.error('DB save error:', e);
    return [];
  }
}

export function getSets() {
  try {
    return getStore().getAllSets();
  } catch (e) {
    console.error('DB read error:', e);
    return [];
  }
}

export function getSetQuestions(setId: string) {
  try {
    return getStore().getQuestionsBySetId(setId);
  } catch (e) {
    console.error('DB read error:', e);
    return [];
  }
}

export function recordAnswer(questionId: number, selected: number | null, correct: boolean | null) {
  try {
    getStore().saveAnswer(questionId, selected, correct);
  } catch (e) {
    console.error('DB save error:', e);
  }
}

export function getWrongQuestions() {
  try {
    return getStore().getWrongQuestions();
  } catch (e) {
    console.error('DB read error:', e);
    return [];
  }
}
