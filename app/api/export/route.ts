import { NextRequest, NextResponse } from 'next/server';
import { cacheManager } from '@/lib/cache';
import { ErrorItem } from '@/types';
import { logger } from '@/lib/logger';

// The browser sends the reviewed result; export works across serverless instances.
export async function POST(request: NextRequest) {
  try {
    const { errors, lang: requestedLang } = await request.json();
    const lang = requestedLang === 'en' ? 'en' : 'zh';
    if (!Array.isArray(errors) || errors.length > 1000 || errors.some((e: any) => !e || !['P1', 'P2', 'P3'].includes(e.priority) || typeof e.snippet !== 'string' || typeof e.suggestion !== 'string' || typeof e.title !== 'string' || typeof e.rule_id !== 'string' || !Number.isFinite(e.confidence) || !Number.isInteger(e.page_no))) return NextResponse.json({ error: 'Invalid checklist' }, { status: 400 });
    return new NextResponse(generateCSV(errors, lang), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="bid-checklist.csv"', 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Invalid checklist' }, { status: 400 }); }
}

/**
 * GET /api/export?doc_id=xxx&format=csv
 * 导出检查清单
 */
export async function GET(request: NextRequest) {
  const requestStartedAt = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const docId = searchParams.get('doc_id');
  const format = searchParams.get('format') || 'csv';
  
  if (!docId) {
    logger.warn('export: missing doc_id');
    return NextResponse.json(
      { error: 'doc_id is required' },
      { status: 400 }
    );
  }
  
  const result = cacheManager.get(docId);
  
  if (!result) {
    logger.warn('export: doc not found', { docId });
    return NextResponse.json(
      { error: 'Document not found or expired' },
      { status: 404 }
    );
  }
  
  if (format === 'csv') {
    const csv = generateCSV(result.errors, searchParams.get('lang') === 'en' ? 'en' : 'zh');
    
    logger.info('export: csv generated', {
      docId,
      errorCount: result.errors.length,
      durationMs: Date.now() - requestStartedAt,
    });

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="标书检查清单_${docId}.csv"`,
      },
    });
  }
  
  logger.warn('export: unsupported format', { docId, format });
  return NextResponse.json(
    { error: 'Unsupported format' },
    { status: 400 }
  );
}

/**
 * 生成 CSV 格式的检查清单
 */
function generateCSV(errors: ErrorItem[], lang: 'zh' | 'en' = 'zh'): string {
  const labels = lang === 'en'
    ? ['Critical findings (P1 - review required)', 'Major findings (P2 - review required)', 'Format and completeness notes (P3)']
    : ['一、🚨 致命问题（P1 - 直接导致废标的风险）', '二、📉 重大问题（P2 - 可能导致扣分或不利评审）', '三、✅ 格式与完整性提醒（P3 - 建议优化项）'];
  const header = lang === 'en' ? 'Number,Rule ID,Evidence,Risk,Suggestion,Source,Confidence' : '序号,检查项ID,问题描述,风险类型,修正建议,证据页码,置信度';
  return '\ufeff' + (['P1', 'P2', 'P3'] as const).map((priority, i) =>
    labels[i] + '\n' + header + '\n' + errors.filter(e => e.priority === priority).map((err, index) => csvRow(err, index, lang)).join('')
  ).join('\n');
}

function csvRow(err: ErrorItem, index: number, lang: 'zh' | 'en'): string {
  return [String(index + 1), err.rule_id, err.snippet, err.title, err.suggestion,
    lang === 'en' ? (err.page_no > 0 ? `Page ${err.page_no}` : 'Source paragraph') : (err.page_no > 0 ? `第${err.page_no}页` : '原文段落'), `${(err.confidence * 100).toFixed(0)}%`]
    .map(value => `"${escapeCSV(value)}"`).join(',') + '\n';
}

function escapeCSV(text: string): string {
  const safe = /^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return safe.replace(/"/g, '""');
}
