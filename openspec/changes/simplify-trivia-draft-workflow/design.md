# Design

## Context

Motivasi dan cakupan capability ada pada [proposal](proposal.md). Acuan kebutuhan
produk adalah [PRD](../../../plans/simplified-trivia-draft-workflow-prd.md);
[rencana implementasi](../../../plans/simplified-trivia-draft-workflow-implementation-plan.md)
menjadi baseline **8 fase dan 23 task**. Dokumen ini menjabarkan keduanya, bukan
mengubah kontrak frozen atau menggantikan change record yang harus diterima
sebelum implementasi.

Peninjauan source dilakukan pada HEAD lokal
`b4eb17ac149de4451d518cb0a69f1ea92e22037a`, 31 Oktober 2026. SHA ini bukan bukti
runtime production. Temuan yang memengaruhi desain:

- `supabase/functions/mcp/trivia_fact.ts` meminta ontologi untuk Read v1 serta
  paket sumber, freshness, expiry, dan reservasi untuk registrasi v1.
- `supabase/functions/mcp/post_base.ts` menghubungkan copy, fact binding,
  generation snapshot, dan pemeriksaan editorial v1.
- [CR-012](../../../docs/decisions/2026-10-11-phase-5-5-trivia-rpc-reconciliation.md)
  dan migration foundation/resolver trivia menetapkan lock workspace, urutan
  lock, serta retrieval ulang dalam transaksi. Ini fondasi yang perlu dijaga,
  bukan bukti bahwa desain v2 telah diuji.
- Content plan sudah memiliki claim/lease, riwayat attempt, penyelesaian item
  bersama save, dan pembatas satu post aktif per item. Test concurrency ada di
  `api-plan-concurrency.test.ts` serta `api-post-concurrency.test.ts`.
- `supabase/functions/mcp/foundation.ts` memetakan beberapa gangguan berbeda ke
  `DATABASE_UNAVAILABLE`, termasuk output terlalu besar/tidak sesuai schema.
  `http.ts` mempunyai log request tersanitasi, tetapi belum membuktikan
  pengukuran pemakaian versi plugin yang cukup untuk cutover.

Pencatatan saat ini terbatas pada proposal/design dan metadata scaffold CLI.
Tidak ada implementasi, perubahan PRD/plan/change record, delta spec, task file,
deployment, atau business Write yang dilakukan. Semua test usulan di bawah
berstatus **NOT RUN**; pembacaan test lama bukan bukti PASS baru.

## Goals / Non-Goals

**Goals:**

- Kurangi representasi dan koordinasi yang harus dirakit ChatGPT, sementara
  keputusan mekanis dan transaksi tetap dimiliki core/niche database.
- Jadikan hasil setiap draft, kepastian hasil Write, dan progres beberapa draft
  dapat direkonsiliasi melalui state persisten.
- Pertahankan batas produk PRD dan bedakan baseline yang disetujui dari
  alternatif yang masih membutuhkan bukti serta keputusan pemilik.

**Non-Goals:**

- Tidak mendesain ulang transport/auth, menambah framework orkestrasi, atau
  memperkecil lock sebagai efek samping penyederhanaan payload.
- Tidak mengembalikan tier, expiry, ontologi input v2, riset ulang URL saat
  Setujui, atau kewajiban tahun pada copy. Kewajiban lama hanya tetap bermakna
  untuk data/operasi v1 sesuai kontraknya selama transisi.
- Tidak menambah backend AI, embeddings/vector search, worker, dashboard, atau
  otomatisasi Canva/Facebook/metrik. Tidak mengklaim dedup semantik sempurna.

## Decisions

### 1. Alur dan pembagian tanggung jawab mengikuti PRD

```text
Instruksi pemilik: Page + jumlah + tema bila ada
    |
    v
Konteks Page; buat content plan bila jumlah >= 2
    |
    v
+------------------------------------------------+
| Satu draft / satu item yang diklaim             |
|                                                |
| Riset calon + URL cadangan                     |
|     --> dedup Read --> ganti calon bermasalah   |
|     --> copy final + pemeriksaan editorial     |
|     --> konteks terbaru --> save atomik         |
|     --> get_post --> progres plan bila ada     |
+------------------------------------------------+
    |
    v
Ringkasan jumlah diminta, tersimpan, dan tersisa
    |
    v
Tinjauan pemilik --> Setujui versi tepat
    |
    v
Publikasi manual --> pencatatan publikasi/metrik nyata
```

