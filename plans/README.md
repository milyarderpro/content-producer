# Kontrak dan referensi perencanaan

Dokumen kontrak frozen berikut tetap menjadi acuan teknis, dilengkapi keputusan
yang diterima dalam `docs/decisions/`. Panduan yang lebih ringkas untuk pekerjaan
baru ada di [docs/README.md](../docs/README.md).

| Dokumen                                               | Peran                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| [PRD](PRD.md)                                         | Kebutuhan dan batas produk                                       |
| [Database design](database-design.md)                 | Model data, transaksi, dan invariant                             |
| [Module contract](module-contract.md)                 | Batas core/niche dan versioning                                  |
| [Tool inventory](tool-inventory.md)                   | Kontrak 33 tool, dengan override keputusan yang relevan          |
| [Trivia content DNA](trivia-content-dna.md)           | Kontrak editorial trivia                                         |
| [Workflow pengguna](workflow-users.md)                | Alur penggunaan yang direncanakan                                |
| [Decision register](phase-0-decision-register.md)     | Keputusan baseline                                               |
| [Use-case inventory](use-case-inventory.md)           | Inventaris kebutuhan dan 101 kasus, bukan bukti sudah dieksekusi |
| [Acceptance traceability](acceptance-traceability.md) | Pemetaan requirement/AC, bukan hasil acceptance terkini          |

Rencana kerja rinci di `plans/works/` telah dipindahkan ke
[archive/plans/works](../archive/README.md#rencana-fase-dan-tracker-historis--14-file).
[Rencana evaluasi editorial trivia](trivia-editorial-evaluation-plan.md) adalah
rencana kerja baru yang diagnostik, bukan perubahan kontrak frozen atau kelanjutan
fase historis.
[Implementation plan](implementation-plan.md) sekarang menjadi pengarah singkat
ke arsip dan mempertahankan anchor tracker lama. Referensi path literal di record
lama dapat ditelusuri melalui tabel lokasi pada indeks arsip.

Kontrak di atas tidak ikut dipindah atau diubah. Sebagian menjadi input langsung
test/packaging; perubahan lokasi maupun semantiknya perlu rekonsiliasi pembaca
dan keputusan kontrak yang sesuai.

## Hasil akhir gate rilis backend G4

Sejak merge [PR #105](https://github.com/milyarderpro/content-producer/pull/105)
(`ca5c43597af97c95ea9eaa87876237fd2d45e10c`), [CR-052](../decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md) **efektif** sebagai gate rilis
manual exact final SHA `main`. Tiga Actions formal pada
`a64a55ebb1e3c76112cd211724c2eb6bc256699a`:
[#41072354433](https://github.com/milyarderpro/content-producer/actions/runs/41072354433) **9m41s**, [#41074001136](https://github.com/milyarderpro/content-producer/actions/runs/41074001136) **9m43s**, dan [#41157962349](https://github.com/milyarderpro/content-producer/actions/runs/41157962349) **9m50s**. Partisi **19+22 = 41 file/182 kasus DB**,
MCP **15/82**, Inspector **33 valid/33 invalid + owner denial** tepat sekali
di shard 1, local security advisors terpisah, migration/history/lint,
audit RLS/grants/ACL/fixture dan cleanup, serta source dan aggregate PASS.
Lokal `gate:full` **18m50s** dengan `DIAGNOSTIC_CONFIG_OVERLAY` **bukan**
bukti formal exact-config. CR-020/044 tetap kontrol keamanan; workflow legacy
`backend-technical-gate.yml`/`pnpm run test-all` adalah rollback, bukan
release gate utama. Tidak ada required check/branch protection otomatis,
deployment, OAuth hosted, atau live business Write yang dibuktikan.
Hasil ini tidak menulis ulang rencana optimasi asli ataupun kontrak frozen.
