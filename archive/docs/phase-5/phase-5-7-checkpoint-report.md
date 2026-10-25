# Checkpoint 5.7 — Approval and explicit publication lifecycle

Tanggal: 12 Oktober 2026. Baseline Git **e06f473**. Implementasi dan verifikasi
lokal checkpoint **5.7 selesai**: **32 API RPC, 59 migration, 145/145 database
tests lulus pada 31 file**. Tidak ada commit baru. Ini bukan completion seluruh
Phase 5 atau audit independen final Batch B.

## 1. Authority dan dokumentasi sebelum migration

User menyetujui plan 5.7, meminta tiga keputusan konkret, kemudian mengotorisasi
implementasi dengan live todos. **CR-014 Accepted dan runbook 5.7 selesai sebelum
CLI membuat migration pertama**. Repository awal bersih. Frozen documents,
applied migrations, serta accepted CR-004/009/010/011/012/013 tetap menjadi authority.
CR-014 merekonsiliasi effective warning gate, evidence binding, dan replay v7.

Dokumen:

- `docs/decisions/2026-10-12-phase-5-7-lifecycle-reconciliation.md`.
- `plans/works/phase-5-7-implementation-plan.md`.
- `docs/phase-5-7-catalog-audit.sql`: satu SELECT read-only, local-only, token-free.
- Laporan ini ditulis setelah actual verification tersedia.

## 2. Migration dan public surface

Empat migration additive, semuanya dibuat lewat CLI setelah membaca help,
applied lokal dan direproduksi melalui satu final clean reset:

| File di `supabase/migrations/`                         | Tujuan                                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `20261012045014_phase_5_7_lifecycle_gate.sql`          | Warning registry/effective gate, current fact/source/render/hash gate, approval provenance, archive evidence validator dan minimal column grants |
| `20261012045016_phase_5_7_lifecycle_history.sql`       | Additive lifecycle history, closed response projections, v7 completion/replay dan v6-preserving dispatch                                         |
| `20261012045018_phase_5_7_lifecycle_rpcs.sql`          | Tepat lima typed RPC lifecycle, explicit intent, CAS, allocation release/publication dan historical archive                                      |
| `20261012052003_harden_phase_5_7_history_metadata.sql` | Fail-closed NULL metadata, before-evidence binding pada completion/replay, seluruh published fields immutable saat archive                       |

Allowlist delta **27 → 32**, tanpa overload:

| RPC                        | Rate group       | Transisi                |
| -------------------------- | ---------------- | ----------------------- |
| `api.approve_post`         | write            | draft → ready           |
| `api.revoke_post_approval` | write            | ready → draft           |
| `api.discard_post`         | contention_write | draft/ready → discarded |
| `api.mark_post_posted`     | contention_write | ready → posted          |
| `api.archive_post`         | write            | posted → archived       |

Seluruh existing 27 entry points tetap ada. `record_post_performance` belum ada;
operation map tetap memetakan frozen total 33 untuk akhir Phase 5. Test owner
approval menunjuk suite quality baru. Catalog audit mencatat seluruh 32 signatures.

## 3. Keputusan domain dan evidence aktual

### Warning acceptance

Allowlist tepat: `FACT_COUNT_BELOW_CONFIG_MIN`, `trivia.profile.preferred_band`,
`trivia.variety_sufficient`, `trivia.caption_supportive`,
`trivia.visual_rhythm_clear`. Array bounded/unique, sorted semantic hashing;
nonempty acceptance wajib safe owner reason 1..500 characters, empty acceptance
wajib null reason. Unknown/duplicate/inactive/unaccepted warning ditolak.

- Adaptive count **1 dan 4** di bawah min=5 berhasil hanya dengan stored
  override/reason dan owner acceptance. Original `trivia.facts.count_valid`
  tetap **blocking/failed**, actual count tetap, system overall_status tetap failed.
  quality passed berarti effective gate dengan recorded exception, bukan check
  diubah pass. Publish memakai acceptance yang sama.
- Fixed mismatch, above-max, missing override, hard component/final/readability,
  source insufficiency, critical fail/needs_review dan nonallowlisted editorial
  needs_review tetap memblokir. Fixture **101 words** mempunyai character checks
  pass tetapi hard readability failed dan approval ditolak.
- Ketiga allowlisted editorial needs_review dapat diterima dengan alasan;
  original criterion/overall needs_review tidak diubah. `fail` tetap ditolak.
  Semua 18 frozen criteria wajib lengkap dengan severity yang tepat.
