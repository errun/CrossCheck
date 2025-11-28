import type { MetadataRoute } from 'next';

// 站点基础地址：优先使用环境变量，其次使用正式域名
// 新主域名为 rfpai.io，本地或忘记配置环境变量时也会回退到该域名
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rfpai.io';

export default function sitemap(): MetadataRoute.Sitemap {
	  const lastModified = new Date();

	  return [
	    {
	      url: baseUrl,
	      lastModified,
	      changeFrequency: 'weekly',
	      priority: 1,
	    },
	    {
	      url: `${baseUrl}/compliance-matrix`,
	      lastModified,
	      changeFrequency: 'weekly',
	      priority: 0.8,
	    },
	  ];
}
