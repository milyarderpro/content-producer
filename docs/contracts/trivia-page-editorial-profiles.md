# Profil editorial Page — kontrak database task 3

Dasar: [CR-062](../decisions/2026-11-12-cr-062-configurable-trivia-editorial-profiles.md),
[design D4–D5](../../openspec/changes/add-configurable-trivia-editorial-profiles/design.md)
dan [katalog task 2](trivia-editorial-catalog.md). Ini kontrak RPC/database;
facade MCP union config1/2 dan plugin konsumen menjadi task7/8. Renderer,
post snapshot/lifecycle dan plan config2 menjadi task4–6. Jangan menerapkan
config2 pada Page production dari bukti fixture ini.

## Memilih profil dan bootstrap

Page memilih satu reference profil tepat `public_id/version/hash` dari katalog
workspace-nya. `curious_mind`, `dyk`, dan `daily_facts` adalah tiga definisi
terpisah. Campuran custom diterbitkan sebagai satu definisi `kind:profile`
melalui publish katalog, lengkap dengan panduan gabungan dan provenance.
Tidak ada inheritance engine atau perubahan Page lain ketika profil dipilih.

`internal.editorial_seed_profiles_v2(workspace_id)` menyediakan bootstrap
provisioning internal dalam transaksi owner yang diotorisasi. Helper terlebih
dahulu memakai seed format/topik task2, lalu membuat tiga profil versi1 dengan
references format/topik versi1 yang tepat. Tidak ada lookup latest ketika Page
menulis atau membaca context. Key profil yang sudah ada dalam versi/status apa
pun dilewati; tidak menimpa versi custom owner atau membuat versi seed tambahan.
Jika dependency seed versi1 sudah tidak tersedia/retired, bootstrap gagal
atomik dan membutuhkan keputusan katalog eksplisit; tidak merevivenya diam-diam.

Bootstrap bukan RPC bisnis baru, tidak dijalankan oleh Read, dan tidak mengadopsi
profil pada Page. Caller biasa tidak memperoleh EXECUTE helper. Provisioning
katalog awal memerlukan scope tersendiri; permintaan draft atau sekadar Read
bukan izin seed/publish. Pada fixture test, owner dan katalog dipersiapkan oleh
harness internal, kemudian seluruh pemilihan Page melalui API owner yang sama.
Setelah provisioning yang diotorisasi, owner membaca katalog dan memakai exact
reference yang dikembalikan, bukan mengarang UUID/hash dari nama preset.

| Preset | Preferensi count / preferred | Kata/fakta; total | Hook; emoji | Panduan CTA |
| --- | --- | --- | --- | --- |
| curious_mind | 6–10 /8 | 8–11;70–95 | Variasi casing; default forbidden | Follow umum, teaser/follow, comment/save/double-tap sesuai isi |
| dyk | 5–11 /8 | 8–12;75–100 | Uppercase; optional | Pertanyaan dan ajakan tunggal/gabungan, multiline/antara fakta sesuai struktur |
| daily_facts | 5–7 /6 | 12–16;85–115 | Sentence case; default forbidden | Pola like+follow tanpa hierarki; variasi natural diperbolehkan |

Bobot tujuh format/sebelas topik memakai hasil per akun pada
[audit task1](../editorial/configurable-profiles/audit.md), bukan bobot gabungan.
Setiap profil mempunyai tiga template original berplaceholder serta locator
pola; template belum merupakan naskah faktual siap publikasi. Duplikasi, OCR,
engagement null dan bias corpus dicatat dalam provenance/notes. Tidak ada
janji views, kuota surprise atau kebutuhan menyalin referensi.

## Input config2

Bentuk minimum config yang dikirim ke `create_page` atau patch config2:

```json
{
  "config_schema_version": 2,
  "editorial_profile_ref": {
    "public_id": "<ID profil dari katalog>",
    "version": 1,
    "hash": "<hash profil dari katalog>"
  }
}
```

Bentuk ini notasi dokumentasi, bukan payload siap dijalankan. Field opsional:

