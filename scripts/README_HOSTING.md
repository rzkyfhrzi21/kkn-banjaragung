Hosting & Database setup for Pekon Banjar Agung website

Overview

- This project currently stores site data in data/data.json. For hosting a simple website one can keep using the JSON file. For more robust hosting and updates, SQLite is a good lightweight choice (recommended).

What was created for you

- scripts/init_sqlite.sql -> SQL script to create a minimal SQLite DB (table `app`) and seed it with the full contents of data/data.json.
  - To run: install sqlite3 on your host (or use a machine that has it) and run: `sqlite3 data/data.db < scripts/init_sqlite.sql`
  - The SQL stores the entire JSON payload in a single row (id=1) in `app.data` as text. This is convenient for quick migration and hosting.

How to use SQLite in production (recommended)

1. Create database on the host:
   - On the host machine (Linux/macOS/Windows with sqlite3 installed):
     mkdir -p data
     sqlite3 data/data.db < scripts/init_sqlite.sql
   - Confirm creation: `sqlite3 data/data.db "SELECT id, length(data) FROM app;"`

2. Read data from SQLite in your Node server (suggested approach)
   - Option A (minimal change): keep current JSON-based code. Add a startup step that if DATA_DIR/data.db exists, use sqlite3 CLI to export the JSON into data/data.json before starting server. This requires sqlite3 on the host.
   - Option B (preferred): modify server.js to load from SQLite using a Node SQLite library (e.g., sqlite3 or better-sqlite3). Example snippet (install dependency):

   npm install sqlite3 --save

   // sample usage in server.js
   const sqlite3 = require('sqlite3').verbose();
   const DB_FILE = path.join(\_\_dirname, 'data', 'data.db');
   function loadDataFromDb() {
   if (!fs.existsSync(DB_FILE)) return null;
   const db = new sqlite3.Database(DB_FILE);
   return new Promise((resolve, reject) => {
   db.get('SELECT data FROM app WHERE id = 1', (err, row) => {
   db.close();
   if (err) return reject(err);
   try { const parsed = JSON.parse(row.data); resolve(parsed); } catch (e) { resolve(null); }
   });
   });
   }

   // then use loadDataFromDb() at startup (async) and fall back to data.json if DB missing

3. Keep backups: schedule a cron job / Windows Task Scheduler to dump DB to a file or export JSON periodically.

Hosting options & steps

- Small / cheap hosting (static + small Node server):
  - DigitalOcean App Platform or a small Droplet: push repo to GitHub, create Droplet, clone repo, install Node, run `npm install`, create DB with sqlite3, start server with PM2 or systemd.
  - Render / Fly.io: deploy Node service (Render has a free tier for web services). Add `sqlite3` to build if using DB management in-node.
  - Heroku: can run Node but Heroku filesystem is ephemeral — sqlite DB will be lost after dyno restart. Instead use managed DB (Postgres). If you want to host on Heroku, use Postgres and migrate data there.

- Static-only (no backend) — if you remove server functionality and keep only static site, use Netlify / Vercel / GitHub Pages. But admin APIs and uploads will not work without a backend.

Typical VPS (DigitalOcean) step-by-step (recommended for full feature parity):

1. Provision VPS (Ubuntu 22.04) with SSH
2. Install Node and sqlite3: `sudo apt update && sudo apt install -y nodejs npm sqlite3` (or use NodeSource to install modern Node)
3. Clone repo: `git clone <your-repo> && cd repo`
4. Install dependencies: `npm install` (server uses express, multer, web-push — included in package.json)
5. Create uploads & data dirs if missing and populate DB:
   mkdir -p data uploads
   sqlite3 data/data.db < scripts/init_sqlite.sql
6. Start app under process manager: `npm install -g pm2` then `pm2 start server.js --name pekon-banjar-agung`
7. Configure domain and reverse proxy (nginx) to forward port 80/443 to your app port (3000) and add SSL via certbot.

How to update site after hosted

- If using Git-backed host: push to git remote and trigger deployment (CI/CD) — host provider typically rebuilds and restarts.
- If using VPS with PM2:
  1. Pull latest changes: `git pull origin main` on the server
  2. Install new deps if package.json changed: `npm install`
  3. If DB schema changed, run migration scripts (e.g., `sqlite3 data/data.db < scripts/migration.sql`)
  4. Restart app: `pm2 restart pekon-banjar-agung`
- For static changes only (no backend change), you can upload updated files to the server (rsync or FTP) and reload the web server.

Notes & caveats

- Heroku / ephemeral filesystems: do not rely on sqlite or local uploads — use managed DB and object storage.
- If you use sqlite DB and also allow uploads, ensure backups of data/ and uploads/ directories.

If you want, I can:

- Patch server.js to read from SQLite automatically (I'll modify server.js and add dependency notes)
- Add a Node migration script that programmatically creates data/data.db from data/data.json (so you can run it locally)
- Just keep the SQL file and instructions and I'll start the server now (no code change)
