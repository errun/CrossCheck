import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

import type { MatrixItem } from '@/types';

export type ExportTemplate = 'gov' | 'enterprise';

export type GovViewRow = {
	'Requirement ID': string;
	'RFP Requirement (Verbatim)': string;
	'Source Section': string;
	'Source Page': number | string;
	'Requirement Type': string;
	'Compliance Status': string;
	'Amendment ID': string;
	'FAR / DFARS Reference': string;
	'Response Owner': string;
	'Proposal Volume': string;
	'Proposal Section': string;
	'Proposal Reference': string;
	'QA Reviewed': string;
	'Risk / Gap': string;
	'Comments / Notes': string;
};

export type EnterpriseViewRow = {
	'Requirement ID': string;
	'Customer Requirement (Verbatim)': string;
	'Customer Priority': string;
	'Source Section': string;
	'Response Strategy': string;
	'Response Owner': string;
	'Deal Stage': string;
	'Proposal Volume': string;
	'Proposal Section': string;
	'Proposal Reference': string;
	'Legal / Risk Flag': string;
	'Comments / Notes': string;
};

const TEMPLATE_FILES: Record<ExportTemplate, string> = {
	gov: 'lib/Gov_RFP_Compliance_Matrix_Template.xlsx',
	enterprise: 'lib/Enterprise_RFP_Response_Matrix_Template.xlsx',
};

