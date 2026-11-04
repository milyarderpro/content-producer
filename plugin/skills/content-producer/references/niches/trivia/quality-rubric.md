# Trivia editorial rubric and safe outcomes

## Current v2 — three required editorial results

After research/dedup and final copy, submit exactly `meaning_preserved`,
`caption_no_new_claim`, `no_known_substantive_issue`, each `pass` or
`needs_revision`. All three must pass before save/revise; repair a
`needs_revision` rather than attesting a false pass. The server binds results to
the output revision/hash. Do not supply unrelated rubric fields, actor or timestamp.
Style/novelty suggestions are nonblocking notes, not hidden extra approval gates.

The server mechanically validates current Page/config, binding/URL/reuse,
fact count/format/renderer and hard budgets. It does not verify URL-page content.
Read back quality evidence via `get_post`. Explicit owner Setujui for that exact
revision/hash is separate; it checks current state and stored three-pass evidence,
without reopening every URL or demanding tier/expiry. A substantive ready edit
returns draft and invalidates old approval; schedule-only uses its own operation.
Canva/Facebook publication and observed metrics remain manual.
