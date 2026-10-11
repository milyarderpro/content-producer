# Checkpoint 5.5 — Trivia RPC composition report

Tanggal: 11 Oktober 2026. Baseline **f2e803c**, working tree awal bersih,
36 migration dan 19 API RPC. Audit independen Batch A telah diterima pengguna.
Pengguna mengotorisasi tepat lima RPC trivia dan dokumentasi keputusan sebelum
migration pertama.

**Implementasi dan verifikasi lokal 5.5 selesai: 24 RPC, 46 migration, 98/98
database tests lulus.** Laporan ini adalah handoff checkpoint, bukan completion
seluruh Phase 5 atau persetujuan audit independen final Batch B. 5.6+ tidak dimulai.

## 1. Keputusan sebelum migration

- `plans/works/phase-5-5-implementation-plan.md` ditulis sebelum migration pertama.
- **CR-012 Accepted**:
  `docs/decisions/2026-10-11-phase-5-5-trivia-rpc-reconciliation.md`, ditulis
  sebelum migration pertama berdasarkan otorisasi eksplisit pengguna.
- CR-004/005/009/010/011 tetap berlaku; dokumen frozen tidak diubah.

CR-012 menetapkan replay v5 token-free, source-free candidate retrieval, strong
candidate predicate, intra-set generated-ID reconciliation, bounded affected
summaries, private reservation history, exact CAS, server freshness ceiling,
cross-Page post effects dan workspace-first lock protocol. Temuan berikut juga
dicatat spesifik sebelum perbaikan perilaku:

1. Shared fact touch trigger lama memakai transaction-start now(); fact-only
   additive trigger kini menggunakan max(clock_timestamp, old + 1 mikrodetik).
2. `begin_read_v1` lama menghitung rate bucket tetapi mengabaikan allowed flag.
   Shared kernel kini memakai enforcing assertion tepat sekali, tanpa mengubah
   signatures/limits. Regresi existing insights read membuktikan RATE_LIMITED.
3. Exact claim tidak boleh mengabaikan contradictory material identity.
4. Privilege assertion 5.4 yang melarang semua status UPDATE disesuaikan dengan
   cumulative role 5.5: exact post-column allowlist dan larangan post mutation
   oleh enam plan RPC serta private plan helpers. Caller/event denial tetap utuh.

## 2. File dan migration

Seluruh migration dibuat dengan Supabase CLI setelah membaca help. Ada **10
migration additive baru**: tiga utama dan tujuh hardening. Tidak ada migration
baseline/applied file yang ditulis ulang.

| Migration di `supabase/migrations/`                                     | Tujuan                                                                                                          |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `20261011131503_phase_5_5_trivia_rpc_foundation.sql`                    | Narrow grants/RLS, immutable reservation history, validators, source-free retrieval, ordered gates, safe errors |
| `20261011131505_phase_5_5_trivia_registration_reservation_rpcs.sql`     | Find/register/reserve/release, strict request composition dan token-free replay v5                              |
| `20261011131507_phase_5_5_trivia_reverification_correction_rpcs.sql`    | Reverify/correct, exact CAS dan atomic cross-Page post effects                                                  |
| `20261011151632_harden_phase_5_5_fact_resolution.sql`                   | Qualified OUT-column resolution dan monotonic fact timestamp                                                    |
| `20261011151903_harden_phase_5_5_ordered_candidate_sets.sql`            | Qualified position ordinal dan explicit intra-set new-ID tracking                                               |
| `20261011152031_fix_phase_5_5_token_free_completion.sql`                | Parenthesized JSON extraction sebelum token-field subtraction                                                   |
| `20261011152154_fix_phase_5_5_review_aliases_and_post_dependencies.sql` | Qualified review alias dan narrow post-validator dependency grants                                              |
| `20261011152951_enforce_phase_5_5_read_limits_and_closed_replay.sql`    | Shared read limit enforcement, actual negation discriminator dan null-safe replay enums                         |
| `20261011153430_guard_phase_5_5_identity_and_replay_bindings.sql`       | First-use ledger guard, contradictory exact-claim rejection dan historical target/summary binding               |
| `20261011154353_harden_phase_5_5_history_context.sql`                   | Explicit history/ledger/hash RLS correlation dan unique nonnull ordered UUID check                              |

