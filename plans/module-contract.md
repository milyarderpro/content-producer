# Module Contract — Content Producer

## 1. Informasi dokumen

| Bagian | Keterangan |
|---|---|
| Nama produk | Content Producer |
| Versi produk | MVP |
| Versi dokumen | 1.0 |
| Status | Frozen — baseline kontrak modul Phase 0 |
| Tanggal keputusan | 7 Oktober 2026 |
| Langkah Phase 0 | 0.6 — Module contract |
| Modul implementasi MVP | `trivia` |

Dokumen ini menetapkan kontrak yang wajib dipenuhi setiap modul niche. Kontrak ini menjaga agar core tetap generik tanpa memaksa niche baru memakai model fakta, deduplikasi, sumber, atau format milik trivia.

Detail editorial trivia, termasuk topic pillars, lima format, profiles, hook, CTA, caption, ontology, rubric, examples, dan anti-examples, ditetapkan secara terpisah dalam `plans/trivia-content-dna.md` pada langkah 0.7.

---

## 2. Kedudukan dan sumber keputusan

Kontrak ini mengikuti:

1. Tujuan, scope, dan acceptance criteria pada `plans/PRD.md`.
2. Model relasi dan invariant pada `plans/database-design.md`.
3. Keputusan `AUTH-*`, `PLATFORM-*`, `CORE-*`, `FACT-*`, dan `QUALITY-*` yang telah diterima pada `plans/phase-0-decision-register.md`.
4. Urutan implementasi pada `plans/implementation-plan.md`.

Jika kontrak ini mengungkap konflik dengan dokumen terdahulu, konflik dicatat pada decision register dan diselesaikan sebelum Phase 0 dibekukan. Sinkronisasi penuh ke PRD, database design, implementation plan, dan workflow telah dilakukan pada langkah 0.11.

Kontrak ini tidak membuat migration, source code, deployment, atau resource cloud.

---

## 3. Tujuan kontrak

Setiap modul niche wajib menyediakan cara yang konsisten untuk:

- Mendaftarkan identitas dan versi modul.
- Memvalidasi konfigurasi satu Page untuk niche tersebut.
- Mendefinisikan topic, format, profile, dan interaction goal yang sah.
- Menghasilkan dan memvalidasi payload post berversi.
- Merender public copy secara deterministik.
- Menghitung system checks dan menerima editorial attestation secara aman.
- Menjelaskan kebutuhan deduplikasi dan reusable library bila ada.
- Menjalankan reservation/release bila reusable item dapat berbenturan antarproses.
- Menetapkan source dan attribution policy.
- Menyediakan dimensi performa yang dapat dianalisis.
- Menyediakan fixtures yang membuktikan perilaku modul.
- Membaca histori versi lama tanpa mengubah maknanya secara diam-diam.

Kontrak tidak mewajibkan semua niche memiliki library reusable. Modul motivation, misalnya, dapat menyimpan hasil hanya pada `posts` selama tidak membutuhkan canonical item, reuse enforcement, atau lineage khusus.

---

## 4. Batas core dan modul

### 4.1 Tanggung jawab core

Core bertanggung jawab atas:

- Workspace dan owner identity.
- Page, locale, timezone, target market, dan konfigurasi platform.
- Niche registry dan status modul.
- Page+niche configuration storage.
- Content plan, plan item, claim lease, dan recovery.
- Post identity, Page+niche scope, lifecycle, schedule, dan revision.
- Idempotency ledger, request fingerprint, locks, dan error envelope.
- Generic quality state dan explicit owner approval.
- Metrics snapshot serta dimensi analytics bersama.
- OAuth, authorization, RLS, privilege, rate limit, dan logging boundary.
- MCP transport dan dispatch ke operasi modul yang terdaftar.

Core tidak boleh:

- Menafsirkan struktur `body` niche tanpa validator modul.
- Menganggap semua niche memiliki facts, quotes, claims, atau reusable items.
- Menaruh foreign key polymorphic ke item niche.
- Menggunakan JSON payload sebagai pengganti relasi yang membutuhkan integritas referensial.
- Menjalankan code atau SQL yang berasal dari config database.
- Mengubah keputusan editorial menjadi fakta deterministik.

### 4.2 Tanggung jawab modul niche

Modul bertanggung jawab atas:

- Schema konfigurasi dan default yang terversi.
- Schema payload dan body niche yang terversi.
- Registry topic, format, profile, renderer, rubric, dan check IDs.
- Instruksi generasi yang relevan untuk niche.
- Validator format, output, dan evidence niche.
- Renderer serta text/readability metrics.
- Deduplikasi, reusable library, junction, reservation, dan lineage bila diperlukan.
- Source, freshness, attribution, dan sensitive-topic policy.
- Performance dimensions khusus niche.
- Fixtures dan expected results.
- Compatibility reader untuk versi historis yang masih disimpan.

### 4.3 Matriks kepemilikan

