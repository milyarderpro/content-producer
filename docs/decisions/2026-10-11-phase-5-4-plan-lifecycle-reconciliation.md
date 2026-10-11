# CR-011 — Plan lifecycle locks, immutable replay and aggregate state

| Field     | Value                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------- |
| Status    | Accepted                                                                                                |
| Date      | 11 October 2026                                                                                         |
| Authority | User approved the 5.4 direction and explicitly authorized documenting these decisions before migrations |
| Scope     | Checkpoint 5.4 only; six RPCs, private lifecycle support, and evidence scheduling                       |

## Conflicts and missing contracts

Sources: CORE-001..004 in the frozen decision register; tool inventory §§6.11,
10.4–10.9; database design §§7.6, 9.2, 25.3; Phase 5 runbook §§5, 12.

1. Immutable successful replay needs historical item/progress fields and claim
   tokens. Ledger v2 cannot store those fields; CR-010 v3 is limited to 5.3 and
   explicitly forbids tokens. Current item rows lose old tokens on reclaim/clear.
2. The current item contains only the latest error/replacement reason, not a
   durable per-attempt audit or replacement history reference.
3. The runbook gives both business-row ordering and schedule-before-plan rules,
   without spelling out their composition or the effect of a plan lock on claims.
4. Aggregate status combinations, renewal arithmetic and failure allowlist need
   executable definitions.
5. Two listed 5.4 public-RPC races depend on operations assigned to 5.6.

Frozen documents and old migrations remain unchanged. The following scoped
decisions reconcile these issues, without adding another public operation.

## 1. Concrete lock protocol

Every logical write is one short transaction, in this order:

1. Validate request identity, owner workspace and typed input. Consume the
   existing actor/client/group/minute rate bucket exactly once (kernel order).
2. Claim/lock the workspace-scoped ledger key. Same-key replay returns here,
   without acquiring business locks or writing events.
3. Lock the Page `FOR UPDATE`, using an owner-scoped lookup of the target's Page.
   Re-resolve the target after waiting. Do not lock the workspace row; this
   checkpoint never changes workspace identity/configuration.
4. If the operation changes slot occupancy, materialize distinct schedule keys
   with the existing Page/UTC-microsecond hash and acquire all transaction advisory
   locks in **numeric bigint order**, before any plan/item/post lock. Cancellation
   locks every non-completed, non-cancelled scheduled item slot; replacement locks
   its slot and checks both tables, excluding only its own item and discarded posts.
5. Lock the plan `FOR UPDATE`, then revalidate cancellation and target membership.
6. Lock item rows: cancellation uses ascending internal ID; single-item writes
   lock their one item. Claim uses the explicitly frozen `position, id` order,
   `LIMIT 1..3 FOR UPDATE SKIP LOCKED`. The exclusive plan/Page gate makes that
   claim-specific ordering safe against the cancellation ID ordering.
7. Replacement locks related post rows in ascending ID and rechecks all output
   history. PostgreSQL requires UPDATE permission for a row lock: grant only
   UPDATE(id), with owner-scoped UPDATE RLS, not UPDATE on post business fields.
   Other 5.4 operations do not lock or mutate posts.
8. Mutate, append events, update plan aggregate, complete the already-owned ledger.

No path acquires a schedule lock after a plan/item/post lock. No path takes a
plan lock while holding an item lock acquired earlier. After a wait, lease checks
use `clock_timestamp()`, not transaction-start time. Lock/statement thresholds
remain 2/15 seconds and contention failures map to safe `DATABASE_BUSY`.

### Claim workers and SKIP LOCKED

Claims on the **same Page** deliberately serialize at the Page/plan gate. This
bounded MVP trades queue throughput for correct aggregate/cancel serialization;
it does not claim simultaneous item processing inside one database transaction.
After the first worker commits, the next worker re-evaluates pending/expired rows
and receives different items. Different Pages have independent business locks.

`SKIP LOCKED` is still real: an item locked by a separate local fixture/session is
skipped, instead of making a claim wait on it; the unlocked later item is returned.
The test invokes the public claim RPC as `authenticated`; the administrative
locker is only a controlled contention fixture, not an alternate business path.
Cancellation cannot hold an item while waiting for the Page/plan held by claim:
both acquire Page, schedule (if needed), plan, then items. Separate-session tests
exercise both claim-first and cancel-first public RPC transactions and inspect
waits/committed outcomes. The shared rate bucket is also serialized; race tests
use distinct OAuth clients where needed to expose the business lock behavior.

