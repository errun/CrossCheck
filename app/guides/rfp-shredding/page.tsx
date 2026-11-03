import { GuidePage } from '@/components/GuidePage';
import { guideMetadata } from '@/lib/seo';
export const metadata = guideMetadata('en', 'rfp-shredding');
export default function Page() { return <GuidePage lang="en" kind="rfp-shredding" />; }