| Concern | Core | Modul niche |
|---|---:|---:|
| Owner/workspace/Page authorization | Utama | Tidak boleh melemahkan |
| Post lifecycle dan revision | Utama | Menyediakan validation hooks |
| Config storage | Menyimpan envelope | Memvalidasi isi |
| Content payload storage | Menyimpan envelope | Memvalidasi isi/body |
| Canonical rendering | Menegakkan equality | Mendefinisikan renderer |
| Generic quality state | Utama | Menyediakan checks/rubric |
| Reusable library | Tidak mengasumsikan | Opsional, dimiliki modul |
| Deduplikasi semantik | Mengorkestrasi batas aman | Mendefinisikan candidate contract |
| Sumber/atribusi | Menyimpan envelope/snapshot | Mendefinisikan policy |
| Metrics dasar | Utama | Menambah dimensi tervalidasi |
| Tool transport/auth | Utama | Menyediakan domain operation |
| Editorial writing/research | ChatGPT | Instruksi dan rubric modul |

---

## 5. Identitas dan descriptor modul

Setiap modul mempunyai descriptor statis dalam source code. Descriptor tidak dimuat sebagai executable code dari database.

### 5.1 Field wajib

```text
niche_key
display_name
module_version
active_config_schema_version
supported_config_schema_versions[]
active_content_schema_version
supported_content_schema_versions[]
renderer_versions[]
active_renderer_version
quality_gate_versions[]
active_quality_gate_version
editorial_rubric_versions[]
active_editorial_rubric_version
capabilities
format_registry
topic_registry
profile_registry
interaction_goal_registry
performance_dimensions
fixture_manifest_version
```

### 5.2 Aturan identitas

- `niche_key` stabil, lowercase snake case, dan cocok dengan `niches.key`.
- `niche_key` tidak boleh digunakan kembali untuk modul dengan arti berbeda.
- `module_version`, `config_schema_version`, dan `content_schema_version` berupa integer monotonik mulai dari 1.
- Versi aktif harus termasuk dalam daftar versi yang didukung.
- Registry database diubah melalui migration, bukan tool percakapan.
- Menonaktifkan modul tidak menghapus Page config, post, relasi, atau metrics historis.
- Satu post dan satu content plan selalu memiliki tepat satu `niche_key`.

### 5.3 Capability flags

Descriptor menyatakan capability berikut secara eksplisit:

```text
has_reusable_library
requires_deduplication
requires_reservation
requires_item_junction
requires_sources
supports_source_freshness
supports_correction_lineage
supports_item_reuse_policy
supports_module_specific_metrics
```

Invariant capability:

- `requires_reservation` mensyaratkan `has_reusable_library`.
- `requires_item_junction` mensyaratkan tabel junction niche dengan foreign key nyata.
- `supports_correction_lineage` mensyaratkan histori immutable atau successor relation yang dapat diaudit.
- Capability `false` harus menghasilkan no-op yang eksplisit atau jalur tanpa operasi, bukan pemanggilan tabel modul lain.
- Menyalakan capability baru yang mengubah persistence atau lifecycle adalah perubahan breaking dan memerlukan migration serta kenaikan `module_version`.

---

## 6. Kontrak versioning dan compatibility

### 6.1 Jenis versi

| Versi | Mengontrol |
|---|---|
| `module_version` | Implementasi agregat, capabilities, dan behavior modul |
| `config_schema_version` | Bentuk dan arti Page+niche config |
| `content_schema_version` | Bentuk dan arti post payload |
| `renderer_version` | Normalisasi, layout, dan canonical rendering |
| `quality_gate_version` | System check IDs, severity, dan threshold |
| `editorial_rubric_version` | Criteria serta severity editorial |
| `source_policy_version` | Source types, freshness, dan attribution rules |
| `dedup_contract_version` | Normalization, identity, ontology, dan candidate policy |
| `fixture_manifest_version` | Struktur serta expected result fixture |

### 6.2 Aturan compatibility

- Write baru selalu memakai versi aktif, kecuali operasi migration/reconciliation yang eksplisit.
- Read wajib mendukung seluruh versi historis yang masih tersimpan atau mengembalikan error `MODULE_VERSION_UNSUPPORTED` tanpa menafsirkan data secara tebakan.
- Perubahan yang mengubah arti field, renderer output, check result, dedup identity, atau source eligibility wajib menaikkan versi terkait.
- Penambahan optional field dapat tetap compatible hanya jika default dan arti historis tidak berubah.
- Field tidak boleh dihapus dari reader selama row historis masih menggunakannya.
- Migration versi tidak boleh mengubah snapshot post `posted` atau `archived`.
- Backfill harus idempotent, terukur, dan menyimpan versi asal serta tujuan.
- Dua versi dedup identity aktif dalam satu workspace dilarang kecuali ada migration plan yang mengendalikan write freeze dan collision adjudication.
- Format/topic/profile key yang sudah muncul pada post historis tidak boleh digunakan kembali dengan arti lain.

### 6.3 Compatibility matrix

Setiap modul wajib mempunyai matrix yang memetakan:

