// src/config/constants.js
const path = require('path');

const IS_VERCEL = !!process.env.VERCEL;
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'data') : path.join(ROOT_DIR, 'data');
const UPLOAD_DIR = IS_VERCEL ? path.join('/tmp', 'uploads') : path.join(ROOT_DIR, 'uploads');
const STATIC_UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
const BUNDLED_DATA_FILE = path.join(ROOT_DIR, 'data', 'data.json');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const DB_FILE = path.join(DATA_DIR, 'app.db');
const PUBLIC_DIR = path.join(ROOT_DIR, 'Web Profil Pekon Banjar Agung');

const USE_SQLITE = String(process.env.USE_SQLITE).toLowerCase() === 'true';

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const DANGEROUS_EXTENSIONS_PATTERN = /\.(php|phtml|phar|inc|sh|bash|exe|cgi|pl|jsp|asp|aspx|htaccess|py|rb|svg)/i;

const DANGEROUS_BINARY_SIGNATURES = [
  '<?php', '<?=', '<%', '<script', 'eval(', 'base64_decode(', 'passthru(',
  'shell_exec(', 'system(', 'popen(', 'proc_open(', 'assert('
];

module.exports = {
  IS_VERCEL,
  ROOT_DIR,
  DATA_DIR,
  UPLOAD_DIR,
  STATIC_UPLOAD_DIR,
  BUNDLED_DATA_FILE,
  DATA_FILE,
  DB_FILE,
  PUBLIC_DIR,
  USE_SQLITE,
  ALLOWED_IMAGE_EXTENSIONS,
  DANGEROUS_EXTENSIONS_PATTERN,
  DANGEROUS_BINARY_SIGNATURES
};
