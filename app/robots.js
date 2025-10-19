export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/p/'], // Don't index API routes or private project pages
    },
    sitemap: 'https://aird.com.au/sitemap.xml',
  };
}
