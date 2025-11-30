"use client";

import ComplianceMatrixPage from "@/components/ComplianceMatrixPage";
import type { Language } from "@/types";

// Chinese compliance-matrix page at "/zh/compliance-matrix" – only renders Chinese content
export default function ZhComplianceMatrixPage() {
	const lang: Language = "zh";
	return <ComplianceMatrixPage lang={lang} />;
}

