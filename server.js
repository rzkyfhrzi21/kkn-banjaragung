require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const webpush = require('web-push');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const winston = require('winston');
const { body, validationResult } = require('express-validator');
let Database = null; // will load better-sqlite3 lazily if enabled


const app = express();
const PORT = process.env.PORT || 3000;
app.disable('x-powered-by');
app.set('trust proxy', 1);

// ===== Setup directories =====
const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'data') : path.join(__dirname, 'data');
const UPLOAD_DIR = IS_VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
const STATIC_UPLOAD_DIR = path.join(__dirname, 'uploads');
const BUNDLED_DATA_FILE = path.join(__dirname, 'data', 'data.json');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (e) {
  // ignore in read-only environment
}

// ===== Anti-Webshell & True MIME Validation =====
function validateFileBuffer(filePath) {
  if (!fs.existsSync(filePath)) return true;
  const buffer = fs.readFileSync(filePath);
  if (buffer.length === 0) {
    try { fs.unlinkSync(filePath); } catch (e) {}
    throw new Error('Berkas tidak boleh kosong (0 bytes).');
  }

  // 1. Check Magic Bytes (True Image Headers)
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isGif = buffer.length >= 6 && buffer.toString('ascii', 0, 6).startsWith('GIF8');
  const isWebp = buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';

  if (!isJpeg && !isPng && !isGif && !isWebp) {
    try { fs.unlinkSync(filePath); } catch (e) {}
    throw new Error('Header berkas tidak valid. Berkas bukan gambar asli (Magic Byte Mismatch).');
  }

  // 2. Anti-Webshell: Scan for malicious executable scripts in binary buffer
  const contentLower = buffer.toString('binary').toLowerCase();
  const dangerousSignatures = [
    '<?php', '<?=', '<%', '<script', 'eval(', 'base64_decode(', 'passthru(',
    'shell_exec(', 'system(', 'popen(', 'proc_open(', 'assert('
  ];

  for (const sig of dangerousSignatures) {
    if (contentLower.includes(sig)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
      throw new Error(`Webshell/Payload berbahaya terdeteksi (${sig}). Berkas ditolak demi keamanan server.`);
    }
  }

  return true;
}

// ===== Multer config for photo upload with Double Extension Protection =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(rawExt) ? rawExt : '.jpg';
    const name = Date.now() + '-' + crypto.randomBytes(8).toString('hex') + safeExt;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const originalName = (file.originalname || '').toLowerCase();

  // Anti Double Extension (e.g. shell.php.jpg, test.phtml.png)
  const dangerousPatterns = /\.(php|phtml|phar|inc|sh|bash|exe|cgi|pl|jsp|asp|aspx|htaccess|py|rb|svg)/i;
  const nameWithoutLastExt = originalName.substring(0, originalName.lastIndexOf('.'));
  if (dangerousPatterns.test(nameWithoutLastExt)) {
    return cb(new Error('Nama file mencurigakan (Double Extension terdeteksi). Upload ditolak demi keamanan.'), false);
  }

  // Allowed Image Extensions Only
  const allowed = /\.(jpeg|jpg|png|gif|webp)$/i;
  const ok = allowed.test(path.extname(originalName));
  if (!ok) {
    return cb(new Error('Format file tidak didukung. File harus berupa gambar (jpeg, jpg, png, gif, webp).'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ===== Input Sanitization & Anti-Spam Honeypot =====
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

// ===== Middleware =====
// CSP: conservative defaults, allow https resources and inline where needed
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", 'https:'],
      scriptSrc: ["'self'", 'https:', "'unsafe-inline'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      frameAncestors: ["'self'"]
    }
  }
}));

// CORS: if CORS_ORIGIN provided use whitelist (comma separated), otherwise allow all
if (process.env.CORS_ORIGIN) {
  const allow = process.env.CORS_ORIGIN.split(',').map(s => s.trim());
  app.use(cors({ origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    cb(null, allow.includes(origin));
  }}));
} else {
  app.use(cors());
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'Web Profil Pekon Banjar Agung')));
app.use('/uploads', express.static(UPLOAD_DIR));
if (IS_VERCEL) {
  app.use('/uploads', express.static(STATIC_UPLOAD_DIR));
}

