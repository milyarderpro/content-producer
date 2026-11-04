# CR-060 — Satu resolusi runtime untuk run G4

**Tanggal:** 4 November 2026. **Status:** diterima pemilik dalam chat setelah
review Issue #130; implementasi dan G4 baru masih memerlukan verifikasi.

## Masalah dan bukti

[Run G4 #41839544747](https://github.com/milyarderpro/content-producer/actions/runs/41839544747)
pada `916f3cd76c43a85a2f350357ce900abcc885a081` berakhir **FAIL** dalam 6m46s.
Source dan dua shard PASS, tetapi aggregate menolak `RUNTIME_EVIDENCE_MISMATCH`.
Report source memakai Node **24.22.2**, shard 1 **24.22.1**, shard 2 **24.22.0**;
Deno **2.9.8**, pnpm **10.33.2**, Supabase CLI **2.120.0** identik.
SHA dan hash manifest/lock/inputs/partisi sama. DB 15+18 file dan 78+54=132
kasus, MCP 114, Inspector 31 valid/31 invalid + lima v1 ditolak + owner denial,
audit/history/lint/advisors/cleanup komponen PASS. Bukti ini parsial CI/FIXTURE,
bukan aggregate PASS atau bukti LIVE. Tidak ada deployment/reset production.

## Addendum terbatas pada CR-055

[CR-055 runtime range](2026-11-01-cr-055-runtime-range-g4.md) tetap mengatur
range yang diterima, deklarasi exact pemilik, pin pnpm/Supabase, validasi
actual version dan equality report. Hanya aturan bahwa **setiap setup G4**
memilih range secara independen yang diganti:

1. Job `runtime` pada exact dispatch SHA memilih Node `>=22 <25` dan Deno
   `>=2.9.7 <3` sekali per run. Node memakai `check-latest: true`. Install
   dependency terkunci dan `scripts/gate-runtime.ts` memvalidasi versi aktual
   melalui `resolveRuntimeEvidence` yang sama sebelum menulis output numerik
   exact `node` dan `deno` ke `GITHUB_OUTPUT`.
2. Job source, kedua shard database, serta aggregate memakai output Node exact;
   source dan kedua shard juga memakai output Deno exact. Seluruh consumer
   bergantung pada resolver. Resolver gagal menyebabkan backend tidak dimulai;
   aggregate juga menuntut hasil resolver `success`.
3. Ketiga report tetap dihasilkan dari runtime aktual consumer masing-masing.
   `assertEquivalentRuntimeEvidence` tidak diubah atau dilonggarkan. Output
   invalid, versi di luar range, pin drift, dan actual-version drift tetap gagal.
4. CI ringan dan legacy satu-stack tetap memakai selector bounded langsung.
   `.nvmrc`, `.deno-version`, engine, dependency/lock, migration, RLS/OAuth,
   config Supabase dan suite database/MCP tidak berubah.

Perubahan ini didukung [job outputs GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/pass-job-outputs).
Regresi mencakup wiring output/dependency, larangan resolver independen pada
consumer, output kosong/rusak/injection, dan perbedaan patch aktual.

## Rilis dan batas bukti

Remediasi [Issue #130](https://github.com/milyarderpro/content-producer/issues/130)
menjadi bagian task 5.1 change `cutover-trivia-v2-only` dengan persetujuan
pemilik. Jalankan check/test fokus, PR/light CI, lalu satu G4 manual pada exact
final SHA `main` yang baru. CR-052 tetap mewajibkan seluruh tahap dan aggregate
PASS sebelum deployment/reset; tiga komponen PASS pada run gagal tidak direuse
sebagai rilis formal. Tidak ada retry gate buta atau pelonggaran keamanan.
