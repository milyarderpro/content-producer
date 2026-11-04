# CR-054 — V2 utama dan arah pensiun pembuatan draft v1

**Status:** **Accepted — arah produk dan pengecualian kompatibilitas Read v1
terbatas; bukan otorisasi cutover runtime**.
**Tanggal pencatatan:** 1 November 2026.
**Change/task:** `simplify-trivia-draft-workflow`, P2-T1 / checklist 2.1.
**Penelusuran:** [Issue #108](https://github.com/milyarderpro/content-producer/issues/108)
dan [PR #109](https://github.com/milyarderpro/content-producer/pull/109).

## 1. Otoritas, konteks opsi 2, dan urutan keputusan

Pada review [desain identitas P2-T1](../contracts/trivia-fact-identity-v2.md),
dijelaskan bahwa opsi 2 menerima kemungkinan pencarian plugin lama berhenti
ketika kandidat fakta v2-native yang wajib diperiksa tidak mempunyai representasi
ontologi v1 yang sah. Success output Read v1 mewajibkan `material_identity`;
mengisinya dengan ontologi rekaan atau menyembunyikan kandidat akan memberi
gambaran bersih yang tidak jujur. Pemilik kemudian menyatakan:

> saya memilih versi baru mungki opsi 2 karean versi lama harus pensiun

Instruksi pencatatan dari koordinator merumuskan keputusan pemilik menjadi
butir §2–4 di bawah. **V2 sebagai alur utama dan arah pensiun creation v1
diterima**, tetapi eksekusi cutover belum diotorisasi dan kriterianya belum
terbukti. Penerimaan keputusan ini berasal dari pernyataan pemilik tersebut,
bukan dari keberadaan dokumen, CI PASS, atau merge PR.

Dasar sebelumnya adalah
[CR-053](2026-10-31-cr-053-simplified-trivia-draft-workflow.md),
[PRD](../../plans/simplified-trivia-draft-workflow-prd.md),
[implementation plan](../../plans/simplified-trivia-draft-workflow-implementation-plan.md),
serta [TDW-16/17](../../openspec/changes/archive/2026-11-03-simplify-trivia-draft-workflow/specs/trivia-draft-workflow/spec.md#requirement-tdw-16-tool-v2-terpisah-dan-post-v1-tetap-kompatibel).
CR-053 dan [hasil Phase 1](../../openspec/changes/archive/2026-11-03-simplify-trivia-draft-workflow/phase-1-results.md)
tetap merekam keadaan historisnya: keputusan terbaru ini **bukan** penerimaan
yang sudah terjadi pada Phase 1. Record/fixture P1 tidak ditulis ulang.

## 2. Keputusan dan override kompatibilitas yang terbatas

1. **V2 menjadi alur utama untuk pembuatan draft.** Ini arah produk yang akan
   diwujudkan setelah implementasi, verifikasi dan izin rilis yang relevan;
   bukan pernyataan bahwa tool/backend/plugin v2 sekarang sudah tersedia.
2. **Read v1 boleh menolak secara aman** dengan `FACT_REVIEW_REQUIRED` bila
   kandidat yang wajib diperiksa adalah fakta v2-native tanpa representasi
   ontologi v1 yang sah. Discovery tetap memperhitungkan identitas serta
   penggunaan kandidat itu. Penolakan ini tidak mengizinkan hasil bersih palsu,
   ontologi rekaan, pengabaian dedup atau pembuatan ID paralel untuk makna sama.
3. **Tidak perlu memperluas success output v1** semata-mata agar mendukung penuh
   fakta v2-native. Success projection native lengkap bukan blocker wajib
   P2-T1. Bila representasi v1 sah sudah tersedia, request yang dapat diproses
   dengan benar tetap mengikuti kontrak v1; tidak ada penolakan massal request
   atau penghentian seluruh tool v1 melalui pengecualian ini.
4. **Override tepat:** tuntutan kompatibilitas fungsional creation v1 selama
   transisi pada CR-053 §2.6 dan TDW-16 dibatasi oleh kasus Read pada butir 2.
   Kelangsungan success alur creation v1 tidak diwajibkan untuk kasus native
   tersebut. Kompatibilitas envelope/error v1, pengamanan identity/reuse,
   keterbacaan serta pengelolaan post/data lama yang masih diperlukan tetap
   wajib. Input/success output v1 yang sah tidak diganti menjadi schema v2.

Override ini tidak mengubah desain satu registry canonical, ID v1 stabil,
evidence/binding menurut versi, snapshot/status/lineage, shared usage,
reservasi aktif, no-gap writes, lock/CAS/idempotency atau baseline **A**.
URL v2 tetap bukan paket sumber v1. Detail desainnya tetap pada dokumen
identitas; record ini tidak membuat migration, validator atau RPC.

## 3. Penolakan terarah dan recovery yang aman

- Pertahankan `isError` dan envelope error v1 dengan code/message/retryable/
  recovery sesuai [kontrak error](../contracts/tool-errors-v2.md#1-canonical-diagnostic-dan-bentuk-pengiriman).
  Gunakan kode existing `FACT_REVIEW_REQUIRED`; jangan mengganti kasus yang
  diketahui ini dengan error umum atau menambah field ke object tertutup.
  Pesan menyebut bahwa pencarian v1 tidak dapat menyajikan kandidat wajib secara
  sah, disertai lokasi calon yang aman bila diketahui, tanpa data privat.
- Hentikan penggunaan calon itu melalui hasil Read yang gagal; jangan
  memperlakukannya sebagai dedup selesai, memaksa `distinct`, melewatkan review,
  atau terus mengulang request identik yang tidak menyelesaikan penyebabnya.
  Calon pengganti hanya boleh dipakai setelah riset dan Read baru yang sah;
  parafrasa/ID baru untuk melewati history bukan recovery.
- Alur v2 hanya dapat diarahkan sebagai langkah operasional setelah ketersediaan
  tool, runtime, plugin dan izin yang diperlukan benar-benar terverifikasi.
  Bila belum, jelaskan bahwa jalur creation ini berhenti dan ketersediaan v2
  belum terbukti; jangan menginstruksikan pemanggilan tool v2 seolah sudah
  terpasang. Pemeriksaan/rollout berikutnya memerlukan scope tersendiri.
- Bedakan kegagalan Read dari respons Write yang hilang. Untuk Write yang
  mungkin sudah commit, rekonsiliasi state atau replay key/payload semantik
  identik terlebih dahulu; pindah versi atau key baru bukan alasan membuat
  draft kedua. Penolakan Read sendiri bukan bukti hasil Write sebelumnya.

Ini kontrak perilaku yang diterima untuk implementasi mendatang, **bukan bukti
bahwa adapter/runtime sekarang sudah mengirim penolakan dan recovery tersebut**.

## 4. Hubungan TDW-17, cutover, dan perlindungan data

**Arah produk:** pembuatan draft v1 dipensiunkan setelah v2 siap dan
terverifikasi. **Pelaksanaan:** belum diotorisasi oleh record ini. TDW-17 tetap
menuntut kriteria terukur yang diterima dan bukti pelaksanaannya; keputusan arah
tidak sama dengan bukti cutover atau izin menonaktifkan runtime sekarang.

- Identitas, fakta, post, sumber/snapshot, approval dan riwayat lama dipertahankan
  dengan arti versinya. Pengelolaan post lama yang masih diperlukan harus tetap
  berfungsi; pensiun creation bukan penghapusan semua tool v1 atau data lama.
- Replay historis, plan/claim/reservasi yang masih relevan dan pekerjaan
  in-flight tidak boleh rusak. Keputusan cutover harus mencakup pemulihan data
  campuran dan target rollback yang kompatibel, bukan menganggap rollback
  plugin saja pasti cukup.
- Kriteria terperinci, observasi penggunaan, target/pemicu rollback dan tanggal
  penghentian masih memerlukan keputusan/bukti. Tidak ada angka observasi,
  termasuk contoh 7 hari/3 chat, atau tanggal cutover yang diterima sekarang.
  Log kosong bukan bukti penggunaan v1 nol.
- [G4 CR-052](2026-10-29-cr-052-full-backend-gate-equivalence.md) manual exact-SHA
  dan aggregate PASS tetap gate rilis backend sesuai [testing](../testing.md)
  serta [operations](../operations.md). Izin merge, deploy, pemasangan plugin,
  hosted OAuth dan production Write tetap terpisah. CI dokumen bukan gate rilis
  backend, izin cutover atau LIVE PASS.
- Baseline A tidak diganti B; diagnostik seluruh tool tetap wajib dan tidak ada
  izin rilis D1 sebelum D2. Pembagian **8 fase/23 task** tetap.

## 5. Handoff penyelarasan OpenSpec kepada koordinator

Artefak berikut perlu diselaraskan koordinator setelah review record ini.
Daftar ini bukan perubahan artefak atau checkbox yang dilakukan implementer:

| Artefak                                                                                                                                                                  | Penyelarasan yang diperlukan                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [proposal](../../openspec/changes/archive/2026-11-03-simplify-trivia-draft-workflow/proposal.md)                                                                                            | Catat v2 utama, arah pensiun creation v1 dan pengecualian Read terbatas; pertahankan data/maintenance serta batas otorisasi.                                                                                                                                          |
| [design](../../openspec/changes/archive/2026-11-03-simplify-trivia-draft-workflow/design.md)                                                                                                | Bedakan compatibility legacy maintenance dari success creation v1 untuk native tanpa ontologi; kaitkan recovery dan arah cutover dengan CR-054.                                                                                                                       |
| [TDW-16](../../openspec/changes/archive/2026-11-03-simplify-trivia-draft-workflow/specs/trivia-draft-workflow/spec.md#requirement-tdw-16-tool-v2-terpisah-dan-post-v1-tetap-kompatibel)     | Nyatakan pengecualian FACT_REVIEW_REQUIRED pada kandidat wajib native, tanpa perlu full native success projection; envelope dan pengelolaan data/post lama tetap.                                                                                                     |
| [TDW-17](../../openspec/changes/archive/2026-11-03-simplify-trivia-draft-workflow/specs/trivia-draft-workflow/spec.md#requirement-tdw-17-pensiun-pembuatan-v1-menunggu-bukti-dan-keputusan) | Arah pensiun creation sudah diterima; kriteria pelaksanaan, bukti kesiapan/cutover/rollback dan izin tindakan belum terpenuhi.                                                                                                                                        |
| [tasks — prasyarat/handoff](../../openspec/changes/archive/2026-11-03-simplify-trivia-draft-workflow/tasks.md)                                                                              | Kaitkan 2.1/P2-T1, compatibility/discovery/Read P3-T2/T3, maintenance/readback P4-T3 dan lifecycle P5, diagnostik/plugin P6 serta verifikasi/rollout/cutover P7/P8 dengan batas record ini; jangan mengubah pembagian atau menandai task selesai dari keputusan saja. |

CR-053, kontrak frozen `plans/`, kontrak/fixture P1, dan record hasil Phase 1
dipertahankan sebagai acuan historisnya. Pencatatan ini tidak melanjutkan
P2-T2/P2-T3 atau menyatakan P2-T1 selesai resmi; progres/penerimaan tetap
ditentukan koordinator.

## 6. Bukti dan batas task pencatatan

- Source yang diperiksa: base `main`
  `b5bbf0de27454c6a1ca6981e98e2eaa59f8060fc`; head PR sebelumnya
  `3bdefa295113da0079d24f4dfa047e6b510b58d5`. SHA tersebut bukan versi live
  yang diverifikasi. Nomor/path CR-054 belum dipakai saat preflight.
- Deliverable repository hanya record ini dan penyesuaian dokumen identitas.
  Bukti format/referensi/whitespace serta Actions docs-only exact head final
  dicatat di PR #109/Issue #108, terpisah dari bukti runtime.
- **NOT RUN:** implementasi/pengujian backend, database, race/security runtime,
  host/plugin dan LIVE untuk keputusan ini. Tidak ada bukti cutover atau
  penghentian creation v1; tidak ada klaim `FIXED`.
- Tidak ada perubahan checklist/OpenSpec, source/migration/runtime, merge,
  deploy, pemasangan plugin, database/query/reset, hosted OAuth atau production
  Write dalam task pencatatan ini.
