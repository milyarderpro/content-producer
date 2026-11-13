# Rencana rilis dan rollback CR-062 — task 10

Tanggal 13 November 2026 (Asia/Jakarta). **Persiapan PR**, bukan izin merge,
deploy atau Write data. Sumber aturan: [AGENTS §6](../../../AGENTS.md),
[operations](../../operations.md), [CR-052](../../decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md),
[task 9](task-9-results.md). Review editorial memakai DNA referensi tertulis;
**review layout ponsel tidak diperlukan**. Kontrol fakta/sumber/dedup, budget,
CAS/replay dan approval tetap berdiri sendiri.

## Kandidat konkret untuk PR

- Repository `milyarderpro/content-producer`, public; base `main`.
- Base lokal dan remote cocok: `c02c5413479cebf50f39abc10149fafca757611a`.
- Branch kandidat: `codex/configurable-trivia-editorial-profiles`.
- Judul PR: **Dukung profil editorial trivia per Page dan katalog owner versioned**.
- [Body Issue](task-10-issue.md) dan [body draft PR](task-10-pr.md) siap ditinjau.
- Commit backend `a71fe5cb932c79d200e3efc4d14fc8ce0ddb0964` memuat seluruh
  perubahan task 1–9 serta persiapan PR; follow-up handoff hanya dokumentasi.
  Perubahan pemilik tetap utuh; commit persiapan PR mencakup hanya scope CR-062.
