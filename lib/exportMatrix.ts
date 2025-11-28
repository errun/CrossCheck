import type { ComplianceMatrixItem } from '@/types';
import * as XLSX from 'xlsx';

	/**
	 * 将合规矩阵结果导出为 Excel 文件
	 * 列标题：ID, RFP Requirement, Reference Section/Page, Comply (Yes/No), Comments / Proposal Reference
	 */
	export function downloadMatrixAsExcel(
	items: ComplianceMatrixItem[],
	options?: {
	  filename?: string;
	  complyMap?: Record<number, string>;
	  commentMap?: Record<number, string>;
	},
) {
	const { filename = 'compliance-matrix.xlsx', complyMap = {}, commentMap = {} } = options || {};

		// 组装为 json_to_sheet 可识别的结构
		const rows = items.map((item) => ({
		  ID: item.id,
		  'RFP Requirement': item.text,
		  'Reference Section/Page': item.section || '',
		  'Comply (Yes/No)': complyMap[item.id] ?? '',
		  'Comments / Proposal Reference': commentMap[item.id] ?? '',
		}));

	const worksheet = XLSX.utils.json_to_sheet(rows);
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Compliance Matrix');

	XLSX.writeFile(workbook, filename);
}
