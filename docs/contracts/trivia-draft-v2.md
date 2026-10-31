# Kontrak contoh draft trivia v2 — P1-T3

**Versi kontrak contoh:** `cr-053-p1-v1`, 31 Oktober 2026.
**Dasar:** [CR-053 Accepted](../decisions/2026-10-31-cr-053-simplified-trivia-draft-workflow.md),
[PRD](../../plans/simplified-trivia-draft-workflow-prd.md), dan
[change](../../openspec/changes/simplify-trivia-draft-workflow/).

Dokumen ini membekukan bentuk contoh request, respons tiga tool baru, taksonomi
error, serta acceptance yang diperiksa oleh fixture P1. **Backend/tool v2 belum
diimplementasikan atau dipasang.** Pilihan retrieval, dataset/ambang dan schema
database P2/P3 tidak diselesaikan oleh contoh ini. Baseline tetap **A: versi
katalog workspace**; tidak ada receipt/lease dedup atau pengecualian katalog B.

## 1. Artefak yang dapat diperiksa mesin

- [Schema contoh](../../tests/fixtures/trivia-draft-v2-schema.ts): object JSON
  Schema untuk Read, save, revise, success summary, diagnostic, dan error v1
  minimum. Modul hanya data untuk test; tidak diimpor aplikasi atau registry.
- [Fixture](../../tests/fixtures/trivia-draft-v2.ts): ekspor `single`, `batch`,
  `planCreateRequest`, `claimRequest`, `partialProgress`, `reviseRequest`,
  `reviseResponse`, `lostResponseReplay`, `newSaveExpired`, `approvalRequest`,
  `rejectedExamples`, `errors`, dan `legacyError`. Pasangan negative-control
  mencakup URL kosong, caption 20 karakter di atas budget Page, editorial perlu
  revisi, config stale, dan katalog stale.
- [Taksonomi seluruh tool](../../tests/fixtures/tool-errors-v2.ts) dan
  [penjelasan diagnostik](tool-errors-v2.md).
- [Test kontrak](../../tests/trivia-draft-v2-contracts.test.ts): schema/fixture,
  konsistensi lintas contoh, negative controls dan inventaris/compatibility.

**Semua nilai fixture sintetis.** UUID, operation key, claim token, hash, versi
katalog, Page, fakta, dan URL `example.org` bukan milik production, bukan hasil
riset, dan tidak memberi otorisasi. Claim/copy berlabel `Fixture` bukan trivia
layak publikasi. Hash adalah placeholder bentuk, bukan hash authoritative yang
dihitung server. Kasus independen mempunyai state fixture sendiri, bukan urutan
Write ke satu database. Tidak ada network/Write pada pembentukan contoh.

Request lengkap dapat dilihat tanpa memanggil tool, misalnya:

```sh
pnpm exec tsx -e "import { single } from './tests/fixtures/trivia-draft-v2.ts'; console.log(JSON.stringify(single.request, null, 2))"
```

## 2. Konvensi bersama

- Tool baru memakai `request_schema_version: 2` dan success/error terstruktur
  `response_schema_version: 2`. `workspace_public_id` harus cocok dengan owner
  dari context tervalidasi, bukan menjadi identitas yang dipercaya dari input.
- Write memakai operation key UUID v4. Key/payload semantik identik adalah satu
  operasi logis; jangan mengganti key setelah respons hilang sebelum rekonsiliasi.
  Respons tidak menggemakan operation key atau claim token.
- `config_public_id` menunjuk config Page+niche, bukan Page ID.
  `expected_config_updated_at` dikirim sebagai teks asli dengan enam digit
  mikrodetik dan offset; contoh `2026-10-31T01:02:03.123456Z`.
- `catalog_version` dan `expected_catalog_version` adalah string desimal tanpa
  pembulatan JavaScript. Caller menyalin nilai dari Read; tidak menghitung versi
  berikutnya. Angka 42..46 pada fixture hanyalah contoh nilai yang dikembalikan
  Read pada langkah yang berbeda, bukan aturan increment per save.
