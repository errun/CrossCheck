import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { extractComplianceMatrix, compareRfpAndBid } from '@/lib/gemini';
import { Language } from '@/types';
import { logger } from '@/lib/logger';

/**
 * POST /api/bid-compare
 * 根据招标文件(RFP)与投标文件进行逐条要求对比
 */
export async function POST(request: NextRequest) {
	const requestStartedAt = Date.now();

	try {
		const formData = await request.formData();
		const rfpFile = formData.get('rfp_file') as File | null;
		const bidFile = formData.get('bid_file') as File | null;
		const modelType = (formData.get('model') as string) || 'default';
		const langValue = (formData.get('lang') as string) || 'zh';
		const lang: Language = langValue === 'en' ? 'en' : 'zh';

		if (!rfpFile || !bidFile) {
			logger.warn('bid-compare: missing rfp or bid file');
			return NextResponse.json(
				{ error: 'Both RFP file and bid file are required' },
				{ status: 400 },
			);
		}

		// 必须登录
		const { userId } = await auth();
		if (!userId) {
			logger.warn('bid-compare: unauthenticated access');
			return NextResponse.json(
				{ error: 'You must be signed in to compare documents.' },
				{ status: 401 },
			);
		}

		// 基础文件信息
		const rfpName = rfpFile.name || '';
		const bidName = bidFile.name || '';
		const rfpLower = rfpName.toLowerCase();
		const bidLower = bidName.toLowerCase();
		const rfpMime = rfpFile.type || '';
		const bidMime = bidFile.type || '';

		const isPdf = (lowerName: string, mimeType: string) =>
			mimeType === 'application/pdf' || lowerName.endsWith('.pdf');
		const isDocx = (lowerName: string, mimeType: string) =>
			mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
			lowerName.endsWith('.docx');

		const rfpIsPdf = isPdf(rfpLower, rfpMime);
		const rfpIsDocx = isDocx(rfpLower, rfpMime);
		const bidIsPdf = isPdf(bidLower, bidMime);
		const bidIsDocx = isDocx(bidLower, bidMime);

		if (!rfpIsPdf && !rfpIsDocx) {
			logger.warn('bid-compare: unsupported RFP file type', { rfpName, rfpMime });
			return NextResponse.json(
				{ error: 'RFP must be a PDF or Word (.docx) file' },
				{ status: 400 },
			);
		}

		if (!bidIsPdf && !bidIsDocx) {
			logger.warn('bid-compare: unsupported bid file type', { bidName, bidMime });
			return NextResponse.json(
				{ error: 'Bid document must be a PDF or Word (.docx) file' },
				{ status: 400 },
			);
		}

		// 单文件大小限制（默认 100MB）
		const maxSize = parseInt(process.env.MAX_FILE_SIZE || '104857600');
		if (rfpFile.size > maxSize || bidFile.size > maxSize) {
			return NextResponse.json(
				{ error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` },
				{ status: 400 },
			);
		}

			// 积分计算：按两份文件的总大小计费
		const clerk = await clerkClient();
		const user = await clerk.users.getUser(userId);
		const privateMetadata = (user.privateMetadata || {}) as Record<string, any>;
		const DEFAULT_INITIAL_CREDITS = 200;
		const currentCredits =
			typeof privateMetadata.credits === 'number'
				? privateMetadata.credits
				: DEFAULT_INITIAL_CREDITS;

			const totalBytes = rfpFile.size + bidFile.size;
			const sizeInMB = totalBytes / (1024 * 1024);
			const blocks = Math.max(1, Math.ceil(sizeInMB / 10));
			// 临时：测试阶段不扣积分，保持 cost = 0，方便你反复调试
			// 如果后续要恢复计费，可以改回：const cost = blocks * 15
			const cost = 0;

		if (currentCredits < cost) {
			logger.warn('bid-compare: insufficient credits', {
				userId,
				required: cost,
				currentCredits,
				rfpName,
				bidName,
			});
			return NextResponse.json(
				{
					error: 'Insufficient credits',
					credits: currentCredits,
					required: cost,
				},
				{ status: 402 },
			);
		}

			const newBalance = currentCredits - cost;
		await clerk.users.updateUserMetadata(userId, {
			privateMetadata: {
				...privateMetadata,
				credits: newBalance,
			},
			publicMetadata: {
				...(user.publicMetadata as Record<string, any>),
				credits: newBalance,
			},
		});

		logger.info('bid-compare: request accepted', {
			userId,
			rfpName,
			bidName,
			rfpSize: rfpFile.size,
			bidSize: bidFile.size,
			lang,
			modelType,
			cost,
			remainingCredits: newBalance,
		});

		// 解析文本（不落盘，直接内存处理）
		const [rfpArrayBuffer, bidArrayBuffer] = await Promise.all([
			rfpFile.arrayBuffer(),
			bidFile.arrayBuffer(),
		]);
		const rfpBuffer = Buffer.from(rfpArrayBuffer);
		const bidBuffer = Buffer.from(bidArrayBuffer);

		let rfpText = '';
		let bidText = '';

		if (rfpIsPdf) {
			const pdfData = await pdf(rfpBuffer);
			rfpText = pdfData.text;
			logger.info('bid-compare: parsed RFP pdf', {
				pages: pdfData.numpages,
				textLength: rfpText.length,
			});
		} else if (rfpIsDocx) {
			const docxResult = await mammoth.extractRawText({ buffer: rfpBuffer });
			rfpText = docxResult.value || '';
			logger.info('bid-compare: parsed RFP docx', {
				textLength: rfpText.length,
			});
		}

		if (bidIsPdf) {
			const pdfData = await pdf(bidBuffer);
			bidText = pdfData.text;
			logger.info('bid-compare: parsed bid pdf', {
				pages: pdfData.numpages,
				textLength: bidText.length,
			});
		} else if (bidIsDocx) {
			const docxResult = await mammoth.extractRawText({ buffer: bidBuffer });
			bidText = docxResult.value || '';
			logger.info('bid-compare: parsed bid docx', {
				textLength: bidText.length,
			});
		}

		// 先对 RFP 提取合规矩阵要求
		logger.info('bid-compare: calling compliance matrix AI', {
			lang,
			modelType,
			rfpTextLength: rfpText.length,
		});
		const matrixStart = Date.now();
			const matrixResult = await extractComplianceMatrix(rfpText, modelType, lang);
			logger.info('bid-compare: compliance matrix completed', {
				requirements: matrixResult.items.length,
				durationMs: Date.now() - matrixStart,
			});
			if (!matrixResult.items.length) {
				logger.warn('bid-compare: compliance matrix returned 0 requirements', {
					rfpTextLength: rfpText.length,
					rfpPreview: rfpText.substring(0, 1000),
				});
			}

			// 测试阶段：为了避免对比 JSON 过长被截断，这里只取前 25 条要求参与对比
			const MAX_REQUIREMENTS_FOR_COMPARE = 25;
			const requirementsForCompare = matrixResult.items.slice(0, MAX_REQUIREMENTS_FOR_COMPARE);
			logger.info('bid-compare: using truncated requirements for comparison', {
				originalCount: matrixResult.items.length,
				usedCount: requirementsForCompare.length,
			});

			// 再根据（截断后的）要求列表 + 投标全文做对比
			const compareStart = Date.now();
			const compareResult = await compareRfpAndBid(
				requirementsForCompare,
				bidText,
				modelType,
				lang,
			);
			logger.info('bid-compare: comparison completed', {
				items: compareResult.items.length,
				summary: compareResult.summary,
				durationMs: Date.now() - compareStart,
				requestDurationMs: Date.now() - requestStartedAt,
			});
			if (!compareResult.items.length || !compareResult.summary.total) {
				logger.warn('bid-compare: comparison result is empty or zero summary', {
					requirementsCount: requirementsForCompare.length,
					bidTextLength: bidText.length,
					bidPreview: bidText.substring(0, 1000),
					parsedSummary: compareResult.summary,
				});
			}

		return NextResponse.json(compareResult);
	} catch (error: any) {
		logger.error('bid-compare: failed', {
			error: error?.message,
			stack: error?.stack,
		});
		return NextResponse.json(
			{ error: error?.message || 'Bid comparison failed' },
			{ status: 500 },
		);
	}
}