- [Issue #138](https://github.com/milyarderpro/content-producer/issues/138) sudah dibuat.
  [PR #139](https://github.com/milyarderpro/content-producer/pull/139) sudah merged
  pada `3b56ff33b9229765a88f1a04f31877c60fe9c820`; [koreksi G4](task-10-g4-findings.md)
  perlu PR/merge berikutnya sebelum gate ulang.
  [Handoff](task-10-results.md) dan [verifikasi](task-10-verification.json) mencatat
  SHA kandidat/CI; base SHA bukan bukti perubahan ini sudah dipasang.

## Riwayat dan estimasi sebelum eksekusi

Pemeriksaan GitHub sebelum membuat PR pada 13 November: tidak ada PR terbuka; main tidak protected
serta branch rules kosong. Keadaan ini bukan izin merge dan tidak menggantikan
pemeriksaan gate oleh operator.

| Pemeriksaan | Dasar yang tersedia | Estimasi kandidat |
| --- | --- | --- |
| Light CI `ci.yml` | Run 42578042873 PASS 61s; 42176824421 PASS 53s; run 43195868137 pada base PASS 15s mempunyai scope lebih kecil |1–3 menit|
| G4 manual exact-SHA | Run 41854239512 PASS 8m51s; DB1 8m09s dan DB2 5m51s; run 41456400517 PASS 11m30s. Kandidat memuat 238 kasus; matriks 16 kasus lokal memerlukan sekitar 2m10s |15–20 menit|
| Source/package lokal | Task 9: root check 208 source/19 frontend dan 132 test fokus PASS; 169 file runtime/demo serta 15 file runtime plugin tidak berubah |Reuse bukti komponen identik; dokumen/check ringan<1 menit|

[Run G4 terakhir](https://github.com/milyarderpro/content-producer/actions/runs/41854239512)
dan [run sebelumnya](https://github.com/milyarderpro/content-producer/actions/runs/41456400517)
adalah bukti historis pada SHA masing-masing, bukan PASS kandidat ini.
Jika G4 yang sudah diizinkan dimulai, konfirmasi sekali SHA/URL/status/estimasi,
akhiri respons tanpa menunggu hasil. Lanjut pemeriksaan hanya setelah pesan
`lanjutkan`. Jangan membatalkan run yang melampaui estimasi atau menulis PASS awal.

## Tahap dan syarat maju

| Tahap | Hasil wajib sebelum tahap berikutnya | Status kini |
| --- | --- | --- |
| Commit/push/Issue/draft PR |Permintaan task 10 mencakup persiapan PR; kandidat pada branch usulan, body siap dan daftar file exact|Commit/push, Issue #138 dan draft PR #139 selesai|
| Light CI/review |Run pada head SHA PR benar, pemeriksaan terdampak lulus dan perubahan ditinjau|Light CI head cf321a2 PASS; merge #139 sudah disetujui|
| Merge |Keputusan merge tersendiri; catat exact final SHA main, jangan menyamakan PR SHA/merge SHA|PR #139 MERGED, SHA 3b56ff3|
| G4 |Manual main, input=checkout=head SHA; committed config exact; source+dua DB shard+aggregate PASS beserta report/hash|Run 43396490933 FAIL; koreksi pin lokal PASS, G4 ulang NOT RUN|
| Hosted preflight |Target/owner/resource/issuer, applied history, backup/recovery point, dry-run dan compatibility terverifikasi|Belum diverifikasi|
| Migration/Edge |Izin deploy konkret setelah G4/preflight; source sama dengan gate|NOT RUN|
| QA owner/plugin |Page QA dan payload/aksi yang diizinkan; context terbaru lalu Write/readback; DNA sesuai profil|NOT RUN|
| Adopsi production |Keputusan owner per Page dengan CAS/references tepat|Bukan efek samping rilis|

## Gate G4 yang harus diperiksa

Workflow `.github/workflows/backend-gate-candidate.yml` menerima hanya final SHA
`main` yang sudah committed/merged. Trigger masa depan setelah izin tersedia:

```sh
gh workflow run backend-gate-candidate.yml --repo milyarderpro/content-producer --ref main -f candidate_sha=FINAL_MAIN_SHA
```

`FINAL_MAIN_SHA` adalah placeholder yang **wajib diganti** dengan SHA40hex yang
dibaca dari GitHub setelah merge; run pada SHA 3b56ff3 sudah dijalankan dan FAIL. Command harus memakai final
SHA baru setelah merge koreksi pin, bukan mengulang kandidat lama.
Periksa run event workflow_dispatch, head/input/checkout SHA identik; runtime
exact yang sama pada source/shard/aggregate; committed `supabase/config.toml`.

- Source/frontend PASS; dua stack terisolasi, satu clean reset per shard.
- DB 33 file/**238 kasus**: shard 1 = 15 file/158 kasus, shard 2 = 18 file/80 kasus, tanpa skip.
- MCP 18 file/130 kasus serta Inspector 33 valid/33 invalid+lima v1 ditolak+owner denial
  tepat sekali pada shard 1. Shard 2 tidak mengulang MCP/Inspector.
- Kedua shard: migration names/history 94, lint, local security advisors terpisah,
  katalog/grant/ACL/RLS/fixture sebelum/sesudah/akhir, cleanup dan hash/report cocok.
- Aggregate PASS untuk 238 kasus, bukan hanya source/job sukses. Tidak ada bypass, overlay
  security config, reset ulang tersembunyi atau reuse PASS dari SHA lain.

Workflow legacy dan `pnpm run test-all` dipertahankan untuk rollback. G4 pada SHA 3b56ff3 sudah FAIL. Koreksi pin perlu merge berizin
dan exact final main SHA baru sebelum satu gate ulang.

## Preflight dan urutan deployment setelah izin

Source berisi 94 migration; catatan hosted 85 migration/Edge v37 bertanggal 4 November
adalah historis, belum diperiksa ulang. Jika hosted benar-benar masih memakai
prefix 85 yang sama, sembilan migration tambahan berikut diharapkan:

1. `20261112101957_add_trivia_editorial_catalog.sql`
2. `20261112103621_fix_editorial_architecture_minimum.sql`
3. `20261112124337_add_trivia_page_editorial_profiles.sql`
4. `20261112131501_add_trivia_config2_renderer.sql`
5. `20261112132449_isolate_config2_text_normalization.sql`
6. `20261112133936_integrate_trivia_editorial_post_snapshots.sql`
7. `20261112135417_preserve_config2_unclassified_insight_dimensions.sql`
8. `20261112135704_harden_editorial_snapshot_metadata.sql`
9. `20261112142435_add_config2_content_plan_context.sql`

1. Verifikasi target production yang sudah ada lewat metadata provider; nama/ref
   dalam laporan lama bukan bukti target kini. Tidak mengganti target ke project lain.
2. Cocokkan applied names/history dengan source, tanpa migration repair/reset.
   Verifikasi backup/PITR/recovery point/cakupan Auth+Storage+Edge serta operator;
   status backup saat ini UNKNOWN, bukan backup/PITR PASS.
3. Pakai CLI 2.120.0 yang dipin; help `migration list`, `db push`, `functions deploy`
   sudah dibaca pada persiapan ini. Changelog v3 tidak menjadi alasan upgrade.
4. Setelah scope hosted read/preflight tersedia, jalankan daftar migration dan
   dry-run dengan project ref eksplisit serta `--skip-vault`. Tinjau hasilnya;
   perbedaan history/urutan/target menghentikan apply.
5. Setelah izin apply tersedia: database dahulu, lalu verifikasi history/audit dan
   compatibility config1; deploy hanya Edge `mcp` dari SHA yang lolos G4. Jangan
   deploy frontend/function lain atau mengubah secrets, roles, seed dan Vault.
6. Pertahankan `--no-verify-jwt` gateway sesuai konfigurasi existing; middleware
   owner OAuth tetap wajib. Verifikasi actual bundle/source, resource/issuer,
   discovery/challenge serta denial. Jangan mengaktifkan fixed-pilot atau grant pilot.
7. Config2 belum diadopsi Page production sampai QA dan keputusan per Page selesai.

Command apply/deploy lengkap ada pada operations; bukan dijalankan oleh dokumen ini.

## Plugin dan retest QA

Plugin PRIVATE yang sama diverifikasi read-only pada 13 November: **0.5.8**, 15/15 file runtime
cocok source dan compatibility overlay 0.5.8; app binding/audience/defaultPrompt
utuh. Tidak perlu update release baru. Ini bukti source/release, belum bukti
katalog 33 tools dari backend baru atau kemampuan chat baru setelah refresh.

Sesudah backend rilis terverifikasi dan scope QA tersedia:

- Resolve owner/workspace/Page lewat koneksi existing mcpku2; konfirmasi Page QA,
  bukan menggunakan Page production karena namanya kebetulan cocok.
- Baca katalog/contoh exact refs dan context Page. Rencanakan tiga preset dan satu
  custom eksplisit; Page/definitions/plan/post dan payload Write ditinjau dalam
  scope yang sah sebelum dibuat. Tidak membuat refs/IDs atau sources palsu.
- Riset/dedup sesuai kontrak; salin timestamp 6 digit sebagai teks; ambil context
  terbaru tepat sebelum fact-bearing Write. Gunakan identity/key/payload sama
  untuk rekonsiliasi respons hilang, bukan membuat draft pengganti.
- Buktikan context/save/revise/readback dan snapshot refs/rules/copy/CTA/metrics.
  Review editorial dalam alur tersebut hanya terhadap DNA referensi tertulis
  yang dipilih: angle, pilihan fakta, voice, ritme, hook/CTA; bukan layout ponsel.
  Technical PASS tidak otomatis menyatakan kesesuaian DNA naskah.
- Demonstrasi format/topik/profil baru memakai katalog data dalam workspace QA,
  dengan hash backend/plugin/registry tetap dan Page lain/histori utuh.
- Approval, publication record, metrics, retirement dan cleanup membutuhkan scope
  masing-masing. QA default berhenti di draft/readback, tidak otomatis ready/posted.

Batas count/payload/ID QA spesifik baru dapat dibuat konkret dari runtime sesudah
rilis. Persiapan Git/PR saat ini tidak memberi izin Write yang masih abstrak itu.

## Rollback kompatibel

| Keadaan | Tindakan yang dapat dipersiapkan | Batas |
| --- | --- | --- |
| PR/CI/G4 gagal sebelum deploy |Pertahankan runtime lama; fokuskan fix pada source dan ulang check yang relevan|Jangan deploy kandidat gagal atau memakai PASS SHA lain|
| Migration sudah applied, belum ada config2 adoption/write |Verifikasi state/compatibility terlebih dahulu; rollback Edge hanya ke source yang terbukti bisa memakai schema sekarang|Tidak undo/drop sembilan migration atau menganggap Edge v37 otomatis aman|
| Config2/Page/post/snapshot3 sudah ada |Pertahankan reader config2, utamakan forward-fix dari source yang direview dan digate|Backend lama yang tidak memahami snapshot3 bukan rollback aman|
| Owner ingin menutup adopsi profil baru |Dengan scope/payload terpisah, retire exact versions yang disepakati melalui CAS; binding existing tetap sah|Jangan retire katalog owner secara massal atau mengubah Page diam-diam; tidak ada flag baru yang diklaim sudah tersedia|
| Restore diperlukan |Pilih recovery point terverifikasi dan izin owner atas dampak data loss; verifikasi DB/Auth/Storage/Edge bersama|Restore belum diuji di task ini; bukan prosedur rutin atau reset production|
| Plugin rollback |Gunakan paket/release existing yang kompatibel dengan data serta backend saat itu, app binding sama|Jangan kembali ke instruksi yang tak mampu membaca data config2 baru|

Task 10 tetap unchecked sampai PR/rilis berizin, exact-SHA G4 dan retest runtime/QA
benar-benar selesai. Source preparation atau plugin release readback bukan pengganti.
