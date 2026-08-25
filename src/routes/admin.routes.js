// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getData, saveData } = require('../services/storage.service');
const {
  ADMIN_USER,
  loginAttempts,
  generateAdminToken,
  verifyPassword,
  requireAdmin
} = require('../middleware/auth.middleware');
const {
  adminLimiter,
  upload,
  validateFileBuffer,
  requireUploadStorage
} = require('../middleware/security.middleware');
const { putFileToBlob } = require('../services/blob.service');

// 1. Admin Login Endpoint (Unauthenticated, Rate-limited)
router.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  const ip = req.ip || 'unknown';
  let currentAttempt = loginAttempts.get(ip);
  if (!currentAttempt || currentAttempt.resetAt < Date.now()) {
    currentAttempt = { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
  }
  if (currentAttempt.count >= 5) {
    const retryAfter = Math.max(1, Math.ceil((currentAttempt.resetAt - Date.now()) / 1000));
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ success: false, message: 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.' });
  }
  if (username !== ADMIN_USER || !verifyPassword(password)) {
    currentAttempt.count += 1;
    loginAttempts.set(ip, currentAttempt);
    console.warn(`[AUDIT] Login gagal dari IP ${ip} (percobaan ke-${currentAttempt.count})`);
    return res.status(401).json({ success: false, message: 'Username atau password salah.' });
  }
  loginAttempts.delete(ip);
  const token = generateAdminToken();
  console.info(`[AUDIT] Login sukses admin dari IP ${ip}`);
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, token, expiresIn: 8 * 60 * 60 * 1000 });
});

// Apply admin authentication guard for all routes below
router.use('/api/admin', requireAdmin);

// Audit trail ringan untuk semua mutasi data (OWASP A09)
router.use('/api/admin', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    console.info(`[AUDIT] Mutasi ${req.method} ${req.originalUrl} dari IP ${req.ip}`);
  }
  next();
});

// 2. Check Session
router.get('/api/admin/check-session', async (req, res) => {
  res.json({ success: true, valid: true });
});

// 3. Profil CRUD
router.post('/api/admin/profil', async (req, res) => {
  const data = await getData();
  data.profil = { ...data.profil, ...req.body };
  await saveData(data);
  res.json({ success: true, data: data.profil });
});

// 4. Pemerintahan CRUD
router.post('/api/admin/pemerintahan', async (req, res) => {
  const data = await getData();
  data.pemerintahan = { ...data.pemerintahan, ...req.body };
  await saveData(data);
  res.json({ success: true, data: data.pemerintahan });
});

// 5. Kontak CRUD
router.post('/api/admin/kontak', async (req, res) => {
  const data = await getData();
  data.kontak = { ...data.kontak, ...req.body };
  await saveData(data);
  res.json({ success: true, data: data.kontak });
});

// 6. Layanan CRUD
router.post('/api/admin/layanan', async (req, res) => {
  const data = await getData();
  data.layanan = { ...data.layanan, ...req.body };
  await saveData(data);
  res.json({ success: true, data: data.layanan });
});

// 7. Potensi CRUD
router.post('/api/admin/potensi', async (req, res) => {
  const data = await getData();
  data.potensi = { ...data.potensi, ...req.body };
  await saveData(data);
  res.json({ success: true, data: data.potensi });
});

// 8. Berita CRUD
router.post('/api/admin/berita', async (req, res) => {
  const data = await getData();
  const items = data.berita || [];
  const newItem = {
    id: Date.now(),
    judul: req.body.judul || 'Tanpa Judul',
    tanggal: req.body.tanggal || new Date().toLocaleDateString('id-ID'),
    ringkasan: req.body.ringkasan || '',
    gambar: req.body.gambar || '',
    penulis: req.body.penulis || 'Admin'
  };
  items.unshift(newItem);
  data.berita = items;
  await saveData(data);
  res.json({ success: true, data: newItem });
});

