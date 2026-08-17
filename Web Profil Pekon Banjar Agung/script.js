 const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const menuClose = document.getElementById('menu-close');

menuToggle?.addEventListener('click', () => {
    mobileMenu.classList.remove('hidden');
});
menuClose?.addEventListener('click', () => {
    mobileMenu.classList.add('hidden');
});

mobileMenu?.addEventListener('click', (e) => {
    if (e.target === mobileMenu) {
        mobileMenu.classList.add('hidden');
    }
});

(async function loadPublicGaleri() {
    const grids = {
        'galeri-grid-1': 'galeri1',
        'galeri-grid-2': 'galeri2',
        'galeri-grid-3': 'galeri3'
    };
    try {
        const res = await fetch('/api/data');
        const data = await res.json();
        const g = data.galeri || {};
        Object.keys(grids).forEach(gridId => {
            const grid = document.getElementById(gridId);
            if (!grid) return;
            const key = grids[gridId];
            const list = (typeof g === 'object' && g[key]) || (Array.isArray(g) ? g : []);

            if (list && list.length) {
                grid.innerHTML = '';
                list.forEach(url => {
                    const div = document.createElement('div');
                    div.className = 'aspect-[4/3] bg-gray-200 rounded shadow overflow-hidden';
                    div.innerHTML = `<img src="${url}" alt="Galeri" class="object-cover w-full h-full">`;
                    grid.appendChild(div);
                });
            }
        });

        const galGrid = document.getElementById('galeri-grid');
        if (galGrid) {
  
            window.galeriData = {
                galeri1: (typeof g === 'object' && g.galeri1) || (Array.isArray(g) ? g : []),
                galeri2: (typeof g === 'object' && g.galeri2) || [],
                galeri3: (typeof g === 'object' && g.galeri3) || []
            };
            // Re-render gallery page if already initialized
            if (window.__refreshGaleri) window.__refreshGaleri();
        }
    } catch (err) {
        console.log('Galeri publik tetap memakai default.');
    }
})();

// ===== Galeri page tabs (single grid) =====
document.addEventListener('DOMContentLoaded', function () {
    const galGrid = document.getElementById('galeri-grid');
    if (!galGrid) return;

    const tabBtns = document.querySelectorAll('.galeri-tab');
    const pageBtns = document.querySelectorAll('.galeri-page-btn');
    const prevBtn = document.getElementById('galeri-prev');
    const nextBtn = document.getElementById('galeri-next');
    const catTitle = document.getElementById('galeri-category-title');
    const catDesc = document.getElementById('galeri-category-desc');

    const categories = [
        { key: 'galeri1', title: 'Kegiatan Desa', desc: 'Dokumentasi kegiatan desa' },
        { key: 'galeri2', title: 'Pembangunan', desc: 'Dokumentasi pembangunan desa' },
        { key: 'galeri3', title: 'Wisata & Budaya', desc: 'Dokumentasi wisata dan budaya desa' }
    ];

    // Default photos per category (fallback if no uploaded photos)
    const defaultPhotos = {
        galeri1: [
            'https://picsum.photos/id/159/400/300',
            'https://picsum.photos/id/108/400/300',
            'https://picsum.photos/id/109/400/300'
        ],
        galeri2: [
            'https://picsum.photos/id/110/400/300',
            'https://picsum.photos/id/112/400/300',
            'https://picsum.photos/id/114/400/300'
        ],
        galeri3: [
            'https://picsum.photos/id/120/400/300',
            'https://picsum.photos/id/124/400/300',
            'https://picsum.photos/id/127/400/300'
        ]
    };

    let currentPage = 1;

    function getPhotosForCategory(key) {
        const data = window.galeriData || {};
        const uploaded = data[key] || [];
        return uploaded.length ? uploaded : defaultPhotos[key];
    }

    function renderGrid(key) {
        const photos = getPhotosForCategory(key);
        galGrid.innerHTML = '';
        photos.forEach((url, idx) => {
            const div = document.createElement('div');
            div.className = 'aspect-[4/3] bg-gray-200 rounded shadow overflow-hidden';
            div.innerHTML = `<img src="${url}" alt="Galeri ${idx + 1}" class="object-cover w-full h-full">`;
            galGrid.appendChild(div);
        });
    }

    function setActivePage(page) {
        currentPage = page;
        const cat = categories[page - 1];

        // Update tabs
        tabBtns.forEach((btn, i) => {
            const active = i === page - 1;
            btn.classList.toggle('bg-green-700', active);
            btn.classList.toggle('text-white', active);
            btn.classList.toggle('bg-white', !active);
            btn.classList.toggle('text-green-700', !active);
            btn.classList.toggle('hover:bg-green-800', active);
            btn.classList.toggle('hover:bg-green-50', !active);
            const badge = btn.querySelector('span');
if (badge) {
                badge.classList.toggle('bg-white', active);
                badge.classList.toggle('text-green-700', active);
                badge.classList.toggle('bg-green-100', !active);
            }
        });

        // Update page number buttons
        pageBtns.forEach((btn, i) => {
            const active = i === page - 1;
            btn.classList.toggle('bg-green-700', active);
            btn.classList.toggle('text-white', active);
            btn.classList.toggle('border-green-700', active);
            btn.classList.toggle('border-2', active);
            btn.classList.toggle('bg-white', !active);
            btn.classList.toggle('text-gray-700', !active);
            btn.classList.toggle('border', !active);
        });

        // Update prev/next
        if (prevBtn) prevBtn.disabled = page === 1;
        if (nextBtn) nextBtn.disabled = page === categories.length;

        // Update title/desc
        if (catTitle) catTitle.textContent = cat.title;
        if (catDesc) catDesc.textContent = cat.desc;

        renderGrid(cat.key);
    }

    tabBtns.forEach((btn, i) => {
        btn.addEventListener('click', () => setActivePage(i + 1));
    });
    pageBtns.forEach((btn, i) => {
        btn.addEventListener('click', () => setActivePage(i + 1));
    });
    prevBtn?.addEventListener('click', () => {
        if (currentPage > 1) setActivePage(currentPage - 1);
    });
    nextBtn?.addEventListener('click', () => {
        if (currentPage < categories.length) setActivePage(currentPage + 1);
    });

    // Initialize
    setActivePage(1);

    // Expose refresh function so loadPublicGaleri can re-render after async fetch
    window.__refreshGaleri = function () {
        setActivePage(currentPage);
    };
});

