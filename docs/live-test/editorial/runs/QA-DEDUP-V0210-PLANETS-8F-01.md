# QA dedup v0.2.10 — eight planetary/moon facts, attempt 01 (READ-only)

**Date:** 2026-10-28. **Evidence level:** OWNER_REPORTED_LIVE; coordinator has owner-provided report, not raw MCP tool logs or host build fingerprint.

**Separate diagnostic** outside the frozen 30-case editorial MAIN campaign; do not count as MAIN case 10, do not alter 9/30 denominator, and do not replay MAIN-SSF-05 or MAIN-CMP-05.

## Scope and identity

- Selected plugin: existing PRIVATE Content Producer owner OAuth `mcpku2` with authenticated owner, workspace resolution, and Page/niche context confirmed by tester. Target Page `f3984ee4-8ae7-4043-8c93-45765f82f46e` (Trivia Editorial Test (Internal)), trivia enabled.
- Plugin Creator externally confirms current account plugin `plugins_6ad5bf91a278819182951ebb312eca06` is PRIVATE release `0.2.10`, `pluginrel_6ae1b386802c8191a3ef8a55c5392bcf`; this **does not** verify the precise host/runtime version in the tester chat (`HOST_RUNTIME_UNVERIFIED`).
- Each proposed candidate F1–F8 was submitted alone to `trivia_find_similar_facts` with `max_matches_per_candidate:20`, ontology v1 and non-directional `comparison_direction:none`; no business Write.

## Eight-candidate READ evidence

| Key | Claim | READ calls | Matches reported | review_required | Result inspectable (tester report) | Explicit decisions authored |
|---|---|---:|---:|---|---|---:|
| F1 | Jupiter has a giant storm called the Great Red Spot | 2 | 20 | false | yes | 0 required |
| F2 | Venus has a thick atmosphere dominated by carbon dioxide | 2 | 20 | false | yes | 0 required |
| F3 | Mars has a giant volcano called Olympus Mons | 2 | 20 | false | yes | 0 required |
| F4 | Uranus has an unusually tilted rotation axis | 2 | 20 | false | yes | 0 required |
| F5 | Neptune is classified as an ice giant | 2 | 20 | false | yes | 0 required |
| F6 | Mercury is the closest planet to the Sun | 2 | 20 | true | yes | **0/20** |
| F7 | Earth's atmosphere is mostly nitrogen | 2 | 20 | true | yes | **0/20** |
| F8 | Earth's Moon rotates synchronously with its orbit around Earth | 2 | 20 | false | yes | 0 required |
| **TOTAL** | | **16** | **160** | **2 true** | **8/8** | **0/40 mandatory** |

- 8 initial READ calls and 8 additional "diagnostic" READ calls were owner-reported. **The 8 repeat calls were NOT justified by observed truncation**; this is an orchestration-protocol deviation, not an MCP failure. No third READ was attempted.
- Structured match results are reported complete; 20 IDs/material identities/qualifiers visible per fact. Coordinator does not independently possess the eight raw MCP results. Complete response inspection is **owner-reported**, not a byte-for-byte evidence check.
- F6 preliminary example: Saturn's sixth-planet-from-Sun fact, existing ID `85e6d028-9602-44d3-8d17-0c83e5446e99`, clearly not logically equivalent to "Mercury closest to Sun"; this is **not** a substitute for all 20 ID-by-ID reviews.
- F7 preliminary example: Saturn hydrogen/helium composition, ID `6aaf4eb2-5f6b-48e5-b399-9d83aa63303b`; both propositions can share `has_named_part_or_property`, so `relation` must **not** be asserted on that pair without different `relation_key`. Subject/object differences matter. Not a completed 20-match review.
- F6 and F7 are `review_required:true`, but their outstanding 40 decisions are **NOT automatically `uncertain`**: they are `UNREVIEWED`. Do not invent semantic conclusions or waive the reviews.

## Reported tools and safety