Jumlah draft mengikuti instruksi, jumlah fakta per draft mengikuti konfigurasi
Page, dan tema dipetakan ke pilihan Page yang diizinkan. Aturan ambiguitas dan
batas jumlah mengikuti FR-01/FR-07; tidak ada pemotongan diam-diam. ChatGPT
meriset calon lebih banyak daripada set final tanpa menjadikan angka cadangan
syarat database. `same` yang sudah terpakai dan `uncertain` diganti; makna berbeda
tidak digabung hanya karena subjek atau URL sama.

Input sumber v2 cukup kalimat fakta dan tepat satu URL web yang valid tanpa
credential/alamat lokal. ChatGPT menilai dukungan isi URL saat riset. Backend
memeriksa bentuk dan konsistensi; timestamp simpan bukan tanggal verifikasi.
Tidak ada jalur sumber khusus semata karena kategori topik.

Save/revise menerima tiga hasil editorial ringkas menurut FR-05: kesesuaian
makna fakta dengan copy, caption tanpa klaim tambahan yang tidak didukung, dan
ketiadaan masalah substansi yang diketahui. `needs_revision` atau pelanggaran
keras menolak transaksi. Hasil `pass` dicatat pada revision/hash keluaran;
server menetapkan metrik renderer resmi. Saran gaya nonblocking dipisahkan.
Setujui memeriksa state terkini dan persetujuan eksplisit atas versi tepat,
tanpa membuka ulang semua URL. Revisi substansi pada `ready` kembali ke `draft`;
perubahan jadwal saja tetap mengikuti kontrak khusus yang berlaku.

Instruksi pembuatan merupakan target izin scoped untuk jumlah draft serta
plan/claim/renew/failure yang relevan, bukan izin Setujui, discard, koreksi,
publikasi, atau mutasi lain. Penyelarasan aturan izin tetap melalui change record.

### 2. Simpan atomik dan identitas bersama adalah baseline

`save_post_v2` menghasilkan tepat satu draft beserta resolusi identitas,
pengaitan, alokasi, penyelesaian item plan bila ada, dan hasil pemeriksaan dalam
satu transaksi. Kegagalan tidak meninggalkan post, fakta, atau alokasi parsial;
draft lain yang sudah berhasil tetap ada. Tidak ada panggilan reservasi paket
terpisah atau token reservasi pada alur v2.

Registry canonical dan pemetaan ID v1 harus mencakup fakta serta pemakaian lama
dan baru. Fakta invalidated/superseded/rejected tetap menjadi petunjuk riwayat,
bukan fakta layak pakai. Expiry v1 tidak dijadikan syarat v2; identitas fakta v1
yang hanya expired dapat dipakai menurut aturan PRD setelah riset URL baru.
Snapshot lama tidak ditulis ulang sebagai bukti v2. Reverify/koreksi mengikuti
FR-06, dengan izin koreksi terpisah dan snapshot terpublikasi tetap utuh.

Selama v1 masih menulis, perubahan identitas, koreksi, reservasi, dan pemakaian
v1 harus terlihat pada pemeriksaan lintas versi. Backfill sekali tanpa menjaga
konsistensi write berikutnya tidak cukup. Bentuk schema/helper sinkronisasinya
diputuskan pada P2/P3; tidak membuat registry identitas paralel.

Owner OAuth, scope workspace, RLS, grant default-closed, audit operasi,
idempotency, serta urutan lock tetap berlaku. Pertahankan enam digit mikrodetik
`config_updated_at` sebagai teks. Respons Write hilang direkonsiliasi atau
direplay dengan operation key dan payload semantik yang sama; perubahan payload
adalah operasi logis baru setelah state lama dipastikan. Revision/hash conflict
memerlukan pembacaan dan review baru.

### 3. Baseline concurrency: versi katalog sesuai PRD

**Pilihan A tetap baseline**, sesuai FR-03/FR-04 dan rencana P2-T3/P4-T1:

1. Read menghasilkan `complete` dan versi katalog workspace pada pandangan data
   yang konsisten. `complete=true` bukan jaminan semua parafrasa ditemukan.
2. Versi berubah pada perubahan identitas, status koreksi, atau alokasi yang
   relevan menurut kontrak PRD.
