import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title:
		"Free AI Compliance Matrix Generator - Extract RFP Requirements to Excel | RFPCheck",
	description:
		"Instantly shred RFP documents. Our AI extracts 'Must', 'Shall', and 'Mandatory' requirements into a downloadable Excel compliance matrix.",
	keywords: [
		"compliance matrix generator",
		"RFP shredder",
		"automated requirements extraction",
		"bid management tool",
	],
};

export default function ComplianceMatrixLayout({
	children,
}: {
	children: ReactNode;
}) {
	return children;
}
