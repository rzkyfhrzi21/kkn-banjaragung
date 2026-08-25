// ===== Admin Panel Logic =====
const API_BASE = '';

let lastUploadError = '';

// Tambahkan token sesi ke setiap permintaan yang mengubah data admin.
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  const token = sessionStorage.getItem('adminToken');
  if (token && url.includes('/api/admin/') && !url.endsWith('/api/admin/login')) {
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', 'Bearer ' + token);
    return nativeFetch(input, { ...init, headers });
  }
  return nativeFetch(input, init);
};

const loginGate = document.getElementById('login-gate');
const dashboard = document.getElementById('dashboard');
const adminLoginForm = document.getElementById('admin-login-form');
const adminLoginError = document.getElementById('admin-login-error');
const logoutBtn = document.getElementById('logout-btn');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

async function checkSession() {
  const authed = sessionStorage.getItem('adminAuth') === 'true' && !!sessionStorage.getItem('adminToken');
  if (authed) {
    try {
      const res = await fetch(API_BASE + '/api/admin/check-session');
      if (res.ok) {
        loginGate.classList.add('hidden');
        dashboard.classList.remove('hidden');
        loadAllData();
        restoreTab();
        return;
      }
    } catch (err) {}
    sessionStorage.removeItem('adminAuth');
    sessionStorage.removeItem('adminToken');
  }
  loginGate.classList.remove('hidden');
  dashboard.classList.add('hidden');
}

adminLoginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('admin-username').value.trim();
  const password = document.getElementById('admin-password').value.trim();

  try {
    const res = await fetch(API_BASE + '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    let data = { success: false };
    try { data = await res.json(); } catch (e) {}
    if (data.success) {
      sessionStorage.setItem('adminAuth', 'true');
      sessionStorage.setItem('adminToken', data.token);
      adminLoginError.classList.add('hidden');
      loginGate.classList.add('hidden');
      dashboard.classList.remove('hidden');
      loadAllData();
      restoreTab();
    } else {
      adminLoginError.textContent = data.message || 'Login gagal';
      adminLoginError.classList.remove('hidden');
    }
  } catch (err) {
    adminLoginError.textContent = 'Terjadi kesalahan jaringan. Pastikan server berjalan dan koneksi stabil.';
    adminLoginError.classList.remove('hidden');
  }
});

logoutBtn?.addEventListener('click', () => {
  sessionStorage.removeItem('adminAuth');
  sessionStorage.removeItem('adminToken');
  location.reload();
});

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    localStorage.setItem('adminActiveTab', target);
    tabBtns.forEach(b => {
      b.classList.remove('bg-green-700', 'text-white');
      b.classList.add('bg-gray-200', 'text-gray-700');
    });
    btn.classList.remove('bg-gray-200', 'text-gray-700');
    btn.classList.add('bg-green-700', 'text-white');
    tabPanels.forEach(p => p.classList.add('hidden'));
    document.getElementById('tab-' + target).classList.remove('hidden');
  });
});

// Kembalikan ke tab terakhir yang aktif (disimpan sebelum reload)
function restoreTab() {
  const saved = localStorage.getItem('adminActiveTab');
  const btn = saved && document.querySelector('.tab-btn[data-tab="' + saved + '"]');
  if (btn) btn.click();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function adminToast(message, type = 'success', title = '', duration = 2000) {
  let container = document.getElementById('pekon-toast-container') || document.getElementById('admin-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'admin-toast-container';
    document.body.appendChild(container);
  }

  const normalizedType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
  const defaultTitles = {
    success: 'Aksi Berhasil',
    error: 'Gagal Menyimpan',
    warning: 'Peringatan',
    info: 'Informasi'
  };
  const toastTitle = title || defaultTitles[normalizedType];

  const icons = {
    success: `<svg class="w-5 h-5 flex-shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>`,
    error: `<svg class="w-5 h-5 flex-shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>`,
    warning: `<svg class="w-5 h-5 flex-shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
    info: `<svg class="w-5 h-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
  };

  const toast = document.createElement('div');
  toast.className = `pekon-toast toast-${normalizedType}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="toast-icon-box">${icons[normalizedType]}</div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(toastTitle)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button type="button" class="toast-close" aria-label="Tutup">&times;</button>
    <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  let timer;

  const dismiss = () => {
    if (timer) clearTimeout(timer);
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 350);
  };

  closeBtn.addEventListener('click', dismiss);
  container.prepend(toast);

  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });

  if (normalizedType === 'error') {
    // Standar: toast error DILARANG auto-dismiss — wajib ditutup manual via tombol ×
    const progress = toast.querySelector('.toast-progress');
    if (progress) progress.style.display = 'none';
  } else {
    timer = setTimeout(dismiss, duration);
  }
}

// ===== Simpan progress (spinner % di pojok kanan atas, tempat toast) =====
let _saveProgTimer = null;

function showSaveProgress() {
  hideSaveProgress();
  let container = document.getElementById('pekon-toast-container') || document.getElementById('admin-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'admin-toast-container';
    document.body.appendChild(container);
  }
  let el = document.getElementById('admin-save-progress');
  if (!el) {
    el = document.createElement('div');
    el.id = 'admin-save-progress';
    el.innerHTML =
      '<div class="asp-label">Menyimpan data <span class="asp-pct">0%</span></div>' +
      '<div class="asp-track"><div class="asp-bar"></div></div>';
    container.appendChild(el);
  }
  el.classList.add('asp-show');
  updateSaveProgress(2);
  _saveProgTimer = setInterval(() => {
    const cur = document.getElementById('admin-save-progress');
    if (!cur) return;
    let pct = parseInt((cur.querySelector('.asp-pct') || { textContent: '0' }).textContent || '0', 10) || 0;
    if (pct < 90) {
      pct += Math.random() < 0.35 ? 8 : 3;
      if (pct > 90) pct = 90;
      updateSaveProgress(pct);
    }
  }, 250);
}

function updateSaveProgress(pct) {
  const el = document.getElementById('admin-save-progress');
  if (!el) return;
  const bar = el.querySelector('.asp-bar');
  const label = el.querySelector('.asp-pct');
  if (bar) bar.style.width = pct + '%';
  if (label) label.textContent = pct + '%';
}

function hideSaveProgress() {
  if (_saveProgTimer) { clearInterval(_saveProgTimer); _saveProgTimer = null; }
  const el = document.getElementById('admin-save-progress');
  if (el) el.classList.remove('asp-show');
}

// Sukses: tuntaskan ke 100%, lalu reload (tab terakhir otomatis dipulihkan restoreTab)
function finishSaveProgressAndReload(delayMs = 900) {
  if (_saveProgTimer) { clearInterval(_saveProgTimer); _saveProgTimer = null; }
  updateSaveProgress(100);
  setTimeout(() => {
    hideSaveProgress();
    location.reload();
  }, delayMs);
}

function validateFileClient(file) {
  if (!file) return { valid: false, message: 'Tidak ada berkas yang dipilih.' };
  if (file.size === 0) return { valid: false, message: 'Berkas kosong (0 bytes).' };
  if (file.size > 4 * 1024 * 1024) return { valid: false, message: 'Ukuran foto terlalu besar! Maksimal 4MB.' };

  const rawName = (file.name || '').toLowerCase();
  const dangerousPatterns = /\.(php|phtml|phar|inc|sh|bash|exe|cgi|pl|jsp|asp|aspx|htaccess|py|rb|svg)/i;
  const nameWithoutLastExt = rawName.substring(0, rawName.lastIndexOf('.'));
  if (dangerousPatterns.test(nameWithoutLastExt)) {
    return { valid: false, message: 'Nama berkas mencurigakan (Double Extension terdeteksi).' };
  }

  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.heic', '.heif', '.bmp', '.ico', '.tiff', '.tif'];
  const ext = rawName.substring(rawName.lastIndexOf('.'));
  if (!allowedExts.includes(ext)) {
    return { valid: false, message: 'Format foto tidak didukung. Harus berupa gambar (JPG, PNG, GIF, WEBP, AVIF, HEIC, BMP, ICO, TIFF).' };
  }

  if (file.type && !file.type.startsWith('image/')) {
    return { valid: false, message: 'Tipe berkas bukan gambar valid.' };
  }

  return { valid: true };
}

function clearFileInput(inputId, inputEl) {
  const inp = inputEl || (inputId ? document.getElementById(inputId) : null);
  if (!inp) return;
  inp.value = '';
  const span = inp.closest('.admin-file-input')?.querySelector('.file-name');
  if (span) {
    span.textContent = 'No file chosen';
    span.classList.remove('has-file');
  }
}

// Pastikan URL hasil unggahan benar-benar bisa dimuat browser sebelum dianggap sukses.
// Mencegah kasus "notifikasi berhasil tapi gambar tidak dimuat".
function verifyImageLoads(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    // Format yang kerap tak bisa dirender browser desktop — jangan divalidasi render.
    if (/\.(heic|heif|tiff|tif)$/i.test((url.split('?')[0] || ''))) return resolve(true);
    let done = false;
    const finish = (ok) => { if (!done) { done = true; clearTimeout(t); resolve(ok); } };
    const t = setTimeout(() => finish(false), 15000);
    const img = new Image();
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;
  });
}

function createUploadProgressToast(fileName) {
  let container = document.getElementById('pekon-toast-container') || document.getElementById('admin-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'admin-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'pekon-toast toast-upload';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  const shortName = fileName.length > 24 ? fileName.substring(0, 12) + '...' + fileName.substring(fileName.lastIndexOf('.')) : fileName;

  toast.innerHTML = `
    <div class="toast-icon-box">
      <svg class="w-5 h-5 flex-shrink-0 text-blue-600 toast-spinner" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    <div class="toast-content w-full">
      <div class="toast-title flex items-center justify-between">
        <span>Mengunggah di Background...</span>
        <span class="upload-percent text-xs font-bold text-blue-600">0%</span>
      </div>
      <div class="toast-message text-xs text-gray-500 truncate mb-1">${escapeHtml(shortName)}</div>
      <div class="toast-upload-bar-track">
        <div class="toast-upload-bar-fill"></div>
      </div>
    </div>
    <button type="button" class="toast-close" aria-label="Tutup">&times;</button>
  `;

  const barFill = toast.querySelector('.toast-upload-bar-fill');
  const percentText = toast.querySelector('.upload-percent');
  const titleText = toast.querySelector('.toast-title span');
  const iconBox = toast.querySelector('.toast-icon-box');
  const closeBtn = toast.querySelector('.toast-close');

  const dismiss = () => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 350);
  };
  closeBtn.addEventListener('click', dismiss);

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
  });

  return {
    update(percent) {
      const rounded = Math.min(100, Math.max(0, Math.round(percent)));
      if (barFill) barFill.style.width = rounded + '%';
      if (percentText) percentText.textContent = rounded + '%';
      if (rounded >= 100) {
        if (titleText) titleText.textContent = 'Memproses Berkas...';
      }
    },
    success(message = 'Foto berhasil diunggah! Memperbarui halaman...', autoReload = false) {
      toast.className = 'pekon-toast toast-success';
      if (iconBox) {
        iconBox.innerHTML = `<svg class="w-5 h-5 flex-shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>`;
      }
      if (titleText) titleText.textContent = '✓ Unggah Berkas Berhasil!';
      if (percentText) percentText.textContent = '100%';
      if (barFill) barFill.style.width = '100%';
      const msgEl = toast.querySelector('.toast-message');
      if (msgEl) msgEl.textContent = message;

      if (autoReload) {
        setTimeout(() => {
          location.reload();
        }, 1300);
      } else {
        setTimeout(dismiss, 3500);
      }
    },
    error(message = 'Gagal mengunggah foto.') {
      toast.className = 'pekon-toast toast-error';
      if (iconBox) {
        iconBox.innerHTML = `<svg class="w-5 h-5 flex-shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>`;
      }
      if (titleText) titleText.textContent = 'Unggah Gagal';
      if (percentText) percentText.textContent = 'Gagal';
      const msgEl = toast.querySelector('.toast-message');
      if (msgEl) {
        msgEl.classList.remove('truncate');
        msgEl.textContent = message;
      }
    }
  };
}