```text
module_version
  -> supported config schema versions
  -> supported content schema versions
  -> compatible renderer versions
  -> compatible quality gate versions
  -> compatible rubric versions
  -> compatible source/dedup policy versions
```

Matrix diuji pada startup/build dan fixture suite. Registry yang menunjuk kombinasi tidak didukung harus fail closed.

---

## 7. Kontrak konfigurasi Page+niche

### 7.1 Envelope

Core menyimpan:

```text
workspace_id
page_id
niche_key
config_schema_version
config
is_enabled
is_default
created_at
updated_at
```

`config_schema_version` pada row adalah authority versi. Jika config memuat mirror version untuk kebutuhan ekspor, nilainya wajib identik; mismatch ditolak.

### 7.2 Kewajiban schema modul

Schema konfigurasi modul wajib mendefinisikan:

- Allowed formats dan aturan bobot/selection bila relevan.
- Allowed topics/topic groups dan aturan bobot bila relevan.
- Profiles serta batas outputnya.
- Allowed interaction goals.
- Renderer dan rendering options yang didukung.
- Text/readability budget.
- Locale, tone, style, emoji, dan regional-language policy.
- Source serta sensitive-topic policy.
- Dedup/reuse/reservation policy bila capability aktif.
- Performance dimensions yang boleh dipakai.
- Default lengkap untuk setiap field optional.
- Minimum, maksimum, enum, array bounds, dan unknown-key policy.

Schema boleh memakai nama field spesifik niche. Core tidak membaca field tersebut secara langsung; core memanggil validator/projection modul.

### 7.3 Normalisasi dan penyimpanan

- Input config dianggap tidak tepercaya.
- Validator menolak unknown key kecuali schema version secara eksplisit mengizinkannya.
- Default diterapkan sebelum penyimpanan sehingga stored config bersifat materialized dan deterministik.
- Enum/key dinormalisasi hanya melalui mapping yang terdokumentasi; typo tidak boleh diam-diam menjadi nilai lain.
- Bobot harus tervalidasi dan menghasilkan total yang diwajibkan modul.
- Config harus membuktikan bahwa minimum output dapat memenuhi hard rendering budget.
- Config update memakai `expected_revision` atau concurrency contract ekuivalen.
- Perubahan config hanya berlaku untuk generasi/revisi yang secara eksplisit memakai versi baru.
- Post historis mempertahankan generation snapshot yang digunakan ketika disimpan.
- Config yang tidak didukung tidak boleh diaktifkan.

### 7.4 Projection wajib

Validator modul harus dapat menghasilkan projection terstruktur bagi core dan ChatGPT:

```text
niche_key
config_schema_version
allowed_format_keys[]
allowed_topic_keys[]
allowed_profile_keys[]
allowed_interaction_goals[]
active_renderer_version
hard_output_limits
source_mode
dedup_mode
reuse_mode
generation_defaults
```

Projection tidak boleh berisi secret, internal SQL identifier, atau executable instruction dari user-controlled data.

---

## 8. Kontrak topic, format, profile, dan interaction goal

### 8.1 Registry key

- Key stabil, lowercase snake case, dan unik dalam modul.
- Label dapat berubah tanpa mengubah key.
- Key historis dideprecate, tidak digunakan ulang.
- Alias hanya untuk input normalization dan tidak disimpan sebagai canonical key.

### 8.2 Format definition

Setiap format wajib mendefinisikan:

```text
format_key
display_name
purpose
allowed_topic_keys atau rule
allowed_profile_keys atau rule
required_body_shape
generation_constraints
renderer_key
system_check_ids[]
editorial_criterion_ids[]
example_fixture_ids[]
anti_example_fixture_ids[]
status: active | deprecated
```

Format bukan sekadar label prompt. Format harus memengaruhi body shape, generation constraint, renderer, rubric, atau fixture secara terukur.

### 8.3 Profile definition

Profile mendefinisikan preferred ranges dan/atau hard limits seperti jumlah item, panjang unit, total kata, density, atau pacing. Preferred range menghasilkan warning kecuali schema modul menetapkannya sebagai blocking. Hard limit selalu dihitung server-side.

### 8.4 Interaction goal

Interaction goal adalah enum tervalidasi yang memandu CTA dan analytics. Interaction goal tidak membenarkan deceptive engagement bait. Penambahan goal baru memerlukan definition, CTA policy, rubric coverage, dan fixture.

---

## 9. Kontrak content payload

### 9.1 Core envelope post

Field berikut berada di core row dan tidak boleh diduplikasi sebagai sumber kebenaran di body niche:

```text
workspace_id
page_id
niche_key
content_plan_item_id
format_key
topic_key
interaction_goal
content_schema_version
status
scheduled_at
revision
```

### 9.2 Public content envelope

Semua modul MVP yang menghasilkan static information Reel memakai envelope:

```json
{
  "schema_version": 1,
  "hook": "...",
  "body": {},
  "cta": "...",
  "canva_copy": "...",
  "caption": "...",
  "hashtags": [],
  "render_style": "...",
  "text_metrics": {}
}
```

Aturan:

- `schema_version` harus sama dengan `posts.content_schema_version`.
- `body` dimiliki dan divalidasi modul niche.
- Hook, CTA, caption, hashtag, dan render style mengikuti config snapshot dan schema modul.
- `canva_copy` adalah output renderer server, bukan teks bebas yang dipercaya dari caller.
- `text_metrics` dihitung server-side dari hasil canonical renderer.
- Payload tidak berisi source URL, database internal ID, auth data, token, prompt, chain-of-thought, atau diagnostic trace.
- Public ID boleh muncul hanya bila memang bagian pengalaman pengguna, bukan sebagai relasi domain.
- ID item niche di JSON tidak menggantikan junction/foreign key.
- Unknown field ditolak kecuali content schema version mengenalnya.
- Array dan string mempunyai bound eksplisit dalam schema modul.
- Draft boleh gagal quality gate, tetapi payload tetap harus valid secara struktural dan aman.

### 9.3 Body niche

Schema `body` wajib menentukan:

- Unit output dan urutannya.
- Required serta optional fields.
- Hubungan wording publik dengan canonical item bila reusable library aktif.
- Batas item, panjang, dan nested depth.
- Larangan klaim/atribusi tambahan yang tidak mempunyai evidence.
- Cara membandingkan payload saat idempotency fingerprint dibuat.

### 9.4 Generation snapshot

Setiap post menyimpan snapshot yang minimal mencakup:

```text
module_version
config_schema_version
content_schema_version
renderer_version
quality_gate_version
editorial_rubric_version
source_policy_version
dedup_contract_version bila relevan
Page config public ID atau stable version reference
format/topic/profile/interaction goal applied
locale dan target markets
hard limits applied
relevant normalized config projection
explicit overrides/waivers
```

Snapshot tidak menyimpan secret, access token, full source document, chat transcript, atau seluruh prompt. Snapshot berubah pada revisi bila input quality-relevant berubah dan ikut masuk `content_hash` sesuai keputusan QUALITY-004/005.

---

## 10. Kontrak canonical renderer

Setiap modul wajib mempunyai renderer deterministik dan berversi.

Renderer menerima komponen terstruktur serta config snapshot, kemudian menghasilkan:

```text
normalized components
final Canva copy
component character counts
final character count
word counts
visual-line estimate
readability estimates
renderer warnings/errors
renderer_version
```

Aturan lintas-modul:

- Unicode dinormalisasi ke NFC.
- Line ending menjadi LF.
- Outer/trailing whitespace dibersihkan sesuai renderer contract.
- Control character yang tidak diizinkan ditolak.
- Line break, prefix, separator, spasi, dan punctuation dihitung.
- Caller-supplied `canva_copy` harus identik dengan hasil renderer atau ditolak.
- Component budget dan final budget diperiksa terpisah.
- String tidak dipotong otomatis agar lolos gate.
- Renderer tidak melakukan network call atau AI call.
- Output yang sama dengan versi/config/input sama harus byte-identical setelah normalisasi.
- Perubahan layout atau formula yang mengubah output/metrics menaikkan `renderer_version`.

Modul boleh memiliki lebih dari satu render style. Setiap style wajib mempunyai golden fixtures dan aturan layout eksplisit.

---

## 11. Kontrak generation instructions

Instruksi modul memandu ChatGPT, tetapi tidak menjadi authorization boundary dan tidak boleh menggantikan validator server.

Instruksi wajib mencakup:

- Kapan modul digunakan dan kapan tidak digunakan.
- Cara memilih topic, format, profile, dan interaction goal.
- Informasi apa yang harus diambil dari generation context.
- Research/source behavior yang diwajibkan.
- Cara melakukan dedup candidate review bila relevan.
- Urutan reserve, generate, save, attest, dan approval.
- Batas bahasa, tone, safety, rendering, dan caption.
- Kapan harus meminta klarifikasi pengguna.
- Kapan harus berhenti karena source, dedup, atau quality tidak cukup.
- Recovery behavior untuk lease, revision conflict, stale evidence, dan retry.

Instruksi tidak boleh:

- Meminta model mengabaikan ownership, RLS, approval, dedup, source, atau quality gate.
- Mengklaim write berhasil sebelum tool mengembalikan hasil sukses.
- Menyuruh model mengirim secret atau token.
- Menyuruh MCP server melakukan arbitrary web research atau OpenAI API call.
- Memasukkan teks dari sumber eksternal sebagai instruction tanpa memperlakukannya sebagai data tidak tepercaya.

Server-wide instructions hanya berisi aturan lintas-tool yang paling penting. Deskripsi dan sequence tool final ditetapkan pada langkah 0.8; use cases ditetapkan pada 0.9.

---

## 12. Kontrak quality checks

### 12.1 Tiga authority

Semua modul mengikuti pemisahan:

1. **System checks** dihitung server-side.
2. **Editorial attestation** diberikan ChatGPT terhadap rubric berversi.
3. **Owner approval** berasal dari perintah eksplisit dan `auth.uid()` terverifikasi.

