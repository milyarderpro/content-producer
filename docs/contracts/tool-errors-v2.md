# Taksonomi error seluruh tool — P1-T3

**Versi:** `cr-053-p1-v1`. Dasar: [CR-053](../decisions/2026-10-31-cr-053-simplified-trivia-draft-workflow.md).
[Data taksonomi](../../tests/fixtures/tool-errors-v2.ts) memetakan semua kode v1
yang diizinkan adapter saat ini, delapan kode tambahan, dan semua **36 tool
target transisi** (33 baseline + 3 v2). Test membandingkan nama tool/kode dengan
source yang tersedia; ini bukan klaim bahwa mapping runtime sudah diterapkan.

Bagian `existing_contract_codes` juga menutup sepuluh kode kontrak/SQL yang
belum diiklankan allowlist adapter sekarang, termasuk token/resource mismatch,
module/content schema/format/topic/profile unsupported, reservation required, dan fact
not found. Kode itu bukan temuan baru yang diaktifkan pada v1; fallback adapter
lama tetap eksplisit. `module_aliases` menormalkan lima nama family pada module
contract ke vocabulary tool tanpa menghilangkan lokasi/konteks aman yang diketahui.
Module version unsupported tetap berbeda dari config schema unsupported; tidak
digabung menjadi kode yang menyalahkan versi konfigurasi.

## 1. Canonical diagnostic dan bentuk pengiriman

Canonical diagnostic memuat field wajib:

- `code`: kode stabil dari katalog taksonomi;
- `category`: input/state_conflict/access_denied/transient/internal_unknown;
- `message`: penjelasan aman, 1–300 karakter;
- `tool`: nama tool; `stage`: input/auth/domain/rate_limit/rpc_transport/output;
- `retryable`: apakah ada jalur retry terbatas yang aman, bukan izin langsung
  mengulang Write atau membuat key baru;
- `recovery`: tindakan konkret, 1–300 karakter;
- `write_outcome`: not_applicable/not_started/rolled_back/unknown;
- `diagnostic_id`: ID server opaque non-secret untuk mencocokkan log tersanitasi.

Field opsional: `field_errors` hingga 20 entri path/code/message, dan
`retry_after_seconds` integer 1–3600 yang wajib bila rate limited. Tidak ada
payload/SQL/token/operation key/teks sumber panjang atau identitas owner lain.
Lokasi dan kategori hanya disertakan bila diketahui, bukan tebakan.

Delivery tidak disamakan dengan canonical diagnostic:

1. **Tool result v2 yang sampai ke handler:** MCP `isError: true`,
   `structuredContent: {response_schema_version: 2, error: <diagnostic>}` dan
   text aman untuk model. Schema contoh menguji bagian structuredContent.
2. **Tool bersama/v1:** envelope error terstruktur versi 1 tetap memakai
   code/message/retryable/recovery serta field opsional v1 yang sudah diizinkan.
   Code tambahan diproyeksikan ke fallback v1 di `new_codes`; stage/tool/
   outcome/ID diagnostik dapat dijelaskan pada text MCP tanpa menambahkan field
   sembarangan ke envelope tertutup. Fixture `legacyError` adalah bentuk minimum,
   bukan penghapusan optional `current` atau opsi lain dari kontrak frozen.
   `legacyOutputUncertain` menunjukkan fallback output rusak pada `save_post`:
   structuredContent tetap v1, sementara text menjelaskan output/unknown dan ID
   diagnostik. Metadata `current` yang diuji hanya public ID/status/revision aman.
3. **Penolakan protokol/input sebelum handler:** pertahankan bentuk error JSON-RPC
   atau challenge HTTP/MCP yang sesuai. Penjelasan aman menyertakan konteks yang
   diketahui pada kanal text/message yang tersedia; jangan membuat tool result
   seolah callback/domain sudah dijalankan. Canonical contoh input menjelaskan
   informasi yang diperlukan, bukan bukti semua penolakan SDK mempunyai envelope
   `structuredContent` yang sama.
4. **Penolakan host sebelum MCP:** hanya observasi dari host bila tersedia. Tidak
   ada response_schema_version, structuredContent, ID diagnostik server atau
   akar sebab database yang direkayasa untuk panggilan yang tidak pernah diterima.

Versi response tool yang sudah ada tidak dinaikkan global. Get profile dan
bootstrap workspace tetap mempunyai pengecualian kontraknya sendiri. Success
post v1, input plan/claim/get_post/approve serta nama tool lama tetap kompatibel;
projection post v2 pada tool bersama adalah pekerjaan terpisah P4/P5/P6.

## 2. Kategori dan kode

Setiap kode pada data taksonomi muncul tepat sekali dalam kategori. Kode v1
dipertahankan namanya; pengelompokan tidak menyatakan seluruh error itu berlaku
untuk setiap versi konten. Ontologi/reservasi/sumber-tier/expiry hanya relevan
untuk jalur v1 yang masih memerlukannya, bukan syarat baru v2.

- **input:** bentuk/enum/config/content/source/editorial yang perlu diperbaiki.
  Gunakan path bila tersedia; salah satu editorial needs_revision memakai
  `QUALITY_EDITORIAL_INCOMPLETE`, URL kosong/rusak memakai kode v2 di bawah.
- **state_conflict:** state/CAS/status/alokasi/claim/resource berubah atau tidak
  memenuhi operasi. Baca/review state yang relevan, jangan overwrite, memaksa
  distinct, atau membuat key baru untuk menembus penolakan yang sama.
- **access_denied:** hentikan akses yang ditolak; auth challenge boleh meminta
  relink yang sah. Jangan mencoba owner lain atau mengaktifkan fixed-pilot/grant
  historis untuk melewati aturan. PILOT_WRITE_LOCKED tetap jalur rollback khusus.
