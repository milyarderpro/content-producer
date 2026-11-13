# Tasks

Sepuluh paket kerja berikut menggantikan 35 checkbox sebelumnya sesuai persetujuan pemilik. Setiap paket mencakup test fokus serta dokumentasi yang terdampak; rincian penerimaan tetap mengacu pada [design](design.md#matriks-penerimaan) dan tiga delta spec. Checklist ini belum dieksekusi dan bukan izin commit/push/PR/merge, deployment, instalasi, atau Write production.

Gunakan kembali audit, helper, ledger, dan mekanisme project yang sesuai; lengkapi gap tanpa mengulang pekerjaan yang buktinya masih sah. Sebelum test/CI, catat scope, candidate SHA dan estimasi berdasarkan konfigurasi/riwayat yang tersedia; pilih pemeriksaan yang relevan dan patuhi batas pemantauan AGENTS. Peringkasan tidak mengurangi kontrol sumber, dedup, owner OAuth, RLS, replay/CAS, approval, atau gate G4.

## 1. Finalisasi kontrak dan DNA

- [x] 1.1 Siapkan Issue sesuai scope izin dan change record yang menjelaskan perubahan frozen/CR-053/059/061, lalu bekukan kontrak perubahan; gunakan audit yang sudah ada untuk pemetaan format/topik/mekanisme dan contoh, lengkapi gap serta bukti reproduksi. Selesai bila keputusan diterima sebelum perubahan source, ketiga hash/count serta duplikat/OCR/CTA khusus cocok, dan matriks per record serta kompatibilitas config1/2 mencakup keputusan D1–D11 tanpa audit ulang penuh.

> Selesai 12 November 2026: [CR-062](../../../docs/decisions/2026-11-12-cr-062-configurable-trivia-editorial-profiles.md), [Issue lokal dan audit](../../../docs/editorial/configurable-profiles/issue.md), [kontrak frozen](../../../docs/editorial/configurable-profiles/contract.md), serta [hasil verifikasi task 1](../../../docs/editorial/configurable-profiles/task-1-results.md). PASS terbatas dokumentasi/LOCAL-CORPUS; bukan implementasi atau LIVE.

## 2. Katalog editorial

- [x] 2.1 Implementasikan storage/version, validator dan RPC Read/publish/retire owner dengan migration baru melalui CLI yang dipin; gunakan ledger/locking project, immutable references, pagination/completeness dan seed idempotent. Sertakan kontrak penggunaan dan test database. Selesai bila akses silang/anon/non-owner ditolak, CAS/concurrency/replay atomik, retirement menjaga binding lama, payload/graph dibatasi, dan seed tidak menimpa data owner; facade MCP diselesaikan pada paket 7.

> Selesai 12 November 2026: [kontrak RPC katalog](../../../docs/contracts/trivia-editorial-catalog.md), [hasil task 2](../../../docs/editorial/configurable-profiles/task-2-results.md), dan [fingerprint/verifikasi](../../../docs/editorial/configurable-profiles/task-2-verification.json). PASS LOCAL/FIXTURE: dua migration aditif, 25/25 test database, check source/frontend, lint/advisors, ACL/history/cleanup; facade MCP, Page config2 dan G4/LIVE tetap paket berikutnya.

## 3. Pengaturan DNA per Page

- [x] 3.1 Implementasikan config2, resolver, create/update Page dan generation context; sediakan tiga preset serta dukungan profil custom campuran sebagai satu definisi eksplisit. Sertakan panduan Page dan test resolver/context. Selesai bila key/bobot dinamis, pinned references, precedence, preferensi versus hard limits, casing/voice/CTA/emoji dan CAS enam mikrodetik benar, profil custom dapat dipilih, serta update katalog/Page tidak mengubah Page lain atau config1 otomatis.

> Selesai 12 November 2026: [panduan Page config2](../../../docs/contracts/trivia-page-editorial-profiles.md), [hasil task 3](../../../docs/editorial/configurable-profiles/task-3-results.md), dan [fingerprint/verifikasi](../../../docs/editorial/configurable-profiles/task-3-verification.json). PASS LOCAL/FIXTURE: config2/resolver, tiga preset + custom, Page/context/CAS, 60/60 test database, check source/frontend, lint/advisors, 88 migration, ACL/cleanup; integrasi renderer/post/plan/MCP/plugin dan G4/LIVE tetap paket berikutnya.

## 4. Fleksibilitas naskah dan renderer

- [x] 4.1 Lepaskan renderer config2 dari pembatas v1; terapkan ceiling D6, advisori keterbacaan, CTA tanpa batas tujuan/hierarki/kombinasi, metadata aksi opsional, serta LF dan penempatan CTA yang didukung. Sertakan kontrak render dan test batas/golden. Selesai bila 1/10/11/12 fakta sah, 13 ditolak, metrics/hash deterministik, CTA gabungan/multiline/sebelum fakta terakhir utuh, goal absen/null diterima config2, budget/emoji policy berlaku, dan byte/hash config1 tetap.

> Selesai 12 November 2026: [kontrak renderer config2](../../../docs/contracts/trivia-render-config2.md), [hasil task 4](../../../docs/editorial/configurable-profiles/task-4-results.md), dan [fingerprint/verifikasi](../../../docs/editorial/configurable-profiles/task-4-verification.json). PASS LOCAL/FIXTURE: ceiling/CTA/normalisasi/emoji/advisori, golden config1, 73/73 test database, check source/frontend, lint/advisors, 90 migration dan ACL/cleanup. Integrasi save/snapshot/lifecycle tetap task 5; G4/LIVE belum dijalankan.

## 5. Penyimpanan dan riwayat

- [x] 5.1 Integrasikan editorial context dan snapshot schema3 pada save/revise, get/list, approval serta seluruh lifecycle; pertahankan schema2 lama dan kompatibilitas analitik yang sudah ada. Sertakan dokumentasi transaksi dan test RPC. Selesai bila binding/versi/aturan tercatat, stale/CAS/replay/rollback serta approval tepat, array hingga 12 dan goal null terbaca tanpa klasifikasi palsu, hash histori utuh, dan riwayat tidak mengikuti versi katalog terbaru. Jangan menambahkan laporan/filter DNA atau CTA baru.

> Selesai 12 November 2026: [kontrak transaksi/snapshot3](../../../docs/contracts/trivia-post-editorial-snapshots.md), [hasil task 5](../../../docs/editorial/configurable-profiles/task-5-results.md), dan [fingerprint/verifikasi](../../../docs/editorial/configurable-profiles/task-5-verification.json). PASS LOCAL/FIXTURE: save/revise/readback/lifecycle/analitik SQL config2, 109 kasus database unik pada kelompok fokus, replay/hash config1 sebelum/sesudah migration, check source/frontend, lint/advisors, 93 migration dan ACL/cleanup. Plan/batch task 6; facade MCP task 7; G4/deploy/LIVE belum dijalankan.

## 6. Content plan dan batch

- [x] 6.1 Sesuaikan plan validation/context dan alur batch terhadap config2; gunakan dedup beberapa Read untuk calon melebihi sembilan dengan key unik dan versi katalog fakta konsisten. Sertakan panduan serta test plan/batch. Selesai bila format null, intent goal non-eksklusif, jumlah draft versus fakta, claim/completion, resume saat Page berubah, completed historis, complete=false dan stale antarbaca ditangani tanpa bypass dedup atau Write ulang yang tidak sah.

> Selesai 13 November 2026: [kontrak plan/batch](../../../docs/contracts/trivia-config2-plan-batch.md), [hasil task 6](../../../docs/editorial/configurable-profiles/task-6-results.md), dan [fingerprint/verifikasi](../../../docs/editorial/configurable-profiles/task-6-verification.json). PASS LOCAL/FIXTURE: 9 file/149 kasus database (12 kasus baru), check source/frontend, lint/advisors, 94 migration/history, ACL/cleanup serta legacy hashes; facade/schema MCP dan plugin tetap task 7/8, bukan G4/LIVE.

## 7. Kontrak MCP

- [x] 7.1 Tambahkan facade tipis dua tool katalog dan sesuaikan schema input/output seluruh jalur Page, context, plan, post, lifecycle serta analitik lama; perbarui registry, diagnostics, audit pin dan manifest G4/Inspector sesuai kontrak. Sertakan dokumentasi tool dan test MCP/protocol/security. Selesai bila config1/2, key dinamis, timestamp presisi, snapshot/CTA/array/goal null diterima konsisten, target katalog dihitung dari source, lima tool v1 tetap absen/ditolak dan owner denial lulus, tanpa business SQL atau direct grants baru.

> Selesai 13 November 2026: [kontrak MCP editorial](../../../docs/contracts/trivia-editorial-mcp.md), [hasil task 7](../../../docs/editorial/configurable-profiles/task-7-results.md), [inventaris source](../../../docs/editorial/configurable-profiles/task-7-suite-inventory.json), dan [fingerprint/verifikasi](../../../docs/editorial/configurable-profiles/task-7-verification.json). PASS LOCAL/FIXTURE: 33 tool, 18 file/130 kasus MCP, Inspector 33 valid/33 invalid + lima nama v1 ditolak + owner denial/privacy; source 190/frontend 19, audit/pin/94 history, 19/19 RLS, negative controls/lint/advisors/cleanup. Database 200 kasus adalah collection, bukan full gate baru; plugin/task 8 dan G4/LIVE tetap berikutnya.

## 8. Pembaruan plugin yang sama

- [x] 8.1 Perbarui panduan plugin agar membaca definisi/contoh profil dari context/katalog, memilih dan mereview naskah sesuai profil, serta memakai alur batch paket 6; pertahankan identity/connection. Sertakan output contract, CHANGELOG/README, package/hash checks dan test fokus. Selesai bila profil/format baru tidak membutuhkan switch kode, tidak ada kewajiban lima format/satu tujuan CTA/kuota surprise global pada config2, contoh tiga DNA serta custom berbeda, prompt injection ditolak, dan paket tervalidasi tanpa mengklaim sudah terinstal.

> Selesai 13 November 2026: [hasil task 8](../../../docs/editorial/configurable-profiles/task-8-results.md) dan [fingerprint/verifikasi](../../../docs/editorial/configurable-profiles/task-8-verification.json). PASS SOURCE/FIXTURE: panduan config2 generik, empat ilustrasi DNA, 69 test fokus, check 207 source/19 frontend, paket 15 file dan ZIP/hash. Instruksi pemilik tambahan mengizinkan update plugin terpasang bila perlu: Plugin Creator menyimpan 0.5.8 pada plugin PRIVATE yang sama, readback 15/15 + overlay cocok dan identity/connection tetap. Ini bukti save release/readback, bukan klaim refresh host, deployment backend atau LIVE. Task 9–10 belum dijalankan.

## 9. Pengujian penerimaan

- [x] 9.1 Jalankan integrasi teknis lintas katalog → Page → plan/context → save/revise → readback → lifecycle dan kompatibilitas analitik per matriks input design. Review naskah manual dan layout ponsel dikeluarkan dari kriteria selesai sesuai instruksi pemilik 13 November 2026. Selesai bila tiga preset dan profil custom lulus assertion teknis per kasus, format/topik/profil referensi baru bekerja tanpa perubahan hash source/plugin selama demonstrasi, kontrol keamanan/legacy/CTA tetap lulus, serta pnpm run check, suite fokus yang relevan, packaging dan git diff --check lulus. Catat CI/FIXTURE terpisah dari LIVE tanpa klaim kelulusan editorial; ini integrasi tambahan atas test per paket, bukan pengganti test tersebut.

> Selesai 13 November 2026 sesuai [addendum scope pemilik](../../../docs/decisions/2026-11-13-cr-062-task-9-technical-acceptance.md): review naskah/layout ponsel dikeluarkan dari gate. [Hasil task9](../../../docs/editorial/configurable-profiles/task-9-results.md), [16kasus teknis](../../../docs/editorial/configurable-profiles/task-9-technical-cases.json), [inventaris runtime](../../../docs/editorial/configurable-profiles/task-9-suite-inventory.json), dan [verifikasi](../../../docs/editorial/configurable-profiles/task-9-verification.json). PASS LOCAL/FIXTURE:11file/174kasus DB unik setelah retest Page terarah,208source/19frontend,130MCP,Inspector33valid/33invalid+denial/privacy,audit/5negativecontrols/lint/advisors/cleanup,15filepaket/hash. Extensibility menjaga169hash source/demo. InventoryG4 direkonsiliasi menjadi238kasus,158+80; bukan full238PASS atau G4/LIVE. Tidak ada commit/push/deploy/Write production.

## 10. Persiapan dan verifikasi rilis

- [ ] 10.1 Siapkan PR dan rilis/rollback dalam scope izin masing-masing; setelah merge yang diotorisasi, jalankan G4 manual pada exact final SHA main dengan committed config dan aggregate PASS sebelum deployment yang diotorisasi. Selesai bila source/dua shard/Inspector/advisors/audit/cleanup terbukti, versi runtime serta instalasi plugin yang sama terverifikasi, dan retest/readback profil serta ekstensi data-only pada Page QA yang diotorisasi tercatat dalam handoff. Patuhi batas pemantauan >10 menit; jangan menyatakan LIVE PASS/FIXED dari CI atau memutasi Page production otomatis.

> Persiapan task10,13November2026: [draft Issue](../../../docs/editorial/configurable-profiles/task-10-issue.md), [draft PR](../../../docs/editorial/configurable-profiles/task-10-pr.md) dan [rencana rilis/rollback](../../../docs/editorial/configurable-profiles/task-10-release-plan.md) tersedia. Issue #138 sudah dibuat; kandidat commit dan draft PR sedang disiapkan. Merge/G4/deploy/Write QA belum dijalankan; task tetap unchecked sampai seluruh syarat rilis terbukti dalam scope izin masing-masing.

## Ditunda dari rilis ini

- Laporan/perbandingan performa per versi DNA, dimensi insights editorial_profile/editorial_profile_version, serta filter/pengelompokan label CTA baru.
- Versi/provenance DNA dan label CTA opsional tetap disimpan serta tersedia melalui readback; analitik lama tetap harus kompatibel. Penundaan laporan tidak mengurangi kemampuan produksi.

## Workflow follow-up

- Sesudah implementasi dan penerimaan lengkap, sinkronkan delta dengan urutan baseline CR-061 yang telah direkonsiliasi lalu arsipkan change hanya atas permintaan workflow yang sesuai.
- Pertahankan bukti historis, checksum input dan snapshot post lama. Adopsi profil pada Page production tetap tindakan owner tersendiri; penyempurnaan profil berikutnya memakai versi katalog baru.