// ===== Toast Notification =====
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const bg = type === 'success' ? '#15803d' : (type === 'error' ? '#b91c1c' : '#0f172a');
    toast.style.cssText = `background:${bg};color:#fff;padding:12px 20px;border-radius:8px;font-family:Poppins,sans-serif;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.2);opacity:0;transform:translateX(20px);transition:all .3s;max-width:320px;`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ===== Public Data Loading from Backend =====
// This renders dynamic data (profil, pemerintahan, kontak, berita, galeri)
// from the backend API into the public pages.

async function loadPublicData() {
    try {
        const res = await fetch('/api/data');
        if (!res.ok) return;
        const data = await res.json();

        applyProfil(data.profil);
        applyPemerintahan(data.pemerintahan);
        applyKontak(data.kontak);
        applyBerita(data.pengumuman || data.berita || []);
        applyPengumuman(data.pengumuman || []);
        applyGaleri(data.galeri || []);
        applyLayanan(data.layanan);
        applyPotensi(data.potensi);
    } catch (err) {
        // Silent fail: keep static content if backend unavailable
    }
}

function initPublicData() {
    loadPublicData();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPublicData, { once: true });
} else {
    initPublicData();
}

window.addEventListener('load', initPublicData, { once: true });

function applyProfil(p) {
    if (!p) return;
    // Replace all "Desa [Nama Desa]" occurrences with actual name
    if (p.namaDesa) {
        document.querySelectorAll('h1, h2, title, span').forEach(el => {
            if (el.textContent.includes('Desa [Nama Desa]')) {
                el.textContent = el.textContent.replace('Desa [Nama Desa]', p.namaDesa);
            }
        });
        // Fill profile page header elements by ID
        const hNama = document.getElementById('header-nama');
        if (hNama) hNama.textContent = p.namaDesa;
        const h2Profil = document.querySelector('h2.text-3xl');
        if (h2Profil && h2Profil.textContent.includes('Profil')) {
            h2Profil.textContent = 'Profil ' + p.namaDesa;
        }
        // Page title (only on profil page)
        if (document.title.includes('Profil')) {
            document.title = 'Profil ' + p.namaDesa;
        }
    }
    // Logo
    if (p.logo) {
        document.querySelectorAll('img[alt="Logo Desa"]').forEach(img => {
            img.src = p.logo;
        });
        const headerLogo = document.getElementById('header-logo');
        if (headerLogo) headerLogo.src = p.logo;
    }
    // Hero foto
    if (p.heroFoto) {
        document.querySelectorAll('img[alt="Foto Desa"]').forEach(img => {
            img.src = p.heroFoto;
        });
    }
    // Tagline text
    if (p.tagline) {
        document.querySelectorAll('p').forEach(el => {
            if (el.textContent.includes('Bersama membangun desa')) {
                el.textContent = p.tagline;
            }
        });
        const hTagline = document.getElementById('header-tagline');
        if (hTagline) hTagline.textContent = p.tagline;
    }
    // Deskripsi & foto profil page
    if (p.deskripsi) {
        const d = document.getElementById('profil-deskripsi');
        if (d) d.textContent = p.deskripsi;
        const tentangBeranda = document.getElementById('beranda-tentang-deskripsi');
        if (tentangBeranda) tentangBeranda.textContent = p.deskripsi;
    }
    if (p.tentangJudul) {
        const judulProfil = document.getElementById('profil-tentang-judul');
        if (judulProfil) judulProfil.textContent = p.tentangJudul;
        const judulBeranda = document.getElementById('beranda-tentang-judul');
        if (judulBeranda) judulBeranda.textContent = p.tentangJudul;
    }
    if (p.komitmen) {
        const komitmen = document.getElementById('profil-komitmen');
        if (komitmen) komitmen.textContent = p.komitmen;
    }
    const dataSingkat = document.getElementById('profil-data-singkat');
    if (dataSingkat && Array.isArray(p.dataSingkat) && p.dataSingkat.length) {
        dataSingkat.innerHTML = '';
        p.dataSingkat.forEach((item, index) => {
            const warna = index % 2 === 0 ? 'border-red-800' : 'border-yellow-500';
            dataSingkat.innerHTML += `<div class="animate-fade-in-up bg-white rounded-2xl shadow-md p-6 text-center hover:shadow-xl hover:-translate-y-1 transition border-t-4 ${warna}"><div class="text-2xl font-bold text-red-800">${item.nilai || ''}</div><div class="text-sm text-gray-500 font-medium">${item.label || ''}</div></div>`;
        });
    }
    if (p.visi) {
        const visi = document.getElementById('profil-visi');
        if (visi) visi.textContent = p.visi;
    }
    const misi = document.getElementById('profil-misi');
    if (misi && Array.isArray(p.misi) && p.misi.length) {
        misi.innerHTML = '';
        p.misi.forEach(item => { misi.innerHTML += `<li class="text-gray-700">${item}</li>`; });
    }

    // Foto "Tentang Desa" (beranda & profil)
    const tentangFoto = p.fotoTentang || p.heroFoto;
    if (tentangFoto) {
        const t = document.getElementById('tentang-foto');
        if (t) t.src = tentangFoto;
        const fotoProfil = document.getElementById('profil-foto');
        if (fotoProfil) fotoProfil.src = tentangFoto;
    }

    if (p.heroFoto) {
        const foto = document.getElementById('profil-foto');
        if (foto && !p.fotoTentang) foto.src = p.heroFoto;
    }
}