## 2. Immutable events and exact replay without ledger tokens

Add one private table, `internal.content_plan_item_events`, with public UUID,
tenant-scoped FKs to ledger and item/plan, actor and OAuth client audit identity,
event type, before/after state, attempt number, timestamps, optional safe reason /
failure summary / retry recommendation / discarded-post reference, and typed
claim metadata. One event per operation+item; claim tokens occur **only** on
`claimed`/`reclaimed` events and the current item lease column. Event rows are
application-append-only: API owner has SELECT/INSERT, no UPDATE/DELETE; an UPDATE
trigger forbids rewriting history. Administrators may delete ephemeral test
fixtures, but no RPC deletes history. No production backfill is invented.

New ledger envelope v4 is restricted to these six operation names. It contains
`schema_version`, `operation_name`, safe `resources`, token-free exact `response`,
and ordered `claim_event_public_ids`. Maximum serialized envelope: 64 KiB.
Nested projections are closed-schema validated. Neither a `claim_token` key nor
a token value may appear in ledger response, error detail, log, or test output.
The canonical request hash may bind a supplied token; raw semantic input is not
persisted in the ledger. CR-010 v3 and earlier v2 remain unchanged and closed.

| Initial claim result | Immutable relationship                                                                          | Replay                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Empty                | Completed ledger v4, `claimed_items=[]`, event references `[]`; no item event                   | Same empty response and original remaining count; only `replayed=true`                   |
| 1–3 items            | One claim/reclaim event per item, same operation ledger, ordered references matching item order | Original response fields plus original typed token from each event; only `replayed=true` |

Completion validates event workspace, actor, operation, target plan, item public
ID, order, token and initial lease timestamps against the server-built response.
Replay checks those immutable relationships again and never reconstructs fields
from current mutable plan/item/post rows. Events and ledger commit or roll back
together. Renewal/failure/retry/replacement/cancel snapshots are exact and bounded;
their event references are empty because their responses contain no claim token.

Event SELECT/INSERT RLS repeats active-workspace owner + `auth.uid()` identity,
with an existing ledger/item in that tenant. Caller roles (including authenticated
and service_role), PUBLIC and Data API have no event table/sequence/helper access.
Replay is accessible only through its specific RPC after validated owner/client
context and same operation-key/hash. Another client of the same authorized owner
may replay the same operation; client identity is audited, not a new lease authority.

Retain event tokens for the same **no-expiry MVP retention horizon as the ledger**,
otherwise historical replay cannot be exact. Any future retention/erasure change
requires a new decision. Tokens are random UUIDs, not user JWTs or OAuth credentials.
An expired/stale/released/replaced token can be replayed as historical data, but
cannot renew/fail/save because the shared lease validator checks current item
status, exact token and current expiry. Replay never extends expiry, changes
attempt/renewal count, or appends events. There is no logging of token-bearing
SQL/results; tests suppress successful claim result output and redact failures.

## 3. Item transitions and supporting inputs

| Operation   | Allowed source                                                                                           | Result      | Attempt/claim/history                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| claim       | pending, or in_progress with expired lease; plan not cancelled                                           | in_progress | New token, 30-minute lease, attempt +1, renewal=0; preserve first started_at                           |
| renew       | in_progress, matching unexpired current token, renewal=0                                                 | in_progress | Expiry=min(current expiry+30min, initial claimed_at+60min); renewal=1, no attempt increment            |
| failure     | in_progress, matching unexpired current token                                                            | failed      | Clear all lease fields, persist safe failure, retain attempt                                           |
| retry       | failed; plan not cancelled                                                                               | pending     | Clear current error, keep it in immutable event; retain attempt                                        |
| replacement | completed; plan not cancelled; supplied related post discarded; all output discarded and never published | pending     | Explicit true + reason; clear completed_at/current error, retain attempt, append replacement reference |
| cancel      | pending, failed, in_progress; plan not completed/cancelled                                               | cancelled   | Clear all lease fields; preserve completed item/post history                                           |

