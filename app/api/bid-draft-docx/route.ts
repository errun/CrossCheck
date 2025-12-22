import { NextRequest, NextResponse } from 'next/server';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow } from 'docx';
import { logger } from '@/lib/logger';
import { Language } from '@/types';

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

	    const lines = content.split(/\r?\n/);
	    const children: (Paragraph | Table)[] = [];
	    let index = 0;

	    while (index < lines.length) {
	      const line = lines[index] ?? '';
	      const trimmed = line.trim();

	      // 空行直接作为空段落处理，避免 Word 把所有内容挤在一起
	      if (!trimmed) {
	        children.push(new Paragraph(' '));
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

	        const rows: TableRow[] = tableLines
	          .map((raw) => raw.trim())
	          .filter((raw) => raw.length > 0)
	          .map((raw) => {
	            const cells = raw
	              .split('|')
	              .map((c) => c.trim())
	              .filter((c) => c.length > 0);
	            return new TableRow({
	              children: cells.map(
	                (cellText) =>
	                  new TableCell({
	                    children: [new Paragraph(cellText || ' ')],
	                  }),
	              ),
	            });
	          });

	        if (rows.length > 0) {
	          children.push(
	            new Table({
	              rows,
	            }),
	          );
	        }
	        continue;
	      }

		      // 解析 Markdown 标题为 Word 标题（Heading 级别）
		      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
		      if (headingMatch) {
		        const level = headingMatch[1].length;
		        const text = headingMatch[2].trim() || ' ';
		        // 这里让 TypeScript 通过赋值推断 headingLevel 的类型，避免直接把 HeadingLevel 当作类型使用
		        let headingLevel;
		        if (level === 1) headingLevel = HeadingLevel.HEADING_1;
		        else if (level === 2) headingLevel = HeadingLevel.HEADING_2;
		        else if (level === 3) headingLevel = HeadingLevel.HEADING_3;
		        else if (level === 4) headingLevel = HeadingLevel.HEADING_4;
		        else if (level === 5) headingLevel = HeadingLevel.HEADING_5;
		        else headingLevel = HeadingLevel.HEADING_6;

		        children.push(
		          new Paragraph({
		            text,
		            heading: headingLevel,
		          }),
		        );
		        index += 1;
		        continue;
		      }

	      // 默认按普通段落处理
	      children.push(new Paragraph(line || ' '));
	      index += 1;
	    }

	    const doc = new Document({
	      sections: [
	        {
	          properties: {},
	          children,
	        },
	      ],
	    });

		    const buffer = await Packer.toBuffer(doc);
		    // Next.js Route Handler 的 Response Body 需要符合 DOM BodyInit 类型；
		    // 这里将 Node.js Buffer 显式转换为 Uint8Array，避免类型不兼容报错。
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
	        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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

