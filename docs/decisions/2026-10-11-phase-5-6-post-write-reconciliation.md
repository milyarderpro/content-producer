# CR-013 — Draft writes, historical replay and schedule-only revision

| Field     | Value                                                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Status    | Accepted                                                                                                                      |
| Date      | 11 October 2026                                                                                                               |
| Authority | User authorized concrete reconciliation and implementation of 5.6 before its first migration, with three explicit refinements |
| Scope     | save_post, revise_post, reschedule_post; 24 → 27 API routines; their private persistence, projections and tests               |

Sources: CORE-001/003/005/006, FACT-004/005/006, QUALITY-001..005;
tool inventory §§6/14/15; module contract §§9/10/12/14; trivia DNA §§9/15/19;
accepted CR-004/010/011/012. Frozen files and applied migrations are preserved.

## 1. Explicit decision: reschedule is schedule-only

The earlier ready → draft suggestion is **not accepted**. It would contradict
the frozen schedule-only operation and require a separately approved lifecycle
change. This record instead keeps draft → draft and ready → ready. Content,
generation snapshot, hash, facts, quality status and original approval intent
remain unchanged. Posted, archived and discarded reject rescheduling.

Revision increases exactly once, including a same-time request with a new key.
System/editorial evidence post_revision is carried forward to the new revision;
its original evaluated_at, checks, criteria and hash remain unchanged. This is
revision rebinding of unchanged content, **not a new evaluation**. A ready
approval's approved_revision is similarly carried forward, preserving actor,
approved_at, operation_id, hash and accepted warnings. Its old approved_revision
must match the old current revision and its hash must match current content.
Malformed/stale approval fails APPROVAL_STALE. Missing/stale evidence fails
QUALITY_EVIDENCE_STALE. An append-only mutation history records exact before
evidence/approval and the schedule-only successor, making this provenance
auditable. No new approval actor/time/intent is invented. Future 5.7 must use
this matching current binding and retain the original approval provenance.

This reconciles CORE-006's general revision invalidation with the more specific
inventory schedule-only operation: content revision invalidates approval;
schedule-only revision does not. No public request/response field is added.

## 2. Exact historical replay and bounded private history

Add internal.post_write_history, append-only for the application, with scoped
ledger/post/Page FKs, actor/client, operation name, prior revision/hash/schedule,
before evidence/approval, safe reason, and exact server-built success projection.
One history per ledger operation. API owner SELECT/INSERT only; owner RLS;
caller/helper access denied. No raw request, reservation/claim token, credential,
source document or transcript is stored. Sources are bounded metadata already
permitted in PostPackageV1, never fetched text.

Envelope v6 is restricted to the three 5.6 operations and contains exactly
schema_version, operation_name, target_public_id, history_public_id and
response_hash. It is at most 2 KiB; SHA-256 binds canonical JSONB response text.
Replay verifies ledger/workspace/actor/operation/target/history relationships,
response digest, bounded closed response shape, and only changes data.replayed.
No reconstruction from mutable business rows. Retention is the ledger's no-expiry
MVP horizon. Missing/corrupted history fails safe INTERNAL_ERROR.

Bounds: incoming content 16 KiB; generation snapshot 16 KiB; each evidence
32 KiB; fact binding array 1..9, each usage snapshot 32 KiB; response/history
projection 512 KiB; before evidence/approval aggregate 96 KiB. Byte limits use
UTF-8 JSONB serialized bytes. Public IDs and safe paths only in public evidence.

## 3. Current junction membership and partial replacement

Add is_current to junctions, default true for existing rows. Replace unconditional
post/position and post/fact unique constraints with partial unique indexes for
is_current=true. Existing Page active-fact uniqueness remains unchanged. Released
superseded rows become is_current=false; discard later releases current rows
without erasing current membership. Current get_post bindings/warnings filter
is_current, so old replacements do not contaminate the current package. Legacy
rows retain their meaning; no snapshots are reconstructed or deleted.