| Field | Arti dan validasi |
| --- | --- |
| `allowed_format_refs`, `allowed_topic_refs` | Masing-masing 1–128 exact references; default references profil. Key tidak boleh berulang meskipun versinya berbeda. References tambahan yang terdaftar boleh dipilih eksplisit oleh Page |
| `format_weights`, `topic_weights` | Maps tepat atas key allowed references, integer0–100, total100 masing-masing. Default mengambil bobot profil untuk choices tersebut; jika total tidak100, owner harus memberikan distribusi eksplisit. Tidak ada renormalisasi diam-diam |
| `fact_reuse_scope` | `workspace_unique` default atau `page_unique` |
| `overrides` | Object tertutup untuk count, budget/layout, preference density dan style Page; bukan merge JSON bebas |

Pilihan di profil tidak otomatis mengaktifkan pilihan di luar allowed references
Page. Bobot nol tetap mengizinkan pilihan eksplisit. Key format/topik/density
baru tidak memerlukan switch kode selama definisinya sudah terdaftar dan sah.
Unknown field, foreign reference, kind/hash salah, duplicate reference,
invalid weight atau definition retired untuk binding baru ditolak atomik.

Envelope umum create/update tetap request version1. `create_page` menerima
`p_config_schema_version=2` dan config di atas; seluruh validasi nama/slug/
timezone/market/owner lama tetap berlaku. `update_page` tetap menggunakan Page
CAS dan patch niche tertutup yang sama:

```json
{
  "niche_key": "trivia",
  "expected_config_updated_at": "<timestamp server dengan enam mikrodetik>",
  "config_schema_version": 2,
  "config": "<object config2 lengkap>",
  "is_enabled": true,
  "is_default": true
}
```

Timestamp config2 harus teks RFC3339 dengan tepat enam digit pecahan. Nilai
dibandingkan sebagai timestamptz authoritative; `.123000` yang berbeda dari
`.123456` tetap conflict, bukan diperbaiki menjadi versi terbaru. Jangan memakai
JavaScript Date atau membulatkan timestamp. Operation key/payload semantik yang
sama mereplay respons original sebelum validasi state mutable seperti retirement;
key yang dipakai untuk intent berbeda ditolak. Scope owner tetap diperiksa dahulu.

## Resolver dan precedence

`internal.editorial_resolve_v2(workspace,input,old_bindings,format_key,item_override)`
adalah satu resolver untuk write Page dan generation context, serta primitive
untuk integrasi plan/save berikutnya. Ia mengembalikan config canonical, binding,
rules dan hash server deterministik. Binding time tidak masuk rules hash;
references/config/rules efektif masuk hash. Katalog yang bertambah pada key lain
atau versi lain tidak mengubah hasil, timestamp atau hash Page terikat.

Urutan: ceiling mesin → default format terpilih → preferensi/default profil →
override Page eksplisit → override item/instruksi yang diizinkan. Density format
menjadi fallback; nilai profil pada key sama menang, kemudian override density
Page. Tidak ada override yang dapat membuka key asing atau melampaui ceiling.
Format spesifik dipilih melalui `p_intent_format_key` saat membaca context;
resolver menghasilkan format reference/panduan dan hash untuk pilihan itu.

`overrides` Page mengizinkan:

- `fact_count`: `{mode:fixed,value}` atau `{mode:adaptive,min,preferred,max}`,
  seluruh angka1–12 dan berurutan;
- `text_budget`: subset sembilan field ceiling D6;
- `render_style`: plain_lines/numbered;
- `style`: subset hook_templates/hook_casing/voice/units_preference/cta_guidance/
  emoji_policy yang mengikuti schema profil task2; tidak menerima bahasa baru;
- `density_preferences`: perubahan pada key yang sudah terdaftar di profil;
- `caption:{max_chars}`1–500 dan hashtags min/default/max0–5 berurutan.

