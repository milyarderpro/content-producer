# Kontrak render config2 — CR-062 task 4

Primitive ini melaksanakan D6/D7 dari
[CR-062](../decisions/2026-11-12-cr-062-configurable-trivia-editorial-profiles.md)
dan [kontrak frozen](../editorial/configurable-profiles/contract.md).
Status implementasi **LOCAL/FIXTURE**. Task 4 menyediakan renderer core privat;
penyambungan save/revise/snapshot/readback/lifecycle adalah task 5, facade MCP
task 7. Ini belum merupakan dukungan produksi config2 atau penerimaan visual.

## Pemanggilan dan hasil

```sql
internal.post_render_config2_v2(
  p_payload jsonb,
  p_rules jsonb,
  p_interaction_goal text default null,
  p_cta_actions jsonb default null
) returns jsonb
```

`p_rules` berasal dari `internal.editorial_resolve_v2`, bukan override bebas
caller. Renderer memeriksa ulang config2, sembilan budget terhadap ceiling,
count efektif, render style, caption, hashtags dan emoji policy. Hanya API owner
internal yang dapat memanggil helper; tidak ada RPC, akses tabel atau business
Write baru pada task 4. Helper bersifat `IMMUTABLE`, `SECURITY INVOKER`, dan
`search_path=''`. Seluruh business integration tetap dilakukan melalui RPC
berotorisasi pada task berikutnya.

Hasil mempunyai `content_payload` yang dinormalisasi, `interaction_goal`,
`cta_actions`, `readability: "advisory"`, `render_hash_version: 1`, dan
`render_hash`. Input content tetap schema2 dengan field wajib existing:
`schema_version`, `hook`, `body`, `cta`, `canva_copy`, `caption`, `hashtags`,
`render_style`, dan `text_metrics`; tambahan opsional hanya `cta_placement`.
Ukuran payload dibatasi 16 KiB. `body` berisi `facts` dan opsional `subject`;
subject tetap teks satu baris 1–120 karakter, bukan komponen tambahan copy.
Setiap fakta hanya `position` dan `text`, berurutan tepat 1..n. Hook/fakta satu
baris, CTA dan caption dapat memuat LF. CTA dan hook tetap wajib nonkosong.
Caption boleh kosong dengan maksimum 500 karakter atau limit Page yang lebih
sempit. Hashtags mengikuti min/max Page, maksimal 5, format/tag terlarang dan
keunikan case-insensitive existing tetap diperiksa.

## Batas keras dan preferensi

| Komponen | Ceiling karakter | Ceiling kata |
| --- | ---: | ---: |
| Hook | 120 | 18 |
| Setiap fakta | 160 | 30 |
| Blok fakta termasuk nomor/separator | 900 | — |
| CTA termasuk LF internal | 180 | 32 |
| Full Canva copy termasuk seluruh separator | 1.100 | 160 |

Jumlah fakta 1–12 tetap dibatasi lagi oleh count fixed/adaptive efektif Page.
Preferensi count/density, casing, voice dan pola CTA membantu penulisan; renderer
tidak mengubah teks otomatis atau memaksakan preferensi sebagai gate. Default
hard budget preset dari resolver adalah 60/150/750/140/900 karakter dengan
ceiling kata di atas. Semua sembilan budget efektif diperiksa, tanpa pemotongan
teks atau pembuangan qualifier. Budget/count/caption/tag count yang terlampaui
menghasilkan `CONTENT_BUDGET_EXCEEDED`; aturan efektif invalid menghasilkan
`CONFIG_INVALID`.

## CTA, placement dan metadata

`cta_placement` adalah union tertutup berikut:

```json
{"kind":"after_facts"}
```

```json
{"kind":"after_fact","position":6}
```

Field yang absen dinormalisasi menjadi `after_facts`. `after_fact` membutuhkan
integer 1..n, termasuk n. Null, field tambahan, varian lain dan posisi di luar
rentang ditolak. Bentuk eksplisit yang diberikan disimpan, sehingga
`after_fact(n)` dan `after_facts` menghasilkan copy yang sama tetapi metadata
berbeda. `position` pada fakta tidak berubah.

Copy dirakit dari hook, fakta berurutan, dan CTA pada titik yang ditentukan,
dengan dua LF di antara komponen. LF serta baris kosong **internal** CTA tetap
utuh setelah normalisasi. Blok fakta dihitung terpisah, hanya dari fakta dan
separator antarfakta; penyisipan CTA tidak mengubah metrics blok. `canva_copy`
input harus sama persis setelah normalisasi dengan hasil rakitan; perbedaan
menghasilkan `CONTENT_RENDER_MISMATCH`.

`interaction_goal` boleh absen/SQL null dan hasilnya JSON null. Empat nilai
legacy `share`/`save`/`comment`/`follow`, bila diberikan, hanya anotasi. Nilai itu
tidak menilai atau membatasi isi CTA. Tidak ada primary/secondary, classifier,
allowlist kombinasi, atau batas semantik jumlah ajakan. Teks pertanyaan + like,
like + follow, like + tag, wording ambigu dan tiga atau lebih ajakan sah selama
budget/emoji policy terpenuhi.

