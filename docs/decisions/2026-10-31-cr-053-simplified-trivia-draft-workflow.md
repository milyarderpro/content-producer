# CR-053 — Alur draft trivia sederhana dan diagnostik seluruh tool

**Status:** **Accepted — baseline A (versi katalog workspace)**.
**Tanggal:** 31 Oktober 2026.
**Change:** `simplify-trivia-draft-workflow`, P1-T2.

**Otoritas penerimaan:** pemilik secara eksplisit menerima CR-053 dalam bentuknya
saat diajukan sebagai dasar perubahan kontrak v2 dengan baseline A pada
31 Oktober 2026. Penerimaan ini bukan bukti implementasi atau perubahan runtime.
Ketidakpastian runtime dan plugin aktif pada P1-T1 tetap belum terverifikasi.
Alternatif B, angka 7 hari/3 chat, rilis D1 sebelum D2, penghentian pembuatan v1,
deployment, dan Write production **tidak disetujui** oleh penerimaan ini.
Instruksi sesi berikutnya hanya menyelesaikan P1-T3, bukan Phase 2 atau
implementasi backend/tool; izin tindakan lain tetap terpisah.

## 1. Dasar kebutuhan dan bukti

- [PRD alur draft sederhana](../../plans/simplified-trivia-draft-workflow-prd.md)
  adalah acuan hasil dan batas produk; [plan](../../plans/simplified-trivia-draft-workflow-implementation-plan.md)
  tetap baseline **8 fase/23 task**.
- [Proposal](../../openspec/changes/simplify-trivia-draft-workflow/proposal.md),
  [design](../../openspec/changes/simplify-trivia-draft-workflow/design.md), serta
  delta specs pada change memisahkan kebutuhan produk dari alternatif yang belum
  diputuskan. Klarifikasi terakhir membatasi kewajiban ID sama pada kesamaan yang
  ditemukan/diputuskan, mengganti calon `same` dengan fakta tidak layak, dan
  membedakan replay sukses dari save baru dengan claim kedaluwarsa.
- [Baseline P1-T1](../../openspec/changes/simplify-trivia-draft-workflow/phase-1-baseline.md)
  ditinjau pada source `3b385a679770e20c5ba193b470874a35c08b786a`:
  33 tool baseline, 72 migration source, kandidat plugin 0.2.11. Source SHA dan
  nomor versi tersebut bukan bukti deployment/instalasi live sekarang.
- Issue #26 historis berhenti pada dedup Read; reserve/save tidak dipanggil.
  Record editorial v1 kemudian memuat save/readback sukses pada kasus berbeda.
  Tidak ada generalisasi akar sebab, bukti v2 LIVE, atau klaim `FIXED` dari record ini.

## 2. Override yang diterima

Seluruh butir berikut adalah **dasar kontrak v2 yang diterima, dengan perilaku
runtime masih menunggu implementasi dan verifikasi**. Kontrak frozen tidak diedit
dan semantik v1 tidak diubah mendadak.

### 2.1 Sumber minimum dan editorial publik v2

**Acuan yang disesuaikan untuk v2:** PRD lama §16; tool inventory §6.8 dan
§12.2/12.4/12.5; module contract §15; database design §8 dan §12–15; bagian
sumber/freshness dan §19 trivia content DNA.

- Fakta final v2 cukup kalimat dan tepat satu `source_url` web `http`/`https`,
  tanpa credential/alamat lokal, dengan batas ukuran pada kontrak teknis.
- Tidak mewajibkan tier, source type, judul, penerbit, independence group,
  risk/freshness class, expiry, atau paket sumber rinci pada alur v2. Ini bukan
  alasan menghapus evidence v1 atau menganggap evidence lama sudah menjadi v2.
- ChatGPT membuka/menilai dukungan sumber saat riset; backend memvalidasi bentuk
  dan konsistensi, bukan membuktikan isi URL. Catatan pendek opsional; timestamp
  simpan bukan tanggal verifikasi. Setujui tidak meriset ulang semua URL.
- Tidak mewajibkan tahun atau frasa akademik pada setiap copy. Semua topik Page
  memakai alur umum, tanpa jalur sumber khusus hanya karena kategorinya; akurasi
  dan kebijakan keselamatan umum tetap berlaku. Bila konteks yang diperlukan
  terlalu panjang, pilih sudut/fakta lain yang tetap benar.

