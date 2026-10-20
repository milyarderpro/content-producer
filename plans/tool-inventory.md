# MCP Tool Inventory — Content Producer MVP

## 1. Informasi dokumen

| Bagian | Keterangan |
|---|---|
| Nama produk | Content Producer |
| Versi kontrak | 1.0 |
| Status | Frozen — baseline MCP MVP Phase 0 |
| Tanggal keputusan | 7 Oktober 2026 |
| Langkah Phase 0 | 0.8 — MCP tool inventory |
| Transport | Streamable HTTP |
| Runtime target | Supabase Edge Function `mcp` |
| Authorization server | Supabase Auth OAuth 2.1 |
| Modul MVP | Trivia |
| Jumlah tool | 33 |

Dokumen ini adalah kontrak normatif untuk nama, tujuan, input, output, autentikasi, annotation, error, idempotency, dan urutan pemakaian MCP tools Content Producer MVP.

Dokumen ini hanya menetapkan kontrak. Langkah 0.8 tidak membuat source code, migration, deployment, plugin package, atau resource cloud.

**Phase 10.1 CR-032 override (owner-approved 18 Oktober 2026):**
Nama, jumlah **33 tools** dan **33 existing api RPCs**, schemas RPC, business
rules, ledger, RLS, ownership, idempotency, dan rate limits tetap sama.
Berbeda dari baseline OAuth 7 Oktober, koneksi ChatGPT production memakai
**No authentication** dengan identitas satu workspace pilot tetap di
Supabase Edge Function. Descriptor MCP private No authentication tidak
mengiklankan OAuth; keluaran MCP `get_account_profile` secara additive
mencantumkan `workspace_public_id` supaya dua read berikutnya dapat
memakai parameter workspace yang diwajibkan. Credential `SUPABASE_DB_URL`
terbatas pada Edge Function; setiap invocation menurunkan transaction role
ke `authenticated` (bukan bypass-RLS), dengan claims yang dibangun server.
Tidak ada grant baru ke `anon`, tabel, sequence, helper, ataupun RPC.
Endpoint **publik dapat dipanggil oleh siapa saja**, sehingga keamanan
per-user OAuth tidak berlaku; selama 10.1 semua write tools terdaftar tetapi
RPC mutasinya terkunci pada server. Write pertama tetap MAN-02 setelah
persetujuan owner dan keputusan pembukaan write yang terpisah. Lihat
[CR-032](../docs/decisions/2026-10-18-phase-10-1-noauth-fixed-pilot.md).

---

## 2. Kedudukan kontrak

Kontrak ini mengikuti:

1. Scope dan lifecycle pada `plans/PRD.md`.
2. Invariant, ownership, transaksi, locking, dan RLS pada `plans/database-design.md`.
3. Keputusan accepted pada `plans/phase-0-decision-register.md`.
4. Boundary generik niche pada `plans/module-contract.md`.
5. Aturan editorial trivia pada `plans/trivia-content-dna.md`.

Jika daftar tool lama di PRD atau implementation plan berbeda dari dokumen ini, inventory ini menjadi keputusan final langkah 0.8. Perbedaan telah dipropagasikan ke seluruh dokumen pada langkah 0.11.

MCP tool adalah facade terhadap domain operation/RPC allowlist. Tool bukan tempat business rule baru dan bukan akses langsung ke tabel.

---

## 3. Prinsip desain tool

### 3.1 Satu tujuan yang dapat dikenali

- Satu tool mewakili satu aksi atau satu retrieval goal.
- Tidak ada generic executor, dynamic operation name, raw SQL, arbitrary RPC, atau schema-fetch-and-execute tool.
- Lifecycle post tidak memakai `update_post_status`; setiap aksi mempunyai tool sendiri.
- List dan get dipisahkan jika bentuk query serta hasilnya berbeda.
- Internal domain capability tidak otomatis menjadi tool.

### 3.2 ChatGPT dan server mempunyai tanggung jawab berbeda

ChatGPT:

- Memahami permintaan pengguna.
- Melakukan web research menggunakan capability host yang sesuai.
- Menilai kandidat dedup secara semantik.
- Menulis konten dan editorial attestation.
- Meminta persetujuan pengguna pada aksi yang membutuhkannya.

MCP server:

- Memvalidasi auth, ownership, schema, scope, lifecycle, revision, reservation, source metadata, dan quality evidence.
- Menjalankan RPC atomic.
- Menyimpan state dan mengembalikan identifier stabil.
- Tidak melakukan web research, model completion, arbitrary fetch, Facebook publishing, atau background generation.

### 3.3 Tidak ada hidden side effect

- Read tool tidak mengubah business state, claim, reservation, atau timestamp domain.
- Write tool menyebutkan seluruh side effect penting dalam description.
- `save_post` selalu membuat `draft`, tidak pernah auto-approve.
- `mark_post_posted` hanya mencatat publikasi manual; tool tidak mengirim data ke Facebook.
- `record_post_performance` hanya menyimpan angka yang diberikan pengguna; tool tidak mengambil analytics Facebook.
- Expired-state cleanup opportunistic hanya boleh membersihkan lease/reservation yang secara kontrak sudah tidak aktif.

### 3.4 Headless-first

Seluruh workflow MVP harus dapat diselesaikan melalui structured results dan text summary tanpa MCP App UI. Custom UI tetap di luar scope MVP.

---

## 4. Surface yang bukan MCP tool

### 4.1 HTTP health endpoint

`GET /health` adalah endpoint HTTP operasional, bukan MCP tool. Endpoint hanya mengembalikan status, service version, dan waktu server; tidak membaca workspace atau data pengguna.

`health_check` dihapus dari tool list karena health bukan tujuan produksi konten pengguna dan availability sudah diuji melalui initialize/list-tools serta observability.

### 4.2 Capability yang sengaja tidak diekspos

- Hard delete workspace, Page, plan, post, fact, source, atau metrics.
- Raw database query atau arbitrary RPC.
- Arbitrary URL fetch atau web search.
- OpenAI API/model invocation.
- Canva/video/image generation.
- Facebook upload, schedule, delete, atau analytics fetch.
- Background job start/poll.
- Mutation module registry atau niche registry.
- Tool discovery di atas tool MCP yang sudah terdaftar.
- Direct mutation terhadap `system_checks`, approval actor, server timestamps, hashes, atau internal IDs.

---

## 5. Security scheme dan request context

### 5.1 Security scheme semua tool

Setiap tool mendeklarasikan security scheme secara eksplisit:

```json
[
  {
    "type": "oauth2",
    "scopes": ["openid", "email"]
  }
]
```

Tidak ada MCP tool anonim dan tidak ada tool dengan optional authentication.

Scope `openid email` mengidentifikasi koneksi. Authorization data tetap berasal dari token tervalidasi, ownership check, OAuth `client_id`, RPC policy, dan RLS; email bukan bukti authorization.

### 5.2 Validasi request

Sebelum handler tool berjalan, server wajib memvalidasi:

- Signature JWT dan signing key current.
- `iss`, `aud`/resource, `exp`, `nbf`, serta required scopes.
- OAuth `client_id` yang valid untuk MCP path.
- Owner allowlist dan active workspace ownership.
- Rate-limit key `(actor_user_id, oauth_client_id, limit_group)`.

Caller tidak pernah mengirim authoritative `owner_user_id`, `actor_user_id`, atau email untuk authorization.

### 5.3 Profile metadata

`get_account_profile` diberi:

```json
{
  "_meta": {
    "openai/profile": true
  }
}
```

ID profile stabil berasal dari user terautentikasi. Hanya field display yang aman dikembalikan.

### 5.4 OAuth failure

Request tanpa token atau token yang memerlukan relink menghasilkan HTTP `401`, `WWW-Authenticate`, dan `_meta["mcp/www_authenticate"]` yang menunjuk protected-resource metadata. Server tidak membungkus kegagalan autentikasi awal sebagai hasil bisnis sukses.

