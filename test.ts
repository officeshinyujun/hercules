import { Hercules } from './src/index';

async function main() {
  const hercules = new Hercules({
    apiKeys: (process.env.OPENAI_API_KEY || 'dummy_key').split(','),
    model: 'gpt-4o-mini'
  });

  console.log('Hercules V2 (Trap & Highlight) 라이브러리가 성공적으로 초기화되었습니다.');
  console.log('API를 사용하여 파이프라인을 실행할 수 있습니다.');
  
  // Example usage:
  /*
  const knowledge = await hercules.extractKnowledge("교과서 1단원 텍스트...");
  console.log("추출된 출제 지식:", knowledge);

  const patterns = await hercules.learnFromExams({
    knowledge,
    pastExams: ["2024_수능.pdf", "2023_9월.pdf"]
  });
  console.log("학습된 함정 및 단서 패턴:", patterns);

  const questions = await hercules.generateQuestions({
    knowledge,
    patterns,
    applyTraps: ["유사 개념 혼동"],
    count: 2
  });
  console.log("생성된 기출 복제 문항:", JSON.stringify(questions, null, 2));
  */
}

main().catch(console.error);
