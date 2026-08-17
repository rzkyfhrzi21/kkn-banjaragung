// src/middleware/auth.middleware.js
const crypto = require('crypto');

const ADMIN_USER = 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || 'd89b69b7348aa9e97b4741286a06df31:129f5b477ad5224ce0566cffa2ea50fea98f64d48ed14355802c16f5ccd7d237003d170889fc74af94f3432414f7c8499745a826b67e924f581759a7655ec8b7';
const ADMIN_SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD || 'pekon-banjar-agung-secure-session-key-2026';

const loginAttempts = new Map();

function generateAdminToken(username = 'admin') {
  const payload = {
    u: username,
    exp: Date.now() + ADMIN_SESSION_TTL,
    nonce: crypto.randomBytes(16).toString('hex')
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('base64url');
  return `${payloadStr}.${sig}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadStr, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('base64url');
  
  if (sig.length !== expectedSig.length) return false;
  const match = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  if (!match) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function verifyPassword(password) {
  if (process.env.ADMIN_PASSWORD) {
    return password === process.env.ADMIN_PASSWORD;
  }
  const [salt, expectedHash] = ADMIN_PASSWORD_HASH.split(':');
  if (!salt || !expectedHash || !password) return false;
  const actualHash = crypto.scryptSync(password, salt, 64).toString('hex');
  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(actualHash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function requireAdmin(req, res, next) {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({ success: false, message: 'Sesi admin tidak valid atau telah berakhir.' });
  }
  next();
}

function resetLoginAttempts() {
  loginAttempts.clear();
}

module.exports = {
  ADMIN_USER,
  loginAttempts,
  generateAdminToken,
  verifyAdminToken,
  verifyPassword,
  requireAdmin,
  resetLoginAttempts
};
