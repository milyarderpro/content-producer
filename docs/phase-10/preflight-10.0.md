# Phase 10.0 — host/write and artifact-transfer preflight (2026-10-18)

**Disposition: BLOCKED — preparation begun, checkpoint NOT PASS.** No OAuth, new custom-MCP connection, private plugin installation, business write, production change, backend deploy or heavyweight CI was performed in this task. This report is a snapshot of actual evidence and expressly does **not** green-light 10.1.

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

### 10.0 continuation — separate documentation, UI, and unverified capability (2026-10-18)

**Interpretation correction:** the official OpenAI [custom MCP connection guidance](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt) currently lists ChatGPT Business and Enterprise/Edu for full custom MCP support, including write/modify actions. Plus is not a documented full-write tier. **This is NOT evidence that a particular Plus account was presented with a disabled/absent menu, and it is NOT an observed feature-denial response.** The earlier table's "plan/entitlement blocker" means lack of affirmative host capability evidence, not a confirmed account-specific denial. Do not treat a provider's account matrix as a screenshot of the owner's UI.

Evidence by provenance:

- **Documentation — supported policy, not account state:** the current official guide describes `Plugins → + → Add custom MCP server`, with no Developer Mode toggle required for the latest Plugins flow, and an authentication form. The guide names Business workspace admins/owners and Enterprise/Edu authorized members with RBAC for creation; write/modify actions are subject to app permission/risk confirmations. The [plugin testing guide](https://developers.openai.com/plugins/deploy/connect-chatgpt) describes the connection and private package evaluation flows. All steps remain unexecuted.
- **Observed account UI — limited read-only:** the connected ChatGPT web tab exposes a **Plugins** sidebar button and a visible **Plus** plan label. The menu opened by the Plugins **+** button has **NOT been observed**, so the presence or absence of `Add custom MCP server` is **UNKNOWN**, not "absent". No screenshot of the MCP form, OAuth option, write-related permission, or private archive upload dialog has been supplied.
- **Observed owner-specific capability — positive but narrower:** read-only private plugin inventory returns existing personal `USER / PRIVATE` releases, including `viral-producer` version `1.1.1`. This proves private plugin ownership and retrieval on this account, not that an MCP-capable Content Producer package can be installed or execute write actions. A Plugin Creator archive-upload operation exists, but **was not invoked**.
- **Unverified / blocking:** account-specific `Add custom MCP server` availability, OAuth setup for custom MCP, tool-write approval, and complete Actions artifact → *installed MCP plugin* identity remain unproven. **Maintain checkpoint 10.0 BLOCKED, evidence pending**, rather than declaring a Plus-specific feature denial. If a UI control is actually missing or disabled, record the exact menu labels, workspace/role, and redacted screenshot or displayed error before concluding that it is unavailable.

Read-only owner UI inspection protocol (STOP before creating any resource):

1. In ChatGPT **web**, select the current personal/workspace scope and **Plugins** from the sidebar. Record the scope/plan and visible UI, omitting personal identifiers.
2. Open the Plugins **+** menu only; record whether **Add custom MCP server** appears, is disabled with a reason, or is absent. If available, open its form **without entering the production endpoint, authenticating, accepting risk, or clicking Create**. Record only visible OAuth/connection/write-related controls and exit without saving.
3. Return to Plugins and inspect **Plugin Creator / Upload plugin / Upload new or existing plugin** availability and whether private ZIP-based creation is offered. **Do not select, upload, install or publish** any package.
4. Correlate a redacted screenshot/owner report to account scope and this date. Presence of a form is **not** a completed OAuth handshake, scanned 33-tool list, authorized write, or installed final plugin. A GitHub Actions ZIP download is not final installation proof.
5. If actual owner UI denies full write, present supported Business admin/owner or Enterprise/Edu admin/authorized-developer workspace access (with applicable permission) as **possible host routes**, not an instruction to purchase or a silently approved contract change. Any other host must be independently proven against the frozen contract; otherwise a formal owner-approved change record is needed.

The prior [PR CI run #39095321646](https://github.com/milyarderpro/content-producer/actions/runs/39095321646) on `7fe9317c9b079f5f515341e22279179745d01b7b` succeeded; the separate originally pending push run `#39095318478` subsequently also completed successfully. No replacement or heavy test is needed for either prior run. Any later docs-only commit gets its own *light* PR check, not a Phase 9 gate.

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
- [ ] Custom MCP private creation, hosted OAuth and **write** entitlement proved for selected host/workspace.
- [x] GitHub Actions candidate built and downloaded: 12/12 allowlisted files/hash verification, artifact ID `12123959250`, prior exact-SHA PR CI SUCCESS.
- [ ] Final Content Producer archive successfully installed as private plugin from the Actions path and its deployed identity verified (not authorized in 10.0).
- [ ] Additional production Page/config and permitted content/plan decisions approved by owner.
- [ ] Exact write-capable manual prompts frozen without owner markers.
- [x] Light CI on original 10.0 PR HEAD completed and evaluated; a subsequent documentation-only update requires its own focused check.

**Decision at time of authoring: BLOCKED; no PASS claim.** CI state and HEAD/PR reference are recorded separately in Issue #22 after the GitHub Actions run has been identified.