function uploadFile(file, options = {}) {
  if (!file) return Promise.resolve(null);
  const check = validateFileClient(file);
  if (!check.valid) {
    lastUploadError = check.message;
    adminToast(check.message, 'error', 'Peringatan Berkas');
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const progressToast = createUploadProgressToast(file.name);
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('foto', file);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        progressToast.update(percent);
      }
    });

    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            const urlOk = await verifyImageLoads(data.url);
            if (!urlOk) {
              lastUploadError = 'Berkas terkirim ke server tetapi gambarnya tidak dapat dimuat. Kemungkinan penyimpanan server bermasalah — coba lagi atau hubungi admin.';
              progressToast.error(lastUploadError);
              resolve(null);
              return;
            }
            lastUploadError = '';
            progressToast.success('Foto berhasil diunggah! Data sedang disimpan...', options.autoReload || false);
            resolve(data.url);
          } else {
            lastUploadError = data.message || 'Gagal mengupload berkas';
            progressToast.error(lastUploadError);
            resolve(null);
          }
        } catch (err) {
          lastUploadError = 'Gagal membaca respon server';
          progressToast.error(lastUploadError);
          resolve(null);
        }
      } else if (xhr.status === 401) {
        lastUploadError = 'Sesi login telah berakhir. Silakan login kembali.';
        progressToast.error(lastUploadError);
        setTimeout(() => checkSession(), 1500);
        resolve(null);
      } else {
        let serverMsg = 'Terjadi kesalahan server (HTTP ' + xhr.status + ')';
        try {
          const parsed = JSON.parse(xhr.responseText);
          if (parsed && parsed.message) {
            serverMsg = 'Ditolak server (HTTP ' + xhr.status + '): ' + parsed.message;
            if (parsed.detail && parsed.detail.file) {
              serverMsg += ' — File: ' + parsed.detail.file + ' (' + Math.round(parsed.detail.size / 1024) + ' KB)';
            }
          }
        } catch (parseErr) {}
        console.error('[Upload] Gagal:', xhr.status, xhr.responseText);
        lastUploadError = serverMsg;
        progressToast.error(serverMsg);
        resolve(null);
      }
    });

    xhr.addEventListener('error', () => {
      const netMsg = 'Gagal terhubung ke server saat upload "' + file.name + '" (' + Math.round(file.size / 1024) + ' KB). Periksa koneksi internet atau coba file yang lebih kecil (maks 4MB).';
      lastUploadError = netMsg;
      console.error('[Upload] Jaringan gagal untuk file:', file.name, 'ukuran:', Math.round(file.size / 1024) + ' KB');
      progressToast.error(netMsg);
      fetch(API_BASE + '/api/admin/check-session')
        .then((r) => {
          if (!r.ok) {
            sessionStorage.removeItem('adminToken');
            sessionStorage.removeItem('adminAuth');
            adminToast('Sesi login telah berakhir. Silakan login kembali.', 'error');
            setTimeout(() => checkSession(), 1200);
          }
        })
        .catch(() => {});
      resolve(null);
    });

    xhr.open('POST', API_BASE + '/api/admin/upload');
    const token = sessionStorage.getItem('adminToken');
    if (token) {
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    }
    xhr.send(formData);
  });
}

async function loadAllData() {
  try {
    const res = await fetch(API_BASE + '/api/data');
    const data = await res.json();
   fillProfil(data.profil);
    fillPemerintahan(data.pemerintahan);
    fillKontak(data.kontak);
   fillPotensi(data.potensi);
   renderPengumuman(data.pengumuman || []);
   renderGaleri(data.galeri || []);
    fillLayanan(data.layanan);
    renderPengajuan();
    renderKeluhan();
    const g = data.galeri || {};
    if (Array.isArray(g)) {
      cachedGaleri = g;
    } else {
      cachedGaleri = [
        ...(g.galeri1 || []),
        ...(g.galeri2 || []),
        ...(g.galeri3 || [])
      ];
    }
 } catch (err) {
    console.error('Gagal memuat data', err);
  }
}

function fillProfil(p) {
  if (!p) return;
  document.getElementById('p-nama').value = p.namaDesa || '';
  document.getElementById('p-kecamatan').value = p.kecamatan || '';
  document.getElementById('p-kabupaten').value = p.kabupaten || '';
  document.getElementById('p-tagline').value = p.tagline || '';
  const panel = p.panelAdmin || {};
  document.getElementById('p-panel-judul').value = panel.judul || 'Admin Panel';
  document.getElementById('p-panel-deskripsi').value = panel.deskripsi || 'Kelola data dan biodata desa';
  document.getElementById('p-panel-ringkasan').value = panel.ringkasan || 'Ringkasan Profil Website';
  if (panel.foto) {
    const panelPreview = document.getElementById('p-panel-foto-preview');
    panelPreview.src = panel.foto;
    panelPreview.dataset.savedUrl = panel.foto;
  }
  document.getElementById('p-deskripsi').value = p.deskripsi || '';
  document.getElementById('p-tentang-judul').value = p.tentangJudul || 'Mengenal Desa Kami';
  document.getElementById('p-komitmen').value = p.komitmen || '';
  document.getElementById('p-visi').value = p.visi || '';
  renderProfilDataSingkat(p.dataSingkat || []);
  renderProfilMisi(p.misi || []);
  if (p.logo) {
    const logoPreview = document.getElementById('p-logo-preview');
    logoPreview.src = p.logo;
    logoPreview.dataset.savedUrl = p.logo;
    document.getElementById('header-logo').src = p.logo;
  }
  if (p.heroFoto) {
    const heroPreview = document.getElementById('p-hero-preview');
    heroPreview.src = p.heroFoto;
    heroPreview.dataset.savedUrl = p.heroFoto;
  }
  if (p.fotoTentang) {
    const tentangPreview = document.getElementById('p-tentang-preview');
    tentangPreview.src = p.fotoTentang;
    tentangPreview.dataset.savedUrl = p.fotoTentang;
  }

  const dashLogo = document.getElementById('dash-logo');
  const dashNama = document.getElementById('dash-nama');
  const dashTagline = document.getElementById('dash-tagline');
  const dashKecamatan = document.getElementById('dash-kecamatan');
  if (dashLogo) dashLogo.src = p.logo || panel.foto || 'profil-pkpm.jpeg';
  if (dashNama) dashNama.textContent = p.namaDesa || 'Desa';
  if (dashTagline) dashTagline.textContent = p.tagline || '';
  const panelJudul = document.getElementById('admin-panel-judul');
  const panelDeskripsi = document.getElementById('admin-panel-deskripsi');
  const panelRingkasan = document.getElementById('admin-panel-ringkasan');
  if (panelJudul) panelJudul.textContent = panel.judul || 'Admin Panel';
  if (panelDeskripsi) panelDeskripsi.textContent = panel.deskripsi || 'Kelola data dan biodata desa';
  if (panelRingkasan) panelRingkasan.textContent = panel.ringkasan || 'Ringkasan Profil Website';
  if (dashKecamatan) {
    const kec = p.kecamatan || '';
    const kab = p.kabupaten || '';
    dashKecamatan.textContent = (kec ? 'Kecamatan ' + kec : '') + (kec && kab ? ', ' : '') + (kab ? 'Kabupaten ' + kab : '');
  }
}

document.getElementById('p-logo-file')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    document.getElementById('p-logo-preview').src = URL.createObjectURL(file);
  }
});
document.getElementById('p-hero-file')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    document.getElementById('p-hero-preview').src = URL.createObjectURL(file);
  }
});
document.getElementById('p-tentang-file')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    document.getElementById('p-tentang-preview').src = URL.createObjectURL(file);
  }
});
document.getElementById('p-panel-foto-file')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) document.getElementById('p-panel-foto-preview').src = URL.createObjectURL(file);
});
document.getElementById('kd-foto-file')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const check = validateFileClient(file);
  if (!check.valid) {
    adminToast(check.message, 'error');
    e.target.value = '';
    return;
  }
  const preview = document.getElementById('kd-foto-preview');
  if (preview) {
    preview.src = URL.createObjectURL(file);
  }
  const fileNameSpan = e.target.closest('.admin-file-input')?.querySelector('.file-name');
  if (fileNameSpan) {
    fileNameSpan.textContent = file.name;
    fileNameSpan.classList.add('has-file');
  }
});