function applyPemerintahan(p) {
    if (!p) return;
    // Kepala desa name
    if (p.kepalaDesa?.nama) {
        const kepalaNama = document.getElementById('kepala-nama');
        if (kepalaNama) {
            kepalaNama.textContent = p.kepalaDesa.nama;
        }
        // Fallback: replace placeholder anywhere
        document.querySelectorAll('p').forEach(el => {
            if (el.textContent.includes('[Nama Kepala Desa]')) {
                el.textContent = p.kepalaDesa.nama;
            }
        });
    }
    // Kepala desa foto
    if (p.kepalaDesa?.foto) {
        const kepalaFoto = document.getElementById('kepala-foto');
        if (kepalaFoto) {
            kepalaFoto.src = p.kepalaDesa.foto;
        }
        // Fallback: replace any img with alt="Kepala Desa"
        document.querySelectorAll('img[alt="Kepala Desa"]').forEach(img => {
            img.src = p.kepalaDesa.foto;
        });
    }
// Perangkat desa table (legacy) atau grid kartu (desain baru)
    if (Array.isArray(p.perangkat)) {
        const tbody = document.getElementById('perangkat-tbody') || document.querySelector('table tbody');
        if (tbody) {
            tbody.innerHTML = '';
            const isGrid = tbody.tagName.toLowerCase() === 'div' && tbody.classList.contains('grid');
            p.perangkat.forEach((item, i) => {
                if (isGrid) {
                    const card = document.createElement('div');
                    card.className = (i % 2 === 0 ? 'border-red-800' : 'border-yellow-500') + ' bg-white rounded-2xl shadow-md p-5 flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-1 transition border-t-4';
                    const hasFoto = item.foto && item.foto.includes('http');
                    const fotoHtml = hasFoto
                        ? `<img src="${item.foto}" alt="${item.jabatan}" class="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover mb-3">`
                        : `<div class="w-24 h-24 md:w-28 md:h-28 flex-shrink-0 bg-red-100 rounded-full mb-3" aria-hidden="true"></div>`;
                    card.innerHTML = `
                        ${fotoHtml}
                        <p class="font-bold text-gray-800">${item.jabatan}</p>
                        <p class="text-sm text-gray-500">${item.nama}</p>
                    `;
                    tbody.appendChild(card);
                } else {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td class="py-2 px-4">${item.jabatan}</td><td class="py-2 px-4">${item.nama}</td>`;
                    tbody.appendChild(tr);
                }
            });
        }
    }

    // Lembaga Desa (dinamis)
    if (Array.isArray(p.lembaga)) {
        const lembagaList = document.getElementById('lembaga-list');
        if (lembagaList) {
            lembagaList.innerHTML = '';
            p.lembaga.forEach(l => {
                const li = document.createElement('li');
                li.className = 'bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition';
                li.innerHTML = `<span class="text-gray-700 font-medium">${l.nama}</span>`;
                lembagaList.appendChild(li);
            });
        }
    }
    // BPD items (mendukung struktur lama `ul.list-disc` dan desain baru kartu)
    if (p.bpd) {
        document.querySelectorAll('ul li').forEach(li => {
            const text = li.textContent;
            if (text.includes('Ketua:')) li.innerHTML = `<span class="font-medium text-gray-800">Ketua:</span> <span class="text-gray-600">${p.bpd.ketua || ''}</span>`;
            if (text.includes('Wakil Ketua:')) li.innerHTML = `<span class="font-medium text-gray-800">Wakil Ketua:</span> <span class="text-gray-600">${p.bpd.wakil || ''}</span>`;
            if (text.includes('Sekretaris:')) li.innerHTML = `<span class="font-medium text-gray-800">Sekretaris:</span> <span class="text-gray-600">${p.bpd.sekretaris || ''}</span>`;
            if (text.includes('Anggota:')) li.innerHTML = `<span class="font-medium text-gray-800">Anggota:</span> <span class="text-gray-600">${p.bpd.anggota || ''}</span>`;
        });
    }
}

function applyKontak(k) {
    if (!k) return;
    document.querySelectorAll('p').forEach(el => {
        const text = el.textContent;
        if (text.startsWith('Alamat:')) el.textContent = 'Alamat: ' + (k.alamat || '');
        if (text.startsWith('Telepon:')) el.textContent = 'Telepon: ' + (k.telepon || '');
        if (text.startsWith('Email:')) el.textContent = 'Email: ' + (k.email || '');
    });
// Maps iframe
    if (k.mapsUrl) {
        document.querySelectorAll('iframe').forEach(iframe => {
            iframe.src = k.mapsUrl;
        });
    }
    // Social media links (footer)
    const applyLink = (text, url) => {
        if (!url) return;
        document.querySelectorAll('a').forEach(a => {
            if (a.textContent.trim() === text) {
                a.href = url;
                a.target = '_blank';
                a.rel = 'noopener';
            }
        });
    };
    applyLink('Instagram', k.instagram);
    applyLink('Facebook', k.facebook);
    applyLink('YouTube', k.youtube);
}

function applyBerita(berita) {
    // For index page "Pengumuman Terbaru" section
    const indexGrid = document.getElementById('pengumuman-index-grid');
    if (indexGrid) {
        if (!berita.length) return;
        indexGrid.innerHTML = '';
        berita.slice(0, 3).forEach(item => {
            const img = item.gambar
                ? `<img src="${item.gambar}" alt="Gambar Pengumuman" class="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500">`
                : `<div class="w-full h-44 bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-500">📢</div>`;
            const a = document.createElement('a');
            a.href = 'pengumuman-detail.html?id=' + item.id;
            a.className = 'group block bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300';
            a.innerHTML = `
                <div class="relative overflow-hidden">
                    ${img}
                    <span class="absolute top-3 left-3 bg-red-800 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow">📢 Pengumuman</span>
                    <span class="absolute bottom-3 right-3 bg-black bg-opacity-60 text-white text-[11px] px-3 py-1 rounded-full">📅 ${item.tanggal}</span>
                </div>
                <div class="p-5">
                    <h4 class="font-bold text-lg mb-2 group-hover:text-red-800 transition-colors">${item.judul}</h4>
                    <p class="text-sm text-gray-500 leading-relaxed">${item.ringkasan}</p>
                    <span class="inline-flex items-center text-red-800 font-semibold text-sm mt-3 group-hover:gap-2 transition-all">Baca Selengkapnya <span class="transition-transform">→</span></span>
                </div>
            `;
            indexGrid.appendChild(a);
        });
    }
}

function applyPengumuman(pengumuman) {
    const pengGrid = document.getElementById('pengumuman-grid');
    if (pengGrid) {
        if (!pengumuman.length) {
            pengGrid.innerHTML = '<div class="text-center text-gray-500 py-12 col-span-full">Belum ada pengumuman.</div>';
            return;
        }
        pengGrid.innerHTML = '';
        pengumuman.forEach(item => {
            const card = buildPengumumanCard(item);
            pengGrid.appendChild(card);
        });
    }

    // ===== Search filter =====
    const searchInput = document.getElementById('cari-pengumuman');
    if (searchInput && pengumuman.length) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            pengGrid.innerHTML = '';
            pengumuman.filter(item => item.judul.toLowerCase().includes(q) || item.ringkasan.toLowerCase().includes(q)).forEach(item => {
                pengGrid.appendChild(buildPengumumanCard(item));
            });
            if (!pengGrid.children.length) {
                pengGrid.innerHTML = '<div class="text-center text-gray-500 py-12 col-span-full">Tidak ada pengumuman yang cocok.</div>';
            }
        });
    }
}

// Helper untuk membangun kartu pengumuman dengan format yang konsisten
function buildPengumumanCard(item) {
    const img = item.gambar
        ? `<img src="${item.gambar}" alt="Gambar Pengumuman" class="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500">`
        : `<div class="w-full h-44 bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-500">📢</div>`;
    const a = document.createElement('a');
    a.href = 'pengumuman-detail.html?id=' + item.id;
    a.className = 'group block bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300';
    a.innerHTML = `
        <div class="relative overflow-hidden">
            ${img}
            <span class="absolute top-3 left-3 bg-red-800 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow">📢 Pengumuman</span>
            <span class="absolute bottom-3 right-3 bg-black bg-opacity-60 text-white text-[11px] px-3 py-1 rounded-full">📅 ${item.tanggal}</span>
        </div>
        <div class="p-5">
            <h4 class="font-bold text-lg mb-2 group-hover:text-red-800 transition-colors">${item.judul}</h4>
            <p class="text-sm text-gray-500 leading-relaxed">${item.ringkasan}</p>
            <span class="inline-flex items-center text-red-800 font-semibold text-sm mt-3 group-hover:gap-2 transition-all">Baca Selengkapnya <span class="transition-transform">→</span></span>
        </div>
    `;
    return a;
}

function applyGaleri(galeri) {
    // Support both new (object with categories) and legacy (array) format
    let cats = { galeri1: [], galeri2: [], galeri3: [] };
    if (galeri && typeof galeri === 'object' && !Array.isArray(galeri)) {
        cats.galeri1 = galeri.galeri1 || [];
        cats.galeri2 = galeri.galeri2 || [];
        cats.galeri3 = galeri.galeri3 || [];
    } else if (Array.isArray(galeri)) {
        cats.galeri1 = galeri;
    }

    const defs = [
        { gridId: 'galeri-grid-1', list: cats.galeri1 },
        { gridId: 'galeri-grid-2', list: cats.galeri2 },
        { gridId: 'galeri-grid-3', list: cats.galeri3 }
    ];

    defs.forEach(def => {
        const grid = document.getElementById(def.gridId);
        if (!grid) return;
        if (def.list.length) {
            grid.innerHTML = '';
            def.list.forEach(url => {
                const div = document.createElement('div');
                div.className = 'aspect-[4/3] bg-gray-200 rounded shadow overflow-hidden';
                div.innerHTML = `<img src="${url}" alt="Galeri" class="object-cover w-full h-full">`;
                grid.appendChild(div);
            });
        }
    });

    // ===== Sinkron Galeri Beranda (index.html) dengan galeri desa =====
    const homeGrid = document.getElementById('galeri-home-grid');
    if (homeGrid) {
        // Gabungkan semua kategori galeri
        const allPhotos = [
            ...cats.galeri1,
            ...cats.galeri2,
            ...cats.galeri3
        ];
        homeGrid.innerHTML = '';
        if (allPhotos.length) {
            // Tampilkan 8 foto pertama dari galeri
            allPhotos.slice(0, 8).forEach((url, idx) => {
                const div = document.createElement('div');
                div.className = 'aspect-[4/3] bg-gray-200 rounded shadow overflow-hidden group relative';
                div.innerHTML = `
                    <img src="${url}" alt="Galeri ${idx + 1}" class="object-cover w-full h-full transition duration-300 group-hover:scale-105">
                `;
                homeGrid.appendChild(div);
            });
        } else {
            // Foto default jika galeri kosong
            const defaults = [
                'https://picsum.photos/id/159/400/300',
                'https://picsum.photos/id/108/400/300',
                'https://picsum.photos/id/109/400/300',
                'https://picsum.photos/id/110/400/300'
            ];
            defaults.forEach(url => {
                const div = document.createElement('div');
                div.className = 'aspect-[4/3] bg-gray-200 rounded shadow overflow-hidden';
                div.innerHTML = `<img src="${url}" alt="Galeri" class="object-cover w-full h-full">`;
                homeGrid.appendChild(div);
            });
        }
    }
}

// ===== Layanan & Potensi public pages =====
function applyLayanan(l) {
    if (!l) return;
    const ps = l.pengajuanSurat || {};
    if (document.getElementById('ps-title')) {
        document.getElementById('ps-title').textContent = ps.judul || 'Pengajuan Surat Online';
    }
    if (document.getElementById('ps-desc')) {
        document.getElementById('ps-desc').textContent = ps.deskripsi || '';
    }
    if (document.getElementById('ps-syarat')) {
        document.getElementById('ps-syarat').textContent = ps.syarat || '';
    }
    if (document.getElementById('ps-jenis-list') && ps.jenisSurat) {
        const list = document.getElementById('ps-jenis-list');
        list.innerHTML = '';
        ps.jenisSurat.split(',').forEach(j => {
            const li = document.createElement('li');
            li.textContent = j.trim();
            list.appendChild(li);
        });
        const select = document.getElementById('s-jenis');
        if (select) {
            select.innerHTML = '';
            ps.jenisSurat.split(',').forEach(j => {
                const opt = document.createElement('option');
                opt.value = j.trim();
                opt.textContent = j.trim();
                select.appendChild(opt);
            });
            select.addEventListener('change', updateSyaratKhusus);
            updateSyaratKhusus();
        }
    } else {
        // Fallback jika jenisSurat tidak ada — gunakan pilihan statis
        const select = document.getElementById('s-jenis');
        if (select) {
            select.addEventListener('change', updateSyaratKhusus);
            updateSyaratKhusus();
        }
    }

    const dk = l.dataKependudukan || {};
    if (document.getElementById('dk-title')) document.getElementById('dk-title').textContent = dk.judul || '';
    if (document.getElementById('dk-desc')) document.getElementById('dk-desc').textContent = dk.deskripsi || '';
    if (document.getElementById('dk-total')) document.getElementById('dk-total').textContent = dk.totalPenduduk || '';
    if (document.getElementById('dk-kk')) document.getElementById('dk-kk').textContent = dk.kk || '';
    if (document.getElementById('dk-laki')) document.getElementById('dk-laki').textContent = dk.laki || '';
    if (document.getElementById('dk-perempuan')) document.getElementById('dk-perempuan').textContent = dk.perempuan || '';

const jp = l.jadwalPosyandu || {};
    if (document.getElementById('jp-title')) document.getElementById('jp-title').textContent = jp.judul || '';
    if (document.getElementById('jp-desc')) document.getElementById('jp-desc').textContent = jp.deskripsi || '';

    // ===== Render jadwal posyandu balita & lansia (tabel dinamis) =====
    const balitaTbody = document.getElementById('posyandu-balita-tbody');
    if (balitaTbody) {
        const balita = jp.balita || [];
        balitaTbody.innerHTML = '';
        if (balita.length) {
            balita.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="py-2 px-4">${item.nama || ''}</td>
                    <td class="py-2 px-4">${item.lokasi || ''}</td>
                    <td class="py-2 px-4">${item.jadwal || ''}</td>
                    <td class="py-2 px-4">${item.waktu || ''}</td>
                `;
                balitaTbody.appendChild(tr);
            });
        } else {
            balitaTbody.innerHTML = '<tr><td colspan="4" class="py-2 px-4 text-center text-gray-400">Belum ada jadwal posyandu balita.</td></tr>';
        }
    }

    const lansiaTbody = document.getElementById('posyandu-lansia-tbody');
    if (lansiaTbody) {
        const lansia = jp.lansia || [];
        lansiaTbody.innerHTML = '';
        if (lansia.length) {
            lansia.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="py-2 px-4">${item.nama || ''}</td>
                    <td class="py-2 px-4">${item.lokasi || ''}</td>
                    <td class="py-2 px-4">${item.jadwal || ''}</td>
                `;
                lansiaTbody.appendChild(tr);
            });
        } else {
            lansiaTbody.innerHTML = '<tr><td colspan="3" class="py-2 px-4 text-center text-gray-400">Belum ada jadwal posyandu lansia.</td></tr>';
        }
    }

    const ap = l.arsipPerdes || {};
    if (document.getElementById('ap-title')) document.getElementById('ap-title').textContent = ap.judul || '';
    if (document.getElementById('ap-desc')) document.getElementById('ap-desc').textContent = ap.deskripsi || '';

    const umurTbody = document.getElementById('dk-umur-tbody');
    if (umurTbody) {
        umurTbody.innerHTML = '';
        (dk.kelompokUmur || []).forEach(item => {
            umurTbody.innerHTML += `<tr><td class="py-2 px-4">${item.kelompok || ''}</td><td class="py-2 px-4">${item.jumlah || ''}</td></tr>`;
        });
    }
    const pendidikanList = document.getElementById('dk-pendidikan-list');
    if (pendidikanList) {
        pendidikanList.innerHTML = '';
        (dk.pendidikan || []).forEach(item => {
            pendidikanList.innerHTML += `<li>${item.tingkat || ''}: ${item.jumlah || ''} jiwa</li>`;
        });
    }
    const renderArsip = (id, items) => {
        const tbody = document.getElementById(id);
        if (!tbody) return;
        tbody.innerHTML = '';
        (items || []).forEach((item, index) => {
            tbody.innerHTML += `<tr><td class="py-2 px-4">${item.no || index + 1}</td><td class="py-2 px-4">${item.peraturan || ''}</td><td class="py-2 px-4">${item.tahun || ''}</td><td class="py-2 px-4">${item.tentang || ''}</td></tr>`;
        });
    };
    renderArsip('ap-perdes-tbody', ap.perdes);
    renderArsip('ap-perkades-tbody', ap.perkades);

    // ===== Layanan Publik page (layanan-publik.html) =====
    if (document.getElementById('layanan-ps-title')) document.getElementById('layanan-ps-title').textContent = ps.judul || 'Pengajuan Surat Online';
    if (document.getElementById('layanan-ps-desc')) document.getElementById('layanan-ps-desc').textContent = ps.deskripsi || '';
    if (document.getElementById('layanan-dk-title')) document.getElementById('layanan-dk-title').textContent = dk.judul || 'Data Kependudukan';
    if (document.getElementById('layanan-dk-desc')) document.getElementById('layanan-dk-desc').textContent = dk.deskripsi || '';
    if (document.getElementById('layanan-jp-title')) document.getElementById('layanan-jp-title').textContent = jp.judul || 'Jadwal Posyandu';
    if (document.getElementById('layanan-jp-desc')) document.getElementById('layanan-jp-desc').textContent = jp.deskripsi || '';
    if (document.getElementById('layanan-ap-title')) document.getElementById('layanan-ap-title').textContent = ap.judul || 'Arsip Perdes';
    if (document.getElementById('layanan-ap-desc')) document.getElementById('layanan-ap-desc').textContent = ap.deskripsi || '';

    // ===== Index page (index.html) Layanan Unggulan =====
    if (document.getElementById('layanan-index-desc')) {
        document.getElementById('layanan-index-desc').textContent = 'Nikmati kemudahan layanan publik dan informasi unggulan dari ' + (document.getElementById('header-nama')?.textContent || 'Desa') + '.';
    }
    if (document.getElementById('layanan-index-ps')) document.getElementById('layanan-index-ps').textContent = ps.judul || 'Pengajuan Surat';
    if (document.getElementById('layanan-index-dk')) document.getElementById('layanan-index-dk').textContent = dk.judul || 'Data Kependudukan';
    if (document.getElementById('layanan-index-jp')) document.getElementById('layanan-index-jp').textContent = jp.judul || 'Jadwal Posyandu';
    if (document.getElementById('layanan-index-ap')) document.getElementById('layanan-index-ap').textContent = ap.judul || 'Arsip Perdes';
}

function applyPotensi(p) {
    if (!p) return;
    const um = p.umkm || {}, wi = p.wisata || {}, kg = p.kegiatan || {};
    if (document.getElementById('um-title')) {
        document.getElementById('um-title').textContent = um.judul || 'UMKM & Produk Unggulan';
        if (document.getElementById('um-desc')) document.getElementById('um-desc').textContent = um.deskripsi || '';
        renderPotensiCards('um-card-grid', um.items || []);
    }
    if (document.getElementById('wi-title')) {
        document.getElementById('wi-title').textContent = wi.judul || 'Wisata Alam & Budaya';
        if (document.getElementById('wi-desc')) document.getElementById('wi-desc').textContent = wi.deskripsi || '';
        renderPotensiCards('wi-card-grid', wi.items || []);
    }
    if (document.getElementById('kg-title')) {
        document.getElementById('kg-title').textContent = kg.judul || 'Kegiatan Masyarakat';
        if (document.getElementById('kg-desc')) document.getElementById('kg-desc').textContent = kg.deskripsi || '';
        renderPotensiCards('kg-card-grid', kg.items || []);
    }

    // ===== Index page (index.html) Potensi Desa =====
    if (document.getElementById('potensi-index-desc')) {
        document.getElementById('potensi-index-desc').textContent = 'Berbagai potensi ekonomi, wisata, dan budaya yang dimiliki ' + (document.getElementById('header-nama')?.textContent || 'Desa') + '.';
    }
    if (document.getElementById('potensi-index-um')) document.getElementById('potensi-index-um').textContent = um.judul || 'UMKM & Produk Unggulan';
    if (document.getElementById('potensi-index-um-desc')) document.getElementById('potensi-index-um-desc').textContent = um.deskripsi || 'Produk lokal berkualitas dari warga desa.';
    if (document.getElementById('potensi-index-wi')) document.getElementById('potensi-index-wi').textContent = wi.judul || 'Wisata Alam / Budaya';
    if (document.getElementById('potensi-index-wi-desc')) document.getElementById('potensi-index-wi-desc').textContent = wi.deskripsi || 'Keindahan alam dan tradisi budaya desa.';
    if (document.getElementById('potensi-index-kg')) document.getElementById('potensi-index-kg').textContent = kg.judul || 'Kegiatan Masyarakat';
    if (document.getElementById('potensi-index-kg-desc')) document.getElementById('potensi-index-kg-desc').textContent = kg.deskripsi || 'Berbagai kegiatan sosial dan budaya warga.';
}

function renderPotensiCards(gridId, items) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';
    if (!items || !items.length) return;
    items.forEach(item => {
        const div = document.createElement('div');
        const img = item.foto
            ? `<img src="${item.foto}" alt="${item.nama}" class="w-full h-52 object-cover transition duration-500 group-hover:scale-105">`
            : `<div class="h-52 bg-gradient-to-br from-red-100 to-yellow-100"></div>`;
        div.innerHTML = `
            <div class="group bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <div class="overflow-hidden">${img}</div>
                <div class="p-5">
                    <h3 class="text-xl font-bold mb-2 text-gray-800">${item.nama}</h3>
                    <p class="text-sm leading-relaxed text-gray-600">${item.deskripsi}</p>
                </div>
            </div>
        `;
        const card = div.firstElementChild;
        if (card) {
            grid.appendChild(card);
        }
    });
}

// ===== Syarat khusus per jenis surat (standar Indonesia) =====
const SYARAT_SURAT = {
    'Surat Keterangan Domisili': [
        'Fotokopi KTP',
        'Fotokopi Kartu Keluarga (KK)',
        'Surat pengantar dari RT/RW setempat',
        'Perjanjian sewa / bukti kepemilikan rumah (jika pindah domisili)',
        'Pas foto 3x4 sebanyak 2 lembar'
    ],
    'Surat Keterangan Usaha': [
        'Fotokopi KTP',
        'Fotokopi Kartu Keluarga (KK)',
        'Pas foto 3x4 sebanyak 2 lembar',
        'Nama dan jenis usaha yang dijalankan',
        'Alamat lokasi usaha'
    ],
    'Surat Keterangan Tidak Mampu': [
        'Fotokopi KTP',
        'Fotokopi Kartu Keluarga (KK)',
        'Surat pengantar dari RT/RW setempat',
        'Pas foto 3x4 sebanyak 2 lembar'
    ],
    'Surat Pengantar SKCK': [
        'Fotokopi KTP',
        'Fotokopi Kartu Keluarga (KK)',
        'Fotokopi akta kelahiran',
        'Pas foto 4x6 sebanyak 2 lembar (latar belakang merah)',
        'Mengisi formulir permohonan yang disediakan',
        'Fotokopi ijazah terakhir / surat keterangan sekolah'
    ],
    'Surat Keterangan Kelahiran': [
        'Fotokopi KTP ibu dan ayah',
        'Fotokopi Kartu Keluarga (KK) orang tua',
        'Fotokopi surat nikah / akta perkawinan',
        'Fotokopi akta kelahiran anak (jika ada)',
        'Surat keterangan lahir dari bidan / dokter / rumah sakit',
        'Pas foto bayi 2x3 sebanyak 2 lembar'
    ],
    'Surat Keterangan Kematian': [
        'Fotokopi KTP almarhum/almarhumah',
        'Fotokopi KK almarhum/almarhumah',
        'Surat keterangan kematian dari dokter / rumah sakit',
        'Surat keterangan saksi dari 2 orang yang menyaksikan',
        'Pas foto almarhum/almarhumah ukuran 3x4 (jika diminta)'
    ],
    'Surat Rekomendasi': [
        'Fotokopi KTP',
        'Fotokopi Kartu Keluarga (KK)',
        'Surat permohonan resmi yang ditujukan kepada Kepala Desa',
        'Dokumen pendukung sesuai tujuan rekomendasi',
        'Pas foto 3x4 sebanyak 2 lembar'
    ]
};
const SYARAT_UMUM_LENGKAP = [
    'Fotokopi KTP',
    'Fotokopi Kartu Keluarga (KK)',
    'Surat pengantar dari RT/RW setempat'
];

function updateSyaratKhusus() {
    const select = document.getElementById('s-jenis');
    const list = document.getElementById('s-syarat-list');
    if (!select || !list) return;
    const jenis = select.value;
    let syarat = SYARAT_SURAT[jenis];
    if (!syarat) {
        // Lainnya: tampilkan syarat umum
        syarat = SYARAT_UMUM_LENGKAP;
    }
    list.innerHTML = '';
    syarat.forEach(s => {
        const li = document.createElement('li');
        li.textContent = s;
        list.appendChild(li);
    });
}

// ===== Pengajuan Surat form submit =====
const suratForm = document.getElementById('surat-form');
suratForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('surat-msg');
    msg.classList.remove('hidden');
    msg.textContent = 'Mengirim pengajuan...';
    try {
        const payload = {
            nama: document.getElementById('s-nama').value.trim(),
            ktp: document.getElementById('s-ktp').value.trim(),
            hp: document.getElementById('s-hp').value.trim(),
            alamat: document.getElementById('s-alamat').value.trim(),
            jenisSurat: document.getElementById('s-jenis').value.trim()
        };
        const res = await fetch('/api/pengajuan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            msg.textContent = '✓ Pengajuan berhasil dikirim! Admin akan segera memproses surat Anda.';
            msg.classList.add('bg-green-50', 'text-green-700');
            suratForm.reset();
        } else {
            msg.textContent = 'Gagal mengirim pengajuan. Silakan coba lagi.';
        }
    } catch (err) {
        msg.textContent = 'Terjadi kesalahan. Pastikan server berjalan.';
    }
});

// ===== Keluhan Masyarakat form =====
const keluhanForm = document.getElementById('keluhan-form');
const keluhanBuktiInput = document.getElementById('keluhan-bukti');
const keluhanBuktiPreview = document.getElementById('keluhan-bukti-preview');

keluhanBuktiInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && keluhanBuktiPreview) {
        keluhanBuktiPreview.src = URL.createObjectURL(file);
        keluhanBuktiPreview.classList.remove('hidden');
    }
});

keluhanForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('keluhan-msg');
    msg.classList.remove('hidden');
    msg.textContent = 'Mengirim keluhan...';

    const formData = new FormData();
    formData.append('nama', document.getElementById('keluhan-nama').value.trim());
    formData.append('hp', document.getElementById('keluhan-hp').value.trim());
    formData.append('judul', document.getElementById('keluhan-judul').value.trim());
    formData.append('kronologi', document.getElementById('keluhan-kronologi').value.trim());
    formData.append('lokasi', document.getElementById('keluhan-lokasi').value.trim());
    if (keluhanBuktiInput && keluhanBuktiInput.files[0]) {
        formData.append('bukti', keluhanBuktiInput.files[0]);
    }

    try {
        const res = await fetch('/api/keluhan', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            msg.textContent = '✓ Keluhan berhasil dikirim! Terima kasih atas laporannya.';
            msg.classList.add('bg-green-50', 'text-green-700');
            keluhanForm.reset();
            if (keluhanBuktiPreview) keluhanBuktiPreview.classList.add('hidden');
        } else {
            msg.textContent = 'Gagal mengirim keluhan. Silakan coba lagi.';
            msg.classList.remove('bg-green-50', 'text-green-700');
        }
    } catch (err) {
        msg.textContent = 'Terjadi kesalahan. Pastikan server berjalan.';
        msg.classList.remove('bg-green-50', 'text-green-700');
    }
});

// ===== Pengumuman Detail + Komentar =====
(async function loadPengumumanDetail() {
    const detailEl = document.getElementById('pengumuman-detail');
    if (!detailEl) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    // Load pengumuman data
    try {
        const res = await fetch(`/api/pengumuman/${id}`);
        const data = await res.json();
        if (data.success) {
            const p = data.data;
            if (document.getElementById('pd-judul')) document.getElementById('pd-judul').textContent = p.judul;
if (document.getElementById('pd-tanggal')) document.getElementById('pd-tanggal').textContent = '📅 ' + (p.tanggal || '');
            if (document.getElementById('pd-ringkasan')) document.getElementById('pd-ringkasan').textContent = p.ringkasan || '';
            if (document.getElementById('pd-isi')) {
                const isiEl = document.getElementById('pd-isi');
                // Gunakan isi jika tersedia, jika kosong gunakan ringkasan sebagai fallback
                const isi = (p.isi && p.isi.trim()) ? p.isi : (p.ringkasan || '');
                if (isi) {
                    // Render paragraf per baris kosong (menghormati baris baru)
                    isiEl.innerHTML = renderParagraphs(isi);
                } else {
                    isiEl.innerHTML = '<p class="text-gray-400 italic">Belum ada isi lengkap untuk pengumuman ini.</p>';
                }
            }
            if (document.getElementById('pd-gambar')) {
                const img = document.getElementById('pd-gambar');
                if (p.gambar) {
                    img.src = p.gambar;
                    img.classList.remove('hidden');
                } else {
                    img.classList.add('hidden');
                }
            }
        }
    } catch (err) {
        console.log('Gagal memuat detail pengumuman.');
    }

    // Load komentar
    const komentarList = document.getElementById('komentar-list');
    if (komentarList) {
        try {
            const res = await fetch(`/api/pengumuman/${id}/komentar`);
            const data = await res.json();
            renderKomentar(data.data || []);
        } catch (err) {
            console.log('Gagal memuat komentar.');
        }
    }

    // Handle komentar form (tanpa login, terbuka untuk publik)
    const komentarForm = document.getElementById('komentar-form');
    if (komentarForm) {
        komentarForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nama = document.getElementById('k-nama').value.trim();
            const isi = document.getElementById('k-isi').value.trim();
            if (!isi) {
                alert('Komentar tidak boleh kosong.');
                return;
            }
            try {
                const res = await fetch(`/api/pengumuman/${id}/komentar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nama, isi })
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('k-isi').value = '';
                    // Reload komentar
                    const res2 = await fetch(`/api/pengumuman/${id}/komentar`);
                    const data2 = await res2.json();
                    renderKomentar(data2.data || []);
                } else {
                    alert(data.message || 'Gagal mengirim komentar.');
                }
            } catch (err) {
                alert('Terjadi kesalahan. Pastikan server berjalan.');
            }
        });
    }
})();