const findFileUpwards = (relativePath: string, maxDepth = 10): string | null => {
	let dir = process.cwd();
	for (let i = 0; i <= maxDepth; i++) {
		const candidate = path.join(dir, relativePath);
		if (fs.existsSync(candidate)) return candidate;

		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return null;
};

const GOV_HEADERS: Array<keyof GovViewRow> = [
	'Requirement ID',
	'RFP Requirement (Verbatim)',
	'Source Section',
	'Source Page',
	'Requirement Type',
	'Compliance Status',
	'Amendment ID',
	'FAR / DFARS Reference',
	'Response Owner',
	'Proposal Volume',
	'Proposal Section',
	'Proposal Reference',
	'QA Reviewed',
	'Risk / Gap',
	'Comments / Notes',
];

const ENTERPRISE_HEADERS: Array<keyof EnterpriseViewRow> = [
	'Requirement ID',
	'Customer Requirement (Verbatim)',
	'Customer Priority',
	'Source Section',
	'Response Strategy',
	'Response Owner',
	'Deal Stage',
	'Proposal Volume',
	'Proposal Section',
	'Proposal Reference',
	'Legal / Risk Flag',
	'Comments / Notes',
];

// Column widths (approximate, in "characters") to keep exports readable.
// The templates currently only contain headers, so widths must be provided here.
const GOV_COL_WIDTHS: XLSX.ColInfo[] = [
	{ wch: 16 }, // Requirement ID
	{ wch: 70 }, // RFP Requirement (Verbatim)
	{ wch: 18 }, // Source Section
	{ wch: 12 }, // Source Page
	{ wch: 18 }, // Requirement Type
	{ wch: 18 }, // Compliance Status
	{ wch: 14 }, // Amendment ID
	{ wch: 24 }, // FAR / DFARS Reference
	{ wch: 18 }, // Response Owner
	{ wch: 16 }, // Proposal Volume
	{ wch: 18 }, // Proposal Section
	{ wch: 20 }, // Proposal Reference
	{ wch: 12 }, // QA Reviewed
	{ wch: 16 }, // Risk / Gap
	{ wch: 30 }, // Comments / Notes
];

const ENTERPRISE_COL_WIDTHS: XLSX.ColInfo[] = [
	{ wch: 16 }, // Requirement ID
	{ wch: 70 }, // Customer Requirement (Verbatim)
	{ wch: 18 }, // Customer Priority
	{ wch: 18 }, // Source Section
	{ wch: 22 }, // Response Strategy
	{ wch: 18 }, // Response Owner
	{ wch: 14 }, // Deal Stage
	{ wch: 16 }, // Proposal Volume
	{ wch: 18 }, // Proposal Section
	{ wch: 20 }, // Proposal Reference
	{ wch: 18 }, // Legal / Risk Flag
	{ wch: 30 }, // Comments / Notes
];

const applySheetViewFormatting = (
	sheet: XLSX.WorkSheet,
	{
		headersCount,
		colWidths,
		headerRowIndex,
		rowCount,
	}: {
		headersCount: number;
		colWidths: XLSX.ColInfo[];
		headerRowIndex: number;
		rowCount: number;
	},
) => {
	// Column widths
	sheet['!cols'] = colWidths;

	// Slightly taller header row for readability
	sheet['!rows'] = sheet['!rows'] ?? [];
	sheet['!rows'][headerRowIndex] = {
		...(sheet['!rows'][headerRowIndex] ?? {}),
		hpt: 20,
	};

	// Auto-filter across the header row + data rows
	const lastRow = headerRowIndex + Math.max(rowCount, 1);
	const lastCol = Math.max(headersCount - 1, 0);
	sheet['!autofilter'] = {
		ref: XLSX.utils.encode_range({
			s: { r: headerRowIndex, c: 0 },
			e: { r: lastRow, c: lastCol },
		}),
	};
};

const normalizeCell = (value: unknown) => {
	if (value === null || value === undefined) return '';
	return String(value);
};

const toGovViewRow = (item: MatrixItem): GovViewRow => ({
	'Requirement ID': normalizeCell(item.requirementId),
	'RFP Requirement (Verbatim)': normalizeCell(item.requirementText),
	'Source Section': normalizeCell(item.sourceSection),
	'Source Page': item.sourcePage ?? '',
	'Requirement Type': normalizeCell(item.requirementType),
	'Compliance Status': normalizeCell(item.complianceStatus),
	'Amendment ID': normalizeCell(item.amendmentId),
	'FAR / DFARS Reference': normalizeCell(item.farDfarsReference),
	'Response Owner': normalizeCell(item.responseOwner),
	'Proposal Volume': normalizeCell(item.proposalVolume),
	'Proposal Section': normalizeCell(item.proposalSection),
	'Proposal Reference': normalizeCell(item.proposalReference),
	'QA Reviewed': normalizeCell(item.qaReviewed),
	'Risk / Gap': normalizeCell(item.riskGap),
	'Comments / Notes': normalizeCell(item.commentsNotes),
});

const toEnterpriseViewRow = (item: MatrixItem): EnterpriseViewRow => ({
	'Requirement ID': normalizeCell(item.requirementId),
	'Customer Requirement (Verbatim)': normalizeCell(item.requirementText),
	'Customer Priority': normalizeCell(item.customerPriority),
	'Source Section': normalizeCell(item.sourceSection),
	'Response Strategy': normalizeCell(item.responseStrategy),
	'Response Owner': normalizeCell(item.responseOwner),
	'Deal Stage': normalizeCell(item.dealStage),
	'Proposal Volume': normalizeCell(item.proposalVolume),
	'Proposal Section': normalizeCell(item.proposalSection),
	'Proposal Reference': normalizeCell(item.proposalReference),
	'Legal / Risk Flag': normalizeCell(item.legalRiskFlag),
	'Comments / Notes': normalizeCell(item.commentsNotes),
});

const clearSheetBelowHeader = (sheet: XLSX.WorkSheet, headerRowIndex: number) => {
	const ref = sheet['!ref'];
	if (!ref) return;
	const range = XLSX.utils.decode_range(ref);
	for (let r = headerRowIndex + 1; r <= range.e.r; r++) {
		for (let c = range.s.c; c <= range.e.c; c++) {
			const addr = XLSX.utils.encode_cell({ r, c });
			if (sheet[addr]) {
				delete sheet[addr];
			}
		}
	}
	sheet['!ref'] = XLSX.utils.encode_range({
		s: range.s,
		e: { r: headerRowIndex, c: range.e.c },
	});
};

export const buildMatrixWorkbook = (
	template: ExportTemplate,
	items: MatrixItem[],
): Buffer => {
	const templateRelativePath = TEMPLATE_FILES[template];
	const templatePath =
		findFileUpwards(templateRelativePath) ?? path.join(process.cwd(), templateRelativePath);

	if (!fs.existsSync(templatePath)) {
		throw new Error(
			`Matrix export template not found: ${templateRelativePath} (cwd=${process.cwd()})`,
		);
	}

	// Next.js bundlers can sometimes alter how third-party modules resolve Node built-ins.
	// Reading the template bytes ourselves avoids relying on XLSX.readFile() filesystem access.
	const templateBytes = fs.readFileSync(templatePath);
	const workbook = XLSX.read(templateBytes, { type: 'buffer' });
	const sheetName = workbook.SheetNames[0];
	const sheet = workbook.Sheets[sheetName];

	const headerRowIndex = 0;
	clearSheetBelowHeader(sheet, headerRowIndex);

	applySheetViewFormatting(sheet, {
		headersCount: template === 'gov' ? GOV_HEADERS.length : ENTERPRISE_HEADERS.length,
		colWidths: template === 'gov' ? GOV_COL_WIDTHS : ENTERPRISE_COL_WIDTHS,
		headerRowIndex,
		rowCount: items.length,
	});

	if (items.length > 0) {
		if (template === 'gov') {
			const rows = items.map(toGovViewRow);
			XLSX.utils.sheet_add_json(sheet, rows, {
				header: GOV_HEADERS,
				skipHeader: true,
				origin: { r: headerRowIndex + 1, c: 0 },
			});
		} else {
			const rows = items.map(toEnterpriseViewRow);
			XLSX.utils.sheet_add_json(sheet, rows, {
				header: ENTERPRISE_HEADERS,
				skipHeader: true,
				origin: { r: headerRowIndex + 1, c: 0 },
			});
		}
	}

	return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};