function fillPemerintahan(p) {
  if (!p) return;
  document.getElementById('kd-nama').value = p.kepalaDesa?.nama || '';
  document.getElementById('kd-jabatan').value = p.kepalaDesa?.jabatan || '';
  const kdPreview = document.getElementById('kd-foto-preview');
  if (kdPreview) {
    kdPreview.src = p.kepalaDesa?.foto || 'profil-pkpm.jpeg';
    kdPreview.dataset.savedUrl = p.kepalaDesa?.foto || '';
  }
  document.getElementById('bpd-ketua').value = p.bpd?.ketua || '';
  document.getElementById('bpd-wakil').value = p.bpd?.wakil || '';
  document.getElementById('bpd-sekretaris').value = p.bpd?.sekretaris || '';
  renderBpdAnggota(p.bpd?.anggota || []);
  renderPerangkat(p.perangkat || []);
  renderLembaga(p.lembaga || []);
}

// Ganti node pratinjau pada baris dinamis TANPA merusak input file di sebelahnya.
// (Bug lama: innerHTML pada div pembungkus ikut menghapus <input type="file">,
//  sehingga foto perangkat desa tidak pernah terkirim saat tombol Simpan diklik.)
const PERANGKAT_PREVIEW_CLASSES = 'perangkat-preview w-20 h-20 rounded-2xl object-contain bg-white border border-gray-200 p-1 shadow-xs';
const PERANGKAT_PLACEHOLDER_CLASSES = 'perangkat-preview w-20 h-20 rounded-2xl border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center p-1';
const POTENSI_PREVIEW_CLASSES = 'potensi-preview admin-img-clickable w-28 h-24 sm:w-32 sm:h-28 object-contain bg-white rounded-xl border border-gray-200 p-1 shadow-xs';
const POTENSI_PLACEHOLDER_CLASSES = 'potensi-preview w-28 h-24 sm:w-32 sm:h-28 rounded-xl bg-gray-100 text-gray-400 text-xs flex items-center justify-center text-center p-1';

function buildPreviewNode(url, imgClasses, phClasses, placeholderText) {
  if (url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Pratinjau foto';
    img.className = imgClasses;
    return img;
  }
  const ph = document.createElement('div');
  ph.className = phClasses;
  ph.textContent = placeholderText;
  return ph;
}

function renderPerangkat(list) {
  const container = document.getElementById('perangkat-list');
  if (!container) return;
  container.innerHTML = '';
  (list || []).forEach(item => addPerangkatRow(container, item));
}

function addPerangkatRow(container, item = {}) {
  const row = document.createElement('div');
  row.className = 'flex flex-col md:flex-row gap-3 items-center bg-gray-50 p-3 rounded-xl border border-gray-200';
  row.dataset.savedFoto = item.foto || '';
  row.innerHTML = `
    <div class="perangkat-foto-col flex flex-col items-center gap-1.5 flex-shrink-0"></div>
    <input data-field="jabatan" value="${escapeHtml(item.jabatan || '')}" placeholder="Jabatan" class="flex-1 w-full border border-gray-300 rounded px-3 py-2">
    <input data-field="nama" value="${escapeHtml(item.nama || '')}" placeholder="Nama" class="flex-1 w-full border border-gray-300 rounded px-3 py-2">
    <button type="button" class="remove-perangkat bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200 whitespace-nowrap">Hapus</button>
  `;
  const col = row.querySelector('.perangkat-foto-col');
  col.innerHTML = `
    <div class="admin-file-input w-full max-w-[180px] text-xs">
      <span class="file-btn">Pilih File</span>
      <span class="file-name">No file chosen</span>
      <input type="file" data-foto-input accept="image/*">
    </div>
  `;
  mountPerangkatPreview(row, item.foto || '');

  const fotoInput = row.querySelector('[data-foto-input]');
  const nameSpan = row.querySelector('.file-name');
  fotoInput.addEventListener('change', () => {
    const f = fotoInput.files[0];
    if (!f) return;
    mountPerangkatPreview(row, URL.createObjectURL(f));
    if (nameSpan) {
      nameSpan.textContent = f.name;
      nameSpan.classList.add('has-file');
    }
  });
  row.querySelector('.remove-perangkat').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

// Pasang pratinjau foto perangkat (img / placeholder "No Foto") + klik modal preview.
function mountPerangkatPreview(row, url) {
  const col = row.querySelector('.perangkat-foto-col');
  if (!col) return;
  col.querySelector('.perangkat-preview')?.remove();
  const node = buildPreviewNode(url, PERANGKAT_PREVIEW_CLASSES, PERANGKAT_PLACEHOLDER_CLASSES, 'No Foto');
  col.insertBefore(node, col.querySelector('.admin-file-input'));
  if (url) {
    enableImagePreview(node, {
      caption: 'Foto Perangkat Desa' + (row.querySelector('[data-field="nama"]')?.value ? ' — ' + row.querySelector('[data-field="nama"]').value : ''),
      onChange: (file) => replaceDynamicRowPhoto(row, file, mountPerangkatPreview, 'save-pemerintahan'),
      onRemove: () => removeDynamicRowPhoto(row, () => mountPerangkatPreview(row, ''), 'save-pemerintahan')
    });
  }
}

document.getElementById('add-perangkat')?.addEventListener('click', () => {
  addPerangkatRow(document.getElementById('perangkat-list'), { jabatan: '', nama: '', foto: '' });
});

function renderLembaga(list) {
  const container = document.getElementById('lembaga-list');
  if (!container) return;
  container.innerHTML = '';
  list.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center bg-gray-50 p-2 rounded';
    row.innerHTML = `
      <input data-idx="${idx}" data-field="nama" value="${item.nama || ''}" placeholder="Nama Lembaga" class="flex-[2] border border-gray-300 rounded px-3 py-2">
      <button type="button" class="remove-lembaga bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200" data-idx="${idx}">Hapus</button>
    `;
    container.appendChild(row);
  });
  container.querySelectorAll('.remove-lembaga').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('div').remove());
  });
}

document.getElementById('add-lembaga')?.addEventListener('click', () => {
  const container = document.getElementById('lembaga-list');
  const row = document.createElement('div');
  row.className = 'flex gap-2 items-center bg-gray-50 p-2 rounded';
  row.innerHTML = `
    <input data-field="nama" value="" placeholder="Nama Lembaga" class="flex-[2] border border-gray-300 rounded px-3 py-2">
    <button type="button" class="remove-lembaga bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200">Hapus</button>
  `;
  container.appendChild(row);
  row.querySelector('.remove-lembaga').addEventListener('click', () => row.remove());
});

function renderBpdAnggota(list) {
  const container = document.getElementById('bpd-anggota-list');
  if (!container) return;
  container.innerHTML = '';
  const items = Array.isArray(list)
    ? list
    : (typeof list === 'string' && list.trim() ? list.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : []);
  if (items.length) {
    items.forEach(nama => addBpdAnggotaRow(nama));
  } else {
    addBpdAnggotaRow('');
  }
}