// Helper: render teks menjadi paragraf berdasarkan baris kosong
function renderParagraphs(text) {
    if (!text) return '';
    // Pisahkan berdasarkan baris kosong (dua atau lebih newline)
    const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    if (blocks.length <= 1) {
        // Tidak ada pemisah paragraf: pisahkan per baris tunggal
        return text.split('\n').map(line => line.trim()).filter(Boolean).map(line => `<p class="mb-3">${line}</p>`).join('');
    }
    return blocks.map(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean).join('<br>');
        return `<p class="mb-4">${lines}</p>`;
    }).join('');
}

function renderKomentar(komentar) {
    const list = document.getElementById('komentar-list');
    if (!list) return;
    if (!komentar.length) {
        list.innerHTML = '<p class="text-gray-500 text-sm">Belum ada komentar. Jadilah yang pertama berkomentar!</p>';
        return;
    }
list.innerHTML = '';
    komentar.forEach(k => {
        const div = document.createElement('div');
        div.className = 'border-b pb-4';
        div.innerHTML = `
            <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold text-red-800">${k.nama}</span>
                <span class="text-xs text-gray-400">${k.tanggal}</span>
            </div>
            <p class="text-gray-700">${k.isi}</p>
        `;
        list.appendChild(div);
    });
}

// ===== FAQ Accordion (layanan-publik.html) =====
document.querySelectorAll('.faq-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const answer = item.querySelector('.faq-answer');
        const icon = item.querySelector('.faq-icon');
        const isOpen = !answer.classList.contains('hidden');
        // Tutup semua
        document.querySelectorAll('.faq-item').forEach(other => {
            other.querySelector('.faq-answer').classList.add('hidden');
            other.querySelector('.faq-icon').textContent = '＋';
        });
        // Buka yang diklik jika tadinya tertutup
        if (!isOpen) {
            answer.classList.remove('hidden');
            icon.textContent = '－';
        }
    });
});

