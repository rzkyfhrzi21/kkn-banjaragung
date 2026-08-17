// server.js - Pekon Banjar Agung Main Server Entrypoint
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const {
  IS_VERCEL,
  ROOT_DIR,
  UPLOAD_DIR,
  STATIC_UPLOAD_DIR,
  PUBLIC_DIR
} = require('./src/config/constants');

const {
  securityHeaders,
  apiLimiter,
  adminLimiter
} = require('./src/middleware/security.middleware');

const { resetLoginAttempts } = require('./src/middleware/auth.middleware');

const publicRoutes = require('./src/routes/public.routes');
const adminRoutes = require('./src/routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.set('trust proxy', 1);

// ===== 1. Security & Body Parsing Middlewares =====
app.use(securityHeaders);

// CORS: allow whitelist if specified, otherwise allow all
if (process.env.CORS_ORIGIN) {
  const allow = process.env.CORS_ORIGIN.split(',').map(s => s.trim());
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      cb(null, allow.includes(origin));
    }
  }));
} else {
  app.use(cors());
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== 2. SEO & Robots Headers =====
app.get('/robots.txt', (req, res) => {
  const robotsPath = path.join(ROOT_DIR, 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    res.type('text/plain').sendFile(robotsPath);
  } else {
    res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://banjaragung-tanggamus.web.id/sitemap.xml');
  }
});

app.get('/sitemap.xml', (req, res) => {
  const sitemapPath = path.join(ROOT_DIR, 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    res.type('application/xml').sendFile(sitemapPath);
  } else {
    res.status(404).send('Sitemap not found');
  }
});

// Privacy & SEO Header Isolation for Admin & API Routes
app.use('/admin.html', (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  next();
});
app.use('/api', (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  next();
});

// ===== 3. Rate Limiters & Static Files =====
app.use('/api', apiLimiter);
app.use('/api/admin', adminLimiter);

app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOAD_DIR));
if (IS_VERCEL) {
  app.use('/uploads', express.static(STATIC_UPLOAD_DIR));
}

// ===== 4. API Routes =====
app.use(publicRoutes);
app.use(adminRoutes);

// ===== 5. Global Error Handling Middleware =====
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ success: false, message: err.message || 'Terjadi kesalahan pada request' });
  }
  next();
});

// Helper for test suites
app._resetLoginAttempts = resetLoginAttempts;

// ===== 6. Server Initialization & Graceful Shutdown =====
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`[Pekon Banjar Agung] Server berjalan di http://localhost:${PORT}`);
  });

  const shutdown = () => {
    console.log('Shutting down server...');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
