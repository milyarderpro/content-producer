# Tasks

Checklist ini menjabarkan [plan baseline](../../../plans/simplified-trivia-draft-workflow-implementation-plan.md)
menjadi **8 fase dan 23 task**, tanpa mengganti nomor atau pembagiannya. Acuan
kebutuhan adalah [PRD](../../../plans/simplified-trivia-draft-workflow-prd.md),
[proposal](proposal.md), [design](design.md), dan tiga delta specs:

- [Trivia draft workflow](specs/trivia-draft-workflow/spec.md): TDW-01..17.
- [Trivia fact library](specs/trivia-fact-library/spec.md): TFL-01..13.
- [Tool diagnostics](specs/tool-diagnostics/spec.md): TDX-01..10.

Pernyataan scope proposal/design tentang pencatatan dua artefak merujuk langkah
sebelumnya. Permintaan berikutnya mengizinkan penambahan specs dan checklist ini
sebagai perencanaan; isi keputusan proposal/design dipertahankan. Semua checkbox
implementasi masih kosong dan seluruh pengujian perilaku masih **NOT RUN**.

### Prasyarat dan batas keputusan

- P1 selesai sebelum coding kontrak baru; P2 sebelum P3/P4; P3 menyediakan
  registry/Read sebelum P4 menulis; P4 mempunyai validasi mekanis dan editorial
  save sebelum P5 menggunakan hasil tersebut; P6 memakai kontrak backend stabil;
  P7 lulus sebelum P8. Test dan dokumentasi fokus diselesaikan pada task masing-
  masing; P7 adalah pemeriksaan integrasi, bukan pertama kali menguji fitur.
- Baseline **A: `complete` + versi katalog workspace** berlaku pada P3/P4.
  B: validasi kandidat relevan tetap alternatif. Protokol pembanding boleh
  direncanakan; eksperimen memerlukan scope yang sah, dan memilih B memerlukan
  hasil test, keputusan pemilik, serta override kontrak sebelum implementasinya.
  Tidak mengevaluasi B bukan alasan diam-diam menerapkannya atau menghapus A.
- Dataset/ambang retrieval dibekukan sebelum implementasi pencarian dievaluasi.
  Kriteria cutover, periode observasi, dan target/pemicu rollback diajukan untuk
  keputusan pemilik; contoh 7 hari/3 chat bukan gate yang diterima.
- D1/D2 hanya pembagian internal P6-T2. Diagnostik **seluruh tool** tetap wajib;
  tidak ada keputusan rilis alur draft lebih awal sebelum D2 selesai.
- Setiap perubahan source memerlukan Issue/PR fokus dan Actions sesuai aturan
  repository. Checklist bukan izin commit, push, PR, merge, deployment,
  pemasangan plugin, hosted OAuth, atau business Write production; scope izin
  tindakan tersebut diperiksa terpisah saat diperlukan.
- Sebelum check/CI yang benar-benar dieksekusi, catat SHA/scope, periksa job dan
  riwayat, serta estimasi durasi. Perubahan TypeScript/config memakai
  `pnpm run check` dan test fokus. Full gate backend final mengikuti **G4 CR-052
  manual exact-SHA**, bukan menjadikan legacy `test-all` syarat tunggal rilis.
  Ikuti aturan pelepasan pemantauan bila estimasi lebih dari 10 menit.
- Hentikan pekerjaan yang bergantung pada persetujuan yang belum ada; gunakan
  `BLOCKED`/`NOT RUN` sesuai bukti, jangan menandai task selesai hanya karena
  artefak perencanaan ada. Konflik dengan PRD/plan ditanyakan sebelum diputuskan.

## 1. Baseline dan keputusan

- [ ] 1.1 **P1-T1 Baseline:** rekonsiliasi HEAD/source dengan bukti backend,
      plugin, dan runtime terpasang; inventaris fakta/post/plan v1 serta dependensi
      registry tool pada ontologi, sumber, reservasi, binding/snapshot, dan gate
      lifecycle. Catat instalasi plugin lama yang diketahui serta bukti observasi
      yang tersedia tanpa mutasi production. **Verifikasi:** inventaris tersanitasi
      mencantumkan SHA/versi dan sumber bukti masing-masing, ketidakpastian, serta
      pemetaan area source/test yang sudah diidentifikasi pada design.
