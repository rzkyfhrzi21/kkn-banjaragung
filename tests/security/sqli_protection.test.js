// tests/security/sqli_protection.test.js
// Pengujian Injeksi SQL & Parameter Tampering (OWASP A03)
const assert = require('assert');
const { startTestServer } = require('../test_helper');

async function run() {
  console.log('  Testing SQL Injection & Parameter Tampering Resiliency...');
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    const maliciousPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE app; --",
      "1 UNION SELECT null, username, password FROM users --",
      "' OR 1=1 /*",
      "\" OR \"\"=\"",
      "admin' --"
    ];

    // 1. Uji SQLi pada Endpoint Login
    for (const sqlPayload of maliciousPayloads) {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: sqlPayload, password: sqlPayload })
      });
      // Server TIDAK BOLEH crash (HTTP 500), harus merespon 401 Unauthorized secara aman
      assert.strictEqual(res.status === 401 || res.status === 429, true, `SQL Injection payload on login must not cause internal server error (Status: ${res.status})`);
    }

    // 2. Uji SQLi pada Endpoint Pengajuan Surat
    for (const sqlPayload of maliciousPayloads) {
      const res = await fetch(`${baseUrl}/api/pengajuan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: sqlPayload,
          ktp: sqlPayload,
          hp: '08123456789',
          alamat: sqlPayload,
          jenisSurat: sqlPayload
        })
      });
      assert.strictEqual(res.status, 200, 'Handled as safe text literal');
      const body = await res.json();
      assert.strictEqual(body.success, true);
    }
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('SQL Injection Security Test: PASS')).catch(e => {
    console.error('SQL Injection Security Test: FAIL', e);
    process.exit(1);
  });
}
