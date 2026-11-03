import { NextRequest, NextResponse } from 'next/server';
import { compareRfpAndBid, extractComplianceMatrix } from '@/lib/gemini';
import { readDocument, MAX_FILE_BYTES } from '@/lib/document-input';
import { errorResponse, requirePublicMaterialConsent, ToolError } from '@/lib/free-ai';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  let lang: 'zh' | 'en' = 'zh';
  try {
    const form = await request.formData();
    lang = form.get('lang') === 'en' ? 'en' : 'zh';
    requirePublicMaterialConsent(form);
    const rfp = form.get('rfp_file'), bid = form.get('bid_file');
    if (!(rfp instanceof File) || !(bid instanceof File)) throw new ToolError('MISSING_FILES', 400, '请选择招标文件和投标文件。', 'Select both the RFP and the bid.');
    if (rfp.size + bid.size > MAX_FILE_BYTES) throw new ToolError('FILE_TOO_LARGE', 413, '两个文件合计不得超过4MB，请拆分后上传。', 'The two files must total no more than 4MB.');
    const source = await readDocument(rfp), response = await readDocument(bid);
    const matrix = await extractComplianceMatrix(source.text, 'default', lang);
    const result = await compareRfpAndBid(matrix.items, response.text, 'default', lang);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const safe = errorResponse(error, lang);
    console.warn('comparison_failed', safe.body.code);
    return NextResponse.json(safe.body, { status: safe.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
