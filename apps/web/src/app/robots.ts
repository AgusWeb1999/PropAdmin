import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.prop-admin.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/home'],
        disallow: ['/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