---

## 6. Konvensi schema bersama

### 6.1 Aturan JSON Schema

Semua input dan structured output:

- Memakai JSON Schema object dengan `additionalProperties: false` pada setiap object kontraktual.
- Memakai `request_schema_version: 1` pada input.
- Memakai `response_schema_version: 1` pada output.
- Memakai UUID lowercase canonical untuk seluruh public ID, operation key, claim token, dan reservation token.
- Memakai RFC 3339 UTC timestamp dengan suffix `Z` untuk output.
- Menerima timestamp input ber-offset lalu menormalisasikannya ke UTC.
- Memakai IANA timezone untuk konfigurasi Page.
- Memakai ISO 3166-1 alpha-2 uppercase; default market MVP `US`, `GB`, `CA`, `AU`.
- Menolak string kosong setelah trim.
- Tidak menerima token, secret, raw transcript, atau seluruh conversation history sebagai field.

### 6.2 Scalar aliases

| Alias | Bentuk |
|---|---|
| `PublicId` | UUID string |
| `OperationKey` | UUID v4 string, satu logical write |
| `Timestamp` | RFC 3339 timestamp |
| `Date` | `YYYY-MM-DD` |
| `Cursor` | Opaque nonempty string, maksimum 512 karakter |
| `NicheKey` | Lower snake case, 2–50 karakter |
| `Slug` | Lowercase letters, digits, hyphen; 2–80 karakter |
| `SafeReason` | Trimmed string, 1–500 karakter |
| `SafeLabel` | Trimmed string, 1–120 karakter |
| `HttpsUrl` | Absolute HTTPS URL, maksimum 2048 karakter |

### 6.3 Pagination

Input pagination bersama:

```text
limit?: integer 1..50, default 20
cursor?: Cursor
```

Output pagination bersama:

```text
items: array
next_cursor: Cursor | null
has_more: boolean
```

Cursor dibangun dari sort key + identity secara opaque. Caller tidak membuat atau mengubah cursor.

### 6.4 Success envelope

```text
response_schema_version: const 1
data: tool-specific object
```

`content` MCP menyertakan ringkasan singkat yang konsisten dengan `structuredContent`. `structuredContent` adalah bentuk authoritative untuk orchestration.

### 6.5 Error envelope

Domain error memakai MCP result `isError: true` dan structured content:

```text
response_schema_version: const 1
error:
  code: StableErrorCode
  message: safe user-facing string, 1..300 chars
  retryable: boolean
  recovery: safe model action, 1..300 chars
  retry_after_seconds?: integer 1..3600
  current?: safe object with public IDs/status/revision only
  field_errors?: array[{path, code, message}], max 20
```

Raw SQL, stack trace, internal bigint, JWT, authorization code, secret, atau token yang tidak diperlukan tidak boleh ada pada response.

### 6.6 Write contract

Setiap write input wajib memiliki:

```text
request_schema_version: const 1
workspace_public_id: PublicId
operation_key: OperationKey
```

Aturan:

- Retry logical operation memakai key dan payload semantik yang sama.
- Intent baru memakai key baru.
- `operation_key` tidak boleh dihasilkan atau diganti server.
- Replay sukses tidak mengulang mutation.
- Key sama dengan operation/payload berbeda menghasilkan `OPERATION_KEY_REUSED`.

### 6.7 Optimistic concurrency

- Mutation post memakai `expected_revision`.
- Mutation editorial/status yang bergantung pada konten juga memakai `expected_content_hash`.
- Mutation Page/config memakai `expected_page_updated_at` dan, bila config diubah, `expected_config_updated_at`.
- Mutation canonical fact memakai `expected_fact_updated_at`.
- Mismatch tidak di-merge otomatis.

### 6.8 Shared source schema `SourceEvidenceV1`

```text
schema_version: const 1
url: HttpsUrl
canonical_url: HttpsUrl
title: string 1..300
publisher: string 1..200
tier: enum[A, B, C, D]
source_type: enum[official, primary_paper, dataset, museum, professional_association,
                  reputable_reference, review_paper, reputable_secondary, social,
                  aggregator, other]
accessed_at: Timestamp
published_at?: Date | null
updated_at?: Date | null
as_of?: string | null, max 100
language: BCP-47 string, max 35
supports: string 1..500
independence_group: string 1..120
```

Tier D boleh dikirim sebagai discovery evidence tetapi tidak dihitung sebagai verification source.

### 6.9 Shared editorial schemas

Caller mengirim `EditorialAttestationInputV1`:

```text
rubric_version: const 1
evaluator_label?: string 1..120
overall_status: enum[pass, fail, needs_review]
criteria: array 1..30 of {
  id: allowlisted rubric criterion ID
  severity: enum[critical, noncritical]
  status: enum[pass, fail, needs_review]
  note: string 1..500
  evidence_paths: array 0..20 of safe JSON paths/public IDs
}
risk_flags: array 0..20 of allowlisted risk flag
```

Server memvalidasi input terhadap exact content request lalu menyimpan `EditorialChecksV1`:

```text
schema_version: const 1
rubric_version: const 1
evaluated_at: server Timestamp
evaluator: const "chatgpt"
evaluator_label?: string 1..120
post_revision: server integer >= 1
content_hash: server lowercase SHA-256 hex
overall_status, criteria, risk_flags: validated values from attestation input
```

Caller tidak menghitung atau mengirim authoritative `post_revision`, `content_hash`, atau `evaluated_at`. Server mengikat attestation ke exact canonical content, revision hasil write, dan hash yang dihitungnya dalam transaksi yang sama.

### 6.10 Shared post output `PostPackageV1`

```text
post_public_id: PublicId
page_public_id: PublicId
niche_key: NicheKey
status: enum[draft, ready, posted, discarded, archived]
revision: integer >= 1
content_hash: lowercase SHA-256 hex
format_key: string
topic_key: string
interaction_goal: enum[share, save, comment, follow]
scheduled_at: Timestamp | null
published_at: Timestamp | null
content_payload: module content schema object
system_checks: versioned system-check object
editorial_checks: EditorialChecksV1 | null
quality_status: enum[pending, passed, failed]
fact_bindings: array of public fact IDs, positions, roles, rendered text, and safe source snapshots
created_at: Timestamp
updated_at: Timestamp
```

### 6.11 Shared resource summaries

`PageSummaryV1` adalah exact object:

```text
page_public_id: PublicId
name: string 1..120
slug: Slug
timezone: IANA timezone
target_markets: array 1..8 of ISO country codes
is_active: boolean
enabled_niches: array of {
  niche_key: NicheKey
  is_enabled: boolean
  is_default: boolean
  config_schema_version: integer >= 1
  updated_at: Timestamp
}
created_at: Timestamp
updated_at: Timestamp
```

`PlanSummaryV1` adalah exact object:

```text
plan_public_id: PublicId
name: string 1..120 | null
page_public_id: PublicId
niche_key: NicheKey
status: enum[pending, in_progress, partially_completed, completed, failed, cancelled]
requested_count: integer 1..100
progress: {
  pending: integer >= 0
  in_progress: integer >= 0
  completed: integer >= 0
  failed: integer >= 0
  cancelled: integer >= 0
}
created_at: Timestamp
updated_at: Timestamp
```

`PlanItemV1` adalah exact object:

```text
plan_item_public_id: PublicId
plan_public_id: PublicId
position: integer 1..100
status: enum[pending, in_progress, completed, failed, cancelled]
scheduled_at: Timestamp | null
topic_key: string | null
format_key: string | null
interaction_goal: enum[share, save, comment, follow] | null
item_config: bounded module object
attempt_count: integer >= 0
claim_expires_at: Timestamp | null
active_post_public_id: PublicId | null
last_error: {code: StableErrorCode, detail: string 1..500} | null
created_at: Timestamp
updated_at: Timestamp
```

`MetricSnapshotV1` adalah exact object:

```text
metric_snapshot_public_id: PublicId
post_public_id: PublicId
captured_at: Timestamp
metrics: object containing only the nullable numeric fields defined by record_post_performance
source: validated metric source object
anomaly_flags: array of allowlisted strings
created_at: Timestamp
```

### 6.12 Notasi komposisi schema

- “Common workspace fields” berarti tepat `request_schema_version` dan `workspace_public_id`.
- “Write common fields” berarti tepat common workspace fields ditambah `operation_key`.
- “Common pagination” berarti tepat `limit` dan `cursor` pada bagian 6.3.
- Type bernama seperti `PageSummaryV1`, `PlanItemV1`, `PostPackageV1`, atau schema modul diperluas secara langsung pada JSON Schema implementasi; type name tidak dikirim sebagai data.
- Field yang tidak disebut dalam input/output tool atau referenced shared type dilarang oleh `additionalProperties: false`.
- Prose tentang side effect, empty result, dan error adalah bagian kontrak yang diuji selain JSON Schema.

---

## 7. Inventory final

Semua tool memakai OAuth, `openWorldHint: false`, dan explicit boolean annotations.

| # | Tool | Tujuan utama | Read-only | Destructive | Rate group |
|---:|---|---|---:|---:|---|
| 1 | `get_account_profile` | Mengenali account connection aktif | true | false | read |
| 2 | `get_workspace_context` | Membaca workspace, module catalog, dan defaults | true | false | read |
| 3 | `list_pages` | Menemukan Page milik workspace | true | false | read |
| 4 | `create_page` | Membuat Page dan config niche awal secara atomic | false | false | write |
| 5 | `update_page` | Memperbarui Page/config dengan CAS | false | true | write |
| 6 | `get_page_generation_context` | Mengambil seluruh konteks sebelum generasi | true | false | read |
| 7 | `list_content_plans` | Menemukan batch/calendar plan | true | false | read |
| 8 | `create_content_plan` | Membuat plan dan exact item slots | false | false | write |
| 9 | `get_content_plan` | Membaca progress dan item sebuah plan | true | false | read |
| 10 | `claim_content_plan_items` | Mengambil lease item untuk putaran aktif | false | false | contention_write |
| 11 | `renew_content_plan_claim` | Memperpanjang satu lease yang masih aktif | false | false | contention_write |
| 12 | `report_content_plan_item_failure` | Menutup attempt gagal dengan error aman | false | false | contention_write |
| 13 | `retry_content_plan_item` | Mengembalikan item failed ke pending | false | false | write |
| 14 | `replace_discarded_plan_item` | Membuka replacement eksplisit setelah discard | false | false | write |
| 15 | `cancel_content_plan` | Membatalkan sisa item non-completed | false | true | write |
| 16 | `trivia_find_similar_facts` | Mengambil kandidat dedup dan reuse signals | true | false | expensive_read |
| 17 | `trivia_register_and_reserve_facts` | Registrasi canonical + reserve set atomic | false | false | contention_write |
| 18 | `trivia_release_facts` | Melepaskan reservation yang ditinggalkan | false | false | contention_write |
| 19 | `trivia_reverify_fact` | Memperbarui evidence tanpa mengubah proposisi | false | true | write |
| 20 | `trivia_correct_fact` | Supersede atau invalidate canonical fact | false | true | contention_write |
| 21 | `list_posts` | Menemukan post/work queue/calendar | true | false | read |
| 22 | `get_post` | Membaca satu post lengkap dan state current | true | false | read |
| 23 | `save_post` | Menyimpan draft dan fact junction secara atomic | false | false | contention_write |
| 24 | `revise_post` | Mengganti konten/fact bindings dengan CAS | false | true | contention_write |
| 25 | `reschedule_post` | Memindahkan atau mengosongkan schedule | false | true | write |
| 26 | `approve_post` | Menyetujui draft menjadi ready | false | false | write |
| 27 | `revoke_post_approval` | Mengembalikan ready menjadi draft | false | false | write |
| 28 | `discard_post` | Membatalkan draft/ready dan release allocation | false | true | contention_write |
| 29 | `mark_post_posted` | Mencatat publikasi manual sebagai posted | false | true | contention_write |
| 30 | `archive_post` | Mengarsipkan post yang sudah published | false | true | write |
| 31 | `record_post_performance` | Menambah snapshot metrics manual | false | false | write |
| 32 | `get_post_performance` | Membaca history metrics satu post | true | false | read |
| 33 | `get_performance_insights` | Membaca agregat performa dengan evidence | true | false | expensive_read |

`destructiveHint: true` dipakai secara konservatif untuk overwrite, cancellation, correction, terminal transition, atau perubahan yang sulit dibatalkan.

---

## 8. Contract identity dan context tools

### 8.1 `get_account_profile`

**Title:** Get connected account profile

**Description:** Use this to identify the authenticated Content Producer account and its active workspace. It reads connection display data only and does not change content.

Input:

```text
request_schema_version: const 1
```

Output `data`:

```text
profile:
  id: stable opaque string 1..200
  display_name: string 1..120
  email_hint: masked string | null
  workspace_public_id: PublicId
  workspace_name: string 1..120
  account_status: enum[active]
```

Errors: `AUTH_REQUIRED`, `OWNER_ACCESS_REQUIRED`, `DATABASE_UNAVAILABLE`, `RATE_LIMITED`.

### 8.2 `get_workspace_context`

**Title:** Get workspace context

**Description:** Use this before workspace-wide planning or when the active modules and defaults are unknown. It returns the authenticated owner's workspace rules and module catalog without changing state.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
```

Output `data`:

```text
workspace:
  public_id: PublicId
  name: string
  language_code: string
  target_markets: string[]
  default_timezone: IANA timezone
  defaults: safe core settings object
modules: array of {
  niche_key: NicheKey
  display_name: string
  module_version: integer
  status: enum[active, inactive, unavailable]
  capabilities: string[]
  config_schema_versions: integer[]
  content_schema_versions: integer[]
}
page_counts:
  active: integer >= 0
  inactive: integer >= 0
```

`list_niches` dihapus sebagai tool terpisah karena module catalog ini sudah menjawab tujuan yang sama.

Errors: global read errors, `WORKSPACE_NOT_FOUND`.

---

## 9. Contract Page tools

### 9.1 `list_pages`

**Title:** List Facebook Pages

**Description:** Use this to find Pages in the active workspace by name, status, or enabled niche before reading context or creating content.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
query?: string 1..120
active?: boolean
niche_key?: NicheKey
limit?: integer 1..50, default 20
cursor?: Cursor
```

Output item:

```text
page_public_id: PublicId
name: string
slug: string
timezone: IANA timezone
target_markets: string[]
is_active: boolean
enabled_niches: array[{niche_key, is_default, config_schema_version, updated_at}]
updated_at: Timestamp
```

Errors: global read errors, `MODULE_NOT_FOUND`.

### 9.2 `create_page`

**Title:** Create a Facebook Page workspace

**Description:** Use this only when the user asks to create a Page. It atomically creates the Page and its initial enabled niche configuration; it does not create Facebook assets.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
operation_key: OperationKey
name: string 1..120
slug: Slug
timezone: IANA timezone
target_markets: array 1..8 of ISO country codes
niche_key: const "trivia" for MVP
config_schema_version: const 1
config: TriviaConfigV1
make_default: boolean, default true
```

Output `data`:

```text
page: PageSummaryV1
config:
  niche_key: "trivia"
  config_schema_version: 1
  config: TriviaConfigV1
  is_enabled: true
  is_default: boolean
  updated_at: Timestamp
