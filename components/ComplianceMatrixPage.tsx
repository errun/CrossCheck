"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Upload,
  FileText,
  Loader2,
  Download,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Users,
  AlertTriangle,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";
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
import type { Language, MatrixItem } from "@/types";
import {
  downloadEnterpriseMatrix,
  downloadGovMatrix,
} from "@/lib/exportMatrix";

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
  const [items, setItems] = useState<MatrixItem[]>([]);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const isZh = lang === "zh";
  const faq = faqContent[lang];
  const faqItems = isZh
    ? [
        { question: faq.q1, answer: faq.a1, answerText: faq.a1 },
        { question: faq.q2, answer: faq.a2, answerText: faq.a2 },
        { question: faq.q3, answer: faq.a3, answerText: faq.a3 },
      ]
    : [
        {
          question: "How does RFPAI perform Shredding an RFP?",
          answer: (
            <>
              The AI scans PDF or Word files for obligation language like must,
              shall, will, and required, preserves the exact sentence, and
              outputs an Excel-ready matrix with section references so you move
              from PDF to Excel quickly.
            </>
          ),
          answerText:
            "The AI scans PDF or Word files for obligation language like must, shall, will, and required, preserves the exact sentence, and outputs an Excel-ready matrix with section references so you move from PDF to Excel quickly.",
        },
        {
          question: "Is the Compliance Matrix the same as a checklist?",
          answer: (
            <>
              A checklist lists requirements; a matrix adds ownership,
              compliance decisions, and proposal references. That extra context
              is why the <strong>Compliance Matrix</strong> is more useful for
              audits.
            </>
          ),
          answerText:
            "A checklist lists requirements; a matrix adds ownership, compliance decisions, and proposal references. That extra context is why the Compliance Matrix is more useful for audits.",
        },
        {
          question: "How should we treat Must/Shall requirements?",
          answer: (
            <>
              Treat them as compliance-critical. Mark Y/N/Partial, add notes for
              risks or clarifications, and route unresolved items to the Q&A log
              to protect the <strong>RFP response process</strong>.
            </>
          ),
          answerText:
            "Treat them as compliance-critical. Mark Y/N/Partial, add notes for risks or clarifications, and route unresolved items to the Q&A log to protect the RFP response process.",
        },
        {
          question: "Who should own the matrix during proposal development?",
          answer: (
            <>
              The proposal manager should maintain the master file while
              subject matter experts update assigned rows. This keeps
              accountability clear and enables{" "}
              <strong>Proposal management automation</strong> across the team.
            </>
          ),
          answerText:
            "The proposal manager should maintain the master file while subject matter experts update assigned rows. This keeps accountability clear and enables Proposal management automation across the team.",
        },
        {
          question: "Does automation replace proposal writers?",
          answer: (
            <>
              No. Automation handles extraction and structure, while writers
              craft strategy, differentiators, and evidence. The goal is to save
              time on busywork, not replace expertise.
            </>
          ),
          answerText:
            "No. Automation handles extraction and structure, while writers craft strategy, differentiators, and evidence. The goal is to save time on busywork, not replace expertise.",
        },
        {
          question: "When should we refresh the matrix?",
          answer: (
            <>
              Re-run it after each amendment, Q&A release, or scope change.
              Keeping the Excel compliance checklist current prevents missed
              requirements during final reviews.
            </>
          ),
          answerText:
            "Re-run it after each amendment, Q&A release, or scope change. Keeping the Excel compliance checklist current prevents missed requirements during final reviews.",
        },
      ];
  const faqTitle = isZh ? faq.title : "FAQ";
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answerText,
      },
    })),
  };
  const comparisonCards = [
    {
      title: isZh ? "速度" : "Speed",
      manual: isZh ? "人工 (4 小时)" : "Manual (4h)",
      ai: isZh ? "AI (2 分钟)" : "AI (2m)",
    },
    {
      title: isZh ? "风险" : "Risk",
      manual: isZh ? "人为错误" : "Human Error",
      ai: isZh ? "100% 覆盖" : "100% Coverage",
    },
    {
      title: isZh ? "可追溯性" : "Traceability",
      manual: isZh ? "上下文丢失" : "Lost Context",
      ai: isZh ? "逐条原文链接" : "Verbatim Links",
    },
  ];
  const mockRows = [
    {
      id: "1",
      text: "Must/Shall requirement",
      compliance: "Y",
      reference: "Proposal reference",
    },
    {
      id: "2",
      text: "Mandatory requirement",
      compliance: "N",
      reference: "Proposal reference",
    },
    {
      id: "3",
      text: "Requirement text",
      compliance: "Partial",
      reference: "Proposal reference",
    },
  ];

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
      setItems((data.items || []) as MatrixItem[]);
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

  const handleDownloadGov = async () => {
    if (!items.length) return;
    try {
      await downloadGovMatrix(items);
    } catch (err: any) {
      console.error("Download Gov template failed:", err);
      setError(
        lang === "zh"
          ? "Gov 模板导出失败，请稍后重试"
          : "Failed to export Gov template, please try again later",
      );
    }
  };

  const handleDownloadEnterprise = async () => {
    if (!items.length) return;
    try {
      await downloadEnterpriseMatrix(items);
    } catch (err: any) {
      console.error("Download Enterprise template failed:", err);
      setError(
        lang === "zh"
          ? "Enterprise 模板导出失败，请稍后重试"
          : "Failed to export Enterprise template, please try again later",
      );
    }
  };

  const updateItem = (requirementId: string, updates: Partial<MatrixItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.requirementId === requirementId ? { ...item, ...updates } : item,
      ),
    );
  };

  const handleComplianceChange = (
    requirementId: string,
    value: MatrixItem["complianceStatus"],
  ) => {
    updateItem(requirementId, { complianceStatus: value || "" });
  };

  const handleCommentChange = (requirementId: string, value: string) => {
    updateItem(requirementId, { commentsNotes: value });
  };

  const handleToggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  const handleScrollToUpload = () => {
    if (typeof document === "undefined") return;
    const target = document.getElementById("upload");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="space-y-0">
        <section className="bg-white px-4 py-8 md:px-20 md:py-16">
          <div className="mx-auto max-w-6xl space-y-10">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
              <Link
                href={lang === "zh" ? "/zh" : "/"}
                className="flex items-center text-sm text-slate-600 hover:text-[#0066CC]"
              >
                <span className="mr-1 text-base">←</span>
                <span>{lang === "zh" ? "返回首页" : "Back to home"}</span>
              </Link>
              <div className="flex items-center gap-4">
                <div className="inline-flex rounded-full bg-white p-1 shadow-sm border border-slate-200">
                  <Link
                    href="/zh/compliance-matrix"
                    className={`px-3 py-1 rounded-full text-sm border ${
                      lang === "zh"
                        ? "bg-[#0066CC] text-white border-[#0066CC]"
                        : "bg-white text-slate-600 border-slate-300"
                    }`}
                  >
                    中文
                  </Link>
                  <Link
                    href="/compliance-matrix?lang=en"
                    className={`ml-1 px-3 py-1 rounded-full text-sm border ${
                      lang === "en"
                        ? "bg-[#0066CC] text-white border-[#0066CC]"
                        : "bg-white text-slate-600 border-slate-300"
                    }`}
                  >
                    English
                  </Link>
                </div>
              </div>
            </div>

            <div className="max-w-4xl mx-auto text-center space-y-4">
              <h1 className="text-3xl md:text-5xl font-bold text-slate-900">
                {lang === "zh"
                  ? "秒级生成合规矩阵 'Draft Zero' 初稿"
                  : "Generate Your Compliance Matrix 'Draft Zero' in Seconds."}
              </h1>
              <p className="text-base md:text-lg text-slate-600">
                {lang === "zh"
                  ? "停止复制粘贴，立即提取“必须/应当”条款并生成可编辑的 Excel 检查表。"
                  : "Stop copy-pasting. Instantly extract 'Must/Shall' requirements into an editable Excel checklist."}
              </p>
            </div>

            <Card
              id="upload"
              className="w-full max-w-2xl mx-auto bg-white border border-slate-200 shadow-2xl rounded-2xl"
            >
              <CardHeader className="space-y-2 p-4 md:p-8">
                <CardTitle className="text-slate-900">
                  {lang === "zh" ? "上传 RFP 文档" : "Upload RFP document"}
                </CardTitle>
	                <CardDescription className="text-xs text-slate-600">
	                  {lang === "zh"
	                    ? "如为 .doc，请先在本地另存为 .docx 或导出为 PDF 后再上传。This online version does not currently support parsing .doc files directly."
	                    : "If your file is .doc instead of .docx, please convert it to .docx or export it to PDF locally before uploading. This online version does not currently support parsing .doc files directly."}
	                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 md:p-8 md:pt-0">
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 md:p-8 text-center hover:border-[#0066CC] transition-colors bg-[#F8F9FA]">
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
                      <FileText className="h-10 w-10 text-slate-400 mb-3" />
                      <p className="text-sm text-slate-600">
                        {file
                          ? file.name
                          : lang === "zh"
                            ? "点击选择 RFP 文档 (PDF / Word)"
                            : "Click to select RFP document (PDF / Word)"}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {lang === "zh"
                          ? "不需要上传投标文件，仅分析 RFP 中的必须/应条款。"
                          : "No proposal file is required. The AI only analyses mandatory 'must/shall' clauses from the RFP."}
                      </p>
                    </label>
                  </div>

                  {error && (
                    <div className="text-sm text-rose-700 bg-white border border-rose-200 rounded-md px-3 py-2 space-y-1">
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
                    className="w-full bg-[#0066CC] hover:bg-[#005BB8] text-white"
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

                  <div className="flex flex-wrap items-center justify-center text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-[#0066CC]" />
                      {lang === "zh" ? "无需信用卡" : "No credit card required"}
                    </span>
                    <span className="mx-2">·</span>
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-[#0066CC]" />
                      {lang === "zh" ? "数据不用于训练" : "Data not trained on"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {items.length > 0 && (
          <section className="bg-[#F8F9FA] px-4 py-8 md:px-20 md:py-16">
            <div className="mx-auto max-w-6xl">
              <Card className="bg-white border border-slate-200 shadow-lg rounded-2xl">
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-slate-900">
                      {lang === "zh" ? "合规矩阵" : "Compliance Matrix"}
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      {lang === "zh"
                        ? `从 RFP 中共提取出 ${items.length} 条强制性要求，可在此标记合规性并导出 Excel。`
                        : `Extracted ${items.length} mandatory requirements from the RFP. Mark compliance and export to Excel.`}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleDownloadGov}
                      variant="outline"
                      size="sm"
                      className="border-slate-200 text-slate-600 hover:border-[#0066CC] hover:text-[#0066CC]"
                      disabled={!items.length}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {lang === "zh" ? "下载 Gov 模板" : "Download Gov template"}
                    </Button>
                    <Button
                      onClick={handleDownloadEnterprise}
                      variant="outline"
                      size="sm"
                      className="border-slate-200 text-slate-600 hover:border-[#0066CC] hover:text-[#0066CC]"
                      disabled={!items.length}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {lang === "zh"
                        ? "下载 Enterprise 模板"
                        : "Download Enterprise template"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24 text-slate-900">
                            {lang === "zh" ? "条款编号" : "Requirement ID"}
                          </TableHead>
                          <TableHead className="text-slate-900">
                            {lang === "zh" ? "要求原文" : "Requirement text"}
                          </TableHead>
                          <TableHead className="w-40 text-slate-900">
                            {lang === "zh" ? "来源章节" : "Source reference"}
                          </TableHead>
                          <TableHead className="w-32 text-center text-slate-900">
                            {lang === "zh" ? "合规性" : "Compliance"}
                          </TableHead>
                          <TableHead className="w-64 text-slate-900">
                            {lang === "zh" ? "备注" : "Comments / Ref"}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.requirementId}>
                            <TableCell className="text-xs text-slate-600">
                              {item.requirementId}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 max-w-xl">
                              {item.requirementText}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                              {[
                                item.sourceSection,
                                item.sourcePage ? `p.${item.sourcePage}` : "",
                              ]
                                .filter(Boolean)
                                .join(" · ") || "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              <select
                                value={item.complianceStatus ?? ""}
                                onChange={(e) =>
                                  handleComplianceChange(
                                    item.requirementId,
                                    e.target.value as MatrixItem["complianceStatus"],
                                  )
                                }
                                className="mx-auto block h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                              >
                                <option value="">
                                  {lang === "zh" ? "未选择" : "Unselected"}
                                </option>
                                <option value="Y">
                                  {lang === "zh" ? "是 (Y)" : "Yes (Y)"}
                                </option>
                                <option value="N">
                                  {lang === "zh" ? "否 (N)" : "No (N)"}
                                </option>
                                <option value="Partial">
                                  {lang === "zh"
                                    ? "部分 (Partial)"
                                    : "Partial"}
                                </option>
                              </select>
                            </TableCell>
                            <TableCell>
                              <input
                                type="text"
                                value={item.commentsNotes ?? ""}
                                onChange={(e) =>
                                  handleCommentChange(
                                    item.requirementId,
                                    e.target.value,
                                  )
                                }
                                placeholder={
                                  lang === "zh"
                                    ? "可选：记录补充说明、整改计划等"
                                    : "Optional: notes, remediation plan, proposal reference"
                                }
                                className="w-full h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableCaption className="text-slate-600">
                        {lang === "zh"
                          ? "提示：数据来自统一模型，可分别导出 Gov 与 Enterprise 模板。"
                          : "Exports are generated from the unified model and can be downloaded as Gov or Enterprise templates."}
                      </TableCaption>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}



        <section className="bg-white px-4 py-8 md:px-20 md:py-16">
          <div className="mx-auto max-w-6xl space-y-10">
            <div className="text-center space-y-3">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                {lang === "zh"
                  ? "为什么需要自动化合规矩阵"
                  : "Why You Need an Automated Compliance Matrix Generator"}
              </h2>
              <p className="text-base md:text-lg text-slate-600">
                {lang === "zh" ? (
                  "像 RFPAI 这样的 AI 生成器把最费时的步骤自动化。上传 PDF 或 Word 文件，系统会从 PDF 转为 Excel 结构化矩阵，几分钟即可完成。它是实用的提案管理自动化，让团队把时间投入到策略、定位与赢单主题。"
                ) : (
                  <>
                    An AI-powered generator like RFPAI replaces the most tedious
                    step with automation. Upload a PDF or Word file and the system
                    converts content from PDF to Excel, producing a structured
                    matrix in minutes. This is practical{" "}
                    <strong>Proposal management automation</strong> that helps
                    teams save time on setup and focus on strategy, positioning,
                    and win themes.
                  </>
                )}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {comparisonCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-slate-900">
                    {card.title}
                  </h3>
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="text-slate-600">{card.manual}</p>
                    <p className="font-semibold text-[#0066CC]">{card.ai}</p>
                  </div>
                </div>
              ))}
            </div>

            {lang === "en" && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8F9FA]">
                    <Zap className="h-5 w-5 text-[#0066CC]" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    Speed
                  </h3>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    Because the AI reads the full document, it extracts every
                    Must/Shall requirement consistently and returns the same
                    structure across bids. You can rerun the process when an
                    addendum arrives and get a refreshed matrix instead of
                    rebuilding from scratch, which keeps schedules predictable.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8F9FA]">
                    <CheckCircle2 className="h-5 w-5 text-[#0066CC]" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    Accuracy
                  </h3>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    Automated extraction keeps verbatim requirement text and
                    references intact, reducing paraphrase errors. Reviewers can
                    trace each line item back to its source and document why the
                    team marked it compliant or not. A defensible{" "}
                    <strong>Compliance Matrix</strong> supports internal reviews
                    and reduces compliance surprises.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8F9FA]">
                    <Users className="h-5 w-5 text-[#0066CC]" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    Collaboration
                  </h3>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    The output doubles as an Excel compliance checklist that is
                    easy to assign to subject matter experts. Columns for owner,
                    evidence, and status make it clear who responds to each
                    requirement, and the matrix becomes the shared view for the
                    whole bid team.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {lang === "en" && (
          <section className="bg-[#F8F9FA] px-4 py-8 md:px-20 md:py-16">
            <div className="mx-auto max-w-6xl space-y-10">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                Industry Standards
              </h2>
              <div className="space-y-10">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="order-1 md:order-2 h-48 w-full md:h-auto md:w-1/2 rounded-lg md:rounded-xl border border-slate-200 bg-white overflow-hidden object-cover">
                    <div className="flex h-full w-full flex-col justify-center gap-4 p-6">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-6 w-6 text-[#0066CC]" />
                        <div className="h-2 w-24 rounded-full bg-[#F8F9FA]" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-3/4 rounded-full bg-[#F8F9FA]" />
                        <div className="h-3 w-full rounded-full bg-[#F8F9FA]" />
                        <div className="h-3 w-2/3 rounded-full bg-[#F8F9FA]" />
                        <div className="grid grid-cols-1 gap-2 pt-2 md:grid-cols-3">
                          <div className="h-8 rounded-md bg-[#F8F9FA]" />
                          <div className="h-8 rounded-md bg-[#F8F9FA]" />
                          <div className="h-8 rounded-md bg-[#F8F9FA]" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="order-2 md:order-1 w-full md:w-1/2 space-y-4 text-base md:text-lg text-slate-600">
                    <h3 className="text-xl font-semibold text-slate-900">
                      What is an RFP Compliance Matrix?
                    </h3>
                    <p className="leading-relaxed">
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
                    <p className="leading-relaxed">
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
                    <ul className="list-disc pl-6 leading-relaxed">
                      <li>Requirement ID for traceability</li>
                      <li>Verbatim requirement text and intent</li>
                      <li>Source section or page reference</li>
                      <li>Compliance decision (Y/N/Partial)</li>
                      <li>Response owner, evidence, and notes</li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="h-48 w-full md:h-auto md:w-1/2 rounded-lg md:rounded-xl border border-slate-200 bg-white overflow-hidden object-cover">
                    <div className="flex h-full w-full flex-col justify-center gap-4 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F8F9FA]">
                        <AlertTriangle className="h-6 w-6 text-[#0066CC]" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-24 rounded-full bg-[#F8F9FA]" />
                        <div className="h-3 w-32 rounded-full bg-[#F8F9FA]" />
                        <div className="h-3 w-20 rounded-full bg-[#F8F9FA]" />
                      </div>
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 space-y-4 text-base md:text-lg text-slate-600">
                    <h3 className="text-xl font-semibold text-slate-900">
                      The Pain of Manual Processing
                    </h3>
                    <p className="leading-relaxed">
                      Manual compliance extraction is slow and brittle. Teams often
                      rely on Ctrl+F to find words like shall, must, or will, then
                      copy and paste lines into a spreadsheet. When the RFP is 200
                      pages or includes multiple attachments, this kind of
                      Shredding an RFP can take hours, and every revision risks
                      missing a clause or duplicating a requirement.
                    </p>
                    <p className="leading-relaxed">
                      Besides the time cost, manual work introduces inconsistency
                      across reviewers. The same requirement may be paraphrased
                      differently, and important context can be lost when text is
                      copied without its section reference. These errors cascade
                      through the proposal, forcing late rework and creating
                      compliance risk.
                    </p>
                    <ul className="list-disc pl-6 leading-relaxed">
                      <li>Missed requirements after addenda and Q&amp;A updates</li>
                      <li>Duplicate rows from multiple reviewers</li>
                      <li>Unclear ownership for compliance decisions</li>
                      <li>Delayed writing while the matrix is rebuilt</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {lang === "zh" && (
          <section className="bg-[#F8F9FA] px-4 py-8 md:px-20 md:py-16">
            <div className="mx-auto max-w-6xl space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                行业标准
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">
                    RFP 合规矩阵如何生成
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    上传 PDF 或 Word，系统会进行 RFP 拆解（RFP shredding），提取“必须/应当”条款并整理为合规矩阵。
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Excel 导出与 proposal 协作
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Excel 包含要求原文、章节/页码、合规性和备注，方便 proposal 团队快速定位响应位置。
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">
                    合规与风险评估
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    此页面专注合规矩阵生成，如需投标风险评估与标书分析，请使用 bid checker。
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white px-4 py-8 md:px-20 md:py-16">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="space-y-3">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                {lang === "zh"
                  ? "审计就绪的输出格式"
                  : "Audit-Ready Output Format"}
              </h2>
              {lang === "en" ? (
                <>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Key Columns in a Standard Matrix
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    A practical matrix is more than a list of obligations. It is
                    a living document that lets you filter, sort, and track
                    progress during the proposal cycle. The columns below are a
                    solid baseline for any <strong>RFP Compliance Matrix</strong>{" "}
                    and align well with typical review workflows.
                  </p>
                </>
              ) : (
                <p className="text-base md:text-lg text-slate-600">
                  合规矩阵以 Excel 输出，便于筛选、分配与审阅，确保每一条要求都有清晰的响应位置。
                </p>
              )}
            </div>
            <p className="text-xs text-slate-600 md:hidden">
              {lang === "zh" ? "左右滑动查看 ->" : "Scroll to view ->"}
            </p>
            <div className="overflow-x-auto md:overflow-visible">
              <div className="min-w-[720px] rounded-xl border border-slate-200 bg-white">
                <div className="grid grid-cols-[80px_minmax(300px,1fr)_140px_180px] bg-[#0066CC] text-white text-xs font-semibold uppercase tracking-wide">
                  <div className="px-4 py-3">ID</div>
                  <div className="px-4 py-3">
                    {lang === "zh" ? "要求文本" : "Requirement Text"}
                  </div>
                  <div className="px-4 py-3">
                    {lang === "zh" ? "合规性" : "Compliance"}
                  </div>
                  <div className="px-4 py-3">{lang === "zh" ? "参考" : "Ref"}</div>
                </div>
                {mockRows.map((row, index) => (
                  <div
                    key={row.id}
                    className={`grid grid-cols-[80px_minmax(300px,1fr)_140px_180px] text-sm ${
                      index === 0 ? "" : "border-t border-slate-200"
                    }`}
                  >
                    <div className="px-4 py-3 text-slate-600">{row.id}</div>
                    <div className="px-4 py-3 text-slate-600">{row.text}</div>
                    <div className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-[#0066CC] px-2 py-0.5 text-xs font-semibold text-[#0066CC]">
                        {row.compliance}
                      </span>
                    </div>
                    <div className="px-4 py-3 text-slate-600">{row.reference}</div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-600">
              {lang === "zh"
                ? "标准字段用于 Excel 合规检查表"
                : "Standard fields used in an Excel compliance checklist"}
            </p>
            {lang === "en" && (
              <p className="text-slate-600 leading-relaxed">
                With these fields, teams can filter by owner, sort by risk,
                and create a clear audit trail. The structure also supports
                downstream QA, where reviewers validate that each requirement
                is addressed in the correct location.
              </p>
            )}
          </div>
        </section>

        <section className="bg-white px-4 py-8 md:px-20 md:py-16">
          <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F8F9FA]">
              <ShieldCheck className="h-6 w-6 text-[#0066CC]" />
            </div>
            <p className="text-base md:text-lg text-slate-600">
              {lang === "zh"
                ? "企业级隐私。数据仅在内存中处理，不会保存。"
                : "Enterprise-Grade Privacy. Data processed in memory, never stored."}
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-[#F8F9FA] px-4 py-8 md:px-20 md:py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              {faqTitle}
            </h2>
            <div className="divide-y divide-slate-200">
              {faqItems.map((item, index) => {
                const isOpen = openFaqIndex === index;
                const panelId = `faq-panel-${index}`;
                return (
                  <div key={item.question} className="py-4">
                    <h3 className="text-base font-semibold text-slate-900">
                      <button
                        type="button"
                        className="flex w-full min-h-[48px] items-center justify-between text-left py-3"
                        onClick={() => handleToggleFaq(index)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                      >
                        <span>{item.question}</span>
                        <ChevronDown
                          className={`h-5 w-5 text-[#0066CC] transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </h3>
                    <div
                      id={panelId}
                      className={`mt-2 text-slate-600 leading-relaxed ${
                        isOpen ? "block" : "hidden"
                      }`}
                    >
                      {item.answer}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-8 md:px-20 md:py-16">
          <div className="mx-auto max-w-4xl text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
              {lang === "zh"
                ? "准备好生成 Draft Zero 吗？"
                : "Ready to generate your Draft Zero?"}
            </h2>
            <p className="text-slate-600">
              {lang === "zh"
                ? "上传 RFP，几分钟内得到可编辑的合规矩阵。"
                : "Upload an RFP and get an editable compliance matrix in minutes."}
            </p>
            <Button
              onClick={handleScrollToUpload}
              className="w-full md:w-auto bg-[#0066CC] hover:bg-[#005BB8] text-white"
              size="lg"
            >
              {lang === "zh" ? "开始生成" : "Generate Draft Zero"}
            </Button>
            <footer className="pt-6 text-xs text-slate-600">
              (c) {new Date().getFullYear()} RFP Compliance Matrix Generator
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}
