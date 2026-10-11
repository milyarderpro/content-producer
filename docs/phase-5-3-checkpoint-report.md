# Phase 5 checkpoint 5.3 — Audit remediation evidence

Tanggal: 11 Oktober 2026. Baseline: `1e33b39` (Phase 5.2).

**Verdict: siap untuk 5.4.** Completion criteria 5.3 dan ketujuh temuan audit
telah dibuktikan. Pekerjaan 5.4+ belum dimulai; laporan ini tidak mengotorisasi
checkpoint berikutnya atau menyatakan seluruh Phase 5 selesai.

## 1. Dirty-tree baseline dan migration

Pada awal pekerjaan sudah ada tiga perubahan test (`api-read-rpcs`,
`api-security-kernel`, `trivia-post-facts`), migration 5.3, dan test write 5.3
yang belum dikomit. Ketiganya dipertahankan. Migration awal 5.3 juga tidak
ditulis ulang. Test write dilengkapi; test market Phase 3 diselaraskan secara
eksplisit dengan CR-010, sambil mempertahankan penolakan input invalid.

Baseline memiliki 27 migration. Source akhir memiliki **31**, dengan tambahan
berurutan berikut:

| Alias | File dalam `supabase/migrations/`                           | Status/purpose                                                                        |
| ----- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| M0    | `20261011052125_phase_5_3_page_and_content_plan_writes.sql` | Pekerjaan awal pengguna; dipertahankan utuh, tiga entry point                         |
| M1    | `20261011071343_remediate_phase_5_3_audit_contracts.sql`    | Additive replay v3, Page ISO, overrides, plan snapshots, numeric locks, error mapping |
| M2    | `20261011071839_harden_phase_5_3_snapshot_context.sql`      | Typed snapshot records, invalid request context, closed snapshot scalar types         |
| M3    | `20261011073111_close_phase_5_3_config_validation.sql`      | Non-null config scalars, snapshot anti-downgrade, module-version guard                |

Seluruh file baru dibuat lewat `supabase migration new`; semua source migration
yang sudah diterapkan tetap immutable. Perubahan rutin dalam M1–M3 menggunakan
guarded migration-only definition edits dengan anchor yang harus cocok;
signature, API owner dan ACL dipertahankan. Tidak ada generic executor persisten.

## 2. Rekonsiliasi kontrak

`docs/decisions/2026-10-11-phase-5-3-audit-contract-reconciliation.md` adalah
**CR-010**, diterima berdasarkan otorisasi rekonsiliasi dalam permintaan audit.
Dokumen frozen tidak diubah.

- Baris 31: ledger v3 menyimpan respons sukses tepat untuk tiga write 5.3,
  dibatasi 1 MiB; replay hanya mengganti `data.replayed`. Ledger v2 tetap tertutup.
- Baris 45: Page menerima 1–8 kode ISO resmi unik, uppercase; `DE` valid,
  `UK` ditolak. Default workspace empat market dan alias historisnya dipertahankan.
  Slug Page mengikuti batas inventory `[a-z0-9-]{2,80}`.
- Baris 56: enam optional override keys, nested schema lengkap, tipe/nilai
  tervalidasi, batas 8 KiB, tanpa unknown keys/null atau pelonggaran Page ceiling.
- Baris 77: `plan_config` v2 menyimpan context snapshot v1 Page+niche dari row
  terkunci; konfigurasi niche tetap v1. Snapshot tidak direkonstruksi atau
  diturunkan versinya. Legacy plan v1 tetap valid.
- Baris 98: plan mengembalikan `CONFIG_INVALID` untuk config/module version
  unsupported; Page writes tetap memakai `CONFIG_SCHEMA_UNSUPPORTED`.
  `OAUTH_CLIENT_REQUIRED` mengikuti database contract §17.
  Seluruh schedule key dimaterialisasi, diurutkan numerik, lalu kedua tabel
  diperiksa sebelum setiap insert. Namespace lock privat existing dipertahankan.

## 3. Penyelesaian per temuan dan lokasi bukti

Semua lokasi test di bawah berada dalam
`supabase/tests/database/api-page-plan-writes.test.ts` (T).

