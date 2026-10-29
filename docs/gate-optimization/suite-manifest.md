# G2-B1 — manifest suite wajib (inventaris, bukan release gate)

**Baseline:** `main` `7d9449816593818a3abbf4769b4af911158c84d0` pada 29 Oktober 2026. **Status:** inventaris additive untuk Issue #80; belum menjadi runner bersama, required check baru, atau izin cutover/deployment.

## Cakupan dan sumber kebenaran

`scripts/gate-suite-manifest.json` memisahkan `source` (10 file root Vitest pada baseline, menjadi 11 termasuk test manifest baru di head PR; bersama entrypoint `pnpm run check` yang juga menjalankan pemeriksaan non-Vitest dan frontend), `mcp` (15 file Deno yang benar-benar dipanggil `pnpm run test:mcp`), dan `database` (41 file yang cocok dengan include `supabase/tests/database/**/*.test.ts` dari `vitest.database.config.ts`). Semua entri dan suite berstatus `mandatory`. Manifest menginventarisasi **file**, bukan jumlah assertion/case runtime. File frontend, Inspector, audit keamanan, migrasi, dan lint tetap kewajiban pada jalur eksisting walaupun bukan entri file MCP/database di JSON ini.

`tests/gate-suite-manifest.test.ts` membandingkan inventaris dengan discovery source dan database serta **discovery semua `supabase/functions/mcp/*_test.ts` pada filesystem** dan daftar operand `deno test` dalam script `test:mcp` di `package.json`; ketiga daftar (filesystem, operand, manifest) wajib identik; path invalid, hilang, baru, duplikat dan perubahan status wajib harus gagal. Jika konfigurasi include berubah, test juga gagal sampai logika discovery dan inventaris direview. Pemeriksaan ini tidak menjalankan ulang database ataupun MCP.

Gunakan [matriks invariant G1](invariant-matrix.md) untuk pemetaan **case/assertion → invariant** (termasuk I-OWNER, I-ACL, I-IDEMP, I-RACE, I-FACT, I-V1, I-FIXTURE, I-MCP dan I-SOURCE-CI). Nama `phase`, `legacy`, atau `historical` tidak pernah cukup untuk menandai tes opsional. Sebelum status file/case berubah, buat bukti terperiksa **`old_case → replacement`**: identifikasi assertion, input dan fixture, role/JWT serta denial, error/status, transaksi/sesi race, CAS/ledger dan cleanup yang dipertahankan atau diperketat; jalankan perbandingan pada kandidat SHA identik, tautkan run dan keputusan kontrak yang disetujui. Tidak ada perubahan status otomatis dari manifest ini.

## Pekerjaan integrasi berikutnya, bukan perubahan pada PR ini

Pemanggilan MCP ganda sudah terbukti: langkah `Focused OAuth and owner regressions` pada `.github/workflows/backend-technical-gate.yml` menjalankan `pnpm run test:mcp` dan langkah `Full project suites` memanggil `pnpm run test-all`, yang melalui `scripts/test-all.ts` menjalankan `pnpm run test:mcp` lagi. Dedup eksekusi merupakan pekerjaan integrasi G3/G4 setelah pembuktian kesetaraan, **bukan** alasan mengurangi 15 file sekarang.

[CR-020](../decisions/2026-10-15-phase-9-10-risk-based-mvp-acceptance.md), [CR-044](../decisions/2026-10-20-phase-10-gate-order-and-backend-sha-reuse.md), [CR-052](../decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md), dan [rencana gate](../../plans/full-backend-gate-optimization-implementation-plan.md) tetap berlaku. Kewajiban **local security advisors** (I-ADVISOR) berstatus **UNKNOWN / NOT EVIDENCED**, bukan PASS; database lint dan catalog/RLS/grant audit tidak dapat diklaim sebagai advisor. Command/report advisor terpisah beserta PASS pada SHA sama (atau keputusan kontrak eksplisit) wajib sebelum cutover G4.

## Batas verifikasi PR #80

Light CI hanya membuktikan pemeriksaan source yang benar-benar dijalankan pada **head SHA yang sama**, bukan suite database, Inspector, local advisors, ataupun kondisi live. Full backend gate **NOT RUN** untuk PR inventaris tambahan ini. Jangan melakukan deploy, merge, business Write, atau menjalankan database production. Pemeriksaan lokal di ChatGPT web tanpa shell repository: **NOT RUN**; hasil light CI hanya boleh diklaim setelah job selesai dan SHA cocok.
