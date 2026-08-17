// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { loadData, saveData } = require('../services/storage.service');
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
  validateFileBuffer
} = require('../middleware/security.middleware');
const { putFileToBlob } = require('../services/blob.service');

// 1. Admin Login Endpoint (Unauthenticated, Rate-limited)
router.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const ip = req.ip || 'unknown';
  let currentAttempt = loginAttempts.get(ip);
  if (!currentAttempt || currentAttempt.resetAt < Date.now()) {
    currentAttempt = { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
  }
  if (currentAttempt.count >= 5) {
    return res.status(429).json({ success: false, message: 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.' });
  }
  if (username !== ADMIN_USER || !verifyPassword(password)) {
    currentAttempt.count += 1;
    loginAttempts.set(ip, currentAttempt);
    return res.status(401).json({ success: false, message: 'Username atau password salah.' });
  }
  loginAttempts.delete(ip);
  const token = generateAdminToken();
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, token, expiresIn: 8 * 60 * 60 * 1000 });
});

// Apply admin authentication guard for all routes below
router.use('/api/admin', requireAdmin);

// 2. Check Session
router.get('/api/admin/check-session', (req, res) => {
  res.json({ success: true, valid: true });
});

// 3. Profil CRUD
router.post('/api/admin/profil', (req, res) => {
  const data = loadData();
  data.profil = { ...data.profil, ...req.body };
  saveData(data);
  res.json({ success: true, data: data.profil });
});

// 4. Pemerintahan CRUD
router.post('/api/admin/pemerintahan', (req, res) => {
  const data = loadData();
  data.pemerintahan = { ...data.pemerintahan, ...req.body };
  saveData(data);
  res.json({ success: true, data: data.pemerintahan });
});

// 5. Kontak CRUD
router.post('/api/admin/kontak', (req, res) => {
  const data = loadData();
  data.kontak = { ...data.kontak, ...req.body };
  saveData(data);
  res.json({ success: true, data: data.kontak });
});

// 6. Layanan CRUD
router.post('/api/admin/layanan', (req, res) => {
  const data = loadData();
  data.layanan = { ...data.layanan, ...req.body };
  saveData(data);
  res.json({ success: true, data: data.layanan });
});

// 7. Potensi CRUD
router.post('/api/admin/potensi', (req, res) => {
  const data = loadData();
  data.potensi = { ...data.potensi, ...req.body };
  saveData(data);
  res.json({ success: true, data: data.potensi });
});

// 8. Berita CRUD
router.post('/api/admin/berita', (req, res) => {
  const data = loadData();
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
  saveData(data);
  res.json({ success: true, data: newItem });
});

router.put('/api/admin/berita/:id', (req, res) => {
  const data = loadData();
  const items = data.berita || [];
  const idx = items.findIndex(b => String(b.id) === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Berita tidak ditemukan' });
  }
  items[idx] = { ...items[idx], ...req.body, id: items[idx].id };
  data.berita = items;
  saveData(data);
  res.json({ success: true, data: items[idx] });
});

