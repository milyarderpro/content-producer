# Plan dan batch config2 — CR-062 task 6

Kontrak ini melengkapi [Page/resolver](trivia-page-editorial-profiles.md),
[post/snapshot3](trivia-post-editorial-snapshots.md) dan
[CR-062](../decisions/2026-11-12-cr-062-configurable-trivia-editorial-profiles.md).
Implementasi task 6 adalah **SQL/core + panduan workflow + fixture**. Schema
facade MCP diselesaikan task 7, konsumsi panduan oleh plugin task 8. Tidak ada
worker, penjadwal otomatis, Write production, atau publikasi Facebook baru.

## Plan menyimpan jumlah draft dan intent

`create_content_plan` tetap request1 dan menerima `config_schema_version: 1|2`.
Config2 memakai array item tertutup existing dengan posisi 1..n, maksimal 100:

```json
{
  "position":1,
  "scheduled_at":null,
  "topic_key":"nature_science",
  "format_key":null,
  "interaction_goal":"follow",
  "item_config":{
    "fact_count":{"mode":"fixed","value":12},
    "profile_key":"fast_trivia",
    "text_budget":{"hook_max_chars":40}
  }
}
```

Satu item berarti satu draft. Dua item dengan 12 fakta per item tetap dua draft,
bukan 24 item. `plan_intent` menyimpan tema/maksud/jumlah draft yang diminta dan
bukan override jumlah fakta. Bobot format/topic adalah preferensi, bukan kuota
untuk batch kecil. Format dan topik boleh null sampai komposisi; pilihan nonnull
harus ada dalam Page. Key baru memakai jalur katalog/resolver yang sama.

Goal item boleh null atau salah satu anotasi legacy. Jika diisi, goal menjadi
**intent editorial non-eksklusif**, tidak memaksa post mempunyai primary goal.
CTA dapat memenuhi follow bersama like, tag, pertanyaan, save atau ajakan lain.
Post goal/labels tetap boleh absen/null; server tidak mengklasifikasi kalimat CTA
atau membuat attestation baru. Penulis menilai pemenuhan intent melalui kalimat
utuh. Intent yang belum dapat dipenuhi membutuhkan review, bukan anotasi palsu.

`item_config` memakai key terbatas `profile_key`, `fact_count`, `render_style`,
`text_budget`, `caption`, `hashtags`. Resolver Page mengesahkan nilai aktual:
count 1–12, density key terdaftar pada profil, semua budget dalam limit Page,
caption/tag limits lebih sempit. Layout item tidak mengganti layout Page atau
DNA. Unknown key, null value, penggantian profil, count 13 dan perluasan limit
Page ditolak. Preferensi density tidak menjadi minimum padding.

Plan config2 menyimpan `plan_config.schema_version: 3`, dengan creation
`context_snapshot.schema_version: 2` yang memuat Page, config2, exact bindings,
rules dan hash saat pembuatan. Snapshot ini immutable. Config1 tetap memakai
schema plan/config dan JSON existing, tanpa auto-adoption atau rewrite data.

## Membaca context item

`get_page_generation_context` mempunyai satu signature SQL dengan tambahan
parameter terakhir `p_plan_item_public_id uuid default null`. Panggilan lama
sembilan argumen tetap bekerja. Pada Page config2, berikan ID item saat menyusun
post dari plan; gunakan format final sebagai `p_intent_format_key`. Item/plan
harus berada dalam workspace dan Page yang sama. Cancelled ditolak; konteks
completed dapat dibaca untuk review revisi eksplisit, bukan claim baru.

Hasil menyertakan aturan efektif hasil resolver **Page terkini + item override**,
`editorial_context.effective_rules_hash` yang sesuai, dan `plan_context` Read:
plan/item public ID, `item_config`, `intent_goal`, status, `plan_intent`,
`requires_review`, dan `completed_historical`. Tidak ada claim/lease token dalam
Read ini atau `get_content_plan`.

`get_content_plan` pada Page config2 menambahkan `page_review` dengan timestamp
config awal/current, `requires_review`, serta `completed_historical_count`.
Field item existing dipertahankan. `requires_review` membandingkan timestamp
creation yang immutable, sehingga tetap true setelah perubahan Page; ia bukan
flag clearance yang dihapus diam-diam sesudah save.

## Claim, save dan perubahan Page

1. Baca plan/progres sebelum melanjutkan. Claim satu item dengan operation key
   baru; maksimum API tetap tiga, lease awal 30 menit, renewal sekali sampai 60
   menit dari awal. Simpan token hanya untuk operasi yang memerlukannya.
2. Claim config2 memvalidasi intent/override item terpilih terhadap Page saat ini.
   Completed tidak diklaim atau dimutasi. Invalid pending item membuat claim
   rollback; tidak dilewati diam-diam demi menyelesaikan batch.
3. Baca context item terbaru, definisi/contoh relevan, lalu riset dan review.
   Ambil context terbaru lagi tepat sebelum fact-bearing Write. Pertahankan
   enam digit mikrodetik config timestamp sebagai teks.
