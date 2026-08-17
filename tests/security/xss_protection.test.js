// tests/security/xss_protection.test.js
// Pengujian Keamanan Header Helmet, CSP, dan Proteksi XSS (OWASP A03)
const assert = require('assert');
const { startTestServer } = require('../test_helper');

async function run() {
  console.log('  Testing Security Headers & XSS Protection...');
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    // 1. Verifikasi Security Headers dari Helmet
    const res = await fetch(`${baseUrl}/api/data`);
    assert.strictEqual(res.status, 200);

    const csp = res.headers.get('content-security-policy');
    assert.ok(csp, 'Content-Security-Policy header must be present');
    assert.ok(csp.includes("default-src 'self'"), 'CSP must restrict default-src');

    const xContentType = res.headers.get('x-content-type-options');
    assert.strictEqual(xContentType, 'nosniff', 'X-Content-Type-Options must be nosniff');

    const xPoweredBy = res.headers.get('x-powered-by');
    assert.strictEqual(xPoweredBy, null, 'X-Powered-By header must be hidden');

    // 2. Uji Sanitasi Input XSS Payload
    const xssPayload = '<script>alert("XSS")</script>';
    const submitRes = await fetch(`${baseUrl}/api/pengajuan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: xssPayload,
        ktp: '1806000000000001',
        hp: '08123456789',
        alamat: 'Lampung',
        jenisSurat: 'Surat Domisili'
      })
    });

    assert.strictEqual(submitRes.status, 200);
    const body = await submitRes.json();
    assert.strictEqual(body.success, true);
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('XSS & Security Headers Test: PASS')).catch(e => {
    console.error('XSS & Security Headers Test: FAIL', e);
    process.exit(1);
  });
}
