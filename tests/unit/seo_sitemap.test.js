// tests/unit/seo_sitemap.test.js
// Pengujian Otomatis Kepatuhan On-Page SEO, Sitemap XML, Robots.txt, dan Isolasi Halaman Privat
const assert = require('assert');
const { startTestServer } = require('../test_helper');

async function run() {
  console.log('  Testing SEO Compliance, Robots.txt, Sitemap.xml & Private Isolation...');
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    // 1. Uji Berkas robots.txt
    const robotsRes = await fetch(`${baseUrl}/robots.txt`);
    assert.strictEqual(robotsRes.status, 200, '/robots.txt must return HTTP 200');
    assert.ok(robotsRes.headers.get('content-type').includes('text/plain'), 'robots.txt must be served as text/plain');
    const robotsText = await robotsRes.text();
    assert.ok(robotsText.includes('Disallow: /admin'), 'robots.txt must disallow admin');
    assert.ok(robotsText.includes('Sitemap: https://banjaragung-tanggamus.web.id/sitemap.xml'), 'robots.txt must reference sitemap.xml');

    // 2. Uji Berkas sitemap.xml
    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
    assert.strictEqual(sitemapRes.status, 200, '/sitemap.xml must return HTTP 200');
    const sitemapXml = await sitemapRes.text();
    assert.ok(sitemapXml.includes('<urlset'), 'sitemap.xml must contain standard urlset element');
    assert.ok(sitemapXml.includes('<loc>https://banjaragung-tanggamus.web.id/</loc>'), 'sitemap must include homepage');
    assert.ok(sitemapXml.includes('<priority>1.0</priority>'), 'homepage priority must be 1.0');

    // 3. Uji Isolasi Halaman Privat (admin.html)
    const adminRes = await fetch(`${baseUrl}/admin.html`);
    assert.strictEqual(adminRes.status, 200);
    const xRobotsHeader = adminRes.headers.get('x-robots-tag');
    assert.ok(xRobotsHeader && xRobotsHeader.includes('noindex'), 'admin.html must send X-Robots-Tag: noindex header');
    const adminHtml = await adminRes.text();
    assert.ok(adminHtml.includes('noindex, nofollow'), 'admin.html must contain noindex meta tag');

    // 4. Uji On-Page SEO Halaman Beranda
    const homeRes = await fetch(`${baseUrl}/index.html`);
    const homeHtml = await homeRes.text();
    assert.ok(homeHtml.includes('<link rel="canonical"'), 'index.html must include canonical link');
    assert.ok(homeHtml.includes('application/ld+json'), 'index.html must include Schema.org JSON-LD structured data');
    assert.ok(homeHtml.includes('og:title'), 'index.html must include Open Graph title tag');
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('SEO & Sitemap Test: PASS')).catch(e => {
    console.error('SEO & Sitemap Test: FAIL', e);
    process.exit(1);
  });
}
