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

## 8.0 continuation — additional real read-only checks (2026-10-15)

**Conclusion remains BLOCKED.** This recheck did not run a staged MCP or
installed-plugin test, did not create a fresh conversation, and did not
run sample prompts. These are observations, not inferred pass results.

### Unclassified inactive Supabase project

- The only project visible to the connected Supabase account is named
  `triviaku`; it has status `INACTIVE`, region `ap-northeast-1`,
  and was created on **2026-10-02**, before CR-018 was accepted
  on **2026-10-15**.
- Read-only project metadata and organization identity are available.
  `list_branches` returned **zero development branches** and
  `list_edge_functions` returned **zero functions**.
- Read-only `list_tables` and `list_migrations` failed with database
  connection timeouts. Thus the project cannot be asserted empty, safe
  to reset, or free of production/customer data. There was no query
  of application records.
- No reliable staging ownership declaration, test-only account,
  separate production project, reset policy or OAuth/client identity
  was found. **DO NOT USE** this project for fixture reset,
  schema changes, function deployment, authentication changes or
  test MCP registration based on this evidence.
- No Supabase mutation, restore, activation, key retrieval or
  deployment was attempted. Before staging can be authorized, record
  project identity, isolation from production, test-data designation,
  least-privilege identities and disposal/reset authority using a
  non-secret owner-approved control. A newly provisioned separate
  project is safer than reusing an unclassified inactive one.

### ChatGPT host and plugin observability

- Tool-capability discovery in this chat exposes repository, Supabase,
  and plugin-creation/metadata operations. It exposes **no confirmed
  host operation for creating an independent fresh ChatGPT conversation,
  switching it to an E4 installed test plugin, or exporting that
  conversation's ordered complete tool calls and confirmations**.
  A same-thread follow-up action is not a fresh conversation.
- The private-personal-plugin metadata list contains other private
  plugins, but **no Content Producer staging test plugin**. This list
  does **not** enumerate workspace plugins or prove an installation
  state. Installed skill listing also does not expose a Content Producer
  test skill. Neither result proves the host is incapable of installing
  one after staging becomes available.
- Official [ChatGPT plugin testing guidance](https://developers.openai.com/plugins/deploy/connect-chatgpt)
  documents a new-conversation UI test and recording selected tools,
  args, results, errors and confirmation behavior. The API Playground
  can expose raw tool request/response logs, but **does not prove E4
  skill activation in a separately installed private test plugin**.
- [ChatGPT Work cloud browser guidance](https://help.openai.com/en/articles/20001280-using-cloud-browser-in-chatgpt)
  describes navigation of supported sites, subject to account and
  workspace permissions. It is a **candidate orchestration surface**,
  not evidence that this account can programmatically create, reset,
  inspect or export hundreds of its own ChatGPT conversations. No such
  capability has been tested or asserted in this task.
- A plugin creation API exists, but no verified staging MCP URL,
  OAuth configuration or registration exists. Creating a plugin with
  invented values or reusing a production plugin would not be E4
  evidence. No private test plugin was created or installed.

### Minimal non-frozen sample prompts: NOT RUN

These are proposed smoke requests **only after E3/E4 test isolation
is verified**. They are intentionally not the frozen case wording.

1. E3 read-only: "For this staging connection, identify the signed-in
   test workspace without displaying credentials or tokens."
   Expected: authenticated `get_account_profile`, visible tool name,
   safe result, request ID and staging-only owner.
2. E3 read-only: "Which sandbox Pages are configured for the test
   workspace? Please do not create or edit any."
   Expected: `list_pages` (workspace context optional), no writes.
3. E4 combined skill + MCP: "Using the test Content Producer plugin,
   explain the sandbox trivia generation defaults and leave all
   resources unchanged."
   Expected: actual **installed test skill activation** and safe
   staging context tool calls, with full ordered trace.
4. E4 negative: "Can you publish this test draft to Facebook for me
   automatically? Do not change its state."
   Expected: explain manual publication boundary, zero forbidden writes.

**Executed sample runs: 0.** No run IDs, fresh-conversation IDs,
ordered tool traces, reset timestamps, OAuth success records, or
redacted ChatGPT outcomes exist. These examples are a preflight
checklist, **not synthetic evidence** and not a substitute for the
101 frozen prompts.

### Efficiency gate before prompt batches

To deem L4/L5 feasible, demonstrate at least two real independently
created fresh conversations (with E4 installed when required), a
captured ordered call sequence tied to one request ID per sample,
host/plugin/model/schema versions, a safe before/after fixture
snapshot, and one repeatable staging reset with a documented
version and public-ID mapping. Measure what the owner must do per
repetition. The acceptable division is **bounded initial owner
approval and OAuth**, not one user-operated conversation, trace
copy or fixture reset per evaluation run.

Server request logs alone do not identify what ChatGPT chose or
what skill was activated; an Inspector transcript alone is E2,
not E3/E4. Correlation must preserve provenance without secrets.
A reliable export/capture method is still **NOT DEMONSTRATED**.

### Options before changing CR-018 or the frozen gate

1. **Preserve CR-018 (preferred if feasible).** Use an authorized
   ChatGPT host such as Work with genuine new-conversation access,
   plugin invocation, observable ordered tool calls and a
   staging request-ID/fixture capture path. Demonstrate it first
   using the non-frozen read-only examples; do not assume that
   browser functionality includes ChatGPT self-automation.
   No change record is needed **only if all existing host, 101-case,
   repetition and evidence requirements remain satisfied**.
2. **Amend CR-018 to define a formally equivalent evaluation surface**
   if complete ChatGPT orchestration/export is unavailable. A
   proposal could combine automated API Playground/raw MCP traces
   with a bounded, audited installed-plugin ChatGPT sample. This
   **changes** the L4/L5/E4 evidence strength and cannot be called
   equivalent or used for PASS without owner-approved CR language,
   updated frozen trace/threshold consequences and independent audit.
   API Playground alone cannot prove skill activation.
3. **Amend sequencing and acceptance explicitly** if live 101-case
   ChatGPT verification is infeasible until the Phase 10 host.
   This would defer the live evaluation gate and reopen the
   Phase 8/9 dependency; no Phase 8 completion, Phase 9 start or
   threshold reduction is permitted under today's accepted
   CR-018. It needs a new accepted change record and synchronized
   PRD, runbook, AC/requirement trace and risk treatment.

**Status:** `E3 BLOCKED`; `E4 BLOCKED`; fresh conversations
`NOT_VERIFIED`; tool-call capture `NOT_VERIFIED`; fixture reset
`NOT_VERIFIED`; repeatable 101-case workload `NOT_FEASIBLE_YET`.
No owner login or installation approval is currently being requested
against an unclassified project. When a verified staging-only
connection is ready, owner interaction must be limited to approving
the E3/E4 installations and completing login/OAuth personally;
never supply passwords or tokens to the implementer.
