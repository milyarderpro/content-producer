# Draf Issue — Katalog dan profil editorial trivia per Page

**Status:** DRAFT LOCAL, 12 November 2026. Belum dikirim ke GitHub;
nomor/URL Issue dan PR belum tersedia. Task 1 meminta menyiapkan Issue sesuai
scope, bukan memublikasikan Issue atau men-trigger Actions.

## Masalah dan hasil yang diharapkan

Satu backend/MCP/plugin perlu melayani DNA Curious Mind, DYK, Daily Facts serta
profil custom eksplisit per Page. Format/topik/profil baru dalam struktur
hook–facts–CTA harus dapat ditambah sebagai data owner, tanpa perubahan kode
setiap key baru. Config1 dan sejarahnya harus tetap mempunyai arti lama.

Actual pada basis source `c02c5413479cebf50f39abc10149fafca757611a`:

- `supabase/functions/mcp/schemas.ts` mengunci lima format, dua density,
  sebelas topik, bobot tetap, emoji false dan maksimum sembilan fakta.
- `supabase/functions/mcp/trivia_v2.ts` membatasi input/output fakta/posisi
  ke sembilan, teks fakta 90 karakter, dan goal ke empat nilai wajib.
- `20261102014204_add_save_post_v2.sql` meneruskan `post_render_v2` ke
  `post_render_v1`; snapshot2 masih mensyaratkan config1. Perubahan input
  save saja belum menyelesaikan readback, lifecycle, plan atau approval.
- Dataset tetap memuat 10 fakta Curious Mind, 11 DYK, copy sampai 728 karakter,
  CTA gabungan/multiline serta CTA sebelum fakta terakhir. Lihat reproduksi
  dan locator lengkap pada [audit](audit.md), bukan bukti error live baru.

Reproduksi aman: inspeksi source di atas dan jalankan
`python docs/editorial/configurable-profiles/reproduce.py --check`.
Ini tidak memanggil business RPC, menyimpan draft atau memodifikasi Page.

## Kontrak dan penerimaan

[CR-062](../../decisions/2026-11-12-cr-062-configurable-trivia-editorial-profiles.md)
merekonsiliasi frozen/CR-053/059/061. [Kontrak](contract.md) membekukan D1–D11,
kompatibilitas dan kasus negatif. [Task change](../../../openspec/changes/add-configurable-trivia-editorial-profiles/tasks.md)
memisahkan 10 paket; scope sesi ini hanya paket 1.

- Task 1: tiga fingerprint/count cocok; matriks 172 record, duplikasi/OCR/null,
  contoh, CTA khusus, bobot per akun dan reproduksi tersedia; keputusan tercatat.
- Task 2–8: implementasi + dokumentasi + test fokus setiap paket mengikuti
  kontrak; tidak membiarkan test akhir menjadi pengganti pemeriksaan per paket.
- Task 9: integrasi tiga preset, custom, data-only extension tanpa perubahan
  source/plugin, kompatibilitas/keamanan, review naskah dan ponsel per kasus.
- Task 10: Issue/PR/Actions sesuai izin, G4 manual exact final SHA main sebelum
  deployment yang diotorisasi; verifikasi runtime/plugin dan retest QA/readback.

## Batas diagnosis dan tindakan

Ini perubahan kemampuan yang direncanakan; tidak menuduh save/retry gagal di
production. Dataset adalah bukti pola, bukan sumber fakta atau bukti sebab
akibat views. Audit per akun memakai ulang metadata yang ada dan review gap
terarah; tidak menulis ulang dataset ataupun audit historis CR-061.

Belum ada source implementasi berubah, commit/push/PR/merge, Actions,
deployment, instalasi, atau business Write. Scope laporan/perbandingan DNA
serta filter/pengelompokan CTA baru ditunda; readback provenance dan kompatibilitas
analitik lama tetap wajib. Isi ini siap dipakai sebagai body Issue saat ada izin.