### 2.2 Dedup sederhana dengan identitas dan riwayat bersama

**Acuan yang disesuaikan untuk input/retrieval v2:** tool inventory §11–12;
module contract §13; database design §11; PRD lama §17; CR-005/012 dan FIX-37
tetap menjelaskan makna identity v1, bukan kewajiban mengisi ontologi pada v2.

- `trivia_find_similar_facts_v2` menerima Page dan kalimat calon tanpa input
  ontologi 17 relation key atau angka/qualifier terstruktur. Hasil ringkas
  menunjukkan ID, klaim, status/kelayakan, dan pemakaian yang relevan.
- Pencarian mendahului copy final. ChatGPT memutuskan `same`/`distinct`/
  `uncertain`; ketidakpastian, penggunaan terlarang, atau hasil tidak lengkap
  memicu penggantian calon, bukan pemaksaan `distinct` atau review panjang.
- Jika kecocokan ditemukan dan kesamaan diputuskan, referensi canonical yang
  sama dipakai. Proposisi berbeda tidak digabung hanya karena subjek/URL sama.
  Tidak ada jaminan seluruh parafrasa ditemukan atau dedup semantik 100%.
- Satu registry canonical dengan pemetaan v1 yang eksplisit mencakup fakta dan
  pemakaian lintas versi. `same` dengan invalidated/superseded/rejected diganti;
  tidak memakai fakta tidak layak atau membuat ID pengelak riwayat. Expired-only
  v1 dapat memakai identitas lama pada v2 setelah riset URL baru, bila syarat
  lain mengizinkan, tanpa expiry sebagai syarat baru v2.
- **Baseline A tetap:** Read mengembalikan `complete` dan versi katalog workspace.
  Versi berubah pada perubahan identitas, koreksi, atau alokasi yang relevan;
  save baru memeriksa versi yang sama di bawah lock workspace. Versi stale
  menolak transaksi dan meminta Read baru. Read ulang tidak otomatis riset ulang
  sumber yang masih sah. Aturan retrieval dan dataset/ambang dibekukan pada P2.
- Alternatif B, validasi kandidat relevan, **tidak diterima oleh record ini**.
  Memilihnya kelak memerlukan test pembeda nyata, keputusan pemilik, serta
  perubahan kontrak yang tepat; tidak ada pengecualian katalog yang diaktifkan diam-diam.

### 2.3 Save/revise atomik tanpa reservasi paket v2

**Acuan yang disesuaikan untuk v2:** PRD lama §17.4 dan §20; tool inventory
§12.2/12.3, §14–15 dan §19; module contract §14 dan §17; database design §12–14;
CR-012/013 tetap menjaga lock, CAS, idempotency, dan semantik riwayat yang relevan.

- `save_post_v2` meresolusi identitas, memeriksa katalog/config/reuse, mengaitkan
  fakta, mengalokasikan, menyimpan tepat satu post `draft`, dan menyelesaikan
  item plan terkait secara atomik. Tidak ada register/reserve paket terpisah
  atau reservation token pada alur v2; bukan transaksi gabungan semua draft.
- Kegagalan satu fakta membatalkan seluruh perubahan bisnis draft itu. Draft
  lain yang telah sukses tetap ada. Draft teralokasi dihitung sebagai pemakaian;
  tidak ada dua penggunaan serentak yang melanggar scope Page/workspace.
- Revisi kata dengan makna sama mempertahankan identitas. Perubahan makna atau
  penggantian fakta menjalani riset/dedup baru dan pengaitan atomik; URL makna
  sama pada draft belum terbit dapat diperbarui tanpa ID baru.
- Discard melepaskan alokasi belum terbit tanpa menghapus riwayat atau membuat
  replacement otomatis. Published usage serta snapshot historis tidak dihapus.
- Save baru memakai claim sah bila terkait plan. Replay save yang sudah commit
  tetap mengembalikan hasil operasi tersimpan dengan operation key/payload
  semantik identik walau claim sudah expired, setelah otorisasi dan tanpa mutasi
  bisnis baru. Key baru dengan claim expired bukan replay dan tetap ditolak.

### 2.4 Izin instruksi dan beberapa draft

**Acuan yang diselaraskan:** workflow pengguna produksi/batch/beberapa chat;
PRD lama §20–22; tool inventory §6.6, §10 dan §19; aturan instruksi plugin v1.

