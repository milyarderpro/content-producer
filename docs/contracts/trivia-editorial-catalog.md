# Katalog editorial trivia — kontrak database task 2

Dasar: [CR-062](../decisions/2026-11-12-cr-062-configurable-trivia-editorial-profiles.md),
[design D1–D3/D9](../../openspec/changes/add-configurable-trivia-editorial-profiles/design.md)
dan [kontrak frozen](../editorial/configurable-profiles/contract.md).
Ini implementasi storage/RPC lokal, bukan ketersediaan LIVE atau facade MCP.
Config/Page/resolver dan tiga preset profil adalah task 3; facade/schema MCP,
diagnostik serta audit/pin katalog runtime adalah task 7.

## Storage, reference dan keamanan

`public.trivia_editorial_definitions` menyimpan identitas workspace, kind
`format|topic|profile`, key, integer version, schema definisi1, payload, hash
server dan creation time. Unique `(workspace_id,kind,key,version)` menjaga
versioning; index `(workspace_id,public_id)` mendukung keyset pagination.
`internal.trivia_editorial_catalog_state` menyimpan revision bigint per workspace,
diekspos sebagai string desimal. Nomor ini terpisah dari katalog fakta.

Reference tepat mempunyai bentuk:

```json
{"public_id":"<UUID v4 dari server>","version":1,"hash":"<SHA-256 dari server>"}
```

Hash adalah SHA-256 representasi JSONB server atas kind/key/schema/payload.
Payload yang berubah menghasilkan hash berbeda; versi identik secara semantik
boleh mempunyai content hash sama tetapi tetap reference/version berbeda.
Caller tidak menghitung atau mengirim hash baru saat publish. Trigger menolak
perubahan identity/payload/hash/creation time dan retirement kedua. Metadata
retirement terpisah dari isi versi immutable. Tidak ada RPC hard delete.

Kedua tabel RLS-enabled; caller `anon`, `authenticated`, `service_role`, PUBLIC
tidak memperoleh direct table/sequence/helper grants. Dua API entrypoints saja
mempunyai EXECUTE untuk authenticated. Function owner adalah
`content_producer_api_owner` NOLOGIN/NOBYPASSRLS, `search_path=''` dan schema
qualified; owner/workspace diperiksa lagi dalam database. RLS tetap membatasi
role API. Privilege CREATE schema sementara dicabut kembali setelah transfer.
Role postgres tetap administrator migration/fixture, bukan caller business.

Transaksi memakai kernel owner, operation ledger dan rate-limit project. Mutasi
mengambil lock workspace `trivia_lock_workspace_v1` sebelum state/definition;
Read memakai row lock SHARE pada workspace agar seluruh halaman melihat state
konsisten terhadap mutasi. Operasi content lama menggunakan lock workspace yang
sama. Tidak ada network fetch, eval, executable template atau SQL dinamis dari
payload editorial. Teks contoh/panduan tetap data tak tepercaya, bukan otorisasi.

## Schema definisi tertutup

Semua field pada baris yang relevan wajib ada; array boleh kosong hanya bila
tercantum. Field tak dikenal, JSON null di field wajib, struktur quiz/carousel,
parent/inheritance dan field executable ditolak. Konten teks boleh LF; kontrol
ASCII lain selain tab/LF/CR tidak diterima. Teks bukan fakta terverifikasi.

| Kind | Field bersama/tambahan |
| --- | --- |
| Semua | `definition_schema_version:1`, `display_name` 1–120 karakter, `description` 1–2000, `provenance:{basis,references}`, `notes:[]`, `examples:[]` |
| Format | `content_structure:trivia_card_v2`, `architectures` satu sampai tiga pilihan unik single_subject/themed/mixed, `mechanisms`, `reader_benefits`, `density_preferences`, `selection_guidance`, `ordering_guidance` |
| Topic | `scope`, `subject_examples:[]`, `group_key` |
| Profile | `format_refs`, `topic_refs`, `format_weights`, `topic_weights`, `density_preferences`, `fact_count:{min,preferred,max}`, `hook_templates`, `hook_casing`, `voice`, `units_preference`, `cta_guidance:{guidance,examples}`, `emoji_policy`, `default_limits`, `selection_guidance`, `ordering_guidance` |

