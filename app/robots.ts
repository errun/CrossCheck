import type { MetadataRoute } from 'next';

// 404952465148445249555a NEXT_PUBLIC_SITE_URL 4e5454555750442056542053404c4d5103404d485153444052004340504c56545c63
// 4340504c5348565a54525447405200534f4c57524003 rfpai.io
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rfpai.io';
const siteUrl = rawSiteUrl.replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