replayed: boolean
```

Errors: global write errors, `PAGE_SLUG_CONFLICT`, `CONFIG_INVALID`, `CONFIG_SCHEMA_UNSUPPORTED`, `MODULE_DISABLED`.

### 9.3 `update_page`

**Title:** Update Page settings

**Description:** Use this after showing current settings and receiving the requested changes. It replaces only explicitly supplied Page or niche-config fields and rejects stale concurrent edits.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
operation_key: OperationKey
page_public_id: PublicId
expected_page_updated_at: Timestamp
page_patch?: object with at least one of {
  name?: string 1..120
  slug?: Slug
  timezone?: IANA timezone
  target_markets?: array 1..8 of ISO country codes
}
niche_config_patch?: {
  niche_key: const "trivia"
  expected_config_updated_at: Timestamp
  config_schema_version: const 1
  config: TriviaConfigV1
  is_enabled: boolean
  is_default: boolean
}
```

At least one patch is required. Null does not mean delete unless the field explicitly permits null.

Output: updated Page summary, full updated config when changed, `replayed`.

Errors: global write errors, `PAGE_NOT_FOUND`, `PAGE_VERSION_CONFLICT`, `PAGE_SLUG_CONFLICT`, `CONFIG_INVALID`, `CONFIG_SCHEMA_UNSUPPORTED`, `MODULE_DISABLED`, `ACTIVE_POST_CONTEXT_CONFLICT`.

### 9.4 `get_page_generation_context`

**Title:** Get Page generation context

**Description:** Use this immediately before researching and drafting content for a Page. It returns current config, allowed choices, recent variety, reuse policy, and bounded performance signals.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
page_public_id: PublicId
niche_key: NicheKey
intent?: {
  topic_key?: string
  format_key?: string
  interaction_goal?: enum[share, save, comment, follow]
  scheduled_at?: Timestamp | null
}
recent_post_limit?: integer 1..30, default 12
```

Output `data`:

```text
page: PageSummaryV1
module: module/version/capability summary
config_public_id: PublicId (selected owner-scoped Page+niche config row, CR-046)
config: full current versioned config
generation_rules: allowed topics, formats, profiles, interaction goals, budgets, locale
reuse_policy: scope and relevant current constraints
recent_variety: bounded subject/topic/format/hook/CTA summaries; no full transcript
performance_signals: bounded evidence-aware summaries with sample sizes
context_version:
  page_updated_at: Timestamp
  config_updated_at: Timestamp
```

Errors: global read errors, `PAGE_NOT_FOUND`, `MODULE_NOT_FOUND`, `MODULE_DISABLED`, `CONFIG_SCHEMA_UNSUPPORTED`.

---

## 10. Contract content-plan tools

### 10.1 `list_content_plans`

**Title:** List content plans

**Description:** Use this to find resumable batch or calendar plans by Page, niche, name, or status.

Input: common workspace/pagination plus optional `page_public_id`, `niche_key`, `query`, `statuses[]`, `created_from`, and `created_to`.

Allowed statuses: `pending`, `in_progress`, `partially_completed`, `completed`, `failed`, `cancelled`.

Output item:

```text
plan_public_id, name, page_public_id, niche_key, status, requested_count
progress: {pending, in_progress, completed, failed, cancelled}
created_at, updated_at
```

### 10.2 `create_content_plan`

**Title:** Create a content plan

**Description:** Use this when the user asks for a batch or calendar. It atomically creates one plan and the exact ordered item slots; it does not generate posts.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
operation_key: OperationKey
page_public_id: PublicId
niche_key: NicheKey
name?: string 1..120 | null
config_schema_version: integer >= 1
items: array 1..100 of {
  position: integer 1..100, contiguous and unique
  scheduled_at: Timestamp | null
  topic_key: string | null
  format_key: string | null
  interaction_goal: enum[share, save, comment, follow] | null
  item_config: bounded module override object, max serialized 8 KiB
}
plan_intent: string 1..1000
```

Output: plan summary, ordered item summaries, context snapshot version, `replayed`.

Errors: global write errors, `PAGE_NOT_FOUND`, `MODULE_DISABLED`, `CONFIG_INVALID`, `SCHEDULE_CONFLICT`, `PLAN_LIMIT_EXCEEDED`.

### 10.3 `get_content_plan`

**Title:** Get content plan progress

**Description:** Use this to inspect or resume one plan. It returns progress, bounded item state, active post IDs, and safe failure details without claiming work.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
plan_public_id: PublicId
item_statuses?: status[]
limit?: integer 1..100, default 50
cursor?: Cursor
```

Output: full plan summary plus paginated items containing public ID, position, intent fields, status, attempt count, claim expiry when owned by current actor, active post public ID, and safe last error.

### 10.4 `claim_content_plan_items`

**Title:** Claim content plan items

**Description:** Use this immediately before processing the next plan items. It atomically leases up to three pending or reclaimable items to this connection and may reclaim expired leases.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
operation_key: OperationKey
plan_public_id: PublicId
limit: integer 1..3, default 1
lease_minutes: const 30
```

Output:

```text
plan_public_id
claimed_items: array 0..3 of {
  item: PlanItemV1
  claim_token: UUID
  claimed_at: Timestamp
  claim_expires_at: Timestamp
  claim_renewal_count: integer
}
remaining_claimable_count: integer >= 0
replayed: boolean
```

Empty result is successful when no item is claimable.

### 10.5 `renew_content_plan_claim`

**Title:** Renew a content plan claim

**Description:** Use this only when a claimed item needs more processing time. It extends one active lease once, never beyond 60 minutes from the original claim.

Input: write common fields plus `plan_item_public_id`, `claim_token`.

Output: item public ID, renewed expiry, renewal count, `replayed`.

Errors: `PLAN_ITEM_CLAIM_MISMATCH`, `PLAN_ITEM_CLAIM_EXPIRED`, `PLAN_CLAIM_RENEWAL_LIMIT`.

### 10.6 `report_content_plan_item_failure`

**Title:** Report content plan item failure

**Description:** Use this when the current attempt cannot safely produce a saved post. It marks only the claimed item failed, stores a safe error summary, and releases its lease.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
operation_key: OperationKey
plan_item_public_id: PublicId
claim_token: UUID
failure_code: allowlisted stable non-secret code
failure_detail: string 1..500
retry_recommended: boolean
```

Output: updated item and plan progress, `replayed`.

### 10.7 `retry_content_plan_item`

**Title:** Retry a failed content plan item

**Description:** Use this after the user asks to retry, or after a recoverable failure has been explained. It changes one failed item back to pending without resetting attempt history.

Input: write common fields plus `plan_item_public_id` and `reason: SafeReason`.

Output: updated item status `pending`, plan summary, `replayed`.

### 10.8 `replace_discarded_plan_item`

**Title:** Replace a discarded plan item

**Description:** Use this only after explicit user intent to create a replacement for a discarded pre-publication post. It returns the completed item to pending only when no posted or archived output exists.

Input: write common fields plus `plan_item_public_id`, `discarded_post_public_id`, `reason: SafeReason`, and `explicit_replacement: const true`.

Output: updated item, replacement history reference, plan summary, `replayed`.

Errors: `PLAN_ITEM_REPLACEMENT_BLOCKED`, `POST_NOT_FOUND`, lifecycle errors.

### 10.9 `cancel_content_plan`

**Title:** Cancel a content plan

**Description:** Use this only when the user asks to cancel a plan. It cancels pending, failed, and in-progress items and clears their claims; completed posts are preserved.

Input: write common fields plus `plan_public_id`, `reason: SafeReason`, `explicit_cancellation: const true`.

Output: final plan summary, counts changed/preserved, `replayed`.

Errors shared by plan tools: global errors, `PLAN_NOT_FOUND`, `PLAN_ITEM_NOT_FOUND`, `PLAN_STATUS_CONFLICT`, `PLAN_ITEM_CLAIM_MISMATCH`, `PLAN_ITEM_CLAIM_EXPIRED`, `SCHEDULE_CONFLICT` where applicable.

---

## 11. Shared trivia candidate schema

`TriviaCandidateV1`:

```text
candidate_key: string matching [A-Za-z0-9_-]{1,64}
claim_text: atomic claim, 1..500 chars
subject_key: canonical key, 1..120
relation_key: ontology relation, 1..120
object_key: canonical value/object, 1..300
numbers: array 0..10 of {
  value: canonical decimal string
  unit: canonical unit string | null
  role: string 1..80
}
qualifiers: {
  negated: boolean
  time?: string | null
  location?: string | null
  population?: string | null
  condition?: string | null
  method?: string | null
  scope?: string | null
  estimate?: boolean
}
topic_key: trivia topic allowlist value
normalization_version: const 1
ontology_version: const 1
```

Server menghitung normalized claim, structured key, dan hashes. Caller tidak mengirim authoritative hashes.

`DedupDecisionV1`:

```text
decision: enum[same, distinct]
candidate_fact_public_id?: PublicId, required for same and reviewed strong candidates
reason: string 1..500
material_differences: array 0..10 of enum[
  relation, negation, number, unit, time, location, population, condition,
  comparison_direction, method, scope, other
]
```

`uncertain` tidak diterima oleh reserve tool; uncertain candidate berhenti pada review.

---

## 12. Contract trivia fact tools

### 12.1 `trivia_find_similar_facts`

**Title:** Find similar trivia facts

**Description:** Use this after researching atomic candidate claims and before registering them. It returns exact, structured, and ranked semantic-review candidates plus reuse signals; it never decides paraphrase equivalence by itself.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
page_public_id: PublicId
candidates: array 1..9 of TriviaCandidateV1
max_matches_per_candidate: integer 1..20, default 10
```

