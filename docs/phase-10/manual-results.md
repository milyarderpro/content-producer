# Phase 10 — installed-plugin manual evidence ledger

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

Procedure-v1 is frozen for MAN-01..09; per-card prompt binding, owner consent, and outcomes stay PENDING until the assigned later checkpoint. Static negative prompts MAN-08/09 are fixed now, but not yet executed.

| ID     | Phase    | Execution status   | Chat reference       | Source/plugin hash         | Tool trace      | State/ledger before→after          | Reviewer             | Outcome                          |
| ------ | -------- | ------------------ | -------------------- | -------------------------- | --------------- | ---------------------------------- | -------------------- | -------------------------------- |
| MAN-01 | 10.3     | EXECUTED READ-ONLY | Work chat 2026-10-19 | v0.2.1 / verified 10.2 ZIP | 3 Read, 0 Write | one active pilot Page before→after | owner confirmed PASS | PASS; 10.7 audit evidence limits |
| MAN-02 | 10.3     | EXECUTED           | Work chat 2026-10-19 | v0.2.1                     | create_page     | 1→2 Pages                          | owner signoff        | PASS (10.7 caveats)              |
| MAN-03 | 10.4     | NOT RUN            | —                    | —                          | —               | —                                  | —                    | PENDING                          |
| MAN-04 | 10.4     | NOT RUN            | —                    | —                          | —               | —                                  | —                    | PENDING                          |
| MAN-05 | 10.5     | NOT RUN            | —                    | —                          | —               | —                                  | —                    | PENDING                          |
| MAN-06 | 10.5     | NOT RUN            | —                    | —                          | —               | —                                  | —                    | PENDING                          |
| MAN-07 | 10.6     | NOT RUN            | —                    | —                          | —               | —                                  | —                    | PENDING                          |
| MAN-08 | 10.6     | NOT RUN            | —                    | —                          | —               | —                                  | —                    | PENDING                          |
| MAN-09 | 10.6     | NOT RUN            | —                    | —                          | —               | —                                  | —                    | PENDING                          |
| MAN-10 | post-MVP | NOT RUN            | —                    | —                          | —               | —                                  | —                    | DEFERRED — POST-MVP              |
| MAN-11 | post-MVP | NOT RUN            | —                    | —                          | —               | —                                  | —                    | DEFERRED — POST-MVP              |

## Phase 10.4 — MAN-03/04 approved direction, preparation only (2026-10-19)

- **Owner choice, not a write command:** Moon phases; `nature_science`; `single_subject_fast`; `fast_trivia`; prefer seven verified, nonduplicated factual claims (never force seven); `follow`; English US; stable low-risk astronomy trivia. Source policy Tier A/B per atomic claim, with NASA originals investigated. No invented or copied claims.
- **Read-only baseline:** installed Content Producer v0.2.1 / release `pluginrel_6ad5c40b09588191842ddc1d42af957b`, ZIP SHA256 `236254c7d351cc9d932c4235ae50a4be23322610587e811effff77d43b4af37f`; workspace `cad2885e-952e-41b3-9eae-d2d9d75d533d`, `corious-facts` Page `37457236-17ec-4486-8880-6832460ae411`, config updated `2026-10-19T10:33:17.018070Z`, two Pages active. Original Phase 9.5 Page preserved. Do not infer a fresh ledger count.
- **Safety:** CR-038 has distinct short-lived, Edge-only, default-absent operation permits. The owner sends the frozen executable MAN-03 prompt through installed Content Producer **only after** tests/deployment and separate grant activation; no assistant MCP business write. Raw operation keys and reservation tokens are not put into public GitHub. MAN-04 revised hook and exact owner approval remain future gates.
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
