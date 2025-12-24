"use client";

import { useRef, useState } from "react";
import type React from "react";
import Link from "next/link";
import { Upload, FileText, Loader2, ClipboardCopy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Language } from "@/types";

type HeadingInfo = { level: number; text: string };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 与后端 Word 导出保持一致的占位符/标记清理逻辑（简化版，输出为纯文本）
function normalizePlaceholders(text: string): string {
  const trimmed = text.trim();

  if (
    trimmed === "[待填]" ||
    trimmed === "【待填】" ||
    trimmed === "待填" ||
    trimmed === "[需用户填写]" ||
    trimmed === "【需用户填写】" ||
    trimmed === "需用户填写" ||
    trimmed === "(需用户填写)" ||
    trimmed === "（需用户填写）" ||
    trimmed === "[填]" ||
    trimmed === "【填】" ||
    trimmed === "(填)" ||
    trimmed === "（填）"
  ) {
    return "";
  }

  let result = text;

  // 去掉常见占位符本身
  result = result
    .replace(/\[待填\]/g, "")
    .replace(/【待填】/g, "")
    .replace(/待填/g, "")
    .replace(/\[需用户填写\]/g, "")
    .replace(/【需用户填写】/g, "")
    .replace(/需用户填写/g, "")
    .replace(/\(需用户填写\)/g, "")
    .replace(/（需用户填写）/g, "")
    .replace(/\[填\]/g, "")
    .replace(/【填】/g, "")
    .replace(/\(填\)/g, "")
    .replace(/（填）/g, "");

  // 去掉 Markdown 粗体/斜体星号
  result = result.replace(/\*\*(.*?)\*\*/g, "$1");
  result = result.replace(/\*(.*?)\*/g, "$1");

  // 去掉“√”号，保证勾选默认不打勾
  result = result.replace(/√/g, "");

  // 清理 <br> 换行标签
  result = result.replace(/<br\s*\/??>/gi, " ");

  // 标准日期区间格式更易读
  result = result.replace(
    /(\d{4}[./]\d{1,2})\s*[-—~]\s*(\d{4}[./]\d{1,2})/g,
    "$1    -    $2",
  );

  return result;
}

function detectHeadingFromLine(line: string, lang: Language): HeadingInfo | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 优先识别 Markdown 标题（# 开头）
  const markdownMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
  if (markdownMatch) {
    const levelFromHashes = markdownMatch[1].length;
    const rawText = markdownMatch[2];
    const text = normalizePlaceholders(rawText).trim() || " ";
    if (!text) return null;

    if (lang === "zh") {
      const normalized = text.trim();
      // 形如“第一章 ……”，无论 # 数量多少，都视为一级标题
      if (/^第[一二三四五六七八九十]+章/.test(normalized)) {
        return { level: 1, text };
      }
      // 形如“一、投标函”“二、商务条款”等大标题，统一视为二级标题
      if (/^[一二三四五六七八九十]+[、.．]/.test(normalized)) {
        return { level: 2, text };
      }
    }

    return { level: levelFromHashes, text };
  }

  // 无 # 前缀时，对中文样式标题做兜底识别
  if (lang === "zh") {
    const normalized = trimmed;
    if (/^第[一二三四五六七八九十]+章/.test(normalized)) {
      const text = normalizePlaceholders(normalized).trim() || " ";
      if (!text) return null;
      return { level: 1, text };
    }
    if (/^[一二三四五六七八九十]+[、.．]/.test(normalized)) {
      const text = normalizePlaceholders(normalized).trim() || " ";
      if (!text) return null;
      return { level: 2, text };
    }
  }

  return null;
}

