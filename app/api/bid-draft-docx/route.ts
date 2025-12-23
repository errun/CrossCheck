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
  options?: { fontSizeHalfPoints?: number; emptyColumnIndexes?: number[] },
): TableRow {
  const cells = parseMarkdownRowCells(raw);
  const fontSizeHalfPoints = options?.fontSizeHalfPoints;
  const emptyColumnIndexes = options?.emptyColumnIndexes ?? [];

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
	                size: fontSizeHalfPoints,
	                color: '000000',
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

			    // 先扫一遍正文，收集需要出现在目录里的标题（这里只收集 # 和 ##）
			    const tocEntries: { level: number; text: string }[] = [];
			    for (const rawLine of lines) {
			      const m = rawLine.trim().match(/^(#{1,6})\s+(.*)$/);
			      if (!m) continue;
			      const level = m[1].length;
			      if (level > 2) continue;
			      const text = normalizePlaceholders(m[2]).trim();
			      if (!text) continue;
			      tocEntries.push({ level, text });
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
			      // “项目名称：……”“招标编号：……” 这种行不出现在目录中
			      const trimmed = entry.text.trim();
			      if (/^项目名称[:：]/.test(trimmed) || /^招标编号[:：]/.test(trimmed)) {
			        return false;
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

			    // 正文从新的一页开始，目录页单独占一页
			    children.push(
			      new Paragraph({
			        children: [],
			        pageBreakBefore: true,
			      }),
			    );

	    let index = 0;
    let currentHeadingText = '';

    while (index < lines.length) {
      const line = lines[index] ?? '';
      const trimmed = line.trim();

      // 空行：输出一个空段落，避免 Word 把所有内容挤在一起
      if (!trimmed) {
        children.push(new Paragraph(' '));
        index += 1;
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

        children.push(
          new Paragraph({
            heading: headingLevel,
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
	                text,
	                bold: true,
	                size: headingFontSize,
	                color: '000000',
              }),
            ],
          }),
        );

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

            const headerRow = createTableRowFromMarkdown(headerRaw, true);
	
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
	                // 只有分项报价表的内容行使用小五字号（9pt => 18 half-points）
	                fontSizeHalfPoints: isBidItemTable ? 18 : undefined,
	                // 分项报价表中“品牌”列内容全部留空，方便用户手填
	                emptyColumnIndexes:
	                  isBidItemTable && brandColumnIndex >= 0 ? [brandColumnIndex] : [],
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
	            }),
	          ],
	        });
	      } else {
	        // 4）其他普通段落：保持原样
		        paragraph = new Paragraph({
		          children: [
		            new TextRun({ text: paragraphText || ' ', color: '000000' }),
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
