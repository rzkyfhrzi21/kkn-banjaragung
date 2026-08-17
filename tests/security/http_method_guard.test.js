// tests/security/http_method_guard.test.js
// Pengujian Protokol HTTP: Mutasi Wajib POST/PUT/DELETE, GET Ditolak, dan Akses Tanpa Token (OWASP A01 & A05)
const assert = require('assert');
const { startTestServer, loginAdmin, buildMultipartPayload } = require('../test_helper');

async function run() {
  console.log('  Testing HTTP Method Guard, Auth Wall & Upload Size Limit...');
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    const token = await loginAdmin(baseUrl);

    // 1. Uji Penolakan Method GET pada Endpoint Mutasi (harus 404/405, TIDAK BOLEH dieksekusi)
    const mutationEndpoints = [
      '/api/admin/profil',
      '/api/admin/pemerintahan',
      '/api/admin/berita',
      '/api/admin/pengumuman',
      '/api/admin/galeri',
      '/api/admin/upload',
      '/api/admin/upload-multiple',
      '/api/admin/pengajuan/1',
      '/api/admin/keluhan/1',
      '/api/admin/komentar/1'
    ];
    for (const ep of mutationEndpoints) {
      const res = await fetch(`${baseUrl}${ep}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      assert.ok([400, 404, 405].includes(res.status), `GET ${ep} must be rejected (got ${res.status})`);
    }

    // 2. Uji GET pada Endpoint Admin Tanpa Token -> 401 (auth wall mendahului method check)
    const resNoAuth = await fetch(`${baseUrl}/api/admin/berita`, { method: 'GET' });
    assert.strictEqual(resNoAuth.status, 401, 'GET admin endpoint without token must return HTTP 401');

    // 3. Uji POST Mutasi Tanpa Token -> 401 Unauthorized (Broken Access Control)
    const resPostNoAuth = await fetch(`${baseUrl}/api/admin/berita`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ judul: 'XSS Test' })
    });
    assert.strictEqual(resPostNoAuth.status, 401, 'POST without token must return HTTP 401');

    // 4. Uji Token Palsu -> 401 Unauthorized
    const resFakeToken = await fetch(`${baseUrl}/api/admin/berita`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer fake_token_12345' },
      body: JSON.stringify({ judul: 'XSS Test' })
    });
    assert.strictEqual(resFakeToken.status, 401, 'POST with invalid token must return HTTP 401');

    // 5. Uji Penolakan Upload Foto > 4MB (batas multer 4MB -> HTTP 400 + JSON)
    const validJpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0xFF, 0xD9]);
    const bigChunk = Buffer.alloc(4 * 1024 * 1024 + 1024, 0x00);
    const oversizePayload = buildMultipartPayload({}, {
      foto: { filename: 'big_photo.jpg', contentType: 'image/jpeg', content: Buffer.concat([validJpegHeader, bigChunk]) }
    });
    const resBig = await fetch(`${baseUrl}/api/admin/upload`, {
      method: 'POST',
      headers: { ...oversizePayload.headers, 'Authorization': `Bearer ${token}` },
      body: oversizePayload.body
    });
    assert.strictEqual(resBig.status, 400, 'Oversized file (>4MB) must be rejected with HTTP 400');
    const bigData = await resBig.json();
    assert.strictEqual(bigData.success, false, 'Oversized file rejection must use JSON envelope');
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('HTTP Method Guard Test: PASS')).catch(e => {
    console.error('HTTP Method Guard Test: FAIL', e);
    process.exit(1);
  });
}