Hardening transformations use exact prior function definitions with expected
fragment assertions where applicable; clean reset proves they are reproducible.

Tests baru:

- `supabase/tests/database/api-trivia-facts.test.ts`: **9 tests**.
- `supabase/tests/database/api-trivia-correction.test.ts`: **7 tests**.
- `supabase/tests/database/api-trivia-concurrency.test.ts`: **7 tests**.
- `supabase/tests/database/helpers/trivia-rpc.ts`: ephemeral fixtures, safe caller
  contexts, digest assertions, dependency-ordered cleanup dan later-phase status
  fixtures yang diberi label eksplisit.

Existing `api-page-plan-writes.test.ts`, `api-read-rpcs.test.ts`,
`api-security-kernel.test.ts`, `trivia-post-facts.test.ts` memperbarui exact
allowlist/count menjadi 24. `api-plan-lifecycle.test.ts` memperbarui cumulative
post-column privilege assertion seperti dijelaskan di CR-012. Ownership, RLS,
direct-access, helper denial dan event immutability coverage dipertahankan.

Audit query: `docs/phase-5-5-catalog-audit.sql`, reproducible, read-only dan
token-free. Tidak ada file runtime TypeScript/MCP/Edge baru.

## 3. Exact allowlist delta

Kelima API baru memakai typed parameters, SECURITY DEFINER, owner
`content_producer_api_owner`, `search_path=''`, dan authenticated-only EXECUTE.
Public response envelope tetap response_schema_version=1.

| RPC sesudah prefix `api.`           | Signature                                                                         | Rate group       |
| ----------------------------------- | --------------------------------------------------------------------------------- | ---------------- |
| `trivia_find_similar_facts`         | `(integer,uuid,uuid,jsonb,integer)`                                               | expensive_read   |
| `trivia_register_and_reserve_facts` | `(integer,uuid,uuid,uuid,uuid,timestamptz,text,integer,jsonb)`                    | contention_write |
| `trivia_release_facts`              | `(integer,uuid,uuid,uuid,uuid,text)`                                              | contention_write |
| `trivia_reverify_fact`              | `(integer,uuid,uuid,uuid,timestamptz,text,jsonb,text,date,timestamptz,text,text)` | write            |
| `trivia_correct_fact`               | `(integer,uuid,uuid,uuid,timestamptz,text,text,jsonb,boolean)`                    | contention_write |

Catalog membuktikan **24/24 exact names**, tidak ada overload atau generic
executor/status tool. Final Phase 5 inventory tetap 33; sembilan operasi sisanya
belum diimplementasikan.

## 4. Behavior dan evidence

### Public path dan authorization

Domain calls dijalankan sebagai authenticated dengan request.jwt.claims yang
memuat owner sub dan OAuth client_id. Administrator hanya menyiapkan fixture
Auth/workspace atau later-phase post statuses, melakukan contention/fault setup,
inspeksi catalog dan cleanup. Missing user/client, non-owner dan direct
table/sequence/helper access ditolak.

### Registration, search, release dan replay

- Ordered sets 1/3/9 facts, contiguous positions, distinct resolved canonical IDs,
  new/eligible matched/refreshed canonical actions dan complete transaction rollback.
- Exact/safe structured match, explicit semantic same, actual material distinct
  review, unsafe structured review-required dan hash-collision paths.
- Nine same-topic members dengan material discriminators eksplisit diterima tanpa
  fabricated reviews untuk ID yang baru dihasilkan di dalam set tersebut.
- Source tier/risk/independence, as-of requirement, expiry, version, closed keys,
  stale config dan workspace/page reuse denial diuji.
- Source-free find tetap capped/deterministic, tidak membuat ledger/business rows,
  tidak mengekspos private fields dan tidak menghasilkan source_overlap.
- Reserve token tetap ada di respons. Replay menggunakan identical request token
  dan historical token-free snapshot. Digest equality diuji setelah release;
  tidak ada token value/key dalam ledger fixture yang sedang aktif.
- Release/new-key release ulang, expired/config-changed/corrected set, unknown
  token, wrong Page binding, original inactive count, dan published/allocated
  junction preservation diuji. Token lama tidak dapat dihidupkan kembali.