- Instruksi biasa menentukan Page, jumlah draft dan tema; tunggal tanpa angka
  berarti satu, sedangkan jumlah/Page ambigu diklarifikasi sebelum Write.
  Jumlah mengikuti batas plan aktif, saat ini 100; tidak dipotong diam-diam.
- Target izin terbatas pada sebanyak draft yang diminta dan fakta/copy yang
  dihasilkan untuk Page tersebut. Untuk dua atau lebih draft, cakupannya termasuk
  satu plan tanpa jadwal serta claim/renew/failure yang relevan, satu item tiap
  giliran. Host approval dan otorisasi server tetap berlaku.
- Izin itu tidak meliputi Setujui, discard, correction, replacement, pencatatan
  publikasi, atau tindakan lain yang memerlukan perintah terpisah.
- Riset calon cadangan, dedup, penggantian calon, copy, save, dan readback
  dilakukan per draft. `get_post` wajib sesudah setiap save; plan/progres dibaca
  sebelum item berikutnya dan sebelum melanjutkan chat baru. Completed berarti
  draft tersimpan, bukan ready/posted; hasil sebagian dilaporkan tanpa duplikasi.

### 2.5 Kualitas dan Setujui menurut versi konten

**Acuan yang disesuaikan untuk gate v2:** PRD lama §25; tool inventory §6.9 dan
§15.4/15.7; module contract §12 dan §15; database design §15; trivia DNA §19;
CR-014 tetap acuan approval, warning, publikasi, dan snapshot v1.

- Struktur/URL/identitas/reuse/jumlah/format atau hard budget yang gagal menolak
  save/revise tanpa post/revisi parsial. Server menghitung metrik renderer resmi.
- Tiga hasil editorial per draft harus `pass`: kesesuaian makna fakta–copy,
  caption tanpa klaim tambahan yang belum didukung, dan ketiadaan masalah
  substansi yang diketahui. Hasil terikat revision/hash keluaran;
  `needs_revision` menolak perubahan. Saran gaya nonblocking dipisahkan.
- Setujui tetap perintah eksplisit atas versi/hash yang ditinjau dan mengecek
  state terkini secara atomik. Semua pemeriksaan wajib v2 harus lulus; tidak
  menghidupkan lagi paket sumber, tier/expiry, atau 18 kriteria v1 untuk v2.
- Revisi substansi membatalkan approval; kontrak schedule-only tetap khusus.
  Publikasi membutuhkan ready yang masih sah dan konfirmasi peristiwa manual.
  Tidak ada publikasi otomatis, URL/ID/angka metrik rekaan, atau riset ulang URL
  otomatis saat Setujui/publikasi.

### 2.6 Versi, kompatibilitas, dan diagnostik seluruh tool

**Acuan yang dilengkapi:** tool inventory §6.5, §18, §21 dan §24;
module contract §6 dan §18; database design §17; CR-049/050/051.

- Tiga input yang berubah besar memakai nama v2 berbeda. Tool v1 tetap
  kompatibel selama transisi. Read/lifecycle bersama mengenali versi konten;
  data/approval/snapshot v1 tetap berarti sesuai kontraknya.
- Seluruh tool aktual mendapat diagnostik yang membedakan input, benturan/data
  berubah, akses, rate limit/gangguan sementara, dan internal belum terdiagnosis.
  Respons menjelaskan tool/tahap, lokasi yang aman bila diketahui, retry/recovery,
  waktu tunggu, dan ID diagnostik yang diperlukan tanpa menebak akar sebab.
- Bedakan penolakan sebelum operasi bisnis, rollback pasti, dan hasil Write
  yang belum pasti. Output rusak/oversize atau respons hilang setelah dispatch
  tidak otomatis berarti rollback; rekonsiliasi dahulu, replay hanya key/payload
  identik. Konflik CAS memerlukan Read/review baru.
- Error v1 tetap kompatibel; nama kode/field/envelope final dan contoh lintas
  tool menjadi keluaran P1-T3, bukan diimprovisasi per handler. Penolakan host
  sebelum MCP tidak diberi `structuredContent` atau diagnosis database rekaan.
- Penjelasan pemilik berbahasa Indonesia, menyebut bukti progres dari plan/
  readback. Respons/log tidak memuat rahasia, operation key privat, SQL mentah,
  payload panjang, atau data owner lain.
