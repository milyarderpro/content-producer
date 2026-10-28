# MAIN-CMP-01 — baseline / main-direct-save-v1

## Identity and scope

- `case_id: MAIN-CMP-01`; `attempt_id: baseline`; `cohort_id: main-direct-save-v1-owner-reported`.
- Tester session timestamp: `UNVERIFIED`; response received during campaign 28 October 2026 (Asia/Jakarta).
- Mode `guided_explicit`; prompt revision `main-direct-save-v1`; Page `f3984ee4-8ae7-4043-8c93-45765f82f46e` (internal editorial test Page).
- Expected/selected format `comparison`/`comparison`; `fast_trivia`, `animals`, `en-US`, interaction `comment`, 7 comparison facts.
- Page config and `config_updated_at`, recent allocations/variety, exact plugin/backend runtime versions: `UNVERIFIED` in tester output. Do not infer runtime from GitHub manifests.
- `execution_status: COMPLETED`; `workflow_verdict: PASS`; `last_completed_stage: READBACK`; `editorial_basis: PERSISTED`; `evidence_level: LIVE_OWNER_REPORTED`.
- Draft post public ID `a556c0ce-b98f-4634-9b50-1939c91c0249`; `status: draft`; revision 1; `quality_status: pending`; no revision, approval or publication.
- Saved content hash reportedly matches on `get_post`, but literal hash and raw tool transcript are not present: `UNVERIFIED` by coordinator.

## Prompt prepared and sent to owner

The following prompt was sent by the coordinator; pasted-byte identity in the new tester chat remains `UNVERIFIED`, as only the tester's response was relayed.

```text
Jalankan `MAIN-CMP-01` dengan hanya PRIVATE Content Producer pada Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Buat dan simpan tepat satu draft `comparison` tentang African versus Asian elephants; gunakan kontras paralel dengan spesies, metrik, dan kondisi selaras. Tulis naskah orisinal `en-US` yang natural, konkret, mengejutkan atau berguna tanpa clickbait, dan cepat dipindai.

Ikuti alur normal: riset/bukti → dedup lengkap (READ terarah bila hasil terpotong) → maksimal satu reservasi → maksimal satu `save_post` → `get_post`. Izin kedua Write itu sudah termasuk; jangan menunggu GO. Jika syarat gagal atau Write ditolak, berhenti tanpa retry; jika respons save hilang, rekonsiliasi READ, jangan buat draft kedua. Bila save pasti gagal setelah reservasi, boleh release reservasi kasus ini saja. Jangan revisi, approve, atau publikasikan. Balasan akhir: CANVA COPY pertama, caption, hashtags, format; jika tersimpan, post ID/status/revision, kecocokan `get_post`, system/editorial checks (terutama `trivia.surprise_substantive`), dan metrik server. Jika tidak, tahap dan error persis serta status reservasi. Ringkas sumber tanpa daftar URL.
```

## First visible CANVA COPY — PERSISTED (owner-reported matching readback)

```text
African savanna vs. Asian elephants

Trunk-tip projections — African: two; Asian: one.

Per front foot — African: usually 4 toenails; Asian: usually 5.

Molar ridges — African: diamond pattern; Asian: parallel lines.

Visible tusks — African: usually both sexes; Asian: some males.

Head domes — African: one; Asian: two.

Ears — African: larger, fan-shaped; Asian: smaller, rectangular.

Back profile — African: dips down; Asian: rounded.

Which difference caught your eye?
```

## Facebook caption

```text
African savanna and Asian elephants have distinct features. Here's a quick side-by-side guide to their trunks, feet, teeth, tusks, heads, ears, and backs. Which contrast stood out to you?
```

## Hashtags

```text
#ElephantFacts #WildlifeComparison #AnimalAnatomy
```

## Sequential tool evidence (tester-reported; sanitized)

- **Context** — **Observed in returned result:** Internal Page and `comparison` format identified · **Limit:** No raw Page/config snapshot, config timestamp or recent_variety
- **Research** — **Observed in returned result:** Seven anatomy comparisons reportedly verified using Tier B sources: International Elephant Foundation, Smithsonian's National Zoo, Zoo Atlanta, San Diego Zoo Wildlife Alliance, and International Fund for Animal Welfare · **Limit:** Reviewer did not inspect per-claim URLs/evidence, factual coverage, or provenance independence
- **Dedup** — **Observed in returned result:** 140 review decisions reported complete and accepted · **Limit:** No original candidate payload, decision labels or READ pagination retained; reviewer does not claim independently verified dedup completeness
- **`trivia_register_and_reserve_facts`** — **Observed in returned result:** One successful reservation for seven facts · **Limit:** No raw reservation token stored
- **`save_post`** — **Observed in returned result:** One successful save; post ID above · **Limit:** No replay or second draft reported
- **`get_post`** — **Observed in returned result:** MATCH: complete Canva copy, caption, hashtags, format, revision, content hash and 7 allocated fact bindings · **Limit:** Evidence level `LIVE_OWNER_REPORTED`; exact hash not supplied and coordinator did not perform direct get_post
- **Additional writes** — **Observed in returned result:** No revisions, approval, publication or cleanup · **Limit:** Quality `pending`, not `ready`

