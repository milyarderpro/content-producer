# Lifecycle, explicit intent and recovery

See [tool sequences](tool-sequences.md) for exact schemas and [output contract](output-contract.md) for truthful status claims.

| From          | Action               | To        | Guard                                                             |
| ------------- | -------------------- | --------- | ----------------------------------------------------------------- |
| new           | save_post            | draft     | Reservation/evidence if niche requires; never automatically ready |
| draft         | revise_post          | draft     | CAS current revision/hash                                         |
| ready         | revise_post          | draft     | Invalidates previous approval                                     |
| draft         | approve_post         | ready     | Explicit approval, latest reviewed hash, blocking gates pass      |
| ready         | revoke_post_approval | draft     | Explicit revocation                                               |
| draft / ready | discard_post         | discarded | Explicit discard; releases unpublished allocations                |
| ready         | mark_post_posted     | posted    | User confirms actual manual Facebook publication                  |
| posted        | archive_post         | archived  | Explicit archive; facts/metrics preserved                         |

reschedule_post changes only internal schedule for draft/ready and increments revision. Posted, archived, discarded are terminal for content edits. Material fact correction may return ready posts to draft but does not rewrite already published snapshots.

Before approve_post show current get_post content, revision/hash, system and editorial checks. explicit_approval=true only after clear user approval of this exact current post. Critical failures cannot be waived; only allowlisted noncritical warnings may be accepted with a reason. Discard, archive, revocation, plan cancellation, item replacement, fact correction and publication record likewise require explicit intent and uniquely resolved target. “Upload tomorrow” is not confirmation of upload; mark_post_posted never contacts Facebook. Use explicit_correction=true for trivia_correct_fact and distinguish same-meaning trivia_reverify_fact.

## Idempotency and optimistic concurrency

All writes require request_schema_version=1, workspace_public_id and UUID v4 operation_key. Retry **one logical operation** with the **same operation_key and semantic payload** after response loss or DATABASE_BUSY. Use a new key only for a new intent. OPERATION_KEY_REUSED with changed payload is a hard stop. Post mutations use expected_revision and, where required, expected_content_hash. Page/config uses expected_page_updated_at and expected_config_updated_at. Fact changes use expected_fact_updated_at. Never guess or silently refresh CAS values.

| Error / condition                          | Recovery                                                | Forbidden                  |
| ------------------------------------------ | ------------------------------------------------------- | -------------------------- |
| AUTH_REQUIRED or TOKEN_INVALID             | Host OAuth relink                                       | Request token/key/password |
| OWNER_ACCESS_REQUIRED or FORBIDDEN         | Stop without disclosing resources                       | Cross-owner read           |
| Lost save response                         | Replay same key/payload or read current state           | New save duplicate         |
| DATABASE_BUSY                              | Bounded same-key retry                                  | New retry key              |
| RATE_LIMITED                               | Respect retry_after_seconds                             | Busy-loop                  |
| REVISION_CONFLICT or CONTENT_HASH_CONFLICT | get_post, reconcile and request new consent if material | Last-write-wins            |
| SCHEDULE_CONFLICT                          | Ask for new exact time                                  | Auto-shift                 |
| Uncertain duplicate / stale fact           | Research or replace candidate                           | Force false distinct       |
| PLAN_ITEM_CLAIM_EXPIRED                    | get_content_plan, reclaim eligible item                 | Use old claim_token        |
| Quality blocking failure                   | Repair; remain draft                                    | Force approve_post         |

Batch claims expire and completed items stay completed. Only one active renewal is allowed. cancel_content_plan preserves completed posts; replace_discarded_plan_item requires explicit prepublication replacement and cannot replace posted/archived output. Ambiguous Pages, posts, schedule hours or metric definitions require clarification before writing.
