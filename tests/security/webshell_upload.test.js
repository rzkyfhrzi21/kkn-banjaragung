// tests/security/webshell_upload.test.js
// Pengujian Keamanan Anti-Webshell, Magic Byte Sniffing, dan Double Extension (OWASP A03 & A08)
const assert = require('assert');
const { startTestServer, loginAdmin, buildMultipartPayload } = require('../test_helper');

async function run() {
  console.log('  Testing Anti-Webshell, Magic Bytes & Double Extension Guards...');
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    const token = await loginAdmin(baseUrl);

    // 1. Uji Tolak Double Extension (contoh: avatar.php.jpg atau shell.phtml.png)
    const validJpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0xFF, 0xD9]);
    const doubleExtPayload = buildMultipartPayload({}, {
      foto: { filename: 'avatar.php.jpg', contentType: 'image/jpeg', content: validJpegHeader }
    });

    const resDoubleExt = await fetch(`${baseUrl}/api/admin/upload`, {
      method: 'POST',
      headers: { ...doubleExtPayload.headers, 'Authorization': `Bearer ${token}` },
      body: doubleExtPayload.body
    });
    assert.strictEqual(resDoubleExt.status, 400, 'Double extension (avatar.php.jpg) must be rejected with HTTP 400');
    const doubleExtData = await resDoubleExt.json();
    assert.strictEqual(doubleExtData.success, false);
    assert.ok(doubleExtData.message.includes('Double Extension'), 'Error message must specify Double Extension');

    // 2. Uji Tolak Embedded WebShell PHP di Dalam Berkas Gambar Asli
    // File memiliki header JPEG valid, tapi disusupi payload script webshell
    const infectedJpeg = Buffer.concat([
      validJpegHeader,
      Buffer.from('<?php system($_GET["cmd"]); ?>')
    ]);

    const webshellPayload = buildMultipartPayload({}, {
      foto: { filename: 'normal_photo.jpg', contentType: 'image/jpeg', content: infectedJpeg }
    });

    const resWebshell = await fetch(`${baseUrl}/api/admin/upload`, {
      method: 'POST',
      headers: { ...webshellPayload.headers, 'Authorization': `Bearer ${token}` },
      body: webshellPayload.body
    });
    assert.strictEqual(resWebshell.status, 400, 'Image with embedded webshell script must be rejected with HTTP 400');
    const webshellData = await resWebshell.json();
    assert.strictEqual(webshellData.success, false);
    assert.ok(webshellData.message.includes('Webshell') || webshellData.message.includes('berbahaya'), 'Must flag webshell payload');

    // 3. Uji Tolak File Header Palsu (Magic Byte Mismatch)
    const fakeHeaderContent = Buffer.from('INI BUKAN HEADER GAMBAR TAPI EKSTENSI JPG');
    const fakeHeaderPayload = buildMultipartPayload({}, {
      foto: { filename: 'spoofed.jpg', contentType: 'image/jpeg', content: fakeHeaderContent }
    });

    const resFakeHeader = await fetch(`${baseUrl}/api/admin/upload`, {
      method: 'POST',
      headers: { ...fakeHeaderPayload.headers, 'Authorization': `Bearer ${token}` },
      body: fakeHeaderPayload.body
    });
    assert.strictEqual(resFakeHeader.status, 400, 'Spoofed file without true image magic bytes must be rejected');

    // 4. Uji Berkas Valid Murni (Harus Berhasil)
    const validPayload = buildMultipartPayload({}, {
      foto: { filename: 'valid_photo.jpg', contentType: 'image/jpeg', content: validJpegHeader }
    });
    const resValid = await fetch(`${baseUrl}/api/admin/upload`, {
      method: 'POST',
      headers: { ...validPayload.headers, 'Authorization': `Bearer ${token}` },
      body: validPayload.body
    });
    assert.strictEqual(resValid.status, 200, 'Authentic image must pass upload security gate');
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('Anti-Webshell Security Test: PASS')).catch(e => {
    console.error('Anti-Webshell Security Test: FAIL', e);
    process.exit(1);
  });
}