// Basic rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 5000 : 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan, coba lagi nanti.' }
});
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 5000 : 30, // stricter for admin routes
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan, coba lagi nanti.' }
});
const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 5000 : 30, // rate limit for public submissions to prevent spam floods
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak pengiriman formulir. Coba lagi dalam 15 menit.' }
});

app.use('/api', apiLimiter);
app.use('/api/admin', adminLimiter);

// ===== Default data structure =====
function defaultData() {
  return {
    profil: {
      namaDesa: "Pekon Banjar Agung",
      kecamatan: "Kecamatan Gunung Alip",
      kabupaten: "Kabupaten Tanggamus",
      tagline: "Bersama membangun desa yang mandiri dan sejahtera",
      panelAdmin: {
        judul: "Admin Panel",
        deskripsi: "Kelola data dan biodata desa",
        ringkasan: "Ringkasan Profil Website",
        foto: "profil-pkpm.jpeg"
      },
      deskripsi: "Desa kami terletak di Kecamatan Gunung Alip, Kabupaten Tanggamus.",
      tentangJudul: "Mengenal Desa Kami",
      komitmen: "Kami berkomitmen untuk membangun masyarakat yang mandiri, sejahtera, dan berdaya saing.",
      dataSingkat: [],
      visi: "Mewujudkan desa yang mandiri, sejahtera, dan berbudaya.",
      misi: [],
logo: "https://images.unsplash.com/photo-1558005530-a7958896ec60?auto=format&fit=crop&w=48&q=80",
      heroFoto: "https://images.unsplash.com/photo-1558005530-a7958896ec60?auto=format&fit=crop&w=1200&q=80",
      fotoTentang: "https://images.unsplash.com/photo-1526494631344-8c6fa6462b17?auto=format&fit=crop&w=300&q=80"
    },
pemerintahan: {
      kepalaDesa: {
        nama: "[Nama Kepala Desa]",
        jabatan: "Kepala Desa",
        foto: "https://randomuser.me/api/portraits/men/9.jpg"
      },
      perangkat: [
        { jabatan: "Sekretaris Desa", nama: "[Nama Sekretaris]", foto: "" },
        { jabatan: "Kaur Keuangan", nama: "[Nama Kaur Keuangan]", foto: "" },
        { jabatan: "Kaur Umum & Perencanaan", nama: "[Nama Kaur Umum]", foto: "" },
        { jabatan: "Kasi Pemerintahan", nama: "[Nama Kasi Pemerintahan]", foto: "" },
        { jabatan: "Kasi Kesejahteraan", nama: "[Nama Kasi Kesejahteraan]", foto: "" },
        { jabatan: "Kasi Pelayanan", nama: "[Nama Kasi Pelayanan]", foto: "" },
        { jabatan: "Kepala Dusun", nama: "[Nama Kepala Dusun]", foto: "" }
      ],
      bpd: {
        ketua: "[Nama Ketua BPD]",
        wakil: "[Nama Wakil Ketua BPD]",
        sekretaris: "[Nama Sekretaris BPD]",
        anggota: "[Nama-nama Anggota BPD]"
      },
      lembaga: [
        { nama: "PKK (Pemberdayaan Kesejahteraan Keluarga)" },
        { nama: "Karang Taruna" },
        { nama: "LPMD (Lembaga Pemberdayaan Masyarakat Desa)" },
        { nama: "Posyandu" },
        { nama: "Kelompok Tani" },
        { nama: "Dan lain-lain" }
      ]
    },
kontak: {
      alamat: "Jl. xxx , Kecamatan Gunung Alip, Kabupaten Tanggamus",
      telepon: "08xx-xxxx-xxxx",
      email: "desa@email.com",
      mapsUrl: "https://maps.google.com/maps?q=-7.250445,112.768845&z=15&output=embed",
      instagram: "",
      facebook: "",
      youtube: ""
    },
    berita: [
      { id: 1, judul: "Judul Berita 1", tanggal: "01 Jan 2026", ringkasan: "Ringkasan berita terbaru di desa...", gambar: "", penulis: "Admin" },
      { id: 2, judul: "Judul Berita 2", tanggal: "28 Des 2026", ringkasan: "Ringkasan berita terbaru di desa...", gambar: "", penulis: "Admin" },
      { id: 3, judul: "Judul Berita 3", tanggal: "20 Des 2026", ringkasan: "Ringkasan berita terbaru di desa...", gambar: "", penulis: "Admin" }
    ],
    pengumuman: [
      { id: 1, judul: "Judul Pengumuman 1", tanggal: "05 Jan 2026", ringkasan: "Ringkasan pengumuman penting untuk warga desa...", gambar: "" },
      { id: 2, judul: "Judul Pengumuman 2", tanggal: "30 Des 2026", ringkasan: "Ringkasan pengumuman penting untuk warga desa...", gambar: "" },
      { id: 3, judul: "Judul Pengumuman 3", tanggal: "25 Des 2026", ringkasan: "Ringkasan pengumuman penting untuk warga desa...", gambar: "" }
    ],
galeri: {
      galeri1: [
        "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=400&q=80",
        "https://images.unsplash.com/photo-1531662439848-a7ed93c51468?auto=format&fit=crop&w=400&q=80"
      ],
      galeri2: [
        "https://images.unsplash.com/photo-1440558929809-1412944a6225?auto=format&fit=crop&w=400&q=80"
      ],
      galeri3: [
        "https://images.unsplash.com/photo-1520052203542-d3095f1b6cf0?auto=format&fit=crop&w=400&q=80"
      ]
    },
    layanan: {
      pengajuanSurat: {
        judul: "Pengajuan Surat Online",
        deskripsi: "Ajukan permohonan surat keterangan secara online tanpa harus datang ke kantor desa.",
        jenisSurat: "Surat Keterangan Domisili, Surat Keterangan Usaha, Surat Keterangan Tidak Mampu, Surat Pengantar SKCK, Surat Keterangan Kelahiran, Surat Keterangan Kematian, Surat Rekomendasi",
        syarat: "KTP, Kartu Keluarga, dan dokumen pendukung sesuai jenis surat.",
        emailTujuan: "desa@email.com"
      },
      dataKependudukan: {
        judul: "Data Kependudukan Desa",
        deskripsi: "Statistik dan data kependudukan Desa Pekon Banjar Agung per tahun 2026.",
        totalPenduduk: "4.850",
        kk: "1.350",
        laki: "2.480",
        perempuan: "2.370",
        kelompokUmur: [
          { kelompok: "0 - 5 Tahun", jumlah: "420" },
          { kelompok: "6 - 12 Tahun", jumlah: "650" },
          { kelompok: "13 - 17 Tahun", jumlah: "580" },
          { kelompok: "18 - 25 Tahun", jumlah: "720" },
          { kelompok: "26 - 45 Tahun", jumlah: "1.450" },
          { kelompok: "46 - 60 Tahun", jumlah: "680" },
          { kelompok: "> 60 Tahun", jumlah: "350" }
        ],
        pendidikan: [
          { tingkat: "Belum/Tidak Sekolah", jumlah: "300" },
          { tingkat: "SD/Sederajat", jumlah: "1.200" },
          { tingkat: "SMP/Sederajat", jumlah: "1.050" },
          { tingkat: "SMA/Sederajat", jumlah: "1.500" },
          { tingkat: "Diploma/Sarjana", jumlah: "800" }
        ]
      },
      jadwalPosyandu: {
        judul: "Jadwal Posyandu",
        deskripsi: "Informasi jadwal posyandu balita, lansia, dan kegiatan kesehatan di desa.",
        layanan: [
          "Penimbangan dan pemantauan tumbuh kembang balita",
          "Imunisasi dasar lengkap",
          "Pemberian vitamin A dan tablet tambah darah",
          "Pemeriksaan kesehatan lansia",
          "Penyuluhan gizi dan kesehatan keluarga"
        ],
        balita: [
          { nama: "Posyandu Melati", lokasi: "Balai Desa", jadwal: "Setiap Kamis", waktu: "08.00 - 11.00", tanggalNext: "" },
          { nama: "Posyandu Mawar", lokasi: "Dusun Krajan", jadwal: "Setiap Jumat", waktu: "08.00 - 11.00", tanggalNext: "" },
          { nama: "Posyandu Kenanga", lokasi: "Dusun Pasar", jadwal: "Setiap Sabtu", waktu: "08.00 - 11.00", tanggalNext: "" }
        ],
        lansia: [
          { nama: "Posyandu Lansia Sehat", lokasi: "Balai Desa", jadwal: "Tanggal 15 setiap bulan", waktu: "08.00 - 11.00", tanggalNext: "" },
          { nama: "Posyandu Lansia Bahagia", lokasi: "Dusun Krajan", jadwal: "Tanggal 25 setiap bulan", waktu: "08.00 - 11.00", tanggalNext: "" }
        ]
      },
      arsipPerdes: {
        judul: "Arsip Peraturan Desa (Perdes)",
        deskripsi: "Akses dokumen dan arsip peraturan desa secara digital untuk transparansi informasi.",
        perdes: [
          { no: "1", peraturan: "Perdes No. 1", tahun: "2026", tentang: "APBDes Tahun Anggaran 2026" },
          { no: "2", peraturan: "Perdes No. 2", tahun: "2026", tentang: "Rencana Pembangunan Jangka Menengah Desa" },
          { no: "3", peraturan: "Perdes No. 3", tahun: "2026", tentang: "Retribusi dan Pendapatan Desa" },
          { no: "4", peraturan: "Perdes No. 4", tahun: "2026", tentang: "Badan Usaha Milik Desa (BUMDes)" }
        ],
        perkades: [
          { no: "1", peraturan: "Perkades No. 1", tahun: "2026", tentang: "Penjabaran APBDes" },
          { no: "2", peraturan: "Perkades No. 2", tahun: "2026", tentang: "Struktur Organisasi dan Tata Kerja Pemerintah Desa" },
          { no: "3", peraturan: "Perkades No. 3", tahun: "2026", tentang: "Pengelolaan Keuangan Desa" }
        ]
      }
    },
    potensi: {
      umkm: {
        judul: "UMKM & Produk Unggulan",
        deskripsi: "Produk lokal berkualitas dari warga desa yang menjadi kebanggaan dan penggerak ekonomi desa.",
        items: [
          { nama: "Beras Organik", deskripsi: "Beras organik hasil pertanian warga desa.", foto: "" },
          { nama: "Kopi Bubuk", deskripsi: "Kopi bubuk lokal dengan cita rasa khas.", foto: "" },
          { nama: "Madu Hutan", deskripsi: "Madu murni dari hutan desa.", foto: "" }
        ]
      },
      wisata: {
        judul: "Wisata Alam & Budaya",
        deskripsi: "Keindahan alam dan kekayaan tradisi budaya yang dimiliki desa.",
        items: [
          { nama: "Pesona Alam Persawahan", deskripsi: "Hamparan sawah hijau yang memukau.", foto: "" },
          { nama: "Tradisi Budaya Lampung", deskripsi: "Tarian, musik, dan adat khas Lampung.", foto: "" },
          { nama: "Agrowisata", deskripsi: "Kunjungan edukatif ke kebun warga.", foto: "" }
        ]
      },
      kegiatan: {
        judul: "Kegiatan Masyarakat",
        deskripsi: "Berbagai kegiatan sosial, budaya, dan kemasyarakatan di desa.",
        items: [
          { nama: "Senam Bersama", deskripsi: "Senam pagi bersama warga setiap minggu.", foto: "" },
          { nama: "Gotong Royong", deskripsi: "Kegiatan membersihkan lingkungan desa.", foto: "" },
          { nama: "Belajar Mengajar TPQ", deskripsi: "Pendidikan agama untuk anak-anak.", foto: "" }
        ]
      }
    },
    pengajuan: [],
    users: [],
    komentar: []
  };
}

