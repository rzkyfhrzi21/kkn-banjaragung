// tests/security/honeypot_antispam.test.js
// Pengujian Anti-Spam Bot Trap & Honeypot Detection
const assert = require('assert');
const { startTestServer } = require('../test_helper');

async function run() {
  console.log('  Testing Anti-Spam Bot Trap & Honeypot Filter...');
  const appInstance = await startTestServer();
  const baseUrl = appInstance.url;

  try {
    // 1. Kirim Form Pengajuan Surat dengan Honeypot Bot Terisi
    const botPayload = {
      nama: 'Spam Bot Automation',
      ktp: '0000000000000000',
      hp: '08999999999',
      alamat: 'Dark Web',
      jenisSurat: 'Spam',
      _hp: 'http://spam-link.com' // Honeypot trap terisi
    };

    const res = await fetch(`${baseUrl}/api/pengajuan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(botPayload)
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    // Verifikasi bahwa bot submission TIDAK masuk ke database
    const checkRes = await fetch(`${baseUrl}/api/data`);
    const publicData = await checkRes.json();
    const pengajuanList = publicData.pengajuan || [];
    const foundBot = pengajuanList.find(p => p.nama === 'Spam Bot Automation');
    assert.strictEqual(foundBot, undefined, 'Bot submission caught by honeypot must NOT be saved to database');
  } finally {
    await appInstance.close();
  }
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('Honeypot Anti-Spam Test: PASS')).catch(e => {
    console.error('Honeypot Anti-Spam Test: FAIL', e);
    process.exit(1);
  });
}
