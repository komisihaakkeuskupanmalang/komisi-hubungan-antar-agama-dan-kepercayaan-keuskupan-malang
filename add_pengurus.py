from pathlib import Path
import re
root = Path('/mnt/data/haak_v14_work')

pengurus_link = '<a data-nav href="pengurus.html" role="menuitem"><i class="fa-solid fa-users-gear" aria-hidden="true"></i><span>Daftar Pengurus</span></a>'

# Update desktop/mobile navigation across all existing HTML pages.
for p in root.glob('*.html'):
    if p.name == 'pengurus.html':
        continue
    s = p.read_text(encoding='utf-8', errors='ignore')
    marker = '<a data-nav href="transparansi.html" role="menuitem"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i><span>Pusat Transparansi</span></a>'
    if marker in s and 'href="pengurus.html"' not in s:
        s = s.replace(marker, marker + '\n    ' + pengurus_link, 2)
    # Footer navigation gets a separate simple link.
    footer_marker = '<a href="tentang.html">Tentang\n            HAAK</a>'
    if footer_marker in s and 'href="pengurus.html"' not in s:
        s = s.replace(footer_marker, footer_marker + '<a href="pengurus.html">Daftar Pengurus</a>', 1)
    p.write_text(s, encoding='utf-8')

# Build page from the current v13.1 index shell so header/footer remain consistent.
index = (root / 'index.html').read_text(encoding='utf-8')
main_start = index.index('  <main id="main-content">')
main_end = index.index('  </main>', main_start) + len('  </main>')
main = r'''  <main id="main-content">
    <section class="page-hero pengurus-page-hero">
      <div class="container">
        <div class="breadcrumb"><a href="index.html">Beranda</a><span>/</span><span>Daftar Pengurus</span></div>
        <span class="eyebrow">Struktur Kepengurusan</span>
        <h1>Daftar Pengurus Komisi HAK Keuskupan Malang</h1>
        <p>Masa Bakti 2026–2029. Mengenal susunan pengurus, koordinator bidang, tim media dan publikasi, serta anggota Komisi HAK Keuskupan Malang.</p>
      </div>
    </section>

    <section class="section pengurus-section">
      <div class="container">
        <div class="pengurus-intro reveal">
          <div>
            <span class="eyebrow">Masa Bakti 2026–2029</span>
            <h2>Susunan Pengurus</h2>
            <p>Data nama dan jabatan ditampilkan sesuai daftar pengurus yang diberikan. Gunakan pencarian atau filter untuk menemukan nama maupun bidang dengan cepat.</p>
          </div>
          <div class="pengurus-actions">
            <button class="btn outline" id="pengurusPrint" type="button"><i class="fa-solid fa-print"></i> Cetak</button>
          </div>
        </div>

        <div class="pengurus-stats" aria-label="Ringkasan pengurus">
          <div class="pengurus-stat"><span class="pengurus-stat-icon"><i class="fa-solid fa-users"></i></span><strong id="pengurusTotal">25</strong><span>Total Pengurus</span></div>
          <div class="pengurus-stat"><span class="pengurus-stat-icon"><i class="fa-solid fa-sitemap"></i></span><strong id="pengurusRoles">-</strong><span>Kelompok Jabatan</span></div>
          <div class="pengurus-stat"><span class="pengurus-stat-icon"><i class="fa-solid fa-calendar-days"></i></span><strong>2026–2029</strong><span>Masa Bakti</span></div>
        </div>

        <div class="pengurus-toolbar" role="search">
          <label class="pengurus-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input id="pengurusSearch" type="search" placeholder="Cari nama atau jabatan..." autocomplete="off" aria-label="Cari nama atau jabatan pengurus"></label>
          <label class="pengurus-filter"><span class="sr-only">Filter kelompok jabatan</span><select id="pengurusFilter" aria-label="Filter kelompok jabatan"><option value="all">Semua Jabatan</option></select></label>
          <button class="btn outline" id="pengurusReset" type="button"><i class="fa-solid fa-rotate-left"></i> Reset</button>
        </div>

        <div class="pengurus-resultbar"><span id="pengurusResultCount">Menampilkan 25 pengurus</span><span><i class="fa-solid fa-circle-info"></i> Sumber: Daftar Pengurus Komisi HAK Masa Bakti 2026–2029</span></div>

        <div class="pengurus-table-wrap">
          <table class="pengurus-table">
            <caption class="sr-only">Daftar Pengurus Komisi HAK Keuskupan Malang Masa Bakti 2026–2029</caption>
            <thead><tr><th scope="col">No</th><th scope="col">Nama Lengkap</th><th scope="col">Jabatan</th></tr></thead>
            <tbody id="pengurusTableBody"></tbody>
          </table>
        </div>

        <div id="pengurusEmpty" class="empty-state" hidden>
          <i class="fa-regular fa-face-frown" aria-hidden="true"></i>
          <h3>Pengurus tidak ditemukan</h3>
          <p>Coba gunakan kata kunci nama atau jabatan yang berbeda.</p>
        </div>

        <div class="pengurus-note reveal">
          <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
          <div><strong>Catatan data</strong><p>Halaman ini menggunakan data sebagaimana tercantum pada daftar pengurus yang menjadi dasar pembaruan portal. Penulisan nama dan jabatan dipertahankan mengikuti sumber tersebut.</p></div>
        </div>
      </div>
    </section>
  </main>'''