function deepMerge(base, extra) {
  const out = { ...base };
  for (const key of Object.keys(extra)) {
    if (extra[key] && typeof extra[key] === 'object' && !Array.isArray(extra[key]) && !Array.isArray(base[key]) && base[key] && typeof base[key] === 'object') {
      out[key] = deepMerge(base[key], extra[key]);
    } else {
      out[key] = extra[key];
    }
  }
  return out;
}

const DB_FILE = path.join(DATA_DIR, 'data.db');
const USE_SQLITE = process.env.USE_SQLITE === '1';

function readJsonFileSafe(file) {
  try {
    return fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
  } catch (e) { return null; }
}

function saveDataToFile(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    logger && logger.warn && logger.warn('Failed to write DATA_FILE: ' + (e.message || e));
  }
}

function loadData() {
  // If SQLite mode, try to use better-sqlite3 for reliability
  if (USE_SQLITE) {
    try {
      if (!Database) Database = require('better-sqlite3');
      const db = new Database(DB_FILE);
      db.prepare('CREATE TABLE IF NOT EXISTS app (id INTEGER PRIMARY KEY, data TEXT)').run();
      const row = db.prepare('SELECT data FROM app WHERE id = 1').get();
      if (row && row.data) {
        const parsed = JSON.parse(row.data);
        const merged = deepMerge(defaultData(), parsed);
        // keep JSON file in sync
        try { saveDataToFile(merged); } catch (e) { /* ignore */ }
        db.close();
        return merged;
      }
      db.close();
    } catch (err) {
      logger && logger.warn && logger.warn('Failed to load data from SQLite DB (better-sqlite3). Falling back to JSON file. Error: ' + (err.message || err));
    }
  }

  // Fallback to JSON file
  if (!fs.existsSync(DATA_FILE)) {
    if (fs.existsSync(BUNDLED_DATA_FILE)) {
      try {
        const raw = readJsonFileSafe(BUNDLED_DATA_FILE) || '';
        const parsed = raw ? JSON.parse(raw) : {};
        const merged = deepMerge(defaultData(), parsed);
        saveDataToFile(merged);
        return merged;
      } catch (e) { /* ignore */ }
    }
    saveDataToFile(defaultData());
    return defaultData();
  }
  try {
    const raw = readJsonFileSafe(DATA_FILE) || '';
    const parsed = raw ? JSON.parse(raw) : {};
    const merged = deepMerge(defaultData(), parsed);
    // ensure file is up-to-date
    saveDataToFile(merged);
    return merged;
  } catch (e) {
    logger && logger.error && logger.error('Failed to load data JSON, using defaults: ' + (e.message || e));
    return defaultData();
  }
}

