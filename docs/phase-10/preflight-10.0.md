# Phase 10.0 — host/write and artifact-transfer preflight (2026-10-18)

**Historic disposition before CR-028: BLOCKED. Superseded by the CR-028 proof sequence and final 10.0 evidence below.** No OAuth, new custom-MCP connection, private plugin installation, business write, production change, backend deploy or heavyweight CI was performed in this task. This report is a snapshot of actual evidence and expressly does **not** green-light 10.1.

## CR-028 superseding Phase 10.0 preflight disposition (2026-10-18)

**Decision:** The owner accepted [CR-028](../decisions/2026-10-18-phase-10-proof-sequencing.md): 10.0 proves custom MCP/OAuth form and GitHub Actions artifact delivery to an account-accessible PRIVATE plugin archive intake. **Write entitlement and approval are not 10.0 gates**; inspect them first after connection/OAuth in 10.1, without invoking write, and stop before any owner read/package work if absent. A final installed package is proven **only in 10.2**, and first owner business write **only in MAN-02** after exact Page payload approval. No Page/content/plan values are required to freeze the invariant card procedures in 10.0; ask for them immediately before each relevant card.

### Current 10.0 affirmative evidence, not later-stage success

- **Owner Plus UI:** An owner-provided screenshot of `chatgpt.com/plugins` shows the **Add custom MCP server** form, selected **OAuth** authentication, Advanced OAuth settings, **Create as a plugin** (unclicked), and an unchecked risk acknowledgment. Creation form and OAuth selector are **OBSERVED**; write entitlement and OAuth handshake are **not**. The Plus tier matrix is not an account-specific write denial.
- **GitHub Actions transfer:** Previously successful exact-SHA [PR CI #39095321646](https://github.com/milyarderpro/content-producer/actions/runs/39095321646), artifact `phase-10-preflight-candidate` ID `12123959250`, downloaded and inspected: outer SHA-256 `ed574508fe83a4f5a01b450f3497ed9f924234478a6614e1b05f9293a2ac17a6`; inner source ZIP SHA-256 `fc03a93cbe3ca2459b4659e0cf413f9df4364309f0ac8e9558e46e79c72b9567`. **12/12 files** matched their file hashes; manifest `0.1.0`, **no `mcp.json`**.
- **Account-private receiving path:** Available **Plugin Creator `create_plugin`** accepts a host-uploaded **local ZIP/tar.gz** and creates a **PRIVATE** personal/workspace plugin. Four existing personal `USER/PRIVATE` releases are visible in owner inventory. Authorized operator/owner with repo Actions read can download and verify artifact, then the owner can use the private plugin-creation facility to import a later final ZIP. **The ingress path is verified as available, but this candidate has not been uploaded, and no final package has been installed**. 10.2 must prove acceptance of exact final bytes, release/version/hash and live plugin skill/MCP.
- **Procedure freeze:** Nine required MAN-01..09 procedures are tagged `procedure-v1` in [manual-cards.md](manual-cards.md), including expected/forbidden tools, approval boundaries, owner state checks, recovery and JIT binding gates. Static MAN-08/09 prompts are fixed. The exact approved Page payload, factual draft choices, revision/approval and 1–3 plan slots are intentionally **not yet selected**; compilation and approval are per-card at MAN-02/03/04/05. MAN-10/11 remain post-MVP optional.
- **10.1 hard-stop handoff:** Immediately after owner-private MCP connection/OAuth, inspect registered write tools and approval affordances **without invoking write**. If any feature is absent or cannot be verified without a write request, stop 10.1 with one concrete diagnosis. Do not proceed to the final package or MAN-02.

### 10.0 evidence accounting

| Gate                                                         | Current status              | Boundary                                                    |
| ------------------------------------------------------------ | --------------------------- | ----------------------------------------------------------- |
| Owner's private custom MCP creation form / OAuth selector    | **PROVEN**                  | UI only, no connection                                      |
| GitHub Actions artifact download + integrity                 | **PROVEN**                  | 12-file source candidate, not final                         |
| PRIVATE plugin archive intake available for local ZIP/tar.gz | **PROVEN**                  | No plugin creation/upload attempted                         |
| MAN-01..09 frozen rules, sequences, approval and recovery    | **PROVEN**                  | `procedure-v1`; exact owner values remain JIT               |
| General plugin permissions / custom MCP write entitlement    | **DEFERRED TO 10.1**        | Must stop there if not verifiable without write             |
| Final plugin install/combined skill and MCP                  | **DEFERRED TO 10.2**        | New verified `mcp.json`/version/hash                        |
| Owner-selected Page/content/plan payloads                    | **DEFERRED TO CARDS**       | New Page MAN-02; draft MAN-03; approval MAN-04; plan MAN-05 |
| Business write                                               | **DEFERRED TO MAN-02**      | No write in 10.0, 10.1 or 10.2                              |
| CR-028, tracker, Issue/PR and changed-document CI            | **PENDING CI on final SHA** | Record in Issue once run completes                          |

The previous sections below are **historical pre-CR-028 10.0 preflight snapshots**. Their BLOCKED verdict, package-install requirement, and owner-data-before-guide-freeze interpretation are explicitly superseded; do not use them as the current 10.0 acceptance checklist. Historic Phase 9 risk limitations remain open.

## Repo and contract baseline

- Repo `milyarderpro/content-producer`, `main` SHA at start: `ce87e15323a88abb82b1d9031ba8fef07dcf76b1` (2026-10-18), with `AGENTS.md`, Issue #22, `plans/works/phase-10-implementation-plan.md`, and accepted CR-027 on main.
- Work branch: `codex/phase-10-plugin`; one **draft** PR to `main`, not to be merged before Phase 10.7 independent audit.
- Phase 9 historical auditable release SHA `be3bf04b703a4aff16510c496600c9796c13b57a`; [full final-SHA gate SUCCESS](https://github.com/milyarderpro/content-producer/actions/runs/39085571345) and [independent audit 9.5 PASS](https://github.com/milyarderpro/content-producer/issues/20#issuecomment-6244579966). Phase 9 audit records 68 applied migrations, exactly 33 API/MCP tools, 15 RLS tables, and one owner-approved production Page `phase-9-5-pilot-trivia` with one config/ledger and no post/plan/fact/reservation/metric.
- Historical production frontend safe alias: `https://content-producer-auth-frontend.vercel.app/`, deployment `dpl_CWyhYgNn7zfxNGkWaHZhqZjhTQxo` READY on release SHA with `PHASE95_ENABLED=0` and `PHASE95_WRITE_ENABLED=0`; owner's direct disabled-callback 404 and audit correlation documented in #20. Backend URL on file: `https://xjonnilnypchtxogtopb.supabase.co/functions/v1/mcp`. **Do not interpret historical audit as a new live production inspection:** alias, backend, flags, database row count and tool list must be rechecked read-only before actual 10.1 or any write.
- Fresh **read-only** production Supabase control-plane check in 10.0: project `content-producer-production` / `xjonnilnypchtxogtopb` is `ACTIVE_HEALTHY`; Edge `mcp` v5 is `ACTIVE`. A corrected SELECT counts exactly **1 Page, 1 trivia config, 1 operation-ledger row, 0 posts, 0 plans, 0 facts, 0 metrics**. The first SELECT used a nonexistent `public.trivia_reservation_sets` relation and failed; the corrected read-only SELECT succeeded; reservation count was **not** rechecked. This is no confirmation of a ChatGPT custom-MCP connection.
- Fresh Vercel provider reads are **not verified**: deployment listing returned permission **403**, and a name-based alias lookup returned **404 not_found**; these are provider API lookup errors, **not** proof that the production callback returned HTTP 404. No rollout or env mutation was attempted. Retain the independent Phase 9 alias/flag audit as historical evidence only.
- Phase 8 is Deferred under CR-019, 101 cases remain regression inventory. **All 14 final MVP AC-001..AC-014 are PENDING**; Phase 10 not Pilot-ready, Phase 11 not MVP Complete.

## Account/host gate (no login/connection/write attempted)

| Required fact                                                  | Observed evidence                                                                                                                                                                                                                                                                                                                                             | Status            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Account plan and general private plugins                       | Current owner conversation is on ChatGPT **Plus**. Read-only personal plugin inventory includes multiple existing `USER / PRIVATE` packages, e.g. `viral-producer` v1.1.1. This establishes private plugin **ownership** on the personal host, not production Content Producer installation.                                                                  | PARTIAL           |
| Create private **custom MCP** connected to production endpoint | No owner-account Plugins → Add custom MCP server UI screenshot or completed capability inspection; no custom MCP created (by instruction). A GitHub connector is not equivalent.                                                                                                                                                                              | UNVERIFIED        |
| OAuth 2.1 host configuration                                   | Supabase OAuth was proven through Phase 9 owner test frontend, **not** a newly connected ChatGPT custom MCP. No host-auth configuration inspected, no redirect URI established.                                                                                                                                                                               | UNVERIFIED        |
| Host exposes and approves custom MCP **write** actions         | [Current official OpenAI help](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt) lists full MCP/write for Business and Enterprise/Edu; Plus is **not** listed as supported full-MCP tier. This is a plan/entitlement blocker, not proof of an actual denied write attempt. No write test performed, as required by 10.0. | **BLOCKED**       |
| Install a private plugin archive from GitHub Actions           | Available plugin creation capability accepts a local ZIP/tar.gz and creates a private plugin; owner's existing `USER / PRIVATE` plugin inventory corroborates general private packaging. **No Content Producer artifact fetched into local file, uploaded or installed**, so actual Actions-to-install path is **UNVERIFIED**.                                | PARTIAL / BLOCKED |

### 10.0 continuation — owner screenshot and evidence boundary (2026-10-18)

**Correction:** OpenAI's [custom MCP help](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt) lists Business and Enterprise/Edu as supported full custom MCP/write tiers; Plus is not listed. This is documentation about stated support, **not** proof that the owner's Plus account lacks a particular UI or that a write request was denied. The earlier table reflects the state before the owner supplied the screenshot and is superseded where indicated below.

The owner provided a screenshot of the **ChatGPT web Plugins / Add custom MCP server** dialog in this conversation on 2026-10-18. The read-only account tab separately displayed the **Plus** plan label. The screenshot establishes these **visible UI facts**, without connection or installation:

- **CONFIRMED UI:** The Add custom MCP server dialog opens on the owner's account. It shows Name, Description, Server URL / Tunnel options, an Authentication selector displaying OAuth, Advanced OAuth settings, the risk disclosure, an unchecked acknowledgment, Cancel, and a Create as a plugin button.
- **NOT PROVEN:** Working OAuth discovery or authorization; supported permission scopes; exposing, confirming, or executing a custom MCP **write** tool; plugin publish or installation; and final Content Producer artifact upload. Showing an OAuth field is not the same as completing OAuth. Showing Create as a plugin is not the same as successfully creating a private plugin. The screenshot contains no write-specific permission or enabled tool.
- **PRIVATE PACKAGE BOUNDARY:** Earlier read-only API results showed existing personal USER / PRIVATE plugin releases. These prove ownership of private plugins, not installation of the Phase 10 GitHub Actions ZIP or that this dialog accepts the ZIP. The final Content Producer package has not been produced.
- **REVISED HOST VERDICT:** Custom MCP form **AVAILABLE** on the actual Plus UI; custom MCP write **UNVERIFIED**, not explicitly denied. Therefore 10.0 remains **BLOCKED on affirmative write/host and artifact-transfer evidence**, not blocked because this menu is absent. Do not recommend a plan change based only on this ambiguity.

Safe next user action: use **Cancel** to exit without checking the risk acknowledgment, entering the production URL, saving a connection, logging in, uploading a plugin, or invoking write. In Plugins, the owner may inspect any existing **Plugin Creator / Upload plugin** route for private ZIP import, without selecting or uploading a file. If write is confirmed unavailable in future evidence, documented alternatives are appropriately authorized Business or Enterprise/Edu workspace hosts, subject to owner choice or a formally approved contract change; no purchase is presumed.

No secret or personal identifier from the screenshot has been added to the repository. No OAuth, plugin connection or installation, production mutation, deployment, or heavy test was performed.

The host help may evolve or account entitlement may be different in a separate workspace. The owner should provide **read-only evidence** of workspace identity/plan and available custom MCP/write controls before any connection. If the actual host cannot support write, the decision is owner-select an authorized supported host/workspace or approve a formal contract change; do not silently change PRD or substitute SQL/admin/API writes. No assumption that a purchase is required or already authorized.

## Artifact-transfer chain and access boundary

1. On PR/branch HEAD, workflow `.github/workflows/phase-10-light-ci.yml` uses pinned Node/pnpm, frozen lockfile install, changed-file Prettier/diff, and `pnpm run check` **only when TypeScript/config changed**. It never starts local Supabase, runs `test-all`, deploys or loads credentials.
2. The workflow validates the existing Phase 7 source with `pnpm run package-plugin` and `scripts/verify-plugin-candidate.ts`. It ZIPs **exactly 12 allowlisted source files**, checks archive entry count, integrity, and absence of `mcp.json`/connection mapping, computes the ZIP SHA-256, and uploads artifact `phase-10-preflight-candidate` (ZIP plus per-file SHA-256 list; retention 14 days). Archive build SHA and digest must be taken from the actual run, never guessed.
3. An account with GitHub Actions **read access** to this repo can open the exact run → Artifacts → download `phase-10-preflight-candidate` and extract the inner `phase-10-preflight-candidate.zip`. Compare SHA-256 from run summary, inspect ZIP entries and hash list, and ensure no credentials, backend state or unexpected files. A browser download alone is **not** evidence of successful host installation.
4. Private plugin upload/creation capability can accept a local archive, but **upload/install is forbidden at 10.0**, and the Phase 7 candidate is **not the final Content Producer plugin**: version `0.1.0`, `plugin/mcp.json` absent by design, final host OAuth/package shape not determined until 10.1/10.2. No package should be called final or end-to-end installed from this workflow.
5. To close the transfer/install part of the gate, an authorized host/operator must show a private plugin install path that accepts a GitHub Actions archive, and later verify that the installed **exact file bytes, SHA-256 and version** match the archive. Do not use a plugin Creator API call at 10.0, and do not publish to a public directory.

## Manual cards and owner-decision boundary

- Draft guide `docs/phase-10/manual-cards.md` contains nine mandatory `MAN-01..MAN-09`, two optional post-MVP cards, prompts, scope, expected/forbidden calls, state checks, approvals and recovery.
- `docs/phase-10/manual-results.md` defines redacted evidence format: precise prompt, chat reference, tool sequence, source SHA and installed archive hash, Page/post/plan public IDs, before/after safe state and ledger, reviewer and verdict.
- **NOT FROZEN**: prompts containing `<OWNER-...>` are deliberately non-executable until owner chooses exact Page/config, supported topic/content limits and plan slots, and confirms later editorial review boundaries. Existing Phase 9 pilot Page is not the new Page. No candidate was silently selected by the agent.
- No MAN card executed. `MAN-10..11` remain `DEFERRED — POST-MVP` under CR-027.

## Open decision and residual risk

**Owner decision required:** (a) supported write-capable host/workspace path (or approved change record) and read-only UI evidence of permission, (b) new Page name/slug, timezone, target country codes, trivia config and allowed pilot content/plan scope. Both before freezing prompts or using business write.

Carry forward unclosed Phase 9 risks: two active OAuth test clients, reviewed 33 SECURITY DEFINER RPC advisor WARN, leaked-password protection WARN, incomplete full-platform restore/off-host custody and post-2026-10-18 Page restore coverage. These are residual risks, **not closed by this document**. Never reactivate the temporary 9.5 callback.

## Evidence checklist for checkpoint closure

- [x] Main/runbook/CR-027 and audit history reviewed; branch created.
- [x] Private personal plugin inventory observed (read-only).
- [x] Owner-account Add custom MCP server dialog and OAuth option observed from owner-supplied screenshot; no connection was created.
- [ ] Custom MCP private creation, hosted OAuth and **write** entitlement proved for selected host/workspace.
- [x] GitHub Actions candidate built and downloaded: 12/12 allowlisted files/hash verification, artifact ID `12123959250`, prior exact-SHA PR CI SUCCESS.
- [ ] Final Content Producer archive successfully installed as private plugin from the Actions path and its deployed identity verified (not authorized in 10.0).
- [ ] Additional production Page/config and permitted content/plan decisions approved by owner.
- [ ] Exact write-capable manual prompts frozen without owner markers.
- [x] Light CI on original 10.0 PR HEAD completed and evaluated; a subsequent documentation-only update requires its own focused check.

**Decision at time of authoring: BLOCKED; no PASS claim.** CI state and HEAD/PR reference are recorded separately in Issue #22 after the GitHub Actions run has been identified.
