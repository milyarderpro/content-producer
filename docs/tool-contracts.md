# Kontrak dan pemakaian tool MCP

Panduan ini membantu memilih operasi dan menemukan definisi input/output yang
tepat. Baca [domain](domain.md) untuk alasan aturan bisnis dan
[arsitektur](architecture.md) untuk rantai implementasinya.

**Acuan peninjauan:** source pada `d6e7fe83ea006931f85624c4d60486f92ab3438c`,
25 Oktober 2026. Katalog source berisi **33 tool: 11 Baca dan 22 Tulis**.
Panduan ini tidak mengklaim katalog atau deployment live sudah diperiksa ulang.

## 1. Sumber definisi dan cara membacanya

| Kebutuhan                                                          | Definisi yang ditelusuri                                                                                                     |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Nama dan tujuan kontraktual                                        | [plans/tool-inventory.md](../plans/tool-inventory.md), dilengkapi keputusan perubahan yang diterima                          |
| Tool yang dipasang server                                          | [registry.ts](../supabase/functions/mcp/registry.ts) dan konstanta `*_TOOL_NAMES` pada kelompok handler                      |
| Field, enum, required/optional, batas array, dan bentuk output MCP | Zod schema serta pemetaan `invoke()` pada file handler terkait                                                               |
| Parameter dan aturan RPC database                                  | Fungsi `api.<nama_tool>` dan helper-nya dalam migration, termasuk perubahan lanjutan                                         |
| Descriptor yang dilihat host                                       | [transport.ts](../supabase/functions/mcp/transport.ts); metadata wire dapat disesuaikan tanpa melonggarkan validator runtime |
| Contoh dan regresi                                                 | Test MCP kelompok terkait, test database domain, serta referensi plugin                                                      |

Jangan menyalin seluruh JSON Schema ke panduan ini: duplikasi tersebut mudah
tertinggal. Tabel di bawah adalah peta, bukan payload lengkap yang siap dieksekusi.
Jika kontrak frozen, keputusan, dan kode berbeda, laporkan perbedaannya; kode
menjelaskan perilaku saat ini tetapi bukan izin mengubah kontrak tanpa keputusan.

**Catatan penting:** override No-auth CR-032 di bagian awal inventory lama adalah
sejarah. Default owner OAuth dipulihkan oleh
[CR-042](decisions/2026-10-20-phase-10-oauth-route-and-mode.md).
Jangan menyalin override lama sebagai konfigurasi koneksi baru.

## 2. Konvensi bersama dan pengecualian bootstrap

Pada jalur owner OAuth:

- Identitas berasal dari token tervalidasi dan pemeriksaan workspace aktif.
  `workspace_public_id` memilih scope yang harus cocok, bukan bukti kepemilikan.
- Sebagian besar tool memakai `request_schema_version: 1` dan
  `workspace_public_id`. Semua write juga memakai `operation_key` UUID v4.
- Object kontrak bersifat tertutup; field tambahan tidak dianggap bebas diabaikan.
  Handler memakai pemeriksaan bentuk, database juga menjaga semantik nilainya.
- Gunakan public ID, cursor yang dikembalikan server, dan timestamp asli.
  Jangan merakit cursor atau menggunakan ID internal.
- Batas pagination berbeda per operasi: list umum biasanya maksimal 50,
  sedangkan pembacaan item plan dan histori metrik dapat mencapai 100.

### Dua pengecualian yang perlu diingat

**`get_account_profile`** menerima `{}`. Hasil sukses OAuth di
`structuredContent` langsung berbentuk profile: `id` dan field display opsional
`name`/`nickname`, bukan envelope `response_schema_version/data`.
Profile ini tidak memberikan `workspace_public_id` pada jalur OAuth.

**`get_workspace_context`** dapat menerima `{}` pada jalur OAuth. Server mengisi
request version default dan menggunakan workspace owner yang sudah diselesaikan
di context. Ambil `data.workspace.public_id` dari hasilnya untuk operasi berikutnya.
Jika workspace dikirim eksplisit, nilainya tetap harus sesuai owner.

