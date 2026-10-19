# CR-037 — Phase 10.3 MAN-02 exact-payload, default-closed write exception

- Date: 2026-10-19
- Scope: `codex/phase-10-plugin`, draft PR #23, MAN-01/MAN-02 only.
- Status: Implementation preparation; **no production write approved or enabled**.

## Evidence and threat boundary

Phase 10.2 has passed with PRIVATE Content Producer v0.2.1 and the existing registered `mcpku` mapping. The production MCP uses the CR-032 fixed workspace over a publicly callable **No authentication** endpoint. Neither PRIVATE installation nor an owner message authenticates an HTTP caller. MAN-01 must establish the real account, active workspace and existing Phase 9.5 Page by three plugin reads before any Page proposal.

The default `PILOT_WRITE_LOCKED` must remain unchanged without a separate exact MAN-02 grant. Never globally enable all writes, trust client-provided owner identity, add direct `anon` grants, bypass RLS, write through admin/service-role SQL, or create a test Page in production.

## Narrow implementation

Permit only an existing `create_page` MCP RPC with:

1. The same fixed owner/workspace context, validated strict tool input and exactly the eleven expected named RPC arguments;
2. A server-side, default-absent `MCP_MAN02_APPROVED_SHA256` environment value matching SHA-256 over a documented deterministic, recursively key-sorted JSON serialization of **all** named RPC arguments (including operation key, complete trivia config and make-default setting);
3. An explicit owner approval of the full exact JSON and stable random UUIDv4 operation key, recorded before the grant is installed.

The hash is a **payload allowlist, not authentication**. A third party who obtains the exact approved payload could attempt that same write against the public URL. The database operation ledger provides idempotent replay under the unchanged key/payload, not caller authentication. Any other payload, key, RPC tool or absent/malformed grant is rejected before database access. The grant is never stored in the public plugin ZIP or source; it must remain absent until approval and the one full CR-020 gate passes on the changed backend SHA. Installation/removal of the grant is a production configuration change requiring explicit observation and a post-write revocation check. Do not call the permitted write until that configuration can be proven active and safely reversible.

After one authorized `create_page` call, read owner-visible Pages and the new Page's config, reconcile the existing operation ledger without introducing an admin write, and revoke the grant immediately. If the response is lost, inspect Page/ledger first and replay **the same exact key and payload** only when necessary, while the same grant is active. Do not issue a new key or different Page. If the grant cannot be safely applied/revoked through an authorized control plane, hold MAN-02 PENDING, not PASS.

## Test and gate discipline

- Focused unit tests: default closed, wrong tool, wrong workspace, altered field/config or operation key, exact match, key order stability, malformed digest.
- Isolated local database test: three Pages in one owner workspace with independent enabled trivia configs, fixed/adaptive fact counts, varied fact reuse scopes, three ledger entries and same-key replay with no fourth Page. **No production third Page.**
- Source/backend changes require focused MCP and project check plus **one** full CR-020 gate at final deployed SHA, then an independently verified deployment before opening any grant. Long-running Actions: record PENDING and do not start replacement runs.
- MAN-01 evidence can PASS independently; MAN-02 and checkpoint 10.3 stay PENDING until actual owner payload approval, gated production write, read-back and closure.
- CR-027/028/032/036 and the nine `procedure-v1` cards remain in force. Stop before 10.4.