function addBpdAnggotaRow(nama = '') {
  const container = document.getElementById('bpd-anggota-list');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'flex gap-2 items-center bg-gray-50 p-2 rounded';
  row.innerHTML = `
    <input data-field="nama" value="${nama}" placeholder="Nama Anggota BPD" class="flex-1 border border-gray-300 rounded px-3 py-2">
    <button type="button" class="remove-bpd-anggota bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200">Hapus</button>
  `;
  row.querySelector('.remove-bpd-anggota').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

document.getElementById('add-bpd-anggota')?.addEventListener('click', () => {
  addBpdAnggotaRow('');
});

function collectBpdAnggota() {
  return Array.from(document.querySelectorAll('#bpd-anggota-list input[data-field="nama"]'))
    .map(inp => inp.value.trim())
    .filter(Boolean);
}

function fillKontak(k) {
  if (!k) return;
  document.getElementById('k-alamat').value = k.alamat || '';
  document.getElementById('k-telepon').value = k.telepon || '';
  document.getElementById('k-email').value = k.email || '';
  document.getElementById('k-maps').value = k.mapsUrl || '';
  document.getElementById('k-instagram').value = k.instagram || '';
  document.getElementById('k-facebook').value = k.facebook || '';
  document.getElementById('k-youtube').value = k.youtube || '';
}

document.getElementById('save-profil')?.addEventListener('click', async () => {
  const msg = document.getElementById('profil-msg');
  msg.textContent = 'Menyimpan...';
  msg.className = 'ml-3 text-sm text-blue-600';
  try {
    let logo = document.getElementById('p-logo-preview').dataset.savedUrl || document.getElementById('p-logo-preview').src || '';
    let hero = document.getElementById('p-hero-preview').dataset.savedUrl || document.getElementById('p-hero-preview').src || '';
    let fotoTentang = document.getElementById('p-tentang-preview').dataset.savedUrl || document.getElementById('p-tentang-preview').src || '';
    let panelFoto = document.getElementById('p-panel-foto-preview').dataset.savedUrl || document.getElementById('p-panel-foto-preview').src || '';
    
    const logoFile = document.getElementById('p-logo-file').files[0];
    const heroFile = document.getElementById('p-hero-file').files[0];
    const tentangFile = document.getElementById('p-tentang-file').files[0];
    const panelFile = document.getElementById('p-panel-foto-file').files[0];
    
    if (logoFile) {
      const up = await uploadFile(logoFile);
      if (up) {
        logo = up;
        document.getElementById('p-logo-preview').dataset.savedUrl = up;
      } else {
        msg.textContent = 'Gagal mengunggah Logo' + (lastUploadError ? ' — ' + lastUploadError : '');
        msg.className = 'ml-3 text-sm text-red-600 font-medium';
        adminToast(lastUploadError || 'Gagal mengunggah Logo', 'error', 'Unggah Gagal');
        return;
      }
    }
    if (heroFile) {
      const up = await uploadFile(heroFile);
      if (up) {
        hero = up;
        document.getElementById('p-hero-preview').dataset.savedUrl = up;
      } else {
        msg.textContent = 'Gagal mengunggah Foto Banner' + (lastUploadError ? ' — ' + lastUploadError : '');
        msg.className = 'ml-3 text-sm text-red-600 font-medium';
        adminToast(lastUploadError || 'Gagal mengunggah Foto Banner', 'error', 'Unggah Gagal');
        return;
      }
    }
    if (tentangFile) {
      const up = await uploadFile(tentangFile);
      if (up) {
        fotoTentang = up;
        document.getElementById('p-tentang-preview').dataset.savedUrl = up;
      } else {
        msg.textContent = 'Gagal mengunggah Foto Tentang Desa' + (lastUploadError ? ' — ' + lastUploadError : '');
        msg.className = 'ml-3 text-sm text-red-600 font-medium';
        adminToast(lastUploadError || 'Gagal mengunggah Foto Tentang Desa', 'error', 'Unggah Gagal');
        return;
      }
    }
    if (panelFile) {
      const up = await uploadFile(panelFile);
      if (up) {
        panelFoto = up;
        document.getElementById('p-panel-foto-preview').dataset.savedUrl = up;
      } else {
        msg.textContent = 'Gagal mengunggah Foto Profil PKPM' + (lastUploadError ? ' — ' + lastUploadError : '');
        msg.className = 'ml-3 text-sm text-red-600 font-medium';
        adminToast(lastUploadError || 'Gagal mengunggah Foto Profil PKPM', 'error', 'Unggah Gagal');
        return;
      }
    }

    if (logo.startsWith('blob:')) logo = '';
    if (hero.startsWith('blob:')) hero = '';
    if (fotoTentang.startsWith('blob:')) fotoTentang = '';
    if (panelFoto.startsWith('blob:')) panelFoto = '';

    const payload = {
      namaDesa: document.getElementById('p-nama').value.trim(),
      kecamatan: document.getElementById('p-kecamatan').value.trim(),
      kabupaten: document.getElementById('p-kabupaten').value.trim(),
      tagline: document.getElementById('p-tagline').value.trim(),
      panelAdmin: {
        judul: document.getElementById('p-panel-judul').value.trim(),
        deskripsi: document.getElementById('p-panel-deskripsi').value.trim(),
        ringkasan: document.getElementById('p-panel-ringkasan').value.trim(),
        foto: panelFoto
      },
      deskripsi: document.getElementById('p-deskripsi').value.trim(),
      tentangJudul: document.getElementById('p-tentang-judul').value.trim(),
      komitmen: document.getElementById('p-komitmen').value.trim(),
      dataSingkat: collectProfilDataSingkat(),
      visi: document.getElementById('p-visi').value.trim(),
      misi: collectProfilMisi(),
      logo,
      heroFoto: hero,
      fotoTentang
    };
    showSaveProgress();
    const res = await fetch(API_BASE + '/api/admin/profil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.status === 401) {
      hideSaveProgress();
      msg.textContent = 'Sesi login telah berakhir. Silakan login kembali.';
      msg.className = 'ml-3 text-sm text-red-600';
      adminToast('Sesi login telah berakhir. Silakan login kembali.', 'error');
      setTimeout(() => checkSession(), 1500);
      return;
    }

    const data = await res.json();
    if (data.success) {
      msg.textContent = '✓ Profil berhasil disimpan';
      msg.className = 'ml-3 text-sm text-green-600';
      adminToast('Profil desa berhasil diperbarui! Memperbarui halaman...', 'success', 'Simpan Berhasil');
      if (data.data.logo) document.getElementById('header-logo').src = data.data.logo;
      finishSaveProgressAndReload(1200);
    } else {
      hideSaveProgress();
      msg.textContent = data.message || 'Gagal menyimpan profil';
      msg.className = 'ml-3 text-sm text-red-600';
      adminToast(data.message || 'Gagal menyimpan profil', 'error');
    }
  } catch (err) {
    hideSaveProgress();
    msg.textContent = 'Terjadi kesalahan: ' + (err.message || err);
    msg.className = 'ml-3 text-sm text-red-600';
    adminToast('Terjadi kesalahan saat menyimpan data', 'error');
  }
});

document.getElementById('save-pemerintahan')?.addEventListener('click', async () => {
  const msg = document.getElementById('pemerintahan-msg');
  msg.textContent = 'Menyimpan...';
  msg.className = 'ml-3 text-sm text-blue-600';
  try {
    const preview = document.getElementById('kd-foto-preview');
    let kdFoto = preview?.dataset.savedUrl || '';
    const kdFileInput = document.getElementById('kd-foto-file');
    const kdFile = kdFileInput?.files[0];
    if (kdFile) {
      const uploaded = await uploadFile(kdFile);
      if (uploaded) {
        kdFoto = uploaded;
        if (preview) {
          preview.dataset.savedUrl = uploaded;
          preview.src = uploaded;
        }
      } else {
        msg.textContent = 'Gagal mengunggah foto Kepala Desa' + (lastUploadError ? ' — ' + lastUploadError : '');
        msg.className = 'ml-3 text-sm text-red-600 font-medium';
        adminToast(lastUploadError || 'Gagal mengunggah foto Kepala Desa', 'error', 'Unggah Gagal');
        return;
      }
    }

    const perangkat = [];
    const perangkatRows = document.querySelectorAll('#perangkat-list > div');
    for (const row of perangkatRows) {
      const jabatanInput = row.querySelector('[data-field="jabatan"]');
      const namaInput = row.querySelector('[data-field="nama"]');
      const jabatan = jabatanInput ? jabatanInput.value.trim() : '';
      const nama = namaInput ? namaInput.value.trim() : '';
      if (jabatan || nama) {
        let foto = row.dataset.savedFoto || '';
        const fotoInput = row.querySelector('[data-foto-input]');
        if (fotoInput && fotoInput.files[0]) {
          const uploaded = await uploadFile(fotoInput.files[0]);
          if (!uploaded) {
            hideSaveProgress();
            const who = jabatan || nama;
            msg.textContent = 'Gagal mengunggah foto perangkat "' + who + '"' + (lastUploadError ? ' — ' + lastUploadError : '');
            msg.className = 'ml-3 text-sm text-red-600 font-medium';
            adminToast(lastUploadError || ('Gagal mengunggah foto perangkat ' + who), 'error', 'Unggah Gagal');
            return;
          }
          foto = uploaded;
          row.dataset.savedFoto = uploaded;
          clearFileInput(null, fotoInput);
          mountPerangkatPreview(row, uploaded);
        }
        if (foto.startsWith('blob:')) foto = '';
        perangkat.push({ jabatan, nama, foto });
      }
    }

    const lembaga = [];
    document.querySelectorAll('#lembaga-list > div').forEach(row => {
      const namaInput = row.querySelector('[data-field="nama"]');
      const nama = namaInput ? namaInput.value.trim() : '';
      if (nama) lembaga.push({ nama });
    });

    const payload = {
      kepalaDesa: {
        nama: document.getElementById('kd-nama').value.trim(),
        jabatan: document.getElementById('kd-jabatan').value.trim(),
        foto: kdFoto
      },
      perangkat: perangkat,
      bpd: {
        ketua: document.getElementById('bpd-ketua').value.trim(),
        wakil: document.getElementById('bpd-wakil').value.trim(),
        sekretaris: document.getElementById('bpd-sekretaris').value.trim(),
        anggota: collectBpdAnggota()
      },
      lembaga: lembaga
    };

    showSaveProgress();
    const res = await fetch(API_BASE + '/api/admin/pemerintahan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.status === 401) {
      hideSaveProgress();
      msg.textContent = 'Sesi login telah berakhir. Silakan login kembali.';
      msg.className = 'ml-3 text-sm text-red-600';
      adminToast('Sesi login telah berakhir. Silakan login kembali.', 'error');
      setTimeout(() => checkSession(), 1500);
      return;
    }

    const data = await res.json();
    if (data.success) {
      msg.textContent = '✓ Pemerintahan berhasil disimpan';
      msg.className = 'ml-3 text-sm text-green-600';
      adminToast('Data pemerintahan & lembaga berhasil disimpan! Memperbarui halaman...', 'success', 'Simpan Berhasil');
      if (data.data?.kepalaDesa?.foto && preview) {
        preview.src = data.data.kepalaDesa.foto;
        preview.dataset.savedUrl = data.data.kepalaDesa.foto;
      }
      if (data.data?.lembaga) {
        renderLembaga(data.data.lembaga);
      }
      finishSaveProgressAndReload(1200);
    } else {
      hideSaveProgress();
      msg.textContent = data.message || 'Gagal menyimpan data pemerintahan';
      msg.className = 'ml-3 text-sm text-red-600';
      adminToast(data.message || 'Gagal menyimpan data pemerintahan', 'error');
    }
  } catch (err) {
    hideSaveProgress();
    console.error('Error save pemerintahan:', err);
    msg.textContent = 'Terjadi kesalahan: ' + (err.message || err);
    msg.className = 'ml-3 text-sm text-red-600';
    adminToast('Terjadi kesalahan saat menyimpan data', 'error');
  }
});

document.getElementById('save-kontak')?.addEventListener('click', async () => {
  const msg = document.getElementById('kontak-msg');
  if (msg) {
    msg.textContent = 'Menyimpan...';
    msg.className = 'ml-3 text-sm text-blue-600';
  }
  try {
    const payload = {
      alamat: document.getElementById('k-alamat').value.trim(),
      telepon: document.getElementById('k-telepon').value.trim(),
      email: document.getElementById('k-email').value.trim(),
      mapsUrl: (() => {
        const raw = document.getElementById('k-maps').value.trim();
        const m = raw.match(/src=["']([^"']+)["']/i);
        return m ? m[1] : raw;
      })(),
      instagram: document.getElementById('k-instagram').value.trim(),
      facebook: document.getElementById('k-facebook').value.trim(),
      youtube: document.getElementById('k-youtube').value.trim()
    };
    showSaveProgress();
    const res = await fetch(API_BASE + '/api/admin/kontak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.status === 401) {
      hideSaveProgress();
      adminToast('Sesi login telah berakhir. Silakan login kembali.', 'error', 'Sesi Berakhir');
      if (msg) { msg.textContent = 'Sesi telah berakhir.'; msg.className = 'ml-3 text-sm text-red-600'; }
      setTimeout(() => checkSession(), 1500);
      return;
    }
    const data = await res.json();
    if (data.success) {
      adminToast('Informasi kontak desa berhasil diperbarui!', 'success', 'Kontak Disimpan');
      if (msg) { msg.textContent = '✓ Kontak berhasil disimpan'; msg.className = 'ml-3 text-sm text-green-600'; }
      finishSaveProgressAndReload(1200);
    } else {
      hideSaveProgress();
      adminToast(data.message || 'Gagal menyimpan kontak', 'error', 'Simpan Gagal');
      if (msg) { msg.textContent = data.message || 'Gagal menyimpan'; msg.className = 'ml-3 text-sm text-red-600'; }
    }
  } catch (err) {
    hideSaveProgress();
    adminToast('Terjadi kesalahan saat menyimpan kontak', 'error', 'Koneksi Error');
    if (msg) { msg.textContent = 'Terjadi kesalahan'; msg.className = 'ml-3 text-sm text-red-600'; }
  }
});

document.getElementById('add-pengumuman')?.addEventListener('click', async () => {
  const btn = document.getElementById('add-pengumuman');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';
  try {
    let gambar = '';
    const fotoFile = document.getElementById('peng-foto-file').files[0];
    if (fotoFile) {
      const uploaded = await uploadFile(fotoFile);
      if (uploaded) gambar = uploaded;
    }

    const pengumuman = {
      judul: document.getElementById('peng-judul').value.trim(),
      tanggal: document.getElementById('peng-tanggal').value.trim(),
      ringkasan: document.getElementById('peng-ringkasan').value.trim(),
      isi: document.getElementById('peng-isi')?.value.trim() || '',
      gambar
    };
    const res = await fetch(API_BASE + '/api/admin/pengumuman', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pengumuman)
    });
    if (res.status === 401) {
      adminToast('Sesi login telah berakhir. Silakan login kembali.', 'error', 'Sesi Berakhir');
      setTimeout(() => checkSession(), 1500);
      return;
    }
    const data = await res.json();
    if (data.success) {
      document.getElementById('peng-judul').value = '';
      document.getElementById('peng-tanggal').value = '';
      document.getElementById('peng-ringkasan').value = '';
      if (document.getElementById('peng-isi')) document.getElementById('peng-isi').value = '';
      clearFileInput('peng-foto-file');
      // Reset pratinjau: hapus ATRIBUT src-nya (bukan src='').
      // src='' membuat browser menampilkan ikon gambar rusak.
      const pengPreview = document.getElementById('peng-foto-preview');
      if (pengPreview) {
        pengPreview.removeAttribute('src');
        pengPreview.classList.add('hidden');
      }
      renderPengumuman((await (await fetch(API_BASE + '/api/data')).json()).pengumuman || []);
      adminToast('Pengumuman berhasil ditambahkan', 'success');
    } else {
      adminToast('Gagal menambahkan pengumuman', 'error');
    }
  } catch (err) {
    adminToast('Terjadi kesalahan saat menambahkan pengumuman', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Tambah Pengumuman';
  }
});

