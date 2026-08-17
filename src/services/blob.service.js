// src/services/blob.service.js
const fs = require('fs');
const path = require('path');
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
    '.webp': 'image/webp'
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
      contentType: guessContentType(filename),
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return result.url;
  } catch (err) {
    console.error('[Blob] Gagal upload ke Vercel Blob: ' + (err.message || err));
    return null;
  }
}

module.exports = { isBlobAvailable, putFileToBlob };