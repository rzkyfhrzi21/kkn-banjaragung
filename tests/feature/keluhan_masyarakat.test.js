// tests/feature/keluhan_masyarakat.test.js
// Pengujian Modul Keluhan Masyarakat & Upload File Bukti
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { startTestServer, loginAdmin, buildMultipartPayload } = require('../test_helper');

async function run() {
  console.log('  Testing Modul Keluhan Masyarakat & Bukti Foto...');
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    // 1. Submit Keluhan Masyarakat beserta File Bukti Foto (Multipart)
    const validJpgContent = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0xFF, 0xD9]);
    const fields = {
      nama: 'Warga Banjar Agung',
      hp: '081300001111',
      judul: 'Lampu Jalan Padam',
      kronologi: 'Lampu jalan di RT 03 padam sejak 2 hari lalu.',
      lokasi: 'Dusun Pasar'
    };

    const { body, headers } = buildMultipartPayload(fields, {
      bukti: { filename: 'lampu_rusak.jpg', contentType: 'image/jpeg', content: validJpgContent }
    });

    const submitRes = await fetch(`${baseUrl}/api/keluhan`, {
      method: 'POST',
      headers,
      body
    });

    assert.strictEqual(submitRes.status, 200, 'POST /api/keluhan must return 200');
    const result = await submitRes.json();
    assert.strictEqual(result.success, true, 'Submission must succeed');
    assert.strictEqual(result.data.judul, fields.judul);
    assert.ok(result.data.bukti.startsWith('/uploads/'), 'Bukti URL must start with /uploads/');

    // Verifikasi file bukti fisik tersimpan di folder uploads
    const savedFilename = path.basename(result.data.bukti);
    const savedPath = path.join(__dirname, '../../uploads', savedFilename);
    assert.strictEqual(fs.existsSync(savedPath), true, 'Bukti file must exist on disk');

    // 2. Verifikasi Data Keluhan Muncul di Admin Panel
    const token = await loginAdmin(baseUrl);
    const adminListRes = await fetch(`${baseUrl}/api/admin/keluhan`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(adminListRes.status, 200, 'GET /api/admin/keluhan must return 200');
    const adminData = await adminListRes.json();
    const createdItem = adminData.data.find(k => k.id === result.data.id);
    assert.ok(createdItem, 'Created complaint must be found in admin panel');

    // 3. Uji Hapus Keluhan (DELETE /api/admin/keluhan/:id)
    const deleteRes = await fetch(`${baseUrl}/api/admin/keluhan/${result.data.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(deleteRes.status, 200, 'DELETE complaint must return 200');

    // Cleanup file
    try { if (fs.existsSync(savedPath)) fs.unlinkSync(savedPath); } catch (e) {}
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('Keluhan Masyarakat Feature Test: PASS')).catch(e => {
    console.error('Keluhan Masyarakat Feature Test: FAIL', e);
    process.exit(1);
  });
}