Tidak satu pun authority dapat menggantikan blocking failure milik authority lain.

### 12.2 System check registry

Check ID bersifat stabil dan namespaced:

```text
core.<area>.<check>
<niche_key>.<area>.<check>
```

Setiap definition memiliki:

```text
check_id
gate_version
description
severity: blocking | warning
evaluator: server
input_dependencies[]
expected_result_shape
evidence_paths[]
applicable_formats/profiles
```

Modul wajib menyediakan checks untuk schema/config, format/body, renderer, hard content limits, source, dedup/reuse, item/junction integrity, serta niche safety yang relevan. Core menyediakan checks untuk auth, ownership, lifecycle, schedule, revision, idempotency, dan generic evidence freshness.

Caller tidak boleh mengirim authoritative `passed`, timestamp, actor, atau system evidence.

### 12.3 Editorial rubric registry

Setiap criterion memiliki:

```text
criterion_id
rubric_version
description
severity: critical | noncritical
allowed_status: pass | fail | needs_review
required_evidence_paths[]
applicable_formats/profiles
waiver_policy
```

Attestation wajib mengikat current revision dan `content_hash`. Critical `fail` atau `needs_review` memblokir `ready`. Noncritical warning hanya dapat diterima owner jika allowlisted dan mempunyai alasan.

### 12.4 Approval dan stale behavior

- Save awal menghasilkan `draft`.
- `draft → ready` menghitung ulang blocking checks dalam transaksi.
- Approval mencatat actor dari token, content hash, revision, warnings, dan operation ID.
- Revisi content, perubahan quality-relevant snapshot, koreksi item, atau source invalidation membuat evidence lama stale.
- Post `ready` yang berubah kembali menjadi `draft`; approval current dibatalkan.
- Publish memeriksa ulang content hash, source/item eligibility, dan blocking checks.
- `posted`, `archived`, dan `discarded` terminal untuk content revision pada MVP.

Schema evidence dan batas 32 KiB mengikuti keputusan QUALITY-004.

---

## 13. Kontrak deduplikasi

### 13.1 Mode dedup

Modul memilih salah satu:

| Mode | Penggunaan |
|---|---|
| `none` | Tidak mempunyai reusable identity atau collision concern |
| `exact` | Exact normalized identity cukup; tidak ada semantic merge otomatis |
| `structured_candidate` | Exact/structured identity ditambah candidate retrieval dan semantic review |

Mode harus dinyatakan pada descriptor dan generation context.

### 13.2 Modul dengan reusable library

Modul tersebut wajib mendefinisikan:

- Unit canonical yang atomic.
- Normalization version.
- Exact identity/hash inputs.
- Structured identity/ontology serta discriminator material.
- Candidate retrieval signals.
- Auto-match/auto-reject boundary.
- Semantic review evidence.
- Reuse scope serta penggunaan `allocated`/`published`/`released` atau state ekuivalen.
- Correction, invalidation, supersession, dan historical snapshot behavior.
- Gold fixtures dan target precision/recall yang terukur.

Text similarity atau AI judgment tidak boleh menjadi database unique constraint. Ambiguitas harus menghasilkan `review_required` atau state fail-closed, bukan forced merge.

### 13.3 Modul tanpa reusable library

- Tidak membuat row palsu pada tabel modul lain.
- Tidak memanggil reservation RPC.
- Deduplikasi post-level, jika dibutuhkan, harus didefinisikan sebagai policy modul tersendiri dan tidak mengklaim canonical item identity.

### 13.4 Network dan transaksi

Research, source fetching, serta semantic judgment dilakukan di luar database transaction. Transaksi hanya memakai evidence dan keputusan yang sudah tersedia, menjaga locks singkat dan deterministic.

---

## 14. Kontrak reservation, junction, dan release

### 14.1 Reservation-required module

Jika `requires_reservation = true`, modul wajib menyediakan:

- Reservation token acak dan opaque.
- Workspace/Page/niche scope.
- Exact reserved item set.
- Server timestamps dan expiry.
- Atomic claim/reclaim.
- Ownership check pada save/revise/release.
- Retry yang idempotent.
- Conversion reservation menjadi allocation/junction dalam transaksi save.
- Release eksplisit dan expiry recovery.
- Lock ordering yang konsisten dengan core.

Save menolak token expired, scope mismatch, item set mismatch, source/item yang tidak lagi eligible, atau reuse conflict.

### 14.2 Junction contract

Jika item reusable harus menjadi bagian post:

- Gunakan tabel junction khusus niche.
- Junction mempunyai foreign key ke post dan canonical item.
- Composite scope memastikan workspace, Page, dan niche konsisten.
- Simpan posisi, rendered wording, allocation state, serta verification/source snapshot yang dibutuhkan audit.
- Junction menjadi sumber relasi; JSON body hanya representasi output.
- Save post, junction, reservation conversion, dan plan progress bersifat atomic.
- Correction pada canonical item tidak mengubah snapshot post `posted/archived`.

### 14.3 Release behavior

Modul wajib mendefinisikan behavior untuk:

