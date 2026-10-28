# QA dedup Saturnus 7 fakta — READ-only

Diagnostic attempt; **not a MAIN editorial campaign case**, so the campaign count remains 9/30.

## Attempt 01 — blocked preflight

- Owner-reported PRIVATE Content Producer owner OAuth `mcpku2`, Page `f3984ee4-8ae7-4043-8c93-45765f82f46e`.
- Four successful Page/account/context READs were reported.
- Status `BLOCKED / RUNTIME_IDENTITY_UNVERIFIED`. No plugin build fingerprint in MCP responses; `module_version:1` is **not** plugin version.
- `trivia_find_similar_facts` 0/7; no analysis, reservation, post, or Write.
- Prompt was overly restrictive, requiring stop when the runtime build could not be identified. External Plugin Creator readback verifies account release `0.2.10`, not the exact runtime of a chat session.

## Attempt 02 — partial orchestration, incomplete semantic review

- Owner reports Page/owner verification successful; `HOST_RUNTIME_UNVERIFIED`. The installed account release is `0.2.10`, `pluginrel_6ae1b386802c8191a3ef8a55c5392bcf`; no independent host session fingerprint.
- One `trivia_find_similar_facts` candidate per call with `max_matches_per_candidate:20`, `request_schema_version:1`, `normalization_version:1`, `ontology_version:1`, `topic_key:nature_science` and `qualifiers.comparison_direction:none`.
- Seven initial calls (F1–F7), then targeted repeated READs for F2–F6 to make long responses inspectable. **12 READs, 7/7 owner-reported complete response structures**, 20 returned matches each. Raw 12-call traces not accessible to coordinator.
- **Verdict `BLOCKED / SEMANTIC_REVIEW_INCOMPLETE`.** Flags for F1, F2, F6 are `review_required:true`; remaining positions `false`. Full semantic decisions: **0/60**, despite three *preliminary* individual assessments.
- No `trivia_register_and_reserve_facts`, no `save_post`, no approval, publication, draft or business Write. No server error or evidence of backend defect.

| Candidate | Calls | Returned matches | review_required | Inspectable response (owner report) | Completed semantic decisions |
|---|---:|---:|---|---|---:|
| F1 | 1 | 20 | true | yes | 0/20 |
| F2 | 2 | 20 | true | yes | 0/20 |
| F3 | 2 | 20 | false | yes | 0/0 |
| F4 | 2 | 20 | false | yes | 0/0 |
| F5 | 2 | 20 | false | yes | 0/0 |
| F6 | 2 | 20 | true | yes | 0/20 |
| F7 | 1 | 20 | false | yes | 0/0 |
| TOTAL | 12 | 140 | 3 true | 7/7 | 0/60 |

### Preliminary individual match judgments (NOT 60 completed decisions)

- F1 existing `6aaf4eb2-5f6b-48e5-b399-9d83aa63303b`: `distinct` (hydrogen/helium composition not the same proposition as gas giant classification).
- F2 existing `5b5744d0-d6f9-4c27-b4d3-a1d5ba830ff6`: `uncertain` (ice/rock composition not sufficient to demonstrate abundance of water ice).
- F6 existing `fa40c202-51c4-4464-b2b6-88577a8a4572`: `same` meaning (north polar hexagon). All are preliminary interpretations from tester report, **not** final semantic reviews.

Repeat READs on F3–F5 may be justifiable if their first views were clipped, even though final `review_required:false`; raw first-view trace is needed to assess necessity. Do not count repeats alone as endpoint failure.

### Next safe step

Continue in the **existing diagnostic QA chat**, if the 20-match result structures remain available, to review **F1, F2, F6**, each against all 20 match IDs, with exact evidence-based same/distinct/uncertain and material differences where supported. Work one fact per response to avoid truncation. Do not invent IDs, classify unknown matches as distinct, or force uncertain decisions. Only repeat a per-fact READ if the material candidate fields are no longer inspectable, and never lower the top-20 limit.

Do not start a new 8-fact diagnostic or MAIN case 10 until triage of this 60-review backlog. If all decisions complete, evaluate 7-fact READ-only verdict and only then plan the new 8-fact QA. **Do not perform any Write.** Keep Issue #56 OPEN and the 9/30 editorial campaign PAUSED pending verified host behavior.

## F1 semantic review, follow-up — owner reported 20 decisions

