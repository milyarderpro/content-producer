# Phase 8.0 — live preflight and evidence boundary

**Date:** 2026-10-15 (Asia/Jakarta). **Baseline `main`:** `da6b68ac87ad489b0e30d784985e73f216d4ffb8`.
**Verdict: BLOCKED.** This checkpoint maps coverage; it has not passed the
required ChatGPT staging preflight. No 101 frozen prompts or 8.1 harness
tasks were run.

## Frozen coverage (design, not execution)

The accompanying [coverage-map.json](coverage-map.json) maps **101 case IDs**
(21 direct, 12 indirect, 10 follow-up, 8 clarification, 36 recovery, 14
negative), **31 user goals**, **33 positive and 33 boundary/recovery tool
paths**, and **14 acceptance criteria** to the frozen contracts. No frozen
prompt wording or expected behavior is copied or modified.

The `revoke_post_approval` boundary uses an ambiguous-reference variant,
and `get_post_performance` uses an empty/history variant. These are _planned
variants_, not completed frozen case runs. Every case/tool/AC remains marked
`NOT_EXECUTED` or `NOT_EVALUATED`. The deployment-dependent portions of
`AC-001` and `AC-012` remain `DEFERRED-to-Phase-9/10`.
No `PASS-final-MVP` claimed.

## What was actually observed

1. **Source and prior deterministic CI — VERIFIED AS HISTORICAL EVIDENCE.**
   The Phase 7 portable candidate, connection-input schema, 33-tool
   contract, and GitHub Actions local-Supabase testing precedent exist.
   This is _not_ evidence of live ChatGPT staging or a Phase 8 test pass.
2. **Supabase project discovery — READ-ONLY OBSERVED.** The connected
   account listed one remote project marked `INACTIVE`. No project was
   explicitly identified and verified as isolated Phase 8 staging.
   No production/staging database, project, authentication configuration,
   or Edge Function was read, changed, activated, reset or deployed.
   The unclassified project must not be repurposed or treated as staging.
3. **Isolated E3 environment — NOT VERIFIED.** Separate test owner,
   independent OAuth registration, test-only database, HTTPS custom MCP,
   minimal auth frontend, and cleanup policy have not been evidenced.
4. **Live E3 custom MCP — NOT VERIFIED.** No staging OAuth discovery,
   PKCE/consent/deny, authorized token `2xx`, tools/list (33/33),
   response, or relink trace from ChatGPT was observed.
5. **Live E4 private test plugin — NOT VERIFIED.** The Phase 7 candidate
   intentionally omits final `mcp.json` and registered mapping. There
   is no proven separately named staging-only test plugin, installation,
   active skill, or fresh-session invocation. Existing production plugins
   must not be used as test plugins.
6. **Fresh chat, tool-call visibility, redacted evidence — NOT VERIFIED.**
   The available GitHub/Supabase connector operations do not provide
   a demonstrated way in this task to create fresh ChatGPT conversations,
   observe complete ordered test-plugin calls, inspect confirmations,
   capture safe state changes or export reproducible traces at scale.
7. **Staging fixture reset — NOT VERIFIED.** Frozen fixture names and
   local database tests are available, but repeatable staging reset,
   fixture version, public-ID mapping, safe before/after reads, RLS
   assertions and metadata digest have not been exercised.
8. **Manual burden — BLOCKING.** No repeatable loop has demonstrated
   fresh conversation, prompt, tool trace, state verification, redaction
   and fixture reset. At least three repetitions per relevant frozen
   case would otherwise impose hundreds of user actions.

## Live preflight needed to unblock (not executed)

1. Identify/provision an **independent staging** Supabase resource,
   test-owner identities, HTTPS MCP and minimum auth frontend. Keep OAuth
   secrets and staging registration in secure host configuration, never
   in GitHub or the production package. Prove that production is isolated.
2. Connect one ChatGPT _custom MCP_ to E3 staging with owner login.
   Verify live OAuth discovery/PKCE/consent and a read-only
   `get_account_profile` call, visible selected tool, sanitized result,
   request identifiers, 33-tool discovery, and safe denial/relink.
3. Install the separate private **test** plugin based on the Phase 7
   skill source with verified staging connection values stored outside
   source control. In a **new conversation**, demonstrate actual skill
   activation plus a selected staging tool call.
4. Establish a disposable `S-AUTH-OWNER` fixture, public IDs, schema
   digest and repeatable reset/check commands. Prove an allowed state
   read-back before testing writes, never against an unclassified project.
5. Demonstrate **at least two distinct fresh conversations** and several
   _sample non-frozen read-only prompts_, collecting complete tool order,
   sanitized args/results, safe state snapshots, host/model/plugin/MCP
   versions, digest, time, outcomes and provenance. Show how evidence
   capture and fixture reset scale without the owner manually executing
   hundreds of chats.

**Owner actions, bounded to onboarding:** identify/authorize isolated
staging; approve connection and installation of E3 custom MCP and E4
private _test_ plugin; complete their login/OAuth flows personally.
Do not send passwords, codes, or tokens into chat. If a permitted host
automation or UI capability is needed for conversation orchestration and
trace export, that must be explicitly available and demonstrated.

**Decision:** STOP at **BLOCKED** until E3/E4 live, fresh conversation,
tool-call observability, fixture reset, and feasible redacted recording
are proven. If the host cannot support the frozen protocol, obtain a
new accepted change record before modifying environment or gate.
Do not start 8.1 or the 101-case evaluation. E5/production remains
Phase 9–10.
