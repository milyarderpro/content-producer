# Transaksi post config2 dan snapshot3 — CR-062 task 5

Implementasi mengikuti [CR-062](../decisions/2026-11-12-cr-062-configurable-trivia-editorial-profiles.md),
[kontrak frozen](../editorial/configurable-profiles/contract.md),
[resolver Page](trivia-page-editorial-profiles.md), dan
[renderer config2](trivia-render-config2.md). Bukti task ini **LOCAL/FIXTURE**;
facade/schema MCP diselesaikan pada task 7. Dukungan plan/batch dijelaskan di
[kontrak task 6](trivia-config2-plan-batch.md).
Tidak ada migrasi Page atau post owner secara otomatis.

## Input save/revise

`api.save_post_v2` dan `api.revise_post_v2` tetap request/content versi2.
Masing-masing mempunyai satu signature SQL, dengan parameter tambahan terakhir
`p_editorial_context jsonb default null`; signature lama diganti, tanpa overload
publik yang ambigu. Panggilan positional lama tetap dapat memakai jumlah argumen
sebelumnya karena tambahan parameter mempunyai default. Goal dan parameter
berikutnya mempunyai default null agar named RPC dapat menghilangkan goal;
parameter wajib lain tetap diperiksa dan null tidak membuka validasi.

Config1 tetap memerlukan goal legacy serta aturan lama. `editorial_context`
absen/null hanya kompatibel pada config1; envelope nonnull ditolak. Payload
ledger config1 mempertahankan bentuk/normalisasi lama, tanpa field null baru.
Tidak mengubah `post_render_v1`, `post_render_v2`, atau `post_hash_v2`.

Config2 memerlukan envelope berikut:

```json
{
  "editorial_profile_ref": {"public_id":"<UUIDv4>","version":1,"hash":"<SHA256>"},
  "format_ref": {"public_id":"<UUIDv4>","version":1,"hash":"<SHA256>"},
  "topic_ref": {"public_id":"<UUIDv4>","version":1,"hash":"<SHA256>"},
  "architecture": "themed",
  "profile_key": null,
  "effective_rules_hash": "<SHA256>",
  "cta_actions": ["react","tag","follow","send_to_a_friend"]
}
```

Enam field pertama wajib; hanya `cta_actions` opsional. Envelope maksimal 8 KiB,
referensi mengikuti schema katalog tepat, dan field tambahan ditolak. Architecture
harus salah satu `single_subject`/`themed`/`mixed` yang didukung versi format
terpilih. Ini pemeriksaan metadata struktural, bukan classifier makna fakta.
`profile_key` adalah label density nullable; bila diisi harus terdapat pada
`preferences.density_preferences` profil. Ia tidak mengganti DNA atau menjadi
hard count/budget. Pada alur post langsung, label density tidak mengubah hash
aturan context. Pada alur plan, resolver menerapkan override item dan context
khusus item sebagaimana [kontrak plan/batch](trivia-config2-plan-batch.md).

Ambil context terbaru dengan **format final** sebelum Write; gunakan
`generation_rules.format_reference`, profil dan `effective_rules_hash` yang
terkait, serta topic reference tepat yang dipilih dari katalog. Context tanpa
format final mempunyai hash aturan berbeda dan bukan pengganti context Write.
Jangan menggunakan `latest` atau expected editorial catalog version sebagai
pengganti binding. `expected_catalog_version` tetap versi katalog **fakta**.
Config CAS wajib timestamp teks enam digit mikrodetik; tidak melalui JavaScript
`Date`. Expected revision/hash tetap wajib pada revise.

Server memeriksa profile/format/topic dalam workspace, allowed references Page,
key aktual, hash/versi, waktu binding sebelum retirement, architecture dan density.
Referensi foreign/unallowed tidak diterima hanya karena UUID/key valid. Metadata
aksi mengikuti kontrak renderer: optional/null/empty/incomplete/new label sah,
tanpa primary goal, hierarki, classifier atau allowlist kombinasi. Goal config2
absen/null disimpan null; empat nilai legacy hanya anotasi opsional.

## Urutan transaksi dan replay

1. Validasi request/attestations dan normalisasi deterministik. Config2 memakai
   engine ceilings untuk normalisasi sebelum claim; tahap ini belum memberi
   izin Page. Config1 memakai renderer legacy tepat seperti sebelumnya.
2. Claim operation owner dan semantic request hash. Payload config2 menyertakan
   envelope editorial yang diberikan; config1 tetap byte kompatibel.
3. Replay sukses dikembalikan melalui history/ledger sebelum membaca state mutable,
   dengan auth/owner tetap wajib. Jangan membaca Page terbaru lalu mengubah
   payload retry agar lolos. Operation key dan semantic payload harus sama.
4. Untuk first use, lock workspace → Page/config dan target post menurut urutan
   existing. Periksa config ID/timestamp dan katalog fakta yang terkunci.
5. Resolve ulang aturan efektif server; cocokkan envelope dan render dengan
   budget/emoji/count Page. Ketiga attestations tetap `pass`; tidak menambah
   attestation DNA atau mengubah maknanya.
6. Validasi seluruh final fact dan semua match dedup sebelum identity insert.
   Save/revise menerima 1–12 final facts config2, sedangkan Read dedup tetap
   maksimal 9 calon per panggilan. Read beberapa batch harus complete dan memakai
   versi katalog konsisten; Write tidak memercayai receipt atau melewati review.