function saveData(data) {
  // always write JSON file
  try { saveDataToFile(data); } catch (e) { /* ignore */ }

  // if sqlite is enabled, also update DB via better-sqlite3
  if (USE_SQLITE) {
    try {
      if (!Database) Database = require('better-sqlite3');
      const db = new Database(DB_FILE);
      db.prepare('CREATE TABLE IF NOT EXISTS app (id INTEGER PRIMARY KEY, data TEXT)').run();
      const json = JSON.stringify(data);
      db.prepare('INSERT OR REPLACE INTO app (id, data) VALUES (1, ?)').run(json);
      db.close();
    } catch (err) {
      logger && logger.warn && logger.warn('Failed to save data to SQLite DB (better-sqlite3). Data saved to JSON file only. Error: ' + (err.message || err));
    }
  }
}

const ADMIN_USER = 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || 'd89b69b7348aa9e97b4741286a06df31:129f5b477ad5224ce0566cffa2ea50fea98f64d48ed14355802c16f5ccd7d237003d170889fc74af94f3432414f7c8499745a826b67e924f581759a7655ec8b7';
const ADMIN_SESSION_TTL = 8 * 60 * 60 * 1000;
const adminSessions = new Map();
const loginAttempts = new Map();

function verifyPassword(password) {
  // If a plain ADMIN_PASSWORD env is provided (convenience for setup), accept it directly.
  // For production, prefer setting ADMIN_PASSWORD_HASH instead.
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
  const expiresAt = adminSessions.get(token);
  if (!token || !expiresAt || expiresAt < Date.now()) {
    if (token) adminSessions.delete(token);
    return res.status(401).json({ success: false, message: 'Sesi admin tidak valid atau telah berakhir.' });
  }
  next();
}