Pemetaan khusus ini ada di [foundation.ts](../supabase/functions/mcp/foundation.ts).
Jangan menganggap setiap tool membutuhkan atau mengembalikan envelope yang sama.

## 3. Daftar 33 tool

Nomor mengikuti inventory kontrak. Urutan pemasangan kelompok pada registry tidak
harus sama dengan nomor ini. Kolom syarat hanya menyoroti hal penting; baca schema
sebelum merakit payload.

| No. | Tool                                | Jenis | Tujuan dan syarat utama                                                                                                 |
| --- | ----------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | `get_account_profile`               | Baca  | Mengenali akun koneksi; input `{}`, output profile khusus                                                               |
| 2   | `get_workspace_context`             | Baca  | Membaca workspace, defaults, dan katalog modul; bootstrap OAuth boleh `{}`                                              |
| 3   | `list_pages`                        | Baca  | Mencari Page sebelum memilih sasaran; hasil kosong bukan izin membuat Page                                              |
| 4   | `create_page`                       | Tulis | Membuat representasi Page dan config niche di aplikasi berdasarkan keputusan pemilik                                    |
| 5   | `update_page`                       | Tulis | Mengubah Page/config dengan timestamp CAS yang sesuai                                                                   |
| 6   | `get_page_generation_context`       | Baca  | Membaca aturan generasi dan config ID/time terkini untuk Page+niche                                                     |
| 7   | `list_content_plans`                | Baca  | Menemukan plan menurut scope/filter                                                                                     |
| 8   | `create_content_plan`               | Tulis | Menyimpan 1–100 item berurutan mulai posisi 1 dan maksud rencana                                                        |
| 9   | `get_content_plan`                  | Baca  | Membaca progres dan item; token claim tidak dibuka lewat read biasa                                                     |
| 10  | `claim_content_plan_items`          | Tulis | Mengambil maksimal tiga item; `lease_minutes: 30`                                                                       |
| 11  | `renew_content_plan_claim`          | Tulis | Memperpanjang satu claim aktif satu kali, maksimal 60 menit dari awal                                                   |
| 12  | `report_content_plan_item_failure`  | Tulis | Mencatat kegagalan attempt dengan claim sah dan detail aman                                                             |
| 13  | `retry_content_plan_item`           | Tulis | Mengembalikan item failed ke pending, tetap menyimpan riwayat                                                           |
| 14  | `replace_discarded_plan_item`       | Tulis | Membuka penggantian output discarded dengan `explicit_replacement: true`                                                |
| 15  | `cancel_content_plan`               | Tulis | Membatalkan sisa pekerjaan dengan `explicit_cancellation: true`; output completed tetap                                 |
| 16  | `trivia_find_similar_facts`         | Baca  | Mencari kandidat dedup untuk 1–9 calon fakta; bukan putusan kesamaan makna                                              |
| 17  | `trivia_register_and_reserve_facts` | Tulis | Memverifikasi kontrak dan mereservasi set fakta terurut dengan token serta config CAS                                   |
| 18  | `trivia_release_facts`              | Tulis | Melepas reservasi yang batal dipakai sesuai Page/token                                                                  |
| 19  | `trivia_reverify_fact`              | Tulis | Memperbarui bukti proposisi yang sama dengan fact timestamp CAS                                                         |
| 20  | `trivia_correct_fact`               | Tulis | Invalidate/supersede; `explicit_correction: true`; successor hanya untuk supersede                                      |
| 21  | `list_posts`                        | Baca  | Mencari post dengan filter dan pagination                                                                               |
| 22  | `get_post`                          | Baca  | Membaca isi, revision/hash, approval, serta sumber/checks/metrik sesuai opsi                                            |
| 23  | `save_post`                         | Tulis | Membuat draft dari reservasi, config snapshot, bindings, dan editorial checks; claim jika dari plan                     |
| 24  | `revise_post`                       | Tulis | Mengubah konten draft/ready dengan revision+hash CAS; fakta baru memerlukan reservasi cocok                             |
| 25  | `reschedule_post`                   | Tulis | Mengubah/mengosongkan jadwal internal dengan revision CAS; bukan publikasi Facebook                                     |
| 26  | `approve_post`                      | Tulis | Menyetujui draft yang telah ditinjau; revision+hash CAS, `explicit_approval: true`, dan warning acceptance bila berlaku |
| 27  | `revoke_post_approval`              | Tulis | Mencabut approval ready dengan revision+hash CAS dan `explicit_revocation: true`                                        |
| 28  | `discard_post`                      | Tulis | Membuang draft/ready dari alur aktif; revision CAS dan `explicit_discard: true`                                         |
| 29  | `mark_post_posted`                  | Tulis | Mencatat publikasi manual nyata; revision+hash CAS dan `explicit_publication_confirmation: true`                        |
| 30  | `archive_post`                      | Tulis | Mengarsipkan post posted; revision CAS dan `explicit_archive: true`                                                     |
| 31  | `record_post_performance`           | Tulis | Menambah observasi nyata untuk posted/archived; bukan edit revision konten                                              |
| 32  | `get_post_performance`              | Baca  | Membaca histori snapshot dan delta yang dapat dibandingkan                                                              |
| 33  | `get_performance_insights`          | Baca  | Membaca agregat terbatas beserta sample size, pengecualian, dan caveat                                                  |

