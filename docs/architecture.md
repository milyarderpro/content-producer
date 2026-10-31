# Arsitektur Content Producer

Panduan ini menjelaskan susunan project dan tempat mencari implementasinya.
Baca berikutnya: [domain dan aturan bisnis](domain.md), lalu
[kontrak tool](tool-contracts.md).

**Acuan peninjauan:** source pada `d6e7fe83ea006931f85624c4d60486f92ab3438c`,
25 Oktober 2026. Dokumen ini menjelaskan kode yang tersedia, bukan pemeriksaan
deployment langsung. Versi terpasang dan batas bukti dicatat di
[audit cleanup](cleanup-audit.md#2-baseline-yang-dapat-direproduksi).
Kontrak frozen dan keputusan yang diterima tetap berlaku; panduan ini membantu
membacanya, bukan mengganti kontrak secara diam-diam.

## 1. Produk ini membantu pekerjaan apa?

Content Producer membantu pemilik menyiapkan konten trivia Facebook melalui
percakapan ChatGPT. Hasilnya berupa draft yang tersimpan, copy untuk Canva,
caption, hashtag, bukti sumber, serta catatan pemeriksaan dan persetujuan.
Pemilik juga dapat menyimpan rencana beberapa konten dan mencatat performa
post yang sudah benar-benar dipublikasikan.

Pembagian pekerjaannya:

- **ChatGPT** memahami permintaan, meneliti sumber melalui kemampuan host,
  menilai kesamaan makna fakta, menulis copy, dan memberikan penilaian editorial.
- **Backend** menjaga identitas, kepemilikan data, kontrak, transaksi, reservasi,
  aturan penggunaan ulang fakta, revision, serta bukti pemeriksaan.
- **Pemilik** memilih sasaran dan menyetujui tindakan yang memerlukannya,
  termasuk persetujuan atas konten tertentu.

Project belum menyediakan penerbitan otomatis ke Facebook, pembuatan video Canva,
pengambilan analitik Facebook, atau proses generasi yang terus berjalan di latar
belakang. Jadwal yang disimpan adalah jadwal internal, bukan antrean publikasi
Facebook. Backend tidak memanggil OpenAI API untuk membuat konten.

## 2. Gambaran hubungan komponen

```text
Pemilik ↔ ChatGPT + plugin PRIVATE
                  │
                  │ MCP melalui HTTP + token owner OAuth
                  ▼
          Supabase Edge Function mcp
          auth → transport → registry → handler tool
                  │
                  │ PostgREST, schema api, token pengguna yang sama
                  ▼
          api.<nama_tool> di PostgreSQL
                  │
                  ├─ validator, transaksi, locks, dan helper internal
                  └─ tabel bisnis + RLS + riwayat operasi

Browser pemilik → auth-frontend → Supabase Auth → login/consent OAuth

Riset sumber, pengolahan Canva, dan publikasi Facebook terjadi di luar backend.
```

Tiga bagian yang dapat berubah atau dirilis secara terpisah adalah paket plugin,
Edge Function beserta migration database, dan frontend autentikasi. Commit source
baru tidak membuktikan ketiganya sudah terpasang. Nomor versi paket, versi service,
nomor deployment Edge, dan SHA memiliki arti berbeda.

## 3. Peta direktori dan tanggung jawab

| Lokasi                                           | Peran saat ini                                                                         | Mulai membaca dari                                                                                                                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin/`                                        | Manifest, mapping app, dan instruksi yang dibaca ChatGPT saat menjalankan alur konten  | [SKILL.md](../plugin/skills/content-producer/SKILL.md) dan [plugin.json](../plugin/plugin.json)                                                                                    |
| `supabase/functions/mcp/`                        | HTTP, OAuth/owner, transport MCP, schema input/output, dan adapter ke RPC              | [index.ts](../supabase/functions/mcp/index.ts), lalu `edge.ts`, `http.ts`, `registry.ts`                                                                                           |
| `supabase/migrations/`                           | Riwayat pembentukan tabel, validator, RPC, izin, dan aturan transaksi                  | Nama fungsi `api.<nama_tool>` dan helper yang dipanggilnya; periksa juga migration lanjutan                                                                                        |
| `supabase/tests/database/`                       | Regresi database melalui jalur RPC, concurrency, izin, serta aturan bisnis             | Test dengan nama domain yang sedang diubah                                                                                                                                         |
| `auth-frontend/`                                 | Halaman login, consent/deny, logout, dan pesan kesalahan aman                          | [src/app.js](../auth-frontend/src/app.js), `auth.js`, `routes.js`, `vercel.json`                                                                                                   |
| `scripts/`                                       | Pemeriksaan project, packaging, lingkungan lokal, dan harness pengujian                | [check.ts](../scripts/check.ts), [test-all.ts](../scripts/test-all.ts), [plugin-package.ts](../scripts/plugin-package.ts)                                                          |
| `tests/`                                         | Pemeriksaan lintas komponen, paket plugin, instruksi editorial, dan inventaris kontrak | [vitest.config.ts](../vitest.config.ts) dan file `tests/*.test.ts`                                                                                                                 |
| `supabase/tests/fixtures/`, `dataset-reference/` | Data acuan pengujian dedup dan asal-usul contoh                                        | [manifest dedup](../supabase/tests/fixtures/trivia/dedup-v1/manifest.json)                                                                                                         |
| `plans/`                                         | Kontrak frozen dan pengarah ke sejarah; sebagian masih menjadi input test              | [Indeks kontrak](../plans/README.md), [tool inventory](../plans/tool-inventory.md), [database design](../plans/database-design.md), [module contract](../plans/module-contract.md) |
| `docs/decisions/`                                | Alasan perubahan kontrak dan penjelasan keputusan yang melengkapi baseline             | Peta keputusan pada bagian 8                                                                                                                                                       |

**Bentuk kode sekarang berbeda dari rancangan folder awal.** Scaffold kosong
`supabase/functions/_shared/` telah dibersihkan. Aturan domain yang sudah berjalan
terutama berada di SQL dan handler dalam `mcp/`, bukan pada sebuah framework modul
dinamis di `_shared/modules/`.

## 4. Perjalanan satu pemanggilan tool

1. [index.ts](../supabase/functions/mcp/index.ts) memasang `createEdgeHandler()`.
2. [edge.ts](../supabase/functions/mcp/edge.ts) membedakan health, metadata,
   discovery, dan permintaan terautentikasi. Jalur bisnis normal melewati
   middleware OAuth dan pengguna.
3. [auth.ts](../supabase/functions/mcp/auth.ts) memeriksa claims yang relevan:
   issuer, audience tepat ke resource MCP, waktu token, scope `openid email`,
   `client_id`, serta owner yang dikonfigurasi. Identitas tidak diambil dari
   argumen tool.
4. [http.ts](../supabase/functions/mcp/http.ts) menyelesaikan workspace owner
   aktif sebelum `tools/list` atau `tools/call` terautentikasi. Context permintaan
   membawa token pengguna dan scope workspace; context dibuat per permintaan.
5. [transport.ts](../supabase/functions/mcp/transport.ts) menghubungkan request
   dengan [server.ts](../supabase/functions/mcp/server.ts). Registry memasang 33
   tool dari 11 kelompok handler.
6. Handler memvalidasi input dengan Zod, lalu memetakan nama field MCP menjadi
   parameter RPC berawalan `p_`.
7. `invoke()` dalam [foundation.ts](../supabase/functions/mcp/foundation.ts)
   memanggil `/rest/v1/rpc/<nama_tool>` pada schema `api`, memakai token pengguna
   yang sama. Jalur OAuth ini tidak menggantinya dengan service-role key.
8. RPC menjaga aturan domain dan perubahan atomik. Hasil dibatasi ukuran,
   divalidasi lagi terhadap schema output, disaring dari field privat, lalu
   dikembalikan melalui `structuredContent` atau error aman.

**MCP tetap tipis:** logika baru tentang eligibility fakta, perpindahan status,
atau konsistensi beberapa tabel tidak diletakkan sebagai business SQL dalam
handler. Validasi bentuk di MCP melengkapi, bukan menggantikan, validasi database.

### Discovery bukan akses data bisnis

Jalur default OAuth mengizinkan discovery protokol anonim tertentu, termasuk
`initialize` dan `tools/list`, agar host dapat mengenali layanan. Katalog tersebut
dibangun tanpa identitas atau credential nyata. Pemanggilan bisnis `tools/call`
tetap membutuhkan otorisasi; melihat nama tool tidak memberikan akses datanya.

Sebagian respons tantangan autentikasi tool memakai HTTP 200 dengan
`isError: true`. Karena itu HTTP 200 saja bukan bukti operasi sukses.
`GET /health` juga bukan MCP tool dan tidak membuktikan seluruh alur database sehat.

## 5. Susunan data dan batas keamanan

| Schema     | Isi dan batasnya                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `public`   | Tabel bisnis, seperti workspace, Page, plan, post, dan fakta. Nama `public` bukan berarti caller boleh membaca tabel langsung |
| `api`      | RPC bisnis yang diizinkan. Inilah schema bisnis pada konfigurasi Data API project                                             |
| `internal` | Validator, ledger, rate limit, reservasi, serta riwayat operasi. Tidak menjadi schema RPC publik                              |
| `auth`     | Identitas dan mekanisme autentikasi yang dikelola Supabase                                                                    |

Migration membangun privilege dan RLS yang membatasi caller ke jalur yang
ditentukan. Role `content_producer_api_owner` memiliki kewenangan terbatas; detail
privilege fungsi dan helper tetap harus dilihat pada migration dan audit katalog.
Keberadaan RLS tidak menjadi alasan membuka grant langsung ke tabel atau helper.

Pengaturan `[functions.mcp] verify_jwt=false` membuat discovery dan challenge dapat
mencapai middleware aplikasi. Pengaturan itu **bukan** penghapusan validasi token
atau izin untuk menjalankan tool bisnis tanpa owner.

Alur owner mengacu pada
[CR-017](decisions/2026-10-14-phase-6-batch-a-owner-workspace-reconciliation.md),
[CR-042](decisions/2026-10-20-phase-10-oauth-route-and-mode.md), dan
[CR-043](decisions/2026-10-20-phase-10-oauth-tool-call-owner-context.md).
Hook audience OAuth dijelaskan pada
[CR-021](decisions/2026-10-16-phase-9-5-supabase-oauth-resource-audience.md).

## 6. Frontend autentikasi dan komponen pendukung

Frontend adalah aplikasi statis dengan JavaScript browser dan CSS. Build pada
[scripts/build.mjs](../auth-frontend/scripts/build.mjs) menyalin aset dan memasukkan
hanya dua konfigurasi publik yang diizinkan: `VITE_SUPABASE_URL` dan
`VITE_SUPABASE_PUBLISHABLE_KEY`.

[auth.js](../auth-frontend/src/auth.js) menggunakan API publik Auth; sesi browser
disimpan di `sessionStorage` per tab. [routes.js](../auth-frontend/src/routes.js)
menjaga `authorization_id` dan tujuan redirect. Persetujuan koneksi OAuth berbeda
dari persetujuan editorial atas suatu post.

Komponen historis berikut masih mempunyai referensi source dan perlu dikenali:

- `auth-frontend/api/phase-9-5/` beserta route UI terkait adalah client uji
  OAuth/pilot dengan flag server-side tersendiri; bukan dashboard produk.
- `supabase/functions/mcp-probe/` adalah probe terpisah; jangan memasukkannya
  ke hitungan 33 tool bisnis.
- `MCP_AUTH_MODE=fixed-pilot` adalah pilihan rollback server-side eksplisit,
  bukan jalur default. `pilot_db.ts` dan helper write-nya masih diimpor.
- `supabase/functions/batch_a_server.ts` adalah host pengujian lokal yang dipakai
  harness HTTP/Inspector, bukan entrypoint deployment `mcp`.

Status komponen tersebut di production belum diperiksa pada task dokumentasi ini.
Menghapusnya merupakan keputusan terpisah, bukan efek samping mengganti nama fase.

## 7. Menemukan tempat perubahan fitur

| Perubahan yang diinginkan                                    | Bagian yang ditelusuri                                                                                                                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cara AI memilih tool, meninjau sumber, atau menyajikan hasil | `plugin/skills/content-producer/` dan test plugin; periksa apakah perubahan menyentuh kontrak                                                                           |
| Field input/output atau respons MCP                          | Handler kelompok tool, `schemas.ts`, `foundation.ts`, dan test MCP; cocokkan dengan RPC                                                                                 |
| Aturan status, reservasi, reuse, jadwal, atau transaksi      | Fungsi `api.*` dan helper `internal.*` dalam migration, lalu test database domain terkait                                                                               |
| Login/consent/redirect                                       | Source frontend dan test Node; kode middleware jika dampaknya sampai identitas MCP                                                                                      |
| Niche baru                                                   | Kontrak modul, registry niche, schema config/payload, renderer, quality checks, persistence, dan fixture baru; jangan menganggap seluruh niche menggunakan trivia facts |
| Keamanan atau izin owner                                     | Seluruh rantai token → workspace → RPC → privilege/RLS, termasuk test penolakan lintas owner                                                                            |

Cari semua definisi dan perubahan lanjutan suatu fungsi di migration, bukan hanya
file pertama yang membuatnya. Pertahankan migration yang sudah diterapkan.
Langkah berikutnya dijelaskan pada [development](development.md),
[testing](testing.md), dan [operations](operations.md).

### Titik masuk SQL dan regresi per domain

Tabel ini memberikan titik awal penelusuran, bukan pernyataan bahwa definisi awal
tidak pernah diperbarui oleh migration berikutnya.

| Area                               | Titik masuk implementasi                                                                                                                                                                       | Contoh regresi yang relevan                                                                                                                                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identitas, ledger, rate limit      | [Security kernel](../supabase/migrations/20261010132708_phase_5_security_kernel.sql) dan perbaikan setelahnya                                                                                  | [api-security-kernel.test.ts](../supabase/tests/database/api-security-kernel.test.ts)                                                                                                                                                                                         |
| Page dan pembuatan plan            | [Page/plan writes](../supabase/migrations/20261011052125_phase_5_3_page_and_content_plan_writes.sql)                                                                                           | [api-page-plan-writes.test.ts](../supabase/tests/database/api-page-plan-writes.test.ts)                                                                                                                                                                                       |
| Claim dan pemulihan plan           | [Plan lifecycle RPCs](../supabase/migrations/20261011101753_phase_5_4_plan_lifecycle_rpcs.sql)                                                                                                 | [api-plan-lifecycle.test.ts](../supabase/tests/database/api-plan-lifecycle.test.ts), [api-plan-concurrency.test.ts](../supabase/tests/database/api-plan-concurrency.test.ts)                                                                                                  |
| Registrasi/reservasi fakta         | [Trivia registration/reservation RPCs](../supabase/migrations/20261011131505_phase_5_5_trivia_registration_reservation_rpcs.sql)                                                               | [api-trivia-facts.test.ts](../supabase/tests/database/api-trivia-facts.test.ts)                                                                                                                                                                                               |
| Reverify/correction                | [Trivia correction RPCs](../supabase/migrations/20261011131507_phase_5_5_trivia_reverification_correction_rpcs.sql)                                                                            | [api-trivia-correction.test.ts](../supabase/tests/database/api-trivia-correction.test.ts)                                                                                                                                                                                     |
| Renderer, save, revise, reschedule | [Renderer dan quality](../supabase/migrations/20261011164409_phase_5_6_renderer_and_quality.sql), [post write RPCs](../supabase/migrations/20261011164415_phase_5_6_post_write_rpcs.sql)       | [api-post-render-quality.test.ts](../supabase/tests/database/api-post-render-quality.test.ts), [api-post-save-revise.test.ts](../supabase/tests/database/api-post-save-revise.test.ts), [api-post-reschedule.test.ts](../supabase/tests/database/api-post-reschedule.test.ts) |
| Approval sampai arsip              | [Lifecycle RPCs](../supabase/migrations/20261012045018_phase_5_7_lifecycle_rpcs.sql)                                                                                                           | [api-post-approval-quality.test.ts](../supabase/tests/database/api-post-approval-quality.test.ts), [api-post-lifecycle.test.ts](../supabase/tests/database/api-post-lifecycle.test.ts)                                                                                        |
| Metrik dan insights                | [Pencatatan metrik](../supabase/migrations/20261012072242_phase_5_8_record_post_performance.sql), [metrics reads](../supabase/migrations/20261012072243_phase_5_8_metrics_read_completion.sql) | [api-metrics.test.ts](../supabase/tests/database/api-metrics.test.ts), [api-metrics-insights.test.ts](../supabase/tests/database/api-metrics-insights.test.ts)                                                                                                                |

## 8. Peta keputusan penting

| Topik                                                 | Acuan                                                                                                                                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope produk dan pemisahan core/niche                 | [PRD](../plans/PRD.md), [kontrak modul](../plans/module-contract.md)                                                                                                                                          |
| Identitas fakta dan arah perbandingan                 | [CR-005](decisions/2026-10-09-comparison-direction-candidate-contract.md), [FIX-37](decisions/2026-10-21-fix-37-sql-ontology-mcp-reconciliation.md)                                                           |
| Claim dan pemulihan plan                              | [CR-011](decisions/2026-10-11-phase-5-4-plan-lifecycle-reconciliation.md)                                                                                                                                     |
| Reservasi dan koreksi fakta                           | [CR-012](decisions/2026-10-11-phase-5-5-trivia-rpc-reconciliation.md)                                                                                                                                         |
| Revisi, hash, snapshot, dan reschedule                | [CR-013](decisions/2026-10-11-phase-5-6-post-write-reconciliation.md)                                                                                                                                         |
| Approval, warning, publikasi, dan arsip               | [CR-014](decisions/2026-10-12-phase-5-7-lifecycle-reconciliation.md)                                                                                                                                          |
| Metrik dan batas penarikan kesimpulan                 | [CR-015](decisions/2026-10-12-phase-5-8-metrics-reconciliation.md)                                                                                                                                            |
| Gate perubahan backend dan penggunaan ulang bukti SHA | [CR-020](decisions/2026-10-15-phase-9-10-risk-based-mvp-acceptance.md), [CR-044](decisions/2026-10-20-phase-10-gate-order-and-backend-sha-reuse.md), serta aturan estimasi CI dalam [AGENTS.md](../AGENTS.md) |
| Config ID dan presisi timestamp                       | [CR-046](decisions/2026-10-20-phase-10-4-generation-context-config-id.md)                                                                                                                                     |
| Pelestarian `null` saat membaca bukti sumber          | [CR-049](decisions/2026-10-22-cr-049-get-post-source-evidence-null-preservation.md)                                                                                                                           |

Dokumen keputusan menyimpan keadaan pada saat ditulis. Bagian berstatus pending
tidak boleh dianggap sebagai keadaan live sekarang tanpa membaca bukti lanjutan.
Jika kontrak dan implementasi tidak cocok, catat konflik dan rujuk keputusan yang
relevan; jangan menyelesaikannya hanya dengan mengubah panduan ini.

## Gate rilis backend yang berlaku

Setelah merge [PR #105](https://github.com/milyarderpro/content-producer/pull/105)
pada `ca5c43597af97c95ea9eaa87876237fd2d45e10c`,
[CR-052](decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md)
menetapkan `.github/workflows/backend-gate-candidate.yml` sebagai gate rilis
**manual exact final SHA `main`**: source, dua shard database terisolasi
19+22 (41 file/182 kasus) dan aggregate PASS. CR-020/044 tetap mengikat
kontrol keamanan. Gate tidak otomatis diwajibkan branch protection;
`backend-technical-gate.yml`/`pnpm run test-all` adalah legacy/rollback.
Lihat [testing](testing.md) dan [operations](operations.md).
