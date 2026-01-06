import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title: "Compliance Matrix Generator for RFPs | RFPAI",
	description:
		"AI-powered compliance matrix generator that turns PDF to Excel and helps proposal teams save time on must/shall extraction.",
	keywords: [
		"compliance matrix generator",
		"RFP compliance matrix generator",
		"RFP shredder",
		"automated requirements extraction",
		"bid management tool",
		"RFP compliance matrix",
	],
	openGraph: {
		title: "Compliance Matrix Generator for RFPs | RFPAI",
		description:
			"AI-powered compliance matrix generator that turns PDF to Excel and helps proposal teams save time on must/shall extraction.",
		type: "website",
		url: "/compliance-matrix",
		locale: "en_US",
		siteName: "RFPCheck",
	},
	twitter: {
		card: "summary",
		title: "Compliance Matrix Generator for RFPs | RFPAI",
		description:
			"AI-powered compliance matrix generator that turns PDF to Excel and helps proposal teams save time on must/shall extraction.",
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
