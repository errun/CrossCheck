import { NextRequest, NextResponse } from 'next/server';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';

export const runtime = 'nodejs';
const plain = (text: string) => text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/<br\s*\/?>/gi, ' ');
const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(v => plain(v.trim()));

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body.content !== 'string' || body.content.length < 80 || body.content.length > 100_000) return NextResponse.json({ error: '请先生成完整草稿。' }, { status: 400 });
    const children: (Paragraph | Table)[] = [];
    const lines = body.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || /^---+$/.test(line)) continue;
      if (line.startsWith('|')) {
        const rows: string[][] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          const row = cells(lines[i]);
          if (!row.every(cell => /^:?-{3,}:?$/.test(cell))) rows.push(row);
          i++;
        }
        i--;
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rows.map((row, index) => new TableRow({ tableHeader: index === 0, children: row.map(cell => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: cell, bold: index === 0 })] })] })) })) }));
      } else {
        const match = line.match(/^(#{1,3})\s+(.+)/);
        children.push(new Paragraph({ text: plain(match ? match[2] : line), ...(match ? { heading: match[1].length === 1 ? HeadingLevel.HEADING_1 : match[1].length === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3 } : {}), spacing: { after: 160 } }));
      }
    }
    const doc = new Document({ styles: { default: { document: { run: { font: 'SimSun', size: 22, color: '000000' } } } }, sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }] });
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': 'attachment; filename="bid-draft.docx"', 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: '草稿导出失败，请重新生成后再试。' }, { status: 500 }); }
}
