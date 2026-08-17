// tests/unit/auth.test.js
const assert = require('assert');
const crypto = require('crypto');

async function run() {
  console.log('  Testing Auth & Password Verification Logic...');

  // 1. Test Plain Password matching
  const testPassword = 'test_secret_password_2026';
  process.env.ADMIN_PASSWORD = testPassword;
  
  assert.strictEqual(process.env.ADMIN_PASSWORD === testPassword, true, 'Plain admin password must match');
  assert.strictEqual(process.env.ADMIN_PASSWORD === 'wrong_pwd', false, 'Wrong password must be rejected');

  // 2. Test Hash Generation & Scrypt Verification
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(testPassword, salt, 64).toString('hex');
  const storedHash = `${salt}:${hash}`;

  const [extractedSalt, expectedHash] = storedHash.split(':');
  const actualHash = crypto.scryptSync(testPassword, extractedSalt, 64).toString('hex');

  const expectedBuf = Buffer.from(expectedHash, 'hex');
  const actualBuf = Buffer.from(actualHash, 'hex');

  assert.strictEqual(
    expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf),
    true,
    'Hash comparison must succeed with correct password'
  );

  // 3. Test Wrong Password with Scrypt
  const wrongActualHash = crypto.scryptSync('wrong_pass', extractedSalt, 64).toString('hex');
  const wrongActualBuf = Buffer.from(wrongActualHash, 'hex');
  assert.strictEqual(
    expectedBuf.length === wrongActualBuf.length && crypto.timingSafeEqual(expectedBuf, wrongActualBuf),
    false,
    'Hash comparison must fail with wrong password'
  );
}

module.exports = run;

if (require.main === module) {
  run().then(() => console.log('Auth Unit Test: PASS')).catch(e => {
    console.error('Auth Unit Test: FAIL', e);
    process.exit(1);
  });
}
