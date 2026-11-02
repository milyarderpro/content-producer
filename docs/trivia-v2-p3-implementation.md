# Implementasi P3: identitas, backfill, dan Read trivia v2

**Status bukti:** source dan uji lokal pada stack Supabase terisolasi; bukan runtime
production, host/plugin, atau hasil gate rilis G4. Berlaku untuk tiga migration
`20261101160500`, `20261101161000`, dan `20261101161500`. Kontrak perilaku:
[identitas](contracts/trivia-fact-identity-v2.md),
[Read](contracts/trivia-fact-read-v2.md), serta
[contoh wire](contracts/trivia-draft-v2.md). Fixture P2 tetap dibekukan.

## Schema dan invariant

`public.trivia_facts` tetap registry authoritative. Baris v1 lama memperoleh
`has_v1_envelope=true` lewat default, tanpa penulisan ulang ID, ontologi, sumber,
status, atau hash. Native v2 memakai ID/fact_public_id dan normalisasi/hash klaim
yang sama, `has_v1_envelope=false`, status awal `needs_review`, dan seluruh
field envelope v1 kosong. Constraint kondisional dan trigger menolak envelope
parsial dan native `verified`. `public.trivia_fact_evidence_v2` menyimpan tepat
satu URL web per `(workspace_id,fact_id)`; trigger deferred menolak commit native
tanpa URL. URL tidak dipakai untuk mengarang tier, expiry, atau verified timestamp.

`public.trivia_post_facts.snapshot_schema_version` membedakan binding konten v1
(default untuk baris lama) dan v2. Validasi v1 tetap memakai snapshot sumber
lama; validasi v2 memeriksa klaim/URL versi 2. Data published, draft, correction,
FK, dan snapshot lama tetap di tabel yang sama. View
`internal.trivia_fact_identity_v2` dan `internal.trivia_fact_usage_v2` memetakan
semua baris secara in-place. Tidak ada registry atau salinan usage kedua.

Migration katalog menyemai satu counter per workspace dengan `ON CONFLICT DO
NOTHING`. Trigger sinkron menaikkannya sekali per transaksi mutasi identitas,
evidence, status, reservasi, usage, atau reuse scope. Read dan replay tanpa
perubahan tidak menaikkan counter. Pergantian TTL tanpa mutasi row juga tidak
menaikkannya. Resolver v1 memeriksa native sebelum insert: exact claim dengan
paket evidence v1 sah dapat menambahkan envelope pada ID sama; konflik atau
representasi yang tidak aman ditolak `FACT_REVIEW_REQUIRED`. Read v1 untuk
native wajib yang belum dapat diproyeksikan juga ditolak terarah menurut CR-054.
Request v1 lain tetap memakai jalur lama.

## Read dan batas pemulihan

`api.trivia_find_similar_facts_v2` menerima 1–9 klaim tanpa URL/ontologi,
memvalidasi owner dan Page, lalu memakai satu snapshot SQL untuk identitas,
status, usage, reuse scope, dan `catalog_version` string. Predicate exact,
full-text, dan trigram `>=0.20` serta urutan mengikuti kontrak P2. Semua status
negatif tetap terlihat. Setiap calon mendapat maksimal 20 match; `complete`
bernilai benar hanya jika seluruh himpunan predicate tertangkap. Hasil nol
adalah `[]` dengan `complete=true`, terbatas pada aturan retrieval ini. Respons
lebih dari 65.536 byte gagal `FACT_REVIEW_REQUIRED`, bukan hasil bersih palsu.

Jika `complete=false`, respons terpotong/hilang, error Read, atau match `same`
tidak layak, ganti calon dan lakukan Read baru. `catalog_version` dari Read gagal
tidak boleh dibawa ke Write. Counter ini memberi fondasi untuk pemeriksaan
`expected_catalog_version` pada save/revise P4; Read sendiri tidak mengizinkan
Write. Retrieval leksikal dapat melewatkan parafrasa; `complete=true` bukan
jaminan semua duplikasi semantik ditemukan.

## Verifikasi lokal dan rollback

Pada stack terisolasi, 75 migration diterapkan melalui clean reset. Uji
`api-trivia-v2-read` membuktikan ID native/first attachment, penolakan Read v1
native, scope owner, satu URL, mapping berulang tanpa duplikasi, published usage,
snapshot lama identik, hasil kosong, limit 20, dan error oversize. Uji
`api-trivia-v2-corpus` memakai 92 identitas/93 query fixture P2 dan oracle SQL
mandiri; syarat paraphrase recall minimal 38/40 serta 18/18 history negatif
lulus. Ini bukti fixture lokal, bukan eksperimen host/LIVE. Audit SQL pada stack
terisolasi menunjukkan 34 API RPC, 17/17 tabel RLS, owner SELECT policy lengkap,
allowlist difference nol, tidak ada akses business/helper langsung bagi caller,
dan tidak ada API yang di-execute `anon`/`service_role`.

Rollback operasional harus additive: hentikan pemanggil v2 dahulu, pertahankan
kolom/tabel/data baru dan v1 yang sudah ada, lalu gunakan prosedur deployment
terotorisasi. Jangan drop data native atau memutar ulang migration lama.
Migration baru tidak dijalankan di production oleh pekerjaan P3 ini. Gate rilis
G4 pada SHA final tetap wajib sebelum deployment; hasil audit lokal ini tidak
menggantikannya. Audit historis `scripts/phase-6-catalog-audit.ts` masih
mengasumsikan 72 migration/33 RPC/15 tabel dan memerlukan perluasan exact-baseline
yang aman sebelum gate G4 dapat lulus pada versi v2. Baseline historis tidak
dilemahkan dalam P3 ini.
