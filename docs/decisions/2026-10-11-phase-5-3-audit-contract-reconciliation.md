# CR-010 — Phase 5.3 replay, markets, plan overrides and snapshots

| Field  | Value                                                           |
| ------ | --------------------------------------------------------------- |
| Status | Accepted                                                        |
| Date   | 11 October 2026                                                 |
| Scope  | Only checkpoint 5.3 and the validators needed by its three RPCs |

## Authority and conflicts

The user explicitly authorized reconciliation by change record in the 5.3 audit
remediation request. This record is the scoped amendment; frozen documents remain
unchanged. Sources: tool inventory §§6.1, 6.6, 9.2–9.3, 10.2; database design
§§7.1, 7.5–7.6, 7.9; CORE-001/003; module contract §§7, 17; Phase 5 runbook §11.

1. CORE-001/database §7.9 restrict ledger snapshots to identifiers/status/time,
   but Page writes return full settings and plan creation returns exact items.
   Reconstructing from mutable rows cannot satisfy exact successful replay.
2. Inventory requires 1–8 uppercase ISO 3166-1 alpha-2 codes, whereas the old
   shared market validator restricts four codes and aliases UK to GB.
3. Inventory calls item_config a bounded module override without enumerating its
   closed shape. Database requires Page+niche plan snapshots, but the existing
   closed plan_config v1 has no place for them and only unscheduled mode.
4. Plan creation's explicit error list omits CONFIG_SCHEMA_UNSUPPORTED although
   the general module error family includes it.
5. Inventory's Slug permits lowercase letters, digits and hyphen (2–80), while
   the earlier Page constraint requires an initial letter.

## Decisions

### Replay snapshot v3

Only create_page, update_page and create_content_plan may complete with a v3
ledger envelope: schema_version=3, operation_name, resources (the original safe
v2 resource projection), and response (the exact server-built success envelope).
Response is immutable; retry changes only data.replayed to true. Maximum stored
size is 1 MiB, sufficient for 100 bounded items. Only validated Page/config or
plan/item response fields are stored: no post content, evidence/source document,
reservation/claim token, credential, bigint ID, transcript or arbitrary payload.
The v2 helper remains closed and unchanged for other operations. Existing v2
5.3 completions cannot be recovered exactly from current rows; migration fails
closed if such rows exist rather than fabricating history. A clean local reset
is the authorized recovery for this uncommitted local checkpoint.

### Page markets and slugs

Page markets accept 1–8 unique, canonical uppercase officially assigned ISO
alpha-2 codes (249-code pinned list). DE is valid; UK, XK, ZZ, lowercase,
duplicates and null elements are invalid. Sort codes for semantic hashing;
never alias UK. Workspace defaults retain the four-market/UK-alias behavior
because no workspace mutation is part of 5.3. Page locale remains en-US and
four primary audience markets remain defaults, not an exhaustive Page allowlist.
The Page validator, constraint and its plan context use the same ISO rule.
Page Slug accepts exactly [a-z0-9-]{2,80}; workspace slugs are unaffected.

### TriviaPlanItemOverrideV1

An object with 0–6 optional keys, serialized at most 8192 UTF-8 bytes:

- profile_key: fast_trivia or practical_utility.
- fact_count: complete fixed {mode:"fixed",value:integer 5..9} or adaptive
  {mode:"adaptive",min,preferred,max:integers 5..9}, min<=preferred<=max.
- render_style: plain_lines or numbered.
- text_budget: complete five-key TriviaConfigV1 budget object; every positive
  integer limit must also be <= the corresponding captured Page limit.
- caption: complete {max_chars:positive integer <= captured Page limit}.
- hashtags: complete {min_count,default_count,max_count:integers 0..5}, ordered
  min<=default<=max and max<=captured Page maximum.

Unknown keys, null, wrong types, partial nested objects, extra nested keys and
out-of-range values fail CONFIG_INVALID. Empty object means inherit captured
config. Each supplied subobject replaces that subobject completely; there is no
implicit deep merge. Validate the effective config with TriviaConfigV1. Topic,
format, interaction goal and schedule remain separate item fields; overrides
cannot alter ownership, reuse, allowed choices, source policy or hard ceilings.

### PlanConfigV2 and context snapshot v1

New RPC-created plans store plan_config.schema_version=2; the existing
config_schema_version column still identifies TriviaConfigV1 (=1). Keep the
seven existing plan fields and add context_snapshot, a closed object:

- schema_version:1; module_version:1;
- page: {page_public_id,name,slug,platform,language_code,locale,timezone,
  target_markets,platform_config,is_active,updated_at};
- niche_config: {config_public_id,niche_key,config_schema_version,config,
  is_enabled,is_default,updated_at}.

Capture under Page/config locks, before mutation, and preserve on later plan
updates. No current-row reconstruction/backfill claims historical accuracy.
Legacy v1 plans remain readable/valid without fabricated snapshots. New v2
snapshot fields are closed-schema validated and scoped against the rows at
creation. Schedule mode is unscheduled if all slots are null, explicit_slots
otherwise; slots themselves are authoritative on items, never parsed from free
text intent or auto-generated/rescheduled. Mixed null/explicit slots are valid.
Context version in the success response retains the two inventory timestamps.

### Errors and locks

create_content_plan maps unsupported request/current config/module version to
CONFIG_INVALID, preserving its explicit tool error list. Page writes retain
CONFIG_SCHEMA_UNSUPPORTED. OAUTH_CLIENT_REQUIRED remains the database-side
request-context error specified in database §17 (Phase 6 owns HTTP challenges).
Invalid context is denied before any domain lookup. Safe exception messages are
stable codes, without SQL text/details. Slug conflicts map only the named slug
constraint; unrelated uniqueness failures map INTERNAL_ERROR.

Compute all distinct schedule bigint keys first, sort numerically, acquire all
transaction locks, then check both tables immediately before each item insert.
Use the existing shared Page+UTC-microsecond hash with fixed seed, so every
existing private slot writer shares the same lock domain. CORE-003's string is
illustrative ("such as"), not a mandate to change the deployed hash namespace.
No linked-item exception applies when creating a new plan: it has no originating
post/item identity. A linked existing post still blocks a new unrelated plan.

## Consequences and required evidence

Ledger storage grows only by bounded, safe settings/item projections needed for
stable replay. Historical rows are never rewritten. No caller privilege, API
count, editorial rule, lifecycle endpoint or later checkpoint is added.
Public-RPC tests must prove all three immutable replays after mutations, payload
mismatch, owner/context isolation, closed override validation, 8 ISO markets,
exact microsecond CAS, 100-item success, slot conflicts and atomic rollback
(including failure after child writes and at ledger completion). Separate-session
tests must prove numeric multi-slot lock acquisition and serialization. Clean
local reset, all required gates and full privilege/RLS catalog audit are required.
