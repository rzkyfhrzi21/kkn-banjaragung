// tests/feature/pengajuan_surat.test.js
const assert = require('assert');
const { startTestServer, loginAdmin } = require('../test_helper');

async function run() {
  console.log('  Testing Modul Pengajuan Surat Online...');
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    // 1. Submit Pengajuan Surat oleh Warga (Public POST)
    const payload = {
      nama: 'Siti Aminah',
      ktp: '1806012345678901',
      hp: '081298765432',
      alamat: 'Dusun 1, RT 02/01',
      jenisSurat: 'Surat Keterangan Domisili'
    };

    const submitRes = await fetch(`${baseUrl}/api/pengajuan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(submitRes.status, 200, 'POST /api/pengajuan must return 200');
    const result = await submitRes.json();
    assert.strictEqual(result.success, true, 'Result success must be true');
    assert.strictEqual(result.data.nama, payload.nama);
    assert.strictEqual(result.data.status, 'Baru');

    // 2. Verifikasi Data Masuk di Panel Admin
    const token = await loginAdmin(baseUrl);
    const adminListRes = await fetch(`${baseUrl}/api/admin/pengajuan`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    assert.strictEqual(adminListRes.status, 200, 'GET /api/admin/pengajuan must return 200');
    const adminData = await adminListRes.json();
    assert.ok(Array.isArray(adminData.data), 'Admin pengajuan list must be an array');
    const found = adminData.data.find(item => item.ktp === payload.ktp);
    assert.ok(found, 'Submitted pengajuan surat must be found in admin panel');
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('Pengajuan Surat Feature Test: PASS')).catch(e => {
    console.error('Pengajuan Surat Feature Test: FAIL', e);
    process.exit(1);
  });
}