Output per candidate:

```text
candidate_key
normalized_preview
matches: array 0..20 of {
  fact_public_id: PublicId
  claim_text: string
  status: enum[needs_review, verified, rejected, invalidated, superseded]
  freshness: safe summary
  topic_key: string
  signals: array of enum[exact_claim, exact_structured, fts, trigram, entity,
                         numeric, qualifier, source_overlap]
  score_components: bounded named numeric object
  material_identity: subject/relation/object/numbers/qualifiers
  reuse_eligibility: enum[eligible, page_blocked, workspace_blocked,
                          actively_reserved, not_eligible]
  used_on_page_public_ids: bounded public ID array
}
review_required: boolean
```

Errors: global read errors, `PAGE_NOT_FOUND`, `MODULE_DISABLED`, `ONTOLOGY_VERSION_UNSUPPORTED`, `VALIDATION_FAILED`.

### 12.2 `trivia_register_and_reserve_facts`

**Title:** Register and reserve trivia facts

**Description:** Use this only after source verification and semantic dedup review. It atomically reuses or creates canonical facts and reserves the exact ordered set for one Page and one future post.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
operation_key: OperationKey
page_public_id: PublicId
reservation_token: UUID v4 generated for this logical post
expected_config_updated_at: Timestamp
fact_reuse_scope: enum[workspace_unique, page_unique]
reservation_ttl_minutes: integer 5..120
facts: array 1..9 of {
  position: integer 1..9, contiguous and unique
  candidate: TriviaCandidateV1
  dedup_reviews: array of DedupDecisionV1
  sources: array 1..8 of SourceEvidenceV1
  freshness_class: enum[stable, periodic, volatile]
  as_of_date: Date | null
  requested_expires_at: Timestamp
  risk_class: enum[standard, sensitive]
  verification_note: string 1..1000
}
```

Output:

```text
reservation_token
page_public_id
fact_reuse_scope
reserved_until: Timestamp
facts: ordered array of {
  position
  fact_public_id
  canonical_claim
  canonical_action: enum[matched_existing, created_new, refreshed_existing]
  verification_status: const verified
  expires_at: Timestamp
}
replayed: boolean
```

Reservasi set all-or-nothing. `canonical_action` tidak mengizinkan silent merge berbasis text similarity.

### 12.3 `trivia_release_facts`

**Title:** Release reserved trivia facts

**Description:** Use this when a draft attempt is abandoned before save. It idempotently releases only facts still owned by the supplied reservation token; it never releases allocated or published facts.

Input: write common fields plus `page_public_id`, `reservation_token`, `reason: SafeReason`.

Output: released fact public IDs, already inactive count, `replayed`.

### 12.4 `trivia_reverify_fact`

**Title:** Reverify a trivia fact

**Description:** Use this after fresh research confirms the same atomic proposition. It replaces current verification evidence and freshness metadata without changing the fact's meaning or identity.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
operation_key: OperationKey
fact_public_id: PublicId
expected_fact_updated_at: Timestamp
confirmed_claim_text: string 1..500
sources: array 1..8 of SourceEvidenceV1
freshness_class: enum[stable, periodic, volatile]
as_of_date: Date | null
requested_expires_at: Timestamp
risk_class: enum[standard, sensitive]
review_note: string 1..1000
```

Output: current fact public ID/status, server verification time, effective expiry, affected draft/ready post summaries, `replayed`.

Meaning change is rejected with `FACT_CORRECTION_REQUIRED`.

### 12.5 `trivia_correct_fact`

**Title:** Correct or invalidate a trivia fact

**Description:** Use this after evidence shows a canonical fact is wrong or materially changed. It either invalidates the fact or creates one corrected successor, and may return affected ready posts to draft.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
operation_key: OperationKey
fact_public_id: PublicId
expected_fact_updated_at: Timestamp
action: enum[invalidate, supersede]
correction_reason: SafeReason
successor?: {
  candidate: TriviaCandidateV1
  dedup_reviews: DedupDecisionV1[]
  sources: SourceEvidenceV1[]
  freshness_class: enum[stable, periodic, volatile]
  as_of_date: Date | null
  requested_expires_at: Timestamp
  risk_class: enum[standard, sensitive]
  verification_note: string 1..1000
}
explicit_correction: const true
```

`successor` wajib untuk `supersede` dan dilarang untuk `invalidate`.

Output: old status, optional successor public ID, affected draft/ready/posted counts and public IDs within response limit, `replayed`.

Errors shared by trivia writes: global write errors plus `FACT_HASH_COLLISION`, `FACT_REVIEW_REQUIRED`, `FACT_NOT_ELIGIBLE`, `FACT_FRESHNESS_EXPIRED`, `FACT_SOURCE_INSUFFICIENT`, `FACT_RESERVATION_CONFLICT`, `FACT_RESERVATION_EXPIRED`, `FACT_RESERVATION_MISMATCH`, `FACT_RESERVATION_CONTEXT_CHANGED`, `FACT_REUSE_BLOCKED`, `FACT_CORRECTION_REQUIRED`, `FACT_CORRECTION_CONFLICT`.

---

## 13. Contract post read tools

### 13.1 `list_posts`

**Title:** List content posts

**Description:** Use this to find drafts, ready posts, publication history, or calendar entries using bounded filters. It returns summaries, not full content packages.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
page_public_id?: PublicId
niche_key?: NicheKey
statuses?: array of post status
format_key?: string
topic_key?: string
scheduled_from?: Timestamp
scheduled_to?: Timestamp
created_from?: Timestamp
created_to?: Timestamp
query?: string 1..120
limit?: integer 1..50, default 20
cursor?: Cursor
```

Output summary includes post public ID, Page, niche, status, revision, format, topic, interaction goal, schedule/publication timestamps, quality status, short hook preview, and updated time.

### 13.2 `get_post`

**Title:** Get a content post

**Description:** Use this before revision, approval, discard, publication recording, or detailed review. It returns the current revision, content hash, full public copy, checks, fact bindings, and relevant lifecycle state.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
post_public_id: PublicId
include_sources?: boolean, default true
include_checks?: boolean, default true
include_latest_metrics?: boolean, default false
```

Output: `PostPackageV1`, approval summary, plan-item link if any, current correction/freshness warnings, and optional latest metrics.

Errors: global read errors, `POST_NOT_FOUND`.

---

## 14. Shared post write schemas

### 14.1 `FactBindingInputV1`

```text
position: integer 1..9, contiguous and unique
fact_public_id: PublicId
fact_role: enum[general, myth_reversal, numeric_comparison, emotional,
                practical, scientific, visual]