document.getElementById('peng-foto-file')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const preview = document.getElementById('peng-foto-preview');
    preview.src = URL.createObjectURL(file);
    preview.classList.remove('hidden');
  }
});

function renderPengumuman(list) {
  const container = document.getElementById('pengumuman-list');
  if (!container) return;
  container.innerHTML = '';
  if (!list.length) {
    container.innerHTML = '<p class="text-gray-400 text-sm">Belum ada pengumuman.</p>';
    return;
  }
  list.forEach(item => {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-3 bg-gray-50 rounded px-3 py-2';
    const thumb = item.gambar
      ? `<img src="${escapeHtml(item.gambar)}" alt="Foto pengumuman" class="admin-img-clickable w-14 h-14 rounded-lg object-cover bg-white border border-gray-200 p-0.5 shadow-xs flex-shrink-0">`
      : '<div class="w-14 h-14 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400 text-[10px] text-center p-1 flex-shrink-0">No Foto</div>';
    div.innerHTML = `
      ${thumb}
      <div class="flex-1 min-w-0">
        <p class="font-medium truncate">${escapeHtml(item.judul)}</p>
        <p class="text-xs text-gray-400">${escapeHtml(item.tanggal || '')}</p>
      </div>
      <button class="delete-pengumuman bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200" data-id="${item.id}">Hapus</button>
    `;
    container.appendChild(div);

    if (item.gambar) {
      enableImagePreview(div.querySelector('img.admin-img-clickable'), {
        caption: 'Foto Pengumuman — ' + (item.judul || ''),
        onChange: (file) => updatePengumumanGambar(item.id, file),
        onRemove: () => updatePengumumanGambar(item.id, null)
      });
    }
  });
  container.querySelectorAll('.delete-pengumuman').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch(API_BASE + '/api/admin/pengumuman/' + btn.dataset.id, { method: 'DELETE' });
      renderPengumuman((await (await fetch(API_BASE + '/api/data')).json()).pengumuman || []);
    });
  });
}

// Ganti / hapus foto pada satu record pengumuman (record TETAP ADA, hanya gambarnya).
async function updatePengumumanGambar(id, file) {
  let gambar = '';
  if (file) {
    gambar = await uploadFile(file);
    if (!gambar) return;
  }
  try {
    showSaveProgress();
    const res = await fetch(API_BASE + '/api/admin/pengumuman/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gambar })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    adminToast(file ? 'Foto pengumuman berhasil diganti' : 'Foto pengumuman berhasil dihapus', 'success', 'Berhasil');
    finishSaveProgressAndReload(900);
  } catch (err) {
    hideSaveProgress();
    adminToast('Gagal memperbarui foto pengumuman', 'error');
  }
}

const GALERI_CATEGORIES = [
  { fileId: 'g-file-1', btnId: 'add-galeri-1', gridId: 'galeri-grid-1', key: 'galeri1', label: 'Kegiatan Desa' },
  { fileId: 'g-file-2', btnId: 'add-galeri-2', gridId: 'galeri-grid-2', key: 'galeri2', label: 'Pembangunan' },
  { fileId: 'g-file-3', btnId: 'add-galeri-3', gridId: 'galeri-grid-3', key: 'galeri3', label: 'Wisata & Budaya' }
];

GALERI_CATEGORIES.forEach(cat => {
  document.getElementById(cat.btnId)?.addEventListener('click', async () => {
    const fileInput = document.getElementById(cat.fileId);
    const files = Array.from(fileInput.files);
    const btn = document.getElementById(cat.btnId);

    if (!files.length) return;

    btn.disabled = true;
    btn.textContent = 'Mengunggah...';

    const progressToast = createUploadProgressToast(`${files.length} Foto Galeri`);

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('foto', file);
      }

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          progressToast.update(percent);
        }
      });

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (err) { reject(err); }
          } else {
            reject(new Error('Upload gagal dengan status ' + xhr.status));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
      });

      xhr.open('POST', API_BASE + '/api/admin/upload-multiple');
      const token = sessionStorage.getItem('adminToken');
      if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.send(formData);

      const upData = await uploadPromise;

      if (upData.success && upData.urls.length) {
        await fetch(API_BASE + '/api/admin/galeri-category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: cat.key, urls: upData.urls })
        });
        progressToast.success(`✓ ${files.length} foto berhasil diunggah ke kategori ${cat.label}! Memperbarui...`, true);
      } else {
        progressToast.error(upData.message || 'Gagal mengunggah foto galeri');
      }

      fileInput.value = '';
      const data = await (await fetch(API_BASE + '/api/data')).json();
      renderGaleriAll(data.galeri || {});
    } catch (err) {
      progressToast.error('Terjadi kesalahan saat mengunggah foto galeri.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload';
    }
  });
});

function renderGaleriAll(gal) {
  GALERI_CATEGORIES.forEach(cat => {
    const list = (gal && gal[cat.key]) || [];
    const container = document.getElementById(cat.gridId);
    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = '<p class="text-gray-400 text-sm col-span-full">Belum ada foto.</p>';
      return;
    }
    list.forEach((url, idx) => {
      const div = document.createElement('div');
      div.className = 'relative group bg-gray-50 border border-gray-200 rounded-xl p-2 shadow-xs flex items-center justify-center min-h-[160px] overflow-hidden';
      div.innerHTML = `
        <img src="${escapeHtml(url)}" alt="Galeri" class="admin-img-clickable w-full max-h-44 object-contain rounded-lg">
        <button class="delete-galeri absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all z-10" data-cat="${cat.key}" data-idx="${idx}" title="Hapus foto">&times;</button>
        <span class="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-medium z-10">${cat.label}</span>
      `;
      container.appendChild(div);
      const galImg = div.querySelector('img.admin-img-clickable');
      if (galImg) {
        enableImagePreview(galImg, {
          caption: cat.label + ' — Foto ' + (idx + 1),
          onChange: (file) => replaceGaleriPhoto(cat.key, idx, file),
          onRemove: () => removeGaleriPhoto(cat.key, idx)
        });
      }
    });
  });

  document.querySelectorAll('.delete-galeri').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cat = btn.dataset.cat;
      const idx = btn.dataset.idx;
      if (!confirm('Yakin ingin menghapus foto ini?')) return;
      try {
        const res = await fetch(API_BASE + '/api/admin/galeri-category/' + cat + '/' + idx, { method: 'DELETE' });
        const data = await (await fetch(API_BASE + '/api/data')).json();
        renderGaleriAll(data.galeri || {});
        adminToast('Foto berhasil dihapus', 'success');
      } catch (err) {
        adminToast('Gagal menghapus foto', 'error');
      }
    });
  });
}

// Ganti foto galeri pada posisi yang sama (in-place), record tidak pindah urutan.
async function replaceGaleriPhoto(catKey, idx, file) {
  const url = await uploadFile(file);
  if (!url) return;
  try {
    showSaveProgress();
    const res = await fetch(API_BASE + '/api/admin/galeri-category/' + catKey + '/' + idx, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    adminToast('Foto galeri berhasil diganti', 'success', 'Berhasil');
    finishSaveProgressAndReload(900);
  } catch (err) {
    hideSaveProgress();
    adminToast('Gagal mengganti foto galeri', 'error');
  }
}

async function removeGaleriPhoto(catKey, idx) {
  try {
    await fetch(API_BASE + '/api/admin/galeri-category/' + catKey + '/' + idx, { method: 'DELETE' });
    adminToast('Foto berhasil dihapus dari galeri', 'success');
    const data = await (await fetch(API_BASE + '/api/data')).json();
    renderGaleriAll(data.galeri || {});
  } catch (err) {
    adminToast('Gagal menghapus foto galeri', 'error');
  }
}

function renderGaleri(list) {
  renderGaleriAll(typeof list === 'object' && list !== null ? list : { galeri1: Array.isArray(list) ? list : [] });
}

const galPickerModal = document.getElementById('gal-picker-modal');
const galPickerGrid = document.getElementById('gal-picker-grid');
const galPickerClose = document.getElementById('gal-picker-close');
let galPickerTarget = null;

let cachedGaleri = [];

function openGalPicker(targetInputId) {
  galPickerTarget = targetInputId;
  renderGalPicker();
  galPickerModal.classList.remove('hidden');
}

function closeGalPicker() {
  galPickerModal.classList.add('hidden');
  galPickerTarget = null;
}

function renderGalPicker() {
  galPickerGrid.innerHTML = '';
  if (!cachedGaleri.length) {
    galPickerGrid.innerHTML = '<p class="col-span-full text-gray-400 text-sm">Galeri masih kosong. Upload foto terlebih dahulu di tab Galeri.</p>';
    return;
  }
  cachedGaleri.forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Galeri';
    img.className = 'w-full h-28 object-contain bg-gray-50 rounded-xl p-1 cursor-pointer border-2 border-gray-200 hover:border-green-600 shadow-xs transition-all';
    img.addEventListener('click', () => {
      document.getElementById(galPickerTarget).value = url;
      closeGalPicker();
    });
    galPickerGrid.appendChild(img);
  });
}

