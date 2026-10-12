# Checkpoint 5.6 — Draft writes, renderer and schedule integrity

Tanggal: 12 Oktober 2026. Baseline Git **6825175**, tetap tanpa commit baru.
Implementasi dan verifikasi lokal checkpoint **5.6 selesai**: **27 API RPC,
55 migration, 122/122 database tests lulus pada 28 file**. Scope tepat
`api.save_post`, `api.revise_post`, `api.reschedule_post` dan dependency privatnya.
Ini bukan completion seluruh Phase 5 atau audit independen final Batch B.

## 1. Rekonsiliasi handoff dan authority

`AGENTS.md`, implementation plan Phase 5 §14, runbook 5.6, CR-013 dan kontrak
renderer/post/module/DNA dibaca sebelum perubahan. Git status/diff, enam migration
dalam compact, helper dan seluruh empat suite post diperiksa. Frozen documents
dan migration applied dipertahankan.

Perbedaan nyata dengan compact:

- Enam migration yang dilaporkan memang applied lokal: total applied awal **52**.
- Repository juga memiliki migration ketujuh
  `20261012024443_enforce_phase_5_6_text_privacy.sql`, **belum applied** saat resume.
  CR-013 dan tes sudah mencantumkan typography/token guards miliknya. Migration
  ini diperiksa dan diterapkan lokal, bukan dibuat ulang.
- `api-post-save-revise.test.ts` juga memuat assertion token editorial yang belum
  diformat; ketiga file post yang relevan diformat dan diverifikasi.
- Klaim pass sesi sebelumnya diperlakukan sebagai historical context; laporan
  ini memakai eksekusi baru, termasuk clean reset dan full gate.

CR-013 Accepted menetapkan schedule-only ready → ready, exact historical replay
v6, immutable usage snapshots/current junction membership, canonical hash,
bounds, lock order dan public caller evidence. §7 mencatat resume reconciliation
sebelum kedua perbaikan additive baru. Profile pada DNA adalah preferred/default,
bukan exclusive format/profile matrix. Semantic format conformity tetap bagian
attestation `trivia.format_conformant`; tidak ada semantic inference baru.

## 2. Migration dan deliverables

Ada **9 migration additive Phase 5.6** terhadap baseline 46, seluruhnya applied
dan reproducible melalui clean reset:

| File di `supabase/migrations/`                             | Tujuan                                                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `20261011164409_phase_5_6_renderer_and_quality.sql`        | Canonical renderer, generation/editorial validation dan authoritative system evidence   |
| `20261011164412_phase_5_6_post_transaction_foundation.sql` | Current junctions, immutable usage, private history, replay v6, allocation/hash/locking |
| `20261011164415_phase_5_6_post_write_rpcs.sql`             | Tiga typed RPC, CAS, atomic plan completion dan linked schedule                         |
| `20261011165618_harden_phase_5_6_record_resolution.sql`    | Allocation alias/composite resolution                                                   |
| `20261011165728_qualify_phase_5_6_target_discovery.sql`    | Qualified target discovery                                                              |
| `20261011170544_close_phase_5_6_history_and_metrics.sql`   | Six-decimal replay ratio, closed history validation dan identity binding                |
| `20261012024443_enforce_phase_5_6_text_privacy.sql`        | Typography/artifact dan known reservation/claim-token guards; pending dari handoff      |
| `20261012025954_enforce_phase_5_6_schedule_evidence.sql`   | Missing/stale evidence denial untuk draft maupun ready sebelum rebinding                |
| `20261012030302_guard_phase_5_6_claim_source_privacy.sql`  | Known plan claim token tidak boleh masuk allocated source metadata                      |

Kedua migration terakhir dibuat melalui CLI setelah membaca help. Reproducible
function transformations memeriksa expected anchors dan mempertahankan
ownership, ACL, signatures, lock protocol dan public envelope v1.

Tes baru/lanjutan:

- `api-post-save-revise.test.ts`: **8 tests**.
- `api-post-render-quality.test.ts`: **5 tests**.
- `api-post-reschedule.test.ts`: **6 tests**.
- `api-post-concurrency.test.ts`: **5 tests**.
- `helpers/post-rpc.ts`: caller/fixtures/requests/cleanup; rollback state digest
  kini juga mencakup plan, item, events dan post-write history.
- `fixtures/post-render-v1.json`: dua golden styles dan enam exact boundary
  fixtures, dengan versions/provenance/reason metadata.
- `docs/phase-5-6-catalog-audit.sql`: satu SELECT read-only, token-free, local-only.

Existing security/read/page-plan/plan-lifecycle/trivia tests memperbarui exact
count/names menjadi 27 dan mempertahankan cumulative CR-012/013 column allowlist.
Operation map menunjuk suite reschedule yang sesuai. Tidak ada runtime MCP/Edge
TypeScript baru atau transport/business SQL mixing.

## 3. Behavior dan evidence yang benar-benar diuji

### Draft, allocation, replay dan rollback

