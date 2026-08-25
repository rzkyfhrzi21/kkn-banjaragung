// src/middleware/security.middleware.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const {
  UPLOAD_DIR,
  IS_VERCEL,
  ALLOWED_IMAGE_EXTENSIONS,
  DANGEROUS_EXTENSIONS_PATTERN,
  DANGEROUS_BINARY_SIGNATURES
} = require('../config/constants');
const { isBlobAvailable } = require('../services/blob.service');

// Di Vercel, filesystem hanya ephemeral (/tmp) — file yang tidak dipersist ke
// Vercel Blob akan HILANG dan URL /uploads/... menjadi mati. Jika storage blob
// belum dikonfigurasi, tolak unggahan dengan pesan jelas daripada menerima
// file lalu memberi notifikasi "berhasil" palsu kepada admin.
function requireUploadStorage(req, res, next) {
  if (IS_VERCEL && !isBlobAvailable()) {
    return res.status(503).json({
      success: false,
      message: 'Penyimpanan berkas belum dikonfigurasi pada server (BLOB_READ_WRITE_TOKEN kosong). Upload dinonaktifkan agar berkas tidak hilang.'
    });
  }
  next();
}

// 1. Anti-Webshell & True MIME / Magic Byte Buffer Validation
function validateFileBuffer(filePath) {
  if (!fs.existsSync(filePath)) return true;
  const buffer = fs.readFileSync(filePath);
  if (buffer.length === 0) {
    try { fs.unlinkSync(filePath); } catch (e) {}
    throw new Error('Berkas tidak boleh kosong (0 bytes).');
  }

  // Check Magic Bytes (True Image Headers)
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isGif = buffer.length >= 6 && buffer.toString('ascii', 0, 6).startsWith('GIF8');
  const isWebp = buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  const isBmp = buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4D;
  const isIco = buffer.length >= 4 && buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00;
  const isTiff = buffer.length >= 4 && ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2A && buffer[3] === 0x00) || (buffer[0] === 0x4D && buffer[1] === 0x4D && buffer[2] === 0x00 && buffer[3] === 0x2A));
  const ftyp = buffer.length >= 12 ? buffer.toString('ascii', 4, 12) : '';
  const isAvif = ftyp.startsWith('ftyp') && (buffer.toString('ascii', 8, 12) === 'avif' || buffer.toString('ascii', 8, 16).startsWith('avif'));
  const isHeic = ftyp.startsWith('ftyp') && (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(buffer.toString('ascii', 8, 12)));

  if (!isJpeg && !isPng && !isGif && !isWebp && !isBmp && !isIco && !isTiff && !isAvif && !isHeic) {
    try { fs.unlinkSync(filePath); } catch (e) {}
    const sniff = buffer.length >= 12 ? buffer.toString('hex', 0, 8) : 'kosong';
    throw new Error('Header berkas tidak valid. Berkas bukan gambar asli (Magic Byte Mismatch). 8 byte pertama: ' + sniff + '.');
  }

  // Scan for malicious executable scripts in binary buffer
  const contentLower = buffer.toString('binary').toLowerCase();
  for (const sig of DANGEROUS_BINARY_SIGNATURES) {
    if (contentLower.includes(sig)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
      throw new Error(`Webshell/Payload berbahaya terdeteksi (${sig}). Berkas ditolak demi keamanan server.`);
    }
  }

  return true;
}

// 2. Multer Configuration for Safe Image Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
    } catch (e) {}
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_IMAGE_EXTENSIONS.includes(rawExt) ? rawExt : '.jpg';
    const name = Date.now() + '-' + crypto.randomBytes(8).toString('hex') + safeExt;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const originalName = (file.originalname || '').trim().toLowerCase();

  // Anti Double Extension (e.g. shell.php.jpg, test.phtml.png)
  const nameWithoutLastExt = originalName.substring(0, originalName.lastIndexOf('.'));
  if (DANGEROUS_EXTENSIONS_PATTERN.test(nameWithoutLastExt)) {
    return cb(new Error('Nama file mencurigakan (Double Extension terdeteksi). Upload ditolak demi keamanan.'), false);
  }

  // Allowed Image Extensions Only
  const allowed = /\.(jpeg|jpg|png|gif|webp|avif|heic|heif|bmp|ico|tiff|tif)$/i;
  if (!allowed.test(path.extname(originalName))) {
    return cb(new Error('Format file tidak didukung. File harus berupa gambar (jpeg, jpg, png, gif, webp, avif, heic, bmp, ico, tiff).'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 4 * 1024 * 1024 } // 4MB limit (below Vercel's 4.5MB request body limit)
});

// 3. Input Sanitization & Anti-Spam Honeypot Filter
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

function checkHoneypot(req, res, next) {
  if (req.body && (req.body._hp || req.body.website || req.body.bot_trap)) {
    return res.json({ success: true, message: 'Data berhasil diterima' });
  }
  next();
}

// 4. Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 5000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan, coba lagi nanti.' }
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 5000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan, coba lagi nanti.' }
});

const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 5000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak pengiriman formulir. Coba lagi dalam 15 menit.' }
});

// 5. Helmet Security Headers Config
const securityHeaders = helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", 'https:'],
      scriptSrc: ["'self'", 'https:', "'unsafe-inline'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'", 'blob:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      frameAncestors: ["'self'"]
    }
  }
});

module.exports = {
  validateFileBuffer,
  upload,
  requireUploadStorage,
  sanitizeInput,
  checkHoneypot,
  apiLimiter,
  adminLimiter,
  publicFormLimiter,
  securityHeaders
};