// Healthcheck and readiness endpoints
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));
app.get('/ready', (req, res) => {
  try {
    // quick read to ensure data file/DB accessible
    loadData();
    res.json({ ready: true });
  } catch (e) {
    res.status(500).json({ ready: false, error: (e.message || e) });
  }
});

app.get('/api/data', (req, res) => {
  res.json(loadData());
});

app.post('/api/admin/login', (req, res) => {
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
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, Date.now() + ADMIN_SESSION_TTL);
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, token, expiresIn: ADMIN_SESSION_TTL });
});

app.use('/api/admin', requireAdmin);

app.post('/api/admin/profil', (req, res) => {
  const data = loadData();
  data.profil = { ...data.profil, ...req.body };
  saveData(data);
  res.json({ success: true, data: data.profil });
});

app.post('/api/admin/pemerintahan', (req, res) => {
  const data = loadData();
  data.pemerintahan = { ...data.pemerintahan, ...req.body };
  saveData(data);
  res.json({ success: true, data: data.pemerintahan });
});

app.post('/api/admin/kontak', (req, res) => {
  const data = loadData();
  data.kontak = { ...data.kontak, ...req.body };
  saveData(data);
  res.json({ success: true, data: data.kontak });
});

app.post('/api/admin/upload', upload.single('foto'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });
  }
  try {
    const filename = req.file.filename;
    const localPath = req.file.path;

    // Validate Magic Bytes and scan for webshell payloads
    validateFileBuffer(localPath);

    // If S3 configured, upload and remove local copy
    if (s3) {
      const key = `uploads/${filename}`;
      const params = { Bucket: process.env.AWS_S3_BUCKET, Key: key, Body: fs.createReadStream(localPath), ContentType: req.file.mimetype, ACL: process.env.AWS_S3_ACL || 'public-read' };
      await s3.upload(params).promise();
      // delete local
      try { fs.unlinkSync(localPath); } catch (e) { /* ignore */ }
      const s3url = process.env.S3_BASE_URL || `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
      const url = process.env.PUBLIC_URL && process.env.PUBLIC_URL.includes('s3') ? `${process.env.PUBLIC_URL}/uploads/${filename}` : s3url;
      return res.json({ success: true, url });
    }

    const url = '/uploads/' + filename;
    res.json({ success: true, url });
  } catch (err) {
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    logger && logger.error && logger.error('Upload failed: ' + (err.message || err));
    res.status(400).json({ success: false, message: err.message || 'Gagal mengupload file' });
  }
});

app.post('/api/admin/upload-multiple', upload.array('foto', 20), async (req, res) => {
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

      if (s3) {
        const key = `uploads/${filename}`;
        const params = { Bucket: process.env.AWS_S3_BUCKET, Key: key, Body: fs.createReadStream(localPath), ContentType: f.mimetype, ACL: process.env.AWS_S3_ACL || 'public-read' };
        await s3.upload(params).promise();
        try { fs.unlinkSync(localPath); } catch (e) { /* ignore */ }
        const s3url = process.env.S3_BASE_URL || `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
        urls.push(process.env.PUBLIC_URL && process.env.PUBLIC_URL.includes('s3') ? `${process.env.PUBLIC_URL}/uploads/${filename}` : s3url);
      } else {
        urls.push('/uploads/' + filename);
      }
    }
    res.json({ success: true, urls });
  } catch (err) {
    if (req.files) {
      for (const f of req.files) {
        try { if (f.path) fs.unlinkSync(f.path); } catch (e) {}
      }
    }
    logger && logger.error && logger.error('Multi upload failed: ' + (err.message || err));
    res.status(400).json({ success: false, message: err.message || 'Gagal mengupload file' });
  }
});