3. Save memeriksa versi yang sama di bawah lock workspace. Perubahan versi
   menolak save tanpa perubahan parsial dan meminta Read baru.
4. `complete=false`, hasil terpotong, dan review wajib yang belum selesai tidak
   boleh diperlakukan sebagai hasil bersih; calon diganti sesuai PRD.
5. Identitas dan reuse terkini tetap diperiksa; versi katalog tidak menggantikan
   validasi alokasi atau constraint.

Read ulang tidak otomatis berarti riset sumber ulang. Bila klaim dan dukungan
sumber tidak berubah, pemulihan tidak perlu membuang hasil riset/copy yang masih
sah. Penggantian fakta atau perubahan makna memerlukan penilaian ulang terkait.

### 4. Alternatif concurrency untuk evaluasi, bukan keputusan pengganti

| Pilihan                                      | Manfaat                                                                        | Risiko/biaya                                                                          | Status                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| A: versi katalog workspace                   | Kontrak sudah dijelaskan; perubahan state terdeteksi konservatif               | Perubahan tidak terkait dapat menyebabkan Read ulang                                  | Baseline PRD                                            |
| B: validasi kandidat relevan dalam transaksi | Dapat mengurangi penolakan tidak terkait dengan memakai pola resolver yang ada | Kandidat baru, perubahan makna/status, dan kelengkapan harus diperiksa tanpa celah    | Alternatif belum diputuskan                             |
| C: versi/lock per topik atau kata            | Potensi kontensi lebih kecil                                                   | Parafrasa melintasi partisi; protokol lock dan batas identitas lebih sulit dibuktikan | Tidak direkomendasikan pada tahap ini; tidak diterapkan |

Jika B kelak dipilih pemilik, rancangan yang perlu diuji adalah mempertahankan
lock workspace dan menjalankan ulang retrieval untuk fakta final di dalam
transaksi. Keputusan ringkas harus terikat pada kalimat calon, versi aturan
retrieval, serta ID dan versi makna kandidat yang ditinjau. Pemeriksaan hanya
terhadap daftar ID hasil Read lama tidak cukup: kandidat baru setelah Read juga
harus ditemukan. Penggunaan terkini selalu diperiksa langsung.

Perubahan yang tidak terkait tidak menggugurkan save. Kandidat relevan baru atau
perubahan dasar keputusan menghasilkan konflik terarah pada calon terdampak;
hasil tidak lengkap tetap menahan Write. Perubahan metadata tanpa perubahan
makna tidak otomatis membatalkan review kesamaan, tetapi tidak boleh melewati
kelayakan terkini. Bentuk referensi/fingerprint dan kebutuhan penyimpanannya
belum dipilih; tidak diasumsikan ada sesi, token, atau lease baru.

**B tidak menghapus atau mengganti aturan versi katalog sekarang.** P2-T3
menghasilkan perbandingan dan permintaan keputusan, bukan langsung mengaktifkan
B. Jika dipilih, perubahan FR-03/FR-04, kontrak contoh, serta override change
record harus disetujui sebelum implementasi penggantinya.

#### Matriks test pembeda A/B — seluruhnya NOT RUN

Gunakan fixture terisolasi, sesi database berbeda, sinkronisasi lock yang dapat
diamati, dan kedua urutan commit. `Promise.all` tanpa bukti overlap tidak cukup.
Jalankan data dan beban yang sama pada A/B; jangan mengubah threshold retrieval
untuk membuat salah satu menang.