document.querySelectorAll('.tab-panel [data-gal-picker]').forEach(btn => {
  btn.addEventListener('click', () => openGalPicker(btn.dataset.galPicker));
});

galPickerClose?.addEventListener('click', closeGalPicker);
galPickerModal?.addEventListener('click', (e) => {
  if (e.target === galPickerModal) closeGalPicker();
});

function fillLayanan(l) {
  if (!l) return;
  const ps = l.pengajuanSurat || {}, dk = l.dataKependudukan || {}, jp = l.jadwalPosyandu || {}, ap = l.arsipPerdes || {};
  document.getElementById('ps-judul').value = ps.judul || '';
  document.getElementById('ps-deskripsi').value = ps.deskripsi || '';
  document.getElementById('ps-jenis').value = ps.jenisSurat || '';
  document.getElementById('ps-syarat').value = ps.syarat || '';
  document.getElementById('ps-email').value = ps.emailTujuan || '';
  document.getElementById('dk-judul').value = dk.judul || '';
  document.getElementById('dk-deskripsi').value = dk.deskripsi || '';
  document.getElementById('dk-total').value = dk.totalPenduduk || '';
  document.getElementById('dk-kk').value = dk.kk || '';
  document.getElementById('dk-laki').value = dk.laki || '';
  document.getElementById('dk-perempuan').value = dk.perempuan || '';
  renderDataRows('dk-umur-items', dk.kelompokUmur || [], ['kelompok', 'jumlah'], ['Kelompok umur', 'Jumlah'], 'add-dk-umur');
  renderDataRows('dk-pendidikan-items', dk.pendidikan || [], ['tingkat', 'jumlah'], ['Tingkat pendidikan', 'Jumlah'], 'add-dk-pendidikan');
  document.getElementById('jp-judul').value = jp.judul || '';
  document.getElementById('jp-deskripsi').value = jp.deskripsi || '';
  document.getElementById('ap-judul').value = ap.judul || '';
  document.getElementById('ap-deskripsi').value = ap.deskripsi || '';
  renderDataRows('ap-perdes-items', ap.perdes || [], ['no', 'peraturan', 'tahun', 'tentang'], ['No.', 'Nomor peraturan', 'Tahun', 'Tentang'], 'add-ap-perdes');
  renderDataRows('ap-perkades-items', ap.perkades || [], ['no', 'peraturan', 'tahun', 'tentang'], ['No.', 'Nomor peraturan', 'Tahun', 'Tentang'], 'add-ap-perkades');

  renderPosyanduItems('posyandu-balita-items', (jp.balita || []), 'add-posyandu-balita');
  renderPosyanduItems('posyandu-lansia-items', (jp.lansia || []), 'add-posyandu-lansia');
}

function renderProfilDataSingkat(items) {
  const container = document.getElementById('p-data-singkat-items');
  const addButton = document.getElementById('add-p-data-singkat');
  if (!container || !addButton) return;
  container.innerHTML = '';
  items.forEach(item => addProfilDataSingkatRow(item));
  addButton.onclick = () => addProfilDataSingkatRow({ label: '', nilai: '' });
}

