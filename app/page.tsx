"use client";

import { HomePage } from "@/components/HomePage";
import type { Language } from "@/types";

// Default English landing page at "/"
export default function Page() {
	const lang: Language = "en";
	return <HomePage lang={lang} />;
}
