# Gate rilis G4 — Actions manual exact-SHA (riwayat G3 dan keputusan G4)

**Status:** rancangan Issue #90 adalah riwayat G3. Orchestrator telah menerima kesetaraan G4
pada SHA `a64a55ebb1e3c76112cd211724c2eb6bc256699a`; **CR-052 efektif hanya
setelah PR #105 di-merge**. Sebelum merge gate legacy tetap berlaku; setelah merge
workflow ini menjadi gate rilis **manual exact-SHA** dan legacy/`test-all` tetap rollback.

## Kontrak eksekusi

`.github/workflows/backend-gate-candidate.yml` hanya mempunyai `workflow_dispatch` pada `main`. Input `candidate_sha` berupa 40 hex lowercase harus sama dengan `github.sha`, `git rev-parse HEAD`, dan HEAD branch main sebelum dependensi, stack, atau reset dijalankan. Source job dan kedua database shard memakai checkout SHA yang sama pada tiga runner independen dan dapat berjalan paralel. Aggregate `if: always()` mewajibkan source job serta kedua job matrix database sukses, ketiga laporan berstatus PASS dan identitas SHA serta empat SHA-256 manifest/lock/input/partisi identik, ditambah file/case evidence yang lengkap. Output hilang, skipped, salah hash, atau perbedaan SHA gagal tertutup. Tidak ada path PR atau push yang memicu full kandidat otomatis.

Mode backend `ACTIONS_EXACT_CONFIG` hanya boleh melalui GitHub Actions dispatch yang terverifikasi; config Supabase di checkout diverifikasi byte-for-byte dengan `git show HEAD:supabase/config.toml`. Tidak ada salinan config overlay. Ini berarti stack memakai committed project ID `content-producer` dan port `54320..` pada hosted runner sementara yang harus kosong dari sumber daya Supabase. Tindakan ini **tidak aman di PC lokal yang dipakai pengguna**: `GATE_CONFIG_MODE=ACTIONS_EXACT_CONFIG` saja tidak memberi akses formal. Mode lokal tetap memakai `issue-88-…-disposable`/port 58000–64000 dan menghasilkan label `DIAGNOSTIC_CONFIG_OVERLAY`, bukan PASS exact-SHA.

Kedua shard database masing-masing mempertahankan satu start dan satu reset (total **dua start dan dua reset** di dua stack Supabase mandiri), validasi 72 migration, audit katalog sebelum/sesudah tahap authenticated, **19+22 = 41 file database wajib**, serial dalam masing-masing shard, dengan **tepat 182 kasus** teragregasi, migration history, DB lint, **local security advisors terpisah**, final audit, whitespace, serta cleanup. Status `NOT RUN` ditulis untuk tahap wajib yang belum dilaksanakan pada kegagalan preflight/awal. Bukti JSON hanya menyimpan SHA dan hash, versi pin, label mode, nama/status/durasi tahap, count aman, lima tahap terlama, dan alasan kegagalan berupa kode tetap. Output child mentah tidak dicetak atau diunggah; jangan menyimpan token, JWT, SQL, fixture, atau payload pribadi.

## Preflight implementasi dan batas biaya