function addProfilDataSingkatRow(item) {
  const container = document.getElementById('p-data-singkat-items');
  const row = document.createElement('div');
  row.className = 'flex flex-col md:flex-row gap-2 bg-gray-50 p-2 rounded';
  row.innerHTML = `<input data-field="label" type="text" value="${item.label || ''}" placeholder="Label, misalnya Luas Wilayah" class="flex-1 border border-gray-300 rounded px-3 py-2"><input data-field="nilai" type="text" value="${item.nilai || ''}" placeholder="Nilai, misalnya 1.250 Ha" class="flex-1 border border-gray-300 rounded px-3 py-2"><button type="button" class="remove-profil-row bg-red-100 text-red-600 px-3 py-2 rounded">Hapus</button>`;
  row.querySelector('.remove-profil-row').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function renderProfilMisi(items) {
  const container = document.getElementById('p-misi-items');
  const addButton = document.getElementById('add-p-misi');
  if (!container || !addButton) return;
  container.innerHTML = '';
  items.forEach(item => addProfilMisiRow(item));
  addButton.onclick = () => addProfilMisiRow('');
}

function addProfilMisiRow(item) {
  const container = document.getElementById('p-misi-items');
  const row = document.createElement('div');
  row.className = 'flex gap-2 bg-gray-50 p-2 rounded';
  row.innerHTML = `<input type="text" value="${item || ''}" placeholder="Isi misi" class="flex-1 border border-gray-300 rounded px-3 py-2"><button type="button" class="remove-profil-row bg-red-100 text-red-600 px-3 py-2 rounded">Hapus</button>`;
  row.querySelector('.remove-profil-row').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function collectProfilDataSingkat() {
  return Array.from(document.querySelectorAll('#p-data-singkat-items > div')).map(row => ({
    label: row.querySelector('[data-field="label"]').value.trim(),
    nilai: row.querySelector('[data-field="nilai"]').value.trim()
  })).filter(item => item.label || item.nilai);
}

function collectProfilMisi() {
  return Array.from(document.querySelectorAll('#p-misi-items input')).map(input => input.value.trim()).filter(Boolean);
}

function renderDataRows(containerId, items, fields, placeholders, addButtonId) {
  const container = document.getElementById(containerId);
  const addButton = document.getElementById(addButtonId);
  if (!container || !addButton) return;
  container.innerHTML = '';
  items.forEach(item => addDataRow(container, item, fields, placeholders));
  addButton.onclick = () => addDataRow(container, {}, fields, placeholders);
}

function addDataRow(container, item, fields, placeholders) {
  const row = document.createElement('div');
  row.className = 'flex flex-col md:flex-row gap-2 items-center bg-gray-50 p-2 rounded';
  row.innerHTML = fields.map((field, index) =>
    `<input data-field="${field}" type="text" value="${item[field] || ''}" placeholder="${placeholders[index]}" class="flex-1 w-full border border-gray-300 rounded px-3 py-2">`
  ).join('') + '<button type="button" class="remove-data-row bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200 whitespace-nowrap">Hapus</button>';
  row.querySelector('.remove-data-row').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function collectDataRows(containerId, fields) {
  return Array.from(document.querySelectorAll('#' + containerId + ' > div')).map(row => {
    const item = {};
    fields.forEach(field => { item[field] = row.querySelector(`[data-field="${field}"]`).value.trim(); });
    return item;
  }).filter(item => fields.some(field => item[field]));
}

function addPosyanduRow(container, item, isBalita) {
  const row = document.createElement('div');
  row.className = 'flex flex-col md:flex-row gap-2 items-center bg-gray-50 p-2 rounded';
  const baseInputs = `
    <input type="text" value="${item.nama || ''}" placeholder="Nama Posyandu" class="flex-1 border border-gray-300 rounded px-3 py-2">
    <input type="text" value="${item.lokasi || ''}" placeholder="Lokasi" class="flex-1 border border-gray-300 rounded px-3 py-2">
    <input type="text" value="${item.jadwal || ''}" placeholder="Jadwal" class="flex-1 border border-gray-300 rounded px-3 py-2">
  `;
  const waktuInput = isBalita
    ? `<input type="text" value="${item.waktu || ''}" placeholder="Waktu (08.00 - 11.00)" class="w-full md:w-40 border border-gray-300 rounded px-3 py-2">`
    : '';
  row.innerHTML = `
    ${baseInputs}
    ${waktuInput}
    <button type="button" class="remove-posyandu bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200 whitespace-nowrap">Hapus</button>
  `;
  row.querySelector('.remove-posyandu').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function renderPosyanduItems(containerId, items, addBtnId) {
  const container = document.getElementById(containerId);
  const addBtn = document.getElementById(addBtnId);
  const isBalita = containerId.includes('balita');
  container.innerHTML = '';
  if (items) items.forEach(item => addPosyanduRow(container, item, isBalita));
  addBtn.onclick = () => addPosyanduRow(container, { nama: '', lokasi: '', jadwal: '', waktu: '' }, isBalita);
}

function collectPosyanduItems(containerId, isBalita) {
  const items = [];
  document.querySelectorAll('#' + containerId + ' > div').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const nama = inputs[0].value.trim();
    const lokasi = inputs[1].value.trim();
    const jadwal = inputs[2].value.trim();
    const waktu = isBalita ? inputs[3].value.trim() : '';
    if (nama || lokasi || jadwal) {
      const item = { nama, lokasi, jadwal };
      if (isBalita) item.waktu = waktu;
      items.push(item);
    }
  });
  return items;
}

document.getElementById('save-layanan')?.addEventListener('click', async () => {
  const msg = document.getElementById('layanan-msg');
  msg.textContent = 'Menyimpan...';
  const payload = {
    pengajuanSurat: {
      judul: document.getElementById('ps-judul').value.trim(),
      deskripsi: document.getElementById('ps-deskripsi').value.trim(),
      jenisSurat: document.getElementById('ps-jenis').value.trim(),
      syarat: document.getElementById('ps-syarat').value.trim(),
      emailTujuan: document.getElementById('ps-email').value.trim()
    },
    dataKependudukan: {
      judul: document.getElementById('dk-judul').value.trim(),
      deskripsi: document.getElementById('dk-deskripsi').value.trim(),
      totalPenduduk: document.getElementById('dk-total').value.trim(),
      kk: document.getElementById('dk-kk').value.trim(),
      laki: document.getElementById('dk-laki').value.trim(),
      perempuan: document.getElementById('dk-perempuan').value.trim(),
      kelompokUmur: collectDataRows('dk-umur-items', ['kelompok', 'jumlah']),
      pendidikan: collectDataRows('dk-pendidikan-items', ['tingkat', 'jumlah'])
    },
jadwalPosyandu: {
      judul: document.getElementById('jp-judul').value.trim(),
      deskripsi: document.getElementById('jp-deskripsi').value.trim(),
      balita: collectPosyanduItems('posyandu-balita-items', true),
      lansia: collectPosyanduItems('posyandu-lansia-items', false)
    },
    arsipPerdes: {
      judul: document.getElementById('ap-judul').value.trim(),
      deskripsi: document.getElementById('ap-deskripsi').value.trim(),
      perdes: collectDataRows('ap-perdes-items', ['no', 'peraturan', 'tahun', 'tentang']),
      perkades: collectDataRows('ap-perkades-items', ['no', 'peraturan', 'tahun', 'tentang'])
    },
  };
  if (msg) {
    msg.textContent = 'Menyimpan...';
    msg.className = 'ml-3 text-sm text-blue-600';
  }
  try {
    showSaveProgress();
    const res = await fetch(API_BASE + '/api/admin/layanan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.status === 401) {
      hideSaveProgress();
      adminToast('Sesi login telah berakhir. Silakan login kembali.', 'error', 'Sesi Berakhir');
      if (msg) { msg.textContent = 'Sesi telah berakhir.'; msg.className = 'ml-3 text-sm text-red-600'; }
      setTimeout(() => checkSession(), 1500);
      return;
    }
    const data = await res.json();
    if (data.success) {
      adminToast('Data layanan publik, posyandu & kependudukan berhasil disimpan!', 'success', 'Layanan Disimpan');
      if (msg) { msg.textContent = '✓ Layanan berhasil disimpan'; msg.className = 'ml-3 text-sm text-green-600'; }
      finishSaveProgressAndReload(1200);
    } else {
      hideSaveProgress();
      adminToast(data.message || 'Gagal menyimpan layanan', 'error', 'Simpan Gagal');
      if (msg) { msg.textContent = data.message || 'Gagal menyimpan'; msg.className = 'ml-3 text-sm text-red-600'; }
    }
  } catch (e) {
    hideSaveProgress();
    adminToast('Terjadi kesalahan saat menyimpan layanan', 'error', 'Koneksi Error');
    if (msg) { msg.textContent = 'Terjadi kesalahan'; msg.className = 'ml-3 text-sm text-red-600'; }
  }
});

function renderPotensiItems(containerId, items, addBtnId) {
  const container = document.getElementById(containerId);
  const addBtn = document.getElementById(addBtnId);
  container.innerHTML = '';
  if (items) items.forEach(item => addPotensiRow(container, item));
  addBtn.onclick = () => addPotensiRow(container, { nama: '', deskripsi: '', foto: '' });
}

function addPotensiRow(container, item) {
  const row = document.createElement('div');
  row.className = 'flex flex-col lg:flex-row gap-3 items-center bg-gray-50 p-3 rounded-xl border border-gray-200';
  row.dataset.savedFoto = item.foto || '';
  row.innerHTML = `
    <div class="flex-1 w-full grid md:grid-cols-2 gap-2">
      <input data-field="nama" type="text" value="${escapeHtml(item.nama || '')}" placeholder="Nama potensi" class="w-full border border-gray-300 rounded px-3 py-2">
      <input data-field="deskripsi" type="text" value="${escapeHtml(item.deskripsi || '')}" placeholder="Keterangan di bawah foto" class="w-full border border-gray-300 rounded px-3 py-2">
      <div class="admin-file-input md:col-span-2">
        <span class="file-btn">Pilih File</span>
        <span class="file-name">No file chosen</span>
        <input data-field="foto" type="file" accept="image/*">
      </div>
    </div>
    <button type="button" class="remove-potensi bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200 whitespace-nowrap">Hapus</button>
  `;
  mountPotensiPreview(row, item.foto || '');
  row.querySelector('[data-field="foto"]').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    row.querySelector('.file-name').textContent = file.name;
    row.querySelector('.file-name').classList.add('has-file');
    mountPotensiPreview(row, URL.createObjectURL(file));
  });
  row.querySelector('.remove-potensi').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

// Pasang pratinjau foto potensi (img / placeholder "Belum ada foto") + klik modal preview.
function mountPotensiPreview(row, url) {
  row.querySelector('.potensi-preview')?.remove();
  const node = buildPreviewNode(url, POTENSI_PREVIEW_CLASSES, POTENSI_PLACEHOLDER_CLASSES, 'Belum ada foto');
  row.insertBefore(node, row.firstChild);
  if (url) {
    enableImagePreview(node, {
      caption: 'Foto Potensi Desa' + (row.querySelector('[data-field="nama"]')?.value ? ' — ' + row.querySelector('[data-field="nama"]').value : ''),
      onChange: (file) => replaceDynamicRowPhoto(row, file, mountPotensiPreview, 'save-potensi'),
      onRemove: () => removeDynamicRowPhoto(row, () => mountPotensiPreview(row, ''), 'save-potensi')
    });
  }
}

async function collectPotensiItems(containerId) {
  const items = [];
  const rows = document.querySelectorAll('#' + containerId + ' > div');
  for (const row of rows) {
    const nama = row.querySelector('[data-field="nama"]').value.trim();
    const deskripsi = row.querySelector('[data-field="deskripsi"]').value.trim();
    let foto = row.dataset.savedFoto || '';
    const fotoInput = row.querySelector('[data-field="foto"]');
    const file = fotoInput.files[0];
    if (file) {
      const up = await uploadFile(file);
      // GAGAL UPLOAD = HENTIKAN simpan. Jangan simpan diam-diam tanpa foto
      // sementara notifikasi tetap bilang "berhasil".
      if (!up) throw new Error(lastUploadError || ('Gagal mengunggah foto potensi "' + (nama || 'tanpa nama') + '"'));
      foto = up;
      row.dataset.savedFoto = up;
      clearFileInput(null, fotoInput);
      mountPotensiPreview(row, up);
    }
    if (foto.startsWith('blob:')) foto = '';
    if (nama || deskripsi || foto) items.push({ nama, deskripsi, foto });
  }
  return items;
}

function fillPotensi(p) {
  if (!p) return;
  const um = p.umkm || {}, wi = p.wisata || {}, kg = p.kegiatan || {};
  document.getElementById('um-judul').value = um.judul || '';
  document.getElementById('um-deskripsi').value = um.deskripsi || '';
  document.getElementById('wi-judul').value = wi.judul || '';
  document.getElementById('wi-deskripsi').value = wi.deskripsi || '';
  document.getElementById('kg-judul').value = kg.judul || '';
  document.getElementById('kg-deskripsi').value = kg.deskripsi || '';
  renderPotensiItems('umkm-items', um.items, 'add-umkm');
  renderPotensiItems('wisata-items', wi.items, 'add-wisata');
  renderPotensiItems('kegiatan-items', kg.items, 'add-kegiatan');
}

document.getElementById('save-potensi')?.addEventListener('click', async () => {
  const msg = document.getElementById('potensi-msg');
  if (msg) {
    msg.textContent = 'Menyimpan...';
    msg.className = 'ml-3 text-sm text-blue-600';
  }
  try {
    let umkmItems, wisataItems, kegiatanItems;
    try {
      umkmItems = await collectPotensiItems('umkm-items');
      wisataItems = await collectPotensiItems('wisata-items');
      kegiatanItems = await collectPotensiItems('kegiatan-items');
    } catch (upErr) {
      const upMsg = upErr && upErr.message ? upErr.message : 'Gagal mengunggah foto potensi';
      if (msg) { msg.textContent = upMsg; msg.className = 'ml-3 text-sm text-red-600 font-medium'; }
      adminToast(upMsg, 'error', 'Unggah Gagal');
      return;
    }
    const payload = {
      umkm: {
        judul: document.getElementById('um-judul').value.trim(),
        deskripsi: document.getElementById('um-deskripsi').value.trim(),
        items: umkmItems
      },
      wisata: {
        judul: document.getElementById('wi-judul').value.trim(),
        deskripsi: document.getElementById('wi-deskripsi').value.trim(),
        items: wisataItems
      },
      kegiatan: {
        judul: document.getElementById('kg-judul').value.trim(),
        deskripsi: document.getElementById('kg-deskripsi').value.trim(),
        items: kegiatanItems
      }
    };
    showSaveProgress();
    const res = await fetch(API_BASE + '/api/admin/potensi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.status === 401) {
      hideSaveProgress();
      adminToast('Sesi login telah berakhir. Silakan login kembali.', 'error', 'Sesi Berakhir');
      if (msg) { msg.textContent = 'Sesi telah berakhir.'; msg.className = 'ml-3 text-sm text-red-600'; }
      setTimeout(() => checkSession(), 1500);
      return;
    }
    const data = await res.json();
    if (data.success) {
      if (msg) { msg.textContent = '✓ Potensi berhasil disimpan'; msg.className = 'ml-3 text-sm text-green-600'; }
      fillPotensi(data.data || payload);
      adminToast('Data potensi UMKM, Wisata & Kegiatan berhasil diperbarui!', 'success', 'Potensi Disimpan');
      finishSaveProgressAndReload(1200);
    } else {
      hideSaveProgress();
      adminToast(data.message || 'Gagal menyimpan potensi desa', 'error', 'Simpan Gagal');
      if (msg) { msg.textContent = data.message || 'Gagal menyimpan'; msg.className = 'ml-3 text-sm text-red-600'; }
    }
  } catch (e) {
    hideSaveProgress();
    adminToast('Terjadi kesalahan saat menyimpan potensi desa', 'error', 'Koneksi Error');
    if (msg) { msg.textContent = 'Terjadi kesalahan'; msg.className = 'ml-3 text-sm text-red-600'; }
  }
});

async function renderPengajuan() {
  const container = document.getElementById('pengajuan-list');
  container.innerHTML = '<p class="text-gray-400 text-sm">Memuat...</p>';
  try {
    const res = await fetch(API_BASE + '/api/admin/pengajuan');
    const data = await res.json();
    const list = data.data || [];
    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = '<p class="text-gray-400 text-sm">Belum ada pengajuan surat.</p>';
      return;
    }
    list.forEach(item => {
      const div = document.createElement('div');
      div.className = 'bg-gray-50 rounded p-3 flex items-center justify-between gap-3';
      div.innerHTML = `
<div class="flex-1">
          <p class="font-medium">${item.nama} - ${item.jenisSurat}</p>
          <p class="text-xs text-gray-400">${item.tanggal} | NIK: ${item.ktp} | HP/WA: ${item.hp || '-'} | ${item.alamat}</p>
        </div>
        <button class="delete-pengajuan bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 text-sm" data-id="${item.id}">Hapus</button>
      `;
      container.appendChild(div);
    });
    container.querySelectorAll('.delete-pengajuan').forEach(btn => {
      btn.addEventListener('click', async () => {
        await fetch(API_BASE + '/api/admin/pengajuan/' + btn.dataset.id, { method: 'DELETE' });
        renderPengajuan();
      });
    });
  } catch (e) {
    container.innerHTML = '<p class="text-gray-400 text-sm">Gagal memuat pengajuan.</p>';
  }
}

