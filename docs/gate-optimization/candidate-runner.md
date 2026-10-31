# Kandidat runner G3-T1 — Issue #88

**Status saat Issue #88 (historis):** kandidat review, bukan cutover.
Base `bbd598ead3df145a831fd32d7e3f4a5bce222161`; saat itu gate lama
`scripts/test-all.ts`/Actions masih acuan. **Kini CR-052 efektif sejak
merge PR #105** (`ca5c43597af97c95ea9eaa87876237fd2d45e10c`). Status `NOT RUN`
untuk Issue/PR awal tidak diubah; lihat status G4 di bawah.

## Cakupan

`gate:source` menjalankan `pnpm run check` sekali. Preflight mengikat SHA checkout bersih, hash manifest, lockfile, input migration/fixture/config, serta versi Node, pnpm, Deno, dan Supabase CLI. `gate:backend` menjalankan satu stack lokal disposable dengan satu reset, nama migration, MCP sekali, audit awal, Inspector 33 valid/invalid dan owner denial, audit sesudah, 41 file database serial sesuai konfigurasi Vitest, history, lint, local security advisors sebagai langkah sendiri, audit akhir, dan whitespace. `gate:full` menggabungkan komponen pada identitas yang sama. Kegagalan atau bukti wajib yang hilang memberi exit nonzero.

Sembilan tes fail-closed runner berada di `tests/gate-runner.test.ts` sebagai file source mandatory ke-12 dalam `scripts/gate-suite-manifest.json`. `pnpm run check` menjalankannya melalui root Vitest; untuk tes fokus saja gunakan `pnpm exec vitest run tests/gate-runner.test.ts`. Manifest tetap berisi 15 file MCP dan 41 file database mandatory.

## Target lokal dan bukti

Set `GATE_CANDIDATE_SHA` ke commit 40 karakter yang diuji, `GATE_DISPOSABLE_PROJECT_ID` ke nama `issue-88-…-disposable`, dan `GATE_PORT_BASE` ke kelipatan sepuluh pada rentang 58000–64000. Runner menolak checkout kotor, SHA berbeda, metadata linked project, credential remote, target Docker yang sudah ada, dan port terpakai sebelum start/reset. Ia memeriksa container DB/REST/Kong, network, volume, dan port sebelum reset dan tahap backend berikutnya.

Runner membuat salinan runtime sementara untuk mengganti hanya `project_id` dan port di `supabase/config.toml`, lalu menghapusnya setelah stop. Hash config overlay dilaporkan. Karena identitas config runtime berubah, semua hasil lokal ini berlabel **DIAGNOSTIC_CONFIG_OVERLAY** dan bukan exact-SHA PASS formal menurut rancangan CR-052. Output child ditangkap; laporan JSON hanya memuat label tahap, status, durasi, hitungan aman, hash, versi pin, dan batas bukti. Token, SQL, payload fixture, serta output mentah tidak diteruskan.

## Status bukti

Catat preflight, diff, estimasi dari riwayat run, identitas stack, hasil check/tes fokus, satu run kandidat diagnostik yang sudah selesai, cleanup, serta light CI head PR pada laporan akhir. Jangan ulang full backend gate pada PR ini. `PASS` hanya untuk pemeriksaan yang selesai; `FAIL` untuk command/evidence wajib gagal; `BLOCKED` untuk preflight/target yang tidak aman; `NOT RUN` untuk tahap yang belum dimulai. Gate lama dan workflow kandidat GitHub tetap `NOT RUN` pada PR ini. Hasil lokal tidak membuktikan OAuth ChatGPT hosted, business Write production, atau kesetaraan G4.

## Issue #96 — shard candidate terisolasi

`GATE_DB_SHARD=1|2` pada mode `gate:backend` memilih tepat satu daftar file dari `scripts/gate-db-shards.json`. Tiap file dijalankan dengan `vitest run --no-file-parallelism` pada runner/stack/reset/fixture tersendiri. Tanpa variabel tersebut, runner lokal tetap menjalankan **semua 41 file** manifest via `pnpm run test:database`. Laporan shard menyimpan ID, 21/20 nama file mandatory, case count, hash partisi serta identitas SHA/manifest/lock/input; agregat menolak laporan hilang, duplikat, skipped, salah SHA/hash atau tahap non-PASS. MCP 15 file/82 kasus dan Inspector authenticated 33 valid/33 invalid beserta owner denial hanya dijalankan **satu kali di shard 1** (21 file DB). Shard 2 (20 file DB) tidak mengeksekusi MCP/Inspector. Kedua shard tetap melakukan start/reset/fixture, audit before/after/final, database serial, migration/history, lint/advisor dan cleanup. Aggregate menolak bukti MCP/Inspector hilang, gagal, duplikat ataupun berasal dari shard salah; 41 file/182 kasus DB tetap wajib. Formal two-shard runtime **NOT RUN** hingga integrasi PR #95/#96 pada SHA final.