app.post('/api/admin/berita', (req, res) => {
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

app.delete('/api/admin/berita/:id', (req, res) => {
  const data = loadData();
  data.berita = (data.berita || []).filter(b => String(b.id) !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.post('/api/admin/pengumuman', (req, res) => {
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

  const judul = newItem.judul;
  sendPushToAll({
    title: '📢 Pengumuman Baru',
    body: judul,
    icon: `${PUBLIC_URL}/uploads/logo.png`,
    url: `${PUBLIC_URL}/pengumuman-detail.html?id=${newItem.id}`
  });
});

app.delete('/api/admin/pengumuman/:id', (req, res) => {
  const data = loadData();
  data.pengumuman = (data.pengumuman || []).filter(p => String(p.id) !== req.params.id);
  data.komentar = (data.komentar || []).filter(k => String(k.pengumumanId) !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.post('/api/admin/galeri', (req, res) => {
  const data = loadData();
  data.galeri = data.galeri || [];
  const urls = req.body.urls || (req.body.url ? [req.body.url] : []);
  if (urls.length) {
    data.galeri.push(...urls);
    saveData(data);
  }
  res.json({ success: true, data: data.galeri });
});

app.delete('/api/admin/galeri/:index', (req, res) => {
  const data = loadData();
  const idx = parseInt(req.params.index, 10);
  data.galeri = (data.galeri || []).filter((_, i) => i !== idx);
  saveData(data);
  res.json({ success: true, data: data.galeri });
});

app.post('/api/admin/galeri-category', (req, res) => {
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

app.delete('/api/admin/galeri-category/:category/:index', (req, res) => {
  const data = loadData();
  const category = req.params.category;
  const idx = parseInt(req.params.index, 10);
  if (data.galeri && data.galeri[category]) {
    data.galeri[category] = data.galeri[category].filter((_, i) => i !== idx);
    saveData(data);
  }
  res.json({ success: true, data: data.galeri });
});

app.post('/api/admin/layanan', (req, res) => {
  const data = loadData();
  data.layanan = { ...data.layanan, ...req.body };
  saveData(data);
  res.json({ success: true, data: data.layanan });
});

app.post('/api/admin/potensi', (req, res) => {
  const data = loadData();
  data.potensi = { ...data.potensi, ...req.body };
  saveData(data);
  res.json({ success: true, data: data.potensi });
});

app.post('/api/pengajuan', publicFormLimiter, checkHoneypot, (req, res) => {
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

app.get('/api/admin/pengajuan', (req, res) => {
  const data = loadData();
  res.json({ success: true, data: data.pengajuan || [] });
});

app.post('/api/keluhan', publicFormLimiter, upload.single('bukti'), checkHoneypot, (req, res) => {
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

app.get('/api/admin/keluhan', (req, res) => {
  const data = loadData();
  res.json({ success: true, data: data.keluhan || [] });
});

app.delete('/api/admin/keluhan/:id', (req, res) => {
  const data = loadData();
  data.keluhan = (data.keluhan || []).filter(p => String(p.id) !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.delete('/api/admin/pengajuan/:id', (req, res) => {
  const data = loadData();
  data.pengajuan = (data.pengajuan || []).filter(p => String(p.id) !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

app.put('/api/admin/pengumuman/:id', (req, res) => {
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

app.get('/api/pengumuman/:id', (req, res) => {
  const data = loadData();
  const item = (data.pengumuman || []).find(p => String(p.id) === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Pengumuman tidak ditemukan' });
  }
  res.json({ success: true, data: item });
});

app.get('/api/pengumuman/:id/komentar', (req, res) => {
  const data = loadData();
  const komentar = (data.komentar || []).filter(k => String(k.pengumumanId) === req.params.id);
  res.json({ success: true, data: komentar });
});

app.post('/api/pengumuman/:id/komentar', (req, res) => {
  const data = loadData();
  const { nama, isi } = req.body || {};
  if (!nama || !isi) {
    return res.status(400).json({ success: false, message: 'Nama dan isi komentar wajib diisi' });
  }
  const newKomentar = {
    id: Date.now(),
    pengumumanId: req.params.id,
    nama,
    isi,
    tanggal: new Date().toLocaleString('id-ID')
  };
  data.komentar = data.komentar || [];
  data.komentar.unshift(newKomentar);
  saveData(data);
  res.json({ success: true, data: newKomentar });
});

app.get('/api/admin/komentar', (req, res) => {
  const data = loadData();
  const komentar = (data.komentar || []).map(k => {
    const peng = (data.pengumuman || []).find(p => String(p.id) === String(k.pengumumanId));
    return { ...k, judulPengumuman: peng ? peng.judul : '(Pengumuman dihapus)' };
  });
  res.json({ success: true, data: komentar });
});

app.delete('/api/admin/komentar/:id', (req, res) => {
  const data = loadData();
  data.komentar = (data.komentar || []).filter(k => String(k.id) !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

// Configure AWS S3 (optional)
let s3 = null;
if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  AWS.config.update({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, region: process.env.AWS_REGION || 'us-east-1' });
  s3 = new AWS.S3();
}

// Setup logger (winston)
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level.toUpperCase()}: ${message}`)
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const VAPID_FILE = path.join(DATA_DIR, 'vapid.json');
const PUSH_FILE = path.join(DATA_DIR, 'push-data.json');

function generateVapidKeys() {
  const keys = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2));
  return keys;
}

function loadVapidKeys() {
  if (fs.existsSync(VAPID_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
    } catch (e) { /* fallthrough */ }
  }
  return generateVapidKeys();
}

const vapidKeys = loadVapidKeys();
webpush.setVapidDetails(
  'mailto:admin@pekonbanjaragung.example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

function loadPushData() {
  if (fs.existsSync(PUSH_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PUSH_FILE, 'utf-8'));
    } catch (e) { /* fallthrough */ }
  }
  return { subscriptions: [] };
}

function savePushData(pushData) {
  fs.writeFileSync(PUSH_FILE, JSON.stringify(pushData, null, 2));
}

app.get('/api/push/vapidPublicKey', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/api/push/subscribe', (req, res) => {
  const subscription = req.body.subscription;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, message: 'Data subscription tidak valid' });
  }
  const pushData = loadPushData();
  const exists = pushData.subscriptions.some(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    pushData.subscriptions.push(subscription);
    savePushData(pushData);
  }
  res.json({ success: true });
});

app.post('/api/push/unsubscribe', (req, res) => {
  const endpoint = req.body.endpoint;
  if (!endpoint) return res.status(400).json({ success: false, message: 'Endpoint tidak valid' });
  const pushData = loadPushData();
  pushData.subscriptions = pushData.subscriptions.filter(s => s.endpoint !== endpoint);
  savePushData(pushData);
  res.json({ success: true });
});

async function sendPushToAll(payload) {
  const pushData = loadPushData();
  const subs = pushData.subscriptions || [];
  if (!subs.length) return;

  const data = JSON.stringify(payload);
  const validSubs = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, data);
      validSubs.push(sub);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
      }
    }
  }

  const finalValid = [];
  for (const sub of subs) {
    try {
      const ok = validSubs.some(v => v.endpoint === sub.endpoint);
      if (ok) finalValid.push(sub);
    } catch (e) { /* noop */ }
  }
  pushData.subscriptions = finalValid;
  savePushData(pushData);
}

function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysStr(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

let sentPosyanduReminders = [];

function checkPosyanduReminders() {
  try {
    const data = loadData();
    const jp = data.layanan?.jadwalPosyandu || {};
    const all = [
      ...(jp.balita || []).map(i => ({ ...i, jenis: 'Posyandu Balita' })),
      ...(jp.lansia || []).map(i => ({ ...i, jenis: 'Posyandu Lansia' }))
    ];
    const todayStr = getTodayStr();

    all.forEach(item => {
      if (!item.tanggalNext) return;
      const next = String(item.tanggalNext).slice(0, 10);
      const reminderDay = addDaysStr(next, -1);
      const key = item.nama + '|' + next;
      if (reminderDay === todayStr && !sentPosyanduReminders.includes(key)) {
        sentPosyanduReminders.push(key);
        sendPushToAll({
          title: '📅 Pengingat Posyandu Besok',
          body: `${item.jenis}: ${item.nama} (${item.lokasi}) besok ${next}. Waktu: ${item.waktu || '-'}`,
          icon: `${PUBLIC_URL}/uploads/logo.png`,
          url: `${PUBLIC_URL}/jadwal-posyandu.html`
        });
      }
    });
  } catch (e) {
    console.error('Error checkPosyanduReminders:', e.message);
  }
}

// Error handling middleware for Multer and validation errors (returns HTTP 400 with friendly JSON)
app.use((err, req, res, next) => {
  if (err) {
    logger && logger.warn && logger.warn('Request error: ' + (err.message || err));
    return res.status(400).json({ success: false, message: err.message || 'Terjadi kesalahan pada request' });
  }
  next();
});

if (!process.env.VERCEL) {
  setInterval(checkPosyanduReminders, 60 * 60 * 1000);
  checkPosyanduReminders();
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    logger.info(`Server berjalan di http://localhost:${PORT}`);
    logger.info('Web Push notifications siap.');
  });

  // Graceful shutdown
  function shutdown() {
    logger.info('Shutting down...');
    try {
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      // force exit after 10s
      setTimeout(() => process.exit(1), 10000);
    } catch (e) {
      logger.error('Error during shutdown: ' + (e.message || e));
      process.exit(1);
    }
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

app._resetLoginAttempts = () => loginAttempts.clear();

module.exports = app;