7. Tulis post, source usage, snapshot, hash dan evidence; selesaikan ledger/history
   secara atomik. Revisi membuat successor bindings, melepaskan binding lama,
   menaikkan revision dan mengembalikan ready ke draft dengan approval null.

Budget/count, URL, reference, incomplete review, stale CAS/catalog, reuse, status,
atau approval yang gagal menyebabkan rollback tanpa post/fact/binding/ledger
parsial. Task 5 memakai ulang operation ledger, slot locks dan claim/completion;
validasi intent/override plan config2 mengikuti kontrak task 6. Snapshot post dari
plan menyertakan `plan_context` server dengan ID plan/item, `item_config`, serta
`intent_goal`; lease token tidak masuk snapshot.

## Snapshot schema3 dan hash

Content payload tetap schema2, fact source usage snapshot tetap schema2. Snapshot
**generation** schema3 dipakai hanya untuk config2 dan memuat:

- Config public ID serta timestamp presisi, locale/markets/layout/count/budget,
  reuse scope dan density key nullable.
- `editorial_context`: pinned references, architecture, density, rules hash dan
  metadata CTA yang dinormalisasi (absen menjadi null, `[]` tetap berbeda).
- `effective_rules` yang benar-benar dipakai beserta hash servernya, termasuk
  preferensi profil, hard limits dan guidance format terpilih.
- `editorial_definitions`: identitas/key/schema/references profil dan format;
  topic reference serta payload scope tanpa examples. Full immutable definitions
  dan examples tetap dapat dibaca lewat exact references, tanpa mengikuti versi
  katalog terbaru atau menyalin seluruh katalog ke setiap post.
- CTA text, normalized placement dan metadata actions; estimator version 1,
  line width 34 serta target video 13 detik. Wrap/time/replay tetap advisori.

Snapshot dibatasi 128 KiB; ia tidak memuat ledger/credential atau internal IDs.
Metadata definition key wajib string nonnull, topic scope wajib tersedia, dan
architecture/selected keys harus cocok dengan format serta choices pada rules.
Validator row memeriksa bentuk snapshot, kesamaan render/metrics dengan aturan
tersimpan, key/reference, count serta salinan CTA. Null goal pada tabel hanya
sah untuk content2 + snapshot3/config2; config1 tetap tidak dapat null.

`posts.content_hash` tetap memakai algoritme v2 existing yang mencakup snapshot
penuh, payload dan current fact bindings. Karena snapshot3 menyertakan metadata,
perubahan profil/aturan/CTA metadata ikut mengubah hash tanpa mengubah algoritme
atau histori config1. `render_hash` task4 tidak menggantikan content hash post.
Revisi mengikat snapshot baru; publikasi versi katalog saja tidak merevisi post.

Constraint binding source2 kini mendukung posisi 1–12, teks hingga 160 karakter/
30 kata. Source snapshot1 tetap batas 90 karakter/18 token dan 1–9 posisi. Untuk
post config1 dengan source snapshot2, renderer/gate config1 tetap menegakkan
batas bisnis lama. Tidak mengubah isi usage historis atau membuka direct grants.

## Readback, lifecycle dan analitik

`get_post` config2 menambahkan `generation_snapshot` lengkap pada `data.post`;
content, seluruh fact bindings/URL dan metrics dikembalikan utuh. `list_posts`
config2 menambahkan `editorial_context` ringkas. Config1 mempertahankan bentuk
output sebelumnya. Response tetap request/read envelope1 dengan content2.

Approval dan publication menjalankan resolver/Page saat ini serta mencocokkan
hasil snapshot/aturan/config dengan versi post. Publikasi versi definisi baru,
penambahan key yang tidak dipakai, atau retirement versi yang sudah diikat Page
saja tidak mengubah snapshot atau membatalkan approval. Adopsi profil/Page rules
berbeda memerlukan context, review dan revise eksplisit pada post yang sama.
Gate tidak mengganti snapshot atau approval diam-diam. Revoke/discard tetap dapat
dilakukan untuk post yang perlu review; posted/archived tetap dibaca dan diarsipkan
dengan provenance asli. Release/publication response dan replay mendukung 12 IDs.

Reschedule tidak mengganti content hash; revoke/revise membatalkan approval
menurut kontrak masing-masing. Seluruh lifecycle tetap memakai explicit owner
intent, expected revision/hash yang relevan, status, URL serta reuse guards.
Tidak melakukan publikasi Facebook atau fetch ulang sumber pada approval.

Insights lama menerima config2, key format/topic dinamis dan null goal. Dimensi
`profile` tetap density key; null goal/density pada config2 tetap eligible sebagai
kelompok JSON null, tanpa memilih goal
atau DNA palsu. Arti heuristic `cta_pattern` lama tidak diubah menjadi label CTA
baru. Tidak menambah dimensi/filter `editorial_profile`/`editorial_profile_version`
atau `cta_actions`. Provenance tersebut diperiksa melalui readback post.

[Bukti task 5](../editorial/configurable-profiles/task-5-results.md) memisahkan
hasil fixture lokal dari G4/Actions, host MCP, visual QA dan LIVE.