4. Save memakai `plan_item_public_id` + claim token existing, config CAS terkini,
   katalog fakta, serta editorial envelope/rules hash dari context **item**.
   Context Page langsung tidak dapat melewati override item. Format/topic item
   nonnull serta jadwal harus sesuai; goal bukan allowlist CTA config2.
5. Server mengunci serta memeriksa claim, menyimpan seluruh fakta/post/snapshot
   dan menyelesaikan item/ledger/event secara atomik. Snapshot generation3 post
   menambahkan `plan_context` server berisi plan/item public ID, immutable
   `item_config` yang dipakai, dan `intent_goal`. Token tidak disimpan di sana.
6. Wajib `get_post` dan baca progres plan setelah sukses sebelum item berikutnya.
   Completed berarti draft tersimpan, bukan ready/posted atau bukti LIVE.

Setelah Page berubah, plan creation snapshot dan completed item/post tetap
historis. Pending/in-progress yang masih kompatibel dapat dilanjutkan setelah
context terkini dibaca dan copy direview; fresh config CAS serta rules hash
membuktikan input memakai aturan baru. Tidak mengganti profil snapshot lama
atau memperbarui plan context otomatis. Context lama gagal save tanpa hasil
parsial, meskipun claim masih aktif.

Bila intent/override tidak lagi sah (misalnya item fixed 12 sedangkan Page max 10),
context/claim/save menolak. Laporkan objek, aturan yang berubah, dan keputusan
owner yang diperlukan. Jangan menghapus atau mengubah item completed, menaikkan
limit Page, mengganti tema/profil atau membuat plan pengganti tanpa scope baru.
Report failure/cancel tetap mengikuti izin serta kontrol existing. Revisi post
berasal dari plan mempertahankan override yang tersimpan pada generation
snapshot; review context item yang sama. Intent yang tak dapat dipenuhi pada
Page terkini membutuhkan keputusan eksplisit, bukan pelepasan override otomatis.

## Dedup beberapa Read

Kapasitas `trivia_find_similar_facts_v2` tetap **9 calon per Read**, maksimal 20
match per calon. Tidak ada receipt baru, embeddings, ataupun bypass reviewer.
Bagi calon final 10–12 menjadi batch misalnya 9+1/2/3; cadangan riset dapat memakai
batch tambahan. Gunakan key unik untuk seluruh set calon, bukan mengulang key
lokal 1..9 pada setiap batch.

Algoritme workflow yang harus dipakai:

1. Susun seluruh calon dari riset bersumber, dengan key unik. Simpan pemetaan key
   ke klaim; jangan menggabungkan berdasarkan indeks lokal batch.
2. Baca setiap batch ≤9 dan catat **string** `catalog_version`. Setiap calon harus
   `complete=true` serta seluruh match direview; keputusan same/distinct memakai
   identity asli dan tidak boleh dipaksakan demi menghindari reuse.
3. Bila satu hasil incomplete, berhenti sebelum Write. Persempit/ganti calon
   atau laporkan kendala, lalu ulang Read relevan. Jangan mengarang review kosong
   dan mengganti complete menjadi true. Server tetap menguji seluruh match.
4. Bila versi berbeda di antara Read, buang keputusan dari rangkaian lama dan
   ulang **semua batch** terhadap katalog yang konsisten. Jangan mengambil nomor
   versi terakhir sambil memakai keputusan batch awal yang sudah stale.
5. Setelah set final konsisten, compose dan review, baca context terbaru, lalu
   save memakai satu `expected_catalog_version` yang konsisten. Perubahan lagi
   sebelum save menghasilkan conflict atomik; ulang Read/review, bukan mengganti
   nomor versi tanpa pemeriksaan.

Urutan batch bukan transaksi panjang atau lock riset. Backend memeriksa ulang
katalog terkunci dan semua final matches sebelum identity insert. Contoh/exemplar
editorial hanya bukti pola, bukan sumber fakta atau izin menyalin klaim.

## Respons hilang, expiry dan resume

Respons save hilang: replay operation key dan semantic payload sama, termasuk
claim token asli, config timestamp serta decisions yang sama. Replay sukses
mendahului pemeriksaan state mutable; tetap memerlukan owner yang berhak. Baca
post/progres yang sama setelah replay. Jangan membuat draft/key baru untuk
mengganti hasil yang belum direkonsiliasi.

Claim expired: baca state, klaim ulang menurut prosedur existing, lalu gunakan
lease baru dan context/dedup terkini untuk operasi baru. Token lama ditolak;
replay claim historis bukan izin menghidupkan lease lama. Failure/retry tetap
mencatat attempt/event; cancel menjaga completed dan membatalkan sisa pekerjaan.
Tidak mencetak token di chat, log, dokumen, assertion failure, atau commit.

## Bukti dan paket berikutnya

[Bukti task 6](../editorial/configurable-profiles/task-6-results.md) mencatat suite,
ACL/history/cleanup dan batas bukti. Task 7 menyelaraskan facade/schema/diagnostics
serta pin G4 dengan signature/output baru. Task 8 memakai panduan batch ini pada
plugin yang sama. Formal G4 exact final SHA, deployment dan LIVE tetap task rilis
dengan otorisasi masing-masing; hasil fixture bukan penggantinya.
