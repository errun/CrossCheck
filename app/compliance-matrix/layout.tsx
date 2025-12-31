import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title:
		"AI Compliance Matrix Generator - Extract RFP Requirements to Excel | RFPAI",
	description:
		"Generate a structured compliance matrix from your RFP in seconds. Automatically extract mandatory 'must/shall' requirements into a downloadable Excel checklist.",
	keywords: [
		"compliance matrix generator",
		"RFP shredder",
		"automated requirements extraction",
		"bid management tool",
		"RFP compliance matrix",
	],
	openGraph: {
		title:
			"AI Compliance Matrix Generator - Extract RFP Requirements to Excel | RFPAI",
		description:
			"Generate a structured compliance matrix from your RFP in seconds. Automatically extract mandatory 'must/shall' requirements into a downloadable Excel checklist.",
		type: "website",
		url: "/compliance-matrix",
		locale: "en_US",
		siteName: "RFPCheck",
	},
	twitter: {
		card: "summary",
		title:
			"AI Compliance Matrix Generator - Extract RFP Requirements to Excel | RFPAI",
		description:
			"Generate a structured compliance matrix from your RFP in seconds. Automatically extract mandatory 'must/shall' requirements into a downloadable Excel checklist.",
	},
	alternates: {
		canonical: "/compliance-matrix",
		languages: {
			en: "/compliance-matrix",
			"zh-Hans": "/zh/compliance-matrix",
		},
	},
};

export default function ComplianceMatrixLayout({
	children,
}: {
	children: ReactNode;
}) {
	return children;
}
