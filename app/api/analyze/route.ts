import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { analyzeWithGemini, extractComplianceMatrix } from '@/lib/gemini';
import { cacheManager } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { AnalysisResult, Language } from '@/types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/analyze
 * 上传 PDF / Word 并进行分析
 */
export async function POST(request: NextRequest) {
  const requestStartedAt = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const modelType = (formData.get('model') as string) || 'default';
		    const langValue = (formData.get('lang') as string) || 'zh';
		    const lang: Language = langValue === 'en' ? 'en' : 'zh';
		    const mode = (formData.get('mode') as string) || 'scan';

	    if (!file) {
	      logger.warn('analyze: missing file payload');
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
      logger.warn('analyze: unsupported file type', { fileName, mimeType });
      return NextResponse.json(
        { error: 'Only PDF or Word (.docx) files are supported' },
        { status: 400 }
      );
    }

	    	// 检查文件大小（默认 100MB）
	    	const maxSize = parseInt(process.env.MAX_FILE_SIZE || '104857600');
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

	    	    // NOTE: Authentication and credit charging are temporarily disabled for low-volume testing.
	    	    logger.info('analyze: request accepted', {
	    	      fileName,
	    	      mimeType,
	    	      fileSize: file.size,
	    	      lang,
	    	      modelType,
	    	      mode,
	    	    });
	    	
	    	    // 1. 生成 doc_id
    const docId = crypto.randomUUID();

    // 2. 保存原始文件到临时目录
    // 在无服务器环境（如 Vercel）中，代码目录通常是只读的，
    // 只能写入操作系统提供的临时目录（通常是 /tmp）。
    // 这里统一使用 os.tmpdir()，本地开发和线上都兼容。
    const uploadDir = join(tmpdir(), 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = isPdf ? 'pdf' : 'docx';
    const filePath = join(uploadDir, `${docId}.${ext}`);
    await writeFile(filePath, buffer);

    logger.debug('analyze: file saved', { docId, filePath });

    // 3. 解析文本
    let fullText = '';
    let totalPages = 0;

	    if (isPdf) {
      const pdfData = await pdf(buffer);
      fullText = pdfData.text;
      totalPages = pdfData.numpages;
      logger.info('analyze: parsed pdf', {
        docId,
        totalPages,
        textLength: fullText.length,
      });
    } else if (isDocx) {
      const docxResult = await mammoth.extractRawText({ buffer });
      fullText = docxResult.value || '';
      // Word 无法直接获知页数，这里按字符数粗略估算页数，主要用于进度展示
      totalPages = Math.max(1, Math.round(fullText.length / 1800));
      logger.info('analyze: parsed docx', {
        docId,
        estimatedPages: totalPages,
        textLength: fullText.length,
      });
	    }

		    // 4. 根据 mode 决定调用哪种 AI 模式
		    if (mode === 'matrix') {
		      const aiStart = Date.now();
		      logger.info('analyze: calling compliance matrix AI', {
		        docId,
		        modelType,
		        lang,
		        textLength: fullText.length,
		      });
		      const matrixResult = await extractComplianceMatrix(fullText, modelType, lang);
		      logger.info('analyze: compliance matrix completed', {
		        docId,
		        durationMs: Date.now() - aiStart,
		        requirements: matrixResult.items.length,
		      });
		      return NextResponse.json({
		        doc_id: docId,
		        total_pages: totalPages,
		        items: matrixResult.items,
		      });
		    }

		    // 默认 scan 模式：保持现有标书扫描逻辑不变
		    const aiStart = Date.now();
		    logger.info('analyze: calling analysis AI', {
		      docId,
		      modelType,
		      lang,
		      textLength: fullText.length,
		    });
		    const aiResult = await analyzeWithGemini(fullText, modelType, lang);

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
	    
	    logger.info('analyze: analysis completed', {
	      docId,
	      durationMs: Date.now() - aiStart,
	      errorCount: aiResult.errors.length,
	    });
	    
	    // 5. 返回结果
	    return NextResponse.json({
	      doc_id: docId,
	      total_pages: totalPages,
	      errors: aiResult.errors,
	      error_count: aiResult.errors.length,
	    });
    
  } catch (error: any) {
	    const message = error?.message || 'Analysis failed';
	    const durationMs = Date.now() - requestStartedAt;

		    const cause = error?.cause;
		    const causeInfo = {
		      causeCode: cause?.code,
		      causeName: cause?.name,
		      causeMessage: cause?.message,
		    };

	    let status = 500;
	    let safeError = message;

	    if (typeof message === 'string') {
	      if (message.includes('OPENROUTER_API_KEY is not configured')) {
	        status = 503;
	        safeError =
	          'OPENROUTER_API_KEY is not configured. Please set it in your environment (.env.local) and restart the dev server.';
	      } else if (message === 'fetch failed') {
	        status = 502;
	        safeError =
	          'Failed to reach OpenRouter (network). Please check outbound internet access and any proxy/VPN settings.';
	      } else if (message.startsWith('OpenRouter API error')) {
	        status = 502;
	        safeError =
	          'OpenRouter API returned an error. Please verify OPENROUTER_API_KEY and your OpenRouter account / rate limits.';
	      }
	    }

	    logger.error('analyze: failed', {
	      error: message,
	      stack: error?.stack,
		      ...causeInfo,
	      durationMs,
	    });

		    // Dev only: attach extra network debug info to speed up troubleshooting
		    const debug =
		      process.env.NODE_ENV !== 'production'
		        ? {
		            message,
		            ...causeInfo,
		          }
		        : undefined;

		    return NextResponse.json(
		      debug ? { error: safeError, debug } : { error: safeError },
		      { status },
		    );
  }
}

/**
 * GET /api/analyze?doc_id=xxx
 * 获取分析结果
 */
export async function GET(request: NextRequest) {
  const requestStartedAt = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const docId = searchParams.get('doc_id');
  
  if (!docId) {
    logger.warn('analyze:get missing doc_id');
    return NextResponse.json(
      { error: 'doc_id is required' },
      { status: 400 }
    );
  }
  
  const result = cacheManager.get(docId);
  
  if (!result) {
    logger.warn('analyze:get doc not found', { docId });
    return NextResponse.json(
      { error: 'Document not found or expired' },
      { status: 404 }
    );
  }
  
  logger.debug('analyze:get cache hit', {
    docId,
    status: result.status,
    totalPages: result.total_pages,
  });
  logger.info('analyze: request finished', {
    docId,
    totalPages: result.total_pages,
    status: result.status,
    durationMs: Date.now() - requestStartedAt,
  });

  return NextResponse.json(result);
}