| Kasus                                                       | Hasil yang harus dibuktikan                                                                                             |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Fakta tidak terkait berubah setelah Read                    | A menolak versi lama; B hanya boleh menerima bila seluruh pemeriksaan relevan lulus, tanpa riset ulang yang tidak perlu |
| Dua save, ID canonical sama, Page sama                      | Tepat satu alokasi yang diizinkan; transaksi kalah tidak meninggalkan data parsial                                      |
| ID sama, Page berbeda, `workspace_unique`                   | Tidak ada dua penggunaan yang melanggar scope                                                                           |
| ID sama, Page berbeda, `page_unique`                        | Keduanya boleh berhasil jika tidak ada penghalang lain                                                                  |
| Parafrasa baru yang termasuk kandidat retrieval             | Setelah transaksi pertama commit, transaksi kedua tidak membuat identitas/pemakaian baru tanpa review yang diperlukan   |
| Dua set tumpang tindih pada satu fakta                      | Seluruh transaksi draft yang kalah rollback, termasuk fakta lain dalam set                                              |
| Correction/invalidation setelah Read                        | Fakta yang tidak layak tidak lolos dengan keputusan lama                                                                |
| Kandidat baru/berubah menjadi relevan setelah Read          | B mendeteksinya walaupun ID tidak ada pada hasil Read lama                                                              |
| Read atau retrieval ulang tidak lengkap                     | Tidak ada keputusan bersih palsu atau Write yang melewati kelengkapan                                                   |
| Reservasi/save/koreksi v1 berhadapan dengan v2              | Registry, reservation, status, dan reuse lintas versi konsisten                                                         |
| Same-key concurrent replay; respons hilang setelah commit   | Satu mutasi dan satu hasil logis; readback menemukan post yang sama                                                     |
| Lock timeout, config berubah, atau kegagalan di tengah save | Penolakan aman, state konsisten, dan tidak ada retry dengan key/payload baru tanpa rekonsiliasi                         |

Ukur penolakan tidak relevan, Read ulang, riset ulang, waktu tunggu, deadlock,
dan state akhir. Toleransi penggunaan ganda yang melanggar scope serta data
parsial adalah nol untuk kasus yang diuji. Ambang manfaat/performa dan dataset
parafrasa ditetapkan sebelum evaluasi; hasil tidak boleh menjadi klaim dedup
100%. Hasil test adalah bahan keputusan pemilik, bukan persetujuan otomatis B.

### 5. Content plan tetap dipakai untuk beberapa draft

Keputusan produk ini tetap. Pencatatan hanya di chat tidak memenuhi kelanjutan
lintas percakapan; tracker baru mengulang fungsi yang sudah tersedia. Gunakan
satu content plan tanpa jadwal untuk dua draft atau lebih, jumlah item sesuai
permintaan, tema pada `plan_intent`, dan satu claim/item setiap giliran.

Save menyelesaikan item bersama draft secara atomik. Setelah save, `get_post`
membuktikan hasil, lalu progres plan dibaca sebelum melanjutkan. Item completed
berarti draft tersimpan, bukan ready/posted. Kelanjutan membaca plan lebih dulu;
completed tidak dibuat ulang. Lease 30 menit, satu renewal, failure/retry, dan
pilihan bila beberapa plan cocok mengikuti baseline. Discard bukan izin
replacement otomatis atau penambahan jumlah draft.

P4-T4/P7 harus mencakup respons create-plan hilang, terputus sesudah tiga dari
lima draft, save keempat commit tetapi respons hilang, readback gagal sementara,
claim expired/reclaimed, dan dua chat pada plan sama. Buktikan jumlah tetap,
hasil sebelumnya utuh, serta kelanjutan tidak menggandakan output. Satu draft
tanpa plan tetap memakai operation key dan readback menurut PRD.

### 6. Diagnostik seluruh tool; D1/D2 hanya pembagian internal

P6-T2 tetap satu task baseline dengan dua kelompok kerja:

- **D1:** seluruh tool pada jalur draft baru, termasuk bootstrap/context,
  plan/claim/recovery, dedup, save/revise, dan readback. Error jelas harus tersedia
  sejak jalur baru mulai diuji.
- **D2:** melengkapi seluruh tool lain yang masih tersedia, termasuk tool v1
  selama transisi, lifecycle, koreksi, publikasi manual, dan metrik.

Kelompok tersebut bukan dua komitmen rilis. **Rilis alur draft sebelum diagnostik
seluruh tool selesai belum disetujui.** Baseline penerimaan dan penyelesaian
proyek tetap memerlukan seluruh tool. Perubahan urutan rilis memerlukan keputusan
pemilik dan evaluasi dampak, bukan kesimpulan dari label D1/D2.

P1-T3 membekukan taksonomi dan contoh error sebelum coding. Kebutuhan baseline:
kode stabil, penjelasan sederhana, tool/tahap, lokasi yang aman bila diketahui,
retry/recovery yang konkret, waktu tunggu yang relevan, dan ID diagnostik aman
untuk kegagalan yang belum pasti. Bedakan input, perubahan data/benturan, akses,
rate limit/gangguan sementara, serta unknown. Jangan menebak akar sebab.

