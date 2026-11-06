# Source paket plugin PRIVATE

> Snapshot publik disanitasi: identifier QA/release dan tautan ChatGPT privat memakai alias. Isi naskah, skor, revision, content hash dan verdict dipertahankan. Hash fixture yang tercantum adalah hash bukti asli lokal; hash snapshot publik ada pada [indeks redaksi](../docs/editorial/reference-dna-public-evidence.md).

Direktori ini berisi manifest dan instruksi yang digunakan ChatGPT untuk alur
Content Producer. [plugin.json](plugin.json) menyatakan kandidat source versi
`0.5.7`; [.app.json](.app.json) memetakan satu app owner OAuth `mcpku2` yang sudah
ada. Versi source ini belum membuktikan versi plugin terpasang;
perubahan source sesudahnya tidak boleh diberi ulang nomor rilis tersebut. Source paket, archive
kandidat, dan release yang terpasang adalah bukti berbeda; ringkasan bertanggal
ada di [operations](../docs/operations.md).

## Isi paket dan batasnya

Allowlist pada [plugin-package.ts](../scripts/plugin-package.ts) berisi 15 file:

- `plugin.json` dan `.app.json`;
- `skills/content-producer/SKILL.md`;
- lima referensi core dan tujuh referensi niche trivia, termasuk
  `reference-patterns.md` dan `writing-playbook.md`.

README, schema generator lama, dan placeholder bukan bagian paket tersebut.
Changelog serta corpus QA/sumber contoh/audit di `docs/editorial/` dan seluruh
`dataset-reference/` juga tidak dibundel. Atlas runtime berisi contoh asli
beranotasi; companion sumber per klaim tetap menjadi dokumentasi developer.
Kandidat sekarang tidak menyertakan `mcp.json`/`.mcp.json`, token, credential,
atau konfigurasi OAuth rahasia. Mapping app yang sudah ada dipertahankan; generator
No-auth lama hanya untuk referensi/regresi dan tidak menambah koneksi kedua.

Bahasa konten produk tetap `en-US` sesuai kontrak. Mengubah bahasa dokumentasi
developer tidak otomatis mengubah instruksi runtime, locale, atau editorial policy.

## Membuat dan memeriksa kandidat