async function renderKeluhan() {
  const container = document.getElementById('keluhan-list');
  if (!container) return;
  container.innerHTML = '<p class="text-gray-400 text-sm">Memuat...</p>';
  try {
    const res = await fetch(API_BASE + '/api/admin/keluhan');
    const data = await res.json();
    const list = data.data || [];
    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = '<p class="text-gray-400 text-sm">Belum ada keluhan masuk.</p>';
      return;
    }
    list.forEach(item => {
      const div = document.createElement('div');
      div.className = 'bg-gray-50 rounded p-4 border-l-4 border-amber-500';
      const buktiImg = item.bukti
        ? `<img src="${escapeHtml(item.bukti)}" alt="Bukti" class="keluhan-bukti-img admin-img-clickable max-w-xs max-h-48 object-contain bg-white rounded-xl border border-gray-200 p-1 shadow-xs hover:border-amber-500 transition-colors mt-2">`
        : '<p class="text-xs text-gray-400 mt-2">Tidak ada foto bukti.</p>';
      div.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <p class="font-semibold text-amber-700">${item.judul}</p>
            <p class="text-xs text-gray-400 mt-1">${item.tanggal} | Status: ${item.status}</p>
            <p class="text-sm mt-2"><span class="font-medium">Pelapor:</span> ${item.nama} (${item.hp || '-'})</p>
            <p class="text-sm mt-1"><span class="font-medium">Lokasi & Waktu:</span> ${item.lokasi}</p>
            <p class="text-sm mt-2 text-gray-700 whitespace-pre-line">${item.kronologi}</p>
            ${buktiImg}
          </div>
          <button class="delete-keluhan bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 text-sm whitespace-nowrap" data-id="${item.id}">Hapus</button>
        </div>
      `;
      container.appendChild(div);
      const buktiEl = div.querySelector('img.keluhan-bukti-img');
      if (buktiEl) {
        // Bukti keluhan adalah lampiran publik: hanya bisa dilihat, tidak bisa diganti/hapus.
        enableImagePreview(buktiEl, { caption: 'Bukti Foto Keluhan' + (item.judul ? ' — ' + item.judul : '') });
      }
    });
    container.querySelectorAll('.delete-keluhan').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Yakin ingin menghapus keluhan ini?')) return;
        await fetch(API_BASE + '/api/admin/keluhan/' + btn.dataset.id, { method: 'DELETE' });
        adminToast('Keluhan berhasil dihapus', 'success');
        renderKeluhan();
      });
    });
  } catch (e) {
    container.innerHTML = '<p class="text-gray-400 text-sm">Gagal memuat keluhan.</p>';
  }
}

// =====================================================================
// ===== MODAL PREVIEW GAMBAR BESAR (klik gambar mana pun di admin) =====
// =====================================================================
const photoModal = document.getElementById('photo-preview-modal');
const photoModalImg = document.getElementById('photo-preview-img');
const photoModalCaption = document.getElementById('photo-preview-caption');
const photoModalActions = document.getElementById('photo-preview-actions');
const photoReplaceBtn = document.getElementById('photo-replace-btn');
const photoRemoveBtn = document.getElementById('photo-remove-btn');
const photoCloseBtn = document.getElementById('photo-preview-close');
const photoReplaceInput = document.getElementById('photo-replace-input');

let photoCtx = null;

function openPhotoModal(ctx) {
  if (!photoModal || !ctx || !ctx.src) return;
  photoCtx = ctx;
  if (photoModalImg) {
    photoModalImg.src = ctx.src;
    photoModalImg.alt = ctx.caption || 'Pratinjau Gambar';
  }
  if (photoModalCaption) photoModalCaption.textContent = ctx.caption || '';
  const editable = !!(ctx.onChange || ctx.onRemove);
  if (photoModalActions) photoModalActions.classList.toggle('hidden', !editable);
  if (photoReplaceBtn) photoReplaceBtn.classList.toggle('hidden', !ctx.onChange);
  if (photoRemoveBtn) photoRemoveBtn.classList.toggle('hidden', !ctx.onRemove);
  photoModal.classList.remove('hidden');
  photoModal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closePhotoModal() {
  if (!photoModal) return;
  photoModal.classList.add('hidden');
  photoModal.classList.remove('flex');
  if (photoModalImg) photoModalImg.removeAttribute('src');
  if (photoReplaceInput) photoReplaceInput.value = '';
  photoCtx = null;
  document.body.style.overflow = '';
}

photoCloseBtn?.addEventListener('click', closePhotoModal);
photoModal?.addEventListener('click', (e) => {
  if (e.target === photoModal) closePhotoModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && photoModal && !photoModal.classList.contains('hidden')) closePhotoModal();
});

photoReplaceBtn?.addEventListener('click', () => photoReplaceInput?.click());
photoReplaceInput?.addEventListener('change', async () => {
  const f = photoReplaceInput.files[0];
  const ctx = photoCtx;
  if (!f || !ctx || typeof ctx.onChange !== 'function') return;
  photoReplaceInput.value = '';
  closePhotoModal();
  await ctx.onChange(f);
});

photoRemoveBtn?.addEventListener('click', async () => {
  const ctx = photoCtx;
  if (!ctx || typeof ctx.onRemove !== 'function') return;
  if (!confirm('Hapus foto ini dari data yang dipilih?\n\nData/record-nya TETAP tersimpan — hanya fotonya yang dikosongkan.')) return;
  closePhotoModal();
  await ctx.onRemove();
});

// Pasang perilaku klik-untuk-preview pada satu elemen <img>.
// handlers: { caption, onChange(file), onRemove() } — onChange/onRemove opsional
// (jika keduanya absen, modal muncul dalam mode lihat-saja).
function enableImagePreview(imgEl, handlers = {}) {
  if (!imgEl) return;
  imgEl.classList.add('admin-img-clickable');
  imgEl.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const src = imgEl.getAttribute('src');
    if (!src) return;
    openPhotoModal({
      src,
      caption: handlers.caption || '',
      onChange: typeof handlers.onChange === 'function' ? handlers.onChange : null,
      onRemove: typeof handlers.onRemove === 'function' ? handlers.onRemove : null
    });
  });
}

function triggerSave(btnId) {
  const btn = document.getElementById(btnId);
  if (btn) btn.click();
}

// Ganti foto pada baris dinamis (perangkat desa / potensi desa):
// upload -> update state baris -> simpan seksi lewat tombol Simpan yang sama.
async function replaceDynamicRowPhoto(row, file, mountFn, saveBtnId) {
  const url = await uploadFile(file);
  if (!url) return;
  row.dataset.savedFoto = url;
  const fotoInput = row.querySelector('[data-foto-input], [data-field="foto"]');
  if (fotoInput) {
    fotoInput.value = '';
    const nameSpan = row.querySelector('.file-name');
    if (nameSpan) { nameSpan.textContent = 'No file chosen'; nameSpan.classList.remove('has-file'); }
  }
  mountFn(row, url);
  triggerSave(saveBtnId);
}

// Hapus foto pada baris dinamis: record tetap ada, hanya fotonya dikosongkan.
async function removeDynamicRowPhoto(row, mountEmptyFn, saveBtnId) {
  row.dataset.savedFoto = '';
  const fotoInput = row.querySelector('[data-foto-input], [data-field="foto"]');
  if (fotoInput) {
    fotoInput.value = '';
    const nameSpan = row.querySelector('.file-name');
    if (nameSpan) { nameSpan.textContent = 'No file chosen'; nameSpan.classList.remove('has-file'); }
  }
  mountEmptyFn();
  triggerSave(saveBtnId);
}

// Pratinjau statis yang terikat form (Profil & Kepala Desa).
// Ganti/Hapus memutakhirkan state form lalu memicu tombol Simpan seksi tersebut,
// sehingga persistensinya identik dengan menekan Simpan secara manual.
function bindFormPhotoPreview(imgId, opts) {
  const img = document.getElementById(imgId);
  if (!img) return;
  enableImagePreview(img, {
    caption: opts.caption,
    onChange: async (file) => {
      const up = await uploadFile(file);
      if (!up) return;
      img.src = up;
      img.dataset.savedUrl = up;
      clearFileInput(opts.fileInputId);
      triggerSave(opts.saveBtnId);
    },
    onRemove: async () => {
      img.removeAttribute('src');
      delete img.dataset.savedUrl;
      clearFileInput(opts.fileInputId);
      triggerSave(opts.saveBtnId);
    }
  });
}

bindFormPhotoPreview('p-logo-preview', { fileInputId: 'p-logo-file', caption: 'Logo Desa', saveBtnId: 'save-profil' });
bindFormPhotoPreview('p-hero-preview', { fileInputId: 'p-hero-file', caption: 'Foto Hero (Banner Beranda)', saveBtnId: 'save-profil' });
bindFormPhotoPreview('p-tentang-preview', { fileInputId: 'p-tentang-file', caption: 'Foto Tentang Desa', saveBtnId: 'save-profil' });
bindFormPhotoPreview('p-panel-foto-preview', { fileInputId: 'p-panel-foto-file', caption: 'Foto Profil Panel Admin', saveBtnId: 'save-profil' });
bindFormPhotoPreview('kd-foto-preview', { fileInputId: 'kd-foto-file', caption: 'Foto Kepala Desa', saveBtnId: 'save-pemerintahan' });

document.querySelectorAll('.admin-file-input input[type="file"]').forEach(input => {
  input.addEventListener('change', () => {
    const nameSpan = input.closest('.admin-file-input').querySelector('.file-name');
    if (input.files && input.files.length) {
      const names = Array.from(input.files).map(f => f.name).join(', ');
      nameSpan.textContent = names;
      nameSpan.classList.add('has-file');
    } else {
      nameSpan.textContent = 'No file chosen';
      nameSpan.classList.remove('has-file');
    }
  });
});

checkSession();
