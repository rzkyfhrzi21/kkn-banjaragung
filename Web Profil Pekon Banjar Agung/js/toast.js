/**
 * Web Profil Pekon Banjar Agung - Universal Toast & Upload Notification Module
 * @module toast
 */

(function (global) {
  'use strict';

  function getToastContainer() {
    let container = document.getElementById('pekon-toast-container') ||
                    document.getElementById('admin-toast-container') ||
                    document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pekon-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Menampilkan toast notification universal
   * @param {string} message - Pesan notifikasi
   * @param {'success'|'error'|'warning'|'info'} [type='info'] - Jenis toast
   * @param {string} [customTitle] - Judul custom
   * @param {number} [duration=4000] - Durasi tampil (ms)
   */
  function showToast(message, type = 'info', customTitle = '', duration = 4000) {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `pekon-toast toast-${type}`;

    const icons = {
      success: `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
      error: `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
      warning: `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
      info: `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
    };

    const titles = {
      success: 'Berhasil',
      error: 'Terjadi Kesalahan',
      warning: 'Peringatan',
      info: 'Informasi'
    };

    const titleText = customTitle || titles[type] || 'Notifikasi';

    toast.innerHTML = `
      <div class="toast-icon-wrap">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-title">${titleText}</div>
        <div class="toast-msg">${message}</div>
      </div>
      <button type="button" class="toast-close" aria-label="Tutup notifikasi">&times;</button>
      <div class="toast-progress"><div class="toast-progress-bar"></div></div>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    const removeToast = () => {
      if (toast.classList.contains('removing')) return;
      toast.classList.add('removing');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    };

    if (closeBtn) closeBtn.addEventListener('click', removeToast);
    if (duration > 0) setTimeout(removeToast, duration);
  }

  /**
   * Menampilkan toast live upload progress dengan spinner dan progress bar
   * @param {string} fileName - Nama berkas yang sedang diupload
   * @returns {{ updateProgress: Function, finishSuccess: Function, finishError: Function }}
   */
  function createUploadProgressToast(fileName = 'berkas') {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = 'pekon-toast toast-upload';

    toast.innerHTML = `
      <div class="toast-icon-wrap">
        <svg class="toast-icon toast-spinner text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
      </div>
      <div class="toast-content" style="flex:1;">
        <div class="toast-title flex items-center justify-between text-xs font-semibold">
          <span class="truncate max-w-[170px]">Mengunggah ${fileName}...</span>
          <span class="toast-upload-pct text-blue-600 font-bold ml-1">0%</span>
        </div>
        <div class="toast-upload-bar-track">
          <div class="toast-upload-bar-fill"></div>
        </div>
      </div>
    `;

    container.appendChild(toast);

    const pctSpan = toast.querySelector('.toast-upload-pct');
    const barFill = toast.querySelector('.toast-upload-bar-fill');

    return {
      updateProgress: function (percent) {
        const p = Math.min(100, Math.max(0, Math.round(percent)));
        if (pctSpan) pctSpan.textContent = p + '%';
        if (barFill) barFill.style.width = p + '%';
      },
      finishSuccess: function (msg = 'Upload selesai!') {
        toast.className = 'pekon-toast toast-success';
        toast.innerHTML = `
          <div class="toast-icon-wrap">
            <svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          </div>
          <div class="toast-content">
            <div class="toast-title">Upload Berhasil</div>
            <div class="toast-msg">${msg}</div>
          </div>
        `;
        setTimeout(() => {
          toast.classList.add('removing');
          setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
        }, 2000);
      },
      finishError: function (errMsg = 'Upload gagal.') {
        toast.className = 'pekon-toast toast-error';
        toast.innerHTML = `
          <div class="toast-icon-wrap">
            <svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </div>
          <div class="toast-content">
            <div class="toast-title">Upload Gagal</div>
            <div class="toast-msg">${errMsg}</div>
          </div>
        `;
        setTimeout(() => {
          toast.classList.add('removing');
          setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 4000);
        }, 4000);
      }
    };
  }

  // Export to global window namespace
  global.showToast = showToast;
  global.createUploadProgressToast = createUploadProgressToast;
  global.adminToast = showToast;

})(typeof window !== 'undefined' ? window : this);
