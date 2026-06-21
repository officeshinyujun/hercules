# Hercules

Hercules는 교과서 지식(Knowledge) 추출과 기출문제 패턴의 심층 분석을 결합하여, 실제 기출문제와 논리적 구조 및 오답 메커니즘이 완벽하게 동일한 고변별력 평가 문항을 생성하는 TypeScript 기반의 교육용 AI 라이브러리입니다.

## 아키텍처 및 핵심 기능

단순한 출제 빈도 기반의 문제 생성기를 넘어, Hercules는 평가자가 학습자의 이해도를 측정하기 위해 개념을 문맥적으로 어떻게 변형하고 함정을 구성하는지 심층적으로 분석합니다.

1. **지식 추출 (`KnowledgeExtractor`)**
   교과서 원문 텍스트에서 평가에 직접 활용될 수 있는 구체적인 명제(Proposition)와 비교 대조 포인트를 추출하여 독립적인 지식 데이터로 구조화합니다.

2. **함정 패턴 분석 (`TrapPatternAnalyzer`)**
   다량의 기출문제 텍스트를 분석하여 반복적으로 등장하는 오답 선지 패턴(예: 의미 혼동, 조건 누락 등)을 추출하고, 특정 선지가 왜 학습자를 오도하는지 그 논리적 근거를 파악합니다.

3. **단서 매핑 분석 (`ConceptHighlightAnalyzer`)**
   기출문제의 지문 구조를 분석하여, 특정 교과 개념이 지문 내에서 어떠한 은유적 서술이나 직접적인 단서로 학습자에게 제시되는지 그 방식을 도출합니다.

4. **문항 청사진 생성 (`BlueprintGenerator`)**
   추출된 교과서 지식과 학습된 함정 패턴, 지문 서술 방식을 종합하여 문항 청사진(Blueprint)을 조립합니다. 이를 통해 기존 기출문제와 완벽하게 동일한 논리적 구조를 가지되 내용은 완전히 새로운 쌍둥이 문항을 생성합니다.

5. **PDF 파싱 및 로컬 캐싱 통합**
   PDF 형식의 기출문제를 직접 입력받아 텍스트로 변환하는 기능을 내장하고 있습니다. SHA-256 해시 기반의 로컬 캐싱 시스템(`.exam_cache`)을 통해 방대한 양의 기출문제 데이터를 학습할 때 발생하는 중복 파싱을 방지하고 처리 속도를 최적화합니다.

---

## 설치 방법

Hercules는 독립적인 라이브러리 모듈로 설계되었습니다.

```bash
npm install
```

---

## 사용 가이드

Hercules의 파이프라인은 지식 추출, 패턴 학습, 문항 생성의 3단계로 구성됩니다.

### 초기 설정

API 키 및 사용할 언어 모델을 환경 설정 객체에 주입하여 라이브러리를 초기화합니다.

```typescript
import { Hercules } from 'hercules';

const hercules = new Hercules({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
  model: 'gpt-4o'
});
```

### 1. 평가 대상 지식 추출

원본 교과서 텍스트로부터 출제 가능한 지식 명제를 추출합니다.

```typescript
const textbookText = "..."; // 교과서 원문 내용
const knowledge = await hercules.extractKnowledge(textbookText);
```

### 2. 기출문제 패턴 학습

과거 기출문제 자료를 입력합니다. 시스템은 PDF 파일을 자동으로 파싱 및 캐싱 처리한 후, 지문 단서 구조와 함정 패턴을 추출합니다. 정확도와 변별력을 극대화하기 위해 다량의 기출문제를 입력하는 것을 권장합니다.

```typescript
const patterns = await hercules.learnFromExams({
  knowledge: knowledge,
  pastExams: [
    "/path/to/exam_2023.pdf", 
    "/path/to/exam_2024.pdf"
  ]
});
```

### 3. 기출 복제 문항 생성

이전 단계에서 학습한 특정 오답 유도 메커니즘을 적용하여 새로운 문항을 생성합니다.

```typescript
const generatedQuestions = await hercules.generateQuestions({
  knowledge: knowledge,
  patterns: patterns,
  applyTraps: ["유사 개념 혼동", "조건 누락"], // 적용할 함정 패턴 지정
  count: 3
});

console.log(JSON.stringify(generatedQuestions, null, 2));
```

---

## 디렉토리 구조

- `src/core/`: 라이브러리의 메인 Facade 클래스 및 LLM API 통신 래퍼.
- `src/extractor/`: 교과서 원문 기반 지식 명제 도출 로직.
- `src/analyzer/`: PDF 파싱 및 함정 패턴, 단서 서술 방식 분석 엔진.
- `src/generator/`: 프롬프트 조립 및 최종 평가 문항 생성 엔진.
- `.exam_cache/`: 파싱된 PDF 텍스트 결과물을 저장하는 로컬 캐시 디렉토리.

---

## 환경 변수 설정

`.env` 파일 또는 실행 환경의 환경 변수를 통해 다음 항목을 반드시 설정해야 합니다:

- `OPENAI_API_KEY`: 코어 LLM 엔진 구동에 필요한 OpenAI API 키.
