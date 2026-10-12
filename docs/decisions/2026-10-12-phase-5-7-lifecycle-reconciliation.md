# CR-014 — Explicit lifecycle, effective warning gate and historical publication

| Field     | Value                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status    | Accepted                                                                                                                                                    |
| Date      | 12 October 2026                                                                                                                                             |
| Authority | User approved the 5.7 plan, explicitly requested these concrete decisions before the first migration, and authorized implementation                         |
| Scope     | Exactly approve_post, revoke_post_approval, discard_post, mark_post_posted, archive_post; 27 → 32 RPCs; private validators/history and public-path evidence |

Authority: frozen CORE/FACT/QUALITY decisions, tool inventory §§6/15, database
design §15, module contract §12, trivia DNA §19, acceptance traceability and
accepted CR-004/009/010/011/012/013. Applied migrations and frozen documents remain
unchanged. Baseline e06f473 has 55 migrations. Previous test results are historical.

## 1. Effective gate and exact warning acceptance

Acceptance is an exception decision, never a rewrite of check results. System
checks retain severity/status/actual and overall_status; editorial criteria and
overall_status likewise retain their original meaning. quality_status=passed on
ready/posted means the effective gate, including recorded permitted acceptance,
passed. A failed draft does not become ready merely because it was saved.

IDs are a nonnull array of 0..20 unique strings; sort lexically for semantic hash
and storage. Unknown, duplicate, inactive/already-passed IDs fail WAIVER_NOT_ALLOWED.
The accepted set must equal the applicable warnings. With a nonempty set, the
trimmed owner reason is mandatory, 1..500 characters and plan_safe_reason_v1-valid.
With an empty set the reason must be null. Invalid reason fails VALIDATION_FAILED.
No supplied actor/time is accepted. Each ID behaves as follows:

| ID                            | Exact applicability                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FACT_COUNT_BELOW_CONFIG_MIN   | Effective captured/current config mode adaptive; 1 <= actual <= 9, actual < min, actual <= max; generation fact_count_override=true and stored safe override_reason. The original trivia.facts.count_valid remains blocking/failed and original system overall_status remains failed. Only this exact failure is exempted by the effective gate and recorded approval acceptance. Fixed mismatch, above-max and zero never qualify. |
| trivia.profile.preferred_band | Actual server warning needs_review for the frozen preferred word/count bands, with all hard checks passing (apart from the specifically permitted adaptive count exception).                                                                                                                                                                                                                                                        |
| trivia.variety_sufficient     | Present noncritical criterion needs_review; owner accepts repetitive editorial angles. fail is never accepted.                                                                                                                                                                                                                                                                                                                      |
| trivia.caption_supportive     | Present noncritical criterion needs_review concerning thematic support/repetition. Caption shape and critical caption_no_new_claim must independently pass. fail is never accepted.                                                                                                                                                                                                                                                 |
| trivia.visual_rhythm_clear    | Present noncritical criterion needs_review concerning style/layout preference; all hard rendering/readability limits pass. fail is never accepted.                                                                                                                                                                                                                                                                                  |

All 18 frozen editorial IDs must be present exactly once, with frozen severity;
all critical criteria must pass. Every fail and every nonallowlisted needs_review
blocks. overall_status=fail blocks; pass requires all criteria pass; needs_review
requires at least one applicable accepted noncritical needs_review. Risk flags do
not authorize exceptions. Blocking ownership/schema/reservation/reuse/dedup/source/
freshness/safety/hash/revision/hard-budget failures cannot be waived.

Publish revalidates the gate against current conditions using original accepted
IDs/reason. Previously accepted IDs that are no longer applicable may remain as
historical acceptance, but newly applicable unaccepted warnings block; no new
acceptance or owner intent is fabricated. Approve rejects extraneous acceptance.

## 2. Binding and provenance by transition

All five increment post revision once and preserve content/hash/generation/usage
snapshots. Original before-evidence/approval is recorded in immutable history.

| Operation                       | System                                                                                                    | Editorial                                                                                                   | Approval/quality                                                                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| approve draft → ready           | Recompute deterministic current gate after all locks, bind to successor revision; new server evaluated_at | Validate old revision/hash/rubric, carry forward post_revision only; original evaluator/time/results remain | New owner-derived snapshot binds successor revision/hash, original approve ledger, server time and accepted IDs/reason; passed, ready_at set                   |
| revoke ready → draft            | Rebind valid current evidence to successor revision, without evaluation                                   | Same                                                                                                        | Clear approval/ready_at; pending; reason audited                                                                                                               |
| discard draft/ready → discarded | No quality-pass prerequisite; valid nonempty evidence is rebound, empty evidence stays empty              | Same; correction-cleared empty evidence is permitted                                                        | Clear approval/ready_at; pending; release only current allocated junctions, preserve membership and immutable usage; reason audited                            |
| publish ready → posted          | Validate ready evidence and approval first; recompute current gate for successor revision                 | Validate current binding and rubric, carry forward revision only                                            | Carry forward approved_revision only, retaining original actor/approved_at/operation/acceptance; passed; allocated → published at supplied publication instant |
| archive posted → archived       | Preserve byte-identical published evidence                                                                | Preserve byte-identical published evidence                                                                  | Preserve byte-identical published approval, quality and ready_at; server archived_at; no reevaluation or new approval                                          |