- Object request tertutup. Batas transport mengikuti schema contoh; batas yang
  lebih ketat dari Page tetap diperiksa server. Batch pencarian 1–9 calon dan
  hasil hingga 20 match per calon adalah batas satu respons, bukan batas jumlah
  calon yang boleh diriset atau jumlah draft yang diminta. Jika kandidat wajib
  melebihi respons, hasil harus incomplete; tidak dipotong sebagai hasil bersih.
- `content_schema_version`/`content_payload.schema_version` bernilai 2; config
  dan tool plan yang tidak berubah tetap memakai kontrak versinya sendiri.

## 3. `trivia_find_similar_facts_v2`

Request berisi versi, workspace, Page, serta `candidates` dengan `candidate_key`
dan `claim_text` (1–500 karakter). Tidak ada sources, ontologi, relation key,
numbers, qualifier, operation key atau review yang harus disiapkan untuk Read.

Success `data` berisi:

- `catalog_version` untuk satu pandangan katalog yang konsisten;
- `candidates[]`: key calon, `complete`, dan `matches[]`;
- setiap match: `fact_public_id`, `claim_text`, `status`, `reuse_eligibility`,
  `used_on_page`, `used_in_workspace` pada workspace owner yang sama.

Status mencakup needs_review, verified, invalidated, superseded, rejected.
Eligibility membedakan eligible/page_blocked/workspace_blocked/actively_reserved/
not_eligible. History tidak disembunyikan karena faktanya tidak layak. `complete`
berarti kelengkapan menurut aturan retrieval yang akan dibekukan P2, bukan
jaminan semua parafrasa di dunia ditemukan.

Fixture `single.findRequest` mempunyai enam calon untuk lima fakta final;
`single.findResponse` menampilkan match layak untuk A1 dan petunjuk fakta
invalidated untuk A6. A6 tidak masuk set final. Test juga mengganti status
petunjuk itu menjadi superseded/rejected. Jika makna ditemukan dan diputuskan
`same`, ID canonical yang sama harus dirujuk; bila ID itu tidak layak atau
pemakaiannya dilarang, calon diganti tanpa ID baru pengelak riwayat.

`complete=false`, host clipping, atau kandidat wajib yang belum selesai ditinjau
memicu penggantian calon dan pencarian calon baru. Tidak memaksa review panjang
atau mengirim `uncertain` sebagai fakta final.

## 4. `save_post_v2`

### Request

Selain konvensi bersama, field wajib adalah:

- `page_public_id`, `niche_key: trivia`, format, topik, interaction goal;
- `scheduled_at` dan `plan_item` eksplisit null bila tidak digunakan;
- `plan_item`, bila ada, berisi `plan_item_public_id` dan claim token sah;
- `facts[]`: posisi berurutan, key calon, kalimat canonical, tepat satu
  `source_url`, dan keputusan dedup ringkas;
- `content_payload`: schema 2, hook, body facts terurut (`position`, `text`),
  CTA, Canva copy, caption, hashtag, render style, dan `text_metrics: {}`;
- tiga `editorial_checks`: `meaning_preserved`, `caption_no_new_claim`,
  `no_known_substantive_issue`, masing-masing pass/needs_revision.

Dedup per fakta berisi `complete: true`, `decision`, `fact_public_id`, dan
`reviews[]` berisi ID match serta same/distinct; alasan pendek opsional.
`same` harus menunjuk ID lama dan sekurangnya review same yang cocok.
`distinct` untuk identitas baru memakai ID null dan review distinct bagi semua
kandidat wajib yang terlihat. Tidak ada `uncertain` dalam request final.
Seluruh calon final juga diperiksa agar tidak mengulang makna yang dikenali.

Sumber cukup satu URL per fakta. Tidak ada tier/expiry/metadata sumber rinci.
URL http/https, tidak mengandung credential atau alamat lokal, maksimum 2048
karakter. Format fixture memeriksa bentuk dan alamat literal/reserved lokal;
tidak melakukan DNS/fetch atau membuktikan dukungan isi URL. URL sama dapat
mendukung beberapa klaim berbeda. Riset isi tetap tugas ChatGPT.

