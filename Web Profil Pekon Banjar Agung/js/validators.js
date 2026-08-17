/**
 * Web Profil Pekon Banjar Agung - Client Validation & Sanitization Module
 * @module validators
 */

(function (global) {
  'use strict';

  const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const DANGEROUS_EXTS_REGEX = /\.(php|phtml|phar|inc|sh|bash|exe|cgi|pl|jsp|asp|aspx|htaccess|py|rb|svg)/i;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  /**
   * Memvalidasi berkas upload di sisi frontend sebelum dikirim ke backend
   * @param {File} file - Berkas yang dipilih
   * @returns {{ valid: boolean, message?: string }}
   */
  function validateFileClient(file) {
    if (!file) {
      return { valid: false, message: 'Silakan pilih berkas terlebih dahulu.' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, message: 'Ukuran berkas maksimal 5MB. Silakan pilih foto lain.' };
    }

    const name = file.name.toLowerCase();
    const lastDot = name.lastIndexOf('.');
    if (lastDot === -1) {
      return { valid: false, message: 'Berkas tidak memiliki ekstensi yang valid.' };
    }

    const ext = name.substring(lastDot);
    if (!ALLOWED_EXTS.includes(ext)) {
      return { valid: false, message: 'Format berkas tidak didukung. Harap upload gambar (JPG, PNG, GIF, WebP).' };
    }

    const nameWithoutExt = name.substring(0, lastDot);
    if (DANGEROUS_EXTS_REGEX.test(nameWithoutExt)) {
      return { valid: false, message: 'Nama berkas terdeteksi mencurigakan. Unggahan dibatalkan demi keamanan.' };
    }

    return { valid: true };
  }

  /**
   * Sanitasi string teks client-side untuk mencegah injeksi script berbahaya
   * @param {string} str - Teks input
   * @returns {string}
   */
  function sanitizeClientInput(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  global.validateFileClient = validateFileClient;
  global.sanitizeClientInput = sanitizeClientInput;

})(typeof window !== 'undefined' ? window : this);
