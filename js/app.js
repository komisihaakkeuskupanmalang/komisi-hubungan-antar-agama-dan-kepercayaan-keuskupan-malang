/*
 * JavaScript utama portal.
 * Menangani navigasi, tema, animasi, IndexedDB, pencarian global,
 * bookmark, riwayat baca, slider, lightbox, FAQ, formulir, dan utilitas.
 */
(() => {
  "use strict";

  const DATA = window.HAAK_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector),
  ];

  // ---------- IndexedDB client-side ----------
  const DB_NAME = "haakPortalDB";
  const DB_VERSION = 1;
  let dbPromise;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("bookmarks"))
          db.createObjectStore("bookmarks", { keyPath: "id" });
        if (!db.objectStoreNames.contains("history"))
          db.createObjectStore("history", { keyPath: "id" });
        if (!db.objectStoreNames.contains("preferences"))
          db.createObjectStore("preferences", { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function dbGet(store, key) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }
  async function dbPut(store, value) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(value);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      return false;
    }
  }
  async function dbDelete(store, key) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      return false;
    }
  }

  function toast(message) {
    const el = $("#haakToast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.__haakToastTimer);
    window.__haakToastTimer = setTimeout(
      () => el.classList.remove("show"),
      2600,
    );
  }

  // ---------- Tema ----------
  async function initTheme() {
    const saved = await dbGet("preferences", "theme");
    const theme = saved?.value || localStorage.getItem("haak-theme") || "light";
    document.documentElement.dataset.theme = theme;
    updateThemeIcon(theme);
  }
  function updateThemeIcon(theme) {
    const btn = $("#themeToggle");
    if (btn) {
      btn.innerHTML =
        theme === "dark"
          ? '<i class="fa-solid fa-sun"></i>'
          : '<i class="fa-solid fa-moon"></i>';
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap",
      );
      btn.title = btn.getAttribute("aria-label");
    }
  }
  async function toggleTheme() {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("haak-theme", next);
    await dbPut("preferences", { key: "theme", value: next });
    updateThemeIcon(next);
  }

  // ---------- Navigasi ----------
  function initNavigation() {
    const toggle = $("#menuToggle");
    const mobile = $("#mobileNav");

    // Dropdown navigasi dibangun konsisten pada desktop dan mobile melalui HTML.
    // JavaScript hanya mengelola state, active route, keyboard interaction, dan penutupan menu.
    const dropdowns = $$(".nav-dropdown");

    dropdowns.forEach((dropdown) => {
      const button = $(".nav-dropdown-toggle", dropdown);
      const menu = $(".nav-dropdown-menu", dropdown);
      if (!button || !menu) return;

      // Hindari listener ganda bila initNavigation dipanggil ulang.
      if (button.dataset.navReady === "true") return;
      button.dataset.navReady = "true";

      const setOpen = (open) => {
        dropdown.classList.toggle("open", open);
        button.setAttribute("aria-expanded", String(open));
      };

      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        // Hanya satu dropdown terbuka dalam satu waktu.
        dropdowns.forEach((other) => {
          if (other !== dropdown) {
            other.classList.remove("open");
            $(".nav-dropdown-toggle", other)?.setAttribute("aria-expanded", "false");
          }
        });
        setOpen(!dropdown.classList.contains("open"));
      });

      button.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setOpen(true);
          $("a", menu)?.focus();
        }
        if (event.key === "Escape") setOpen(false);
      });

      $$("a", menu).forEach((link) => {
        link.addEventListener("click", () => {
          setOpen(false);
          if (mobile) {
            mobile.classList.remove("open");
            document.body.classList.remove("menu-open");
            toggle?.setAttribute("aria-expanded", "false");
          }
        });
      });
    });

    toggle?.addEventListener("click", () => {
      const open = mobile?.classList.toggle("open");
      document.body.classList.toggle("menu-open", Boolean(open));
      toggle.setAttribute("aria-expanded", String(Boolean(open)));
      if (!open) {
        $$("#mobileNav .nav-dropdown.open").forEach((dropdown) => {
          dropdown.classList.remove("open");
          $(".nav-dropdown-toggle", dropdown)?.setAttribute("aria-expanded", "false");
        });
      }
    });

    $$("#mobileNav > .container > a").forEach((a) =>
      a.addEventListener("click", () => {
        mobile?.classList.remove("open");
        document.body.classList.remove("menu-open");
        toggle?.setAttribute("aria-expanded", "false");
      }),
    );

    $("#themeToggle")?.addEventListener("click", toggleTheme);

    const current = location.pathname.split("/").pop() || "index.html";
    $$(`[data-nav]`).forEach((a) => {
      if (a.getAttribute("href") === current || (current === "" && a.getAttribute("href") === "index.html")) {
        a.classList.add("active");
      }
    });

    // Parent dropdown otomatis aktif ketika halaman turunannya sedang dibuka.
    dropdowns.forEach((dropdown) => {
      const activeChild = [...dropdown.querySelectorAll("a[data-nav]")]
        .some((a) => a.getAttribute("href") === current);
      dropdown.classList.toggle("has-active", activeChild);
    });

    document.addEventListener("click", (event) => {
      dropdowns.forEach((dropdown) => {
        if (!dropdown.contains(event.target)) {
          dropdown.classList.remove("open");
          $(".nav-dropdown-toggle", dropdown)?.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  // ---------- Animasi scroll ----------
  function initReveal() {
    const elements = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    elements.forEach((el) => observer.observe(el));
  }

  // ---------- Slider ----------
  function initHeroSlider() {
    const slides = $$(".hero-slide");
    const dots = $$(".hero-dot");
    if (slides.length < 2) return;
    let index = 0;
    const show = (i) => {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, n) => s.classList.toggle("active", n === index));
      dots.forEach((d, n) => d.classList.toggle("active", n === index));
    };
    dots.forEach((d, i) => d.addEventListener("click", () => show(i)));
    setInterval(() => show(index + 1), 6000);
  }

  // ---------- Smart Back To Top / Bottom ----------
  // Arah ikon mengikuti arah scroll terakhir:
  // - Scroll ke bawah  -> panah bawah -> klik menuju paling bawah.
  // - Scroll ke atas   -> panah atas -> klik menuju paling atas.
  function initBackTop() {
    const btn = $("#backTop");
    if (!btn) return;

    const icon = btn.querySelector("i");
    let lastScrollY = Math.max(0, window.scrollY || 0);
    let direction = "up"; // aksi default: menuju atas

    const setDirection = (nextDirection) => {
      direction = nextDirection;
      btn.dataset.direction = direction;

      if (icon) {
        icon.classList.remove("fa-arrow-up", "fa-arrow-down");
        icon.classList.add(direction === "up" ? "fa-arrow-up" : "fa-arrow-down");
      }

      const goTo = direction === "up" ? "Kembali ke atas" : "Ke bagian bawah";
      btn.setAttribute("aria-label", goTo);
      btn.setAttribute("title", goTo);
    };

    const sync = () => {
      const currentY = Math.max(0, window.scrollY || 0);
      const delta = currentY - lastScrollY;

      // Hindari perubahan ikon karena pergerakan 1-2px akibat browser/mobile UI.
      if (Math.abs(delta) >= 4) {
        setDirection(delta > 0 ? "down" : "up");
        lastScrollY = currentY;
      }

      btn.classList.toggle("visible", currentY > 500);
    };

    setDirection("up");
    sync();

    window.addEventListener("scroll", sync, { passive: true });

    btn.addEventListener("click", () => {
      const target = direction === "down"
        ? Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
        : 0;

      window.scrollTo({ top: target, behavior: "smooth" });
    });
  }

  // ---------- Floating Social Media ----------
  function initSocialFloat() {
    if (document.querySelector(".haak-social-float")) return;

    const social = document.createElement("div");
    social.className = "haak-social-float";
    social.innerHTML = `
      <div class="haak-social-items" aria-hidden="true">
        <a class="haak-social-item instagram" href="https://www.instagram.com/komisihaakkeuskupanmalang?stkn=MTg5aGx5dDRldW51aA==" target="_blank" rel="noopener noreferrer" aria-label="Instagram HAAK Keuskupan Malang" title="Instagram">
          <i class="fa-brands fa-instagram" aria-hidden="true"></i>
          <span>Instagram</span>
        </a>
        <a class="haak-social-item facebook" href="https://www.facebook.com/share/1EiLzw3Mqq/" target="_blank" rel="noopener noreferrer" aria-label="Facebook HAAK Keuskupan Malang" title="Facebook">
          <i class="fa-brands fa-facebook-f" aria-hidden="true"></i>
          <span>Facebook</span>
        </a>
        <a class="haak-social-item youtube" href="https://www.youtube.com/@KomisiHAAKKeuskupanMalang" target="_blank" rel="noopener noreferrer" aria-label="YouTube HAAK Keuskupan Malang" title="YouTube">
          <i class="fa-brands fa-youtube" aria-hidden="true"></i>
          <span>YouTube</span>
        </a>
        <a class="haak-social-item tiktok" href="https://www.tiktok.com/@haak.keuskupan.malang?_r=1&_t=ZS-99dkDotbOUe" target="_blank" rel="noopener noreferrer" aria-label="TikTok HAAK Keuskupan Malang" title="TikTok">
          <i class="fa-brands fa-tiktok" aria-hidden="true"></i>
          <span>TikTok</span>
        </a>
      </div>
      <button class="haak-social-toggle" type="button" aria-label="Buka media sosial" aria-expanded="false" aria-controls="haakSocialItems">
        <i class="fa-solid fa-plus" aria-hidden="true"></i>
      </button>
    `;

    const items = social.querySelector(".haak-social-items");
    items.id = "haakSocialItems";
    const toggle = social.querySelector(".haak-social-toggle");

    toggle.addEventListener("click", () => {
      const open = social.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Tutup media sosial" : "Buka media sosial");
      items.setAttribute("aria-hidden", String(!open));
    });

    // Sama seperti Back To Top: tampil setelah pengguna mulai menggulir.
    const syncVisibility = () => {
      social.classList.toggle("is-visible", window.scrollY > 500);
    };
    window.addEventListener("scroll", syncVisibility, { passive: true });
    syncVisibility();

    document.body.appendChild(social);
  }

  // ---------- Kartu artikel ----------
  function articleCard(article) {
    return `<article class="news-card reveal">
      <a href="detail-berita.html?id=${article.id}" aria-label="Baca ${escapeHtml(article.title)}">
        <div class="card-image"><img src="${article.image}" alt="${escapeHtml(article.title)}" loading="lazy"></div>
        <div class="card-body">
          <div class="article-labels" aria-label="Kategori dan status artikel">
            <span class="badge">${escapeHtml(article.category)}</span>
            <span class="verification-inline" title="Artikel terverifikasi">
              <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
              <span>Terverifikasi</span>
            </span>
          </div>
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.excerpt)}</p>
          ${article.relatedReason ? `<span class="related-reason">${escapeHtml(article.relatedReason)}</span>` : ""}
          <div class="meta-row"><span>${formatDate(article.date)}</span><span>${estimateRead(article)} menit baca</span></div>
        </div>
      </a>
    </article>`;
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(date + "T00:00:00"));
  }
  function estimateRead(article) {
    return Math.max(3, Math.round((article.excerpt.length + 900) / 280));
  }
  function escapeHtml(value) {
    return String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[c],
    );
  }

  function normalizedText(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getArticleById(id) {
    return DATA.articles.find((article) => article.id === Number(id));
  }

  // ---------- Render beranda ----------
  function renderHome() {
    const featured = $("#featuredNews");
    if (!featured) return;
    const articles = DATA.articles;
    const feature = articles.find((a) => a.featured) || articles[0];
    featured.innerHTML = `<div class="feature-main">
      <img src="${feature.image}" alt="${escapeHtml(feature.title)}">
      <div class="feature-main-content">
        <div class="article-labels article-labels--feature" aria-label="Kategori dan status artikel">
          <span class="badge">${escapeHtml(feature.category)}</span>
          <span class="verification-inline" title="Artikel terverifikasi">
            <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
            <span>Terverifikasi</span>
          </span>
        </div>
        <h3>${escapeHtml(feature.title)}</h3>
        <div class="article-meta"><span>${formatDate(feature.date)}</span><span>${feature.author}</span></div>
      </div>
    </div>
    <div class="side-list">${articles
        .filter((a) => a.id !== feature.id)
        .slice(0, 4)
        .map(
          (a) => `<a class="side-news" href="detail-berita.html?id=${a.id}">
      <img src="${a.image}" alt="${escapeHtml(a.title)}" loading="lazy">
      <div><time>${formatDate(a.date)}</time><h4>${escapeHtml(a.title)}</h4></div>
    </a>`,
        )
        .join("")}</div>`;

    const latest = $("#latestNews");
    if (latest)
      latest.innerHTML = articles.slice(0, 6).map(articleCard).join("");

    const cats = $("#categoryList");
    if (cats)
      cats.innerHTML = DATA.categories
        .slice(0, 8)
        .map(
          (c, i) =>
            `<a class="category-item reveal" href="kategori.html?cat=${encodeURIComponent(c)}">${escapeHtml(c)}<small>${articles.filter((a) => a.category === c).length} artikel tersedia</small></a>`,
        )
        .join("");

    const activities = $("#activityList");
    if (activities)
      activities.innerHTML = DATA.activities
        .map(
          (a) => `<article class="activity-card reveal">
      <div class="activity-date">${escapeHtml(a.date)}</div><h3>${escapeHtml(a.title)}</h3><p><i class="fa-solid fa-location-dot"></i> ${escapeHtml(a.location)}</p><p>${escapeHtml(a.desc)}</p><span class="status">${escapeHtml(a.status)}</span>
    </article>`,
        )
        .join("");

    const dialog = $("#dialogNews");
    if (dialog)
      dialog.innerHTML = articles
        .filter((a) => a.category === "Dialog")
        .map(articleCard)
        .join("");

    const reflection = $("#reflectionNews");
    if (reflection)
      reflection.innerHTML = articles
        .filter((a) => a.category === "Harmoni")
        .map(articleCard)
        .join("");
  }

  // ---------- Halaman daftar berita ----------
  function initNewsListing() {
    const root = $("#newsListing");
    if (!root) return;

    const form = $("#advancedSearchForm");
    const search = $("#newsSearch");
    const category = $("#newsCategory");
    const year = $("#newsYear");
    const tag = $("#newsTag");
    const sort = $("#newsSort");
    const clear = $("#clearSearch");
    const toggle = $("#advancedToggle");
    const panel = $("#advancedSearchPanel");
    const pagination = $("#pagination");
    let page = 1;
    const perPage = 6;

    if (category) {
      category.innerHTML = '<option value="">Semua kategori</option>' +
        DATA.categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    }

    const years = [...new Set(DATA.articles.map((a) => String(a.date).slice(0, 4)))].sort((a, b) => b - a);
    if (year) year.innerHTML = '<option value="">Semua tahun</option>' +
      years.map((y) => `<option value="${y}">${y}</option>`).join("");

    const tags = [...new Set(DATA.articles.flatMap((a) => a.tags || []))].sort((a, b) => a.localeCompare(b, "id"));
    if (tag) tag.innerHTML = '<option value="">Semua topik</option>' +
      tags.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");

    function normalized(text) {
      return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function searchable(article) {
      const content = Array.isArray(article.content) ? article.content.join(" ") : (article.content || "");
      return normalized([
        article.title,
        article.category,
        article.excerpt,
        article.author,
        ...(article.tags || []),
        content.replace(/<[^>]*>/g, " ")
      ].join(" "));
    }

    function relevanceScore(article, q) {
      if (!q) return 0;
      const query = normalized(q);
      const title = normalized(article.title);
      const excerpt = normalized(article.excerpt);
      const categoryText = normalized(article.category);
      const tagsText = normalized((article.tags || []).join(" "));
      const author = normalized(article.author);
      let score = 0;
      if (title === query) score += 100;
      if (title.includes(query)) score += 55;
      if (tagsText.includes(query)) score += 35;
      if (categoryText.includes(query)) score += 28;
      if (author.includes(query)) score += 18;
      if (excerpt.includes(query)) score += 12;
      if (searchable(article).includes(query)) score += 4;
      return score;
    }

    function getFiltered() {
      const q = search?.value.trim() || "";
      let list = DATA.articles.filter((article) => {
        const matchesQuery = !q || searchable(article).includes(normalized(q));
        const matchesCategory = !category?.value || article.category === category.value;
        const matchesYear = !year?.value || String(article.date).startsWith(year.value);
        const matchesTag = !tag?.value || (article.tags || []).includes(tag.value);
        return matchesQuery && matchesCategory && matchesYear && matchesTag;
      });

      if (sort?.value === "relevance" && q) {
        list.sort((x, y) => relevanceScore(y, q) - relevanceScore(x, q) || new Date(y.date) - new Date(x.date));
      } else {
        list.sort((x, y) =>
          sort?.value === "oldest"
            ? new Date(x.date) - new Date(y.date)
            : new Date(y.date) - new Date(x.date)
        );
      }
      return list;
    }

    function render() {
      const list = getFiltered();
      const pages = Math.max(1, Math.ceil(list.length / perPage));
      page = Math.min(page, pages);
      const slice = list.slice((page - 1) * perPage, page * perPage);

      root.innerHTML = slice.length
        ? slice.map(articleCard).join("")
        : `<div class="empty-state" style="grid-column:1/-1"><i class="fa-regular fa-newspaper"></i><h3>Berita tidak ditemukan</h3><p>Coba kata kunci, tahun, topik, atau kategori lain.</p></div>`;

      pagination.innerHTML = Array.from(
        { length: pages },
        (_, i) => `<button class="${i + 1 === page ? "active" : ""}" data-page="${i + 1}" aria-label="Halaman ${i + 1}">${i + 1}</button>`
      ).join("");

      $$("button[data-page]", pagination).forEach((button) =>
        button.addEventListener("click", () => {
          page = Number(button.dataset.page);
          render();
          window.scrollTo({ top: 300, behavior: "smooth" });
        })
      );
      initReveal();
    }

    [search, category, year, tag, sort].filter(Boolean).forEach((el) =>
      el.addEventListener("input", () => {
        page = 1;
        render();
      })
    );

    toggle?.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      if (panel) panel.hidden = open;
    });

    clear?.addEventListener("click", () => {
      if (search) search.value = "";
      if (category) category.value = "";
      if (year) year.value = "";
      if (tag) tag.value = "";
      if (sort) sort.value = "relevance";
      page = 1;
      render();
      search?.focus();
    });

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = search?.value.trim() || "";
      if (q) {
        try {
          const key = "haak-search-history";
          const old = JSON.parse(localStorage.getItem(key) || "[]");
          localStorage.setItem(key, JSON.stringify([q, ...old.filter((x) => normalizedText(x) !== normalizedText(q))].slice(0, 8)));
        } catch {}
      }
    });
    render();
  }

  // ---------- Rekomendasi artikel terkait cerdas ----------
  function smartRelatedArticles(article, limit = 4) {
    const currentTags = new Set((article.tags || []).map((t) => t.toLowerCase()));
    const currentWords = new Set(
      normalizedWords(`${article.title} ${article.excerpt}`).filter((w) => w.length > 4)
    );

    return DATA.articles
      .filter((candidate) => candidate.id !== article.id)
      .map((candidate) => {
        let score = 0;
        const candidateTags = (candidate.tags || []).map((t) => t.toLowerCase());
        const sharedTags = candidateTags.filter((t) => currentTags.has(t)).length;
        score += sharedTags * 30;
        if (candidate.category === article.category) score += 24;

        const words = normalizedWords(`${candidate.title} ${candidate.excerpt}`);
        const sharedWords = words.filter((w) => currentWords.has(w)).length;
        score += Math.min(sharedWords, 8) * 3;

        if (candidate.author === article.author) score += 2;
        const days = Math.abs(new Date(candidate.date) - new Date(article.date)) / 86400000;
        score += Math.max(0, 8 - Math.min(days / 30, 8));

        const reasons = [];
        if (candidate.category === article.category) reasons.push("Kategori sama");
        if (sharedTags) reasons.push(`${sharedTags} tag sama`);
        if (sharedWords >= 2) reasons.push("Topik beririsan");

        return { candidate, score, reason: reasons[0] || "Topik berdekatan" };
      })
      .sort((a, b) => b.score - a.score || new Date(b.candidate.date) - new Date(a.candidate.date))
      .slice(0, limit)
      .map(({ candidate, reason }) => ({ ...candidate, relatedReason: reason }));
  }

  function normalizedWords(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !["untuk", "dengan", "dalam", "yang", "antar", "agama", "kepercayaan", "komisi", "malang"].includes(w));
  }

  // ---------- Dokumentasi tambahan per artikel ----------
  // Sumber utama: article.documentation.
  // Fallback: DATA.gallery yang memiliki articleId sesuai artikel.
  // Gambar utama selalu dikeluarkan agar tidak masuk ke marquee/lightbox.
  function getArticleDocumentation(article) {
    const mainSrc = String(article?.image || "").trim();

    const manual = Array.isArray(article?.documentation)
      ? article.documentation
      : [];

    const galleryFallback = (DATA.gallery || []).filter(
      (item) => Number(item?.articleId) === Number(article?.id),
    );

    const source = manual.length ? manual : galleryFallback;

    const seen = new Set();

    return source
      .map((item, index) => {
        if (typeof item === "string") {
          return { src: item, caption: `Dokumentasi ${index + 1}` };
        }
        return {
          src: item?.src || item?.image || "",
          caption: item?.caption || item?.alt || `Dokumentasi ${index + 1}`,
        };
      })
      .filter((item) => {
        const src = String(item.src || "").trim();
        if (!src || src === mainSrc || seen.has(src)) return false;
        seen.add(src);
        return true;
      });
  }

  function renderArticleDocumentation(article) {
    const items = getArticleDocumentation(article);

    // Tetap menyediakan section "Dokumentasi lainnya" pada setiap detail artikel.
    // Jika belum ada file tambahan, section memberi penanda yang aman tanpa
    // membuat gambar utama ikut masuk ke lightbox.
    if (!items.length) {
      return `
        <section class="article-documentation" aria-labelledby="articleDocumentationTitle">
          <div class="article-documentation-head">
            <div>
              <span class="eyebrow">Dokumentasi</span>
              <h2 id="articleDocumentationTitle">Dokumentasi lainnya</h2>
            </div>
          </div>
          <div class="article-documentation-empty">
            Dokumentasi tambahan untuk artikel ini belum ditambahkan.
          </div>
        </section>
      `;
    }

    const renderItem = (item, index, clone = false) => `
      <button
        class="article-documentation-item"
        type="button"
        data-doc-index="${index}"
        ${clone ? 'data-lightbox-clone="true" aria-hidden="true" tabindex="-1"' : ""}
        aria-label="Lihat dokumentasi ${index + 1}"
      >
        <img
          src="${escapeHtml(item.src)}"
          alt="${escapeHtml(item.caption)}"
          loading="lazy"
          decoding="async"
          draggable="false"
          ${clone ? 'data-lightbox-clone="true"' : ""}
        >
      </button>
    `;

    // Dua group identik membuat marquee benar-benar seamless.
    // Setiap group memiliki ukuran yang sama sehingga perpindahan -50%
    // selalu kembali tepat ke posisi awal, terlepas dari jumlah foto.
    // Tiga putaran di dalam tiap group menjaga lintasan tetap terisi bahkan
    // ketika sebuah artikel hanya memiliki 1–2 foto. Data index tetap menunjuk
    // ke dokumentasi asli, sedangkan group kedua hanya untuk loop visual.
    // Keep the first group limited to the real documentation items so mobile
    // can present a clean touch rail without repeated thumbnails. Desktop gets
    // a denser visual group for a continuous marquee.
    const groupItems = Array.from({ length: 3 }, () => items).flat();
    const mobileItems = items;
    const track = groupItems
      .map((item, index) => renderItem(item, index % items.length))
      .join("");
    const mobileTrack = mobileItems
      .map((item, index) => renderItem(item, index % items.length))
      .join("");
    const clone = groupItems
      .map((item, index) => renderItem(item, index % items.length, true))
      .join("");

    return `
      <section class="article-documentation" aria-labelledby="articleDocumentationTitle">
        <div class="article-documentation-head">
          <div>
            <span class="eyebrow">Dokumentasi</span>
            <h2 id="articleDocumentationTitle">Dokumentasi lainnya</h2>
            <p>Foto dokumentasi kegiatan terkait artikel ini.</p>
          </div>
        </div>

        <div class="article-documentation-viewport" data-doc-count="${items.length}">
          <div class="article-documentation-track">
            <div class="article-documentation-group" aria-label="Dokumentasi kegiatan">
              <div class="article-documentation-desktop-track" aria-hidden="true">${track}</div>
              <div class="article-documentation-mobile-track">${mobileTrack}</div>
            </div>
            <div class="article-documentation-group" aria-hidden="true">
              ${clone}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ---------- Detail berita ----------
async function initDetail() {

  /* =========================================================
   * Inisialisasi container detail artikel
   * ========================================================= */
  const root = $("#articleDetail");

  if (!root) return;


  /* =========================================================
   * Ambil ID artikel dari URL
   *
   * Contoh:
   * detail-berita.html?id=3
   * ========================================================= */
  const id =
    Number(
      new URLSearchParams(location.search).get("id")
    ) || 1;


  /* =========================================================
   * Cari artikel berdasarkan ID
   * ========================================================= */
  const article =
    DATA.articles.find((a) => a.id === id) ||
    DATA.articles[0];


  /* =========================================================
   * Cari artikel terkait
   *
   * Prioritas:
   * 1. Kategori yang sama
   * 2. Memiliki tag yang sama
   * ========================================================= */
  const related = smartRelatedArticles(article, 4);


  /* =========================================================
   * Artikel sebelumnya dan berikutnya
   * ========================================================= */
  const previous = DATA.articles.find(
    (a) => a.id === article.id - 1,
  );

  const next = DATA.articles.find(
    (a) => a.id === article.id + 1,
  );


  /* =========================================================
   * Siapkan isi artikel
   *
   * Setiap artikel mempunyai property "content" sendiri.
   *
   * Format yang didukung:
   *
   * content: [
   *   "<p>Paragraf...</p>",
   *   "<h2>Judul...</h2>",
   *   "<p>Paragraf...</p>"
   * ]
   *
   * atau:
   *
   * content: "<p>Isi artikel...</p>"
   * ========================================================= */
  const articleContent =
    Array.isArray(article.content)
      ? article.content.join("")
      : (
          article.content ||
          `
            <p>
              Konten berita belum tersedia.
            </p>
          `
        );


  /* =========================================================
   * Render halaman detail artikel
   * ========================================================= */
  root.innerHTML = `
    <div class="breadcrumb">
      <a href="index.html">Beranda</a>
      <span>/</span>
      <a href="berita.html">Berita</a>
      <span>/</span>
      <span>
        ${escapeHtml(article.category)}
      </span>
    </div>


    <div class="article-labels article-labels--detail" aria-label="Kategori dan status artikel">
      <span class="badge">
        ${escapeHtml(article.category)}
      </span>
      <span class="verification-inline verification-inline--detail" title="Artikel terverifikasi">
        <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
        <span>Terverifikasi</span>
      </span>
    </div>


    <h1
      style="
        font-size:clamp(2rem,5vw,4rem);
        line-height:1.08;
        letter-spacing:-.05em;
        margin:14px 0;
      "
    >
      ${escapeHtml(article.title)}
    </h1>


    <p
      style="
        font-size:1rem;
        color:var(--haak-muted);
        max-width:760px;
      "
    >
      ${escapeHtml(article.excerpt)}
    </p>


    <div
      class="article-meta"
      style="color:var(--haak-muted)"
    >
      <span>
        ${formatDate(article.date)}
      </span>

      <span>
        ${escapeHtml(article.author)}
      </span>

      <span>
        ${estimateRead(article)} menit baca
      </span>
    </div>


    <img
      class="article-cover"
      src="${article.image}"
      alt="${escapeHtml(article.title)}"
    >

    ${renderArticleDocumentation(article)}


    <!-- =====================================================
         Tombol aksi artikel
         ===================================================== -->
    <div class="share-bar">

      <button
        class="btn gold"
        id="shareArticle"
        type="button"
      >
        <i class="fa-solid fa-share-nodes"></i>
        Bagikan
      </button>
</div>


    <!-- =====================================================
         ISI BERITA DINAMIS
         
         Isi diambil dari:
         article.content
         
         sehingga setiap berita dapat mempunyai
         isi yang berbeda.
         ===================================================== -->
    <div class="article-content">
      ${articleContent}
    </div>

<!-- =====================================================
     Navigasi artikel
     ===================================================== -->
<div
  class="share-bar"
  style="
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:12px;
  "
>

  ${
    previous
      ? `
        <a
          class="btn outline"
          href="detail-berita.html?id=${previous.id}"
          style="
            width:100%;
            justify-content:center;
          "
        >
          <i class="fa-solid fa-arrow-left"></i>
          Berita sebelumnya
        </a>
      `
      : `
        <div></div>
      `
  }


  ${
    next
      ? `
        <a
          class="btn outline"
          href="detail-berita.html?id=${next.id}"
          style="
            width:100%;
            justify-content:center;
          "
        >
          Berita berikutnya
          <i class="fa-solid fa-arrow-right"></i>
        </a>
      `
      : `
        <div></div>
      `
  }

</div>


<!-- =====================================================
     Tombol kembali ke halaman berita
     ===================================================== -->
<a
  class="btn"
  href="berita.html"
  style="
    width:100%;
    display:flex;
    justify-content:center;
    align-items:center;
    margin-top:12px;
  "
>
  <i class="fa-solid fa-newspaper"></i>
  Kembali ke Berita
</a>


    <!-- =====================================================
         Artikel terkait
         ===================================================== -->
    <section
      class="section"
      style="padding:45px 0 0"
    >

      <div class="section-head">

        <div>

          <span class="eyebrow">
            Bacaan terkait
          </span>

          <h2>
            Artikel yang mungkin Anda sukai
          </h2>

        </div>

      </div>


      <div class="news-grid">
        ${related.map(articleCard).join("")}
      </div>

    </section>
  `;


  /* =========================================================
   * Simpan artikel ke history
   * ========================================================= */
  await dbPut("history", {
    id: article.id,
    title: article.title,
    date: Date.now(),
  });



  /* =========================================================
   * Event tombol share
   * ========================================================= */
  $("#shareArticle")?.addEventListener(
    "click",
    async () => {

      const shareData = {

        title: article.title,

        text: article.excerpt,

        url: location.href,

      };


      /* -------------------------------------------------------
       * Gunakan Web Share API jika tersedia
       * ------------------------------------------------------- */
      if (navigator.share) {

        try {

          await navigator.share(
            shareData,
          );

        } catch {

          /*
           * User membatalkan dialog share.
           * Tidak perlu menampilkan error.
           */

        }


      /* -------------------------------------------------------
       * Fallback ke clipboard
       * ------------------------------------------------------- */
      } else if (navigator.clipboard) {

        await navigator.clipboard.writeText(
          location.href,
        );


        toast(
          "Tautan artikel berhasil disalin.",
        );


      /* -------------------------------------------------------
       * Fallback terakhir
       * ------------------------------------------------------- */
      } else {

        toast(
          "Silakan salin alamat halaman dari peramban Anda.",
        );

      }

    },
  );


  /* =========================================================
   * Inisialisasi animasi/reveal
   * ========================================================= */
  initReveal();

}

  // ---------- Kategori ----------
  function initCategory() {
    const root = $("#categoryListing");
    if (!root) return;
    const selected = new URLSearchParams(location.search).get("cat") || "";
    const title = $("#categoryTitle");
    title.textContent = selected || "Semua Kategori";
    const list = selected
      ? DATA.articles.filter((a) => a.category === selected)
      : DATA.articles;
    root.innerHTML = list.length
      ? list.map(articleCard).join("")
      : `<div class="empty-state" style="grid-column:1/-1"><h3>Belum ada artikel</h3><p>Belum ada artikel yang tersedia untuk kategori ini.</p></div>`;
    $("#allCategories").innerHTML = DATA.categories
      .map(
        (c) =>
          `<a class="category-item" href="kategori.html?cat=${encodeURIComponent(c)}">${escapeHtml(c)}<small>${DATA.articles.filter((a) => a.category === c).length} artikel</small></a>`,
      )
      .join("");
    initReveal();
  }

  // ---------- Dokumentasi / gallery ----------
  // Image Lightbox Pro (v21.2) menangani preview foto secara global.
  // Halaman dokumentasi hanya bertugas merender kartu galeri + animasinya.
  function initGallery() {
    const grid = $("#galleryGrid");
    if (!grid) return;

    const items = DATA.gallery || [];
    grid.classList.add("is-enhanced");
    grid.innerHTML = items.map((g, i) =>
      `<button class="gallery-item" type="button" data-gallery="${i}" aria-label="Lihat foto: ${escapeHtml(g.caption)}"><img src="${g.src}" alt="${escapeHtml(g.caption)}" loading="lazy"></button>`
    ).join("");

    if (window.gsap && window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
      requestAnimationFrame(() => {
        gsap.fromTo(".gallery-item", {opacity:0, y:16, scale:.985}, {
          opacity:1, y:0, scale:1, duration:.8,
          stagger:{each:.075, from:"start"}, ease:"power3.out", overwrite:true,
          onStart:() => $$(".gallery-item", grid).forEach(el => el.classList.add("gallery-in"))
        });
      });
    } else {
      $$(".gallery-item", grid).forEach(el => el.classList.add("gallery-in"));
    }

    initGalleryThree();
  }

  // ---------- Three.js visual layer for Documentation ----------
  function initGalleryThree() {
    const canvas = $("#galleryThreeCanvas");
    const stage = $("#galleryVisualStage");
    if (!canvas || !stage || !window.THREE) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    try {
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
      camera.position.z = 7;

      const group = new THREE.Group();
      scene.add(group);

      const geometry = new THREE.BufferGeometry();
      const count = 90;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - .5) * 8;
        positions[i * 3 + 1] = (Math.random() - .5) * 2.8;
        positions[i * 3 + 2] = (Math.random() - .5) * 3;
      }
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        color: 0xb9973e,
        size: .045,
        transparent: true,
        opacity: .72,
        depthWrite: false
      });
      const points = new THREE.Points(geometry, material);
      group.add(points);

      const resize = () => {
        const rect = stage.getBoundingClientRect();
        const width = Math.max(1, rect.width);
        const height = Math.max(96, rect.height);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener("resize", resize, { passive: true });

      let raf = 0;
      const animate = () => {
        group.rotation.y += .0009;
        group.rotation.x = Math.sin(performance.now() * .00035) * .035;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      animate();

      // GSAP gently drifts the visual layer, while Three.js owns the render loop.
      if (window.gsap) {
        gsap.to(points.rotation, {
          z: Math.PI * 2,
          duration: 70,
          repeat: -1,
          ease: "none"
        });
        gsap.to(material, {
          opacity: .38,
          duration: 2.6,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut"
        });
      }

      window.addEventListener("pagehide", () => {
        cancelAnimationFrame(raf);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      }, { once: true });
    } catch (error) {
      // The gallery remains fully usable if WebGL is unavailable.
      stage.classList.add("no-webgl");
    }
  }

  // ---------- FAQ ----------
  function initFaq() {
    $$(".faq-button").forEach((btn) =>
      btn.addEventListener("click", () => {
        const item = btn.closest(".faq-item");
        const open = item.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(open));
      }),
    );
  }

  // ---------- Form kontak ----------

function initContactForm() {
  const form = $("#contactForm");

  if (!form) return;

  const OFFICIAL_EMAIL = "komisihaakkeuskupanmalang.cs@gmail.com";

  const nama = $("#nama");
  const email = $("#email");
  const subjek = $("#subjek");
  const pesan = $("#pesan");
  const submitButton = $("#contactSubmit");

  function setError(id, message) {
    const element = $(`#${id}`);

    if (element) {
      element.textContent = message;
    }
  }

  function clearErrors() {
    $$("[data-error]", form).forEach((element) => {
      element.textContent = "";
    });
  }

  function cleanText(value) {
    return value
      .replace(/\s+/g, " ")
      .trim();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
  }

  function sanitizeMailtoValue(value) {
    return value
      .replace(/[\r\n]+/g, " ")
      .trim();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    clearErrors();

    let valid = true;

    const namaValue = cleanText(nama?.value || "");
    const emailValue = cleanText(email?.value || "");
    const subjekValue = cleanText(subjek?.value || "");
    const pesanValue = cleanText(pesan?.value || "");

    if (!namaValue) {
      setError("namaError", "Nama wajib diisi.");
      valid = false;

    } else if (namaValue.length < 3) {
      setError(
        "namaError",
        "Nama minimal terdiri dari 3 karakter."
      );
      valid = false;

    } else if (namaValue.length > 100) {
      setError(
        "namaError",
        "Nama maksimal 100 karakter."
      );
      valid = false;
    }

    if (!emailValue) {
      setError(
        "emailError",
        "Alamat email wajib diisi."
      );
      valid = false;

    } else if (!isValidEmail(emailValue)) {
      setError(
        "emailError",
        "Masukkan alamat email yang valid."
      );
      valid = false;
    }

    if (subjekValue.length > 150) {
      setError(
        "subjekError",
        "Subjek maksimal 150 karakter."
      );
      valid = false;
    }

    if (!pesanValue) {
      setError(
        "pesanError",
        "Pesan wajib diisi."
      );
      valid = false;

    } else if (pesanValue.length < 10) {
      setError(
        "pesanError",
        "Pesan minimal terdiri dari 10 karakter."
      );
      valid = false;

    } else if (pesanValue.length > 5000) {
      setError(
        "pesanError",
        "Pesan maksimal 5.000 karakter."
      );
      valid = false;
    }

    if (!valid) {
      toast("Mohon periksa kembali data yang Anda masukkan.");
      return;
    }

    const safeNama = sanitizeMailtoValue(namaValue);
    const safeEmail = sanitizeMailtoValue(emailValue);
    const safeSubjek = sanitizeMailtoValue(
      subjekValue || "Pesan dari Portal HAAK Keuskupan Malang"
    );

    const safePesan = pesanValue
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();

    const body = [
      "Yth. Komisi Hubungan Antar Agama dan Kepercayaan (HAAK)",
      "Keuskupan Malang,",
      "",
      "Saya ingin menyampaikan pesan melalui Portal Berita HAAK Keuskupan Malang.",
      "",
      "INFORMASI PENGIRIM",
      "----------------------------------------",
      `Nama   : ${safeNama}`,
      `Email  : ${safeEmail}`,
      "",
      "PESAN",
      "----------------------------------------",
      safePesan,
      "",
      "----------------------------------------",
      "Pesan ini dikirim melalui Portal Berita HAAK Keuskupan Malang.",
      `Email pengirim: ${safeEmail}`
    ].join("\n");

    const mailtoURL =
      `mailto:${OFFICIAL_EMAIL}` +
      `?subject=${encodeURIComponent(safeSubjek)}` +
      `&body=${encodeURIComponent(body)}`;

    if (submitButton) {
      submitButton.disabled = true;

      submitButton.innerHTML = `
        <i class="fa-solid fa-envelope"></i>
        Membuka Email...
      `;
    }

    window.location.href = mailtoURL;

    setTimeout(() => {
      if (submitButton) {
        submitButton.disabled = false;

        submitButton.innerHTML = `
          <i class="fa-solid fa-paper-plane"></i>
          Kirim Pesan
        `;
      }
    }, 2000);

    setTimeout(() => {
      form.reset();
    }, 1500);

    setTimeout(() => {
      toast(
        "Aplikasi email sedang dibuka dengan pesan yang sudah disiapkan."
      );
    }, 300);
  });

  nama?.addEventListener("blur", () => {
    const value = cleanText(nama.value);

    if (value && value.length < 3) {
      setError(
        "namaError",
        "Nama minimal terdiri dari 3 karakter."
      );
    } else {
      setError("namaError", "");
    }
  });


  email?.addEventListener("blur", () => {
    const value = cleanText(email.value);

    if (value && !isValidEmail(value)) {
      setError(
        "emailError",
        "Masukkan alamat email yang valid."
      );
    } else {
      setError("emailError", "");
    }
  });


  pesan?.addEventListener("blur", () => {
    const value = cleanText(pesan.value);

    if (value && value.length < 10) {
      setError(
        "pesanError",
        "Pesan minimal terdiri dari 10 karakter."
      );
    } else {
      setError("pesanError", "");
    }
  });
}

  function initGlobalSearch() {
    const headerActions = $(".header-actions");
    if (!headerActions) return;

    let wrapper = $("#globalSearchWrap");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.id = "globalSearchWrap";
      wrapper.className = "global-search-wrap";
      wrapper.innerHTML = `
        <form id="globalSearchForm" class="global-search-form" role="search" autocomplete="off">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input id="globalSearchInput" type="search" placeholder="Cari berita, topik, atau jejaring..." aria-label="Cari portal HAAK" aria-autocomplete="list" aria-controls="globalSearchSuggestions">
          <button type="button" class="global-search-clear" aria-label="Hapus pencarian" hidden><i class="fa-solid fa-xmark"></i></button>
        </form>
        <div id="globalSearchSuggestions" class="search-suggestions" role="listbox" hidden></div>`;
      headerActions.prepend(wrapper);
    }

    const form = $("#globalSearchForm", wrapper);
    const input = $("#globalSearchInput", wrapper);
    const suggestions = $("#globalSearchSuggestions", wrapper);
    const clearBtn = $(".global-search-clear", wrapper);
    if (!form || !input || !suggestions) return;

    const HISTORY_KEY = "haak-search-history";
    const getHistory = () => {
      try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
    };
    const saveHistory = (q) => {
      const value = q.trim();
      if (!value) return;
      const next = [value, ...getHistory().filter((item) => normalizedText(item) !== normalizedText(value))].slice(0, 8);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    };

    const suggestionItems = (q) => {
      const query = normalizedText(q);
      const scoreText = (text) => {
        const value = normalizedText(text);
        if (!query) return 1;
        if (value === query) return 100;
        if (value.startsWith(query)) return 80;
        if (value.includes(query)) return 50;
        const tokens = query.split(/\s+/).filter(Boolean);
        return tokens.reduce((score, token) => score + (value.includes(token) ? 12 : 0), 0);
      };
      const items = [];
      const articles = DATA.articles.map((a) => {
        const text = `${a.title} ${a.excerpt} ${Array.isArray(a.content) ? a.content.join(" ") : (a.content || "")} ${a.category} ${(a.tags || []).join(" ")} ${a.author || ""}`;
        return { a, score: scoreText(text) + scoreText(a.title) };
      }).filter((x) => x.score > 0).sort((a,b) => b.score-a.score || new Date(b.a.date)-new Date(a.a.date)).slice(0,4);
      articles.forEach(({a}) => items.push({ type: "Artikel", icon: "fa-newspaper", label: a.title, meta: `${a.category} · ${a.date}`, href: `detail-berita.html?id=${a.id}` }));

      const topics = [...new Set(DATA.articles.flatMap((a) => a.tags || []))].map((t) => ({t, score: scoreText(t)})).filter((x) => x.score > 0).sort((a,b)=>b.score-a.score).slice(0,3);
      topics.forEach(({t}) => items.push({ type: "Topik", icon: "fa-hashtag", label: t, meta: `${DATA.articles.filter(a => (a.tags||[]).includes(t)).length} artikel`, href: `berita.html?q=${encodeURIComponent(t)}` }));

      const directories = (DATA.directory || []).map((d) => ({d, score: scoreText(`${d.name} ${d.focus} ${d.location}`) + scoreText(d.name)})).filter((x) => x.score > 0).sort((a,b)=>b.score-a.score).slice(0,3);
      directories.forEach(({d}) => items.push({ type: "Jejaring", icon: "fa-people-arrows", label: d.name, meta: `${d.type} · ${d.articles?.length || 0} publikasi`, href: `direktori-detail.html?id=${encodeURIComponent(d.id)}` }));

      const collaborations = (DATA.collaborations || []).map((c) => ({c, score: scoreText(`${c.title} ${c.type} ${c.description}`)})).filter((x)=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,2);
      collaborations.forEach(({c}) => items.push({ type: "Kolaborasi", icon: "fa-handshake", label: c.title, meta: c.type, href: `jejaring.html#${encodeURIComponent(c.id)}` }));
      return items.slice(0, 10);
    };

    const renderSuggestions = (mode = "query") => {
      const q = input.value.trim();
      const history = getHistory();
      let html = "";
      if (!q && history.length) {
        html += `<div class="suggestion-heading"><span>Pencarian terakhir</span><button type="button" data-clear-history>Hapus</button></div>`;
        html += history.slice(0, 5).map((item) => `<button class="suggestion-item" type="button" data-search-value="${escapeHtml(item)}"><i class="fa-solid fa-clock-rotate-left"></i><span>${escapeHtml(item)}</span></button>`).join("");
      } else {
        const items = suggestionItems(q);
        if (items.length) {
          html += `<div class="suggestion-heading"><span>${q ? "Saran pencarian" : "Jelajahi"}</span></div>`;
          html += items.map((item) => `<a class="suggestion-item" href="${item.href}" role="option"><i class="fa-solid ${item.icon}"></i><span><small>${escapeHtml(item.type)}${item.meta ? ` · ${escapeHtml(item.meta)}` : ""}</small><strong>${escapeHtml(item.label)}</strong></span><i class="fa-solid fa-arrow-up-right-from-square suggestion-arrow"></i></a>`).join("");
          if (q) html += `<div class="search-suggestion-footer"><i class="fa-solid fa-arrow-right"></i><span>Tekan Enter untuk melihat semua berita yang relevan dengan <strong>${escapeHtml(q)}</strong></span></div>`;
        } else if (mode !== "focus") {
          html = `<div class="suggestion-empty"><i class="fa-solid fa-magnifying-glass"></i><span>Tidak ada saran yang cocok.</span></div>`;
        }
      }
      suggestions.innerHTML = html;
      suggestions.hidden = !html;
    };

    const openSuggestions = () => {
      // Di mobile, pencarian menjadi layer tersendiri agar tidak tertindih menu hamburger.
      if (window.innerWidth <= 700 && document.body.classList.contains("menu-open")) {
        const mobileNav = $("#mobileNav");
        const menuToggle = $("#menuToggle");
        mobileNav?.classList.remove("open");
        document.body.classList.remove("menu-open");
        menuToggle?.setAttribute("aria-expanded", "false");
      }
      wrapper.classList.add("focus");
      renderSuggestions("focus");
    };
    input.addEventListener("focus", openSuggestions);
    input.addEventListener("input", () => {
      clearBtn.hidden = !input.value;
      renderSuggestions();
    });
    document.addEventListener("click", (event) => {
      if (!wrapper.contains(event.target)) { wrapper.classList.remove("focus"); suggestions.hidden = true; }
    });
    suggestions.addEventListener("click", (event) => {
      const historyButton = event.target.closest("[data-search-value]");
      if (historyButton) {
        input.value = historyButton.dataset.searchValue;
        form.requestSubmit();
      }
      if (event.target.closest("[data-clear-history]")) {
        localStorage.removeItem(HISTORY_KEY);
        renderSuggestions("focus");
      }
    });
    clearBtn.addEventListener("click", () => { input.value = ""; clearBtn.hidden = true; input.focus(); renderSuggestions("focus"); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q) {
        saveHistory(q);
        location.href = `berita.html?q=${encodeURIComponent(q)}`;
      }
    });
  }

  // Memproses query pencarian dari URL pada halaman berita.
  function hydrateNewsQuery() {
    const search = $("#newsSearch");
    if (!search) return;
    const q = new URLSearchParams(location.search).get("q");
    if (q) {
      search.value = q;
      search.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  // ---------- Direktori jejaring ----------
  function initDirectory() {
    const root = $("#directoryList");
    if (!root || !DATA.directory) return;
    const search = $("#directorySearch");
    const type = $("#directoryType");
    const stats = $("#directoryStats");

    const types = [...new Set(DATA.directory.map((item) => item.type))].sort((a, b) => a.localeCompare(b, "id"));
    if (type) type.innerHTML = '<option value="">Semua jenis</option>' +
      types.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");

    const render = () => {
      const q = (search?.value || "").trim().toLowerCase();
      const selectedType = type?.value || "";
      const list = DATA.directory.filter((item) => {
        const haystack = [item.name, item.type, item.focus, item.description].join(" ").toLowerCase();
        return (!q || haystack.includes(q)) && (!selectedType || item.type === selectedType);
      });

      if (stats) stats.textContent = `${list.length} jejaring ditampilkan · Berdasarkan penyebutan dalam publikasi portal`;
      root.innerHTML = list.length ? list.map((item) => {
        const articles = (item.articles || []).map((id) => getArticleById(id)).filter(Boolean);
        const collaborations = (DATA.collaborations || []).filter((c) => (c.partners || []).includes(item.id));
        const topics = [...new Set(articles.flatMap((a) => a.tags || []))].slice(0, 3);
        const latest = articles.sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
        return `
        <article class="directory-card reveal">
          <div class="directory-card-top"><div class="directory-logo-wrap" aria-hidden="true">
            <img class="directory-logo" src="${escapeHtml(item.logo || `img/jejaring/${item.id}.png`)}" alt="" loading="lazy" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">
            <span class="directory-logo-fallback"><i class="fa-solid fa-people-arrows"></i></span>
          </div><a class="directory-index" href="direktori-detail.html?id=${encodeURIComponent(item.id)}" aria-label="Lihat profil ${escapeHtml(item.name)}" title="Lihat profil jejaring"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a></div>
          <div class="directory-meta"><span class="directory-pill">${escapeHtml(item.type)}</span><span class="directory-pill"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.location || "Wilayah belum dicatat")}</span></div>
          <h3>${escapeHtml(item.name)}</h3>
          <p><strong>Fokus:</strong> ${escapeHtml(item.focus)}</p>
          <p>${escapeHtml(item.description)}</p>
          <div class="directory-topic-row">${topics.length ? topics.map(t=>`<span>#${escapeHtml(t)}</span>`).join("") : `<span>Profil jejaring</span>`}</div>
          <div class="directory-mini-stats"><span><strong>${articles.length}</strong> publikasi</span><span><strong>${collaborations.length}</strong> kolaborasi</span>${latest ? `<span>Terakhir <strong>${escapeHtml(formatDate(latest.date))}</strong></span>` : ""}</div>
          <div class="directory-links">
            <a href="direktori-detail.html?id=${encodeURIComponent(item.id)}">Lihat profil <i class="fa-solid fa-arrow-right"></i></a>
          </div>
        </article>`;
      }).join("") : `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-people-arrows"></i><h3>Jejaring tidak ditemukan</h3><p>Coba kata kunci atau jenis lainnya.</p></div>`;
      initReveal();
    };

    [search, type].filter(Boolean).forEach((el) => el.addEventListener("input", render));
    render();
  }

  // ---------- Gallery Story ----------
  function initGalleryStories() {
    const root = $("#galleryStories");
    if (!root) return;

    const stories = DATA.gallery.map((item) => {
      const article = DATA.articles.find((a) => a.title === item.caption) ||
        DATA.articles.find((a) => a.title.toLowerCase().includes(item.caption.toLowerCase().slice(0, 35)));
      return { ...item, article };
    });

    root.innerHTML = stories.map((story) => `
      <article class="gallery-story reveal">
        <div class="gallery-story-media"><img src="${story.src}" alt="${escapeHtml(story.caption)}" loading="lazy"></div>
        <div class="gallery-story-body">
          <div class="story-meta">
            <span class="story-tag"><i class="fa-regular fa-images"></i> Gallery Story</span>
            ${story.article ? `<span class="story-tag">${escapeHtml(story.article.category)}</span>` : ""}
          </div>
          <h3>${escapeHtml(story.caption)}</h3>
          <p>${escapeHtml(story.article?.excerpt || "Dokumentasi kegiatan dan perjumpaan yang menjadi bagian dari perjalanan Portal HAAK Keuskupan Malang.")}</p>
          ${story.article ? `<a class="text-link" href="detail-berita.html?id=${story.article.id}">Baca cerita lengkap <i class="fa-solid fa-arrow-right"></i></a>` : ""}
        </div>
      </article>
    `).join("");
    initReveal();
  }

  // ---------- Ruang refleksi interaktif ----------
  function initReflectionRoom() {
    const messages = $("#reflectionMessages");
    const form = $("#reflectionAgentForm");
    const text = $("#reflectionAgentInput");
    const saved = $("#reflectionSaved");
    const suggestions = $("#reflectionSuggestions");
    const status = $("#reflectionAgentStatus");
    if (!form || !text || !messages) return;

    const STORAGE_KEY = "haak-personal-reflections";
    const CHAT_KEY = "haak-reflection-agent-chat";
    const CONTEXT_KEY = "haak-reflection-agent-context";
    const MAX_MESSAGES = 40;
    const MAX_INPUT = 1000;

    const defaultPrompts = [
      "Saya ingin belajar berdialog tanpa cepat menghakimi.",
      "Bagaimana saya bisa merawat kerukunan mulai dari lingkungan terdekat?",
      "Ada pengalaman lintas iman yang masih saya pikirkan.",
      "Saya ingin mengubah refleksi ini menjadi tindakan nyata."
    ];
    let notes = [];
    let chat = [];
    let context = { turns: 0, topic: "umum", emotion: "netral", intent: "refleksi", focus: [], lastUser: "" };
    try { notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { notes = []; }
    try { chat = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]"); } catch { chat = []; }
    try { context = { ...context, ...JSON.parse(localStorage.getItem(CONTEXT_KEY) || "{}") }; } catch { /* gunakan konteks awal */ }

    const escape = (value) => escapeHtml(String(value ?? ""));
    const nowLabel = () => new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    const normalize = (value) => String(value || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    const hasAny = (value, words) => words.some(word => value.includes(word));

    const knowledge = {
      dialog: ["dialog", "berdialog", "percakapan", "berbicara", "komunikasi", "mendengar", "didengar", "bicara", "obrol"],
      harmony: ["kerukunan", "harmoni", "damai", "perdamaian", "rukun", "persaudaraan", "kebersamaan", "solidaritas"],
      diversity: ["keberagaman", "keberagaman", "perbedaan", "plural", "bhineka", "kebhinekaan", "beragam", "majemuk"],
      faith: ["agama", "iman", "kepercayaan", "antaragama", "lintas iman", "lintas agama", "umat", "keyakinan"],
      action: ["langkah", "aksi", "tindakan", "lakukan", "mulai", "praktik", "nyata", "konkret", "kontribusi"],
      emotion: ["sedih", "marah", "takut", "khawatir", "cemas", "bingung", "lelah", "capek", "kecewa", "tertekan", "senang", "bersyukur", "bahagia", "tersentuh"],
      article: ["berita", "artikel", "bacaan", "portal", "kegiatan", "tulisan", "membaca"],
      self: ["saya", "aku", "diriku", "pengalaman", "perasaan", "pikiranku", "pikiran saya", "hidup saya"]
    };

    const articleCorpus = (DATA?.articles || []).map(article => ({
      title: article.title || "",
      category: article.category || "",
      excerpt: article.excerpt || "",
      text: normalize(`${article.title} ${article.category} ${article.excerpt} ${(article.tags || []).join(" ")}`)
    }));

    function scoreTopics(value) {
      const scores = {};
      Object.entries(knowledge).forEach(([topic, words]) => {
        scores[topic] = words.reduce((score, word) => score + (value.includes(word) ? (word.includes(" ") ? 3 : 1) : 0), 0);
      });
      return scores;
    }

    function detectEmotion(value) {
      const map = {
        cemas: ["takut", "khawatir", "cemas", "bingung", "tertekan"],
        sedih: ["sedih", "kecewa", "menangis", "kehilangan", "terluka"],
        marah: ["marah", "kesal", "jengkel", "benci", "tersinggung"],
        lelah: ["lelah", "capek", "letih", "habis tenaga", "jenuh"],
        positif: ["senang", "bahagia", "bersyukur", "terinspirasi", "terharu", "bangga", "damai"]
      };
      const ranked = Object.entries(map).map(([emotion, words]) => ({ emotion, score: words.filter(word => value.includes(word)).length })).sort((a, b) => b.score - a.score);
      return ranked[0]?.score ? ranked[0].emotion : "netral";
    }

    function detectIntent(value, scores) {
      if (hasAny(value, ["terima kasih", "makasih", "terimakasih"])) return "syukur";
      if (hasAny(value, ["apa yang", "bagaimana", "kenapa", "mengapa", "bisakah", "bolehkah", "menurut anda", "menurutmu"])) return "pertanyaan";
      if (scores.action >= 1) return "aksi";
      if (scores.emotion >= 1) return "pemaknaan emosi";
      if (scores.dialog >= 1) return "dialog";
      if (scores.faith >= 1) return "lintas iman";
      if (scores.harmony >= 1 || scores.diversity >= 1) return "kerukunan";
      if (scores.article >= 1) return "bacaan";
      return "refleksi";
    }

    function detectTopic(value, scores) {
      const candidates = ["faith", "dialog", "harmony", "diversity", "action", "article", "emotion"]
        .map(key => ({ key, score: scores[key] || 0 }))
        .sort((a, b) => b.score - a.score);
      const best = candidates[0];
      const labels = { faith: "lintas iman", dialog: "dialog", harmony: "kerukunan", diversity: "keberagaman", action: "aksi nyata", article: "bacaan", emotion: "pengalaman pribadi" };
      return best?.score ? labels[best.key] : (context.topic || "refleksi");
    }

    function findRelatedArticle(value) {
      const tokens = value.split(" ").filter(token => token.length >= 5);
      if (!tokens.length) return null;
      let best = null;
      let bestScore = 0;
      articleCorpus.forEach(article => {
        const score = tokens.reduce((sum, token) => sum + (article.text.includes(token) ? 1 : 0), 0);
        if (score > bestScore) { bestScore = score; best = article; }
      });
      return bestScore >= 2 ? best : null;
    }

    function updateContext(input) {
      const value = normalize(input);
      const scores = scoreTopics(value);
      context = {
        ...context,
        turns: (context.turns || 0) + 1,
        topic: detectTopic(value, scores),
        emotion: detectEmotion(value),
        intent: detectIntent(value, scores),
        focus: Object.entries(scores).filter(([, score]) => score > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key]) => key),
        lastUser: input.slice(0, 500)
      };
      localStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
      return { value, scores, article: findRelatedArticle(value) };
    }

    function topicQuestion(topic, emotion) {
      const questions = {
        "dialog": "Dalam percakapan itu, bagian mana yang sebenarnya ingin Anda dengarkan lebih dalam—bukan untuk langsung menjawab, tetapi untuk memahami?",
        "kerukunan": "Jika kerukunan dimulai dari lingkaran terdekat, siapa satu orang atau kelompok yang bisa Anda dekati dengan lebih terbuka?",
        "lintas iman": "Apa yang ingin Anda pahami dari pengalaman itu tanpa harus mengubah keyakinan masing-masing pihak?",
        "keberagaman": "Perbedaan apa yang awalnya terasa jauh, tetapi sebenarnya bisa menjadi kesempatan untuk belajar mengenal sesama?",
        "aksi nyata": "Dari semua kemungkinan tindakan, mana yang paling kecil tetapi realistis Anda lakukan dalam 24 jam ke depan?",
        "bacaan": "Nilai apa dari bacaan itu yang paling terasa dekat dengan kehidupan Anda saat ini?",
        "pengalaman pribadi": "Kalau pengalaman itu diberi satu makna yang ingin Anda bawa ke depan, kira-kira apa makna tersebut?",
        "refleksi": "Jika kita berhenti sejenak pada cerita itu, apa hal terpenting yang ingin Anda pahami tentang diri Anda sendiri?"
      };
      if (emotion === "cemas" || emotion === "sedih" || emotion === "marah" || emotion === "lelah") return "Apa yang paling Anda butuhkan sekarang: didengarkan, memahami apa yang terjadi, atau mencari satu langkah kecil yang terasa aman untuk dilakukan?";
      return questions[topic] || questions.refleksi;
    }

    function buildReply(input) {
      const analysis = updateContext(input);
      const { value, article } = analysis;
      if (hasAny(value, ["halo", "hai", "selamat pagi", "selamat siang", "selamat sore", "selamat malam"])) {
        return { intent: "sapaan", topic: "awal percakapan", reply: "Halo, selamat datang. Saya HAAK Reflection Agent. Kita bisa mulai dari pengalaman, pertanyaan, atau sesuatu yang baru saja Anda baca. Ceritakan saja dengan cara yang paling nyaman bagi Anda." };
      }
      if (hasAny(value, ["terima kasih", "makasih", "terimakasih"])) {
        return { intent: "syukur", topic: context.topic, reply: `Sama-sama. Saya senang percakapan ini bisa memberi ruang untuk berhenti sejenak. Jika ingin melanjutkan, kita bisa menggali lebih dalam tentang ${context.topic === "awal percakapan" ? "hal yang sedang Anda pikirkan" : context.topic}.` };
      }

      const opening = {
        "cemas": "Saya menangkap ada kekhawatiran di balik cerita Anda.",
        "sedih": "Saya menangkap ada bagian dari pengalaman ini yang terasa berat.",
        "marah": "Saya menangkap ada sesuatu yang membuat Anda cukup tersentuh atau kesal.",
        "lelah": "Kedengarannya Anda sedang membawa cukup banyak hal sekaligus.",
        "positif": "Saya menangkap ada pengalaman yang membawa kesan positif bagi Anda.",
        "netral": "Saya menangkap ada sesuatu yang cukup penting bagi Anda dalam cerita ini."
      }[context.emotion] || "Saya menangkap ada sesuatu yang cukup penting bagi Anda dalam cerita ini.";

      const insight = {
        "dialog": "Dalam semangat HAAK, dialog bukan sekadar bergantian berbicara. Ada keberanian untuk mendengar, memberi ruang, dan tetap menghargai perbedaan ketika jawaban belum langsung ditemukan.",
        "kerukunan": "Kerukunan biasanya tumbuh dari perjumpaan yang berulang: sapaan, kepercayaan, kerja bersama, dan kesediaan melihat orang lain sebagai sesama sebelum melihat perbedaannya.",
        "lintas iman": "Perjumpaan lintas iman tidak harus membuat semua orang menjadi sama. Justru ruang belajar muncul ketika perbedaan dapat dikenal dengan hormat dan tanpa prasangka.",
        "keberagaman": "Keberagaman menjadi bermakna ketika tidak berhenti sebagai slogan, tetapi hadir dalam cara kita mendengar, bekerja sama, dan memberi tempat yang aman bagi orang lain.",
        "aksi nyata": "Refleksi akan semakin kuat ketika menemukan bentuk yang sederhana dan nyata. Tindakan kecil yang konsisten sering lebih berarti daripada rencana besar yang tidak pernah dimulai.",
        "bacaan": "Sebuah berita atau artikel dapat menjadi cermin: bukan hanya apa yang terjadi, tetapi nilai apa yang terlihat dan apa yang mungkin kita bawa ke kehidupan sehari-hari.",
        "pengalaman pribadi": "Pengalaman tidak selalu langsung memiliki jawaban. Kadang maknanya muncul ketika kita berani menamai apa yang dirasakan, melihat apa yang dipelajari, lalu memilih bagaimana ingin melangkah.",
        "refleksi": "Refleksi bukan mencari jawaban yang paling indah, melainkan memberi diri sendiri kesempatan untuk melihat pengalaman dengan lebih jernih dan manusiawi."
      }[context.topic] || "Refleksi memberi kita kesempatan untuk melihat pengalaman dengan lebih jernih sebelum menentukan langkah berikutnya.";

      const articleHint = article ? ` Saya juga melihat kata-kata Anda berdekatan dengan tema artikel “${article.title}” di portal, jadi pengalaman ini bisa dibaca dari sudut pandang yang lebih luas.` : "";
      const question = topicQuestion(context.topic, context.emotion);
      const action = context.intent === "aksi" ? "Coba tuliskan satu tindakan yang benar-benar mungkin dilakukan, bukan yang ideal. Kita bisa mengujinya bersama." : "Kalau Anda mau, jawab pertanyaan itu dengan satu atau dua kalimat saja. Saya akan membantu menindaklanjuti dari jawaban Anda.";

      return {
        intent: context.intent,
        topic: context.topic,
        reply: `${opening} ${insight}${articleHint}\n\n${question}\n\n${action}`
      };
    }

    const saveChat = () => {
      chat = chat.slice(-MAX_MESSAGES);
      localStorage.setItem(CHAT_KEY, JSON.stringify(chat));
    };

    const renderChat = () => {
      messages.innerHTML = chat.map((item) => {
        const isUser = item.role === "user";
        const avatar = isUser ? '<i class="fa-solid fa-user"></i>' : '<img src="img/icons/logo.png" alt="">';
        const meta = item.meta ? `<span class="agent-message-topic">${escape(item.meta)}</span>` : "";
        return `<div class="agent-message-row ${isUser ? "is-user" : "is-agent"} ${item.typing ? "is-typing" : ""}">
          <div class="agent-avatar">${avatar}</div>
          <div class="agent-message">
            <div class="agent-message-head"><strong>${isUser ? "Anda" : "HAAK Reflection Agent"}</strong><time>${escape(item.time || "")}</time>${meta}</div>
            <div class="agent-message-body">${item.typing ? '<span class="typing-dots"><i></i><i></i><i></i></span>' : escape(item.text).replace(/\n/g, "<br>").replace(/\*(.*?)\*/g, "<strong>$1</strong>")}</div>
          </div>
        </div>`;
      }).join("");
      requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
    };

    const pushMessage = (role, textValue, meta = "") => {
      chat.push({ role, text: textValue, meta, time: nowLabel() });
      saveChat();
      renderChat();
    };

    const setStatus = (label, busy = false) => {
      if (!status) return;
      status.innerHTML = `<span class="agent-status-dot ${busy ? "is-busy" : ""}"></span><span>${escape(label)}</span>`;
    };

    if (!chat.length) {
      pushMessage("agent", "Selamat datang di Ruang Refleksi. Saya siap mendengarkan cerita Anda tentang dialog, keberagaman, kerukunan, lintas iman, maupun pengalaman sehari-hari. Semakin Anda bercerita, semakin saya bisa menjaga konteks percakapan ini.", "Siap mendengarkan");
    } else renderChat();

    const renderSuggestions = () => {
      if (!suggestions) return;
      const topic = context.topic;
      const contextual = {
        "dialog": ["Bagaimana cara mendengar tanpa menghakimi?", "Apa yang perlu saya tanyakan dalam dialog?"],
        "kerukunan": ["Apa tindakan kecil untuk merawat kerukunan?", "Bagaimana membangun kepercayaan di tengah perbedaan?"],
        "lintas iman": ["Bagaimana memulai perjumpaan lintas iman?", "Apa yang bisa saya pelajari dari keyakinan yang berbeda?"],
        "aksi nyata": ["Bantu saya membuat langkah 24 jam ke depan.", "Bagaimana mengubah refleksi menjadi aksi?"],
        "awal percakapan": defaultPrompts,
        "refleksi": defaultPrompts,
        "umum": defaultPrompts
      }[topic] || defaultPrompts;
      suggestions.innerHTML = contextual.slice(0, 4).map(prompt => `<button type="button" class="reflection-suggestion" data-reflection-suggestion="${escape(prompt)}"><i class="fa-regular fa-message"></i><span>${escape(prompt)}</span></button>`).join("");
      $$('[data-reflection-suggestion]', suggestions).forEach(button => button.addEventListener("click", () => {
        text.value = button.dataset.reflectionSuggestion || "";
        text.focus();
        updateCount();
      }));
    };

    const updateCount = () => {
      const counter = $("#reflectionAgentCount");
      if (counter) counter.textContent = `${text.value.length} / ${MAX_INPUT}`;
    };
    text.addEventListener("input", updateCount);
    renderSuggestions();

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = text.value.trim();
      if (value.length < 2) return toast("Ceritakan sedikit dulu agar saya bisa merespons.");
      if (value.length > MAX_INPUT) return toast(`Pesan maksimal ${MAX_INPUT} karakter.`);

      pushMessage("user", value);
      text.value = "";
      updateCount();
      setStatus("Membaca konteks percakapan…", true);
      const typingItem = { role: "agent", text: "", meta: "Menganalisis", time: nowLabel(), typing: true };
      chat.push(typingItem);
      renderChat();

      window.setTimeout(() => {
        chat = chat.filter(item => item !== typingItem);
        const result = buildReply(value);
        pushMessage("agent", result.reply, `Topik: ${result.topic}`);
        setStatus(`Menemani • ${result.topic}`);
        renderSuggestions();
      }, 650);
    });

    $("#reflectionClearChat")?.addEventListener("click", () => {
      chat = [];
      context = { turns: 0, topic: "umum", emotion: "netral", intent: "refleksi", focus: [], lastUser: "" };
      localStorage.removeItem(CHAT_KEY);
      localStorage.removeItem(CONTEXT_KEY);
      pushMessage("agent", "Percakapan baru dimulai. Saya siap mendengarkan dari awal. Apa yang ingin Anda renungkan hari ini?", "Percakapan baru");
      setStatus("Siap menemani");
      renderSuggestions();
      text.focus();
    });

    const renderSaved = () => {
      if (!saved) return;
      saved.innerHTML = notes.slice(0, 10).map((note, index) => `
        <article class="reflection-note" data-reflection-index="${index}">
          <div class="reflection-note-main">
            <strong>${escape(note.prompt)}</strong>
            <div>${escape(note.text)}</div>
            <time>${escape(note.date)}</time>
          </div>
          <button class="reflection-note-delete" type="button" data-delete-reflection="${index}" aria-label="Hapus refleksi ini" title="Hapus refleksi">
            <i class="fa-solid fa-trash-can" aria-hidden="true"></i><span>Hapus</span>
          </button>
        </article>`).join("");
    };

    saved?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete-reflection]");
      if (!button) return;
      const index = Number(button.dataset.deleteReflection);
      if (!Number.isInteger(index) || !notes[index]) return;
      notes.splice(index, 1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      renderSaved();
      toast("Refleksi dihapus dari perangkat Anda.");
    });

    $("#reflectionSaveLast")?.addEventListener("click", () => {
      const last = [...chat].reverse().find(item => item.role === "user" && !item.typing);
      if (!last) return toast("Belum ada refleksi yang bisa disimpan.");
      notes.unshift({ text: last.text, prompt: `Refleksi • ${context.topic || "umum"}`, date: new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date()) });
      notes = notes.slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      renderSaved();
      toast("Refleksi terakhir disimpan di perangkat Anda.");
    });
    renderSaved();
    updateCount();
  }

  // ---------- Simpanan / reading list ----------
  async function initSavedArticles() {
    const root = $("#savedArticles");
    const count = $("#savedCount");
    const empty = $("#savedEmpty");
    if (!root) return;

    const render = async () => {
      const db = await openDB();
      const records = await new Promise((resolve) => {
        const out = [];
        const tx = db.transaction("bookmarks", "readonly");
        const req = tx.objectStore("bookmarks").openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) { out.push(cursor.value); cursor.continue(); } else resolve(out);
        };
        req.onerror = () => resolve(out);
      });
      records.sort((a,b) => (b.date || 0) - (a.date || 0));
      if (count) count.textContent = `${records.length} artikel tersimpan`;
      if (empty) empty.hidden = records.length > 0;
      root.innerHTML = records.map((record) => {
        const article = getArticleById(record.id);
        return article ? `<article class="saved-card reveal"><div class="saved-card-image"><img src="${article.image}" alt="${escapeHtml(article.title)}" loading="lazy"></div><div class="saved-card-body"><span class="badge">${escapeHtml(article.category)}</span><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.excerpt)}</p><div class="saved-actions"><a class="btn gold" href="detail-berita.html?id=${article.id}">Baca</a><button class="btn outline" type="button" data-remove-saved="${article.id}"><i class="fa-solid fa-trash"></i> Hapus</button></div></div></article>` : "";
      }).join("");
      $$('[data-remove-saved]', root).forEach((button) => button.addEventListener("click", async () => {
        await dbDelete("bookmarks", Number(button.dataset.removeSaved));
        render();
        toast("Artikel dihapus dari simpanan.");
      }));
      initReveal();
    };
    $("#clearSaved")?.addEventListener("click", async () => {
      const db = await openDB();
      await new Promise((resolve) => { const tx = db.transaction("bookmarks", "readwrite"); tx.objectStore("bookmarks").clear(); tx.oncomplete = resolve; tx.onerror = resolve; });
      render(); toast("Semua simpanan telah dibersihkan.");
    });
    render();
  }

  // ---------- Profil detail jejaring ----------
  function initDirectoryDetail() {
    const root = $("#directoryDetail");
    if (!root) return;
    const id = new URLSearchParams(location.search).get("id");
    const item = (DATA.directory || []).find((entry) => entry.id === id) || DATA.directory?.[0];
    if (!item) { root.innerHTML = `<div class="empty-state"><h3>Profil jejaring belum tersedia</h3></div>`; return; }

    // Semua relasi dihitung langsung dari DATA sehingga otomatis mengikuti data terbaru.
    const articles = (item.articles || [])
      .map((articleId) => getArticleById(articleId))
      .filter(Boolean)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const collaborations = (DATA.collaborations || [])
      .filter((c) => (c.partners || []).includes(item.id));
    const topics = [...new Set(articles.flatMap((a) => a.tags || []))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "id"));
    const latest = articles[0];
    const latestArticles = articles.slice(0, 3);
    const website = item.website || "";
    const email = item.email || "";

    const articleMini = (article) => `
      <a class="directory-article-mini" href="detail-berita.html?id=${encodeURIComponent(article.id)}">
        <div class="directory-article-mini-thumb">
          <img src="${escapeHtml(article.image || "img/icons/logo.png")}" alt="" loading="lazy" decoding="async">
        </div>
        <div class="directory-article-mini-copy">
          <span>${escapeHtml(formatDate(article.date))} · ${escapeHtml(article.category || "Publikasi")}</span>
          <strong>${escapeHtml(article.title)}</strong>
        </div>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </a>`;

    const collaborationMini = (collaboration) => {
      const partnerNames = (collaboration.partners || [])
        .filter((partnerId) => partnerId !== item.id)
        .map((partnerId) => (DATA.directory || []).find((entry) => entry.id === partnerId)?.name)
        .filter(Boolean);
      return `<article class="directory-collaboration-mini">
        <div class="directory-collaboration-mini-head"><span class="directory-pill">${escapeHtml(collaboration.type || "Kolaborasi")}</span><i class="fa-solid fa-handshake" aria-hidden="true"></i></div>
        <h3>${escapeHtml(collaboration.title)}</h3>
        <p>${escapeHtml(collaboration.description || "Informasi kolaborasi yang tercatat dalam portal.")}</p>
        ${partnerNames.length ? `<div class="directory-collaboration-partners"><span>Bersama</span>${partnerNames.slice(0, 2).map((name) => `<strong>${escapeHtml(name)}</strong>`).join("")}</div>` : ""}
        ${collaboration.articleIds?.length ? `<a href="detail-berita.html?id=${encodeURIComponent(collaboration.articleIds[0])}">Lihat publikasi <i class="fa-solid fa-arrow-right"></i></a>` : ""}
      </article>`;
    };

    root.innerHTML = `
      <div class="directory-detail-hero">
        <div class="directory-detail-logo" aria-hidden="true">
          <img class="directory-logo" src="${escapeHtml(item.logo || `img/jejaring/${item.id}.png`)}" alt="" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">
          <span class="directory-logo-fallback"><i class="fa-solid fa-people-arrows"></i></span>
        </div>
        <div>
          <div class="directory-detail-kicker"><span class="badge">${escapeHtml(item.type)}</span><span class="directory-detail-location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.location || "Wilayah belum dicatat")}</span></div>
          <h1>${escapeHtml(item.name)}</h1>
          <p>${escapeHtml(item.description || "Informasi umum mengenai jejaring yang tercatat dalam portal.")}</p>
          <div class="directory-detail-actions">
            ${website ? `<a class="btn outline" href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-globe"></i> Situs</a>` : ""}
            ${email ? `<a class="btn outline" href="mailto:${escapeHtml(email)}"><i class="fa-solid fa-envelope"></i> Email</a>` : ""}
            <button class="btn outline" type="button" data-share-directory="${escapeHtml(item.id)}"><i class="fa-solid fa-share-nodes"></i> Bagikan</button>
          </div>
        </div>
      </div>

      <div class="directory-detail-stats">
        <div><i class="fa-regular fa-newspaper"></i><strong>${articles.length}</strong><span>Publikasi terkait</span></div>
        <div><i class="fa-solid fa-handshake"></i><strong>${collaborations.length}</strong><span>Kolaborasi tercatat</span></div>
        <div><i class="fa-solid fa-hashtag"></i><strong>${topics.length}</strong><span>Topik terhubung</span></div>
        <div><i class="fa-solid fa-clock"></i><strong>${latest ? escapeHtml(formatDate(latest.date)) : "—"}</strong><span>Publikasi terbaru</span></div>
      </div>

      <div class="directory-detail-layout">
        <aside class="directory-detail-sidebar">
          <section class="sidebar-card directory-summary-card">
            <span class="eyebrow">Ringkasan</span>
            <h3>Fokus Jejaring</h3>
            <p>${escapeHtml(item.focus || "Informasi fokus belum dicatat.")}</p>
            <div class="directory-summary-meta"><span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.location || "Wilayah belum dicatat")}</span><span><i class="fa-solid fa-tag"></i> ${escapeHtml(item.type || "Jejaring")}</span></div>
          </section>
          <section class="sidebar-card">
            <div class="directory-card-section-head"><div><span class="eyebrow">Topik Terhubung</span><h3>Isu yang muncul</h3></div><span class="directory-section-count">${topics.length}</span></div>
            ${topics.length ? `<div class="directory-topic-cloud">${topics.map((topic) => `<a href="berita.html?q=${encodeURIComponent(topic)}">#${escapeHtml(topic)}</a>`).join("")}</div>` : `<p class="directory-muted-note">Belum ada topik yang terhubung.</p>`}
          </section>
          <section class="sidebar-card directory-note-card">
            <div class="directory-card-section-head"><div><span class="eyebrow">Catatan profil</span><h3>Informasi umum</h3></div><i class="fa-regular fa-circle-info"></i></div>
            <p>Halaman ini menyajikan informasi umum mengenai jejaring yang tercatat dalam portal. Data dapat berkembang seiring bertambahnya publikasi dan informasi yang tersedia.</p>
          </section>
        </aside>

        <section class="directory-detail-content">
          <div class="directory-content-section">
            <div class="section-head"><div><span class="eyebrow">Publikasi terkait</span><h2>Publikasi yang terhubung</h2></div><span class="directory-section-count">${articles.length} publikasi</span></div>
            ${articles.length ? `<div class="directory-article-list">${articles.map(articleMini).join("")}</div>` : `<div class="empty-state directory-empty-compact"><i class="fa-regular fa-newspaper"></i><h3>Belum ada publikasi terkait</h3><p>Publikasi akan tampil otomatis ketika data jejaring terhubung dengan artikel.</p></div>`}
          </div>

          <div class="directory-detail-columns">
            <div class="directory-content-section">
              <div class="section-head"><div><span class="eyebrow">Kolaborasi tercatat</span><h2>Relasi kolaborasi</h2></div><span class="directory-section-count">${collaborations.length}</span></div>
              ${collaborations.length ? `<div class="directory-collaboration-list directory-collaboration-list--compact">${collaborations.map(collaborationMini).join("")}</div>` : `<div class="directory-empty-inline"><i class="fa-solid fa-handshake"></i><span>Belum ada kolaborasi yang tercatat.</span></div>`}
            </div>
            <div class="directory-content-section">
              <div class="section-head"><div><span class="eyebrow">Publikasi terbaru</span><h2>Terbaru dari jejaring</h2></div><span class="directory-section-count">${latestArticles.length}</span></div>
              ${latestArticles.length ? `<div class="directory-article-list directory-article-list--latest">${latestArticles.map(articleMini).join("")}</div>` : `<div class="directory-empty-inline"><i class="fa-regular fa-clock"></i><span>Belum ada publikasi terbaru.</span></div>`}
            </div>
          </div>
        </section>
      </div>`;

    root.querySelector('[data-share-directory]')?.addEventListener('click', async () => {
      const shareData = { title: item.name, text: `Profil jejaring ${item.name}`, url: location.href };
      try {
        if (navigator.share) await navigator.share(shareData);
        else { await navigator.clipboard.writeText(location.href); notify("Tautan profil berhasil disalin."); }
      } catch {}
    });
    initReveal();
  }

  // ---------- Jejaring & kolaborasi ----------
  function initCollaborations() {
    const root = $("#collaborationList");
    const stats = $("#collaborationStats");
    if (!root) return;
    const list = DATA.collaborations || [];
    if (stats) stats.textContent = `${list.length} kisah kolaborasi yang tercatat dalam publikasi portal`;
    root.innerHTML = list.map((item) => {
      const partners = item.partners.map((id) => (DATA.directory || []).find((d) => d.id === id)).filter(Boolean);
      const articles = item.articleIds.map((id) => getArticleById(id)).filter(Boolean);
      return `<article id="${escapeHtml(item.id)}" class="collaboration-card reveal"><div class="collaboration-icon"><i class="fa-solid fa-handshake"></i></div><span class="badge">${escapeHtml(item.type)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><div class="collaboration-partners"><strong>Jejaring terlibat</strong>${partners.map((p) => `<a href="direktori-detail.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.name)}</a>`).join("")}</div>${articles.length ? `<div class="collaboration-articles"><strong>Publikasi</strong>${articles.map((a) => `<a href="detail-berita.html?id=${a.id}">${escapeHtml(a.title)}</a>`).join("")}</div>` : ""}</article>`;
    }).join("");
    initReveal();
  }

  // ---------- PWA / Install ----------
  function initPWA() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
    }

    let deferredPrompt = null;

    window.__haakInstallPrompt = async () => {
      if (!deferredPrompt) return false;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      return true;
    };

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;
      document.documentElement.classList.add("pwa-installable");
    });

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      document.documentElement.classList.remove("pwa-installable");
      toast("Portal HAAK berhasil dipasang.");
    });

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-open-app]");
      if (!button) return;
      if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
        toast("Portal HAAK sudah terpasang di perangkat ini.");
        return;
      }
      if (window.__haakInstallPrompt) {
        window.__haakInstallPrompt().then((ok) => {
          if (!ok) notify("Pemasangan aplikasi belum tersedia di browser ini. Gunakan menu browser untuk menambahkan Portal HAAK ke layar utama.");
        });
      }
    });
  }

  // ---------- Daftar Pengurus v15 ----------
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
    const suggestions = $("#pengurusSuggestions");
    const modal = $("#pengurusProfileModal");
    const modalClose = $("#pengurusProfileClose");
    const modalContent = $("#pengurusProfileContent");
    if (!body || !search || !filter) return;

    const members = [
      {id:1,name:"RP. HENRIKUS SUWAJI, O. CARM",role:"KETUA",image:"img/pengurus/01-rp-henrikus-suwaji.jpeg"},
      {id:2,name:"RM. HECTOR JAVIER CORTES TORNEL, MG",role:"WAKIL KETUA 1",image:"img/pengurus/02-rm-hector-javier-cortes-tornel.jpeg"},
      {id:3,name:"IRENEUS SOLA WENE, SH",role:"WAKIL KETUA 2",image:"img/pengurus/03-ireneus-sola-wene.jpeg"},
      {id:4,name:"DRA. THERESIA PUJI ASTUTIK",role:"SEKRETARIS 1",image:"img/pengurus/04-theresia-puji-astutik.jpeg"},
      {id:5,name:"SR. ANNUNCIATA, PIJ",role:"SEKRETARIS 2",image:"img/pengurus/05-sr-annunciata.jpeg"},
      {id:6,name:"SR.MARLINA SITANGGANG, H. CARM",role:"BENDAHARA 1",image:"img/pengurus/06-sr-marlina-sitanggang.jpeg"},
      {id:7,name:"SR.LUSIANA RIYANTI, MISC",role:"BENDAHARA 2",image:"img/pengurus/07-sr-lusiana-riyanti.jpeg"},
      {id:8,name:"IRENEUS SOLA WENE, SH",role:"KOORDINATOR AGAMA ISLAM",image:"img/pengurus/08-ireneus-sola-wene.jpeg"},
      {id:9,name:"SR. THERESIA LAIYAN, ALMA",role:"KOORDINATOR AGAMA ISLAM",image:"img/pengurus/09-sr-theresia-laiyan.jpeg"},
      {id:10,name:"DRA. THERESIA PUJI ASTUTIK",role:"KOORDINATOR AGAMA HINDU",image:"img/pengurus/10-theresia-puji-astutik.jpeg"},
      {id:11,name:"MAKARYA SUMARNI, S.AG",role:"KOORDINATOR AGAMA BUDDHA",image:"img/pengurus/11-makarya-sumarni.jpeg"},
      {id:12,name:"YUSTINA LESTARI, S.AG",role:"KOORDINATOR AGAMA KRISTEN",image:"img/pengurus/12-yustina-lestari.jpeg"},
      {id:13,name:"BERNADINUS RINENGGO RHANANGGONO, S.E.",role:"KOORDINATOR AGAMA KHONGHUCU",image:"img/pengurus/13-bernadinus-rinenggo-rhananggono.jpeg"},
      {id:14,name:"STEPANUS WIWIN",role:"KOORDINATOR PENGHAYAT KEPERCAYAAN",image:"img/pengurus/14-stepanus-wiwin.jpeg"},
      {id:15,name:"DOMINIKUS TRIPUSPA MAHARDIKA",role:"KOORDINATOR MEDIA DAN PUBLIKASI",image:"img/pengurus/15-dominikus-tripuspa-mahardika.jpeg"},
      {id:16,name:"YOSEPH YOSAN SLAMET",role:"KOORDINATOR MEDIA DAN PUBLIKASI",image:"img/pengurus/16-yoseph-yosan-slamet.jpeg"},
      {id:17,name:"IGNATIUS RUSBIANTO, S.PD.",role:"TIM MEDIA DAN PUBLIKASI",image:"img/pengurus/17-ignatius-rusbianto.jpeg"},
      {id:18,name:"MARIA MARGARETA TARIKATOEN, S.E.",role:"TIM MEDIA DAN PUBLIKASI",image:"img/pengurus/18-maria-margareta-tarikatoen.jpeg"},
      {id:19,name:"MARIA MAGDALENA PRAMANU ADHININGTIA, S.E.",role:"TIM MEDIA DAN PUBLIKASI",image:"img/pengurus/19-maria-magdalena-pramanu-adhiningtia.jpeg"},
      {id:20,name:"EMANUEL SALUNG",role:"ANGGOTA",image:"img/pengurus/20-emanuel-salung.jpeg"},
      {id:21,name:"HERMAN",role:"ANGGOTA",image:"img/pengurus/21-herman.jpeg"},
      {id:22,name:"RP. HUGO Y. SUSDIYANTO, O.CARM",role:"ANGGOTA",image:"img/pengurus/22-rp-hugo-y-susdiyanto.jpeg"},
      {id:23,name:"RM. ANTONIUS DENNY, O. CARM",role:"ANGGOTA",image:"img/pengurus/23-rm-antonius-denny.jpeg"},
      {id:24,name:"RD DAMIANUS FADJAR TEDJO SUKARNO",role:"ANGGOTA",image:"img/pengurus/24-rd-damianus-fadjar-tedjo-sukarno.jpeg"},
      {id:25,name:"YOHANES WURYANTO",role:"ANGGOTA",image:"img/pengurus/25-yohanes-wuryanto.jpeg"}
    ];

    const groupOf = (role) => {
      const r = role.toUpperCase();
      if (r === "KETUA" || r.startsWith("WAKIL KETUA")) return "Pimpinan";
      if (r.startsWith("SEKRETARIS") || r.startsWith("BENDAHARA")) return "Sekretariat & Keuangan";
      if (r.startsWith("KOORDINATOR MEDIA") || r.startsWith("TIM MEDIA")) return "Media & Publikasi";
      if (r.startsWith("KOORDINATOR")) return "Koordinator Bidang";
      return "Anggota";
    };

    const focusOf = (role) => {
      const r = role.toUpperCase();
      if (r === "KETUA") return "Memimpin dan mengarahkan pelayanan serta koordinasi Komisi HAAK.";
      if (r.startsWith("WAKIL KETUA")) return "Mendukung kepemimpinan komisi dan koordinasi pelaksanaan pelayanan.";
      if (r.startsWith("SEKRETARIS")) return "Mendukung administrasi, dokumentasi, surat-menyurat, dan koordinasi kesekretariatan.";
      if (r.startsWith("BENDAHARA")) return "Mendukung pengelolaan administrasi dan pertanggungjawaban keuangan komisi.";
      if (r.startsWith("KOORDINATOR MEDIA")) return "Mengoordinasikan komunikasi, publikasi, dan penyebarluasan informasi kegiatan.";
      if (r.startsWith("TIM MEDIA")) return "Mendukung produksi, dokumentasi, dan publikasi informasi Komisi HAAK.";
      if (r.startsWith("KOORDINATOR AGAMA")) return "Mendukung komunikasi dan koordinasi pelayanan HAAK pada bidang lintas agama terkait.";
      if (r.startsWith("KOORDINATOR PENGHAYAT")) return "Mendukung komunikasi dan koordinasi pelayanan HAAK bersama penghayat kepercayaan.";
      return "Mendukung pelayanan, kegiatan, dan semangat persaudaraan dalam karya Komisi HAAK.";
    };

    members.forEach((member) => {
      member.group = groupOf(member.role);
      member.focus = focusOf(member.role);
      member.searchText = normalizedText(`${member.name} ${member.role} ${member.group} ${member.focus}`);
    });

    const groups = [...new Set(members.map((m) => m.group))];
    groups.forEach((g) => {
      const option = document.createElement("option");
      option.value = g;
      option.textContent = g;
      filter.appendChild(option);
    });
    total.textContent = String(members.length);
    roles.textContent = String(groups.length);

    const levenshtein = (a, b) => {
      if (a === b) return 0;
      if (!a) return b.length;
      if (!b) return a.length;
      let prev = Array.from({length:b.length + 1}, (_, i) => i);
      for (let i = 0; i < a.length; i++) {
        const curr = [i + 1];
        for (let j = 0; j < b.length; j++) {
          curr.push(Math.min(curr[j] + 1, prev[j + 1] + 1, prev[j] + (a[i] === b[j] ? 0 : 1)));
        }
        prev = curr;
      }
      return prev[b.length];
    };

    const scoreMember = (member, query) => {
      if (!query) return 0;
      const q = normalizedText(query);
      const tokens = q.split(/\s+/).filter(Boolean);
      const name = normalizedText(member.name);
      const role = normalizedText(member.role);
      const group = normalizedText(member.group);
      let score = 0;
      if (name === q) score += 120;
      if (name.includes(q)) score += 85;
      if (role.includes(q)) score += 60;
      if (group.includes(q)) score += 45;
      tokens.forEach((token) => {
        if (name.includes(token)) score += 28;
        else if (role.includes(token)) score += 22;
        else if (group.includes(token)) score += 16;
        else if (token.length >= 4) {
          const words = member.searchText.split(/\s+/);
          const close = words.some((word) => word.length >= 4 && levenshtein(token, word) <= (token.length >= 7 ? 2 : 1));
          if (close) score += 10;
        }
      });
      return score;
    };

    const ranked = (query, selected) => members
      .filter((m) => selected === "all" || m.group === selected)
      .map((member) => ({member, score: scoreMember(member, query)}))
      .filter((item) => !query || item.score > 0)
      .sort((a, b) => b.score - a.score || a.member.id - b.member.id)
      .map((item) => item.member);

    const initials = (name) => {
      const clean = name.replace(/\b(RP\.|RM\.|RD|SR\.)\b/gi, "").replace(/[^A-Za-zÀ-ÿ\s]/g, " ").trim();
      const parts = clean.split(/\s+/).filter(Boolean);
      return (parts.slice(0,2).map((part) => part[0]).join("") || "HA").toUpperCase();
    };

    // Avatar foto pengurus: JPEG digunakan bila file tersedia.
    // Jika foto belum tersedia/gagal dimuat, elemen img dihapus dan inisial tetap tampil sebagai fallback.
    const avatarHtml = (member, size = "") => {
      const cls = ["pengurus-avatar", size].filter(Boolean).join(" ");
      const fallback = escapeHtml(initials(member.name));
      if (!member.image) return `<span class="${cls}">${fallback}</span>`;
      return `<span class="${cls} pengurus-avatar-media"><img src="${escapeHtml(member.image)}" alt="" loading="lazy" decoding="async" onerror="this.remove()" aria-hidden="true"><span class="pengurus-avatar-fallback">${fallback}</span></span>`;
    };

    const renderSuggestions = (results, query) => {
      if (!suggestions) return;
      if (!query.trim()) { suggestions.hidden = true; suggestions.innerHTML = ""; return; }
      const top = results.slice(0,5);
      suggestions.hidden = false;
      suggestions.innerHTML = top.length ? top.map((m) => `<button type="button" class="pengurus-suggestion" data-suggestion-id="${m.id}">${avatarHtml(m, "small")}<span><strong>${escapeHtml(m.name)}</strong><small>${escapeHtml(m.role)}</small></span><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></button>`).join("") : `<div class="pengurus-suggestion-empty"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span>Tidak ada pengurus yang cocok.</span></div>`;
    };

    const render = () => {
      const q = search.value.trim();
      const selected = filter.value;
      const filtered = ranked(q, selected);
      body.innerHTML = filtered.map((m) => `<tr><td data-label="No">${m.id}</td><td data-label="Nama Lengkap"><button class="pengurus-name-btn" type="button" data-member-id="${m.id}" aria-label="Lihat profil ${escapeHtml(m.name)}">${avatarHtml(m)}<span><strong>${escapeHtml(m.name)}</strong><small>${escapeHtml(m.group)}</small></span></button></td><td data-label="Jabatan"><span class="pengurus-role">${escapeHtml(m.role)}</span><small class="pengurus-role-group">${escapeHtml(m.group)}</small></td><td data-label="Profil"><button class="btn outline pengurus-profile-btn" type="button" data-member-id="${m.id}"><i class="fa-regular fa-id-card" aria-hidden="true"></i><span>Lihat Profil</span></button></td></tr>`).join("");
      empty.hidden = filtered.length !== 0;
      count.textContent = filtered.length === members.length && !q && selected === "all" ? `Menampilkan ${members.length} pengurus` : `Menampilkan ${filtered.length} dari ${members.length} pengurus`;
      renderSuggestions(filtered, q);
    };

    const openProfile = (id) => {
      const member = members.find((m) => m.id === Number(id));
      if (!member || !modal || !modalContent) return;
      const cleanName = normalizedText(member.name).replace(/\b(rp|rm|rd|sr)\b/g, "").replace(/\./g, " ").replace(/\s+/g, " ").trim();
      const nameTokens = cleanName.split(/\s+/).filter((token) => token.length >= 4);
      const relatedArticles = (DATA.articles || []).filter((a) => {
        const text = normalizedText(`${a.title} ${a.excerpt} ${Array.isArray(a.content) ? a.content.join(" ") : (a.content || "")} ${a.author || ""}`);
        if (nameTokens.length >= 2 && nameTokens.every((token) => text.includes(token))) return true;
        return nameTokens.length === 1 && text.includes(nameTokens[0]);
      }).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, 4);
      const memberTopics = [...new Set(relatedArticles.flatMap((a) => a.tags || []))].slice(0, 5);
      const initialsLabel = initials(member.name);
      modalContent.innerHTML = `<div class="pengurus-profile-hero">${avatarHtml(member, "xl")}<div class="pengurus-profile-hero-copy"><span class="eyebrow">Profil Pengurus · Masa Bakti 2026–2029</span><h2 id="pengurusProfileTitle">${escapeHtml(member.name)}</h2><span class="pengurus-profile-role">${escapeHtml(member.role)}</span></div></div><div class="pengurus-profile-actions"><button class="btn outline" type="button" data-copy-profile><i class="fa-solid fa-link"></i> Salin tautan profil</button></div><div class="pengurus-profile-grid"><div class="pengurus-profile-card"><span><i class="fa-solid fa-layer-group" aria-hidden="true"></i> Kelompok</span><strong>${escapeHtml(member.group)}</strong></div><div class="pengurus-profile-card"><span><i class="fa-solid fa-briefcase" aria-hidden="true"></i> Fokus Pelayanan</span><strong>${escapeHtml(member.focus)}</strong></div><div class="pengurus-profile-card"><span><i class="fa-regular fa-newspaper" aria-hidden="true"></i> Publikasi Terkait</span><strong>${relatedArticles.length} artikel</strong></div><div class="pengurus-profile-card"><span><i class="fa-solid fa-hashtag" aria-hidden="true"></i> Topik Keterlibatan</span><strong>${memberTopics.length ? memberTopics.map(escapeHtml).join(" · ") : "Belum terpetakan"}</strong></div></div><div class="pengurus-profile-description"><span class="eyebrow">Tentang Peran</span><p>${escapeHtml(member.focus)}</p><p>Profil ini menampilkan informasi kepengurusan yang tersedia pada portal. Informasi pribadi tambahan tidak ditampilkan apabila belum tersedia sebagai data resmi untuk publikasi.</p></div>${relatedArticles.length ? `<div class="pengurus-related"><div class="section-head"><div><span class="eyebrow">Jejak publikasi</span><h3>Publikasi yang memuat nama ini</h3></div><span class="directory-section-count">${relatedArticles.length}</span></div><div class="pengurus-related-list">${relatedArticles.map(a=>`<a href="detail-berita.html?id=${a.id}"><span>${escapeHtml(formatDate(a.date))}</span><strong>${escapeHtml(a.title)}</strong><i class="fa-solid fa-arrow-right"></i></a>`).join("")}</div></div>` : ""}`;
      modalContent.querySelector('[data-copy-profile]')?.addEventListener('click', async () => {
        const url = new URL(location.href); url.hash = `pengurus-${member.id}`;
        try { await navigator.clipboard.writeText(url.toString()); notify("Tautan profil berhasil disalin."); } catch { notify(`Profil ${initialsLabel} siap dibagikan dari halaman ini.`); }
      });
      modal.hidden = false;
      requestAnimationFrame(() => modal.classList.add("open"));
      document.body.classList.add("modal-open");
      modalClose?.focus();
    };

    const closeProfile = () => {
      if (!modal) return;
      modal.classList.remove("open");
      document.body.classList.remove("modal-open");
      setTimeout(() => { modal.hidden = true; }, 220);
    };

    search.addEventListener("input", render);
    filter.addEventListener("change", render);
    reset?.addEventListener("click", () => { search.value = ""; filter.value = "all"; render(); search.focus(); });
    print?.addEventListener("click", () => window.print());
    body.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-member-id]");
      if (trigger) openProfile(trigger.dataset.memberId);
    });
    suggestions?.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-suggestion-id]");
      if (trigger) openProfile(trigger.dataset.suggestionId);
    });
    modalClose?.addEventListener("click", closeProfile);
    // Tutup ketika pengguna menekan area backdrop di luar kartu modal.
    // Klik di dalam kartu tidak akan menutup modal.
    modal?.addEventListener("click", (event) => {
      if (event.target === modal) closeProfile();
    });
    modal?.querySelector(".pengurus-profile-modal-card")?.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal?.classList.contains("open")) closeProfile(); });
    render();
    const profileHash = location.hash.match(/^#pengurus-(\d+)$/);
    if (profileHash) setTimeout(() => openProfile(profileHash[1]), 80);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await initTheme();
    initNavigation();
    initReveal();
    initHeroSlider();
    initBackTop();
    initSocialFloat();
    initGlobalSearch();
    renderHome();

    // Re-inisialisasi animasi reveal setelah konten beranda dibuat secara dinamis.
    // Sebelumnya elemen .reveal pada kartu berita/kategori/kegiatan dibuat
    // setelah initReveal() berjalan sehingga tetap opacity: 0 dan terlihat blank.
    initReveal();

    initNewsListing();
    hydrateNewsQuery();
    initDetail();
    initCategory();
    initGallery();
    initGalleryStories();
    initDirectory();
    initDirectoryDetail();
    initCollaborations();
    initSavedArticles();
    initReflectionRoom();
    initFaq();
    initPWA();
    initContactForm();
    initPengurusPage();
  });
})();