| Temuan                  | Implementasi                                                                                                                                                                               | Bukti public RPC                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Replay stabil        | M1:173 completion v3; M1:217 early replay dari snapshot sebelum lookup domain                                                                                                              | T:435 membandingkan seluruh respons setelah Page/config/plan/item berubah; mismatch ketiga payload ditolak; T:1161 dua sesi/key identik menghasilkan tepat satu mutation untuk masing-masing RPC     |
| 2. `item_config`        | M1:48 closed module override validator; M1:258 composition terhadap config terkunci                                                                                                        | T:746 valid/invalid key, tipe, nested shape, null, nilai, ukuran, Page ceiling                                                                                                                       |
| 3. Market ISO           | M1:13 normalizer Page, M1:26 constraint, M1:33 trigger, M1:246 RPC normalization                                                                                                           | T:564 sukses delapan kode termasuk DE, update ISO, penolakan UK/ZZ/XK/lowercase/duplicate/null/empty/>8; `final-remediation.test.ts:77` mempertahankan workspace alias dan menolak Page alias        |
| 4. Schedule lock        | M1:282–294 materialized distinct bigint keys, numeric order; original per-item recheck dipertahankan                                                                                       | T:1100 observasi `pg_locks` saat menunggu key lebih besar; dua plan berlawanan order menghasilkan satu sukses/satu SCHEDULE_CONFLICT; T:970 konflik pada item kedua dengan kedua tabel dan rollback  |
| 5. Page/config snapshot | M1:80 builder, M1:95 validator, M1:138 scope trigger; M2:3 typed rows; M3:23 immutable/anti-downgrade guard                                                                                | T:435 membuktikan isi/config/version/context timestamps dan invariance setelah config Page diperbarui                                                                                                |
| 6. Test negatif         | T:521 context/non-owner; T:624 patch/null/config/slug/exact CAS/active-post guard; T:841 item count/position/schedule; T:916 downstream failures; M3:4 fail-closed nullable config scalars | Owner success ketiga RPC; 100 item sukses; seluruh Page/config atau plan/items serta ledger tidak berubah pada kegagalan; failure setelah child insert dan saat ledger completion; rate limit T:1069 |
| 7. Error config plan    | M1:249 pemetaan config error khusus plan; M3:41 module-version guard                                                                                                                       | T:841 unsupported request version; T:1030 unsupported current registry dan disabled module; safe message assertions tanpa SQL/internal detail                                                        |

Test menggunakan role **authenticated** dan request claims lokal melalui public
`api` functions. Helper privat hanya digunakan untuk setup/capture fixture;
pemanggilan helper tidak dihitung sebagai bukti RPC. SQL administrator untuk
mutation/fault injection hanya fixture ephemeral dan dibersihkan.

## 4. Hasil gate

| Gate                                                                                  | Hasil akhir                                                           |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Clean `pnpm run supabase:reset` dari migration source                                 | PASS, dua reset acceptance dengan seluruh 31 migration                |
| Focused 5.3                                                                           | PASS, **17/17**                                                       |
| Phase 5.2 read RPC tests                                                              | PASS, **4/4**                                                         |
| Focused 5.3 + 5.2 sesudah reset acceptance kedua                                      | PASS, **21/21** di dua file                                           |
| `pnpm run check`                                                                      | PASS: formatting, lint, typecheck, 3 foundation tests                 |
| `pnpm run test-all`                                                                   | PASS: check, migration validation, **55/55 database tests, 19 files** |
| `pnpm run verify-migrations`                                                          | PASS, 31 filename valid                                               |
| `pnpm run smoke-test`                                                                 | PASS, seluruh **55/55 database tests, 19 files** dan repository smoke |
| `pnpm run supabase:verify`                                                            | PASS, history/order lokal cocok dengan 31 source migration            |
| `pnpm exec supabase db advisors --local --type security --fail-on error`              | PASS, **No issues found**, juga sesudah reset kedua                   |
| Local catalog audit                                                                   | PASS; rincian berikut                                                 |
| `git diff --check`                                                                    | PASS                                                                  |
| Review diff sejak `1e33b39`, untracked files, source order, scope dan secret patterns | PASS; tanpa perubahan migration committed, secret atau scope creep    |

CLI help dibaca sebelum migration new/up/list, db reset/query/advisors. Semua
operasi database eksplisit `--local`; psql fixture/concurrency hanya berjalan
dalam container `supabase_db_content-producer`. Label kolom "Remote" dari
`migration list --local` adalah format CLI; perintah tidak menghubungi project
remote.

### Kegagalan iterasi dan penyelesaiannya

1. Iterasi awal menemukan anonymous record tidak dapat dicast ke table row
   untuk snapshot plan. M2 memperbaikinya secara additive; focused test lulus.
