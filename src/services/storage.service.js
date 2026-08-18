// src/services/storage.service.js
const fs = require('fs');
const path = require('path');
const {
  DATA_DIR,
  DATA_FILE,
  BUNDLED_DATA_FILE,
  DB_FILE,
  USE_SQLITE
} = require('../config/constants');

const { isBlobAvailable, putJsonToBlob, fetchBlobText } = require('./blob.service');

const BLOB_DATA_KEY = 'data.json';

let Database = null; // Loaded lazily if SQLite is enabled

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
    komentar: [],
    keluhan: []
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

function readJsonFileSafe(file) {
  try {
    return fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
  } catch (e) {
    return null;
  }
}

function saveDataToFile(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn('Failed to write DATA_FILE: ' + (e.message || e));
  }
}

// ===== Migrasi data lama =====
// Potensi pernah tersimpan di layanan.potensi (misnested) sementara root potensi
// fotonya kosong. Pindahkan foto yang hilang ke root potensi, lalu hapus duplikat.
// Idempoten: setelah dipindah, layanan.potensi dihapus sehingga tidak jalan lagi.
function migrateLegacyPotensi(data) {
  const src = data && data.layanan && data.layanan.potensi;
  const dst = data && data.potensi;
  if (!src || !dst) return false;
  let changed = false;
  for (const cat of ['umkm', 'wisata', 'kegiatan']) {
    const s = src[cat];
    const d = dst[cat];
    if (!s || !d || !Array.isArray(s.items) || !Array.isArray(d.items)) continue;
    s.items.forEach((si, i) => {
      const di = d.items[i];
      if (di && si.foto && !di.foto) {
        di.foto = si.foto;
        changed = true;
      }
    });
  }
  if (changed) delete data.layanan.potensi;
  return changed;
}

// Link share "maps.app.goo.gl/..." tidak bisa ditampilkan di iframe (google.com
// refused to connect). Konversi ke URL embed maps.google.com dengan koordinat
// yang sudah di-resolve (Kantor Pekon Banjar Agung). Idempoten.
function migrateLegacyMapsUrl(data) {
  const mapsUrl = data && data.kontak && data.kontak.mapsUrl;
  if (mapsUrl && mapsUrl.includes('maps.app.goo.gl')) {
    data.kontak.mapsUrl = 'https://maps.google.com/maps?q=-5.3973289,104.7597588&z=16&output=embed';
    return true;
  }
  return false;
}

function loadData() {
  if (USE_SQLITE) {
    try {
      if (!Database) Database = require('better-sqlite3');
      const db = new Database(DB_FILE);
      db.prepare('CREATE TABLE IF NOT EXISTS app (id INTEGER PRIMARY KEY, data TEXT)').run();
      const row = db.prepare('SELECT data FROM app WHERE id = 1').get();
      if (row && row.data) {
        const parsed = JSON.parse(row.data);
        const merged = deepMerge(defaultData(), parsed);
        try { saveDataToFile(merged); } catch (e) {}
        db.close();
        return merged;
      }
      db.close();
    } catch (err) {
      console.warn('Failed to load data from SQLite DB. Falling back to JSON file: ' + (err.message || err));
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
      } catch (e) {}
    }
    saveDataToFile(defaultData());
    return defaultData();
  }

  try {
    const raw = readJsonFileSafe(DATA_FILE) || '';
    const parsed = raw ? JSON.parse(raw) : {};
    const merged = deepMerge(defaultData(), parsed);
    if (migrateLegacyPotensi(merged)) saveDataToFile(merged);
    if (migrateLegacyMapsUrl(merged)) saveDataToFile(merged);
    saveDataToFile(merged);
    return merged;
  } catch (e) {
    console.error('Failed to load data JSON, using defaults: ' + (e.message || e));
    return defaultData();
  }
}