router.delete('/api/admin/berita/:id', (req, res) => {
  const data = loadData();
  data.berita = (data.berita || []).filter(b => String(b.id) !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// 9. Pengumuman CRUD
router.post('/api/admin/pengumuman', (req, res) => {
  const data = loadData();
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
  saveData(data);
  res.json({ success: true, data: newItem });
});

router.put('/api/admin/pengumuman/:id', (req, res) => {
  const data = loadData();
  const items = data.pengumuman || [];
  const idx = items.findIndex(p => String(p.id) === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Pengumuman tidak ditemukan' });
  }
  items[idx] = { ...items[idx], ...req.body, id: items[idx].id };
  data.pengumuman = items;
  saveData(data);
  res.json({ success: true, data: items[idx] });
});

router.delete('/api/admin/pengumuman/:id', (req, res) => {
  const data = loadData();
  data.pengumuman = (data.pengumuman || []).filter(p => String(p.id) !== req.params.id);
  data.komentar = (data.komentar || []).filter(k => String(k.pengumumanId) !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// 10. Galeri CRUD
router.post('/api/admin/galeri', (req, res) => {
  const data = loadData();
  data.galeri = data.galeri || [];
  const urls = req.body.urls || (req.body.url ? [req.body.url] : []);
  if (urls.length) {
    data.galeri.push(...urls);
    saveData(data);
  }
  res.json({ success: true, data: data.galeri });
});

router.delete('/api/admin/galeri/:index', (req, res) => {
  const data = loadData();
  const idx = parseInt(req.params.index, 10);
  data.galeri = (data.galeri || []).filter((_, i) => i !== idx);
  saveData(data);
  res.json({ success: true, data: data.galeri });
});

router.post('/api/admin/galeri-category', (req, res) => {
  const data = loadData();
  if (!data.galeri || Array.isArray(data.galeri)) {
    data.galeri = { galeri1: [], galeri2: [], galeri3: [] };
  }
  const category = req.body.category || 'galeri1';
  const urls = req.body.urls || [];
  if (!data.galeri[category]) data.galeri[category] = [];
  if (urls.length) {
    data.galeri[category].push(...urls);
    saveData(data);
  }
  res.json({ success: true, data: data.galeri });
});

router.delete('/api/admin/galeri-category/:category/:index', (req, res) => {
  const data = loadData();
  const category = req.params.category;
  const idx = parseInt(req.params.index, 10);
  if (data.galeri && data.galeri[category]) {
    data.galeri[category] = data.galeri[category].filter((_, i) => i !== idx);
    saveData(data);
  }
  res.json({ success: true, data: data.galeri });
});

// 11. Pengajuan Surat Masuk CRUD
router.get('/api/admin/pengajuan', (req, res) => {
  const data = loadData();
  res.json({ success: true, data: data.pengajuan || [] });
});

router.delete('/api/admin/pengajuan/:id', (req, res) => {
  const data = loadData();
  data.pengajuan = (data.pengajuan || []).filter(p => String(p.id) !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// 12. Keluhan Masyarakat CRUD
router.get('/api/admin/keluhan', (req, res) => {
  const data = loadData();
  res.json({ success: true, data: data.keluhan || [] });
});

router.delete('/api/admin/keluhan/:id', (req, res) => {
  const data = loadData();
  data.keluhan = (data.keluhan || []).filter(p => String(p.id) !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// 13. Komentar Moderation CRUD
router.get('/api/admin/komentar', (req, res) => {
  const data = loadData();
  const komentar = (data.komentar || []).map(k => {
    const peng = (data.pengumuman || []).find(p => String(p.id) === String(k.pengumumanId));
    return { ...k, judulPengumuman: peng ? peng.judul : '(Pengumuman dihapus)' };
  });
  res.json({ success: true, data: komentar });
});

router.delete('/api/admin/komentar/:id', (req, res) => {
  const data = loadData();
  data.komentar = (data.komentar || []).filter(k => String(k.id) !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// 14. File Upload (Single)
router.post('/api/admin/upload', upload.single('foto'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });
  }
  try {
    const filename = req.file.filename;
    const localPath = req.file.path;

    // Validate Magic Bytes and scan for webshell payloads
    validateFileBuffer(localPath);

    // On Vercel, persist the file to Vercel Blob Storage (fallback to /uploads/ locally)
    const blobUrl = await putFileToBlob(localPath);
    const url = blobUrl || '/uploads/' + filename;
    if (blobUrl) {
      try { fs.unlinkSync(localPath); } catch (e) {}
    }
    res.json({ success: true, url });
  } catch (err) {
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(400).json({ success: false, message: err.message || 'Gagal mengupload file' });
  }
});

// 15. File Upload (Multiple)
router.post('/api/admin/upload-multiple', upload.array('foto', 20), async (req, res) => {
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