### Lokasi handler dan test MCP

Semua path berikut relatif terhadap `supabase/functions/mcp/`. Test kelompok
menggunakan nama yang sama dengan suffix `_test.ts`; aturan database dilengkapi
test di `supabase/tests/database/`.

| Kelompok tool | Handler                                                                |
| ------------- | ---------------------------------------------------------------------- |
| 1, 2, 3, 6    | [foundation.ts](../supabase/functions/mcp/foundation.ts)               |
| 4, 5, 7, 8, 9 | [page_plan.ts](../supabase/functions/mcp/page_plan.ts)                 |
| 10–12         | [plan_claim.ts](../supabase/functions/mcp/plan_claim.ts)               |
| 13–15         | [plan_recovery.ts](../supabase/functions/mcp/plan_recovery.ts)         |
| 16–18         | [trivia_fact.ts](../supabase/functions/mcp/trivia_fact.ts)             |
| 19–20         | [trivia_correction.ts](../supabase/functions/mcp/trivia_correction.ts) |
| 21–23         | [post_base.ts](../supabase/functions/mcp/post_base.ts)                 |
| 24–25         | [post_edit.ts](../supabase/functions/mcp/post_edit.ts)                 |
| 26–28         | [post_approval.ts](../supabase/functions/mcp/post_approval.ts)         |
| 29–30         | [post_publication.ts](../supabase/functions/mcp/post_publication.ts)   |
| 31–33         | [post_metrics.ts](../supabase/functions/mcp/post_metrics.ts)           |

## 4. Dari input MCP ke hasil bisnis

Setiap handler memetakan argumen ke RPC bernama sama melalui `invoke()`, misalnya
`workspace_public_id` menjadi `p_workspace_public_id`. Adapter tertentu menambah
default atau menyesuaikan projection; jangan memanggil RPC mentah dengan asumsi
bentuknya persis sama dengan MCP.

Hasil sukses umum terdapat di `structuredContent`:

```text
response_schema_version: 1
data: hasil khusus tool
```

Banyak hasil write memiliki `data.replayed`. Nilai `true` berarti respons operasi
semula diputar ulang, bukan perubahan baru atau jaminan state sekarang sama.

Error domain yang dipetakan aman memiliki `isError: true`, dengan:

```text
response_schema_version: 1
error:
  code
  message
  retryable
  recovery
  retry_after_seconds  # jika relevan
```

