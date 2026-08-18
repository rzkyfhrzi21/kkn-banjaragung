// tests/unit/upload_validation.test.js
// Regresi: file gambar besar acak (PNG) TIDAK boleh ditolak oleh webshell scan (false positive '<%'),
// sementara polyglot PNG+PHP tetap harus ditolak.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PNG_HEADER = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');

function makePng(sizeBytes, extra = Buffer.alloc(0)) {
  return Buffer.concat([PNG_HEADER, crypto.randomBytes(sizeBytes), extra]);
}

async function run() {
  console.log('  Testing Upload Magic Bytes & Webshell Scan (false positive regression)...');

  const { validateFileBuffer } = require('../src/middleware/security.middleware.js');

  // 1. PNG besar dengan data acak harus LOLOS (regresi: '<%' muncul di biner acak)
  for (const size of [200 * 1024, 512 * 1024, 1024 * 1024]) {
    const tmp = path.join(require('os').tmpdir(), 'fp-' + size + '.png');
    fs.writeFileSync(tmp, makePng(size));
    let passed = false;
    try {
      validateFileBuffer(tmp);
      passed = true;
    } catch (e) {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
    assert.strictEqual(passed, true, 'PNG acak ' + size + ' bytes harus LOLOS validasi');
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }

  // 2. Polyglot PNG+PHP harus DITOLAK
  const php = Buffer.from('PD9waHAgc3lzdGVtKCRfR0VUW2NdKTsgPz4=', 'base64'); // <?php system($_GET["c"]); ?>
  const tmpPoly = path.join(require('os').tmpdir(), 'poly.png');
  fs.writeFileSync(tmpPoly, makePng(1024, php));
  let rejected = false;
  try {
    validateFileBuffer(tmpPoly);
  } catch (e) {
    rejected = /Webshell|Payload/i.test(e.message);
  }
  assert.strictEqual(rejected, true, 'Polyglot PNG+PHP harus ditolak');
  if (fs.existsSync(tmpPoly)) fs.unlinkSync(tmpPoly);

  // 3. Teks biasa dengan ekstensi gambar harus DITOLAK (magic bytes mismatch)
  const tmpFake = path.join(require('os').tmpdir(), 'fake.png');
  fs.writeFileSync(tmpFake, 'ini bukan gambar, hanya teks biasa.');
  let magicRejected = false;
  try {
    validateFileBuffer(tmpFake);
  } catch (e) {
    magicRejected = /Header berkas/i.test(e.message);
  }
  assert.strictEqual(magicRejected, true, 'File teks dengan ekstensi .png harus ditolak magic bytes');
  if (fs.existsSync(tmpFake)) fs.unlinkSync(tmpFake);

  console.log('  ✓ Upload validation: 3 kasus lolos');
}
module.exports = { run };