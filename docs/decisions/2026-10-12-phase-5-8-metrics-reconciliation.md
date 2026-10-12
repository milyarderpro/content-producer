# CR-015 — Metrics append, historical replay and cautious comparison

| Field     | Value                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| Status    | Accepted                                                                                                          |
| Date      | 12 October 2026                                                                                                   |
| Authority | User explicitly accepted the combined 5.8 → 5.9 plan and its CR-015 decisions, before the first migration         |
| Scope     | record_post_performance; completion of two existing metrics reads; 32 → exactly 33 RPCs; local Phase 5 acceptance |

Sources: frozen CORE-001/006/007/008, QUALITY-006, inventory §§6/16,
database design §§7.8/15.5/18/25, module contract §16, trivia DNA §22,
Phase 5 runbook §§16–18, accepted CR-003/009/013/014. Baseline 05958bf:
59 migrations, 32 RPCs. Frozen documents and applied migrations are preserved.

## 1. Observation is not a post mutation

The specific metrics input has no expected_revision/hash. Appending an observation
does not update the post, its revision, hash, quality, approval, schedule or facts.
This is the explicit exception to CORE-006's general post-mutation language.
Only posted/archived targets qualify. New keys at an existing (post,captured_at)
fail METRIC_SNAPSHOT_CONFLICT even with identical values; same-key retries replay.

## 2. Closed input, canonical values and timestamps

Exactly eight nullable nonnegative bigint counts and two nullable finite numeric
watch-time fields. At least one known value, including explicit zero, is required.
Fractional counts, negative values, nonnumbers, overflow and unknown keys fail.
Omitted and explicit null canonicalize to unknown; all ten fields are projected.
Likes remain distinct and cannot exceed reactions when both are known.
Average watch time is a point-in-time average, not cumulative engagement.

Public source is exactly source_type, metric_definition_version=1 and optional
source_reported_at/timezone/note. Internally normalize to the five flat metadata
keys already supported by metrics_payload, optional values null. Source is bounded
to 4 KiB, note trimmed 1..500 characters; control characters and credential-shaped
content are not projected. No new public source.schema_version is invented.
Finite capture/source times normalize to UTC, output Z. No new future-time,
pre-publication capture or source/capture ordering rejection is introduced.
Optional timezone uses the existing IANA-name validator.

## 3. Immutable append result and replay v8

Add recorded_anomaly_flags to post_metrics, default empty for legacy observations.
Flags are server-derived, sorted and unique; allowlist is negative_cumulative_delta,
source_incompatible, source_metadata_missing, capture_before_publication,
capture_in_future. No historical flags are backfilled from assumed evidence.
Application access is SELECT/INSERT only; UPDATE guard protects complete rows.
Administrative ephemeral fixture cleanup remains possible, with no application
DELETE/TRUNCATE privilege.

Closed ledger envelope v8 contains exactly schema_version, operation_name,
target_public_id (metric UUID), post_public_id and response_hash. Maximum 2 KiB.
Only record_post_performance uses v8. The immutable scoped metric row reconstructs
the exact original bounded write response (8 KiB), changing only data.replayed.
Response fields are metric_snapshot_public_id, post_public_id, captured_at,
metrics, anomaly_flags and replayed. Digest is SHA-256 of UTF-8 canonical JSONB
response text with replayed=false. No mutable post state/chronology is used to
reconstruct replay; flags recorded on append never change after backdated inserts.
Ledger/actor/workspace/operation/target/metric-post relationships, shape, size and
digest are checked fail-closed. Missing/corrupt history fails INTERNAL_ERROR.
v6 remains the three post writes, v7 the five lifecycle operations; neither is
broadened. Metadata/source/full request are never copied to ledger.

## 4. History and compatibility

Descending captured_at/id order; latest is latest in requested inclusive period,
independent of cursor. Delta is associated with the page's `to` observation and
its immediate chronological predecessor within the requested period, even when
that predecessor is on the following page. Never skip an incompatible/null row
to find a more convenient earlier baseline. Cursor must match scoped post and
stored sort tuple. Limits remain 1..100/default 20 and cursor <=512 characters.

Compatibility requires known identical source_type and definition version 1.
Timezone, note and report time are metadata, not metric definitions. Empty legacy
metadata remains readable but is not silently considered version 1 compatible.
Only fields known at both ends get signed differences. Negative cumulative deltas
are not clamped, including total watch time. Average change is signed descriptive
change only; a decrease alone is not a cumulative correction. Read flags may be
derived again from current chronology; append/replay flags remain historical.

## 5. Insights and evidence

Use one latest snapshot within period per posted/archived post, never fallback to
older known numbers or sum cumulative history. Counts are distinct posts. Required
dimension values are bounded validated snapshot values/pattern labels, not text.
Exclusion precedence: not_published, no_snapshot_in_period, missing_metric,
unknown_source_or_definition, missing_dimension, invalid_observation_age. Reasons
are disjoint, sum to excluded_post_count; eligible+excluded equals scoped posts.
Capture before publication has unknown comparison age and is excluded, not clamped.
Future observations may remain descriptive with an explicit caveat.

Groups below minimum_sample_size are insufficient; comparable groups meeting it
are exploratory. Mixed source groups are successful insufficient with null
descriptive summaries, known sample count and explicit caveat. The enum notable
remains supported but is not emitted before an approved post-pilot comparable
evidence policy. No winner/causal claim, automated recommendation or config change.
No evidence means successful counts/reasons and groups=[], not invented groups.
Median/mean/min/max use numeric arithmetic; include min/median/max age, requested
and observed period, version, sample and confounder/missing-data caveats.

## 6. Locks, security, tests and acceptance

Context/typed input → rate/ledger → workspace → Page → post → metric; reuse
existing lock protocol and re-read after waits. No schedule/fact mutation needed.
Write/read/expensive_read groups remain 30/120/20 per UTC minute. Narrow NOLOGIN
API owner, owner RLS via CR-009 auth.uid bridge, empty search_path, explicit
per-function EXECUTE, no caller table/sequence/helper access. Bounds and input
validation do not weaken legacy fixture/schema contracts.

Public caller tests cover numeric/source/null boundaries, exact replay/mismatch,
fault rollback/retry, duplicate-key/capture and archive races, pagination/deltas,
insufficient/exclusions/age/outlier semantics, rates and privacy. Focused regression
and check during 5.8; required full gates plus two independent source resets in 5.9.
Use test-all after reset A and required smoke-test after reset B (both run the DB
suite). Local p95: simple read <=2s; search/reservation/simple write <=3s. Query
changes need EXPLAIN (ANALYZE,BUFFERS), normal planner, no enable_seqscan override.
Reports include actual failures/recovery. Stop at 5.9 for independent Batch B
audit; no self-approval, remote action, secret, production fixture, Phase 6,
commit, push or deployment is authorized.
