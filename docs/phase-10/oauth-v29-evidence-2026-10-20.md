# Phase 10.1 OAuth owner re-verification — 2026-10-20 (CR-042/043/044)

This is a **read-only OAuth re-verification record**, not a new manual card, write grant, production data mutation, or completion of MAN-03/04. Historical checkpoint 10.1/10.3 signoffs stay historical.

## Immutable backend and CI evidence

- Repository: `milyarderpro/content-producer`; branch `codex/phase-10-plugin`; draft PR #23; Issue #22.
- **Backend source/deployed SHA:** `6a8c42d8a3ffb846b8bd92663dbfbdbc9cc22e92`.
- Single applicable exact-SHA CR-020 gate: [GitHub Actions run #39372282908](https://github.com/milyarderpro/content-producer/actions/runs/39372282908), attempt 1, **completed/success** on 2026-10-20T05:13:52Z. The only job passed: one local reset; focused OAuth/owner; Inspector 33 valid + 33 invalid, non-owner denial; `test-all`; migration history; local lint; catalog/RLS/privilege and post-run checks.
- Pre-deploy production `mcp` Edge **v28 ACTIVE**, bundle SHA256 `b0846dbf6eaae39d46498b6066b8888121c5948f98d353d6707c208415246225`, source release `b098460f9c8012fabff69c1c369a5130853f7f86`.
- Comparing `b098460f9c8012fabff69c1c369a5130853f7f86...6a8c42d8a3ffb846b8bd92663dbfbdbc9cc22e92` yielded one changed deployed runtime file: `supabase/functions/mcp/http.ts`. Other changes were tests, CI, documentation, and harness.
- Deployed **once** to existing Supabase project `xjonnilnypchtxogtopb` / function `mcp`, with all 23 source files, preserving the existing `functions/deno.json` import map, entrypoint, runtime dependencies and `verify_jwt=false` (the function enforces application OAuth). The changed `http.ts` was read from the exact gate SHA; the 22 unchanged deployment files were retained from active v28. Deployment reports **v29 ACTIVE**, bundle SHA256 `949133771e0d4b9a2657ca7d9cd4148fcda20f24e115bc28a9da96727048e692`. Independent `get_edge_function` readback confirmed 23 files and byte-for-byte equality of deployed `http.ts` to the immutable GitHub SHA file.

## Actual existing PRIVATE OAuth ChatGPT connection (`mcpku2`)

- No user re-login was requested. The existing connection exposes **exactly 33 tools** including `create_page`; 11 are read and 22 write tools, all enumerated through actual connector registration. The previously owner-selected “Allow read-only tools” approval policy remains the recorded host setting. This run did not open the approval dialog or execute any write tool, so a newly observed approval prompt is **not** claimed.
- `get_account_profile({})`: **PASS**, nonblank owner profile; no sensitive profile ID persisted in this report.
- `get_workspace_context({})`: **PASS**, structured response version 1 contains authenticated owner workspace and active trivia module. This specifically closes the prior observable `OWNER_ACCESS_REQUIRED` failure.
- `list_pages({request_schema_version:1,workspace_public_id:<owner-resolved>,limit:10})`: **PASS**, returned exactly two active Pages (the existing `corious-facts` and the existing Phase 9.5 pilot), `has_more=false`. No Page, post, plan, fact, metric, reservation, or ledger write tool was invoked.
- Same-attempt hosted Supabase logs include authenticated `POST /functions/v1/mcp` HTTP 200 and the underlying `get_workspace_context` / `list_pages` RPC calls HTTP 200 at 2026-10-20 05:32 UTC. These logs corroborate the **tool payload successes**, not merely the status codes. An OAuth token endpoint event was observed in the log, but no bearer token, code, cookie, or secret was inspected or recorded.

## Independent active v29 anonymous HTTP probe — PASS

- The conversation's direct external web fetch was inaccessible, so **one focused public-only GitHub Actions probe** was created to collect fresh v29 evidence without bearer tokens, credentials, or business `tools/call`. This changes only workflow/docs, not the gate-tested backend source.
- The first [probe #39375963123](https://github.com/milyarderpro/content-producer/actions/runs/39375963123) and diagnostic [probe #39376145135](https://github.com/milyarderpro/content-producer/actions/runs/39376145135) failed a **test-only assumption** requiring the `WWW-Authenticate` challenge to advertise the nested metadata URL. Exact same-attempt Supabase logs reported nested metadata **GET 200** and unauthenticated **POST 401**. Diagnostic job logs also showed a WWW-Authenticate field and JSON `_meta["mcp/www_authenticate"]` with a bearer metadata hint. The backend correctly advertises an already supported legacy metadata alias `/oauth-protected-resource`, rather than the test's guessed nested path. No server change was made.
- Corrected focused workflow [probe #39376237298](https://github.com/milyarderpro/content-producer/actions/runs/39376237298) on test/docs SHA `7e64174d50e5ce438bbb89f55eded6d0750f44d4` **completed/success**. Public GET `/functions/v1/mcp/.well-known/oauth-protected-resource` returned **200** and asserted correct canonical resource, issuer authorization server, and bearer-header support. Bare unauthenticated POST without Content-Type to `/functions/v1/mcp` returned **401 rather than 415**, with `WWW-Authenticate: Bearer` advertising the supported metadata alias and structured JSON `_meta["mcp/www_authenticate"]` challenge. Response body/header values were not copied into this report; no credentials or business calls were used.
- **Live nested GET, bare POST auth challenge, gate, deployment readback, 33-tool catalog, and three actual connected owner reads: PASS.** Do not confuse the passing hosted public probe with business write execution, a grant, or MAN-03/04 approval.

## Boundaries and SHA separation

- Backend/deployed source SHA: `6a8c42d8a3ffb846b8bd92663dbfbdbc9cc22e92`; doc/package-only HEAD SHA: **the commit adding this file**, to be linked in Issue #22 and PR #23 separately. No plugin package was rebuilt or reinstalled; existing PRIVATE `Content Producer` v0.2.1 package remains distinct from the custom `mcpku2` OAuth connection.
- No production business write, write grant activation, MAN-03/04, new OAuth connection, new full gate, database migration, RLS change, or PR merge. Historical 10.3 secret-removal attestation and independent ledger-read limitations remain open for audit 10.7.
