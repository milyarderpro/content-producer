# Matriks diagnostik P6 — seluruh 36 tool

**Batas bukti:** LOCAL/CI FIXTURE, bukan LIVE atau bukti transaksi database baru.
`supabase/functions/mcp/diagnostics_test.ts` membentuk 36 kasus dari registry
aktual; nama setiap kasus memuat tool dan seluruh lapisannya. Tiga kasus tambahan
menegakkan inventaris, lokasi/alias/native recovery, serta taksonomi P1.

## Matriks tool × lapisan

Setiap baris menjalankan **I/A/D/R/T/O/U/P**:

- I: request invalid lewat transport/schema tool terdaftar; callback/RPC tidak
  dipanggil, text SDK tersanitasi, lokasi field aman.
- A: workspace asing ditolak sebelum RPC; token owner tidak diganti.
- D: injeksi penolakan RPC atomik di boundary `invoke`, dengan kode relevan pada
  tabel. Payload/domain SQL tetap diuji suite domain tersendiri; injeksi ini
  membuktikan mapping/recovery, bukan kondisi database production.
- R: rate-limit dengan `Retry-After: 17`, dipertahankan sebagai waktu tunggu.
- T: network loss dan timeout sesudah dispatch.
- O: respons oversize dan schema invalid, termasuk upstream berisi secret sintetis.
- U: error upstream tak dikenal, tanpa menebak akar sebab.
- P: redaction respons/log dan kecocokan `diagnostic_id` log tersanitasi.

**R** pada kolom mode berarti Read (outcome seluruh kegagalan `not_applicable`).
**W** berarti Write (I/A/R `not_started`; D `rolled_back`; T/O/U `unknown`).
Untuk Read, CAS/replay key/rollback business Write **tidak berlaku karena operasi
tidak memutasi bisnis**. Untuk Write, unknown harus rekonsiliasi/replay identik.
Semua baris memiliki kasus; tidak ada tool D2 yang dikecualikan.

| Tool | Mode | D: kode kasus | I/A/D/R/T/O/U/P |
| --- | --- | --- | --- |
| `get_account_profile` | R | WORKSPACE_NOT_FOUND | PASS |
| `get_workspace_context` | R | WORKSPACE_NOT_FOUND | PASS |
| `list_pages` | R | VALIDATION_FAILED | PASS |
| `get_page_generation_context` | R | PAGE_NOT_FOUND | PASS |
| `create_page` | W | PAGE_SLUG_CONFLICT | PASS |
| `update_page` | W | PAGE_VERSION_CONFLICT | PASS |
| `list_content_plans` | R | PAGE_NOT_FOUND | PASS |
| `create_content_plan` | W | PLAN_LIMIT_EXCEEDED | PASS |
| `get_content_plan` | R | PLAN_NOT_FOUND | PASS |
| `claim_content_plan_items` | W | PLAN_STATUS_CONFLICT | PASS |
| `renew_content_plan_claim` | W | PLAN_CLAIM_RENEWAL_LIMIT | PASS |
| `report_content_plan_item_failure` | W | PLAN_ITEM_CLAIM_EXPIRED | PASS |
| `retry_content_plan_item` | W | PLAN_STATUS_CONFLICT | PASS |
| `replace_discarded_plan_item` | W | PLAN_ITEM_REPLACEMENT_BLOCKED | PASS |
| `cancel_content_plan` | W | PLAN_STATUS_CONFLICT | PASS |
| `trivia_find_similar_facts` | R | FACT_REVIEW_REQUIRED | PASS |
| `trivia_register_and_reserve_facts` | W | FACT_SOURCE_INSUFFICIENT | PASS |
| `trivia_release_facts` | W | FACT_RESERVATION_MISMATCH | PASS |
| `trivia_reverify_fact` | W | FACT_CORRECTION_CONFLICT | PASS |
| `trivia_correct_fact` | W | FACT_CORRECTION_REQUIRED | PASS |
| `save_post` | W | FACT_RESERVATION_EXPIRED | PASS |
| `list_posts` | R | PAGE_NOT_FOUND | PASS |
| `get_post` | R | POST_NOT_FOUND | PASS |
| `revise_post` | W | REVISION_CONFLICT | PASS |
| `reschedule_post` | W | SCHEDULE_CONFLICT | PASS |
| `approve_post` | W | QUALITY_EVIDENCE_STALE | PASS |
| `revoke_post_approval` | W | CONTENT_HASH_CONFLICT | PASS |
| `discard_post` | W | INVALID_STATUS_TRANSITION | PASS |
| `mark_post_posted` | W | APPROVAL_REQUIRED | PASS |
| `archive_post` | W | INVALID_STATUS_TRANSITION | PASS |
| `record_post_performance` | W | METRIC_SNAPSHOT_CONFLICT | PASS |
| `get_post_performance` | R | POST_NOT_FOUND | PASS |
| `get_performance_insights` | R | METRIC_DEFINITION_AMBIGUOUS | PASS |
| `trivia_find_similar_facts_v2` | R | PAGE_NOT_FOUND | PASS |
| `save_post_v2` | W | FACT_REUSE_BLOCKED | PASS |
| `revise_post_v2` | W | REVISION_CONFLICT | PASS |

## Recovery dan pengecualian spesifik

- Native Read v1 ditolak dalam envelope 1 dengan `FACT_REVIEW_REQUIRED`;
  recovery tidak mengasumsikan runtime/plugin v2 terpasang. Tidak ada metadata
  ontologi rekaan, hasil bersih palsu, ID baru pengelak atau pindah versi saat
  Write lama masih unknown.
- Source/review diagnostics v1 tetap allowlist; detail `facts[3]` SQL one-based
  diproyeksikan sebagai `facts[2]` path zero-based. Raw detail lain dibuang.
  Budget tanpa detail hanya menunjuk `content_payload`, tidak menuduh caption
  tertentu. Input URL/field yang diketahui menyebut path-nya; backend tidak
  dinyatakan telah memverifikasi isi URL.
- `CONTENT_BUDGET_EXCEEDED`/`EDITORIAL_REVIEW_REQUIRED` backend dinormalisasi ke
  `TEXT_BUDGET_EXCEEDED`/`QUALITY_EDITORIAL_INCOMPLETE` P1. Delapan kode baru dan
  kode kontrak tambahan memakai fallback vocabulary v1 yang dibekukan.
- Header `Retry-After` atau detail allowlisted `RETRY_AFTER_SECONDS:N` digunakan
  bila tersedia. Backend legacy yang tidak mengirim sisa waktu memakai batas
  tunggu konservatif satu window 60 detik; pesan menyatakan waktu exact tidak
  diberikan, bukan mengklaim 60 sebagai sisa waktu aktual.
- Metrik append-only tidak meminta content revision/hash CAS; claim expiry tidak
  berlaku untuk Read performa. Input, scope, rate, transport/output tetap berlaku.
- Penolakan host sebelum MCP tidak mempunyai respons/diagnostic ID server untuk
  direkayasa. HTTP OAuth challenge/owner denial mempertahankan kontraknya;
  suite auth/transport tersendiri memeriksanya. Matriks ini memeriksa boundary
  adapter pada setiap tool, bukan mengganti verifikasi JWT/HTTP tersebut.
- Respons/log diagnostik tidak memuat operation key, credential, raw SQL,
  payload, URL sumber, atau resource owner lain. Log hanya event, opaque ID,
  nama tool terdaftar, tahap, kategori/kode dan outcome.
