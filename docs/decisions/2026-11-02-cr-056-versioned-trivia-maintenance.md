# CR-056 — Maintenance fakta trivia dengan kontrak versi 2

**Status: Accepted**, 2 November 2026. Pemilik menyetujui opsi “Setujui versi 2”
dalam sesi apply P5 untuk `simplify-trivia-draft-workflow` sebelum coding koreksi.

## Keputusan

CR-053 menetapkan perilaku reverify URL dan koreksi v2, tetapi payload tool
maintenance lama masih wajib sources/tier/expiry v1. Perluas **nama yang sama**
`trivia_reverify_fact` dan `trivia_correct_fact` dengan request/response versi 2.
Kontrak versi 1, operasi in-flight/replay, dan riwayat lama tetap dipertahankan.
Tidak menambah nama tool ke tiga nama baru Read/save/revise yang direncanakan.

Kontrak backend P5 (adapter MCP mengikuti P6):

- Keduanya: `request_schema_version: 2`, workspace, operation key, fact ID, dan
  `expected_fact_updated_at` teks RFC3339 dengan enam digit mikrodetik.
- Reverify: `confirmed_claim_text`, `source_url`. Kalimat harus mempunyai
  normalisasi sama; perubahan proposisi harus melalui correction. Output versi 2:
  `fact_public_id`, `verification_status`, `source_url`, `fact_updated_at`,
  `affected_posts`, `replayed`. Tidak mengarang `verified_at` atau expiry.
- Correction: `action` invalidate/supersede, `correction_reason`,
  `explicit_correction: true`, `successor`, `expected_catalog_version`.
  Untuk invalidate, successor dan catalog version null. Untuk supersede,
  successor memakai satu entri `facts` P4 (position 1, candidate key, claim,
  URL, dedup); catalog version string berasal dari Read v2 terbaru.
  Output versi 2 mempertahankan field correction v1: `fact_public_id`,
  `old_status`, `successor_public_id`, `affected_posts`, `replayed`.
- Supersede membuat satu successor baru hanya setelah dedup lengkap. Jika
  successor ternyata identitas existing, tolak `FACT_CORRECTION_CONFLICT` tanpa
  identitas paralel atau pengubahan lineage existing secara diam-diam.
- Canonical URL dapat diperbarui tanpa mengubah snapshot binding. Correction
  membatalkan approval/editorial post mutable yang memakai fakta; published dan
  archived tetap utuh. Owner scope, locks workspace→Page/config→post→fact,
  CAS, idempotency, katalog A dan grant default-closed tetap berlaku.

Ini melengkapi schema maintenance dalam scope P5, bukan persetujuan deploy,
business Write production, instalasi plugin, cutover v1, atau alternatif B.

## Pelengkap Read untuk CAS — Accepted pada sesi yang sama

Pemilik kemudian menyetujui opsi “Setujui timestamp Read”: setiap match
`trivia_find_similar_facts_v2` ditambah `fact_updated_at`, timestamp canonical
RFC3339 dengan enam digit mikrodetik dari pandangan statement yang sama.
Caller menyalinnya sebagai `expected_fact_updated_at` maintenance, bukan memakai
waktu snapshot post atau membuat timestamp sendiri. Ini override eksplisit
daftar field match pada kontrak contoh P1 dan Read P2; contoh/schema terkini
diselaraskan tanpa mengubah bukti PASS historis P1/P2. Predicate/ranking/cap,
`complete`, katalog A, dan respons v1 tetap sama. Penambahan byte tetap masuk
penghitungan batas output yang sudah ada.
