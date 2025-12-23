import { NextRequest, NextResponse } from 'next/server';
import {
			AlignmentType,
			BorderStyle,
			Document,
			HeadingLevel,
			HeightRule,
			Packer,
			Paragraph,
			Table,
			TableCell,
			TableRow,
			TextRun,
			VerticalAlign,
			WidthType,
			} from 'docx';
import { logger } from '@/lib/logger';
import { Language } from '@/types';

function normalizePlaceholders(text: string): string {
	  // 先单独处理纯占位内容
	  const trimmed = text.trim();
	  if (
	    trimmed === '[待填]' ||
	    trimmed === '【待填】' ||
	    trimmed === '待填' ||
	    // [需用户填写] 这一类提示
	    trimmed === '[需用户填写]' ||
	    trimmed === '【需用户填写】' ||
	    trimmed === '需用户填写' ||
	    trimmed === '(需用户填写)' ||
	    trimmed === '（需用户填写）' ||
	    // [填] 这一类简单占位
	    trimmed === '[填]' ||
	    trimmed === '【填】' ||
	    trimmed === '(填)' ||
	    trimmed === '（填）'
	  ) {
	    return '';
	  }

	  let result = text;

	  // 去掉占位符本身
	  result = result
	    .replace(/\[待填\]/g, '')
	    .replace(/【待填】/g, '')
	    .replace(/待填/g, '')
	    // [需用户填写] / 【需用户填写】 / 需用户填写 / (需用户填写) / （需用户填写）
	    .replace(/\[需用户填写\]/g, '')
	    .replace(/【需用户填写】/g, '')
	    .replace(/需用户填写/g, '')
	    .replace(/\(需用户填写\)/g, '')
	    .replace(/（需用户填写）/g, '')
	    // [填] / 【填】 / (填) / （填）
	    .replace(/\[填\]/g, '')
	    .replace(/【填】/g, '')
	    .replace(/\(填\)/g, '')
	    .replace(/（填）/g, '');

	  // 去掉 AI 生成时用来加粗的 Markdown 星号（**项目名称** -> 项目名称）
	  result = result.replace(/\*\*(.*?)\*\*/g, '$1');
	  result = result.replace(/\*(.*?)\*/g, '$1');

	  // 去掉“√”号，保证所有勾选框默认不打勾
	  result = result.replace(/√/g, '');

	  // 清理 <br> 换行标签，避免直接出现在 Word 文本里
	  result = result.replace(/<br\s*\/??>/gi, ' ');

	  // 标准日期区间（例如 2021.01-2022.01）：在两端留出足够空格，方便阅读和手写
	  result = result.replace(
	    /(\d{4}[./]\d{1,2})\s*[-—~]\s*(\d{4}[./]\d{1,2})/g,
	    '$1    -    $2',
	  );

	  return result;
	}

function parseMarkdownRowCells(raw: string): string[] {
  return raw
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

function isMarkdownTableSeparatorRow(raw: string): boolean {
  // 形如 "| :--- | :---: | ---: |" 的对齐行
  const trimmed = raw.trim();
  if (!trimmed.startsWith('|')) return false;

  const inner = trimmed.slice(1, trimmed.endsWith('|') ? -1 : undefined).trim();
  if (!inner) return false;

  const cells = inner.split('|').map((cell) => cell.trim());
  if (cells.length === 0) return false;

  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function cmToTwip(cm: number): number {
  // 1 英寸 = 2.54 cm = 1440 twip
  return Math.round((cm / 2.54) * 1440);
}

function createTableRowFromMarkdown(
  raw: string,
  isHeader: boolean,
	  options?: {
	    fontSizeHalfPoints?: number;
	    emptyColumnIndexes?: number[];
	    fontName?: string;
	  },
): TableRow {
  const cells = parseMarkdownRowCells(raw);
  const fontSizeHalfPoints = options?.fontSizeHalfPoints;
  const emptyColumnIndexes = options?.emptyColumnIndexes ?? [];
  const fontName = options?.fontName;

  return new TableRow({
	    height: { value: DEFAULT_TABLE_ROW_HEIGHT, rule: HeightRule.ATLEAST },
	    children: cells.map((cellText, columnIndex) => {
      let effectiveText = cellText;
      if (!isHeader && emptyColumnIndexes.includes(columnIndex)) {
        effectiveText = '';
      }

      const normalized = normalizePlaceholders(effectiveText);

      return new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
			            text: normalized || ' ',
			            bold: isHeader,
			            size: fontSizeHalfPoints ?? 24, // 默认小四号：12pt = 24 half-points
			            color: '000000',
			            font: fontName,
              }),
            ],
          }),
        ],
      });
    }),
  });
}

