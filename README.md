# Hercules

Hercules is an advanced TypeScript-based educational AI library designed to generate highly differentiated assessment items. By combining textbook knowledge extraction with a rigorous analysis of past exam patterns, Hercules generates assessment items that perfectly replicate the logical structures, distractor mechanisms (trap patterns), and stimulus delivery methods of real past exams.

## Architecture & Core Features

Unlike frequency-based question generators, Hercules deeply analyzes how concepts are contextually tested and distorted to evaluate learners effectively. 

1. **Knowledge Extraction (`KnowledgeExtractor`)**
   Extracts testable propositions and comparative points from raw textbook text, creating discrete knowledge entities ready for assessment generation.

2. **Trap Pattern Analysis (`TrapPatternAnalyzer`)**
   Analyzes past examination texts to extract recurring distractor patterns (e.g., semantic confusion, condition omission) and logically breaks down why specific choices successfully misdirect examinees.

3. **Concept Highlight Analysis (`ConceptHighlightAnalyzer`)**
   Analyzes the stimulus structures of past exams to determine how target concepts are metaphorically or explicitly delivered to the examinee within the question body.

4. **Blueprint Generation (`BlueprintGenerator`)**
   Synthesizes the extracted textbook knowledge with the learned trap patterns and stimulus styles to assemble prompt blueprints. The result is a precise structural replication of real exam items with entirely new content.

5. **Integrated PDF Parsing & Caching**
   Supports direct ingestion of PDF files. Incorporates an SHA-256 hash-based local caching mechanism (`.exam_cache`) to optimize performance and reduce redundant parsing when analyzing large volumes of historical exam data.

---

## Installation

Hercules is designed as a standalone library module. 

```bash
npm install
```

---

## Usage Guide

The Hercules pipeline is sequentially structured into three phases: knowledge extraction, pattern learning, and blueprint generation.

### Configuration

Provide your API keys and model specifications via the configuration object.

```typescript
import { Hercules } from 'hercules';

const hercules = new Hercules({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
  model: 'gpt-4o'
});
```

### 1. Extract Target Knowledge

Extract testable propositions from the source textbook.

```typescript
const textbookText = "..."; // Raw textbook content
const knowledge = await hercules.extractKnowledge(textbookText);
```

### 2. Learn Exam Patterns

Input past examination materials. The system parses the texts (with automatic PDF handling and caching) and extracts trap patterns and stimulus styles. For optimal accuracy, passing a large volume of exam data is recommended.

```typescript
const patterns = await hercules.learnFromExams({
  knowledge: knowledge,
  pastExams: [
    "/path/to/exam_2023.pdf", 
    "/path/to/exam_2024.pdf"
  ]
});
```

### 3. Generate Replicated Items

Generate new items by applying the specific distractor mechanisms learned in the previous phase.

```typescript
const generatedQuestions = await hercules.generateQuestions({
  knowledge: knowledge,
  patterns: patterns,
  applyTraps: ["유사 개념 혼동", "조건 누락"], // Specify desired trap patterns
  count: 3
});

console.log(JSON.stringify(generatedQuestions, null, 2));
```

---

## Directory Structure

- `src/core/`: Facade class and LLM API client.
- `src/extractor/`: Knowledge proposition extraction logic.
- `src/analyzer/`: PDF parsing, Trap Pattern, and Concept Highlight analysis modules.
- `src/generator/`: Prompt assembly and assessment item generation.
- `.exam_cache/`: Local cache directory for parsed PDF text artifacts.

---

## Environment Configuration

Ensure the following environment variables are configured either via a `.env` file or your runtime environment:

- `OPENAI_API_KEY`: API key required for the core LLM processing engine.
