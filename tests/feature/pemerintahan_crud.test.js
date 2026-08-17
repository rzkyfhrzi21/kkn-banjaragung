// tests/feature/pemerintahan_crud.test.js
const assert = require('assert');
const { startTestServer, loginAdmin } = require('../test_helper');

async function run() {
  console.log('  Testing Modul Pemerintahan & Aparatur CRUD...');
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    const token = await loginAdmin(baseUrl);

    const updatePayload = {
      kepalaDesa: {
        nama: 'Muhammad Rifky Ramadhan S.Kom',
        jabatan: 'Kepala Desa',
        foto: '/uploads/1786086865405-493464091.jpeg'
      },
      perangkat: [
        { jabatan: 'Sekretaris Desa', nama: 'Budi Santoso', foto: '' }
      ],
      bpd: {
        ketua: 'H. Suryadi',
        wakil: 'Ahmad Fauzi',
        sekretaris: 'Siti Rahma',
        anggota: 'Bambang, Joko'
      },
      lembaga: [
        { nama: 'PKK' },
        { nama: 'Karang Taruna' }
      ]
    };

    const res = await fetch(`${baseUrl}/api/admin/pemerintahan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updatePayload)
    });

    assert.strictEqual(res.status, 200, 'POST /api/admin/pemerintahan must return 200');
    const result = await res.json();
    assert.strictEqual(result.success, true, 'Result success must be true');
    assert.strictEqual(result.data.kepalaDesa.nama, 'Muhammad Rifky Ramadhan S.Kom');
    assert.strictEqual(result.data.bpd.ketua, 'H. Suryadi');
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('Pemerintahan CRUD Feature Test: PASS')).catch(e => {
    console.error('Pemerintahan CRUD Feature Test: FAIL', e);
    process.exit(1);
  });
}