const COMMON_TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
} as const;

// 统一表格行高：再提高一档，让所有表格看起来更“宽松”
const DEFAULT_TABLE_ROW_HEIGHT = 900; // twip，大约 0.7cm 左右

/**
 * POST /api/bid-draft-docx
 * 将已经生成好的投标文件草稿正文导出为 Word (.docx) 文档
 */
export async function POST(request: NextRequest) {
  const requestStartedAt = Date.now();

  try {
    const body = await request.json();
    const content = (body?.content as string) || '';
    const langValue = (body?.lang as string) || 'zh';
    const lang: Language = langValue === 'en' ? 'en' : 'zh';

    if (!content || !content.trim()) {
      logger.warn('bid-draft-docx: missing content');
      return NextResponse.json(
        {
          error:
            lang === 'en'
              ? 'No bid draft content to export.'
              : '没有可导出的投标文件内容。',
        },
        { status: 400 },
      );
	    }

	    let lines = content.split(/\r?\n/);

	    // 如果是中文版本，自动清理开头的提示性语句（例如“这里是为您生成的投标文件草稿……”）
	    if (lang === 'zh') {
	      let firstContentLineIndex = 0;
	      let removedIntroLines = 0;

	      while (firstContentLineIndex < lines.length) {
	        const raw = lines[firstContentLineIndex] ?? '';
	        const trimmed = raw.trim();

	        if (!trimmed) {
	          // 跳过开头的空行
	          firstContentLineIndex += 1;
	          removedIntroLines += 1;
	          continue;
	        }

	        const normalized = trimmed.replace(/\s+/g, '');
	        const looksLikeIntro =
	          normalized.startsWith('这里是为您生成的投标文件草稿') ||
	          normalized.startsWith('这是为您生成的投标文件草稿') ||
	          normalized.startsWith('以下是为您生成的投标文件草稿') ||
	          (normalized.includes('投标文件草稿') && normalized.includes('[TENDER_DOC]'));

	        if (looksLikeIntro) {
	          // 删除这行提示，并继续查看后面的行是否仍然属于提示性说明
	          firstContentLineIndex += 1;
	          removedIntroLines += 1;
	          continue;
	        }

	        // 如果已经删除过至少一行提示，再遇到紧跟其后的简短说明行，也一并视为提示删除
	        if (
	          removedIntroLines > 0 &&
	          !trimmed.startsWith('#') &&
	          !/^(第[一二三四五六七八九十]+章)/.test(trimmed)
	        ) {
	          firstContentLineIndex += 1;
	          removedIntroLines += 1;
	          continue;
	        }

	        // 遇到真正的正文内容时停止
	        break;
	      }

	      if (firstContentLineIndex > 0) {
	        lines = lines.slice(firstContentLineIndex);
	      }
	    }

	    // 再额外处理中文封面顶部常见的“正本 / 副本”字样：
	    // 如果它出现在正文最前面（在第一个非空行），则直接从导出的 Word 中移除，
	    // 避免在封面最上方单独占一行。
	    if (lang === 'zh') {
	      let firstNonEmptyIndex = 0;
	      while (firstNonEmptyIndex < lines.length && !lines[firstNonEmptyIndex]!.trim()) {
	        firstNonEmptyIndex += 1;
	      }
	      if (firstNonEmptyIndex < lines.length) {
	        const firstLineNormalized = lines[firstNonEmptyIndex]!
	          .trim()
	          .replace(/\s+/g, '');
	        if (firstLineNormalized === '正本' || firstLineNormalized === '副本') {
	          lines.splice(firstNonEmptyIndex, 1);
	        }
	      }
	    }

				    // 统一的标题识别：同时支持 Markdown 标题（#、## 等）和中文“第×章”“一、二、三……”样式
				    const detectHeadingFromLine = (
				      trimmedLine: string,
				    ): { level: number; text: string } | null => {
				      if (!trimmedLine) return null;

				      // 1）优先识别 Markdown 标题（# 开头）
				      const markdownMatch = trimmedLine.match(/^(#{1,6})\s+(.*)$/);
				      if (markdownMatch) {
				        const levelFromHashes = markdownMatch[1].length;
				        const rawText = markdownMatch[2];
				        const text = normalizePlaceholders(rawText).trim() || ' ';
				        if (!text) return null;

				        if (lang === 'zh') {
				          const normalized = text.trim();
				          // 形如“第一章 ……”，无论 # 数量多少，都视为一级标题
				          if (/^第[一二三四五六七八九十]+章/.test(normalized)) {
				            return { level: 1, text };
				          }
				          // 形如“一、投标函”“二、商务条款”这类大标题，统一视为二级标题
				          if (/^[一二三四五六七八九十]+[、.．]/.test(normalized)) {
				            return { level: 2, text };
				          }
				        }

				        return { level: levelFromHashes, text };
				      }

				      // 2）无 # 前缀时，对中文样式标题做兜底识别
				      if (lang === 'zh') {
				        const normalized = trimmedLine.trim();
				        if (/^第[一二三四五六七八九十]+章/.test(normalized)) {
				          const text = normalizePlaceholders(normalized).trim() || ' ';
				          if (!text) return null;
				          return { level: 1, text };
				        }
				        if (/^[一二三四五六七八九十]+[、.．]/.test(normalized)) {
				          const text = normalizePlaceholders(normalized).trim() || ' ';
				          if (!text) return null;
				          return { level: 2, text };
				        }
				      }

				      return null;
				    };

				    // 先扫一遍正文，收集需要出现在目录里的标题（支持 # / ## 以及“第×章”“一、二、三……”）
				    const tocEntries: { level: number; text: string }[] = [];
				    const seenTocKeys = new Set<string>();
				    for (const rawLine of lines) {
				      const trimmedLine = rawLine.trim();
				      if (!trimmedLine) continue;
				      const headingInfo = detectHeadingFromLine(trimmedLine);
				      if (!headingInfo) continue;
				      const { level, text } = headingInfo;
				      if (level > 2) continue;
				      const normalizedText = text.trim();
				      if (!normalizedText) continue;
				      const key = `${level}::${normalizedText.replace(/\s+/g, '')}`;
				      if (seenTocKeys.has(key)) continue;
				      seenTocKeys.add(key);
				      tocEntries.push({ level, text: normalizedText });
				    }
			    // 过滤掉不希望出现在目录中的封面类标题：
			    // 1）顶层的“正本 / 副本”等封面字样；
			    // 2）形如“项目名称：xxx”“招标编号：xxx”的项目基础信息行（这些内容只在正文中保留，不出现在目录里）。
			    const filteredTocEntries = tocEntries.filter((entry) => {
			      const normalizedText = entry.text.replace(/\s+/g, '').replace(/[()（）]/g, '');
			      // 顶层封面标题
			      if (entry.level === 1 && (normalizedText === '正本' || normalizedText === '副本')) {
			        return false;
			      }
			      // “项目名称：……”"招标编号：……” 这种行不出现在目录中
			      const trimmed = entry.text.trim();
			      if (/^项目名称[:：]/.test(trimmed) || /^招标编号[:：]/.test(trimmed)) {
			        return false;
			      }
			      // 中文场景下，再额外过滤掉：
			      // 1）类似“XXX项目”这类封面项目全称（通常是一级标题，且不以“第×章”开头）；
			      // 2）“投标文件”“投标文件（正本/副本）”这类封面字样；
			      // 3）形如“第四章投标文件格式”这样的 RFP 模板章节标题，不希望出现在目录中。
			      if (lang === 'zh') {
			        // 1）封面项目名称：“XXX项目”（但排除“第一章 项目概况”这类正式章节）
			        const isCoverProjectTitle =
			          entry.level === 1 &&
			          !/^第[一二三四五六七八九十]+章/.test(normalizedText) &&
			          /项目$/.test(normalizedText);
			        if (isCoverProjectTitle) {
			          return false;
			        }

			        // 2）“投标文件”“投标文件正本/副本”
			        if (/^投标文件(正本|副本)?$/.test(normalizedText)) {
			          return false;
			        }

			        // 3）“第×章 投标文件格式”一类模板章节
			        if (/^第[一二三四五六七八九十]+章.*投标文件格式/.test(normalizedText)) {
			          return false;
			        }
			      }
			      return true;
			    });

				    const children: (Paragraph | Table)[] = [];

		    // 先插入一个醒目的“目录”标题（纯静态文字，不参与自动目录计算）
		    children.push(
		      new Paragraph({
		        alignment: AlignmentType.CENTER,
		        children: [
		          new TextRun({
		            text: lang === 'en' ? 'Table of Contents' : '目录',
		            bold: true,
		            size: 32, // 三号：16pt = 32 half-points
		            color: '000000',
		            font: lang === 'en' ? 'Calibri' : '宋体',
		          }),
		        ],
		      }),
		    );

		    // 再插入 Word 自动目录字段，真正生成目录条目和页码
		    // 样式通过文档 styles 中的 TOCHeading / TOC1 控制
			    // children.push(
			    //   new TableOfContents('', {
			    //     hyperlink: true,
			    //     headingStyleRange: '1-2',
			    //   }),
			    // );

			    // 后续正文从新的一页开始，保证目录单独占用前面若干页
			    // 手动目录的每一行：根据标题级别做缩进和字号
			    for (const entry of filteredTocEntries) {
			      const isLevel1 = entry.level === 1;
			      children.push(
			        new Paragraph({
			          alignment: AlignmentType.LEFT,
			          spacing: {
			            before: 120,
			            after: 120,
			          },
			          indent: isLevel1 ? undefined : { left: 720 }, // 二级标题向右缩进 0.5 英寸
			          children: [
			            new TextRun({
			              text: entry.text,
			              bold: isLevel1,
			              size: isLevel1 ? 32 : 28, // 一级：三号；二级：四号
			              color: '000000',
			              font: lang === 'en' ? 'Calibri' : '宋体',
			            }),
			          ],
			        }),
			      );
			    }

				    // 注意：不再在目录末尾额外插入一个仅带 pageBreakBefore 的空段落，
				    // 避免在正文第一页顶部出现多余的“空白行”。章节是否起新页，交由各自的标题
				    // 的 pageBreakBefore 逻辑控制（例如 “第×章 投标文件格式” 单独起页等）。

		    let index = 0;
		    let currentHeadingText = '';
		    // 记录上一条标题信息，便于在中文场景下控制分页（例如：
		    // “第四章 投标文件格式” 与紧随其后的 “一、投标函” 保持在同一页）。
		    // 这里不强依赖 docx 的 HeadingLevel 类型定义，使用 any 即可满足等值判断需求。
		    let previousHeadingLevel: any = null;
		    let previousHeadingTextNormalized: string | null = null;

    while (index < lines.length) {
      const line = lines[index] ?? '';
      const trimmed = line.trim();

	      // 忽略章节之间用于分隔的 “---” / "____" 等水平线，只在 Markdown 中起分割作用，不需要出现在 Word 正文里
	      const isHorizontalRule = (() => {
	        if (!trimmed) return false;
	        const stripped = trimmed.replace(/[-_—\s]/g, '');
	        return stripped.length === 0 && /[-_—]/.test(trimmed) && trimmed.length >= 3;
	      })();
	      if (isHorizontalRule) {
	        index += 1;
	        continue;
	      }

	      // 空行处理：
	      // 1）普通段落之间保留一个空行，对应一个空段落；
	      // 2）但如果后面紧跟的是 Markdown 标题（# 开头），则不在标题上方再插入空行，
	      //    避免在 Word 中出现“标题上方多出一行空白”的效果。
	      if (!trimmed) {
	        // 向后查找下一个非空行
	        let lookahead = index + 1;
	        while (lookahead < lines.length) {
	          const laLine = lines[lookahead] ?? '';
	          const laTrimmed = laLine.trim();
	          if (!laTrimmed) {
	            lookahead += 1;
	            continue;
	          }
	          // 如果下一个真正有内容的行是标题，则丢弃当前这条空行
	          if (/^(#{1,6})\s+/.test(laTrimmed)) {
	            index += 1;
	            break;
	          }
	          // 否则，这是段落之间的普通空行，保留一个空段落
	          children.push(new Paragraph(' '));
	          index += 1;
	          break;
	        }
	        // 如果已经到文末（后面没有任何非空行），则不再额外插入空段落
	        if (lookahead >= lines.length) {
	          index += 1;
	        }
	        continue;
	      }

      // Markdown 标题 -> Word 标题
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const rawText = headingMatch[2];
        const text = normalizePlaceholders(rawText).trim() || ' ';
        currentHeadingText = text;

	        let headingLevel;
	        let headingFontSize: number | undefined;
	        if (level === 1) {
	          // 顶层章节标题（例如“第四章  投标文件格式”）：二号（22pt => 44 half-points）
	          headingLevel = HeadingLevel.HEADING_1;
	          headingFontSize = 44;
	        } else if (level === 2) {
	          // 章节内小标题（例如“一、投标函”）：小二号（18pt => 36 half-points）
	          headingLevel = HeadingLevel.HEADING_2;
	          headingFontSize = 36;
	        } else if (level === 3) {
	          headingLevel = HeadingLevel.HEADING_3;
	        } else if (level === 4) {
	          headingLevel = HeadingLevel.HEADING_4;
	        } else if (level === 5) {
	          headingLevel = HeadingLevel.HEADING_5;
	        } else {
	          headingLevel = HeadingLevel.HEADING_6;
	        }

		        // 中文场景下，细致控制章节分页：
		        // 1）“第×章 投标文件格式” 这一类章节标题单独起页；
		        // 2）紧跟在该章节标题后的第一个“一、投标函”不再单独起页，
		        //    避免出现“第四章 投标文件格式”在上一页、“一、投标函”在下一页的割裂效果；
		        // 3）其它“一、二、三……”这类大标题仍然从新的一页开始。
		        let pageBreakBefore = false;
		        if (lang === 'zh') {
	          const normalizedNoSpace = text.trim().replace(/\s+/g, '');
	
	          // 1）“第×章 投标文件格式” 单独起页
	          if (
	            headingLevel === HeadingLevel.HEADING_1 &&
	            /^第[一二三四五六七八九十]+章.*投标文件格式/.test(normalizedNoSpace)
	          ) {
	            pageBreakBefore = true;
	          }
	
	          // 2）“一、二、三……”大章节：除非紧跟在“第×章 投标文件格式”后面，否则单独起页
	          if (headingLevel === HeadingLevel.HEADING_2) {
	            const normalizedHeadingText = text.trim();
	            const isChineseMainSection =
	              /^[一二三四五六七八九十]+[、.．]/.test(normalizedHeadingText);
	            if (isChineseMainSection) {
	              const prevIsBidFormatChapter =
	                previousHeadingLevel === HeadingLevel.HEADING_1 &&
	                !!previousHeadingTextNormalized &&
	                /^第[一二三四五六七八九十]+章.*投标文件格式/.test(
	                  previousHeadingTextNormalized,
	                );
	
	              // 紧跟在“第×章 投标文件格式”后的第一个“一、投标函”与章节标题同页，其余仍然起新页
	              if (!prevIsBidFormatChapter) {
	                pageBreakBefore = true;
	              }
	            }
		          }
		        }

		        children.push(
		          new Paragraph({
		            heading: headingLevel,
		            alignment: AlignmentType.CENTER,
		            pageBreakBefore,
		            children: [
		              new TextRun({
		                text,
		                bold: true,
		                size: headingFontSize,
		                color: '000000',
		                font: lang === 'en' ? 'Calibri' : ' ',
		              }),
		            ],
		          }),
		        );

	        // 记录当前标题，供后续标题的分页逻辑使用
	        previousHeadingLevel = headingLevel;
	        previousHeadingTextNormalized = text.trim().replace(/\s+/g, '');

        index += 1;
        continue;
      }

      // 简单识别 Markdown 表格：连续多行都包含 "|" 时，将其转换为 Word 表格
      if (line.includes('|')) {
        const tableLines: string[] = [];
        while (index < lines.length && (lines[index] ?? '').includes('|')) {
          tableLines.push(lines[index] ?? '');
          index += 1;
        }

        const tableRowsRaw = tableLines
          .map((raw) => raw.trim())
          .filter((raw) => raw.length > 0)
          // 跳过 Markdown 表格里的对齐分隔行（例如 | :--- | :--- | 这种）
          .filter((raw) => !isMarkdownTableSeparatorRow(raw));

        if (tableRowsRaw.length > 0) {
          const [headerRaw, ...bodyRaw] = tableRowsRaw;
          const headerCells = parseMarkdownRowCells(headerRaw);

          const isBidPriceTable = currentHeadingText.replace(/\s/g, '').includes('投标报价表');
          const isBidItemTable = currentHeadingText.replace(/\s/g, '').includes('分项报价表');

	          if (isBidPriceTable) {
	            // 表四：投标报价表
	            // 根据每一行左侧标签内容，精细控制右侧单元格，确保所有“需用户填写”的地方保持空白
	            const rows: TableRow[] = tableRowsRaw.map((rawRow) => {
	              const cells = parseMarkdownRowCells(rawRow);
	              const labelRaw = cells[0] ?? '';
	              const valueRaw = cells[1] ?? '';
	              const labelText = normalizePlaceholders(labelRaw) || ' ';
	              const labelKey = labelText.replace(/\s/g, '');
	              const normalizedValue = normalizePlaceholders(valueRaw);

	              // 左侧标签单元格（统一居中）
	              const leftCell = new TableCell({
	                verticalAlign: VerticalAlign.CENTER,
	                children: [
	                  new Paragraph({
	                    alignment: AlignmentType.CENTER,
		                    children: [
		                      new TextRun({
		                        text: labelText,
		                        color: '000000',
		                      }),
		                    ],
	                  }),
	                ],
	              });

	              let rightCell: TableCell;

	              if (labelKey.includes('投标报价')) {
	                // “投标报价”行：按模板固定为两行“小写： 元”“大写： 元”，金额留空
	                rightCell = new TableCell({
	                  verticalAlign: VerticalAlign.CENTER,
	                  children: [
	                    new Paragraph({
	                      alignment: AlignmentType.LEFT,
		                      children: [
		                        new TextRun({
		                          text: '小写：        元',
		                          color: '000000',
		                        }),
		                      ],
	                    }),
	                    new Paragraph({
	                      alignment: AlignmentType.LEFT,
		                      children: [
		                        new TextRun({
		                          text: '大写：        元',
		                          color: '000000',
		                        }),
		                      ],
	                    }),
	                  ],
	                });
	              } else if (labelKey.includes('保证金情况')) {
	                // “保证金情况（请在□内打√）”行：右侧只保留两个空的选项框
	                rightCell = new TableCell({
	                  verticalAlign: VerticalAlign.CENTER,
	                  children: [
	                    new Paragraph({
	                      alignment: AlignmentType.LEFT,
		                      children: [
		                        new TextRun({
		                          text: '□有      □无',
		                          color: '000000',
		                        }),
		                      ],
	                    }),
	                  ],
	                });
	              } else if (labelKey.includes('备注')) {
	                // “备注”行：保留税率模板，百分比位置留空
	                rightCell = new TableCell({
	                  verticalAlign: VerticalAlign.CENTER,
	                  children: [
	                    new Paragraph({
	                      alignment: AlignmentType.LEFT,
	                      children: [
		                        new TextRun({
		                          text: '税率：        %（注：若是小微企业，请在此注明）',
		                          color: '000000',
		                        }),
	                      ],
	                    }),
	                  ],
	                });
	              } else if (labelKey.includes('交货期') || labelKey.includes('售后服务承诺')) {
	                // 交货期、售后服务承诺行：整格留空，完全由用户填写
	                rightCell = new TableCell({
	                  verticalAlign: VerticalAlign.CENTER,
	                  children: [
	                    new Paragraph({
	                      alignment: AlignmentType.LEFT,
		                      children: [
		                        new TextRun({ text: ' ', color: '000000' }),
		                      ],
	                    }),
	                  ],
	                });
	              } else {
	                // 默认：保持 AI 给出的值（例如项目名称、招标编号），但依旧左对齐
	                rightCell = new TableCell({
	                  verticalAlign: VerticalAlign.CENTER,
	                  children: [
	                    new Paragraph({
	                      alignment: AlignmentType.LEFT,
		                      children: [
		                        new TextRun({
		                          text: normalizedValue || ' ',
		                          color: '000000',
		                        }),
		                      ],
	                    }),
	                  ],
	                });
	              }

	              return new TableRow({
	                height: { value: DEFAULT_TABLE_ROW_HEIGHT, rule: HeightRule.ATLEAST },
	                children: [leftCell, rightCell],
	              });
	            });

	            children.push(
	              new Table({
	                width: { size: 100, type: WidthType.PERCENTAGE },
	                rows,
	                borders: COMMON_TABLE_BORDERS,
	              }),
	            );
          } else {
            // 其它表格（含分项报价表）
            let brandColumnIndex = -1;
            if (isBidItemTable && headerCells.length > 0) {
              brandColumnIndex = headerCells.findIndex((cell) =>
                cell.replace(/\s/g, '').includes('品牌'),
              );
            }

	            const headerRow = createTableRowFromMarkdown(headerRaw, true, {
	              fontName: lang === 'en' ? 'Calibri' : '宋体',
	            });
	
	            // 过滤掉整行都是 "..." / "…" 的占位行（例如表格最后一行的省略号），不导出到 Word
	            const filteredBodyRaw = bodyRaw.filter((rawRow) => {
	              const cells = parseMarkdownRowCells(rawRow);
	              if (cells.length === 0) return false;
	              const allEllipsis = cells.every((cell) => {
	                const t = normalizePlaceholders(cell).replace(/\s/g, '');
	                return t === '...' || t === '…';
	              });
	              return !allEllipsis;
	            });
	
		            const bodyRows = filteredBodyRaw.map((rawRow) =>
		              createTableRowFromMarkdown(rawRow, false, {
		                // 只有分项报价表的内容行使用小五字号（9pt => 18 half-points），
		                // 其它表格默认为小四字号（12pt => 24 half-points）。
		                fontSizeHalfPoints: isBidItemTable ? 18 : 24,
		                // 分项报价表中“品牌”列内容全部留空，方便用户手填
		                emptyColumnIndexes:
		                  isBidItemTable && brandColumnIndex >= 0 ? [brandColumnIndex] : [],
		                fontName: lang === 'en' ? 'Calibri' : '宋体',
		              }),
		            );

            const tableWidth = isBidItemTable
              ? { size: cmToTwip(15.44), type: WidthType.DXA }
              : { size: 100, type: WidthType.PERCENTAGE };

            children.push(
              new Table({
                width: tableWidth,
                rows: [headerRow, ...bodyRows],
                borders: COMMON_TABLE_BORDERS,
              }),
            );
          }
        }

        continue;
      }

	      // 普通段落
	      const paragraphText = normalizePlaceholders(line);
	      const matchKey = (paragraphText || '').replace(/\s/g, '');
	      let paragraph: Paragraph;

	      // 1）签字 / 盖章 / 公章 / 盖单位章 行：小四字号、左对齐，行间距稍大，方便书写
	      // 这里增加一个长度限制，避免像“签字代表（姓名）经正式授权并代表（投标人名称）...”
	      // 这种长句子被误判成签字行
	      const isSignatureLabel =
	        (matchKey.includes('盖章') ||
	          matchKey.includes('签字') ||
	          matchKey.includes('公章') ||
	          matchKey.includes('盖单位章')) &&
	        matchKey.length <= 30;
	
	      if (isSignatureLabel) {
	        paragraph = new Paragraph({
	          alignment: AlignmentType.LEFT,
	          spacing: {
	            before: 200, // 段前略空
	            after: 240, // 段后略空
	            line: 420, // 行距略大于 1.5 倍
	          },
	          children: [
	            new TextRun({
			              text: paragraphText || ' ',
			              size: 24, // 小四号：12pt = 24 half-points
			              color: '000000',
			              font: lang === 'en' ? 'Calibri' : '\u5b8b\u4f53',
	            }),
	          ],
	        });
	      }
	      // 2）“日期：  年  月  日” 这一类行：整体小四字号，左对齐，行距放大
	      else if (matchKey.includes('日期') && matchKey.includes('年月日')) {
	        paragraph = new Paragraph({
	          alignment: AlignmentType.LEFT,
	          spacing: {
	            before: 200,
	            after: 240,
	            line: 420,
	          },
	          children: [
	            new TextRun({
			              text: paragraphText || ' ',
			              size: 24,
			              color: '000000',
			              font: lang === 'en' ? 'Calibri' : '\u5b8b\u4f53',
	            }),
	          ],
	        });
	      }
	      // 3）只有“年  月  日”的日期行：小四字号、右对齐，行间距同样放大
	      else if (matchKey === '年月日') {
	        paragraph = new Paragraph({
	          alignment: AlignmentType.RIGHT,
	          spacing: {
	            before: 200,
	            after: 200,
	            line: 420,
	          },
	          children: [
	            new TextRun({
			              text: '年    月    日',
			              size: 24,
			              color: '000000',
			              font: lang === 'en' ? 'Calibri' : '\u5b8b\u4f53',
	            }),
	          ],
	        });
		      } else {
		        // 4）其他普通段落：统一使用小四号字号，并根据语言设置中文/英文字体
		        paragraph = new Paragraph({
		          children: [
		            new TextRun({
		              text: paragraphText || ' ',
		              color: '000000',
		              size: 24, // 小四号
		              font: lang === 'en' ? 'Calibri' : '\u5b8b\u4f53',
		            }),
		          ],
		        });
		      }

	      children.push(paragraph);
      index += 1;
    }

		const doc = new Document({
		  features: {
		    // 让 Word 在打开文档时自动更新域，从而生成目录内容和页码
		    updateFields: true,
		  },
		  styles: {
	    	    paragraphStyles: [
	    	      {
	    	        id: 'TOCHeading',
	    	        name: 'TOC Heading',
	    	        basedOn: 'Normal',
	    	        next: 'Normal',
	    	        run: {
	    	          font: '宋体',
	    	          bold: true,
	    	          size: 32, // 三号：16pt = 32 half-points
	    	          color: '000000',
	    	        },
	    	        paragraph: {
	    	          alignment: AlignmentType.CENTER,
	    	        },
	    	      },
	    	      {
	    	        id: 'TOC1',
	    	        name: '目录一级',
	    	        basedOn: 'Normal',
	    	        next: 'Normal',
	    	        run: {
	    	          font: '宋体',
	    	          size: 28, // 四号：14pt = 28 half-points
	    	          color: '000000',
	    	        },
	    	      },
	    	    ],
	    	  },
	    	  sections: [
	    	    {
	    	      properties: {},
	    	      children,
	    	    },
	    	  ],
	    	});

	    const buffer = await Packer.toBuffer(doc);
	    const uint8Array = new Uint8Array(buffer);

    // HTTP 头里的 Content-Disposition 只能使用 ASCII/Latin-1 字符；
    // 这里统一使用英文文件名，真正下载下来的文件名由前端 a.download 控制（可以是中文）。
    const headerFileName = 'bid-draft.docx';

    logger.info('bid-draft-docx: generated docx', {
      contentLength: content.length,
      bufferLength: buffer.byteLength,
      requestDurationMs: Date.now() - requestStartedAt,
    });

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${headerFileName}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    logger.error('bid-draft-docx: failed', {
      error: error?.message ?? String(error),
      stack: error?.stack,
    });
    return NextResponse.json(
      {
        error:
          typeof error?.message === 'string'
            ? error.message
            : 'Failed to export bid draft as Word document',
      },
      { status: 500 },
    );
  }
}
