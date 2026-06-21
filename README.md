# Hercules 🏛️

**Hercules**는 교과서 지식(Knowledge)과 다량의 기출문제(Past Exams)를 결합하여, **실제 기출문제와 논리적 구조 및 오답 함정이 완벽히 동일한 쌍둥이 문항(Mimic Questions)을 생성**해내는 고도의 TypeScript AI 교육 라이브러리입니다.

## 🌟 핵심 특징 (Key Features)

기존의 단순 빈도 분석 생성기를 넘어, 기출문제들이 실제로 교과서 개념을 어떻게 꼬아서(함정) 출제하는지 깊이 있게 학습합니다.

1. **Trap Pattern Analysis (함정 패턴 분석)**
   - 기출문제 텍스트를 분석하여 학생들이 자주 속는 매력적 오답 선지의 패턴(예: 유사 개념 혼동, 범위 착각)을 추출합니다.
2. **Concept Highlight V2 (지문 단서 매핑)**
   - 출제자가 지문(Stimulus) 내에 단서를 은유적으로 혹은 직접적으로 어떻게 숨겨두는지 파악하여, 새로운 지문을 만들 때 동일한 서술 방식을 적용합니다.
3. **Built-in PDF Parser & Caching**
   - PDF 형식의 기출문제를 직접 입력받아 텍스트를 추출하며, 로컬 파일 캐싱(`.exam_cache`)을 지원하여 다량의 기출문제를 반복 학습할 때의 처리 속도를 비약적으로 단축시켰습니다.
4. **Blueprint Generation**
   - 학습된 함정 패턴과 단서 서술 방식을 조합해, 사용자가 원하는 난이도와 형태에 꼭 맞는 새로운 쌍둥이 문제들을 찍어냅니다.

---

## 📦 설치 (Installation)

Hercules는 별도의 프로젝트 라이브러리로 분리되어 있습니다. 패키지 설치 후 즉시 사용 가능합니다.

```bash
npm install
```

---

## 🚀 사용법 (Usage)

Hercules 파이프라인은 3단계로 구성됩니다:
1. `extractKnowledge`: 교과서 텍스트에서 출제 가능한 명제(Proposition) 추출
2. `learnFromExams`: 기출문제들을 분석해 출제 포맷(Highlight) 및 함정(Trap) 패턴 추출
3. `generateQuestions`: 추출된 지식과 학습된 패턴을 융합해 문제 생성

### 기본 예제 (`test.ts` 참고)

```typescript
import { Hercules } from 'hercules';

async function main() {
  // 1. 초기화 (OpenAI API Key 필요)
  const hercules = new Hercules({
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
    model: 'gpt-4o' // 사용할 모델 지정
  });

  // 2. 교과서에서 출제 타겟이 될 지식 추출
  const textbookText = "교과서 1단원 본문 내용 전체...";
  const knowledge = await hercules.extractKnowledge(textbookText);

  // 3. 기출문제 분석 및 패턴 학습 (다량의 PDF 입력 시 자동으로 캐싱 처리됨)
  // 기출문제를 많이 넣을수록 TrapPattern과 ConceptHighlight의 정확도가 상승합니다.
  const patterns = await hercules.learnFromExams({
    knowledge: knowledge,
    pastExams: [
      "/path/to/2023_수능.pdf", 
      "/path/to/2024_6월_모의평가.pdf",
      "직접 텍스트로 입력한 기출문제 원문..."
    ]
  });

  // 4. 쌍둥이 기출 문항 생성
  const questions = await hercules.generateQuestions({
    knowledge: knowledge,
    patterns: patterns,
    applyTraps: ["유사 개념 혼동", "부분적 참/거짓 조합"], // 기출에서 많이 나오던 함정을 오답에 강제 주입
    count: 3
  });

  console.log(JSON.stringify(questions, null, 2));
}

main();
```

---

## 📂 디렉토리 구조 (Architecture)

- `src/core/`: `Hercules` 메인 Facade 클래스 및 LLM 통신 래퍼
- `src/extractor/`: 교과서 원문에서 평가 요소(Knowledge)를 도출하는 추출기
- `src/analyzer/`: 기출문제 텍스트 및 PDF를 분석하여 패턴(`TrapPattern`, `ConceptHighlight`)을 학습하는 분석 엔진
- `src/generator/`: 학습된 모든 자산을 융합하여 실전 기출과 100% 동일한 형태의 프롬프트를 조립하고 문제를 생성하는 엔진

---

## ⚙️ 환경 변수 (Environment Variables)

`.env` 파일을 생성하거나 환경 변수에 다음을 설정하세요:
- `OPENAI_API_KEY`: LLM 호출을 위한 OpenAI API 키