- Same Saturn attempt 02, READ-only, using earlier F1 result. Tester reported **20/20 individual judgments**, all `distinct`, zero `same`, zero `uncertain`. Additional READs **0**, business Writes **0**.
- Reviewer status: **NEEDS_CORRECTION / MATERIAL_DIFFERENCE_VALIDATION_INCOMPLETE**. All 20 claims and existing fact IDs were presented, but corresponding structured match cells rendered literal placeholders `{r.subject}`, `{r.relation}`, `{r.object}`. Structured-key comparisons cannot be independently substantiated from these displayed values. This is not an accusation of fabricated IDs.
- The submitted `material_differences` for match **#4** (Saturn day, ID `fefafb0d-ff07-4d81-8a25-b49a0b91d6a2`) and match **#7** (Saturn orbital period, ID `a095c090-5a03-4ad2-83fe-502118647741`) each included `"estimate"`. This label is **not listed** among allowed material-difference labels in plugin v0.2.10 dedup ontology; estimate/range can inform the reason, but must not be sent as an unsupported `material_differences` label.
- Reviewer cannot affirm whether all other labels (`relation`, `other`, `number`, `unit`, `scope`, `location`, `method`) match actual structured differences from the rendered report. The two explicit `is_classified_as` pairs (#8 Antarctica, #19 Ancient Games) appropriately omitted `relation` on the claimed structured keys, subject to actual data verification.
- Count distinction: 20/20 semantic decisions **authored and owner-reported** for F1; **0/20 fully validated against actual structured match fields by coordinator**. This is not F1 PASS under the pre-Write contract. F2/F6 remain 0/20 authored decisions each. Overall 60-decision requirement remains **not verified**.
- Next: in the **same QA chat**, re-audit F1 by showing concrete `candidate_key`, `candidate_fact_public_id`, `subject_key`, `relation_key`, `object_key` and relevant qualifier values for the exact match IDs; remove unsupported `estimate` and revise only labels that actual fields justify. No new READ if originals remain inspectable; otherwise at most one one-candidate F1 READ (top-20), then fail closed if still unreadable. Output final 20-row decision audit. No registration/reservation or other Write.
- No host/runtime fingerprint was obtained, no claim of backend defect or #56 FIXED. MAIN campaign still PAUSED at 9/30.

## F1 correction audit, second follow-up — semantic labels fixed; unresolved field rendering

- Tester again reports **20/20 F1 `distinct` judgments**, 0 `same`, 0 `uncertain`; two labels modified for #4 and #7, removing unsupported `estimate` from `material_differences`. No additional READ or business Write.
- All **label types** now belong to the allowed v0.2.10 ontology list; #8 and #19 appropriately omit `relation` *if* their claimed existing `relation_key` equals candidate `is_classified_as`. Numeric/qualifier differences #4 and #7 are described but exact existing structured identity still requires verification.
- **Critical remaining evidence gap:** despite user's statement that actual fields are displayed, all 20 existing-match field cells visibly contain literal placeholder strings `{r[1]}`, `{r[2]}`, `{r[3]}`, not real `subject_key`, `relation_key`, `object_key` values. Therefore the coordinator **cannot independently validate** 18 `relation` claims, 20 `other` claims or qualifier differences against structured keys. This is a presentation/verification blocker; it does not establish that match IDs or semantic reasoning were fabricated.
- **Verdict:** `F1_AUTHORED_20_OF_20; MATERIAL_LABEL_ENUM_CORRECTED; STRUCTURED_DIFFERENCE_EVIDENCE_BLOCKED`. Tester declares F1 PASS, but external coordinator withholds contract-level PASS pending visible literal field values. Overall attempt 02 remains BLOCKED; F2/F6 have 0/20 completed decisions. No changes to MAIN campaign 9/30, #56 OPEN.

### Exact F1 fact IDs and proposed difference labels (owner-reported)

| # | Existing fact ID | Proposed labels, all `distinct` |
|---|---|---|
| 1 | `6aaf4eb2-5f6b-48e5-b399-9d83aa63303b` | `relation,other` |
| 2 | `85e6d028-9602-44d3-8d17-0c83e5446e99` | `relation,other` |
| 3 | `ec2d76e3-7e3d-4f41-88fe-ef81d34653b8` | `relation,other` |
| 4 | `fefafb0d-ff07-4d81-8a25-b49a0b91d6a2` | `relation,other,number,unit` |
| 5 | `5b5744d0-d6f9-4c27-b4d3-a1d5ba830ff6` | `relation,other` |
| 6 | `fa40c202-51c4-4464-b2b6-88577a8a4572` | `relation,other` |
| 7 | `a095c090-5a03-4ad2-83fe-502118647741` | `relation,other,number,unit,scope` |
| 8 | `658c7001-0743-4bb5-8a56-d2cab432fa69` | `other` |
| 9 | `f1a47230-3725-49a3-95a6-18327021223c` | `relation,other,location,scope` |
| 10 | `6adaf535-e154-499a-be7a-30489c52f7c5` | `relation,other` |
| 11 | `fd8dcda0-0251-463f-a26f-ef578614653c` | `relation,other` |
| 12 | `4256034e-f0ff-4dcd-88a6-182c17bdda8a` | `relation,other,number` |
| 13 | `2d91d7b2-ffab-4d1f-8889-eab872e33b25` | `relation,other` |
| 14 | `aaac577d-7cec-4b63-93a0-85097ed73327` | `relation,other` |
| 15 | `b24bab00-31e7-4080-94db-fe8d7f1c68f4` | `relation,other` |
| 16 | `6e48e9cf-73f3-41f3-8e7f-f2093030cdc7` | `relation,other` |
| 17 | `c08094f7-41b1-4f3f-839d-0da637b76a6c` | `relation,other` |
| 18 | `d73f1c3c-1724-483a-be1f-34ba147dd016` | `relation,other,method,scope` |
| 19 | `4252592f-dd41-4f21-9bb3-fb575a8886e5` | `other` |
| 20 | `471239ff-5139-4b2e-b74a-82cbfee02d11` | `relation,other,location` |

This table preserves the proposed labels for audit, **not** actual existing `subject_key`/`relation_key`/`object_key` values and not any server acceptance. The 20 existing field triplets were not rendered, only placeholder syntax appeared. One more **bounded, READ-only** serialization audit of the 20 existing triplets in a literal code block in the same tester chat is warranted. Do not issue new READ if the original match objects remain inspectable; if unavailable, a single one-fact F1 READ at top-20 is allowed, otherwise STOP. Do not request new semantic rationale, register, reserve, save or publish.

## F1 field-triplet serialization follow-up — main structured differences verified

Owner-provided CSV of all 20 existing fact ID, subject, relation, and object key triplets resolves the prior placeholder-rendering blocker. Coordinator compared these literal values with F1 proposed `saturn / is_classified_as / gas_giant`, and checked all 20 IDs occur in the previous F1 match/label inventory:

- 20 distinct existing IDs, order #1–#20 consistent.
- `relation`: justified on **18/18** match labels (relation differs from `is_classified_as`); #8/#19 correctly omit it.
- `other`: justified on **20/20** match labels (every object differs from `gas_giant`). 18 existing subjects differ from `saturn`; #1/#2 retain the same subject.
- All semantic outcomes remain `distinct`; the unsupported `estimate` label on #4/#7 was removed in the previous correction. No new READ or business Write.
- **Scoped F1 verdict: PASS for semantic review and visible `subject_key`/`relation_key`/`object_key` label validation (owner-reported evidence).** Other labels `number`, `unit`, `scope`, `location`, `method` still rely on earlier tester-reported normalized number/qualifier fields; this CSV alone is not a complete independent audit of every qualifier or evidence of server acceptance. Retain distinction between tester claim and coordinator-validated visible fields.
- F2 and F6 each still require 20 semantic match decisions. **Overall Saturn 7-fact diagnostic remains BLOCKED**; Issue #56 OPEN, MAIN campaign 9/30 PAUSED.

### Exact owner-reported structured triplets

```csv
no,candidate_fact_public_id,subject_key,relation_key,object_key
1,6aaf4eb2-5f6b-48e5-b399-9d83aa63303b,saturn,has_named_part_or_property,hydrogen_helium_composition
2,85e6d028-9602-44d3-8d17-0c83e5446e99,saturn,has_named_part_or_property,sixth_planet_from_sun
3,ec2d76e3-7e3d-4f41-88fe-ef81d34653b8,saturn_surface,has_named_part_or_property,lacks_true_solid_surface
4,fefafb0d-ff07-4d81-8a25-b49a0b91d6a2,saturn_rotation,has_measurement,10_7_hours
5,5b5744d0-d6f9-4c27-b4d3-a1d5ba830ff6,saturn_rings,has_named_part_or_property,ice_and_rock_particles
6,fa40c202-51c4-4464-b2b6-88577a8a4572,saturn_north_pole,has_named_part_or_property,hexagonal_jet_stream
7,a095c090-5a03-4ad2-83fe-502118647741,saturn_orbit,has_measurement,29_4_earth_years
8,658c7001-0743-4bb5-8a56-d2cab432fa69,antarctica,is_classified_as,desert
9,f1a47230-3725-49a3-95a6-18327021223c,statue_of_liberty,originated_in_time_place,gift_from_people_of_france_to_united_states
10,6adaf535-e154-499a-be7a-30489c52f7c5,grand_canyon_national_park,is_located_in,northwestern_arizona
11,fd8dcda0-0251-463f-a26f-ef578614653c,sea_turtles,has_named_part_or_property,air_breathing_lungs
12,4256034e-f0ff-4dcd-88a6-182c17bdda8a,african_savanna_vs_asian_elephant_foreheads,has_count,prominent_head_domes_african_1_asian_2
13,2d91d7b2-ffab-4d1f-8889-eab872e33b25,female_sea_turtles,behaves_as,nesting_on_sandy_beaches
14,aaac577d-7cec-4b63-93a0-85097ed73327,fovea,is_located_in,center_of_macula
15,b24bab00-31e7-4080-94db-fe8d7f1c68f4,antarctic_glaciers,can_perform,extend_over_sea_to_form_ice_shelves
16,6e48e9cf-73f3-41f3-8e7f-f2093030cdc7,pupil,is_located_in,center_of_iris
17,c08094f7-41b1-4f3f-839d-0da637b76a6c,developing_sea_turtles,affects,sex_determined_by_incubation_temperature
18,d73f1c3c-1724-483a-be1f-34ba147dd016,sand_tiger_shark_carcharias_taurus,can_perform,swallow_air_into_stomach_for_buoyancy
19,4252592f-dd41-4f21-9bb3-fb575a8886e5,ancient_olympic_games,is_classified_as,religious_festival_honoring_zeus
20,471239ff-5139-4b2e-b74a-82cbfee02d11,old_faithful_geyser,is_located_in,upper_geyser_basin_yellowstone
```

The `F1` source candidate is `saturn / is_classified_as / gas_giant`. No new `trivia_find_similar_facts` call was performed in this follow-up; no request was sent to any reservation validator.

## F2 semantic review follow-up — all 20 assessed, 1 uncertain

**Evidence level:** LIVE_OWNER_REPORTED, raw MCP response not independently accessible. User's F2 candidate: `saturn_rings / has_named_part_or_property / water_ice_abundant` ("Saturn's rings contain abundant water ice"). Result reported `review_required:true`, 20/20 matches with IDs and structured keys. One additional one-fact F2 `trivia_find_similar_facts` READ at top-20; cumulative diagnostic READs **13** (previously 12). No business Write.

- All **20/20 matches assessed**: 19 `distinct`, **1 `uncertain`** (#1), 0 `same`. The F2 qualifier/source decision is deliberately not forced to become `same` or `distinct`.
- F2 #1: existing fact ID `5b5744d0-d6f9-4c27-b4d3-a1d5ba830ff6`, existing `saturn_rings / has_named_part_or_property / ice_and_rock_particles`, text "Saturn's rings contain countless pieces of ice and rock." Claim shares subject/relation with the proposed claim but does not explicitly specify water ice abundance. Object difference alone is insufficient to establish distinct meaning, and incomplete specificity precludes a confident same. **`uncertain`, hold before reservation.**
- For 19 `distinct` rows, the coordinator cross-checked visible primary-key differences: each `relation` label aligns with a different `relation_key`; each `other` aligns with a different subject or object key. All proposed label names belong to v0.2.10 allowed set; no unsupported `estimate`. Numeric/unit/qualifier details are based on tester's assertions and are **not** an independently verified raw tool/validator trace.
- **Verdict F2: `BLOCKED / SEMANTIC_UNCERTAIN` with correct fail-closed handling.** No `trivia_register_and_reserve_facts`, `save_post`, approval, or publication. Distinguish this intentional semantic-policy hold from a failure of the dedup READ tool.
- QA progression: F1 scoped PASS (20 distinct); F2 **20 match decisions assessed**, with 19 final distinct + 1 unresolved uncertain; F6 (20 match review) still pending. The 7-fact QA **not PASS**. Safe next diagnostic: finish F6 review READ-only, preserving F2 uncertain. The campaign remains **PAUSED 9/30**, #56 OPEN. Host/session fingerprint still UNVERIFIED.

### Exact owner-reported F2 keys and decisions

```tsv
no	candidate_fact_public_id	subject_key	relation_key	object_key	decision	material_differences
1	5b5744d0-d6f9-4c27-b4d3-a1d5ba830ff6	saturn_rings	has_named_part_or_property	ice_and_rock_particles	uncertain	-
2	ddcbe303-1374-4731-8659-7d9ad396662f	camels	has_named_part_or_property	humps_store_fat_not_water	distinct	other,population
3	5b16b774-8233-4cfc-852c-ffdb9b8e0551	raspberries_storage_container_depth	recommended_practice	use_shallow_container_to_avoid_crushing	distinct	relation,other,condition,scope
4	17aeab85-8acb-4115-a82b-d8e9dada6b17	submerged_cut_flower_leaves	recommended_practice	remove_leaves_below_waterline_to_prevent_rot_and_cloudy_vase_water	distinct	relation,other,condition,method,scope
5	fa40c202-51c4-4464-b2b6-88577a8a4572	saturn_north_pole	has_named_part_or_property	hexagonal_jet_stream	distinct	other
6	fefafb0d-ff07-4d81-8a25-b49a0b91d6a2	saturn_rotation	has_measurement	10_7_hours	distinct	relation,other,number,unit
7	6aaf4eb2-5f6b-48e5-b399-9d83aa63303b	saturn	has_named_part_or_property	hydrogen_helium_composition	distinct	other
8	dc6f3ebe-2528-445f-bb47-b0d5b2e70018	sharks	has_named_part_or_property	cartilaginous_skeleton_no_true_bone	distinct	other,scope
9	b24bab00-31e7-4080-94db-fe8d7f1c68f4	antarctic_glaciers	can_perform	extend_over_sea_to_form_ice_shelves	distinct	relation,other
10	2d91d7b2-ffab-4d1f-8889-eab872e33b25	female_sea_turtles	behaves_as	nesting_on_sandy_beaches	distinct	relation,other
11	61c934e8-2ef8-4a70-94c3-50ff32e19dad	ancient_olympic_games	is_located_in	olympia_greece	distinct	relation,other
12	a095c090-5a03-4ad2-83fe-502118647741	saturn_orbit	has_measurement	29_4_earth_years	distinct	relation,other,number,unit,scope
13	b6b698ea-1623-4880-a49f-9a0737e029be	octopus	has_named_part_or_property	blue_copper_hemocyanin_blood	distinct	other
14	ec2d76e3-7e3d-4f41-88fe-ef81d34653b8	saturn_surface	has_named_part_or_property	lacks_true_solid_surface	distinct	other
15	85e6d028-9602-44d3-8d17-0c83e5446e99	saturn	has_named_part_or_property	sixth_planet_from_sun	distinct	other
16	2bc9391c-c8f1-46ea-80ed-ba92fbdae0bf	cut_flower_vase_water	recommended_practice	change_water_every_few_days_to_limit_bacterial_buildup	distinct	relation,other,time,condition,method,scope
17	4861c95f-fa4d-4875-b7f0-3bbb5969b7ee	adult_flamingos	behaves_as	some_adults_guard_creche_chick_groups	distinct	relation,other,population,condition
18	d208c10f-42d8-4084-b018-5140ee9872e2	migratory_bats	behaves_as	winter_migration	distinct	relation,other
19	65ab08d7-8e64-46f3-bf27-eb00a5c30685	octopus	can_perform	move_by_jet_propulsion_through_siphon	distinct	relation,other,method
20	74773b31-6b37-4f11-8b0e-4f2f3f4c0399	cut_flower_vase	recommended_practice	wash_with_soapy_water_before_use_to_reduce_stem_clogging_bacteria	distinct	relation,other,condition,method,scope
```

The table is a structured summary of the tester's visible report, **not** an independent direct MCP response. F2-specific qualifier claims include the numeric `10.7 hour` rotation and `29.4 year` orbital-period matches, plus population/condition/method/scope/time on other matches. These fields have not been server-validated in a reservation.
