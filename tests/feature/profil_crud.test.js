// tests/feature/profil_crud.test.js
const assert = require('assert');
const { startTestServer, loginAdmin } = require('../test_helper');

async function run() {
  console.log('  Testing Modul Profil Desa CRUD...');
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    // 1. Test GET /api/data (Public API)
    const publicRes = await fetch(`${baseUrl}/api/data`);
    assert.strictEqual(publicRes.status, 200, 'GET /api/data must return 200');
    const publicData = await publicRes.json();
    assert.ok(publicData.profil, 'Public data must contain profil');

    // 2. Test POST /api/admin/profil (Admin Mutation)
    const token = await loginAdmin(baseUrl);
    const updatePayload = {
      namaDesa: 'Pekon Banjar Agung',
      tagline: 'Bersama membangun desa yang mandiri dan sejahtera',
      visi: 'Mewujudkan Pekon Banjar Agung yang mandiri, sejahtera, dan berbudaya.'
    };

    const updateRes = await fetch(`${baseUrl}/api/admin/profil`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updatePayload)
    });

    assert.strictEqual(updateRes.status, 200, 'POST /api/admin/profil must return 200');
    const result = await updateRes.json();
    assert.strictEqual(result.success, true, 'Result success must be true');
    assert.strictEqual(result.data.namaDesa, 'Pekon Banjar Agung');
    assert.strictEqual(result.data.visi, updatePayload.visi);
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('Profil CRUD Feature Test: PASS')).catch(e => {
    console.error('Profil CRUD Feature Test: FAIL', e);
    process.exit(1);
  });
}
