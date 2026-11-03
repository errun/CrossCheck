import { ResourcePage } from '@/components/ResourcePage';
import { resourceMetadata } from '@/lib/seo';
export const metadata = resourceMetadata('en', 'template');
export default function Page() { return <ResourcePage lang="en" kind="template" />; }
