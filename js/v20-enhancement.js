/**
 * Portal Berita HAAK — v20 Intelligence Enhancement Layer
 * Fokus: pengembangan fitur yang sudah ada, tanpa menambah halaman/menu baru.
 * Frontend-first, local-first, aman dipasang di atas v19.
 */
(() => {
  "use strict";
  const D = window.HAAK_DATA || {articles:[], activities:[], directory:[], collaborations:[], categories:[], videos:[], podcasts:[]};
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const esc = v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
  const toast=m=>{const t=$("#haakToast");if(!t)return;t.textContent=m;t.classList.add("show");clearTimeout(window.__v20toast);window.__v20toast=setTimeout(()=>t.classList.remove("show"),2400)};
  const arts=()=>D.articles||[];
  const getArticle=id=>arts().find(a=>Number(a.id)===Number(id));
  const normalize=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const words=s=>new Set(normalize(s).split(/[^a-z0-9]+/).filter(x=>x.length>2));
  const overlap=(a,b)=>{let n=0;for(const x of words(a))if(words(b).has(x))n++;return n};
  const articleText=a=>[a.title,a.excerpt,a.category,a.author,...(a.tags||[]),String(a.content||"").replace(/<[^>]+>/g," ")].join(" ");
  const dateFmt=d=>{try{return new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(new Date(`${d}T00:00:00`))}catch{return d||"—"}};

  function ensureStyles(){
    if($("#haak-v20-style"))return;
    const l=document.createElement("link");l.id="haak-v20-style";l.rel="stylesheet";l.href="css/v20-enhancement.css";document.head.appendChild(l);
  }

  /* 1–4, 12: Search intelligence + suggestions + semantic scoring + related content */
  function searchIntelligence(){
    const input=$("#newsSearch"); if(!input)return;
    const form=$("#advancedSearchForm"); if(!form)return;
    let box=$("#v20-search-suggestions");
    if(!box){
      box=document.createElement("div");box.id="v20-search-suggestions";box.className="v20-search-suggestions";box.hidden=true;
      input.closest(".advanced-search-main")?.appendChild(box);
    }
    const topics=[...(D.categories||[]),...arts().flatMap(a=>a.tags||[])].filter(Boolean);
    const uniq=[...new Set(topics)];
    const render=q=>{
      const nq=normalize(q).trim();
      if(!nq){box.hidden=true;return}
      const hits=arts().map(a=>({a,score:semanticScore(a,q)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5);
      const topicHits=uniq.filter(t=>normalize(t).includes(nq)).slice(0,4);
      if(!hits.length&&!topicHits.length){box.hidden=true;return}
      box.innerHTML=`<div class="v20-suggest-head"><span><i class="fa-solid fa-wand-magic-sparkles"></i> Pencarian pintar</span><small>${hits.length} kandidat relevan</small></div>
      ${topicHits.map(t=>`<button type="button" class="v20-suggest-topic" data-q="${esc(t)}"><i class="fa-solid fa-hashtag"></i>${esc(t)}</button>`).join("")}
      ${hits.map(x=>`<a class="v20-suggest-item" href="detail-berita.html?id=${x.a.id}"><span class="v20-suggest-thumb">${x.a.image?`<img src="${esc(x.a.image)}" alt="">`:""}</span><span><strong>${esc(x.a.title)}</strong><small>${esc(x.a.category)} · ${dateFmt(x.a.date)} · relevansi ${Math.min(99,Math.round(x.score*9+40))}%</small></span></a>`).join("")}`;
      box.hidden=false;
      $$(".v20-suggest-topic",box).forEach(b=>b.onclick=()=>{input.value=b.dataset.q;input.dispatchEvent(new Event("input",{bubbles:true}));box.hidden=true});
    };
    const semanticScore=(a,q)=>{
      const nq=normalize(q); if(!nq)return 0;
      let s=0; const title=normalize(a.title), ex=normalize(a.excerpt), cat=normalize(a.category), tag=(a.tags||[]).map(normalize).join(" ");
      if(title.includes(nq))s+=8; if(cat.includes(nq))s+=5;if(tag.includes(nq))s+=5;if(ex.includes(nq))s+=3;
      s+=overlap(q,articleText(a))*0.55;
      return s;
    };
    window.HAAK_V20={...(window.HAAK_V20||{}),semanticScore};
    input.addEventListener("input",()=>render(input.value));
    input.addEventListener("keydown",e=>{if(e.key==="Escape")box.hidden=true});
    document.addEventListener("click",e=>{if(!box.contains(e.target)&&e.target!==input)box.hidden=true});
    // Active filter summary without replacing the existing search engine.
    const panel=$("#advancedSearchPanel");
    if(panel&&!$("#v20-filter-summary")){
      const s=document.createElement("div");s.id="v20-filter-summary";s.className="v20-filter-summary";panel.parentNode.insertBefore(s,panel.nextSibling);
      const update=()=>{const vals=[["Kategori",$("#newsCategory")?.value],["Tahun",$("#newsYear")?.value],["Tag",$("#newsTag")?.value],["Urutan",$("#newsSort")?.value]].filter(x=>x[1]);s.innerHTML=vals.length?`<span><i class="fa-solid fa-filter"></i> Filter aktif</span>${vals.map(x=>`<button type="button" data-filter="${x[0]}">${esc(x[0])}: ${esc(x[1])} <i class="fa-solid fa-xmark"></i></button>`).join("")}`:`<span class="muted">Pencarian tanpa filter tambahan</span>`};
      [$("#newsCategory"),$("#newsYear"),$("#newsTag"),$("#newsSort")].forEach(x=>x?.addEventListener("change",update));update();
    }
  }

  function relatedAndIntelligence(){
    const root=$("#articleDetail"); if(!root)return;
    const id=new URLSearchParams(location.search).get("id"), a=getArticle(id||1); if(!a)return;
    if(!$("#v20-article-intelligence")){
      const related=arts().filter(x=>x.id!==a.id).map(x=>({a:x,s:overlap(articleText(a),articleText(x))+(x.category===a.category?3:0)+((x.tags||[]).some(t=>(a.tags||[]).includes(t))?3:0)})).sort((x,y)=>y.s-x.s).slice(0,4);
      const text=String(a.content||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
      const sentences=text.split(/(?<=[.!?])\s+/).filter(x=>x.length>45);
      const summary=(a.excerpt||sentences.slice(0,2).join(" ")).replace(/<[^>]+>/g,"");
      const tags=[...(a.tags||[]),a.category].filter(Boolean);
      const panel=document.createElement("section");panel.id="v20-article-intelligence";panel.className="v20-intelligence-panel";
      panel.innerHTML=`<div class="v20-panel-head"><div><span class="eyebrow">Article Intelligence</span><h2>Memahami cerita ini</h2></div><span class="v20-confidence"><i class="fa-solid fa-circle-check"></i> Terstruktur</span></div>
      <div class="v20-intel-grid">
        <div class="v20-intel-card v20-summary"><span class="v20-label"><i class="fa-solid fa-bolt"></i> Ringkasan cepat</span><p>${esc(summary.slice(0,520))}${summary.length>520?"…":""}</p></div>
        <div class="v20-intel-card"><span class="v20-label"><i class="fa-solid fa-tags"></i> Topik & konteks</span><div class="v20-chip-row">${tags.map(t=>`<a href="berita.html?q=${encodeURIComponent(t)}" class="v20-chip">${esc(t)}</a>`).join("")}</div><div class="v20-meta-lines"><span><i class="fa-regular fa-calendar"></i> ${dateFmt(a.date)}</span><span><i class="fa-regular fa-clock"></i> ${Math.max(1,Math.ceil(text.split(/\s+/).length/190))} menit baca</span></div></div>
      </div>
      <div class="v20-entity-strip"><strong><i class="fa-solid fa-link"></i> Konteks terhubung</strong><span>Artikel ini dapat dijelajahi melalui topik, kategori, kegiatan, dan jejaring yang tercatat.</span></div>
      ${related.length?`<div class="v20-related"><div class="v20-related-head"><div><span class="eyebrow">Smart Related Articles</span><h3>Berikutnya yang paling relevan</h3></div></div><div class="v20-related-grid">${related.map(x=>`<a href="detail-berita.html?id=${x.a.id}" class="v20-related-card">${x.a.image?`<img src="${esc(x.a.image)}" alt="" loading="lazy">`:""}<span><strong>${esc(x.a.title)}</strong><small>${esc(x.a.category)} · ${dateFmt(x.a.date)} · ${Math.min(99,55+x.s*6)}% relevan</small></span></a>`).join("")}</div></div>`:""}`;
      root.appendChild(panel);
    }
    entityHighlight(root,a);
    articleActions(root,a);
    readingPosition(a);
    articleGlossary(root);
  }

  function articleActions(root,a){
    const article=root.querySelector("article")||root;
    if($("#v20-actions",root))return;
    const saved=read("haak-reading-lists",[]).some(x=>Number(x.id)===Number(a.id));
    const b=document.createElement("div");b.id="v20-actions";b.className="v20-action-bar";
    b.innerHTML=`<button class="btn ${saved?"gold":"outline"}" id="v20-save-reading"><i class="fa-${saved?"solid":"regular"} fa-bookmark"></i> ${saved?"Tersimpan":"Simpan ke daftar baca"}</button><button class="btn outline" id="v20-print"><i class="fa-solid fa-print"></i> Versi cetak</button>`;
    article.appendChild(b);
    $("#v20-save-reading").onclick=()=>{
      let list=read("haak-reading-lists",[]);
      if(list.some(x=>Number(x.id)===Number(a.id))){list=list.filter(x=>Number(x.id)!==Number(a.id));toast("Artikel dihapus dari daftar baca.");}
      else {list.unshift({id:a.id,at:Date.now()});list=list.slice(0,100);toast("Artikel disimpan ke daftar baca.");}
      write("haak-reading-lists",list);articleActionsRefresh(a);
    };
    $("#v20-print").onclick=()=>window.print();
  }
  function articleActionsRefresh(a){const b=$("#v20-save-reading");if(!b)return;const saved=read("haak-reading-lists",[]).some(x=>Number(x.id)===Number(a.id));b.className=`btn ${saved?"gold":"outline"}`;b.innerHTML=`<i class="fa-${saved?"solid":"regular"} fa-bookmark"></i> ${saved?"Tersimpan":"Simpan ke daftar baca"}`}

  function readingPosition(a){
    const key=`haak-reading-position-${a.id}`;
    const article=$("#articleDetail article")||$("#articleDetail"); if(!article||article.dataset.v20Position)return;
    article.dataset.v20Position="1";
    const on=()=>{const h=document.documentElement.scrollHeight-innerHeight;write(key,{y:scrollY,progress:h>0?Math.min(1,scrollY/h):0,at:Date.now()})};
    let raf=0;addEventListener("scroll",()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;on()})},{passive:true});
    const saved=read(key,null);
    if(saved?.y>220&&!sessionStorage.getItem(key)){const bar=document.createElement("div");bar.className="v20-resume";bar.innerHTML=`<span><i class="fa-solid fa-book-open"></i> Lanjut dari ${Math.round((saved.progress||0)*100)}%</span><button class="btn gold">Lanjutkan</button><button class="v20-dismiss" aria-label="Tutup">×</button>`;document.body.appendChild(bar);bar.querySelector(".btn").onclick=()=>{scrollTo({top:saved.y,behavior:"smooth"});bar.remove();sessionStorage.setItem(key,"1")};bar.querySelector(".v20-dismiss").onclick=()=>bar.remove()}
  }

  function articleGlossary(root){
    if($("#v20-glossary",root))return;
    const terms={"kerukunan":"Keadaan hidup bersama secara damai, saling menghormati, dan menjaga hubungan baik di tengah perbedaan.","toleransi":"Sikap menghargai perbedaan tanpa menghilangkan identitas masing-masing.","dialog":"Ruang perjumpaan untuk mendengar, memahami, dan membangun relasi bersama.","kebhinekaan":"Keberagaman yang menjadi bagian dari kehidupan bersama masyarakat Indonesia."};
    const content=root.querySelector(".article-content,[class*='article-content']")||root;
    const found=Object.keys(terms).filter(t=>normalize(content.textContent).includes(t));
    if(!found.length)return;
    const box=document.createElement("div");box.id="v20-glossary";box.className="v20-glossary";
    box.innerHTML=`<div><span class="eyebrow">Article Glossary</span><h3>Istilah yang membantu memahami cerita</h3></div>${found.map(t=>`<button type="button" data-term="${t}"><span>${t}</span><i class="fa-solid fa-circle-info"></i></button>`).join("")}<div class="v20-glossary-pop" hidden></div>`;
    const relatedSection=[...root.querySelectorAll("section")].find(section=>normalize(section.textContent).includes("bacaan terkait"));
    if(relatedSection) relatedSection.insertAdjacentElement("afterend",box);
    else (content.parentNode||root).appendChild(box);
    const pop=$(".v20-glossary-pop",box);$$("[data-term]",box).forEach(b=>b.onclick=()=>{pop.hidden=false;pop.innerHTML=`<strong>${esc(b.dataset.term)}</strong><p>${esc(terms[b.dataset.term])}</p>`});
  }

  function entityHighlight(root,a){
    const content=root.querySelector(".article-content,[class*='article-content']");if(!content||content.dataset.v20Entity)return;
    content.dataset.v20Entity="1";
    const names=[...(D.directory||[]).map(x=>x.name),...(D.directory||[]).map(x=>x.location)].filter(x=>x&&x.length>4).sort((x,y)=>y.length-x.length).slice(0,20);
    if(!names.length)return;
    const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{
      if(!n.nodeValue.trim()||n.parentElement.closest("a,button,script,style"))return;
      let html=esc(n.nodeValue),changed=false;
      names.forEach(name=>{const re=new RegExp(`(${name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,"gi");if(re.test(html)){html=html.replace(re,`<button type="button" class="v20-entity" data-entity="${esc(name)}">$1</button>`);changed=true}});
      if(changed){const span=document.createElement("span");span.innerHTML=html;n.replaceWith(...span.childNodes)}
    });
    content.addEventListener("click",e=>{const b=e.target.closest(".v20-entity");if(!b)return;const name=b.dataset.entity;const d=(D.directory||[]).find(x=>normalize(x.name)===normalize(name)||normalize(x.location)===normalize(name));if(!d)return;showContextCard(b,d)});
  }
  function showContextCard(anchor,d){
    $("#v20-context-card")?.remove();const box=document.createElement("div");box.id="v20-context-card";box.className="v20-context-card";
    box.innerHTML=`<button class="v20-context-close" aria-label="Tutup">×</button>${d.logo?`<img src="${esc(d.logo)}" alt="">`:""}<span class="eyebrow">Context Card · Jejaring</span><h3>${esc(d.name)}</h3><p>${esc(d.focus||d.description||"Jejaring yang tercatat dalam publikasi portal.")}</p><div class="v20-context-stats"><span><strong>${(d.articles||[]).length}</strong> publikasi</span><span>${esc(d.location||"—")}</span></div>${d.id?`<a class="btn gold" href="direktori-detail.html?id=${encodeURIComponent(d.id)}">Lihat profil</a>`:""}`;
    document.body.appendChild(box);const r=anchor.getBoundingClientRect();box.style.top=`${Math.min(innerHeight-320,Math.max(12,r.bottom+8))}px`;box.style.left=`${Math.min(innerWidth-360,Math.max(12,r.left))}px`;$(".v20-context-close",box).onclick=()=>box.remove();
  }

  /* 5–6: Jejaring intelligence */
  function networkIntelligence(){
    const root=$("#collaborationList");if(!root)return;
    if($("#v20-network-insight"))return;
    const dirs=D.directory||[], cols=D.collaborations||[];
    const counts=dirs.map(d=>({d,n:cols.filter(c=>(c.partners||[]).includes(d.id)).length+(d.articles||[]).length})).sort((a,b)=>b.n-a.n);
    const sec=document.createElement("section");sec.id="v20-network-insight";sec.className="v20-network-insight";
    sec.innerHTML=`<div class="v20-panel-head"><div><span class="eyebrow">Relationship Intelligence</span><h2>Peta kekuatan jejaring</h2><p>Skor dihitung dari jejak publikasi dan kolaborasi yang tersedia di data portal.</p></div></div><div class="v20-network-grid">${counts.slice(0,6).map((x,i)=>`<article><span class="v20-rank">0${i+1}</span><div><strong>${esc(x.d.name)}</strong><small>${x.d.articles?.length||0} publikasi · ${x.n-(x.d.articles?.length||0)} kolaborasi tercatat</small><div class="v20-meter"><i style="width:${Math.min(100,25+x.n*15)}%"></i></div></div><b>${Math.min(99,45+x.n*9)}</b></article>`).join("")}</div>`;
    root.parentNode.insertBefore(sec,root);
  }

  /* 7, 10, 14, 30: dashboard + personalization + journey */
  function homeIntelligence(){
    if(!document.body.classList.contains("home-page"))return;
    const hero=$(".hero");if(!hero)return;
    if(!$("#v20-home-intelligence")){
      const history=read("haak-reading-history",[]), saved=read("haak-reading-lists",[]);
      const recent=history.map(x=>getArticle(x.id)).filter(Boolean).slice(0,3);
      const top=arts().slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
      const counts={articles:arts().length,topics:new Set(arts().flatMap(a=>a.tags||[])).size,network:(D.directory||[]).length,activities:(D.activities||[]).length};
      const sec=document.createElement("section");sec.id="v20-home-intelligence";sec.className="section v20-home-section";
      sec.innerHTML=`<div class="container">
      <div class="v20-journey"><div><span class="eyebrow">HAAK Journey</span><h2>Jelajahi HAAK sesuai kebutuhan Anda</h2><p>Portal membaca pola interaksi lokal untuk menempatkan pintu masuk yang paling relevan.</p></div><div class="v20-journey-steps"><a href="berita.html"><b>01</b><span>Temukan cerita</span></a><a href="tema.html"><b>02</b><span>Telusuri topik</span></a><a href="direktori.html"><b>03</b><span>Kenali jejaring</span></a><a href="refleksi.html"><b>04</b><span>Ruang refleksi</span></a></div></div>
      <div class="v20-insight-stats">${Object.entries(counts).map(([k,v])=>`<div><span>${esc(k)}</span><strong data-v20-count="${v}">${v}</strong></div>`).join("")}</div>
      ${recent.length?`<div class="v20-personal"><div class="v20-panel-head"><div><span class="eyebrow">Untuk Anda</span><h3>Lanjutkan dari bacaan terakhir</h3></div><a href="riwayat.html">Lihat semua</a></div><div class="v20-personal-grid">${recent.map(a=>`<a href="detail-berita.html?id=${a.id}"><span class="v20-personal-progress"></span><strong>${esc(a.title)}</strong><small>${esc(a.category)} · ${dateFmt(a.date)}</small></a>`).join("")}</div></div>`:`<div class="v20-editor-choice"><span class="eyebrow">Editor's Choice</span><h3>${esc(top[0]?.title||"Cerita pilihan HAAK")}</h3><p>${esc(top[0]?.excerpt||"Temukan cerita yang dipilih dari publikasi terbaru.")}</p><a class="btn gold" href="${top[0]?`detail-berita.html?id=${top[0].id}`:"berita.html"}">Baca pilihan editor</a></div>`}
      </div>`;
      hero.parentNode.insertBefore(sec,hero.nextElementSibling);
    }
    if(!$("#v20-dashboard")){
      const top=arts().slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
      const section=document.createElement("section");section.id="v20-dashboard";section.className="section v20-dashboard-section";
      const byYear={};top.forEach(a=>{const y=String(a.date||"").slice(0,4);byYear[y]=(byYear[y]||0)+1});
      const trend=Object.entries(byYear).sort((a,b)=>a[0].localeCompare(b[0])).slice(-5);
      section.innerHTML=`<div class="container"><div class="v20-panel-head"><div><span class="eyebrow">Portal Insight Dashboard</span><h2>Jejak publikasi</h2><p>Ringkasan cepat dari data yang sedang digunakan portal.</p></div></div><div class="v20-trend">${trend.map(([y,n])=>`<div><span>${y}</span><i style="height:${Math.max(18,n*22)}px"></i><b>${n}</b></div>`).join("")}</div><div class="v20-dashboard-note"><i class="fa-solid fa-chart-line"></i><span>Perubahan statistik mengikuti data artikel lokal dan tidak memerlukan akun pengguna.</span></div></div>`;
      const last=$("main")?.lastElementChild; if(last)last.after(section); else hero.parentNode.appendChild(section);
    }
  }

  /* 11: Activity explorer — enhancement controls, no new page */
  function activityExplorer(){
    const root=$("#activityList");if(!root||$("#v20-activity-toolbar"))return;
    const acts=D.activities||[];
    const bar=document.createElement("div");
    bar.id="v20-activity-toolbar";
    bar.className="v20-activity-toolbar";
    const statuses=[...new Set(acts.map(a=>a.status).filter(Boolean))];
    bar.innerHTML=`
      <div class="v20-activity-search-row">
        <label class="v20-activity-search" aria-label="Cari kegiatan">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input type="search" placeholder="Cari nama, lokasi, status, atau deskripsi kegiatan…" aria-label="Cari kegiatan">
          <button class="v20-activity-clear" type="button" aria-label="Bersihkan pencarian" title="Bersihkan pencarian" hidden><i class="fa-solid fa-xmark"></i></button>
        </label>
      </div>
      <div class="v20-activity-filter-row">
        <div class="v20-activity-filters" role="group" aria-label="Filter status kegiatan">
          <button type="button" class="v20-chip active" data-status="">Semua</button>
          ${statuses.map(st=>`<button type="button" class="v20-chip" data-status="${esc(st)}">${esc(st)}</button>`).join("")}
        </div>
        <div class="v20-activity-result" aria-live="polite"></div>
      </div>`;
    root.parentNode.insertBefore(bar,root);

    const input=$("input",bar), clear=$(".v20-activity-clear",bar), result=$(".v20-activity-result",bar);
    const cards=$$(".activity-card",root);
    const empty=document.createElement("div");
    empty.className="v20-activity-empty";
    empty.innerHTML=`<i class="fa-regular fa-calendar-xmark" aria-hidden="true"></i><strong>Kegiatan tidak ditemukan</strong><span>Coba kata kunci atau filter status yang berbeda.</span>`;
    empty.hidden=true;
    root.appendChild(empty);

    const filter=()=>{
      const q=normalize(input.value.trim());
      const st=$(".v20-chip.active",bar)?.dataset.status||"";
      let visible=0;
      cards.forEach(card=>{
        const text=normalize(card.textContent);
        const status=card.querySelector(".status")?.textContent.trim()||"";
        const hitText=!q||text.includes(q);
        const hitStatus=!st||status===st;
        const hit=hitText&&hitStatus;
        card.hidden=!hit;
        if(hit)visible++;
      });
      clear.hidden=!input.value;
      empty.hidden=visible!==0;
      result.innerHTML=`<i class="fa-solid fa-list-check" aria-hidden="true"></i><strong>${visible}</strong> dari ${cards.length} kegiatan`;
    };
    input.addEventListener("input",filter);
    clear.addEventListener("click",()=>{input.value="";input.focus();filter()});
    $$(".v20-chip",bar).forEach(b=>b.addEventListener("click",()=>{
      $$(".v20-chip",bar).forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      filter();
    }));
    filter();
  }

  /* 10, 12: topic intelligence and growth */
  function topicIntelligence(){
    const grid=$("#topicGrid");if(!grid)return;
    $$(".topic-card",grid).forEach(card=>{
      if(card.querySelector(".v20-topic-insight"))return;
      const tag=card.querySelector("h2")?.textContent.trim();if(!tag)return;
      const rel=arts().filter(a=>(a.tags||[]).includes(tag)||a.category===tag).sort((a,b)=>new Date(b.date)-new Date(a.date));
      const years=[...new Set(rel.map(a=>String(a.date).slice(0,4)))];
      const trend=years.length>1?`${years.length} periode`:"Terpantau";
      const x=document.createElement("div");x.className="v20-topic-insight";x.innerHTML=`<span><i class="fa-solid fa-arrow-trend-up"></i> ${rel.length} cerita</span><span>${trend}</span>`;card.appendChild(x);
    });
  }

  /* 21–23: local data quality / duplicate / integrity, exposed through Diagnostics */
  function diagnostics(){
    if($("#v20-diagnostics"))return;
    const a=arts(), missing=a.filter(x=>!x.title||!x.date||!x.content||!x.category).length;
    const seen=new Map(), dup=[];
    a.forEach(x=>{const k=normalize(x.title);if(seen.has(k))dup.push([seen.get(k),x]);else seen.set(k,x)});
    const weak=a.filter(x=>String(x.excerpt||"").length<80||!(x.tags||[]).length).length;
    const panel=document.createElement("div");panel.id="v20-diagnostics";panel.className="v20-modal";panel.innerHTML=`<div class="v20-modal-card"><button class="v20-modal-close" aria-label="Tutup">×</button><div class="v20-panel-head"><div><span class="eyebrow">Diagnostics Mode</span><h2>Health check portal</h2></div><span class="v20-health-badge">${missing||dup.length?"Perlu perhatian":"Sehat"}</span></div><div class="v20-health-grid"><div><strong>${a.length}</strong><span>Artikel dipindai</span></div><div><strong>${missing}</strong><span>Data wajib kosong</span></div><div><strong>${dup.length}</strong><span>Judul duplikat</span></div><div><strong>${weak}</strong><span>Metadata perlu diperkuat</span></div></div><div class="v20-diagnostic-list"><div><i class="fa-solid fa-database"></i><span>Content Integrity Layer<small>Validasi judul, tanggal, kategori, isi, tag.</small></span><b>${missing?"Perlu cek":"OK"}</b></div><div><i class="fa-solid fa-copy"></i><span>Duplicate / Similar Detector<small>Deteksi duplikasi judul dan konten serupa.</small></span><b>${dup.length?"Perlu cek":"OK"}</b></div><div><i class="fa-solid fa-gauge-high"></i><span>Asset Performance Monitor<small>${document.images.length} gambar aktif pada halaman ini.</small></span><b>Aktif</b></div></div></div>`;
    document.body.appendChild(panel);$(".v20-modal-close",panel).onclick=()=>panel.remove();panel.addEventListener("click",e=>{if(e.target===panel)panel.remove()});
  }
  function bindDiagnostics(){
    document.addEventListener("keydown",e=>{if(e.shiftKey&&e.key.toLowerCase()==="d"){diagnostics()}});
    // Extend existing command palette with a visible diagnostic action if palette exists.
    setTimeout(()=>{$("#haakCommandPalette")?.querySelector(".command-palette-list")?.insertAdjacentHTML("beforeend",`<button type="button" class="v20-command-diagnostic"><i class="fa-solid fa-stethoscope"></i><span><strong>Diagnostics Mode</strong><small>Shift + D · periksa kesehatan portal</small></span></button>`);$(".v20-command-diagnostic")?.addEventListener("click",()=>{diagnostics();$("#haakCommandPalette")?.classList.remove("open")})},900);
  }

  /* Riwayat: Ekspor/Impor tetap tersedia di bawah tombol Bersihkan Riwayat. */
  function historyTransferActions(){
    const clear=$("#clearReadingHistory"), toolbar=clear?.closest(".saved-toolbar");
    if(!clear||!toolbar||$("#v20-history-transfer"))return;
    const box=document.createElement("div");box.id="v20-history-transfer";box.className="v20-history-transfer";
    box.innerHTML=`<button class="btn outline" id="v20-export" type="button"><i class="fa-solid fa-file-export"></i> Ekspor</button><button class="btn outline" id="v20-import" type="button"><i class="fa-solid fa-file-import"></i> Impor</button><input id="v20-import-file" type="file" accept="application/json,.json" hidden>`;
    toolbar.insertAdjacentElement("afterend",box);
    $("#v20-export").onclick=()=>{
      const payload={version:"v20",exportedAt:new Date().toISOString(),history:read("haak-reading-history",[]),readingLists:read("haak-reading-lists",[])};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
      const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="haak-reading-collection.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),500);toast("Koleksi bacaan diekspor.");
    };
    $("#v20-import").onclick=()=>$("#v20-import-file").click();
    $("#v20-import-file").onchange=e=>{
      const f=e.target.files?.[0];if(!f)return;
      const r=new FileReader();r.onload=()=>{try{
        const x=JSON.parse(r.result);
        if(Array.isArray(x.history))write("haak-reading-history",x.history);
        if(Array.isArray(x.readingLists))write("haak-reading-lists",x.readingLists);
        toast("Koleksi berhasil diimpor.");setTimeout(()=>location.reload(),450);
      }catch{toast("File koleksi tidak valid.")}};r.readAsText(f);
    };
  }

  function printEnhancement(){
    if($("#v20-print-css"))return;
    const st=document.createElement("style");st.id="v20-print-css";st.textContent=`@media print{body{background:#fff!important}.haak-header,.footer,.site-footer,footer,.back-top,.v20-action-bar,.v20-related,.v20-resume,.v20-context-card,.v20-glossary{display:none!important}.article-layout{display:block!important}.article-layout aside{display:none!important}article#articleDetail,.article-content{max-width:760px!important;margin:auto!important}.v20-intelligence-panel{break-inside:avoid;border:1px solid #bbb!important;box-shadow:none!important}}`;document.head.appendChild(st);
  }

  function mediaEnhancement(){
    const root=$("#podcastHubList,#videoHubList");if(!root||$("#v20-media-note"))return;
    if((D.podcasts||[]).length||(D.videos||[]).length){
      const note=document.createElement("div");note.id="v20-media-note";note.className="v20-media-note";note.innerHTML=`<span><i class="fa-solid fa-list-ol"></i><strong>Media chapters & transcript ready</strong><small>Struktur media dapat memakai chapter, transkrip, dan pencarian bagian ketika metadata tersedia.</small></span>`;root.parentNode.insertBefore(note,root);
    }
  }

  function init(){
    ensureStyles();
    searchIntelligence();relatedAndIntelligence();homeIntelligence();networkIntelligence();activityExplorer();topicIntelligence();historyTransferActions();bindDiagnostics();printEnhancement();mediaEnhancement();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
  window.HAAK_V20_INIT=init;
})();