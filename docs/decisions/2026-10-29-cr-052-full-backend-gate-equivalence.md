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

CR ini menetapkan *semantik calon gate*, bukan implementasinya. Target ≤10 menit pada **tiga run
identik GitHub** adalah target optimasi G4, bukan tanda lulus keamanan jika gagal dicapai. Durasi
per-case/query pada snapshot ini **UNKNOWN**; jangan merekayasa angka.

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

## Urutan CR-044 dan Inspector tidak boleh direduksi

Urutan backend setelah reset adalah **focused OAuth/owner → audit sebelum Inspector → authenticated
Inspector 33 tool valid/invalid/denial → audit sesudah Inspector → suite database panjang → applied
history + DB lint + audit akhir**. Ini mempercepat *failure feedback* dan menghindari kegagalan
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
  authorization/security config dan runtime dependencies benar-benar *bit-for-bit* identik dengan
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
