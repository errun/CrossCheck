"use client";

import ComplianceMatrixPage from "@/components/ComplianceMatrixPage";
import type { Language } from "@/types";

// Default English compliance-matrix page at "/compliance-matrix"
export default function Page() {
	const lang: Language = "en";
	return <ComplianceMatrixPage lang={lang} />;
}
