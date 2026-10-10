# Dedup Evaluation Report V1

Checkpoint 4.7 evaluated the source-controlled dedup fixture through
`internal.trivia_find_candidates_v2` without changing the frozen thresholds.

| Split          | Cases | Result |
| -------------- | ----: | ------ |
| Development    |   105 | Passed |
| Frozen holdout |    45 | Passed |

The evaluator confirms exact precision and recall, eligible structured precision,
and candidate recall@20 at 100%. It reports zero false automatic merges and zero
unsafe automatic actions. The frozen holdout remains bound to `holdout.sha256`.

Machine-readable results: `evaluation-report-v1.json`.
Automated evidence: `supabase/tests/database/trivia-candidate-retrieval.test.ts`.