`cta_actions` boleh absen/SQL null/JSON null, `[]`, tidak lengkap, atau berisi
label baru. Bentuknya array string; setiap label dinormalisasi NFC/trim,
nonkosong 1–80 karakter satu baris dengan kontrol/artifact teks yang sama. Array
input maksimal 4 KiB sebagai batas transport, tanpa cap jumlah aksi semantik
atau enum label. Urutan/duplikasi yang diberikan dipertahankan sebagai data,
tanpa menyatakan peringkat. Tidak ada pencocokan otomatis label dengan kata
“like”, emoji atau goal. Metadata invalid menghasilkan `VALIDATION_FAILED`;
kontrol/artifact terlarang mengikuti `CONTENT_PAYLOAD_INVALID` helper teks.

## Normalisasi, metrics dan hash

NFC, CRLF→LF, trimming luar dan penghilangan spasi ASCII di ujung baris memakai
normalizer config2 privat; primitive v1 tetap utuh. LF internal tidak diganti spasi. Kontrol lain,
URL/markup/code fence/UUID, citation artifact, markdown dan kontrol bidi tetap
ditolak. ZWJ U+200D diperbolehkan untuk rangkaian emoji; zero-width space,
ZWNJ, directional marks dan BOM tetap ditolak. Unicode dihitung melalui
`char_length` PostgreSQL: **code point setelah NFC**, bukan byte, UTF-16 unit,
atau grapheme. Emoji gabungan, skin modifier, ZWJ, flag dan VS16 tetap disimpan
serta dihitung masing-masing code point. Penomoran `10. ` sampai `12. ` ikut
budget blok/full copy dan full word count, bukan chars/kata teks fakta saja.

Input normal `text_metrics: {}` meminta server menghitung semua metrics. Jika
memberikan assertion nonkosong, seluruh objek harus tepat sama dengan metrics
server; gunakan `{}` ketika menyusun/revisi payload, karena pembulatan numeric
oleh konsumen JSON dapat mengubah assertion. Tidak ada angka caller yang dipakai
sebagai bukti budget.

Metrics memuat chars/kata komponen dan full copy, fact arrays, line counts,
`estimated_read_seconds`, `replay_ratio`, `estimated_loops`, serta
`estimator_version: 1`, `line_width_chars: 34`, `target_video_seconds: 13`.
Wrap dihitung per baris LF, termasuk baris kosong. Estimator waktu tetap
`round(words*0.3 + 0.35*(facts+2), 1)`, ratio=waktu/13, loops=ceil(ratio).
Wrap/time/replay seluruhnya **advisori**. Tidak ada gate 3 baris/fakta, 28 total
baris, ratio 2,5 atau 3 loops config1 pada jalur baru. Lolos renderer bukan
persetujuan editorial/visual; review template ponsel tetap diperlukan.

`render_hash` adalah SHA-256 UTF-8 atas prefix
`content-producer:render:config2:v1|` dan serialisasi JSONB PostgreSQL untuk
objek `{content_payload, interaction_goal, cta_actions}` yang sudah dinormalisasi.
Ia membuktikan determinisme primitive, **bukan `posts.content_hash`**. Hash post
beserta fact bindings, config identity dan snapshot3 ditangani task 5. Goal/label
absen dan null dinormalisasi sama; `[]` berbeda dari null. Metadata atau placement
berbeda ikut fingerprint, tanpa memalsukan klasifikasi yang absen.

## Kebijakan emoji yang terpin

`optional` mempertahankan emoji tanpa transformasi. `forbidden` memeriksa semua
teks produk: copy/hook/fakta/CTA, caption, subject dan tags. Metadata label
bukan teks produk. Detector privat menggunakan property `Emoji` dari
[Unicode 17.0](https://www.unicode.org/Public/17.0.0/ucd/emoji/emoji-data.txt),
SHA-256 `2cb2bb9455cda83e8481541ecf5b6dfda66a3bb89efa3fa7c5297eccf607b72b`,
dengan base ASCII `#`, `*`, `0..9` dikecualikan dan mark keycap U+20E3/VS16
U+FE0F disertakan. Pictograph yang mempunyai presentasi teks, misalnya `❤`,
tetap termasuk policy ini. Digit, hashtag dan asterisk biasa tidak dianggap
emoji. Rentang SQL menggunakan collation `C` agar pemeriksaan deterministik.
Tambahan Unicode di masa depan memerlukan migration/versioning eksplisit,
bukan fetch runtime. Copyright dan izin ada pada [lisensi Unicode](unicode-license.txt).

## Kompatibilitas dan verifikasi

Migration task 4 tidak mengganti `post_render_v1`, `post_render_v2`, atau
`post_hash_v2`. Jalur config1 tetap menggunakan batas dan perilaku legacy.
Suite core existing menambahkan golden copy/metrics/hash, exact±1 seluruh
ceiling, count 1/10/11/12/13, narrow budgets, CTA multiline/interleaved/gabungan,
goal/labels null serta baru, Unicode, emoji denial, resolved rules ketiga preset,
dan ACL. Test save config1 serta Page/kernel ikut dijalankan untuk regresi.
Golden config1 dan hash definisi tiga fungsi diambil **sebelum migration**;
expected copy/metrics config2 dihitung dari fixture sintetis, bukan riset fakta.
Bukti dan batas eksekusi ada di [hasil task 4](../editorial/configurable-profiles/task-4-results.md).
