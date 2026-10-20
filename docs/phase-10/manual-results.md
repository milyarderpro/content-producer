# Phase 10 — installed-plugin manual evidence ledger

**Current operational status, 20 October 2026:** PRIVATE Content Producer v0.2.2 uses owner OAuth `mcpku2`; backend `mcp` v29, SHA `6a8c42d8a3ffb846b8bd92663dbfbdbc9cc22e92`, passed [full gate #39372282908](https://github.com/milyarderpro/content-producer/actions/runs/39372282908). Package/docs SHA `31cb86a3e528bdb599f96078c1ca08edb85c6f0b` passed [light CI #39379688115](https://github.com/milyarderpro/content-producer/actions/runs/39379688115). The plugin page and chat proved 33 tools and three owner reads; host permission is `ask_before_writes`. MAN-01/02 PASS historically; MAN-03 was attempted under the old fixed-pilot route but produced no draft, so MAN-03/04 remain PENDING. The following 10.0 and v0.2.1 tables record their state **at the time**, not current configuration. No fixed-pilot grant activation is required on the OAuth route.

**10.0 historical procedure freeze: MAN-01..MAN-09 procedure-v1 FROZEN under CR-028.** Template only: **no cards executed, no new production mutations, and no new MCP connection**. Host write permission will be inspected first after connection/OAuth in 10.1; final plugin installation is 10.2. Per-card owner values and exact compiled prompts are deliberately PENDING until immediately before the card concerned. This cannot be mistaken for an executed test or approved write.

## Immutable test identity (fill on freeze)

| Field                                                           | Recorded value                                                                                                                                                    |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository baseline main SHA (10.0)                             | `ce87e15323a88abb82b1d9031ba8fef07dcf76b1`                                                                                                                        |
| Guide version / frozen commit SHA                               | procedure-v1 under CR-028; final guide commit SHA recorded after 10.0 CI                                                                                          |
| ChatGPT workspace + plan + host/mode/model                      | Owner Plus UI shows Add custom MCP server and OAuth; write approval pending 10.1                                                                                  |
| Final plugin name, manifest version and installed-release ID    | PENDING (source candidate is not an installed final package)                                                                                                      |
| Final archive SHA-256 and GitHub Actions artifact ID/run/SHA    | PENDING — preflight CI candidate is not the final package                                                                                                         |
| Verified custom MCP connection and OAuth owner test             | PENDING — 10.1, not performed in 10.0                                                                                                                             |
| Backend release SHA and link to applicable full gate            | `be3bf04b703a4aff16510c496600c9796c13b57a` — https://github.com/milyarderpro/content-producer/actions/runs/39085571345 (Phase 9 historical evidence, no new gate) |
| Production page baseline                                        | One owner pilot Page `phase-9-5-pilot-trivia` in Phase 9 independent audit; no new live state inspection in 10.0                                                  |
| New Page name/slug/niche/timezone/market/config + approval link | JIT before MAN-02: PENDING owner approval of exact payload; not 10.0                                                                                              |
| Publication/metrics policy                                      | `MAN-10..11` DEFERRED — POST-MVP by CR-027                                                                                                                        |

## Per-card outcome table

Procedure-v1 is frozen for MAN-01..09. MAN-01/02 were executed historically; MAN-03 had a failed fixed-pilot reservation attempt with no draft. MAN-03/04 and later cards still need current OAuth execution evidence. Static negative prompts MAN-08/09 are fixed but not yet executed.

| ID     | Phase    | Execution status    | Chat reference       | Source/plugin hash         | Tool trace         | State/ledger before→after          | Reviewer             | Outcome                                                        |
| ------ | -------- | ------------------- | -------------------- | -------------------------- | ------------------ | ---------------------------------- | -------------------- | -------------------------------------------------------------- |
| MAN-01 | 10.3     | EXECUTED READ-ONLY  | Work chat 2026-10-19 | v0.2.1 / verified 10.2 ZIP | 3 Read, 0 Write    | one active pilot Page before→after | owner confirmed PASS | PASS; 10.7 audit evidence limits                               |
| MAN-02 | 10.3     | EXECUTED            | Work chat 2026-10-19 | v0.2.1                     | create_page        | 1→2 Pages                          | owner signoff        | PASS (10.7 caveats)                                            |
| MAN-03 | 10.4     | ATTEMPTED; NOT PASS | historical No-auth   | v0.2.1                     | reservation failed | 0 new drafts                       | owner review pending | `FACT_RESERVATION_CONTEXT_CHANGED`; current OAuth card PENDING |
| MAN-04 | 10.4     | NOT RUN             | —                    | —                          | —                  | —                                  | —                    | PENDING                                                        |
| MAN-05 | 10.5     | NOT RUN             | —                    | —                          | —                  | —                                  | —                    | PENDING                                                        |
| MAN-06 | 10.5     | NOT RUN             | —                    | —                          | —                  | —                                  | —                    | PENDING                                                        |
| MAN-07 | 10.6     | NOT RUN             | —                    | —                          | —                  | —                                  | —                    | PENDING                                                        |
| MAN-08 | 10.6     | NOT RUN             | —                    | —                          | —                  | —                                  | —                    | PENDING                                                        |
| MAN-09 | 10.6     | NOT RUN             | —                    | —                          | —                  | —                                  | —                    | PENDING                                                        |
| MAN-10 | post-MVP | NOT RUN             | —                    | —                          | —                  | —                                  | —                    | DEFERRED — POST-MVP                                            |
| MAN-11 | post-MVP | NOT RUN             | —                    | —                          | —                  | —                                  | —                    | DEFERRED — POST-MVP                                            |

## Phase 10.4 — MAN-03/04 approved direction, preparation only (2026-10-19)

- **Owner choice, not a write command:** Moon phases; `nature_science`; `single_subject_fast`; `fast_trivia`; prefer seven verified, nonduplicated factual claims (never force seven); `follow`; English US; stable low-risk astronomy trivia. Source policy Tier A/B per atomic claim, with NASA originals investigated. No invented or copied claims.
- **Read-only baseline:** installed Content Producer v0.2.1 / release `pluginrel_6ad5c40b09588191842ddc1d42af957b`, ZIP SHA256 `236254c7d351cc9d932c4235ae50a4be23322610587e811effff77d43b4af37f`; workspace `cad2885e-952e-41b3-9eae-d2d9d75d533d`, `corious-facts` Page `37457236-17ec-4486-8880-6832460ae411`, config updated `2026-10-19T10:33:17.018070Z`, two Pages active. Original Phase 9.5 Page preserved. Do not infer a fresh ledger count.
- **Historical fixed-pilot safety:** CR-038 used short-lived, Edge-only operation permits and owner activation. This grant procedure is **not** used on current owner OAuth. Raw operation keys and reservation tokens are not put into public GitHub. MAN-04 revised hook and exact owner approval remain future gates.
- **Current outcome:** MAN-03 NOT RUN; MAN-04 NOT RUN; no draft/post ID, revision/hash or quality acceptance claimed. Never mark PASS before live owner-host trace, server checks and reviewed persisted output. Carry CR-037 independent ledger/secret inventory evidence gaps to 10.7.

## Evidence record: copy once for each actual card/attempt

```yaml
card_id: MAN-XX
guide_revision: procedure-v1 # compiled-card prompt revision recorded before each execution
exact_frozen_prompt: PENDING # bind and freeze approved real values JIT, before each card
utc_timestamp: PENDING
chat_reference: PENDING # private permalink or safely redacted reference
host_workspace_plan_mode_model: PENDING
plugin_name_version_installed_release: PENDING
plugin_archive_sha256: PENDING
plugin_source_commit_sha: PENDING
backend_deployment_sha: PENDING
owner_page_public_id_or_safe_slug: PENDING
target_post_or_plan_public_ids: PENDING
prerequisite_and_explicit_owner_consent: PENDING # precise Page payload approved at MAN-02; editorial hash approval at MAN-04; never credentials
expected_tool_names_ordered: PENDING
observed_tool_names_ordered: PENDING
redacted_arguments_results_reference: PENDING
expected_behaviour: PENDING
actual_behaviour: PENDING
safe_pre_state: PENDING # owner-visible counts/public IDs; source of verification
safe_post_state: PENDING
ledger_delta_and_operation_key_correlation: PENDING # safely hashed/redacted, never token
quality_checks_revision_hash: PENDING # for relevant editorial cards
forbidden_behaviour_observed: PENDING
duration_seconds: PENDING
recovery_and_rerun_of_affected_card: PENDING
status: PENDING # PASS / FAIL / PENDING only after execution and review
reviewer_and_date: PENDING
```

Only store minimum redacted arguments/results needed to explain a failure. Credentials (authorization codes, access/refresh tokens, cookies, client secrets, database/admin/service-role keys), unrelated chats, and raw private logs are prohibited.

## Review rules

- Every PASS requires the exact compiled prompt matching frozen procedure-v1, owner values approved before the relevant card, plugin version **and archive hash** matching the installed package, observable ChatGPT tool selection, actual expected behavior, independent safe state evidence for write/no-write, and reviewer signoff.
- For denial/ambiguity cases, compare before/after state and ledger; absence of visible tool calls is not sufficient.
- On timeouts, lost write responses, revision/lease conflicts or duplicate-looking state: stop; inspect safe state, reconcile original operation key and semantic payload, never retry with a new key to produce a second record.
- On missing entitlement, wrong OAuth owner, unexpected tool count, unsafe write or secret disclosure: stop the checkpoint and record BLOCKED/FAIL; do not bypass via SQL, admin API or connector.
- Maintain nine mandatory cards; optional `MAN-10..11` cannot delay MVP under CR-027. Preserve 101 frozen prompts as a non-executed regression inventory.

## Phase 10.3 — MAN-01 live plugin readback (2026-10-19)

- **Host:** final PRIVATE `Content Producer` v0.2.1 with its registered `mcpku` connection; installed release `pluginrel_6ad5c40b09588191842ddc1d42af957b`, inner ZIP SHA-256 `236254c7d351cc9d932c4235ae50a4be23322610587e811effff77d43b4af37f`; no refresh, OAuth flow or 10.2 reinstall.
- **Frozen MAN-01 bound prompt:** “Gunakan hanya plugin Content Producer yang terpasang. Tampilkan identitas akun Content Producer yang terhubung, workspace dan niche yang aktif, lalu daftar Page saya. Tunjukkan apakah Page ber-slug `phase-9-5-pilot-trivia` ada. Jangan mengubah data.” The owner's 10.3 task directed these three reads in the same order.
- **Observed 3/3 real connected tool reads:** `get_account_profile({})` succeeded (display `Content Producer account`, workspace `cad2885e-952e-41b3-9eae-d2d9d75d533d`); `get_workspace_context({request_schema_version:1,workspace_public_id:<profile>})` returned active `trivia`, one active and zero inactive Pages; `list_pages({request_schema_version:1,workspace_public_id:<profile>,limit:50})` returned exactly one `phase-9-5-pilot-trivia` Page (public ID `5030e577-89bf-4645-85e8-1d5060fb91ee`), active, New York timezone, US target, trivia v1 enabled/default, and `has_more=false`.
- **Extra read-only config inspection for MAN-02 proposal:** `get_page_generation_context` for that Page returned the full actual trivia v1 config and live context. This is **not** a MAN-02 write or owner approval.
- **Safety:** no `create_page` or any other business write; owner-visible Page count stayed one. Fresh ledger count was **not independently verified** using the plugin, so no unobserved ledger state is asserted.
- **Final MAN-01 verdict:** PASS based on the installed plugin's actual read-only calls and the owner's explicit 10.3 signoff.
- **MAN-02 gate:** final exact Page payload and operation key were approved; gated production write, Page/config read-back, and owner-attested temporary grant revocation are documented below.

## Phase 10.3 — MAN-02 Page write and revocation (2026-10-19)

- **Owner approval:** exact Page `corious facts` / `corious-facts`, timezone `Asia/Jakarta`, US market, trivia v1 config, `make_default:true`.
- **Immutable operation key:** `ad350ab5-e3a0-40c9-b7c9-1cb1d2bc07c0`; the retry used the same payload and key.
- **First attempt:** `CONFIG_INVALID` from JSONB parameter serialization. Read-only checks found no new Page or ledger entry.
- **Correction:** `pilot_db.ts` parses `create_page.p_config` as JSONB; full CR-020 gate [#39234992064](https://github.com/milyarderpro/content-producer/actions/runs/39234992064) PASS on `6f104747f3414d7b9066749035c1ccf23f54ce0a`.
- **Production:** fixed MCP Edge Function, deployed bundle SHA-256 `c054ac447add8c44bf5bd3bc59331c7917b8c6fc63f3b6e235777682d84ceada`.
- **Successful retry:** installed-plugin `create_page` returned `replayed=false`; new Page ID `37457236-17ec-4486-8880-6832460ae411`.
- **Read-back:** 2 active Pages, 0 inactive; the original Phase 9.5 Page remains unchanged, and both Page trivia configurations match.
- **Grant closure:** owner confirmed deletion of temporary `MCP_MAN02_APPROVED_SHA256` after the successful write. The connector cannot independently read project secrets.
- **Evidence boundary:** post-success direct ledger SQL queries were blocked by platform safety checks. No bypass or second successful write was attempted. The ledger count remains independently unverified.
- **Final MAN-02 verdict:** PASS: one Page/config created, same approved key used for failed attempt and successful retry, no duplicate Page, original Phase 9.5 Page unchanged, and owner confirmed secret deletion. Do not confuse this confirmation with independent secret inventory inspection.
- **Audit 10.7 limitations:** direct production SQL ledger inspection after the successful write was blocked; no independent production ledger count is claimed. Secret revocation was owner-confirmed, not independently listed by the connector. The RPC response (`replayed=false`), Pages/config read-back, and idempotent operation replay tests in isolated CI support checkpoint PASS without representing either independent read as completed.
- **Checkpoint 10.3 verdict:** MAN-01 PASS, MAN-02 PASS, 10.3 PASS on 2026-10-19. The runbook PASS condition does not explicitly require independent production SQL ledger and secret inventory reads. Keep both gaps visible for independent audit 10.7. PR #23 stays draft; 10.4–10.7 and AC-001..014 remain PENDING; no new write, deployment, or full gate for this documentation signoff.

## Phase 10.4 — historical No-auth gate and handoff (2026-10-19; superseded operationally)

- CR-020 full gate: **PASS**, [run #39247887069](https://github.com/milyarderpro/content-producer/actions/runs/39247887069), SHA `747bb81bd092991077d5f1b18539c7a5a4b14ba6`.
- Production `mcp` version **18** deployed and read back, bundle SHA-256 `290baf9867eb3bde3b074114a084565275a95f0c0e03b6a0a92148f9ae1b233c`; `verify_jwt=false` preserved.
- Read-only installed plugin smoke: expected owner/workspace and two active Pages; target Page still has **zero posts**. The supported `has_named_part_or_property` relation succeeded in `trivia_find_similar_facts`; an unsupported relation was rejected without a write.
- Owner-only MAN-03 compiled prompt UTF-8 SHA-256: `4b4e8d0e373aff8cc594f15cd03ca41a2d2d14a370f66d9b99af02a32837d4d0`. Raw operation keys and reservation token are delivered privately, not committed.
- At this 2026-10-19 handoff, grant activation was pending. Later fixed-pilot reservation attempts failed and the grants were revoked; see [Issue #22 forensic record](https://github.com/milyarderpro/content-producer/issues/22#issuecomment-6270311976). This is historical and does not instruct grant activation on OAuth.
- MAN-03 subsequently reached a failed reservation but **no draft**; MAN-03/04 remain **PENDING**. The owner must separately review any future persisted draft, checks, actual revision and hash before MAN-04 approval. No ready, schedule or publication action.
- Preserve 10.3 independently unverified production ledger and secret-revocation evidence as audit 10.7 residuals.

## CR-046 MAN-03 blocker repair — separate from manual-card outcome

**Observed results — 20 October 2026.** Change record was committed first
(`53c92e7dc29b1aa0a23679eab8b487a932b9aeda`). Source adds one
owner-scoped `data.config_public_id` to the generation-context projection in
an additive SQL migration, aligns the 33-tool MCP schema, and asserts each
Page-specific configuration UUID and the exact six-microsecond timestamp. No
old migrations, OAuth enforcement, grants, reservation or post-validation rules
were intentionally changed.

- Prior to the gate, [light CI #39390529881](https://github.com/milyarderpro/content-producer/actions/runs/39390529881)
  **PASS**, including `pnpm run check` and 74 focused MCP tests.
- **Exactly one CR-020 full gate** was triggered for backend marker SHA
  `f39810bbe1e2eaa035c1e805f3b3a2eb3e0ae066`:
  [run #39390719071](https://github.com/milyarderpro/content-producer/actions/runs/39390719071),
  **FAIL** in the isolated Phase 6.13 HTTP/Inspector step, after local reset,
  owner-auth tests and 74 focused MCP tests passed. The defect was in a **new
  test assertion**, which wrongly expected private `generation_snapshot` on
  public `get_post`; the frozen post projection intentionally redacts it.
  The gate stopped before the remaining full suite. Do not call this run PASS.
- Narrow subsequent [focused CI #39391441204](https://github.com/milyarderpro/content-producer/actions/runs/39391441204)
  localized the failure to the new snapshot readback assertion, after the
  real owner Page context, Page+niche config ID, microsecond CAS, fact
  reservation, `save_post` and `get_post` had succeeded.
- Test harness corrected in `a92a5e27b60e5301e2d85c25195f4dba17df9034`
  to inspect the persisted snapshot in the **isolated fixture database**,
  without widening `get_post`. [Focused public HTTP/RPC/MCP run
  #39391875211](https://github.com/milyarderpro/content-producer/actions/runs/39391875211)
  **PASS**: Page context → reserve → draft save → draft readback, config
  identity and exact six-digit timestamp, private snapshot redaction, 33/33
  valid and 33/33 invalid Inspector tool calls, non-owner isolation and
  HTTP log privacy. This **does not replace a passing full gate**.
- **Production not deployed.** Independent Supabase read confirmed `mcp`
  v29 remains ACTIVE, `verify_jwt=false` for application OAuth, and CR-046
  migration is **absent** from production history. No production fact
  registration, reservation, `save_post`, pilot grant, authentication change,
  or MAN-03/04 write was performed. The old released operation key was not
  reused. Do not deploy until a passing final-SHA full gate is separately
  authorized and observed; the single full-gate attempt in this task has
  already been consumed.



Source correction work on the same draft PR #23 adds the actual Page+niche
`config_public_id` to generation context and validates it against the
persisted configuration row. The isolated test exercises
context → fact reservation → `save_post` → `get_post` with exact
six-digit-microsecond CAS and a full snapshot. This is a **local fixture**
trace, not a production MAN-03 draft or an owner editorial approval.
Record a CI/deployment/OAuth result here only after it is observed.
MAN-03 production and MAN-04 remain PENDING.

## Current MAN-03 OAuth handoff — 20 October 2026

- **Installed host:** same PRIVATE plugin v0.2.2, required `mcpku2` OAuth app, 33 tools and three owner reads PASS through `@Content Producer`; no OAuth business write yet. The host is set to `ask_before_writes` ([host evidence](https://github.com/milyarderpro/content-producer/issues/22#issuecomment-6285034464)).
- **Target:** owner Page `corious-facts`, public ID `37457236-17ec-4486-8880-6832460ae411`; Moon phases, `nature_science`, `single_subject_fast`, `fast_trivia`, `follow`, en-US, draft-only. The topic is owner-approved direction, not permission to approve/publish. The original Phase 9.5 Page remains untouched.
- **Historical failure boundary:** a fixed-pilot Edge v25 reservation returned `FACT_RESERVATION_CONTEXT_CHANGED`; original bound values and that historical bundle were unavailable. Isolated database testing demonstrated that `2026-10-19T10:33:17.018070Z` is accepted while truncated `.018Z` conflicts; it did **not** prove the original failure cause. Zero draft was saved. Do not reuse a stale context or treat the failed historical call as a successful reservation.
- **OAuth execution rule:** the fixed-pilot CR-038 grant gate runs only when `pilotMode` is active; current OAuth calls do not read those grants. No terminal activation/revocation step. Before reserving, read fresh `get_page_generation_context`, copy its `config_updated_at` exactly with six microsecond digits and current `fact_reuse_scope`, verify claims and similarity, then use one exact owner-approved reserve/save sequence. On uncertainty, context error or lost response, stop and reconcile owner-visible state; never generate replacement keys merely to retry.
- **MAN-04 boundary:** show the saved draft, source evidence, quality checks, revision and `content_hash` to the owner. Revision and editorial approval are separate decisions. No ready status, schedule, Facebook publication or fabricated metrics before their assigned cards.
- **Gate policy:** no backend code, migrations, security configuration or runtime dependency changed after the v29 gate. This documentation handoff uses light CI; a new full gate is due only if a later backend/security change requires one under CR-044.
