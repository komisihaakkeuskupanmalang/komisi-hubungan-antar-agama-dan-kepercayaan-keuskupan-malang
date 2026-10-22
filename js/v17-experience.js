/**
 * Portal Berita HAAK — v17 Experience Layer
 *
 * Pengembangan tambahan yang bekerja di atas struktur v16 tanpa mengubah
 * navbar, hamburger, grouping navigasi, atau struktur menu yang sudah ada.
 * Semua fitur bersifat frontend-only dan aman untuk data lokal.
 */
(() => {
  "use strict";

  const D = window.HAAK_DATA || { articles: [], activities: [], gallery: [] };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[c]));
  const articleById = id => (D.articles || []).find(a => a.id === Number(id));
  const fmtDate = value => {
    try { return new Intl.DateTimeFormat("id-ID", { day:"numeric", month:"long", year:"numeric" }).format(new Date(`${value}T00:00:00`)); }
    catch { return value || "—"; }
  };
  const toast = message => {
    const el = $("#haakToast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.__haakV17ToastTimer);
    window.__haakV17ToastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  };
  const readStore = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const writeStore = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  };

  /* -------------------------------------------------------------
     1. Command Palette — tidak menambah item navbar.
     Ctrl/Cmd + K atau tombol / membuka overlay navigasi cepat.
  ------------------------------------------------------------- */
  function initCommandPalette() {
    if ($("#haakCommandPalette")) return;

    const items = [
      ["Beranda", "index.html", "fa-house", "Buka halaman utama"],
      ["Berita", "berita.html", "fa-newspaper", "Lihat seluruh berita"],
      ["Kegiatan", "kegiatan.html", "fa-calendar-days", "Agenda dan aktivitas"],
      ["Harmoni", "refleksi.html", "fa-lightbulb", "Ruang harmoni dan refleksi"],
      ["Dokumentasi", "dokumentasi.html", "fa-images", "Galeri dokumentasi"],
      ["Jejaring", "direktori.html", "fa-people-group", "Direktori jejaring"],
      ["Video", "video.html", "fa-youtube", "Kanal video"],
      ["Podcast", "podcast.html", "fa-podcast", "Kanal audio"],
      ["Pusat Isu & Topik", "tema.html", "fa-compass", "Jelajahi isu dan topik"],
      ["Riwayat Bacaan", "riwayat.html", "fa-clock-rotate-left", "Lihat riwayat bacaan"],
      ["Tentang HAAK", "tentang.html", "fa-circle-question", "Tentang portal"],
      ["Kontak", "kontak.html", "fa-envelope", "Hubungi HAAK"]
    ];

    const overlay = document.createElement("div");
    overlay.id = "haakCommandPalette";
    overlay.className = "v17-command-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="v17-command-backdrop" data-command-close></div>
      <section class="v17-command" role="dialog" aria-modal="true" aria-labelledby="v17CommandTitle">
        <div class="v17-command-head">
          <div><small>AKSES CEPAT</small><h2 id="v17CommandTitle">Navigasi Portal HAAK</h2></div>
          <button type="button" class="v17-command-close" data-command-close aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <label class="v17-command-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input id="v17CommandInput" type="search" placeholder="Cari halaman..." autocomplete="off" aria-label="Cari halaman">
          <kbd>ESC</kbd>
        </label>
        <div id="v17CommandList" class="v17-command-list"></div>
        <div class="v17-command-foot"><span><kbd>↑</kbd><kbd>↓</kbd> pilih</span><span><kbd>Enter</kbd> buka</span><span><kbd>Ctrl</kbd> + <kbd>K</kbd> buka cepat</span></div>
      </section>`;
    document.body.appendChild(overlay);

    const input = $("#v17CommandInput", overlay);
    const list = $("#v17CommandList", overlay);
    let active = 0;

    const render = () => {
      const q = input.value.trim().toLowerCase();
      const filtered = items.filter(x => `${x[0]} ${x[3]}`.toLowerCase().includes(q));
      active = Math.min(active, Math.max(0, filtered.length - 1));
      list.innerHTML = filtered.length ? filtered.map((x,i) => `
        <a class="v17-command-item ${i === active ? "is-active" : ""}" href="${x[1]}" data-command-index="${i}">
          <span class="v17-command-icon"><i class="fa-solid ${x[2]}"></i></span>
          <span><strong>${esc(x[0])}</strong><small>${esc(x[3])}</small></span>
          <i class="fa-solid fa-arrow-right"></i>
        </a>`).join("") : `<div class="v17-command-empty"><i class="fa-solid fa-magnifying-glass"></i><span>Tidak ada halaman yang cocok.</span></div>`;
    };

    const open = () => {
      overlay.hidden = false;
      document.body.classList.add("v17-modal-open");
      input.value = "";
      active = 0;
      render();
      requestAnimationFrame(() => input.focus());
    };
    const close = () => {
      overlay.hidden = true;
      document.body.classList.remove("v17-modal-open");
    };

    window.__haakOpenCommandPalette = open;
    input.addEventListener("input", () => { active = 0; render(); });
    input.addEventListener("keydown", e => {
      const links = $$(".v17-command-item", list);
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, links.length - 1); render(); }
      if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
      if (e.key === "Enter" && links[active]) { e.preventDefault(); links[active].click(); }
      if (e.key === "Escape") close();
    });
    $$('[data-command-close]', overlay).forEach(el => el.addEventListener("click", close));
    document.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); }
      if (e.key === "Escape" && !overlay.hidden) close();
    });
  }

  /* -------------------------------------------------------------
     2. Announcement rail — hanya tampil jika data v17 memiliki
        window.HAAK_V17_ANNOUNCEMENT. Tidak mengganggu layout bila kosong.
  ------------------------------------------------------------- */
  function initAnnouncement() {
    if (!window.HAAK_V17_ANNOUNCEMENT || $("#haakV17Announcement")) return;
    const data = window.HAAK_V17_ANNOUNCEMENT;
    if (!data.text) return;
    const bar = document.createElement("aside");
    bar.id = "haakV17Announcement";
    bar.className = "v17-announcement";
    bar.innerHTML = `<div class="container v17-announcement-inner">
      <span class="v17-announcement-icon"><i class="fa-solid ${esc(data.icon || "fa-bullhorn")}"></i></span>
      <span class="v17-announcement-label">${esc(data.label || "Informasi")}</span>
      <span class="v17-announcement-text">${esc(data.text)}</span>
      ${data.href ? `<a href="${esc(data.href)}" class="text-link">Lihat <i class="fa-solid fa-arrow-right"></i></a>` : ""}
    </div>`;
    const header = $(".haak-header");
    header?.parentNode?.insertBefore(bar, header.nextSibling);
  }

  /* -------------------------------------------------------------
     3–6. Detail article intelligence layer:
       - progress baca (indikator posisi, bukan Continue Reading)
       - fact sheet
       - key takeaways
       - reflection prompt
       - feedback
       - report correction
  ------------------------------------------------------------- */
  function initArticleDetail() {
    const root = $("#articleDetail");
    if (!root) return;
    const id = new URLSearchParams(location.search).get("id");
    const a = articleById(id || 1);
    if (!a) return;
    if (root.dataset.v17Ready === "true") return;
    root.dataset.v17Ready = "true";

    const content = root.querySelector(".article-content");
    const cover = root.querySelector(".article-cover");
    const meta = root.querySelector(".article-meta");

    if (meta && !$(".v17-fact-sheet", root)) {
      const tags = [...new Set([...(a.tags || [])].filter(Boolean))];
      const readMinutes = Math.max(1, Math.round(String(a.content || "").replace(/<[^>]*>/g, " ").trim().split(/\s+/).length / 220));
      const fact = document.createElement("section");
      fact.className = "v17-fact-sheet";
      fact.innerHTML = `<div class="v17-section-kicker">RINGKASAN PUBLIKASI</div>
        <div class="v17-fact-grid">
          <div><span>Tanggal</span><strong>${esc(fmtDate(a.date))}</strong></div>
          <div><span>Kategori</span><strong>${esc(a.category)}</strong></div>
          <div><span>Waktu baca</span><strong>${readMinutes} menit</strong></div>
          <div><span>Topik</span><strong>${esc(tags.slice(0,2).join(" · ") || a.category)}</strong></div>
        </div>`;
      meta.insertAdjacentElement("afterend", fact);
    }

    if (cover && !$(".v17-progress", root)) {
      const progress = document.createElement("div");
      progress.className = "v17-progress";
      progress.setAttribute("aria-label", "Kemajuan membaca artikel");
      progress.innerHTML = `<div class="v17-progress-head"><span>Kemajuan membaca</span><strong id="v17ProgressValue">0%</strong></div><div class="v17-progress-track"><i id="v17ProgressBar"></i></div>`;
      cover.insertAdjacentElement("beforebegin", progress);
      const update = () => {
        if (!content) return;
        const rect = content.getBoundingClientRect();
        const total = Math.max(1, content.offsetHeight - window.innerHeight * .35);
        const passed = Math.min(total, Math.max(0, window.innerHeight * .55 - rect.top));
        const pct = Math.round((passed / total) * 100);
        $("#v17ProgressBar")?.style.setProperty("width", `${pct}%`);
        const val = $("#v17ProgressValue"); if (val) val.textContent = `${pct}%`;
      };
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update, { passive: true });
      update();
    }

    if (content && !$(".v17-takeaways", root)) {
      const text = content.textContent.replace(/\s+/g, " ").trim();
      const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 45);
      const points = [];
      const add = s => { if (s && !points.some(x => x.toLowerCase() === s.toLowerCase())) points.push(s); };
      add(a.excerpt);
      sentences.slice(0, 4).forEach(add);
      const chosen = points.slice(0, 3);
      if (chosen.length) {
        const box = document.createElement("section");
        box.className = "v17-takeaways";
        box.innerHTML = `<div class="v17-section-kicker">INTI CERITA</div><h2>Yang perlu diketahui</h2><ul>${chosen.map(x => `<li><i class="fa-solid fa-check"></i><span>${esc(x)}</span></li>`).join("")}</ul>`;
        content.before(box);
      }
    }

    if (content && !$(".v17-reflection-prompt", root)) {
      const topic = (a.tags || [a.category]).filter(Boolean)[0];
      const prompt = document.createElement("section");
      prompt.className = "v17-reflection-prompt";
      prompt.innerHTML = `<div><span class="v17-section-kicker">JEDA SEJENAK</span><h2>Apa yang Anda bawa dari cerita ini?</h2><p>Gunakan ruang Harmoni untuk mencatat gagasan atau pertanyaan yang muncul setelah membaca${topic ? ` tentang ${esc(topic)}` : ""}.</p></div><a class="btn outline" href="refleksi.html?from=${encodeURIComponent(a.id)}"><i class="fa-regular fa-lightbulb"></i> Buka Harmoni</a>`;
      content.insertAdjacentElement("afterend", prompt);
    }

    if (!$(".v17-feedback", root)) {
      const feedback = document.createElement("section");
      feedback.className = "v17-feedback";
      feedback.innerHTML = `<div><span class="v17-section-kicker">FEEDBACK PEMBACA</span><h2>Apakah artikel ini membantu?</h2><p>Respons disimpan secara lokal di perangkat ini.</p></div><div class="v17-feedback-actions"><button type="button" data-feedback="yes"><i class="fa-regular fa-thumbs-up"></i> Membantu</button><button type="button" data-feedback="no"><i class="fa-regular fa-thumbs-down"></i> Belum</button></div>`;
      root.appendChild(feedback);
      const key = `haak-v17-feedback-${a.id}`;
      const current = localStorage.getItem(key);
      $$('[data-feedback]', feedback).forEach(btn => {
        btn.classList.toggle("active", btn.dataset.feedback === current);
        btn.addEventListener("click", () => {
          localStorage.setItem(key, btn.dataset.feedback);
          $$('[data-feedback]', feedback).forEach(x => x.classList.toggle("active", x === btn));
          toast(btn.dataset.feedback === "yes" ? "Terima kasih, feedback Anda tersimpan." : "Terima kasih, masukan Anda tersimpan.");
        });
      });
    }

    if (!$(".v17-report", root)) {
      const report = document.createElement("section");
      report.className = "v17-report";
      report.innerHTML = `<div><span class="v17-section-kicker">KOREKSI KONTEN</span><strong>Menemukan informasi yang perlu diperbaiki?</strong><span>Bantu menjaga akurasi publikasi dengan menyampaikan bagian yang perlu diperiksa.</span></div><button type="button" class="btn outline" id="v17ReportBtn"><i class="fa-regular fa-flag"></i> Laporkan</button>`;
      root.appendChild(report);
      $("#v17ReportBtn", report)?.addEventListener("click", () => openReportDialog(a));
    }
  }

  function openReportDialog(a) {
    if ($("#v17ReportDialog")) $("#v17ReportDialog").remove();
    const overlay = document.createElement("div");
    overlay.id = "v17ReportDialog";
    overlay.className = "v17-modal-overlay";
    overlay.innerHTML = `<div class="v17-report-dialog" role="dialog" aria-modal="true" aria-labelledby="v17ReportTitle">
      <div class="v17-dialog-head"><div><small>KOREKSI KONTEN</small><h2 id="v17ReportTitle">Laporkan bagian yang perlu diperiksa</h2></div><button type="button" class="v17-command-close" data-report-close aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button></div>
      <p class="v17-dialog-article">${esc(a.title)}</p>
      <label class="v17-field"><span>Jenis masalah</span><select id="v17ReportType"><option>Kesalahan informasi</option><option>Nama atau jabatan</option><option>Tanggal atau lokasi</option><option>Foto atau keterangan</option><option>Typo / penulisan</option><option>Lainnya</option></select></label>
      <label class="v17-field"><span>Catatan</span><textarea id="v17ReportNote" rows="5" placeholder="Jelaskan bagian yang perlu diperiksa..."></textarea></label>
      <div class="v17-dialog-actions"><button class="btn outline" type="button" data-report-close>Batal</button><button class="btn gold" type="button" id="v17ReportSend"><i class="fa-solid fa-paper-plane"></i> Buat Email</button></div>
    </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    $$('[data-report-close]', overlay).forEach(x => x.addEventListener("click", close));
    $("#v17ReportSend", overlay)?.addEventListener("click", () => {
      const type = $("#v17ReportType", overlay).value;
      const note = $("#v17ReportNote", overlay).value.trim();
      const subject = encodeURIComponent(`[Koreksi Konten] ${a.title}`);
      const body = encodeURIComponent(`Artikel: ${a.title}\nJenis masalah: ${type}\n\nCatatan:\n${note || "(belum diisi)"}`);
      window.location.href = `mailto:komisihaakkeuskupanmalang.cs@gmail.com?subject=${subject}&body=${body}`;
      close();
    });
  }

  /* -------------------------------------------------------------
     7. Search result status — memperkaya halaman berita tanpa mengubah
        form pencarian yang sudah ada.
  ------------------------------------------------------------- */
  function initSearchStatus() {
    const root = $("#newsListing");
    if (!root || $("#v17SearchStatus")) return;
    const section = root.closest(".section") || root.parentElement;
    if (!section) return;
    const form = $("#advancedSearchForm");
    const status = document.createElement("div");
    status.id = "v17SearchStatus";
    status.className = "v17-search-status";
    form?.insertAdjacentElement("afterend", status);

    const update = () => {
      const params = new URLSearchParams(location.search);
      const q = params.get("q") || $("#newsSearch")?.value.trim() || "";
      const cat = $("#newsCategory")?.value || "";
      const year = $("#newsYear")?.value || "";
      const tag = $("#newsTag")?.value || "";
      const bits = [];
      if (q) bits.push(`kata kunci “${esc(q)}”`);
      if (cat) bits.push(`kategori ${esc(cat)}`);
      if (year) bits.push(`tahun ${esc(year)}`);
      if (tag) bits.push(`topik ${esc(tag)}`);
      status.innerHTML = bits.length ? `<i class="fa-solid fa-filter"></i><span>Filter aktif: <strong>${bits.join(" · ")}</strong></span>` : `<i class="fa-solid fa-circle-info"></i><span>Gunakan pencarian lanjutan untuk mempersempit arsip berita berdasarkan kategori, tahun, atau topik.</span>`;
    };
    ["newsSearch","newsCategory","newsYear","newsTag","newsSort"].forEach(id => $("#"+id)?.addEventListener("input", update));
    ["newsCategory","newsYear","newsTag","newsSort"].forEach(id => $("#"+id)?.addEventListener("change", update));
    update();
  }

  /* -------------------------------------------------------------
     8. Artikel: copy link sederhana, bukan share sheet.
  ------------------------------------------------------------- */
  function enhanceArticleShare() {
    const root = $("#articleDetail");
    if (!root || $("#v17CopyArticleLink")) return;
    const shareBar = root.querySelector(".share-bar");
    if (!shareBar) return;
    const button = document.createElement("button");
    button.id = "v17CopyArticleLink";
    button.className = "btn outline";
    button.type = "button";
    button.innerHTML = '<i class="fa-solid fa-link"></i> Salin Tautan';
    shareBar.appendChild(button);
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        toast("Tautan artikel berhasil disalin.");
      } catch {
        const area = document.createElement("textarea");
        area.value = location.href;
        document.body.appendChild(area); area.select();
        document.execCommand("copy"); area.remove();
        toast("Tautan artikel berhasil disalin.");
      }
    });
  }

  /* -------------------------------------------------------------
     9. Media: kontrol audio ringkas pada podcast/speech synthesis.
        Tidak mengubah kanal Podcast yang sudah ada.
  ------------------------------------------------------------- */
  function initMediaSessionHint() {
    if (!$("#podcastHubList") || !((window.HAAK_DATA?.podcasts || []).some(x => x && (x.audio || x.src)))) return;
    if ($("#v17AudioHint")) return;
    const root = $("#podcastHubList");
    const note = document.createElement("div");
    note.id = "v17AudioHint";
    note.className = "v17-audio-hint";
    note.innerHTML = '<i class="fa-solid fa-headphones"></i><span>Gunakan tombol Dengarkan pada setiap briefing. Audio akan berhenti ketika briefing lain diputar.</span>';
    root.parentNode?.insertBefore(note, root);
  }

  /* -------------------------------------------------------------
     10. Gallery keyboard usability — Esc menutup lightbox yang sudah ada.
  ------------------------------------------------------------- */
  function initGalleryGuard() {
    const lightbox = $("#lightbox");
    if (!lightbox) return;
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && lightbox.classList.contains("open")) {
        lightbox.classList.remove("open");
        lightbox.setAttribute("aria-hidden", "true");
      }
    });
  }

  /* -------------------------------------------------------------
     11. Activity reminder helper — aktif otomatis jika data aktivitas
         nantinya memiliki tanggal ISO konkret. Tidak menambahkan tombol
         untuk data “Agenda Berkala” sehingga tidak memberi reminder palsu.
  ------------------------------------------------------------- */
  function initActivityReminders() {
    const cards = $$(".activity-card");
    if (!cards.length || !(D.activities || []).length) return;
    cards.forEach((card, index) => {
      const item = D.activities[index];
      if (!item || !/^\d{4}-\d{2}-\d{2}$/.test(String(item.date || ""))) return;
      if (card.querySelector("[data-v17-reminder]")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "v17-reminder-btn";
      btn.dataset.v17Reminder = "true";
      btn.innerHTML = '<i class="fa-regular fa-bell"></i> Ingatkan saya';
      card.appendChild(btn);
      btn.addEventListener("click", () => {
        const key = `haak-v17-reminder-${item.title}`;
        localStorage.setItem(key, JSON.stringify({ title:item.title, date:item.date }));
        toast(`Pengingat untuk “${item.title}” disimpan di perangkat.`);
      });
    });
  }

  function init() {
    initCommandPalette();
    initAnnouncement();
    initArticleDetail();
    enhanceArticleShare();
    initSearchStatus();
    initMediaSessionHint();
    initGalleryGuard();
    initActivityReminders();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