- **transient:** waktu tunggu/busy/jaringan/service; retry mengikuti outcome dan
  idempotency, tidak menggunakan loop sibuk.
- **internal_unknown:** masalah internal/output yang belum dapat dipastikan
  akar sebabnya. Sebut tahap yang diketahui dan ID diagnostik, bukan menuduh SQL
  atau layanan mati. Output schema mismatch diketahui tidak membuktikan penyebab
  internal spesifik atau rollback Write.

Delapan kode baru yang dibekukan untuk contoh:

- `FACT_URL_REQUIRED` / `FACT_URL_INVALID`: lokasi source_url fakta terkait;
  fallback v1 `FACT_SOURCE_INSUFFICIENT`.
- `FACT_CATALOG_CONFLICT`: versi katalog A stale, rollback dan Read ulang;
  fallback v1 `FACT_REVIEW_REQUIRED` bila diperlukan pada projection lama.
- `FACT_SEARCH_INCOMPLETE`: final set memakai Read tidak lengkap; ganti calon,
  tidak dipaksa lolos. Fallback v1 `FACT_REVIEW_REQUIRED`.
- `RPC_TIMEOUT` / `RPC_NETWORK_ERROR`: tahap transport RPC yang diketahui;
  fallback v1 `DATABASE_UNAVAILABLE`.
- `RPC_RESPONSE_TOO_LARGE` / `RPC_RESPONSE_INVALID`: tahap output/parse/schema;
  fallback v1 `DATABASE_UNAVAILABLE`.

Fallback menjaga vocabulary v1; recovery/text tetap harus jujur soal ketidakpastian
hasil, tidak menyembunyikan penyebab aman yang sudah diketahui. Kode/rubrik
editorial lain, revision/hash/config/claim/reuse/budget memakai kode v1 yang
masih relevan. Jangan mengarang ID fact yang tidak sah sebagai error resource baru.

## 3. Kepastian hasil dan retry

- Read memakai `not_applicable`; kegagalan Read bukan kehilangan hasil Write.
- Write ditolak pada input/auth/rate sebelum domain memakai `not_started` untuk
  mutasi bisnis; ini tidak mengklaim rate bucket atau log internal tidak berubah.
- Penolakan domain yang diketahui atomik memakai `rolled_back`.
- Write sudah didispatch lalu timeout, jaringan terputus, respons terlalu besar,
  atau parse/schema gagal memakai `unknown` jika tidak ada bukti hasil. Jangan
  mengartikan HTTP status, error adapter, atau hilangnya text sebagai rollback.
- Jika unknown: baca post/plan atau replay operasi asli dengan key/payload
  semantik sama. Jangan mengganti key/fakta/copy sebelum state lama jelas.
- `RATE_LIMITED` menyebut waktu tunggu aktual; contoh 60 detik adalah fixture,
  bukan hardcoded window untuk semua tool. `DATABASE_BUSY` retry terbatas dengan
  operasi identik; revision/hash/config conflict perlu Read dan review baru.
- Replay save sukses setelah claim expired tetap hasil operasi lama. Save baru
  dengan claim expired ditolak. Replay tidak menghapus otorisasi atau menjamin
  state sekarang sama dengan snapshot respons operasi semula; readback tetap wajib.

## 4. Cakupan seluruh tool

`groups` pada data taksonomi mencantumkan 11 kelompok handler v1 dan kelompok tiga
tool v2 yang direncanakan. Setiap nama tepat sekali dengan mode Read/Write serta
kode domain relevan. `global_codes` diwariskan untuk input/owner/auth/rate/
transport/output; `write_codes` menambahkan idempotency dan pilot latch bila
berlaku. Daftar kode domain kelompok merupakan inventaris minimum untuk audit,
bukan janji setiap kode berlaku pada semua tool dalam kelompok atau allowlist
untuk menyamarkan kode lain yang sah. P6-T2 memetakan kasus per tool/lapisan
secara rinci beserta alasan tidak berlaku.

Semua Read mempunyai input/access/rate/transport/output dan outcome not_applicable.
Semua Write mempunyai kasus itu plus kepastian mutasi/idempotency dan kasus
domain terkait. Claim expiry tidak berlaku untuk performance Read; CAS content
tidak diminta untuk snapshot metrik append-only; alasan semacam itu dicatat,
bukan membuat kasus palsu. Ketika katalog bertambah, test inventaris gagal jika
tool baru belum dipetakan.

P1 test menguji contoh diagnostik lintas tahap untuk semua 36 nama dan kategori
setiap kode baseline; test MCP v1 terisolasi membuktikan kontrak yang masih ada
tetap berjalan pada fixture/mock. Ini **bukan** bukti implementasi diagnostik
seluruh tool. D1/D2 tetap pembagian pekerjaan internal; D1 saja tidak menutup
P6-T2/proyek atau memberi izin rilis lebih awal.

## 5. Penjelasan untuk pemilik

ChatGPT merangkum dalam bahasa Indonesia: tool/tahap gagal, penyebab yang didukung,
lokasi bila diketahui, tindakan yang sudah dicoba, serta apakah perubahan data
terbukti melalui Read. Misalnya fakta kedua terpakai: pilih calon lain, perbarui
copy, cek ulang, lalu operasi baru setelah hasil lama pasti.

Jika draft keempat gagal, jumlah tiga draft sukses berasal dari plan/readback,
bukan dari handler error tunggal. Sertakan ID plan/post yang terbukti dan dua
yang tersisa; jangan menyembunyikan error sebagai "terjadi kendala". Unknown
menyebut keterbatasan serta ID diagnostik aman, bukan akar sebab rekaan. HTTP 200,
host approval, fixture PASS, atau PR merged tidak membuktikan Write LIVE berhasil.
