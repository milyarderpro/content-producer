# Hasil task 2 — katalog editorial owner

**Selesai 12 November 2026 (Asia/Jakarta), LOCAL/FIXTURE.** Change
`add-configurable-trivia-editorial-profiles`, schema `spec-driven`.
Scope task2; task3–10 belum dikerjakan.

## Perubahan

- Migration baru CLI pin2.120.0:
  `20261112101957_add_trivia_editorial_catalog.sql` menambah storage/version,
  validator tertutup, graph/reference, RLS/ACL, dua owner RPC Read/publish/retire,
  CAS/ledger/replay, pagination/byte limits dan seed idempotent tujuh format/
  sebelas topik. Tidak ada auto-seed pada Read atau pergantian Page/config1.
- `20261112103621_fix_editorial_architecture_minimum.sql` memperbaiki argumen
  minimum helper array yang terungkap pada test awal. Migration pertama yang
  sudah diterapkan tidak ditulis ulang; urutan source sekarang memuat keduanya.
- Suite `api-trivia-v2-read.test.ts` diperluas dengan14 kasus katalog, tetap
  ditemukan oleh manifest G4 existing tanpa file test tersembunyi/skip.
  Test kernel merekonsiliasi jumlah signature RPC31→33 menurut CR-062;
  kontrol privilege/RLS/owner lainnya tetap.
- [Kontrak penggunaan](../../contracts/trivia-editorial-catalog.md) mencatat
  schema payload, input/output RPC, batas ukuran, cursor/completeness, replay,
  temporal binding dan bootstrap seed. [Bukti machine-readable](task-2-verification.json)
  mencatat hash lima file implementasi/test/kontrak dan hasil audit aman.

Basis HEAD `c02c5413479cebf50f39abc10149fafca757611a` + working changes;
belum ada SHA commit kandidat baru. Hash working files bukan bukti G4 formal
exact-SHA. Node24.15.0, pnpm10.33.2, Supabase CLI2.120.0 terverifikasi lokal.
Migration diterapkan hanya ke stack lokal yang identitasnya diverifikasi oleh
helper container project; tidak ada reset atau hosted migration/deploy.

## Preflight dan hasil

Sebelum eksekusi: konfigurasi workflow/check dan riwayat yang tersedia sudah
diperiksa; estimasi migration <1 menit, test fokus1–3 menit, check1–3 menit.
Run ulang diestimasi dari hasil awal56 detik dan berikutnya62 detik. Tidak ada
run yang mendekati atau melampaui batas pemantauan10 menit; tidak ada CI dispatch.

| Pemeriksaan final | Hasil |
| --- | --- |
| `pnpm run check` | PASS lint/typecheck,14 file/184 test source, frontend typecheck/build dan19 test frontend |
| `pnpm exec vitest run --config vitest.database.config.ts supabase/tests/database/api-trivia-v2-read.test.ts supabase/tests/database/api-security-kernel.test.ts` | PASS2 file/25 kasus, tanpa skip,61,09 detik; mencakup14 kasus baru |
| `pnpm run verify-migrations` | PASS87 nama migration |
| `pnpm run supabase:verify` + perbandingan history lewat helper lokal | PASS87 versi source tepat sama dengan history database lokal |
| `pnpm exec supabase db lint --local --schema api,internal,public --level error --fail-on error` | PASS0 error; bukan klaim full G4 |
| `pnpm exec supabase db advisors --local --type security --fail-on error` | PASS0 temuan; tahap terpisah dari lint |
| Audit ACL dan cleanup sesudah suite final | PASS2 RPC memakai role API terbatas, security definer/search_path kosong dan caller ACL sempit;0 helper baru executable oleh caller;0 definition/0 catalog state fixture tertinggal |
| `python docs/editorial/configurable-profiles/reproduce.py --check` | PASS; fingerprint/corpus/kontrak task1 tetap |
| OpenSpec strict, review referensi dan whitespace | PASS untuk artefak yang berubah; bukan bukti perilaku LIVE |

Run awal **FAIL3/25**: dua kasus seed ditolak karena argumen minimum array
keliru, satu pin jumlah RPC masih31. Bukti kegagalan tidak ditulis sebagai PASS;
fix SQL memakai migration lanjutan dan pin test dijelaskan oleh penambahan dua
RPC yang diterima CR-062. Setelahnya25/25 PASS, kemudian kasus ukuran response
menambah assertion rollback setelah insert. Test fokus sementara1/1 memakai
filter (16 kasus lain tidak dijalankan); itu bukan gate. Run final tanpa filter
kembali membuktikan25/25 tanpa skip pada isi test final.

## Cakupan perilaku yang terbukti

- Dynamic format/topic/profile dengan exact ID/version/hash dan density key
  tambahan; bobot nol tetap valid bila key terdaftar, total100 dan keys tepat.
- Anon/service-role/cross-owner serta direct table/sequence/helper access ditolak.
  Graph salah kind/hash/workspace, inheritance/cycle shape, payload/struktur/
  field tak dikenal, count/ukuran/key capacity invalid ditolak atomik.
- CAS katalog dan previous version, dua sesi revision sama satu commit,
  dua sesi operation key identik satu versi + replay; key payload berbeda
  ditolak. Validasi gagal tidak meninggalkan definition/revision/ledger parsial.
- Retirement menjaga versi lama Read dan primitive binding time server yang sah;
  reference untuk binding baru ditolak. Replay publish sebelum retirement tetap
  mengembalikan hasil asli. Page binding end-to-end tetap task3.
- Seed melewati seluruh key owner yang sudah ada, termasuk retired; panggilan
  kedua nol insert/revision tetap, config1 dan timestamp Page tetap identik.
- Pagination keyset tanpa duplikat, filter/revision/cursor tervalidasi, batas
  byte halaman/definisi dan examples_complete jujur. Profil yang valid secara
  struktur/payload tetapi tidak muat projection ditolak dengan rollback insert
  dan ledger, bukan clipping.

## Batas dan handoff

Katalog source database kini33 signature RPC; MCP host tetap31 tool karena
facade dua tool adalah task7. Angka itu bukan inventaris production terbaru.
Seed task2 adalah primitive format/topik; tiga preset profil, penyimpanan binding,
resolver dan adopsi config2 eksplisit adalah task3 sesuai pembagian paket.

Audit/pin migration/API, diagnostics, registry dan Inspector/G4 runtime yang
masih memakai baseline85 migration/31 tool harus direkonsiliasi pada task7,
tanpa melemahkan assertions atau menyalin angka historis menjadi target baru.
Tidak menjalankan atau mengklaim full gate pada keadaan antar-paket ini.
G4 manual exact final SHA main dengan committed config dan aggregate PASS tetap
wajib sebelum deployment yang diotorisasi pada alur task10.

**NOT RUN:** Actions, formal G4, facade MCP, Page config2 integration, preview/
QA visual, deployment, instalasi plugin dan LIVE baru. Issue masih draf lokal;
tidak ada publikasi Issue, commit/push/PR/merge, atau Write data production.
Bukti ini tidak menyatakan LIVE PASS/FIXED atau izin release.