For revise, retained IDs are incoming IDs intersect current allocated IDs. Their
usage snapshots and junction identity remain unchanged; position/role/wording
may change. Removed IDs are released and made noncurrent. Incoming new IDs must
equal the **complete ordered reserved set**, in their relative incoming order,
under one fresh token bound to actor/Page/config/reuse/history. Retained IDs are
not re-reserved. Same-set reorder/copy revision needs no token; supplying a token
when no new facts exist rejects mismatch. Full replacement reserves the full
incoming set. Re-addition of a previously removed ID creates a new allocation
and fresh immutable usage snapshot after valid reservation.

Reuse checks exclude only this post's retained allocations, never other posts
or published usage. Current canonical facts and the retained usage evidence must
remain verified/source-sufficient/fresh; canonical reverify never rewrites old
usage snapshots. The whole removed/retained/new set commits or rolls back.
Snapshot immutability is enforced for all junction states; published and
superseded historical rows are immutable. Temporary position moves inside the
transaction permit reordering without weakening current-set uniqueness.

## 4. Closed generation input and canonical hash

Keep the old ten-key GenerationSnapshot readable. New writes use those ten keys
plus schema_version, module_version, content_schema_version, renderer_version,
quality_gate_version, editorial_rubric_version, source_policy_version,
dedup_contract_version, config_public_id, config_updated_at, line_width_chars,
target_video_seconds and override_reason. All versions are 1, line width 34,
target seconds 13. Config reference/time, locale/markets/reuse/render/budgets
must equal the locked effective context. profile is one of the two frozen keys.
Plan override is CR-010's closed override applied to current captured config;
changed plan context rejects FACT_RESERVATION_CONTEXT_CHANGED. Fixed count must
match to pass; adaptive below-min drafts require explicit fact_count_override
and safe reason, are pending warning acceptance, and never auto-approve.

Hash = lowercase hex SHA-256 of UTF-8 bytes of
`content-producer:post:v1|` + canonical JSONB text containing schema_version=1,
page_public_id, niche_key, content_schema_version, format_key, topic_key,
interaction_goal, normalized content_payload, generation_snapshot and ordered
fact_bindings. Each hash binding contains fact public ID, position, role,
normalized wording and the complete immutable usage snapshot (no bigint).
Components/hashtags are NFC normalized; hashtag order remains semantic.
Computed metrics are server-derived before hashing. Schedule, revision,
operational timestamps, checks, approval, reasons and metrics observations are
excluded. Source verification timestamps inside immutable usage evidence are
included: they describe the evidence, not the operation. Distinct key order and
equivalent timestamp instants canonicalize identically.

Public replay_ratio is rounded to six decimal places so a JSON number can round
trip through the caller without changing an exact metrics assertion. The frozen
read-seconds formula remains one-decimal rounding and hard checks remain at 2.5;
the 0.1-second estimator grid cannot cross that threshold through six-place
rounding. This serialization decision is recorded before its additive fix.

Body has ordered facts[{position,text}] and optional subject (1..120 chars).
Bindings must match body order and normalized wording exactly. text_metrics may
be empty or an exact assertion of the server result, never authoritative.
Renderer follows frozen NFC/LF/layout and word/greedy-wrap/read-time formulas.
Unsafe artifacts/URL/control/schema/render mismatch reject; actual budget and
readability failure persists failed draft evidence. Per-binding structural caps
remain 90 chars/18 words. No truncation or automatic semantic editing.
Default emoji-disabled text rejects emoji/decorative symbols, bidi/zero-width
format controls and markdown/citation artifacts. Known request reservation/claim
tokens cannot occur in public components, attestation or allocated source
metadata; rejection leaves the reservation and all business state intact.
Editorial input uses frozen 18 criterion IDs with exact severity and no duplicate
IDs. Missing criteria yields pending draft; fail/needs_review yields failed draft.
Risk flag v1 allowlist: safety, time_sensitive, source_uncertainty,
meaning_uncertainty, copying_risk, caption_claim_risk. No flag authorizes a waiver.

## 5. Plan save, movement and clearing schedules

