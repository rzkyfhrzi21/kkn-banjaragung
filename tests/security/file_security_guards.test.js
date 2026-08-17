// tests/security/file_security_guards.test.js
// Pengujian Keamanan Validasi Berkas, Header Magic Bytes, dan Double Extension (OWASP A03 & A08)
const assert = require('assert');
const { startTestServer, loginAdmin, buildMultipartPayload } = require('../test_helper');

async function run() {
  console.log('  Testing File Upload Security, Magic Bytes & Extension Whitelist...');
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    const token = await loginAdmin(baseUrl);

    // 1. Uji Tolak Double Extension (contoh: avatar.php.jpg)
    const validJpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0xFF, 0xD9]);
    const doubleExtPayload = buildMultipartPayload({}, {
      foto: { filename: 'avatar.php.jpg', contentType: 'image/jpeg', content: validJpegHeader }
    });

    const resDoubleExt = await fetch(`${baseUrl}/api/admin/upload`, {
      method: 'POST',
      headers: { ...doubleExtPayload.headers, 'Authorization': `Bearer ${token}` },
      body: doubleExtPayload.body
    });
    assert.strictEqual(resDoubleExt.status, 400, 'Double extension must be rejected with HTTP 400');
    const doubleExtData = await resDoubleExt.json();
    assert.strictEqual(doubleExtData.success, false);
    assert.ok(doubleExtData.message.includes('Double Extension'));

    // 2. Uji Tolak Berkas Gambar yang Mengandung Tag Skrip Terlarang
    const dangerousContent = Buffer.concat([
      validJpegHeader,
      Buffer.from('<' + 'script' + '>alert(1)<' + '/script' + '>')
    ]);

    const scriptPayload = buildMultipartPayload({}, {
      foto: { filename: 'infected.jpg', contentType: 'image/jpeg', content: dangerousContent }
    });

    const resScript = await fetch(`${baseUrl}/api/admin/upload`, {
      method: 'POST',
      headers: { ...scriptPayload.headers, 'Authorization': `Bearer ${token}` },
      body: scriptPayload.body
    });
    assert.strictEqual(resScript.status, 400, 'File with embedded script tags must be rejected with HTTP 400');
    const scriptData = await resScript.json();
    assert.strictEqual(scriptData.success, false);

    // 3. Uji Tolak File Header Palsu (Magic Byte Mismatch)
    const fakeHeaderContent = Buffer.from('BUKAN_GAMBAR_ASLI_MIME_SPOOFING');
    const fakeHeaderPayload = buildMultipartPayload({}, {
      foto: { filename: 'fake.jpg', contentType: 'image/jpeg', content: fakeHeaderContent }
    });

    const resFakeHeader = await fetch(`${baseUrl}/api/admin/upload`, {
      method: 'POST',
      headers: { ...fakeHeaderPayload.headers, 'Authorization': `Bearer ${token}` },
      body: fakeHeaderPayload.body
    });
    assert.strictEqual(resFakeHeader.status, 400, 'Spoofed file without true image magic bytes must be rejected');

    // 4. Uji Berkas Valid Asli (Harus Berhasil Lolos)
    const validPayload = buildMultipartPayload({}, {
      foto: { filename: 'valid_photo.jpg', contentType: 'image/jpeg', content: validJpegHeader }
    });
    const resValid = await fetch(`${baseUrl}/api/admin/upload`, {
      method: 'POST',
      headers: { ...validPayload.headers, 'Authorization': `Bearer ${token}` },
      body: validPayload.body
    });
    assert.strictEqual(resValid.status, 200, 'Authentic image must pass upload security validation');
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('File Security Guards Test: PASS')).catch(e => {
    console.error('File Security Guards Test: FAIL', e);
    process.exit(1);
  });
}
