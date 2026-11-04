# Content Producer

Content Producer membantu pemilik menyiapkan konten trivia Facebook melalui
plugin PRIVATE ChatGPT dan layanan MCP berbasis Supabase. Alurnya mencakup riset,
pemeriksaan duplikasi, draft v2, review, persetujuan, rencana konten,
serta pencatatan publikasi dan performa secara manual.

Niche yang diimplementasikan saat ini adalah `trivia`; core dirancang agar niche
baru dapat memiliki aturan dan modelnya sendiri. Bahasa konten trivia tetap
`en-US`, sedangkan panduan pengembangan menggunakan bahasa Indonesia.

## Mulai memahami project

| Kebutuhan                             | Panduan                                |
| ------------------------------------- | -------------------------------------- |
| Tujuan produk dan peta implementasi   | [Arsitektur](docs/architecture.md)     |
| Arti data dan aturan bisnis           | [Domain](docs/domain.md)               |
| Input/output dan pilihan 31 tool aktif | [Kontrak tool](docs/tool-contracts.md) |
| Setup lokal dan pengembangan fitur    | [Development](docs/development.md)     |
| Memilih test dan gate CI              | [Testing](docs/testing.md)             |
| Versi terpasang, rilis, dan pemulihan | [Operations](docs/operations.md)       |
| Instruksi kerja AI                    | [AGENTS.md](AGENTS.md)                 |

Indeks lengkap ada di [docs/README.md](docs/README.md). Kontrak frozen dalam
`plans/` dan keputusan di `docs/decisions/` tetap menjadi acuan teknis.

## Status dan alur kerja aktif

