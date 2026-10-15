# Phase 9.2 — deployment preparation and recovery runbook

Status: **source/operator preparation only; NOT DEPLOYED**. No cloud resources are created or configured by these steps during 9.2. Read AGENTS.md, Issue #8, the Phase 9 implementation runbook and CR-020 first. This runbook is executed only in 9.4 after gate 9.3 PASS on an exact merged main SHA and a new explicit owner approval. The production Supabase project is **new/dedicated and does not exist yet**; do not use the excluded project **triviaku**. Vercel must use the owner's **personal account**.

## 1. Freeze, audit and stop conditions

1. Review and merge PR #9 during 9.3, not 9.2. Record the resulting exact 40-character main SHA in Issue #8 and the candidate_sha input.
2. On GitHub Actions, open "Phase 9.3 - frozen main technical gate" on **main**, choose Run workflow, and enter **that same SHA**. The workflow has no push or PR trigger, enforces main/ref/SHA equality, and uses only a GitHub-hosted ephemeral local Supabase stack. Review logs and the redacted artifact. Do not invoke it during 9.2. Any changed release SHA requires a new gate on that SHA.
3. The gate does exactly one explicit local clean reset, then test-all (including database and frontend), source/applied migration verification, local db lint, catalog/ACL/RLS audit, authenticated non-owner denial and Inspector 33 positive/negative calls. There is deliberately **no smoke-test duplicate**. A failure or pending run means STOP; 9.4 is prohibited.
4. Supabase **hosted Security Advisor is not a local CLI check**. Local db lint and catalog audit are separate evidence at 9.3; run hosted Security Advisor after the production target exists in 9.4/9.5 and record findings. Do not mark advisor hosted PASS from local results.
5. Project ref, organization, region, initial hosted data, migration history, hosted backup, Vercel project/domain and Supabase Auth configuration are **N/A until 9.4 (not PASS)**. No pre-emptive Supabase link, dashboard project creation, OAuth setup, Vercel import or secret entry. Stop if project identity is uncertain or does not match the newly approved ref, data/history is unexpected, migrations differ, any critical/high security finding exists, backup is unverified where required, or the source SHA differs from the 9.3 evidence.

## 2. Operator preflight on the frozen SHA (9.4 only)

The owner chooses and creates a **new dedicated production project** after the technical gate, then provides the non-secret project ref via the approved operational record. Verify account/organization, region, project ref and state from its dashboard. Operator uses a fresh checkout at the exact passed SHA, a clean working tree, pnpm 10.33.2, Node from .nvmrc, and Supabase CLI **2.120.0** from the locked root install. Do not change checked-in migrations. Never paste credentials into chat, Issue, PR, shell history, unredacted logs or CI.

    git checkout --detach <PASSING_MAIN_SHA>
    pnpm install --frozen-lockfile
    pnpm exec supabase --version
    pnpm exec supabase link --help
    pnpm exec supabase migration list --help
    pnpm exec supabase db push --help
    pnpm exec supabase db lint --help
    pnpm exec supabase db dump --help
    pnpm exec supabase functions deploy --help

Run the link **only after** matching the approved dedicated project ref and successful 9.3. Prefer the CLI's interactive authenticated login/password prompt (owner controls login) without putting a database password or access token in command arguments. The explicit link command, if needed, is:

    pnpm exec supabase link --project-ref <APPROVED_NEW_PROJECT_REF>

Check the linked target in the CLI and dashboard; do not infer it from a local directory or project name. Confirm a single operator/process is responsible for migration apply.

## 3. Source migration replay and drift gate (9.4 only)

1. Reconfirm fresh project state: list schemas/tables and row counts; inspect current migration history. A project described as new **is not proof of empty**. If existing application data/history or foreign migrations are detected, STOP and investigate. Do not adopt/repair migrations or overwrite production to force a green comparison.
2. Keep a redacted inventory of the 67 immutable SQL migration files under supabase/migrations and ordered timestamp identifiers. No SQL Editor patch, no manual execution of migration contents, no remote db reset, no migration repair without a separately reviewed change record.
3. For a linked project whose identity has been verified, inspect the history and CLI dry-run:

        pnpm exec supabase migration list --linked
        pnpm exec supabase db push --linked --dry-run

   Compare the dry-run pending versions and order against the repository files. For a truly fresh target expect no previously applied application migration versions. Any unexpected remote version, reorder, missing source file or difference is a hard stop. Save **redacted** counts/version IDs, not connection strings.
