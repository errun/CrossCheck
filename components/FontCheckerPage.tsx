"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload, FileText, AlertCircle, Flame, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { Language } from "@/types";

type FontStatus = "ok" | "warning" | "banned";

interface FontIssue {
  font: string;
  status: FontStatus;
  reason: string;
}

export default function FontCheckerPage({ lang }: { lang: Language }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fontsDetected, setFontsDetected] = useState<string[]>([]);
  const [issues, setIssues] = useState<FontIssue[]>([]);
  const [complianceScore, setComplianceScore] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // 限制 10MB
    const maxBytes = 10 * 1024 * 1024;
    if (selected.size > maxBytes) {
      setFile(null);
      setError("Max file size is 10MB. Please upload a smaller document.");
      setFontsDetected([]);
      setIssues([]);
      setComplianceScore(null);
      setRecommendations([]);
      try {
        (e.target as HTMLInputElement).value = "";
      } catch {}
      return;
    }

    setFile(selected);
    setError("");
    setFontsDetected([]);
    setIssues([]);
    setComplianceScore(null);
    setRecommendations([]);
  };

  // P0: 使用前端 mock，让页面有完整的 UI 体验，后续 P1 再接入真实 /api/font-check
  const handleMockCheck = async () => {
    if (!file) return;

    setLoading(true);
    setError("");
    setFontsDetected([]);
    setIssues([]);
    setComplianceScore(null);
    setRecommendations([]);

    try {
      // 简单模拟一次分析结果，仅用于 MVP UI 展示
      await new Promise((resolve) => setTimeout(resolve, 600));

      const mockFonts = ["Calibri", "Times New Roman", "Arial"];
      const mockIssues: FontIssue[] = [
        {
          font: "Calibri",
          status: "banned",
          reason: "Banned by State Department (Dec 2024) as too woke.",
        },
        {
          font: "Times New Roman",
          status: "ok",
          reason: "Traditional serif font, widely used as a government standard.",
        },
        {
          font: "Arial",
          status: "warning",
          reason: "Sans-serif font. Consider upgrading to an official serif font for formal submissions.",
        },
      ];

      setFontsDetected(mockFonts);
      setIssues(mockIssues);
      setComplianceScore(42);
      setRecommendations([
        "Replace Calibri with Times New Roman in all body text.",
        "Use Times New Roman or another approved serif font for headings and key sections.",
      ]);
    } catch (err: any) {
      console.error("Mock font check error:", err);
      setError("Font check failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* 顶部返回 + 标题区域 */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <Link
            href={lang === "zh" ? "/zh" : "/"}
            className="flex items-center text-sm text-slate-600 hover:text-blue-600"
          >
            <span className="mr-1 text-base">←</span>
            <span>{lang === "zh" ? "返回首页" : "Back to home"}</span>
          </Link>
        </div>

        {/* Hero & 热点说明 */}
        <header className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400 px-4 py-1 text-xs font-semibold text-white shadow-sm">
            <Flame className="h-3 w-3" />
            <span>HOT · Calibri banned</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
            Font Wars: Is Your Document Government-Approved?
          </h1>
          <p className="text-base md:text-lg text-slate-700 font-medium">
            After Rubio banned Calibri as too woke, check your font compliance in seconds.
          </p>
          <p className="text-sm text-slate-500 max-w-2xl mx-auto">
            Upload a recent proposal, memo, or policy draft to see which fonts you are using and whether they
            align with emerging government guidelines.
          </p>
        </header>

        {/* 主体区域：左侧上传 + 右侧结果预览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* 上传卡片 */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle>Upload document</CardTitle>
              <CardDescription>PDF or Word (.docx), up to 10MB.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors bg-slate-50">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="font-file-upload"
                />
                <label htmlFor="font-file-upload" className="cursor-pointer block">
                  <FileText className="mx-auto h-10 w-10 text-slate-400 mb-3" />
                  <p className="text-sm text-slate-600">
                    {file ? file.name : "Click to choose a document"}
                  </p>
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  We don&apos;t store your files. Analysis is performed ephemerally.
                </p>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2 text-sm text-rose-700">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <Button
                onClick={handleMockCheck}
                disabled={!file || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-pulse" />
                    Checking fonts...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Check My Document Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 结果预览卡片（mock） */}
          <Card className="bg-slate-900 text-white border-slate-800 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>Font compliance snapshot</span>
              </CardTitle>
              <CardDescription className="text-slate-200">
                Preview of what your font compliance report will look like.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-slate-200 mb-1">Fonts detected</p>
                <p className="text-xs text-slate-300">
                  {fontsDetected.length
                    ? fontsDetected.join(", ")
                    : "Upload a document and run the check to see detected fonts here."}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-slate-200 mb-1">Issues</p>
                {issues.length === 0 ? (
                  <p className="text-xs text-slate-300">
                    No issues yet. After you run a check, this section will highlight banned and risky fonts.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {issues.map((issue) => (
                      <li
                        key={issue.font}
                        className="flex items-start gap-2 text-xs"
                      >
                        <span
                          className={
                            issue.status === "banned"
                              ? "mt-0.5 h-2 w-2 rounded-full bg-rose-400"
                              : issue.status === "warning"
                              ? "mt-0.5 h-2 w-2 rounded-full bg-amber-300"
                              : "mt-0.5 h-2 w-2 rounded-full bg-emerald-300"
                          }
                        />
                        <div>
                          <p className="font-semibold">
                            {issue.font} — {issue.status.toUpperCase()}
                          </p>
                          <p className="text-slate-200/90">{issue.reason}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-slate-200 mb-1">Compliance score</p>
                <p className="text-xs text-slate-300">
                  {complianceScore !== null
                    ? `${complianceScore}/100 (higher is better)`
                    : "We will estimate a simple 0–100 score based on banned vs approved fonts."}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-slate-200 mb-1">Recommendations</p>
                {recommendations.length === 0 ? (
                  <p className="text-xs text-slate-300">
                    Once the checker is fully wired, you&apos;ll see concrete replacement suggestions here.
                  </p>
                ) : (
                  <ul className="list-disc list-inside text-xs text-slate-200/90">
                    {recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 补充说明区域 */}
        <section className="mt-4">
          <Card className="bg-white/90 border-slate-200 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm md:text-base">
                Why fonts suddenly matter for compliance
              </CardTitle>
              <CardDescription>
                Calibri being labeled as too woke is a symptom of a larger trend: formal documents are under
                increasing political and procedural scrutiny. This tool helps you quickly see if your typography
                choices might raise eyebrows.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </div>
    </div>
  );
}
