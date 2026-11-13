# MCP katalog dan config2 — CR-062 task 7

Kontrak source ini mengikuti [CR-062](../decisions/2026-11-12-cr-062-configurable-trivia-editorial-profiles.md),
[katalog SQL](trivia-editorial-catalog.md), [Page/resolver](trivia-page-editorial-profiles.md),
[renderer](trivia-render-config2.md), [snapshot post](trivia-post-editorial-snapshots.md),
dan [plan/batch](trivia-config2-plan-batch.md). Hasil pengujian dibatasi
LOCAL/FIXTURE; pemasangan backend, plugin dan runtime owner memerlukan bukti
terpisah. Panduan plugin diperbarui pada task 8.

## Katalog dan otorisasi

Registry owner OAuth memuat **33 tool unik: 12 Read dan 21 Write**. Dua tambahan
adalah `get_trivia_editorial_catalog` dan `update_trivia_editorial_catalog`.
Nama dihitung dari array yang diimpor registry oleh
`../../scripts/mcp-catalog-inventory.ts`, lalu dibandingkan dengan RPC,
manifest, test diagnostics dan census Inspector. Lima nama v1 tetap absen serta
ditolak; dua maintenance hanya menerima request2. Tidak ada alias untuk
menghidupkan ulang reservasi/save/revise v1.

Tool umum, termasuk dua tool katalog, tetap request/response1; draft dan
maintenance tetap request/response2. Versi config Page 1/2, content2 dan generation
snapshot2/3 mempunyai arti terpisah. `get_account_profile` tetap pengecualian
profile tanpa envelope; identity/koneksi/scopes OAuth tidak berubah.

Kedua tool katalog hanya didaftarkan untuk context owner OAuth. Rollback
`fixed-pilot` eksplisit mempertahankan 31 tool sebelumnya dan tidak memperoleh
kedua tool atau grant baru. Mode itu tidak diaktifkan oleh implementasi maupun
test task ini. Tidak ada akses langsung caller ke tabel/helper/sequence, token
pengganti, service-role RPC bypass atau business SQL dalam facade.

`editorial_catalog.ts` hanya memetakan nama field ke `p_*` dan memanggil `invoke()`
yang sama dengan tool lain. Owner/workspace, graph/reference, aturan Page,
retirement, CAS, replay serta transaksi tetap ditegakkan SQL/core.

## Dua tool katalog

Read menerima workspace dan field opsional berikut:

- `filter`: object tertutup kind/key/version, **atau hanya** `references` berisi
  1–20 reference tepat. Tidak dapat mencampur kedua bentuk.
- `include_examples` boolean, default server false; `limit` 1–20, default 20;
  cursor opaque hingga 1024 karakter.

Reference ialah `{public_id,version,hash}` dengan UUIDv4, integer positif dan
SHA256 lowercase. Output mempertahankan seluruh definition beserta kind/key,
status, timestamps enam mikrodetik, retirement reason nullable dan payload yang
sesuai kind. `examples` boleh absen hanya pada projection yang tidak menyertakannya;
flag `examples_complete` tidak dibuang. Envelope mempertahankan versi katalog
editorial, cursor serta `definitions_complete`/`examples_complete`/`complete`.
Respons dibatasi 64 KiB; payload publish format/topic 16 KiB dan profile 64 KiB.

Write memerlukan UUIDv4 `operation_key`, string desimal
`expected_editorial_catalog_version`, serta `change` tertutup:

- Publish: `action:publish`, kind/key, nullable `expected_previous_version`,
  payload penuh yang cocok dengan kind. Graph/ref lookup berada pada server.
- Retire: `action:retire`, reference tepat dan alasan 1–500 karakter.

Output ringkas mempertahankan replay, versi katalog, reference, kind/key,
status serta retirement timestamp nullable. Versi ini terpisah dari katalog
**fakta**. Baca ulang definisi setelah Write; publikasi/retirement hanya boleh
untuk perubahan eksplisit owner dengan payload yang direview. Permintaan draft
biasa tidak mengizinkan pergantian katalog atau Page.

Panduan/contoh diteruskan sebagai data, termasuk teks yang menyerupai instruksi.
Schema menolak field executable/unknown, tanpa menafsirkan teks tersebut sebagai
izin, source fakta, atau instruksi menjalankan tool lain.

## Config, context dan plan

Create/update Page memakai cabang berkorelasi `config_schema_version:1|2` dan
config yang sesuai. Cabang1 mempertahankan schema lama. Cabang2 memakai
`editorial_schemas.ts`: pinned references, maps key dinamis, override tertutup,
serta effective rules/hash pada output. Konfigurasi hybrid ditolak sebelum RPC.
Lookup key, total bobot, kepemilikan, precedence dan penyempitan izin tetap SQL.

Generation context config2 mempertahankan module versions `[1,2]`, config,
rules/hard limits/preferences, profil beserta kelengkapan examples/references,
dan versi context. Tambahan input MCP `plan_item_public_id` memetakan parameter
SQL terakhir yang opsional. Context item membawa override serta status/review
plan, tanpa lease token. Recent variety menerima goal/jadwal null dan CTA hingga
180 karakter. Timestamp config2 diteruskan sebagai teks enam digit mikrodetik;
tidak dikonversi menjadi JavaScript `Date`.

Create plan config2 menerima override count 1–12 dan density key dinamis. Cabang1
masih memakai validator override legacy. Response item yang dipakai claim,
renewal/failure/retry/replacement/cancel ikut menerima bentuk baru.
`get_content_plan.page_review` dipertahankan utuh. Format null, intent goal
non-eksklusif dan jumlah draft versus fakta mengikuti kontrak task 6; facade
tidak memilih format, mengubah item completed atau membuat replay Write baru.