Untuk mencegah retry salah, desain pemetaan membedakan penolakan sebelum operasi
bisnis, rollback yang dipastikan, dan hasil Write yang belum dapat dipastikan
sesudah dispatch. Bentuk field final tetap keluaran P1-T3, bukan dibekukan oleh
dokumen ini. Output rusak/terlalu besar sesudah Write bukan bukti rollback.

Error v1 tetap kompatibel; field baru tidak dimasukkan sembarangan ke envelope
tertutup. MCP tetap adapter tipis. Host yang menolak sebelum MCP berjalan tidak
mempunyai respons MCP untuk diproyeksikan. Plugin memberi ringkasan Indonesia
berdasarkan bukti serta progres plan/readback, bukan menganggap handler error
mengetahui berapa draft sebelumnya sukses.

P6-T2/P7 menggunakan inventaris tool aktual dari registry, bukan denominator 33
permanen. Matriks setiap tool mencakup lapisan error yang berlaku, contoh
input/domain yang relevan, auth/owner denial, rate limit, response loss,
oversize/schema output, unknown, serta recovery. Kasus tidak berlaku diberi
alasan. Uji lintas lapisan juga memastikan ID dapat dicocokkan dengan log
tersanitasi, tanpa SQL mentah, credential/token, operation key privat, payload
panjang, atau data owner lain. Cakupan seluruh tool harus dapat diaudit.

### 7. Baseline pekerjaan tetap 8 fase / 23 task

Tabel ini memetakan penjabaran ke task yang sudah ada, bukan task list eksekusi
atau penggantian plan. Semua task belum dikerjakan pada langkah pencatatan ini.
Tidak ada usulan penambahan/pengurangan task atau fase dalam dokumen ini.

| Fase | Task baseline                 | Penjabaran pada task yang sama                                                                       |
| ---- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1    | P1-T1 Baseline                | Inventaris runtime/source/data/dependensi dan kebutuhan bukti penggunaan plugin lama                 |
| 1    | P1-T2 Change record           | Override kontrak sesuai PRD; alternatif katalog tidak dianggap diterima                              |
| 1    | P1-T3 Kontrak contoh          | Contoh satu/lima draft, error seluruh tool, hasil Write belum pasti, izin scoped dan gate Setujui    |
| 2    | P2-T1 Identitas               | Registry canonical lintas versi, status historis, reuse, dan konsistensi write v1 selama transisi    |
| 2    | P2-T2 Dataset dedup           | Baseline/holdout parafrasa dan salah gabung; ambang disetujui sebelum evaluasi                       |
| 2    | P2-T3 Kontrak Read            | Baseline `complete` + versi katalog; bandingkan A/B dan ajukan keputusan sebelum override            |
| 3    | P3-T1 Schema additive         | Schema/binding versi konten, ACL/RLS/grant, serta audit dampak migrasi                               |
| 3    | P3-T2 Backfill dan indeks     | Pemetaan idempoten, riwayat published/status koreksi, dan perubahan v1 yang masih berjalan           |
| 3    | P3-T3 Pencarian database      | Retrieval ringkas lintas versi, kelengkapan/versi katalog, batas output dan scope owner              |
| 4    | P4-T1 Simpan atomik           | Baseline PRD termasuk CAS katalog/config, URL, renderer, editorial, identitas/alokasi dan plan item  |
| 4    | P4-T2 Benturan dan replay     | Test sesi terpisah, race lintas versi, replay/lost response dan rollback tanpa data parsial          |
| 4    | P4-T3 Revisi dan baca         | CAS, perubahan fakta/URL, readback v1/v2, editorial revision/hash, approval invalidation dan discard |
| 4    | P4-T4 Beberapa draft          | Content plan tetap; jumlah, hasil sebagian, lease/failure dan resume pada batas operasi              |
| 5    | P5-T1 Gate Setujui v2         | Gunakan hasil editorial dari P4 dan validasi mekanis terkini; pisahkan saran gaya                    |
| 5    | P5-T2 Setujui/publikasi       | Gate menurut versi konten; tidak mengembalikan tier/expiry v1 pada v2; publikasi manual              |
| 5    | P5-T3 Koreksi fakta           | Reverify URL dan invalidasi/supersesi dengan izin terpisah serta snapshot historis utuh              |
| 6    | P6-T1 Tool v2                 | Tiga nama tool baru dan schema/output v2; kompatibilitas v1 selama transisi                          |
| 6    | P6-T2 Diagnostik seluruh tool | D1/D2 sebagai pembagian internal dalam task yang sama; bukti seluruh katalog wajib                   |
| 6    | P6-T3 Instruksi plugin        | Instruksi fleksibel, urutan riset/dedup/copy/save/readback, plan/resume dan ringkasan Indonesia      |
| 7    | P7-T1 Lokal/CI                | Test fokus/regresi/security, matriks A/B bila dievaluasi, serta gate G4 CR-052 exact-SHA             |
| 7    | P7-T2 Host terkendali         | Satu/beberapa draft, tool/schema nyata, hasil sebagian/recovery, error dan readback                  |
| 8    | P8-T1 Rollout                 | Backend sebelum plugin; rencana rollback kompatibel data dan kriteria cutover untuk review           |
| 8    | P8-T2 Retest live             | Bukti runtime/readback, pemantauan pemakaian dan keputusan pensiun pembuatan v1                      |

