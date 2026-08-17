// tests/feature/pengumuman_berita.test.js
const assert = require('assert');
const { startTestServer, loginAdmin } = require('../test_helper');

async function run() {
  console.log('  Testing Modul Pengumuman & Berita Desa CRUD...');
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    const token = await loginAdmin(baseUrl);

    // 1. Buat Pengumuman Baru
    const createPengumumanRes = await fetch(`${baseUrl}/api/admin/pengumuman`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        judul: 'Kerja Bakti Akbar',
        ringkasan: 'Membersihkan lingkungan balai desa.',
        isi: 'Seluruh warga diundang hadir pada hari Minggu pukul 07.00 WIB.'
      })
    });

    assert.strictEqual(createPengumumanRes.status, 200, 'POST /api/admin/pengumuman must return 200');
    const createdPengumuman = await createPengumumanRes.json();
    assert.strictEqual(createdPengumuman.success, true);
    const pengumumanId = createdPengumuman.data.id;
    assert.ok(pengumumanId, 'Created pengumuman must have ID');

    // 2. Hapus Pengumuman
    const deletePengumumanRes = await fetch(`${baseUrl}/api/admin/pengumuman/${pengumumanId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(deletePengumumanRes.status, 200, 'DELETE /api/admin/pengumuman/:id must return 200');

    // 3. Buat Berita Baru
    const createBeritaRes = await fetch(`${baseUrl}/api/admin/berita`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        judul: 'Prestasi Juara 1 Desa Tangguh',
        ringkasan: 'Pekon Banjar Agung meraih penghargaan tingkat kabupaten.'
      })
    });
    assert.strictEqual(createBeritaRes.status, 200, 'POST /api/admin/berita must return 200');
    const createdBerita = await createBeritaRes.json();
    assert.strictEqual(createdBerita.success, true);
    const beritaId = createdBerita.data.id;

    // 4. Hapus Berita
    const deleteBeritaRes = await fetch(`${baseUrl}/api/admin/berita/${beritaId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(deleteBeritaRes.status, 200, 'DELETE /api/admin/berita/:id must return 200');
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('Pengumuman & Berita Feature Test: PASS')).catch(e => {
    console.error('Pengumuman & Berita Feature Test: FAIL', e);
    process.exit(1);
  });
}