## Post, lifecycle dan analitik

Save/revise memilih bentuk config2 melalui envelope `editorial_context` lengkap;
backend memastikan envelope cocok dengan Page terkunci. Format/topik/density
memakai key katalog. Goal boleh absen/null, CTA dapat LF dan penempatan
`after_facts` atau `after_fact` 1–12. Tidak ada classifier, primary goal, allowlist
kombinasi, atau batas semantik jumlah ajakan. Label CTA opsional berupa string
1–80 karakter, dibatasi envelope 4 KiB; null, kosong dan label baru tetap sah.

Cabang2 mengikuti ceiling mesin: 12 fakta, hook 120, fakta 160, CTA 180, copy 1100
karakter; word/budget Page dan izin aktual tetap server. Unicode dihitung sebagai
code point pada schema config2, sesuai SQL; validator `.max()` Zod 4.3.6 memakai
unit UTF-16 sehingga tidak dipakai untuk batas teks baru tersebut. Input menghitung
panjang sesudah NFC/LF/trim untuk validasi tanpa mengubah payload; output memakai
batas code point canonical. Payload konten mentah tetap maksimal 16 KiB. Config1
mempertahankan batas/shape sebelumnya. `text_metrics:{}` tetap input, metrik
resmi dihitung server.

Get config2 menerima generation snapshot3 penuh, plan provenance opsional,
12 posisi/sumber, null goal/density dan array metrics hingga 12 beserta estimator
version/line width/target duration. Snapshot2 lama tetap diterima. List
mempertahankan editorial context ringkas. Output gagal validasi ditahan sebagai
hasil tidak terkonfirmasi; tidak mengembalikan payload upstream mentah.

Discard/publication mempertahankan hingga 12 ID tanpa clipping; shared lifecycle
mempertahankan revision/hash, approval dan expected status. Analitik lama sudah
mempunyai dimensi nullable, sehingga tidak memerlukan perluasan filter baru.
Fixture memastikan format dinamis dan null goal/profile terbaca; dimensi DNA,
versi DNA dan label CTA baru tetap di luar scope.

## Wire schema dan diagnostics

Semua object domain tetap tertutup. Map katalog dibatasi regex key dan schema
nilai, bukan object JSON bebas. Representasi wire mengubah pasangan
`propertyNames.pattern` + typed `additionalProperties` menjadi ekuivalen
`patternProperties` + `additionalProperties:false`. Wrapper `anyOf` maupun
`oneOf` ditutup dengan himpunan key cabangnya. Factoring menggunakan local refs;
test expand/roundtrip mempertahankan constraints. Output validator tetap aktif
walaupun metadata outputSchema OAuth selain profile tidak dikirim ke host.

Dua kode stabil request1 ditambahkan:

| Kode | Kategori dan pemulihan |
| --- | --- |
| `EDITORIAL_CATALOG_CONFLICT` | state_conflict; ulang Read dari halaman pertama, review state baru; rekonsiliasi respons Write hilang sebelum mengganti key/payload |
| `EDITORIAL_DEFINITION_UNAVAILABLE` | state_conflict; baca exact refs/alternatif aktif dalam workspace yang sama; jangan mengganti Page/profil atau publish tanpa instruksi owner |

Read mempunyai `write_outcome:not_applicable`; kegagalan domain Write terkonfirmasi
`rolled_back`; timeout/output tak terkonfirmasi tetap `unknown`. Sanitasi,
diagnostic ID, rate-limit recovery, bounded field paths dan redaksi token/SQL
menggunakan mekanisme bersama.

## Inventaris gate dan bukti

**Rekonsiliasi task9:** collection runtime (`vitest list --staticParse=false`)
memuat33file/**238kasus DB**, partisi15+18file dan158+80kasus. Terdapat16
integrasi tambahan dan222kasus existing; collection statis200 di bawah adalah
bukti historis task7 yang melewatkan beberapa tabel dinamis. Matcher/manifest
kini238; tidak ada kasus dihapus. [Temuan task9](../editorial/configurable-profiles/task-9-findings.md)
menjelaskan delta. Ini bukan PASS full238 atau formal G4.

Manifest kandidat CR-062 memuat **18 file/130 kasus MCP**, termasuk 14 test baru
serta dua penambahan kasus pada matriks diagnostics otomatis per tool. Katalog
owner/Inspector ialah 33 valid/33 invalid dengan lima nama v1 ditolak dan owner
denial. Database tetap 33 file, partisi 15+18; collection Vitest mencatat 200 kasus
(125+75). Ini inventaris source, bukan klaim seluruh 200 kasus sudah dieksekusi
pada task 7.

Pin katalog mencatat 94 migration beserta hash source serta schema/source/ACL.
[Review delta](../editorial/configurable-profiles/task-7-catalog-review.json)
menjelaskan perubahan task 2–6; schemas/default ACLs tetap sama. Semua negative
control, audit sebelum/sesudah/akhir, cleanup, advisors terpisah dan aggregate
exact-SHA tetap diwajibkan. Gate legacy tidak dihapus.

Inspector 2.5.0 menerima tool input melalui argv; harness memakai file 0600 dan
preloader lokal untuk memasukkan JSON hanya ke memori proses setelah launch.
OS argv, npx, log dan commit tidak menerima lease token. Config bearer tetap
file privat sementara; seluruh file/fixture dibersihkan pada `finally`.
Light CI memetakan dependency baru beserta deletion/rename ke check yang relevan.

[Bukti task 7](../editorial/configurable-profiles/task-7-results.md) memisahkan
run fokus dari formal G4, deployment, instalasi plugin, preview dan LIVE.