Schema input tidak valid dapat ditolak pada lapisan MCP sebelum RPC. Tantangan
OAuth dan penolakan HTTP memiliki bentuk tersendiri. Selalu periksa lapisan error
dan hasil terstruktur; jangan menyimpulkan sukses dari HTTP 200 atau teks ringkas.

`invoke()` membatasi respons RPC hingga 256 KiB dan memvalidasi output secara
ketat. `DATABASE_UNAVAILABLE` dapat menandakan gangguan jaringan/database, output
terlalu besar, atau ketidakcocokan schema respons. Error itu sendiri belum
mengidentifikasi akar masalah; lihat reproduksi dan bukti terisolasi.

## 5. Kontrak kandidat dan bukti trivia

Definisi bersama `candidate` berada di `trivia_fact.ts` dan dipakai pula oleh
successor correction. Field pentingnya:

- `candidate_key`, `claim_text`, `subject_key`, `relation_key`, `object_key`;
- `numbers`: setiap entri memiliki string numerik `value`, `unit` yang boleh
  `null`, dan `role`;
- `qualifiers`: `negated` dan `comparison_direction` wajib; qualifier lainnya
  mengikuti schema;
- `topic_key`, `normalization_version: 1`, `ontology_version: 1`.

`relation_key` memakai konstanta `TRIVIA_RELATION_KEYS_V1` berisi 17 key resmi.
`comparison_direction` hanya menerima:

```text
increase, decrease, greater_than, less_than,
at_least, at_most, equal, none
```

Enum MCP tidak menggantikan aturan hubungan semantik SQL. Misalnya, direction
untuk `reduces_or_increases_risk` berbeda dari relasi jumlah biasa. Jangan memilih
relasi/direction yang tidak sesuai klaim hanya untuk lolos validasi. Acuannya
[CR-005](decisions/2026-10-09-comparison-direction-candidate-contract.md) dan
[FIX-37](decisions/2026-10-21-fix-37-sql-ontology-mcp-reconciliation.md).

Registrasi juga membawa `dedup_reviews`, sumber, freshness, risk class, expiry yang
diminta, dan catatan verifikasi. Set harus berurutan, unik, dan memenuhi config.
`reservation_token` dikirim caller dan diikat server ke set yang sesuai.

`source_evidence_adapter.ts` mengisi `published_at`, `updated_at`, dan `as_of`
yang tidak dikirim dengan `null` pada jalur register/reserve. Ini bukan izin
mengarang tanggal atau mengubah nilai yang diberikan. Jangan mengasumsikan adapter
tersebut otomatis berlaku pada semua tool; periksa pemanggilnya.

## 6. Kontrak penyimpanan dan revisi post

`save_post` menghubungkan beberapa bagian yang harus cocok:

| Bagian                | Aturan utama                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Scope dan config      | Workspace/Page/niche harus cocok; `expected_config_updated_at` berasal dari context terbaru                           |
| `generation_snapshot` | `config_public_id` adalah ID config Page+niche, bukan Page ID; timestamp dipertahankan tanpa pembulatan               |
| Payload               | Hook, body fakta, CTA, `canva_copy`, caption, hashtags, render style, dan metrics mengikuti schema                    |
| `fact_bindings`       | Jumlah, posisi, urutan, serta `rendered_text` harus cocok dengan body; fact ID tidak berulang                         |
| Editorial             | Criteria/rubric yang diizinkan; server mengikat evidence sesuai kontrak, bukan menerima actor/timestamp buatan caller |
| Plan opsional         | Item/claim harus sah dan cocok dengan Page/niche, slot, serta pilihan item                                            |

Untuk `save_post` dan `revise_post`, instruksi plugin saat ini adalah mengirim
**`content_payload.text_metrics: {}`**. Server menghitung metrics authoritative.
Schema juga dapat menerima assertion lengkap yang persis cocok, tetapi AI tidak
perlu menghitung atau menebaknya sendiri. Gunakan metrik hasil server untuk laporan
dan perbaikan budget; jangan memotong teks tanpa meninjau ulang makna.

