# Hasil task 7 — facade, schema dan gate MCP config2

**Selesai 13 November 2026 (Asia/Jakarta), LOCAL/FIXTURE.** Change
`add-configurable-trivia-editorial-profiles`, schema `spec-driven`, scope task 7.
[Kontrak MCP](../../contracts/trivia-editorial-mcp.md),
[review katalog](task-7-catalog-review.json),
[inventaris source](task-7-suite-inventory.json), dan
[fingerprint/verifikasi](task-7-verification.json) menjadi handoff task 8.

## Implementasi

Dua facade tipis owner OAuth ditambahkan: `get_trivia_editorial_catalog` dan
`update_trivia_editorial_catalog`. Registry default menjadi **33 tool unik,
12 Read dan 21 Write**. Keduanya memakai `invoke()`/JWT pengguna asli dan schema
API yang sama; tidak ada business SQL, service-role substitution atau direct
grants baru. Rollback fixed-pilot tetap 31 tool dan tidak diaktifkan; dua tool
baru tidak didaftarkan pada mode itu. Lima nama trivia v1 tetap absen/ditolak.

Schema config2 ditambahkan tanpa mengganti cabang config1. Page/config patch
berkorelasi dengan versinya; context mempertahankan pinned refs, profil/contoh,
hard limits versus preferences, effective rules/hash, metadata item plan serta
timestamp enam mikrodetik. Plan menerima override config2/density dinamis dan
page_review; input config1 masih memakai validator override lama.

Save/revise config2 menerima envelope editorial, key dinamis, goal absen/null,
1–12 fakta, CTA multiline/placement dan label aksi opsional tanpa batas semantik
jumlah/kombinasi. Get/list mempertahankan snapshot3, plan provenance,
12 posisi/sumber dan expanded metrics; snapshot2 tetap terbaca. Discard serta
publication tidak memotong 12 ID. Analitik lama sudah mempunyai dimensi nullable;
fixture membuktikan format baru serta null goal/profile tanpa dimensi DNA/CTA baru.

Zod 4.3.6 memakai UTF-16 untuk string.max. Schema teks config2 menghitung code
point, dan input post memeriksa panjang setelah NFC/LF/trim **tanpa mengubah
payload**. Output memakai batas canonical; raw payload tetap 16 KiB. Regresi
mencakup 160/161 emoji code points dan 160/161 karakter hasil NFC dari aksen terurai.
Normalizer/renderer resmi tetap SQL. Schema katalog memakai batas teks mentahnya.

Map dinamis dibatasi regex key serta schema nilai. Wire mengubah typed
propertyNames/additionalProperties menjadi patternProperties + closed object
yang ekuivalen; wrapper anyOf/oneOf ikut ditutup. Factoring local refs diuji
roundtrip dan semua validator output tetap aktif. Dua diagnostic request1 baru
membedakan editorial CAS dari reference unavailable dengan recovery aman.
Matriks input/auth/domain/rate/transport/output/unknown/privacy mencakup 33 tool.

## Gate dan perubahan pin yang direview

Inventaris dihitung dari registry/source serta collection Vitest:

| Target | Inventaris kandidat |
| --- | --- |
| Tool owner OAuth/API names | 33 unik; lima nama v1 tetap ditolak |
| MCP mandatory | 18 file/130 kasus: 114 lama +14 baru +2 penambahan matriks diagnostics per tool |
| Inspector | 33 valid/33 invalid + lima nama v1 ditolak + owner denial |
| Database collection | 33 file/200 kasus; partisi 15+18 file, 125+75 kasus |
| Migration | 94 source/applied versions, cocok tepat |
| Tabel domain/private | 19/19 RLS; caller grants tetap tertutup |

Manifest, aggregate count, evidence matcher, source inventory helper serta audit
pin diperbarui sesuai CR-062; tidak memaksa angka historis CR-059 pada source baru.
Gate tetap fail-closed pada SHA/config/hash/report, kasus hilang/skip, single-owner
MCP/Inspector shard 1, audit dan cleanup. Legacy workflow/test-all dipertahankan.

Review pin menerima sembilan migration task 2–6. Tujuh section berubah:
columns/indexes/objects/policies/triggers/functions/constraints; schemas/default
ACLs tetap sama. Fungsi lama yang berubah tetap dibatasi allowlist eksplisit.
Satu perubahan metadata retained function ialah search_path kosong pada
validate_page_niche_config; owner/ACL/definer tidak berubah. Signature context 9
menjadi 10 dengan parameter UUID opsional, owner/ACL sama, tanpa overload. Seluruh
delta dan hash tersimpan pada review JSON; ini tidak mengubah migration lama.

Review referensi juga memperbaiki sembilan tautan test v1 yang sudah pensiun
pada architecture/development ke regresi v2 aktif; bukti historis tidak diubah.

Lima negative control tetap dijalankan dalam transaksi rollback: caller grant,
RLS disabled, unexpected helper, unsafe policy dan removed constraint. Semuanya
harus ditolak pin. Light CI juga memetakan dependency baru serta deletion ke
source/MCP/backend review; regresi rename/deletion lama dipertahankan.

