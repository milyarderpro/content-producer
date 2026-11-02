# Lifecycle trivia v2 — P5

Dasar: CR-053/054, TDW-13..16, TFL-11, dan kontrak P1/P4. Bukti di sini
adalah source serta fixture database lokal; bukan deployment, riset URL, atau LIVE.

## Gate kualitas

`lifecycle_current_system_v2` menghitung ulang renderer dan metrik, lalu memeriksa
Page aktif, niche/config, format/topik/interaction goal, profile/locale, jumlah,
posisi, wording binding, canonical identity/status, URL snapshot dan reuse terkini.
Hash dihitung ulang dari isi, generation snapshot, dan binding saat ini.
URL hanya diperiksa bentuknya; backend tidak membuka atau memverifikasi isi URL.
Expiry/tier/evidence v1 tidak menjadi gate post v2, termasuk saat memakai ID legacy.

Tiga editorial P4 harus `pass` pada revision/hash yang sedang ditinjau.
Pemeriksaan mekanis tidak menggantikan penilaian makna oleh ChatGPT. Hasil system
lama tidak mengalahkan kegagalan mekanis sekarang. Saran gaya nonblocking dapat
disampaikan terpisah; tidak ditambahkan sebagai kriteria editorial keempat atau
warning yang harus di-waive. `accepted_warning_ids` v2 harus kosong dan alasan
warning null. Delapan belas kriteria dan waiver v1 tetap berlaku hanya pada v1.

Readback `get_post(include_sources=true, include_checks=true)` menampilkan sumber
snapshot binding serta system/editorial schema 2. Waktu simpan bukan tanggal
verifikasi sumber. Perubahan canonical URL tidak otomatis mengubah URL draft;
perubahan lokal draft memakai `revise_post_v2` dan menghasilkan binding baru.

## Approval, publikasi, dan pengelolaan

Nama/input tool bersama tetap `approve_post` dan `mark_post_posted`, request
schema 1; versi konten persisten memilih gate v1 atau v2. Approval memerlukan
`explicit_approval=true` serta revision/hash yang ditinjau. Setujui menaikkan
revision, menghitung system checks terkini, dan mengikat ulang editorial/approval
tanpa mengubah isi/hash. Replay identik mengembalikan hasil semula, bukan state
terbaru. Respons bersama tetap envelope 1; `recomputed_checks` untuk konten v2
mempunyai schema 2. Adapter/projection MCP versi campuran dilengkapi di P6.

`revoke_post_approval` mencabut persetujuan. `reschedule_post` mempertahankan isi,
hash, dan maksud approval serta mengikat evidence ke revision penerus, termasuk
post ready v2. Revisi substansi tetap melalui revise dan kembali menjadi draft.

Publikasi memerlukan konfirmasi peristiwa manual nyata, state ready, CAS tepat,
approval sah dan gate terkini; ia mengubah binding menjadi published. Tidak ada
request Canva/Facebook atau pengarang URL/ID publikasi. `archive_post` menambah
revision arsip tetapi mempertahankan system/editorial/approval dan snapshot
binding pada revision publikasi. Metrik tetap observasi append-only; mencatatnya
tidak mengubah revision/hash/approval, dan nilai tak diketahui tetap null.

## Reverify dan correction canonical

Kontrak request/response versi 2 dibekukan dalam
[CR-056](../decisions/2026-11-02-cr-056-versioned-trivia-maintenance.md).
Gunakan `fact_updated_at` dari match Read v2 sebagai teks enam digit untuk CAS;
timestamp sumber/snapshot post tidak menggantikannya. Overload RPC versi 1
tetap tersedia. Versi 2 tidak menambahkan ontologi, tier atau expiry v1.

- Reverify memperbarui URL canonical untuk kalimat dengan normalisasi sama,
  mempertahankan identitas/status dan memperbarui timestamp CAS. Timestamp ini
  waktu maintenance, bukan bukti server telah meneliti URL. Mengubah proposisi
  memerlukan correction. Reverify v2 tidak memperpanjang evidence v1 legacy.
- Correction memerlukan alasan dan izin eksplisit owner tersendiri. Invalidate
  tidak memerlukan successor atau katalog; supersede memerlukan satu successor
  dengan dedup lengkap dan versi katalog A dari Read terbaru. Kandidat existing
  ditolak konflik tanpa ID paralel. Predecessor/successor memiliki lineage/reason.
- Correction membatalkan approval serta editorial pada seluruh post mutable
  yang memakai fakta dan menandai kualitas gagal. Baris usage tetap ada;
  perbaikan memakai revise atau discard eksplisit. Discard draft terkoreksi tetap
  melepaskan alokasi tanpa menghapus failed evidence atau membuka replacement.
- Canonical URL berbeda dari URL lokal draft. Reverify tidak mengubah binding;
  revise mengubah URL lokal melalui binding penerus. Published/archived v1/v2
  mempertahankan copy, URL, sumber, approval dan usage historis setelah kedua
  jenis maintenance. Katalog disegarkan oleh perubahan status/lineage/URL canonical.

Workspace lock menyerialisasi maintenance, approval dan publikasi; correction
menjaga urutan Page/config→post→fact. Saat correction menang lebih dulu,
CAS approval/publish lama ditolak. Saat approval menang, correction mengembalikan
post ke draft; saat publikasi menang, correction mencatat status canonical dan
mempertahankan snapshot publikasi. Konflik CAS memerlukan Read/review baru;
respons hilang hanya direplay dengan key/payload semantik identik.