Tidak ada `generation_snapshot`, `fact_bindings`, atau reservation token yang
dirakit caller v2: server membangun snapshot dari config yang cocok serta
binding dari fakta dan posisi body dalam transaksi. Ini bukan penghapusan
snapshot/history internal atau relasi canonical. Server tetap menghitung
renderer/metrik resmi, memeriksa semua budget Page, dan mengikat evidence.

### Success dan readback

Success `data` berisi `post`, `plan`, dan `replayed`. Summary post memuat ID
post/Page, versi konten 2, draft, revision, dan content hash authoritative.
Plan null untuk satu draft; bila terkait plan, ringkasan berisi ID, jumlah
diminta, status, dan lima counter progres. Tidak ada draft parsial atau otomatis ready.

Summary bukan pengganti `get_post`. Fixture `single.readRequest` tetap memakai
input tool bersama versi 1, `include_sources: true` dan `include_checks: true`.
`single.readbackProjection` memperlihatkan bagian yang wajib dicocokkan: ID/Page,
versi/status/revision/hash, seluruh copy, ID/posisi/wording fakta, snapshot URL,
serta hasil system/editorial yang terikat versi. **Projection fixture ini bukan
keseluruhan wire response `get_post` dan bukan klaim schema v1 sekarang telah
menerima post v2.** Projection lengkap/gate menurut versi tetap pekerjaan P4/P5/P6;
envelope serta data post v1 yang ada tidak diganti oleh projection ini.

Sumber/metrik/approval lain pada tool bersama tetap mengikuti kontrak versi
kontennya. Hasil save yang tidak dapat dibaca kembali dilaporkan dengan batas
buktinya, bukan diganti post baru hanya untuk mendapatkan readback.

### Penolakan

- Input yang melanggar schema ditolak sebelum RPC bila lapisan itu yang menolak.
  Field error menunjuk posisi/bagian aman, tanpa menyalin payload privat.
- Pelanggaran mekanis atau editorial needs_revision yang lolos bentuk input
  menolak seluruh transaksi: tidak ada draft, fakta baru, alokasi, atau completed
  parsial. Nilai needs_revision sengaja valid secara bentuk; bukan izin menyimpan.
- Katalog stale menghasilkan `FACT_CATALOG_CONFLICT`, rollback dan Read baru;
  tidak ada pengecualian karena fakta yang berubah tidak terkait. Config stale
  memakai `PAGE_VERSION_CONFLICT`. Reuse menunjuk fakta terkait; naskah
  diperbarui sesudah calon diganti. Hasil riset yang masih sah tidak otomatis diulang.

## 5. `revise_post_v2`

Request sama-sama membawa workspace/key, config terkini, versi katalog,
facts/copy/editorial, format/topik/goal. Target memakai `post_public_id`,
`expected_revision`, `expected_content_hash`, dan `revision_reason`; tidak
mengirim Page/jadwal/claim untuk memindahkan hubungan post yang sudah ada.
Jadwal saja tetap melalui `reschedule_post` dan kontrak khususnya.

Fixture `reviseRequest` memakai Read versi katalog 43 yang baru, mempertahankan
lima ID dari readback, dan mengirim ulang tiga editorial. Alokasi yang tetap
pada post yang sama bukan penggunaan baru; ini tidak membolehkan fakta baru
yang sudah dipakai pada post lain. Perubahan makna memerlukan riset, URL, dan
dedup baru, lalu pengaitan atomik. Revisi ready kembali menjadi draft.

Success memakai summary yang sama seperti save dengan revision keluaran;
fixture revision 2 boleh memiliki hash sama bila isi canonical tidak berubah.
Evidence tetap diikat server ke revision keluaran. Setelah revisi, readback dan
Setujui versi tepat tetap terpisah. Konflik CAS membaca/review ulang, tidak
mengganti expected revision/hash tanpa meninjau perubahan.

## 6. Lima draft, hasil sebagian, dan replay

- `planCreateRequest`: tool `create_content_plan`, request schema 1, lima slot
  berurutan tanpa jadwal, tema food and home pada `plan_intent`, config schema 1.
- `claimRequest`: claim satu item dengan lease 30 menit. Renewal/failure/retry
  mengikuti kontrak lama; tidak ada worker atau loop latar belakang baru.