- [ ] 1.2 **P1-T2 Change record:** ajukan override eksplisit untuk sumber satu
      URL, dedup, reservasi, izin jumlah draft/plan, editorial/approval, schema v2,
      dan kompatibilitas v1; pertahankan A serta batas alternatif. **Verifikasi:**
      perubahan menunjuk kontrak frozen yang tepat, keputusan pemilik diterima
      sebelum coding terkait, dan tidak memberi izin rilis/Write tersirat atau
      mengaktifkan B, ambang cutover, maupun rilis D1 saja.
- [ ] 1.3 **P1-T3 Kontrak contoh:** bekukan request/response sukses dan error
      untuk satu draft, lima draft bertema, hasil sebagian, Read incomplete,
      katalog/config stale, reuse, URL/budget, claim, lost response, dan CAS. Tetapkan
      taksonomi seluruh tool, kepastian hasil Write, recovery, lokasi, waktu tunggu,
      ID diagnostik aman, tiga editorial, dan gate Setujui. **Verifikasi:** contoh
      ditinjau terhadap TDW/TFL/TDX, fixture kontrak/schema memeriksa bentuk dan
      kompatibilitas v1, serta dokumentasi menjelaskan izin scoped dan batas bukti.

## 2. Identitas dan tolok ukur duplikasi

- [ ] 2.1 **P2-T1 Identitas:** rinci registry canonical dan pemetaan ID v1,
      status invalidated/superseded/rejected/expired, riwayat published, alokasi,
      reservasi v1 aktif, serta cara write v1 tetap terlihat selama transisi.
      **Verifikasi:** aturan dan contoh identity/reuse mencakup parafrasa sama,
      subjek sama tetapi proposisi berbeda, expired-only, dua reuse scope, dan
      snapshot lama yang tetap utuh; pemetaan tidak membuat identitas paralel.
      Skenario membuktikan ID lama wajib dirujuk bila kesamaan ditemukan dan
      diputuskan, tanpa jaminan seluruh parafrasa terdeteksi; calon `same` terhadap
      masing-masing status invalidated/superseded/rejected diganti, bukan dipakai
      atau diberi ID baru untuk melewati riwayatnya.
- [ ] 2.2 **P2-T2 Dataset dedup:** siapkan dataset berlabel parafrasa dan mirip
      kata tetapi beda makna, mencakup data historis serta status koreksi; pisahkan
      baseline/evaluasi sebelum optimasi. **Verifikasi:** manifest/label dan cara
      menghitung recall/salah gabung dapat direproduksi, baseline dicatat, serta
      dataset dan ambang diterima sebelum hasil implementasi dinilai; tidak ada
      tuning expected sesudah hasil atau klaim 100%.
- [ ] 2.3 **P2-T3 Kontrak Read:** bekukan aturan retrieval, kandidat wajib,
      batas hasil, `complete`, versi katalog A, dan tindakan penggantian calon.
      Siapkan protokol pembanding A/B sesuai matriks design, tanpa memilih atau
      mengaktifkan B; eksperimen B hanya bila diotorisasi. **Verifikasi:** contoh
      Read lengkap/incomplete dan katalog stale konsisten dengan TFL-06..10;
      kandidat baru, race lintas versi, penolakan tidak terkait, waktu tunggu, dan
      rollback masuk protokol. Hasil eksperimen yang belum ada tetap NOT RUN;
      setiap usulan mengganti A menunggu bukti dan keputusan pemilik.

## 3. Data dan pencarian v2