rendered_text: string 1..90 chars and max 18 words
```

### 14.2 Module content fields

Untuk niche trivia versi 1:

```text
content_schema_version: const 1
format_key: trivia format allowlist value
topic_key: trivia topic allowlist value
interaction_goal: enum[share, save, comment, follow]
content_payload: TriviaContentPayloadV1
generation_snapshot: TriviaGenerationSnapshotV1
fact_bindings: array 1..9 of FactBindingInputV1
editorial_checks: EditorialAttestationInputV1
```

`TriviaContentPayloadV1` dan `TriviaGenerationSnapshotV1` mengikuti module contract dan trivia DNA. `canva_copy` harus sama persis dengan canonical renderer output; server menghitung ulang metrics dan content hash.

---

## 15. Contract post write tools

### 15.1 `save_post`

**Title:** Save a content draft

**Description:** Use this after facts are reserved and the content has been reviewed. It atomically saves one draft, converts reservations into fact allocations, and completes a claimed plan item when supplied.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
operation_key: OperationKey
page_public_id: PublicId
niche_key: const "trivia" for MVP
reservation_token: UUID
expected_config_updated_at: Timestamp
plan_item?: {
  plan_item_public_id: PublicId
  claim_token: UUID
} | null
scheduled_at: Timestamp | null
content_schema_version: 1
format_key, topic_key, interaction_goal
content_payload: TriviaContentPayloadV1
generation_snapshot: TriviaGenerationSnapshotV1
fact_bindings: FactBindingInputV1[]
editorial_checks: EditorialAttestationInputV1
```

Output: `PostPackageV1`, optional updated plan progress, `replayed`.

Save tetap dapat menghasilkan draft dengan quality warnings/failures yang perlu diperbaiki. Save tidak pernah menghasilkan `ready`.

### 15.2 `revise_post`

**Title:** Revise a content post

**Description:** Use this to change the copy, format, topic, interaction goal, or fact set of a draft or ready post. It uses compare-and-swap; replacing facts requires a matching fresh reservation and ready posts return to draft.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
operation_key: OperationKey
post_public_id: PublicId
expected_revision: integer >= 1
expected_content_hash: SHA-256 hex
reservation_token?: UUID | null
content_schema_version: 1
format_key, topic_key, interaction_goal
content_payload: TriviaContentPayloadV1
generation_snapshot: TriviaGenerationSnapshotV1
fact_bindings: FactBindingInputV1[]
editorial_checks: EditorialAttestationInputV1
revision_reason: SafeReason
```

Output: updated `PostPackageV1`, released/replaced fact IDs, approval invalidation flag, `replayed`.

### 15.3 `reschedule_post`

**Title:** Reschedule a content post

**Description:** Use this when the user asks to move or clear a draft or ready post's planned time. It changes schedule only, checks cross-table slot conflicts, and increments revision.

Input: write common fields plus `post_public_id`, `expected_revision`, `scheduled_at: Timestamp | null`, `reason: SafeReason`.

Output: post public ID, status, revision, content hash unchanged flag, new schedule, linked plan-item schedule when applicable, `replayed`.

### 15.4 `approve_post`

**Title:** Approve a post for publishing

**Description:** Use this only after the user explicitly approves the current draft. It recomputes blocking checks and changes the exact reviewed revision from draft to ready.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
operation_key: OperationKey
post_public_id: PublicId
expected_revision: integer >= 1
expected_content_hash: SHA-256 hex
explicit_approval: const true
accepted_warning_ids: array 0..20 of allowlisted noncritical warning IDs
warning_acceptance_reason?: string 1..500 | null
```

Output: post public ID, status `ready`, new revision, approval snapshot summary, recomputed checks, `replayed`.

Actor dan approval timestamp berasal dari server.

### 15.5 `revoke_post_approval`

**Title:** Revoke post approval

**Description:** Use this only when the user asks to withdraw approval from a ready post. It returns the post to draft and invalidates the current approval without changing public copy.

Input: write common fields plus `post_public_id`, `expected_revision`, `expected_content_hash`, `reason: SafeReason`, `explicit_revocation: const true`.

Output: post public ID, status `draft`, new revision, approval revoked flag, `replayed`.

### 15.6 `discard_post`

**Title:** Discard a content post

**Description:** Use this only when the user abandons a draft or ready post. It makes the post terminal, releases allocated trivia facts, and does not automatically create a replacement plan item.

Input: write common fields plus `post_public_id`, `expected_revision`, `reason: SafeReason`, `explicit_discard: const true`.

Output: status `discarded`, new revision, released fact IDs, optional plan item and replacement eligibility, `replayed`.

### 15.7 `mark_post_posted`

**Title:** Mark a post as published

**Description:** Use this only after the user confirms the post was actually published manually. It does not contact Facebook; it records publication details and makes fact usage permanent.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
operation_key: OperationKey
post_public_id: PublicId
expected_revision: integer >= 1
expected_content_hash: SHA-256 hex
published_at: Timestamp
platform_post_id?: string 1..200 | null
published_url?: HttpsUrl | null
explicit_publication_confirmation: const true
```

Output: post ID, status `posted`, new revision, publication fields, published fact IDs, `replayed`.

### 15.8 `archive_post`

**Title:** Archive a published post

**Description:** Use this only when the user asks to remove a posted item from the active workflow. It preserves publication history, fact usage, metrics, and source snapshots.

Input: write common fields plus `post_public_id`, `expected_revision`, `reason: SafeReason`, `explicit_archive: const true`.

Output: post ID, status `archived`, new revision, archived timestamp, `replayed`.

Errors shared by post writes:

- Global write errors.
- `POST_NOT_FOUND`, `REVISION_CONFLICT`, `CONTENT_HASH_CONFLICT`.
- `INVALID_STATUS_TRANSITION`, `SCHEDULE_CONFLICT`.
- Module/config/content/format/topic/profile errors.
- Reservation/reuse/source errors.
- `CONTENT_RENDER_MISMATCH`, `TEXT_BUDGET_EXCEEDED`, `READABILITY_LIMIT_EXCEEDED`.
- `QUALITY_SYSTEM_CHECK_FAILED`, `QUALITY_EDITORIAL_INCOMPLETE`, `QUALITY_EVIDENCE_STALE`.
- `APPROVAL_REQUIRED`, `APPROVAL_STALE`, `WAIVER_NOT_ALLOWED`.

---

## 16. Contract performance tools

### 16.1 `record_post_performance`

**Title:** Record post performance

**Description:** Use this when the user provides observed Facebook metrics for a posted or archived post. It appends one immutable snapshot and does not fetch or infer missing metrics.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
operation_key: OperationKey
post_public_id: PublicId
captured_at: Timestamp
metrics: object with at least one non-null field {
  views?: integer >= 0 | null
  reach?: integer >= 0 | null
  reactions?: integer >= 0 | null
  likes?: integer >= 0 | null
  comments?: integer >= 0 | null
  shares?: integer >= 0 | null
  saves?: integer >= 0 | null
  follows?: integer >= 0 | null
  watch_time_seconds?: number >= 0 | null
  average_watch_time_seconds?: number >= 0 | null
}
source: {
  source_type: enum[facebook_ui, facebook_export, user_reported, other]
  source_reported_at?: Timestamp | null
  timezone?: IANA timezone | null
  metric_definition_version: const 1
  note?: string 1..500 | null
}
```

Jika keduanya tersedia, `likes <= reactions`. Null tidak diubah menjadi zero.

Output: metric snapshot public ID, post ID, normalized values, captured time, anomaly flags, `replayed`.

### 16.2 `get_post_performance`

**Title:** Get post performance history

**Description:** Use this to inspect metric snapshots and compatible deltas for one post. Cumulative snapshots are never summed.