- All-pass preferred fixture **65 words/7 facts** berhasil dengan accepted IDs
  kosong dan null reason. Inactive preferred-band acceptance ditolak.
- Reordered accepted IDs mereplay respons yang sama; changed reason dengan key
  sama ditolak OPERATION_KEY_REUSED. Invalid/control/token-shaped reasons ditolak.

### Revision, evidence dan provenance

- Approve recomputes authoritative system checks untuk successor revision;
  editorial hanya revision-rebound dengan evaluator/time/results asli. Approval
  actor/time berasal dari authenticated context/server dan ledger approve asli.
- Revoke mengosongkan approval/ready_at, quality pending, revision +1, tanpa
  mengubah copy. Evidence valid rebound; history menyimpan before-evidence.
- Discard tidak membutuhkan quality pass: failed draft dapat dibuang; current
  allocated junctions menjadi released, current membership/source snapshots
  dipertahankan, unrelated reservations tidak disentuh. Completed item tetap
  completed; explicit replacement RPC baru membuatnya pending. Historical discard
  replay tetap mengembalikan eligibility awal setelah replacement.
- Public approve → reschedule → revoke → approve → publish → archive diuji.
  Schedule-only CR-013 provenance tetap; publish memvalidasi hash/revision/approval
  asal, menghitung ulang current gate, lalu membawa approved_revision maju tanpa
  mengganti original actor/approved_at/operation/accepted warnings.
- Publish memeriksa canonical **dan immutable usage expiry**. Public reverify
  yang memperpanjang canonical expiry tidak membuat expired usage snapshot valid.
  Current source insufficiency dan changed Page markets juga memblokir publish.
- Archive mempertahankan byte-identical published system/editorial/approval,
  hash/copy/generation, schedule, source snapshots dan metrics. Evidence tetap
  terikat published revision; archived revision=published revision+1. Tidak ada
  evaluasi atau approval baru. Subsequent context/fact changes tidak menulis ulang
  historical publication. Metric fixture administratif dipakai untuk retention
  proof; tidak ada klaim public 5.8 metric write.

### Replay, authorization dan rollback

- v7 closed envelope: schema_version/operation_name/target_public_id/
  history_public_id/response_hash; 2 KiB. Lifecycle exact response 64 KiB,
  each evidence/approval 32 KiB dan before aggregate 96 KiB. Application history
  hanya SELECT/INSERT, scoped actor/workspace/Page/post/ledger relationships.
- Semua lima RPC mempunyai success, non-owner/missing user/client denial,
  cross-workspace POST_NOT_FOUND, wrong-state/CAS/confirmation denial, exact
  replay, payload mismatch, dan safe error assertions melalui authenticated RPC.
- Faults pada **history insertion setelah business mutation** dan **ledger
  completion** untuk kelima RPC membuktikan full rollback, same-key retry dan
  replay. NULL transition-metadata fault juga ditolak tanpa mutation setelah fix.
- Corrupt envelope schema/hash/target/history/extra keys dan response dengan
  recomputed malicious digest gagal closed. Replays lima lifecycle dan ketiga
  v6 save/revise/reschedule tetap exact setelah status berikutnya/archival.
- Rate rejection untuk kelima exact groups terjadi sebelum mutation. Direct
  caller table/sequence/private-helper access ditolak.

## 4. Separate-session race outcomes

Seluruh domain writers memakai public authenticated RPC dengan owner/client
`request.jwt.claims`. Administrative sessions hanya fixtures, barriers/faults,
catalog inspection dan cleanup. SQL capability-bearing memakai stdin dan errors
sanitized. Client dibedakan untuk mengamati business locks, bukan rate bucket.

| Race / commit order  | Hasil aktual                                                                    |
| -------------------- | ------------------------------------------------------------------------------- |
| correction → approve | Correction sukses; approve REVISION_CONFLICT; final draft@2                     |
| approve → correction | Keduanya sukses; correction membatalkan approval; final draft@3                 |
| correction → publish | Correction sukses; publish REVISION_CONFLICT; final draft@3                     |
| publish → correction | Keduanya sukses; final posted@3; publication snapshots tetap                    |
| reverify → approve   | Keduanya sukses; final ready@2; immutable source snapshot tetap                 |
| approve → reverify   | Keduanya sukses; final ready@2; original approval provenance tetap              |
| reverify → publish   | Keduanya sukses; final posted@3; source snapshot tidak direkonstruksi           |
| publish → reverify   | Keduanya sukses; final posted@3; subsequent reverify tidak mengubah publication |

