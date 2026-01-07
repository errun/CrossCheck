import { NextRequest, NextResponse } from 'next/server';

import type { MatrixItem } from '@/types';
import { logger } from '@/lib/logger';
import { buildMatrixWorkbook, ExportTemplate } from '@/lib/matrixExport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TEMPLATE_FILENAMES: Record<ExportTemplate, string> = {
	gov: 'Gov_RFP_Compliance_Matrix.xlsx',
	enterprise: 'Enterprise_RFP_Response_Matrix.xlsx',
};

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const template = body?.template as ExportTemplate;

		if (template !== 'gov' && template !== 'enterprise') {
			logger.warn('matrix-export: invalid template', { template });
			return NextResponse.json({ error: 'Invalid template' }, { status: 400 });
		}

		const items = Array.isArray(body?.items) ? (body.items as MatrixItem[]) : [];
		const buffer = buildMatrixWorkbook(template, items);
		// NextResponse expects a Web BodyInit. Node.js Buffer is runtime-compatible
		// but TypeScript can reject Buffer/SharedArrayBuffer types.
		// Copy into a plain ArrayBuffer to keep types (and transport) consistent.
		const arrayBuffer = new ArrayBuffer(buffer.byteLength);
		new Uint8Array(arrayBuffer).set(buffer);

		logger.info('matrix-export: generated workbook', {
			template,
			count: items.length,
		});

		return new NextResponse(arrayBuffer, {
			status: 200,
			headers: {
				'Content-Type':
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${TEMPLATE_FILENAMES[template]}"`,
				'Cache-Control': 'no-store',
			},
		});
	} catch (error: any) {
		const isDev = process.env.NODE_ENV !== 'production';
		logger.error('matrix-export: failed', {
			error: error?.message,
			stack: error?.stack,
			cwd: process.cwd(),
		});
		return NextResponse.json(
			{
				error: 'Failed to export compliance matrix',
				...(isDev
					? {
						details: error?.message,
					}
					: {}),
			},
			{ status: 500 },
		);
	}
}
