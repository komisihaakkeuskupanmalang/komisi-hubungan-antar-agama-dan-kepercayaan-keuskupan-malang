/* HAAK Portal v21.2 — Feature Development Layer
 * Mengembangkan fitur yang sudah ada. Tidak menambah halaman baru.
 * Local-first, defensive, progressive enhancement.
 */
(() => {
"use strict";
const D=window.HAAK_DATA||{};
const A=Array.isArray(D.articles)?D.articles:[];
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const strip=s=>String(s||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
const get=id=>A.find(x=>Number(x.id)===Number(id));
const toast=m=>{const t=$("#haakToast");if(t){t.textContent=m;t.classList.add("show");clearTimeout(window.__v212t);window.__v212t=setTimeout(()=>t.classList.remove("show"),2600)}};
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const now=()=>new Date().toISOString();
const currentId=()=>new URLSearchParams(location.search).get("id")||new URL(location.href).searchParams.get("article");
const current=get(currentId());
const textOf=a=>[a.title,a.excerpt,a.category,a.author,...(a.tags||[]),strip(a.content)].join(" ");
const tokens=s=>new Set(norm(s).split(/[^a-z0-9]+/).filter(x=>x.length>2));
const score=(q,a)=>{const qn=norm(q), t=norm(textOf(a)); let n=0; if(!qn)return 0; qn.split(/\s+/).filter(x=>x.length>2).forEach(w=>{if(t.includes(w))n+=2}); const qt=tokens(q); for(const w of qt) if(t.includes(w))n++; if(norm(a.category).includes(qn))n+=5; return n};
function search(q){return A.map(a=>({a,s:score(q,a)})).filter(x=>x.s>0).sort((x,y)=>y.s-x.s).slice(0,12).map(x=>x.a)}
function href(a){return `detail-berita.html?id=${encodeURIComponent(a.id)}`}
function articleCard(a){return `<a class="v212-result" href="${href(a)}"><div class="v212-result-img">${a.image?`<img src="${esc(a.image)}" alt="">`:`<span><i class="fa-regular fa-newspaper"></i></span>`}</div><div><small>${esc(a.category||"Berita")} • ${esc(a.date||"")}</small><strong>${esc(a.title)}</strong><p>${esc(a.excerpt||strip(a.content).slice(0,150))}</p></div></a>`}
function modal(id,title,body,wide=false){let m=document.getElementById(id);if(!m){m=document.createElement("div");m.id=id;m.className="v212-modal";m.innerHTML=`<div class="v212-backdrop" data-close></div><section class="v212-dialog ${wide?"is-wide":""}" role="dialog" aria-modal="true" aria-labelledby="${id}Title"><header><div><span class="v212-kicker">Portal HAAK</span><h2 id="${id}Title"></h2></div><button class="v212-close" data-close aria-label="Tutup"><i class="fa-solid fa-xmark"></i></button></header><div class="v212-body"></div></section>`;document.body.appendChild(m);m.addEventListener("click",e=>{if(e.target.closest("[data-close]"))m.classList.remove("open")})} $(".v212-dialog h2",m).textContent=title;$(".v212-body",m).innerHTML=body;m.classList.add("open");return m}
function addToolButton(){
 const nav=$(".header-actions")||$(".header-inner")||$("header .container"); if(!nav||$("#v212Tools"))return;
 const btn=document.createElement("button");
 btn.type="button";
 btn.className="v212-dev-trigger";
 btn.id="v212Tools";
 btn.setAttribute("aria-label","Developer Diagnostics Center");
 btn.setAttribute("title","Developer Diagnostics Center • Admin");
 btn.innerHTML='<i class="fa-solid fa-stethoscope" aria-hidden="true"></i><span>Developer Diagnostics Center</span>';
 nav.appendChild(btn);
 btn.addEventListener("click",()=>adminLogin());
}

const ADMIN_HASH="0ef09555078159c5afec02e3372e890d81b82dd0850111b0b4043809043c2775";
const ADMIN_SALT="HAAK-V212-ADMIN-2026";
const adminSession=()=>sessionStorage.getItem("haak-v212-admin")=="1";
async function hashCredentials(username,password){
 if(!window.crypto?.subtle||!window.TextEncoder)return null;
 const raw=new TextEncoder().encode(`${username}:${password}`);
 const salt=new TextEncoder().encode(ADMIN_SALT);
 const key=await crypto.subtle.importKey("raw",raw,{name:"PBKDF2"},false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:120000,hash:"SHA-256"},key,256);
 return [...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function adminLogin(){
 if(adminSession()){diagnostics();return;}
 const m=modal("v212AdminLogin","Developer Diagnostics Center",`<div class="v212-admin-login">
 <div class="v212-admin-badge"><i class="fa-solid fa-shield-halved"></i></div>
 <h3>Akses Administrator</h3><p>Area ini hanya untuk Admin Portal HAAK. Kredensial diverifikasi secara lokal tanpa menyimpan password teks biasa.</p>
 <form id="v212AdminForm" autocomplete="off">
 <label>Username<input id="v212AdminUser" name="username" type="text" autocomplete="username" required></label>
 <label>Password<div class="v212-password-wrap"><input id="v212AdminPass" name="password" type="password" autocomplete="current-password" required><button type="button" id="v212PassToggle" aria-label="Tampilkan password"><i class="fa-solid fa-eye"></i></button></div></label>
 <div id="v212AdminError" class="v212-admin-error" role="alert" hidden>Username atau password tidak valid.</div>
 <button class="v212-admin-submit" type="submit"><i class="fa-solid fa-lock-open"></i> Masuk sebagai Admin</button>
 </form></div>`);
 const form=$("#v212AdminForm",m), user=$("#v212AdminUser",m), pass=$("#v212AdminPass",m), err=$("#v212AdminError",m);
 $("#v212PassToggle",m)?.addEventListener("click",()=>{const hidden=pass.type==="password";pass.type=hidden?"text":"password";$("#v212PassToggle i",m).className=hidden?"fa-solid fa-eye-slash":"fa-solid fa-eye"});
 form?.addEventListener("submit",async e=>{
  e.preventDefault(); err.hidden=true;
  const hash=await hashCredentials(user.value.trim(),pass.value);
  if(hash===ADMIN_HASH){sessionStorage.setItem("haak-v212-admin","1");m.classList.remove("open");toast("Akses Admin berhasil diverifikasi.");diagnostics();}
  else{err.hidden=false;pass.value="";pass.focus();}
 });
 setTimeout(()=>user?.focus(),80);
}
function tool(type){
 if(type==="search") universalSearch();
 if(type==="agent") agent();
 if(type==="access") accessibility();
 if(type==="journey") journey();
 if(type==="explore") explore();
 if(type==="learning") learning();
 if(type==="bookmark") bookmarkCenter();
 if(type==="notify") notificationCenter();
 if(type==="backup") diagnostics();
}
function universalSearch(){
 const m=modal("v212Search","Universal Semantic Search",`<div class="v212-searchbar"><i class="fa-solid fa-magnifying-glass"></i><input id="v212SearchInput" placeholder="Cari berita, tema, tokoh, kegiatan, tag..." autofocus><button id="v212SearchGo">Cari</button></div><div class="v212-search-meta" id="v212SearchMeta">Pencarian memahami judul, isi, kategori, penulis, dan tag.</div><div class="v212-results" id="v212Results">${A.slice(0,6).map(articleCard).join("")}</div>`,true);
 const inp=$("#v212SearchInput",m), out=$("#v212Results",m), meta=$("#v212SearchMeta",m);
 const run=()=>{const q=inp.value.trim();const r=search(q);out.innerHTML=q?(r.length?r.map(articleCard).join(""):`<div class="v212-empty">Tidak menemukan konten yang relevan.</div>`):A.slice(0,6).map(articleCard).join("");meta.textContent=q?`${r.length} hasil relevan • ranking lokal berdasarkan semantik dan metadata.`:"Pencarian memahami judul, isi, kategori, penulis, dan tag.";};
 inp.oninput=run;$("#v212SearchGo",m).onclick=run;
}
function agent(){
 const m=modal("v212Agent","HAAK Agent • Intelligence",`<div class="v212-agent-intro"><span class="v212-agent-orb"><i class="fa-solid fa-wand-magic-sparkles"></i></span><div><strong>HAAK Agent</strong><p>Agent lokal yang memanfaatkan dataset portal, konteks halaman, intent, dan riwayat untuk membantu eksplorasi.</p></div></div><div class="v212-chat" id="v212Chat"></div><form class="v212-agent-form" id="v212AgentForm"><input id="v212AgentInput" placeholder="Tanyakan sesuatu tentang portal..." autocomplete="off"><button><i class="fa-solid fa-arrow-up"></i></button></form>`,true);
 const chat=$("#v212Chat",m), input=$("#v212AgentInput",m), form=$("#v212AgentForm",m);
 const history=read("haak-v212-agent",[]);
 const add=(role,msg)=>{history.push({role,msg,time:now()});write("haak-v212-agent",history.slice(-30));chat.insertAdjacentHTML("beforeend",`<div class="v212-msg ${role}">${esc(msg).replace(/\n/g,"<br>")}</div>`);chat.scrollTop=chat.scrollHeight};
 history.slice(-8).forEach(x=>add(x.role,x.msg));
 if(!history.length)add("agent","Saya siap membantu mencari berita, topik, tag, relasi artikel, membaca konteks halaman, dan memberi rekomendasi berdasarkan data lokal.");
 const answer=q=>{
  const n=norm(q), r=search(q), topic=A.find(a=>n.includes(norm(a.category||"").toLowerCase()));
  if(/cari|temukan|berita|artikel/.test(n)) return r.length?`Saya menemukan ${r.length} konten yang paling relevan:\n• ${r.slice(0,5).map(x=>x.title).join("\n• ")}`:"Belum ada konten yang cocok. Coba gunakan nama topik, kategori, atau kata kunci lain.";
  if(/berapa|jumlah|total/.test(n))return `Dataset lokal saat ini memuat ${A.length} artikel.`;
  if(/terbaru|latest|baru/.test(n)){const x=[...A].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);return `Konten terbaru:\n• ${x.map(a=>`${a.title} (${a.date})`).join("\n• ")}`;}
  if(current && /ini|artikel|berita|baca/.test(n))return `Konteks artikel saat ini: “${current.title}”. Kategori: ${current.category||"—"}. Saya dapat menghubungkannya dengan konten serupa atau tag terkait.`;
  if(topic)return `Saya mendeteksi fokus kategori ${topic.category}. Ada ${A.filter(a=>a.category===topic.category).length} artikel pada kategori tersebut.`;
  return r.length?`Kemungkinan maksud Anda berkaitan dengan “${r[0].title}”. Saya menemukan ${r.length} kandidat relevan.`:"Saya memahami pertanyaan Anda, tetapi data lokal portal belum memiliki cukup konteks untuk menjawabnya.";
 };
 form.onsubmit=e=>{e.preventDefault();const q=input.value.trim();if(!q)return;add("user",q);input.value="";setTimeout(()=>add("agent",answer(q)),220)};
}
function accessibility(){
 const m=modal("v212Access","Accessibility Center",`<div class="v212-access-grid">
 <label>Ukuran teks<input id="v212Font" type="range" min="90" max="125" value="${read("haak-v212-font",100)}"><output></output></label>
 <label>Lebar baca<input id="v212Width" type="range" min="85" max="115" value="${read("haak-v212-width",100)}"><output></output></label>
 <button data-a="motion"><i class="fa-solid fa-person-walking"></i><span>Kurangi animasi</span><b></b></button>
 <button data-a="contrast"><i class="fa-solid fa-circle-half-stroke"></i><span>Kontras tinggi</span><b></b></button>
 <button data-a="focus"><i class="fa-solid fa-book-open"></i><span>Focus reading</span><b></b></button>
 <button data-a="tts"><i class="fa-solid fa-volume-high"></i><span>Bantuan audio teks</span><b></b></button>
 </div><p class="v212-note">Pengaturan tersimpan lokal pada perangkat ini.</p>`);
 const root=document.documentElement;
 const font=$("#v212Font",m), width=$("#v212Width",m);
 const apply=()=>{root.style.setProperty("--v212-font-scale",font.value/100);root.style.setProperty("--v212-content-scale",width.value/100);write("haak-v212-font",+font.value);write("haak-v212-width",+width.value);$("output",font.parentElement).textContent=font.value+"%";$("output",width.parentElement).textContent=width.value+"%"};
 font.oninput=width.oninput=apply;apply();
 $$("[data-a]",m).forEach(b=>b.onclick=()=>{const k="haak-v212-"+b.dataset.a,v=!read(k,false);write(k,v);document.body.classList.toggle("v212-"+b.dataset.a,v);b.classList.toggle("active",v);if(b.dataset.a==="tts")window.speechSynthesis?.cancel();});
}
function journey(){
 const seen=read("haak-v212-seen",[]), bookmarks=read("haak-v212-bookmarks",[]), tags=[...new Set(seen.flatMap(id=>(get(id)?.tags)||[]))];
 const m=modal("v212Journey","HAAK Journey • Personal Discovery",`<div class="v212-journey-hero"><div><span class="v212-kicker">Perjalanan Anda</span><h3>${seen.length} artikel dijelajahi</h3><p>Portal menggunakan aktivitas lokal untuk membantu menemukan konten berikutnya.</p></div><div class="v212-ring"><strong>${Math.min(100,seen.length*10)}%</strong><span>explored</span></div></div><div class="v212-stat-grid"><div><b>${seen.length}</b><span>Dibaca</span></div><div><b>${bookmarks.length}</b><span>Disimpan</span></div><div><b>${tags.length}</b><span>Topik/Tag</span></div><div><b>${new Set(seen.map(id=>get(id)?.category)).size}</b><span>Kategori</span></div></div><h4>Rekomendasi berikutnya</h4><div class="v212-results">${recommend(seen).map(articleCard).join("")||`<div class="v212-empty">Mulai membaca beberapa artikel untuk membangun discovery profile.</div>`}</div>`,true);
}
function recommend(seen){const viewed=new Set(seen.map(Number));const freq={};seen.forEach(id=>(get(id)?.tags||[]).forEach(t=>freq[t]=(freq[t]||0)+1));return A.filter(a=>!viewed.has(Number(a.id))).map(a=>({a,s:(a.tags||[]).reduce((n,t)=>n+(freq[t]||0),0)})).sort((a,b)=>b.s-a.s).slice(0,6).map(x=>x.a)}
function explore(){
 const cats=[...new Set(A.map(a=>a.category).filter(Boolean))].sort();
 const tags={};A.forEach(a=>(a.tags||[]).forEach(t=>tags[t]=(tags[t]||0)+1));
 const tagList=Object.entries(tags).sort((a,b)=>b[1]-a[1]).slice(0,40);
 const m=modal("v212Explore","Topic Hub • Smart Tag Explorer",`<div class="v212-explore-grid"><section><span class="v212-kicker">Topic Hub</span><h3>Jelajahi berdasarkan tema</h3><div class="v212-chip-list">${cats.map(c=>`<button data-topic="${esc(c)}">${esc(c)} <b>${A.filter(a=>a.category===c).length}</b></button>`).join("")}</div></section><section><span class="v212-kicker">Smart Tag Explorer</span><h3>Tag yang paling sering digunakan</h3><div class="v212-chip-list">${tagList.map(([t,n])=>`<button data-tag="${esc(t)}">#${esc(t)} <b>${n}</b></button>`).join("")||`<div class="v212-empty">Belum ada tag.</div>`}</div></section></div><div id="v212ExploreResults" class="v212-results"></div>`,true);
 const out=$("#v212ExploreResults",m);
 const show=q=>{const r=search(q);out.innerHTML=`<div class="v212-search-meta">${r.length} konten ditemukan untuk “${esc(q)}”.</div>${r.map(articleCard).join("")||`<div class="v212-empty">Tidak ada konten.</div>`}`};
 $$("[data-topic]",m).forEach(b=>b.onclick=()=>show(b.dataset.topic));
 $$("[data-tag]",m).forEach(b=>b.onclick=()=>{const r=A.filter(a=>(a.tags||[]).some(t=>norm(t)===norm(b.dataset.tag)));out.innerHTML=`<div class="v212-search-meta">${r.length} konten bertag #${esc(b.dataset.tag)}.</div>${r.map(articleCard).join("")}`});
}
function learning(){
 const groups=[["Mulai Mengenal HAAK",["HAAK","Komisi","Keuskupan"]],["Memahami Kerukunan",["kerukunan","toleransi","moderasi"]],["Mendalami Dialog",["dialog","lintas","agama"]],["Menjadi Pelaku",["kegiatan","aksi","sosial"]]];
 const steps=groups.map(([name,words],i)=>{const items=A.filter(a=>words.some(w=>norm(textOf(a)).includes(norm(w)))).slice(0,3);return `<article class="v212-learning-step"><span>0${i+1}</span><div><strong>${esc(name)}</strong><p>${items.length?items.map(a=>`<a href="${href(a)}">${esc(a.title)}</a>`).join(""):"Belum ada konten yang cukup relevan."}</p></div></article>`}).join("");
 modal("v212Learning","HAAK Learning Path",`<p>Jalur belajar ini menyusun konten yang sudah ada menjadi perjalanan bertahap, tanpa membuat dataset baru.</p><div class="v212-learning-list">${steps}</div>`,true);
}
function bookmarkCenter(){
 const b=read("haak-v212-bookmarks",[]); const notes=read("haak-v212-notes",{});
 const m=modal("v212Bookmark","Smart Bookmark + Notes",`<div class="v212-bookmark-list">${b.length?b.map(id=>{const a=get(id);return a?`<article><div>${articleCard(a)}</div><textarea data-note="${a.id}" placeholder="Catatan pribadi...">${esc(notes[a.id]||"")}</textarea><button data-save-note="${a.id}">Simpan catatan</button></article>`:""}).join(""):`<div class="v212-empty">Belum ada artikel tersimpan. Gunakan tombol bookmark pada detail artikel.</div>`}</div>`,true);
 $$("[data-save-note]",m).forEach(x=>x.onclick=()=>{const id=x.dataset.saveNote;notes[id]=$(`[data-note="${id}"]`,m).value;write("haak-v212-notes",notes);toast("Catatan disimpan lokal.")});
}
function notificationCenter(){
 const items=read("haak-v212-notifications",[]);
 const latest=[...A].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8);
 modal("v212Notify","Smart Notification Center",`<div class="v212-notify-head"><div><strong>${items.length?items.length:0} aktivitas lokal</strong><p>Notifikasi ringan berdasarkan konten yang tersedia di portal.</p></div><button id="v212NotifyTest">Aktifkan Notifikasi</button></div><div class="v212-notify-list">${latest.map(a=>`<a href="${href(a)}"><i class="fa-regular fa-newspaper"></i><div><strong>${esc(a.title)}</strong><span>${esc(a.date||"")} • ${esc(a.category||"Berita")}</span></div></a>`).join("")}</div>`);
 $("#v212NotifyTest").onclick=async()=>{if(!("Notification"in window)){toast("Browser tidak mendukung notifikasi.");return}const p=await Notification.requestPermission();toast(p==="granted"?"Notifikasi diizinkan.":"Izin notifikasi belum diberikan.")};
}
function diagnostics(){
 if(!adminSession()){adminLogin();return;}
 const safe=read("haak-v212-safe",false);
 const integrity=scanIntegrity(), dup=duplicates(), quality=qualityScan();
 const m=modal("v212Diag","Developer Diagnostics Center",`<div class="v212-health"><div class="v212-health-score"><strong>${integrity.score}</strong><span>Health Score</span></div><div><b>${safe?"Safe Mode aktif":"Normal Mode"}</b><p>${navigator.onLine?"Online":"Offline"} • ${deviceClass()} • SW: ${"serviceWorker"in navigator?"tersedia":"tidak tersedia"}</p></div></div><div class="v212-check-grid"><div><b>Data Integrity</b><span>${integrity.errors} error • ${integrity.warnings} warning</span></div><div><b>Quality Checker</b><span>${quality.length} item perlu perhatian</span></div><div><b>Duplicate Detector</b><span>${dup.length} kandidat duplikat</span></div><div><b>Schema</b><span>v21 → v21.2 migration ready</span></div></div><div class="v212-actions"><button id="v212Backup"><i class="fa-solid fa-download"></i>Backup JSON</button><button id="v212Restore"><i class="fa-solid fa-upload"></i>Restore JSON</button><button id="v212Safe"><i class="fa-solid fa-shield"></i>${safe?"Matikan":"Aktifkan"} Safe Mode</button><button id="v212Migrate"><i class="fa-solid fa-code-branch"></i>Jalankan Migration</button><button id="v212Logout"><i class="fa-solid fa-right-from-bracket"></i>Keluar Admin</button></div><details><summary>Detail pemeriksaan</summary><pre>${esc(JSON.stringify({integrity,duplicates:dup,quality,capability:deviceClass()},null,2))}</pre></details>`,true);
 $("#v212Backup").onclick=backup;
 $("#v212Restore").onclick=restore;
 $("#v212Safe").onclick=()=>{write("haak-v212-safe",!safe);location.reload()};
 $("#v212Migrate").onclick=()=>{write("haak-v212-schema",{version:3,migratedAt:now()});toast("Schema migration selesai.");};
 $("#v212Logout").onclick=()=>{sessionStorage.removeItem("haak-v212-admin");$("#v212Diag")?.classList.remove("open");toast("Sesi Admin diakhiri.")};
}
function qualityScan(){return A.filter(a=>!a.title||!a.excerpt||!a.category||!a.date||!a.content||!a.image)}
function duplicates(){const out=[];for(let i=0;i<A.length;i++)for(let j=i+1;j<A.length;j++){const x=tokens(A[i].title),y=tokens(A[j].title);let n=0;x.forEach(w=>y.has(w)&&n++);if(n>=Math.max(2,Math.min(x.size,y.size)*.6))out.push([A[i].id,A[j].id])}return out.slice(0,30)}
function scanIntegrity(){let errors=0,warnings=0;const ids=new Set;A.forEach(a=>{if(ids.has(a.id))errors++;ids.add(a.id);if(!a.title||!a.date)warnings++;if(a.image&&typeof a.image!=="string")errors++});return{score:Math.max(0,100-errors*10-warnings*2),errors,warnings,records:A.length}}
function deviceClass(){const m=(navigator.hardwareConcurrency||4)+(navigator.deviceMemory||4);return m>=10?"High":m>=6?"Medium":"Lightweight"}
function backup(){const payload={app:"Portal HAAK",schema:3,createdAt:now(),local:{bookmarks:read("haak-v212-bookmarks",[]),notes:read("haak-v212-notes",{}),seen:read("haak-v212-seen",[]),journey:read("haak-v212-journey",{}),preferences:read("haak-v212-font",100)}};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=`haak-portal-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);toast("Backup JSON dibuat.")}
function restore(){const i=document.createElement("input");i.type="file";i.accept=".json,application/json";i.onchange=async()=>{try{const d=JSON.parse(await i.files[0].text());if(!d||d.app!=="Portal HAAK")throw Error();if(d.local){for(const [k,v] of Object.entries({bookmarks:d.local.bookmarks||[],notes:d.local.notes||{},seen:d.local.seen||[]}))write("haak-v212-"+k,v)}toast("Backup berhasil dipulihkan.");}catch{toast("Backup tidak valid atau rusak.")}};i.click()}
function articleEnhance(){
 if(!current)return;
 const seen=read("haak-v212-seen",[]).filter(x=>Number(x)!==Number(current.id));seen.unshift(Number(current.id));write("haak-v212-seen",seen.slice(0,80));
 const host=$("#articleDetail")||$(".article-detail")||$("main");if(!host)return;
 const tools=document.createElement("div");tools.className="v212-article-tools";tools.innerHTML=`<button data-x="bookmark"><i class="fa-regular fa-bookmark"></i><span>Bookmark</span></button><button data-x="story"><i class="fa-solid fa-book-open"></i><span>Story Mode</span></button><button data-x="audio"><i class="fa-solid fa-volume-high"></i><span>Audio</span></button><button data-x="trust"><i class="fa-solid fa-circle-check"></i><span>Trust</span></button><button data-x="export"><i class="fa-solid fa-file-export"></i><span>Export</span></button><button data-x="print"><i class="fa-solid fa-print"></i><span>Print</span></button>`;
 host.prepend(tools);
 const b=$('[data-x="bookmark"]',tools), list=read("haak-v212-bookmarks",[]); b.classList.toggle("active",list.includes(Number(current.id)));
 tools.addEventListener("click",e=>{const x=e.target.closest("[data-x]")?.dataset.x;if(!x)return;if(x==="bookmark"){const arr=read("haak-v212-bookmarks",[]);const id=Number(current.id),i=arr.indexOf(id);i>=0?arr.splice(i,1):arr.unshift(id);write("haak-v212-bookmarks",arr);b.classList.toggle("active",i<0);toast(i<0?"Artikel disimpan.":"Bookmark dihapus.")} if(x==="story")storyMode();if(x==="audio")audioArticle();if(x==="trust")trustCenter();if(x==="export")exportArticle();if(x==="print")printArticle()});
 related();
 countdown();
}
function storyMode(){const body=strip(current.content);modal("v212Story",`Story Mode • ${current.title}`,`<div class="v212-story"><span class="v212-kicker">${esc(current.category||"Artikel")} • ${esc(current.date||"")}</span><h3>${esc(current.title)}</h3><p class="lead">${esc(current.excerpt||"")}</p><div class="v212-story-content">${current.content||`<p>${esc(body)}</p>`}</div><footer><span><i class="fa-regular fa-clock"></i> Fokus membaca</span><button id="v212StorySpeak">Dengarkan</button></footer></div>`,true);$("#v212StorySpeak").onclick=()=>speak(`${current.title}. ${body}`)}
function audioArticle(){const text=`${current.title}. ${current.excerpt||""}. ${strip(current.content).slice(0,7000)}`;if(!("speechSynthesis"in window)){toast("Audio artikel tidak didukung browser.");return}speechSynthesis.cancel();speak(text);toast("Audio artikel diputar.");}
function speak(text){const u=new SpeechSynthesisUtterance(text);u.lang="id-ID";u.rate=.96;u.pitch=1;speechSynthesis.speak(u)}
function trustCenter(){const verified=Boolean(current.verified??current.isVerified??true);modal("v212Trust","Content Trust Center",`<div class="v212-trust ${verified?"ok":""}"><div class="v212-trust-icon"><i class="fa-solid ${verified?"fa-circle-check":"fa-circle-exclamation"}"></i></div><div><strong>${verified?"Terverifikasi":"Perlu pemeriksaan"}</strong><p>Status ditampilkan dari metadata konten yang tersedia pada dataset portal.</p></div></div><div class="v212-trust-grid"><div><span>Kategori</span><b>${esc(current.category||"—")}</b></div><div><span>Tanggal</span><b>${esc(current.date||"—")}</b></div><div><span>Penulis</span><b>${esc(current.author||"—")}</b></div><div><span>ID Konten</span><b>#${esc(current.id)}</b></div></div>`);
}
function related(){const host=document.createElement("section");host.className="v212-related-section";const r=A.filter(a=>a.id!==current.id).map(a=>({a,s:score(current.title,a)+((a.category===current.category)?5:0)})).sort((x,y)=>y.s-x.s).slice(0,4).map(x=>x.a);host.innerHTML=`<div class="v212-section-head"><div><span class="v212-kicker">Related Story Engine</span><h2>Terhubung dengan cerita ini</h2><p>Konten dengan tema, kategori, dan kata kunci yang paling berdekatan.</p></div></div><div class="v212-related-grid">${r.map(articleCard).join("")}</div>`;($("#articleDetail")||document.querySelector("main"))?.appendChild(host)}
function countdown(){const acts=Array.isArray(D.activities)?D.activities:[];const upcoming=acts.map(x=>({x,d:new Date(x.date||x.startDate||"") })).filter(x=>!isNaN(x.d)&&x.d>new Date()).sort((a,b)=>a.d-b.d)[0];if(!upcoming)return;const host=$("#articleDetail")||$("main"),el=document.createElement("div");el.className="v212-countdown";el.innerHTML=`<div><span class="v212-kicker">Event Countdown</span><strong>${esc(upcoming.x.title||upcoming.x.name||"Kegiatan HAAK")}</strong></div><div id="v212CountdownValue">—</div>`;host?.appendChild(el);const tick=()=>{const ms=upcoming.d-new Date();if(ms<=0){el.remove();return}const d=Math.floor(ms/864e5),h=Math.floor(ms/36e5)%24,m=Math.floor(ms/6e4)%60,s=Math.floor(ms/1e3)%60;$("#v212CountdownValue",el).textContent=`${d}h ${h}j ${m}m ${s}d`};tick();setInterval(tick,1000)}
function exportArticle(){const md=`# ${current.title}\n\n${current.date||""} • ${current.category||""}\n\n${current.excerpt||""}\n\n${strip(current.content)}`;const blob=new Blob([md],{type:"text/markdown"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=`haak-${norm(current.title).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"artikel"}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(u),500)}
function printArticle(){document.body.classList.add("v212-printing");window.print();setTimeout(()=>document.body.classList.remove("v212-printing"),1000)}
function deepLink(){const p=new URLSearchParams(location.search);if(p.get("q")){setTimeout(()=>{universalSearch();const i=$("#v212SearchInput");if(i){i.value=p.get("q");i.dispatchEvent(new Event("input"))}},350)}}
function globalLightbox(){
  if(window.__HAAK_V212_LIGHTBOX_BOUND)return;
  window.__HAAK_V212_LIGHTBOX_BOUND=true;
  document.addEventListener("click",e=>{
    const img=e.target.closest(".gallery-grid img, .article-documentation-item img");
    if(!img)return;
    const scope=img.closest(".gallery-grid, .article-documentation");
    if(!scope)return;

    // Dokumentasi marquee memang boleh mengulang thumbnail untuk kebutuhan visual,
    // tetapi pengulangan tersebut tidak boleh dianggap sebagai foto baru di lightbox.
    // Bangun daftar berdasarkan URL gambar yang unik agar counter selalu sesuai
    // dengan dokumentasi sebenarnya (mis. 3 foto tetap menjadi 1 / 3, bukan 1 / 12).
    const images=[];
    const seenSources=new Set();
    [...scope.querySelectorAll("img")].forEach(candidate=>{
      const src=candidate.currentSrc||candidate.src||"";
      if(!src || candidate.dataset.lightboxClone) return;
      if(seenSources.has(src)) return;
      seenSources.add(src);
      images.push(candidate);
    });

    const clickedSrc=img.currentSrc||img.src||"";
    let start=Math.max(0,images.findIndex(item=>(item.currentSrc||item.src||"")===clickedSrc));
    if(start<0){
      const fallback=Number(img.closest("[data-doc-index]")?.dataset.docIndex);
      start=Number.isFinite(fallback)?Math.min(Math.max(fallback,0),Math.max(images.length-1,0)):0;
    }
    if(!images.length)return;

    const m=modal("v212Lightbox","Image Lightbox Pro",`
      <div class="v212-lightbox-shell">
        <div class="v212-lightbox-stage">
          <button class="v212-lightbox-nav v212-lightbox-prev" type="button" data-lightbox-prev aria-label="Sebelumnya">
            <i class="fa-solid fa-chevron-left"></i><span>Sebelumnya</span>
          </button>
          <figure class="v212-lightbox">
            <img data-lightbox-image src="" alt="">
            <figcaption data-lightbox-caption></figcaption>
          </figure>
          <button class="v212-lightbox-nav v212-lightbox-next" type="button" data-lightbox-next aria-label="Selanjutnya">
            <span>Selanjutnya</span><i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <div class="v212-lightbox-footer">
          <span data-lightbox-counter></span>
          <button class="v212-lightbox-close-secondary" type="button" data-close>Tutup</button>
        </div>
      </div>`,true);

    let index=start;
    const lightboxImg=$("[data-lightbox-image]",m);
    const caption=$("[data-lightbox-caption]",m);
    const counter=$("[data-lightbox-counter]",m);
    const prev=$("[data-lightbox-prev]",m);
    const next=$("[data-lightbox-next]",m);

    const render=()=>{
      const target=images[index];
      if(!target)return;
      lightboxImg.src=target.currentSrc||target.src;
      lightboxImg.alt=target.alt||"Dokumentasi HAAK";
      caption.textContent=target.alt||"Dokumentasi HAAK";
      counter.textContent=`${index+1} / ${images.length}`;
      prev.disabled=index===0;
      next.disabled=index===images.length-1;
    };
    prev.onclick=()=>{if(index>0){index--;render()}};
    next.onclick=()=>{if(index<images.length-1){index++;render()}};
    render();

    const keyHandler=ev=>{
      if(!m.classList.contains("open"))return;
      if(ev.key==="ArrowLeft" && index>0){index--;render()}
      if(ev.key==="ArrowRight" && index<images.length-1){index++;render()}
    };
    document.addEventListener("keydown",keyHandler);
    const observer=new MutationObserver(()=>{if(!m.classList.contains("open")){document.removeEventListener("keydown",keyHandler);observer.disconnect()}});
    observer.observe(m,{attributes:true,attributeFilter:["class"]});
  });
}
function safeMode(){if(!read("haak-v212-safe",false))return;document.body.classList.add("v212-safe");const banner=document.createElement("div");banner.className="v212-safe-banner";banner.innerHTML=`<i class="fa-solid fa-shield"></i><span><strong>Safe Mode</strong> • efek non-esensial dinonaktifkan agar portal tetap stabil.</span>`;document.body.prepend(banner)}
function init(){safeMode();addToolButton();if(current)articleEnhance();globalLightbox();deepLink();document.documentElement.dataset.capability=deviceClass();window.HAAK_V212={search,recommend,diagnostics,backup,scanIntegrity,duplicates,qualityScan};}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();