4. Only with matching target, confirmed backup decision and owner authorization, apply the **repository migration source in order**:

        pnpm exec supabase db push --linked

   Then repeat migration list. Cross-check source/applied count and identifiers and inspect schema api, 33 RPC signatures, 15 RLS tables/policies, grants, default privileges, owner workspace isolation and forbidden anonymous permissions using reviewed SELECT-only catalog queries. The local audit in scripts/phase-6-catalog-audit.ts is evidence for the frozen source; run equivalent read-only catalog inspection against hosted SQL through the owner's authorized safe interface, without assuming local scripts select the hosted database.
5. Run the hosted Security Advisor via Supabase Dashboard (or approved read-only advisor tool) and review findings with the owner. Resolve critical/high findings before continuing; do not downgrade warnings silently. Schema/history and advisor findings are saved as redacted evidence. Seed local test fixtures are NOT production data and must never be pushed.

## 4. Backup and restore decision (9.4 only)

Before any write to a target with existing data, confirm a recoverable backup: record the provider backup/PITR capability actually enabled, last available recovery point, encrypted/off-repository export, verified file size/checksum and a restore procedure validated in an **isolated** environment where feasible. Supabase CLI supports separate role, schema and data exports; retrieve connection information using the provider's secure UI and CLI help, without embedding credentials in files or terminal arguments. Export destinations must be outside the repository and inaccessible to CI. For a verified empty project, record the evidence and establish a backup after initialization; empty is not assumed from N/A.

Database migration rollback is **not** an automatic reverse migration. If partial apply/drift occurs, stop all writes, preserve audit logs, assess source/history differences, and prefer a reviewed forward-fix migration. Restore from a verified provider PITR/backup or encrypted logical export **only** with owner authorization, a recovery-point/data-loss assessment and an independently verified target; do not run remote db reset. Before restoring, document Auth users, Storage objects, extensions, Edge Functions, secrets, migration history and other items not necessarily covered by a single SQL dump.

Record restore owner, incident, checkpoint, backup time, expected recovery point and verification checks. Never call a failed deployment successfully rolled back until authenticated read-only validation confirms it.

## 5. Edge Function from the same candidate (9.4 only)

Deploy source at supabase/functions/mcp/ using the same frozen SHA, with shared imports from supabase/functions/_shared and pinned dependencies in supabase/functions/deno.json. Verify the CLI help at the pinned version and ensure the target ref is explicit:

    pnpm exec supabase functions deploy mcp --project-ref <APPROVED_NEW_PROJECT_REF> --no-verify-jwt

supabase/config.toml contains [functions.mcp] verify_jwt = false: this permits anonymous discovery/challenge to reach application middleware, **not** anonymous tools/call. The middleware must still verify JWT signature/JWKS, issuer, audience **equal to MCP resource URL**, OAuth client_id, openid/email scopes, owner identity and active workspace, and reject missing, malformed, wrong-resource, wrong-client or non-owner credentials. Configure MCP_RESOURCE_URL, MCP_ISSUER_URL, MCP_OWNER_USER_ID and required public Supabase values as documented in the MCP source, using only the provider's secure secret management. Never add a service-role key unless a reviewed source dependency explicitly requires it. Check /health and OAuth metadata, initialize/list of exactly 33 tools, 401 anonymous and 403 authenticated non-owner; preserve redacted request IDs, function version, URL and source SHA. OAuth/PKCE hosted acceptance remains 9.5.

For an incident, switch back to a verified earlier Edge Function version if one exists and is compatible with the current schema, or disable external access pending a reviewed forward-fix. First deployment has no prior function version; **do not claim a revert exists**. Backend schema changes may not be backward-compatible with earlier function versions.

## 6. Vercel personal account — exact UI walkthrough (9.4 only)

