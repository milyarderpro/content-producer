# CR-052 — Full backend gate equivalence, source/backend evidence, and cutover

- **Tanggal:** 2026-10-29
- **Status keputusan G4:** **EFEKTIF sejak merge PR #105** pada
  `ca5c43597af97c95ea9eaa87876237fd2d45e10c` (31 Oktober 2026), setelah orchestrator
  menerima kesetaraan cakupan dan model bukti. Gate rilis formal adalah
  Actions manual exact-SHA, bukan required check otomatis, izin deployment,
  hosted OAuth atau production business Write.
- **Baseline source:** `main` merge
  [PR #73](https://github.com/milyarderpro/content-producer/pull/73),
  `4191caf7943e313b43ab0dc52f4311165e6c229d`. Bukti pengukuran dari
  [22 Okt](https://github.com/milyarderpro/content-producer/actions/runs/39768822314) dan
  [26 Okt](https://github.com/milyarderpro/content-producer/actions/runs/40364895835) adalah
  **HISTORICAL PASS** pada SHA masing-masing, bukan kandidat release G1.
- **Relasi:** merancang pengganti pemeriksaan yang diwajibkan
  [CR-020](2026-10-15-phase-9-10-risk-based-mvp-acceptance.md) dan urutan/reuse
  [CR-044](2026-10-20-phase-10-gate-order-and-backend-sha-reuse.md). CR-020/044
  tetap **kontrol keamanan wajib**. Sejak merge PR #105 gate rilis aktif
  `.github/workflows/backend-gate-candidate.yml` **manual exact final SHA
  `main`**, dengan source, dua shard dan aggregate PASS. Workflow legacy
  `backend-technical-gate.yml` dan `pnpm run test-all` tetap rollback.
- **Landasan penilaian:**
  [rencana G1–G4](../../plans/full-backend-gate-optimization-implementation-plan.md),
  [baseline/inventaris](../gate-optimization/baseline-and-inventory.md),
  [matriks invariant/case](../gate-optimization/invariant-matrix.md), [testing](../testing.md),
  [operations](../operations.md), [AGENTS](../../AGENTS.md).

## Masalah dan ruang keputusan

`backend-technical-gate.yml` pada `main` memakai satu Supabase ephemeral stack dan clean reset,
`pnpm run test:mcp` sebelum Inspector, audit, HTTP/Inspector 33 tools, audit lagi,
`pnpm run test-all`, applied migration history, DB lint, final RLS/ACL/audit, whitespace, dan
redacted evidence. `scripts/test-all.ts` mengulang `test:mcp`; duplikasi **pemanggilan suite** ini
terbukti pada source dan run 26 Okt. `test:database` memakai Vitest serial atas shared DB. Hipotesis
overhead `supabase db query` tidak terbukti secara kausal: instrumentasi G2 wajib, bukan alasan
melonggarkan invariant.

Bagian rancangan G1 berikut menjelaskan semantik yang kemudian diimplementasikan pada G3.
Target ≤10 menit pada **tiga run GitHub di SHA identik** telah dibuktikan pada
`a64a55ebb1e3c76112cd211724c2eb6bc256699a` (9m41s, 9m43s, 9m50s), tanpa
mengurangi syarat keamanan. Durasi per-case/query dalam snapshot G1 tetap **UNKNOWN**.

### Gap advisors pada gate legacy (historis; tertutup pada kandidat)

[CR-020](2026-10-15-phase-9-10-risk-based-mvp-acceptance.md) mewajibkan
**local security advisors** **selain** catalog/RLS/grant audit. Source
[workflow backend](../../.github/workflows/backend-technical-gate.yml)
dan log [39768822314](https://github.com/milyarderpro/content-producer/actions/runs/39768822314)
serta [40364895835](https://github.com/milyarderpro/content-producer/actions/runs/40364895835)
memperlihatkan `pnpm exec supabase db lint --local --fail-on error` dan audit
katalog; **tidak ada command/output advisor lokal terpisah yang terbukti**.
Catatan workflow tentang _hosted_ Security Advisor tidak membuktikan
pelaksanaan _local_ security advisors. **Pada legacy: NOT EVIDENCED**, bukan PASS.
**Pada kandidat:** `supabase db advisors --local --type security` dijalankan terpisah
pada kedua shard dengan argumen `--level info --fail-on error --output-format json`.
Tahap advisors dan laporan lokal PASS; lokal tetap diagnostik karena config overlay.
Detail gap legacy ada pada [baseline G1](../gate-optimization/baseline-and-inventory.md).

## Kontrak pengganti `pnpm run test-all` (rancangan G1, kini diimplementasikan G3)

Manifest versioned dan perintah `gate:source`, `gate:backend`, serta `gate:full`
**sudah diimplementasikan** pada kandidat. Rincian berikut menetapkan cakupan yang wajib
bertahan, bukan klaim bahwa setiap command menjalankan semua tahap pada setiap shard.

1. **`gate:source` — satu PASS source** pada candidate commit/working tree bersih: `pnpm run check`
   dengan format, lint, typecheck, root Vitest, frontend typecheck/build/Node tests; package
   source/ZIP validation serta MCP-probe bila path/dependency memerlukan; verifikasi lockfile dan
   versi pin. Output harus mencantumkan semua sub-command, koleksi test dan status, bukan satu PASS
   agregat yang menutupi skip.
2. **`gate:backend` — satu PASS backend** di Supabase Docker ephemeral **lokal terisolasi**, tanpa
   linked/remote/production credential: locked install, CLI/Deno preflight dan assertion local-only
   → `pnpm run supabase:start` → **tepat satu** `pnpm run supabase:reset` dari clean state →
   `pnpm run verify-migrations` untuk nama migration → **tepat satu eksekusi penuh**
   `pnpm run test:mcp` (Deno check/lint/semua 15 test) **sebelum** Inspector →
   `scripts/phase-6-catalog-audit.ts` untuk baseline clean fixture/RLS/ACL → `scripts/phase-6-13.ts`
   authenticated HTTP + Inspector (lihat bagian berikut) → audit sesudah Inspector → **tepat satu**
   `pnpm run test:database` untuk setiap file/case wajib di manifest → `pnpm run supabase:verify`
   applied/source migration history → `pnpm exec supabase db lint --local --fail-on error` → final
   catalog/grants/RLS/privilege/security/fixture cleanup audit → `git diff --check` → redacted
   evidence/artifact. Jika command audit juga memeriksa migration atau fixture, pertahankan semua
   point-in-time; status berulang bukan alasan untuk menghapus audit.
3. **`gate:full` — bukti gabungan**: jalankan komponen `gate:source` dan `gate:backend` yang sama
   dengan yang dipakai Actions; paralel di GitHub diperbolehkan dengan SHA sama, sementara lokal
   dapat mengorkestrasi tanpa mengubah manifest. **Pengganti kontraktual CR-020 untuk
   `pnpm run test-all` adalah konjungsi PASS `gate:source` + PASS `gate:backend` + evidence
   manifest/sha**, bukan mengganti `test-all` dengan `test:database` saja. Urutan check,
   migration-name, MCP, DB yang dahulu berada di `test-all` dipertahankan melalui dua komponen tadi;
   satu-satunya pengurangan yang sudah terbukti adalah pengulangan `test:mcp` yang identik.
4. **Aktivasi bersyarat:** sebelum merge PR #105, `pnpm run test-all` dan
   `backend-technical-gate.yml` tetap jalur rilis yang berlaku. Setelah merge, gate
   **manual exact-SHA** kandidat menjadi bukti pemeriksaan rilis formal dari Actions;
   workflow legacy dan `test-all` tidak dihapus, tetap jalur rollback.

**Local security advisors wajib terpisah** dari DB lint dan audit katalog/RLS/grant.
Kandidat menjalankan `supabase db advisors --local --type security` dengan output JSON
tervalidasi pada masing-masing shard; ketiga run exact-SHA dan pemeriksaan lokal
tercatat PASS. Tahap advisor yang hilang, gagal, atau disamakan dengan lint/audit
**wajib fail-closed**, tanpa pengecualian implisit terhadap CR-020/CR-044.

## Urutan CR-044 dan Inspector tidak boleh direduksi

Urutan backend setelah reset adalah **focused OAuth/owner → audit sebelum Inspector → authenticated
Inspector 33 tool valid/invalid/denial → audit sesudah Inspector → suite database panjang → applied
history + DB lint + audit akhir**. Ini mempercepat _failure feedback_ dan menghindari kegagalan
Inspector setelah DB lama, tanpa membuang tes.

Inspector wajib menggunakan host HTTP loopback + token owner sintetis yang valid dan principal
non-owner terpisah, bukan hanya mocked `mcp/transport_test.ts`. Buktikan `initialize`,
`tools/list`, batas auth/resource, **semua 33 tool valid dan invalid calls** sesuai kontrak,
unauthorized/no token/inactive owner/cross-owner denial (termasuk HTTP 403 bila diniatkan), stable
JSON-RPC errors, tidak ada mutation ilegal, serta kebersihan fixture sesudahnya. Catat
tool/count/result dan evidence sanitasi tanpa token/payload privat.
`scripts/phase-6-13.ts --preflight` tetap berpotensi membuat fixture/write lokal; **bukan**
pengganti Inspector ataupun dry-run no-write. `mcp-probe/handler_test.ts` adalah jalur lain yang
conditional, bukan bagian `test:mcp`.

`scripts/phase-6-catalog-audit.ts` harus tetap memeriksa 72 migration source/pinned hashes, applied
history, 33 RPC, 15 tabel RLS, owner privilege, default ACL, helper/table/sequence grants, serta
clean fixture. `verify-migrations` sendiri hanya memvalidasi nama file; `supabase:verify` tidak
menggantikan DB lint atau audit hash. Inspector dan DB tests tidak mengizinkan schema/ACL
dilemahkan.

## Syarat SHA dan aturan reuse

- **Satu kandidat identik:** setiap status formal per komponen memuat `git rev-parse HEAD` 40 hex,
  commit SHA, base SHA, manifest SHA/hash, dependency lockfile/pin, migration hashes, source/fixture
  hashes dan klasifikasi diff. Source PASS dari SHA A + backend PASS SHA B **tidak boleh** digabung,
  sekalipun keduanya hijau. Jangan mengambil PASS dari run yang sedang berlangsung.
- **Lokal:** checkout pada SHA dipin dan stack terisolasi boleh memakai overlay
  **hanya `project_id` dan port** untuk reproduksibilitas, tetapi hasilnya harus berlabel
  `DIAGNOSTIC_CONFIG_OVERLAY` dan **tidak menjadi PASS formal exact-config**.
  Perubahan security config, migration, fixture, daftar suite, linked DB, atau SHA
  tidak identik **fail-closed**; dirty checkout tidak dapat dipromosikan menjadi bukti formal.
- **Reuse backend mengikuti CR-044:** bila deployed backend source, semua migration,
  authorization/security config dan runtime dependencies benar-benar _bit-for-bit_ identik dengan
  kandidat PASS/yang ter-deploy, docs-only atau package-only commit boleh mereferensikan backend
  **PASS historis yang berlabel backend SHA aslinya**. Catat docs/package/merge SHA terpisah dan
  jalankan light/focused/MCP/manual cards yang terdampak. Reuse **bukan** PASS exact-SHA gabungan
  untuk dokumen atau kode baru, dan tidak boleh menyembunyikan perubahan security/dependency. Bila
  fakta identitas tidak dapat dibuktikan, **fail closed dan rerun gate lama** sebelum deploy.
- **G4 comparison lebih ketat daripada reuse:** bandingkan gate lama dan baru pada **kandidat
  backend/source SHA yang sama**, test fixtures dan toolchain yang terkunci. Bandingkan
  assertion/invariant manifest, expected negative security cases, stage PASS, status skip, case
  count dan audit evidence. Reuse dari SHA lama bukan bukti perbandingan G4.

## PASS, BLOCKED, dan fail closed

Bukti gabungan minimal: identity kandidat, manifest berisi status untuk tiap group/case (termasuk v1
dan optional), jumlah file/kasus, run ID/URL, timestamps + durasi tiap tahap dan top lima file,
migration/history/lint, cross-owner denial, Inspector 33 valid/invalid, catalog/ACL/RLS/fixture
pre/post/final, source/frontend, perubahan dan redaction/artifact. Jika timing case/query tidak
tersedia tulis `UNKNOWN`; jika check tidak dijalankan tulis `NOT RUN`; jika API/runner menolak
atau data tidak dapat diambil tulis `BLOCKED` dengan alasan dan URL. `SKIPPED` tidak boleh disamakan
dengan PASS bila invariant wajib terdampak.

`gate:full` harus exit nonzero dan melaporkan `FAIL` pada sub-command wajib gagal, file/case wajib
hilang, manifest drift, migration/source mismatch, unexpected skip, RLS/grant denial fail, test race
flake, Inspector missing/failed, audit cleanup kotor, dirty checkout formal, SHA berbeda, token
leak, atau evidence wajib hilang. Jika pihak luar belum dapat membuktikan status, gunakan `BLOCKED`; jangan menganggap sukses dari HTTP 200, green light CI, merge PR, atau deploy metadata. CI fixture
PASS tidak membuktikan real ChatGPT owner OAuth atau business Write production.

Semua write test menggunakan fixture ephemeralnya sendiri tanpa credential production; tidak ada
hosted action atau akses produksi sebagai jalan pintas. Role/JWT, separate sessions, lock timeout,
semantik ledger replay dan cross-owner denial tidak boleh diganti mock ringan yang kehilangan
kontrak. `fileParallelism: true` pada DB bersama tidak diterima tanpa isolasi antar file.

## Acceptance G4 dan mekanisme aktivasi yang disetujui

1. **G1** menyetujui inventaris G1-T1, matriks invariant/case G1-T2, dan rancangan CR G1-T3 sebelum
   G2 mengubah helper/suite. Status tersebut adalah **snapshot historis G1**, bukan status G4 kini.
2. **G2** mengukur overhead query/proses via instrumentasi tanpa rahasia, lalu membuktikan
   equivalence input/role/JWT/session/DB error pada test lambat. Setiap
   penggabungan/pemindahan/penghapusan harus punya `old_case → new_case/check → assertion/evidence`. Tidak ada pengurangan hanya karena nama `phase`; v1 dan archived compatibility tetap wajib
   bila runtime mendukungnya.
3. **G3** menghadirkan `gate:source`, `gate:backend`, `gate:full`, manifest yang sama
   lokal/Actions, signature SHA, local-only refusal, focused PR checks serta sanitasi output. Audit
   required checks dan klasifikasi CI terhadap perubahan file sebelum mengubah workflow.
4. **G4-T1** jalankan gate lama dan gate calon pada satu exact SHA kandidat dalam isolated
   environment, bandingkan manifest/case count, hasil, owner/cross-owner, grants/RLS, Inspector dan
   cleanup. **G4-T2** buktikan local+GitHub yang sama dan profil **tiga** full runs GitHub identik
   (target ≤10m; jika gagal, laporkan durasi dan kembali optimasi tanpa melemahkan gate). Setiap
   kegagalan atau fixture discrepancy menghentikan cutover.
5. **G4-T3:** orchestrator telah menyetujui kesetaraan cakupan dan tiga run pada
   [review PR #105](https://github.com/milyarderpro/content-producer/pull/105#issuecomment-6537758736).
   **Keputusan CR-052 efektif pada merge PR #105, bukan sebelum merge.** Gate rilis
   formal adalah workflow kandidat manual exact-SHA dengan agregasi PASS; required status
   contexts/branch protection **belum dikonfigurasi** dan tidak mengotomatiskan pemeriksaan.
   Tidak ada auto-merge, deployment otomatis, hosted OAuth atau izin business Write.

**Bukti advisors G4:** tahap terpisah PASS pada Actions exact-config dan run lokal
berlabel diagnostik di SHA identik; DB lint/catalog audit bukan penggantinya.
Keputusan orchestrator menerima model bukti Actions formal + lokal diagnostik terbatas.
Setiap deviasi overlay di luar `project_id`/port atau kehilangan tahap advisor
**memblokir rilis (fail-closed)**. Penerapan telah aktif sejak merge PR #105 pada `ca5c43597af97c95ea9eaa87876237fd2d45e10c`.

## Rollback

Pertahankan `backend-technical-gate.yml` /command `pnpm run test-all` dan artefak lama selama
observasi G3/G4. Jika gate baru false positive/negative, hilang case, gagal menyatukan SHA, merusak
isolated runner atau memendekkan Inspector: **blok deployment**, kembalikan required checks dan
entrypoint workflow ke gate CR-020/044, jalankan ulang **satu full gate lama** pada final backend
SHA yang tepat di stack ephemeral, catat alasan/diff dan perbaiki manifest. Jangan mengembalikan
migration yang sudah ter-deploy atau menjalankan destructive production reset. Rollback workflow
adalah perubahan CI terpisah, bukan operasi produksi.

## Status keputusan dan hal yang harus ditinjau

- **Historis G1:** pengulangan `test:mcp` pada legacy, 41 file/180 tes pada 26 Oktober dan
  40/176 pada 22 Oktober; data per-case/query G1 tetap historis dan tidak disulap menjadi timing baru.
- **Diterima pada G4:** tiga Actions exact-SHA PASS ≤10 menit, 41 file/182 kasus DB, MCP,
  Inspector, audit, advisors dan cleanup; review orchestrator tercatat pada PR #105.
- **Masih terbatas:** endpoint branch protection detail tidak dapat dibaca konektor (403),
  required contexts belum disetel, dan bukti lokal overlay bukan formal exact-config.
  **CR-052 efektif sejak merge PR #105;** tidak ada deployment atau live PASS.

## Riwayat rancangan Issue #96 (status saat itu; implementasi kini diverifikasi)

Arsitektur kandidat memperbolehkan **dua runner GitHub/stack Supabase mandiri** dengan reset dan fixture masing-masing, MCP **15 file/82 kasus** dan Inspector authenticated **33 valid/33 invalid dengan owner denial tepat sekali pada shard 1**, sementara file DB tetap serial per shard (21+20). Partisi versioned harus tepat seluruh 41 file mandatory, disjoint, tanpa kasus dihapus; run lokal tanpa pilihan shard tetap mengeksekusi manifest lengkap. Aggregate wajib memeriksa status tiap job, report tiap shard, status semua tahap, SHA kandidat dan hash manifest/lock/input/partisi, count file serta **tepat 182 kasus database** tanpa skipped, dan bukti MCP/Inspector wajib PASS tepat satu kali pada shard 1 (hilang, gagal, duplikat, atau salah shard ditolak). Pada PR #96 bukti dua-shard memang belum tersedia; kini telah diverifikasi oleh tiga
Actions pada SHA `a64a55ebb1e3c76112cd211724c2eb6bc256699a`. Tidak ada pengurangan
kewajiban CR-020/CR-044.

## Issue #99 — rebalance berdasarkan run exact-SHA pertama

Run [#41058481162](https://github.com/milyarderpro/content-producer/actions/runs/41058481162) pada `aa0c38bd1d9df941128802a0c4848d507a8f6077` **PASS 12m01s**; artifact aman mengukur shard 1 **670,972 s** total, database **377,191 s** (21 file/108 kasus), MCP **13,356 s** (15 file/82 kasus), Inspector **111,030 s** (33 valid/33 invalid dan owner denial), start **96,949 s**, reset **32,117 s**, cleanup **21,493 s**. Shard 2 **418,238 s** total, database **246,227 s** (20 file/74 kasus), start **104,191 s**, reset **33,091 s**, cleanup **14,938 s**. Agregat memvalidasi **41 file unik/182 kasus**, ketiga artifact dan seluruh tahap wajib PASS. Laporan ini **tidak menyediakan timing per-file**.

Dua file dipindah **dari shard 1 ke shard 2**: `api-trivia-public-gold.test.ts` dan `api-post-approval-quality.test.ts`. Profil serial **lokal diagnostik historis** Issue #95 memperkirakan masing-masing **65,080 s** dan **52,880 s**, total **117,960 s**; angka lokal ini **bukan** timing Actions pada run #41058481162. Proyeksi sederhana dengan asumsi transfer biaya serupa: shard 1 ~**553 s (9m13s)**, shard 2 ~**536 s (8m56s)**, di luar ketidakpastian perubahan hardware, overhead fixture, cross-run variance dan antrian aggregate. Jika perhitungan dari awal workflow mengikuti overhead run sebelumnya, wall clock dapat tetap lebih dari 10 menit. **Proyeksi historis saat Issue #99**; kemudian tervalidasi secara empiris sebagai tiga run
Actions 9m41s, 9m43s dan 9m50s pada SHA `a64a55e…`, bukan timing per-file.

Partisi baru **19+22 file**; 41 nama tepat sekali terhadap manifest, 182 kasus wajib PASS pada aggregate tanpa skipped. Shard 1 tetap memegang MCP/Inspector **tepat sekali**; kedua shard tetap menjalankan stack/start/reset/fixtures mandiri, database serial, audit pre/post/final, migration/history, lint, local security advisors, whitespace dan cleanup. Perubahan partisi tidak mengubah runner atau gate legacy. Tiga candidate Actions pada partisi
baru kini **PASS**, dengan signoff cakupan orchestrator; CR-052 baru efektif pada merge PR #105.

## G4-T3 — keputusan bersyarat Issue #104 (review orchestrator 2026-10-31)

**DITERIMA untuk kesetaraan cakupan dan model bukti; EFEKTIF SETELAH PR #105 DI-MERGE.**
Keputusan ini tidak mengaktifkan required checks, memicu deployment, mengubah data production,
atau memberi izin business Write. Selama PR masih draft, gate legacy tetap berlaku.

### Perbandingan same-SHA dan delta final

- SHA pembanding: `aa0c38bd1d9df941128802a0c4848d507a8f6077`.
  [Candidate #41058481162](https://github.com/milyarderpro/content-producer/actions/runs/41058481162)
  **PASS 12m01s** (source, dua shard dan aggregate); database 21 file/108 kasus di shard 1,
  20 file/74 kasus di shard 2, total **41 file/182 kasus** tanpa skip; MCP 15 file/82 kasus,
  Inspector 33 valid/33 invalid serta owner denial.
- [Legacy #41060272610](https://github.com/milyarderpro/content-producer/actions/runs/41060272610)
  **PASS 15m26s** pada SHA sama, dengan reset, MCP/Inspector, 41 file/182 kasus DB, migration
  history, DB lint, audit RLS/grant/ACL/fixture dan cleanup. Selisih 3m25s menguntungkan
  kandidat, namun kedua run itu saja belum membuktikan target tiga run.
  **Gap historis legacy:** tidak ada bukti tahap local security advisors mandiri;
  DB lint dan audit tidak boleh dihitung sebagai advisors.
- Delta dua commit menuju `a64a55ebb1e3c76112cd211724c2eb6bc256699a`
  mengubah enam path: partisi DB **21+20 → 19+22** dengan memindahkan
  `api-trivia-public-gold.test.ts` dan `api-post-approval-quality.test.ts` ke shard 2;
  satu regresi source mengunci dua hotspot serta 41 file disjoint, disertai dokumentasi.
  Tidak ada perubahan migration, security config, runtime backend, lockfile, atau job kandidat.

### Bukti final dan signoff kesetaraan

- [Candidate #41072354433](https://github.com/milyarderpro/content-producer/actions/runs/41072354433):
  **PASS 9m41s**.
- [Candidate #41074001136](https://github.com/milyarderpro/content-producer/actions/runs/41074001136):
  **PASS 9m43s**.
- [Candidate #41157962349](https://github.com/milyarderpro/content-producer/actions/runs/41157962349):
  **PASS 9m50s**.

Run ketiga membuktikan source **12 file/91 kasus**; DB shard 1 **19 file/97 kasus**,
shard 2 **22 file/85 kasus**, aggregate **PASS**, total **41 file/182 kasus DB**.
MCP **15 file/82 kasus** dan authenticated Inspector **33 valid/33 invalid + owner denial**
PASS tepat sekali di shard 1. Kedua shard mempertahankan isolated start/reset,
migration names/history, DB lint, **local security advisors terpisah** dengan laporan
tervalidasi, audit katalog RLS/grant/ACL/fixture before/after/final, whitespace dan cleanup.
Ketiga run source, kedua DB job dan aggregate completed/success pada SHA yang sama.
Orchestrator [menyetujui kesetaraan cakupan dan target tiga run](https://github.com/milyarderpro/content-producer/pull/105#issuecomment-6537758736).
Ini **CI/fixture evidence**, bukan bukti hosted owner OAuth, deployment, atau live business Write.

Pemeriksaan lokal `gate:full` pada SHA yang sama **PASS 18m50s untuk seluruh tahap**
termasuk advisors, namun labelnya **`DIAGNOSTIC_CONFIG_OVERLAY`**, sehingga
**bukan** PASS formal exact-config; laporan aman tetap pada handoff implementer,
bukan payload/machine ID/port/token/SQL/fixture yang diunggah ke GitHub.

### Keputusan eksplisit: dua jenis bukti, batas overlay, fail-closed

1. **Formal release evidence** hanya dari GitHub Actions manual exact-SHA pada
   `main`, clean checkout dengan **committed `supabase/config.toml` exact-config**
   (`ACTIONS_EXACT_CONFIG`), source dan kedua DB shard serta aggregate PASS;
   identitas `candidate_sha`, `github.sha`, checkout SHA, hash manifest/lock/
   input/partisi dan semua report harus cocok. PASS yang diambil dari SHA berlainan
   atau PR head tidak diterima untuk release.
2. **Diagnostik reproduksibilitas lokal** menggunakan checkout SHA dan suite
   yang identik, tetapi overlay isolasi PC hanya boleh mengganti
   **`project_id` dan port**. Selalu label `DIAGNOSTIC_CONFIG_OVERLAY`;
   **jangan pernah mempromosikannya menjadi formal exact-config PASS**.
   Jika overlay ikut mengubah **security config, migration, fixture, daftar/isi
   suite**, identitas SHA atau invariant lain, **fail-closed**: jangan terima
   diagnostik sebagai pemenuhan kontrak, blok keputusan rilis, pulihkan input
   dan ulangi verifikasi yang diwajibkan pada lingkungan aman.
3. Seluruh kewajiban CR-020/CR-044 tetap: source/frontend, DB 41/182, MCP,
   Inspector 33/33 + owner/non-owner denial, audit RLS/grants/default ACL/fixture,
   migration/history, DB lint **dan advisors terpisah**, cleanup,
   evidence teredaksi dan aggregate fail-closed. Hasil hilang, skip, gagal,
   mismatch atau secret exposure memblokir rilis.
4. Setelah merge PR #105, release operator memakai
   `.github/workflows/backend-gate-candidate.yml` secara **manual** dari
   `main` dengan exact final SHA dan memeriksa source, dua database jobs,
   aggregate serta tiga report aman. **Belum ada required status context maupun
   branch protection** yang mengotomatiskan gate; keputusan rilis memeriksa
   URL run, SHA, semua tahap dan aggregate secara manual. Required-check
   automation membutuhkan penetapan dan review terpisah, bukan bagian PR ini.
5. Workflow legacy `.github/workflows/backend-technical-gate.yml` dan
   `pnpm run test-all` **tetap utuh sebagai rollback**. Jika release evidence
   gagal atau false-negative/positive teridentifikasi, blok deployment, pilih
   jalur rollback melalui keputusan berwenang, jalankan legacy full gate pada
   final SHA yang benar di stack ephemeral, dan dokumentasikan hasil.
   Jangan melakukan destructive reset/migration production untuk rollback CI.

**Kondisi efektivitas telah terpenuhi:** PR #105 di-merge orchestrator ke
`main` pada `ca5c43597af97c95ea9eaa87876237fd2d45e10c`. Ini mengaktifkan gate rilis
**manual**, bukan required check ataupun deployment otomatis. Bukti formal
untuk setiap rilis berikutnya tetap harus diperiksa pada exact final SHA
`main`; tiga run G4 yang tercatat adalah kesetaraan historis pada SHA
`a64a55ebb1e3c76112cd211724c2eb6bc256699a`.