function parseMarkdownRowCells(raw: string): string[] {
  return raw
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isMarkdownTableSeparatorRow(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("|")) return false;
  const inner = trimmed.slice(1, trimmed.endsWith("|") ? -1 : undefined).trim();
  if (!inner) return false;
  const cells = inner.split("|").map((cell) => cell.trim());
  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function buildPrintableHtml(draft: string, lang: Language): string {
  let lines = draft.split(/\r?\n/);

  // ===== 与 Word 导出尽量对齐的预处理：删除开头提示语 & "正本/副本" =====
  if (lang === "zh") {
    let firstContentLineIndex = 0;
    let removedIntroLines = 0;

    while (firstContentLineIndex < lines.length) {
      const raw = lines[firstContentLineIndex] ?? "";
      const trimmed = raw.trim();

      if (!trimmed) {
        firstContentLineIndex += 1;
        removedIntroLines += 1;
        continue;
      }

      const normalized = trimmed.replace(/\s+/g, "");
      const looksLikeIntro =
        normalized.startsWith("这里是为您生成的投标文件草稿") ||
        normalized.startsWith("这是为您生成的投标文件草稿") ||
        normalized.startsWith("以下是为您生成的投标文件草稿") ||
        (normalized.includes("投标文件草稿") && normalized.includes("[TENDER_DOC]"));

      if (looksLikeIntro) {
        firstContentLineIndex += 1;
        removedIntroLines += 1;
        continue;
      }

      if (
        removedIntroLines > 0 &&
        !trimmed.startsWith("#") &&
        !/^(第[一二三四五六七八九十]+章)/.test(trimmed)
      ) {
        firstContentLineIndex += 1;
        removedIntroLines += 1;
        continue;
      }

      break;
    }

    if (firstContentLineIndex > 0) {
      lines = lines.slice(firstContentLineIndex);
    }

    // 处理最顶部的“正本 / 副本”字样
    let firstNonEmptyIndex = 0;
    while (firstNonEmptyIndex < lines.length && !lines[firstNonEmptyIndex]!.trim()) {
      firstNonEmptyIndex += 1;
    }
    if (firstNonEmptyIndex < lines.length) {
      const firstLineNormalized = lines[firstNonEmptyIndex]!
        .trim()
        .replace(/\s+/g, "");
      if (firstLineNormalized === "正本" || firstLineNormalized === "副本") {
        lines.splice(firstNonEmptyIndex, 1);
      }
    }
  }

  // ===== 目录：与 Word 类似的标题识别 + 过滤 =====
  type TocEntry = { level: number; text: string };
  const rawTocEntries: TocEntry[] = [];
  const seenTocKeys = new Set<string>();

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine) continue;
    const headingInfo = detectHeadingFromLine(trimmedLine, lang);
    if (!headingInfo) continue;
    const { level, text } = headingInfo;
    if (level > 2) continue;
    const normalizedText = text.trim();
    if (!normalizedText) continue;
    const key = `${level}::${normalizedText.replace(/\s+/g, "")}`;
    if (seenTocKeys.has(key)) continue;
    seenTocKeys.add(key);
    rawTocEntries.push({ level, text: normalizedText });
  }

  const tocEntries: TocEntry[] = rawTocEntries.filter((entry) => {
    const normalizedText = entry.text.replace(/\s+/g, "").replace(/[()（）]/g, "");
    // 过滤封面“正本/副本”
    if (entry.level === 1 && (normalizedText === "正本" || normalizedText === "副本")) {
      return false;
    }
    // 过滤“项目名称：xxx”“招标编号：xxx”
    const trimmed = entry.text.trim();
    if (/^项目名称[:：]/.test(trimmed) || /^招标编号[:：]/.test(trimmed)) {
      return false;
    }
    if (lang === "zh") {
      // 1）封面项目名称：“XXX项目”
      const isCoverProjectTitle =
        entry.level === 1 &&
        !/^第[一二三四五六七八九十]+章/.test(normalizedText) &&
        /项目$/.test(normalizedText);
      if (isCoverProjectTitle) return false;

      // 2）“投标文件”“投标文件正本/副本”
      if (/^投标文件(正本|副本)?$/.test(normalizedText)) return false;

      // 3）“第×章 投标文件格式”模板章节
      if (/^第[一二三四五六七八九十]+章.*投标文件格式/.test(normalizedText)) {
        return false;
      }
    }
    return true;
  });

  const bodyParts: string[] = [];
  let index = 0;
  let currentHeadingText = "";
  let previousHeadingWasBidFormatChapter = false;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    // 水平分隔线（--- / ___ 等）在 Word 里通常不会单独作为一行正文导出，这里直接跳过
    const isHorizontalRule = (() => {
      if (!trimmed) return false;
      const stripped = trimmed.replace(/[-_—\s]/g, "");
      return stripped.length === 0 && /[-_—]/.test(trimmed) && trimmed.length >= 3;
    })();
    if (isHorizontalRule) {
      index += 1;
      continue;
    }

    // 空行：如果后面紧跟的是标题，则不在标题上方额外插入空段落
    if (!trimmed) {
      let lookahead = index + 1;
      while (lookahead < lines.length) {
        const laLine = lines[lookahead] ?? "";
        const laTrimmed = laLine.trim();
        if (!laTrimmed) {
          lookahead += 1;
          continue;
        }
        if (detectHeadingFromLine(laTrimmed, lang)) {
          index += 1;
          break;
        }
        bodyParts.push('<p class="empty-line">&nbsp;</p>');
        index += 1;
        break;
      }
      if (lookahead >= lines.length) {
        index += 1;
      }
      continue;
    }

    // 标题行（与 Word 保持相同的分页逻辑）
    const heading = detectHeadingFromLine(trimmed, lang);
    if (heading) {
      const { level, text } = heading;
      currentHeadingText = text;
      const normalizedNoSpace = text.replace(/\s+/g, "");

      let tag: "h1" | "h2" | "h3" | "h4" = "h3";
      if (level === 1) tag = "h1";
      else if (level === 2) tag = "h2";
      else if (level >= 3) tag = "h3";

      const classes: string[] = [tag];
      let isBidFormatChapter = false;

      if (lang === "zh") {
        // “第×章 投标文件格式” 单独起页
        if (
          level === 1 &&
          /^第[一二三四五六七八九十]+章.*投标文件格式/.test(normalizedNoSpace)
        ) {
          classes.push("page-break-before");
          isBidFormatChapter = true;
        }

        // “一、二、三……”等大章节：除非紧跟在“第×章 投标文件格式”后面，否则单独起页
        if (level === 2 && /^[一二三四五六七八九十]+[、.．]/.test(text.trim())) {
          if (!previousHeadingWasBidFormatChapter) {
            classes.push("page-break-before");
          }
        }
      }

      bodyParts.push(
        `<${tag} class="${classes.join(" ")}">${escapeHtml(
          normalizePlaceholders(text),
        )}</${tag}>`,
      );

      previousHeadingWasBidFormatChapter = isBidFormatChapter;
      index += 1;
      continue;
    }

    // Markdown 表格：支持普通表格 + 报价类表格的特殊逻辑
    if (line.includes("|")) {
      const tableLines: string[] = [];
      while (index < lines.length && (lines[index] ?? "").includes("|")) {
        tableLines.push(lines[index] ?? "");
        index += 1;
      }

      const tableRowsRaw = tableLines
        .map((raw) => raw.trim())
        .filter((raw) => raw.length > 0)
        .filter((raw) => !isMarkdownTableSeparatorRow(raw));

      if (tableRowsRaw.length > 0) {
        const [headerRaw, ...bodyRaw] = tableRowsRaw;
        const headerCells = parseMarkdownRowCells(headerRaw);

        const headingKey = currentHeadingText.replace(/\s/g, "");
        const isBidPriceTable = headingKey.includes("投标报价表");
        const isBidItemTable = headingKey.includes("分项报价表");

        const htmlEscapeCells = (cells: string[]) =>
          cells.map((cell) => escapeHtml(normalizePlaceholders(cell) || "&nbsp;"));

        if (isBidPriceTable) {
          // “投标报价表”：参照 Word 导出逻辑，把关键行留空/模板化
          const rowsHtml: string[] = [];

          for (const rawRow of tableRowsRaw) {
            const cells = parseMarkdownRowCells(rawRow);
            const labelRaw = cells[0] ?? "";
            const valueRaw = cells[1] ?? "";
            const labelText = normalizePlaceholders(labelRaw) || " ";
            const labelKey = labelText.replace(/\s/g, "");
            const normalizedValue = normalizePlaceholders(valueRaw);

            let rightContent: string;

            if (labelKey.includes("投标报价")) {
              rightContent =
                "小写：&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;元<br/>大写：&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;元";
            } else if (labelKey.includes("保证金情况")) {
              rightContent = "□有&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;□无";
            } else if (labelKey.includes("备注")) {
              rightContent =
                "税率：&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;%（注：若是小微企业，请在此注明）";
            } else if (labelKey.includes("交货期") || labelKey.includes("售后服务承诺")) {
              rightContent = "&nbsp;";
            } else {
              rightContent = escapeHtml(normalizedValue || " ");
            }

            rowsHtml.push(
              `<tr><td class="bid-table-label">${escapeHtml(
                labelText,
              )}</td><td class="bid-table-value">${rightContent}</td></tr>`,
            );
          }

          bodyParts.push(
            `<table class="bid-table bid-price-table"><tbody>${rowsHtml.join(
              "",
            )}</tbody></table>`,
          );
        } else {
          // 其它表格，包括分项报价表
          let brandColumnIndex = -1;
          if (isBidItemTable && headerCells.length > 0) {
            brandColumnIndex = headerCells.findIndex((cell) =>
              cell.replace(/\s/g, "").includes("品牌"),
            );
          }

          const headerHtmlCells = htmlEscapeCells(headerCells);

          const filteredBodyRaw = bodyRaw.filter((rawRow) => {
            const cells = parseMarkdownRowCells(rawRow);
            if (cells.length === 0) return false;
            const allEllipsis = cells.every((cell) => {
              const t = normalizePlaceholders(cell).replace(/\s/g, "");
              return t === "..." || t === "…";
            });
            return !allEllipsis;
          });

          const bodyRowsHtml: string[] = [];

          for (const rawRow of filteredBodyRaw) {
            const cells = parseMarkdownRowCells(rawRow);
            const htmlCells = cells.map((cell, idx) => {
              if (isBidItemTable && brandColumnIndex >= 0 && idx === brandColumnIndex) {
                return "&nbsp;";
              }
              return escapeHtml(normalizePlaceholders(cell) || "&nbsp;");
            });
            bodyRowsHtml.push(
              `<tr>${htmlCells.map((c) => `<td>${c}</td>`).join("")}</tr>`,
            );
          }

          bodyParts.push(
            `<table class="bid-table ${
              isBidItemTable ? "bid-item-table" : ""
            }"><thead><tr>${headerHtmlCells
              .map((c) => `<th>${c}</th>`)
              .join("")}</tr></thead><tbody>${bodyRowsHtml.join(
              "",
            )}</tbody></table>`,
          );
        }
      }

      continue;
    }

    // 普通段落：根据内容类型调整样式，使之更接近 Word 导出
    const paragraphText = normalizePlaceholders(line);
    const matchKey = (paragraphText || "").replace(/\s/g, "");

    // 签字 / 盖章 / 公章 / 盖单位章 行
    const isSignatureLabel =
      (matchKey.includes("盖章") ||
        matchKey.includes("签字") ||
        matchKey.includes("公章") ||
        matchKey.includes("盖单位章")) &&
      matchKey.length <= 30;

    if (isSignatureLabel) {
      bodyParts.push(
        `<p class="signature-line">${escapeHtml(paragraphText || " ")}</p>`,
      );
      index += 1;
      continue;
    }

    // “日期：  年  月  日” 类行
    if (matchKey.includes("日期") && matchKey.includes("年月日")) {
      bodyParts.push(
        `<p class="date-line">${escapeHtml(paragraphText || " ")}</p>`,
      );
      index += 1;
      continue;
    }

    // 只有“年  月  日”的日期行
    if (matchKey === "年月日") {
      bodyParts.push(
        `<p class="date-only-line">年&nbsp;&nbsp;&nbsp;&nbsp;月&nbsp;&nbsp;&nbsp;&nbsp;日</p>`,
      );
      index += 1;
      continue;
    }

    // 其他普通段落
    bodyParts.push(`<p>${escapeHtml(paragraphText || " ")}</p>`);
    index += 1;
  }

  const fontFamily =
    lang === "en"
      ? "Calibri, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      : "'SimSun', '宋体', 'Microsoft YaHei', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const tocTitle = lang === "zh" ? "目录" : "Table of Contents";

  const tocHtml = tocEntries.length
    ? `<div class="toc-page">
  <h1 class="toc-title">${escapeHtml(tocTitle)}</h1>
  <div class="toc-items">
    ${tocEntries
      .map(
        (entry) =>
          `<div class="toc-item level${entry.level}">${escapeHtml(
            entry.text,
          )}</div>`,
      )
      .join("\n    ")}
  </div>
</div>
<div class="page-break"></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${
    lang === "zh" ? "投标文件草稿 - PDF 导出" : "Bid draft - PDF export"
  }</title>
  <style>
    @page { margin: 2cm; }
    body {
      font-family: ${fontFamily};
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      margin: 0;
      padding: 2cm;
    }
    h1, h2, h3, h4 {
      font-weight: bold;
      margin: 0 0 12pt;
    }
    h1 {
      font-size: 22pt;
      text-align: center;
      margin-top: 24pt;
    }
    h2 {
      font-size: 18pt;
      margin-top: 18pt;
    }
    h3 {
      font-size: 14pt;
      margin-top: 14pt;
    }
    p {
      margin: 0 0 8pt;
    }
    p.empty-line {
      margin: 0 0 4pt;
    }
    p.signature-line {
      margin: 12pt 0 14pt;
      line-height: 1.6;
    }
    p.date-line {
      margin: 12pt 0 14pt;
      line-height: 1.6;
    }
    p.date-only-line {
      text-align: right;
      margin: 12pt 0 12pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
    }
    th, td {
      border: 1px solid #000;
      padding: 4pt 6pt;
      font-size: 11pt;
      vertical-align: middle;
    }
    th {
      background: #f5f5f5;
    }
    .bid-table-label {
      width: 25%;
      text-align: center;
      white-space: nowrap;
    }
    .bid-table-value {
      width: 75%;
    }
    .toc-title {
      font-size: 24pt;
      text-align: center;
      margin-bottom: 18pt;
    }
    .toc-item {
      margin-bottom: 6pt;
    }
    .toc-item.level1 {
      font-size: 16pt;
      font-weight: bold;
    }
    .toc-item.level2 {
      font-size: 14pt;
      margin-left: 1.5em;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
    }
    @media print {
      body { padding: 1.5cm; }
    }
  </style>
</head>
<body>
${tocHtml}
${bodyParts.join("\n")}
</body>
</html>`;
}

