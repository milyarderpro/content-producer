# Kontrak frozen — configurable editorial profiles, revision 1

Tanggal 12 November 2026. Otoritas dan batas berlaku:
[CR-062](../../decisions/2026-11-12-cr-062-configurable-trivia-editorial-profiles.md).
[Design](../../../openspec/changes/add-configurable-trivia-editorial-profiles/design.md)
dan tiga delta spec adalah acuan normatif bersama dokumen ini; fingerprint
berada di [freeze.json](freeze.json). Ini kontrak sebelum implementasi, bukan
laporan bahwa config2 telah tersedia. Perubahan semantik memerlukan keputusan
baru; detail internal kode boleh dipilih selama memenuhi seluruh perilaku ini.

## Matriks D1–D11 dan penerimaan per paket

| Keputusan | Kontrak yang dibekukan | Paket / bukti wajib kelak |
| --- | --- | --- |
| D1 | `public.trivia_editorial_definitions`, unique workspace/kind/key/version; schema definisi 1; payload/hash immutable + retirement terpisah. Revision `internal.trivia_editorial_catalog_state` bigint diekspos string desimal. Workspace lock sebelum definition/config; akses via owner RPC, RLS/default-closed/direct grants dicabut menurut pola project | 2,7: cross-owner/anon/non-owner ditolak, audit ACL/RLS; revision editorial tidak menaikkan katalog fakta |
| D2 | `get_trivia_editorial_catalog` Read; `update_trivia_editorial_catalog` Write publish/retire. Request umum 1, operation key dan expected editorial revision; publish expected previous version/null, retire versi tepat+alasan. Immutable read/replay tetap ada; retirement menolak binding baru dan mempertahankan binding lama | 2,7: CAS bersamaan hanya satu commit; lost-response replay tanpa versi ganda, changed-payload key ditolak; pagination/size dan retired binding diuji |
| D3 | Kind format/topic/profile; graph hanya profile → format/topic dalam workspace. Format memisahkan architecture single_subject/themed/mixed, mechanisms dan reader benefits. Key/bobot dinamis; tujuh seed bukan maksimum. Custom adalah satu profil dengan provenance inspirasi, tanpa inheritance engine | 2,3: cross-kind/workspace/cycle/unknown ditolak; format/topik/profil baru bisa ditambahkan sebagai data; seed idempotent tanpa overwrite |
| D4 | Config2 pinned profile/format/topic references (ID/version/hash), allowed choices, maps exact keys, integer 0–100 total 100. Resolver ceiling → default profile/format → Page override → item/instruksi sah. Item tidak dapat melampaui hard budget/allowed Page. `profile_key` berarti density. Binding time tetap pada update Page yang tidak mengganti referensi | 3,6: CAS enam mikrodetik, explicit adopt, Page lain utuh; plan format null, goal intent non-eksklusif, pending/in-progress direview ulang, completed historis |
| D5 | Preset curious_mind/dyk/daily_facts terpisah; count preferensi 6–10/8, 5–11/8, 5–7/6; ritme/kata/hook/CTA/emoji menurut audit. Kata/fakta preferensi 8–11 / 8–12 / 12–16; total 70–95 / 75–100 / 85–115. Custom dipilih sebagai versi tersendiri; frekuensi bukan kuota surprise atau batch | 1,3,8,9: matriks/seed weights terpisah per akun, kasus masing-masing dan custom; satu profil gagal tidak ditutupi rata-rata |
| D6 | Renderer config2 lepas dari pembatas v1, NFC/LF deterministik, Unicode/emoji tidak dibuang. `text_metrics: {}` input, hasil server authoritative. Wrap/time/replay advisory; count dan hard text ceilings di tabel bawah tetap blocking | 4,5,7: 1/10/11/12 diterima, 13 ditolak; golden byte/hash config1; CTA LF dan placement; arrays/IDs/metrics seluruh lifecycle utuh |
| D7 | CTA tetap hadir; bebas satu/beberapa ajakan tanpa primary/secondary, batas semantik jumlah atau allowlist kombinasi. `cta_actions` label opsional tanpa peringkat, tidak enum enam label wajib; metadata tidak lengkap bukan kegagalan. Config2 `interaction_goal` absen/null disimpan null; jika diisi hanya anotasi legacy | 4–8: Daily react+follow, DYK question+like/like+tag, multiline/antara fakta, wording ambigu, tiga+ aksi sintetis, goal null. Emoji/budget tetap diperiksa |
| D8 | `editorial_context` conditional wajib untuk config2, berisi pinned refs, architecture, density key dan effective-rules hash; label CTA opsional di luar rules hash. Snapshot3 server berisi versi/hash/aturan/config identity/time/layout/locale/count/estimator; content hash mencakup snapshot+CTA teks/placement/metadata yang diberikan. Snapshot2 config1 tidak berubah | 5,7: get/list/history/revise mengerti schema2/3; revisi context baru, ready kembali draft; current Page mismatch butuh review, publish/retire katalog saja tidak membatalkan approval |
| D9 | Dedup fakta tetap ≤9 kandidat/Read, ≤20 match/kandidat. 10–12 memakai beberapa Read, key calon unik dan versi katalog fakta konsisten. Editorial CAS terpisah. Replay sukses sebelum validasi state mutable, setelah auth; payload semantik/key harus sama | 2,5,6: complete=false/stale antarbaca berhenti dan Read ulang; rollback/no partial, config CAS, revise revision/hash; tanpa receipt dedup/embeddings/bypass |
| D10 | Plugin/identity/app mcpku2 tetap sama; generic workflow baca context/contoh relevan → riset/dedup → compose/review → context terbaru → save/readback. Data panduan tidak boleh mengubah aturan host/izin/sumber. Config1 kompatibel, tidak ada switch nama akun untuk config2 | 8,9: contoh/profil baru tanpa paket/deploy baru; adversarial instruction tidak diikuti; tiga checks dan pemisahan copy/caption/hashtag/internal tetap |
| D11 | CR-062 menjelaskan supersession frozen/CR-053/059/061; migrasi baru, tanpa rewrite/reset history. Request umum 1, tool draft/content 2, config1/2. G4 manual exact-SHA main + committed config/source/dua shard/aggregate PASS sebelum deployment berizin | 1,10: record diterima sebelum source, fingerprint, izin terpisah; legacy/test-all rollback; belum mengklaim LIVE/FIXED |

