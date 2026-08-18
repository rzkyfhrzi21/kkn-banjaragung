// src/services/blob.service.js
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { IS_VERCEL } = require('../config/constants');

let blobClient = null;

function isBlobAvailable() {
  return IS_VERCEL && !!process.env.BLOB_READ_WRITE_TOKEN;
}

function guessContentType(filename) {
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff'
  };
  return map[path.extname(filename).toLowerCase()] || 'application/octet-stream';
}

async function putFileToBlob(localPath) {
  if (!isBlobAvailable()) return null;
  try {
    if (!blobClient) blobClient = require('@vercel/blob');
    const filename = path.basename(localPath);
    const result = await blobClient.put('uploads/' + filename, fs.readFileSync(localPath), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: guessContentType(filename),
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return result.url;
  } catch (err) {
    console.error('[Blob] Gagal upload ke Vercel Blob: ' + (err.message || err));
    throw new Error('Penyimpanan file di server gagal (' + (err.message || 'unknown') + ')');
  }
}

async function putJsonToBlob(key, jsonText) {
  if (!isBlobAvailable()) return null;
  try {
    if (!blobClient) blobClient = require('@vercel/blob');
    const result = await blobClient.put(key, Buffer.from(jsonText, 'utf8'), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json; charset=utf-8',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return result.url;
  } catch (err) {
    console.error('[Blob] Gagal simpan ' + key + ' ke Vercel Blob: ' + (err.message || err));
    return null;
  }
}

// Hasil: { ok: true, notFound: boolean, data } atau { ok: false, error }
// notFound=true berarti blob memang belum ada (404) — aman untuk seed.
// ok=false berarti network/API error — JANGAN menimpa blob dengan data lain.
async function getBlob(key, attempt = 1) {
  if (!isBlobAvailable()) return { ok: false, error: 'blob unavailable' };
  try {
    if (!blobClient) blobClient = require('@vercel/blob');
    // v2: authorization header di-set otomatis dari env (token tidak perlu dikirim).
    // get() fetch LANGSUNG ke domain CDN store ({storeId}.public.blob.vercel-storage.com) —
    // store baru butuh waktu DNS/CDN provisioning, makanya ada retry.
    const result = await blobClient.get(key, { access: 'public' });
    if (!result) return { ok: true, notFound: true, data: null };
    return { ok: true, data: result };
  } catch (err) {
    const hint = /fetch failed|ENOTFOUND|EAI_AGAIN|UND_ERR_CONNECT/i.test(err && err.message)
      ? ' (domain CDN store belum siap/DNS — coba lagi dalam beberapa menit)'
      : '';
    console.warn('[Blob] Gagal ambil ' + key + ' dari Vercel Blob: ' + (err && err.message || err) + hint);
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return getBlob(key, attempt + 1);
    }
    return { ok: false, error: (err && err.message) || 'unknown' };
  }
}

// Hasil: { ok: true, text: string|null } atau { ok: false, error }
async function fetchBlobText(key) {
  try {
    const { ok, notFound, data: blob } = await getBlob(key);
    if (!ok) return { ok: false, error: 'fetch gagal' };
    if (notFound || !blob) return { ok: true, text: null };
    if (blob.stream) {
      const res = new Response(blob.stream);
      const text = await res.text();
      if (text) return { ok: true, text };
    }
    if (blob.blob && blob.blob.downloadUrl) {
      const r = await fetch(blob.blob.downloadUrl);
      if (r.ok) return { ok: true, text: await r.text() };
    }
    return { ok: true, text: null };
  } catch (err) {
    console.warn('[Blob] Gagal baca teks ' + key + ': ' + (err.message || err));
    return { ok: false, error: (err && err.message) || 'unknown' };
  }
}

async function streamBlobFile(res, key) {
  const { ok, notFound, data: blob } = await getBlob(key);
  if (!ok || notFound || !blob) return false;
  const contentType = (blob.blob && blob.blob.contentType) || 'application/octet-stream';
  if (blob.stream) {
    const nodeStream = Readable.fromWeb(blob.stream);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Content-Type', contentType);
    nodeStream.on('error', () => res.status(500).end());
    nodeStream.pipe(res);
    return true;
  }
  if (blob.blob && blob.blob.downloadUrl) {
    const r = await fetch(blob.blob.downloadUrl);
    if (!r.ok) return false;
    const nodeStream = Readable.fromWeb(r.body);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Content-Type', contentType);
    nodeStream.on('error', () => res.status(500).end());
    nodeStream.pipe(res);
    return true;
  }
  return false;
}

module.exports = { isBlobAvailable, putFileToBlob, putJsonToBlob, fetchBlobText, streamBlobFile };