Default Page tanpa override count mempunyai hard range1–12, preferred dari
profil. Range count/kata corpus tetap preferensi: misalnya Daily Facts dapat
menulis10 fakta bila hard count Page mengizinkannya, tanpa diubah menjadi6 oleh
preferensi profil. Default hard budget seed: hook60, fakta150, blok750, CTA140,
copy900 karakter; ceiling kata18/30/32/160. Ceiling karakter mesin
120/160/900/180/1100 tetap maksimum. Locale/English variant tetap en-US.
Emoji policy adalah batas eksplisit walaupun panduan nada/ritme bersifat preferensi.

Item override hanya mengizinkan profile_key/fact_count/render_style/text_budget/
caption/hashtags. `profile_key` memilih density terdaftar pada profil, bukan
mengganti DNA. Count harus di dalam rentang keras Page, budget tidak boleh lebih
besar, caption/hashtags tidak memperluas Page, dan render_style harus cocok.
DNA/style/reference baru melalui item ditolak. Integrasi item plan publik adalah
task6; primitive resolver sudah diuji pada task3.

## Penyimpanan dan retirement

Config canonical menyimpan mirror versi2, exact profile/format/topic references,
bobot dan override. Tiga kolom server pada `page_niche_configs` menyimpan
`editorial_bindings`, `editorial_rules`, `editorial_rules_hash`. Trigger membuat
atau mempertahankan kolom itu; caller tidak dapat menyelundupkannya dalam config.
Config1 tetap memakai JSON/batas lama, binding kosong dan rules/hash null.
Penambahan kolom tidak mengubah JSON atau timestamp config1 lama.

Binding mencatat kind/reference/bound_at server untuk setiap reference. Referensi
yang tetap sama mempertahankan binding time pada Page-only atau override update.
Retirement kemudian tidak mematikan binding sah itu. Page baru tidak dapat
memilih versi retired; menghapus lalu menambahkan kembali reference retired juga
bukan binding lama. Tidak ada auto-follow latest atau rewrite post history.

Seluruh Page Write mengunci workspace sebelum Page/config, sesuai katalog/save.
Dua update dengan CAS yang sama hanya satu commit; stale operation rollback
termasuk ledger. Adopsi config2 eksplisit dapat meninggalkan draft lama yang
memerlukan review/revisi pada integrasi lifecycle task5; operasi tidak mengubah
copy/snapshot/hash/approval historis secara diam-diam. Blok perubahan config1
ketika ada post aktif tetap mengikuti kontrak legacy. Task3 belum merupakan izin
adopsi runtime production sebelum paket berikutnya dan gate rilis selesai.

## Generation context dan kompatibilitas

`get_page_generation_context` tetap Read request1, scope workspace/Page/niche
aktif. Config2 mengembalikan config_public_id, config canonical, generation_rules
berisi `hard_limits` terpisah dari `preferences`, profile/density/format yang
terpilih, serta effective_rules_hash. `editorial_context.profile` memuat definisi
profil dan contoh utuh; references format/topik diambil dari Page. Definisi serta
contoh relevan yang belum dibaca harus diambil melalui katalog bounded; flags
`definitions_complete:false`/`examples_complete:false` tidak boleh diabaikan.
Response dibatasi256 KiB dan tidak melakukan silent clipping definisi/rules.

Recent variety dan performance signals tetap deskriptif, bukan prediksi kausal.
Reuse policy/dedup tetap wajib sesuai alur v2; context bukan receipt dedup atau
izin melewati Read fakta. Tidak ada attestation DNA baru. `context_version`
mempertahankan config_updated_at dan page_updated_at server dengan enam digit.
Module context mengiklankan config versions[1,2], content version[2]; registry
config1 tetap default legacy sehingga seed tidak mengadopsi Page otomatis.

Config1 Page/context tetap memakai jalur validasi legacy; descriptor module
mendapat kemampuan versi aditif. Request/content/save tetap mengikuti versi yang
ada, lima nama tool konten v1 tetap ditutup. MCP config2 belum tersedia dari task3
saja: facade/schema/output/task7, plugin/task8 dan save/readback/lifecycle/task5
harus lengkap sebelum klaim alur host atau LIVE.

Lihat [hasil task3](../editorial/configurable-profiles/task-3-results.md) untuk
command, verdict fixture, fingerprint dan batas penerimaan.