- [ ] 3.1 **P3-T1 Schema additive:** tambahkan registry/pemetaan, sumber satu
      URL, binding v2, dan versi konten tanpa mengedit migration terpasang; sesuaikan
      constraint/trigger serta ACL/RLS/grant untuk jalur yang sah. **Verifikasi:**
      test schema dan owner/cross-owner menegakkan akses, migration history/names
      konsisten, audit katalog menunjukkan grant tetap tertutup, serta dokumentasi
      menjelaskan versi, invariant, dan rollback additive.
- [ ] 3.2 **P3-T2 Backfill dan indeks:** petakan fakta/pemakaian v1 ke pandangan
      bersama secara idempoten, mencakup published dan status koreksi, serta jaga
      konsistensi perubahan v1 berikutnya. **Verifikasi:** backfill berulang tidak
      menggandakan ID/pemakaian, digest snapshot/approval/isi lama tetap, dan test
      write v1 sesudah backfill langsung terlihat dari v2; catat prosedur dan hasil
      audit migrasi pada fixture.
- [ ] 3.3 **P3-T3 Pencarian database:** implementasikan RPC Read v2 kalimat +
      Page dengan kandidat ringkas lintas versi, `complete`, dan versi katalog A.
      **Verifikasi:** test dataset P2, hasil kosong/lengkap/terpotong, batas output,
      scope owner, status historis serta pemakaian lulus; URL/ontologi input tidak
      dijadikan kewajiban Read. Sertakan test error terarah dan dokumentasi output,
      batas recall, serta recovery incomplete sejak jalur Read ini tersedia.
      Fixture membedakan parafrasa yang ditemukan dari yang terlewat dan tidak
      mengklaim dedup sempurna; kasus `same` untuk setiap status invalidated,
      superseded, dan rejected memverifikasi petunjuk riwayat serta penggantian calon.

## 4. Simpan, revisi, dan pemulihan

- [ ] 4.1 **P4-T1 Simpan atomik:** implementasikan `save_post_v2` per draft
      dengan registry/identitas, versi katalog A di bawah lock workspace, config
      presisi penuh, URL, reuse, renderer/jumlah/batas keras, tiga editorial, dan
      claim/item plan terkait; tanpa reservasi paket terpisah. **Verifikasi:** test
      satu draft utuh, rollback setelah kegagalan tiap komponen, katalog/config
      stale, URL/budget/editorial gagal, serta alokasi dan completed atomik; hasil
      `pass` terikat revision/hash dan status selalu draft. Dokumentasikan transaksi
      dan error D1; MCP tidak memiliki business SQL baru.
- [ ] 4.2 **P4-T2 Benturan dan replay:** tambahkan test sesi terpisah dengan
      overlap lock terbukti serta kedua urutan commit untuk same identity, set
      tumpang tindih, reuse lintas Page/workspace, koreksi/reservasi/write v1 vs v2,
      same-key replay, timeout, dan lost response. **Verifikasi:** satu penggunaan
      sah pada scope terlarang, tidak ada data parsial/deadlock baru, replay/post
      tidak ganda, konflik menunjuk posisi/tindakan, serta laporan membedakan hasil
      pasti dan belum pasti. Pembandingan B tidak mengubah baseline A tanpa keputusan.
      Uji save commit dengan claim sah lalu respons hilang dan claim kedaluwarsa:
      replay caller berwenang dengan key/payload identik mengembalikan hasil/ID
      semula tanpa post/alokasi atau perubahan item tambahan; save baru dengan
      key baru dan claim kedaluwarsa tetap ditolak tanpa mutasi bisnis baru.
- [ ] 4.3 **P4-T3 Revisi dan baca:** implementasikan `revise_post_v2`, projection
      `get_post`/list v1/v2, binding/URL atomik, CAS, editorial baru, pembatalan
      approval, dan discard tanpa menghapus riwayat. **Verifikasi:** test revisi
      makna sama/berubah, pembaruan URL draft, stale revision/hash, ready ke draft,
      schedule-only sesuai kontrak, readback sumber/checks, serta pelepasan alokasi
      belum terbit; dokumentasi menjelaskan snapshot historis dan recovery.
