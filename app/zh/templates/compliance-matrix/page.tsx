import { ResourcePage } from '@/components/ResourcePage';
import { resourceMetadata } from '@/lib/seo';
export const metadata = resourceMetadata('zh', 'template');
export default function Page() { return <ResourcePage lang="zh" kind="template" />; }
