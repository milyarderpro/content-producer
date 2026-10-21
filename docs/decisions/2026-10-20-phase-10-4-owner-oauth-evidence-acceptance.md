# CR-048 — Accept combined owner OAuth evidence for Phase 10.4

- Date: 2026-10-20
- Status: Accepted by the owner
- Scope: Phase 10 checkpoint 10.4, MAN-03 and MAN-04 only
- Authority: The owner explicitly directed closure after reviewing the persisted draft, revised copy, and ready-state result. The owner accepts that successful owner OAuth calls in Codex are sufficient for this checkpoint and does not require repeating the writes in ChatGPT.

## Decision

Count the existing MAN-03/04 production evidence as checkpoint 10.4 PASS. MAN-03 used the same registered owner OAuth app `mcpku2` bound to PRIVATE Content Producer v0.2.2: one reservation and one `save_post` yielded the persisted draft. MAN-04 revised the hook using exact revision/hash CAS; after the owner reviewed the complete revision-2 content, sources, checks and hash, one `approve_post` yielded `ready` revision 3. Independent owner-scoped `get_post` confirmed the approved hash and passing checks.

The business calls were made through the direct Codex `mcpku2` connector. There is no fresh ChatGPT parent-plugin-selected trace for those specific writes. Earlier host evidence proved the installed private plugin binds to `mcpku2`, exposes 33 tools, and performs three owner reads. The owner accepts these combined proofs for 10.4 and does not require a duplicate production draft or approval merely to generate a second host trace. This is an evidence-acceptance decision, not a claim that the 10.4 writes occurred in ChatGPT.

## Verified state and boundaries

- Page: `corious-facts`; post: `f58017bb-60ae-476d-afa7-65f8f0c6c3b8`.
- Current status: `ready`, revision 3, approved content hash `e944cf8975954f4041489e499ed20e1934181fd1f711b3f4756f62abe26abec3`.
- Seven allocated, verified NASA fact bindings; 19/19 system checks and 18/18 editorial checks pass. Blocking quality rejection has deterministic test coverage in the passing backend gate.
- No schedule, Facebook publication, performance metric, second draft, repeated approval, or grant activation.
- Backend source SHA `73087c33e8b20b663e6944f6ca89d0b591eebf44` passed [CR-020 gate #39411054462](https://github.com/milyarderpro/content-producer/actions/runs/39411054462); production Edge `mcp` v31 is active. No backend change is introduced by this decision.
- The missing parent-plugin write trace remains an explicit evidence limit for independent audit 10.7. Checkpoint 10.5 will use ChatGPT with the installed private plugin for MAN-05/06, including a fresh-conversation read. Do not mark those cards PASS until actually run.
- Phase 10 remains In progress; Pilot-ready, MVP Complete, and AC-001..AC-014 remain pending.

## Change control

This narrows the host-attribution evidence requirement for 10.4 only. It does not alter the frozen `procedure-v1` ordering, owner approval boundaries, OAuth authorization, RLS, tool contracts, database schema, or security gates. No business operation is repeated. Documentation-only reconciliation uses light checks; the full backend gate is reused while the deployed backend remains unchanged.