Project sudah digunakan di production menurut pemilik. Source menggunakan default
owner OAuth dengan app `mcpku2`. Kandidat cutover menyediakan 31 tool aktif,
yaitu 11 Baca dan 20 Tulis; lima tool khusus trivia v1 pensiun. Ringkasan
versi source dan bukti deployment yang tercatat dipusatkan di
[operations](docs/operations.md#1-satu-ringkasan-versi-dengan-sumber-bukti-yang-jelas);
HEAD lokal bukan bukti versi live terbaru.

Pengujian langsung dan remediasi mengikuti [Live Test & Fix](docs/live-test/README.md):
satu prompt → chat baru oleh pemilik → bukti disanitasi → verdict → Issue → PR
fokus dan Actions → retest pada runtime yang terverifikasi. Lihat
[matriks live historis dan cakupan v2](docs/live-test/test-matrix.md), [log hasil](docs/live-test/results.md),
dan [Issue kampanye #25](https://github.com/milyarderpro/content-producer/issues/25).

[Issue #26](https://github.com/milyarderpro/content-producer/issues/26) merekam
percobaan historis yang berhenti pada dedup Read; reserve/save tidak dipanggil
menurut ringkasan yang tersedia. E2E draft baru masih BLOCKED pada log lokal itu.
Periksa bukti terbaru sebelum menyimpulkan masalah atau mengulang write.

Phase 10 historis Pilot-ready; final AC dan Phase 11 bukan antrean aktif. Hasil
cleanup dan verifikasi lokal dirangkum dalam
[audit cleanup](docs/cleanup-audit.md#ringkasan-hasil-cleanup), tanpa mengubah hasil
acceptance historis menjadi PASS.

## Menyiapkan lingkungan

- Node.js mengikuti selector `.nvmrc >=22` dan engine `>=22 <25` (major 22–24); pnpm tetap pin `10.33.2`. G4 memeriksa versi aktual terhadap irisan range dan merekam keduanya dalam report.
- Supabase CLI `2.120.0` tersedia melalui dependency project.
- Deno mengikuti selector `.deno-version >=2.9.7`; G4 fail-closed pada major 2.x yang disetujui (major 3 belum diuji), serta mencatat versi aktual. Deno diperlukan untuk `test:mcp` dan harness HTTP.
- Workflow light CI, G4 manual, dan legacy backend gate memakai input Actions **Node `>=22 <25`** serta **Deno `>=2.9.7 <3`** agar resolver runtime memilih irisan aman. G4 memilih sekali per run lalu membagikan versi exact ke seluruh job ([CR-060](docs/decisions/2026-11-04-cr-060-g4-single-runtime-resolution.md)). File deklarasi pemilik tidak diubah; gate menolak drift tiga string deklarasi yang belum di-review sebelum membuat laporan `effective`.
- Docker diperlukan untuk stack Supabase dan suite database lokal.

Instalasi dependency dari root:

```sh
pnpm install --frozen-lockfile
```

Selanjutnya pilih command sesuai pekerjaan, bukan menjalankan semuanya sekaligus:

| Command                   | Fungsi singkat                                                |
| ------------------------- | ------------------------------------------------------------- |
| `pnpm run check`          | Lint, typecheck, root test, dan frontend checks/build         |
| `pnpm run test:mcp`       | Suite MCP terisolasi melalui Deno                             |
| `pnpm run test:database`  | Suite database pada stack lokal yang sudah siap               |
| `pnpm run test-all`       | **Legacy/rollback:** check, migration names, MCP dan database |
| `pnpm run package-plugin` | Membuat kandidat paket lokal yang tervalidasi                 |

`pnpm run format` dan `pnpm run format:check` tetap tersedia untuk penggunaan
manual. Prettier bukan gate wajib; review isi/referensi, `git diff --check`,
dan check non-style sesuai risiko tetap wajib. Keputusan aktif ada di
[CR-055](docs/decisions/2026-11-01-cr-055-prettier-optional-gate.md).

**Gate rilis G4 aktif:** dispatch
[`backend-gate-candidate.yml`](.github/workflows/backend-gate-candidate.yml)
**manual pada exact final SHA `main`**; syarat formal adalah source,
dua shard terisolasi **15+18 = 33 file/132 kasus database** dan aggregate
PASS pada SHA/hash sama. Tidak ada trigger otomatis atau required branch
protection check. `pnpm run gate:source`, `gate:backend`, `gate:full`
adalah komponen G4; lokal `DIAGNOSTIC_CONFIG_OVERLAY` hanya diagnostik.
`pnpm run test-all` dan
[`backend-technical-gate.yml`](.github/workflows/backend-technical-gate.yml)
adalah **legacy/rollback**, sesuai
[CR-052](docs/decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md)
yang efektif sejak merge PR #105.

**Estimasi CI wajib sebelum run/dispatch/push/PR.** Untuk gate wajib yang
**sudah diizinkan** dan diperkirakan lebih dari 10 menit, **mulai/dispatch**,
catat SHA, URL, estimasi dan status sementara, lalu **hentikan pemantauan
chat tanpa menunggu hasil**. Run berjalan bukan PASS; gate wajib tidak boleh
dilewati. Ikuti [aturan pemantauan](AGENTS.md#3-estimasi-ci-wajib-dan-batas-pemantauan)
dan [testing](docs/testing.md).

## Batas produk dan perubahan

- `plugin/` berisi source paket dan instruksi ChatGPT; packaging tidak sama
  dengan instalasi plugin.
- `auth-frontend/` terbatas pada autentikasi/consent dan utilitas uji terkait;
  bukan dashboard produk.
- `supabase/` berisi migration, RPC, Edge MCP, dan test database. Aturan transaksi
  berada pada core/niche SQL; MCP menjaga transport dan pemetaan yang tipis.
- Canva dan Facebook tetap dikerjakan manual; backend tidak membuat video,
  memublikasikan post, atau mengambil analitik Facebook secara otomatis.
- Perubahan kode, merge, deploy, dan perubahan data production mempunyai scope
  izin masing-masing. Pertahankan owner OAuth, RLS, CAS, dan bukti hasil yang jujur.