Archive's current row revision is the published binding revision+1. Additive
validator handling recognizes only this historical binding: actual posted →
archived successor, unchanged copy/hash/generation/checks/approval/publication,
and matching published predecessor. Later writes to an archived row must retain
that binding and history. Legacy Phase 3 reader/fixture shapes remain readable;
they cannot use the new public approve/publish without the full version-1 gate.
Historical binding is not a general exception for stale ready evidence.

Revoke/discard do not claim fresh research or evaluation. Malformed nonempty
evidence fails safe; valid failed/pending evidence may be discarded. Neither
operation needs the current source/freshness quality gate to abandon content.
Replacement eligibility is completed, noncancelled linked plan, all outputs
discarded, and no publication history. Discard never resets the completed item.

Approval and publish validate enabled current config and exact generation context,
current junction set/order/wording, renderer/metrics/hash, fact eligibility, dedup,
source sufficiency, reuse, canonical expiry AND immutable usage expiry. Reverify
never rewrites or extends an existing usage snapshot. Archive ignores subsequent
config/fact freshness changes and preserves metrics/schedules/history.

## 3. Immutable lifecycle replay v7

Closed ledger envelope: schema_version=7, operation_name (only the five above),
target_public_id, history_public_id, response_hash (lowercase SHA-256 of UTF-8
canonical JSONB response text). Maximum 2 KiB. One internal.post_write_history
row per workspace/operation holds the exact server-built success response with
replayed=false, original actor/client, scoped post/Page identity, prior revision,
hash/schedule, before evidence and optional supplied safe reason. Approve may
store warning reason; publish has null reason. No synthetic user reason.

Lifecycle response maximum 64 KiB, closed per-operation inventory projection;
each evidence/approval maximum 32 KiB, aggregate before evidence maximum 96 KiB;
fact ID sets 0..9, accepted IDs 0..20. Existing v6 response bound stays 512 KiB.
No raw request, bigint public ID, token, source document or transcript is stored
in lifecycle response. Private approval operation_id is not projected publicly.

Completion validates unfinished owned ledger, operation/client, scoped post/Page,
target and successor revision/status, response shape and current response fields.
Replay first validates owner/request context and exact semantic request hash,
then completed ledger, closed envelope/version/size, matching history
workspace/actor/operation/ID, scoped post/Page identity and target, response digest
and closed response. It returns original response changing only data.replayed.
Current status/evidence is not used to reconstruct or reinterpret old results.
Missing/corrupted history fails INTERNAL_ERROR. Same owner with another validated
OAuth client may replay; originating client remains audit provenance. Different
operation/payload with same key fails OPERATION_KEY_REUSED. Failed calls leave
no business/history/ledger mutation. Same target-state with a new key is invalid.

v6 remains exclusively save/revise/reschedule, with original bounds, projection
and historical digest semantics. New dispatcher branches cannot admit a lifecycle
name into v6. Test all three historical replays after subsequent lifecycle writes.

## 4. Locks, security and evidence

Context/typed input → rate/ledger → workspace FOR NO KEY UPDATE → Page/config →
numeric schedule keys when occupancy changes → plan/item → post → numeric
identity AND lineage keys → facts ascending → junctions ascending. Reuse CR-012/
013 helpers, re-read after waits; expiry uses clock_timestamp. Publication and
archive do not acquire schedule locks late. Discard takes the occupied schedule
key before plan/post so release races obey the same protocol.

Narrow no-bypass API owner, empty privileged search_path, owner RLS, exact per-RPC
authenticated EXECUTE; add only necessary column UPDATE grants. No caller table/
helper access. Explicit constants must be true, never null. Publication timestamp
must be finite, ID trimmed 1..200 without controls, URL valid bounded HTTPS;
duplicate platform identity maps to safe conflict, never SQL detail. No invented
future-time restriction beyond the frozen Timestamp contract.

Public authenticated evidence: all five success/denial/replay/mismatch/rollback;
both commit orders of correction AND reverify versus approve AND publish; actual
workspace/advisory waits, duplicate keys and CAS competitors; permanent published
usage and byte-identical history after correction/reverify/archive; provenance
after public approve/reschedule/publish; owner/context/privacy/catalog denial.
Admin is for ephemeral setup, controlled faults/barriers, and inspection only.
One final clean reset/full gate after focused tests. Stop at actual 5.7 report.

## 5. Development regression — null metadata

A public approve completion fault injected null prior_status/prior_revision and
demonstrated SQL three-valued-logic acceptance. CR-014 requires fail-closed scoped
history relationships. An additive repair explicitly rejects null lifecycle
metadata, validates before-evidence bindings on completion/replay, and preserves
v6's intentional null metadata. Archive's immutable comparison covers every
published field and retains archived_at on already archived rows. The focused
fault must fail INTERNAL_ERROR with full rollback before completion is reported.
