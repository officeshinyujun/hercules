"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { CheckCircle2, ChevronRight, FileText, Loader2, Plus, Settings, Trash2, Brain, AlertTriangle, BookOpen, History, X, Bookmark, Award, RefreshCw, PenLine, Eye, EyeOff } from "lucide-react";
import type { RenderedQuestion } from "hercules";

const STAGE_LABELS: Record<string, string> = {
  initializing: "초기화",
  extracting: "지식 추출",
  parsing_pdfs: "PDF 파싱",
  analyzing_traps: "함정 패턴 분석",
  analyzing_highlights: "지문 단서 분석",
  analyzing: "기출 분석",
  blueprint: "설계도 생성",
  rendering: "문항 렌더링",
  validating: "검증",
};

type ViewMode = 'view' | 'quiz';

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [textbook, setTextbook] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [traps, setTraps] = useState<string>("유사 개념 혼동, 조건 누락");
  const [count, setCount] = useState<number>(2);
  const [difficulty, setDifficulty] = useState<string>("MIDDLE");
  const [itemTypes, setItemTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RenderedQuestion[] | null>(null);
  const [setId, setSetId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Progress state
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [stageMessage, setStageMessage] = useState("");
  const [stageStatus, setStageStatus] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [showProgress, setShowProgress] = useState(false);

  // Quiz state
  const [viewMode, setViewMode] = useState<ViewMode>('view');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  // History
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySets, setHistorySets] = useState<any[]>([]);
  const [wrongNotes, setWrongNotes] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hercules_wrong');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Toss-style polish: save wrong answers to localStorage
  useEffect(() => {
    localStorage.setItem('hercules_wrong', JSON.stringify(wrongNotes));
  }, [wrongNotes]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetQuiz = useCallback(() => {
    setSelectedAnswers({});
    setRevealedAnswers({});
  }, []);

  const handleGenerate = async () => {
    if (!apiKey) { setError("OpenAI API 키를 입력해주세요."); return; }
    if (!textbook) { setError("교과서 텍스트를 입력해주세요."); return; }

    setLoading(true);
    setError(null);
    setResult(null);
    setAnalysis(null);
    setSetId(null);
    setShowProgress(true);
    setProgress(0);
    setStage("initializing");
    setStageMessage("작업을 생성하는 중입니다...");
    setStageStatus("info");
    resetQuiz();

    const formData = new FormData();
    formData.append("apiKey", apiKey);
    formData.append("textbookText", textbook);
    formData.append("count", count.toString());
    formData.append("difficulty", difficulty);
    if (itemTypes.length > 0) formData.append("itemTypes", itemTypes.join(","));
    traps.split(",").forEach(trap => { if (trap.trim()) formData.append("applyTraps", trap.trim()); });
    files.forEach(file => formData.append("exams", file));

    try {
      const res = await fetch("/api/generate", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "생성 실패"); }
      const { jobId } = await res.json();

      const eventSource = new EventSource(`/api/generate/stream?jobId=${jobId}`);
      eventSource.addEventListener("progress", (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        setProgress(data.progress);
        if (data.stage) { setStage(data.stage); setStageMessage(data.message || STAGE_LABELS[data.stage] || data.stage); }
        if (data.status) setStageStatus(data.status);
      });
      eventSource.addEventListener("complete", (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        setResult(data.result.questions);
        setSetId(data.result.setId || null);
        setAnalysis(data.result.analysis);
        setLoading(false);
        setShowProgress(false);
        eventSource.close();
      });
      eventSource.addEventListener("error", () => {
        setError("생성 중 오류가 발생했습니다.");
        setLoading(false);
        setShowProgress(false);
        eventSource.close();
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      setShowProgress(false);
    }
  };

  const handleOptionClick = (qIdx: number, optIdx: number) => {
    if (revealedAnswers[qIdx]) return;
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx + 1 }));
    setRevealedAnswers(prev => ({ ...prev, [qIdx]: true }));
  };

  const handleSaveWrong = (qIdx: number) => {
    const question = result?.[qIdx];
    if (!question) return;
    const already = wrongNotes.some((w: any) => w.questionStem === question.questionStem);
    if (!already) {
      setWrongNotes(prev => [{
        question,
        selectedAnswer: selectedAnswers[qIdx],
        timestamp: Date.now(),
      }, ...prev]);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/db?action=sets');
      const data = await res.json();
      setHistorySets(data.sets || []);
    } catch {}
    setHistoryOpen(true);
  };

  const removeWrongNote = (idx: number) => {
    setWrongNotes(prev => prev.filter((_, i) => i !== idx));
  };

  const getStageColor = () => {
    if (stageStatus === 'success') return 'text-green-600';
    if (stageStatus === 'warning') return 'text-amber-600';
    if (stageStatus === 'error') return 'text-red-600';
    return 'text-[#191f28]';
  };

  const renderCombinationBlock = (block: any) => {
    if (!block || !block.items?.length) return null;
    return (
      <div className="bg-white p-6 rounded-2xl border border-[#e5e8eb] space-y-3">
        <h4 className="text-xs font-bold text-[#8b95a1] uppercase tracking-wider">{block.title || '<보기>'}</h4>
        <div className="divide-y divide-[#f2f4f6]">
          {block.items.map((item: any, i: number) => (
            <div key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#f2f4f6] text-xs font-bold text-[#4e5968] flex-shrink-0">
                {item.key}
              </span>
              <span className="text-sm text-[#4e5968] leading-relaxed">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderQuestionCard = (q: RenderedQuestion, idx: number) => {
    const isQuiz = viewMode === 'quiz';
    const selected = selectedAnswers[idx];
    const revealed = revealedAnswers[idx];
    const isCorrect = revealed && selected === q.correctAnswer;

    return (
      <div key={idx} className="bg-white p-8 rounded-[24px] border border-[#e5e8eb] hover:border-[#d1d6db] transition-all duration-200 space-y-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-[#191f28] text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
              문항 {idx + 1}
            </span>
            {q.template && (
              <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[#f2f4f6] text-[#8b95a1]">
                {q.template.replace('TPL_', '').replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {q.difficulty && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                q.difficulty === 'SUPER' ? 'bg-red-50 text-red-500' :
                q.difficulty === 'HIGH' ? 'bg-amber-50 text-amber-600' :
                'bg-[#f2f4f6] text-[#8b95a1]'
              }`}>
                {q.difficulty === 'LOW' ? '하' : q.difficulty === 'MIDDLE' ? '중' : q.difficulty === 'HIGH' ? '상' : '극상'}
              </span>
            )}
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f2f4f6] text-[#8b95a1]">
              {q.itemType === 'single_selection' ? '단일 선택' :
               q.itemType === 'combination_judgment' ? '조합형' :
               q.itemType === 'blank_workflow' ? '빈칸/순서' : '자료 참조'}
            </span>
          </div>
        </div>

        {/* Stem */}
        <div className="text-[#191f28] text-base sm:text-lg font-bold leading-relaxed whitespace-pre-wrap">
          {q.questionStem}
        </div>

        {/* Stimulus */}
        {q.stimulus && (
          <div className="bg-[#f9fafb] p-6 rounded-2xl border border-[#e5e8eb] text-sm text-[#4e5968] whitespace-pre-wrap leading-relaxed font-mono text-[13px]">
            {q.stimulus}
          </div>
        )}

        {/* Combination Block (보기) */}
        {renderCombinationBlock(q.combinationBlock)}

        {/* Options - Quiz mode */}
        {isQuiz ? (
          <div className="space-y-2.5 mt-6">
            {q.options?.map((opt: string, oIdx: number) => {
              const optNum = oIdx + 1;
              let optionStyle = 'bg-[#f9fafb] border-[#e5e8eb] text-[#4e5968] hover:border-[#191f28]/35 hover:bg-white cursor-pointer';
              if (revealed) {
                if (optNum === q.correctAnswer) {
                  optionStyle = 'bg-green-50 border-green-300 text-green-800 font-bold';
                } else if (optNum === selected && optNum !== q.correctAnswer) {
                  optionStyle = 'bg-red-50 border-red-300 text-red-700 font-bold';
                } else {
                  optionStyle = 'bg-[#f9fafb] border-[#e5e8eb] text-[#8b95a1] opacity-60';
                }
              } else if (optNum === selected) {
                optionStyle = 'bg-[#191f28]/5 border-[#191f28]/35 font-bold text-[#191f28]';
              }
              return (
                <button
                  key={oIdx}
                  onClick={() => handleOptionClick(idx, oIdx)}
                  className={`w-full p-4 rounded-xl border text-sm flex items-center gap-3 transition-all duration-150 ${optionStyle}`}
                  disabled={revealed}
                >
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 transition-colors ${
                    revealed && optNum === q.correctAnswer ? 'bg-green-500 text-white' :
                    revealed && optNum === selected && optNum !== q.correctAnswer ? 'bg-red-400 text-white' :
                    'bg-[#f2f4f6] text-[#8b95a1]'
                  }`}>
                    {optNum}
                  </span>
                  <span className="flex-grow leading-tight text-left">{opt}</span>
                  {revealed && optNum === q.correctAnswer && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                  {revealed && optNum === selected && optNum !== q.correctAnswer && <X className="w-4 h-4 text-red-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        ) : (
          /* Options - View mode */
          <div className="space-y-2.5 mt-6">
            {q.options?.map((opt: string, oIdx: number) => {
              const isCorrect = (oIdx + 1) === q.correctAnswer;
              return (
                <div key={oIdx} className={`p-4 rounded-xl border text-sm flex items-center gap-3 transition-all ${
                  isCorrect
                    ? 'bg-[#191f28]/5 border-[#191f28]/35 font-bold text-[#191f28]'
                    : 'bg-[#f9fafb] border-[#e5e8eb] text-[#4e5968]'
                }`}>
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                    isCorrect ? 'bg-[#191f28] text-white' : 'bg-[#f2f4f6] text-[#8b95a1]'
                  }`}>
                    {oIdx + 1}
                  </span>
                  <span className="flex-grow leading-tight">{opt}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Explanation */}
        <div className="mt-6 p-5 rounded-2xl bg-[#f9fafb] border border-[#e5e8eb] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-[#8b95a1] text-xs uppercase tracking-wider">정답 및 해설</h4>
            {isQuiz && revealed && !isCorrect && (
              <button
                onClick={() => handleSaveWrong(idx)}
                className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full hover:bg-amber-100 transition-colors flex items-center gap-1"
              >
                <Bookmark className="w-3 h-3" />
                오답 저장
              </button>
            )}
          </div>
          <p className="text-sm font-bold text-[#191f28]">
            <CheckCircle2 className="w-4 h-4 inline mr-1.5 text-green-500" />
            선택지 {q.correctAnswer}번
          </p>
          <div className="text-xs text-[#4e5968] space-y-2 leading-relaxed">
            <p><strong>정답 이유:</strong> {q.explanation?.correct}</p>
            {q.explanation?.traps && q.explanation.traps.length > 0 && (
              <div className="pt-2 border-t border-[#e5e8eb] space-y-1">
                <strong className="text-[#191f28] block mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  적용된 함정 유형:
                </strong>
                <ul className="list-disc pl-4 space-y-0.5 text-[#8b95a1]">
                  {q.explanation.traps.map((t: string, i: number) => (<li key={i}>{t}</li>))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f2f4f6] text-[#191f28] py-16 px-6 sm:px-10 lg:px-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Header */}
        <div className="space-y-4 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <span className="text-[#8b95a1] font-semibold text-xs tracking-wider uppercase">Hercules AI</span>
              <h1 className="text-4xl font-extrabold tracking-tight text-[#191f28] sm:text-5xl lg:text-6xl leading-tight whitespace-pre-line">
                기출 분석 기반으로{"\n"}쌍둥이 문제를 만들어볼까요?
              </h1>
              <p className="text-sm sm:text-base text-[#4e5968] leading-relaxed max-w-xl">
                교과서 지식 핵심과 실제 기출문제 PDF의 출제 패턴 및 오답 유도 함정을 연동하여 새로운 고변별도 문항을 생성합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

          {/* Left Column */}
          <div className="lg:col-span-5 space-y-8">

            {/* API Key Card */}
            <Card className="rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.03)] bg-white transition-shadow duration-200 hover:shadow-[0_8px_35px_rgb(0,0,0,0.05)]">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#191f28]" />
                  설정
                </CardTitle>
                <CardDescription className="text-xs text-[#8b95a1] leading-relaxed">
                  OpenAI API 키를 입력하세요. 여러 개인 경우 쉼표(,)로 구분하면 라운드로빈 방식으로 작동합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="text-xs font-semibold text-[#4e5968]">OpenAI API Key(s)</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="sk-..."
                    className="bg-[#f9fafb] border-none focus-visible:ring-2 focus-visible:ring-[#191f28] rounded-xl h-11 transition-all"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Learning Data Card */}
            <Card className="rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.03)] bg-white transition-shadow duration-200 hover:shadow-[0_8px_35px_rgb(0,0,0,0.05)]">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#191f28]" />
                  학습 데이터
                </CardTitle>
                <CardDescription className="text-xs text-[#8b95a1] leading-relaxed">
                  분석할 교과서 본문과 함정을 추출할 기출 PDF를 넣어주세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="textbook" className="text-xs font-semibold text-[#4e5968]">교과서 본문 텍스트</Label>
                  <Textarea
                    id="textbook"
                    placeholder="교과서 핵심 이론이나 단원 본문을 입력하세요..."
                    className="h-36 bg-[#f9fafb] border-none focus-visible:ring-2 focus-visible:ring-[#191f28] rounded-xl p-4 resize-none transition-all text-sm leading-relaxed"
                    value={textbook}
                    onChange={e => setTextbook(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#4e5968]">기출 PDF 업로드 (선택)</Label>
                  <label htmlFor="exams" className="flex flex-col items-center justify-center border border-dashed border-[#e5e8eb] rounded-2xl p-6 bg-[#f9fafb] hover:bg-[#f2f4f6]/50 cursor-pointer transition-all group">
                    <Plus className="h-5 w-5 text-[#8b95a1] mb-2 group-hover:text-[#191f28] transition-colors" />
                    <span className="text-xs font-semibold text-[#4e5968]">기출 PDF 추가</span>
                    <span className="text-[10px] text-[#8b95a1] mt-1">드래그하거나 클릭하여 다중 선택</span>
                    <input id="exams" type="file" accept=".pdf" multiple onChange={handleFileChange} className="hidden" />
                  </label>
                  {files.length > 0 && (
                    <div className="space-y-2 pt-2 max-h-48 overflow-y-auto pr-1">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-[#f9fafb] px-4 py-2.5 rounded-xl border border-[#e5e8eb] text-xs">
                          <span className="truncate max-w-[220px] font-medium text-[#4e5968]">{file.name}</span>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-[#8b95a1] hover:text-[#191f28] hover:bg-slate-100 rounded-full transition-all" onClick={() => handleRemoveFile(index)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Generation Options */}
            <Card className="rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.03)] bg-white transition-shadow duration-200 hover:shadow-[0_8px_35px_rgb(0,0,0,0.05)]">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <PenLine className="w-5 h-5 text-[#191f28]" />
                  생성 옵션
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="traps" className="text-xs font-semibold text-[#4e5968]">강제 적용 함정 패턴 (쉼표 구분)</Label>
                  <Input id="traps" className="bg-[#f9fafb] border-none focus-visible:ring-2 focus-visible:ring-[#191f28] rounded-xl h-11 transition-all text-sm" value={traps} onChange={e => setTraps(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="count" className="text-xs font-semibold text-[#4e5968]">생성할 문제 개수</Label>
                  <Input id="count" type="number" min="1" max="10" className="bg-[#f9fafb] border-none focus-visible:ring-2 focus-visible:ring-[#191f28] rounded-xl h-11 transition-all text-sm" value={count} onChange={e => setCount(parseInt(e.target.value) || 1)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#4e5968]">난이도</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {["LOW", "MIDDLE", "HIGH", "SUPER"].map((d) => (
                      <button key={d} type="button" onClick={() => setDifficulty(d)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border active:scale-95 ${
                          difficulty === d
                            ? 'bg-[#191f28] text-white border-[#191f28] shadow-sm'
                            : 'bg-[#f9fafb] text-[#4e5968] border-[#e5e8eb] hover:border-[#191f28]/35'
                        }`}>
                        {d === 'LOW' ? '하' : d === 'MIDDLE' ? '중' : d === 'HIGH' ? '상' : '극상'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#4e5968]">문항 유형 (복수 선택)</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "single_selection", label: "단일 선택" },
                      { value: "combination_judgment", label: "조합형" },
                      { value: "blank_workflow", label: "빈칸/순서" },
                      { value: "direct_statement", label: "자료 참조" },
                    ].map((t) => {
                      const selected = itemTypes.includes(t.value);
                      return (
                        <button key={t.value} type="button" onClick={() => setItemTypes(prev => selected ? prev.filter(v => v !== t.value) : [...prev, t.value])}
                          className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all border active:scale-95 ${
                            selected
                              ? 'bg-[#191f28] text-white border-[#191f28] shadow-sm'
                              : 'bg-[#f9fafb] text-[#4e5968] border-[#e5e8eb] hover:border-[#191f28]/35'
                          }`}>
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                  {itemTypes.length === 0 && <p className="text-[10px] text-[#8b95a1]">미선택 시 모든 유형 혼합 생성</p>}
                </div>

                {/* History & Wrong Notes Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button onClick={loadHistory} variant="outline" className="flex-1 bg-[#f9fafb] border border-[#e5e8eb] hover:bg-[#f2f4f6] rounded-xl h-11 text-xs font-semibold text-[#4e5968]">
                    <History className="w-4 h-4 mr-1.5" />
                    기록
                  </Button>
                  <Button onClick={() => setWrongNotes(wrongNotes)} variant="outline" className="flex-1 bg-[#f9fafb] border border-[#e5e8eb] hover:bg-[#f2f4f6] rounded-xl h-11 text-xs font-semibold text-[#4e5968] relative">
                    <Bookmark className="w-4 h-4 mr-1.5" />
                    오답노트
                    {wrongNotes.length > 0 && (
                      <span className="ml-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{wrongNotes.length}</span>
                    )}
                  </Button>
                </div>

                {/* Generate Button */}
                <Button onClick={handleGenerate}
                  className="w-full mt-2 bg-[#191f28] hover:bg-[#333] text-white font-semibold py-6 rounded-2xl transition-all shadow-[0_4px_12px_rgba(25,31,40,0.15)] flex items-center justify-center gap-2 active:scale-[0.98]"
                  disabled={loading}>
                  {loading ? (
                    <><Loader2 className="h-5 w-5 animate-spin text-white" /> 생성 중...</>
                  ) : (
                    <><Award className="w-5 h-5" /> 쌍둥이 문항 생성하기 <ChevronRight className="w-4 h-4" /></>
                  )}
                </Button>
                {error && <p className="text-xs text-red-600 font-bold mt-2 text-center">{error}</p>}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-7 h-full">
            <Card className="rounded-[24px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.03)] bg-white min-h-[600px] flex flex-col">
              <CardHeader className="border-b border-[#f2f4f6] p-8 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#191f28]" />
                    생성 결과 뷰어
                  </CardTitle>
                  {result && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setViewMode(viewMode === 'view' ? 'quiz' : 'view'); resetQuiz(); }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border ${
                          viewMode === 'quiz'
                            ? 'bg-[#191f28] text-white border-[#191f28]'
                            : 'bg-[#f9fafb] text-[#4e5968] border-[#e5e8eb] hover:border-[#191f28]/35'
                        }`}>
                        {viewMode === 'quiz' ? <><EyeOff className="w-3 h-3 inline mr-1" />해설 보기</> : <><Eye className="w-3 h-3 inline mr-1" />풀이 모드</>}
                      </button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-8 flex-grow">

                {/* Empty State */}
                {!showProgress && !result && !loading && (
                  <div className="flex-grow flex flex-col items-center justify-center text-center space-y-5 py-32">
                    <div className="w-20 h-20 rounded-full bg-[#f2f4f6] flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-[#8b95a1] opacity-30" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold text-[#4e5968] text-lg">준비 완료</p>
                      <p className="text-xs text-[#8b95a1] max-w-xs leading-relaxed">
                        좌측에서 설정값과 학습 데이터를 채운 후 문항 생성 버튼을 눌러보세요.
                      </p>
                    </div>
                  </div>
                )}

                {/* Progress */}
                {showProgress && (
                  <div className="space-y-6 py-8 px-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${getStageColor()}`}>{STAGE_LABELS[stage] || stage}</span>
                        <span className="text-sm text-[#8b95a1] tabular-nums">{progress}%</span>
                      </div>
                      <Progress value={progress}>
                        <ProgressLabel className="text-xs text-[#8b95a1]">{stageMessage}</ProgressLabel>
                        <ProgressValue />
                      </Progress>
                    </div>

                    <div className="grid grid-cols-6 gap-2 pt-4">
                      {["initializing", "extracting", "analyzing", "blueprint", "rendering", "validating"].map((s) => {
                        const stageOrder = ["initializing", "extracting", "analyzing", "blueprint", "rendering", "validating"];
                        const stageIdx = stageOrder.indexOf(s);
                        const currentIdx = stageOrder.indexOf(stage);
                        const isActive = stageIdx === currentIdx;
                        const isDone = stageIdx < currentIdx || (stageIdx === currentIdx && stageStatus === 'success');
                        return (
                          <div key={s} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
                            isDone ? 'text-green-600' : isActive ? 'text-[#191f28] scale-105' : 'text-[#8b95a1]'
                          }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                              isDone ? 'bg-green-600 text-white shadow-sm' :
                              isActive ? 'bg-[#191f28] text-white shadow-sm ring-2 ring-[#191f28]/20' :
                              'bg-[#f2f4f6] text-[#8b95a1]'
                            }`}>
                              {isDone ? <CheckCircle2 className="w-4 h-4" /> : stageIdx + 1}
                            </div>
                            <span className="text-[10px] text-center leading-tight font-medium">{STAGE_LABELS[s] || s}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-[#f9fafb] rounded-2xl p-4 max-h-32 overflow-y-auto space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[#4e5968]">
                        {stageStatus === 'info' && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>{stageMessage}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analysis Summary */}
                {analysis && !showProgress && result && (
                  <div className="space-y-4 mb-8">
                    <Card className="rounded-2xl border border-[#e5e8eb] bg-[#f9fafb]">
                      <CardHeader className="p-5 pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Brain className="w-4 h-4 text-[#191f28]" />
                          분석 결과 요약
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 pt-0 space-y-3">
                        <div className="flex items-center gap-4 text-xs text-[#4e5968]">
                          <span>추출된 지식: <strong>{analysis.knowledgeCount}</strong>개</span>
                          <span>함정 패턴: <strong>{Object.keys(analysis.trapPatterns).length}</strong>개 연관</span>
                        </div>
                        {setId && <p className="text-[10px] text-[#8b95a1]">세트 ID: {setId}</p>}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Quiz Stats */}
                {result && (
                  <div className="flex items-center gap-4 mb-6 text-xs text-[#4e5968] bg-[#f9fafb] rounded-2xl px-5 py-3">
                    <span>전체 문항: <strong>{result.length}</strong></span>
                    {viewMode === 'quiz' && (
                      <>
                        <span>푼 문항: <strong>{Object.keys(selectedAnswers).length}</strong></span>
                        <span className={Object.values(selectedAnswers).filter((v, i) => v === result[i]?.correctAnswer).length > 0 ? 'text-green-600' : ''}>
                          정답: <strong>{Object.entries(selectedAnswers).filter(([idx, ans]) => ans === result[Number(idx)]?.correctAnswer).length}</strong>
                        </span>
                        <span className={Object.values(selectedAnswers).filter((v, i) => v !== result[i]?.correctAnswer).length > 0 ? 'text-red-500' : ''}>
                          오답: <strong>{Object.entries(selectedAnswers).filter(([idx, ans]) => ans !== result[Number(idx)]?.correctAnswer).length}</strong>
                        </span>
                      </>
                    )}
                    <button onClick={resetQuiz} className="ml-auto text-[#8b95a1] hover:text-[#191f28] transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Questions */}
                {result && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {result.map((q, idx) => renderQuestionCard(q, idx))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* History Panel Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/20 backdrop-blur-sm" onClick={() => setHistoryOpen(false)}>
          <div className="bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-w-2xl w-full mx-6 max-h-[70vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-8 pb-4 border-b border-[#f2f4f6]">
              <h2 className="text-lg font-bold text-[#191f28] flex items-center gap-2">
                <History className="w-5 h-5" />
                생성 기록
              </h2>
              <button onClick={() => setHistoryOpen(false)} className="text-[#8b95a1] hover:text-[#191f28] p-1 rounded-full hover:bg-[#f2f4f6] transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto space-y-3">
              {historySets.length === 0 ? (
                <p className="text-sm text-[#8b95a1] text-center py-12">아직 저장된 생성 기록이 없습니다.</p>
              ) : (
                historySets.map((set: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#f9fafb] border border-[#e5e8eb] hover:bg-[#f2f4f6] transition-all">
                    <div>
                      <p className="text-sm font-semibold text-[#191f28]">세트 #{i + 1}</p>
                      <p className="text-xs text-[#8b95a1]">{set.count}개 문항 · {set.createdAt}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#8b95a1] bg-white px-2 py-1 rounded-full">{set.setId}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Wrong Notes Modal */}
      {wrongNotes.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/20 backdrop-blur-sm" onClick={() => {}}>
          <div className="bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-w-2xl w-full mx-6 max-h-[70vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-8 pb-4 border-b border-[#f2f4f6]">
              <h2 className="text-lg font-bold text-[#191f28] flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-500" />
                오답노트
                <span className="text-sm font-medium text-[#8b95a1]">{wrongNotes.length}개</span>
              </h2>
              <button onClick={() => setWrongNotes([])} className="text-[10px] text-[#8b95a1] hover:text-red-500 px-3 py-1 rounded-lg bg-[#f2f4f6] hover:bg-red-50 transition-all font-semibold">
                전체 삭제
              </button>
            </div>
            <div className="p-8 overflow-y-auto space-y-4">
              {wrongNotes.map((w: any, i: number) => (
                <div key={i} className="p-5 rounded-2xl bg-[#f9fafb] border border-[#e5e8eb] space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-bold text-[#191f28] leading-relaxed">{w.question?.questionStem}</p>
                    <button onClick={() => removeWrongNote(i)} className="text-[#8b95a1] hover:text-red-500 p-1 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-[#8b95a1] space-y-1">
                    <p>선택한 답: <span className="text-red-500 font-bold">{w.selectedAnswer}번</span></p>
                    <p>정답: <span className="text-green-600 font-bold">{w.question?.correctAnswer}번</span></p>
                  </div>
                  <p className="text-xs text-[#4e5968] leading-relaxed">{w.question?.explanation?.correct}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
