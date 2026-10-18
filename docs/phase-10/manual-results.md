# Phase 10 — installed-plugin manual evidence ledger

**10.0 status: BLOCKED.** Template only; **no cards executed and no production mutations**. Do not infer PASS from a blank template, earlier server Inspector, or Phase 9 owner callback. Run cards only after host, installation and owner decisions have been proven, and the guide is explicitly frozen.

## Immutable test identity (fill on freeze)

| Field                                                           | Recorded value                                                                                                                                                    |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository baseline main SHA (10.0)                             | `ce87e15323a88abb82b1d9031ba8fef07dcf76b1`                                                                                                                        |
| Guide version / frozen commit SHA                               | PENDING — owner Page/content selection and host gate                                                                                                              |
| ChatGPT workspace + plan + host/mode/model                      | Account Plus reported; actual required custom-MCP/write entitlement not verified                                                                                  |
| Final plugin name, manifest version and installed-release ID    | PENDING (source candidate is not an installed final package)                                                                                                      |
| Final archive SHA-256 and GitHub Actions artifact ID/run/SHA    | PENDING — preflight CI candidate is not the final package                                                                                                         |
| Verified custom MCP connection and OAuth owner test             | PENDING — 10.1, not performed in 10.0                                                                                                                             |
| Backend release SHA and link to applicable full gate            | `be3bf04b703a4aff16510c496600c9796c13b57a` — https://github.com/milyarderpro/content-producer/actions/runs/39085571345 (Phase 9 historical evidence, no new gate) |
| Production page baseline                                        | One owner pilot Page `phase-9-5-pilot-trivia` in Phase 9 independent audit; no new live state inspection in 10.0                                                  |
| New Page name/slug/niche/timezone/market/config + approval link | PENDING owner decision                                                                                                                                            |
| Publication/metrics policy                                      | `MAN-10..11` DEFERRED — POST-MVP by CR-027                                                                                                                        |

## Per-card outcome table

| ID     | Phase    | Execution status | Chat reference | Source/plugin hash | Tool trace | State/ledger before→after | Reviewer | Outcome             |
| ------ | -------- | ---------------- | -------------- | ------------------ | ---------- | ------------------------- | -------- | ------------------- |
| MAN-01 | 10.3     | NOT RUN          | —              | —                  | —          | —                         | —        | PENDING             |
| MAN-02 | 10.3     | NOT RUN          | —              | —                  | —          | —                         | —        | PENDING             |
| MAN-03 | 10.4     | NOT RUN          | —              | —                  | —          | —                         | —        | PENDING             |
| MAN-04 | 10.4     | NOT RUN          | —              | —                  | —          | —                         | —        | PENDING             |
| MAN-05 | 10.5     | NOT RUN          | —              | —                  | —          | —                         | —        | PENDING             |
| MAN-06 | 10.5     | NOT RUN          | —              | —                  | —          | —                         | —        | PENDING             |
| MAN-07 | 10.6     | NOT RUN          | —              | —                  | —          | —                         | —        | PENDING             |
| MAN-08 | 10.6     | NOT RUN          | —              | —                  | —          | —                         | —        | PENDING             |
| MAN-09 | 10.6     | NOT RUN          | —              | —                  | —          | —                         | —        | PENDING             |
| MAN-10 | post-MVP | NOT RUN          | —              | —                  | —          | —                         | —        | DEFERRED — POST-MVP |
| MAN-11 | post-MVP | NOT RUN          | —              | —                  | —          | —                         | —        | DEFERRED — POST-MVP |

## Evidence record: copy once for each actual card/attempt

```yaml
card_id: MAN-XX
guide_revision: PENDING
exact_frozen_prompt: PENDING # include second prompt for MAN-04 as separate turn
utc_timestamp: PENDING
chat_reference: PENDING # private permalink or safely redacted reference
host_workspace_plan_mode_model: PENDING
plugin_name_version_installed_release: PENDING
plugin_archive_sha256: PENDING
plugin_source_commit_sha: PENDING
backend_deployment_sha: PENDING
owner_page_public_id_or_safe_slug: PENDING
target_post_or_plan_public_ids: PENDING
prerequisite_and_explicit_owner_consent: PENDING # reference only; never credentials
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

- Every PASS requires prompt matching frozen guide, plugin version **and archive hash** matching installed package, observable ChatGPT tool selection, actual expected behavior, independent safe state evidence for write/no-write, and reviewer signoff.
- For denial/ambiguity cases, compare before/after state and ledger; absence of visible tool calls is not sufficient.
- On timeouts, lost write responses, revision/lease conflicts or duplicate-looking state: stop; inspect safe state, reconcile original operation key and semantic payload, never retry with a new key to produce a second record.
- On missing entitlement, wrong OAuth owner, unexpected tool count, unsafe write or secret disclosure: stop the checkpoint and record BLOCKED/FAIL; do not bypass via SQL, admin API or connector.
- Maintain nine mandatory cards; optional `MAN-10..11` cannot delay MVP under CR-027. Preserve 101 frozen prompts as a non-executed regression inventory.
