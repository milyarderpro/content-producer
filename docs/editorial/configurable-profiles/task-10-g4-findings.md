# Task 10 — kegagalan G4 dan koreksi pin clean replay

Tanggal 13 November 2026. [Issue #140](https://github.com/milyarderpro/content-producer/issues/140).
PR #139 sudah di-merge pada
`3b56ff33b9229765a88f1a04f31877c60fe9c820`. Tree identik dengan head yang
disetujui, `cf321a2ac9ef264c577a61b6d0ad3ce860539618`.

## Bukti kegagalan

[G4 43396490933](https://github.com/milyarderpro/content-producer/actions/runs/43396490933)
**FAIL**, 08:51:17–08:55:13 UTC. Source PASS, 14 file/208 root test; MCP shard 1
PASS 130 kasus. Kedua shard gagal `audit-before` dengan `STAGE_COMMAND_FAILED`.
Start, satu reset, nama migration dan cleanup kedua shard PASS. Inspector,
238 test database, history lanjutan, lint, advisors dan audit akhir **NOT RUN**.
Aggregate FAIL; ini bukan kegagalan business Write atau test database yang sempat
dijalankan. Deployment dan retest LIVE belum dilakukan.

## Root cause yang direproduksi

Audit pada stack existing PASS. Fresh replay dari tree yang sama memakai stack
`content-cr062-audit`, port 55400–55409, overlay hanya project_id/port, satu clean
reset, lalu audit SELECT-only. Audit FAIL `CATALOG_SCHEMA_SOURCE_OR_ACL_DRIFT`;
cleanup PASS. Durasi 148 detik termasuk cleanup; bukan formal G4 exact-config.

Hanya satu dari 300 fungsi berbeda: `api.create_content_plan(...)`.
Owner, signature, settings, ACL dan definer identik; delapan section katalog lain
identik. Source existing memuat enam U+0020 pada satu baris kosong di antara
`requested_chunk_size` dan `schedule`; committed migration memuat baris kosong.
Hash definition committed plus newline cocok dengan pg_get_functiondef dari fresh
replay. Perbedaan bukan perubahan semantik atau izin.

Pin lama terambil dari source lokal yang masih memiliki whitespace tersebut.
[Witness terstruktur](task-10-catalog-pin-correction.json) menyimpan identitas
fungsi, hash lama/baru, status tahap dan hash report. Laporan G4 asli dan hasil
audit awal dipertahankan; bukti task 6/9 tidak ditulis ulang sebagai clean replay.

## Koreksi dan verifikasi

[Record koreksi](../../decisions/2026-11-13-cr-062-clean-replay-catalog-pin.md)
menjelaskan perubahan satu hash section `functions` berdasarkan replay yang
sudah dibandingkan. Migration, SQL, source/runtime plugin dan comparator tetap.
Tidak ada normalisasi whitespace atau penerimaan lebih dari satu pin. Negative
control diperluas untuk source-only drift pada metadata identik dan function ACL.

Fresh replay berikutnya dengan pin terkoreksi: **PASS LOCAL/CLEAN-REPLAY**,
101 detik termasuk cleanup. Audit penuh membuktikan 94 source/applied migrations,
33 RPC, 19/19 RLS, schema/source/ACL pin serta nol fixture/faults. Cleanup PASS.
`pnpm run check` PASS: lint/typecheck, 208 root test dan 19 frontend test.

Perbaikan ini belum G4 PASS atau LIVE FIXED. PR perbaikan dan Actions harus
tersedia, merge tetap berizin tersendiri, lalu satu G4 ulang pada final SHA main
baru (estimasi konservatif 15–20 menit). Jangan rerun SHA lama dengan pin yang
belum terkoreksi. Task 10 tetap unchecked, progres 9/10.
