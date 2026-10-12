# Checkpoint 5.8 — Performance snapshots and cautious insights

12 October 2026. Baseline **05958bf**, clean tree at entry, 59 migrations and
32 RPCs. Checkpoint 5.8 implementation/focused verification is complete:
**63 migrations, exactly 33 RPCs**, no overload. This is not final Phase 5
acceptance or independent Batch B approval. User authorized continuation to 5.9
in the same task; no new approval is needed for accepted CR-015 decisions.

## Authority and migrations

CR-015 was recorded **Accepted before the first migration** following explicit
user approval. Frozen Phase 0 files and applied migrations remain unchanged.
CR-003/009/013/014 remain scoped authority. All four migrations were CLI-created,
reviewed and applied only locally after CLI help:

| Migration                                              | Purpose                                                                                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `20261012072241_phase_5_8_metrics_foundation.sql`      | Closed/canonical metrics/source, immutable recorded flags, narrow INSERT/RLS, v8 result reference/digest and safe errors     |
| `20261012072242_phase_5_8_record_post_performance.sql` | Only new public RPC, atomic append/ledger/rate/replay                                                                        |
| `20261012072243_phase_5_8_metrics_read_completion.sql` | Existing signatures, explicit nulls, scoped page deltas, source compatibility, numeric insight statistics/exclusions/caveats |
| `20261012073221_harden_phase_5_8_insight_lookup.sql`   | Focused-failure repair: niches primary key is key, not id                                                                    |

API delta **32 → 33**: `record_post_performance`, write group 30/minute.
Metrics reads remain read 120/minute and expensive_read 20/minute. No other RPC
was added or overloaded. Metrics append does not increment post revision or
change publication/approval/quality/source/fact state. Duplicate capture with
another key conflicts; exact key replay returns the immutable original result.

## Actual verification and recovery

| Execution                                           | Actual result                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| First metrics public suite                          | **4/5 PASS**, one insight failure (nonexistent niches.id)                             |
| Additive lookup repair + same suite                 | **5/5 PASS**, 25.16s                                                                  |
| Insight/history and separate-session metrics suites | **7/7 PASS**, 41.68s                                                                  |
| Initial check                                       | FAIL at ESLint constant-condition loop in pagination test; bounded loop repaired      |
| Recovery check                                      | PASS: formatting, lint, TypeScript, 3/3 unit tests                                    |
| Focused final regression                            | **34/34 PASS, 8 files, 298.46s**                                                      |
| verify-migrations                                   | PASS, **63 filenames** (filename proof only)                                          |
| supabase:verify                                     | PASS, **63 source/applied versions** match; target explicitly --local                 |
| git diff --check                                    | PASS                                                                                  |
| Local SELECT catalog                                | PASS, exact **33/33** functions/authenticated EXECUTE; no unsafe grant/role/RLS delta |

Focused regression command: vitest database config, api-metrics,
api-metrics-insights, api-metrics-concurrency, api-security-kernel,
api-read-rpcs, phase-5-operation-map, posts-and-post-metrics and
api-post-lifecycle. No full suite or clean reset was run for 5.8; these belong to
the now-authorized 5.9 acceptance. Security Advisor remains a 5.9 gate.

## Public behavior evidence

All metrics domain calls use authenticated owner/client request claims; admin
sessions only set up/inspect ephemeral fixtures, controlled faults and barriers.

- Null/zero, likes-only/subset, finite/range/count/schema/source/timezone denial;
  bigint maximum asserted losslessly from persisted numeric text.
- Captured/source offsets normalize UTC; historical and future capture append,
  with anomaly/caveat rather than invented chronology restrictions.
- Same-key exact result survives later snapshots, backdated insertion and public
  archive. Read chronology can change flags without rewriting append/replay flags.
- Insert/completion faults leave no metric/ledger mutation; same-key retry succeeds.
  v8 schema/hash/target/extra-key corruption fails closed.
- Ten concurrent same-key calls produce one snapshot and nine replays. Different
  keys at one capture produce one winner and safe conflict; distinct captures
  both commit. Record/archive both orders observe workspace waits and preserve
  history. Held workspace timeout and actual backend cancellation map DATABASE_BUSY
  with rollback and same-key recovery.
- Pagination gives immediate adjacent deltas across pages without repeated pairs;
  incompatible source/null/unknown legacy metadata do not manufacture baselines.
  Negative cumulative watch time is anomalous; average-only decrease is not.
- Insights count latest distinct posts, preserve zero and exclude missing metrics;
  disjoint reasons, pre-publication comparison age exclusion, numeric median,
  outlier, five dimensions, thresholds, mixed-source insufficient and empty success.
  No notable-by-count, winner, causal claim or config recommendation is emitted.
- Write/read/expensive-read limits reject before domain mutation. Existing post
  lifecycle suite preserves v6/v7 replay and immutable archive provenance.

## Security and cleanup

`docs/phase-5-8-catalog-audit.sql` is read-only/token-free/local-only evidence.
Observed: exact allowlist/overload difference 0, API-owned tables 0, role login/
superuser/bypass/inherit/membership/schema CREATE false/0, all API functions owned
by narrow role with empty search_path, **15/15 RLS**, caller/PUBLIC table/column/
sequence/helper and unauthorized API privilege 0. API owner metrics SELECT/INSERT
true; UPDATE/DELETE/TRUNCATE false; immutable trigger enabled. Private definer
exception only the accepted argument-free auth.uid bridge.

All fixture/domain/history/ledger/rate rows and fixture users cleaned up; disabled
triggers, faults, incomplete ledger and v8 integrity violations 0. Populated tests,
not empty catalog scans, prove replay/privacy/immutability.

No cloud, remote database, secret, production seed, Phase 6 implementation, OpenAI,
embedding, Facebook/Canva API, commit, push or deploy. Next action within the same
authorized task: complete 5.9 local acceptance, then stop for independent audit.
