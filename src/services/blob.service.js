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
      access: 'private',
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

async function getBlob(key) {
  if (!isBlobAvailable()) return null;
  try {
    if (!blobClient) blobClient = require('@vercel/blob');
    return await blobClient.get(key, { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch (err) {
    console.warn('[Blob] Gagal ambil ' + key + ' dari Vercel Blob: ' + (err.message || err));
    return null;
  }
}

async function fetchBlobText(key) {
  const blob = await getBlob(key);
  if (!blob || !blob.stream) return null;
  const res = new Response(blob.stream);
  return await res.text();
}

async function streamBlobFile(res, key) {
  const blob = await getBlob(key);
  if (!blob || !blob.stream) return false;
  const nodeStream = Readable.fromWeb(blob.stream);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.set('Content-Type', (blob.blob && blob.blob.contentType) || 'application/octet-stream');
  nodeStream.on('error', () => res.status(500).end());
  nodeStream.pipe(res);
  return true;
}

module.exports = { isBlobAvailable, putFileToBlob, putJsonToBlob, fetchBlobText, streamBlobFile };