// ===== Run on page load (with fallback if DOM already loaded) =====
function runOnReady() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPublicData);
    } else {
        loadPublicData();
    }
}
runOnReady();

// ===== Web Push Notifications (Client) =====
(function initPushNotifications() {
    const btn = document.getElementById('notif-btn');
    const btnMobile = document.getElementById('notif-btn-mobile');

    // Only proceed if there's a button and service worker is supported
    if ((!btn && !btnMobile) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
    }

    // Helper to update button state
    function setButtonEnabled(enabled) {
        [btn, btnMobile].forEach(b => {
            if (b) b.disabled = !enabled;
        });
    }

function updateButtonText(subscribed) {
        // Mobile button shows full text
        if (btnMobile) {
            btnMobile.textContent = subscribed ? '✅ Notifikasi Aktif' : '🔔 Aktifkan Notifikasi';
        }
        // Desktop button is icon-only: change background color to indicate active state
        if (btn) {
            btn.classList.toggle('bg-lime-400', subscribed);
            btn.classList.toggle('bg-white/20', !subscribed);
            btn.title = subscribed ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi';
        }
    }

    async function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Check current subscription status
    async function checkSubscription() {
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
                const sub = await reg.pushManager.getSubscription();
                updateButtonText(!!sub);
            }
        } catch (e) {
            console.log('Gagal cek status notifikasi:', e);
        }
    }

    async function subscribe() {
        try {
            setButtonEnabled(false);
            const reg = await navigator.serviceWorker.register('service-worker.js');
            await navigator.serviceWorker.ready;

            // Get VAPID public key from server
            const keyRes = await fetch('/api/push/vapidPublicKey');
            const keyData = await keyRes.json();
            const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);

            let subscription = await reg.pushManager.getSubscription();
            if (!subscription) {
                subscription = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey
                });
            }

            // Send subscription to server
            const subRes = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription })
            });
            const subData = await subRes.json();

            if (subData.success) {
                updateButtonText(true);
                showToast('🔔 Notifikasi berhasil diaktifkan!', 'success');
            } else {
                showToast('Gagal mengaktifkan notifikasi.', 'error');
            }
        } catch (e) {
            console.error('Subscription error:', e);
            showToast('Browser Anda tidak mendukung notifikasi atau permission ditolak.', 'error');
        } finally {
            setButtonEnabled(true);
        }
    }

    async function unsubscribe() {
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg) return;
            const subscription = await reg.pushManager.getSubscription();
            if (subscription) {
                await fetch('/api/push/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: subscription.endpoint })
                });
                await subscription.unsubscribe();
            }
            updateButtonText(false);
            showToast('Notifikasi dinonaktifkan.', 'info');
        } catch (e) {
            console.error('Unsubscribe error:', e);
        }
    }

    async function toggleSubscription() {
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                    await unsubscribe();
                } else {
                    await subscribe();
                }
            } else {
                await subscribe();
            }
        } catch (e) {
            console.error('Toggle error:', e);
        }
    }

    // Attach event listeners
    [btn, btnMobile].forEach(b => {
        if (b) b.addEventListener('click', toggleSubscription);
    });

    // Register service worker on load (so push works even before clicking)
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').then(() => {
            checkSubscription();
        }).catch(() => {});
    });

    // Re-check when returning to page
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkSubscription();
    });
})();
