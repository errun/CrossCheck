'use client';

import { HomePage } from '@/components/HomePage';
import { Language } from '@/types';

// Chinese landing page at "/zh" – only renders Chinese content
export default function ZhHomePage() {
	const lang: Language = 'zh';
	return <HomePage lang={lang} />;
}