router.put('/api/admin/berita/:id', async (req, res) => {
  const data = await getData();
  const items = data.berita || [];
  const idx = items.findIndex(b => String(b.id) === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Berita tidak ditemukan' });
  }
  items[idx] = { ...items[idx], ...req.body, id: items[idx].id };
  data.berita = items;
  await saveData(data);
  res.json({ success: true, data: items[idx] });
});

router.delete('/api/admin/berita/:id', async (req, res) => {
  const data = await getData();
  data.berita = (data.berita || []).filter(b => String(b.id) !== req.params.id);
  await saveData(data);
  res.json({ success: true });
});

// 9. Pengumuman CRUD
router.post('/api/admin/pengumuman', async (req, res) => {
  const data = await getData();
  const items = data.pengumuman || [];
  const newItem = {
    id: Date.now(),
    judul: req.body.judul || 'Tanpa Judul',
    tanggal: req.body.tanggal || new Date().toLocaleDateString('id-ID'),
    ringkasan: req.body.ringkasan || '',
    isi: req.body.isi || '',
    gambar: req.body.gambar || ''
  };
  items.unshift(newItem);
  data.pengumuman = items;
  await saveData(data);
  res.json({ success: true, data: newItem });
});

router.put('/api/admin/pengumuman/:id', async (req, res) => {
  const data = await getData();
  const items = data.pengumuman || [];
  const idx = items.findIndex(p => String(p.id) === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Pengumuman tidak ditemukan' });
  }
  items[idx] = { ...items[idx], ...req.body, id: items[idx].id };
  data.pengumuman = items;
  await saveData(data);
  res.json({ success: true, data: items[idx] });
});

router.delete('/api/admin/pengumuman/:id', async (req, res) => {
  const data = await getData();
  data.pengumuman = (data.pengumuman || []).filter(p => String(p.id) !== req.params.id);
  data.komentar = (data.komentar || []).filter(k => String(k.pengumumanId) !== req.params.id);
  await saveData(data);
  res.json({ success: true });
});

// 10. Galeri CRUD
router.post('/api/admin/galeri', async (req, res) => {
  const data = await getData();
  data.galeri = data.galeri || [];
  const urls = req.body.urls || (req.body.url ? [req.body.url] : []);
  if (urls.length) {
    data.galeri.push(...urls);
    await saveData(data);
  }
  res.json({ success: true, data: data.galeri });
});

router.delete('/api/admin/galeri/:index', async (req, res) => {
  const data = await getData();
  const idx = parseInt(req.params.index, 10);
  data.galeri = (data.galeri || []).filter((_, i) => i !== idx);
  await saveData(data);
  res.json({ success: true, data: data.galeri });
});

router.post('/api/admin/galeri-category', async (req, res) => {
  const data = await getData();
  if (!data.galeri || Array.isArray(data.galeri)) {
    data.galeri = { galeri1: [], galeri2: [], galeri3: [] };
  }
  const category = req.body.category || 'galeri1';
  const urls = req.body.urls || [];
  if (!data.galeri[category]) data.galeri[category] = [];
  if (urls.length) {
    data.galeri[category].push(...urls);
    await saveData(data);
  }
  res.json({ success: true, data: data.galeri });
});

router.delete('/api/admin/galeri-category/:category/:index', async (req, res) => {
  const data = await getData();
  const category = req.params.category;
  const idx = parseInt(req.params.index, 10);
  if (data.galeri && data.galeri[category]) {
    data.galeri[category] = data.galeri[category].filter((_, i) => i !== idx);
    await saveData(data);
  }
  res.json({ success: true, data: data.galeri });
});

// Ganti foto galeri pada posisi tertentu secara in-place (urutan tidak berubah).
router.put('/api/admin/galeri-category/:category/:index', async (req, res) => {
  const data = await getData();
  const category = req.params.category;
  const idx = parseInt(req.params.index, 10);
  if (!data.galeri || !Array.isArray(data.galeri[category]) || !data.galeri[category][idx]) {
    return res.status(404).json({ success: false, message: 'Foto galeri tidak ditemukan' });
  }
  const url = req.body && typeof req.body.url === 'string' ? req.body.url.trim() : '';
  if (!url) {
    return res.status(400).json({ success: false, message: 'URL foto baru wajib diisi' });
  }
  data.galeri[category][idx] = url;
  await saveData(data);
  res.json({ success: true, data: data.galeri });
});