No other transitions are allowed. Claims on a completed plan succeed empty;
claims/retries/replacements on an explicitly cancelled plan fail
`PLAN_STATUS_CONFLICT`. Cancellation of an already completed/cancelled plan with
a new key fails `PLAN_STATUS_CONFLICT`; same-key replay remains successful.
Replacement may reopen an ordinarily completed plan. Old posts are never deleted
or restored. Posted/archived, or any published-at history, blocks replacement.

Failure code allowlist is the existing stable recoverable domain codes:
`VALIDATION_FAILED`, `CONFIG_INVALID`, `FACT_SOURCE_INSUFFICIENT`, `FACT_NOT_ELIGIBLE`,
`FACT_FRESHNESS_EXPIRED`, `FACT_REUSE_BLOCKED`, `FACT_RESERVATION_CONFLICT`,
`FACT_RESERVATION_EXPIRED`, `FACT_RESERVATION_CONTEXT_CHANGED`,
`QUALITY_SYSTEM_CHECK_FAILED`, `SCHEDULE_CONFLICT`, `DATABASE_BUSY`, `RATE_LIMITED`,
`INTERNAL_ERROR`. Reasons/details are trimmed 1–500 character untrusted data.
Reject controls, UUID/token/JWT/credential patterns and raw SQL/stack detail;
do not echo rejected input in exceptions. `retry_recommended` is a typed boolean
stored in the failure event; it never automatically retries an item.

## 4. Aggregate plan status: ordered precedence

Counts always include all items and sum to requested_count. Apply the first
matching row, after every successful item mutation:

| Priority | Condition                                                             | Plan status / timestamps                               |
| -------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| 1        | Explicit cancellation, or plan already explicitly cancelled           | cancelled; cancelled_at set once; completed_at cleared |
| 2        | Every item completed or cancelled, without explicit plan cancellation | completed; completed_at set when entering completed    |
| 3        | Any item in_progress (including an expired lease until reclaimed)     | in_progress; completed_at cleared                      |
| 4        | At least one completed and at least one pending/failed                | partially_completed; completed_at cleared              |
| 5        | No pending/in_progress/completed, and at least one failed             | failed; completed_at cleared                           |
| 6        | Otherwise (pending, including pending+failed with no completed)       | pending; completed_at cleared                          |

`started_at` records the first successful claim and is never reset. Explicit
cancellation wins even when some items are completed: those completed items/posts
remain intact, remaining mutable items become cancelled, and the plan is
**cancelled**, not completed/partially_completed. Completed-at describes current
aggregate completion, not an erased audit; events preserve earlier transitions.
Empty claim does not update plan timestamps or create an item event. Tests cover
every status used by the six public RPCs. Ordinary all-terminal completion cannot
be produced by these six transitions; its aggregate derivation is tested during
local fixture setup using the shared helper, and public empty-claim/preservation
and completed-plan cancellation rejection are then tested against that fixture.
This is not public save/completion evidence; 5.6 will test the full save path.

## 5. Deferred public-RPC evidence — mandatory disclosure

| Evidence                                                     | 5.4 / Batch A             | Completion checkpoint          |
| ------------------------------------------------------------ | ------------------------- | ------------------------------ |
| save_post versus cancel_content_plan, both commit orders     | **DEFERRED — NOT PASSED** | 5.6, then final 5.9 acceptance |
| Opposite-direction reschedule_post, numeric two-slot locking | **DEFERRED — NOT PASSED** | 5.6, then final 5.9 acceptance |

Do not introduce either 5.6 RPC early. Private helper tests, fixtures and the
existing plan-creation schedule test are not substitutes for these two proofs.
The 5.4 report and independent Batch A audit must explicitly include this table.
The final Phase 5 gate cannot pass while either remains deferred.

## Required acceptance

Exactly 19 API routines; caller execute only on those; event RLS/ACL/immutability;
public owner/negative/rollback/replay tests for all six; empty/1/2/3 token replay
after renewal/reclaim/failure/cancel; separate-session claim/skip/cancel/retry and
numeric schedule tests; two clean local resets; full planned Batch A commands;
no error-level security finding. Stop for independent audit; no 5.5, remote,
commit, push or deployment authorization is conveyed by this record.
