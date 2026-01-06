import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title: "AI RFP 合规矩阵生成器 - 导出 Excel | RFPAI",
	description:
		"上传 RFP 文档，自动提取“必须/应当”条款生成 RFP 合规矩阵，并导出 Excel 检查表。",
	keywords: [
		"RFP 合规矩阵生成器",
		"RFP 合规矩阵",
		"强制性要求提取",
		"投标合规检查",
		"RFP 需求提取",
	],
	openGraph: {
		title: "AI RFP 合规矩阵生成器 - 导出 Excel | RFPAI",
		description:
			"上传 RFP 文档，自动提取“必须/应当”条款生成 RFP 合规矩阵，并导出 Excel 检查表。",
		type: "website",
		url: "/zh/compliance-matrix",
		locale: "zh_CN",
		siteName: "RFPCheck",
	},
	twitter: {
		card: "summary",
		title: "AI RFP 合规矩阵生成器 - 导出 Excel | RFPAI",
		description:
			"上传 RFP 文档，自动提取“必须/应当”条款生成 RFP 合规矩阵，并导出 Excel 检查表。",
	},
	alternates: {
		canonical: "/zh/compliance-matrix",
		languages: {
			en: "/compliance-matrix",
			"zh-Hans": "/zh/compliance-matrix",
		},
	},
};

export default function ZhComplianceMatrixLayout({
	children,
}: {
	children: ReactNode;
}) {
	return children;
}
