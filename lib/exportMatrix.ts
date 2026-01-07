'use client';

import type { MatrixItem } from '@/types';

type ExportTemplate = 'gov' | 'enterprise';

const downloadFromApi = async (
	template: ExportTemplate,
	items: MatrixItem[],
	filename: string,
) => {
	const response = await fetch('/api/matrix-export', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ template, items }),
	});

	if (!response.ok) {
		let message = `Export failed (${response.status})`;
		try {
			const data = await response.json();
			if (data?.error) {
				message = data.error;
			}
		} catch {
			// ignore JSON parse error
		}
		throw new Error(message);
	}

	const blob = await response.blob();
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.URL.revokeObjectURL(url);
};

export async function downloadGovMatrix(items: MatrixItem[], filename?: string) {
	if (typeof window === 'undefined') return;
	await downloadFromApi(
		'gov',
		items,
		filename || 'Gov_RFP_Compliance_Matrix.xlsx',
	);
}

export async function downloadEnterpriseMatrix(
	items: MatrixItem[],
	filename?: string,
) {
	if (typeof window === 'undefined') return;
	await downloadFromApi(
		'enterprise',
		items,
		filename || 'Enterprise_RFP_Response_Matrix.xlsx',
	);
}
