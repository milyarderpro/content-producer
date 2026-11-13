# CR-062 — Profil editorial trivia terkonfigurasi dan katalog owner

**Tanggal:** 12 November 2026 (Asia/Jakarta).
**Status:** Accepted — arah kontrak D1–D11 dan finalisasi dokumentasi task 1;
implementasi serta penerimaan runtime belum dijalankan.
**Change:** `add-configurable-trivia-editorial-profiles`.

## Otoritas dan scope

Pemilik meminta `$openspec-apply-change` untuk **task 1 hingga tuntas** pada
change yang sudah mempunyai proposal, design dan tiga delta spec. Instruksi ini
menjadi dasar finalisasi kontrak yang sudah direncanakan D1–D11, bukan penerimaan
hasil implementasi. Tidak ada perubahan fungsional baru di luar design yang
ditambahkan oleh record ini. Seperti scope task 1 CR-061, Issue disiapkan lokal;
pengiriman GitHub, commit/push/PR/merge, implementasi task 2–10, deployment,
instalasi, maupun Write data owner memerlukan scope masing-masing.

Basis source bersih: `c02c5413479cebf50f39abc10149fafca757611a`;
baseline implementasi design `2b685313f9c65105e8b22858af2657a11c502e95`.
Keduanya identitas source, bukan bukti versi live. Bukti task 1 dan pembekuan:

- [Issue lokal](../editorial/configurable-profiles/issue.md).
- [Kontrak dan matriks kompatibilitas](../editorial/configurable-profiles/contract.md).
- [Audit tambahan, metodologi, contoh dan reproduksi](../editorial/configurable-profiles/audit.md).
- [Fingerprint frozen](../editorial/configurable-profiles/freeze.json).
- [Design D1–D11](../../openspec/changes/add-configurable-trivia-editorial-profiles/design.md)
  dan tiga delta spec dalam change yang sama. Hash exact artefak terdapat pada
  fingerprint; perubahan keputusan berikutnya membutuhkan rekonsiliasi eksplisit.

## Override terbatas terhadap kontrak frozen

Dokumen frozen tetap sebagai baseline historis dan input test/packaging. Record
ini mengesahkan perbedaan di bawah **untuk jalur config2 yang akan diimplementasi**;
validator/plugin aktif belum berubah. Tidak mengganti expected test backend saat
ini agar fitur yang belum ada tampak lulus.

| Kontrak terdampak | Perubahan config2 | Yang dipertahankan |
| --- | --- | --- |
| `plans/trivia-content-dna.md` §6–9, §24; module contract §7–8, §22 | Katalog workspace versioned, key/bobot dinamis, profil DNA tunggal pinned, tiga preset + custom eksplisit; architecture/mekanisme/manfaat dipisahkan | Config1, density `profile_key`, sumber dan qualifier material |
| DNA §5.5, §9, §11–13, §15, §19–21 | Preferensi count/voice/hook/CTA per profil, ceiling D6, emoji policy eksplisit, CTA multiline dan posisi antara fakta; estimasi wrap/replay advisori | CTA tetap hadir; hard budget server, teks NFC/LF dan metrik deterministik |
| `plans/module-contract.md` §6–12; `plans/database-design.md` config/post/snapshot/approval; `plans/tool-inventory.md` §6–10, §13–16, §18–19 | Union config1/2, snapshot3 untuk config2, references/hash editorial, goal null, array hingga 12, dua RPC/tool katalog owner | Envelope umum 1, konten/tool draft 2; snapshot2/hash config1; MCP tipis dan lifecycle |
| CR-053 §2.2–2.6 | Resolver/binding editorial config2 ditambahkan; dedup 10–12 lewat beberapa Read konsisten; hard limits mengikuti config; goal opsional | Katalog fakta baseline A, maksimum 9 kandidat/Read, tiga attestations, atomic save/revise, CAS/replay, diagnostik dan explicit approval |
| CR-059 surface/cakupan | Rancangan 31 + 2 = 33 tool; target Inspector/audit dihitung dari source kandidat, tanpa menyalin pin historis | Lima nama tool v1 absen/ditolak, overload v1 tetap ditutup, owner denial, tanpa reset baru atau menghidupkan v1 |
| CR-061 hook/density, default gabungan dan CTA tunggal; evaluasi historis dimensi H | Config2 membaca profil terpilih dan contoh katalog; multiaksi tanpa hierarki/batas semantik; review terhadap profil | Review sebelum Write, original copy, dedup/riset, tiga checks tetap sama, readback wajib; hasil 28/28 dan LIVE 10/10 historis tetap utuh |

Config1 berarti **versi konfigurasi**, bukan konten/tool trivia v1. Retirement
konten v1 CR-059 tidak dibatalkan. Tidak ada field skor DNA server, classifier
CTA, API AI, embeddings, dashboard, atau laporan DNA/CTA baru dalam rilis ini.

## Keputusan yang dibekukan

D1/D2 menetapkan katalog per workspace, revision editorial terpisah dari katalog
fakta, versi/hash immutable, owner RPC Read/publish/retire, CAS/ledger/replay,
retirement tanpa hard delete, serta Read bounded yang transparan soal completeness.
D3/D4 menetapkan graph profil → format/topik, satu profil utama, referensi tepat,
resolver tunggal dan override terbatas; update versi tidak mengubah Page lain.
D5 menetapkan tiga preset berbeda, profil custom sebagai satu definisi biasa,
serta bobot awal dari matriks audit per akun. Bobot bukan kuota dan nol tidak
melarang pemilihan eksplisit.

D6/D7 menetapkan 1–12 fakta, ceiling karakter/kata yang tertulis di kontrak,
CTA natural satu/beberapa ajakan tanpa primary goal, allowlist kombinasi atau
batas dua/tiga aksi. `interaction_goal` config2 boleh absen/null; label aksi
opsional tidak harus lengkap. LF dan penempatan CTA dihitung dan disimpan utuh.
D8/D9 menetapkan snapshot3, binding/aturan efektif/hash terikat versi, sejarah
immutable, approval terhadap Page terkini, replay sebelum state mutable tetapi
sesudah otorisasi, dan pemisahan concurrency editorial/fakta. D10 mempertahankan
plugin/connection yang sama; katalog diperlakukan sebagai data tak tepercaya.
D11 menetapkan perubahan aditif melalui record ini, migrasi baru dan gate G4
exact-SHA sebelum deployment yang diotorisasi.

Rincian angka, batas error/payload, precedence dan matriks kasus D1–D11 pada
[contract](../editorial/configurable-profiles/contract.md) serta design yang
fingerprint-nya dibekukan merupakan bagian keputusan ini.

## Rekonsiliasi CR-061 dan batas bukti

Source sekarang sudah memuat `openspec/changes/archive/align-plugin-reference-content-dna/`
dan baseline utama yang tersinkronisasi. Pernyataan design sebelumnya bahwa
change itu belum diarsipkan sudah tertinggal dan dikoreksi melalui task ini.
Baseline TDW-04/06/07 CR-061 dipertahankan; delta baru menambahkan konteks profil,
bukan menimpa kewajiban riset/kurasi, review sebelum Write, dan readback. Tidak
mengarsipkan ulang atau menjalankan ulang Write historis.

Task 1 hanya PASS untuk dokumentasi dan reproduksi corpus lokal. Kemampuan
config2, isolasi/transaksi, preview, QA visual, G4, instalasi dan LIVE baru
**NOT RUN**. Tidak ada klaim FIXED, penerimaan hasil produksi, atau izin rilis.
Light Actions exact-SHA baru diverifikasi pada PR yang diotorisasi kelak.