# Add active nav link before writing page.
page = index[:index.index('</head>')] + '''<title>Daftar Pengurus | Portal Berita HAAK Keuskupan Malang</title>
  <meta name="description" content="Daftar Pengurus Komisi HAK Keuskupan Malang Masa Bakti 2026–2029.">
  <meta property="og:title" content="Daftar Pengurus Komisi HAK Keuskupan Malang 2026–2029">
  <meta property="og:description" content="Susunan pengurus Komisi HAK Keuskupan Malang Masa Bakti 2026–2029.">
  ''' + index[index.index('</head>'):] 
# Fix duplicated title/meta from index by replacing head title/meta lines cleanly.
page = re.sub(r'\s*<title>.*?</title>', '\n  <title>Daftar Pengurus | Portal Berita HAAK Keuskupan Malang</title>', page, count=1, flags=re.S)
page = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Daftar Pengurus Komisi HAK Keuskupan Malang Masa Bakti 2026–2029.">', page, count=1)
page = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="Daftar Pengurus Komisi HAK Keuskupan Malang 2026–2029">', page, count=1)
page = re.sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="Susunan pengurus Komisi HAK Keuskupan Malang Masa Bakti 2026–2029.">', page, count=1)
# Replace main content.
page = page[:main_start] + main + page[main_end:]
# Set body class.
page = page.replace('<body class="home-page">', '<body class="pengurus-page">', 1)

# Add current-page nav active state via data-nav/app.js; explicit fallback class is not necessary.
(root / 'pengurus.html').write_text(page, encoding='utf-8')