## Batas data dan rendering

| Ukuran | Config2 ceiling / default seed |
| --- | --- |
| Fakta/posisi | 1–12 / preferensi per profil, bukan minimum padding |
| Hook | 120 karakter, 18 kata / 60 karakter |
| Satu fakta | 160 karakter, 30 kata / 150 karakter |
| Blok fakta + separator | 900 karakter / 750 karakter |
| CTA | 180 karakter, 32 kata / 140 karakter |
| Canva copy + seluruh separator | 1.100 karakter, 160 kata / 900 karakter |

Default seed memakai ceiling kata di atas, dengan preferensi lebih sempit D5.
CTA `cta_placement` opsional pada payload config2: `after_facts` default atau
`after_fact` dengan posisi 1..jumlah fakta. Bentuk union harus membedakan kedua
varian tanpa posisi ambigu; bentuk wire final divalidasi konsisten SQL/MCP.
LF internal CTA disimpan; facts-block metrics menghitung fakta saja, full-copy
metrics mencakup seluruh komponen/separator. Penempatan tidak mengubah urutan ID
fakta. Profil DYK boleh emoji (terutama CTA); preset lain default off; Page dapat
mengatur policy eksplisit dalam ceiling. Tidak mengecilkan font demi lolos QA.

Katalog: key `^[a-z][a-z0-9_]{1,49}$`, maksimum 128 key/kind/workspace,
payload format/topic 16 KiB, profil 64 KiB; Read maksimum 20 definisi ringkas dan
64 KiB/halaman. Definisi tepat yang tidak dapat dibaca utuh ditolak saat publish;
examples yang belum terbaca ditandai incomplete dengan reference/cursor, tidak
dipotong diam-diam. Error editorial stale `EDITORIAL_CATALOG_CONFLICT`;
reference tak tersedia `EDITORIAL_DEFINITION_UNAVAILABLE`. Diagnostik aman,
tanpa ledger/key operasi/credential/payload owner lain. Tidak ada kode executable
atau fetch instruksi URL dalam definisi. Retirement tidak melakukan hard delete.