Hitungan fase tetap **3 + 3 + 3 + 4 + 3 + 3 + 2 + 2 = 23 task**. Dependensi plan
tetap; evaluasi B bukan izin melewati P1/P2 atau menunda D2 di luar penyelesaian
proyek. Bila kelak diperlukan pembagian baru, ajukan pemetaan lama ke usulan baru
beserta alasan, perubahan dependensi, dan acceptance untuk keputusan pemilik.

## Risks / Trade-offs

- [Payload lebih ringkas memindahkan penilaian makna ke ChatGPT] -> Backend tetap
  menegakkan identitas/pemakaian yang diketahui dan batas mekanis; dataset
  berlabel serta batas klaim retrieval tetap wajib.
- [Versi katalog baseline menyebabkan Read ulang tidak terkait] -> Bedakan Read
  dari riset ulang; evaluasi B dengan test yang sama tanpa mengaktifkannya lebih
  dulu atau mengurangi perlindungan baseline.
- [Registry/backfill tertinggal dari write v1] -> Uji race lintas versi dan audit
  pemetaan/pemakaian, termasuk reservasi aktif dan status koreksi historis.
- [Kompatibilitas menambah cabang lifecycle] -> Audit seluruh tool, pembacaan
  post lama, revisi, snapshot published, serta gate menurut versi konten.
- [Claim habis saat riset atau respons hilang] -> Reconcile plan/post dan replay
  operasi identik; uji expiry/reclaim serta larangan membuat ulang completed.
- [Error umum menyamarkan commit yang sudah terjadi] -> Pisahkan kepastian hasil
  dan recovery; jangan mengarahkan operation key baru untuk hasil belum pasti.
- [D1 dianggap menyelesaikan diagnostik] -> Matriks seluruh tool wajib; D2 tetap
  bagian penerimaan proyek dan urutan rilis terpisah memerlukan persetujuan.
- [Nol pemakaian v1 disimpulkan dari log kosong] -> Bukti observasi harus tersedia,
  memuat aktivitas v2 dan inventaris instalasi, serta membedakan maintenance v1.

## Migration Plan

### Gate rilis yang berlaku

Rujukan gate mengikuti [testing](../../../docs/testing.md),
[operations](../../../docs/operations.md), dan
[CR-052](../../../docs/decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md):
G4 Actions `backend-gate-candidate.yml` manual pada exact final SHA `main`,
committed config, input/checkout SHA sama, source, dua stack/shard terisolasi,
serta aggregate PASS dengan report/hash yang cocok. Kedua shard memerlukan
migration history/names, lint, local security advisors terpisah, audit
ACL/grant/RLS/fixture, dan cleanup.

Baseline G4 saat ini adalah DB 41 file/182 kasus (19+22), MCP 15 file/82 kasus,
dan authenticated Inspector 33 valid/33 invalid + owner denial. Implementasi v2
harus memperbarui inventaris/manifest yang terdampak dan menambahkan cakupannya,
bukan membekukan hitungan lama sehingga test/tool baru terlewat. Workflow legacy
dan `test-all` tetap untuk rollback. PASS lokal dengan diagnostic config overlay
bukan bukti rilis formal exact-config.