# Append page-specific functionality to shared JS, keeping it available only on the page.
app = root / 'js' / 'app.js'
js = app.read_text(encoding='utf-8')
needle = '  document.addEventListener("DOMContentLoaded", async () => {'
insert = r'''  // ---------- Daftar Pengurus ----------
  function initPengurusPage() {
    const body = $("#pengurusTableBody");
    const search = $("#pengurusSearch");
    const filter = $("#pengurusFilter");
    const reset = $("#pengurusReset");
    const count = $("#pengurusResultCount");
    const total = $("#pengurusTotal");
    const roles = $("#pengurusRoles");
    const empty = $("#pengurusEmpty");
    const print = $("#pengurusPrint");
    if (!body || !search || !filter) return;

    const members = [
      [1, "RP. HENRIKUS SUWAJI, O. CARM", "KETUA"],
      [2, "RM. HECTOR JAVIER CORTES TORNEL, MG", "WAKIL KETUA 1"],
      [3, "IRENEUS SOLA WENE, SH", "WAKIL KETUA 2"],
      [4, "DRA. THERESIA PUJI ASTUTIK", "SEKRETARIS 1"],
      [5, "SR. ANNUNCIATA, PIJ", "SEKRETARIS 2"],
      [6, "SR.MARLINA SITANGGANG, H. CARM", "BENDAHARA 1"],
      [7, "SR.LUSIANA RIYANTI, MISC", "BENDAHARA 2"],
      [8, "IRENEUS SOLA WENE, SH", "KOORDINATOR AGAMA ISLAM"],
      [9, "SR. THERESIA LAIYAN, ALMA", "KOORDINATOR AGAMA ISLAM"],
      [10, "DRA. THERESIA PUJI ASTUTIK", "KOORDINATOR AGAMA HINDU"],
      [11, "MAKARYA SUMARNI, S.AG", "KOORDINATOR AGAMA BUDDHA"],
      [12, "YUSTINA LESTARI, S.AG", "KOORDINATOR AGAMA KRISTEN"],
      [13, "BERNADINUS RINENGGO RHANANGGONO, S.E.", "KOORDINATOR AGAMA KHONGHUCU"],
      [14, "STEPANUS WIWIN", "KOORDINATOR PENGHAYAT KEPERCAYAAN"],
      [15, "DOMINIKUS TRIPUSPA MAHARDIKA", "KOORDINATOR MEDIA DAN PUBLIKASI"],
      [16, "YOSEPH YOSAN SLAMET", "KOORDINATOR MEDIA DAN PUBLIKASI"],
      [17, "IGNATIUS RUSBIANTO, S.PD.", "TIM MEDIA DAN PUBLIKASI"],
      [18, "MARIA MARGARETA TARIKATOEN, S.E.", "TIM MEDIA DAN PUBLIKASI"],
      [19, "MARIA MAGDALENA PRAMANU ADHININGTIA, S.E.", "TIM MEDIA DAN PUBLIKASI"],
      [20, "EMANUEL SALUNG", "ANGGOTA"],
      [21, "HERMAN", "ANGGOTA"],
      [22, "RP. HUGO Y. SUSDIYANTO, O.CARM", "ANGGOTA"],
      [23, "RM. ANTONIUS DENNY, O. CARM", "ANGGOTA"],
      [24, "RD DAMIANUS FADJAR TEDJO SUKARNO", "ANGGOTA"],
      [25, "YOHANES WURYANTO", "ANGGOTA"]
    ];

    const groupOf = (role) => {
      const r = role.toUpperCase();
      if (r === "KETUA" || r.startsWith("WAKIL KETUA")) return "Pimpinan";
      if (r.startsWith("SEKRETARIS") || r.startsWith("BENDAHARA")) return "Sekretariat & Keuangan";
      if (r.startsWith("KOORDINATOR")) return "Koordinator Bidang";
      if (r.startsWith("TIM MEDIA") || r.startsWith("KOORDINATOR MEDIA")) return "Media & Publikasi";
      return "Anggota";
    };

    // Keep the exact source text in the table while using a compact group filter.
    const groups = [...new Set(members.map((m) => groupOf(m[2])))];
    groups.forEach((g) => {
      const option = document.createElement("option");
      option.value = g;
      option.textContent = g;
      filter.appendChild(option);
    });
    total.textContent = String(members.length);
    roles.textContent = String(groups.length);

    const render = () => {
      const q = search.value.trim().toLowerCase();
      const selected = filter.value;
      const filtered = members.filter((m) => {
        const matchesQuery = !q || `${m[1]} ${m[2]}`.toLowerCase().includes(q);
        const matchesGroup = selected === "all" || groupOf(m[2]) === selected;
        return matchesQuery && matchesGroup;
      });
      body.innerHTML = filtered.map((m) => `<tr><td data-label="No">${m[0]}</td><td data-label="Nama Lengkap"><strong>${escapeHtml(m[1])}</strong></td><td data-label="Jabatan"><span class="pengurus-role">${escapeHtml(m[2])}</span><small class="pengurus-role-group">${escapeHtml(groupOf(m[2]))}</small></td></tr>`).join("");
      empty.hidden = filtered.length !== 0;
      count.textContent = filtered.length === members.length && !q && selected === "all" ? `Menampilkan ${members.length} pengurus` : `Menampilkan ${filtered.length} dari ${members.length} pengurus`;
    };

    search.addEventListener("input", render);
    filter.addEventListener("change", render);
    reset?.addEventListener("click", () => { search.value = ""; filter.value = "all"; render(); search.focus(); });
    print?.addEventListener("click", () => window.print());
    render();
  }

'''
if 'function initPengurusPage()' not in js:
    js = js.replace(needle, insert + needle, 1)
    js = js.replace('    initContactForm();\n', '    initContactForm();\n    initPengurusPage();\n', 1)
    app.write_text(js, encoding='utf-8')

# Add page to service worker shell and bump cache.
sw = root / 'sw.js'
s = sw.read_text(encoding='utf-8')
s = s.replace('haak-smart-v13-knowledge', 'haak-smart-v14-pengurus')
s = s.replace('./index.html", "./berita.html"', './index.html", "./pengurus.html", "./berita.html"')
s = s.replace('const CACHE_NAME = "haak-smart-v14-pengurus";', 'const CACHE_NAME = "haak-smart-v14-pengurus";')
sw.write_text(s, encoding='utf-8')

# Add concise release notes.
(root / 'README-v14-daftar-pengurus.txt').write_text('''PORTAL HAAK v14 — DAFTAR PENGURUS\n\nPerubahan:\n- Menambahkan halaman pengurus.html: Daftar Pengurus Komisi HAK Keuskupan Malang Masa Bakti 2026–2029.\n- Data 25 nama dan jabatan mengikuti gambar sumber yang diberikan.\n- Pencarian nama/jabatan secara langsung.\n- Filter kelompok jabatan.\n- Ringkasan jumlah pengurus dan kelompok jabatan.\n- Tampilan tabel responsif untuk desktop/mobile.\n- Tombol cetak menggunakan dialog print browser.\n- Menambahkan tautan Daftar Pengurus pada navigasi desktop, mobile, dan footer.\n- Menambahkan halaman ke App Shell PWA dan menaikkan cache version ke v14.\n\nCatatan: teks nama/jabatan dipertahankan mengikuti sumber gambar, termasuk entri yang muncul lebih dari satu kali.\n''', encoding='utf-8')