Plan save must match Page/niche, requested format/topic/goal, effective override,
exact item scheduled_at (including null), noncancelled plan and current claim.
Reuse plan_assert_current_claim_v1 after locks. Completion clears lease, retains
attempt count, appends a completed event bound specifically to save_post,
refreshes aggregate and returns original updated progress in historical replay.
No plan input means standalone save: it cannot complete any item.

Reschedule of a linked draft/ready requires its item still completed, same scope,
and old item schedule equals old post schedule. Set both schedules to the new
timestamp **or both to null**, atomically. Explicitly cancelled plan may retain
a completed item/post; rescheduling that preserved output does not reopen the
plan or modify progress. History, attempt count, completed_at, and plan config
intent remain unchanged. Only the originating matching item/post is excluded
from occupancy checks. All other noncancelled items and nondiscarded posts,
including archived posts, block. Null occupies no slot. No automatic shifting.

## 6. Full lock order and mandatory evidence

Identity/client/typed input → rate → ledger → workspace FOR NO KEY UPDATE →
Page/config → distinct numeric schedule keys → plan → item → post → **distinct
numeric identity AND lineage advisory keys** → facts ascending ID → junctions
ascending ID. Use trivia_lock_workspace_v1 and trivia_lock_identities_v1;
materialize identities of the union of incoming/current/removed facts before
fact locks. Re-read after waits; expiry uses clock_timestamp. No reverse lock.

Public authenticated/request-context proofs: historical replay/mismatch/rollback
for all three; renderer golden/boundary/quality; retained/removed/new allocation
and source snapshot immutability; CAS winner; save/cancel both commit orders;
opposite-direction reschedule conflict without deadlock; linked move/clear;
save/revise versus correction both ordering directions and advisory lock catalog
observations; exact 27 RPC ACL/RLS/history/privacy. Ready fixtures are administrative
only because public approve belongs to 5.7; do not claim public approval proof.
Save conversion advances fact updated_at. A correction assembled before that
commit must lose exact fact CAS with FACT_CORRECTION_CONFLICT; an explicit new
request after reading current fact time may then correct. The race test asserts
this legal conflict rather than weakening fact CAS or fabricating a fresh input.
Focused tests during development; one full final gate after clean reset; stop at
5.6 report. Independent Batch B audit follows 5.9. No cloud/commit/push action.

## 7. Resume reconciliation — 12 October 2026

Repository inspection found a seventh, unapplied text/privacy migration beyond
the six reported in the handoff. It implements §4's already accepted typography
and token constraints; it was applied locally after recording the pre-apply
focused failure. Applied migrations remain unchanged.

The §1 missing/stale evidence rule applies to **both draft and ready** schedule
writes. The original RPC skipped empty evidence for drafts and checked only
revision, leaving hash corruption to a later row trigger. An additive correction
must validate both complete evidence envelopes against the old revision/hash
before rebinding, returning QUALITY_EVIDENCE_STALE without mutation. Quality
failure/pending is still a valid draft: this validates binding, not readiness.

Format profile values in DNA §8 are defaults/preferred ranges, not a frozen
exclusive format/profile matrix. Both supported profiles remain available unless
a captured plan override chooses one. Format conformity is attested through
trivia.format_conformant; no new semantic inference or exclusive allowlist is
introduced. Canonical verified source sufficiency is enforced by the Phase 4
fact-row validator and the public verification RPCs; retained usage evidence is
immutable and its own expiry must still be checked, independently of reverify.

Persisted rendering golden/boundary fixtures supplement the public RPC tests.
They cover deterministic layout/limits only; they do not claim the Phase 8 full
editorial corpus or manual source/approval review has passed.

A public reverify → plan save test also demonstrated that the known plan claim
token could enter allocated source metadata, because the seventh migration only
checked the reservation token there. The §4 token rule covers both capabilities.
An additive save guard checks the locked incoming facts' source metadata against
the supplied claim token before allocation; rejection preserves the reservation,
claim, progress and ledger. Metadata is never trusted as instruction content.