async function saveData(data) {
  try { saveDataToFile(data); } catch (e) {}

  if (isBlobAvailable()) {
    // WAJIB await: di Vercel serverless, promise fire-and-forget bisa dibekukan
    // sebelum fetch keluar (gejala: log "No outgoing requests", perubahan hilang).
    await putJsonToBlob(BLOB_DATA_KEY, JSON.stringify(data));
  }

  if (USE_SQLITE) {
    try {
      if (!Database) Database = require('better-sqlite3');
      const db = new Database(DB_FILE);
      db.prepare('CREATE TABLE IF NOT EXISTS app (id INTEGER PRIMARY KEY, data TEXT)').run();
      const json = JSON.stringify(data);
      db.prepare('INSERT OR REPLACE INTO app (id, data) VALUES (1, ?)').run(json);
      db.close();
    } catch (err) {
      console.warn('Failed to save data to SQLite DB: ' + (err.message || err));
    }
  }
}

function isSeedTemplate(data) {
  const kd = data && data.pemerintahan && data.pemerintahan.kepalaDesa;
  const foto = (kd && kd.foto) || '';
  const logo = (data && data.profil && (data.profil.logo || data.profil.heroFoto)) || '';
  return !!(kd &&
    (kd.nama === '[Nama Kepala Desa]' ||
     foto.includes('randomuser.me') ||
     logo.includes('images.unsplash.com')));
}

function loadBundledData() {
  try {
    if (fs.existsSync(BUNDLED_DATA_FILE)) {
      const raw = readJsonFileSafe(BUNDLED_DATA_FILE) || '';
      const parsed = raw ? JSON.parse(raw) : {};
      return deepMerge(defaultData(), parsed);
    }
  } catch (e) {}
  return null;
}

async function syncDataFromBlob() {
  if (!isBlobAvailable()) return false;
  try {
    const res = await fetchBlobText(BLOB_DATA_KEY);
    if (!res.ok) {
      // Network/API error — blob MUNGKIN berisi data terbaru user.
      // JANGAN menimpa dengan data statis (itulah penyebab update "hilang").
      console.warn('[Blob] Fetch gagal — blob TIDAK ditimpa, data di blob tetap aman');
      return false;
    }
    if (res.text) {
      const parsed = JSON.parse(res.text);
      const merged = deepMerge(defaultData(), parsed);
      if (migrateLegacyPotensi(merged)) {
        saveDataToFile(merged);
        const url = await putJsonToBlob(BLOB_DATA_KEY, JSON.stringify(merged));
        console.log(url
          ? '[Blob] Migrasi potensi selesai — data terbaru disimpan kembali ke blob'
          : '[Blob] Migrasi potensi gagal disimpan ke blob');
      } else {
        saveDataToFile(merged);
      }
      if (migrateLegacyMapsUrl(merged)) {
        saveDataToFile(merged);
        const url = await putJsonToBlob(BLOB_DATA_KEY, JSON.stringify(merged));
        console.log(url
          ? '[Blob] Migrasi mapsUrl selesai — URL embed disimpan kembali ke blob'
          : '[Blob] Migrasi mapsUrl gagal disimpan ke blob');
      } else {
        saveDataToFile(merged);
      }
      console.log('[Blob] Data berhasil dimuat dari Vercel Blob');
      if (isSeedTemplate(merged)) {
        const real = loadBundledData();
        if (real) {
          saveDataToFile(real);
          const url = await putJsonToBlob(BLOB_DATA_KEY, JSON.stringify(real));
          console.log(url
            ? '[Blob] Template terdeteksi — data asli dipulihkan ke blob'
            : '[Blob] Template terdeteksi tapi gagal restore');
        }
      }
      return true;
    }
    // Blob benar-benar 404 (belum pernah dibuat) — baru boleh seed pertama.
    const current = loadData();
    const url = await putJsonToBlob(BLOB_DATA_KEY, JSON.stringify(current));
    if (url) {
      console.log('[Blob] Data seed pertama berhasil disimpan ke Vercel Blob');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Blob] Gagal sinkronisasi data dari Vercel Blob: ' + (err.message || err));
    return false;
  }
}

module.exports = {
  defaultData,
  deepMerge,
  migrateLegacyPotensi,
  migrateLegacyMapsUrl,
  readJsonFileSafe,
  loadData,
  saveData,
  syncDataFromBlob
};