- Public authenticated calls memakai owner `sub` dan OAuth `client_id` dari
  `request.jwt.claims`. Missing user/client, non-owner, direct table/sequence/
  helper access ditolak. Token-bearing SQL pada helper post dikirim melalui stdin
  dan error disanitasi.
- Save standalone dan save-from-plan, exact claim/schedule/config/fact set,
  atomic conversion, completed event dan original progress replay.
- Revise same-set, partial/full replacement, reorder dan re-addition memakai
  current junctions. Retained snapshots tidak berubah; superseded membership
  dilepas, re-addition membuat allocation baru. Ready revision kembali draft
  dan membatalkan approval melalui explicit content revision.
- Historical save/revise/reschedule replay menggunakan immutable exact response;
  same-key changed payload, corruption dan completion faults fail closed.
- Expired reservation/claim, stale config, wrong fact IDs, hash/revision CAS,
  malformed copy, oversized content dan terminal status tidak meninggalkan
  partial business/history/ledger mutation. Reservation failed save dapat dirilis.
- Public reverify dengan source metadata berisi known plan claim token kemudian
  public save ditolak VALIDATION_FAILED tanpa mutation. Setelah source diperbaiki
  melalui public reverify, reservation/claim yang sama berhasil disimpan.

### Renderer dan quality

- Persisted golden plain/numbered copy dan seluruh metrics dibandingkan exact.
  NFC, CRLF/trailing space normalization, Unicode/apostrophe/hyphen words,
  greedy wrapping, controls, emoji, zero-width, citation/markdown, URL, render
  mismatch dan metrics assertions tercakup.
- **20 public format/profile/style combinations**: lima formats × dua profiles ×
  dua styles berhasil menghasilkan draft dengan server-owned metrics/checks.
- Structural fact 90 versus 91 characters; readability 28 versus 29 lines;
  100 versus 101 words; estimated 32.5 versus 32.8 seconds; replay ratio **2.5**
  versus **2.523077** diuji dengan actual rendered metrics.
- Component pass/final overflow serta word/line/replay/loops overflow tetap
  persist sebagai failed draft evidence; tidak ditruncate dan tidak auto-ready.
- Editorial frozen 18-criterion IDs/severity, unknown/server-only fields,
  duplicates, missing criteria dan needs_review, hashtag duplication/#Viral serta
  caption URL denial diuji. Missing criteria menghasilkan pending draft.

### Schedule dan concurrency

- Linked move dan clear mengubah post/item bersama, termasuk completed output
  pada cancelled plan, tanpa membuka progress kembali. Hash/copy tetap sama.
- Ready reschedule tetap ready; evidence/approval revision dibawa maju tepat
  sekali, original evaluator/time/actor/intent tetap, dan before evidence tersimpan
  privat. Missing/stale draft evidence maupun stale ready approval ditolak.
- Archived post tetap menempati slot; terminal target tidak boleh reschedule.
- Duplicate save satu mutation + replay; competing revisions satu CAS winner.
- **Save versus cancel kedua commit orders** mempunyai legal atomic outcomes.
- **Opposite-direction two-slot reschedule** gagal aman karena occupancy, tanpa
  deadlock. Separate public move menunjukkan low numeric advisory key held saat
  high key waiting; identity/lineage locks juga diamati pada catalog.
- Save/revise versus correction kedua orders, lock timeout dan actual backend
  cancellation dengan rollback/same-key retry tercakup. Save conversion mengubah
  fact updated_at: correction request lama kalah exact CAS, fresh request setelah
  membaca timestamp baru dapat berhasil. CAS tidak dilonggarkan.
- PERF-WRITE mengukur **12 samples per operasi** save/revise/reschedule, termasuk
  local caller-process overhead, dan assertion **p95 < 3,000 ms** lulus pada
  focused dan kedua full-suite runs. Ini bounded local evidence, bukan benchmark
  cloud atau production scale; laporan tidak mengarang numeric p95 yang tidak
  ditampilkan reporter.

Renderer/helper-only deterministic assertions menggunakan admin inspection;
semua post/trivia domain actions dalam suite 5.6 memakai public authenticated
RPC. Ready/archived fixtures bersifat administratif karena public approval dan
publication lifecycle milik 5.7. Tidak ada klaim public approval proof.

## 4. Actual commands, failures dan recovery

