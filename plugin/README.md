# Source paket plugin PRIVATE

Direktori ini berisi manifest dan instruksi yang digunakan ChatGPT untuk alur
Content Producer. [plugin.json](plugin.json) menyatakan kandidat source versi
`0.2.8`; [.app.json](.app.json) memetakan satu app owner OAuth `mcpku2` yang sudah
ada. Rilis terpasang terakhir yang dikonfirmasi sebelum kandidat ini adalah `0.2.7`;
perubahan source sesudahnya tidak boleh diberi ulang nomor rilis tersebut. Source paket, archive
kandidat, dan release yang terpasang adalah bukti berbeda; ringkasan bertanggal
ada di [operations](../docs/operations.md).

## Isi paket dan batasnya

Allowlist pada [plugin-package.ts](../scripts/plugin-package.ts) berisi 13 file:

- `plugin.json` dan `.app.json`;
- `skills/content-producer/SKILL.md`;
- lima referensi core dan lima referensi niche trivia.

README, schema generator lama, dan placeholder bukan bagian paket tersebut.
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
credential, aturan editorial, dan urutan 33 tool terhadap kontrak frozen. Karena
itu `plans/tool-inventory.md`, DNA trivia, serta schema legacy tertentu masih
merupakan dependensi yang harus direkonsiliasi sebelum dipindah/dihapus.

## Update dan pembuktian hasil

Update dilakukan pada plugin PRIVATE yang sama, lalu baca ulang release/version,
hash archive yang diunggah, dan binding app. Periksa tool/schema dan Read owner
pada chat baru yang memilih plugin yang benar. Refresh koneksi yang sama bila
metadata tool masih memakai snapshot lama. Approval host atau instalasi tidak
membuktikan write sudah berjalan dan tidak memberi izin write berikutnya.

CI mengambil nama ZIP/artefak dari versi manifest, lalu memeriksa seluruh 13 file
dan hash ekstraksinya. Gunakan manifest dan hash nyata sebagai bukti paket;
packaging tidak memperbarui release yang terpasang. LT-016 serta batas retest-nya tercatat di
[log live](../docs/live-test/results.md); MAN-03/04 historis dijelaskan pada
[CR-048](../docs/decisions/2026-10-20-phase-10-4-owner-oauth-evidence-acceptance.md).

Panduan developer: [arsitektur](../docs/architecture.md),
[kontrak tool](../docs/tool-contracts.md), [development](../docs/development.md),
[testing](../docs/testing.md), dan [operations](../docs/operations.md).
