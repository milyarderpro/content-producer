# CR-052 — Full backend gate equivalence, source/backend evidence, and cutover

- **Tanggal:** 2026-10-29
- **Status:** **PROPOSED — NOT ACCEPTED / NOT EFFECTIVE**; untuk review orchestrator
  [Issue #74](https://github.com/milyarderpro/content-producer/issues/74), G1-T3. Ini keputusan
  rancangan, **bukan** izin mengubah scripts, workflow, test, expected, deployment atau production
  Write.
- **Baseline source:** `main` merge
  [PR #73](https://github.com/milyarderpro/content-producer/pull/73),
  `4191caf7943e313b43ab0dc52f4311165e6c229d`. Bukti pengukuran dari
  [22 Okt](https://github.com/milyarderpro/content-producer/actions/runs/39768822314) dan
  [26 Okt](https://github.com/milyarderpro/content-producer/actions/runs/40364895835) adalah
  **HISTORICAL PASS** pada SHA masing-masing, bukan kandidat release G1.
- **Relasi:** merancang pengganti pemeriksaan yang diwajibkan
  [CR-020](2026-10-15-phase-9-10-risk-based-mvp-acceptance.md) dan urutan/reuse
  [CR-044](2026-10-20-phase-10-gate-order-and-backend-sha-reuse.md). **CR-020, CR-044, dan gate
  lama tetap sepenuhnya berlaku sampai G4-T3 membuktikan kesetaraan, menerima CR ini secara
  eksplisit, dan menyelesaikan cutover. Tidak ada supersession saat G1.**
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

CR ini menetapkan _semantik calon gate_, bukan implementasinya. Target ≤10 menit pada **tiga run
identik GitHub** adalah target optimasi G4, bukan tanda lulus keamanan jika gagal dicapai. Durasi
per-case/query pada snapshot ini **UNKNOWN**; jangan merekayasa angka.

### Kewajiban local security advisors yang belum terbukti

[CR-020](2026-10-15-phase-9-10-risk-based-mvp-acceptance.md) mewajibkan
**local security advisors** **selain** catalog/RLS/grant audit. Source
[workflow backend](../../.github/workflows/backend-technical-gate.yml)
dan log [39768822314](https://github.com/milyarderpro/content-producer/actions/runs/39768822314)
serta [40364895835](https://github.com/milyarderpro/content-producer/actions/runs/40364895835)
memperlihatkan `pnpm exec supabase db lint --local --fail-on error` dan audit
katalog; **tidak ada command/output advisor lokal terpisah yang terbukti**.
Catatan workflow tentang _hosted_ Security Advisor tidak membuktikan
pelaksanaan _local_ security advisors. **Status kewajiban: UNKNOWN /
NOT EVIDENCED**, bukan PASS. Detail dan alasan ada pada
[baseline G1](../gate-optimization/baseline-and-inventory.md).

## Keputusan yang diusulkan: pengganti tepat `pnpm run test-all`

Pada **G3** buat manifest versioned yang memuat daftar seluruh test, kasus aktif/opsional/historis,
shell command serta komponen berikut. **Nama perintah usulan** (`gate:source`, `gate:backend`,
`gate:full`) belum ada di `package.json`; menjalankannya sebelum implementasi tidak sah.

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
4. **Sampai cutover:** perintah asli `pnpm run test-all` dan `backend-technical-gate.yml` tetap
   wajib sebagaimana CR-020/044; `gate:full` hanya calon, tidak boleh diperlakukan sebagai bukti
   release.

**Amendemen wajib untuk `gate:backend` pada butir 2:** urutan yang
diusulkan harus menambahkan **langkah local security advisors yang eksplisit
dan terpisah** dari DB lint dan catalog/RLS/grant audit. Command/alat
yang secara sah memenuhi CR-020 saat ini **UNKNOWN**; G2/G3 harus
mengidentifikasinya, mengunci versi/lingkungan lokal, dan mengeluarkan
status, durasi, serta laporan teredaksi yang dapat diperiksa per SHA.
Sebelum bukti advisor PASS tersedia pada G4 (atau ada keputusan kontrak
eksplisit dari pemilik/orchestrator), `gate:full` **BLOCKED untuk cutover**
walaupun seluruh lint, katalog, dan test lulus. Tidak ada pengganti
implisit; CR-020/CR-044 tetap berlaku.

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
- **Lokal:** hanya clean checkout pada commit yang dipin dan stack terisolasi yang dapat
  menghasilkan gate evidence formal. Dirty working tree, altered local fixture/config atau linked DB
  menjadikan hasil **DIAGNOSTIC/NOT ACCEPTED**; tidak dipoles menjadi PASS untuk commit.
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

## Acceptance G4 dan cutover yang diusulkan

1. **G1** menyetujui inventaris G1-T1, matriks invariant/case G1-T2, dan rancangan CR G1-T3 sebelum
   G2 mengubah helper/suite. Status sekarang: **DRAFT / REVIEW REQUIRED**.
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
5. **G4-T3** baru setelah signoff owner/orchestrator atas coverage dan CR, update
   testing/operations/AGENTS, required checks, workflow release dan dokumentasi rollback dalam PR
   terpisah. Tidak ada default auto-merge, deployment otomatis atau izin business Write dari CR ini.
   **Effective date = UNKNOWN** sampai diterima; status sekarang NOT EFFECTIVE.

**Kriteria G4 yang memblokir cutover:** cocokkan **local security advisors**
dengan kewajiban CR-020 melalui command dan output terpisah di Actions
dan local runner pada kandidat SHA identik. Jika hasil masih UNKNOWN,
NOT RUN, atau BLOCKED, cutover **dilarang**; jangan menghitung DB lint
atau catalog audit sebagai PASS advisors. Perubahan kontrak apa pun
memerlukan keputusan eksplisit sebelum mengganti gate lama.

## Rollback

Pertahankan `backend-technical-gate.yml` /command `pnpm run test-all` dan artefak lama selama
observasi G3/G4. Jika gate baru false positive/negative, hilang case, gagal menyatukan SHA, merusak
isolated runner atau memendekkan Inspector: **blok deployment**, kembalikan required checks dan
entrypoint workflow ke gate CR-020/044, jalankan ulang **satu full gate lama** pada final backend
SHA yang tepat di stack ephemeral, catat alasan/diff dan perbaiki manifest. Jangan mengembalikan
migration yang sudah ter-deploy atau menjalankan destructive production reset. Rollback workflow
adalah perubahan CI terpisah, bukan operasi produksi.

## Status keputusan dan hal yang harus ditinjau

- **Terbukti:** `test:mcp` dua kali per full gate; 41 file/180 tes pada run 26 Okt, 40/176 pada run
  22 Okt; sample timing per-file dapat dibaca pada baseline. **Belum terbukti:** efektivitas
  optimasi query CLI, jumlah caserun SHA main terbaru, apakah kandidat usul pemindahan test
  mempunyai pengganti yang identik, serta pencapaian target 10 menit.
- **Review orchestrator:** kelengkapan matrix 41 file/parametric tests dan sumber v1; definisi
  manifest/runner dari G3; kewajiban Inspector 33 + audit pre/post; keamanan SHA reuse vs full
  equivalence; required check names serta fallback rollback.
- **Keputusan saat ini:** `PROPOSED`; belum mengganti CR-020/044. **Test/workflow/source/production
  tidak diubah oleh PR Issue #74.**

## Amendemen rancangan Issue #96 (tetap PROPOSED)

Arsitektur kandidat memperbolehkan **dua runner GitHub/stack Supabase mandiri** dengan reset dan fixture masing-masing, MCP **15 file/82 kasus** dan Inspector authenticated **33 valid/33 invalid dengan owner denial tepat sekali pada shard 1**, sementara file DB tetap serial per shard (21+20). Partisi versioned harus tepat seluruh 41 file mandatory, disjoint, tanpa kasus dihapus; run lokal tanpa pilihan shard tetap mengeksekusi manifest lengkap. Aggregate wajib memeriksa status tiap job, report tiap shard, status semua tahap, SHA kandidat dan hash manifest/lock/input/partisi, count file serta **tepat 182 kasus database** tanpa skipped, dan bukti MCP/Inspector wajib PASS tepat satu kali pada shard 1 (hilang, gagal, duplikat, atau salah shard ditolak). Bukti dua-shard **NOT RUN** pada PR ini; baru dievaluasi sesudah Issue #95/#96 terintegrasi pada SHA final. Ini **tidak mengubah** CR-020/CR-044, workflow release, syarat G4, atau status **PROPOSED — NOT EFFECTIVE**.

## Issue #99 — rebalance berdasarkan run exact-SHA pertama

Run [#41058481162](https://github.com/milyarderpro/content-producer/actions/runs/41058481162) pada `aa0c38bd1d9df941128802a0c4848d507a8f6077` **PASS 12m01s**; artifact aman mengukur shard 1 **670,972 s** total, database **377,191 s** (21 file/108 kasus), MCP **13,356 s** (15 file/82 kasus), Inspector **111,030 s** (33 valid/33 invalid dan owner denial), start **96,949 s**, reset **32,117 s**, cleanup **21,493 s**. Shard 2 **418,238 s** total, database **246,227 s** (20 file/74 kasus), start **104,191 s**, reset **33,091 s**, cleanup **14,938 s**. Agregat memvalidasi **41 file unik/182 kasus**, ketiga artifact dan seluruh tahap wajib PASS. Laporan ini **tidak menyediakan timing per-file**.

Dua file dipindah **dari shard 1 ke shard 2**: `api-trivia-public-gold.test.ts` dan `api-post-approval-quality.test.ts`. Profil serial **lokal diagnostik historis** Issue #95 memperkirakan masing-masing **65,080 s** dan **52,880 s**, total **117,960 s**; angka lokal ini **bukan** timing Actions pada run #41058481162. Proyeksi sederhana dengan asumsi transfer biaya serupa: shard 1 ~**553 s (9m13s)**, shard 2 ~**536 s (8m56s)**, di luar ketidakpastian perubahan hardware, overhead fixture, cross-run variance dan antrian aggregate. Jika perhitungan dari awal workflow mengikuti overhead run sebelumnya, wall clock dapat tetap lebih dari 10 menit. Proyeksi **NOT RUN / belum divalidasi**; target <=10 menit untuk tiga run identik tetap belum terbukti.

Partisi baru **19+22 file**; 41 nama tepat sekali terhadap manifest, 182 kasus wajib PASS pada aggregate tanpa skipped. Shard 1 tetap memegang MCP/Inspector **tepat sekali**; kedua shard tetap menjalankan stack/start/reset/fixtures mandiri, database serial, audit pre/post/final, migration/history, lint, local security advisors, whitespace dan cleanup. Tidak ada perubahan runner, gate lama, workflow rilis atau CR-052 yang masih **PROPOSED — NOT EFFECTIVE**. Full candidate pada partisi baru dan G4 **NOT RUN**; orchestrator yang akan dispatch pada SHA integrasi final.

## G4-T3 — draft cutover Issue #104 (2026-10-31; NOT EFFECTIVE)

**Status keputusan tetap PROPOSED — NOT EFFECTIVE.** Bagian ini adalah
rancangan handoff untuk review orchestrator, bukan amendemen diam-diam atas
CR-020/CR-044/CR-052, signoff, atau izin mengubah required checks.

### Audit G4-T1: kandidat versus legacy pada SHA identik

- SHA pembanding: `aa0c38bd1d9df941128802a0c4848d507a8f6077`.
- [Candidate #41058481162](https://github.com/milyarderpro/content-producer/actions/runs/41058481162):
  **PASS 12m01s**; source, shard 1, shard 2, dan aggregate PASS. Shard 1
  21 file/108 kasus DB, shard 2 20 file/74 kasus; aggregate tepat **41 file unik
  dan 182 kasus**, tanpa skip. MCP 15 file/82 kasus serta authenticated
  Inspector 33 valid/33 invalid dan owner denial milik shard 1.
- [Legacy #41060272610](https://github.com/milyarderpro/content-producer/actions/runs/41060272610):
  **PASS 15m26s** pada SHA yang sama; satu stack/reset; MCP, audit
  sebelum/sesudah Inspector, authenticated Inspector 33/33 dan cross-owner
  denial, `test-all`, 41 file/182 tes DB, migration history, DB lint, audit
  RLS/grant/ACL/fixture akhir, whitespace, dan artifact aman. Selisih wall
  clock kandidat adalah **3m25s lebih singkat**, tetapi belum memenuhi
  target 10 menit pada SHA pembanding.
- **Perbedaan cakupan penting:** legacy tidak memiliki command/output
  **local security advisors terpisah** yang terverifikasi; DB lint dan
  catalog audit legacy bukan pengganti. Kandidat memiliki tahap
  `security-advisors` mandiri pada **masing-masing shard**:
  `pnpm exec supabase db advisors --local --type security --level info --fail-on error --output-format json`,
  dengan validasi laporan.
  Job serta aggregate kandidat PASS, namun kesetaraan kontrak dan signoff
  G4 tetap menunggu review bukti advisors dan seluruh invariant.

### Delta dari SHA pembanding ke SHA kandidat G4

`a64a55ebb1e3c76112cd211724c2eb6bc256699a` berada **dua commit** di
atas SHA pembanding. Compare GitHub menunjukkan **enam file** berubah:
`scripts/gate-db-shards.json`, `tests/gate-runner.test.ts` dan empat
dokumen profiling/kandidat/CR-052. Tidak ada perubahan source backend,
migration, permission, CLI pin, lockfile, atau runtime workflow di delta ini.
Partisi DB berpindah dari **21+20** menjadi **19+22** dengan memindahkan
`api-trivia-public-gold.test.ts` dan `api-post-approval-quality.test.ts`
dari shard 1 ke shard 2. Tambahan **satu regresi source** di
`tests/gate-runner.test.ts` menegaskan 41 file disjoint dan kedua hotspot
tepat di shard 2; ini bukan pengurangan kasus DB. Seluruh **41 file/182 kasus**
tetap wajib pada agregasi, MCP/Inspector tetap tepat sekali di shard 1.
Distribusi kasus per shard pada partisi baru tidak diasumsikan dari angka
108+74 sebelum rebalance.

### Bukti G4-T2 yang telah selesai dan yang masih menunggu

- Pada `a64a55ebb1e3c76112cd211724c2eb6bc256699a`,
  [candidate #41072354433](https://github.com/milyarderpro/content-producer/actions/runs/41072354433)
  **PASS 9m41s** dan
  [candidate #41074001136](https://github.com/milyarderpro/content-producer/actions/runs/41074001136)
  **PASS 9m43s**. Source, dua DB jobs, dan aggregate selesai PASS pada
  kedua run; ini **dua dari tiga**, bukan bukti target tiga run tercapai.
- Run GitHub ketiga: **PENDING / NOT ACCEPTED** sampai orchestrator menyerahkan
  bukti selesai, exact SHA, status setiap job, report dan aggregate.
- Pemeriksaan lokal SHA yang sama: **PENDING / NOT ACCEPTED** sampai
  orchestrator menyerahkan bukti. Mode lokal dengan overlay diberi label
  **`DIAGNOSTIC_CONFIG_OVERLAY`**, bukan formal `ACTIONS_EXACT_CONFIG`
  maupun formal exact-config PASS, sekalipun seluruh test lokal hijau.
  CR-052 saat ini mensyaratkan local + Actions yang sepadan pada SHA
  identik; usulan menerima overlay harus menjadi amendemen kontrak
  **eksplisit, ditinjau dan disetujui sebelum cutover**, bukan interpretasi
  implisit dari run diagnostik.
- Uji kesetaraan lengkap, laporan advisors lokal terpisah, keputusan
  CR-052, dan persetujuan required check: **BLOCKED** menunggu orchestrator.

### Checklist wajib yang tidak boleh dikurangi

Pada setiap kandidat final: source/frontend `pnpm run check` beserta
format/lint/typecheck/root Vitest/frontend build/test; 72 migration names,
applied/source history; dua start/reset Supabase ephemeral terisolasi;
DB 19+22 tepat 41 file/182 kasus tanpa skip dengan serial per shard;
MCP 15 file/82 kasus serta authenticated Inspector 33 valid/33 invalid,
owner/non-owner dan cross-owner denial tepat sekali di shard 1;
audit catalog RLS/grant/default ACL/privilege/fixture sebelum/sesudah
Inspector dan final pada kedua shard; DB lint **dan local security
advisors terpisah** pada kedua shard; whitespace, fixture cleanup,
bukti report aman dengan SHA, hash manifest/lock/input/partisi dan
aggregate fail-closed. Tiga report dan seluruh stage wajib PASS;
hilang/gagal/skip/mismatch berarti FAIL/BLOCKED. CI fixture tidak
membuktikan hosted OAuth atau production business Write.

### Prosedur rilis usulan (belum boleh dijalankan sebagai cutover)

1. Orchestrator menerima bukti final run ketiga dan lokal, mengaudit
   same-SHA coverage, advisors, overlay versus exact-config, target tiga
   run, serta mengesahkan atau mengamendemen CR-052 **secara eksplisit**.
   Tanpa ini, gunakan legacy sebagai gate rilis yang berlaku.
2. Setelah keputusan tertulis dan izin terpisah, operator memeriksa
   `main` dan menetapkan **satu SHA 40 hex final**. Dispatch manual
   `.github/workflows/backend-gate-candidate.yml` dari `main` dengan
   input `candidate_sha` yang sama dengan `github.sha` dan checkout SHA.
   Jangan dispatch pada PR head atau menggabungkan bukti SHA berbeda.
3. Wajibkan PASS untuk job `source`, kedua matrix `database` (shard 1/2),
   serta `aggregate` dan semua tahap pada tiga artifact sanitized.
   Cocokkan exact SHA, hashes, 41/182, MCP/Inspector 33/33/denial,
   advisors, migration/history/lint, audit RLS/ACL/fixture, dan cleanup.
   Kegagalan atau evidence hilang memblokir deployment.
4. **Hanya setelah signoff terpisah**, review branch protection dan
   check contexts aktual sebelum mengonfigurasi required check rilis;
   workflow ini masih `workflow_dispatch`/`main` saja, sehingga tidak
   boleh mengklaim required check otomatis pada PR. Catat nama job
   dan status check yang benar dari Actions API sebelum menetapkan aturan.
   Aktivasi cutover/required checks **bukan** bagian draft PR #104.
5. Simpan legacy `.github/workflows/backend-technical-gate.yml`
   tidak berubah, bersama `pnpm run test-all`, sebagai jalur rollback.
   Jika kandidat memberi false result, kehilangan kasus/advisor/audit,
   salah SHA, atau berfluktuasi, **blok rilis**, kembalikan check/entrypoint
   melalui keputusan dan PR operasional terpisah ke workflow legacy,
   dispatch full gate lama pada SHA final yang disetujui, verifikasi
   bukti PASS, lalu koreksi kandidat. Jangan reset/migrasi production
   sebagai rollback CI.

**Effective date: UNKNOWN.** Tidak ada deployment, production data,
trivia, business Write, auto-merge, atau aktivasi cutover dari draft ini.
