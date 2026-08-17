// tests/security/auth_guard.test.js
// Pengujian Broken Access Control & Session Token Security (OWASP A01)
const assert = require('assert');
const { startTestServer } = require('../test_helper');

async function run() {
  console.log('  Testing Broken Access Control & Admin Auth Guard...');
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    // 1. Uji request ke rute admin TANPA token (Harus ditolak HTTP 401)
    const protectedRoutes = [
      { method: 'POST', path: '/api/admin/profil', body: { namaDesa: 'Hacked' } },
      { method: 'POST', path: '/api/admin/pemerintahan', body: {} },
      { method: 'POST', path: '/api/admin/pengumuman', body: { judul: 'Hacked' } },
      { method: 'GET', path: '/api/admin/pengajuan' },
      { method: 'GET', path: '/api/admin/keluhan' }
    ];

    for (const r of protectedRoutes) {
      const res = await fetch(`${baseUrl}${r.path}`, {
        method: r.method,
        headers: { 'Content-Type': 'application/json' },
        body: r.body ? JSON.stringify(r.body) : undefined
      });
      assert.strictEqual(res.status, 401, `Unauthenticated request to ${r.path} must return HTTP 401 Unauthorized`);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    }

    // 2. Uji request dengan Token Palsu / Manipulasi
    const fakeTokenRes = await fetch(`${baseUrl}/api/admin/profil`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake_invalid_token_12345'
      },
      body: JSON.stringify({ namaDesa: 'Hacked' })
    });
    assert.strictEqual(fakeTokenRes.status, 401, 'Request with forged token must return HTTP 401');
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('Auth Guard Security Test: PASS')).catch(e => {
    console.error('Auth Guard Security Test: FAIL', e);
    process.exit(1);
  });
}