export default function BidWriterPage({ lang }: { lang: Language }) {
  const [rfpFile, setRfpFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
		  const [draft, setDraft] = useState<string>("");
		  const [copied, setCopied] = useState(false);
		  const [exporting, setExporting] = useState(false);
		  const [progressStep, setProgressStep] = useState<0 | 1 | 2 | 3>(0);
		  const progressTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

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

	    let success = false;

	    // Authentication is not required for bid draft generation in the current low-volume phase.
	    setLoading(true);
	    setError("");
	    setDraft("");
	    setCopied(false);

	    // 重置并启动前端可视的三步进度（纯前端模拟，帮助用户理解大致流程）
	    progressTimersRef.current.forEach((id) => clearTimeout(id));
	    progressTimersRef.current = [];
	    setProgressStep(1);

	    const t1 = setTimeout(() => {
	      setProgressStep((prev) => (prev < 2 ? 2 : prev));
	    }, 4000);
	    const t2 = setTimeout(() => {
	      setProgressStep((prev) => (prev < 3 ? 3 : prev));
	    }, 12000);
	    progressTimersRef.current = [t1, t2];

	    try {
	      const formData = new FormData();
	      formData.append("rfp_file", rfpFile);
	      // Bid Writer 默认改为使用 Gemini 3 Pro（相对 2.5 Flash 质量更高）
	      formData.append("model", "gemini3");
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
	      success = true;
    } catch (err: any) {
	      console.error("Bid writer error:", err);
	      setError(err?.message || (lang === "zh" ? "生成投标文件失败，请稍后重试" : "Failed to generate bid draft, please try again later"));
	    } finally {
	      setLoading(false);
	      progressTimersRef.current.forEach((id) => clearTimeout(id));
	      progressTimersRef.current = [];
	      setProgressStep(success ? 3 : 0);
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

  const handleExportDocx = async () => {
    if (!draft) return;
    try {
      setExporting(true);
      const res = await fetch("/api/bid-draft-docx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: draft, lang }),
      });

      if (!res.ok) {
        let data: any = null;
        try {
          data = await res.json();
        } catch {
          // ignore
        }
        const message =
          data?.error ||
          (lang === "zh"
            ? "导出 Word 文档失败，请稍后重试。"
            : "Failed to export Word document, please try again later.");
        throw new Error(message);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = lang === "zh" ? "投标文件草稿.docx" : "bid-draft.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Bid writer export docx error:", err);
      setError(
        err?.message ||
          (lang === "zh"
            ? "导出 Word 文档失败，请稍后重试。"
            : "Failed to export Word document, please try again later."),
      );
    } finally {
      setExporting(false);
    }
  };

	  const handleExportPdf = () => {
	    if (!draft) return;
	    try {
	      const html = buildPrintableHtml(draft, lang);
	      const printWindow = window.open("", "_blank");
	      if (!printWindow) {
	        setError(
	          lang === "zh"
	            ? "浏览器拦截了新窗口，无法导出 PDF。请允许弹出窗口后重试。"
	            : "Popup was blocked by the browser, unable to export PDF. Please allow popups and try again.",
	        );
	        return;
	      }

	      printWindow.document.open();
	      printWindow.document.write(html);
	      printWindow.document.close();
	      printWindow.focus();
	      // 略微延迟后再触发打印，确保样式已加载
	      setTimeout(() => {
	        try {
	          printWindow.print();
	        } catch {
	          // ignore
	        }
	      }, 300);
	    } catch (err: any) {
	      console.error("Bid writer export pdf error:", err);
	      setError(
	        err?.message ||
	          (lang === "zh"
	            ? "导出 PDF 失败，请稍后重试。"
	            : "Failed to export PDF, please try again later."),
	      );
	    }
	  };

		  return (
	    <div className="min-h-screen bg-slate-50">
		      <div className="container mx-auto px-4 py-8 space-y-8">
		        {/* 顶部导航：返回首页（暂不显示登录 / 积分区） */}
		        <div className="flex items-center justify-between max-w-5xl mx-auto mb-4 gap-4">
		          <Link
		            href={lang === "zh" ? "/zh" : "/"}
		            className="flex items-center text-sm text-slate-600 hover:text-blue-600"
		          >
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
	              <div className="flex flex-col items-end gap-2">
	                <Button onClick={handleGenerate} disabled={!rfpFile || loading} size="sm">
	                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
	                  {lang === "zh" ? "生成投标文件草稿" : "Generate bid draft"}
	                </Button>
	                {(loading || progressStep === 3) && (
	                  <div className="text-[11px] text-slate-500 text-right space-y-0.5">
	                    <p>
	                      {lang === "zh"
	                        ? "步骤 1/3：上传并校验招标文件（大小、格式）。"
	                        : "Step 1/3: Uploading and validating the RFP (size & format)."}
	                      <span className="ml-1">
	                        {progressStep >= 1
	                          ? lang === "zh"
	                            ? progressStep === 1 && loading
	                              ? "[进行中]"
	                              : "[已完成]"
	                            : progressStep === 1 && loading
	                              ? "[In progress]"
	                              : "[Done]"
	                          : lang === "zh"
	                            ? "[待开始]"
	                            : "[Pending]"}
	                      </span>
	                    </p>
	                    <p>
	                      {lang === "zh"
	                        ? "步骤 2/3：在服务器解析 PDF / Word 文本。"
	                        : "Step 2/3: Parsing PDF / Word content on the server."}
	                      <span className="ml-1">
	                        {progressStep >= 2
	                          ? lang === "zh"
	                            ? progressStep === 2 && loading
	                              ? "[进行中]"
	                              : "[已完成]"
	                            : progressStep === 2 && loading
	                              ? "[In progress]"
	                              : "[Done]"
	                          : lang === "zh"
	                            ? "[待开始]"
	                            : "[Pending]"}
	                      </span>
	                    </p>
	                    <p>
	                      {lang === "zh"
	                        ? "步骤 3/3：调用大模型生成完整投标文件草稿，这一步可能需要 30-90 秒，请耐心等待。"
	                        : "Step 3/3: Asking the AI model to draft the full proposal. This may take 30–90 seconds, please wait."}
	                      <span className="ml-1">
	                        {progressStep >= 3
	                          ? lang === "zh"
	                            ? loading
	                              ? "[进行中]"
	                              : "[已完成]"
	                            : loading
	                              ? "[In progress]"
	                              : "[Done]"
	                          : lang === "zh"
	                            ? "[待开始]"
	                            : "[Pending]"}
	                      </span>
	                    </p>
	                  </div>
	                )}
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
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {lang === "zh" ? "生成的投标文件草稿" : "Generated bid draft"}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1"
                >
                  <ClipboardCopy className="w-4 h-4" />
                  <span>{copied ? (lang === "zh" ? "已复制" : "Copied") : lang === "zh" ? "复制全文" : "Copy all"}</span>
                </Button>
	                <Button
	                  variant="outline"
	                  size="sm"
	                  onClick={handleExportPdf}
	                  className="inline-flex items-center gap-1"
	                >
	                  <Download className="w-4 h-4" />
	                  <span>{lang === "zh" ? "导出为 PDF" : "Export as PDF"}</span>
	                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportDocx}
                  disabled={exporting}
                  className="inline-flex items-center gap-1"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{lang === "zh" ? "导出中..." : "Exporting..."}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>{lang === "zh" ? "导出为 Word" : "Export as Word"}</span>
                    </>
                  )}
                </Button>
              </div>
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