Workspace/identity-lineage advisory locks dan waiter contention diamati di
`pg_locks`/`pg_stat_activity`; deadlock count tidak bertambah pada matriks tersebut.

Evidence tambahan:

- Same-key simultaneous calls untuk **kelima RPC**: satu revision/history, satu
  response first-use dan satu replay yang digest-nya sama.
- Publish versus revoke/discard **kedua orders**: satu CAS winner, loser
  REVISION_CONFLICT, final allocation state sesuai winner.
- Approve versus revise dan discard versus reschedule **kedua orders**: satu
  revision winner, no implicit approval/state overwrite.
- Replacement-before-discard ditolak tanpa mutation; replacement yang menunggu
  public discard pada Page/slot gate berhasil setelah discard commit. Discard
  memegang schedule+identity/lineage keys sebelum replacement berjalan.
- Held-workspace timeout dan actual backend cancellation menghasilkan
  DATABASE_BUSY, complete rollback dan same-key retry/replay sukses.
- Existing 5.6 save/cancel, numeric two-slot reschedule, CAS dan correction races
  tetap lulus melalui public path.

## 5. Test inventory dan failures/recovery

Tambahan **23 database tests** pada tiga file:

| File                                                             | Tests |
| ---------------------------------------------------------------- | ----: |
| `supabase/tests/database/api-post-lifecycle.test.ts`             |     8 |
| `supabase/tests/database/api-post-approval-quality.test.ts`      |     9 |
| `supabase/tests/database/api-post-lifecycle-concurrency.test.ts` |     6 |

`helpers/post-lifecycle.ts` menyediakan typed public calls dan evidence inspection.
`helpers/post-rpc.ts` mengganti administrative ready fixture dengan public approve.
Suite reschedule kini memakai public posted/archive/discard dan dynamic revision
assertions. Existing security/read/page-plan/plan/trivia/post suites memperbarui
exact count/names/column-grant assertions, tanpa melemahkan existing checks.

| Eksekusi development                         | Hasil aktual / recovery                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First lifecycle focused                      | 5/6 pass; assertion membaca post_revision dari minimized get_post system projection. Diganti ke authoritative response/persisted evidence.                    |
| Lifecycle/quality/reschedule berikutnya      | 18/19 pass; public niche-config change ditolak ACTIVE_POST_CONTEXT_CONFLICT sesuai existing contract. Tes memakai legal public Page-market context change.    |
| Initial check                                | TypeScript function-union `.includes` gagal; diganti explicit identity comparison. Check berikutnya PASS.                                                     |
| Quality + first concurrency focused          | **11/11 PASS**, 120.36 s                                                                                                                                      |
| Post/security/plan focused regression        | **40/40 PASS**, 327.98 s                                                                                                                                      |
| NULL history metadata regression sebelum fix | FAIL: mutation masih sukses. Additive fourth migration lalu focused regression **PASS**.                                                                      |
| Expanded five-file focused                   | 27/28 pass; hard-readability fixture ternyata 100 words, bukan overflow. Independent count diperbaiki menjadi 5+90+6=101; renderer assertion 101 ditambahkan. |
| Final quality focused                        | **9/9 PASS**, 78.44 s; seluruh IDs, zero-warning path, source/101-word/freshness/context cases                                                                |
| First read/page-plan regression              | Tool timeout 480 s; tidak diklaim PASS; proses test tidak tersisa saat pemeriksaan.                                                                           |
| Read/page-plan retry dengan deadline cukup   | **21/21 PASS**, 529.40 s                                                                                                                                      |

## 6. Final gate — satu reset, kegagalan dilaporkan dan recovered

Final gate dimulai setelah focused verification. **Satu clean reset** dijalankan,
tanpa reset ulang. Initial test-all gagal pada satu old Phase 4 cumulative API
assertion yang masih 27. Hanya assertion tersebut diperbarui menjadi exact **32**;
12-table/RLS/snapshot/index/private-boundary assertions tetap. Focused test lulus,
lalu failed test-all diulang dan sisa urutan gate dilanjutkan. Tidak ada SQL/schema
change setelah clean reset. Initial failure tidak dihitung sebagai PASS.

