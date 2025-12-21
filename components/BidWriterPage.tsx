"use client";

import { useState } from "react";
import type React from "react";
import Link from "next/link";
import { Upload, FileText, Loader2, ClipboardCopy } from "lucide-react";
	import { Button } from "@/components/ui/button";
	import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
	import { Language } from "@/types";

export default function BidWriterPage({ lang }: { lang: Language }) {
  const [rfpFile, setRfpFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [draft, setDraft] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const lowerName = selected.name.toLowerCase();
    if (lowerName.endsWith(".doc") && !lowerName.endsWith(".docx")) {
      setRfpFile(null);
      setDraft("");
      setError(
        "当前在线版本暂不支持直接解析 .doc，请先在本地另存为 .docx 或导出为 PDF 后再上传。This online version does not currently support parsing .doc files directly. Please save the file as .docx or export it to PDF locally before uploading.",
      );
      try {
        (e.target as HTMLInputElement).value = "";
      } catch {}
      return;
    }

    setRfpFile(selected);
    setError("");
    setDraft("");
  };

	  const handleGenerate = async () => {
	    if (!rfpFile) return;

	    // Authentication is not required for bid draft generation in the current low-volume phase.
	    setLoading(true);
    setError("");
    setDraft("");
    setCopied(false);

    try {
      const formData = new FormData();
      formData.append("rfp_file", rfpFile);
      formData.append("model", "default");
      formData.append("lang", lang);

	      const res = await fetch("/api/generate-bid", { method: "POST", body: formData });
	      if (!res.ok) {
	        let message: string;
	        let data: any = null;
	        try {
	          data = await res.json();
	        } catch {}

	        if (res.status === 413) {
	          message =
	            lang === "zh"
	              ? "文件太大，超过当前在线版本的上传大小上限。建议控制在 100MB 以内，或拆分为多个文件后再上传。"
	              : "File is too large for the current online version. Please keep each file under 100MB or split it into multiple documents.";
	        } else {
	          message =
	            data?.error || (lang === "zh" ? "生成投标文件失败，请稍后重试" : "Failed to generate bid draft, please try again later");
	        }

	        throw new Error(message);
	      }

      const data = await res.json();
      setDraft((data?.draft as string) || "");
    } catch (err: any) {
      console.error("Bid writer error:", err);
      setError(err?.message || (lang === "zh" ? "生成投标文件失败，请稍后重试" : "Failed to generate bid draft, please try again later"));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("copy failed", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
	      <div className="container mx-auto px-4 py-8 space-y-8">
	        {/* 顶部导航：返回首页（暂不显示登录 / 积分区） */}
	        <div className="flex items-center justify-between max-w-5xl mx-auto mb-4 gap-4">
	          <Link href={"/"} className="flex items-center text-sm text-slate-600 hover:text-blue-600">
	            <span className="mr-1 text-base">←</span>
	            <span>{lang === "zh" ? "返回首页" : "Back to home"}</span>
	          </Link>
	          <div className="flex items-center gap-4">
	            {/* 右侧暂不显示登录 / 积分信息，后续如需可再开启 */}
	          </div>
	        </div>

        {/* 标题区 */}
        <header className="max-w-3xl mx-auto text-center space-y-3">
          <h1 className="text-4xl font-bold text-slate-900">
            {lang === "zh" ? "根据招标文件自动生成投标文件 (AI Bid Writer)" : "Generate Bid Proposal from RFP (AI Bid Writer)"}
          </h1>
          <p className="text-slate-600 text-base max-w-2xl mx-auto">
            {lang === "zh"
              ? "上传一份招标文件，AI 会帮你草拟一份完整的中文投标文件正文，你可以再在 Word 里继续修改、排版。"
              : "Upload your RFP and the AI will draft a complete English proposal that you can further refine and format in Word."}
          </p>
        </header>

        {/* 上传区 */}
        <div className="max-w-3xl mx-auto mt-8">
          <Card className="border border-dashed border-slate-300 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-base">
                  {lang === "zh" ? "招标文件 (RFP)" : "RFP document"}
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-600">
                {lang === "zh"
                  ? "上传完整的招标文件（建议 PDF 或 Word .docx），AI 会基于其中的关键要求生成一份投标文件草稿。"
                  : "Upload the full RFP (PDF or Word .docx). The AI will use it to draft a proposal aligned with the key requirements."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 rounded-xl px-4 py-6 cursor-pointer hover:border-blue-500 bg-slate-50/60">
                <Upload className="w-6 h-6 text-slate-500" />
                <div className="text-sm font-medium text-slate-800">
                  {rfpFile
                    ? rfpFile.name
                    : lang === "zh"
                      ? "点击或拖拽上传招标文件"
                      : "Click or drag to upload RFP"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {lang === "zh"
                    ? "支持 PDF / Word (.docx)，建议控制在 100MB 以内"
                    : "PDF / Word (.docx), recommended size ≤ 100MB"}
                </div>
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <div className="flex justify-end">
                <Button onClick={handleGenerate} disabled={!rfpFile || loading} size="sm">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {lang === "zh" ? "生成投标文件草稿" : "Generate bid draft"}
                </Button>
              </div>
              {error && (
	                <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
	                  <p>{error}</p>
	                  <p className="mt-1 text-xs text-red-500">
	                    {lang === "zh"
	                      ? "如果你遇到持续的错误或需要帮助，可以发送邮件到 edwin.z.w@qq.com。"
	                      : "If you keep seeing errors or need help, you can email me at edwin.z.w@qq.com."}
	                  </p>
	                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 结果展示区 */}
        {draft && (
          <div className="max-w-5xl mx-auto mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {lang === "zh" ? "生成的投标文件草稿" : "Generated bid draft"}
              </h2>
              <Button variant="outline" size="sm" onClick={handleCopy} className="inline-flex items-center gap-1">
                <ClipboardCopy className="w-4 h-4" />
                <span>{copied ? (lang === "zh" ? "已复制" : "Copied") : lang === "zh" ? "复制全文" : "Copy all"}</span>
              </Button>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 max-h-[600px] overflow-auto text-sm whitespace-pre-wrap leading-relaxed text-slate-800">
              {draft}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

