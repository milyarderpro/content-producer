# CR-027 — MVP evidence boundary for publication and metrics

- **Date:** 2026-10-18
- **Status:** Accepted by the owner before the Phase 10 runbook
- **Authority:** The owner explicitly rejected genuine Facebook publication and real performance observations as prerequisites for MVP completion.
- **Supersedes:** CR-020 only where it requires execution of `MAN-10..MAN-11` and genuine publication/metrics before `MVP Complete`. Its technical gate, owner isolation, nine installed-plugin scenarios, and evidence rules remain in force.

## Reason

Content Producer prepares content for manual transfer to Canva and Facebook; it does not publish to Facebook or collect metrics automatically. A real publication and its subsequent observations depend on an external owner action and elapsed time. Making those events a release gate leaves MVP completion unbounded even when the implemented lifecycle and metrics contracts are verified. This decision changes the evidence gate and Definition of Done while retaining the lifecycle and metrics product capabilities.

## Decision

1. The Phase 10 guide retains `MAN-01..MAN-11` for traceability. **Only `MAN-01..MAN-09` are mandatory installed-plugin cards for the MVP.** Freeze their exact prompts, setup, expected and forbidden outcomes, state checks, and recovery before execution. Run each mandatory card once; rerun only failed or affected cards. `MAN-10..MAN-11` become optional post-MVP observation cards, marked `DEFERRED — POST-MVP` until genuine events occur. They are not failed or pending MVP gates.
2. `Pilot-ready` retains the CR-020 boundary: Phase 9 technical and hosted gates pass, the final private plugin is installed, `MAN-01..MAN-09` pass, and no critical/high security or data-integrity defect remains.
3. `MVP Complete` requires the applicable 14 PRD acceptance criteria to have appropriate evidence, owner editorial approval, and Phase 11 security, backup/restore, operational, documentation, and handoff checks. It **does not require a real Facebook publication or real performance observations**. Prove `AC-009` lifecycle and `AC-013` metrics/insight capabilities through deterministic database, RPC, and MCP tests using clearly synthetic fixtures in an isolated local or CI database. Include the existing owner-authorized pilot evidence where relevant. Do not create fictional publication IDs or metrics in production, and do not claim that the plugin published content.
4. If the owner later publishes a post and obtains genuine observations, `MAN-10..MAN-11` may be executed as post-MVP field validation. Record the actual result without retroactively changing the MVP gate. The 101 frozen prompts remain a regression inventory rather than a live MVP requirement.
5. Preserve CR-020's reuse rule: an unchanged deployed backend SHA reuses its successful full gate; plugin-only changes receive focused package/MCP tests and affected manual cards. Backend or security changes require a new full gate on the deployed SHA.

## Propagation

Synchronize `AGENTS.md`, `plans/PRD.md`, `plans/implementation-plan.md`, `plans/use-case-inventory.md`, and `plans/acceptance-traceability.md` before writing the Phase 10 runbook. Preserve Phase 8/9 plans and checkpoint reports as historical records; this CR supplies the active Phase 10–11 interpretation. Keep the Phase 9 release and independent audit status unchanged.