| Eksekusi                                                 | Hasil aktual                                                                                                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial renderer/reschedule focused run                  | 7 pass, 1 fail sebelum pending typography migration applied                                                                                                      |
| Renderer/reschedule setelah pending migration            | **8/8 PASS**                                                                                                                                                     |
| New draft missing/stale evidence test sebelum fix        | FAIL: missing evidence tidak ditolak; additive correction lalu PASS                                                                                              |
| New claim-source privacy test sebelum fix                | FAIL: save tidak ditolak; additive correction lalu PASS                                                                                                          |
| Golden fixture pertama                                   | FAIL karena CTA dihitung 32 chars; independent recount `Share this with a curious friend.` = 33, total plain/numbered 80/86; fixture diperbaiki, exact test PASS |
| Focused lima files setelah semua perbaikan               | **25/25 PASS**, 106.92 s                                                                                                                                         |
| Targeted regressions pertama                             | Tool timeout 240 s; tidak diklaim pass; tidak ada test session aktif sesudahnya                                                                                  |
| Targeted regressions corrected file list/longer deadline | **65/65 PASS pada 8 files**, 675.50 s                                                                                                                            |
| Audit query pertama                                      | CLI prepared-statement multi-command denial; BEGIN/COMMIT wrappers dihapus, satu read-only SELECT kemudian berhasil                                              |
| Pre-reset audit                                          | Seluruh data bisnis 0; satu orphan fixture Auth user tersisa dari interrupted verification; final clean reset membersihkannya                                    |

Final gate dijalankan sebagai **satu urutan lengkap setelah focused/targeted
verification siap**, tanpa final-gate retry:

| Gate                                                                                               | Hasil aktual                                                                                                 |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm run supabase:reset`                                                                          | PASS: seluruh **55** migrations diterapkan ulang, no-op seed, containers restarted                           |
| `pnpm run check`                                                                                   | PASS: Prettier, ESLint, TypeScript dan **3/3 unit tests**                                                    |
| `pnpm run test-all`                                                                                | PASS: nested check, migration validation, **122/122 DB tests, 28 files**, 987.33 s                           |
| `pnpm run verify-migrations`                                                                       | PASS: **55** filenames valid                                                                                 |
| `pnpm run smoke-test`                                                                              | PASS: script menjalankan ulang DB suite, **122/122, 28 files**, 984.21 s                                     |
| `pnpm run supabase:verify`                                                                         | PASS: seluruh **55** local/applied versions cocok; CLI header “Remote” merujuk target lokal karena `--local` |
| `pnpm exec supabase db advisors --local --type security --fail-on error`                           | PASS: **No issues found**                                                                                    |
| `git diff --check`                                                                                 | PASS                                                                                                         |
| `pnpm exec supabase db query --local --file docs/phase-5-6-catalog-audit.sql --output-format json` | PASS setelah full gate; hasil §5                                                                             |

Smoke test mengulang suite melalui script existing sesuai perintah gate yang
diminta. Tidak ada perubahan implementasi setelah final gate; laporan ditambahkan
sesudah hasil tersedia dan formatting/diff diperiksa terpisah.

## 5. Final catalog dan cleanup

| Assertion                                                                     | Hasil                                                     |
| ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| Exact API inventory / authenticated EXECUTE                                   | **27 / 27**                                               |
| Allowlist difference / overload / unsafe API                                  | **0 / 0 / 0**                                             |
| PUBLIC/anon/service_role API execution                                        | **0**                                                     |
| Caller/PUBLIC internal helper execution                                       | **0 / 0**                                                 |
| Caller table / column / sequence privileges                                   | **0 / 0 / 0**                                             |
| PUBLIC table / sequence privileges                                            | **0 / 0**                                                 |
| RLS-enabled business/operational tables                                       | **15 / 15**                                               |
| API-owned tables / owner role memberships                                     | **0 / 0**                                                 |
| Owner login/superuser/bypassrls/inherit/schema CREATE                         | **Semua false**                                           |
| Missing owner SELECT policy / unsafe UPDATE policy / unsafe explicit defaults | **0 / 0 / 0**                                             |
| History SELECT/INSERT; UPDATE/DELETE/TRUNCATE                                 | **true/true; false/false/false**                          |
| History triggers                                                              | **post_history_immutable, post_history_validate enabled** |
| History bounds/token keys/current capability values                           | **0 / 0 / 0 violations**                                  |
| Ledger token keys / invalid v6 / incomplete ledger                            | **0 / 0 / 0**                                             |
| Fault functions / disabled business triggers                                  | **0 / 0**                                                 |
| Later-phase RPCs                                                              | **0**                                                     |

Final cleanup counts **semuanya 0**: workspaces, pages, configs, plans, items,
posts, metrics, facts, junctions, post history, reservation history, events,
ledger, rate buckets dan fixture users. Empty final token scans adalah cleanup
evidence; populated-history privacy/immutability/owner isolation dibuktikan oleh
public RPC tests, bukan disimpulkan hanya dari tabel kosong.

## 6. Stop boundary

Checkpoint 5.6 selesai dan berhenti di sini. Tidak ada Phase 5.7 implementation,
commit, push, deployment, cloud resource access, OpenAI/embedding/vector search,
Facebook/Canva API integration atau kerja di luar scope. Dokumen frozen dan
sembilan applied Phase 5.6 migrations tidak ditulis ulang. Independent Batch B
audit tetap mengikuti seluruh Batch B (sesudah 5.9); full editorial corpus dan
manual owner pilot review tidak diklaim lulus oleh checkpoint ini.