- Base SHA: `ebded963d9db57030aafa5555abfab6cde4c2f25`; branch `codex/issue-90-candidate-actions`; hanya empat path yang dimiliki Issue #90.
- Riwayat light CI: run [41001066370](https://github.com/milyarderpro/content-producer/actions/runs/41001066370) pada base SHA, success, 2026-10-30 04:06:53–04:07:47 UTC (~54 detik). Estimasi light CI PR sekitar **1 menit**, dapat bertambah untuk MCP/probe/package karena perubahan workflow memicu classifier CI.
- Historical backend candidate G3-T1: ~19m27s diagnostik, belum PASS formal. **Tidak dispatch** full candidate atau full legacy gate pada PR ini; pembuktian exact-SHA dan pembandingan di G4 setelah workflow stabil.
- Snapshot protection: main `protected=false`, required status check contexts kosong; rulesets `[]`. Endpoint detail branch protection tidak dapat dibaca konektor (403). Jangan mengubah required checks, branch rules, atau workflow lama.
- Pre-push harus memeriksa manifest/target, fokus runner/workflow, `pnpm run check`, Prettier, `git diff --check`, dan file diff. Periksa light CI pada head PR; hasil yang tidak dijalankan harus berlabel `NOT RUN`/ `BLOCKED`, bukan PASS.

## Bukti dan batas penerimaan

Tiga report aman berada dalam artifact `candidate-source-<sha>`, `candidate-db-shard-1-<sha>`, dan `candidate-db-shard-2-<sha>` (retensi 14 hari); summary agregat menyebut kandidat serta hasil konjungsi. Tidak ada raw logs dalam artifact. Kesetaraan cakupan dan target tiga run telah diterima orchestrator pada SHA final; efektivitas
CR-052 tetap bersyarat pada merge PR #105. Bukti Actions dengan committed exact config
adalah formal, sedangkan overlay PC hanya diagnostik. CI fixture bukan bukti OAuth hosted atau business Write production.

## Issue #96 — desain dua runner database (belum dieksekusi)

Base historis `01531fc8dc7bb1e6f9365525b7324a8fc9686b28`, branch
`codex/issue-96-isolated-db-shards`. Pada Issue #96 dua runner Ubuntu independen
membagi 41 file sebagai 21+20; setelah rebalance Issue #99 menjadi **19+22**.
Masing-masing tetap memakai stack, reset, serial Vitest, audit sebelum/sesudah/final,
migration history, DB lint, advisors terpisah dan cleanup. Shard list berada di `scripts/gate-db-shards.json` dan divalidasi terhadap seluruh 41 manifest entries.

Aggregate mengunduh tiga report aman, mensyaratkan source dan kedua job matrix database sukses serta seluruh stage PASS, SHA/hash manifest-lock-input-partisi identik, 41 file unik, **tepat 182 kasus** tanpa skip, dan Inspector 33/33 serta cross-owner denial. Pada tahap Issue #96 bukti runtime belum tersedia; **sekarang sudah PASS pada tiga run**
Actions final SHA. Tidak dispatch ulang dari PR #105. Satu-stack baseline [41011838448](https://github.com/milyarderpro/content-producer/actions/runs/41011838448) PASS 15m48s, DB sekitar 10m43s. Proyeksi dua stack sekitar **10m27–10m47s** wall clock dan tambahan **3–5 CI runner-minutes**, belum dibuktikan. Light CI base [41011729873](https://github.com/milyarderpro/content-producer/actions/runs/41011729873) PASS ~40s; estimasi light CI PR ~1 menit.

## Koreksi review PR #97 sesudah PR #98

Basis integrasi `main` adalah `c1e199ef47c9163433d5017d690f73522a0c8f29`. Database matrix checkout menggunakan `fetch-depth: 2` supaya `git diff --check HEAD^ HEAD` dapat dilaksanakan setelah suite. Agregasi menolak total 181 maupun 183; hanya **182 kasus** di 41 file mandatory yang sah. Light CI head PR sebelumnya [41039763627](https://github.com/milyarderpro/content-producer/actions/runs/41039763627) PASS dalam sekitar **46 detik**; estimasi light CI lanjutan sekitar satu menit. Pada tahap review #97 runtime G4 belum tersedia; kini **tiga run kandidat G4 PASS**.
Tidak dispatch ulang full gate dari PR #105.

## Pemilik tunggal MCP/Inspector (review akhir #97)

Shard **1** (profil 21 file DB) menjalankan `pnpm run test:mcp` **tepat sekali**, yaitu 15 file/**82 kasus**, lalu authenticated Inspector **33 valid/33 invalid beserta owner denial**. Shard **2** (20 file DB) tidak menjalankan kedua tahap tersebut. Kedua shard tetap menjalankan start, clean reset/fixture, audit before/after/final, database serial, migration/history, lint, security advisors, whitespace, dan cleanup secara independen. Aggregate memerlukan bukti PASS MCP dengan count 82 serta Inspector 33/33 hanya di shard 1, menolak bukti hilang/duplikat/salah shard/gagal; stage umum wajib PASS pada keduanya dan 41 file/**182 kasus DB** tetap wajib. Light CI head sebelumnya [41045728337](https://github.com/milyarderpro/content-producer/actions/runs/41045728337) PASS **57 detik**; estimasi berikutnya ~1 menit. Catatan saat review #97: runtime belum diuji; setelah integrasi **tiga Actions G4 PASS**.

## Issue #99 — rebalance berdasarkan run exact-SHA pertama

Run [#41058481162](https://github.com/milyarderpro/content-producer/actions/runs/41058481162) pada `aa0c38bd1d9df941128802a0c4848d507a8f6077` **PASS 12m01s**; artifact aman mengukur shard 1 **670,972 s** total, database **377,191 s** (21 file/108 kasus), MCP **13,356 s** (15 file/82 kasus), Inspector **111,030 s** (33 valid/33 invalid dan owner denial), start **96,949 s**, reset **32,117 s**, cleanup **21,493 s**. Shard 2 **418,238 s** total, database **246,227 s** (20 file/74 kasus), start **104,191 s**, reset **33,091 s**, cleanup **14,938 s**. Agregat memvalidasi **41 file unik/182 kasus**, ketiga artifact dan seluruh tahap wajib PASS. Laporan ini **tidak menyediakan timing per-file**.

Dua file dipindah **dari shard 1 ke shard 2**: `api-trivia-public-gold.test.ts` dan `api-post-approval-quality.test.ts`. Profil serial **lokal diagnostik historis** Issue #95 memperkirakan masing-masing **65,080 s** dan **52,880 s**, total **117,960 s**; angka lokal ini **bukan** timing Actions pada run #41058481162. Proyeksi sederhana dengan asumsi transfer biaya serupa: shard 1 ~**553 s (9m13s)**, shard 2 ~**536 s (8m56s)**, di luar ketidakpastian perubahan hardware, overhead fixture, cross-run variance dan antrian aggregate. Jika perhitungan dari awal workflow mengikuti overhead run sebelumnya, wall clock dapat tetap lebih dari 10 menit. Proyeksi ini **historis dari Issue #99**; bukti aktual pasca-rebalance adalah
9m41s, 9m43s dan 9m50s pada SHA final yang sama, tanpa menganggap proyeksi
sebagai timing Actions per-file.

Partisi baru **19+22 file**; 41 nama tepat sekali terhadap manifest, 182 kasus wajib PASS pada aggregate tanpa skipped. Shard 1 tetap memegang MCP/Inspector **tepat sekali**; kedua shard tetap menjalankan stack/start/reset/fixtures mandiri, database serial, audit pre/post/final, migration/history, lint, local security advisors, whitespace dan cleanup. Tidak ada perubahan runner ataupun gate legacy dari rebalance; tiga run Actions pada
partisi baru kini **PASS** dan diterima orchestrator. CR-052 efektif **setelah
merge PR #105**; tidak ada full gate tambahan pada pekerjaan ini.

## Issue #104 — G4 final evidence, pre-push dan release manual (2026-10-31)

- **Base dan cakupan sebelum push:** `main` tetap
  `a64a55ebb1e3c76112cd211724c2eb6bc256699a`; PR #105 branch
  `codex/issue-104-g4-cutover` head sebelum revisi
  `b27a1c819baa7738dfd5ccc721e2ecb5f2a82271`. Batas diff:
  CR-052, AGENTS, testing, operations, candidate-actions, nama/deskripsi
  workflow kandidat serta `tests/workflow-config.test.ts` **hanya**
  untuk assertion nama workflow/aggregate. Legacy tetap utuh.
- **Estimasi light CI sebelum push:** [#41158307315](https://github.com/milyarderpro/content-producer/actions/runs/41158307315)
  pada head sebelumnya **PASS 58 detik**. Perkiraan run berikutnya
  **sekitar satu menit**, dapat bervariasi menurut Actions.
  Pemeriksaan fokus: assertion workflow, Prettier, `git diff --check`,
  `pnpm run check`; no full backend dispatch.
- **Audit same-SHA:** [candidate #41058481162](https://github.com/milyarderpro/content-producer/actions/runs/41058481162)
  **PASS 12m01s** versus [legacy #41060272610](https://github.com/milyarderpro/content-producer/actions/runs/41060272610)
  **PASS 15m26s** pada `aa0c38bd1d9df941128802a0c4848d507a8f6077`.
  Keduanya 41/182 DB dan MCP/Inspector; local security advisors
  mandiri tidak terbukti pada legacy tetapi ada dan PASS pada kandidat.
  Delta ke final SHA: dua hotspot ke shard 2, **19+22**, tambahan
  satu regresi source dan dokumentasi, tanpa pengurangan case.
- **Tiga Actions formal `ACTIONS_EXACT_CONFIG` pada `a64a55e…`:**
  [#41072354433](https://github.com/milyarderpro/content-producer/actions/runs/41072354433)
  **PASS 9m41s**,
  [#41074001136](https://github.com/milyarderpro/content-producer/actions/runs/41074001136)
  **PASS 9m43s**,
  [#41157962349](https://github.com/milyarderpro/content-producer/actions/runs/41157962349)
  **PASS 9m50s**. Run ketiga source **12 file/91 kasus**,
  shard 1 **19 file/97 kasus**, shard 2 **22 file/85 kasus**;
  aggregate **41 file/182 kasus DB** PASS, MCP **15/82**,
  Inspector **33 valid/33 invalid + owner denial**, audit, migration/
  history, DB lint, **advisors terpisah** dan cleanup PASS.
  Orchestrator menandatangani kesetaraan cakupan di
  [review #105](https://github.com/milyarderpro/content-producer/pull/105#issuecomment-6537758736).
- **Lokal pada SHA sama:** `gate:full` **PASS 18m50s** semua tahap
  tetapi **`DIAGNOSTIC_CONFIG_OVERLAY`**. Hanya `project_id` dan port
  yang boleh berubah untuk isolasi PC. Perubahan security config,
  migration, fixture, suite atau SHA **fail-closed**. Ini **tidak**
  menggantikan formal Actions committed exact config.
- **Keputusan operasi:** CR-052 diterima untuk cakupan/model bukti,
  **efektif setelah merge PR #105**. Workflow kandidat menjadi gate
  rilis **manual exact-SHA**: source, dua shard, aggregate dan semua
  report harus PASS pada SHA final. Tidak ada required status
  context/branch protection untuk mengotomatisasi gate; operator
  memeriksa run manual. Legacy dan `test-all` tetap rollback.
  Tidak ada deployment, hosted OAuth atau live business Write PASS.
  Draft ini menunggu review ulang head/CI dan merge orchestrator.
