# Content Producer

Content Producer membantu pemilik menyiapkan konten trivia Facebook melalui
plugin PRIVATE ChatGPT dan layanan MCP berbasis Supabase. Alurnya mencakup riset,
pemeriksaan duplikasi, reservasi fakta, draft, review, persetujuan, rencana konten,
serta pencatatan publikasi dan performa secara manual.

Niche yang diimplementasikan saat ini adalah `trivia`; core dirancang agar niche
baru dapat memiliki aturan dan modelnya sendiri. Bahasa konten trivia tetap
`en-US`, sedangkan panduan pengembangan menggunakan bahasa Indonesia.

## Mulai memahami project

| Kebutuhan                             | Panduan                                |
| ------------------------------------- | -------------------------------------- |
| Tujuan produk dan peta implementasi   | [Arsitektur](docs/architecture.md)     |
| Arti data dan aturan bisnis           | [Domain](docs/domain.md)               |
| Input/output dan pilihan 33 tool      | [Kontrak tool](docs/tool-contracts.md) |
| Setup lokal dan pengembangan fitur    | [Development](docs/development.md)     |
| Memilih test dan gate CI              | [Testing](docs/testing.md)             |
| Versi terpasang, rilis, dan pemulihan | [Operations](docs/operations.md)       |
| Instruksi kerja AI                    | [AGENTS.md](AGENTS.md)                 |

Indeks lengkap ada di [docs/README.md](docs/README.md). Kontrak frozen dalam
`plans/` dan keputusan di `docs/decisions/` tetap menjadi acuan teknis.

## Status dan alur kerja aktif

Project sudah digunakan di production menurut pemilik. Source menggunakan default
owner OAuth dengan app `mcpku2` dan 33 tool, yaitu 11 Baca dan 22 Tulis. Ringkasan
versi source dan bukti deployment yang tercatat dipusatkan di
[operations](docs/operations.md#1-satu-ringkasan-versi-dengan-sumber-bukti-yang-jelas);
HEAD lokal bukan bukti versi live terbaru.

Pengujian langsung dan remediasi mengikuti [Live Test & Fix](docs/live-test/README.md):
satu prompt → chat baru oleh pemilik → bukti disanitasi → verdict → Issue → PR
fokus dan Actions → retest pada runtime yang terverifikasi. Lihat
[matriks 33 tool](docs/live-test/test-matrix.md), [log hasil](docs/live-test/results.md),
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

- Node.js `24.15.0` dan pnpm `10.33.2` mengikuti pin repository.
- Supabase CLI `2.120.0` tersedia melalui dependency project.
- Deno `2.9.7` diperlukan untuk `test:mcp` dan harness HTTP.
- Docker diperlukan untuk stack Supabase dan suite database lokal.

Instalasi dependency dari root:

```sh
pnpm install --frozen-lockfile
```

Selanjutnya pilih command sesuai pekerjaan, bukan menjalankan semuanya sekaligus:

| Command                   | Fungsi singkat                                                |
| ------------------------- | ------------------------------------------------------------- |
| `pnpm run check`          | Format, lint, typecheck, root test, dan frontend checks/build |
| `pnpm run test:mcp`       | Suite MCP terisolasi melalui Deno                             |
| `pnpm run test:database`  | Suite database pada stack lokal yang sudah siap               |
| `pnpm run test-all`       | **Legacy/rollback:** check, migration names, MCP dan database |
| `pnpm run package-plugin` | Membuat kandidat paket lokal yang tervalidasi                 |

**Gate rilis G4 aktif:** dispatch
[`backend-gate-candidate.yml`](.github/workflows/backend-gate-candidate.yml)
**manual pada exact final SHA `main`**; syarat formal adalah source,
dua shard terisolasi **19+22 = 41 file/182 kasus database** dan aggregate
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
