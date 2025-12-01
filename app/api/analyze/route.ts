import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { analyzeWithGemini, extractComplianceMatrix } from '@/lib/gemini';
import { cacheManager } from '@/lib/cache';
import { AnalysisResult, Language } from '@/types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
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
		    const langValue = (formData.get('lang') as string) || 'zh';
		    const lang: Language = langValue === 'en' ? 'en' : 'zh';
		    const mode = (formData.get('mode') as string) || 'scan';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

	    // --- Credit system: require authenticated user and charge credits based on file size ---
	    const { userId } = await auth();
	    if (!userId) {
	      return NextResponse.json(
	        { error: 'You must be signed in to analyze documents.' },
	        { status: 401 }
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

	    // 计算本次调用需要消耗的积分：10 credits / 10MB（向上取整，最少 10 积分）
	    const totalBytes = file.size;
	    const sizeInMB = totalBytes / (1024 * 1024);
	    const blocks = Math.max(1, Math.ceil(sizeInMB / 10));
	    const cost = blocks * 10;

	    // 读取当前用户积分（从 privateMetadata），不足则返回 402
	    const clerk = await clerkClient();
	    const user = await clerk.users.getUser(userId);
	    const privateMetadata = (user.privateMetadata || {}) as Record<string, any>;
	    const currentCredits =
	      typeof privateMetadata.credits === 'number' ? privateMetadata.credits : 0;

	    if (currentCredits < cost) {
	      return NextResponse.json(
	        {
	          error: 'Insufficient credits',
	          credits: currentCredits,
	          required: cost,
	        },
	        { status: 402 }
	      );
	    }

	    const newBalance = currentCredits - cost;
	    await clerk.users.updateUserMetadata(userId, {
	      privateMetadata: {
	        ...privateMetadata,
	        credits: newBalance,
	      },
	      // 同步到 publicMetadata，前端导航可以直接读取并展示余额
	      publicMetadata: {
	        ...(user.publicMetadata as Record<string, any>),
	        credits: newBalance,
	      },
	    });

	    console.log(
	      `Processing file: ${file.name}, size: ${file.size} bytes, model: ${modelType}, mode: ${mode}, cost: ${cost}, remaining_credits: ${newBalance}`
	    );

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

		    // 4. 根据 mode 决定调用哪种 AI 模式
		    if (mode === 'matrix') {
		      console.log(`Calling AI for compliance matrix with model: ${modelType}, lang: ${lang}...`);
		      const matrixResult = await extractComplianceMatrix(fullText, modelType, lang);
		      console.log(`Compliance matrix completed: ${matrixResult.items.length} requirements found`);
		      return NextResponse.json({
		        doc_id: docId,
		        total_pages: totalPages,
		        items: matrixResult.items,
		      });
		    }

		    // 默认 scan 模式：保持现有标书扫描逻辑不变
		    console.log(`Calling AI for analysis with model: ${modelType}, lang: ${lang}...`);
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

