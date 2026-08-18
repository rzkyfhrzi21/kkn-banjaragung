// src/routes/public.routes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { loadData, saveData } = require('../services/storage.service');
const {
  publicFormLimiter,
  checkHoneypot,
  sanitizeInput,
  upload,
  validateFileBuffer
} = require('../middleware/security.middleware');

// 1. Health & Ready Endpoints
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));
router.get('/ready', (req, res) => {
  try {
    loadData();
    res.json({ ready: true });
  } catch (e) {
    res.status(500).json({ ready: false, error: (e.message || e) });
  }
});

// 2. Full Site Data (publik)
// Field sensitif (users, pengajuan, keluhan, komentar) TIDAK diekspos —
// admin mengaksesnya via /api/admin/* yang dilindungi autentikasi.
router.get('/api/data', (req, res) => {
  const data = loadData();
  const publicData = { ...data };
  delete publicData.users;
  delete publicData.pengajuan;
  delete publicData.keluhan;
  delete publicData.komentar;
  res.json(publicData);
});

// 3. Specific Public Resource Endpoints
router.get('/api/profil', (req, res) => {
  const data = loadData();
  res.json({ success: true, data: data.profil });
});

router.get('/api/pemerintahan', (req, res) => {
  const data = loadData();
  res.json({ success: true, data: data.pemerintahan });
});

router.get('/api/kontak', (req, res) => {
  const data = loadData();
  res.json({ success: true, data: data.kontak });
});

router.get('/api/layanan', (req, res) => {
  const data = loadData();
  res.json({ success: true, data: data.layanan });
});

router.get('/api/potensi', (req, res) => {
  const data = loadData();
  res.json({ success: true, data: data.potensi });
});

router.get('/api/berita', (req, res) => {
  const data = loadData();
  res.json({ success: true, data: data.berita || [] });
});

router.get('/api/pengumuman', (req, res) => {
  const data = loadData();
  res.json({ success: true, data: data.pengumuman || [] });
});

router.get('/api/pengumuman/:id', (req, res) => {
  const data = loadData();
  const item = (data.pengumuman || []).find(p => String(p.id) === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Pengumuman tidak ditemukan' });
  }
  res.json({ success: true, data: item });
});

router.get('/api/pengumuman/:id/komentar', (req, res) => {
  const data = loadData();
  const komentar = (data.komentar || []).filter(k => String(k.pengumumanId) === req.params.id);
  res.json({ success: true, data: komentar });
});

router.post('/api/pengumuman/:id/komentar', (req, res) => {
  const data = loadData();
  const { nama, isi } = req.body || {};
  if (!nama || !isi) {
    return res.status(400).json({ success: false, message: 'Nama dan isi komentar wajib diisi' });
  }
  const newKomentar = {
    id: Date.now(),
    pengumumanId: req.params.id,
    nama: sanitizeInput(nama),
    isi: sanitizeInput(isi),
    tanggal: new Date().toLocaleString('id-ID')
  };
  data.komentar = data.komentar || [];
  data.komentar.unshift(newKomentar);
  saveData(data);
  res.json({ success: true, data: newKomentar });
});

// 4. Form Pengajuan Surat Online
router.post('/api/pengajuan', publicFormLimiter, checkHoneypot, (req, res) => {
  const data = loadData();
  const item = {
    id: Date.now(),
    nama: sanitizeInput(req.body.nama || ''),
    ktp: sanitizeInput(req.body.ktp || ''),
    hp: sanitizeInput(req.body.hp || ''),
    alamat: sanitizeInput(req.body.alamat || ''),
    jenisSurat: sanitizeInput(req.body.jenisSurat || ''),
    tanggal: new Date().toLocaleString('id-ID'),
    status: 'Baru'
  };
  data.pengajuan = data.pengajuan || [];
  data.pengajuan.unshift(item);
  saveData(data);
  res.json({ success: true, data: item });
});

// 5. Form Keluhan Masyarakat Online
router.post('/api/keluhan', publicFormLimiter, upload.single('bukti'), checkHoneypot, (req, res) => {
  try {
    let bukti = '';
    if (req.file) {
      validateFileBuffer(req.file.path);
      bukti = '/uploads/' + req.file.filename;
    }
    const data = loadData();
    const item = {
      id: Date.now(),
      nama: sanitizeInput(req.body.nama || ''),
      hp: sanitizeInput(req.body.hp || ''),
      judul: sanitizeInput(req.body.judul || ''),
      kronologi: sanitizeInput(req.body.kronologi || ''),
      lokasi: sanitizeInput(req.body.lokasi || ''),
      bukti: bukti,
      tanggal: new Date().toLocaleString('id-ID'),
      status: 'Baru'
    };
    data.keluhan = data.keluhan || [];
    data.keluhan.unshift(item);
    saveData(data);
    res.json({ success: true, data: item });
  } catch (err) {
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(400).json({ success: false, message: err.message || 'Gagal mengirim keluhan' });
  }
});

// 6. Statistics Endpoint
router.get('/api/stats', (req, res) => {
  const data = loadData();
  res.json({
    success: true,
    totalPengumuman: (data.pengumuman || []).length,
    totalBerita: (data.berita || []).length,
    totalPengajuan: (data.pengajuan || []).length,
    totalKeluhan: (data.keluhan || []).length
  });
});

module.exports = router;
