# MAIN-CMP-05 — Arctic versus Antarctic

## Identity and workflow

- Case `MAIN-CMP-05`, attempt `baseline`, cohort `main-direct-save-v1-owner-reported`, prompt mode `minimal_implicit`.
- Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`, selected topic `geography`, `en-US`, interaction `comment`.
- Expected reviewer format `comparison`; tester independently selected `comparison`, without receiving format-bearing ID, target format, fact count or layout. `format_fit: FIT` with four paired contrast categories (eight fact lines); count is below preferred five to eight direct contrast pairs.
- `execution_status: BLOCKED`, `workflow_verdict: BLOCKED`, `stop_category: PREREQUISITE`, `block_reason: DEDUP_READ_INCOMPLETE`, `failure_stage: DEDUP`, `last_completed_stage: INITIAL_DEDUP_READ`. Source evidence packet also incomplete.
- `save_post_outcome: NOT_CALLED`, `readback_outcome: NO_POST_ID`; no reservation, post ID, status or revision.
- `editorial_basis: UNSAVED`, reviewer DNA `9/12 PERLU REVISI`, `evidence_level: LIVE_OWNER_REPORTED`.
- Actual Page config and timestamp, recent variety, plugin/backend runtime, session timestamp and per-claim source mapping `UNVERIFIED`.
- The prompt below was prepared by coordinator; exact pasted bytes in fresh tester chat `UNVERIFIED`.

## Prepared tester prompt

```text
Gunakan hanya PRIVATE Content Producer pada Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Buat dan simpan tepat satu draft trivia `en-US` yang natural tentang a card comparing the Arctic and Antarctic. Pilih sendiri format paling sesuai dari konfigurasi Page.

Ikuti alur normal: riset/bukti → dedup lengkap (READ terarah bila hasil terpotong) → maksimal satu reservasi → maksimal satu `save_post` → `get_post`. Izin kedua Write itu sudah termasuk; jangan menunggu GO. Jika syarat gagal atau Write ditolak, berhenti tanpa retry; jika respons save hilang, rekonsiliasi READ, jangan buat draft kedua. Bila save pasti gagal setelah reservasi, boleh release reservasi kasus ini saja. Jangan revisi, approve, atau publikasikan. Balasan akhir: CANVA COPY pertama, caption, hashtags, format; jika tersimpan, post ID/status/revision, kecocokan `get_post`, system/editorial checks (terutama `trivia.surprise_substantive`), dan metrik server. Jika tidak, tahap dan error persis serta status reservasi. Ringkas sumber tanpa daftar URL.
```

## First visible CANVA COPY — UNSAVED

```text
Arctic vs. Antarctic: Polar opposites

Arctic: An ocean surrounded by continents.

Antarctic: A continent surrounded by ocean.

Arctic: Polar bears roam the sea ice.

Antarctic: Penguins breed along icy coasts.

Arctic: Sea ice expands and shrinks seasonally.

Antarctic: Thick ice covers most of the land.

Arctic: Indigenous communities have lived here for millennia.

Antarctic: No permanent Indigenous human population exists.

Which polar difference surprised you most?
```

## Facebook caption — UNSAVED

```text
Both ends of Earth are icy, but their geography, wildlife, and human histories are strikingly different. Which contrast did you find most interesting?
```

## Hashtags — UNSAVED

```text
#Arctic #Antarctica #GeographyFacts
```

## Tool trace and boundaries

- Internal Page and `comparison` format confirmed as valid, per tester. Raw Page context not supplied.
- Research/source packet for all eight individual claims was not finalized; no per-claim URL or independent source verification by reviewer.
- An initial `trivia_find_similar_facts` READ succeeded but was too long to confirm every candidate and required semantic review. Targeted follow-up READ was **not reported**, despite the frozen prompt explicitly requiring it when truncated.
- No complete dedup, reservation, `save_post`, or `get_post`. No rejected Write, server error, post, allocation, release, retry, revision, approval or publication. No `UNCONFIRMED` Write.
- No server system/editorial checks, server metrics, quality status, or confirmed `trivia.surprise_substantive`. Reported `needs_review` was a **provisional tester assessment**, not a persisted server check.
- This reproduces the *observable orchestration blocker* in `MAIN-SSF-05`: truncated initial dedup view without targeted READ completion before stopping. It does not prove a common RPC/backend defect. Under the frozen two-case repeated-blocker rule, **PAUSE the campaign** pending targeted-read orchestration triage (#56).

## DNA and critical reviewer assessment

- Familiarity **2/2**: Arctic/Antarctic and polar wildlife widely recognizable.
- Surprise **1/2**: geography and Indigenous history are useful distinctions; most animal/ice facts are elementary.
- Specificity **1/2**: species and geography recognizable, but only four paired dimensions, and the sea-ice-versus-land-ice comparison is asymmetric.
- Coherence **2/2**: all eight fact lines concern four polar contrasts.
- Scanability **2/2**: clear alternating Arctic/Antarctic lines and one comment CTA.
- Utility/emotion **1/2**: helpful orientation, but little new practical or emotional payoff.
- **Total 9/12 PERLU REVISI**, `format_fit: FIT`, `UNSAVED`. The ice comparison risks implying only Arctic sea ice changes seasonally; Antarctic sea ice also varies. This is a framing caution, not an independently established factual error.
- Source-supported meaning, time context, copying absence and individual claims **UNVERIFIED**. Caption restates the contrasts; safety concerns are low but no persisted server checks exist. No publication readiness.

## Campaign decision

Case 9/30: 4 PASS, 5 BLOCKED, 0 FAIL; 4 PERSISTED, 5 UNSAVED; 6 KUAT, 3 PERLU REVISI. `MAIN-SSF-05` and `MAIN-CMP-05` reproduce the same visible pre-Write dedup-read orchestration stop. **PAUSE before case 10**; no frozen next tester prompt until #56 triage establishes corrective action and a safe resume decision. No retry of either baseline and no claim of a backend root. This file contains no credentials, operation/reservation IDs or private source URLs.