- `get_account_profile`: 1; `get_workspace_context`: 1; `list_pages`: 1; `get_page_generation_context`: 1; `trivia_find_similar_facts`: 16.
- `trivia_register_and_reserve_facts`: **0**. All other business Writes including `save_post`, revision, approval, publication: **0**. No draft or reservation was created.
- Source-evidence research quality and host fingerprint **not independently audited**; this diagnostic concerns READ orchestration and semantic review requirements only.

## Verdict and follow-up

| Gate | Verdict |
|---|---|
| `READ_ORCHESTRATION` | **PASS_WITH_DEVIATION**: 8/8 full results, but 8 unnecessary repetitions |
| `SEMANTIC_REVIEW_COMPLETENESS` | **INCOMPLETE**: F6 0/20, F7 0/20 |
| `RESERVATION_READINESS` | **HOLD**: required decisions missing; no business Write permitted |
| `HOST_RUNTIME_VERIFICATION` | **UNVERIFIED**: account package v0.2.10 verified externally only |
| Overall 8-fact diagnostic | **BLOCKED / SEMANTIC_REVIEW_INCOMPLETE**; not #56 FIXED |

**Next safe test:** in the **same eight-fact QA chat**, ask for F6 twenty exact ID/key/decision/reason/material-differences rows from the already-returned tool results, then F7 separately. Use explicit literal keys, no placeholders, no false asserted differences; `same` => `material_differences:[]`; `uncertain` => hold. Because two READ calls were already used per candidate, **do not issue a third READ in this test**; if prior full match objects cannot be inspected, mark that fact BLOCKED and report missing evidence. Do not merge/rename/retry a MAIN baseline or perform a business Write.

Continue holding Issue #56 OPEN and MAIN editorial campaign PAUSED at 9/30 pending a fully reviewed eight-fact diagnostic and an explicit owner decision about next steps. No automatic restart.

## F6 semantic review follow-up — Mercury, scoped PASS

**Source:** owner-reported tester result in separate eight-fact QA chat (not a fresh coordinator MCP READ or server reservation validation). F6 proposed "Mercury is the closest planet to the Sun." Structured candidate `mercury / is_located_in / innermost_planet_orbit_around_sun`, `numbers:[]`, `negated:false`, `comparison_direction:none`. Previously returned `review_required:true`, 20 matches.

