import type { MetadataRoute } from 'next';
import { SITE_URL, CONTENT_UPDATED } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const pairs = [['/en', '/zh'], ['/compliance-matrix', '/zh/compliance-matrix'], ['/bid-writer', '/zh/bid-writer'], ['/examples/bid-review', '/zh/examples/bid-review'], ['/templates/compliance-matrix', '/zh/templates/compliance-matrix']];
  return pairs.flatMap(([en, zh]) => [en, zh].map(path => ({
    url: SITE_URL + path, lastModified: new Date(CONTENT_UPDATED),
    alternates: { languages: { en: SITE_URL + en, 'zh-Hans': SITE_URL + zh } },
  })));
}
