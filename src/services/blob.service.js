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

async function getBlob(key, attempt = 1) {
  if (!isBlobAvailable()) return null;
  try {
    if (!blobClient) blobClient = require('@vercel/blob');
    // v2: authorization header di-set otomatis dari env (token tidak perlu dikirim).
    // get() fetch LANGSUNG ke domain CDN store ({storeId}.public.blob.vercel-storage.com) —
    // store baru butuh waktu DNS/CDN provisioning, makanya ada retry.
    return await blobClient.get(key, { access: 'public' });
  } catch (err) {
    const hint = /fetch failed|ENOTFOUND|EAI_AGAIN|UND_ERR_CONNECT/i.test(err && err.message)
      ? ' (domain CDN store belum siap/DNS — coba lagi dalam beberapa menit)'
      : '';
    console.warn('[Blob] Gagal ambil ' + key + ' dari Vercel Blob: ' + (err && err.message || err) + hint);
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return getBlob(key, attempt + 1);
    }
    return null;
  }
}

async function fetchBlobText(key) {
  try {
    const blob = await getBlob(key);
    if (!blob) return null;
    if (blob.stream) {
      const res = new Response(blob.stream);
      const text = await res.text();
      if (text) return text;
    }
    if (blob.blob && blob.blob.downloadUrl) {
      const r = await fetch(blob.blob.downloadUrl);
      if (r.ok) return await r.text();
    }
    return null;
  } catch (err) {
    console.warn('[Blob] Gagal baca teks ' + key + ': ' + (err.message || err));
    return null;
  }
}

async function streamBlobFile(res, key) {
  const blob = await getBlob(key);
  if (!blob) return false;
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