Key dan label key: `^[a-z][a-z0-9_]{1,49}$`. Maksimum 128 key/kind/workspace,
tidak berkurang karena retirement. Versi bertambah integer, tidak menimpa versi
sebelumnya. Payload format/topic maksimal 16 KiB, profil 64 KiB; definisi yang
projection penuhnya tidak muat budget Read ditolak atomik saat publish.
Projection exact dibatasi 60 KiB dan akumulasi entries halaman 62 KiB, menyediakan
ruang bagi envelope/cursor dalam ceiling respons 64 KiB. Ini batas byte UTF-8,
bukan jumlah karakter.

`provenance.basis` maksimum 1000 karakter, `references` maksimum 32 string
masing-masing 200. `notes` maksimum 16 string masing-masing 1000. `examples`
maksimum16 object tertutup `{kind:positive|anti,text,note,source_ref}` dengan
batas 2000/1000/200 karakter. References provenance adalah locator inspirasi,
bukan graph dependency atau instruksi fetch sumber.

Mechanisms/manfaat maksimal16 key unik. Selection/ordering masing-masing 1–24
string, maksimum1000 karakter/string. Topic scope maksimum2000, subject examples
maksimum32 string/160 karakter. Density map mempunyai 1–16 key; setiap nilai
memakai enam field rentang count, kata/fakta dan kata total, berurutan dan di
ceiling 12/30/160. Ini data preferensi, bukan renderer/gate baru.

Profil hanya boleh merujuk 1–128 format dan 1–128 topic dengan ID/version/hash
tepat dalam workspace. Setiap key hanya satu versi dalam profil. Graph tidak
menerima profile → profile atau format/topic → node lain, sehingga cycle tidak
bisa didaftarkan. References asing, hash salah, kind salah atau retired untuk
binding baru ditolak. Maps bobot tepat memuat key references, integer 0–100,
total100 masing-masing; bobot nol tidak melarang pilihan eksplisit.

Profile hook casing `uppercase|sentence_case|as_written`, units preference
`contextual|us_customary|metric|dual_when_useful`, emoji policy `forbidden|optional`.
Hook templates 1–16, maksimum120 karakter; voice maksimum2000; CTA guidance
maksimum2000 dan contoh CTA 0–16, maksimum180 karakter/contoh. Tidak ada classifier,
primary goal, enum aksi atau batas semantik jumlah ajakan di schema katalog.
`default_limits` mempunyai sembilan field berikut, maksimum berturut-turut:

```text
hook_max_chars=120, fact_max_chars=160, facts_total_max_chars=900,
cta_max_chars=180, canva_total_max_chars=1100,
hook_max_words=18, fact_max_words=30, cta_max_words=32, canva_total_max_words=160
```

## Read

Signature database:

```text
api.get_trivia_editorial_catalog(
  p_request_schema_version integer, p_workspace_public_id uuid,
  p_filter jsonb = {}, p_include_examples boolean = false,
  p_limit integer = 20, p_cursor text = null)
```

Request version1. Filter boleh memuat kind/key/version opsional, atau hanya
`references:[<reference tepat>,...]` berisi 1–20 reference unik. Semua versi,
termasuk retired, dapat dibaca. Exact reference asing/tidak ditemukan tidak
menghasilkan partial success; daftar ringkas kosong tetap hasil valid.

Output envelope `response_schema_version:1,data` berisi:

- `editorial_catalog_version` string desimal;
- `definitions` maksimal20, setiap entri berisi reference/kind/key/schema,
  status active/retired, timestamp enam mikrodetik, alasan retirement nullable,
  payload dan `examples_complete`;
- `next_cursor` nullable, `definitions_complete`, `examples_complete`, `complete`.

`p_include_examples=false` menghilangkan examples dari payload, dan memberi
`examples_complete=false` bila ada contoh yang belum dikirim. `complete` hanya
true bila seluruh definisi pada query selesai dan contoh yang diperlukan utuh.
Bila batas jumlah/byte tercapai, ambil halaman berikutnya memakai cursor server;
untuk contoh yang belum diminta, baca exact references dengan include_examples.
Satu definisi tidak dipotong di tengah. Maksimum filter8192 byte, cursor1024
karakter. Cursor berisi public ID, filter hash, workspace public ID dan revision;
tidak ada bigint ID internal atau credential. Pergantian workspace/filter/
include_examples ditolak. Revision berubah antarbaca → baca ulang dari awal
(`EDITORIAL_CATALOG_CONFLICT`), bukan mengklaim hasil gabungan lengkap.