- Abandoned generation.
- Failed save.
- Explicit discard.
- Replacement item pada revision.
- Expired reservation.
- Retry dengan operation key sama.
- Correction/invalidation race.

Post yang pernah `posted` tidak melepaskan published usage ketika diarsipkan.

---

## 15. Kontrak sumber, freshness, dan attribution

### 15.1 Source mode

Setiap modul memilih dan menjelaskan salah satu mode:

| Mode | Arti |
|---|---|
| `required_per_item` | Setiap canonical/reusable item memerlukan source evidence |
| `required_per_post` | Post membutuhkan evidence, tetapi tidak selalu per unit body |
| `attribution_required` | Origin/author wajib dicatat dan mungkin ditampilkan |
| `optional` | Source dapat meningkatkan audit, tetapi bukan blocking default |
| `none` | Tidak ada klaim/atribusi yang memerlukan source; alasan harus terdokumentasi |

Modul boleh menggabungkan requirement, misalnya required evidence sekaligus attribution.

### 15.2 Source policy wajib

Policy mendefinisikan:

- Source types dan hierarchy.
- Minimum source count serta independence bila relevan.
- Publisher/title/URL/accessed-at fields.
- Claim/evidence mapping.
- Freshness category dan expiry calculation.
- Time-sensitive wording/as-of requirements.
- Re-verification behavior.
- Correction/retraction behavior.
- Public attribution rules.
- Domain atau source types yang dilarang/tidak cukup.
- Snapshot fields ketika post disimpan.

Dataset referensi viral hanya boleh menjadi pattern/evaluation input. Dataset tersebut tidak otomatis menjadi evidence kebenaran.

### 15.3 Snapshot dan output

- Canonical source data dapat diperbarui melalui proses verifikasi.
- Post menyimpan immutable source/verification snapshot yang relevan.
- Public Canva copy tidak memuat URL sumber pada MVP.
- Sumber ditampilkan terpisah sebagai referensi internal kecuali modul secara eksplisit mewajibkan attribution publik.
- Caption tidak boleh menambahkan klaim yang tidak tercakup evidence.
- Full source documents tidak disalin ke evidence JSON atau log.

---

## 16. Kontrak performance dimensions

### 16.1 Dimensi bersama

Core menyediakan dimensi:

- Workspace dan Page.
- Niche.
- Topic.
- Format.
- Profile bila tersedia.
- Interaction goal.
- Publication period dan umur post.
- Locale serta target market snapshot.
- Post status.

### 16.2 Dimensi khusus modul

Modul dapat menambah bounded dimensions jika:

- Nilainya berasal dari config/payload/snapshot tervalidasi.
- Key dan enum berversi.
- Cardinality mempunyai batas.
- Tidak memuat secret, user-generated free text, URL, atau full claim.
- Ada minimal satu use case insight dan fixture.
- Histori tetap dapat dibaca setelah enum dideprecate.

### 16.3 Semantik metrics

- Numeric engagement input adalah cumulative totals pada `captured_at`, kecuali field secara eksplisit point-in-time average.
- `null` berbeda dari `0`.
- Snapshot baru tidak menimpa histori lama.
- Insight latest tidak menjumlahkan cumulative snapshots.
- Delta hanya dihitung antara snapshot yang compatible.
- Modul tidak membuat klaim sebab-akibat dari korelasi performa.
- Sample size, post age, dan periode harus terlihat pada insight.

Modul wajib mendefinisikan dimensi mana yang direkomendasikan untuk perbandingan dan minimum evidence sebelum menyebut pola sebagai sinyal yang layak diperhatikan.

---

## 17. Kontrak operasi domain modul

Nama MCP tool final ditentukan pada langkah 0.8. Namun setiap modul harus menyediakan domain capability berikut sesuai descriptor:

```text
validate_config
project_generation_context
validate_plan_item
validate_content_payload
render_content
compute_system_checks
validate_editorial_attestation
validate_ready_transition
validate_publish_transition
project_performance_dimensions
```

Capability conditional:

```text
find_similar_items
register_and_reserve_items
release_items
validate_reserved_items
save_item_junctions
replace_items
handle_discard
handle_item_correction
reverify_sources
```

Aturan:

- Domain capability bukan endpoint publik otomatis.
- Tool/RPC hanya mengekspos capability yang dibutuhkan use case.
- Setiap write masuk melalui allowlisted RPC/domain operation dengan ownership check.
- Tidak ada direct business-table write dari Edge Function.
- Write menerima operation key dan request fingerprint sesuai CORE-001.
- Revision-sensitive write menerima `expected_revision`.
- Error memakai stable code dan safe structured details.
- Hasil tidak mengandung raw SQL error, stack trace, token, atau secret.

---

## 18. Error contract modul

Minimal error family:

| Code | Arti |
|---|---|
| `MODULE_NOT_FOUND` | Niche key tidak terdaftar |
| `MODULE_DISABLED` | Modul atau Page+niche config tidak aktif |
| `MODULE_VERSION_UNSUPPORTED` | Kombinasi module version tidak didukung |
| `CONFIG_SCHEMA_UNSUPPORTED` | Config schema version tidak didukung |
| `CONFIG_INVALID` | Config gagal validator modul |
| `CONTENT_SCHEMA_UNSUPPORTED` | Content schema version tidak didukung |
| `CONTENT_PAYLOAD_INVALID` | Payload/body gagal validator modul |
| `FORMAT_UNSUPPORTED` | Format tidak tersedia pada module/config |
| `TOPIC_UNSUPPORTED` | Topic tidak tersedia pada module/config |
| `PROFILE_UNSUPPORTED` | Profile tidak tersedia pada module/config |
| `RENDER_MISMATCH` | Public copy tidak sama dengan renderer canonical |
| `MODULE_RELATION_INVALID` | Relasi/junction niche tidak sesuai scope |
| `DEDUP_REVIEW_REQUIRED` | Kandidat ambigu memerlukan review |
| `RESERVATION_REQUIRED` | Operasi membutuhkan token reservasi |
| `RESERVATION_INVALID` | Token/scope/item set/expiry tidak valid |
| `SOURCE_POLICY_FAILED` | Source/freshness/attribution tidak memenuhi policy |
| `QUALITY_EVIDENCE_STALE` | Evidence tidak cocok dengan current content |
| `MODULE_INVARIANT_FAILED` | Invariant modul gagal tanpa membuka detail internal |

Error core seperti authentication, authorization, idempotency conflict, revision conflict, schedule conflict, rate limit, dan illegal lifecycle transition tetap dimiliki core. Tool inventory 0.8 memetakan error tersebut ke tindakan pemulihan model.

---

## 19. Security dan isolation contract

Setiap modul wajib:

- Memperlakukan config, payload, source text, dan tool input sebagai data tidak tepercaya.
- Memakai identity dari token tervalidasi; tidak menerima owner ID authoritative dari caller.
- Mempertahankan workspace/Page/niche scope pada query, RPC, dan composite foreign key.
- Menggunakan RLS sebagai defense in depth dan explicit grants sesuai RPC-only boundary.
- Memilih `SECURITY INVOKER` untuk helper yang tidak membutuhkan elevated table access.
- Mengikuti boundary core untuk privileged RPC: entry point `api` hanya jika diperlukan, function owner role sempit tanpa `BYPASSRLS`, RLS dan ownership tetap berlaku, helper internal tidak diekspos, `PUBLIC EXECUTE` dicabut, `search_path = ''`, dan `auth.uid()` diperiksa.
- Tidak menggunakan `user_metadata` untuk authorization.
- Tidak menggunakan `service_role` pada browser atau MCP request path.
- Tidak menjalankan arbitrary SQL, URL callback, code, atau prompt yang disimpan dalam config.
- Tidak melakukan network/AI call selama database transaction.
- Membatasi ukuran JSON/evidence dan menghindari secret/full source pada log.
- Menggunakan annotations serta per-tool OAuth security scheme yang akurat ketika capability dipetakan menjadi MCP tool.

Modul tidak boleh memperluas Data API exposure. Perubahan exposure, grants, atau RLS adalah keputusan core dan harus diuji terpisah.

---

## 20. Kontrak evaluation fixtures

### 20.1 Struktur fixture minimum

Setiap modul menyediakan fixture set untuk:

```text
descriptor/
config/valid
config/invalid
content/valid
content/invalid
formats/examples
formats/anti_examples
rendering/golden
system_checks/pass
system_checks/fail
editorial/pass
editorial/fail
editorial/needs_review
sources/eligible
sources/ineligible
performance/aggregation
compatibility/historical_versions
```

Jika capability aktif, tambahkan:

```text
dedup/exact
dedup/structured
dedup/paraphrase
dedup/distinct
dedup/adversarial
reservation/concurrency
correction/lineage
reuse/policies
junction/integrity
```

### 20.2 Metadata fixture

Setiap case memuat:

```text
fixture_id
fixture_manifest_version
module/config/content/renderer/gate/rubric versions
input
expected result
expected error/check IDs
reason label
provenance category
review status
```

Fixture tidak menyimpan secret dan tidak menganggap claim dari dataset referensi sebagai fakta benar tanpa source verification.

### 20.3 Gate perubahan modul

- Validator dan renderer deterministic fixtures harus lulus 100%.
- Schema invalid fixtures harus fail closed dengan code yang diharapkan.
- Historical compatibility fixtures wajib lulus sebelum versi aktif berubah.
- Dedup target ditentukan per modul dan harus memprioritaskan pencegahan false merge.
- Editorial fixture dinilai terhadap rubric berversi; threshold spesifik ditetapkan modul.
- Perubahan normalization, ontology, renderer, quality gate, atau rubric menjalankan ulang seluruh fixture terkait.
- Fixture failure tidak boleh diselesaikan dengan memperlemah expected result tanpa decision change yang terdokumentasi.

---

## 21. Checklist menambahkan niche baru

Niche baru belum boleh diaktifkan sampai seluruh item berikut tersedia:

