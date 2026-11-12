# Tasks

Sepuluh paket kerja berikut menggantikan 35 checkbox sebelumnya sesuai persetujuan pemilik. Setiap paket mencakup test fokus serta dokumentasi yang terdampak; rincian penerimaan tetap mengacu pada [design](design.md#matriks-penerimaan) dan tiga delta spec. Checklist ini belum dieksekusi dan bukan izin commit/push/PR/merge, deployment, instalasi, atau Write production.

Gunakan kembali audit, helper, ledger, dan mekanisme project yang sesuai; lengkapi gap tanpa mengulang pekerjaan yang buktinya masih sah. Sebelum test/CI, catat scope, candidate SHA dan estimasi berdasarkan konfigurasi/riwayat yang tersedia; pilih pemeriksaan yang relevan dan patuhi batas pemantauan AGENTS. Peringkasan tidak mengurangi kontrol sumber, dedup, owner OAuth, RLS, replay/CAS, approval, atau gate G4.

## 1. Finalisasi kontrak dan DNA

- [ ] 1.1 Siapkan Issue sesuai scope izin dan change record yang menjelaskan perubahan frozen/CR-053/059/061, lalu bekukan kontrak perubahan; gunakan audit yang sudah ada untuk pemetaan format/topik/mekanisme dan contoh, lengkapi gap serta bukti reproduksi. Selesai bila keputusan diterima sebelum perubahan source, ketiga hash/count serta duplikat/OCR/CTA khusus cocok, dan matriks per record serta kompatibilitas config1/2 mencakup keputusan D1–D11 tanpa audit ulang penuh.

## 2. Katalog editorial

- [ ] 2.1 Implementasikan storage/version, validator dan RPC Read/publish/retire owner dengan migration baru melalui CLI yang dipin; gunakan ledger/locking project, immutable references, pagination/completeness dan seed idempotent. Sertakan kontrak penggunaan dan test database. Selesai bila akses silang/anon/non-owner ditolak, CAS/concurrency/replay atomik, retirement menjaga binding lama, payload/graph dibatasi, dan seed tidak menimpa data owner; facade MCP diselesaikan pada paket 7.

## 3. Pengaturan DNA per Page

- [ ] 3.1 Implementasikan config2, resolver, create/update Page dan generation context; sediakan tiga preset serta dukungan profil custom campuran sebagai satu definisi eksplisit. Sertakan panduan Page dan test resolver/context. Selesai bila key/bobot dinamis, pinned references, precedence, preferensi versus hard limits, casing/voice/CTA/emoji dan CAS enam mikrodetik benar, profil custom dapat dipilih, serta update katalog/Page tidak mengubah Page lain atau config1 otomatis.

## 4. Fleksibilitas naskah dan renderer

- [ ] 4.1 Lepaskan renderer config2 dari pembatas v1; terapkan ceiling D6, advisori keterbacaan, CTA tanpa batas tujuan/hierarki/kombinasi, metadata aksi opsional, serta LF dan penempatan CTA yang didukung. Sertakan kontrak render dan test batas/golden. Selesai bila 1/10/11/12 fakta sah, 13 ditolak, metrics/hash deterministik, CTA gabungan/multiline/sebelum fakta terakhir utuh, goal absen/null diterima config2, budget/emoji policy berlaku, dan byte/hash config1 tetap.

## 5. Penyimpanan dan riwayat

- [ ] 5.1 Integrasikan editorial context dan snapshot schema3 pada save/revise, get/list, approval serta seluruh lifecycle; pertahankan schema2 lama dan kompatibilitas analitik yang sudah ada. Sertakan dokumentasi transaksi dan test RPC. Selesai bila binding/versi/aturan tercatat, stale/CAS/replay/rollback serta approval tepat, array hingga 12 dan goal null terbaca tanpa klasifikasi palsu, hash histori utuh, dan riwayat tidak mengikuti versi katalog terbaru. Jangan menambahkan laporan/filter DNA atau CTA baru.

## 6. Content plan dan batch

- [ ] 6.1 Sesuaikan plan validation/context dan alur batch terhadap config2; gunakan dedup beberapa Read untuk calon melebihi sembilan dengan key unik dan versi katalog fakta konsisten. Sertakan panduan serta test plan/batch. Selesai bila format null, intent goal non-eksklusif, jumlah draft versus fakta, claim/completion, resume saat Page berubah, completed historis, complete=false dan stale antarbaca ditangani tanpa bypass dedup atau Write ulang yang tidak sah.

## 7. Kontrak MCP

- [ ] 7.1 Tambahkan facade tipis dua tool katalog dan sesuaikan schema input/output seluruh jalur Page, context, plan, post, lifecycle serta analitik lama; perbarui registry, diagnostics, audit pin dan manifest G4/Inspector sesuai kontrak. Sertakan dokumentasi tool dan test MCP/protocol/security. Selesai bila config1/2, key dinamis, timestamp presisi, snapshot/CTA/array/goal null diterima konsisten, target katalog dihitung dari source, lima tool v1 tetap absen/ditolak dan owner denial lulus, tanpa business SQL atau direct grants baru.

## 8. Pembaruan plugin yang sama

- [ ] 8.1 Perbarui panduan plugin agar membaca definisi/contoh profil dari context/katalog, memilih dan mereview naskah sesuai profil, serta memakai alur batch paket 6; pertahankan identity/connection. Sertakan output contract, CHANGELOG/README, package/hash checks dan test fokus. Selesai bila profil/format baru tidak membutuhkan switch kode, tidak ada kewajiban lima format/satu tujuan CTA/kuota surprise global pada config2, contoh tiga DNA serta custom berbeda, prompt injection ditolak, dan paket tervalidasi tanpa mengklaim sudah terinstal.

## 9. Pengujian penerimaan

- [ ] 9.1 Jalankan integrasi lintas katalog → Page → plan/context → save/revise → readback → lifecycle dan kompatibilitas analitik, lalu review naskah serta layout ponsel per matriks design. Selesai bila tiga preset dan profil custom diterima per kasus, format/topik/profil referensi baru bekerja tanpa perubahan hash source/plugin selama demonstrasi, kontrol keamanan/legacy/CTA tetap lulus, serta pnpm run check, suite fokus yang relevan, packaging dan git diff --check lulus. Catat CI/FIXTURE/preview terpisah dari LIVE; ini integrasi tambahan atas test per paket, bukan pengganti test tersebut.

## 10. Persiapan dan verifikasi rilis

- [ ] 10.1 Siapkan PR dan rilis/rollback dalam scope izin masing-masing; setelah merge yang diotorisasi, jalankan G4 manual pada exact final SHA main dengan committed config dan aggregate PASS sebelum deployment yang diotorisasi. Selesai bila source/dua shard/Inspector/advisors/audit/cleanup terbukti, versi runtime serta instalasi plugin yang sama terverifikasi, dan retest/readback profil serta ekstensi data-only pada Page QA yang diotorisasi tercatat dalam handoff. Patuhi batas pemantauan >10 menit; jangan menyatakan LIVE PASS/FIXED dari CI atau memutasi Page production otomatis.

## Ditunda dari rilis ini

- Laporan/perbandingan performa per versi DNA, dimensi insights editorial_profile/editorial_profile_version, serta filter/pengelompokan label CTA baru.
- Versi/provenance DNA dan label CTA opsional tetap disimpan serta tersedia melalui readback; analitik lama tetap harus kompatibel. Penundaan laporan tidak mengurangi kemampuan produksi.

## Workflow follow-up

- Sesudah implementasi dan penerimaan lengkap, sinkronkan delta dengan urutan baseline CR-061 yang telah direkonsiliasi lalu arsipkan change hanya atas permintaan workflow yang sesuai.
- Pertahankan bukti historis, checksum input dan snapshot post lama. Adopsi profil pada Page production tetap tindakan owner tersendiri; penyempurnaan profil berikutnya memakai versi katalog baru.