Inspector 2.5.0 hanya menerima JSON input melalui argv. Harness memakai file 0600
dan preloader untuk memasukkan input hanya ke memori launcher sesudah Node mulai;
npx/OS argv tidak memperoleh lease token. Test memeriksa OS argv serta penolakan
input file malformed. Bearer config tetap file privat sementara. Harness final
juga memastikan kedua lease token, bearer/foreign bearer dan detail SQL tidak
masuk log. Seluruh temporary file dan fixture dibersihkan pada finally.

## Kandidat dan preflight

Basis `c02c5413479cebf50f39abc10149fafca757611a` + working files, tanpa commit baru.
Toolchain: Node 24.15.0, pnpm 10.33.2, Deno 2.9.8, Supabase CLI 2.120.0, Inspector 2.5.0.
Pin dependency/lock tidak diperbarui; package.json hanya menambah test MCP baru.
Skill OpenSpec/Supabase/Postgres dan dokumentasi Zod 4.3.6 dipakai sesuai scope.

Preflight memeriksa script/workflow dan bukti lokal sebelumnya. Estimasi check
1–3 menit, MCP 1–2 menit, inventory/audit/lint/advisors kurang dari satu menit per
command. Estimasi Inspector 3–5 menit memakai catatan historis CR-052 sekitar 111
detik untuk 33 valid/invalid, ditambah setup/alur config2. Dua run Inspector selesai
sekitar 123 dan127 detik (elapsed file log lokal); tidak mencapai batas monitoring.
Tidak memicu Actions atau full gate duplikat.

Run awal mengungkap adapter field pilot yang salah nama, import process eksplisit
yang diperlukan lint, metadata census stale, penutupan wrapper oneOf, serta satu
expected mapping fixture. Semua diperbaiki sebelum hasil final. Test aggregate
sempat timeout karena empat startup CLI; seluruh boundary assertion tetap ada
sebagai unit plus dua CLI smoke. Timeout tidak dinaikkan dan target 200 tidak
dilonggarkan. Source/MCP lengkap diuji ulang setelah perbaikan dan regresi NFC.

## Verifikasi final

| Pemeriksaan | Hasil dan batas |
| --- | --- |
| pnpm run check | PASS lint/typecheck, 14 file/190 test source; frontend typecheck/build dan 19 test |
| pnpm run test:mcp | PASS Deno check/lint, 18 file/130 kasus, 0 skip; final test execution 10 detik |
| Manual cutover check terpisah | PASS 1 kasus; lima nama v1 tidak dispatch ke database, tidak dihitung ulang dalam 130 |
| Inspector authenticated final | PASS 33 valid/33 invalid, lima nama v1 ditolak, owner denial dan log privacy; sekitar 127 detik |
| Alur SQL nyata melalui MCP/Inspector | PASS publish format baru → Page config2 → plan/context → save/readback 12 → revise → approve/revoke/discard → publication/archive → metrics/insights null annotations; fixture lokal |
| Catalog before/after/final dan lima negative control | PASS exact schema/source/ACL; 94 migration, 33 API, 19/19 RLS; semua control terdeteksi dan rollback |
| DB lint api/internal/public level error/fail-on error | PASS 0 temuan |
| Local security advisors terpisah type security/level info/fail-on error | PASS 0 temuan |
| Identity/ACL/cleanup | PASS owner NOLOGIN/NOBYPASSRLS/tanpa schema CREATE; 0 caller helper execute/direct data grants; 0 fixture users/storage/business rows/faults |
| Legacy renderer/hash | PASS tiga function hashes identik task 5/6; config1 dan 31-tool fallback regressions lulus |
| Frozen task 1, OpenSpec strict, links/whitespace/fingerprints | PASS dokumentasi/LOCAL/CORPUS atau source review, bukan LIVE |

Dua puluh fingerprint task 6 tetap identik. Hasil fokus SQL 149 kasus task 6 tetap
menjadi bukti sebelumnya untuk source/dependensi itu; tidak dijumlahkan sebagai
run database baru task 7. Collection 200 adalah target suite rilis, **bukan PASS
full database 200** pada task ini. Inspector merupakan eksekusi tambahan lokal
melalui transport ke SQL, bukan hosted OAuth/production retest.

Command utama:

```sh
pnpm run check
pnpm run test:mcp
pnpm exec tsx scripts/phase-6-13.ts --v2-inspector
pnpm exec tsx scripts/trivia-v2-catalog-controls.ts
pnpm exec supabase db lint --local --schema api,internal,public --level error --fail-on error
pnpm exec supabase db advisors --local --type security --level info --fail-on error --output-format json
pnpm exec vitest list --config vitest.database.config.ts --json /tmp/content-producer-task 7-db-cases.json
```

## Batas handoff

Task 7 menuntaskan facade/schema/registry/diagnostics/pin/manifest serta pengujian
fokus. Task 8 memperbarui plugin yang sama; task 9 integrasi/editorial/visual;
task 10 persiapan rilis dengan izin masing-masing. File plugin, identity/connection,
lockfile dan migration task 1–6 dipertahankan.

Actions, formal G4 manual exact final main SHA dengan committed config/aggregate,
full database 200 sebagai satu gate baru, packaging/install plugin, visual QA,
deployment dan LIVE task ini **NOT RUN**. Tidak melakukan commit/push/PR/merge,
publikasi Issue atau mutasi data owner production. G4 tetap wajib sebelum
deployment yang diotorisasi; hasil fixture bukan penggantinya.
