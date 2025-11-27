import type { MetadataRoute } from 'next';

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rfpcheck.net';
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