Dari root repository, setelah [preflight durasi](../docs/testing.md#1-estimasi-sebelum-menjalankan-pemeriksaan):

```sh
pnpm run package-plugin
pnpm exec tsx scripts/verify-plugin-candidate.ts
```

Hasilnya adalah direktori `artifacts/plugin-candidate/` dan
`artifacts/plugin-candidate-filelist.json` berisi daftar byte/hash. Output diabaikan
Git. Packaging mengganti kandidat lama pada lokasi itu, memvalidasi source, dan
menyalin hanya file allowlist; bukan pembuatan ZIP atau instalasi plugin.

Validator/test memeriksa manifest, schema generator, link/path/symlink, larangan
credential, aturan editorial, dan urutan 31 tool aktif setelah lima nama v1
dipensiunkan menurut CR-059. Karena
itu `plans/tool-inventory.md`, DNA trivia, serta schema legacy tertentu masih
merupakan dependensi yang harus direkonsiliasi sebelum dipindah/dihapus.

## Update dan pembuktian hasil

Kandidat v0.5.0 menambahkan DNA referensi, 12 kartu utuh beranotasi, enam pasangan
before/after dan playbook review sebelum save/revise. Routing memakai DNA/indeks
sebelum angle, dua contoh dan anti-example sebelum menulis, serta perbaikan
terarah maksimal dua putaran bila review masih gagal. Lima draft tidak otomatis
menjadi lima fakta. Format comparison, myth correction, hook default dan voice
nonakademik diperjelas sesuai CR-061; fixed count/judul dan hard budget tetap.
Lihat [catatan perubahan](CHANGELOG.md).

Kandidat v0.5.1 memperbaiki temuan preview task 5: review juga wajib sebelum
mengembalikan preview tanpa Write, dengan audit payoff, pasangan comparison,
urutan sejarah, qualifier dan budget komponen. Jawaban transfer tidak dimasukkan
ke atlas; evaluasi baru disimpan sebagai attempt terpisah.
Kandidat v0.5.2 menambahkan rumus separator plain lines setelah hitungan host
C2 melewatkan blank line pada block fakta. Server/renderer tetap sama.
Kandidat v0.5.3 memperjelas caregiving berulang pada cooperation card umum
di SKILL dan playbook setelah regresi E02 C3; retest E02 dicatat terpisah.

Kontrak tetap v2: kalimat + satu URL/fakta, tiga hasil editorial, dedup/CAS,
context terbaru dan get_post readback; approval owner terpisah. Tidak mengubah
backend atau app OAuth. Post lama yang telah direset dinyatakan tidak tersedia
dan tidak dibuat ulang otomatis. Bukti release terpasang yang tercatat pada
4 November 2026 adalah v0.4.0; readback Plugin Creator pada 5 November
membuktikan update ke v0.5.0. Bukti bertanggal dan update berikutnya ada pada
operations. Source atau hasil build saja tidak memperbarui release terpasang.
Evaluasi semantik E01–E12 tercatat pada [review 6 November](../docs/editorial/reference-dna-review-2026-11-06.md), termasuk repair terarah dan batas first-pass; retest saved-copy tetap task terpisah; hasil test
paket bukan bukti naturalness atau FIXED.

Update dilakukan pada plugin PRIVATE yang sama, lalu baca ulang release/version,
hash archive yang diunggah, dan binding app. Periksa tool/schema dan Read owner
pada chat baru yang memilih plugin yang benar. Refresh koneksi yang sama bila
metadata tool masih memakai snapshot lama. Approval host atau instalasi tidak
membuktikan write sudah berjalan dan tidak memberi izin write berikutnya.

CI mengambil nama ZIP/artefak dari versi manifest, lalu memeriksa seluruh 15 file
dan hash ekstraksinya. Gunakan manifest dan hash nyata sebagai bukti paket;
packaging tidak memperbarui release yang terpasang. LT-016 serta batas retest-nya tercatat di
[log live](../docs/live-test/results.md); MAN-03/04 historis dijelaskan pada
[CR-048](../docs/decisions/2026-10-20-phase-10-4-owner-oauth-evidence-acceptance.md).

Panduan developer: [arsitektur](../docs/architecture.md),
[kontrak tool](../docs/tool-contracts.md), [development](../docs/development.md),
[testing](../docs/testing.md), dan [operations](../docs/operations.md).

## Retest 0.5.7 — task 6.5 tuntas, 6 November 2026

**LIVE PASS: 10/10 saved-copy; 28/28 task selesai.** Empat kasus gagal
B1/B2/B3/B5 diperbaiki melalui host baru pada post QA yang sama; D6 masing-masing
15/15/16/14, tanpa 0, E=2, qualifier/config/budget lulus. Enam saved-copy
regresi identik dan tetap PASS; bukan enam generasi baru. Lima format dan
kelima output batch lulus; plan tetap completed 5/5, inventaris tetap 10.
Tidak ada post pengganti atau perubahan completed item/config/production.
Hasil adalah penerimaan sesudah repair terarah, bukan first-pass atau jaminan viral.

Source PR #137: `8069bb1bfd03316700e0dca9cfb4c6c8e880229a`;
[Actions 42176824421](https://github.com/milyarderpro/content-producer/actions/runs/42176824421)
PASS 53 detik. Lokal check PASS 184 source + 19 frontend; packaging/verify
15 file PASS. Plugin PRIVATE yang sama kini **0.5.7**, release
`QA-RELEASE-10c52114aae7`, readback source 15/15 sama.
PR [#137](https://github.com/milyarderpro/content-producer/pull/137) masih OPEN,
belum merge; Issue #134–#136 CLOSED/COMPLETED setelah retest. Tidak ada backend
change/deploy atau G4 baru. Metadata QA privat tetap lokal, source PR disanitasi.
Tidak membuka/verifikasi ulang URL sumber; pool/snapshot QA lama, bukan
sertifikasi faktual baru. FAIL 0.5.6 tetap historis, tidak ditimpa.

[Laporan lokal](../docs/editorial/reference-dna-d6-retest-0.5.7-2026-11-06.md). Metadata QA pada catatan lokal ini tidak ikut source PR.