| Command                                                                                            | Hasil aktual                                                                                           |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm run supabase:reset`                                                                          | PASS, seluruh **59** source migrations replayed; no-op seed; containers restarted                      |
| `pnpm run check`                                                                                   | PASS: Prettier, ESLint, TypeScript, **3/3 unit tests**; recovery test-all juga menjalankan check ulang |
| Initial `pnpm run test-all`                                                                        | **FAIL: 144/145**, 31 files, 1276.24 s; `trivia-post-facts.test.ts` stale API count 27                 |
| Focused stale-count recovery                                                                       | **1/1 PASS**, 1.42 s                                                                                   |
| Recovery `pnpm run test-all`                                                                       | **PASS: 145/145**, **31 files**, 1179.10 s; nested check/migration validation PASS                     |
| `pnpm run verify-migrations`                                                                       | PASS, **59** filenames valid                                                                           |
| `pnpm run smoke-test`                                                                              | PASS, existing script menjalankan DB suite: **145/145**, 31 files, 1194.33 s                           |
| `pnpm run supabase:verify`                                                                         | PASS, seluruh **59** source/applied versions cocok; header Remote tetap menunjuk target `--local`      |
| `pnpm exec supabase db advisors --local --type security --fail-on error`                           | PASS: **No issues found**                                                                              |
| `git diff --check`                                                                                 | PASS                                                                                                   |
| `pnpm exec supabase db query --local --file docs/phase-5-7-catalog-audit.sql --output-format json` | PASS, actual final evidence §7                                                                         |

Smoke's duplicate DB run adalah perilaku existing required gate command. Tidak
ada broad testing tambahan setelah semua gate passed. Laporan ini diformat dan
diff diperiksa terpisah; tidak ada implementasi berubah setelah final verification.

## 7. Final catalog dan cleanup

| Assertion                                                               | Hasil                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| Exact API inventory / authenticated EXECUTE                             | **32 / 32**                                                  |
| Allowlist differences / overload / unsafe API                           | **0 / 0 / 0**                                                |
| PUBLIC/anon/service_role API execution                                  | **0**                                                        |
| Caller/PUBLIC internal helper execution                                 | **0 / 0**                                                    |
| Caller table / column / sequence privileges                             | **0 / 0 / 0**                                                |
| PUBLIC table / sequence privileges                                      | **0 / 0**                                                    |
| RLS-enabled business/operational tables                                 | **15 / 15**                                                  |
| API-owned business tables / role memberships                            | **0 / 0**                                                    |
| Owner login/superuser/bypassrls/inherit/schema CREATE                   | **Semua false**                                              |
| Missing owner SELECT policy / unsafe UPDATE policy / unsafe default ACL | **0 / 0 / 0**                                                |
| History owner SELECT/INSERT; UPDATE/DELETE/TRUNCATE                     | **true/true; false/false/false**                             |
| History triggers                                                        | **post_history_immutable dan post_history_validate enabled** |
| History size/token-key/current-token violations                         | **0 / 0 / 0**                                                |
| Ledger token keys / invalid v6 / invalid v7 / incomplete ledger         | **0 / 0 / 0 / 0**                                            |
| Fault functions / disabled business triggers / later RPCs               | **0 / 0 / 0**                                                |

Seluruh 32 entry points dimiliki content_producer_api_owner, SECURITY DEFINER,
search_path kosong. New private helpers SECURITY INVOKER. Existing narrow Auth
UID bridge dari CR-009 tetap; tidak ada direct Auth table grant atau bypass role.

Privilege delta tepat: UPDATE published_at/platform_post_id/published_url/
discarded_at/archived_at pada posts, dan published_at pada junction. Existing
column grants tetap sesuai cumulative CR-012/013. Source/verification/hash/usage
snapshots pada junction tetap tidak menerima owner UPDATE grant.

Final cleanup **semuanya 0**: workspaces, pages, configs, plans, items, posts,
metrics, facts, junctions, post history, reservation history, events, ledger, rate
buckets dan fixture users. Empty catalog scans hanya cleanup evidence; populated
replay/privacy/immutability dibuktikan oleh tests, bukan disimpulkan dari tabel kosong.

## 8. Stop boundary

Checkpoint 5.7 selesai dan berhenti pada laporan ini. Tidak memulai 5.8/5.9 atau
Phase 6. Tidak ada commit, push, deploy, cloud-resource/database action, production
seed, secret, OpenAI/embedding/vector search, Facebook/Canva API call, generic
status executor, auto-approval atau implicit publication. Seluruh domain SQL
tetap pada database/core boundary; tidak ada MCP handler baru.

Audit independen Batch B tetap setelah seluruh Batch B selesai, bukan disahkan
oleh laporan ini. Perintah checkpoint berikutnya hanya setelah instruksi user:
**`Lanjutkan 5.8`**.