## Matriks kompatibilitas config1/2

| Jalur / pemicu | Config1 | Config2 | Pembuktian wajib |
| --- | --- | --- | --- |
| Bootstrap/module/Page/context | Bentuk/aturan existing tetap | Module mengiklankan 1/2; union config, satu pinned profile dan rules hash | schema input/output/context konsisten, timestamp teks enam digit |
| Format/topik/density | Enum/dua density existing | References terdaftar + key dinamis; density terpisah DNA | unknown/foreign ditolak, bobot tepat keys dan total, nol explicit tetap boleh |
| Count/text/render | Batas legacy tetap; tidak rewrite byte | D6, tanpa gate wrap/replay legacy tersembunyi | 1/10/11/12/13, limit ±1, Unicode/LF, metrics/hash golden |
| CTA/goal | Goal dan validasi legacy wajib | Goal absen/null; actions opsional; multiline/placement/gabungan | nilai absen tidak dipilih otomatis, 3+ ajakan sah dalam budget |
| Save/revise | Snapshot2/hash existing; editorial envelope baru tidak boleh menyelundupkan config2 | Content/tool tetap2; editorial_context wajib conditional; snapshot3 authoritative | stale config/rules/binding, CAS/replay/lost-response/rollback, ready invalidation |
| Get/list/history/metrics | Makna field/history tetap | 12 posisi dan provenance; null goal tak terklasifikasi, key dinamis | tanpa clipping/fake labels; `profile` density tidak jadi DNA; tidak menambah insights/filter DNA/CTA |
| Plan/batch/resume | Kontrak existing | Format null, intent goal boleh bersama ajakan lain; item override dalam Page | jumlah draft≠fakta, claim/completion sah, Read dedup konsisten, changed Page review |
| Approval/publication/reschedule/revoke/discard/archive | Semantik existing | Check binding/rules current Page, sejarah tetap pinned | catalog publish/retire saja tidak mengganti snapshot; explicit Page adopt mismatch memerlukan revisi; arrays IDs utuh |
| Owner/ledger/RLS | Default owner OAuth, scope/grants tetap | Katalog mengikuti kontrol identik | anon/non-owner/cross-owner denial, no direct grants, auth sebelum replay |
| Seed/retirement/adoption | Tidak auto-upgrade Page/post/plan | Seed idempotent, binding lama retired tetap sah | Page lain/histori tidak berubah; new binding retired ditolak |
| Content v1 | Lima nama tool v1 dan overload pensiun tetap ditolak | Sama | Inspector inventory dari source aktual, lima nama absen/ditolak + owner denial |
| Release/rollback | Bukti historis tersimpan | Release kompatibel tetap bisa membaca config2 | tidak rollback ke reader yang tak mengerti data baru; G4 exact-SHA sebelum deploy berizin |

Seluruh hasil implementasi pada tabel ini **NOT RUN** pada task 1. Test fokus
masing-masing paket tidak ditunda ke paket 9; penerimaan integrasi teknis
13 detik tetap tambahan. Laporan DNA/CTA baru ditunda, provenance/readback dan
kompatibilitas analitik tidak ditunda. Request save/revise/dedup v2 tetap2;
keterangan envelope umum1 tidak menurunkannya menjadi1.

## Addendum penerimaan — 13 November 2026

[Instruksi pemilik](../../decisions/2026-11-13-cr-062-task-9-technical-acceptance.md)
mengeluarkan review naskah manual dan QA layout ponsel dari gate change ini, tanpa
memindahkannya ke task10. Task9 memakai hasil teknis per profil/fixture; bukan
sertifikasi naturalness, kemiripan DNA atau layout. Kontrak penulisan runtime
dan seluruh kontrol sumber, izin, transaksi serta G4 tidak diubah.