1. After gate 9.3 PASS and owner consent, the owner signs in to their **personal Vercel account** and selects Add New > Project. Connect GitHub only through Vercel's own authorization prompt.
2. Import repository **milyarderpro/content-producer**. Choose Root Directory **auth-frontend/**, not repository root. Confirm framework preset **Other**, Production Branch **main**, and the frozen source commit that matches the approved release. Import/Deploy can trigger production builds automatically: **do not click through before 9.4**.
3. Under Build and Output Settings, choose Build Command **pnpm run build** and Output Directory **dist** (relative to auth-frontend/). Use package manager pnpm 10.33.2 as recorded by auth-frontend/package.json; Install Command, if overriding autodetection, **pnpm install --frozen-lockfile**. Do not select repo-root pnpm scripts for this standalone frontend.
4. Add only **Production** browser-safe variables: VITE_SUPABASE_URL = approved Supabase HTTPS origin and VITE_SUPABASE_PUBLISHABLE_KEY = its publishable key (sb_publishable_ prefix). These values are embedded by auth-frontend/scripts/build.mjs into static dist/config.js. Never set VITE_ variables to a service-role key, OAuth client secret, database password or other secret. Do not put any actual value in Issue/PR/chat.
5. Confirm the auth-frontend/vercel.json rewrites to /login, /oauth/consent, /logout and /error. Deploy, record the immutable deployment and stable HTTPS production domain, and test direct open/refresh of all four routes. Rebuild/redeploy if public build configuration changes. Confirm Vercel's git-triggered auto-deployment cannot unexpectedly advance the frozen backend release; stop and pin/review any unwanted new commit.
6. On failure, select a previously verified Vercel deployment for rollback if one exists; on the first deployment, disable the broken exposure and repair before retrying. Record old/new deployment identifiers and test each route again.

## 7. Supabase Auth / OAuth / owner setup (9.4 only)

1. With deployed Vercel stable HTTPS origin, set Authentication > URL Configuration > **Site URL** to that origin (no path), and exact allowlisted redirect URLs only as needed.
2. Enable Supabase Authentication > OAuth Server (OAuth 2.1) and set authorization path to **/oauth/consent**. Use asymmetric JWT signing keys (RS256/ES256) for JWKS/OIDC openid support; verify issuer JWKS endpoint and that the MCP issuer/resource settings match the deployed URLs exactly.
3. Configure private, owner-controlled login and **disable public signups**. Owner handles account creation/login and MFA if enabled through secure provider UI; provision the owner workspace via the reviewed application/SQL path only after identity is confirmed. Do not seed fixture users/data.
4. Confirm ChatGPT client registration policy (pre-registered OAuth app or approved dynamic client registration where supported). Use legitimate exact callback/redirect URIs and PKCE, required openid email scopes, client_id and resource audience. Do not guess callback URLs or use wildcard redirect bypasses. OAuth confidential-client secrets, if applicable, are entered only through provider secure surfaces. Confirm that token exchange returns valid 2xx and the correct audience/client claims; redact tokens from evidence.
5. Walk approve **and** deny on /oauth/consent with authorization_id, including a login redirect that preserves the ID. Verify /logout and error states, invalid/expired requests and browser refresh. Failure to receive a valid resource-audience JWT or any non-owner access is a hard stop. The end-to-end OAuth/PKCE acceptance and hosted security evidence are reserved for 9.5.

## 8. Redacted gate/deployment evidence template

| Evidence item | Actual record | Status |
| --- | --- | --- |
| GitHub main frozen SHA / technical run / artifact | Pending 9.3 | N/A |
| Pinned CLI and local clean reset / test-all | Pending 9.3 | N/A |
| Local migration + 33 RPC catalog + RLS/grants + non-owner/Inspector | Pending 9.3 | N/A |
| Hosted project ref, organization, region, data/history | Project not created | N/A |
| Owner backup/recovery verification | No target yet | N/A |
| Hosted Security Advisor / RLS / migration comparison | No target yet | N/A |
| Function source SHA, version, resource URL, /health | Not deployed | N/A |
| Vercel personal project, immutable deploy ID, HTTPS domain, route refresh | Not provisioned | N/A |
| OAuth Site URL, authorization path, PKCE, owner/deny, no-token exposure | Not configured | N/A |
| Rollback decision / operator / verification | Not required at 9.2 | N/A |

Sources (re-check at execution): Supabase CLI reference https://supabase.com/docs/reference/cli/supabase-db-push ; OAuth 2.1 https://supabase.com/docs/guides/auth/oauth-server/getting-started ; CLI dump/restore https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore ; Vercel build/root https://vercel.com/docs/builds/configure-a-build . No actual project references, tokens or dashboard settings are recorded in this runbook.
