import { ResourcePage } from '@/components/ResourcePage';
import { resourceMetadata } from '@/lib/seo';
export const metadata = resourceMetadata('zh', 'example');
export default function Page() { return <ResourcePage lang="zh" kind="example" />; }
