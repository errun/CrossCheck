"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload, FileText, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import type { ComplianceMatrixItem, Language } from "@/types";
import { downloadMatrixAsExcel } from "@/lib/exportMatrix";

const faqContent = {
  zh: {
    title: "常见问题：合规矩阵与 RFP 提取",
    q1: "什么是合规矩阵？",
    a1: "合规矩阵是把 RFP 中的必须/应条款结构化成表格，用于逐条核对是否满足、在哪一处响应，方便内部评审和投标合规检查。",
    q2: "为什么这里只需要上传 RFP？",
    a2: "该页面只负责从 RFP 中提取必须/应条款，不会分析投标文件本身。你可以在下载的 Excel 里手动填写每一条在方案中的响应位置。",
    q3: "导出的 Excel 可以怎么用？",
    a3: "导出的 Excel 包含要求原文、章节号、合规性和备注列，你可以把它作为内部评审 checklist、评审记录或投标项目档案的一部分保存。",
  },
  en: {
    title: "FAQ: RFP Compliance Matrix",
    q1: "What is a compliance matrix?",
    a1: "A compliance matrix turns the mandatory 'must/shall' requirements from your RFP into a structured table so you can verify for each line whether you comply and where it is addressed in your proposal.",
    q2: "Why do I only upload the RFP here?",
    a2: "This page focuses on extracting mandatory requirements from the RFP itself. You can then use the exported Excel to manually map each requirement to the relevant sections in your proposal.",
    q3: "How should I use the exported Excel file?",
    a3: "The Excel file includes requirement text, reference section, compliance (Y/N) and comments columns. You can use it as an internal review checklist or as part of your bid documentation.",
  },
} as const;