- [ ] 4.4 **P4-T4 Beberapa draft:** hubungkan save v2 dengan content plan tanpa
      jadwal, satu item tiap giliran, jumlah/tema tepat, progres, lease/renew,
      failure/retry, serta resume tanpa membuat ulang completed. **Verifikasi:**
      test satu draft tanpa plan, lima item, berhenti setelah tiga, create-plan/save
      kehilangan respons, readback gagal sementara, expired/reclaimed claim, dua
      chat, dan save/cancel menunjukkan jumlah serta output tetap sah; dokumentasikan
      pemulihan, ringkasan hasil sebagian, dan batas replacement.
      Skenario resume menggabungkan save sukses, respons hilang, dan expiry claim:
      replay identik menemukan output completed yang sama, readback membuktikannya,
      dan kelanjutan tidak membuat ulang draft tersebut.

## 5. Setujui dan lifecycle

- [ ] 5.1 **P5-T1 Gate Setujui v2:** gunakan pemeriksaan mekanis terkini dan
      tiga hasil editorial P4 yang terikat revision/hash; pisahkan saran gaya.
      **Verifikasi:** test Page/binding/URL/reuse/jumlah/format/budget atau editorial
      stale/gagal memblokir Setujui, catatan nonblocking tidak menjadi gate sumber
      lama, dan dokumentasi quality/readback tidak mengklaim backend memverifikasi
      isi URL atau mengulangi 18 kriteria v1 pada v2.
- [ ] 5.2 **P5-T2 Setujui/publikasi:** adaptasi `approve_post` dan
      `mark_post_posted` menurut versi konten, state terkini, serta perintah owner
      atas revision/hash yang ditinjau dan konfirmasi publikasi manual nyata.
      **Verifikasi:** test approval/publish dan race correction/approval/publish
      lintas versi, revoke/archive/reschedule/metrics terkait tetap benar, v2 tidak
      meminta tier/expiry atau membuka ulang URL, dan snapshot published utuh;
      dokumentasikan tindakan terpisah tanpa otomatisasi Canva/Facebook/metrik.
- [ ] 5.3 **P5-T3 Koreksi fakta:** adaptasi reverify URL v2 untuk makna sama
      serta invalidasi/supersesi dengan izin owner terpisah, tanpa tier/expiry v2.
      **Verifikasi:** test CAS/race, status/lineage, dampak pada post mutable,
      penyegaran pandangan katalog, dan snapshot published yang tidak berubah;
      dokumentasi membedakan canonical URL, URL draft, serta riwayat post v1/v2.

## 6. Tool dan plugin

- [ ] 6.1 **P6-T1 Tool v2:** daftarkan tiga tool bernama v2 dengan schema
      request/response dan projection yang jelas; pertahankan input/output v1 yang
      masih didukung serta mapping tipis ke RPC. **Verifikasi:** test MCP/registry,
      katalog host, error input/output, owner denial, dan kompatibilitas plugin lama
      lulus; inventaris, kontrak versi, serta manifest test/Inspector diperbarui
      tanpa menutupi tool baru dengan hitungan baseline lama.
- [ ] 6.2 **P6-T2 Diagnostik seluruh tool:** lengkapi mapping input/auth/domain/
      rate limit/transport/output/unknown untuk seluruh katalog menurut P1-T3;
      D1/D2 hanya kelompok internal dalam task ini. **Verifikasi:** matriks tool x
      lapisan memiliki kasus dan hasil atau alasan tidak berlaku, test lokasi,
      kepastian Write, waktu tunggu, recovery, kompatibilitas v1, serta redaction
      respons/log lulus; ID diagnostik cocok dengan log tersanitasi. Dokumentasi
      seluruh tool lengkap, tidak menyatakan task selesai setelah D1 saja.
