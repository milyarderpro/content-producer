# Trivia canonical identity and dedup decisions

For 10–12 final candidates, use multiple Reads of at most 9 (e.g. 9+3).
Use unique candidate keys across the whole set. Compare string fact catalog
versions from every Read; if they differ, discard the mixed-version decisions
and restart all Reads/reviews. Never copy only the last version onto stale
reviews. The editorial catalog version is a different version, not a substitute.
Incomplete/clipped results block Write; complete results still require every
match review and the server's final atomic reuse/catalog validation.

## Current v2 decision path

Use `trivia_find_similar_facts_v2` with Page and candidate sentences; no structured
ontology input, source packet or review is required for Read. Copy its decimal
string catalog version without rounding. Inspect `complete`, all match IDs,
claims, status, reuse eligibility and usage. `fact_updated_at` is canonical CAS
for version-2 maintenance; keep all six fractional digits.

Compare atomic meaning as SAME/DISTINCT/UNCERTAIN, including quantities, negation,
units, time, place, population and conditions without encoding a 17-key input.
Same subject or URL is not sufficient to merge different propositions. SAME
must use the existing canonical ID if eligible and unused within Page/workspace
reuse scope. Draft allocations count as usage. SAME against invalidated,
superseded or rejected identities must be replaced, never reused or assigned a
new ID to bypass history. V2 reuse depends on status and usage; preserve an eligible canonical ID and its snapshots.

Replace used, uncertain or `complete=false` candidates in the same workflow;
host-clipped/missing match fields are incomplete too. Use reserves or research
new candidates and search them. Do not force long reviews, lower result limits,
invent DISTINCT or treat incomplete as no matches. Review every required match
before save with one dedup entry per fact; `same` includes its matching ID/review,
`distinct` has null identity and distinct reviews for all returned matches. The
final set excludes known semantic duplicates. `complete=true` describes only
the frozen retrieval predicates, not perfect recall of every paraphrase.

Save allocates identities atomically; no separate reserve token. Katalog changes
require fresh Read/review even for unrelated changes (baseline A), but do not
force source research again when meaning and support remain valid. Unknown
Write results must be reconciled before starting another operation.
