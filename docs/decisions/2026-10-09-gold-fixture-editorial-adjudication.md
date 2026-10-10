# CR-006 — Editorial adjudication for the Phase 4 gold deduplication fixture

| Field  | Value                                |
| ------ | ------------------------------------ |
| Status | Accepted                             |
| Date   | 9 October 2026                       |
| Scope  | Phase 4 checkpoint 4.4, Batch A only |

## Conflict

Checkpoint 4.4 requires a source-controlled gold set of at least 150 unique,
semantically labelled left/right candidate pairs. Each pair must carry a
complete structured candidate for both sides and a specific rationale for its
deduplication decision. The plan also requires the implementation agent to
stop when a gold-fixture label requires human editorial adjudication.

The three local reference datasets are pattern material only. They contain
viral post text, not reviewed canonical identities, relation assignments,
qualifier boundaries, or deduplication decisions. In particular, the data
cannot deterministically establish whether two differently worded propositions
are the same claim, materially distinct, or review-required. It also cannot
deterministically derive the required `subject_key`, `relation_key`,
`object_key`, numbers, and qualifiers for both sides of each pair.

The current runtime-generated fixture violates this requirement: it repeats
records, assigns categories by position, transforms wording by template, and
derives labels/structured test inputs from those categories. Freezing those
generated values would make them static, but would not make them curated or
editorially valid.

## Options

1. **Recommended — provide an approved editorial fixture.** Supply or approve
   a static JSONL/JSON fixture containing the 150 labelled cases and their full
   canonical candidates. The implementation will validate provenance,
   semantic pair uniqueness, split/count coverage, checksum integrity, and run
   the development evaluator without inspecting holdout outcomes.
2. **Explicitly authorize AI editorial adjudication.** Authorize the agent to
   curate the cases from the supplied pattern datasets using editorial
   judgement. The resulting records will be marked truthfully as AI-reviewed,
   never human-reviewed or fact-verified. This option requires approval
   because it changes the evidence basis of the checkpoint gate.
3. **Defer the gold-set acceptance gate.** Reclassify the current cases as
   synthetic retrieval fixtures only, remove their `frozen`/reviewer claim,
   and defer the Phase 4 gold-set completion criterion until reviewed labels
   are available. This changes the completion boundary and requires approval.

## Non-options

- Do not convert the existing generated cases into a static file and call them
  curated.
- Do not infer semantic labels or canonical identity from prose using a
  deterministic template.
- Do not claim a human reviewed, fact-checked, or production-ready fixture.
- Do not evaluate the holdout set while this decision remains unresolved.

## Accepted decision

Option 2 is accepted: the Phase 4 Batch A fixture is individually adjudicated
by AI from the local reference datasets as pattern material. Every record is
labelled `reviewer: "ai"` and `review_status: "ai_reviewed"`.

The fixture is AI-reviewed only. It is not human-reviewed, fact-checked,
verified, or production-ready. The reference datasets remain untrusted pattern
material and do not establish the truth of any fixture proposition.

## Effect

The accepted AI-reviewed fixture may satisfy the Batch A checkpoint 4.4
development gate when its static corpus, provenance, canonical identity,
development evaluation, and planner evidence pass the required checks.
Checkpoint 4.5 and Batch B remain out of scope.