Input: common read fields plus `post_public_id`, optional `captured_from`, `captured_to`, pagination dengan maksimum 100.

Output: ordered snapshots, latest snapshot, compatible adjacent deltas, correction/anomaly flags, next cursor.

### 16.3 `get_performance_insights`

**Title:** Get performance insights

**Description:** Use this to compare evidence-backed performance patterns for a Page and niche. It returns sample sizes and periods and never claims correlation is causation.

Input:

```text
request_schema_version: const 1
workspace_public_id: PublicId
page_public_id: PublicId
niche_key: NicheKey
captured_from?: Timestamp
captured_to?: Timestamp
dimensions: array 1..5 of enum[topic, format, interaction_goal, profile,
                                      fact_count, hook_pattern, cta_pattern]
metric: enum[views, reach, reactions, likes, comments, shares, saves, follows,
             watch_time_seconds, average_watch_time_seconds]
minimum_sample_size: integer 1..100, default 5
limit: integer 1..50, default 20
```

Output:

```text
scope and observation period
metric_definition_version
eligible_post_count
excluded_post_count and reasons
groups: array of {
  dimension_values
  sample_size
  age distribution summary
  metric summary with median and bounded descriptive statistics
  evidence_strength: enum[insufficient, exploratory, notable]
  caveats: string[]
}
```

Errors shared by metrics tools: global errors, `POST_NOT_FOUND`, `POST_NOT_PUBLISHED`, `METRIC_DEFINITION_AMBIGUOUS`, `METRIC_SNAPSHOT_CONFLICT`. Evidence yang belum cukup dikembalikan sebagai successful insufficient result, bukan server failure.

---

## 17. Annotation matrix

Setiap tool mendaftarkan:

```text
annotations:
  readOnlyHint: explicit boolean
  destructiveHint: explicit boolean
  openWorldHint: false
```

Rules:

- Inventory table pada bagian 7 adalah authority untuk annotation setiap tool.
- Write, claim, lease renewal, failure report, reserve, release, save, approval, lifecycle, dan metrics insert selalu `readOnlyHint: false`.
- `openWorldHint` selalu false karena seluruh tool dibatasi pada private Content Producer workspace. Research internet dilakukan oleh host, bukan MCP server.
- Destructive true tidak menggantikan explicit confirmation fields pada correction dan terminal transitions.
- Annotation tidak menggantikan OAuth, server authorization, validation, atau RLS.

---

## 18. Stable error catalog

### 18.1 Global

| Code | Retryable | Recovery |
|---|---:|---|
| `AUTH_REQUIRED` | false | Relink account melalui OAuth |
| `TOKEN_INVALID` | false | Relink; jangan retry token yang sama |
| `TOKEN_RESOURCE_MISMATCH` | false | Gunakan connection untuk canonical MCP resource |
| `OWNER_ACCESS_REQUIRED` | false | Gunakan account owner yang diizinkan |
| `FORBIDDEN` | false | Hentikan tanpa meminta data lintas-owner |
| `WORKSPACE_NOT_FOUND` | false | Ambil profile/workspace current |
| `VALIDATION_FAILED` | false | Perbaiki field errors |
| `OPERATION_KEY_REUSED` | false | Buat key baru untuk intent baru |
| `RATE_LIMITED` | true | Tunggu `retry_after_seconds` |
| `DATABASE_BUSY` | true | Retry payload dan operation key yang sama |
| `DATABASE_UNAVAILABLE` | true | Jangan klaim sukses; coba nanti |
| `INTERNAL_ERROR` | conditional | Laporkan safe reference; jangan menebak hasil write |

### 18.2 Resource dan concurrency

| Code | Recovery |
|---|---|
| `PAGE_NOT_FOUND`, `PLAN_NOT_FOUND`, `PLAN_ITEM_NOT_FOUND`, `POST_NOT_FOUND`, `FACT_NOT_FOUND` | List/get resource current |
| `PAGE_VERSION_CONFLICT` | Ambil Page/config current lalu reconcile |
| `REVISION_CONFLICT`, `CONTENT_HASH_CONFLICT` | Ambil post current dan minta keputusan bila perubahan bentrok |
| `SCHEDULE_CONFLICT` | Tampilkan slot konflik; jangan geser otomatis |
| `INVALID_STATUS_TRANSITION` | Gunakan aksi lifecycle legal |

### 18.3 Modul, quality, fact, plan, dan metrics

Hanya code yang didefinisikan pada module contract, decision register, serta section tool di atas yang boleh keluar. Implementasi menyediakan satu registry code-to-safe-message dan satu test yang gagal bila handler menghasilkan code tidak terdaftar.

Database constraint/error diubah menjadi code domain. Raw Postgres code tidak dikirim sebagai `error.code` publik.

---

## 19. Orchestration sequence normatif

### 19.1 Resolusi koneksi

```text
get_account_profile
→ get_workspace_context bila workspace/module belum dikenal
→ list_pages bila Page belum dapat di-resolve secara unik
```

Jangan membuat Page hanya karena pencarian tidak menemukannya; creation membutuhkan intent pengguna.

### 19.2 Satu post trivia

```text
get_page_generation_context
→ ChatGPT melakukan research di luar MCP
→ trivia_find_similar_facts
→ ChatGPT memutuskan same/distinct atau mengganti uncertain candidate
→ trivia_register_and_reserve_facts
→ ChatGPT menulis final copy dan editorial checks
→ save_post
→ get_post bila perlu untuk presentasi/review
```

Jika alur berhenti setelah reserve dan sebelum save, panggil `trivia_release_facts`. Jangan menunggu respons pengguna dengan reservation aktif jika release aman dapat dilakukan; TTL adalah fallback.

### 19.3 Batch/calendar

```text
create_content_plan
→ claim_content_plan_items (1–3)
→ jalankan single-post flow per item
→ save_post dengan plan_item + claim_token
→ report_content_plan_item_failure bila attempt tidak dapat disimpan
→ ulangi get/claim pada putaran berikutnya
```

Renew hanya digunakan ketika lease masih aktif dan processing benar-benar memerlukan waktu tambahan. Retry item failed dan replacement item discarded adalah keputusan eksplisit yang berbeda.

### 19.4 Review dan revision

```text
get_post
→ jika mengganti fact: research → find similar → reserve
→ revise_post memakai current revision/hash
→ release reservation bila revision dibatalkan sebelum revise
```

`REVISION_CONFLICT` tidak pernah diatasi dengan silent retry memakai revision terbaru. Caller membaca versi current dan merekonsiliasi intent.

### 19.5 Approval

```text
get_post
→ tampilkan exact current content dan blocking/nonblocking checks
→ tunggu perintah approval eksplisit
→ approve_post
```

Permintaan untuk melihat, merangkum, atau memperbaiki post bukan approval.

### 19.6 Publikasi manual dan metrics

```text
pengguna mempublikasikan di Facebook secara manual
→ pengguna mengonfirmasi publikasi
→ get_post bila revision/hash belum current
→ mark_post_posted
→ record_post_performance saat angka tersedia
→ get_performance_insights setelah evidence memadai
```

Tool tidak menganggap URL yang diberikan sebagai bukti bahwa upload dilakukan oleh tool.

---

## 20. Server instructions v1

Initialization instructions harus ringkas; aturan paling penting diletakkan pada 512 karakter pertama. Intent normatif:

> Resolve the authenticated workspace and Page before writes. Read Page generation context before drafting. Research happens outside this server. Check trivia candidates, then reserve the exact verified fact set before save. A save creates a draft only. Never approve, discard, mark posted, archive, cancel, replace, or correct a fact without the user's explicit intent. On conflicts, read current state; never silently overwrite. Release unused reservations.

Deskripsi tool menyimpan detail per aksi. Server instructions tidak mengulang seluruh schema atau mencoba mengubah personality model.

---

## 21. Result minimization dan privacy

