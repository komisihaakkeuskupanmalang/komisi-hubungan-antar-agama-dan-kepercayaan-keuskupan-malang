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
    toggle?.addEventListener("click", () => {
      const open = mobile.classList.toggle("open");
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    $$("#mobileNav a").forEach((a) =>
      a.addEventListener("click", () => {
        mobile.classList.remove("open");
        document.body.classList.remove("menu-open");
        toggle?.setAttribute("aria-expanded", "false");
      }),
    );
    $("#themeToggle")?.addEventListener("click", toggleTheme);

    const current = location.pathname.split("/").pop() || "index.html";
    $$("[data-nav]").forEach((a) => {
      if (
        a.getAttribute("href") === current ||
        (current === "" && a.getAttribute("href") === "index.html")
      )
        a.classList.add("active");
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

  // ---------- Back to top ----------
  function initBackTop() {
    const btn = $("#backTop");
    if (!btn) return;
    window.addEventListener(
      "scroll",
      () => btn.classList.toggle("visible", window.scrollY > 500),
      { passive: true },
    );
    btn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" }),
    );
  }

  // ---------- Kartu artikel ----------
  function articleCard(article) {
    return `<article class="news-card reveal">
      <a href="detail-berita.html?id=${article.id}" aria-label="Baca ${escapeHtml(article.title)}">
        <div class="card-image"><img src="${article.image}" alt="${escapeHtml(article.title)}" loading="lazy"></div>
        <div class="card-body">
          <span class="badge">${escapeHtml(article.category)}</span>
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.excerpt)}</p>
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

  // ---------- Render beranda ----------
  function renderHome() {
    const featured = $("#featuredNews");
    if (!featured) return;
    const articles = DATA.articles;
    const feature = articles.find((a) => a.featured) || articles[0];
    featured.innerHTML = `<div class="feature-main">
      <img src="${feature.image}" alt="${escapeHtml(feature.title)}">
      <div class="feature-main-content">
        <span class="badge">${escapeHtml(feature.category)}</span>
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
    const search = $("#newsSearch");
    const category = $("#newsCategory");
    const sort = $("#newsSort");
    const clear = $("#clearSearch");
    const pagination = $("#pagination");
    let page = 1,
      perPage = 6;

    category.innerHTML += DATA.categories
      .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
      .join("");

    function getFiltered() {
      const q = search.value.trim().toLowerCase();
      let list = DATA.articles.filter(
        (a) =>
          (!q ||
            [a.title, a.category, a.excerpt, a.author, ...a.tags]
              .join(" ")
              .toLowerCase()
              .includes(q)) &&
          (!category.value || a.category === category.value),
      );
      list.sort((a, b) =>
        sort.value === "oldest"
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date),
      );
      return list;
    }
    function render() {
      const list = getFiltered();
      const pages = Math.max(1, Math.ceil(list.length / perPage));
      page = Math.min(page, pages);
      const slice = list.slice((page - 1) * perPage, page * perPage);
      root.innerHTML = slice.length
        ? slice.map(articleCard).join("")
        : `<div class="empty-state" style="grid-column:1/-1"><i class="fa-regular fa-newspaper"></i><h3>Berita tidak ditemukan</h3><p>Coba kata kunci atau kategori lain.</p></div>`;
      pagination.innerHTML = Array.from(
        { length: pages },
        (_, i) =>
          `<button class="${i + 1 === page ? "active" : ""}" data-page="${i + 1}" aria-label="Halaman ${i + 1}">${i + 1}</button>`,
      ).join("");
      $$("button[data-page]", pagination).forEach((b) =>
        b.addEventListener("click", () => {
          page = Number(b.dataset.page);
          render();
          window.scrollTo({ top: 300, behavior: "smooth" });
        }),
      );
      initReveal();
    }
    [search, category, sort].forEach((el) =>
      el.addEventListener("input", () => {
        page = 1;
        render();
      }),
    );
    clear.addEventListener("click", () => {
      search.value = "";
      category.value = "";
      sort.value = "newest";
      page = 1;
      render();
      search.focus();
    });
    render();
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
  const related = DATA.articles
    .filter(
      (a) =>
        a.id !== article.id &&
        (
          a.category === article.category ||
          a.tags.some((t) =>
            article.tags.includes(t)
          )
        ),
    )
    .slice(0, 3);


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


    <span class="badge">
      ${escapeHtml(article.category)}
    </span>


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


      <button
        class="btn outline"
        id="bookmarkArticle"
        type="button"
      >
        <i class="fa-regular fa-bookmark"></i>
        Simpan
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
   * Cek apakah artikel sudah disimpan/bookmark
   * ========================================================= */
  const existing =
    await dbGet(
      "bookmarks",
      article.id,
    );


  const bookmarkBtn =
    $("#bookmarkArticle");


  /* =========================================================
   * Update tampilan tombol bookmark
   * ========================================================= */
  if (existing && bookmarkBtn) {

    bookmarkBtn.innerHTML =
      `
        <i class="fa-solid fa-bookmark"></i>
        Tersimpan
      `;

  }


  /* =========================================================
   * Event bookmark
   * ========================================================= */
  bookmarkBtn?.addEventListener(
    "click",
    async () => {

      const found =
        await dbGet(
          "bookmarks",
          article.id,
        );


      /* -------------------------------------------------------
       * Jika sudah tersimpan → hapus bookmark
       * ------------------------------------------------------- */
      if (found) {

        await dbDelete(
          "bookmarks",
          article.id,
        );


        bookmarkBtn.innerHTML =
          `
            <i class="fa-regular fa-bookmark"></i>
            Simpan
          `;


        toast(
          "Artikel dihapus dari simpanan.",
        );


      } else {

        /* -----------------------------------------------------
         * Jika belum tersimpan → simpan bookmark
         * ----------------------------------------------------- */
        await dbPut("bookmarks", {

          id: article.id,

          title: article.title,

          date: Date.now(),

        });


        bookmarkBtn.innerHTML =
          `
            <i class="fa-solid fa-bookmark"></i>
            Tersimpan
          `;


        toast(
          "Artikel disimpan di perangkat Anda.",
        );

      }

    },
  );


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
      : `<div class="empty-state" style="grid-column:1/-1"><h3>Belum ada artikel</h3><p>Kategori ini belum memiliki konten pada data contoh.</p></div>`;
    $("#allCategories").innerHTML = DATA.categories
      .map(
        (c) =>
          `<a class="category-item" href="kategori.html?cat=${encodeURIComponent(c)}">${escapeHtml(c)}<small>${DATA.articles.filter((a) => a.category === c).length} artikel</small></a>`,
      )
      .join("");
    initReveal();
  }

  // ---------- Dokumentasi / lightbox ----------
  function initGallery() {
    const grid = $("#galleryGrid");
    if (!grid) return;
    grid.innerHTML = DATA.gallery
      .map(
        (g, i) =>
          `<button class="gallery-item reveal" data-gallery="${i}" aria-label="Lihat foto: ${escapeHtml(g.caption)}"><img src="${g.src}" alt="${escapeHtml(g.caption)}" loading="lazy"></button>`,
      )
      .join("");
    const box = $("#lightbox"),
      img = $("#lightboxImage"),
      caption = $("#lightboxCaption");
    $$("[data-gallery]", grid).forEach((btn) =>
      btn.addEventListener("click", () => {
        const item = DATA.gallery[Number(btn.dataset.gallery)];
        img.src = item.src;
        img.alt = item.caption;
        caption.textContent = item.caption;
        box.classList.add("open");
        box.setAttribute("aria-hidden", "false");
      }),
    );
    const close = () => {
      box.classList.remove("open");
      box.setAttribute("aria-hidden", "true");
    };
    $("#lightboxClose")?.addEventListener("click", close);
    box?.addEventListener("click", (e) => {
      if (e.target === box) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    initReveal();
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

  const OFFICIAL_EMAIL = "komisihaakkeuskupanmalang@gmail.com";

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
    const form = $("#globalSearchForm");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = $("#globalSearchInput").value.trim();
      if (q) location.href = `berita.html?q=${encodeURIComponent(q)}`;
    });
  }

  // Memproses query pencarian dari URL pada halaman berita.
  function hydrateNewsQuery() {
    const search = $("#newsSearch");
    if (!search) return;
    const q = new URLSearchParams(location.search).get("q");
    if (q) search.value = q;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await initTheme();
    initNavigation();
    initReveal();
    initHeroSlider();
    initBackTop();
    initGlobalSearch();
    renderHome();
    initNewsListing();
    hydrateNewsQuery();
    initDetail();
    initCategory();
    initGallery();
    initFaq();
    initContactForm();
  });
})();
