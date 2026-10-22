PORTAL BERITA HAAK KEUSKUPAN MALANG — v21.2 Developed

Pengembangan v21.2 berfokus pada peningkatan fitur yang sudah ada, bukan penambahan halaman baru.

FITUR YANG DIKEMBANGKAN
- Universal Semantic Search: ranking lokal berbasis metadata + isi.
- Personal Knowledge Graph: relasi konten diperkuat melalui rekomendasi, kategori, tag, dan konteks artikel.
- Smart Bookmark + Notes: bookmark dan catatan lokal.
- Article Story Mode: pembacaan fokus dalam modal.
- HAAK Agent: context-aware local assistant berbasis dataset.
- Content Trust Center: panel status dan metadata kepercayaan konten.
- Accessibility Center: font scale, reading width, reduced motion, contrast, focus reading, TTS.
- HAAK Journey / Personal Discovery: statistik eksplorasi dan rekomendasi lokal.
- Breaking News Intelligence: dipertahankan melalui layer v20 dan konteks homepage/detail.
- Podcast / Audio Article: speech synthesis untuk artikel yang sudah ada.
- Related Story Engine: rekomendasi artikel berbasis kedekatan konten.
- Topic Hub + Smart Tag Explorer: eksplorasi kategori/tag tanpa halaman baru.
- Content Quality Checker + Duplicate Detector + Data Integrity Scanner.
- Smart Backup Center: backup/restore data lokal dengan validasi aplikasi/schema.
- Guided Discovery dan HAAK Learning Path: menyusun konten existing menjadi jalur eksplorasi.
- Smart Homepage Personalization + Continue Reading.
- Smart Navigation History: dipertahankan dan diperkaya dengan konteks lokal.
- Image Lightbox Pro.
- Deep-Link State untuk pencarian melalui query URL.
- Print-Friendly Article + Article Export Markdown.
- Developer Diagnostics Center.
- Schema Migration System.
- Automatic Error Recovery / defensive initialization.
- Safe Mode.
- Device Capability Adaptation.
- Smart Notification Center.
- Event Countdown untuk kegiatan yang memiliki tanggal.

UI/UX
- Semua kontrol tambahan dikelompokkan dalam tombol "Tools" di area navbar/header.
- Accessibility tidak membuat halaman baru; diakses melalui Tools.
- Fitur artikel ditempatkan sebagai article action bar yang responsif.
- Modal, section, card, chip, diagnostics dan panel menggunakan sistem visual v21.2 yang konsisten.
- Mobile menggunakan horizontal action bar dan modal responsif.

ARSITEKTUR
- Tidak menggunakan framework baru.
- Frontend-only.
- Enhancement layer terpisah: js/v21-enhancement.js dan css/v21-enhancement.css.
- Dataset existing tetap menjadi sumber konten.
- Tidak mengganti fitur lama; layer baru bekerja secara progressive enhancement.


v21.2.1 HOTFIX — Developer Diagnostics Center
- Dedicated stethoscope icon is rendered directly in the mobile/desktop header action area.
- Developer Diagnostics Center is protected by an Admin login modal.
- Credentials are not stored as plaintext in the source; verification uses PBKDF2-SHA-256 with a fixed salt and 120,000 iterations.
- Admin session lasts only for the current browser tab/session and includes a Keluar Admin action.
- Direct calls to diagnostics() are also protected by the same Admin session check.
- Important: because this is a frontend-only application, this is an access gate/obfuscation layer, not server-grade authentication. Anyone with source access can ultimately inspect the verifier.