## Publish/retire

```text
api.update_trivia_editorial_catalog(
  p_request_schema_version integer, p_workspace_public_id uuid,
  p_operation_key uuid, p_expected_editorial_catalog_version text,
  p_change jsonb)
```

Request version1, operation key UUIDv4. Untuk publish:

```json
{
  "action":"publish",
  "kind":"format",
  "key":"historical_curiosities",
  "expected_previous_version":null,
  "payload":"<object definisi lengkap sesuai schema, bukan string>"
}
```

`expected_previous_version:null` hanya untuk key baru; key lama memakai nomor
versi maksimum saat ini, termasuk versi retired. Publish menambah versi baru,
memvalidasi seluruh referensi dan byte limits, lalu menaikkan revision katalog
sekali. Payload contoh di atas hanya notasi dokumentasi; gunakan object JSON
sebenarnya dari definisi yang direview.

Untuk retirement:

```json
{
  "action":"retire",
  "reference":{"public_id":"<UUID server>","version":1,"hash":"<hash server>"},
  "reason":"Owner memilih versi baru."
}
```

Alasan 1–500 karakter; waktu retirement dibuat server. Tidak ada penggantian
Page/post atau pemindahan snapshot otomatis. `editorial_reference_v1` menolak
binding baru ke versi retired; untuk binding yang sudah sah, helper menerima
binding time server tersimpan yang berada sebelum retirement. Caller tidak
boleh mengirim/mengarang binding time. Integrasi penyimpanan binding Page adalah
task3; test task2 membuktikan primitive temporal, bukan adopsi Page end-to-end.

Respons Write ringkas: `replayed`, `editorial_catalog_version`, `reference`,
`kind`, `key`, `status`, `retired_at`. Definisi penuh dibaca terpisah. Respons ini
disimpan di ledger, sehingga replay identik mengembalikan hasil operasi pertama
meskipun versi itu kemudian retired. Auth dan workspace tetap diperiksa sebelum
replay. Key dengan payload/expected revision berbeda → `OPERATION_KEY_REUSED`.
CAS stale → `EDITORIAL_CATALOG_CONFLICT`; reference tidak dapat dipilih →
`EDITORIAL_DEFINITION_UNAVAILABLE`; schema/batas/graph invalid → keluarga validasi.
Error internal tidak membocorkan SQL atau payload owner lain. Transaksi gagal
mengembalikan seluruh definition/revision/ledger/rate mutation; dua sesi dengan
revision sama hanya satu commit. Respons Write hilang membutuhkan rekonsiliasi,
kemudian replay key/payload semantik identik, bukan publish kedua secara otomatis.

## Seed dan paket berikutnya

`internal.editorial_seed_v1(workspace_id)` hanya helper invoker role API dan
memerlukan claims owner/workspace sah. Menambahkan tujuh format dan sebelas
topik awal, tanpa profil, Page adoption atau mutation pada Read. Key yang sudah
ada dalam versi/status apa pun dilewati; panggilan identik berikutnya nol insert
serta revision tetap. Seed menaikkan revision sebanyak definisi baru di dalam
transaksi pemanggil; bukan business RPC seed publik. Kegagalan rollback seluruh
batch seed. Task3 mengikat bootstrap ini pada adopsi config2 eksplisit dan
menambahkan tiga profil sesuai bobot/preferensi task1, tanpa overwrite data owner.

Task2 menambahkan dua signature RPC; katalog MCP tetap31 sampai facade task7.
Jangan menyalin angka33 RPC menjadi bukti 33 tool host aktif. Pin audit/G4/
Inspector yang mencakup seluruh perubahan katalog diselesaikan pada task7;
full gate formal exact final SHA main tetap wajib sebelum deployment berizin.
[Hasil task2](../editorial/configurable-profiles/task-2-results.md) membedakan
verifikasi lokal dari CI/preview/LIVE.