- D1/D2 hanya pembagian internal P6-T2. Diagnostik seluruh tool tetap wajib;
  **rilis alur draft sebelum D2 selesai tidak disetujui oleh record ini**.

## 3. Aturan yang tidak dioverride

- Owner OAuth default, workspace scope, RLS, penutupan grant anon langsung,
  token/secret privacy, audit, idempotency, CAS, urutan lock, dan presisi enam
  digit mikrodetik `config_updated_at` tetap berlaku. Tidak membuka fixed-pilot
  atau grant historis untuk memudahkan v2.
- Migration additive; tidak menulis ulang migration terpasang atau snapshot
  historis. Core/niche database memegang transaksi; MCP tetap adapter tipis.
- Tidak menambah OpenAI API, embeddings/vector search, worker AI, dashboard,
  desain/publikasi otomatis atau pengambilan metrik Facebook.
- [G4 CR-052](2026-10-29-cr-052-full-backend-gate-equivalence.md) manual exact
  final SHA `main` dengan committed config, source, dua shard dan aggregate PASS
  tetap gate rilis. Suite/Inspector/audit diperluas untuk v2 tanpa mengurangi
  cakupan. Legacy/test-all tetap rollback; PASS bukan izin deployment atau LIVE.

## 4. Keputusan yang tetap terbuka

1. Pilihan alternatif B setelah hasil pembanding; baseline A tidak diganti.
2. Dataset, aturan retrieval terperinci dan ambang evaluasi sebelum P2/P3.
3. Bentuk schema/registry dan detail pemetaan additive pada P2/P3; tidak membuat
   identitas paralel atau membiarkan write v1 tidak terlihat setelah backfill.
4. Kriteria cutover, observasi plugin lama, target/pemicu rollback, serta batas
   penghentian pembuatan v1. Angka 7 hari/3 chat tetap usulan, bukan syarat aktif.
5. Setiap perubahan urutan rilis D1/D2 atau pembagian 8 fase/23 task.

Pembuatan v1 tidak dipensiunkan hanya karena v2 tersedia. Kriteria terukur harus
diterima dan dibuktikan, meliputi alur v2/readback, kompatibilitas post lama,
pemakaian plugin lama, dan latihan rollback. Pensiun creation tidak otomatis
menghapus maintenance/replay v1 yang masih diperlukan. Data campuran dan plan
in-flight harus tetap dapat dipulihkan pada target kompatibel yang disetujui.

## 5. Bukti penerimaan dan status Phase 1

- Bukti saat ini: inventaris P1-T1 dan verifikasi kontrak/mock P1-T3. Tidak ada
  implementasi v2 atau test transaksi/retrieval/host/LIVE baru.
- **P1-T2 diterima** melalui pernyataan eksplisit pemilik pada 31 Oktober 2026,
  bukan karena keberadaan file, validasi format, CI, atau perintah apply.
- **P1-T3 selesai pada lapisan kontrak/fixture** dengan versi `cr-053-p1-v1`:
  [kontrak contoh](../contracts/trivia-draft-v2.md),
  [taksonomi seluruh tool](../contracts/tool-errors-v2.md), schema/fixture dan
  test lokal. [Hasil Phase 1](../../openspec/changes/simplify-trivia-draft-workflow/phase-1-results.md)
  membedakan bukti source/fixture dari backend dan LIVE. Pembekuan contoh ini
  tidak menyelesaikan keputusan retrieval/schema database P2/P3.
- Setelah implementasi yang diotorisasi, syarat bukti mencakup test fokus pada
  tiap perubahan, test race sesi terpisah, rollback/no-partial mutation,
  compatibility/owner denial, diagnostik seluruh tool, G4 exact-SHA, dan retest
  host/LIVE dengan readback pada objek berizin. Pemeriksaan backend/race/G4/LIVE
  v2 tetap NOT RUN; unit/fixture kontrak P1 dilaporkan terpisah.

Penerimaan P1-T2 mengizinkan penyelesaian kontrak contoh dan verifikasi P1-T3
sesuai instruksi pemilik berikutnya. Keputusan terbuka di §4 dan batas tindakan
di atas tetap berlaku; tidak ada izin Phase 2 atau tindakan production tersirat.