Versi snapshot dan konstanta renderer mengikuti schema aktif; jangan menebak dari
nilai yang kebetulan terlihat pada post lama. Gunakan context baru tepat sebelum
write dan pertahankan enam digit mikrodetik `config_updated_at`, sesuai
[CR-046](decisions/2026-10-20-phase-10-4-generation-context-config-id.md).

Pada revisi, fakta yang dipertahankan tidak direservasi ulang. Fakta baru harus
sesuai set reservasi baru; fakta yang dikeluarkan menjadi riwayat. Rincinya ada di
[CR-013](decisions/2026-10-11-phase-5-6-post-write-reconciliation.md).

`get_post` tidak membuka private `generation_snapshot`. Opsi `include_sources`
mengatur projection `source_snapshot`; saat sumber disertakan, nested nullable
field seperti `numbers[*].unit` harus tetap ada. Jangan memperbaiki ketidakcocokan
ini dengan membuang `null` atau melonggarkan validator. Acuannya
[CR-049](decisions/2026-10-22-cr-049-get-post-source-evidence-null-preservation.md).

## 7. Pola pemanggilan dan pemulihan

```text
Kenali koneksi:
get_account_profile({}) → get_workspace_context({}) → list_pages

Satu draft:
get_page_generation_context → riset → trivia_find_similar_facts
→ tinjauan semantik → trivia_register_and_reserve_facts → save_post → get_post

Batch:
create_content_plan → claim_content_plan_items
→ alur draft per item / report_content_plan_item_failure
→ get_content_plan pada kelanjutan percakapan

Approval dan publikasi:
get_post → tinjauan pemilik → approve_post
→ publikasi manual di luar aplikasi → konfirmasi → mark_post_posted
→ record_post_performance bila pengamatan nyata tersedia
```

Pola ini tidak memberi izin write otomatis. Target, isi, dan tindakan yang
memerlukan persetujuan harus ditinjau sesuai konteks pemilik.

| Error / keadaan                                                       | Tindakan yang benar                                                                 |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `AUTH_REQUIRED`, challenge OAuth                                      | Perbaiki/relink koneksi melalui host; jangan meminta token atau password di payload |
| `OWNER_ACCESS_REQUIRED`, `FORBIDDEN`                                  | Hentikan akses; jangan mencoba scope owner lain                                     |
| `VALIDATION_FAILED`, error schema MCP                                 | Cocokkan field dan enum; bedakan penolakan MCP dari penolakan RPC                   |
| `OPERATION_KEY_REUSED`                                                | Periksa maksud/payload asli; key baru hanya untuk operasi baru yang jelas           |
| Respons write hilang                                                  | Baca keadaan untuk rekonsiliasi; replay hanya key dan payload semantik yang sama    |
| `REVISION_CONFLICT`, `CONTENT_HASH_CONFLICT`, `PAGE_VERSION_CONFLICT` | Baca ulang, tinjau perbedaan, lalu tentukan tindakan; jangan overwrite otomatis     |
| Claim/reservasi expired atau context berubah                          | Baca state dan context terbaru, ikuti alur claim/reservasi yang sah                 |
| `SCHEDULE_CONFLICT`                                                   | Minta keputusan jadwal yang jelas; jangan menggeser slot sendiri                    |
| `RATE_LIMITED`                                                        | Ikuti `retry_after_seconds`; jangan menjalankan loop sibuk                          |
| `DATABASE_BUSY`                                                       | Retry terbatas sesuai petunjuk, dengan key/payload yang sama untuk write            |
| `POST_NOT_PUBLISHED`                                                  | Jangan mencatat atau merekayasa publikasi untuk meloloskan metrik                   |

Token claim/reservasi hanya dipakai pada field dan hasil terstruktur yang
diizinkan; jangan menyalinnya ke copy publik, log, Issue, atau catatan dokumentasi.
`readOnlyHint`/`destructiveHint` membantu host memahami operasi, tetapi tidak
menggantikan pemeriksaan identitas, izin owner, atau aturan database.