## Issue #99 — rebalance berdasarkan run exact-SHA pertama

Run [#41058481162](https://github.com/milyarderpro/content-producer/actions/runs/41058481162) pada `aa0c38bd1d9df941128802a0c4848d507a8f6077` **PASS 12m01s**; artifact aman mengukur shard 1 **670,972 s** total, database **377,191 s** (21 file/108 kasus), MCP **13,356 s** (15 file/82 kasus), Inspector **111,030 s** (33 valid/33 invalid dan owner denial), start **96,949 s**, reset **32,117 s**, cleanup **21,493 s**. Shard 2 **418,238 s** total, database **246,227 s** (20 file/74 kasus), start **104,191 s**, reset **33,091 s**, cleanup **14,938 s**. Agregat memvalidasi **41 file unik/182 kasus**, ketiga artifact dan seluruh tahap wajib PASS. Laporan ini **tidak menyediakan timing per-file**.

Dua file dipindah **dari shard 1 ke shard 2**: `api-trivia-public-gold.test.ts` dan `api-post-approval-quality.test.ts`. Profil serial **lokal diagnostik historis** Issue #95 memperkirakan masing-masing **65,080 s** dan **52,880 s**, total **117,960 s**; angka lokal ini **bukan** timing Actions pada run #41058481162. Proyeksi sederhana dengan asumsi transfer biaya serupa: shard 1 ~**553 s (9m13s)**, shard 2 ~**536 s (8m56s)**, di luar ketidakpastian perubahan hardware, overhead fixture, cross-run variance dan antrian aggregate. Jika perhitungan dari awal workflow mengikuti overhead run sebelumnya, wall clock dapat tetap lebih dari 10 menit. Proyeksi **NOT RUN / belum divalidasi**; target <=10 menit untuk tiga run identik tetap belum terbukti.

Partisi baru **19+22 file**; 41 nama tepat sekali terhadap manifest, 182 kasus wajib PASS pada aggregate tanpa skipped. Shard 1 tetap memegang MCP/Inspector **tepat sekali**; kedua shard tetap menjalankan stack/start/reset/fixtures mandiri, database serial, audit pre/post/final, migration/history, lint, local security advisors, whitespace dan cleanup. Tidak ada perubahan runner, gate lama, workflow rilis atau CR-052 yang masih **PROPOSED — NOT EFFECTIVE**. Full candidate pada partisi baru dan G4 **NOT RUN**; orchestrator yang akan dispatch pada SHA integrasi final.

## Status setelah cutover G4 (31 Oktober 2026)

Dokumen di atas adalah sejarah desain dan pengukuran Issue #88/#96/#99;
`NOT RUN` awal tetap berlaku pada scope waktu tersebut.
Sejak merge [PR #105](https://github.com/milyarderpro/content-producer/pull/105)
(`ca5c43597af97c95ea9eaa87876237fd2d45e10c`), [CR-052](../decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md) **efektif** sebagai gate rilis
manual exact final SHA `main`. Tiga Actions formal pada
`a64a55ebb1e3c76112cd211724c2eb6bc256699a`:
[#41072354433](https://github.com/milyarderpro/content-producer/actions/runs/41072354433) **9m41s**, [#41074001136](https://github.com/milyarderpro/content-producer/actions/runs/41074001136) **9m43s**, dan [#41157962349](https://github.com/milyarderpro/content-producer/actions/runs/41157962349) **9m50s**. Partisi **19+22 = 41 file/182 kasus DB**,
MCP **15/82**, Inspector **33 valid/33 invalid + owner denial** tepat sekali
di shard 1, local security advisors terpisah, migration/history/lint,
audit RLS/grants/ACL/fixture dan cleanup, serta source dan aggregate PASS.
Lokal `gate:full` **18m50s** dengan `DIAGNOSTIC_CONFIG_OVERLAY` **bukan**
bukti formal exact-config. CR-020/044 tetap kontrol keamanan; workflow legacy
`backend-technical-gate.yml`/`pnpm run test-all` adalah rollback, bukan
release gate utama. Tidak ada required check/branch protection otomatis,
deployment, OAuth hosted, atau live business Write yang dibuktikan.
