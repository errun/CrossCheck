import { NextRequest, NextResponse } from 'next/server';
import { cacheManager } from '@/lib/cache';
import { ErrorItem } from '@/types';
import { logger } from '@/lib/logger';

// The browser sends the reviewed result; export works across serverless instances.
export async function POST(request: NextRequest) {
  try {
    const { errors } = await request.json();
    if (!Array.isArray(errors) || errors.length > 1000 || errors.some((e: any) => !e || !['P1', 'P2', 'P3'].includes(e.priority) || typeof e.snippet !== 'string' || typeof e.suggestion !== 'string' || typeof e.title !== 'string' || typeof e.rule_id !== 'string' || !Number.isFinite(e.confidence) || !Number.isInteger(e.page_no))) return NextResponse.json({ error: 'Invalid checklist' }, { status: 400 });
    return new NextResponse(generateCSV(errors), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="bid-checklist.csv"', 'Cache-Control': 'no-store' } });
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
    const csv = generateCSV(result.errors);
    
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
function generateCSV(errors: ErrorItem[]): string {
  // 添加 BOM 以支持中文
  const BOM = '\ufeff';
  
  // 按优先级分组
  const p1Errors = errors.filter(e => e.priority === 'P1');
  const p2Errors = errors.filter(e => e.priority === 'P2');
  const p3Errors = errors.filter(e => e.priority === 'P3');
  
  let csv = BOM;
  
  // 致命问题 (P1)
  csv += '一、🚨 致命问题（P1 - 直接导致废标的风险）\n';
  csv += '序号,检查项ID,问题描述,风险类型,修正建议,证据页码,置信度\n';
  p1Errors.forEach((err, index) => {
    csv += `${index + 1},${err.rule_id},"${escapeCSV(err.snippet)}",${err.title},"${escapeCSV(err.suggestion)}",第${err.page_no}页,${(err.confidence * 100).toFixed(0)}%\n`;
  });
  
  csv += '\n';
  
  // 重大问题 (P2)
  csv += '二、📉 重大问题（P2 - 可能导致扣分或不利评审）\n';
  csv += '序号,检查项ID,问题描述,风险类型,影响后果,证据页码,置信度\n';
  p2Errors.forEach((err, index) => {
    csv += `${index + 1},${err.rule_id},"${escapeCSV(err.snippet)}",${err.title},"${escapeCSV(err.suggestion)}",第${err.page_no}页,${(err.confidence * 100).toFixed(0)}%\n`;
  });
  
  csv += '\n';
  
  // 格式问题 (P3)
  csv += '三、✅ 格式与完整性提醒（P3 - 建议优化项）\n';
  csv += '序号,检查项ID,问题描述,风险类型,修正建议,证据页码,置信度\n';
  p3Errors.forEach((err, index) => {
    csv += `${index + 1},${err.rule_id},"${escapeCSV(err.snippet)}",${err.title},"${escapeCSV(err.suggestion)}",第${err.page_no}页,${(err.confidence * 100).toFixed(0)}%\n`;
  });
  
  return csv;
}

/**
 * 转义 CSV 字段中的特殊字符
 */
function escapeCSV(text: string): string {
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return safe.replace(/"/g, '""');
}