// 11. Pengajuan Surat Masuk CRUD
router.get('/api/admin/pengajuan', async (req, res) => {
  const data = await getData();
  res.json({ success: true, data: data.pengajuan || [] });
});

router.delete('/api/admin/pengajuan/:id', async (req, res) => {
  const data = await getData();
  data.pengajuan = (data.pengajuan || []).filter(p => String(p.id) !== req.params.id);
  await saveData(data);
  res.json({ success: true });
});

// 12. Keluhan Masyarakat CRUD
router.get('/api/admin/keluhan', async (req, res) => {
  const data = await getData();
  res.json({ success: true, data: data.keluhan || [] });
});

router.delete('/api/admin/keluhan/:id', async (req, res) => {
  const data = await getData();
  data.keluhan = (data.keluhan || []).filter(p => String(p.id) !== req.params.id);
  await saveData(data);
  res.json({ success: true });
});

// 13. Komentar Moderation CRUD
router.get('/api/admin/komentar', async (req, res) => {
  const data = await getData();
  const komentar = (data.komentar || []).map(k => {
    const peng = (data.pengumuman || []).find(p => String(p.id) === String(k.pengumumanId));
    return { ...k, judulPengumuman: peng ? peng.judul : '(Pengumuman dihapus)' };
  });
  res.json({ success: true, data: komentar });
});

router.delete('/api/admin/komentar/:id', async (req, res) => {
  const data = await getData();
  data.komentar = (data.komentar || []).filter(k => String(k.id) !== req.params.id);
  await saveData(data);
  res.json({ success: true });
});

// 14. File Upload (Single)
router.post('/api/admin/upload', requireUploadStorage, upload.single('foto'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });
  }
  try {
    const filename = req.file.filename;
    const localPath = req.file.path;

    // Validate Magic Bytes and scan for webshell payloads
    validateFileBuffer(localPath);

    // On Vercel, persist the file to Vercel Blob Storage (fallback to /uploads/ locally)
    // URL yang dikembalikan selalu /uploads/<nama>; di Vercel file diserve via proxy dari Blob
    const blobUrl = await putFileToBlob(localPath);
    // Di Vercel, file disimpan ke Blob dan URL asli Blob dikembalikan (langsung bisa ditampilkan).
    // Fallback /uploads/ hanya untuk development lokal.
    const url = blobUrl || '/uploads/' + filename;
    if (blobUrl) {
      try { fs.unlinkSync(localPath); } catch (e) {}
    }
    res.json({ success: true, url });
  } catch (err) {
    console.error('[UPLOAD ERROR]', err);
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(400).json({
      success: false,
      message: err.message || 'Gagal mengupload file',
      detail: req.file ? { file: req.file.originalname, size: req.file.size } : undefined
    });
  }
});

// 15. File Upload (Multiple)
router.post('/api/admin/upload-multiple', requireUploadStorage, upload.array('foto', 20), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });
  }
  try {
    const urls = [];
    for (const f of req.files) {
      const filename = f.filename;
      const localPath = f.path;

      // Validate Magic Bytes and scan for webshell payloads
      validateFileBuffer(localPath);

      // On Vercel, persist the file to Vercel Blob Storage (fallback to /uploads/ locally)
      const blobUrl = await putFileToBlob(localPath);
      urls.push(blobUrl || '/uploads/' + filename);
      if (blobUrl) {
        try { fs.unlinkSync(localPath); } catch (e) {}
      }
    }
    res.json({ success: true, urls });
  } catch (err) {
    if (req.files) {
      for (const f of req.files) {
        try { fs.unlinkSync(f.path); } catch (e) {}
      }
    }
    res.status(400).json({ success: false, message: err.message || 'Gagal mengupload file' });
  }
});

module.exports = router;