- **20/20 individual decisions authored**, all `distinct` with individual reasons; 0 `same`, 0 `uncertain`. No additional READ or business Write in this follow-up.
- Reviewer compared all 20 displayed literal match IDs and primary normalized keys: **20 unique IDs**, `other` supported by a different subject/object on **20/20** rows, `relation` supported by a differing relation key on **16/16** rows, and correctly omitted on 4/4 same-relation rows (#2, #3, #10, #13). All supplied material differences use allowed labels (`other`, `relation`); none uses forbidden `estimate`.
- Saturn existing #1 `85e6d028-9602-44d3-8d17-0c83e5446e99` ("Saturn is sixth from Sun") is `distinct` from Mercury innermost. Some unasserted extra differences (e.g. #18 negation) are not needed where asserted fields already support `distinct`.
- **F6 scoped verdict: `SEMANTIC_REVIEW_PASS`** on submitted evidence and primary-field labels. Qualifier/source verification, host-session fingerprint, and registration-validator acceptance are **not** established. No representation that reviewer accessed the raw MCP trace directly.

### F6 exact owner-reported normalized keys and decisions

```tsv
no	candidate_fact_public_id	subject_key	relation_key	object_key	decision	material_differences
1	85e6d028-9602-44d3-8d17-0c83e5446e99	saturn	has_named_part_or_property	sixth_planet_from_sun	distinct	["other","relation"]
2	aaac577d-7cec-4b63-93a0-85097ed73327	fovea	is_located_in	center_of_macula	distinct	["other"]
3	6e48e9cf-73f3-41f3-8e7f-f2093030cdc7	pupil	is_located_in	center_of_iris	distinct	["other"]
4	a095c090-5a03-4ad2-83fe-502118647741	saturn_orbit	has_measurement	29_4_earth_years	distinct	["other","relation"]
5	55d5d80d-87f8-4a82-b6ba-f4db40a1c6a5	moonlight	has_named_part_or_property	reflected_sunlight_from_moon_surface	distinct	["other","relation"]
6	dfe147cc-0daf-4397-adf7-d25abcb994e4	houseplants with low light requirements	can_perform	grow in moderate or low indoor light	distinct	["other","relation"]
7	90cb132f-dc59-4292-8893-6863a07a6da6	waxing_moon	has_named_part_or_property	visible_sunlit_area_grows	distinct	["other","relation"]
8	1a26dcfd-fe3b-4d7e-b715-e9bfe42e2681	lunar_phase_cycle	has_count	named_lunar_phases	distinct	["other","relation"]
9	1e6fed79-0245-437d-8706-6c3d65a12650	iris	can_perform	control_pupil_light_entry	distinct	["other","relation"]
10	88a7f8c5-5f72-4887-be9a-1c59793a24a7	statue_of_liberty	is_located_in	liberty_island_new_york_harbor	distinct	["other"]
11	2402e7a5-c6c5-47ea-b96f-7dcad3113fb0	sharks	has_named_part_or_property	susceptible_to_cancer	distinct	["other","relation"]
12	b3d45773-c4da-4d0b-89ad-d011ff931f42	cornea	can_perform	refract_incoming_light	distinct	["other","relation"]
13	61c934e8-2ef8-4a70-94c3-50ff32e19dad	ancient_olympic_games	is_located_in	olympia_greece	distinct	["other"]
14	76f61ccf-8e65-45a5-9764-209609647db3	commercial_cut_flower_food	recommended_practice	mix_according_to_packet_directions_to_help_preserve_cut_blooms	distinct	["other","relation"]
15	0b3975bc-cb92-4d1d-b4cb-edb03a61ef9b	flamingo_chicks	behaves_as	join_large_chick_creches	distinct	["other","relation"]
16	a90f25cd-e3e1-4ee2-996a-f984ead0b6eb	yellowstone_national_park	has_named_part_or_property	continuous_bison_presence_since_prehistoric_times	distinct	["other","relation"]
17	99ac3c9c-5bb3-4adb-b5a4-9ffaa4967ace	meerkat_groups	behaves_as	recruitment_calls_during_snake_mobbing	distinct	["other","relation"]
18	624d3890-decf-4985-8970-496c05fa388e	north_american_porcupines	can_perform	shoot_quills	distinct	["other","relation"]
19	17b94e73-4287-4b28-9f84-428907088979	meerkat_helpers	behaves_as	remove_scorpion_stings_before_pup_provisioning	distinct	["other","relation"]
20	aac7d47a-749e-4aa0-93cc-ad82bc623b5e	thresher_sharks_alopias	can_perform	tail_slap_stuns_prey_fish	distinct	["other","relation"]
```

### Diagnostic tally after F6

- 8/8 per-fact READ result structures complete by tester report; **16** earlier READs (including eight redundant diagnostics), no READ added in this follow-up.
- `review_required:true` F6 reviewed **20/20**, F7 **0/20**. Across eight facts: **20/40 mandatory decisions complete** (remaining 20 are **unreviewed**, not classified `uncertain`).
- `READ_ORCHESTRATION: PASS_WITH_DEVIATION`; `SEMANTIC_REVIEW_COMPLETENESS: INCOMPLETE`; `RESERVATION_READINESS: HOLD`; `HOST_RUNTIME_VERIFICATION: UNVERIFIED`.
- **Next:** finish F7 ("Earth's atmosphere is mostly nitrogen") in the **same** eight-fact chat, using the already returned two complete F7 READs, without third READ, no fabricated keys, no Write. If evidence no longer inspectable, stop and mark BLOCKED.
- Keep Issue #56 OPEN and MAIN 30-case campaign PAUSED at **9/30**, without new MAIN attempt.
