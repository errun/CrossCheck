import { NextRequest, NextResponse } from 'next/server';
import { cacheManager } from '@/lib/cache';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * GET /api/pdf/[docId]
 * 获取 PDF 文件
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { docId: string } }
) {
  try {
    const { docId } = params;
    
    // 从缓存中获取结果
    const result = cacheManager.get(docId);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Document not found or expired' },
        { status: 404 }
      );
    }
    
    if (!result.pdf_path || !existsSync(result.pdf_path)) {
      return NextResponse.json(
        { error: 'PDF file not found' },
        { status: 404 }
      );
    }
    
    // 读取 PDF 文件
    const pdfBuffer = await readFile(result.pdf_path);
    
    // 返回 PDF 文件
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json(
      { error: 'Failed to serve PDF file' },
      { status: 500 }
    );
  }
}

