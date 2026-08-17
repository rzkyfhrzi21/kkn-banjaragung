// tests/unit/data_integrity.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('  Testing Data Integrity & JSON Schema Structure...');

  const dataPath = path.join(__dirname, '../../data/data.json');
  assert.strictEqual(fs.existsSync(dataPath), true, 'data/data.json file must exist');

  const content = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(content);

  // 1. Profil Section
  assert.ok(data.profil, 'data.profil must exist');
  assert.strictEqual(typeof data.profil.namaDesa, 'string', 'namaDesa must be a string');
  assert.strictEqual(typeof data.profil.kecamatan, 'string', 'kecamatan must be a string');
  assert.strictEqual(typeof data.profil.kabupaten, 'string', 'kabupaten must be a string');
  assert.ok(Array.isArray(data.profil.misi), 'profil.misi must be an array');
  assert.ok(Array.isArray(data.profil.dataSingkat), 'profil.dataSingkat must be an array');

  // 2. Pemerintahan Section
  assert.ok(data.pemerintahan, 'data.pemerintahan must exist');
  assert.ok(data.pemerintahan.kepalaDesa, 'kepalaDesa must exist');
  assert.strictEqual(typeof data.pemerintahan.kepalaDesa.nama, 'string', 'kepalaDesa.nama must be a string');
  assert.ok(Array.isArray(data.pemerintahan.perangkat), 'perangkat must be an array');
  assert.ok(data.pemerintahan.bpd, 'bpd must exist');
  assert.ok(Array.isArray(data.pemerintahan.lembaga), 'lembaga must be an array');

  // 3. Kontak Section
  assert.ok(data.kontak, 'data.kontak must exist');
  assert.strictEqual(typeof data.kontak.alamat, 'string', 'alamat must be a string');
  assert.strictEqual(typeof data.kontak.telepon, 'string', 'telepon must be a string');
  assert.strictEqual(typeof data.kontak.email, 'string', 'email must be a string');

  // 4. Layanan Section
  assert.ok(data.layanan, 'data.layanan must exist');
  assert.ok(data.layanan.pengajuanSurat, 'pengajuanSurat must exist');
  assert.ok(data.layanan.dataKependudukan, 'dataKependudukan must exist');
  assert.ok(data.layanan.jadwalPosyandu, 'jadwalPosyandu must exist');
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('Data Integrity Unit Test: PASS')).catch(e => {
    console.error('Data Integrity Unit Test: FAIL', e);
    process.exit(1);
  });
}