export default function ComplianceMatrixPage({
  lang,
}: {
  lang: Language;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<ComplianceMatrixItem[]>([]);
  const [complyMap, setComplyMap] = useState<Record<number, string>>({});
	  const [commentMap, setCommentMap] = useState<Record<number, string>>({});

  const faq = faqContent[lang];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: faq.q1,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a1,
        },
      },
      {
        "@type": "Question",
        name: faq.q2,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a2,
        },
      },
      {
        "@type": "Question",
        name: faq.q3,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a3,
        },
      },
    ],
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const lowerName = selected.name.toLowerCase();
    // 如果是旧版 .doc（而不是 .docx），前端直接提示暂不支持
    if (lowerName.endsWith(".doc") && !lowerName.endsWith(".docx")) {
      setFile(null);
      setItems([]);
      setError(
        "当前在线版本暂不支持直接解析 .doc，请先在本地另存为 .docx 或导出为 PDF 后再上传。This online version does not currently support parsing .doc files directly. Please save the file as .docx or export it to PDF locally before uploading.",
      );
      try {
        (e.target as HTMLInputElement).value = "";
      } catch {}
      return;
    }

    setFile(selected);
    setError("");
    setItems([]);
  };

	  const handleGenerate = async () => {
	    if (!file) return;

	    // Authentication is not required for compliance matrix generation in the current low-volume phase.
	    setLoading(true);
    setError("");
    setItems([]);
    setComplyMap({});
    setCommentMap({});

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", "default");
      formData.append("mode", "matrix");
      formData.append("lang", lang);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

	      if (!res.ok) {
	        const data = await res.json().catch(() => null);

	        throw new Error(
	          data?.error ||
	            (lang === "zh"
	              ? "分析失败，请稍后重试"
	              : "Analysis failed, please try again later"),
	        );
	      }

      const data = await res.json();
      setItems((data.items || []) as ComplianceMatrixItem[]);
    } catch (err: any) {
      console.error("Compliance matrix error:", err);
      if (err?.message) {
        setError(err.message);
      } else {
        setError(
          lang === "zh"
            ? "分析失败，请稍后重试"
            : "Analysis failed, please try again later",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!items.length) return;
    downloadMatrixAsExcel(items, { complyMap, commentMap });
  };

  const handleComplyChange = (id: number, value: string) => {
    setComplyMap((prev) => ({ ...prev, [id]: value }));
  };

  const handleCommentChange = (id: number, value: string) => {
    setCommentMap((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
	      <div className="container mx-auto px-4 py-8 space-y-8">
	        {/* 顶部导航：返回首页 + 语言切换（暂不显示登录 / 积分区域） */}
	        <div className="flex items-center justify-between max-w-5xl mx-auto mb-4 gap-4">
	          <Link
	            href={lang === "zh" ? "/zh" : "/"}
	            className="flex items-center text-sm text-slate-600 hover:text-blue-600"
	          >
	            <span className="mr-1 text-base">←</span>
	            <span>{lang === "zh" ? "返回首页" : "Back to home"}</span>
	          </Link>
	          <div className="flex items-center gap-4">
	            <div className="inline-flex rounded-full bg-white/60 p-1 shadow-sm border border-slate-200">
	              <Link
	                href="/zh/compliance-matrix"
	                className={`px-3 py-1 rounded-full text-sm border ${
	                  lang === "zh"
	                    ? "bg-blue-600 text-white border-blue-600"
	                    : "bg-white text-gray-700 border-gray-300"
	                }`}
	              >
	                中文
	              </Link>
	              <Link
		                href="/compliance-matrix?lang=en"
	                className={`ml-1 px-3 py-1 rounded-full text-sm border ${
	                  lang === "en"
	                    ? "bg-blue-600 text-white border-blue-600"
	                    : "bg-white text-gray-700 border-gray-300"
	                }`}
	              >
	                English
	              </Link>
	            </div>
	          </div>
	        </div>

        {/* Hero 区域 */}
        <header className="max-w-3xl mx-auto text-center space-y-3">
          <h1 className="text-4xl font-bold text-slate-900">
            {lang === "zh"
              ? "AI RFP 合规矩阵生成器 (AI RFP Compliance Matrix Generator)"
              : "Create an RFP Compliance Matrix in Seconds"}
          </h1>
          <p className="text-xl font-semibold text-blue-700">
            From PDF to Compliance Matrix in 30 Seconds.
          </p>
          <p className="text-slate-600 text-lg">
            {lang === "zh"
              ? "瞬间从您的 RFP 中提取强制性要求，自动生成 Excel 检查表。"
              : "Instantly extract mandatory 'must/shall' requirements from your RFP and generate an Excel compliance checklist."}
          </p>
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            {lang === "zh"
              ? "Compliance Matrix Generator for RFP Requirements"
              : "Compliance matrix generator for RFP requirements"}
          </p>
        </header>

        <section className="max-w-5xl mx-auto grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              {lang === "zh"
                ? "RFP 合规矩阵如何生成"
                : "How the RFP Compliance Matrix is generated"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {lang === "zh"
                ? "上传 PDF 或 Word，系统会进行 RFP 拆解（RFP shredding），提取“必须/应当”条款并整理为合规矩阵。"
                : "Upload a PDF or Word file and the AI performs RFP shredding to extract mandatory must/shall requirements into a structured RFP Compliance Matrix."}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              {lang === "zh"
                ? "Excel 导出与 proposal 协作"
                : "Excel checklist for proposal teams"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {lang === "zh"
                ? "Excel 包含要求原文、章节/页码、合规性和备注，方便 proposal 团队快速定位响应位置。"
                : "The Excel export includes requirement text, section/page, compliance status, and comments so proposal teams can map responses quickly."}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              {lang === "zh"
                ? "合规与风险评估"
                : "Compliance vs. risk assessment"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {lang === "zh"
                ? "此页面专注合规矩阵生成，如需投标风险评估与标书分析，请使用 bid checker。"
                : "This page focuses on compliance matrix generation. For bid risk assessment and deeper proposal analysis, use the bid checker."}
            </p>
          </div>
        </section>

        {/* 上传区域 */}
        <Card className="max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle>{lang === "zh" ? "上传 RFP 文档" : "Upload RFP document"}</CardTitle>
            <CardDescription>
              <p>
                {lang === "zh"
                  ? "仅上传 RFP 文件，支持 PDF / Word (.docx)，单文件最大 50MB。"
                  : "Upload only the RFP document. Supports PDF / Word (.docx), up to 50MB per file."}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {lang === "zh"
                  ? "如为 .doc，请先在本地另存为 .docx 或导出为 PDF 后再上传。This online version does not currently support parsing .doc files directly."
                  : "If your file is .doc instead of .docx, please convert it to .docx or export it to PDF locally before uploading. This online version does not currently support parsing .doc files directly."}
              </p>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors bg-slate-50">
                <input
                  id="rfp-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="rfp-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <FileText className="h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-sm text-slate-600">
                    {file
                      ? file.name
                      : lang === "zh"
                        ? "点击选择 RFP 文档 (PDF / Word)"
                        : "Click to select RFP document (PDF / Word)"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {lang === "zh"
                      ? "不需要上传投标文件，仅分析 RFP 中的必须/应条款。"
                      : "No proposal file is required. The AI only analyses mandatory 'must/shall' clauses from the RFP."}
                  </p>
                </label>
              </div>

	              {error && (
	                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 space-y-1">
	                  <p>{error}</p>
	                  <a
	                    href="mailto:edwin.z.w@qq.com"
	                    className="inline-block underline underline-offset-2 text-rose-800 hover:text-rose-900"
	                  >
	                    {lang === "zh"
	                      ? "点击这里给我发邮件：edwin.z.w@qq.com"
	                      : "Click here to email me: edwin.z.w@qq.com"}
	                  </a>
	                  <div className="pt-1">
	                    <p className="text-xs mb-1">
	                      {lang === "zh"
	                        ? "也可以微信扫码联系我："
	                        : "Or scan this WeChat QR code to contact me:"}
	                    </p>
	                    <img
	                      src="/wechat-qr.png"
	                      alt="WeChat QR code"
	                      className="h-20 w-20 rounded-md border border-rose-200 bg-white"
	                    />
	                  </div>
	                </div>
	              )}

              <Button
                onClick={handleGenerate}
                disabled={!file || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {lang === "zh"
                      ? "正在提取强制性要求..."
                      : "Extracting mandatory requirements..."}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    {lang === "zh" ? "生成矩阵" : "Generate matrix"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 结果视图 */}
        {items.length > 0 && (
          <Card className="max-w-5xl mx-auto bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <CardTitle>合规矩阵</CardTitle>
                <CardDescription>
                  从 RFP 中共提取出 {items.length} 条强制性要求，可在此标记合规性并导出 Excel。
                </CardDescription>
              </div>
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                disabled={!items.length}
              >
                <Download className="mr-2 h-4 w-4" />
                下载 Excel 合规矩阵
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead>要求原文</TableHead>
                    <TableHead className="w-32">章节号</TableHead>
                    <TableHead className="w-28 text-center">
                      合规性 (Compliance Y/N)
                    </TableHead>
                    <TableHead className="w-64">备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs text-slate-500">
                        {item.id}
                      </TableCell>
                      <TableCell className="text-sm text-slate-800 max-w-xl">
                        {item.text}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                        {item.section || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <select
                          value={complyMap[item.id] ?? ""}
                          onChange={(e) => handleComplyChange(item.id, e.target.value)}
                          className="mx-auto block h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">未选择</option>
                          <option value="Y">是 (Y)</option>
                          <option value="N">否 (N)</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <input
                          type="text"
                          value={commentMap[item.id] ?? ""}
                          onChange={(e) => handleCommentChange(item.id, e.target.value)}
                          placeholder="可选：记录补充说明、整改计划等"
                          className="w-full h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableCaption>
                  提示：导出的 Excel 文件包含列 ID, RFP Requirement, Reference Section/Page, Comply (Yes/No), Comments / Proposal Reference。
                </TableCaption>
              </Table>
            </CardContent>
          </Card>
        )}

        {lang === "en" && (
          <section
            className="max-w-5xl mx-auto mt-12"
            aria-label="Compliance matrix guide"
          >
            <div className="space-y-10">
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  What is an RFP Compliance Matrix?
                </h2>
                <p className="text-slate-700 leading-relaxed">
                  A <strong>Compliance Matrix</strong> is a structured table
                  that maps every mandatory requirement in an RFP to how your
                  team will respond. In formal bids, the{" "}
                  <strong>RFP Compliance Matrix</strong> becomes the single
                  source of truth for what must be answered, where it appears
                  in the RFP, and which part of the proposal addresses it.
                  Proposal managers and bid writers rely on it to align scope,
                  expose gaps early, and keep reviewers focused on what
                  evaluators will score.
                </p>
                <p className="text-slate-700 leading-relaxed">
                  Most teams build the matrix during{" "}
                  <strong>Shredding an RFP</strong>, when they scan the document
                  for obligation language and capture the{" "}
                  <strong>Must/Shall requirements</strong>. The output is
                  typically an <strong>Excel compliance checklist</strong> that
                  supports ownership, status tracking, and evidence collection.
                  A strong matrix reduces the risk of missing hidden
                  requirements buried in appendices or special instructions and
                  keeps the <strong>RFP response process</strong> on schedule.
                </p>
                <ul className="list-disc pl-6 text-slate-700 leading-relaxed">
                  <li>Requirement ID for traceability</li>
                  <li>Verbatim requirement text and intent</li>
                  <li>Source section or page reference</li>
                  <li>Compliance decision (Y/N/Partial)</li>
                  <li>Response owner, evidence, and notes</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  The Pain of Manual Processing
                </h2>
                <p className="text-slate-700 leading-relaxed">
                  Manual compliance extraction is slow and brittle. Teams often
                  rely on Ctrl+F to find words like shall, must, or will, then
                  copy and paste lines into a spreadsheet. When the RFP is 200
                  pages or includes multiple attachments, this kind of
                  Shredding an RFP can take hours, and every revision risks
                  missing a clause or duplicating a requirement.
                </p>
                <p className="text-slate-700 leading-relaxed">
                  Besides the time cost, manual work introduces inconsistency
                  across reviewers. The same requirement may be paraphrased
                  differently, and important context can be lost when text is
                  copied without its section reference. These errors cascade
                  through the proposal, forcing late rework and creating
                  compliance risk.
                </p>
                <ul className="list-disc pl-6 text-slate-700 leading-relaxed">
                  <li>Missed requirements after addenda and Q&amp;A updates</li>
                  <li>Duplicate rows from multiple reviewers</li>
                  <li>Unclear ownership for compliance decisions</li>
                  <li>Delayed writing while the matrix is rebuilt</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  Why You Need an Automated Compliance Matrix Generator
                </h2>
                <p className="text-slate-700 leading-relaxed">
                  An AI-powered generator like RFPAI replaces the most tedious
                  step with automation. Upload a PDF or Word file and the system
                  converts content from PDF to Excel, producing a structured
                  matrix in minutes. This is practical{" "}
                  <strong>Proposal management automation</strong> that helps
                  teams save time on setup and focus on strategy, positioning,
                  and win themes.
                </p>

                <h3 className="text-xl font-semibold text-slate-900 mt-6">
                  Speed and repeatability
                </h3>
                <p className="text-slate-700 leading-relaxed">
                  Because the AI reads the full document, it extracts every
                  Must/Shall requirement consistently and returns the same
                  structure across bids. You can rerun the process when an
                  addendum arrives and get a refreshed matrix instead of
                  rebuilding from scratch, which keeps schedules predictable.
                </p>

                <h3 className="text-xl font-semibold text-slate-900 mt-6">
                  Accuracy and auditability
                </h3>
                <p className="text-slate-700 leading-relaxed">
                  Automated extraction keeps verbatim requirement text and
                  references intact, reducing paraphrase errors. Reviewers can
                  trace each line item back to its source and document why the
                  team marked it compliant or not. A defensible{" "}
                  <strong>Compliance Matrix</strong> supports internal reviews
                  and reduces compliance surprises.
                </p>

                <h3 className="text-xl font-semibold text-slate-900 mt-6">
                  Collaboration and accountability
                </h3>
                <p className="text-slate-700 leading-relaxed">
                  The output doubles as an Excel compliance checklist that is
                  easy to assign to subject matter experts. Columns for owner,
                  evidence, and status make it clear who responds to each
                  requirement, and the matrix becomes the shared view for the
                  whole bid team.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  Key Columns in a Standard Matrix
                </h2>
                <p className="text-slate-700 leading-relaxed">
                  A practical matrix is more than a list of obligations. It is
                  a living document that lets you filter, sort, and track
                  progress during the proposal cycle. The columns below are a
                  solid baseline for any <strong>RFP Compliance Matrix</strong>{" "}
                  and align well with typical review workflows.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-slate-200 text-sm">
                    <caption className="caption-bottom text-slate-500 mt-2">
                      Standard fields used in an Excel compliance checklist
                    </caption>
                    <thead>
                      <tr>
                        <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-800">
                          Column
                        </th>
                        <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-800">
                          Purpose
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-200">
                        <td className="px-3 py-2 text-slate-700">
                          Requirement ID
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          Unique traceability for every clause
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200">
                        <td className="px-3 py-2 text-slate-700">
                          Requirement text
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          Verbatim requirement from the RFP
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200">
                        <td className="px-3 py-2 text-slate-700">
                          Source section/page
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          Location for reviewer validation
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200">
                        <td className="px-3 py-2 text-slate-700">
                          Requirement type
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          Must, shall, will, or other obligation
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200">
                        <td className="px-3 py-2 text-slate-700">
                          Compliance status
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          Y/N/Partial decision for each line
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200">
                        <td className="px-3 py-2 text-slate-700">
                          Response owner
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          Person or team accountable for response
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200">
                        <td className="px-3 py-2 text-slate-700">
                          Proposal reference
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          Section or evidence that satisfies it
                        </td>
                      </tr>
                      <tr className="border-t border-slate-200">
                        <td className="px-3 py-2 text-slate-700">
                          Risks or comments
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          Notes, assumptions, or clarifications needed
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  With these fields, teams can filter by owner, sort by risk,
                  and create a clear audit trail. The structure also supports
                  downstream QA, where reviewers validate that each requirement
                  is addressed in the correct location.
                </p>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900">FAQ</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      How does RFPAI perform Shredding an RFP?
                    </h3>
                    <p className="mt-2 text-slate-700 leading-relaxed">
                      The AI scans PDF or Word files for obligation language
                      like must, shall, will, and required, preserves the exact
                      sentence, and outputs an Excel-ready matrix with section
                      references so you move from PDF to Excel quickly.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Is the Compliance Matrix the same as a checklist?
                    </h3>
                    <p className="mt-2 text-slate-700 leading-relaxed">
                      A checklist lists requirements; a matrix adds ownership,
                      compliance decisions, and proposal references. That extra
                      context is why the <strong>Compliance Matrix</strong> is
                      more useful for audits.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      How should we treat Must/Shall requirements?
                    </h3>
                    <p className="mt-2 text-slate-700 leading-relaxed">
                      Treat them as compliance-critical. Mark Y/N/Partial, add
                      notes for risks or clarifications, and route unresolved
                      items to the Q&amp;A log to protect the{" "}
                      <strong>RFP response process</strong>.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Who should own the matrix during proposal development?
                    </h3>
                    <p className="mt-2 text-slate-700 leading-relaxed">
                      The proposal manager should maintain the master file
                      while subject matter experts update assigned rows. This
                      keeps accountability clear and enables{" "}
                      <strong>Proposal management automation</strong> across
                      the team.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Does automation replace proposal writers?
                    </h3>
                    <p className="mt-2 text-slate-700 leading-relaxed">
                      No. Automation handles extraction and structure, while
                      writers craft strategy, differentiators, and evidence.
                      The goal is to save time on busywork, not replace
                      expertise.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      When should we refresh the matrix?
                    </h3>
                    <p className="mt-2 text-slate-700 leading-relaxed">
                      Re-run it after each amendment, Q&amp;A release, or scope
                      change. Keeping the Excel compliance checklist current
                      prevents missed requirements during final reviews.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section className="max-w-5xl mx-auto mt-12 bg-white/80 rounded-2xl shadow-sm border border-slate-200">
          <div className="px-6 py-6 md:px-8 md:py-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              {faq.title}
            </h2>
            <div className="space-y-6 text-sm md:text-base text-slate-700">
              <div>
                <h3 className="font-semibold text-slate-900">{faq.q1}</h3>
                <p className="mt-1">{faq.a1}</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{faq.q2}</h3>
                <p className="mt-1">{faq.a2}</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{faq.q3}</h3>
                <p className="mt-1">{faq.a3}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