No response loss or `UNCONFIRMED` write is reported. All seven facts reportedly allocated at save.

## Server checks and metrics (reported by tester)

- **System checks** — **Value:** 18 passed, 1 nonblocking `trivia.profile.preferred_band: needs_review`
- **Warning** — **Value:** 63 Canva words below preferred 65–85; some fact lines shorter than preferred length; no blocking check failed
- **Editorial checks** — **Value:** 18 pass; all critical pass
- **`trivia.surprise_substantive`** — **Value:** `pass`, mainly trunk-tip, toenails, molars, tusks, head domes; others provide visual context
- **Dedup** — **Value:** 140 decisions, accepted
- **Canva characters** — **Value:** 474
- **Fact characters** — **Value:** 402
- **Word count** — **Value:** 63
- **Estimated visual lines** — **Value:** 26
- **Estimated read time** — **Value:** 22.1 seconds
- **Replay ratio** — **Value:** 1.7
- **Estimated loops** — **Value:** 2
- **Quality status** — **Value:** `pending`, no approval

These values are server-reported via tester, not independently recomputed by coordinator. Estimated read time and loops are not evidence of real video performance.

## Critical safety and source boundaries

- Server-reported editorial 18/18 pass includes `trivia.meaning_preserved`, `trivia.source_supported`, `trivia.time_context_valid`, `trivia.safety_appropriate`, `trivia.caption_no_new_claim`, `trivia.substantial_copying_absent`, and `trivia.surprise_substantive`; direct per-check objects were not returned to the coordinator.
- The first copy compares African **savanna** elephants to Asian elephants. Parallel morphological features and populations are not always perfectly symmetric: qualifiers `usually` / `some` are important for nails/tusks. No unilateral assertion that all individuals share one trait should be inferred.
- Caption appears to summarize the seven contrasts without a novel scientific claim. Source match, accuracy of each character, substantial-copying absence and safety policy execution remain `UNVERIFIED` *independently* by coordinator; do not turn a Tier B source summary into reviewer certification.
- No OAuth, credential, reservation token, operation key, private information, per-claim URL, or Facebook identifier is included.

## Reviewer DNA assessment of first copy

- **Familiarity** — **Score:** 2 · **Reason:** Familiar large animals; recognizable side-by-side topic
- **Surprise** — **Score:** 2 · **Reason:** Five concrete less-obvious contrasts: trunk tips, nails, molars, tusks, head domes
- **Specificity** — **Score:** 2 · **Reason:** Parallel units and anatomical categories, with usually/some qualifiers where necessary
- **Coherence** — **Score:** 2 · **Reason:** All seven lines compare the same anatomical dimensions
- **Scanability** — **Score:** 2 · **Reason:** Short parallel lines are fast to scan; no irrelevant exposition
- **Utility/emotion** — **Score:** 1 · **Reason:** Useful as recognition guide but limited emotional resonance and opening hook
- **Total** — **Score:** **11/12 KUAT** · **Reason:** `format_fit: FIT`, based on first visible copy, not approval/readiness

The text is natural and compact in `en-US`, with one question as comment CTA. The opening reads more like a title than a compelling curiosity hook. Format preference (5–8 parallel comparisons) is met, subject phrasing is sufficiently clear. One preferred-band warning is not a workflow failure. The first copy is not edited or replaced in this run.

## Verdict and next case

**Workflow: PASS / COMPLETED**, based on owner-reported one reservation, one save and matching `get_post`. **Editorial: 11/12 KUAT / PERSISTED / FIT**. Post remains `draft` and quality `pending`; no approval or publication.

Campaign after this case: **4/30 attempted**, 3 PASS and 1 BLOCKED (SSF reservation policy hold), 26 NOT RUN. No repeated identical technical blocker on two MAIN cases, no permission/safety incident, no `UNCONFIRMED` Write; continuing to the frozen `MAIN-MVF-01` is permitted after record verification. Issue #47 receives summary; generic hook observations may be tracked with existing editorial calibration issue #54 if repeated, not opened as a new defect. First wave PR remains deferred until five cases. Source and runtime verification limits preserved.