- Seluruh empat writes mempunyai replay dan valid changed-payload mismatch
  coverage. Corrupted replay projections ditolak dengan safe INTERNAL_ERROR.

### CAS, correction dan immutable history

- Exact microsecond mismatch ditolak tanpa mutation; equivalent timestamp instant
  diterima; reverify mempertahankan claim/structured identity.
- Reverify tidak mengubah post approvals atau usage snapshots.
- Invalidation/supersede, meaning-change guard, explicit confirmation dan satu
  successor diuji; correction membersihkan active reservation.
- Draft dan ready di beberapa Page berubah atomic, revision naik sekali,
  ready → draft, approval/ready_at/current editorial evidence dibersihkan dan
  blocking `trivia.facts.current_verified` ditulis server-side.
- Posted/archived rows dan seluruh junction snapshots dibandingkan byte-equivalent
  sebelum/sesudah correction. Existing get_post menghasilkan current correction warning.
- Fixture 51 affected drafts menghasilkan count=51, items=50, truncated=true,
  sedangkan **seluruh 51 post berubah**, bukan hanya subset respons.

### Separate-session races, faults dan performance

- **Sepuluh concurrent public reserve calls: satu success, sembilan
  FACT_RESERVATION_CONFLICT; satu canonical fact, satu active reservation/set;
  deadlock counter tidak bertambah.**
- Duplicate operation key: satu mutation + satu replay.
- Overlapping sets: satu set menang; set lain rollback, tanpa partial new fact.
- Competing reverify/correction dan two corrections mempunyai satu CAS winner;
  predecessor memiliki satu direct successor.
- Public write ditahan terbuka pada workspace gate; waiter membandingkan CAS
  terbaru setelah wait, bukan state sebelum wait.
- Held workspace melewati 2s menghasilkan DATABASE_BUSY dengan full rollback dan
  same-key retry sesudah locker commit.
- Active statement cancellation saat ledger completion menjadi DATABASE_BUSY,
  rollback fact/history/ledger, dan same-key retry sukses. Timer diaktifkan sebelum
  statement public RPC; SET LOCAL di dalam function tidak dianggap bukti deadline
  untuk statement yang sudah mulai.
- Completion faults pada reserve/release/reverify/correction membuktikan rollback
  setelah business mutations/history/post impact, bukan hanya input rejection.
- Harness public search/reserve p95 checks lulus. Pengukuran agregat tambahan,
  12 sampel per operasi termasuk local caller-process overhead: **search 130 ms,
  reserve 206 ms**, keduanya di bawah target 3 detik. Ini local bounded-fixture
  evidence, bukan benchmark cloud/production-scale.

## 5. Final security catalog

Catalog dijalankan setelah full gate. Hasil:

| Assertion                                                     | Hasil                  |
| ------------------------------------------------------------- | ---------------------- |
| API functions / authenticated EXECUTE                         | 24 / 24                |
| Allowlist difference / overload / unsafe API                  | 0 / 0 / 0              |
| PUBLIC, anon, service_role API execution                      | 0                      |
| Caller/PUBLIC private helper execution                        | 0                      |
| Caller table / column / sequence privilege                    | 0 / 0 / 0              |
| PUBLIC table / sequence privilege                             | 0 / 0                  |
| RLS-enabled business/operational tables                       | 14 / 14                |
| Tables owned by API owner / role memberships                  | 0 / 0                  |
| API owner login, superuser, bypassrls, inherit, schema CREATE | Semua false            |
| Missing owner SELECT policy / unsafe UPDATE policy            | 0 / 0                  |
| Unsafe explicit default ACL                                   | 0                      |
| History app SELECT/INSERT; UPDATE/DELETE                      | true/true; false/false |
| History immutable trigger                                     | 1 enabled              |
| Ledger token keys/current token values                        | 0 / 0                  |
| Incomplete ledger / leftover fault functions                  | 0 / 0                  |
| Later save/revise/reschedule/approve/publish RPCs             | 0                      |

New history is private, RLS-protected, fingerprint-bound and append-only with
tenant-scoped FKs. Function-owner access repeats auth.uid-derived active owner
identity; CR-009 identity bridge remains unchanged. New helpers are invokers
with empty search_path; no caller receives internal usage/execute.

