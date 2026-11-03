# Inventaris production P8 cutover — baca saja

**Project:** `content-producer-production` (`xjonnilnypchtxogtopb`).
**Pembacaan:** 3 November 2026, sekitar 07:24 UTC, melalui daftar tabel/migration dan query `SELECT` Supabase.
**Status:** snapshot untuk rancangan reset; **bukan** preflight tepat sebelum penghapusan dan tidak ada data yang diubah.

## Scope pemilik dan data yang dipertahankan

Production saat pembacaan memiliki **1 akun Auth, 1 owner, 1 workspace**, 4 Page, 4 konfigurasi Page+niche, dan 1 niche `trivia`. Katalog Auth mencatat 1 identity, 6 OAuth client, 4 authorization, 5 consent, 40 session, dan 111 refresh token; semua objek Auth tetap di luar reset konten. Semua baris konten/ledger yang memiliki `workspace_id` mengarah ke satu workspace `cad2885e-952e-41b3-9eae-d2d9d75d533d`; tidak ada baris dengan workspace tak dikenal. Actor pada seluruh 115 ledger cocok dengan owner workspace (0 mismatch). Sebanyak 708 rate-limit bucket juga milik actor owner itu. Karena itu inventaris ini tidak menemukan data owner lain yang akan diam-diam masuk scope. Pemeriksaan ini harus diulang tepat sebelum reset; owner/workspace baru atau referensi yang berubah wajib menghentikannya.

| Page public ID | Sidik jari baris Page | Config public ID | Sidik jari baris config |
| --- | --- | --- | --- |
| `5030e577-89bf-4645-85e8-1d5060fb91ee` | `3a8035c05fdb7ac46cde9df53ac1cca3` | `f94e0941-55c5-4312-b57d-a913bbd98366` | `ed3cc52c9e53d7e88ebb6e8d740c428f` |
| `37457236-17ec-4486-8880-6832460ae411` | `8ccf6aecd97588fb55185cfddfb34ab9` | `cd41b752-92f7-4905-9c02-fbcef032459a` | `ade3928eb697c2c698962e3a08fe9837` |
| `3c7dc8b2-43db-42b5-abd6-d334aac0ff83` (QA) | `cae4a3bfc8b774d3d25d342432d7008e` | `ca8dd895-48e7-498e-93c6-cff1347852c9` | `ec9fda37bfe9441a7ae34c80aef68083` |
| `f3984ee4-8ae7-4043-8c93-45765f82f46e` | `d837ef0512ea729b5743b513b14a5eec` | `e8c9f5c0-9eb1-4b71-824f-323193b966` | `d7a344cd6a8c20c65855b34feb2ebaa4` |

Keempat Page aktif, ber-locale `en-US`, dan memiliki config `trivia`. Sidik jari di atas adalah `md5(to_jsonb(row)::text)` untuk pembanding inventaris saja; backup/preflight rilis harus menghitung ulang pembanding yang lebih kuat dan tidak menganggap nilai ini tetap sampai hari reset. Workspace aktif; sidik jari `settings` saat pembacaan `6a8d43e124ab6b34ea526a3b82d08136`; niche `trivia` `d0a258105e64c59ee6fad9d417cf8063`.

## Matriks hapus/pertahankan

Angka adalah hitungan `SELECT count(*)` pada snapshot ini, bukan estimasi katalog tabel. Semua baris bertanda **hapus** dibatasi ke workspace pemilik tersebut; script reset kelak wajib memeriksa hitungan/scope terbaru dan urutan FK di dalam satu transaksi.