1. Niche key dan product scope disetujui.
2. Descriptor serta capability flags lengkap.
3. Registry seed/migration tersedia.
4. Config schema, defaults, validator, dan projection tersedia.
5. Topic, format, profile, dan interaction goal registries tersedia.
6. Content schema dan body validator tersedia.
7. Renderer serta golden fixtures tersedia.
8. Generation instructions tersedia.
9. System check registry tersedia.
10. Editorial rubric dan examples/anti-examples tersedia.
11. Source/safety/freshness/attribution policy tersedia.
12. Dedup/reusable library contract tersedia atau mode `none` mempunyai alasan.
13. Tabel library/junction dan reservation behavior tersedia jika capability aktif.
14. Correction/lineage behavior tersedia jika capability aktif.
15. Performance dimensions dan insight caveats tersedia.
16. Compatibility matrix tersedia.
17. Error mapping dan recovery behavior tersedia.
18. Fixture suite lengkap dan lulus.
19. RPC/tool exposure ditinjau agar tidak menambah tool tumpang tindih.
20. PRD, database design, implementation plan, workflow, dan traceability diperbarui.

Penambahan niche tidak boleh mengubah arti `trivia_facts`, `trivia_post_facts`, atau payload trivia historis.

---

## 22. Conformance modul trivia MVP

Modul trivia memenuhi kontrak melalui:

| Area kontrak | Implementasi trivia |
|---|---|
| `niche_key` | `trivia` |
| Module/config/content version awal | `1` |
| Reusable library | `trivia_facts` |
| Junction | `trivia_post_facts` |
| Dedup mode | `structured_candidate` |
| Reservation | Wajib sebelum save/replacement fact |
| Source mode | `required_per_item` |
| Correction lineage | Successor/supersession dan immutable post snapshot |
| Renderer | Versioned plain-lines/numbered renderer |
| Quality | Server checks + ChatGPT attestation + owner approval |
| Metrics | Core dimensions ditambah profile/fact-count signals |
| Fixtures | Config, payload, render, source, dedup, reservation, correction, quality, performance |

Detail format, topic, profile, source hierarchy, ontology, rubric, serta fixtures editorial trivia ditetapkan dalam `plans/trivia-content-dna.md`. Tabel ini hanya membuktikan bahwa trivia dapat dipasang pada kontrak generik; tabel ini bukan pengganti DNA trivia.

---

## 23. Trade-off yang diterima

- Generic public-content envelope memudahkan core dan output presentation, tetapi `body` serta validator tetap dimiliki modul agar niche baru tidak dipaksa memakai struktur fakta trivia.
- Compatibility reader untuk versi historis menambah maintenance, tetapi mencegah perubahan schema aktif mengubah arti post lama.
- Capability descriptor menambah metadata modul, tetapi membuat kebutuhan library, dedup, reservation, source, dan lineage eksplisit serta dapat diuji.
- Source/dedup/reservation boleh tidak dipakai modul tertentu, tetapi keputusan `none` harus disengaja dan terdokumentasi; ketiadaan implementasi tidak boleh dianggap default diam-diam.
- Domain capability dipisahkan dari daftar MCP tool. Pemisahan ini menunda nama/schema tool sampai 0.8, tetapi mencegah kontrak modul menghasilkan tool publik yang tumpang tindih.
- Detail editorial tetap berada pada dokumen DNA per niche. Ini menambah satu lapisan dokumentasi, tetapi menjaga kontrak generik stabil ketika gaya konten berubah.

---

## 24. Verification gate langkah 0.6

Status: **lulus**.

- Kontrak membedakan tanggung jawab core, ChatGPT, dan modul niche.
- Config, content payload, generation snapshot, renderer, checks, rubric, dedup, reservation, source, metrics, errors, security, versioning, dan fixtures mempunyai aturan normatif.
- Reusable library bersifat capability opsional; niche baru tidak dipaksa memakai model trivia.
- Tidak ada foreign key polymorphic atau relasi domain yang hanya bergantung pada JSON ID.
- System checks, editorial attestation, dan owner approval tetap terpisah.
- Kontrak mengikuti idempotency, revision, locking, reservation, correction, freshness, dan evidence decisions 0.2–0.5.
- Trivia mempunyai conformance mapping tanpa memasukkan detail editorial yang menjadi scope 0.7.
- Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.
- Langkah berikutnya adalah 0.7 — membuat `plans/trivia-content-dna.md`.

---

## 25. Referensi teknis

- [OpenAI — Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
- [OpenAI — Authentication for plugins](https://developers.openai.com/plugins/build/auth)
- [OpenAI — Package your plugin](https://developers.openai.com/plugins/build/plugins)
- [Supabase — Deploy MCP servers](https://supabase.com/docs/guides/ai-tools/byo-mcp)
- [Supabase — Securing the Data API](https://supabase.com/docs/guides/api/securing-your-api)
- `plans/phase-0-decision-register.md`
- `plans/PRD.md`
- `plans/database-design.md`
- `plans/implementation-plan.md`