- [ ] 6.3 **P6-T3 Instruksi plugin:** perbarui pemahaman jumlah/Page/tema,
      riset cadangan, dedup sebelum copy, penggantian calon, konteks sebelum Write,
      save/readback per item, plan/resume, retry aman, dan ringkasan error Indonesia.
      **Verifikasi:** test paket/instruksi dan skenario host fixture menunjukkan
      pilihan v2, sumber cukup satu URL, tanpa tier/ontologi/expiry/reservasi atau
      tahun wajib; contoh output memisahkan copy publik/sumber internal dan tidak
      menyamakan draft dengan Setujui atau HTTP 200 dengan tersimpan.

## 7. Verifikasi integrasi

- [ ] 7.1 **P7-T1 Lokal/CI:** gabungkan bukti dedup, transaksi/race, seluruh
      diagnostik, owner/cross-owner, ACL/RLS, migrasi, compatibility, serta test
      sumber/frontend/MCP yang sudah ditambahkan pada fase masing-masing. Jalankan
      satu gate rilis **G4 CR-052 Actions manual exact final SHA main** sesuai izin,
      committed config dan source + dua shard + aggregate PASS. **Verifikasi:**
      URL run, SHA/hash/report sama, migration/history, lint, local security
      advisors terpisah, audit/cleanup, serta inventaris suite/Inspector yang
      mencakup v2 diperiksa operator. Catat bukti/failure dan batas CI/FIXTURE;
      jangan mengganti gate ini dengan diagnostic overlay lokal atau legacy saja.
- [ ] 7.2 **P7-T2 Host terkendali:** uji tool/schema yang benar-benar terlihat
      host dengan satu draft, lima draft bertema, penggantian calon, hard budget,
      readback tiap draft, hasil sebagian/resume, serta error dan lost response pada
      fixture/objek yang diizinkan. **Verifikasi:** laporan tersanitasi memuat
      versi runtime/plugin/backend, ID plan/post, jumlah diminta/terbukti/tersisa,
      revision/hash, dan pesan Indonesia yang sesuai bukti; HTTP 200 dan CI PASS
      tidak menggantikan keberhasilan Write/readback. Paket pengulangan/ambang yang
      belum disetujui dibawa kepada pemilik sebelum dijadikan gate.

## 8. Rilis dan pemantauan

- [ ] 8.1 **P8-T1 Rollout:** ajukan kriteria cutover terukur dan rancangan
      rollback kompatibel data campuran untuk keputusan pemilik; setelah gate dan
      izin tindakan tersedia, verifikasi runtime target, rilis backend sebelum
      plugin v2, serta pertahankan v1 selama transisi. **Verifikasi:** latihan
      rollback terisolasi membuktikan readback/pengelolaan v1/v2 dan plan tetap utuh,
      target/pemicu/prosedur disetujui, bukti exact-SHA/migrasi/security tercatat,
      dan instalasi/plugin lama diinventarisasi tanpa menganggap 7 hari/3 chat
      sebagai syarat diterima. Tanpa izin deployment/pemasangan, bagian itu BLOCKED.
- [ ] 8.2 **P8-T2 Retest live:** pada runtime dan objek berizin, uji ulang alur
      ujung-ke-ujung dengan readback, pantau keberhasilan jumlah draft, error,
      duplikasi yang ditemukan, dan pemakaian pembuatan v1 versus maintenance.
      Ajukan keputusan pensiun pembuatan v1 hanya sesudah kriteria yang diterima
      terbukti. **Verifikasi:** laporan LIVE tersanitasi terpisah dari CI/FIXTURE,
      tidak memberi FIXED sebelum retest relevan, mempertahankan post/snapshot dan
      pekerjaan in-flight, serta mencatat keputusan pemilik; bukti penggunaan lama
      yang tidak tersedia tidak dihitung sebagai nol atau cutover PASS.

## Workflow follow-up

- Setelah seluruh pekerjaan dan review yang diperlukan selesai, sinkronisasi/
  archive change hanya pada permintaan terpisah; periksa hasil arsip dan spec
  utama tanpa mengubah bukti historis.
- Permintaan apply berikutnya memulai pekerjaan sesuai prasyarat checklist,
  bukan memberikan izin menyelesaikan keputusan alternatif atau tindakan
  deployment/production secara otomatis.
