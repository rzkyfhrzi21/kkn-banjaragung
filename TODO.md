# TODO - Fitur Website Pekon Banjar Agung

## 1. Web Push Notifications (Chrome/Android)
- [ ] Server: Setup VAPID keys (web-push) di server.js
- [ ] Server: Endpoint subscribe/unsubscribe/vapidPublicKey
- [ ] Server: Simpan subscriptions di push-data.json
- [ ] Server: Kirim notifikasi otomatis saat pengumuman diupload
- [ ] Server: Scheduler kirim notifikasi posyandu H-1
- [ ] File baru: service-worker.js (public)
- [ ] File baru: manifest.json (PWA)
- [ ] Client script.js: daftarkan service worker, minta izin, subscribe
- [ ] Tambah tombol "Aktifkan Notifikasi" di website

## 2. Posyandu Balita & Lansia updateable
- [x] Struktur data posyandu.balita[] & lansia[] di data.json
- [x] Admin: form kelola balita & lansia di admin.html
- [x] Admin: logika simpan di admin.js
- [x] Publik: render tabel dinamis di jadwal-posyandu.html

## 3. Data Kependudukan updateable
- [ ] Struktur data kelompokUmur[] & pendidikan[]
- [ ] Admin: form kelola di admin.html
- [ ] Admin: logika simpan di admin.js
- [ ] Publik: render tabel dinamis di data-kependudukan.html

## 4. Arsip Perdes updateable
- [ ] Struktur data perdes[] & perkades[]
- [ ] Admin: form kelola di admin.html
- [ ] Admin: logika simpan di admin.js
- [ ] Publik: render tabel dinamis di arsip-perdes.html

## 5. Testing
- [ ] Restart server
- [ ] Test di browser Chrome