2. Multi-statement test fixture tidak didukung prepared query CLI. Fixture
   memakai psql container lokal; array-output assertion disesuaikan dengan
   bentuk array JSON aktual. Perilaku RPC tidak dilonggarkan.
3. Invocation smoke pertama terhenti oleh timeout tool 240 detik. Smoke ternyata
   menjalankan seluruh database suite; rerun berurutan dengan timeout cukup
   lulus dalam sekitar 737 detik. Fixture dari proses terputus teridentifikasi
   sebagai fixture 5.3, dibersihkan oleh reset acceptance kedua. Focused suite
   dan advisor sesudah reset kedua lulus. Ini tidak dihitung sebagai pass awal.

## 5. Audit katalog dan privasi

Audit read-only yang reproducible: `docs/phase-5-3-catalog-audit.sql:1`.

- **13 API functions**: sepuluh read 5.2 dan hanya `create_page`, `update_page`,
  `create_content_plan` sebagai tambahan 5.3.
- Semua 13: owner `content_producer_api_owner`, `SECURITY DEFINER`, tepat
  `search_path = ''`; authenticated execute count **13**, unsafe count **0**.
- API execute untuk anon/service_role/PUBLIC: **0**.
- Internal helper execute untuk semua caller/PUBLIC: **0**.
- Direct business/internal table dan sequence privilege untuk caller/PUBLIC:
  **0**; unsafe explicit default ACL **0**.
- RLS-enabled **12/12** (sepuluh tabel domain dan dua tabel operasional).
- API owner: NOLOGIN, NOSUPERUSER, NOBYPASSRLS, NOINHERIT, tanpa membership,
  tanpa table ownership atau CREATE pada `api`/`internal`.
- Semua tabel mempunyai SELECT policy untuk API owner; owner/workspace/actor
  predicates ditinjau; semua UPDATE policies mempunyai USING dan WITH CHECK.
  `niches` adalah registry bersama tanpa tenant row, dengan authenticated
  identity predicate existing, dan hanya dibaca melalui owner-checked RPC.
- Identity bridge CR-009 tetap argument-free, privat, fixed `select auth.uid()`;
  regresi security-kernel lulus dalam full suite.
- Katalog tidak memiliki function lifecycle 5.4; **0** fault functions/triggers
  yang tertinggal, **0** ledger tidak selesai.
- Sesudah reset kedua dan test cleanup: workspace, Page, plan, post, ledger,
  rate bucket fixture seluruhnya **0**. Seed tetap hanya registry, tanpa data
  produksi pengguna.

## 6. File lain dan scope review

- `supabase/tests/database/api-read-rpcs.test.ts:328`: allowlist 13 yang sudah
  ada di dirty tree dipertahankan; empat test read tetap lulus.
- `supabase/tests/database/api-security-kernel.test.ts:238`: count 13 existing;
  seluruh narrow-role/helper/direct-access regression tetap lulus.
- `supabase/tests/database/trivia-post-facts.test.ts:410`: count 13 existing;
  regresi Phase 4 tetap lulus.
- `supabase/tests/database/final-remediation.test.ts:77`: CR-010 market
  regression, bukan pelemahan validator untuk unknown/duplicate/null market.

Seluruh changed/untracked files sejak baseline diperiksa. Tidak ada MCP/Edge
handler, transport, OAuth middleware, frontend, worker, lifecycle 5.4+, API
Facebook/Canva/OpenAI, vector, deployment, remote link/project/resource,
secret, commit, push atau perintah Git destruktif. Pekerjaan awal dirty tree
tetap tersedia untuk audit pengguna.

## 7. Risiko tersisa dan verdict

Tidak ada completion criterion 5.3 yang belum dibuktikan. Risiko non-blocking:

- Ledger response v3 menyimpan bounded settings/items lebih besar daripada
  identifier-only v2; batas 1 MiB dan closed input tetap enforced.
- ISO allowlist pinned membutuhkan additive migration jika ISO berubah.
- Guarded definition-edit migrations sengaja fail closed bila predecessor
  routine berubah; clean reset membuktikan source chain yang sekarang.
- Legacy completed response v2 tidak dapat direkonstruksi secara historis;
  migration menolak state itu, dengan clean local reset sebagai recovery 5.3.
  Tidak ada migrasi atau rollout cloud yang diklaim oleh laporan ini.

**Siap untuk 5.4**, berdasarkan seluruh bukti di atas. Berhenti pada 5.3;
checkpoint berikutnya hanya dijalankan setelah instruksi pengguna.
