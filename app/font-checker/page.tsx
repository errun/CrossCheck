"use client";

import FontCheckerPage from "@/components/FontCheckerPage";
import type { Language } from "@/types";

// Font compliance checker landing page at "/font-checker" (English)
export default function Page() {
	const lang: Language = "en";
	return <FontCheckerPage lang={lang} />;
}
