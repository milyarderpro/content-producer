# Temuan task 9 — inventaris runtime database

Tanggal 13 November 2026; kandidat HEAD c02c541… + working tree, sebelum PR/G4.
Ini rekonsiliasi bukti dan target verifikasi dalam scope CR-062; kontrak domain,
schema, migration, source MCP, izin owner dan runtime plugin tidak berubah.

## COUNT-01 — collection statis melewatkan tabel dinamis

Vitest 5.0.3 memakai staticParse=true secara default pada list. Parser tidak
mengikuti import dan tidak dapat mengembangkan semua tabel it.each. Hasil list
statis sesudah tambahan task9 adalah201 (satu placeholder tabel baru); collection
runtime dengan --staticParse=false menghasilkan238 pada33file. Eksekusi matriks
membuktikan16 kasus terpisah; bukan satu placeholder.

Delta statis → runtime per file pada kandidat yang sama:

| File | Statis | Runtime |
| --- | ---: | ---: |
| api-trivia-v2-save.test.ts |35|55|
| trivia-candidate-retrieval.test.ts |5|6|
| api-trivia-v2-maintenance.test.ts |5|8|
| core-primitives-and-validators.test.ts |23|34|
| api-phase-five-acceptance.test.ts |3|4|
| api-trivia-public-gold.test.ts |1|2|

Dengan16 kasus baru, baseline runtime existing ialah222. Target rilis kini238,
partisi158+80 kasus pada15+18file. Manifest, matcher aggregate dan regresi count
harus sama; jumlah kurang/lebih tetap fail-closed. Bukti task7 collection200
serta laporan historis tidak ditulis ulang menjadi eksekusi238. Tidak ada test
atau assertion keamanan yang dihapus. Collection238 bukan full suite PASS;
formal Actions exact-SHA tetap task10 dalam scope izin rilis masing-masing.

Dokumentasi versi dipin: [Vitest5.0.3 static parser](https://github.com/vitest-dev/vitest/blob/v5.0.3/docs/api/advanced/vitest.md),
[CLI list](https://vitest.dev/guide/cli#list), serta bantuan CLI lokal. Lookup
find-docs/Context7 dipakai tanpa menaikkan dependency project.

## Percobaan preview sebelum perubahan scope — bukan gate

Storage Daily Facts awal memakai kalimat utility yang sama dengan DYK. Revisi
menambah alasan yang didukung sumber dan transisi natural. CTA DYK11 awal
membungkus hati ke baris sendiri; dipadatkan tanpa menghapus like/tag/save/follow
atau memindahkannya dari sebelum fakta terakhir. Kedua perubahan adalah corpus
uji/preview, bukan perubahan source backend/plugin atau perbaikan LIVE.
Kasus diperiksa ulang melalui save/revise/readback pada corpus final; hasil ada
pada laporan task9. Tidak menurunkan font16px, menghapus qualifier atau mengubah
expected test untuk meloloskan naskah yang tidak sah.

Pemilik kemudian mengeluarkan review naskah/layout ponsel dari scope. Bagian
di atas hanya riwayat percobaan, tidak menjadi syarat atau verdict editorial.
[Addendum scope](../../decisions/2026-11-13-cr-062-task-9-technical-acceptance.md)
menjadi acuan penerimaan teknis yang aktif.

## RUN-01 — timeout Page pada run dengan beban lokal bersamaan

Kelompok B awal:93PASS/2FAIL (timeout5000ms) pada95kasus/9file. Dua kasus
Page tercatat5800ms dan5229ms. File Page diulang serial setelah proses berat
lain selesai:13/13PASS,34.99detik, tanpa perubahan timeout/assertion/source.
Bukti awal FAIL dipertahankan; ini bukan perbaikan backend atau LIVE FIXED.
