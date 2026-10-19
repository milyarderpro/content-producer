# CR-038 — Phase 10.4 default-closed MAN-03/04 scoped production grants

- Date: 2026-10-19
- Scope: existing `codex/phase-10-plugin` / draft PR #23, checkpoint 10.4 only.
- Owner selection: Moon phases, `nature_science`, `single_subject_fast`, `fast_trivia`, preferred **seven distinct verified facts**, interaction goal `follow`; **do not force seven** if the per-fact source and dedup rules cannot support seven.
- Status: preparation; neither ChatGPT draft generation nor production business write has been authorized/executed by this repository work. The owner will send the compiled MAN-03 prompt using installed PRIVATE Content Producer v0.2.1.

## Decision and risk boundary

Existing CR-032/037 production MCP is **publicly callable with No authentication** and binds one workspace server-side; the PRIVATE plugin is not HTTP authentication. All business writes remain server-blocked without a separate temporary grant. Unlike MAN-02's known exact create_page arguments, MAN-03 reservation and save arguments include newly researched facts, server-generated fact identifiers and post copy; whole-request SHA-256 approval before a single ChatGPT workflow turn is not feasible.

Retain CR-037's full exact-payload digest for `create_page`, but introduce a **separate fail-closed, time-limited, operation-key capability** for each Phase 10.4 step. A high-entropy, private UUIDv4 operation key and reservation token are bound by SHA-256 digests in **Edge-only** configuration. Never commit or post the raw keys or temporary grant values to a public Issue/PR/log. This is a limited _bearer capability_, **not proof of caller identity**. Someone who obtains the operation key may race/attempt that one allowed action while the grant remains active. Avoid leaving enabled grants unattended; revoke promptly and audit at 10.7.

## Stage controls

- MAN-03 reserve: `MCP_MAN03_RESERVE_GRANT_JSON` contains `expires_at`, `operation_key_sha256`, `reservation_token_sha256`. Only `trivia_register_and_reserve_facts`, workspace `cad2885e-952e-41b3-9eae-d2d9d75d533d`, Page `37457236-17ec-4486-8880-6832460ae411`, unmodified trivia config timestamp, `workspace_unique` and 30-minute reservation. Minimum 5 / maximum 8 ordered distinct Moon candidate keys, `nature_science`, risk standard, stable claims, NASA A/B source URLs. All other tools/Pages deny.
- MAN-03 save: `MCP_MAN03_SAVE_GRANT_JSON` contains the same three grant fields with a **different operation key** and the **same reservation token**. Only `save_post` for that Page/trivia topic, format/profile, goal, en-US and unchanged config, matching allocation count 5–8; `scheduled_at=null`, `plan_item=null`. Server still enforces sources/dedup/reservation, authoritative renderer, and quality. A save can only create `draft`, never `ready`.
- MAN-04 revise: `MCP_MAN04_REVISE_GRANT_JSON` is **never configured before a real post exists**. It must additionally pin `post_public_id`, `expected_revision`, `expected_content_hash`, and owner's chosen `approved_hook`. Only `revise_post` CAS is admitted; revision leaves post as draft.
- MAN-04 approve: `MCP_MAN04_APPROVE_GRANT_JSON` is **not configured until owner separately approves the exact final text, sources, system/editorial checks, revision and hash**. Pin post public ID, revision and content hash, and `approved_rpc_sha256` over the complete canonical named RPC arguments. `explicit_approval=true`; warning waivers are not permitted for this pilot. Only `approve_post` may change status to `ready`. Never `posted`.
- Each grant is absent by default and expires within **at most two hours** after evaluation; malformed, unknown, long-lived or expired grants fail closed. Activating a grant is a **separate owner-controlled Supabase Edge secret/config action**. The repository deploy alone supplies no grant. Revoke the MAN-03 grant values immediately after successful save (or abandonment), and any later MAN-04 grants immediately after their step; require owner acknowledgement and explicitly note any lack of independent secret inventory read.

## Data and verification

Source-only research and read-only Page context cannot authorize writes. Before owner sends MAN-03, freeze exact private compiled prompt, target Page, topic, scope, reserved operation keys and source rules; avoid recording capability values in public GitHub. If owner has not explicitly enabled the two temporary MAN-03 grants, **tell them not to submit the prompt**—the server will reject the write.

Order: owner plugin -> `get_page_generation_context` -> independent public research -> `trivia_find_similar_facts` -> `trivia_register_and_reserve_facts` -> `save_post` -> `get_post`. Exclude uncertain/stale/unsupported facts rather than force seven. If below 5 distinct eligible facts, stop before reservation/save. Do not call `approve_post`, `mark_post_posted`, plan tools or Facebook APIs.

MAN-04 follows only after actual draft readback. Ask the owner to supply an exact revised hook, run `get_post` -> CAS `revise_post` -> `get_post`; show current copy, sources, quality, revision and hash and request **new** explicit owner editorial approval. A blocking server quality test must reject readiness deterministically without creating intentionally bad production content.

Backend/security changes require focused Deno+project checks and **one CR-020 full technical/security gate at the final candidate SHA before any production deployment**. Once deployed, verify same MCP with 33 tools, no secret in artifact, default-closed write denial and Page unchanged. The unchanged Content Producer v0.2.1 archive needs no reinstall. If CI is slow, record exact run/SHA as PENDING; on `lanjutkan` inspect that same run instead of triggering another.

## Evidence boundaries

- The temporary grants cannot provide true caller authentication. Document the residual public No-auth read/race risk.
- Existing 10.3 residuals: owner-confirmed but independently unlisted secret revocation, and unread production operation ledger after create_page; defer direct independent cross-checks to 10.7.
- No merge, no plan, no Page creation, no publication, no fabricated source/metrics. 10.4 PASS only after both manual cards and explicit owner review of exact revision/hash; pending work cannot be described as passed.
