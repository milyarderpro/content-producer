# MAIN-SSF-05 — implicit Moon baseline

## Identity and verdict

- Case `MAIN-SSF-05`, attempt `baseline`, cohort `main-direct-save-v1-owner-reported`, mode `minimal_implicit`.
- Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`; topic `nature_science`; language `en-US`; profile `fast_trivia`.
- Expected format in the private reviewer matrix `single_subject_fast`; tester independently selected `single_subject_fast`. The prompt did not disclose case ID, format, fact count, or layout.
- Reported Page limits: 600 Canva characters, 500 combined fact characters, and 90 characters per fact. Actual `config_updated_at`, context snapshot, recent variety, plugin/backend versions, and tester timestamp `UNVERIFIED`.
- `execution_status: BLOCKED`, `workflow_verdict: BLOCKED`, `stop_category: PREREQUISITE`, `block_reason: DEDUP_READ_INCOMPLETE`, `last_completed_stage: INITIAL_DEDUP_READ`, `failure_stage: DEDUP`.
- `editorial_basis: UNSAVED`, `format_fit: FIT`, reviewer DNA `11/12 KUAT`; no post ID, revision, allocation, or server checks.
- `evidence_level: LIVE_OWNER_REPORTED`; the session was relayed by the owner on 28 October 2026 (Asia/Jakarta). Pasted-byte identity of the actual tester prompt is `UNVERIFIED`.

## Prompt prepared and sent by coordinator

```text
Gunakan hanya PRIVATE Content Producer pada Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Buat dan simpan tepat satu draft trivia `en-US` yang natural tentang the Moon as one familiar subject for a quick trivia card. Pilih sendiri format paling sesuai dari konfigurasi Page.

Ikuti alur normal: riset/bukti → dedup lengkap (READ terarah bila hasil terpotong) → maksimal satu reservasi → maksimal satu `save_post` → `get_post`. Izin kedua Write itu sudah termasuk; jangan menunggu GO. Jika syarat gagal atau Write ditolak, berhenti tanpa retry; jika respons save hilang, rekonsiliasi READ, jangan buat draft kedua. Bila save pasti gagal setelah reservasi, boleh release reservasi kasus ini saja. Jangan revisi, approve, atau publikasikan. Balasan akhir: CANVA COPY pertama, caption, hashtags, format; jika tersimpan, post ID/status/revision, kecocokan `get_post`, system/editorial checks (terutama `trivia.surprise_substantive`), dan metrik server. Jika tidak, tahap dan error persis serta status reservasi. Ringkas sumber tanpa daftar URL.
```

## First visible CANVA COPY — UNSAVED

```text
THE MOON ISN'T AS QUIET AS IT LOOKS

The Moon has ice hidden inside permanently shadowed polar craters.

Moonquakes can happen as the Moon slowly cools and shrinks.

Its far-side crust is thicker than the crust facing Earth.

Those dark lunar plains were filled by lava long ago.

The Moon has an atmosphere, but it's incredibly thin.

The Moon drifts roughly four centimeters farther away each year.

It spins once on its axis during each orbit around Earth.

Which Moon fact surprised you most?
```

## Facebook caption — UNSAVED

```text
We see the Moon all the time, but its geology and motion still hold surprises. From hidden ice to moonquakes, which detail was new to you?
```

## Hashtags — UNSAVED

```text
#MoonFacts #SpaceTrivia #LunarScience
```

## Tool trace and evidence limits

- Page configuration was reportedly read and the implicit format chosen for one familiar subject with seven concise facts. Other Page selection candidates were not detailed; the chosen format is a good fit.
- NASA Science research reportedly completed on lunar ice, moonquakes, geology, and synchronous rotation. No fact-to-source URL packet or independent source audit was provided.
- Initial `trivia_find_similar_facts` READ was reportedly too long/truncated to confirm all candidates and required semantic review decisions.
- The frozen prompt required targeted dedup READ if the result was truncated. The tester **did not report attempting targeted READ**, so this is an observed orchestration gap. There is no proof that a targeted READ itself would fail.
- No reservation was attempted; `trivia_register_and_reserve_facts: NOT_CALLED`, `save_post: NOT_CALLED`, `get_post: NOT_CALLED`. No server rejection/error code, uncertain Write, retry, second draft, revision, approval, or publication.
- Server system/editorial checks, `trivia.surprise_substantive`, `text_metrics`, and `quality_status` are `UNVERIFIED` because no post was saved.
- This differs from `MAIN-SSF-01`: the earlier case reached a reservation rejection `FACT_REVIEW_REQUIRED` after supposedly complete dedup READ; Moon stopped before reservation. The two are related to dedup readiness but not proven to share the same technical blocker. Existing Issue #56 is relevant for targeted READ orchestration.

## Critical editorial evidence boundary

- `trivia.meaning_preserved` and `trivia.source_supported`: NASA research was reported, but individual source matches and qualifiers have not been independently checked.
- `trivia.time_context_valid`: approximately four-centimeter annual recession is phrased as an approximation; the source measurement context was not independently audited.
- `trivia.safety_appropriate`: no visible risky instructions; no server check was performed on a saved post.
- `trivia.caption_no_new_claim`: caption appears to summarize the Moon geology/motion and phenomena already listed.
- `trivia.substantial_copying_absent`: no independent text comparison against sources.
- `trivia.surprise_substantive`: reviewer finds lunar ice, moonquakes, and far-side crust substantively interesting, but **no server PASS exists**.

## DNA reviewer — first visible copy

- Familiarity 2/2: the Moon is a familiar subject.
- Surprise 2/2: polar ice, moonquakes and far-side crust are meaningful surprises.
- Specificity 2/2: concrete astronomical and geological details, including approximate lunar recession.
- Coherence 2/2: a single Moon subject with varied angles.
- Scanability 2/2: short, independent lines and natural English; the uppercase hook is a minor stylistic drawback.
- Utility/emotion 1/2: curiosity strong, but little direct utility or emotional payoff.
- **Total 11/12 KUAT**, `format_fit: FIT`, basis `UNSAVED`; not source certification or readiness for publication.

## Decision

Count as case 6/30: four workflow PASS, two BLOCKED, zero FAIL; four PERSISTED and two UNSAVED previews; five KUAT and one PERLU REVISI. No new authorization/security issue or `UNCONFIRMED` Write. No replay or rescue Write authorized for this case. Next frozen implicit brief is practical care of kitchen sponges, with no internal case ID or expected format in tester prompt. The record contains no secret, reservation token, operation key, private identity, or individual source URLs.