Pada eksekusi mendatang, lakukan preflight durasi/SHA/scope, check source dan
test fokus yang relevan, lalu gate rilis yang diwajibkan sebelum deployment
berizin. Reuse mengikuti syarat kesamaan backend/security/dependency; SHA merge
berbeda bukan exact-SHA PASS otomatis. Aturan pemantauan lebih dari 10 menit
tetap berlaku. Tidak ada gate yang dijalankan oleh pencatatan ini.

### Urutan baseline dan usulan pemeriksaan transisi

1. Selesaikan baseline, change record yang diterima, kontrak contoh, dan keputusan
   identitas/retrieval sesuai P1/P2 sebelum coding kontrak baru.
2. Terapkan schema additive/backfill dan backend kompatibel v1/v2; verifikasi
   source, fixture/security dan host terkendali sesuai P3-P7.
3. Penuhi diagnostik seluruh tool menurut baseline penerimaan. Pemisahan rilis
   yang mendahulukan alur draft belum menjadi keputusan.
4. Sesudah izin rilis, backend mendahului plugin v2. Catat versi runtime dan
   backend/plugin SHA terpisah; lakukan retest/readback pada objek yang diizinkan.
5. Observasi dan tinjau kriteria cutover di bawah, lalu minta keputusan eksplisit
   pemilik sebelum menghentikan jalur pembuatan v1.

### Usulan kriteria cutover untuk ditinjau, belum diterima

| Area                  | Ukuran/bukti yang diajukan                                                                                                                             | Keputusan yang masih diperlukan                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Keberhasilan v2       | Skenario satu draft, lima draft bertema, serta hasil sebagian/resume dengan jumlah dan readback cocok; zero duplicate/partial mutation pada test wajib | Setujui paket skenario, jumlah pengulangan dan bukti host/LIVE yang cukup    |
| Kualitas retrieval    | Dataset berlabel lintas versi, recall parafrasa/salah gabung dan kelengkapan hasil                                                                     | Ambang serta ukuran dataset ditetapkan sebelum evaluasi                      |
| Pemulihan             | Lost response, same-key replay, lease expired, config/revision conflict tanpa output ganda                                                             | Setujui cakupan latihan dan kriteria lolos                                   |
| Post lama             | Fixture status draft/ready/posted/archived/discarded; readback dan lifecycle yang berlaku; snapshot/sumber/approval/metrik historis terjaga            | Setujui inventaris fixture dan cakupan sampel data lama yang diizinkan       |
| Pemakaian plugin lama | Inventaris instalasi aktif, pengamatan panggilan pembuatan v1/v2, dan penjelasan untuk setiap pemakaian lama yang tersisa                              | Putuskan cara observasi, periode aktif dan ambang penggunaan sebelum pensiun |
| Rollback              | Latihan pada data campuran, readback v2 dan progres plan tetap benar; hasilnya direkam                                                                 | Setujui target rilis kompatibel, pemicu rollback dan scope latihan           |
| Backend/security      | Gate exact-SHA serta audit migrasi/security yang berlaku; runtime retest diketahui                                                                     | Verifikasi bukti pada kandidat final dan izin tindakan rilis secara terpisah |

Angka **7 hari dan 3 chat baru** hanya contoh ambang observasi yang pernah
diusulkan; **belum diterima dan bukan gate aktif**. Log kosong atau periode tanpa
pekerjaan tidak membuktikan plugin lama sudah tidak dipakai. Versi plugin atau
User-Agent yang dilaporkan client bukan satu-satunya dasar. Metode observasi
tersanitasi harus dibahas pada P1-T1/P8 dan tidak mencatat token, operation key
privat, atau payload. Aktivitas revisi/maintenance post v1 dibedakan dari
pembuatan baru v1. Bukti yang tidak tersedia berarti kriteria belum terbukti,
bukan PASS.

Pensiun pembuatan v1 tidak otomatis menghapus seluruh tool lama. Audit khususnya
dependensi register/reserve/release pada revisi post v1, pekerjaan in-flight,
replay historis, serta plugin terpasang sebelum menentukan apa yang dinonaktifkan.
Panggilan lama yang tidak didukung harus mendapat diagnostik jelas. Tidak ada
tenggat atau daftar penghapusan tool yang ditetapkan sekarang.

### Rancangan rollback untuk review