After all tests **and** the additional aggregate performance measurement,
workspace/Page/plan/item/post/fact/junction/history/event/ledger/rate rows are all
zero. Seed remains registry-only; no production user/workspace/Page/fact was added.

## 6. Commands dan actual outcomes

| Gate                                                       | Hasil                                                                                         |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Focused 5.5 suites                                         | PASS, 23/23 di tiga file                                                                      |
| `pnpm run supabase:reset`                                  | PASS, satu clean reset me-replay seluruh 46 source migrations                                 |
| `pnpm run check`                                           | PASS, standalone dan diulang dalam final test-all; format/lint/typecheck + 3 foundation tests |
| `pnpm run test-all`                                        | PASS final, 98/98 database tests di 24 files; ~927 detik database suite                       |
| `pnpm run verify-migrations`                               | PASS, 46 filenames pada final gate                                                            |
| `pnpm run supabase:verify`                                 | PASS, applied history/order sama dengan 46 source migrations                                  |
| Security Advisor `--local --type security --fail-on error` | PASS, No issues found                                                                         |
| Read-only catalog audit                                    | PASS, hasil §5                                                                                |
| Final post-performance cleanup query                       | PASS, zero business/operational fixture rows; 46 applied migrations                           |
| `git diff --check`                                         | PASS                                                                                          |

CLI help dibaca untuk migration new/up/list dan db query/reset/advisors.
Database commands memakai explicit --local atau local container
supabase_db_content-producer. Label Remote pada migration list --local adalah
format CLI, bukan koneksi proyek remote.

### Failures dan recovery yang dicatat

1. Initial focused suite gagal pada ambiguous fact_id/ordinal/table aliases,
   JSON operator precedence dan missing post-validator privileges. Diagnostic
   helper calls/redacted transaction-only mapper inspection menemukan sumbernya;
   setiap production repair sesudah applied dilakukan melalui additive migration.
   Transaction-only diagnostic mapper changes di-rollback, tidak menjadi database
   baseline atau mengganti safe error behavior.
2. Test fixture cloning/rate-column names dan bounded test timeouts diperbaiki;
   production checks atau statement/lock limits tidak dilonggarkan.
3. Public rate-limit regression menemukan ignored allowed flag di shared read
   kernel; CR-012 mencatat fix dan existing-read regression sebelum perubahan.
4. Full suite pertama setelah clean reset: 97/98, dengan obsolete 5.4 no-status-write
   privilege expectation. Exact column allowlist + no-plan-post-mutation regression
   menggantikannya sesuai cumulative 5.5 grant; focused test lalu full 98/98 lulus.
   Failed full attempt tidak diklaim lulus.
5. Aggregate timing command pertama gagal TypeScript quoting sebelum fixture
   execution; corrected command menghasilkan 130/206 ms dan cleanup zero.

## 7. Mandatory deferred evidence

| Evidence                                                  | Status                    | Checkpoint pembuktian       |
| --------------------------------------------------------- | ------------------------- | --------------------------- |
| Correction versus approve/publish melalui public RPC      | **DEFERRED — NOT PASSED** | 5.7, lalu final 5.9         |
| save_post versus cancel_content_plan, kedua commit order  | **DEFERRED — NOT PASSED** | 5.6, lalu final 5.9; CR-011 |
| Opposite-direction reschedule_post numeric two-slot locks | **DEFERRED — NOT PASSED** | 5.6, lalu final 5.9; CR-011 |

Administrative ready/posted/archived fixtures tidak menggantikan public lifecycle
race evidence. Phase 5 final gate belum boleh dinyatakan selesai.

## 8. Scope dan titik berhenti

Tidak ada 5.6+ RPC, MCP/Edge handler, OAuth parser/middleware, frontend, worker,
OpenAI/embeddings/vector, Facebook/Canva API, production seed, cloud resource,
remote link/deploy, credential, commit atau push. Baseline migration files dan
frozen fixtures dipertahankan. Working tree disediakan untuk review pengguna.

**Berhenti pada checkpoint 5.5.** Langkah berikutnya hanya setelah instruksi
pengguna: `Lanjutkan 5.6`, dengan penggunaan workspace-first fact/usage lock
protocol CR-012 dan penuntasan deferred evidence 5.6 yang tetap tercatat di atas.
