# Database Design — Content Producer MVP

## 1. Informasi dokumen

| Bagian | Keterangan |
|---|---|
| Nama produk | Content Producer |
| Versi produk | MVP |
| Versi dokumen | 2.2 |
| Status | Frozen — baseline Phase 0 |
| Tanggal | 7 Oktober 2026 |
| Database | Supabase Postgres |
| Dokumen induk | plans/PRD.md |
| Niche aktif MVP | trivia |

Dokumen ini menjadi sumber utama untuk nama tabel dan kolom, relasi, constraint, index, kontrak JSONB, lifecycle, transaksi, concurrency, database function, RLS, privilege, dan pengujian database.

Jika dokumen ini bertentangan dengan PRD, PRD menjadi acuan kebutuhan produk dan desain database harus diperbarui. Dokumen ini mendeskripsikan target schema. Migration dan source code yang sebenarnya tetap menjadi sumber eksekusi setelah implementasi dimulai.

---

## 2. Ringkasan keputusan desain

Database dipisahkan menjadi core generik dan modul niche.

### 2.1 Tabel core

1. **public.workspaces**
2. **public.niches**
3. **public.pages**
4. **public.page_niche_configs**
5. **public.content_plans**
6. **public.content_plan_items**
7. **public.posts**
8. **public.post_metrics**

### 2.2 Tabel modul trivia

9. **public.trivia_facts**
10. **public.trivia_post_facts**

### 2.3 Tabel internal operasional

11. **internal.operation_ledger** — idempotency global lintas seluruh write RPC.
12. **internal.rate_limit_buckets** — fixed-window rate limiting per actor, OAuth client, dan limit group.

Sepuluh tabel pertama adalah tabel aplikasi/domain. Dua tabel `internal` bukan surface produk, tidak diekspos melalui Data API, dan tidak dapat diakses langsung oleh MCP caller.

Jumlah tabel tidak dijadikan ukuran kesederhanaan. Relasi eksplisit dipilih ketika mengurangi trigger, array ringkasan, JSON references, dan risiko data tidak sinkron.

| Kebutuhan PRD | Penyelesaian database |
|---|---|
| Satu owner | workspaces.owner_user_id mengacu ke auth.users.id |
| Multi-Page | pages.workspace_id |
| Multi-niche | niches dan page_niche_configs |
| Trivia-only MVP | hanya registry trivia yang aktif dan hanya modul trivia yang diimplementasikan |
| Konfigurasi per Page+niche | page_niche_configs.config |
| Core netral terhadap niche | plans, posts, metrics, lifecycle, dan jadwal tidak bergantung pada trivia |
| Batch dapat dilanjutkan | content_plans dan content_plan_items |
| Revisi | posts.revision tanpa tabel versions |
| Status post | draft, ready, posted, discarded, archived |
| Relasi post–fakta | trivia_post_facts dengan foreign key nyata |
| Snapshot publikasi | wording, hash, sumber, dan verified_at disimpan pada junction |
| Canonical dedup | claim_hash unik per workspace; structured_hash unik hanya untuk row yang lengkap dan deterministic-safe |
| Near duplicate | Full Text Search dan pg_trgm |
| Reservasi paralel | lock pada trivia_facts dan reservation token |
| Reuse fakta | dihitung dari trivia_post_facts yang allocated atau published |
| Idempotensi | `internal.operation_ledger` dengan unique workspace + operation key lintas seluruh write RPC |
| Konflik revisi | compare-and-swap menggunakan revision |
| Kalender | plan items menyimpan intent; posts menyimpan jadwal output |
| Performa | post_metrics sebagai time-series snapshot manual |
| Tanpa embeddings | tidak ada vector extension atau vector column |

Deduplikasi canonical dan reuse adalah dua konsep berbeda:

- Deduplikasi memastikan satu klaim memiliki satu row canonical dalam workspace.
- Reuse menentukan apakah canonical fact boleh dialokasikan kepada Page tujuan.
- Workspace unique dan page unique dievaluasi saat reservasi dan diperiksa kembali saat penyimpanan.

---

## 3. Prinsip desain

### 3.1 Core generik, modul niche spesifik

Core menyimpan ownership, Page, konfigurasi niche, plan, post, lifecycle, jadwal, dan performa. Core tidak mengetahui struktur internal fakta trivia.

Modul trivia memiliki canonical facts, deduplikasi, sumber, reservasi, dan junction post–fact. Niche baru menambahkan tabel library dan junction sendiri hanya jika membutuhkan reusable items.

Tidak digunakan foreign key polymorphic berbentuk item_type + item_id karena PostgreSQL tidak dapat menjamin referential integrity ke beberapa tabel berbeda.

### 3.2 Integritas lebih penting daripada jumlah tabel

- Foreign key nyata lebih diprioritaskan daripada ID di JSON.
- Ringkasan penggunaan tidak disimpan sebagai array used_page_ids.
- use_count tidak menjadi sumber kebenaran.
- Jumlah penggunaan dihitung dari trivia_post_facts.
- JSONB dipakai untuk payload berversi, bukan untuk menggantikan relasi penting.

### 3.3 Database menjaga state; ChatGPT menjaga editorial

Database bertanggung jawab atas:

- Ownership dan authorization predicate.
- Relasi dan schema version.
- Keunikan canonical.
- Reservasi, reuse, dan concurrency.
- Idempotensi.
- Lifecycle dan revision conflict.
- Jadwal dan plan progress.
- System checks yang benar-benar dapat diverifikasi.
- Snapshot performa.

ChatGPT bertanggung jawab atas:

- Penelitian dan kecukupan sumber.
- Penilaian kemiripan makna kandidat.
- Grammar, gaya, dan keterbacaan.
- Pemilihan format, hook, CTA, caption, dan hashtag.
- Editorial checks.

Database tidak menyatakan fact_accuracy benar hanya karena sebuah boolean dikirim model.

### 3.4 Transaksi pendek dan dapat diulang

- Web research dan generasi AI dilakukan di luar transaksi.
- Transaction hanya memvalidasi data final, mengunci row yang diperlukan, lalu menulis.
- Row fakta dikunci dalam urutan ID konsisten.
- Global operation ledger membuat retry aman dan menolak key yang dipakai ulang untuk payload/operation berbeda.
- Semua update post menggunakan expected_revision.

### 3.5 Versioning kontrak

- page_niche_configs memiliki config_schema_version.
- posts memiliki content_schema_version.
- trivia_facts memiliki normalization_version dan ontology_version.
- JSONB payload lama tetap dapat dibaca setelah modul berkembang.
- Perubahan breaking membutuhkan migration atau validator versi baru.

---

## 4. Gambaran relasi

