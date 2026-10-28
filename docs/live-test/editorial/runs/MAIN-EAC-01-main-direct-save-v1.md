# MAIN-EAC-01 — baseline / main-direct-save-v1

- Case: `MAIN-EAC-01` / `baseline` / `main-direct-save-v1-owner-reported` / `guided_explicit`.
- Date of test: `UNVERIFIED`; response forwarded during 28 October 2026 campaign (Asia/Jakarta).
- Internal Page: `f3984ee4-8ae7-4043-8c93-45765f82f46e`; current config ID/timestamp, recent variety and backend/plugin runtime version: `UNVERIFIED`.
- Expected/selected: `emotional_animal_collection` / `emotional_animal_collection`, animals, en-US, `fast_trivia`, eight facts, CTA `share`.
- Execution `COMPLETED`; editorial `PERSISTED`, workflow `PASS` with evidence level `LIVE_OWNER_REPORTED`. All tool and check observations are tester-reported, not independent coordinator readback.
- Post public ID `b9c2ab3b-70e6-4874-b0e3-d28cadbe782b`; draft revision 1, quality pending. No approval/publication/revision.

## Prompt delivered to owner

This is the coordinator-prepared exact prompt; pasted-byte identity in the tester chat is `UNVERIFIED` because owner relayed only tester output.

```text
Jalankan `MAIN-EAC-01` dengan hanya PRIVATE Content Producer pada Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Buat dan simpan tepat satu draft `emotional_animal_collection` tentang perilaku sosial elephants yang benar-benar teramati; jangan mengarang motif manusia. Tulis naskah orisinal `en-US` yang natural, konkret, mengejutkan atau berguna tanpa clickbait, dan cepat dipindai.

Ikuti alur normal: riset/bukti → dedup lengkap (READ terarah bila hasil terpotong) → maksimal satu reservasi → maksimal satu `save_post` → `get_post`. Izin kedua Write itu sudah termasuk; jangan menunggu GO. Jika syarat gagal atau Write ditolak, berhenti tanpa retry; jika respons save hilang, rekonsiliasi READ, jangan buat draft kedua. Bila save pasti gagal setelah reservasi, boleh release reservasi kasus ini saja. Jangan revisi, approve, atau publikasikan. Balasan akhir: CANVA COPY pertama, caption, hashtags, format; jika tersimpan, post ID/status/revision, kecocokan `get_post`, system/editorial checks (terutama `trivia.surprise_substantive`), dan metrik server. Jika tidak, tahap dan error persis serta status reservasi. Ringkas sumber tanpa daftar URL.
```

## CANVA COPY — first visible, PERSISTED per tester get_post

```text
Elephant social life is full of signals.

Some African elephants use individual-specific calls.

During reunions, studied females paired rumbles with ear flaps.

Studied elephants adjusted greetings to who was watching.

Young females guarded threatened or distressed calves.

Older matriarchs distinguished male lion threats in playback tests.

When families split, females stayed with close maternal kin.

Separated female companions exchanged rumbles to reunite.

Wild elephants revisited remains, touching and inspecting them.

Share these observed elephant social behaviors.
```

## FACEBOOK CAPTION

```text
African elephant social life shows up in observable ways: individual calls, greeting gestures, help with calves, group leadership, and visits to remains. The behaviors are remarkable without guessing what the animals feel.
```

## HASHTAGS

```text
#Elephants #AnimalBehavior #WildlifeScience
```

## Tool trace and limits

| Stage | Owner-reported outcome |
| --- | --- |
| Page context | Target internal Page and format used; raw generation config and recent_variety omitted |
| Research | Seven scholarly publications: six primary and one review, covering elephant communication, calf care, social structure and responses to deaths; summary `pubmed.ncbi.nlm.nih.gov+6`. No per-claim URLs or mapping supplied to coordinator |
| Dedup | Passed to reservation; number and exact candidate decisions not supplied |
| `trivia_register_and_reserve_facts` | Exactly one successful reservation, eight facts allocated on save |
| `save_post` | One successful save; draft ID above, revision 1 |
| `get_post` | MATCH reported for Canva copy, caption and hashtags; status draft, revision 1, eight allocations |
| Mutations excluded | No retry, second draft, revision, approval or publication |

No unknown Write state or reported reservation remaining after save. Raw operation key, reservation tokens, IDs of source claim packets, exact content hash and source URLs are not present and are not reconstructed.

## Server quality and metrics (owner-reported)

- System `passed`: 18 blocking checks pass, including source/dedup/render/character limit.
- Editorial: 18 `pass`; no risk flags. `trivia.surprise_substantive: pass`.
- Nonblocking `trivia.profile.preferred_band: needs_review`: some fact lines below 8-word preference.
- Quality `pending`, no approval.
- Fact count 8; Canva 579/600 characters; facts 488/500 characters; 76 words; 30 visual lines; estimated read time 26.3 seconds; replay ratio 2.023; estimated loops 3.
- Historical 28-total-lines gate no longer applies after CR-051. Metrics are not actual video viewing evidence.

## Critical assessment boundary

Server reports source, safety and all 18 editorial checks pass, including `trivia.meaning_preserved`, `trivia.source_supported`, `trivia.time_context_valid`, `trivia.safety_appropriate`, `trivia.caption_no_new_claim`, `trivia.substantial_copying_absent`, and `trivia.surprise_substantive`. Reviewer sees no obvious dangerous advice, manufactured human motives or new unsupported caption statements, but independently verifying source support, exact study qualifiers or copying against seven papers is **UNVERIFIED**. The first copy is the sole baseline and was not rewritten.

## DNA reviewer (0–2)

| Criterion | Score | Rationale |
| --- | ---: | --- |
| Familiarity | 2 | Familiar elephant subject |
| Surprise | 2 | Individual calls, greeting patterns, lion playback and visits to remains |
| Specificity | 2 | Concrete observations with study/test context |
| Coherence | 2 | Eight behavior facts under one social theme |
| Scanability | 1 | Short sentences, but generic hook, repeated “studied” and somewhat clinical phrasing |
| Utility/emotion | 1 | Calf support and reunions can be moving, yet the writing feels distanced |
| **Total** | **10/12 KUAT** | `format_fit: FIT`; not a source-validation or readiness verdict |

English is generally accessible across US/UK/CA/AU. CTA is one share interaction. Hook lacks specificity; claims are presented as observed events rather than motives, as frozen brief requires. Reviewer score is independent of server checks.

## Verdict and next action

Workflow `PASS` with one reserve/save and matching owner-reported readback, `COMPLETED`, basis `PERSISTED`. Quality `pending` means not `ready`. No `UNCONFIRMED` writes; earlier SSF dedup hold did not recur in TUT or EAC, so campaign is 3/30, 2 PASS + 1 BLOCKED, and pause rule not triggered. Link #47; generic hook and clinical voice are editorial observations relevant to #54, not proven new tool bugs. Next case `MAIN-CMP-01` keeps frozen African-versus-Asian elephants brief; no unauthorized edits/retries. Sanitized: no OAuth, secret, raw operation/reservation tokens, private identities or individual source URLs.
