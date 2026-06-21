"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, FileText, CheckCircle2 } from "lucide-react";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [textbook, setTextbook] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [traps, setTraps] = useState<string>("유사 개념 혼동, 조건 누락");
  const [count, setCount] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      setError("OpenAI API 키를 입력해주세요.");
      return;
    }
    if (!textbook) {
      setError("교과서 텍스트를 입력해주세요.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("apiKey", apiKey);
    formData.append("textbookText", textbook);
    formData.append("count", count.toString());
    
    traps.split(",").forEach(trap => {
      if (trap.trim()) formData.append("applyTraps", trap.trim());
    });

    files.forEach(file => {
      formData.append("exams", file);
    });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      
      setResult(data.questions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Hercules AI 🏛️</h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            교과서 지식과 기출문제 패턴을 결합하여 완벽한 쌍둥이 문항을 생성합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column - Inputs */}
          <div className="lg:col-span-5 space-y-6">
            
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-4">
                <CardTitle>1. 설정 (Settings)</CardTitle>
                <CardDescription>OpenAI API 키를 입력하세요. 여러 개인 경우 쉼표(,)로 구분하면 라운드로빈 방식으로 작동하여 효율이 극대화됩니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">OpenAI API Key(s)</Label>
                  <Input 
                    id="apiKey" 
                    type="password" 
                    placeholder="sk-..., sk-..." 
                    value={apiKey} 
                    onChange={e => setApiKey(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-4">
                <CardTitle>2. 학습 데이터 (Knowledge & Patterns)</CardTitle>
                <CardDescription>교과서 내용과 기출문제 PDF를 업로드하세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="textbook">교과서 텍스트 (알맹이)</Label>
                  <Textarea 
                    id="textbook" 
                    placeholder="교과서 본문 내용을 붙여넣으세요..." 
                    className="h-32 resize-none"
                    value={textbook}
                    onChange={e => setTextbook(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exams">기출문제 PDF (껍데기/함정 패턴)</Label>
                  <div className="flex items-center gap-4">
                    <Input id="exams" type="file" accept=".pdf,.txt" multiple onChange={handleFileChange} className="cursor-pointer" />
                  </div>
                  {files.length > 0 && (
                    <p className="text-sm text-slate-500 mt-2">
                      {files.length}개의 파일이 선택되었습니다.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-4">
                <CardTitle>3. 생성 옵션 (Generation)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="traps">강제 적용할 함정 패턴 (쉼표 구분)</Label>
                  <Input 
                    id="traps" 
                    value={traps}
                    onChange={e => setTraps(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="count">생성할 문항 수</Label>
                  <Input 
                    id="count" 
                    type="number" 
                    min="1" max="10" 
                    value={count}
                    onChange={e => setCount(parseInt(e.target.value))}
                  />
                </div>
                
                <Button 
                  onClick={handleGenerate} 
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all duration-200 ease-in-out transform active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      문항 생성 중... (최대 1~2분 소요)
                    </>
                  ) : (
                    "쌍둥이 문항 생성하기"
                  )}
                </Button>
                {error && <p className="text-sm text-red-500 font-medium mt-2">{error}</p>}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-7">
            <Card className="h-full min-h-[600px] shadow-sm border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-500" />
                  생성 결과 뷰어
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {!result && !loading && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 pt-32">
                    <CheckCircle2 className="h-12 w-12 opacity-20" />
                    <p>좌측에서 설정을 완료하고 문제를 생성해보세요.</p>
                  </div>
                )}

                {loading && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-6 pt-32 animate-pulse">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                    <div className="text-center space-y-1">
                      <p className="font-medium text-slate-700">AI가 기출문제를 딥러닝 중입니다...</p>
                      <p className="text-sm">패턴 분석 및 문항 렌더링에 시간이 소요됩니다.</p>
                    </div>
                  </div>
                )}

                {result && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {result.map((q: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                            Question {idx + 1}
                          </span>
                        </div>
                        
                        <div className="text-slate-800 text-lg font-medium leading-relaxed">
                          {q.questionStem}
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg border border-slate-200 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed shadow-inner">
                          {q.stimulus}
                        </div>

                        <div className="space-y-2 mt-4">
                          {q.options?.map((opt: string, oIdx: number) => (
                            <div 
                              key={oIdx} 
                              className={\`p-3 rounded-lg border text-sm flex items-start gap-3 \${(oIdx + 1) === q.correctAnswer ? 'bg-indigo-50 border-indigo-200 font-medium text-indigo-900' : 'bg-white border-slate-200 text-slate-700'}\`}
                            >
                              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 text-xs flex-shrink-0">
                                {oIdx + 1}
                              </span>
                              <span className="pt-0.5">{opt}</span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-6 p-4 rounded-lg bg-green-50 border border-green-100">
                          <h4 className="font-bold text-green-800 text-sm mb-2">해설 및 정답 ({q.correctAnswer}번)</h4>
                          <p className="text-sm text-green-700 leading-relaxed mb-3"><strong>정답 이유:</strong> {q.explanation?.correct}</p>
                          <div className="space-y-1">
                            <strong className="text-sm text-green-800">적용된 함정 (Traps):</strong>
                            <ul className="list-disc pl-5 text-sm text-green-700 space-y-1">
                              {q.explanation?.traps?.map((t: string, i: number) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
