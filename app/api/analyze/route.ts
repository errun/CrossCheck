import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { analyzeWithGemini } from '@/lib/gemini';
import { cacheManager } from '@/lib/cache';
import { AnalysisResult } from '@/types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * POST /api/analyze
 * 上传 PDF / Word 并进行分析
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const modelType = (formData.get('model') as string) || 'default';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileName = file.name || '';
    const lowerName = fileName.toLowerCase();
    const mimeType = file.type || '';

    // 支持 PDF 和 Word(.docx)
    const isPdf =
      mimeType === 'application/pdf' ||
      lowerName.endsWith('.pdf');

    const isDocx =
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lowerName.endsWith('.docx');

    if (!isPdf && !isDocx) {
      return NextResponse.json(
        { error: 'Only PDF or Word (.docx) files are supported' },
        { status: 400 }
      );
    }

    // 检查文件大小（默认 50MB）
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800');
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    console.log(`Processing file: ${file.name}, size: ${file.size} bytes, model: ${modelType}`);

    // 1. 生成 doc_id
    const docId = crypto.randomUUID();

    // 2. 保存原始文件到临时目录
    const uploadDir = join(process.cwd(), 'tmp', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = isPdf ? 'pdf' : 'docx';
    const filePath = join(uploadDir, `${docId}.${ext}`);
    await writeFile(filePath, buffer);

    console.log(`File saved to: ${filePath}`);

    // 3. 解析文本
    let fullText = '';
    let totalPages = 0;

    if (isPdf) {
      const pdfData = await pdf(buffer);
      fullText = pdfData.text;
      totalPages = pdfData.numpages;
      console.log(`PDF parsed: ${totalPages} pages, ${fullText.length} characters`);
    } else if (isDocx) {
      const docxResult = await mammoth.extractRawText({ buffer });
      fullText = docxResult.value || '';
      // Word 无法直接获知页数，这里按字符数粗略估算页数，主要用于进度展示
      totalPages = Math.max(1, Math.round(fullText.length / 1800));
      console.log(`DOCX parsed: ~${totalPages} pages (estimated), ${fullText.length} characters`);
    }

    // 4. 调用 AI 分析
    console.log(`Calling AI for analysis with model: ${modelType}...`);
    const aiResult = await analyzeWithGemini(fullText, modelType);

    // 5. 存入内存缓存
    const result: AnalysisResult = {
      doc_id: docId,
      total_pages: totalPages,
      errors: aiResult.errors,
      status: 'completed',
      created_at: Date.now(),
      // 仅对 PDF 保留路径，供后续可能的 PDF 预览使用
      pdf_path: isPdf ? filePath : undefined,
    };
    
    cacheManager.set(docId, result);
    
    console.log(`Analysis completed: ${aiResult.errors.length} errors found`);
    
    // 5. 返回结果
    return NextResponse.json({
      doc_id: docId,
      total_pages: totalPages,
      errors: aiResult.errors,
      error_count: aiResult.errors.length,
    });
    
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analyze?doc_id=xxx
 * 获取分析结果
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const docId = searchParams.get('doc_id');
  
  if (!docId) {
    return NextResponse.json(
      { error: 'doc_id is required' },
      { status: 400 }
    );
  }
  
  const result = cacheManager.get(docId);
  
  if (!result) {
    return NextResponse.json(
      { error: 'Document not found or expired' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(result);
}

