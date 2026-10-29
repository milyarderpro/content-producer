# G1-T2 — Matriks invariant → test/case → kewajiban dan pengganti

**Status:** DRAFT cakupan untuk peninjauan orchestrator pada
[Issue #74](https://github.com/milyarderpro/content-producer/issues/74) ; **belum mengubah
gate/test**. Snapshot `main` `4191caf7943e313b43ab0dc52f4311165e6c229d` (29 Oktober 2026). Baca
bersama [baseline](baseline-and-inventory.md) ,
[CR-052](../decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md) , [testing](../testing.md)
, [domain](../domain.md) , [tool contracts](../tool-contracts.md) ,
[CR-020](../decisions/2026-10-15-phase-9-10-risk-based-mvp-acceptance.md) ,
[CR-044](../decisions/2026-10-20-phase-10-gate-order-and-backend-sha-reuse.md) .

## Kode invariant dan pemeriksaan wajib lintas lapisan

- **I-MIG — clean migration/history/lint:** satu stack ephemeral, satu clean reset dari nol, nama 72
  migration valid, applied/source history cocok, `supabase db lint --local --fail-on error` , dan
  tidak menyentuh remote; **WAJIB**. Pengawas: `scripts/verify-migrations.ts` ,
  `scripts/phase-6-catalog-audit.ts` , `backend-technical-gate.yml` , `baseline.test.ts` ,
  `oauth-resource-audience-hook.test.ts` , serta audit akhir. Nama migration saja **tidak**
  menggantikan history/lint.
- **I-OWNER — OAuth dan penolakan owner/cross-owner:** JWT resource/audience, challenge, client
  context, inactive workspace, foreign workspace/page/post, malformed/anonymous denial tanpa
  existence leak; **WAJIB**. Pengawas: `mcp/auth_test.ts` , `mcp/oauth_production_test.ts` , DB
  `api-security-kernel` , `api-read-rpcs` , `api-page-plan-writes` , suite owner tiap RPC, serta
  Inspector HTTP dengan identitas sintetis terpisah.
- **I-ACL — RLS, grants, default ACL, privilege dan 33-RPC catalog:** role API owner sempit,
  tabel/sequence/helper privat, 15 tabel bisnis RLS, owner policies, tidak ada direct table grant,
  tepat 33 authenticated RPC; **WAJIB**. Pengawas: `api-security-kernel` ,
  `api-phase-five-acceptance` , `workspaces-and-niches` , `phase-5-operation-map` , `api-read-rpcs`
  , audit katalog **pre/post/final**. Test catalog bukan pengganti negative non-owner RPC.
- **I-IDEMP — ledger/replay/atomicity/CAS:** operation-key semantic replay persis, mismatch ditolak,
  mutation/ledger/history tersatu atau rollback, snapshot tak berubah; **WAJIB**. Pengawas:
  `operation-ledger-and-rate-limit-buckets` , `api-security-kernel` , semua suite `api-*-writes` ,
  `api-plan-lifecycle` , `api-post-save-revise` , `api-metrics` dan negative injected fault.
- **I-RACE — penjadwalan/lease/reserve/write race:** sesi/transaction berbeda, lock ordering,
  exactly one winner, timeout/cancellation `DATABASE_BUSY` , retry same key, tanpa partial write;
  **WAJIB**. Pengawas: `api-plan-concurrency` , `api-trivia-concurrency` , `api-post-concurrency` ,
  `api-post-lifecycle-concurrency` , `api-metrics-concurrency` , `core-primitives-and-validators` ,
  `trivia-reservation-and-reuse` , dan kasus `CON-003` dalam page-plan writes. Satu sesi mock bukan
  pengganti.
- **I-FACT — identitas/dedup/reuse/source-freshness:** sumber Tier A/B, canonical URL, batas
  disclosure, semantic review, reserve/release/expiry, lineage, reverify/correct, snapshot usage;
  **WAJIB**. Pengawas `api-trivia-facts` , `api-trivia-source-diagnostics` ,
  `api-trivia-public-gold` , `api-trivia-correction` , `trivia-candidate-retrieval` serta suite
  schema/identity/reuse awal.
- **I-SOURCE — URL dan evidence source aman:** canonical URL, null preservation untuk API get_post,
  Tier/risk/independence/freshness, tujuh bentuk sumber MAN-03, tanpa leaking URL/claim/token pada
  error; **WAJIB**. Pengawas `api-source-evidence-mcp-compat` , `api-trivia-source-diagnostics` ,
  `api-post-approval-quality` , `mcp/trivia_fact_test.ts` , `mcp/post_base_test.ts` , dan handler
  source adapter.
- **I-DRAFT — persisted draft, quality, approval, schedule, publication:** server renderer golden,
  blocked-but-saved drafts, revision CAS, provenance, warning/waiver, schedule slot,
  ready/approved/published lifecycle dan anti-fake metrics; **WAJIB**. Pengawas
  `api-post-render-quality` , `api-post-save-revise` , `api-post-approval-quality` ,
  `api-post-reschedule` , `api-post-lifecycle` , `posts-and-post-metrics` , serta post MCP handlers.
- **I-PLAN — Pages/config/plan/claims/leases:** atomic scope, narrow RPC grants, slot occupancy,
  cancellation/claim/recovery, Page config microsecond CAS; **WAJIB**. Pengawas
  `api-page-plan-writes` , `api-plan-lifecycle` , `api-plan-concurrency` ,
  `content-plans-and-plan-items` , `pages-and-page-niche-configs` , serta MCP page/plan handlers.
- **I-METRIC — metrics/insights/rate-limit/performance:** immutable capture, exact normalization
  source/null, archive races, cautious insights, rate limits and bounded performance regressions;
  **WAJIB** sampai owner menerima pemindahan threshold yang beralasan. Pengawas `api-metrics*` ,
  `api-trivia-populated-performance` , `api-phase-five-acceptance` , dan MCP metrics.
- **I-V1 — kompatibilitas v1 dan replay historis:** `RPC` /payload/fixtures `v1` , v6/v7/v8
  historical ledger, legacy snapshot, post-render-v1, dedup-v1 gold/holdout yang **masih dibaca
  runtime/test**; **WAJIB** selama v1 masih didukung. Pengawas `api-batch-b-remediation` ,
  `api-post-lifecycle` , `api-post-save-revise` , `api-source-evidence-mcp-compat` ,
  snapshot/fixture dan `trivia-candidate-retrieval` . Nama historis tidak meniadakan kontrak.
- **I-FIXTURE — audit, cleanup dan lineage fixture:** integrity gold/holdout SHA, no leftover
  workspaces/posts/fault fixtures, artifact output terpisah dari pinned test input, pre/post
  Inspector, final audit; **WAJIB**. Pengawas `trivia-candidate-retrieval` ,
  `api-trivia-public-gold` , `scripts/phase-6-catalog-audit.ts` , `tests/evidence-output.test.ts` ,
  dan 3 posisi audit workflow.
- **I-MCP — transport MCP/Inspector HTTP/auth:** Deno check/lint/15 MCP file, 33 tool
  valid/invalid/denied via authenticated HTTP, initialize/list/challenge, post-run audit, serta
  probe anonymous HTTP untuk path yang berubah; **WAJIB**. Unit/mock transport tidak menggantikan
  Inspector/RPC HTTP atau synthetic cross-owner.
- **I-SOURCE-CI — kode, frontend OAuth dan packaging:** root check (10 file), frontend 3 file,
  typecheck/build, pin/dependency dan paket bila terdampak, classifier deletion/rename; **WAJIB**
  sesuai diff/full manifest. Lint Markdown tidak membuktikan backend.

**Legenda:** `WAJIB` = tetap di full release candidate; `OPSIONAL` = test fokus tambahan tanpa
mengganti kewajiban; `HISTORIS` = asal skenario/fixture, **bukan** otomatis tidak aktif. Semua case
di bagian database berikut berstatus **WAJIB sekarang**; beberapa file bertajuk Phase 2–5 adalah
asal historis tetapi assert aktif. `I-CORE` adalah validator/schema contract dasar yang belum dapat
dipersempit dari label, dan harus ditelusuri sampai assert aktual ketika G2 mengusulkan perubahan.
Pemetaan case diturunkan dari nama `it/test` dan kode sumber; label multi-invariant adalah **indeks
penelusuran**, bukan bukti tes setara sendiri. Pemeriksaan pengganti minimum adalah test dengan
input, role/JWT, status/error, CAS/ledger, session, fixture, dan assertion yang sama atau lebih
ketat, disertai PASS pada SHA yang sama.

## Inventaris kasus database pada main (41 file)

Setiap bagian menautkan source test, lalu memetakan **case → invariant** secara eksplisit. Test
`it.each` yang memproduksi beberapa kasus dicatat sebagai satu **deklarasi parameterisasi**, bukan
dihitung sebagai satu testcase runtime; sebagai contoh `api-trivia-public-gold` menjalankan
development dan holdout. Jumlah runtime dipin pada laporan gate, bukan ditebak dari regex penamaan.
Untuk setiap calon perubahan, bandingkan isi assertion dan fixture, jangan sekadar nama.

### [`api-batch-b-remediation.test.ts`](../../supabase/tests/database/api-batch-b-remediation.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-FACT, I-DRAFT, I-PLAN** —
  `P1-01 legal cross-Page reuse does not invalidate retained revise/approve/publish; new/re-added allocations remain scoped`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-DRAFT** —
  `P2-01 fresh all-pass save and ready revision remain pending until explicit approval, with exact replay`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT** —
  `P2-02 uneven per-fact preferred words require warning acceptance without waiving hard limits`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-FIXTURE, I-V1** —
  `P2-01 administrative legacy normalization is idempotent and preserves historical replay and approved/publication snapshots`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-IDEMP, I-DRAFT, I-V1** —
  `P2-02 legacy ready approval with a newly applicable profile warning blocks publish; exact historical replay and explicit reapproval recover`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-DRAFT** —
  `P1-01 public B save versus A publish BOTH orders preserve legal permanent and retained usages`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-DRAFT** —
  `P2-02 locked narrowed $profile ranges drive save/revise/approval/publish checks` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-metrics-concurrency.test.ts`](../../supabase/tests/database/api-metrics-concurrency.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-RACE, I-IDEMP, I-METRIC** —
  `CON-METRIC duplicate key has one append; duplicate capture conflicts; distinct captures both commit`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-METRIC, I-FIXTURE** —
  `CON-METRIC record/archive both orders wait on workspace and preserve publication/snapshot`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-IDEMP, I-METRIC** —
  `DATABASE_BUSY held workspace timeout and cancellation rollback then same-key retry` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-metrics-insights.test.ts`](../../supabase/tests/database/api-metrics-insights.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-FACT, I-PLAN, I-METRIC, I-SOURCE, I-V1** —
  `paginates adjacent deltas across pages, incompatible/null sources, totals versus point averages and period bounds`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-METRIC, I-SOURCE, I-V1** —
  `negative total watch time is anomalous while average-only decrease remains descriptive and legacy source is unknown`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-DRAFT, I-METRIC, I-V1** —
  `counts latest distinct posts, disjoint exclusions, numeric median/outliers and cautious thresholds without causation`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-METRIC** —
  `returns empty successful evidence and rejects invalid dimensions/metrics/periods/null bounds through public reads`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-metrics.test.ts`](../../supabase/tests/database/api-metrics.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-IDEMP, I-FACT, I-DRAFT, I-METRIC, I-SOURCE** —
  `QUALITY-006 preserves null/zero, subset, UTC/source, unchanged post and immutable historical replay`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-FACT, I-METRIC, I-SOURCE** —
  `RPC-METRIC validates closed metrics/source, numeric range and timestamp boundaries with atomic denial`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-ACL, I-FACT, I-DRAFT, I-METRIC** —
  `SEC-RLS denies missing identity/client, foreign scope, unpublished states and caller tables/helpers`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-METRIC** —
  `CORE-001 insert/completion faults rollback and corrupted v8 envelopes fail closed` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-METRIC** —
  `CORE-008 enforces write/read/expensive-read limits without mutation and exposes cautious insufficient`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-page-plan-writes.test.ts`](../../supabase/tests/database/api-page-plan-writes.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-OWNER, I-FACT, I-PLAN** —
  `AC-002 isolated owner workspace supports three different Page trivia configurations` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-PLAN** —
  `CORE-001 replays all three immutable responses after Page/config/plan/item mutation and rejects mismatched payloads`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-PLAN** —
  `SEC-5.3 denies each public write uniformly for non-owner, absent and malformed request context`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-PLAN** —
  `accepts eight ISO Page markets including DE, rejects aliases/noncodes and preserves workspace defaults`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-PLAN** —
  `rejects closed Page patches, null fields, invalid config, slug conflict and one-microsecond stale CAS without partial writes`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-PLAN** —
  `validates every override type/key/value and stored context ceiling through create_content_plan`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-DRAFT, I-PLAN** —
  `proves 100-item success, contiguous positions, closed schedule intent and public config error mapping`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-PLAN** —
  `rolls back Page/config, plan/items and ledger completion on injected downstream failures` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-DRAFT, I-PLAN** —
  `rechecks both slot tables per item, rolls back a later collision, and honors cancelled/discarded occupancy`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-PLAN** —
  `maps current unsupported registry config to CONFIG_INVALID and disabled registry to MODULE_DISABLED`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-PLAN, I-METRIC** —
  `rate-limits all three public write paths before mutation, including replay requests` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-PLAN** —
  `CON-003 materializes numeric multi-slot locks before writes and serializes conflicting public plans`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-PLAN** —
  `serializes identical concurrent public operation keys to one mutation for all three writes`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-ACL, I-PLAN** —
  `exposes exactly the three new authenticated write RPCs and narrow privileges` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-IDEMP, I-PLAN** —
  `creates a Page and config atomically, replays exactly, and rejects owner/context violations`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-PLAN** — `creates a non-default Page config without changing the default niche` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-PLAN** —
  `updates Page/config with exact CAS and rejects stale writes without partial mutation` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-DRAFT, I-PLAN** —
  `creates exact ordered plan items, links all children to one ledger row, and protects schedules atomically`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-phase-five-acceptance.test.ts`](../../supabase/tests/database/api-phase-five-acceptance.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-OWNER, I-ACL, I-IDEMP, I-V1** —
  `SEC-* exact 33 RPCs, owner policies/default ACL, historical replay security and Phase 6.1 bootstrap`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-DRAFT, I-METRIC** —
  `RPC-METRIC numeric normalization and immutable v8 preserve exact request/replay boundaries without new post revision`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-PLAN, I-METRIC, I-V1** —
  `PERF-READ / PERF-WRITE populated local public metrics/read p95 and normal-planner plans meet frozen targets`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-plan-concurrency.test.ts`](../../supabase/tests/database/api-plan-concurrency.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-RACE, I-IDEMP, I-PLAN** —
  `CON-PLAN/REPLAY parallel workers receive different items and duplicate keys mutate only once`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-RACE, I-PLAN** —
  `CON-LEASE SKIP LOCKED bypasses a held first item while the public owner RPC claims the next item`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-PLAN, I-V1** —
  `CON-PLAN different Pages progress independently while one public claim transaction holds its Page/plan`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-PLAN** —
  `CON-PLAN claim-first and cancel-first RPC transactions wait in one direction and finish without deadlock`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-PLAN** —
  `CON-LEASE retry-first and claim-first races preserve attempts, and competing renewals have one winner`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-PLAN, I-V1** —
  `CON-LEASE reclaimed token rejects a waiting old renewal and lease expiry is rechecked after locks`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-DRAFT, I-PLAN** —
  `CON-SCHEDULE cancellation acquires sorted numeric slots before plan/item/post locks; freed slot races new plan legally`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-IDEMP, I-PLAN** —
  `SEC-BUSY a held Page beyond lock_timeout maps safely and rolls back the public mutation/ledger/event`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-plan-lifecycle.test.ts`](../../supabase/tests/database/api-plan-lifecycle.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-RACE, I-IDEMP, I-PLAN** —
  `CORE-001/002 exact empty and 1/2/3-item replay retains original tokens after renewal, reclaim, failure and cancellation`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-PLAN** —
  `CORE-002 renewal is one-time, no attempt increment, capped at initial +60 minutes and fails for expired claims`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-IDEMP, I-PLAN** —
  `CORE-001/004 failure, retry and cancellation replay exact responses after later mutations; all six semantic mismatches reject`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-DRAFT, I-PLAN** —
  `RPC-PLAN-TERM covers every aggregate precedence including mixed completed/cancelled and explicit cancellation preserving posts`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-DRAFT, I-PLAN, I-V1** —
  `CORE-004 replacement requires explicit intent and all discarded pre-publication history; never restores or deletes old outputs`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-PLAN** —
  `SEC/INPUT validates all six contexts, bounds, safe details and illegal transitions with full rollback`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-ACL, I-PLAN** —
  `SEC-GRANT event history is owner-RLS, app-append-only, and absent from every caller/helper surface`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-IDEMP, I-PLAN** —
  `RPC-ROLLBACK each operation rolls back item/event/plan/ledger when completion fails; cancellation has no partial item set`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-PLAN, I-METRIC** —
  `CORE-008 both write groups enforce rate limits without mutations and return bounded retry recovery`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-PLAN** —
  `CORE-001 closed replay rejects unknown nested overrides, duplicate event references and foreign-operation history`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-DRAFT, I-PLAN** —
  `SEC-OWNER an authorized second workspace cannot discover foreign plan/item/post existence`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-PLAN** —
  `SEC-BUSY query cancellation maps to DATABASE_BUSY and rolls back even after event insertion`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-post-approval-quality.test.ts`](../../supabase/tests/database/api-post-approval-quality.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-DRAFT** —
  `RPC-APPROVAL all-pass preferred content needs no warning acceptance and preserves null reason`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-DRAFT, I-SOURCE** —
  `FACT-SOURCE / FACT-INTEGRITY and hard readability are never exempted by accepted preferences`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-DRAFT** —
  `RPC-QUALITY-003 adaptive count waiver preserves failed check/rollup and requires both stored override and owner reason`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-DRAFT** —
  `QUALITY-005 fixed/above-max count and hard budgets cannot be waived; public discard can abandon failed drafts`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-DRAFT** —
  `RPC-APPROVAL exact acceptance for every style ID preserves needs_review and rejects fail/unlisted/critical/incomplete`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-DRAFT** —
  `WAIVER-NOT-ALLOWED duplicates, inactive/unknown IDs and invalid reasons cannot authorize readiness`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-DRAFT** —
  `QUALITY-EVIDENCE-STALE malformed/hash/revision bindings and forged approval provenance are denied`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-DRAFT** —
  `FACT-FRESHNESS publish checks immutable usage expiry even after successful public reverify`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-FACT, I-DRAFT, I-PLAN, I-SOURCE** —
  `FACT-INTEGRITY current correction/source/config changes block approval/publish; archive keeps published history`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-post-concurrency.test.ts`](../../supabase/tests/database/api-post-concurrency.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-RACE, I-IDEMP, I-DRAFT** —
  `CON-REPLAY / CON-REVISION duplicate save and concurrent CAS revision have one logical winner`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-DRAFT, I-PLAN** —
  `CON-SAVE-CANCEL both public commit orders preserve exactly one legal plan/post/allocation outcome`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-DRAFT, I-PLAN** —
  `CON-SCHEDULE opposite-direction public reschedules share sorted two-slot locks without deadlock`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-RACE, I-FACT, I-DRAFT, I-V1** —
  `CON-CORRECTION save/revise versus correction, both orders, hold identity+lineage before facts`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-IDEMP, I-DRAFT** —
  `DATABASE_BUSY held workspace and actual statement cancellation roll back and same-key retry succeeds`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-post-lifecycle-concurrency.test.ts`](../../supabase/tests/database/api-post-lifecycle-concurrency.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-RACE, I-DRAFT** —
  `CON-LIFECYCLE approve versus revise and discard versus reschedule BOTH orders retain one exact revision`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-DRAFT, I-PLAN** —
  `CON-DISCARD-REPLACEMENT Page/slot gate serializes explicit replacement after discard without implicit plan mutation`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-RACE, I-FACT, I-DRAFT, I-V1** —
  `CON-FACT-APPROVAL correction/reverify versus approve/publish BOTH commit orders hold workspace/identity locks and preserve publication`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-IDEMP, I-DRAFT** —
  `CON-REPLAY all five same-key concurrent calls have one mutation/history and original replay`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-DRAFT** —
  `CON-LIFECYCLE publish versus revoke/discard BOTH orders and competing approvals have one legal CAS winner`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-IDEMP, I-DRAFT** —
  `DATABASE-BUSY lifecycle lock timeout and actual cancellation roll back completely, then same-key retry succeeds`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-post-lifecycle.test.ts`](../../supabase/tests/database/api-post-lifecycle.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-DRAFT, I-METRIC** — `RATE-LIMIT exact lifecycle groups reject every write before mutation`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-DRAFT, I-SOURCE** —
  `CORE-007 null transition metadata injected at completion must fail closed and roll back` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-DRAFT** —
  `RPC-LIFE / RPC-APPROVAL every binding, provenance and immutable v6/v7 replay survives later transitions`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-DRAFT** —
  `SEC-OWN / explicit constants and all five non-owner/missing-context paths leave no mutation`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-DRAFT, I-PLAN** —
  `RPC-LIFE discard releases only current allocations, retains completed plan and reports explicit replacement eligibility`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-DRAFT** —
  `RPC-ROLLBACK every lifecycle write rolls back after mutation/history and ledger faults, then same-key retry succeeds`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-IDEMP, I-FACT, I-DRAFT** —
  `RPC-PUBLISH validates publication fields and duplicate platform identity atomically` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-DRAFT, I-V1** —
  `CORE-007 v7 corrupt envelopes/history fail closed without weakening historical v6` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-post-render-quality.test.ts`](../../supabase/tests/database/api-post-render-quality.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-IDEMP, I-FACT, I-DRAFT, I-FIXTURE, I-V1** —
  `QUALITY-001 persisted golden fixtures and exact character/line/replay boundaries` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-DRAFT, I-METRIC, I-FIXTURE, I-V1** —
  `QUALITY-001 golden plain/numbered metrics, Unicode words, wrapping and LF normalization` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-DRAFT** —
  `RPC-BUDGET quality failures persist drafts; formats/profiles share server authority` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-DRAFT** —
  `QUALITY-003 editorial closed allowlist/severity and missing review cannot fabricate approval`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-IDEMP, I-DRAFT** —
  `RPC-BUDGET independent final overflow and word/line/replay limits persist blocking draft checks`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-post-reschedule.test.ts`](../../supabase/tests/database/api-post-reschedule.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-DRAFT, I-PLAN** —
  `CORE-003 archived posts still occupy slots; terminal targets reject schedule writes` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-DRAFT, I-PLAN** —
  `RPC-SCHEDULE linked move/clear changes both slots atomically and replays original schedule`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-DRAFT** —
  `QUALITY-005 ready stays ready; evidence/approval carry original provenance across schedule revision`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-IDEMP, I-DRAFT** —
  `CORE-003 conflict/new payload/non-owner/terminal and completion fault all roll back` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-DRAFT** —
  `QUALITY-005 draft missing/stale evidence is denied before rebinding with complete rollback`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-DRAFT, I-METRIC** —
  `PERF-WRITE public bounded save/revise/reschedule p95 is below three seconds` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-post-save-revise.test.ts`](../../supabase/tests/database/api-post-save-revise.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-IDEMP, I-FACT, I-DRAFT, I-PLAN, I-SOURCE** —
  `CORE-007 known plan claim token cannot escape through immutable public source metadata` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-IDEMP, I-DRAFT** —
  `CORE-005 standalone save, authoritative evidence and exact replay after revision` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-DRAFT, I-PLAN** —
  `CORE-005 public plan claim/save completes exactly one item and preserves attempt history` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-DRAFT, I-FIXTURE** —
  `RPC-REVISE partial/full replacement, reordering and re-addition preserve snapshots/history`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-ACL, I-IDEMP, I-DRAFT** —
  `CORE-007 history/ledger bounds, immutability, owner RLS and corrupted replay fail closed` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-DRAFT, I-PLAN** —
  `FACT-004/006 expired reservation/claim and stale evidence cannot leave a partial draft` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-ACL, I-IDEMP, I-FACT, I-DRAFT** —
  `CORE-007 owner/client/schema/fact/config/CAS denial leaves no partial business mutation` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-FACT, I-DRAFT, I-PLAN** —
  `RPC-ROLLBACK completion fault rolls back save/revise/history/plan and keeps reservation releasable`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-read-rpcs.test.ts`](../../supabase/tests/database/api-read-rpcs.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-OWNER, I-ACL** —
  `exposes exactly the nineteen authenticated API RPCs with narrow catalog privileges` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-METRIC** —
  `serves every read projection for the owner, including safe pagination and performance output`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-FACT, I-SOURCE** —
  `denies every workspace-scoped read to a non-owner without revealing resource existence` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER** —
  `returns stable validation, owner-safe not-found, and empty-success responses without business mutation`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-security-kernel.test.ts`](../../supabase/tests/database/api-security-kernel.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-OWNER, I-ACL** —
  `keeps the API-owner role narrow, private helpers uncallable, and no business API premature`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-ACL** —
  `denies caller table, sequence, and internal-helper access while retaining api schema usage`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-ACL, I-FACT** — `applies request identity and owner RLS to the narrow API role`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-ACL, I-RACE** — `canonicalizes semantic hashes and provides safe timeout mapping` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-ACL, I-RACE, I-IDEMP** — `bounds ledger lock contention and exposes only DATABASE_BUSY`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-ACL, I-RACE, I-IDEMP, I-FACT, I-PLAN** —
  `serializes replay, rejects key reuse, and rolls back an uncompleted ledger claim` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-ACL, I-IDEMP, I-PLAN** —
  `binds completion to the workspace and operation that claimed the ledger row` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-ACL, I-RACE, I-IDEMP** — `increments rate buckets atomically and blocks writes at the limit`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-source-evidence-mcp-compat.test.ts`](../../supabase/tests/database/api-source-evidence-mcp-compat.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-FACT, I-SOURCE, I-V1** —
  `pinpoints the omitted three keys on every fact, preserves tier pairing and rejects unsafe metadata`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-FACT, I-DRAFT, I-SOURCE, I-V1** —
  `takes owner context through seven-source reservation, draft save, and source/quality readback`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-trivia-concurrency.test.ts`](../../supabase/tests/database/api-trivia-concurrency.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-OWNER, I-RACE, I-FACT** —
  `CON-RESERVE-001 gives exactly one active owner to ten concurrent public reservation calls`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-ACL, I-RACE, I-IDEMP, I-FACT** —
  `serializes duplicate-key callers into mutation plus replay and overlapping sets into all-or-nothing`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-FACT** —
  `gives one winner to competing reverify/correction CAS and exactly one direct successor` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-IDEMP, I-FACT** —
  `revalidates exact CAS after workspace waits and maps lock timeout safely without partial ledger state`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-OWNER, I-ACL, I-RACE, I-FACT, I-METRIC** —
  `enforces auth/client/direct-table/helper/history denial, exact ACLs and rate limits for all five operations`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-FACT** —
  `maps active statement cancellation to DATABASE_BUSY and rolls back history and fact mutations`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-FACT, I-METRIC** —
  `keeps representative public candidate search and reserve below local p95 targets` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-trivia-correction.test.ts`](../../supabase/tests/database/api-trivia-correction.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-OWNER, I-IDEMP, I-FACT** —
  `RPC-CORRECT-001 proves exact microsecond/offset CAS, identity preservation, replay and semantic mismatch`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-FACT, I-DRAFT, I-PLAN, I-FIXTURE** —
  `atomically corrects draft/ready across Pages while preserving posted/archived rows and every usage snapshot`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-FACT, I-V1** —
  `creates exactly one materially changed successor with safe historical replay and explicit correction validation`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-DRAFT, I-SOURCE** —
  `preserves post approvals and immutable evidence during same-meaning source refresh` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-FACT, I-PLAN** —
  `CORE-001 rolls back reverify and cross-Page correction at completion, then retries the identical operations`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT** — `caps affected summaries at 50 without capping mutation or exact counts` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-FACT, I-SOURCE** —
  `fails closed on corrupted replay projections and hash collisions without exposing raw metadata`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-trivia-facts.test.ts`](../../supabase/tests/database/api-trivia-facts.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-IDEMP, I-FACT, I-PLAN, I-V1** —
  `RPC-FACT-001 / CORE-001 preserves ordered reserve/release replay, token privacy and historical inactive binding`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-SOURCE** —
  `RPC-DEDUP-001 returns deterministic capped source-free matches without business mutations or private fields`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT** —
  `accepts nine explicitly discriminated same-topic members without invented intra-set reviews and obeys match caps`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT** —
  `distinguishes exact, safe structured and reviewed same matches, refreshes expired evidence and rejects uncertain/unsafe duplicates`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-PLAN** —
  `checks strong review and actual material discriminators without auto-merging related claims`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-SOURCE** —
  `validates source/freshness/risk/versions and rolls back an entire set on conflict` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-PLAN** —
  `releases expired/config-changed/corrected sets without affecting allocation or another Page binding`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-DRAFT, I-PLAN** —
  `enforces workspace/page reuse and allows released junction history without erasing published usage`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-IDEMP, I-FACT, I-PLAN** —
  `CORE-001 rolls back reserve and release at ledger completion and safely retries the same key`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-trivia-populated-performance.test.ts`](../../supabase/tests/database/api-trivia-populated-performance.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-OWNER, I-FACT, I-PLAN, I-METRIC** —
  `P1-02 authenticated 5,001-fact public search p95 and normal-planner plans` (WAJIB; assert/fixture
  dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-trivia-public-gold.test.ts`](../../supabase/tests/database/api-trivia-public-gold.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-OWNER, I-FACT, I-FIXTURE, I-V1** —
  `evaluates frozen %s pairs through authenticated api without automatic anti-merge signals` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`api-trivia-source-diagnostics.test.ts`](../../supabase/tests/database/api-trivia-source-diagnostics.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-FACT, I-SOURCE** — `identifies the first failing fact and safe source-policy reason` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-SOURCE** — `keeps stable standard facts with one valid Tier B eligible` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-SOURCE** — `preserves the supplied fact position without returning source text`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT** — `does not expose an unrecognized internal diagnostic` (WAJIB; assert/fixture dan
  jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT** — `reports the rejected fact position without changing semantic review policy` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT** — `keeps positionless and unknown diagnostics generic` (WAJIB; assert/fixture dan jalur
  yang ditunjuk oleh kasus ini harus dipertahankan).

### [`baseline.test.ts`](../../supabase/tests/database/baseline.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-MIG, I-OWNER, I-ACL** — `enforces the extension, privilege, Data API, and OAuth boundary`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`content-plans-and-plan-items.test.ts`](../../supabase/tests/database/content-plans-and-plan-items.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-ACL, I-DRAFT, I-PLAN** — `enforces scoped plans, schedules, leases, and private privileges`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`core-primitives-and-validators.test.ts`](../../supabase/tests/database/core-primitives-and-validators.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-IDEMP, I-DRAFT** — `validates versions and classifies private replay and schedule conflicts`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-DRAFT, I-PLAN** — `serializes cross-session Page schedule contention` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-PLAN** — `permits independent slots and supports self-exclusion` (WAJIB; assert/fixture dan
  jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`final-remediation.test.ts`](../../supabase/tests/database/final-remediation.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-FACT, I-METRIC** —
  `fails closed for trivia, evidence, timezone, market, and metrics contracts` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`oauth-resource-audience-hook.test.ts`](../../supabase/tests/database/oauth-resource-audience-hook.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-OWNER, I-FACT** —
  `binds OAuth code and refresh tokens to MCP without changing ordinary sessions` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`operation-ledger-and-rate-limit-buckets.test.ts`](../../supabase/tests/database/operation-ledger-and-rate-limit-buckets.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-IDEMP, I-METRIC** — `enforces private idempotency and operational-counter invariants` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`pages-and-page-niche-configs.test.ts`](../../supabase/tests/database/pages-and-page-niche-configs.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-OWNER, I-PLAN** — `enforces workspace-scoped Page and niche-config ownership` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`phase-5-operation-map.test.ts`](../../supabase/tests/database/phase-5-operation-map.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-ACL, I-V1** — `keeps the frozen 33-operation inventory machine-readable` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`posts-and-post-metrics.test.ts`](../../supabase/tests/database/posts-and-post-metrics.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-ACL, I-DRAFT, I-METRIC** —
  `enforces post lifecycle, scope, metrics, indexes, and private privileges` (WAJIB; assert/fixture
  dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`trivia-audit-remediation.test.ts`](../../supabase/tests/database/trivia-audit-remediation.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-OWNER, I-FACT, I-SOURCE** —
  `closes identity, source, review, and reservation-context validation gaps` (WAJIB; assert/fixture
  dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`trivia-candidate-retrieval.test.ts`](../../supabase/tests/database/trivia-candidate-retrieval.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-FACT** — `returns deterministic, capped private candidates and retains its search indexes`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-FIXTURE** —
  `validates fixture provenance, editorial evidence, quotas, and canonical unordered uniqueness`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-SOURCE, I-FIXTURE, I-V1** —
  `binds the frozen holdout to its source-controlled checksum` (WAJIB; assert/fixture dan jalur yang
  ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-PLAN** —
  `uses the expected indexes in actual exact, structured, FTS, and trigram plans` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT** — `evaluates %s through the private database helper` (WAJIB; assert/fixture dan jalur
  yang ditunjuk oleh kasus ini harus dipertahankan).

### [`trivia-facts-schema.test.ts`](../../supabase/tests/database/trivia-facts-schema.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-ACL, I-FACT** — `enforces canonical scope, lifecycle shape, and caller isolation` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`trivia-identity-and-source.test.ts`](../../supabase/tests/database/trivia-identity-and-source.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-OWNER, I-FACT** — `derives deterministic identity and fails closed on invalid evidence`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`trivia-lineage-and-reverification.test.ts`](../../supabase/tests/database/trivia-lineage-and-reverification.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-FACT, I-DRAFT** —
  `refreshes only same-meaning facts and preserves published evidence through corrections` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-RACE, I-FACT** — `permits one concurrent correction winner and no partial successor` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT, I-PLAN, I-METRIC** —
  `keeps candidate retrieval and simple reserve-release below the local p95 target` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`trivia-post-facts.test.ts`](../../supabase/tests/database/trivia-post-facts.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-ACL, I-FACT, I-DRAFT** — `enforces scoped immutable fact usage and the closed caller boundary`
  (WAJIB; assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`trivia-reservation-and-reuse.test.ts`](../../supabase/tests/database/trivia-reservation-and-reuse.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-IDEMP, I-FACT, I-PLAN** —
  `reserves exact eligible sets atomically and enforces release, expiry, context, and reuse` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).
- **I-FACT** —
  `allows one ten-session contender with no partial loser and independent facts proceed` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

### [`workspaces-and-niches.test.ts`](../../supabase/tests/database/workspaces-and-niches.test.ts)

**Status:** WAJIB selama kontrak aktif; tiap butir berikut test/case yang menjaga invariant
berlainan. Perubahan status membutuhkan pembanding G4, bukan nama fase.

- **I-ACL** — `enforces tenant, registry, catalog, RLS, and privilege invariants` (WAJIB;
  assert/fixture dan jalur yang ditunjuk oleh kasus ini harus dipertahankan).

## Matrix source, frontend, Edge dan workflow yang tidak boleh terlewat

- **I-SOURCE-CI (root 10 file):** `tests/foundation.test.ts` (scaffold),
  `tests/plugin-config.test.ts` (configuration contract), `tests/plugin-package.test.ts` (artifact
  contents), `tests/plugin-skill.test.ts` (instruksi dan cross references),
  `tests/plugin-trivia.test.ts` (trivia source/content), `tests/phase-8-coverage.test.ts` (pinned
  coverage), `tests/workflow-config.test.ts` (gate wiring),
  `tests/workflow-change-classification.test.ts` (rename/deletion/dependency selection),
  `tests/evidence-output.test.ts` (pemisahan fixture/output),
  `tests/issue-56-dedup-recovery.test.ts` (redacted dedup diagnostic recovery). Semuanya **WAJIB
  dalam `pnpm run check` ** ketika full gate; permintaan docs-only light CI boleh SKIP sesuai
  classifier dan harus dicatat SKIPPED, bukan PASS.
- **I-OWNER/I-SOURCE-CI (frontend 3 file):** `auth-frontend/tests/auth.test.mjs` (OAuth/token),
  `auth-frontend/tests/direct-routes.test.mjs` (routing/denial),
  `auth-frontend/tests/phase95.test.mjs` (hosted flow/regression) melalui `frontend:test` plus
  typecheck/build. **WAJIB** source branch full, bukan bukti login production.
- **I-MCP/I-OWNER (MCP 15 file):** `supabase/functions/mcp/pilot_db_test.ts` (RPC adapter),
  `transport_test.ts` (JSON-RPC/HTTP contracts), `auth_test.ts` dan `oauth_production_test.ts`
  (token/owner/resource), `foundation_test.ts` (registry and errors), `page_plan_test.ts` ,
  `plan_claim_test.ts` , `plan_recovery_test.ts` , `trivia_fact_test.ts` ,
  `trivia_correction_test.ts` , `post_base_test.ts` , `post_edit_test.ts` , `post_approval_test.ts`
  , `post_publication_test.ts` , `post_metrics_test.ts` (handler schema/context/replay and negative
  contract). **WAJIB** Deno check/lint/test sekali per full candidate; tidak boleh mengganti
  Inspector.
- **I-MCP (probe di luar suite):** `supabase/functions/mcp-probe/handler_test.ts` dipanggil
  kondisional oleh `.github/workflows/ci.yml` , **WAJIB** bila probe/dependency tersentuh,
  **OPSIONAL** bila tidak; jangan menyebutnya bagian dari 15 `test:mcp` .
- **I-MCP/I-OWNER (live loopback):** `scripts/phase-6-13.ts` harus membuktikan 33 `tools/call` valid
  dan invalid, authenticated owner, missing/malformed token, cross-owner 403, tanpa partial
  unauthorized mutations, serta audit state; **WAJIB** backend release gate.
  `scripts/phase-6-1-http-smoke.ts` hanya focused HTTP discovery/challenge, **OPSIONAL** selama
  Inspector ekuivalen dan semua boundary terbukti. `hosted-oauth-probe.yml` manual anonim,
  **OPSIONAL** untuk metadata hosted; bukan owner E2E.
- **I-MIG/I-ACL/I-FIXTURE:** `scripts/verify-migrations.ts` , `scripts/phase-6-catalog-audit.ts` ,
  pinned `docs/phase-5-7-catalog-audit.sql` , `docs/phase-5-8-catalog-audit.sql` ,
  `docs/phase-5-9-final-catalog.json` , `docs/phase-5-batch-b-remediation-final-catalog.json` , 72
  `supabase/migrations/*.sql` , `supabase/tests/database/fixtures/post-render-v1.json` ,
  `supabase/tests/fixtures/trivia/dedup-v1/*` dan history/performance input; semua tergolong **input
  aktif** sampai pembaca/assert terkait terbukti diganti.
- **I-SOURCE-CI/I-MIG:** `.github/workflows/ci.yml` menjalankan perubahan path format/migration
  filename dan subset sesuai classifier; `.github/workflows/backend-technical-gate.yml` full backend
  manual memakai exact SHA; `scripts/test-all.ts` mengulangi `test:mcp` ; `scripts/smoke-test.ts`
  mengulangi DB suite hanya bila ikut dipanggil. **Wajib** mempertahankan minimum cakupan pada
  cutover, bukan mempertahankan pemanggilan ganda.

## Kandidat pengurangan dan bukti pengganti (belum dieksekusi)

1. **GABUNG pemanggilan `test:mcp` kedua (terbukti duplikat eksekusi).** Bukti:
   `backend-technical-gate.yml` focused `pnpm run test:mcp` sebelum Inspector dan
   `scripts/test-all.ts` baris ketiga mengulang command yang sama; log
   [40364895835](https://github.com/milyarderpro/content-producer/actions/runs/40364895835)
   memperlihatkan kedua panggilan. **Pengganti tepat:** satu Deno check + lint + seluruh 15 test MCP
   sebelum Inspector dalam `gate:backend` , dengan status dan SHA tercatat; `gate:source` tetap
   membawa `check` . **Yang dapat dihapus hanya panggilan kedua**, bukan satu pun file/case. Wajib
   validasi G4 lama/baru.
2. **TIDAK MEMASUKKAN `smoke-test` ke full gate (wiring terbukti tumpang tindih, bukan penghapusan
   test).** `scripts/smoke-test.ts` memanggil `verify-migrations` dan `test:database` yang telah
   berjalan; saat ini bukan langkah pada dua run. Pemeriksaan pengganti adalah `verify-migrations`
   plus `test:database` sekali pada manifest full; health/OAuth HTTP tetap via Inspector. Tidak ada
   penghematan terukur dari menghapus step yang memang tidak ada.
3. **PERTIMBANGKAN menggabung case katalog 33 RPC, tetapi bukti kesetaraan belum ada.**
   `phase-5-operation-map` menjaga frozen operasi, `api-phase-five-acceptance` memeriksa
   privilege/33-RPC, `api-read-rpcs` memeriksa 19 Read, dan audit memeriksa ACL: **invariant
   berbeda**. Pengganti baru sah bila satu test memeriksa daftar operation yang sama **dan** seluruh
   privileges, owner denial, schema/hash; sampai itu terbukti, seluruhnya WAJIB.
4. **PERTIMBANGKAN isolasi fixture/performance ke jalur terukur, tetapi JANGAN pindah dahulu.**
   `api-trivia-public-gold` menguji 105 development + 45 holdout dalam 2 parametric test,
   `api-trivia-populated-performance` 5.001 fakta, `trivia-candidate-retrieval` indexes/checksum.
   Mengganti dengan audit katalog saja **tidak setara**. Untuk memindah threshold ke nightly perlu
   kriteria pemilik dan pengganti release smoke dengan input/threshold, source SHA dan evidence yang
   disepakati; **status sekarang WAJIB**.
5. **File asal historis (`baseline`, `final-remediation` , `trivia-identity-and-source` ,
   `pages-and-page-niche-configs` , dll.): tidak ada penghapusan yang dibenarkan saat G1.** Kontrak
   SQL/ACL, validasi metadata, schema, fixture dan v1 masih aktif. Agar layak `HISTORIS-only` ,
   tunjukkan deprecation runtime yang resmi atau pasangan assertion yang identik/lebih kuat pada SHA
   sama, lalu jalankan pengujian old/new sebelum G4. Label `Phase N` tidak cukup.

## Kriteria penerimaan untuk orchestrator sebelum G2

- Cocokkan tepat **41 file** inventaris ini dengan `vitest.database.config.ts` ; setiap test
  `it.each` harus diperiksa ekspansi cases-nya, bukan hanya deklarasinya; 41/180 adalah hasil 26
  Okt, bukan klaim PASS SHA G1. Uji jumlah aktual saat G4 tanpa menggunakan production.
- Periksa per-case invariant untuk source URL/Tier/unknown diagnostic, owner/non-owner/ACL, DB
  race/session, idempotency/CAS, versioned replay, draft approvals, gold/dedup fixtures. Terima
  pengurangan **hanya** setelah bukti pembanding input dan output atas kandidat yang sama.
- Tidak ada kontrak v1 yang resmi dipensiunkan dalam sumber ini. Semua usul memindah/hapus test
  selain pemanggilan suite duplikat adalah **BELUM TERBUKTI** dan harus menunggu G2/G4 evidence;
  jangan menyatakan `phase` sebagai alasan.
- **CR-020/CR-044 masih efektif.** CR-052 hanya draft; jangan merge/mengganti full gate atau melepas
  backend sampai G4 dan cutover eksplisit.
