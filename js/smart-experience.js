/**
 * Portal Berita HAAK — Smart Experience
 * Frontend-only enhancements: Smart Homepage, unified search, tags, impact,
 * reactions, language preference,
 * media hubs and PWA UX.
 * v17.7 — Multi-language feature removed; portal is Indonesian-only.
 */
(() => {
  "use strict";

  const D = window.HAAK_DATA || { articles: [], activities: [], directory: [] };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
  const store = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
  };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const article = id => D.articles.find(a => a.id === Number(id));
  const fmt = d => {
    try { return new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(new Date(`${d}T00:00:00`)); }
    catch { return d; }
  };
  const notify = message => {
    const t = $("#haakToast");
    if (!t) return;
    t.textContent = message;
    t.classList.add("show");
    clearTimeout(window.__haakToastTimer);
    window.__haakToastTimer = setTimeout(() => t.classList.remove("show"), 2500);
  };

  /* -------------------------------------------------------------
     Navbar / search integration
     The portal uses the native navigation controls already rendered
     by app.js. No language switcher or translation layer is injected.
  ------------------------------------------------------------- */
  function cleanupLegacyLanguageState() {
    try {
      localStorage.removeItem("haak-lang");
      localStorage.removeItem("haak-translation-cache-v5");
      localStorage.removeItem("haak-translation-cache-v4");
    } catch {}

    // Remove legacy ?lang=id/en parameters without reloading the page.
    try {
      const url = new URL(location.href);
      if (url.searchParams.has("lang")) {
        url.searchParams.delete("lang");
        history.replaceState({}, "", url.href);
      }
    } catch {}
  }

  /* -------------------------------------------------------------
     Smart Homepage: integrated into the existing editorial flow,
     not appended as a second standalone homepage.
  ------------------------------------------------------------- */
  function enhanceHomepage() {
    if (!/index\.html$|\/$/.test(location.pathname)) return;
    const main = $("#main-content");
    const newsSection = [...main.children].find(el => el.querySelector?.("#featuredNews"));
    if (!main || !newsSection || $("#smartHomeFlow")) return;

    const section = document.createElement("section");
    section.id = "smartHomeFlow";
    section.className = "section smart-home-flow";
    section.innerHTML = `
      <div class="container">
        <div class="smart-flow-head reveal">
          <div>
            <span class="eyebrow">Smart Homepage</span>
            <h2>Jelajahi cerita yang paling relevan</h2>
            <p>Satu alur dari cerita utama, topik, rekomendasi, hingga jejak dampak HAAK.</p>
          </div>
          <a class="text-link" href="berita.html">Jelajahi seluruh berita <i class="fa-solid fa-arrow-right"></i></a>
        </div>

        <div class="smart-flow-grid">
          <article class="smart-panel featured-story-panel">
            <div class="panel-head"><span class="eyebrow">Featured Story / Cerita Utama</span><a href="berita.html">Semua berita →</a></div>
            <div id="smartFeatured"></div>
          </article>
          <article class="smart-panel recommendation-panel">
            <div class="panel-head"><span class="eyebrow">Smart Recommendation</span><span>Untuk Anda</span></div>
            <div id="smartRecommendations"></div>
          </article>
        </div>

        <div class="smart-flow-grid">
          <article class="smart-panel">
            <div class="panel-head"><span class="eyebrow">Smart Tag System</span><a href="kategori.html">Lihat kategori →</a></div>
            <div id="smartTags" class="smart-tags"></div>
          </article>
          <article class="smart-panel">
            <div class="panel-head"><span class="eyebrow">HAAK Impact Snapshot</span><a href="#public-impact">Lihat dampak →</a></div>
            <div id="impactMini" class="impact-mini"></div>
          </article>
        </div>

        <article class="smart-panel full-panel">
          <div class="panel-head">
            <div><span class="eyebrow">HAAK Impact Timeline</span><h3>Jejak publikasi dan perjumpaan</h3></div>
          </div>
          <div id="impactTimeline" class="impact-timeline"></div>
        </article>

        <div class="smart-flow-grid">
          <article class="smart-panel media-preview">
            <div class="panel-head"><span class="eyebrow">Video Hub</span><a href="video.html">Lihat semua video →</a></div>
            <div class="media-hub-preview" id="videoPreview"></div>
          </article>
          <article class="smart-panel media-preview">
            <div class="panel-head"><span class="eyebrow">Podcast Hub</span><a href="podcast.html">Lihat semua podcast →</a></div>
            <div class="media-hub-preview" id="podcastPreview"></div>
          </article>
        </div>

        <article class="smart-panel full-panel" id="public-impact">
          <div class="panel-head"><div><span class="eyebrow">Public Impact Dashboard</span><h3>Ringkasan ekosistem publikasi</h3></div></div>
          <div id="publicImpact" class="impact-dashboard"></div>
        </article>
      </div>`;
    main.insertBefore(section, newsSection.nextSibling);
    renderHome();
    if (window.initReveal) window.initReveal();
  }

  function renderHome() {
    const arts = [...(D.articles || [])].sort((a,b) => new Date(b.date)-new Date(a.date));
    const featured = arts.find(a => a.featured) || arts[0];

    if (featured && $("#smartFeatured")) {
      $("#smartFeatured").innerHTML = `
        <a class="featured-story" href="detail-berita.html?id=${featured.id}">
          <img src="${esc(featured.image)}" alt="${esc(featured.title)}" loading="lazy">
          <div><span class="badge">${esc(featured.category)}</span>
            <h3>${esc(featured.title)}</h3><p>${esc(featured.excerpt)}</p>
            <span class="text-link">Baca cerita utama →</span>
          </div>
        </a>`;
    }

    const history = store("haak-reading-history", []);
    const seen = new Set(history.map(x => x.id));
    const recent = arts.filter(a => seen.has(a.id)).slice(0, 5);
    const preferredTags = new Set(recent.flatMap(a => a.tags || []));
    const preferredCategories = new Set(recent.map(a => a.category));
    const recs = arts.filter(a => !seen.has(a.id)).sort((a,b) => {
      const score = x => (x.tags || []).reduce((n,t) => n + (preferredTags.has(t) ? 3 : 0), 0) + (preferredCategories.has(x.category) ? 2 : 0) + (x.featured ? 1 : 0);
      return score(b) - score(a) || new Date(b.date) - new Date(a.date);
    }).slice(0,3);
    $("#smartRecommendations").innerHTML = recs.length ? recs.map(a => `
      <a class="recommend-card" href="detail-berita.html?id=${a.id}">
        <img src="${esc(a.image)}" alt="" loading="lazy">
        <div><small>${esc(a.category)} · ${fmt(a.date)}</small>
        <strong>${esc(a.title)}</strong>
        <span>${(a.tags||[]).slice(0,2).map(t => "#"+esc(t)).join(" ")}</span></div>
      </a>`).join("") : `<p class="smart-empty">Belum ada rekomendasi tambahan.</p>`;

    const counts = {};
    arts.forEach(a => (a.tags || [a.category]).forEach(t => counts[t] = (counts[t] || 0) + 1));
    $("#smartTags").innerHTML = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,14)
      .map(([t,n]) => `<a href="berita.html?q=${encodeURIComponent(t)}"><span>#${esc(t)}</span><b>${n}</b></a>`).join("");

    $("#impactMini").innerHTML = [
      ["Berita", arts.length, "fa-newspaper"],
      ["Jejaring", (D.directory||[]).length, "fa-people-arrows"],
      ["Kegiatan", (D.activities||[]).length, "fa-calendar-days"],
      ["Kategori", new Set(arts.map(a => a.category)).size, "fa-layer-group"]
    ].map(x => `<div class="impact-counter-card"><i class="fa-solid ${x[2]}"></i><strong data-count="${x[1]}">0</strong><span>${x[0]}</span></div>`).join("");
    animateCounters($("#impactMini"));

    const events = arts.slice(0,7);
    $("#impactTimeline").innerHTML = events.map(a => `
      <a href="detail-berita.html?id=${a.id}"><time>${fmt(a.date)}</time><strong>${esc(a.title)}</strong><span>${esc(a.category)}</span></a>`).join("");

    renderMediaPreview();
    renderImpact();
  }

  function renderMediaPreview() {
    const video = $("#videoPreview");
    const podcast = $("#podcastPreview");
    if (video) video.innerHTML = `<div class="media-empty"><i class="fa-brands fa-youtube"></i><strong>Daftar video HAAK</strong><span>Belum ada daftar video yang dimuat ke portal. Kunjungi Video Hub untuk melihat sumber resmi.</span><a class="btn outline" href="video.html">Buka Video Hub</a></div>`;
    if (podcast) podcast.innerHTML = `<div class="media-empty"><i class="fa-solid fa-podcast"></i><strong>Daftar podcast HAAK</strong><span>Belum ada episode podcast yang tersedia di portal saat ini.</span><a class="btn outline" href="podcast.html">Buka Podcast Hub</a></div>`;
  }

  function renderImpact() {
    const el = $("#publicImpact");
    if (!el) return;
    const arts = D.articles || [], cats = {};
    arts.forEach(a => cats[a.category] = (cats[a.category] || 0) + 1);
    const totalTags = new Set(arts.flatMap(a => a.tags || [])).size;
    const totalAuthors = new Set(arts.map(a => a.author).filter(Boolean)).size;
    el.innerHTML = `<div class="impact-counter-grid">
      ${[
        ["Publikasi", arts.length, "fa-newspaper"],
        ["Kegiatan", (D.activities||[]).length, "fa-calendar-days"],
        ["Jejaring", (D.directory||[]).length, "fa-people-group"],
        ["Topik", totalTags || Object.keys(cats).length, "fa-tags"]
      ].map(x=>`<div class="impact-counter-card"><i class="fa-solid ${x[2]}"></i><strong data-count="${x[1]}">0</strong><span>${x[0]}</span></div>`).join("")}
    </div>
    <div class="impact-bars">${Object.entries(cats).slice(0,6).map(([k,v]) => `
      <div class="impact-bar"><div><span>${esc(k)}</span><b>${v}</b></div>
      <i><em style="width:${Math.max(8, Math.round(v / Math.max(arts.length,1) * 100))}%"></em></i></div>`).join("")}</div>`;
    animateCounters(el);
  }

  /* -------------------------------------------------------------
     One search engine — integrated into the homepage flow.
  ------------------------------------------------------------- */
  /* -------------------------------------------------------------
     Article actions: reactions + bookmark.
  ------------------------------------------------------------- */
  function enhanceDetail() {
    const root = $("#articleDetail");
    if (!root || root.querySelector(".smart-article-tools")) return;
    const id = new URLSearchParams(location.search).get("id");
    const a = article(id || 1);
    if (!a) return;

    // Status verifikasi kini dirender langsung di samping kategori
    // oleh renderer detail artikel agar tidak muncul sebagai blok terpisah.
    const reactions = store("haak-reactions",{});
    const my = reactions[a.id] || null;

    const bar = document.createElement("div");
    bar.className = "smart-article-tools";
    bar.innerHTML = `
      <div class="reaction-group"><span>Bagaimana cerita ini terasa?</span>
        ${["❤️","👏","🤝","💡"].map(r=>`<button class="${my===r?"active":""}" data-react="${r}" aria-label="Reaksi ${r}">${r}</button>`).join("")}
      </div>`;
    root.appendChild(bar);

    $$("[data-react]",bar).forEach(b=>b.addEventListener("click",()=>{
      const next=store("haak-reactions",{}); next[a.id]=b.dataset.react; save("haak-reactions",next);
      $$("[data-react]",bar).forEach(x=>x.classList.toggle("active",x===b));
      notify("Reaksi Anda tersimpan di perangkat.");
    }));

    const hist=store("haak-reading-history",[]).filter(x=>x.id!==a.id);
    hist.unshift({id:a.id,at:Date.now()});
    save("haak-reading-history",hist.slice(0,30));
  }

  function initTopics() {
    const grid = $("#topicGrid");
    if (!grid) return;
    const groups = {};
    (D.articles || []).forEach(a => {
      (a.tags || []).forEach(tag => {
        if (!groups[tag]) groups[tag] = {count:0, categories:new Set()};
        groups[tag].count++;
        groups[tag].categories.add(a.category);
      });
    });
    const fallback = (D.categories || []).map(c => ({tag:c,count:(D.articles||[]).filter(a=>a.category===c).length,categories:new Set([c])}));
    const topics = Object.entries(groups).map(([tag,v])=>({tag,...v})).sort((a,b)=>b.count-a.count);
    const merged = topics.length ? topics : fallback;
    grid.innerHTML = merged.slice(0,18).map((x,i)=>`
      <a class="topic-card reveal" href="berita.html?q=${encodeURIComponent(x.tag)}">
        <i class="fa-solid ${["fa-people-group","fa-handshake","fa-dove","fa-graduation-cap","fa-earth-asia","fa-comments"][i%6]}"></i>
        <h2>${esc(x.tag)}</h2>
        <p>Jelajahi cerita, kegiatan, dan publikasi terkait tema ini.</p>
        <span class="topic-meta">${x.count} artikel · ${x.categories.size} kategori</span>
      </a>`).join("");
    if (window.initReveal) window.initReveal();
  }

  function animateCounters(root) {
    if (!root) return;
    root.querySelectorAll("[data-count]").forEach(el => {
      const target = Number(el.dataset.count) || 0;
      const start = performance.now();
      const duration = 700;
      const tick = now => {
        const p = Math.min(1,(now-start)/duration);
        el.textContent = Math.round(target * (1-Math.pow(1-p,3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* -------------------------------------------------------------
     Breaking News — memakai artikel terbaru yang sudah ada.
     Jika nanti data memiliki `breaking: true`, artikel tersebut diprioritaskan.
  ------------------------------------------------------------- */
  function initBreakingNews() {
    if (!document.body.classList.contains("home-page") && !$(".hero")) return;
    if ($("#haakBreakingNews")) return;

    /*
     * Breaking News sengaja ditempatkan setelah Hero dan tepat sebelum
     * section "Berita Pilihan". Dengan demikian ticker tidak lagi
     * bertabrakan dengan header, global search, maupun konten Hero.
     */
    const articles = [...(D.articles || [])].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const breaking = articles.find(a => a.breaking === true) || articles[0];
    if (!breaking) return;

    const bar = document.createElement("aside");
    bar.id = "haakBreakingNews";
    bar.className = "breaking-news-bar";
    bar.setAttribute("aria-label", "Breaking News");

    const href = `detail-berita.html?id=${encodeURIComponent(breaking.id)}`;
    const message = `⚡ ${breaking.title}  •  ${fmt(breaking.date)}`;

    /*
     * Track diduplikasi agar animasi marquee dapat berjalan mulus tanpa
     * berhenti ketika teks mencapai ujung container. Pengguna tetap
     * dapat mengklik ticker untuk membuka detail berita.
     */
    bar.innerHTML = `
      <div class="container breaking-news-inner">
        <div class="breaking-label" aria-hidden="true">
          <i class="fa-solid fa-bolt"></i>
          <span>Breaking News</span>
        </div>
        <a class="breaking-ticker" href="${href}" aria-label="Baca Breaking News: ${esc(breaking.title)}">
          <span class="breaking-ticker-viewport">
            <span class="breaking-ticker-track">
              <span class="breaking-ticker-item">${esc(message)}</span>
              <span class="breaking-ticker-item" aria-hidden="true">${esc(message)}</span>
            </span>
          </span>
        </a>
        <a class="breaking-arrow" href="${href}" aria-label="Baca Breaking News">
          <i class="fa-solid fa-arrow-right"></i>
        </a>
      </div>`;

    const hero = $(".hero");
    const featuredSection = hero?.nextElementSibling;

    /*
     * Prefer posisi sebelum Berita Pilihan. Fallback ke sesudah Hero
     * apabila struktur halaman berubah pada versi berikutnya.
     */
    if (featuredSection) {
      featuredSection.parentNode.insertBefore(bar, featuredSection);
    } else if (hero?.parentNode) {
      hero.parentNode.insertBefore(bar, hero.nextSibling);
    }
  }

  /* -------------------------------------------------------------
     Pusat Isu & Topik — menggunakan tags + kategori artikel yang sudah ada.
  ------------------------------------------------------------- */
  function enhanceTopicCenter() {
    const grid = $("#topicGrid");
    if (!grid) return;
    const articles = D.articles || [];
    const groups = {};
    articles.forEach(a => {
      const tags = (a.tags && a.tags.length) ? a.tags : [a.category];
      tags.forEach(tag => {
        const key = String(tag || "Umum").trim();
        if (!groups[key]) groups[key] = { count: 0, articles: [] };
        groups[key].count++;
        groups[key].articles.push(a);
      });
    });
    const topics = Object.entries(groups).sort((a,b)=>b[1].count-a[1].count || a[0].localeCompare(b[0],"id"));
    grid.innerHTML = topics.map(([tag, info], i) => {
      const latest = [...info.articles].sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
      const icon = ["fa-people-group","fa-handshake","fa-dove","fa-scale-balanced","fa-earth-asia","fa-comments","fa-heart","fa-seedling"][i%8];
      return `<article class="topic-card topic-card--rich reveal">
        <a href="berita.html?q=${encodeURIComponent(tag)}" class="topic-card-link">
          <span class="topic-icon"><i class="fa-solid ${icon}"></i></span>
          <div class="topic-card-copy"><small>ISU & TOPIK</small><h2>${esc(tag)}</h2>
          <p>${info.count} artikel membahas isu ini. Jelajahi cerita dan perjumpaan yang terkait.</p></div>
          <span class="topic-meta"><b>${info.count}</b> artikel <i class="fa-solid fa-arrow-right"></i></span>
        </a>
        ${latest ? `<a class="topic-latest" href="detail-berita.html?id=${latest.id}"><span>Terbaru</span><strong>${esc(latest.title)}</strong></a>` : ""}
      </article>`;
    }).join("");
    if (window.initReveal) window.initReveal();
  }

  /* -------------------------------------------------------------
     Reading History — membaca data history yang sudah dicatat oleh
     halaman detail. Tidak membuat sistem akun/backend baru.
  ------------------------------------------------------------- */
  function initReadingHistory() {
    const root = $("#readingHistoryList");
    if (!root) return;
    const count = $("#readingHistoryCount");
    const empty = $("#readingHistoryEmpty");
    const KEY = "haak-reading-history";

    const read = () => {
      const records = store(KEY, []);
      return records.map(x => ({...x, article: article(x.id)})).filter(x => x.article)
        .sort((a,b)=>(b.at||0)-(a.at||0));
    };
    const render = () => {
      const records = read();
      if (count) count.textContent = `${records.length} artikel dalam riwayat`;
      if (empty) empty.hidden = records.length > 0;
      root.innerHTML = records.map((record, index) => {
        const a = record.article;
        const when = record.at ? new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(record.at)) : "";
        return `<article class="history-card reveal">
          <a class="history-image" href="detail-berita.html?id=${a.id}"><img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy"></a>
          <div class="history-body"><div class="history-meta"><span class="badge">${esc(a.category)}</span><time>${esc(when)}</time></div>
          <h3><a href="detail-berita.html?id=${a.id}">${esc(a.title)}</a></h3><p>${esc(a.excerpt)}</p>
          <a class="text-link" href="detail-berita.html?id=${a.id}">Lanjutkan membaca <i class="fa-solid fa-arrow-right"></i></a></div>
          <span class="history-index">${String(index+1).padStart(2,"0")}</span>
        </article>`;
      }).join("");
      if (window.initReveal) window.initReveal();
    };
    $("#clearReadingHistory")?.addEventListener("click",()=>{
      localStorage.removeItem(KEY);
      render();
      notify("Riwayat bacaan telah dibersihkan di perangkat ini.");
    });
    render();
  }

  /* -------------------------------------------------------------
     Related Content Engine — memperkaya mesin terkait yang sudah ada
     dengan topik/tag sebagai jalur eksplorasi.
  ------------------------------------------------------------- */
  function enhanceRelatedContent() {
    const root = $("#articleDetail");
    if (!root || root.querySelector(".related-topic-strip")) return;
    const id = new URLSearchParams(location.search).get("id");
    const a = article(id || 1);
    if (!a) return;
    const tags = [...new Set([a.category, ...(a.tags||[])].filter(Boolean))];
    if (!tags.length) return;
    const related = document.createElement("div");
    related.className = "related-topic-strip";
    related.innerHTML = `<div><small>JELAJAHI LEBIH LANJUT</small><strong>Topik yang terhubung dengan artikel ini</strong></div><div class="related-topic-list">${tags.map(t=>`<a href="berita.html?q=${encodeURIComponent(t)}"><i class="fa-solid fa-hashtag"></i>${esc(t)}</a>`).join("")}</div>`;
    const target = root.querySelector(".article-content") || root.firstElementChild;
    target?.before(related);
  }

  /* -------------------------------------------------------------
     Podcast Hub — hanya menampilkan episode yang memiliki sumber audio
     resmi. Pemutaran menggunakan elemen <audio> native browser.
  ------------------------------------------------------------- */
  function initPodcastHub() {
    const root = $("#podcastHubList");
    if (!root) return;

    const podcasts = [...(D.podcasts || [])]
      .filter(item => item && (item.audio || item.src))
      .sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (!podcasts.length) {
      root.innerHTML = `<div class="media-empty media-page-empty media-page-empty--compact">
        <i class="fa-solid fa-podcast"></i>
        <h2>Belum ada episode podcast</h2>
        <p>Episode audio akan ditampilkan di halaman ini ketika rekaman resmi sudah tersedia.</p>
      </div>`;
      return;
    }

    root.innerHTML = podcasts.map((item,i) => {
      const audio = esc(item.audio || item.src);
      const thumb = item.thumbnail ? `<img src="${esc(item.thumbnail)}" alt="" loading="lazy">` : `<span class="media-hub-icon"><i class="fa-solid fa-podcast"></i></span>`;
      return `<article class="media-hub-card media-hub-card--podcast reveal">
        <div class="media-podcast-cover">${thumb}</div>
        <div class="media-hub-body">
          <span class="media-kicker">PODCAST · ${String(i+1).padStart(2,"0")}</span>
          <h3>${esc(item.title || "Episode Podcast HAAK")}</h3>
          <p>${esc(item.description || "Episode audio Komisi HAAK Keuskupan Malang.")}</p>
          <div class="media-hub-meta"><span>${item.date ? fmt(item.date) : "Audio resmi"}</span>${item.duration ? `<span>${esc(item.duration)}</span>` : ""}</div>
        </div>
        <div class="media-audio-wrap">
          <audio controls preload="none" src="${audio}" aria-label="Putar ${esc(item.title || "episode podcast")}"></audio>
        </div>
      </article>`;
    }).join("");
    if (window.initReveal) window.initReveal();
  }

  /* -------------------------------------------------------------
     Video Hub — hanya menampilkan data video yang benar-benar tersedia.
     Susunan visual: 1 → 2 → 2 → 1 → 2 → 2 ...
  ------------------------------------------------------------- */
  function initVideoHub() {
    const root = $("#videoHubList");
    if (!root) return;

    const videos = [...(D.videos || [])]
      .filter(item => item && (item.url || item.src || item.embed))
      .sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (!videos.length) {
      root.innerHTML = `<div class="media-empty media-page-empty media-page-empty--compact">
        <i class="fa-brands fa-youtube"></i>
        <h2>Belum ada video di portal</h2>
        <p>Video resmi akan ditampilkan di halaman ini ketika materi publikasinya sudah tersedia.</p>
      </div>`;
      return;
    }

    root.innerHTML = videos.map((item,i) => {
      const href = item.url || item.src || item.embed;
      const thumb = item.thumbnail || "";
      const visual = thumb
        ? `<img src="${esc(thumb)}" alt="${esc(item.title || "Video HAAK")}" loading="lazy"><span class="media-video-play"><i class="fa-solid fa-play"></i></span>`
        : `<span class="media-video-placeholder"><i class="fa-brands fa-youtube"></i><b>Video HAAK</b></span>`;
      return `<article class="media-video-card reveal">
        <a class="media-video-visual" href="${esc(href)}" target="_blank" rel="noopener" aria-label="Buka video ${esc(item.title || "HAAK")}">${visual}</a>
        <div class="media-video-copy">
          <span class="media-kicker">VIDEO · ${String(i+1).padStart(2,"0")}</span>
          <h3><a href="${esc(href)}" target="_blank" rel="noopener">${esc(item.title || "Video HAAK")}</a></h3>
          <p>${esc(item.description || "Video Komisi HAAK Keuskupan Malang.")}</p>
          <div class="media-hub-meta"><span>${item.date ? fmt(item.date) : "Video resmi"}</span></div>
        </div>
      </article>`;
    }).join("");
    if (window.initReveal) window.initReveal();
  }

  function init() {
    cleanupLegacyLanguageState();
    enhanceHomepage();
    enhanceDetail();
    initBreakingNews();
    initTopics();
    enhanceTopicCenter();
    initReadingHistory();
    enhanceRelatedContent();
    initPodcastHub();
    initVideoHub();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