~~~mermaid
erDiagram
    AUTH_USERS ||--o{ WORKSPACES : owns
    WORKSPACES ||--o{ PAGES : contains
    NICHES ||--o{ PAGE_NICHE_CONFIGS : configures
    PAGES ||--o{ PAGE_NICHE_CONFIGS : enables

    WORKSPACES ||--o{ CONTENT_PLANS : owns
    PAGES ||--o{ CONTENT_PLANS : plans
    NICHES ||--o{ CONTENT_PLANS : classifies
    CONTENT_PLANS ||--o{ CONTENT_PLAN_ITEMS : contains

    WORKSPACES ||--o{ POSTS : owns
    PAGES ||--o{ POSTS : publishes
    NICHES ||--o{ POSTS : classifies
    CONTENT_PLAN_ITEMS o|--o{ POSTS : attempts

    POSTS ||--o{ POST_METRICS : measures

    WORKSPACES ||--o{ TRIVIA_FACTS : deduplicates
    POSTS ||--o{ TRIVIA_POST_FACTS : renders
    TRIVIA_FACTS ||--o{ TRIVIA_POST_FACTS : supplies
~~~

Satu post memiliki tepat satu niche. Satu content plan memiliki tepat satu Page dan satu niche. Kalender multi-niche dibentuk dari beberapa plan.

Satu plan item dapat mempunyai lebih dari satu post historis jika output sebelumnya discarded. Partial unique index memastikan hanya satu post non-discarded/non-archived yang menjadi output aktif untuk item tersebut.

---

## 5. Konvensi umum

### 5.1 Primary key dan public ID

Setiap tabel bisnis memakai:

- id bigint generated always as identity sebagai primary key internal.
- public_id uuid dengan default gen_random_uuid() sebagai ID eksternal.

MCP hanya mengembalikan public_id. Internal bigint digunakan untuk join dan lock.

Tabel registry niches memakai key text sebagai primary key karena nilainya kecil, stabil, dan merupakan kontrak modul.

### 5.2 Ownership dan workspace scope

Semua tabel user-owned membawa workspace_id secara langsung, termasuk tabel modul niche dan metrics. Redundansi ini disengaja agar:

- RLS sederhana.
- Query selalu workspace-scoped.
- Foreign key lintas workspace dapat ditolak.
- MCP tidak perlu menebak ownership melalui rantai join panjang.

Setiap foreign key lintas tabel memakai composite key jika diperlukan untuk memastikan workspace, Page, dan niche konsisten.

### 5.3 Waktu

- Semua timestamp memakai timestamptz dan disimpan dalam UTC.
- pages.timezone memakai nama IANA.
- scheduled_at adalah waktu absolut.
- captured_at menunjukkan kapan metrik diamati, bukan kapan row dimasukkan.
- Semua tabel mutable memiliki created_at dan updated_at.

### 5.4 Status

Status memakai text dengan check constraint, bukan PostgreSQL enum, agar penambahan state dapat dimigrasikan tanpa mengganti type global.

### 5.5 JSONB

JSONB hanya digunakan untuk:

- Konfigurasi berversi.
- Payload output yang berbeda antar-niche.
- Snapshot aturan generasi.
- Source collection dan editorial report.
- Metrik tambahan yang belum menjadi kolom stabil.

JSONB bukan sumber kebenaran untuk foreign key post–fact, ownership, status, jadwal, atau penggunaan fakta.

### 5.6 Soft lifecycle

Tidak ada hard delete melalui MCP.

- Workspace dan Page dinonaktifkan dengan is_active.
- Konfigurasi niche dinonaktifkan dengan is_enabled.
- Plan dibatalkan dengan status cancelled.
- Draft dibuang dengan status discarded.
- Post yang pernah dipublikasikan dapat menjadi archived.
- Fakta yang tidak layak menjadi rejected.

Semua foreign key memakai on delete restrict.

---

## 6. Extensions

MVP membutuhkan:

~~~sql
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
~~~

MVP tidak memasang vector, embeddings, queue, atau cron extension. Reservasi kedaluwarsa dibersihkan secara opportunistic ketika tool trivia dipanggil.

---

## 7. Tabel core

### 7.1 Tabel workspaces

#### Tanggung jawab

Menyimpan owner, bahasa default, market, serta setting core yang tidak khusus trivia.

#### Kolom

| Kolom | Tipe | Null | Default | Keterangan |
|---|---|---:|---|---|
| id | bigint identity | Tidak | identity | Primary key |
| public_id | uuid | Tidak | gen_random_uuid() | ID eksternal |
| owner_user_id | uuid | Tidak | — | FK ke auth.users.id |
| name | text | Tidak | — | Nama workspace |
| slug | text | Tidak | — | Identifier stabil |
| language_code | text | Tidak | en | Bahasa default |
| locale | text | Tidak | en-US | Locale default |
| target_markets | text[] | Tidak | US,GB,CA,AU | Market utama |
| settings | jsonb | Tidak | object | Setting core |
| is_active | boolean | Tidak | true | Workspace aktif |
| created_at | timestamptz | Tidak | now() | Dibuat |
| updated_at | timestamptz | Tidak | now() | Diubah |

#### Constraint

- Unique public_id.
- Unique slug.
- FK owner_user_id ke auth.users.id dengan on delete restrict.
- Maksimal satu workspace aktif per owner pada MVP.
- language_code = en dan locale = en-US pada MVP.
- target_markets hanya US, GB, CA, AU; UK dinormalisasi menjadi GB sebelum write.
- settings harus JSON object.

Contoh settings:

~~~json
{
  "schema_version": 1,
  "reservation_ttl_minutes": 30,
  "default_post_status": "draft",
  "default_plan_chunk_size": 4
}
~~~

Nilai reservation TTL antara 5–120 menit. Chunk size default 4 dan rentang MVP 1–5.

### 7.2 Tabel niches

#### Tanggung jawab

Registry modul niche yang dikenali sistem.

| Kolom | Tipe | Null | Default | Keterangan |
|---|---|---:|---|---|
| key | text | Tidak | — | Primary key stabil |
| name | text | Tidak | — | Nama tampilan |
| status | text | Tidak | development | development, active, disabled |
| module_version | integer | Tidak | 1 | Versi implementasi modul |
| config_schema_version | integer | Tidak | 1 | Versi config aktif |
| content_schema_version | integer | Tidak | 1 | Versi payload aktif |
| created_at | timestamptz | Tidak | now() | Dibuat |
| updated_at | timestamptz | Tidak | now() | Diubah |

MVP melakukan seed:

~~~sql
insert into public.niches
  (key, name, status, module_version, config_schema_version, content_schema_version)
values
  ('trivia', 'Trivia Facts', 'active', 1, 1, 1);
~~~

Registry hanya dapat dibaca oleh authenticated user. Perubahan dilakukan melalui migration, bukan tool percakapan.

### 7.3 Tabel pages

#### Tanggung jawab

Menyimpan identitas Page dan konfigurasi umum lintas-niche.

| Kolom | Tipe | Null | Default | Keterangan |
|---|---|---:|---|---|
| id | bigint identity | Tidak | identity | Primary key |
| public_id | uuid | Tidak | gen_random_uuid() | ID eksternal |
| workspace_id | bigint | Tidak | — | Workspace owner |
| name | text | Tidak | — | Nama Facebook Page |
| slug | text | Tidak | — | Unik dalam workspace |
| platform | text | Tidak | facebook | Platform |
| language_code | text | Tidak | en | Bahasa |
| locale | text | Tidak | en-US | Locale |
| timezone | text | Tidak | UTC | Zona IANA |
| target_markets | text[] | Tidak | US,GB,CA,AU | Market Page |
| default_niche_key | text | Ya | null | Default bila tidak ambigu |
| platform_config | jsonb | Tidak | object | Preferensi umum platform |
| is_active | boolean | Tidak | true | Aktif |
| created_at | timestamptz | Tidak | now() | Dibuat |
| updated_at | timestamptz | Tidak | now() | Diubah |

Aturan:

- Unique public_id dan unique workspace_id + slug.
- Composite unique workspace_id + id untuk foreign key scoped.
- platform hanya facebook pada MVP.
- default_niche_key harus menunjuk niche yang enabled untuk Page; invariant ini divalidasi RPC.
- Timezone harus terdapat pada pg_timezone_names.
- platform_config harus object.
- Tidak ada konfigurasi trivia di tabel ini.

### 7.4 Tabel page_niche_configs

#### Tanggung jawab

Menyimpan aturan produksi khusus satu niche pada satu Page.

| Kolom | Tipe | Null | Default | Keterangan |
|---|---|---:|---|---|
| id | bigint identity | Tidak | identity | Primary key |
| public_id | uuid | Tidak | gen_random_uuid() | ID eksternal |
| workspace_id | bigint | Tidak | — | Workspace |
| page_id | bigint | Tidak | — | Page |
| niche_key | text | Tidak | — | Modul niche |
| config_schema_version | integer | Tidak | 1 | Versi validator |
| config | jsonb | Tidak | — | Konfigurasi niche |
| is_enabled | boolean | Tidak | true | Boleh dipakai |
| is_default | boolean | Tidak | false | Default Page |
| created_at | timestamptz | Tidak | now() | Dibuat |
| updated_at | timestamptz | Tidak | now() | Diubah |

Constraint penting:

- Unique page_id + niche_key.
- Composite unique workspace_id + page_id + niche_key.
- FK workspace_id + page_id ke pages.
- FK niche_key ke niches.
- Hanya satu config enabled yang is_default per Page.
- config harus object dan lulus validator sesuai niche serta config_schema_version.

#### Config trivia versi 1

~~~json
{
  "allowed_formats": [
    "single_subject_fast",
    "themed_utility",
    "emotional_animal_collection",
    "comparison",
    "myth_vs_fact"
  ],
  "format_weights": {
    "single_subject_fast": 35,
    "themed_utility": 20,
    "emotional_animal_collection": 20,
    "comparison": 15,
    "myth_vs_fact": 10
  },
  "allowed_topics": [
    "animals",
    "pet_safety",
    "food_science",
    "food_storage_home",
    "practical_utility",
    "human_body",
    "nature_science",
    "geography",
    "history_origins",
    "inventions_everyday",
    "general_trivia"
  ],
  "topic_group_weights": {
    "animals_pet_safety": 30,
    "human_body_food_myth": 20,
    "practical_utility": 15,
    "places_geography": 15,
    "nature_space": 10,
    "history_inventions_people": 10
  },
  "fact_count": {
    "mode": "adaptive",
    "min": 5,
    "preferred": 7,
    "max": 9
  },
  "profiles": {
    "fast_trivia": {
      "fact_count_min": 7,
      "fact_count_max": 8,
      "words_per_fact_min": 8,
      "words_per_fact_max": 11,
      "total_words_min": 65,
      "total_words_max": 85
    },
    "practical_utility": {
      "fact_count_min": 5,
      "fact_count_max": 6,
      "words_per_fact_min": 10,
      "words_per_fact_max": 14,
      "total_words_min": 65,
      "total_words_max": 85
    }
  },
  "fact_reuse_scope": "workspace_unique",
  "render_style": "plain_lines",
  "allowed_interaction_goals": ["share", "save", "comment", "follow"],
  "text_budget": {
    "hook_max_chars": 45,
    "fact_max_chars": 90,
    "facts_total_max_chars": 500,
    "cta_max_chars": 50,
    "canva_total_max_chars": 600
  },
  "caption": {
    "max_chars": 500
  },
  "hashtags": {
    "default_count": 3,
    "min_count": 0,
    "max_count": 5
  },
  "style": {
    "english_variant": "en-US",
    "tone": "conversational_credible",
    "emoji_allowed": false,
    "regional_slang_allowed": false
  }
}
~~~

Validator memastikan:

- Format dan topic hanya berasal dari allowlist versi modul.
- Bobot format berjumlah 100.
- Bobot topic group berjumlah 100.
- Mode fixed memakai value 5–9.
- Mode adaptive memenuhi 5 ≤ min ≤ preferred ≤ max ≤ 9.
- text_budget lengkap, positif, dan tidak melewati hard ceiling MVP.
- facts_total_max_chars tidak melebihi canva_total_max_chars.
- fact_reuse_scope hanya workspace_unique atau page_unique.
- render_style hanya plain_lines atau numbered.
- Interaction goal hanya share, save, comment, atau follow.
- Key tambahan hanya diterima bila validator schema mengenalinya.

### 7.5 Tabel content_plans

#### Tanggung jawab

Menyimpan intent dan konfigurasi batch/kalender sehingga proses dapat dilanjutkan antar-chat.

| Kolom | Tipe | Null | Default | Keterangan |
|---|---|---:|---|---|
| id | bigint identity | Tidak | identity | Primary key |
| public_id | uuid | Tidak | gen_random_uuid() | ID eksternal |
| workspace_id | bigint | Tidak | — | Workspace |
| page_id | bigint | Tidak | — | Page |
| niche_key | text | Tidak | — | Tepat satu niche |
| created_by_operation_id | bigint | Ya | null | Audit link ke operation ledger |
| name | text | Ya | null | Nama plan |
| status | text | Tidak | pending | Lifecycle plan |
| requested_count | integer | Tidak | — | Jumlah slot |
| config_schema_version | integer | Tidak | 1 | Versi config snapshot |
| plan_config | jsonb | Tidak | object | Intent dan snapshot |
| started_at | timestamptz | Ya | null | Mulai diproses |
| completed_at | timestamptz | Ya | null | Semua item terminal |
| cancelled_at | timestamptz | Ya | null | Dibatalkan |
| created_at | timestamptz | Tidak | now() | Dibuat |
| updated_at | timestamptz | Tidak | now() | Diubah |

Status plan:

- pending
- in_progress
- partially_completed
- completed
- failed
- cancelled

Plan config menyimpan rentang tanggal, frekuensi, requested topic/format mix, chunk size, dan snapshot konfigurasi Page+niche. Counter progress tidak menjadi sumber kebenaran; progress dihitung dari content_plan_items.

### 7.6 Tabel content_plan_items

#### Tanggung jawab

Menyimpan setiap slot yang diminta sebelum post berhasil dibuat.

| Kolom | Tipe | Null | Default | Keterangan |
|---|---|---:|---|---|
| id | bigint identity | Tidak | identity | Primary key |
| public_id | uuid | Tidak | gen_random_uuid() | ID eksternal |
| workspace_id | bigint | Tidak | — | Workspace |
| plan_id | bigint | Tidak | — | Content plan |
| page_id | bigint | Tidak | — | Page |
| niche_key | text | Tidak | — | Niche |
| position | integer | Tidak | — | Urutan dalam plan |
| created_by_operation_id | bigint | Ya | null | Audit link ke operation ledger pembuat plan |
| status | text | Tidak | pending | Progress generasi |
| scheduled_at | timestamptz | Ya | null | Slot yang diminta |
| topic_key | text | Ya | null | Intent topik |
| format_key | text | Ya | null | Intent format |
| interaction_goal | text | Ya | null | share/save/comment/follow |
| item_config | jsonb | Tidak | object | Override dan snapshot |
| attempt_count | integer | Tidak | 0 | Jumlah percobaan |
| claim_token | uuid | Ya | null | Token lease putaran aktif |
| claimed_at | timestamptz | Ya | null | Awal lease aktif |
| claim_expires_at | timestamptz | Ya | null | Batas lease aktif |
| claim_renewal_count | integer | Tidak | 0 | Maksimum satu renewal MVP |
| last_error_code | text | Ya | null | Error aman |
| last_error_detail | text | Ya | null | Detail singkat |
| replacement_reason | text | Ya | null | Alasan explicit replacement setelah discard |
| started_at | timestamptz | Ya | null | Diproses |
| completed_at | timestamptz | Ya | null | Output tersimpan |
| created_at | timestamptz | Tidak | now() | Dibuat |
| updated_at | timestamptz | Tidak | now() | Diubah |

Status item:

- pending
- in_progress
- completed
- failed
- cancelled

Constraint:

- Unique plan_id + position.
- Composite FK ke plan menjamin workspace, Page, dan niche sama.
- scheduled_at untuk Page yang sama tidak boleh dimiliki dua plan item non-cancelled.
- attempt_count tidak negatif.
- Fresh claim atau reclaim menghasilkan token baru; default lease 30 menit, maksimal absolut 60 menit dengan satu renewal.
- Claim fields seluruhnya kosong untuk item yang tidak `in_progress`; stale token ditolak.
- last_error_detail tidak menyimpan secret, token, atau seluruh output model.

### 7.7 Tabel posts

#### Tanggung jawab

Menyimpan output publik, lifecycle, quality state, jadwal final, dan payload niche berversi.

| Kolom | Tipe | Null | Default | Keterangan |
|---|---|---:|---|---|
| id | bigint identity | Tidak | identity | Primary key |
| public_id | uuid | Tidak | gen_random_uuid() | ID eksternal |
| workspace_id | bigint | Tidak | — | Workspace |
| page_id | bigint | Tidak | — | Page |
| niche_key | text | Tidak | — | Niche |
| content_plan_item_id | bigint | Ya | null | Slot asal |
| created_by_operation_id | bigint | Ya | null | Audit link ke operation ledger |
| format_key | text | Tidak | — | Format milik niche |
| topic_key | text | Tidak | — | Topik utama untuk filtering dan analytics |
| interaction_goal | text | Tidak | — | share/save/comment/follow |
| content_schema_version | integer | Tidak | 1 | Versi payload |
| status | text | Tidak | draft | Lifecycle |
| content_payload | jsonb | Tidak | — | Output publik |
| generation_snapshot | jsonb | Tidak | — | Config dan input generasi |
| system_checks | jsonb | Tidak | object | Hasil check DB |
| editorial_checks | jsonb | Tidak | object | Attestation model/user |
| approval_snapshot | jsonb | Ya | null | Explicit owner approval untuk fingerprint current |
| content_hash | text | Tidak | — | SHA-256 canonical quality-relevant content |
| quality_status | text | Tidak | pending | pending/passed/failed |
| scheduled_at | timestamptz | Ya | null | Jadwal final |
| published_at | timestamptz | Ya | null | Publikasi aktual |
| platform_post_id | text | Ya | null | ID Facebook |
| published_url | text | Ya | null | URL Facebook |
| ready_at | timestamptz | Ya | null | Disetujui |
| discarded_at | timestamptz | Ya | null | Dibuang |
| archived_at | timestamptz | Ya | null | Diarsipkan |
| revision | integer | Tidak | 1 | Optimistic concurrency |
| created_at | timestamptz | Tidak | now() | Dibuat |
| updated_at | timestamptz | Tidak | now() | Diubah |

Status:

- draft
- ready
- posted
- discarded
- archived

Aturan:

- Satu post memiliki satu Page dan satu niche aktif.
- Config Page+niche harus ada pada saat post dibuat.
- content_payload, generation_snapshot, system_checks, dan editorial_checks harus object.
- content_schema_version harus didukung modul.
- ready, posted, dan archived membutuhkan quality_status passed, approval snapshot current, content hash current, serta ready_at.
- posted dan archived membutuhkan published_at.
- discarded membutuhkan discarded_at dan tidak boleh mempunyai published_at.
- archived membutuhkan archived_at dan hanya berasal dari posted.
- revision minimal 1.
- Satu Page tidak memiliki dua post aktif pada scheduled_at sama.
- Untuk satu plan item hanya satu post non-discarded boleh ada; archived tetap memblokir output kedua.
- published_url harus HTTPS jika diisi.
- platform_post_id unik per Page jika diisi.

#### Payload trivia versi 1

~~~json
{
  "schema_version": 1,
  "hook": "Did you know?",
  "body": {
    "subject": "Dogs",
    "facts": [
      {
        "position": 1,
        "text": "Dogs can learn more than 100 words and gestures."
      }
    ]
  },
  "cta": "Share this with a dog lover.",
  "canva_copy": "Did you know?\n\nDogs can learn more than 100 words and gestures.\n\nShare this with a dog lover.",
  "caption": "A few surprising things about dogs.",
  "hashtags": ["#DogFacts", "#DidYouKnow", "#Trivia"],
  "render_style": "plain_lines",
  "text_metrics": {
    "hook_chars": 13,
    "fact_chars": [54],
    "facts_total_chars": 54,
    "cta_chars": 34,
    "canva_total_chars": 105,
    "word_count": 18,
    "fact_word_counts": [9],
    "line_count": 5,
    "estimated_read_seconds": 7.2,
    "estimated_loops": 1
  }
}
~~~

Fact IDs tidak menjadi sumber relasi di payload. Urutan, canonical fact, dan snapshot verifikasi berada pada trivia_post_facts.

#### Generation snapshot trivia

~~~json
{
  "config_schema_version": 1,
  "fact_count": {
    "mode": "adaptive",
    "min": 5,
    "preferred": 7,
    "max": 9
  },
  "fact_count_applied": 7,
  "fact_count_override": false,
  "text_budget": {
    "hook_max_chars": 45,
    "fact_max_chars": 90,
    "facts_total_max_chars": 500,
    "cta_max_chars": 50,
    "canva_total_max_chars": 600
  },
  "fact_reuse_scope": "workspace_unique",
  "profile_key": "fast_trivia",
  "render_style": "plain_lines",
  "target_markets": ["US", "GB", "CA", "AU"],
  "locale": "en-US"
}
~~~

### 7.8 Tabel post_metrics

#### Tanggung jawab

Menyimpan snapshot performa manual tanpa menimpa pengamatan lama.

| Kolom | Tipe | Null | Default | Keterangan |
|---|---|---:|---|---|
| id | bigint identity | Tidak | identity | Primary key |
| public_id | uuid | Tidak | gen_random_uuid() | ID eksternal |
| workspace_id | bigint | Tidak | — | Workspace |
| page_id | bigint | Tidak | — | Page |
| post_id | bigint | Tidak | — | Post |
| created_by_operation_id | bigint | Ya | null | Audit link ke operation ledger |
| captured_at | timestamptz | Tidak | — | Waktu observasi |
| views | bigint | Ya | null | Views |
| reach | bigint | Ya | null | Reach |
| reactions | bigint | Ya | null | Reactions |
| comments | bigint | Ya | null | Comments |
| shares | bigint | Ya | null | Shares |
| saves | bigint | Ya | null | Saves |
| follows | bigint | Ya | null | Follows |
| watch_time_seconds | numeric | Ya | null | Total watch time |
| average_watch_time_seconds | numeric | Ya | null | Average watch time |
| metrics_payload | jsonb | Tidak | object | Metrik tambahan |
| created_at | timestamptz | Tidak | now() | Dibuat |

Aturan:

- Unique post_id + captured_at.
- Semua metrik numerik tidak negatif.
- Minimal satu metrik dikenal atau satu key metrics_payload harus tersedia.
- Post harus posted atau archived.
- Metrics tidak membuktikan sebab-akibat dan tidak menjadi syarat lifecycle.

Seluruh numeric engagement field adalah cumulative totals pada `captured_at`. `null` berarti tidak dicatat; `0` berarti nilai nol dilaporkan eksplisit.

### 7.9 Tabel internal.operation_ledger

Menyediakan idempotency global untuk seluruh write RPC. Ledger insert, business mutation, dan ledger completion berada dalam transaksi yang sama.

| Kolom | Tipe | Null | Keterangan |
|---|---|---:|---|
| id | bigint identity | Tidak | Primary key internal |
| workspace_id | bigint | Tidak | Scope tenant |
| actor_user_id | uuid | Tidak | Actor dari token tervalidasi |
| operation_key | uuid | Tidak | UUID v4 satu logical write |
| operation_name | text | Tidak | Nama domain operation berversi |
| request_schema_version | integer | Tidak | Versi canonical request |
| request_hash | text | Tidak | SHA-256 semantic request canonical |
| response_snapshot | jsonb | Ya | Respons sukses minimal untuk replay |
| target_type | text | Ya | Jenis target aman |
| target_public_id | uuid | Ya | Public ID target bila ada |
| created_at | timestamptz | Tidak | Waktu operasi dimulai |
| completed_at | timestamptz | Ya | Waktu commit sukses |

Invariant:

- Unique `(workspace_id, operation_key)` berlaku lintas seluruh write RPC.
- Business row hanya dapat mengaitkan `created_by_operation_id` ke ledger dengan `workspace_id` yang sama melalui composite FK.
- Key dan hash sama mengembalikan snapshot tanpa mutation ulang.
- Key sama dengan operation name atau request hash berbeda menghasilkan `OPERATION_KEY_REUSED`.
- Request hash dibuat server-side setelah schema validation dan normalisasi identifier/timestamp.
- Snapshot hanya menyimpan public ID, status, revision, dan timestamp yang diperlukan; tidak menyimpan full content, source, token, atau secret.
- Ledger dipertahankan tanpa expiry pada MVP.

### 7.10 Tabel internal.rate_limit_buckets

Counter memakai key `(actor_user_id, oauth_client_id, limit_group, window_start)` dan atomic upsert. Window MVP adalah satu menit UTC. Default production: read 120/menit, expensive read 20/menit, write 30/menit, dan contention write 20/menit. Pelanggaran menghasilkan `RATE_LIMITED` sebelum business mutation.

---

## 8. Modul trivia

### 8.1 Tabel trivia_facts

#### Tanggung jawab

Menyimpan satu canonical claim per workspace, sumber, ontology key, freshness, dan state reservasi sementara.

#### Kolom identitas dan deduplikasi

| Kolom | Tipe | Null | Default | Keterangan |
|---|---|---:|---|---|
| id | bigint identity | Tidak | identity | Primary key |
| public_id | uuid | Tidak | gen_random_uuid() | ID eksternal |
| workspace_id | bigint | Tidak | — | Workspace |
| claim_text | text | Tidak | — | Canonical claim |
| normalized_claim | text | Tidak | — | Hasil normalisasi |
| normalization_version | integer | Tidak | 1 | Versi normalisasi |
| claim_hash | text | Tidak | — | SHA-256 normalized claim |
| subject_key | text | Tidak | — | Canonical subject |
| relation_key | text | Tidak | — | Relation ontology |
| object_key | text | Tidak | — | Canonical object |
| numbers | jsonb | Tidak | array | Angka dan unit normalized |
| qualifiers | jsonb | Tidak | object | Waktu, tempat, kondisi |
| ontology_version | integer | Tidak | 1 | Versi ontology |
| structured_key | text | Tidak | — | Serialisasi deterministik |
| structured_hash | text | Tidak | — | SHA-256 structured key |
| structured_match_eligible | boolean | Tidak | false | True hanya jika seluruh field material lengkap dan relation deterministic-safe |
| topic_key | text | Tidak | — | Topik trivia |
| dedup_review_snapshot | jsonb | Tidak | object | Keputusan kandidat kuat dan identity version |
| supersedes_fact_id | bigint | Ya | null | Predecessor untuk correction lineage |
| correction_reason | text | Ya | null | Alasan koreksi/invalidation |
| corrected_at | timestamptz | Ya | null | Waktu server koreksi |

#### Kolom sumber dan verifikasi

| Kolom | Tipe | Null | Default | Keterangan |
|---|---|---:|---|---|
| source_data | jsonb | Tidak | — | Array sumber |
| verification_status | text | Tidak | needs_review | needs_review/verified/rejected/invalidated/superseded |
| freshness_class | text | Tidak | stable | stable/periodic/volatile |
| verified_at | timestamptz | Ya | null | Terakhir diverifikasi |
| as_of_date | date | Ya | null | Konteks waktu klaim |
| expires_at | timestamptz | Ya | null | Wajib recheck setelah ini |
| review_note | text | Ya | null | Catatan reviewer |

#### Kolom reservasi

| Kolom | Tipe | Null | Default | Keterangan |
|---|---|---:|---|---|
| reservation_status | text | Tidak | available | available/reserved |
| reservation_token | uuid | Ya | null | Token proses |
| reserved_for_page_id | bigint | Ya | null | Page tujuan |
| reserved_at | timestamptz | Ya | null | Mulai reservasi |
| reserved_until | timestamptz | Ya | null | Kedaluwarsa |
| created_at | timestamptz | Tidak | now() | Dibuat |
| updated_at | timestamptz | Tidak | now() | Diubah |

Constraint:

- Unique current row untuk workspace_id + claim_hash.
- Unique current row untuk workspace_id + structured_hash yang deterministic-safe.
- `structured_match_eligible` hanya boleh ditetapkan validator server setelah completeness dan relation allowlist lulus; caller tidak dapat mengaktifkannya langsung.
- Hash adalah 64 karakter hex lowercase.
- numbers array, qualifiers object, source_data array minimal satu.
- verified membutuhkan verified_at.
- periodic dan volatile membutuhkan expires_at.
- Row expired, needs_review, rejected, invalidated, atau superseded tidak dapat direservasi.
- Bentuk kolom reservasi harus lengkap untuk status reserved dan kosong untuk available.
- FK reserved_for_page_id scoped ke workspace.
- Tidak ada used_page_ids dan use_count.
- Lineage berada dalam workspace yang sama, tidak self-reference/cycle, dan satu predecessor hanya mempunyai satu direct successor current.

Freshness default ditentukan oleh jenis klaim:

| Kelas | Contoh | Kebijakan awal |
|---|---|---|
| stable | Anatomi dasar, sejarah mapan | Maksimal 24 bulan |
| periodic | Statistik tahunan, populasi, data survei | expires_at maksimal sekitar 12 bulan dari verifikasi |
| volatile | Pejabat, hukum, rekor aktif, status operasi, ranking | 30 hari default; maksimal 90 hari dengan rationale |

Safety, medical, legal, food safety, dan pet safety memakai minimum dari kelasnya dan 180 hari serta memerlukan source/review lebih ketat.

#### Source data versi 1

~~~json
[
  {
    "url": "https://example.org/reference",
    "title": "Reference title",
    "publisher": "Reference organization",
    "source_type": "primary",
    "accessed_at": "2026-10-06T10:00:00Z",
    "supports": "Mendukung inti klaim.",
    "published_at": "2025-03-01",
    "as_of": "2025"
  }
]
~~~

### 8.2 Tabel trivia_post_facts

#### Tanggung jawab

Menjadi sumber kebenaran hubungan post–fact dan lifecycle alokasi fakta.

| Kolom | Tipe | Null | Default | Keterangan |
|---|---|---:|---|---|
| id | bigint identity | Tidak | identity | Primary key |
| public_id | uuid | Tidak | gen_random_uuid() | ID eksternal |
| workspace_id | bigint | Tidak | — | Workspace |
| page_id | bigint | Tidak | — | Page |
| post_id | bigint | Tidak | — | Post trivia |
| niche_key | text | Tidak | trivia | Penegasan modul trivia |
| fact_id | bigint | Tidak | — | Canonical fact |
| position | integer | Tidak | — | Urutan render |
| fact_role | text | Tidak | general | Peran fakta dalam post |
| rendered_text | text | Tidak | — | Wording publik |
| allocation_state | text | Tidak | allocated | allocated/published/released |
| claim_hash_snapshot | text | Tidak | — | Hash ketika disimpan |
| source_snapshot | jsonb | Tidak | — | Sumber ketika disimpan |
| verified_at_snapshot | timestamptz | Tidak | — | Waktu verifikasi |
| released_at | timestamptz | Ya | null | Dilepas karena discard/revisi |
| published_at | timestamptz | Ya | null | Menjadi permanen |
| created_at | timestamptz | Tidak | now() | Dibuat |
| updated_at | timestamptz | Tidak | now() | Diubah |

Constraint:

- Unique post_id + position.
- Unique post_id + fact_id.
- Composite FK ke posts menjamin workspace, Page, dan niche trivia sama.
- FK workspace_id + fact_id ke trivia_facts.
- Post harus niche trivia.
- position minimal 1.
- fact_role hanya general, myth_reversal, numeric_comparison, emotional, practical, scientific, atau visual.
- source_snapshot array minimal satu.
- allocated tidak memiliki released_at/published_at.
- published memiliki published_at dan tidak memiliki released_at.
- released memiliki released_at dan tidak memiliki published_at.
- Partial unique page_id + fact_id untuk state allocated/published menegakkan page_unique.
- Workspace unique diperiksa secara transactional sambil mengunci fact row.
- Row released tetap disimpan untuk audit; tidak memblokir reuse.

Snapshot memastikan perubahan sumber canonical di masa depan tidak menghapus konteks saat post dibuat.

---

## 9. Lifecycle

### 9.1 Lifecycle post dan alokasi trivia

| Transisi | Efek post | Efek trivia_post_facts |
|---|---|---|
| create | status draft | insert allocated |
| draft → ready | set ready_at | tetap allocated |
| ready → draft karena revisi | increment revision | tetap allocated atau ganti fact atomic |
| draft/ready → discarded | set discarded_at | allocated → released |
| ready → posted | set published_at dan identity Facebook bila ada | allocated → published |
| posted → archived | set archived_at | tetap published |

Transisi lain ditolak.

Post posted, discarded, dan archived bersifat terminal untuk revisi. Membuat versi baru berarti membuat post baru.

### 9.2 Lifecycle plan

- Plan dibuat pending bersama semua item.
- Claim memilih maksimum tiga item memakai `FOR UPDATE SKIP LOCKED`, memberi token baru, dan menetapkan lease default 30 menit.
- Lease dapat diperpanjang satu kali sampai maksimum absolut 60 menit dari claim awal; expired `in_progress` dapat direclaim secara opportunistic.
- Ketika item pertama diklaim, plan menjadi in_progress. Fresh claim/reclaim menambah attempt count; replay/renewal tidak.
- Item berhasil setelah post draft tersimpan menjadi completed.
- Save dan failure report wajib membawa claim token current yang belum expired.
- Item gagal menyimpan error aman, membersihkan claim fields, dan menjadi failed.
- Retry hanya mengubah failed menjadi pending; cancelled tidak dapat di-retry.
- Plan completed bila seluruh item completed atau cancelled.
- Plan partially_completed bila terdapat kombinasi completed dan failed/pending setelah putaran aktif berakhir.
- Plan dapat dilanjutkan selama masih memiliki pending atau failed item yang dipilih untuk retry.
- Cancel plan mengubah pending/failed/in_progress menjadi cancelled dan membersihkan lease; post yang sudah dibuat tidak dihapus.
- Discarded draft/ready tidak otomatis membuka item. Replacement memerlukan perintah eksplisit, semua output lama harus discarded, dan tidak boleh ada post yang pernah posted/archived.
- Post posted/archived membuat item permanen terminal. Archived tetap memblokir output kedua.

### 9.3 Lifecycle fakta

- needs_review: belum dapat direservasi.
- verified: dapat dipakai jika belum expired dan reuse rule mengizinkan.
- rejected: kandidat tidak pernah lolos verifikasi dan tidak dapat dipakai.
- invalidated: sebelumnya verified tetapi salah/tidak lagi didukung tanpa successor.
- superseded: digantikan canonical fact baru melalui koreksi bermakna.
- available: tidak sedang diproses.
- reserved: sementara dimiliki satu token.

Reservasi berakhir saat post disimpan, dilepas, atau TTL terlewati. Penggunaan permanen tidak disimpan pada trivia_facts, tetapi pada junction state published.

Re-verification hanya memperbarui sumber/freshness bila proposisi tetap sama. Koreksi makna membuat successor baru dan menandai predecessor `superseded` secara atomic; invalidation tanpa pengganti memakai `invalidated`. Ready post yang terdampak kembali menjadi draft dan approval current dibatalkan, sedangkan posted/archived snapshots tidak ditulis ulang.

---

## 10. Index

### Core

- workspaces: unique public_id, unique slug, partial unique owner aktif.
- pages: unique public_id, unique workspace_id + slug, index workspace_id + is_active.
- page_niche_configs: unique page_id + niche_key, partial unique default per Page.
- content_plans: unique public_id, index page_id + status + created_at.
- content_plan_items: unique plan_id + position, index plan_id + status + position, claim expiry, partial unique page schedule.
- posts: unique public_id, index page/status/created, page/niche/format, page/niche/topic, plan item, scheduled_at, published_at, content hash.
- post_metrics: unique post_id + captured_at, index post_id + captured_at desc, page_id + captured_at desc.
- internal.operation_ledger: unique workspace_id + operation_key, index target dan created_at.
- internal.rate_limit_buckets: unique actor + OAuth client + group + window.

Keunikan jadwal berada pada dua tabel karena plan item dapat ada sebelum post. Setiap operasi yang membuat atau memindahkan slot wajib mengambil transaction-level advisory lock deterministik untuk kombinasi Page + scheduled_at, kemudian memeriksa content_plan_items dan posts sebelum write. Partial unique index pada masing-masing tabel tetap menjadi pertahanan lokal, sedangkan advisory lock mencegah race lintas-tabel.

### Trivia

- Unique workspace_id + claim_hash.
- Partial unique workspace_id + structured_hash hanya untuk row current dengan `structured_match_eligible = true`.
- GIN search_vector.
- GIN normalized_claim gin_trgm_ops.
- Index workspace_id + verification_status + topic_key.
- Index reservation_token.
- Partial index reserved_until untuk reserved rows.
- Junction index fact_id + allocation_state.
- Junction index page_id + allocation_state + created_at.
- Partial unique page_id + fact_id untuk allocated/published.

GIN pada content_payload tidak dibuat secara default. Tambahkan hanya jika query produksi benar-benar memerlukannya.

---

## 11. Deduplikasi trivia tanpa embeddings

### 11.1 Normalisasi versi 1

Normalisasi dilakukan deterministik sebelum hash:

1. Unicode normalize.
2. Lowercase.
3. Trim.
4. Collapse whitespace.
5. Normalisasi tanda baca.
6. Normalisasi singular/plural alias yang diatur ontology.
7. Normalisasi angka, unit, dan simbol.
8. Pertahankan negasi serta qualifier bermakna.

normalized_claim tidak boleh menjadi hasil parafrasa kreatif model.

### 11.2 Claim hash

~~~text
sha256(normalized_claim)
~~~

Unique workspace_id + claim_hash mencegah exact canonical duplicate.

### 11.3 Structured key dan ontology

Structured key dibangun deterministik dari:

- subject_key
- relation_key
- object_key
- normalized numbers
- qualifier waktu
- qualifier lokasi
- kondisi penting
- negasi

Contoh:

~~~text
subject=domestic_dog|relation=sweat_gland_location|object=paw_pads|qualifier=primary
~~~

Ontology versi 1 wajib mendefinisikan:

- Canonical subject aliases.
- Singular/plural.
- Relation allowlist.
- Object normalization.
- Unit conversion.
- Positive/negative relation.
- Time/location qualifiers.

### 11.4 Candidate retrieval

Pencarian kandidat menggabungkan:

1. Exact claim hash.
2. Exact structured hash.
3. FTS rank.
4. Trigram similarity.
5. Entitas dan angka yang sama.
6. Source overlap sebagai sinyal tambahan.

MCP mengembalikan maksimum kandidat relevan; ChatGPT menilai kesamaan makna. Unique constraints dan transactional reuse check tetap menjadi pertahanan akhir.

### 11.5 Gold evaluation set

Tiga dataset referensi digunakan untuk membangun fixture evaluasi, bukan sebagai sumber kebenaran. Fixture minimal berisi:

- Exact duplicate.
- Parafrasa lintas akun.
- Variasi singular/plural dan alias subjek.
- Angka atau unit yang ekuivalen.
- Klaim dengan subjek sama tetapi relation berbeda.
- Pasangan anti-duplicate yang tidak boleh digabung.
- Klaim berisiko yang harus ditolak atau meminta review.

Target awal:

- Exact hash dan structured hash menangkap 100% pasangan fixture yang memang identik pada lapisannya.
- Candidate retrieval mengembalikan minimal 95% known paraphrase dalam batas kandidat yang dikonfigurasi.
- Tidak ada false merge pada anti-duplicate gold set.
- Perubahan normalization atau ontology version wajib menjalankan ulang seluruh fixture.

---

## 12. Reservasi trivia secara atomic

### Input minimum

- owner identity dari auth token.
- workspace public ID.
- Page public ID.
- reservation token.
- operation key.
- reuse scope snapshot.
- candidate facts beserta canonical fields dan source data.
- reservation TTL.

### Urutan transaksi

1. Verifikasi auth.uid(), OAuth client context, owner workspace, Page aktif, dan trivia config enabled.
2. Claim global operation key dan verifikasi canonical request hash.
3. Hapus state reservasi expired secara opportunistic pada kandidat.
4. Resolve exact/structured identity dan dedup decision; uncertain candidate tetap needs_review.
5. Lock fact rows dalam urutan id.
6. Pastikan seluruh set current verified, sumber valid, dan belum expired.
7. Query trivia_post_facts untuk allocation state allocated/published.
8. Terapkan workspace_unique atau page_unique.
9. Pastikan tidak ada row yang direservasi token lain.
10. Set satu token, Page, config/reuse snapshot, reserved_at, dan reserved_until untuk seluruh set secara all-or-nothing.
11. Complete operation ledger dan return canonical IDs serta expiry.

Operation key dan semantic input yang sama bersifat idempotent. Key sama dengan payload/operation berbeda ditolak. Reservation token yang expired tidak dapat dihidupkan oleh replay.

Satu fact row hanya memiliki satu reservasi aktif. Ini sengaja menyederhanakan MVP; page_unique lintas Page tetap dapat terjadi secara berurutan setelah post pertama tersimpan dan reservation dibersihkan.

---

## 13. Menyimpan post trivia secara atomic

### Input minimum

- operation key.
- Page dan niche.
- optional content plan item.
- reservation token.
- expected config/content schema versions.
- format dan interaction goal.
- topic utama dan fact role setiap item.
- content payload.
- generation snapshot.
- editorial checks.
- urutan fact IDs dan rendered text.
- optional schedule.

### Urutan transaksi

1. Verifikasi owner/OAuth client, canonicalize request, dan claim global operation key.
2. Ambil schedule advisory lock, plan/item, post, fact, lalu junction locks sesuai global lock order.
3. Validasi claim token, reservation token, expiry, verification, freshness, source, reuse, config/schema version, payload, text metrics, dan schedule.
4. Render ulang public copy server-side, hitung content hash, system checks, serta validasi editorial attestation terhadap hash current.
5. Insert post sebagai draft.
6. Insert seluruh trivia_post_facts sebagai allocated dengan snapshot immutable.
7. Bersihkan reservation fields pada facts.
8. Ubah plan item menjadi completed, bersihkan claim fields, dan hitung ulang plan state.
9. Complete operation ledger dan commit.

Kegagalan apa pun melakukan rollback penuh. Fakta tidak boleh dianggap allocated tanpa post dan junction yang valid.

Batch memanggil transaksi ini per item. Kegagalan satu item tidak membatalkan item lain.

---

## 14. Revisi post secara atomic

### 14.1 Tanpa mengganti fakta

1. Claim operation ledger lalu lock post.
2. Verifikasi expected_revision dan expected content hash bila relevan.
3. Pastikan status draft atau ready.
4. Render ulang, validasi payload, hitung content hash, system checks, dan editorial attestation.
5. Jika ready, kembalikan ke draft, kosongkan ready_at/approval snapshot current, dan tandai evidence lama stale.
6. Update payload/checks dan increment revision tepat satu kali.

### 14.2 Mengganti fakta

1. Reserve fakta pengganti lebih dahulu.
2. Lock post, fact lama, dan fact baru dalam urutan konsisten.
3. Verifikasi expected_revision dan status.
4. Periksa reuse fact baru.
5. Ubah junction lama allocated menjadi released.
6. Insert atau update junction fact baru sebagai allocated.
7. Validasi payload final.
8. Bersihkan reservation fact baru.
9. Kembalikan post ke draft dan increment revision.
10. Commit.

Junction published tidak boleh menjadi released. Post posted/archived harus dibuat ulang sebagai post baru.

---

## 15. Status, discard, publikasi, dan metrics

### 15.1 Menjadi ready

Syarat:

- expected_revision cocok.
- status draft.
- content hash hasil hitung ulang sama dengan expected current hash.
- semua blocking system checks bernilai lulus.
- editorial attestation current terhadap rubric dan content hash yang sama.
- persetujuan owner eksplisit terhadap revision/hash current.
- semua junction tetap allocated dan fact current verified/fresh.

Approval transaction menyimpan `approval_snapshot`, menetapkan `quality_status = passed`, `ready_at`, dan revision + 1. Caller tidak dapat mengirim authoritative system pass, actor, atau timestamp.

### 15.2 Menjadi discarded

Hanya dari draft atau ready:

1. Lock post dan junction.
2. Set status discarded, discarded_at, dan revision + 1.
3. Ubah semua junction allocated menjadi released.
4. Lepaskan reservation yang masih terkait bila ada.
5. Jika berasal dari plan item dan pengguna meminta replacement, reset item menjadi pending; jika tidak, item tetap completed tetapi outputnya tercatat discarded.
6. Commit.

### 15.3 Menjadi posted

Hanya dari ready:

1. Verifikasi perintah pengguna.
2. Set status posted dan published_at.
3. Simpan platform_post_id/published_url jika diberikan.
4. Ubah junction allocated menjadi published dengan timestamp sama.
5. Increment revision.

### 15.4 Menjadi archived

Hanya dari posted. Set archived_at dan increment revision. Junction tetap published.

### 15.5 Mencatat metrics

- Hanya post posted atau archived.
- operation_key membuat retry aman.
- captured_at adalah waktu observasi.
- Insert snapshot baru; jangan update snapshot lama untuk data baru.
- Query insight menggunakan snapshot terbaru per post atau seri waktu sesuai kebutuhan.

---

## 16. Database functions dan MCP mapping

### Prinsip

- Utamakan security invoker untuk helper yang tidak membutuhkan elevated table access.
- Jangan memakai security definer sebagai workaround permission. Business `api` entry point memakainya secara terencana karena authenticated tidak mempunyai direct table grants, dengan narrow owner role, RLS, `search_path = ''`, ownership/OAuth-client check, dan explicit execute grant.
- Tempatkan helper internal pada schema tidak terekspos dan revoke execute from public.
- Setiap write menerima operation_key.
- Error memakai code stabil dan detail aman.

### RPC utama

Public `api` entry points mengikuti 33 domain operations pada tool inventory. Helper internal boleh berbagi implementasi, tetapi caller tidak mendapat generic executor atau generic status mutation.

### Mapping MCP

| MCP tool | Database operation |
|---|---|
| `get_account_profile` | Authenticated profile projection |
| `get_workspace_context` | Workspace, module catalog, defaults |
| `list_pages` | Page/config projection |
| `create_page` | Create Page + initial niche config atomic |
| `update_page` | Page/config compare-and-swap |
| `get_page_generation_context` | Page+niche generation context |
| `list_content_plans` | Paginated plan projection |
| `create_content_plan` | Create plan + exact item slots atomic |
| `get_content_plan` | Plan, items, output state |
| `claim_content_plan_items` | Claim/reclaim item lease atomic |
| `renew_content_plan_claim` | Renew current lease once |
| `report_content_plan_item_failure` | Claim-bound safe failure |
| `retry_content_plan_item` | Failed → pending |
| `replace_discarded_plan_item` | Explicit completed → pending replacement |
| `cancel_content_plan` | Cancel remaining items atomic |
| `trivia_find_similar_facts` | Exact/structured/candidate retrieval |
| `trivia_register_and_reserve_facts` | Canonical registration + all-or-nothing reserve |
| `trivia_release_facts` | Token-bound idempotent release |
| `trivia_reverify_fact` | Evidence/freshness refresh without identity change |
| `trivia_correct_fact` | Successor/invalidation transaction |
| `list_posts` | Paginated post/work-queue/calendar projection |
| `get_post` | One complete post/current state projection |
| `save_post` | Niche-routed atomic draft save |
| `revise_post` | Niche-routed compare-and-swap revision |
| `reschedule_post` | Atomic schedule move/clear |
| `approve_post` | Recheck quality + explicit owner approval |
| `revoke_post_approval` | Ready → draft and invalidate approval current |
| `discard_post` | Explicit discard + release allocation |
| `mark_post_posted` | Manual publication record + allocation publish |
| `archive_post` | Posted → archived |
| `record_post_performance` | Insert cumulative metrics snapshot |
| `get_post_performance` | Metrics history projection |
| `get_performance_insights` | Evidence-bearing aggregate read |

---

## 17. Error contract

| Code | Makna | Tindakan |
|---|---|---|
| AUTH_REQUIRED | Token tidak valid/absen | Hubungkan ulang plugin |
| FORBIDDEN | Bukan owner | Tolak tanpa membocorkan data |
| OAUTH_CLIENT_REQUIRED | Token bukan koneksi OAuth MCP yang diizinkan | Relink melalui plugin |
| RATE_LIMITED | Limit group terlampaui | Tunggu `retry_after_seconds` |
| PAGE_NOT_FOUND | Page tidak ada | Tampilkan Page tersedia |
| NICHE_NOT_ENABLED | Config niche tidak aktif | Pilih niche aktif |
| CONFIG_VERSION_UNSUPPORTED | Config lama/baru tidak didukung | Migrasi atau refresh |
| PLAN_ITEM_CONFLICT | Item sedang diproses/selesai | Ambil progress terbaru |
| PLAN_ITEM_CLAIM_MISMATCH | Claim token bukan milik lease current | Ambil progress/claim ulang |
| PLAN_ITEM_CLAIM_EXPIRED | Lease telah kedaluwarsa | Claim ulang item |
| DUPLICATE_CANONICAL_FACT | Canonical sudah ada | Gunakan row canonical |
| FACT_REUSE_BLOCKED | Rule melarang penggunaan | Pilih pengganti |
| FACT_RESERVED | Token lain memiliki row | Pilih pengganti atau retry |
| RESERVATION_EXPIRED | TTL habis | Reserve ulang |
| FACT_NOT_VERIFIED | Fact belum layak | Review/ganti |
| FACT_HASH_COLLISION | Hash sama tetapi canonical input berbeda | Hentikan merge dan review |
| FACT_RESERVATION_CONTEXT_CHANGED | Page/config/reuse berubah sejak reserve | Release dan reserve ulang |
| SOURCE_INSUFFICIENT | Metadata sumber tidak cukup | Teliti ulang |
| REVISION_CONFLICT | Expected revision lama | Ambil post terbaru |
| INVALID_STATUS_TRANSITION | Lifecycle tidak valid | Gunakan transisi legal |
| SCHEDULE_CONFLICT | Slot Page sudah ada | Pilih waktu lain |
| QUALITY_GATE_FAILED | Ready tidak diizinkan | Perbaiki check |
| CONTENT_HASH_MISMATCH | Fingerprint content bukan current | Ambil post current dan evaluasi ulang |
| APPROVAL_REQUIRED | Aksi membutuhkan approval owner eksplisit | Minta keputusan pengguna |
| OPERATION_KEY_REUSED | Key dipakai payload berbeda | Buat key baru |
| VALIDATION_FAILED | Schema/budget invalid | Perbaiki field |
| DATABASE_UNAVAILABLE | Storage tidak tersedia | Jangan klaim sukses |

Constraint violation diterjemahkan ke code domain; raw SQL, stack trace, secret, dan internal ID tidak dikirim ke model.

---

## 18. Security, RLS, dan privilege

### 18.1 Auth model

- Supabase Auth OAuth 2.1 digunakan untuk koneksi MCP.
- owner_user_id mengacu pada auth.users.id.
- Authorization memakai auth.uid(), bukan user_metadata.
- Edge Function `mcp` memakai gateway `verify_jwt = false` agar discovery/challenge mencapai middleware, lalu middleware memvalidasi signature, issuer, audience/resource, exp/nbf, scopes, OAuth client, dan owner sebelum handler.
- Browser auth hanya memakai publishable key. Service-role/secret key tidak pernah dikirim ke ChatGPT atau public client.

### 18.2 Data API exposure

Data API schema inclusion, object privilege, dan RLS adalah tiga lapisan terpisah.

- Local Supabase secara teknis menyertakan schema platform, termasuk `public` dan `storage`. `public` menyimpan tabel bisnis, tetapi bukan business API surface; `storage` adalah platform surface, bukan business RPC surface Content Producer.
- `api` adalah satu-satunya schema business RPC yang dikonfigurasi aplikasi. `graphql_public` tidak dipertahankan karena MVP tidak memakai GraphQL. `internal` tidak dimasukkan ke configured business schemas dan tidak menerima caller grants.
- Grants ke anon dan authenticated ditentukan eksplisit dalam migration; direct privilege pada tabel, sequence, dan function bisnis `public` dicabut secara default. `service_role` juga tidak menerima direct business-table access tanpa kebutuhan eksplisit yang terdokumentasi.
- anon tidak mendapat akses tabel atau execute RPC bisnis. authenticated hanya mendapat `USAGE` pada `api` dan `EXECUTE` pada RPC allowlist; tidak mendapat direct SELECT/INSERT/UPDATE/DELETE pada tabel bisnis.
- Semua read dan write MCP melewati `.schema('api').rpc(...)` menggunakan user JWT.
- Semua tabel bisnis mengaktifkan RLS sebagai defense in depth ketika dibuat; RLS menentukan row setelah object grant ada dan bukan pengganti privilege grant.
- Tidak mengandalkan auto-exposure atau default privilege Supabase; keduanya hanya defense tambahan terhadap migration grants yang eksplisit.

### 18.3 Pola RLS

Workspaces:

~~~sql
create policy workspaces_owner_select
on public.workspaces
for select
to authenticated
using ((select auth.uid()) = owner_user_id);

create policy workspaces_owner_update
on public.workspaces
for update
to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);
~~~

Tabel workspace-scoped memakai pola:

~~~sql
using (
  exists (
    select 1
    from public.workspaces w
    where w.id = workspace_id
      and w.owner_user_id = (select auth.uid())
  )
)
~~~

Policy UPDATE selalu mempunyai USING dan WITH CHECK. INSERT memakai WITH CHECK. DELETE tidak diberikan.

Niches hanya dapat dibaca owner melalui `api` context RPC; write dilakukan migration.

Karena business RPC berjalan sebagai `content_producer_api_owner`, policy yang diperlukan RPC juga menargetkan role sempit tersebut dan mengulang ownership predicate berbasis `(select auth.uid())`. Policy `TO authenticated` tidak dianggap otomatis berlaku bagi function-owner role. Integration test wajib membuktikan RLS tetap menolak non-owner melalui setiap SECURITY DEFINER entry point.

### 18.4 Views dan functions

- View memakai security_invoker = true pada Postgres yang mendukung.
- View yang tidak diperlukan Data API ditempatkan pada schema tidak terekspos atau grants dicabut.
- Helper yang tidak memerlukan elevated table access tetap security invoker.
- Read dan write hanya melalui RPC sempit; seluruh direct table privilege dicabut dari authenticated. Karena itu entry point `api` yang membaca atau menulis tabel bisnis memakai SECURITY DEFINER secara sengaja dan dimiliki role `content_producer_api_owner` yang `NOLOGIN`, tidak mempunyai `BYPASSRLS`, bukan table owner, dan hanya menerima privilege objek minimum.
- Setiap privileged function memakai fully qualified object names, `search_path = ''`, memeriksa `auth.uid()`, OAuth client context, workspace ownership, serta input di dalam body, dan tetap tunduk pada RLS.
- Public entry point berada pada schema `api`; helper internal tidak dapat ditemukan melalui Data API schema.
- Execute privilege setiap function baru dicabut dari PUBLIC dan anon, lalu diberikan hanya kepada authenticated untuk entry point yang memang diizinkan.
- Tidak memakai auth.role(); policy menargetkan TO authenticated dan tetap memeriksa ownership.

### 18.5 Secrets dan logging

Log boleh menyimpan request ID, tool, duration, result code, dan public IDs. Log tidak menyimpan Authorization header, JWT, service key, seluruh payload sumber, atau seluruh output model.

---

## 19. Query utama

### 19.1 Generation context

Mengambil dalam satu response:

- Page dan config niche.
- Topic/format weights.
- Subject, hook, CTA, dan format terbaru.
- Fact reuse scope.
- Post terbaru.
- Insight performa ringkas.
- Plan item bila request berasal dari plan.

### 19.2 Work queue dan kalender

Join plan items dengan post aktif/latest:

- Filter workspace, Page, niche, status, dan rentang waktu.
- Urut scheduled_at, position, public_id.
- Tampilkan pending, completed, failed, discarded output, dan schedule conflict.

### 19.3 Sumber post trivia

Join posts → trivia_post_facts → trivia_facts. UI internal dapat memakai source_snapshot untuk konteks publikasi dan canonical source_data untuk re-verification terbaru.

### 19.4 Inventory dan reuse

Reuse query hanya menghitung junction state allocated atau published:

- workspace_unique: tidak boleh ada junction aktif/published pada workspace.
- page_unique: tidak boleh ada junction aktif/published pada Page tujuan.
- released tidak memblokir.

### 19.5 Performance insights

Gunakan latest snapshot per post untuk perbandingan current totals. Group by Page, niche, topic, format, interaction goal, dan periode. Jangan mencampur umur post sangat berbeda tanpa menampilkan konteks.

---

## 20. Reference DDL

DDL berikut adalah baseline dan harus dipisah menjadi migration yang dapat ditinjau. Validator JSON dan RPC transactional tetap diperlukan di luar CHECK constraint.

~~~sql
create table public.workspaces (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  slug text not null unique,
  language_code text not null default 'en',
  locale text not null default 'en-US',
  target_markets text[] not null default array['US','GB','CA','AU']::text[],
  settings jsonb not null default '{"schema_version":1}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_slug_check check (slug ~ '^[a-z][a-z0-9-]{1,62}$'),
  constraint workspaces_language_check check (language_code = 'en'),
  constraint workspaces_locale_check check (locale = 'en-US'),
  constraint workspaces_settings_object_check check (jsonb_typeof(settings) = 'object'),
  constraint workspaces_id_scope_key unique (id, owner_user_id)
);

create unique index workspaces_one_active_owner_idx
  on public.workspaces(owner_user_id)
  where is_active;

create schema if not exists internal;
create schema if not exists api;

create table internal.operation_ledger (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  operation_key uuid not null,
  operation_name text not null,
  request_schema_version integer not null check (request_schema_version >= 1),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  response_snapshot jsonb,
  target_type text,
  target_public_id uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint operation_ledger_workspace_key unique (workspace_id, operation_key),
  constraint operation_ledger_workspace_id_key unique (workspace_id, id),
  constraint operation_ledger_response_object_check
    check (response_snapshot is null or jsonb_typeof(response_snapshot) = 'object')
);

create table internal.rate_limit_buckets (
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  oauth_client_id text not null,
  limit_group text not null check (limit_group in ('read','expensive_read','write','contention_write')),
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (actor_user_id, oauth_client_id, limit_group, window_start)
);

create table public.niches (
  key text primary key,
  name text not null,
  status text not null default 'development'
    check (status in ('development','active','disabled')),
  module_version integer not null default 1 check (module_version >= 1),
  config_schema_version integer not null default 1 check (config_schema_version >= 1),
  content_schema_version integer not null default 1 check (content_schema_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint niches_key_check check (key ~ '^[a-z][a-z0-9_]{1,31}$')
);

create table public.pages (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  workspace_id bigint not null references public.workspaces(id) on delete restrict,
  name text not null,
  slug text not null,
  platform text not null default 'facebook',
  language_code text not null default 'en',
  locale text not null default 'en-US',
  timezone text not null default 'UTC',
  target_markets text[] not null default array['US','GB','CA','AU']::text[],
  default_niche_key text references public.niches(key) on delete restrict,
  platform_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pages_workspace_slug_key unique (workspace_id, slug),
  constraint pages_workspace_id_key unique (workspace_id, id),
  constraint pages_platform_check check (platform = 'facebook'),
  constraint pages_language_check check (language_code = 'en'),
  constraint pages_locale_check check (locale = 'en-US'),
  constraint pages_platform_config_object_check check (jsonb_typeof(platform_config) = 'object')
);

create index pages_workspace_active_idx
  on public.pages(workspace_id, is_active, id);

create table public.page_niche_configs (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  workspace_id bigint not null,
  page_id bigint not null,
  niche_key text not null references public.niches(key) on delete restrict,
  config_schema_version integer not null default 1 check (config_schema_version >= 1),
  config jsonb not null,
  is_enabled boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint page_niche_configs_page_fk
    foreign key (workspace_id, page_id)
    references public.pages(workspace_id, id)
    on delete restrict,
  constraint page_niche_configs_page_niche_key unique (page_id, niche_key),
  constraint page_niche_configs_scope_key unique (workspace_id, page_id, niche_key),
  constraint page_niche_configs_config_object_check check (jsonb_typeof(config) = 'object')
);

create unique index page_niche_configs_one_default_idx
  on public.page_niche_configs(page_id)
  where is_enabled and is_default;

create table public.content_plans (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  workspace_id bigint not null,
  page_id bigint not null,
  niche_key text not null,
  created_by_operation_id bigint,
  name text,
  status text not null default 'pending'
    check (status in ('pending','in_progress','partially_completed','completed','failed','cancelled')),
  requested_count integer not null check (requested_count > 0),
  config_schema_version integer not null default 1 check (config_schema_version >= 1),
  plan_config jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_plans_page_niche_fk
    foreign key (workspace_id, page_id, niche_key)
    references public.page_niche_configs(workspace_id, page_id, niche_key)
    on delete restrict,
  constraint content_plans_operation_fk
    foreign key (workspace_id, created_by_operation_id)
    references internal.operation_ledger(workspace_id, id)
    on delete restrict,
  constraint content_plans_scope_key unique (id, workspace_id, page_id, niche_key),
  constraint content_plans_config_object_check check (jsonb_typeof(plan_config) = 'object')
);

create index content_plans_page_status_idx
  on public.content_plans(page_id, status, created_at desc, id desc);

create table public.content_plan_items (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  workspace_id bigint not null,
  plan_id bigint not null,
  page_id bigint not null,
  niche_key text not null,
  position integer not null check (position >= 1),
  created_by_operation_id bigint,
  status text not null default 'pending'
    check (status in ('pending','in_progress','completed','failed','cancelled')),
  scheduled_at timestamptz,
  topic_key text,
  format_key text,
  interaction_goal text
    check (interaction_goal is null or interaction_goal in ('share','save','comment','follow')),
  item_config jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  claim_token uuid,
  claimed_at timestamptz,
  claim_expires_at timestamptz,
  claim_renewal_count integer not null default 0 check (claim_renewal_count between 0 and 1),
  last_error_code text,
  last_error_detail text,
  replacement_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_plan_items_plan_fk
    foreign key (plan_id, workspace_id, page_id, niche_key)
    references public.content_plans(id, workspace_id, page_id, niche_key)
    on delete restrict,
  constraint content_plan_items_operation_fk
    foreign key (workspace_id, created_by_operation_id)
    references internal.operation_ledger(workspace_id, id)
    on delete restrict,
  constraint content_plan_items_plan_position_key unique (plan_id, position),
  constraint content_plan_items_scope_key unique (id, workspace_id, page_id, niche_key),
  constraint content_plan_items_config_object_check check (jsonb_typeof(item_config) = 'object'),
  constraint content_plan_items_claim_shape_check check (
    (
      status = 'in_progress' and claim_token is not null and claimed_at is not null and
      claim_expires_at is not null and claim_expires_at > claimed_at
    ) or (
      status <> 'in_progress' and claim_token is null and claimed_at is null and
      claim_expires_at is null and claim_renewal_count = 0
    )
  )
);

create index content_plan_items_plan_status_idx
  on public.content_plan_items(plan_id, status, position);

create unique index content_plan_items_page_schedule_unique_idx
  on public.content_plan_items(page_id, scheduled_at)
  where scheduled_at is not null and status <> 'cancelled';

create table public.posts (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  workspace_id bigint not null,
  page_id bigint not null,
  niche_key text not null,
  content_plan_item_id bigint,
  created_by_operation_id bigint,
  format_key text not null,
  topic_key text not null,
  interaction_goal text not null
    check (interaction_goal in ('share','save','comment','follow')),
  content_schema_version integer not null default 1 check (content_schema_version >= 1),
  status text not null default 'draft'
    check (status in ('draft','ready','posted','discarded','archived')),
  content_payload jsonb not null,
  generation_snapshot jsonb not null,
  system_checks jsonb not null default '{}'::jsonb,
  editorial_checks jsonb not null default '{}'::jsonb,
  approval_snapshot jsonb,
  content_hash text not null,
  quality_status text not null default 'pending'
    check (quality_status in ('pending','passed','failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  platform_post_id text,
  published_url text,
  ready_at timestamptz,
  discarded_at timestamptz,
  archived_at timestamptz,
  revision integer not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_page_niche_fk
    foreign key (workspace_id, page_id, niche_key)
    references public.page_niche_configs(workspace_id, page_id, niche_key)
    on delete restrict,
  constraint posts_plan_item_fk
    foreign key (content_plan_item_id, workspace_id, page_id, niche_key)
    references public.content_plan_items(id, workspace_id, page_id, niche_key)
    on delete restrict,
  constraint posts_operation_fk
    foreign key (workspace_id, created_by_operation_id)
    references internal.operation_ledger(workspace_id, id)
    on delete restrict,
  constraint posts_scope_key unique (id, workspace_id, page_id),
  constraint posts_niche_scope_key unique (id, workspace_id, page_id, niche_key),
  constraint posts_payload_object_check check (jsonb_typeof(content_payload) = 'object'),
  constraint posts_snapshot_object_check check (jsonb_typeof(generation_snapshot) = 'object'),
  constraint posts_system_checks_object_check check (jsonb_typeof(system_checks) = 'object'),
  constraint posts_editorial_checks_object_check check (jsonb_typeof(editorial_checks) = 'object'),
  constraint posts_approval_snapshot_object_check
    check (approval_snapshot is null or jsonb_typeof(approval_snapshot) = 'object'),
  constraint posts_content_hash_format_check check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint posts_ready_quality_check
    check (status not in ('ready','posted','archived') or quality_status = 'passed'),
  constraint posts_ready_approval_check
    check (status not in ('ready','posted','archived') or approval_snapshot is not null),
  constraint posts_ready_at_check
    check (status not in ('ready','posted','archived') or ready_at is not null),
  constraint posts_published_at_check
    check (status not in ('posted','archived') or published_at is not null),
  constraint posts_discarded_at_check
    check (status <> 'discarded' or discarded_at is not null),
  constraint posts_archived_at_check
    check (status <> 'archived' or archived_at is not null),
  constraint posts_discarded_not_published_check
    check (status <> 'discarded' or published_at is null),
  constraint posts_published_url_check
    check (published_url is null or published_url ~ '^https://')
);

create index posts_page_status_created_idx
  on public.posts(page_id, status, created_at desc, id desc);

create index posts_page_niche_format_idx
  on public.posts(page_id, niche_key, format_key, created_at desc);

create index posts_page_niche_topic_idx
  on public.posts(page_id, niche_key, topic_key, created_at desc);

create unique index posts_page_schedule_unique_idx
  on public.posts(page_id, scheduled_at)
  where scheduled_at is not null and status <> 'discarded';

create unique index posts_active_plan_item_unique_idx
  on public.posts(content_plan_item_id)
  where content_plan_item_id is not null and status <> 'discarded';

create unique index posts_platform_identity_unique_idx
  on public.posts(page_id, platform_post_id)
  where platform_post_id is not null;

create table public.post_metrics (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  workspace_id bigint not null,
  page_id bigint not null,
  post_id bigint not null,
  created_by_operation_id bigint,
  captured_at timestamptz not null,
  views bigint,
  reach bigint,
  reactions bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  follows bigint,
  watch_time_seconds numeric,
  average_watch_time_seconds numeric,
  metrics_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint post_metrics_post_fk
    foreign key (post_id, workspace_id, page_id)
    references public.posts(id, workspace_id, page_id)
    on delete restrict,
  constraint post_metrics_operation_fk
    foreign key (workspace_id, created_by_operation_id)
    references internal.operation_ledger(workspace_id, id)
    on delete restrict,
  constraint post_metrics_snapshot_key unique (post_id, captured_at),
  constraint post_metrics_payload_object_check check (jsonb_typeof(metrics_payload) = 'object'),
  constraint post_metrics_nonnegative_check check (
    coalesce(views, 0) >= 0 and
    coalesce(reach, 0) >= 0 and
    coalesce(reactions, 0) >= 0 and
    coalesce(comments, 0) >= 0 and
    coalesce(shares, 0) >= 0 and
    coalesce(saves, 0) >= 0 and
    coalesce(follows, 0) >= 0 and
    coalesce(watch_time_seconds, 0) >= 0 and
    coalesce(average_watch_time_seconds, 0) >= 0
  )
);

create index post_metrics_post_captured_idx
  on public.post_metrics(post_id, captured_at desc, id desc);

create index post_metrics_page_captured_idx
  on public.post_metrics(page_id, captured_at desc, id desc);

create table public.trivia_facts (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  workspace_id bigint not null references public.workspaces(id) on delete restrict,
  claim_text text not null,
  normalized_claim text not null,
  normalization_version integer not null default 1 check (normalization_version >= 1),
  claim_hash text not null,
  subject_key text not null,
  relation_key text not null,
  object_key text not null,
  numbers jsonb not null default '[]'::jsonb,
  qualifiers jsonb not null default '{}'::jsonb,
  ontology_version integer not null default 1 check (ontology_version >= 1),
  structured_key text not null,
  structured_hash text not null,
  structured_match_eligible boolean not null default false,
  topic_key text not null,
  dedup_review_snapshot jsonb not null default '{}'::jsonb,
  supersedes_fact_id bigint,
  correction_reason text,
  corrected_at timestamptz,
  search_vector tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(normalized_claim, '') || ' ' ||
      coalesce(subject_key, '') || ' ' ||
      coalesce(relation_key, '') || ' ' ||
      coalesce(object_key, '')
    )
  ) stored,
  source_data jsonb not null,
  verification_status text not null default 'needs_review'
    check (verification_status in ('needs_review','verified','rejected','invalidated','superseded')),
  freshness_class text not null default 'stable'
    check (freshness_class in ('stable','periodic','volatile')),
  verified_at timestamptz,
  as_of_date date,
  expires_at timestamptz,
  review_note text,
  reservation_status text not null default 'available'
    check (reservation_status in ('available','reserved')),
  reservation_token uuid,
  reserved_for_page_id bigint,
  reserved_at timestamptz,
  reserved_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trivia_facts_workspace_id_key unique (workspace_id, id),
  constraint trivia_facts_supersedes_fk
    foreign key (workspace_id, supersedes_fact_id)
    references public.trivia_facts(workspace_id, id)
    on delete restrict,
  constraint trivia_facts_not_self_superseding_check
    check (supersedes_fact_id is null or supersedes_fact_id <> id),
  constraint trivia_facts_reserved_page_fk
    foreign key (workspace_id, reserved_for_page_id)
    references public.pages(workspace_id, id)
    on delete restrict,
  constraint trivia_facts_claim_hash_format_check check (claim_hash ~ '^[0-9a-f]{64}$'),
  constraint trivia_facts_structured_hash_format_check check (structured_hash ~ '^[0-9a-f]{64}$'),
  constraint trivia_facts_numbers_array_check check (jsonb_typeof(numbers) = 'array'),
  constraint trivia_facts_qualifiers_object_check check (jsonb_typeof(qualifiers) = 'object'),
  constraint trivia_facts_dedup_review_object_check check (jsonb_typeof(dedup_review_snapshot) = 'object'),
  constraint trivia_facts_source_array_check
    check (jsonb_typeof(source_data) = 'array' and jsonb_array_length(source_data) >= 1),
  constraint trivia_facts_verified_at_check
    check (verification_status <> 'verified' or verified_at is not null),
  constraint trivia_facts_freshness_expiry_check
    check (freshness_class = 'stable' or expires_at is not null),
  constraint trivia_facts_reservation_shape_check check (
    (
      reservation_status = 'available' and
      reservation_token is null and
      reserved_for_page_id is null and
      reserved_at is null and
      reserved_until is null
    )
    or
    (
      reservation_status = 'reserved' and
      reservation_token is not null and
      reserved_for_page_id is not null and
      reserved_at is not null and
      reserved_until is not null and
      reserved_until > reserved_at
    )
  )
);

create unique index trivia_facts_current_claim_hash_key
  on public.trivia_facts(workspace_id, claim_hash)
  where verification_status in ('needs_review','verified');

create unique index trivia_facts_current_structured_hash_key
  on public.trivia_facts(workspace_id, structured_hash)
  where verification_status in ('needs_review','verified') and structured_match_eligible;

create unique index trivia_facts_one_current_successor_idx
  on public.trivia_facts(workspace_id, supersedes_fact_id)
  where supersedes_fact_id is not null and verification_status in ('needs_review','verified');

create index trivia_facts_workspace_verification_topic_idx
  on public.trivia_facts(workspace_id, verification_status, topic_key, id);

create index trivia_facts_reservation_token_idx
  on public.trivia_facts(reservation_token, id)
  where reservation_token is not null;

create index trivia_facts_reserved_until_idx
  on public.trivia_facts(reserved_until, id)
  where reservation_status = 'reserved';

create index trivia_facts_search_vector_idx
  on public.trivia_facts using gin(search_vector);

create index trivia_facts_normalized_claim_trgm_idx
  on public.trivia_facts
  using gin(normalized_claim extensions.gin_trgm_ops);

create table public.trivia_post_facts (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid() unique,
  workspace_id bigint not null,
  page_id bigint not null,
  post_id bigint not null,
  niche_key text not null default 'trivia' check (niche_key = 'trivia'),
  fact_id bigint not null,
  position integer not null check (position >= 1),
  fact_role text not null default 'general'
    check (fact_role in ('general','myth_reversal','numeric_comparison','emotional','practical','scientific','visual')),
  rendered_text text not null,
  allocation_state text not null default 'allocated'
    check (allocation_state in ('allocated','published','released')),
  claim_hash_snapshot text not null,
  source_snapshot jsonb not null,
  verified_at_snapshot timestamptz not null,
  released_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trivia_post_facts_post_fk
    foreign key (post_id, workspace_id, page_id, niche_key)
    references public.posts(id, workspace_id, page_id, niche_key)
    on delete restrict,
  constraint trivia_post_facts_fact_fk
    foreign key (workspace_id, fact_id)
    references public.trivia_facts(workspace_id, id)
    on delete restrict,
  constraint trivia_post_facts_post_position_key unique (post_id, position),
  constraint trivia_post_facts_post_fact_key unique (post_id, fact_id),
  constraint trivia_post_facts_source_array_check
    check (jsonb_typeof(source_snapshot) = 'array' and jsonb_array_length(source_snapshot) >= 1),
  constraint trivia_post_facts_claim_hash_format_check
    check (claim_hash_snapshot ~ '^[0-9a-f]{64}$'),
  constraint trivia_post_facts_state_shape_check check (
    (
      allocation_state = 'allocated' and
      released_at is null and
      published_at is null
    )
    or
    (
      allocation_state = 'published' and
      released_at is null and
      published_at is not null
    )
    or
    (
      allocation_state = 'released' and
      released_at is not null and
      published_at is null
    )
  )
);

create unique index trivia_post_facts_page_active_fact_unique_idx
  on public.trivia_post_facts(page_id, fact_id)
  where allocation_state in ('allocated','published');

create index trivia_post_facts_fact_state_idx
  on public.trivia_post_facts(fact_id, allocation_state, id);

create index trivia_post_facts_page_state_idx
  on public.trivia_post_facts(page_id, allocation_state, created_at desc, id desc);

alter table public.workspaces enable row level security;
alter table public.niches enable row level security;
alter table public.pages enable row level security;
alter table public.page_niche_configs enable row level security;
alter table public.content_plans enable row level security;
alter table public.content_plan_items enable row level security;
alter table public.posts enable row level security;
alter table public.post_metrics enable row level security;
alter table public.trivia_facts enable row level security;
alter table public.trivia_post_facts enable row level security;
alter table internal.operation_ledger enable row level security;
alter table internal.rate_limit_buckets enable row level security;

revoke all on table
  public.workspaces,
  public.niches,
  public.pages,
  public.page_niche_configs,
  public.content_plans,
  public.content_plan_items,
  public.posts,
  public.post_metrics,
  public.trivia_facts,
  public.trivia_post_facts
from anon, authenticated;

revoke all on table
  internal.operation_ledger,
  internal.rate_limit_buckets
from anon, authenticated;

grant usage on schema api to authenticated;
-- EXECUTE diberikan satu per satu hanya pada api RPC allowlist.
~~~

### 20.1 Validasi yang tidak cukup dengan CHECK

RPC atau validator wajib memastikan:

- Market tidak duplikat dan UK dinormalisasi menjadi GB.
- Timezone terdapat pada pg_timezone_names.
- default_niche_key menunjuk config enabled pada Page.
- Config/payload schema version didukung.
- JSON config trivia lengkap dan bobot valid.
- Post format/topic/profile sesuai config Page.
- Text metrics dihitung ulang server-side.
- Post trivia hanya memakai trivia_facts workspace yang sama.
- Audit link `created_by_operation_id` hanya menunjuk ledger dalam workspace yang sama.
- `structured_match_eligible` hanya true setelah structured fields lengkap dan relation deterministic-safe; collision yang belum eligible tetap masuk review.
- Correction lineage tidak self-reference/cycle dan hanya memiliki satu direct successor current.
- Reuse rule dipenuhi saat reservasi dan save.
- Post metrics hanya untuk posted/archived.
- Transisi lifecycle legal.
- Plan status sesuai agregasi item.
- Semua public IDs di-resolve dalam workspace owner.

---

## 21. Trigger

### 21.1 updated_at

Satu helper trigger mengisi updated_at = now() sebelum update pada seluruh tabel mutable.

### 21.2 Proteksi canonical fact

Meaning fields trivia_facts tidak boleh diubah setelah pernah mempunyai junction, termasuk junction released:

- claim_text
- normalized_claim
- claim_hash
- subject_key
- relation_key
- object_key
- numbers
- qualifiers
- ontology_version
- structured_key
- structured_hash
- structured_match_eligible

Koreksi makna membuat row canonical baru. Sumber, verification status, freshness, expiry, dan review note dapat diperbarui. Snapshot pada junction mempertahankan konteks post lama.

### 21.3 Tidak ada trigger AI

Trigger tidak memanggil URL, AI, atau membuat konten. Trigger harus singkat dan tidak memperpanjang lock tanpa kebutuhan.

---

## 22. Pagination dan batas query

| Query | Default | Maksimum |
|---|---:|---:|
| Pages | 50 | 100 |
| Plans | 20 | 100 |
| Plan items | 50 | 500 |
| Posts | 20 | 100 |
| Kalender | sesuai rentang | 500 |
| Similar facts per candidate | 10 | 20 |
| Fact inventory | 50 | 200 |
| Metric snapshots | 20 | 100 |

Cursor memakai pasangan sort key + id, bukan offset besar.

---

## 23. Retention dan backup

- Post, plan, metric, dan fakta tidak dihapus otomatis.
- Discarded post serta released junction dipertahankan untuk audit operasional.
- Archived post mempertahankan published junction.
- Fact tidak otomatis reusable berdasarkan umur.
- Reservation expired dibersihkan opportunistic.
- Sebelum migration berisiko lakukan backup/export sesuai Supabase plan.
- Restore procedure diuji sebelum production dianggap selesai.

---

## 24. Migration strategy

Urutan migration:

1. Extensions.
2. Core ownership: workspaces dan niches.
3. Internal operation ledger dan rate-limit buckets.
4. Pages dan page_niche_configs.
5. Content plans dan content_plan_items.
6. Posts dan post_metrics.
7. Trivia facts dan trivia_post_facts.
8. Validation helpers.
9. Transactional RPC pada schema `api` dan helper `internal`.
10. Triggers.
11. Index tambahan.
12. RLS policies, explicit exposed schema, dan grants.
13. Seed niche trivia.
14. Seed workspace owner dan Page uji melalui flow aman.
15. Database tests.

Aturan:

- Buat migration melalui Supabase CLI; periksa command dengan --help.
- Jangan mengarang timestamp migration.
- Iterasi schema lokal dengan execute SQL atau local DB, lalu hasilkan migration bersih.
- Jalankan database advisors sebelum final.
- Verifikasi migration list.
- Jangan mengubah production Dashboard tanpa migration setara.
- Data API exposure dan grants menjadi bagian deployment checklist.

---

## 25. Pengujian database

### 25.1 Schema dan ownership

- Sepuluh tabel aplikasi dan dua tabel internal operasional tersedia.
- Seluruh PK, public ID, FK, unique, dan index penting tersedia.
- Auth user non-owner tidak dapat membaca atau menulis workspace.
- Composite audit FK menolak business row yang menunjuk operation ledger workspace lain.
- Owner dapat mengakses row miliknya.
- anon tidak memiliki akses.
- authenticated direct read/write ke tabel bisnis ditolak; read/write melalui `api` RPC allowlist berhasil.
- UPDATE policy memiliki USING dan WITH CHECK.
- Tidak ada function bisnis executable oleh PUBLIC.

### 25.2 Page dan config

- Page core tidak menyimpan field trivia.
- Trivia config enabled dapat dibuat.
- Satu Page hanya mempunyai satu config per niche.
- Hanya satu default enabled per Page.
- Config version tidak dikenal ditolak.
- Format/topic/bobot invalid ditolak.
- Fixed/adaptive, budget, reuse scope, render style, dan interaction goal divalidasi.
- Page tanpa niche aktif tidak dapat menerima post.

### 25.3 Plan dan resume

- Create plan membuat requested_count items dalam satu transaksi.
- Global operation-key retry mengembalikan plan sama; key sama dengan payload/operation berbeda ditolak.
- Dua plan tidak dapat memegang slot Page sama.
- Pembuatan plan item dan post paralel untuk Page+slot yang sama menghasilkan satu pemenang melalui advisory lock lintas-tabel.
- Chunk claim tidak mengambil item yang sedang in_progress.
- Lease dapat di-renew satu kali, expired lease dapat direclaim, dan stale token ditolak.
- Item berhasil menjadi completed setelah post tersimpan.
- Item gagal tidak menghapus post item lain.
- Plan dapat dilanjutkan dari chat lain.
- Cancel tidak menghapus post yang sudah dibuat.
- Replacement hanya tersedia bila seluruh output lama discarded dan tidak pernah posted/archived.

### 25.4 Deduplikasi

- Normalisasi exact menghasilkan claim hash sama.
- Structured key sama ditolak hanya bila kedua row current dinilai lengkap dan deterministic-safe; collision non-eligible masuk review.
- Alias, unit, negasi, waktu, dan lokasi mengikuti ontology.
- FTS/trigram mengembalikan near duplicate.
- Satu canonical row dapat dipakai lintas Page hanya bila rule mengizinkan.
- Gold set memenuhi target exact/structured capture, paraphrase candidate recall, dan zero false merge.
- Perubahan normalization_version atau ontology_version menjalankan ulang seluruh fixture.
- Reverify tidak mengubah identity; correction membuat successor atau invalidation dengan lineage valid.
- Self-reference dan cycle pada correction lineage ditolak.

### 25.5 Reservasi dan reuse

- Hanya fact verified dan tidak expired dapat direservasi.
- Operation key sama + payload sama idempotent.
- Operation key sama + payload/operation berbeda ditolak.
- Sepuluh reservasi simultan menghasilkan satu pemenang.
- Workspace unique menolak semua allocated/published junction.
- Page unique menolak allocated/published pada Page tujuan tetapi mengizinkan Page lain.
- Released junction tidak memblokir reuse.
- Expired reservation kembali available.

### 25.6 Post dan junction

- Save post, junction, release reservation, dan plan progress atomic.
- Fact ID tambahan/hilang ditolak.
- Position dan fact per post unik.
- Snapshot sumber serta hash tersimpan.
- Topic post dan fact role tersimpan sebagai dimensi analitik yang dapat diindeks.
- Junction trivia menolak post dengan niche selain trivia.
- JSON payload bukan sumber relasi.
- Slot Page sama ditolak.
- Active output kedua untuk plan item ditolak.
- Discarded output memungkinkan replacement baru.
- Config/content schema mismatch ditolak.

### 25.7 Revisi dan lifecycle

- Expected revision benar berhasil; lama ditolak.
- Ready yang direvisi kembali draft.
- Penggantian fact melepas junction lama dan mengalokasikan baru atomic.
- Draft/ready menjadi discarded dan junction released.
- Ready menjadi posted dan junction published.
- Archived tidak melepaskan published junction.
- Posted/discarded/archived tidak dapat direvisi.
- Replay key yang sama idempotent; target sama dengan key baru ditolak sebagai invalid transition.

### 25.8 Quality dan metrics

- System checks gagal mencegah ready.
- Editorial checks tidak diperlakukan sebagai bukti DB di luar attestation.
- Approval memerlukan revision/content hash current, actor auth current, dan menyimpan approval snapshot.
- Status ready/posted/archived tanpa approval snapshot ditolak oleh database constraint.
- Revisi/revoke/correction membuat approval lama stale dan ready kembali draft.
- Text metrics dihitung ulang dan overflow ditolak.
- Metrics untuk draft ditolak.
- Snapshot metrics tidak menimpa snapshot lama.
- Nilai negatif ditolak.
- Retry operation key tidak membuat snapshot ganda.

### 25.9 Performance

Gunakan EXPLAIN (ANALYZE, BUFFERS) untuk generation context, plan progress, list post, calendar, exact hash, structured hash, FTS, trigram, reuse check, latest metrics, dan insight aggregate.

Target server mengikuti PRD: read sederhana p95 maksimal 2 detik; duplicate search dan write sederhana p95 maksimal 3 detik.

---

## 26. Audit kesesuaian dengan PRD

| Keputusan PRD | Bukti desain |
|---|---|
| Multi-niche foundation | niches dan page_niche_configs |
| Trivia-only MVP | hanya trivia active dan tabel modul trivia |
| Satu post satu niche | posts.niche_key dan FK config |
| Satu plan satu Page+niche | content_plans composite FK |
| Resume batch | content_plan_items |
| Junction fakta | trivia_post_facts |
| Discard berbeda dari archive | lifecycle dan allocation_state |
| OAuth owner | owner_user_id, auth.uid(), RLS |
| Manual performance feedback | post_metrics |
| Versioned config/payload | config_schema_version dan content_schema_version |
| System/editorial checks terpisah | dua JSONB berbeda |
| Tanpa embeddings | FTS, trigram, hash |
| Multi-chat | global operation ledger, leases, locks, dan revision CAS |
| Tanpa background AI | plan adalah checkpoint, bukan job queue |
| Tidak ada hard delete | lifecycle + on delete restrict |
| Future niche tidak dipaksa menjadi trivia | module contract dan niche-specific junction |

---

## 27. Pengembangan database setelah MVP

### Quotes

Tambahkan quote_library dan quote_post_items jika deduplikasi, attribution, reuse, dan source lineage dibutuhkan. Jangan memasukkan quote ke trivia_facts.

### Psychology

Tambahkan psychology_claims dan psychology_post_claims dengan source policy serta safety metadata yang lebih ketat.

### Motivation

Tidak wajib memiliki library. Modul dapat hanya memakai posts sampai kebutuhan reusable themes atau frameworks terbukti.

### Multi-user

Tambahkan memberships dan role hanya saat produk benar-benar digunakan tim. owner_user_id MVP tetap menjadi jalur migrasi awal.

### Analytics lanjutan

Tambahkan derived views/materialized aggregates atau Facebook ingestion hanya setelah volume dan query nyata membutuhkannya. post_metrics tetap raw snapshot.

### Audit/version history

Tambahkan post_versions atau audit_events hanya jika rollback, compliance, atau kolaborasi memerlukannya.

---

## 28. Handoff ke implementation plan

Implementation plan harus merujuk dokumen ini untuk:

- Urutan migration.
- JSON validators per schema version.
- RPC input/output dan error mapping.
- RLS/grants/Data API exposure.
- Tool-to-RPC mapping.
- Transaction boundaries.
- Test fixtures dan concurrency tests.
- Seed niche trivia.
- Deployment, rollback, dan restore.

Sebelum implementasi, module-contract.md dan trivia-content-dna.md harus diselaraskan dengan config, payload, format, ontology, quality checks, serta evaluation fixtures dalam desain ini.

---

## 29. Referensi teknis

- Supabase — Securing your API: https://supabase.com/docs/guides/api/securing-your-api
- Supabase — Securing your data: https://supabase.com/docs/guides/database/secure-data
- Supabase — MCP Authentication: https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- Supabase — Using custom schemas: https://supabase.com/docs/guides/api/using-custom-schemas
- Supabase — Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase — Full Text Search: https://supabase.com/docs/guides/database/full-text-search
- Supabase — Managing Indexes: https://supabase.com/docs/guides/database/postgres/indexes
- Supabase — Database Functions: https://supabase.com/docs/guides/database/functions
- Supabase — Edge Function secrets: https://supabase.com/docs/guides/functions/secrets
- Supabase — API keys: https://supabase.com/docs/guides/getting-started/api-keys