- `batch[0..4]`: lima set Read/save/success/readback berbeda, key dan ID output
  masing-masing, mengacu pada satu plan. Setiap save memakai versi katalog dari
  Read terkait dan memperhitungkan output sebelumnya, bukan reuse key/body lama.
- `partialProgress`: sesudah tiga readback sukses, item keempat gagal dan telah
  dilaporkan dengan claim sah; tiga completed, satu failed, satu pending.
  Laporkan ID plan/post, tiga dari lima terbukti, dan dua tersisa. Resume membaca
  `get_content_plan` lebih dulu, tidak membuat ulang completed.
- `lostResponseReplay`: save keempat sudah commit, respons hilang, claim kini
  expired. Caller yang masih berwenang mengirim key/payload semantik **identik**;
  respons mengacu pada ID/hasil semula dengan replayed true, tanpa post/alokasi/
  perubahan item baru. Replay sukses tidak dihentikan oleh expiry atau CAS
  katalog/config baru yang hanya diperuntukkan operasi bisnis baru.
- `newSaveExpired`: kontrol negatif pada state independen yang belum pernah
  commit; operasi/key baru dengan claim expired ditolak. Pada item yang sudah
  completed, key baru juga bukan replay; kode penolakan mengikuti state claim/
  item yang ditemukan, bukan mengarang expiry sebagai satu-satunya akar sebab.

Jika respons plan-create/save hilang, jangan mengubah key/payload sebelum
rekonsiliasi. Rate limit mengikuti waktu tunggu; perubahan fakta/copy adalah
operasi baru sesudah state lama jelas. Draft sukses tetap ada walau langkah
berikutnya gagal. Instruksi pembuatan tidak mengizinkan draft di luar jumlah,
approval, correction, replacement, discard, atau pencatatan publikasi/metrik.

## 7. Daftar gate wajib Setujui

Daftar ini adalah acceptance kontrak, bukan registrasi check ID runtime baru:

1. Owner/workspace, Page aktif, niche enabled dan versi config didukung.
2. Revision/hash cocok dengan versi yang dibaca dan ditinjau pemilik.
3. Identitas/dedup lengkap; tidak ada uncertain, calon tidak layak atau duplikasi
   yang diketahui; ID sama tidak dibuat ulang untuk menghindari riwayat.
4. Tepat satu URL web berformat valid per fakta pada snapshot v2.
5. Reuse/alokasi terkini sah pada scope yang berlaku, termasuk riwayat published.
6. Jumlah, posisi, urutan, pengaitan dan rendered wording cocok dengan body.
7. Format/topik/profile dan bahasa mengikuti konfigurasi Page.
8. Renderer resmi, budget komponen/hasil akhir, dan batas keras lulus.
9. Tiga editorial pass tercatat pada revision/hash terkini; saran gaya terpisah.
10. Perintah owner eksplisit untuk Setujui versi tersebut.

`approvalRequest` memakai input tool bersama versi 1, expected revision/hash,
explicit approval dan warning list kosong. Ini contoh tindakan terpisah,
**bukan** bagian batch izin draft. Setujui tidak membuka ulang seluruh URL,
menuntut tier/expiry v2, atau memublikasikan post. Publikasi/metrics tetap manual.

## 8. Verifikasi dan batas penerimaan P1

Test kontrak hanya memvalidasi bentuk contoh, konsistensi ID/key/versi/progres,
mapping kode, pewarisan diagnostik seluruh katalog, dan kontrol negatif. Mini
interpreter JSON Schema di test mendukung tepat keyword yang dipakai; test
menolak keyword/ref yang tidak dikenal. Bukan pustaka JSON Schema umum atau
validator domain aplikasi. Full wire schema tool bersama yang tidak berubah
diuji lagi melalui suite MCP v1 terisolasi yang relevan, tanpa database.

Protokol retrieval, target recall/salah gabung, migration/backfill, transaksi
nyata, race, ukuran output nyata, host plugin, dan LIVE tetap belum dibuktikan.
Perubahan kontrak contoh selanjutnya memerlukan rekonsiliasi versi, test dan
keputusan yang relevan; passing fixture tidak memberi izin backend, Phase 2,
deploy, pensiun v1, atau business Write.
