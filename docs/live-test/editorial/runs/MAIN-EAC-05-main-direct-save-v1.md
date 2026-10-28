# MAIN-EAC-05 — Penguin Parenting baseline

## Identity and verdict

- Case `MAIN-EAC-05`, attempt `baseline`, cohort `main-direct-save-v1-owner-reported`, mode `minimal_implicit`.
- Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`; language `en-US`, topic `animals`, interaction goal `share`.
- Expected reviewer format `emotional_animal_collection`; autonomously selected `emotional_animal_collection`. No case ID, format name, number of facts or layout appeared in the prompt.
- `execution_status: BLOCKED`; `workflow_verdict: BLOCKED`; `stop_category: POLICY_HOLD`; `failure_stage: RESEARCH`; `block_reason: SOURCE_EVIDENCE_INCOMPLETE`.
- `editorial_basis: UNSAVED`; `format_fit: FIT`; reviewer DNA `9/12 PERLU REVISI`. No draft ID, revision, allocation or quality status.
- Evidence `LIVE_OWNER_REPORTED`; Page config timestamp, source evidence, exact runtime plugin/backend versions and session timestamp `UNVERIFIED`.
- The prompt preserved below is coordinator-prepared. Exact pasted-byte identity in the tester chat is `UNVERIFIED`.

## Prompt prepared and sent

```text
Gunakan hanya PRIVATE Content Producer pada Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Buat dan simpan tepat satu draft trivia `en-US` yang natural tentang a warm trivia card about penguin parenting. Pilih sendiri format paling sesuai dari konfigurasi Page.

Ikuti alur normal: riset/bukti → dedup lengkap (READ terarah bila hasil terpotong) → maksimal satu reservasi → maksimal satu `save_post` → `get_post`. Izin kedua Write itu sudah termasuk; jangan menunggu GO. Jika syarat gagal atau Write ditolak, berhenti tanpa retry; jika respons save hilang, rekonsiliasi READ, jangan buat draft kedua. Bila save pasti gagal setelah reservasi, boleh release reservasi kasus ini saja. Jangan revisi, approve, atau publikasikan. Balasan akhir: CANVA COPY pertama, caption, hashtags, format; jika tersimpan, post ID/status/revision, kecocokan `get_post`, system/editorial checks (terutama `trivia.surprise_substantive`), dan metrik server. Jika tidak, tahap dan error persis serta status reservasi. Ringkas sumber tanpa daftar URL.
```

## First visible CANVA COPY — UNSAVED

```text
Penguin parenting is a team effort.

Emperor penguin dads balance eggs on their feet.

A warm brood pouch protects each egg from Antarctic cold.

Emperor penguin moms return from feeding trips to their chicks.

Penguin parents recognize their chicks through distinctive calls.

In some penguin species, both parents take turns incubating eggs.

Penguin chicks depend on adults for food and protection.

Some penguin chicks gather in groups called crèches.

Share a little penguin parenting wonder.
```

## Facebook caption — UNSAVED

```text
Penguin parenting has some remarkable details, from keeping eggs warm on icy feet to recognizing chicks by sound. These real behaviors make penguin family life fascinating.
```

## Hashtags — UNSAVED

```text
#PenguinFacts #AnimalParenting #WildlifeTrivia
```

## Tool trace and evidence boundary

- Workspace and Page verified and generation configuration read, per tester. No original configuration snapshot or timestamp supplied.
- Source research and verification was incomplete. Tester did not report verified and registered sources for any completed eight-claim packet.
- No full semantic dedup was run; `trivia_find_similar_facts` completion not reported. No reservation, `save_post` or `get_post`; no server-returned error and no pending/releasable reservation.
- No draft, server system checks, editorial checks, text metrics or saved `quality_status`. The reported `trivia.surprise_substantive: needs_review` is **provisional tester assessment only**, not a persisted server check.
- No retry, second draft, revision, approval or publication. No `UNCONFIRMED` Write.
- Source-to-claim evidence, exact research queries and runtime are `UNVERIFIED`. Source hold is a prerequisite/policy stop, not demonstrated backend defect.

## Reviewer DNA — first copy only

- Familiarity 2/2: penguins and chick-rearing are familiar.
- Surprise 1/2: egg-balancing, distinctive calls and crèches add novelty, but several facts are generic.
- Specificity 1/2: emperor penguin examples and the term crèches are specific; broad claims about food/protection and penguin parents lack detail.
- Coherence 2/2: eight short statements stay within observed parenting behavior.
- Scanability 2/2: simple sentence-per-fact layout and clear single share CTA.
- Utility/emotion 1/2: the parenting topic is warm, but copy conveys few vivid emotional moments.
- **Total 9/12 PERLU REVISI**, `format_fit: FIT`, basis `UNSAVED`. Not a factual certification or publication-ready determination.

## Critical considerations and next decision

- `trivia.meaning_preserved` and `trivia.source_supported`: not assessable without validated source packet; reviewer did not audit per-fact claims.
- `trivia.time_context_valid`: no clear dated claims; confirmation remains unavailable.
- `trivia.safety_appropriate`: no dangerous instructions visible; no server safety check.
- `trivia.caption_no_new_claim`: caption appears to summarize warming eggs and call recognition rather than adding new science.
- `trivia.substantial_copying_absent`: not independently checked.
- `trivia.surprise_substantive`: `needs_review` only as temporary tester judgment, **not** a stored server result.

Campaign status after case 8/30: 4 PASS, 4 BLOCKED, 0 FAIL; 4 PERSISTED, 4 UNSAVED first copies; 6 KUAT and 2 PERLU REVISI. Neither an authorization/security incident nor an uncertain Write occurred. TUT-05 and EAC-05 both stopped before dedup due missing source evidence, but the returned evidence does **not** demonstrate the same technical backend failure; these are different content domains and unverified evidence packets. Do not replay or repeat this baseline. Next frozen implicit case compares Arctic and Antarctic; its tester prompt must not expose the internal case ID, format or number of facts. This file contains no tokens, private credentials, operation keys, reservation IDs or per-claim source URLs.
