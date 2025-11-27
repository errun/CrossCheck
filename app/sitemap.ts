import type { MetadataRoute } from 'next';

// 站点基础地址：优先使用环境变量，其次使用正式域名
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rfpcheck.net';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
