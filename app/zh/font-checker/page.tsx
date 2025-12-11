"use client";

import FontCheckerPage from "@/components/FontCheckerPage";
import type { Language } from "@/types";

// Chinese entry for font compliance checker at "/zh/font-checker" – reuses the same English content for now
export default function ZhFontCheckerPage() {
	const lang: Language = "zh";
	return <FontCheckerPage lang={lang} />;
}