- Tool hanya mengembalikan public IDs.
- Email profile dimask; authorization tidak memakai email output.
- Recent-content context memakai bounded summaries dan tidak mengembalikan full history tanpa kebutuhan.
- Source result tidak mengembalikan full page text.
- Log/response tidak mengandung bearer token, refresh token, authorization code, password, service key, raw transcript, atau full source documents.
- Request/trace ID tetap di log internal kecuali safe support reference benar-benar dibutuhkan untuk error investigation.
- Reservation dan claim token hanya dikembalikan oleh tool yang membuat/memperpanjangnya dan diterima hanya oleh operasi yang membutuhkannya.

---

## 22. Rate limit dan payload limits

| Group | Limit default | Tool |
|---|---:|---|
| `read` | 120/menit | Profile, context, list/get |
| `expensive_read` | 20/menit | Similar facts, performance insights |
| `write` | 30/menit | Create/update, retry, approval, metrics |
| `contention_write` | 20/menit | Claim, reserve, save, replace facts, terminal allocation changes |

Limits tambahan:

- Request body maksimum 256 KiB.
- Structured response maksimum 256 KiB; pagination dipakai sebelum melebihi batas.
- Source evidence maksimum 8 per fact.
- Similar candidates maksimum 9 input × 20 results.
- Satu plan maksimum 100 items pada MVP.
- Claim maksimum 3 items.
- Satu post trivia maksimum 9 facts.
- Quality/evidence JSON masing-masing maksimum 32 KiB.

Rate limit diterapkan setelah auth dan sebelum business mutation. Error mengembalikan `retry_after_seconds`.

---

## 23. Tool yang diubah atau dihapus dari baseline lama

| Baseline lama | Keputusan final | Alasan |
|---|---|---|
| `health_check` | Bukan MCP tool; gunakan HTTP `/health` | Bukan content user goal |
| `list_niches` | Diserap `get_workspace_context` | Menghapus retrieval overlap |
| `get_posts` | Dipecah menjadi `list_posts` dan `get_post` | List dan exact detail berbeda |
| `update_post_status` | Dihapus | Generic status mutation terlalu ambigu |
| `discard_post` | Tetap khusus | Terminal side effect perlu jelas |
| Status `ready` | `approve_post` | Membutuhkan explicit approval dan quality gate |
| Status `posted` | `mark_post_posted` | Tidak boleh tersirat sebagai Facebook publishing |
| Status `archived` | `archive_post` | Terminal action terpisah |
| `create_content_plan` + `get_content_plan` saja | Ditambah claim/recovery tools | Lease invariant sebelumnya tidak dapat dioperasikan |
| Fact reserve/release saja | Ditambah reverify/correct | Freshness dan correction lineage perlu jalur aman |

Jumlah tool bertambah, tetapi setiap tool menjadi lebih sempit, dapat dianotasi akurat, dan dapat diuji secara independen.

---

## 24. Contract test requirements

### 24.1 Metadata tests

Untuk seluruh 33 tool:

- Nama unik dan action-oriented.
- Title dan description nonempty serta sesuai behavior.
- Input schema dan output schema dapat diparse.
- `additionalProperties: false` pada object kontraktual.
- OAuth security scheme terdeklarasi per tool.
- Ketiga annotation bernilai boolean eksplisit.
- `openWorldHint` false.
- Tidak ada generic executor atau hidden operation.

### 24.2 Auth tests

- Initialize/list-tools mengikuti transport/discovery contract.
- Tool tanpa token memicu OAuth challenge yang benar.
- Invalid issuer, audience/resource, expiry, scope, atau missing OAuth client ditolak.
- Non-owner tidak mendapat data existence leak.
- Browser session biasa tanpa OAuth `client_id` tidak dapat memakai tool.
- Profile metadata hanya ada pada `get_account_profile`.

### 24.3 Read tests

- Filter, pagination, cursor, empty state, dan limits deterministik.
- Tidak ada internal ID, secret, atau unrelated rows.
- Read tool tidak membuat ledger/business mutation.
- Similarity tool tidak auto-merge berdasarkan rank.
- Insight menampilkan sample size, period, dan caveat.

### 24.4 Write tests

- First success, exact replay, reused-key mismatch, validation failure, auth failure, rate limit, dan database timeout.
- Response replay tidak mengulang side effect atau revision increment.
- CAS conflict mengembalikan current safe state.
- Destructive/explicit actions menolak missing confirmation const.
- Setiap failure atomic dan tidak meninggalkan partial rows.

### 24.5 Sequence tests

- Save tanpa reservation ditolak.
- Save plan item tanpa active claim ditolak.
- Abandoned reservation dapat dilepas idempotently.
- Approval tanpa explicit user intent tidak dipanggil pada evaluation.
- Mark posted tidak dipilih untuk permintaan “jadwalkan di Facebook”.
- Batch resume tidak membuat ulang completed items.
- Retry failed dan replacement discarded tidak tertukar.
- Correction fact memengaruhi ready/draft tetapi tidak menulis ulang posted snapshot.

### 24.6 MCP Inspector dan ChatGPT tests

- Initialization dan tool listing berhasil.
- Setiap tool dipanggil dengan valid/invalid representative input.
- Structured result dan text summary konsisten.
- OAuth sign-in/consent/relink berhasil.
- Direct, indirect, edge-case, recovery, dan out-of-scope prompts dari langkah 0.9 memilih tool yang benar.

---

## 25. Trade-off yang diterima

- 33 focused tools lebih banyak daripada baseline 19 tool, tetapi menghilangkan generic status mutation dan menutup recovery paths yang sebelumnya tidak dapat dioperasikan.
- Semua tool memerlukan OAuth, termasuk reads, sehingga setup awal lebih berat tetapi private workspace tidak memiliki anonymous data surface.
- `update_page`, reverify, revision, dan reschedule diberi destructive hint konservatif karena melakukan overwrite, meski sebagian dapat diperbaiki dengan mutation berikutnya.
- Claim/renew/failure adalah operational tools, tetapi diperlukan karena Edge Function stateless dan tidak ada background worker.
- Tool tidak melakukan research sehingga orchestration memerlukan capability web host, tetapi database transaction tetap pendek dan reproducible.
- Exact schemas menambah maintenance; versioning dan compatibility tests mencegah perubahan diam-diam.
- Batas 100 plan items menghindari satu mutation/payload tak terbatas; plan lebih besar dipecah menjadi beberapa plan.

---

## 26. Verification gate langkah 0.8

Status: **lulus**.

- `TOOL-001` dan `TOOL-002` berstatus `accepted`.
- Inventory final berisi 33 focused tools tanpa generic executor.
- Setiap tool memiliki satu tujuan, title, description, input/output contract, auth, annotation, rate group, error family, dan orchestration position.
- Missing plan lease/recovery, explicit approval, lifecycle, fact correction, serta metrics history paths telah ditutup.
- Overlap `health_check`, `list_niches`, `get_posts`, dan `update_post_status` telah diselesaikan.
- Semua tools privat memakai per-tool OAuth scheme.
- Seluruh tool memakai bounded private workspace sehingga `openWorldHint: false`.
- Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.
- Langkah berikutnya adalah 0.9 — membuat use-case inventory dan evaluation prompts terhadap kontrak tool ini.

---

## 27. Referensi

- [OpenAI — Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
- [OpenAI — Authentication for plugins](https://developers.openai.com/plugins/build/auth)
- [OpenAI — Plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines)
- [Supabase — Deploy MCP servers](https://supabase.com/docs/guides/ai-tools/byo-mcp)
- [Supabase — MCP authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
- [Supabase changelog — OAuth token endpoint HTTP 200](https://supabase.com/changelog/45468-breaking-change-oauth-token-endpoint-will-return-http-200-instead-of-201)
- `plans/PRD.md`
- `plans/database-design.md`
- `plans/module-contract.md`
- `plans/trivia-content-dna.md`
- `plans/phase-0-decision-register.md`
