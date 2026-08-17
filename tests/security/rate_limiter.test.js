// tests/security/rate_limiter.test.js
// Pengujian Anti-Brute Force & Rate Limiter (OWASP A07)
const assert = require('assert');
const { startTestServer } = require('../test_helper');

async function run() {
  console.log('  Testing Anti-Brute Force & Login Rate Limiter...');
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    const app = require('../../server');
    if (typeof app._resetLoginAttempts === 'function') app._resetLoginAttempts();

    const wrongCredentials = { username: 'admin', password: 'wrong_password_test' };

    // 5 kali percobaan login gagal berturut-turut harus mengembalikan HTTP 401
    for (let i = 1; i <= 5; i++) {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wrongCredentials)
      });
      assert.strictEqual(res.status, 401, `Failed attempt #${i} must return HTTP 401`);
    }

    // Percobaan ke-6 WAJIB diblokir dengan HTTP 429 Too Many Requests
    const blockedRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wrongCredentials)
    });

    assert.strictEqual(blockedRes.status, 429, 'Attempt #6 must be blocked with HTTP 429 Too Many Requests');
    const blockedData = await blockedRes.json();
    assert.strictEqual(blockedData.success, false);
    assert.ok(blockedData.message.includes('percobaan') || blockedData.message.includes('banyak'), 'Must include friendly rate limit warning message');
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('Rate Limiter Security Test: PASS')).catch(e => {
    console.error('Rate Limiter Security Test: FAIL', e);
    process.exit(1);
  });
}
