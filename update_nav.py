from pathlib import Path
import re
root=Path('/mnt/data/haak-v11')
nav_html='''<div class="haak-nav-group">
  <a data-nav class="haak-nav-group-link" href="berita.html">Berita</a>
  <button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-haspopup="true" aria-controls="nav-menu-explore">
    <span>Eksplorasi</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
  </button>
  <div class="nav-dropdown-menu" id="nav-menu-explore" role="menu">
    <a data-nav href="kategori.html" role="menuitem"><i class="fa-solid fa-layer-group" aria-hidden="true"></i><span>Kategori</span></a>
    <a data-nav href="tema.html" role="menuitem"><i class="fa-solid fa-compass" aria-hidden="true"></i><span>Tema &amp; Isu</span></a>
  </div>
</div>'''
# Actually group should have Berita as child too; make clean config below.
config='''<div class="nav-dropdown">
  <button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-haspopup="true">
    <span>Eksplorasi</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
  </button>
  <div class="nav-dropdown-menu" role="menu">
    <a data-nav href="berita.html" role="menuitem"><i class="fa-regular fa-newspaper" aria-hidden="true"></i><span>Berita</span></a>
    <a data-nav href="kategori.html" role="menuitem"><i class="fa-solid fa-layer-group" aria-hidden="true"></i><span>Kategori</span></a>
    <a data-nav href="tema.html" role="menuitem"><i class="fa-solid fa-compass" aria-hidden="true"></i><span>Tema &amp; Isu</span></a>
  </div>
</div>
<div class="nav-dropdown">
  <button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-haspopup="true">
    <span>Aktivitas</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
  </button>
  <div class="nav-dropdown-menu" role="menu">
    <a data-nav href="kegiatan.html" role="menuitem"><i class="fa-regular fa-calendar-days" aria-hidden="true"></i><span>Kegiatan</span></a>
    <a data-nav href="dialog.html" role="menuitem"><i class="fa-solid fa-comments" aria-hidden="true"></i><span>Dialog</span></a>
    <a data-nav href="refleksi.html" role="menuitem"><i class="fa-regular fa-lightbulb" aria-hidden="true"></i><span>Harmoni</span></a>
  </div>
</div>
<div class="nav-dropdown">
  <button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-haspopup="true">
    <span>Media</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
  </button>
  <div class="nav-dropdown-menu" role="menu">
    <a data-nav href="dokumentasi.html" role="menuitem"><i class="fa-regular fa-images" aria-hidden="true"></i><span>Dokumentasi</span></a>
    <a data-nav href="video.html" role="menuitem"><i class="fa-brands fa-youtube" aria-hidden="true"></i><span>Video</span></a>
    <a data-nav href="podcast.html" role="menuitem"><i class="fa-solid fa-podcast" aria-hidden="true"></i><span>Podcast</span></a>
  </div>
</div>'''
extra='''<div class="nav-dropdown">
  <button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-haspopup="true">
    <span>Tentang</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
  </button>
  <div class="nav-dropdown-menu" role="menu">
    <a data-nav href="tentang.html" role="menuitem"><i class="fa-regular fa-circle-question" aria-hidden="true"></i><span>Tentang HAAK</span></a>
    <a data-nav href="kontak.html" role="menuitem"><i class="fa-regular fa-envelope" aria-hidden="true"></i><span>Kontak</span></a>
  </div>
</div>'''
desktop=f'''<a data-nav href="index.html">Beranda</a>{config}<a data-nav href="direktori.html">Jejaring</a>{extra}'''
mobile=f'''<a data-nav href="index.html">Beranda</a>{config}<a data-nav href="direktori.html">Jejaring</a>{extra}'''
for p in root.glob('*.html'):
    s=p.read_text(errors='ignore')
    # Replace desktop nav regardless of formatting, bounded by nav.main-nav
    s2=re.sub(r'<nav[^>]*class="main-nav"[^>]*>.*?</nav>', lambda m: '<nav class="main-nav" aria-label="Navigasi utama">'+desktop+'</nav>', s, count=1, flags=re.S)
    # Replace mobile nav with consistent container. Preserve nav attributes.
    s2=re.sub(r'<nav[^>]*class="mobile-nav"[^>]*>.*?</nav>', lambda m: '<nav class="mobile-nav" id="mobileNav" aria-label="Navigasi seluler"><div class="container">'+mobile+'</div></nav>', s2, count=1, flags=re.S)
    p.write_text(s2)
