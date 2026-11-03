import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { ToolError } from './free-ai';

export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_DOCUMENT_CHARS = 60_000;

export async function readDocument(file: File | null): Promise<{ text: string; pages: number; isPdf: boolean }> {
  if (!file) throw new ToolError('MISSING_FILE', 400, '请选择 PDF 或 Word 文件。', 'Select a PDF or Word document.');
  if (file.size > MAX_FILE_BYTES) throw new ToolError('FILE_TOO_LARGE', 413, '当前版本支持最大4MB的文件，请拆分后上传。', 'The current limit is 4MB. Split the document before uploading.');
  const isPdf = file.name.toLowerCase().endsWith('.pdf');
  const isDocx = file.name.toLowerCase().endsWith('.docx');
  if (!isPdf && !isDocx) throw new ToolError('UNSUPPORTED_FILE', 400, '仅支持 PDF 和 Word .docx 文件。', 'Only PDF and Word .docx files are supported.');
  const buffer = Buffer.from(await file.arrayBuffer());
  let text = '', pages = 0;
  try {
    if (isPdf) {
      const data = await pdf(buffer, { pagerender: async (page: any) => {
        const content = await page.getTextContent();
        let y: number | undefined;
        let line = '';
        for (const item of content.items) {
          if (y !== undefined && item.transform[5] !== y) line += '\n';
          line += item.str;
          y = item.transform[5];
        }
        return `\n[PAGE ${page.pageNumber}]\n${line}\n`;
      } });
      text = data.text; pages = data.numpages;
    } else {
      text = (await mammoth.extractRawText({ buffer })).value;
      text = `[SECTION: Word document; page numbers unavailable]\n${text}`;
    }
  } catch { throw new ToolError('INVALID_DOCUMENT', 422, '无法读取文件，请上传完整的文本型 PDF 或 .docx；扫描件需先识别文字。', 'The document could not be read. Use a valid text PDF or .docx; scanned files require OCR.'); }
  if (text.trim().length < 80) throw new ToolError('NO_DOCUMENT_TEXT', 422, '文件中没有足够的可读取文字，请先识别扫描件文字。', 'The document contains too little readable text. Run OCR first.');
  if (text.length > MAX_DOCUMENT_CHARS || pages > 50) throw new ToolError('DOCUMENT_TOO_LONG', 413, '当前版本支持最多50页、6万字符；请拆分文件。本次未截断或分析部分内容。', 'The current limit is 50 pages and 60,000 characters. Split the document; no partial analysis was performed.');
  return { text, pages, isPdf };
}
