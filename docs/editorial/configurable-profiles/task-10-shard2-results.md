# Task 10 — rekonsiliasi penerimaan shard 2

Dibuka 13 November 2026; verifikasi diperbarui 14 November 2026. [Issue #142](https://github.com/milyarderpro/content-producer/issues/142).
[Record koreksi expected audit](../../decisions/2026-11-13-cr-062-shard2-acceptance-inventory.md),
[verifikasi](task-10-shard2-acceptance.json).

## G4 pada 93c38cb8

[Run 43406057727](https://github.com/milyarderpro/content-producer/actions/runs/43406057727)
FAIL (10:02:43–10:15:02 UTC). Source PASS; shard 1 PASS 15 file/158 DB, MCP130,
Inspector33/33+lima retired v1+owner denial, history/lint/advisors/audit/cleanup.
Shard 2 lulus start, satu reset, migration names, audit-before/after serta cleanup,
tetapi command test database FAIL. History/lint/advisors/audit-final shard 2 NOT RUN;
aggregate FAIL. Report SHA/hash/runtime tiga job cocok. Tidak ada deployment.

Koreksi pin #140 sudah terbukti pada tahap audit di kedua shard; kegagalan ini
berasal dari assertion penerimaan yang masih memakai baseline CR-059. Reproduksi
SEC-only FAIL `expected 33 to be 31`; tiga kasus lain terfilter/skipped, tidak
dihitung sebagai bukti shard PASS. Katalog CR-062 yang sudah diterima mempunyai
33 RPC dan 19 RLS; operasi baru belum masuk proyeksi allowlist dan operation map.

## Perbaikan fokus

Expected inventory aktif menjadi 33 operasi (21 Write/12 Read). Dua tool katalog
mendapat test owner existing; Write mencantumkan operation_key dan CAS
expected_editorial_catalog_version. Exact set dibandingkan dengan registry agar
RPC tambahan/tidak terdaftar tidak diterima. Query SQL historis utuh; proyeksi
allowlist diperluas eksplisit. Tabel bisnis 19 dan RLS 19 diperiksa bersama.
Seluruh denial/grant/owner/private-definer/metrics checks tetap wajib. Tidak ada
perubahan migration, SQL runtime, plugin, timeout, skip atau jumlah kasus.

Source/frontend check PASS:208 root/19 frontend beserta lint/typecheck/build.
Run penuh shard lokal: 79 PASS/1 FAIL, 18 file/80 kasus, 292,94 detik, tanpa skip.
Assertion tersisa adalah matcher helper v1 pada dua tabel baru yang memakai
workspace-scoped auth.uid(). Koreksi dibatasi pada empat policy katalog: exact
nama/command/role tunggal/body/USING/WITH CHECK. Seluruh 17 tabel lama tetap
memerlukan helper semula. Audit JSON memuat OID role sebagai string; assertion
memakai oid::text secara exact. Percobaan numeric OID yang gagal dipertahankan
sebagai diagnostik test, bukan defect runtime tambahan.

Retest SEC-only 14 November: 1 PASS, 3 skipped karena filter. Dikombinasikan dengan
79 PASS pada run lengkap sebelumnya, 80 kasus unik terverifikasi setelah retest;
bukan satu run shard PASS. Cleanup SELECT-only: 20 tabel lokal termasuk Auth dan
Storage semuanya nol. Source/frontend check final PASS208/19, OpenSpec strict dan
whitespace PASS. Formal G4 tetap harus 238 kasus tanpa skip pada SHA baru.
Ini LOCAL/FIXTURE, bukan G4 final main atau LIVE PASS. Sesudah PR/Actions dan merge,
wajib satu G4 pada final SHA baru; estimasi 15–20 menit, lalu akhiri pemantauan
setelah konfirmasi start sesuai aturan pemilik. Task 10 masih 9/10.
