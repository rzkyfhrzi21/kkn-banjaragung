// server.js - Pekon Banjar Agung Main Server Entrypoint
require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const {
  IS_VERCEL,
  ROOT_DIR,
  UPLOAD_DIR,
  STATIC_UPLOAD_DIR,
  PUBLIC_DIR,
} = require("./src/config/constants");

const {
  securityHeaders,
  apiLimiter,
  adminLimiter,
} = require("./src/middleware/security.middleware");

const { resetLoginAttempts } = require("./src/middleware/auth.middleware");

const { syncDataFromBlob } = require("./src/services/storage.service");

const publicRoutes = require("./src/routes/public.routes");
const adminRoutes = require("./src/routes/admin.routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.set("trust proxy", 1);

// ===== 1. Security & Body Parsing Middlewares =====
app.use(securityHeaders);

// CORS: allow whitelist if specified; otherwise restrict to official domain + localhost dev
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : [];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsOrigin.length > 0) return cb(null, corsOrigin.includes(origin));
      const safe =
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$|^https:\/\/banjaragung-tanggamus\.web\.id$/.test(
          origin,
        );
      return cb(null, safe);
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== 2. SEO & Robots Headers =====
app.get("/robots.txt", (req, res) => {
  const robotsPath = path.join(ROOT_DIR, "robots.txt");
  if (fs.existsSync(robotsPath)) {
    res.type("text/plain").sendFile(robotsPath);
  } else {
    res
      .type("text/plain")
      .send(
        "User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://banjaragung-tanggamus.web.id/sitemap.xml",
      );
  }
});

app.get("/sitemap.xml", (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];
  try {
    const files = fs
      .readdirSync(PUBLIC_DIR)
      .filter((f) => f.endsWith(".html") && f !== "admin.html")
      .sort();
    for (const f of files) {
      const page = f === "index.html" ? "" : f;
      const priority =
        f === "index.html"
          ? "1.0"
          : [
                "profil.html",
                "pemerintahan.html",
                "layanan-publik.html",
                "kontak.html",
              ].includes(f)
            ? "0.8"
            : "0.6";
      urls.push(
        `  <url>\n    <loc>https://banjaragung-tanggamus.web.id/${page}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${f === "index.html" ? "daily" : "weekly"}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
      );
    }
  } catch (err) {
    return res.status(500).send("Sitemap error");
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
  res.type("application/xml").send(xml);
});

// Privacy & SEO Header Isolation for Admin & API Routes
app.use("/admin.html", (req, res, next) => {
  res.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  next();
});
app.use("/api", (req, res, next) => {
  res.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  next();
});

// ===== 3. Rate Limiters & Static Files =====
app.use("/api", apiLimiter);
app.use("/api/admin", adminLimiter);

app.use(express.static(PUBLIC_DIR));
app.use("/uploads", express.static(UPLOAD_DIR));
if (IS_VERCEL) {
  app.use("/uploads", express.static(STATIC_UPLOAD_DIR));

  // Proxy: file upload yang sudah dipersist ke Vercel Blob Storage (store private)
  // diserve lewat endpoint ini dengan cache edge yang lama.
  const { streamBlobFile } = require("./src/services/blob.service");
  app.get("/uploads/:file", async (req, res) => {
    const file = req.params.file;
    if (!/^[A-Za-z0-9._-]+$/.test(file)) return res.status(400).end();
    try {
      const ok = await streamBlobFile(res, "uploads/" + file);
      if (!ok) res.status(404).end();
    } catch (err) {
      res.status(500).end();
    }
  });
}

// ===== 4. API Routes =====
app.use(publicRoutes);
app.use(adminRoutes);

// ===== 4b. Custom 404 (API -> JSON, Halaman -> HTML bertema) =====
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res
      .status(404)
      .json({ success: false, message: "Endpoint tidak ditemukan." });
  }
  res.status(404).type("html").send(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>404 - Halaman Tidak Ditemukan | Pekon Banjar Agung</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#7f1d1d,#991b1b,#b91c1c);font-family:Poppins,Arial,sans-serif;color:#fff;text-align:center;padding:24px}
  .box{max-width:480px}
  h1{font-size:88px;margin:0;line-height:1;text-shadow:0 8px 32px rgba(0,0,0,.35)}
  h2{font-size:22px;margin:12px 0 8px;font-weight:600}
  p{font-size:14px;opacity:.85;margin:0 0 24px;line-height:1.6}
  a{display:inline-block;background:#fff;color:#7f1d1d;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:9999px;transition:transform .2s}
  a:hover{transform:translateY(-2px)}
</style>
</head>
<body>
<div class="box">
  <h1>404</h1>
  <h2>Halaman Tidak Ditemukan</h2>
  <p>Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.</p>
  <a href="/">Kembali ke Beranda</a>
</div>
</body>
</html>`);
});

// ===== 5. Global Error Handling Middleware =====
app.use((err, req, res, next) => {
  if (err) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({
          success: false,
          message: "File terlalu besar. Ukuran maksimal 4MB.",
          code: "LIMIT_FILE_SIZE",
        });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Field upload tidak dikenali. Gunakan field "foto".',
          code: "LIMIT_UNEXPECTED_FILE",
        });
    }
    return res
      .status(400)
      .json({
        success: false,
        message: err.message || "Terjadi kesalahan pada request",
      });
  }
  next();
});

// Helper for test suites
app._resetLoginAttempts = resetLoginAttempts;

// ===== 6. Server Initialization & Graceful Shutdown =====
if (process.env.VERCEL) {
  syncDataFromBlob().catch(() => {});
} else if (process.env.NODE_ENV !== "test") {
  const server = app.listen(PORT, () => {
    console.log(
      `[Pekon Banjar Agung] Server berjalan di http://localhost:${PORT}`,
    );
  });

  const shutdown = () => {
    console.log("Shutting down server...");
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

module.exports = app;