| Tabel/objek | Baris | Keputusan | Alasan dan referensi |
| --- | ---: | --- | --- |
| `auth.users` dan koneksi OAuth | 1 akun | Pertahankan | Identitas/login tetap dipakai. Tidak ada perubahan Auth. |
| `public.workspaces` | 1 | Pertahankan | ID owner dan `settings` tetap. |
| `public.pages` | 4 | Pertahankan | Page, locale, status, dan `platform_config` tetap. |
| `public.page_niche_configs` | 4 | Pertahankan | Konfigurasi Page `trivia` tetap. |
| `public.niches` | 1 | Pertahankan | Modul `trivia` tetap. |
| `internal.rate_limit_buckets` | 708 | Pertahankan | Batas permintaan/keamanan, bukan konten. |
| `internal.operation_ledger` untuk `create_page`/`update_page` | 5 | Pertahankan | Replay operasi Page; semuanya `target_type=page`. |
| `public.content_plans` | 5 | Hapus | 1 completed, 1 cancelled, 3 pending; `plan_config` menyimpan maksud rencana. |
| `public.content_plan_items` | 13 | Hapus | Item, `item_config`, claim, dan error plan. |
| `internal.content_plan_item_events` | 18 | Hapus | Histori, claim, ID Page/post, dan catatan kegagalan plan. |
| `public.posts` | 38 | Hapus | 28 `content_schema_version=1`, 10 versi 2; `content_payload`, `generation_snapshot`, pemeriksaan, approval, dan ID publikasi. |
| `public.post_metrics` | 0 | Hapus jika ada | Metrik dan `metrics_payload` terkait post. |
| `internal.post_write_history` | 59 | Hapus | Salinan sebelum/sesudah, bukti editorial, respons, dan jadwal. |
| `public.trivia_post_facts` | 262 | Hapus | Binding dan `source_snapshot`; 195 snapshot versi 1, 67 versi 2. |
| `public.trivia_facts` | 258 | Hapus | 196 memiliki envelope v1; 62 tanpa envelope v1. Termasuk `source_data`, dedup, koreksi, dan reservasi. |
| `public.trivia_fact_evidence_v2` | 62 | Hapus | URL bukti v2 terkait fakta. |
| `internal.trivia_reservation_sets` | 31 | Hapus | Riwayat set/token fingerprint, termasuk yang telah kedaluwarsa. |
| `internal.trivia_fact_catalog_v2` | 1 | Reset ke keadaan kosong | Version saat ini 11; hapus baris setelah penghapusan fakta agar pembacaan v2 mulai dari versi 0. Trigger fakta dapat mengubahnya selama transaksi, sehingga pemeriksaan akhir wajib. |
| `internal.operation_ledger` selain operasi Page | 110 | Hapus | Snapshot/replay konten, termasuk plan, post v1/v2, fakta, lifecycle, metrik. Klasifikasi berdasarkan `operation_name`, bukan `target_type`: 33 operasi konten bertarget `page`. |
| `supabase_migrations.schema_migrations` | 84 | Pertahankan | Histori migration production, terakhir `20261102074627`; source lokal juga 84 file. |

## Referensi, snapshot, dan pekerjaan tertunda

Seluruh **17 tabel aplikasi** pada schema `public`/`internal` tercakup di matriks. Semua FK bisnis yang diperiksa memakai `ON DELETE RESTRICT`; tidak ada cascade tersembunyi untuk konten. Urutan kasar untuk skrip reset: event/history/metrics/binding/evidence → post/item/plan/reservation/fact → ledger konten → katalog fakta. FK `trivia_facts` ke dirinya sendiri dan FK event ke post perlu diuji pada fixture; urutan ini belum merupakan skrip eksekusi.

JSON yang menyalin konten berada di `posts`, `trivia_facts`, `trivia_post_facts`, `content_plans`, `content_plan_items`, `post_metrics`, `internal.post_write_history`, dan `internal.operation_ledger`; semuanya masuk scope hapus. JSON yang dipertahankan adalah `workspaces.settings`, `pages.platform_config`, dan `page_niche_configs.config`. Pencocokan terhadap seluruh public ID post, fakta, dan plan yang ada menemukan **0 referensi ID konten** di ketiga JSON yang dipertahankan. Ini tidak membuktikan tidak ada rujukan berbentuk teks bebas; preflight harus memeriksa ulang bila schema/config berubah.

Saat pembacaan, tidak ada claim plan aktif (0 token), reservasi fakta aktif (0), set reservasi belum kedaluwarsa (0), atau ledger konten yang belum selesai (0). Schema `cron.job` tidak ada dan tidak ditemukan tabel `pgmq`; tidak ada tabel job aplikasi lain pada `public`/`internal`. Operasi eksternal yang belum mencapai database tidak dapat dibuktikan absen oleh snapshot ini; cutover tetap membutuhkan pembatasan write dan pemeriksaan ulang in-flight.

Matriks ini tidak memberi izin untuk penghapusan sekarang. Backup, lock, precondition terbaru, serta gate dan urutan rilis pada [design](design.md) tetap diperlukan.