Usulkan target rollback yang sudah kompatibel dengan schema/data v2, bukan
sembarang binary sebelum v2. Migration additive dan post v2 yang telah tersimpan
tetap dipertahankan. Latihan harus membuktikan penghentian pembuatan baru bila
diperlukan, keterbacaan/pengelolaan v1/v2, serta kelanjutan plan tanpa duplikasi.
Mengaktifkan kembali pembuatan v1 hanya layak bila target itu telah diuji terhadap
registry/pemakaian bersama. Jangan menganggap rollback plugin cukup jika backend
tidak lagi mendukung inputnya. Target, mekanisme pengendali, pemicu, dan izin
rollback belum diputuskan; rancangan ini bukan izin deploy atau mutasi.

## Ringkasan status keputusan

### Keputusan yang sudah disetujui

- Tujuan produk PRD: instruksi fleksibel satu/beberapa draft, Page/tema sesuai
  konfigurasi, riset kalimat + satu URL per fakta, dedup sebelum copy final,
  penggantian calon bermasalah, save atomik tanpa reservasi paket terpisah, dan
  readback setiap draft.
- Content plan tetap untuk dua draft atau lebih; hasil sebagian dan resume tidak
  menggandakan draft. Setujui terpisah setelah pemeriksaan lulus; publikasi serta
  metrik manual. Diagnostik **seluruh tool** wajib.
- Tidak mengembalikan tier/expiry/ontologi input v2, riset ulang URL saat Setujui,
  atau kewajiban tahun pada copy. Data/riwayat v1 tetap terbaca dengan arti lama;
  jalur pembuatan v1 hanya selama transisi.
- PRD adalah acuan kebutuhan dan plan 8 fase/23 task adalah baseline pekerjaan.
  **Aturan versi katalog tetap baseline**, bukan diganti oleh alternatif B.
- Rujukan rilis mengikuti G4 CR-052 manual exact-SHA yang berlaku. Scope langkah
  ini hanya proposal/design dan metadata scaffold, bukan implementasi atau
  penerimaan override kontrak.

### Alternatif teknis yang masih terbuka

- B: validasi kandidat relevan di dalam transaksi, bentuk referensi review dan
  kelengkapannya; belum mengganti A dan harus dibandingkan dengan race nyata.
- Detail schema/pemetaan/sinkronisasi registry lintas versi dan pemeliharaan post
  lama, mengikuti kebutuhan P2/P3 dan tanpa mengubah keputusan produk.
- Metode pengukuran penggunaan lama, target/mekanisme rollback kompatibel, serta
  batas tepat tool v1 yang dapat dipensiunkan tanpa merusak maintenance/replay.
- D1/D2 sebagai pemetaan internal boleh digunakan; rilis terpisah yang
  mendahulukan alur draft tetap alternatif yang belum disetujui.

### Hal yang memerlukan keputusan pemilik

1. Setelah hasil perbandingan tersedia: tetap memakai A atau menerima B beserta
   perubahan kontrak yang tepat? Tidak ada penggantian sebelum keputusan dan
   change record diterima.
2. Apa dataset/ambang retrieval, ambang manfaat A/B, serta paket skenario dan
   pengulangan host/LIVE yang disepakati sebelum evaluasi?
3. Apa periode observasi aktif, ukuran penggunaan plugin lama, kriteria cutover,
   target serta pemicu rollback, dan batas penghentian pembuatan v1 yang diterima?
   Contoh 7 hari/3 chat belum menjadi persetujuan.
4. Jika kelak diusulkan rilis alur draft sebelum D2 selesai, apakah urutan itu
   diterima dengan dampak dan kriteria penyelesaian seluruh tool yang eksplisit?
   Sampai ada keputusan, baseline seluruh tool tetap dipertahankan.
5. Jika ada kebutuhan mengubah 8 fase/23 task, apakah pemetaan lama ke usulan baru
   berikut alasan/dependensinya diterima? Saat ini tidak ada perubahan pembagian.

Pertanyaan tersebut adalah batas persetujuan berikutnya, bukan keputusan yang
dianggap selesai atau task tambahan yang sudah diotorisasi. Bila penjabaran
berikutnya bertentangan dengan PRD/plan, hentikan pencatatan keputusan terkait dan
tanyakan kepada pemilik sebelum melanjutkan.
