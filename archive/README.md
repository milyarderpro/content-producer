# Arsip pengembangan Content Producer

Arsip ini menyimpan **51 dokumen dan artefak historis**: 47 dipindahkan pada
Task 4 dan empat snapshot reset pada Task 5, 25 Oktober 2026. Untuk memahami atau mengembangkan project sekarang,
mulai dari [panduan aktif](../docs/README.md). Untuk versi source dan bukti
deployment, gunakan [operations](../docs/operations.md).

## Cara membaca arsip

- Isi merekam kondisi, keputusan, hasil, dan keterbatasan pada waktu penulisannya.
  Kalimat seperti “langkah berikutnya”, “pending”, atau “production belum dibuat”
  bukan instruksi aktif maupun pernyataan keadaan live sekarang.
- Procedure-v1, prompt, verdict, angka, dan bukti historis dipertahankan.
  `manual-cards.md` dipindahkan tanpa perubahan byte; beberapa dokumen lain hanya
  mendapat penyesuaian tujuan tautan lokal agar navigasi tetap benar.
- Pengantar/indeks baru menggunakan bahasa Indonesia. Bahasa asli bukti tidak
  diterjemahkan agar arti dan asal-usulnya tidak berubah.
- Referensi path literal serta command dalam laporan berlaku pada checkout asal.
  Gunakan tabel lokasi di bawah untuk menemukan file sekarang; jangan menjalankan
  command checkpoint sebagai prosedur pengembangan terkini.
- Kontrak frozen tetap berada di [plans](../plans/README.md), keputusan perubahan
  tetap di `docs/decisions/`, dan kampanye aktif tetap [Live Test & Fix](../docs/live-test/README.md).
  Mengarsipkan laporan tidak mengubah kontrak atau status acceptance.

Snapshot asal dapat ditelusuri melalui Git pada
`d6e7fe83ea006931f85624c4d60486f92ab3438c` dengan path sebelum pemindahan.
SHA ini adalah baseline lokal, bukan klaim deployment atau commit yang sudah
tersedia di GitHub. Rincian perubahan ada di [audit cleanup](../docs/cleanup-audit.md).

## Rencana fase dan tracker historis — 14 file

Path sebelum pemindahan menggunakan prefix `plans/`. Path pada kolom kanan relatif
terhadap `archive/`.

| Path sebelum pemindahan                           | Lokasi arsip                                                                 |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `plans/implementation-plan.md`                    | [Tracker dan rencana lengkap](plans/implementation-plan.md)                  |
| `plans/works/phase-3-implementation-plan.md`      | [Rencana Phase 3](plans/works/phase-3-implementation-plan.md)                |
| `plans/works/phase-4-implementation-plan.md`      | [Rencana Phase 4](plans/works/phase-4-implementation-plan.md)                |
| `plans/works/phase-5-implementation-plan.md`      | [Rencana Phase 5](plans/works/phase-5-implementation-plan.md)                |
| `plans/works/phase-5-4-implementation-plan.md`    | [Rencana checkpoint 5.4](plans/works/phase-5-4-implementation-plan.md)       |
| `plans/works/phase-5-5-implementation-plan.md`    | [Rencana checkpoint 5.5](plans/works/phase-5-5-implementation-plan.md)       |
| `plans/works/phase-5-6-implementation-plan.md`    | [Rencana checkpoint 5.6](plans/works/phase-5-6-implementation-plan.md)       |
| `plans/works/phase-5-7-implementation-plan.md`    | [Rencana checkpoint 5.7](plans/works/phase-5-7-implementation-plan.md)       |
| `plans/works/phase-5-batch-b-remediation-plan.md` | [Rencana remediasi Batch B](plans/works/phase-5-batch-b-remediation-plan.md) |
| `plans/works/phase-6-implementation-plan.md`      | [Rencana Phase 6](plans/works/phase-6-implementation-plan.md)                |
| `plans/works/phase-7-implementation-plan.md`      | [Rencana Phase 7](plans/works/phase-7-implementation-plan.md)                |
| `plans/works/phase-8-implementation-plan.md`      | [Rencana Phase 8](plans/works/phase-8-implementation-plan.md)                |
| `plans/works/phase-9-implementation-plan.md`      | [Rencana Phase 9](plans/works/phase-9-implementation-plan.md)                |
| `plans/works/phase-10-implementation-plan.md`     | [Rencana Phase 10](plans/works/phase-10-implementation-plan.md)              |

Path `plans/implementation-plan.md` tetap tersedia sebagai pengarah singkat dengan
anchor tracker lama. Isi lengkapnya hanya ada di arsip; tidak diduplikasi sebagai
rencana kerja aktif.

## Laporan dan artefak Phase 5 — 25 file

Semua file berikut sebelumnya langsung berada di `docs/`; nama file dipertahankan
di `archive/docs/phase-5/`.

| Nama file                                             | Lokasi arsip                                                                           |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `phase-5-3-catalog-audit.sql`                         | [SQL audit 5.3](docs/phase-5/phase-5-3-catalog-audit.sql)                              |
| `phase-5-3-checkpoint-report.md`                      | [Laporan 5.3](docs/phase-5/phase-5-3-checkpoint-report.md)                             |
| `phase-5-4-catalog-audit.sql`                         | [SQL audit 5.4](docs/phase-5/phase-5-4-catalog-audit.sql)                              |
| `phase-5-4-checkpoint-report.md`                      | [Laporan 5.4](docs/phase-5/phase-5-4-checkpoint-report.md)                             |
| `phase-5-5-catalog-audit.sql`                         | [SQL audit 5.5](docs/phase-5/phase-5-5-catalog-audit.sql)                              |
| `phase-5-5-checkpoint-report.md`                      | [Laporan 5.5](docs/phase-5/phase-5-5-checkpoint-report.md)                             |
| `phase-5-6-catalog-audit.sql`                         | [SQL audit 5.6](docs/phase-5/phase-5-6-catalog-audit.sql)                              |
| `phase-5-6-checkpoint-report.md`                      | [Laporan 5.6](docs/phase-5/phase-5-6-checkpoint-report.md)                             |
| `phase-5-7-checkpoint-report.md`                      | [Laporan 5.7](docs/phase-5/phase-5-7-checkpoint-report.md)                             |
| `phase-5-8-checkpoint-report.md`                      | [Laporan 5.8](docs/phase-5/phase-5-8-checkpoint-report.md)                             |
| `phase-5-9-checkpoint-report.md`                      | [Laporan 5.9](docs/phase-5/phase-5-9-checkpoint-report.md)                             |
| `phase-5-9-performance-B.json`                        | [Pengukuran B historis](docs/phase-5/phase-5-9-performance-B.json)                     |
| `phase-5-batch-b-remediation-before.json`             | [Pengukuran sebelum remediasi](docs/phase-5/phase-5-batch-b-remediation-before.json)   |
| `phase-5-batch-b-remediation-after.json`              | [Pengukuran setelah remediasi](docs/phase-5/phase-5-batch-b-remediation-after.json)    |
| `phase-5-batch-b-remediation-gold-development-A.json` | [Gold development A](docs/phase-5/phase-5-batch-b-remediation-gold-development-A.json) |
| `phase-5-batch-b-remediation-gold-development-B.json` | [Gold development B](docs/phase-5/phase-5-batch-b-remediation-gold-development-B.json) |
| `phase-5-batch-b-remediation-gold-holdout-A.json`     | [Gold holdout A](docs/phase-5/phase-5-batch-b-remediation-gold-holdout-A.json)         |
| `phase-5-batch-b-remediation-gold-holdout-B.json`     | [Gold holdout B](docs/phase-5/phase-5-batch-b-remediation-gold-holdout-B.json)         |
| `phase-5-batch-b-remediation-performance-A.json`      | [Performa remediasi A](docs/phase-5/phase-5-batch-b-remediation-performance-A.json)    |
| `phase-5-batch-b-remediation-performance-B.json`      | [Performa remediasi B](docs/phase-5/phase-5-batch-b-remediation-performance-B.json)    |
| `phase-5-batch-b-remediation-preflight.json`          | [Preflight remediasi](docs/phase-5/phase-5-batch-b-remediation-preflight.json)         |
| `phase-5-batch-b-remediation-search-A.json`           | [Search A historis](docs/phase-5/phase-5-batch-b-remediation-search-A.json)            |
| `phase-5-batch-b-remediation-search-B.json`           | [Search B historis](docs/phase-5/phase-5-batch-b-remediation-search-B.json)            |
| `phase-5-batch-b-remediation-report.md`               | [Laporan remediasi Batch B](docs/phase-5/phase-5-batch-b-remediation-report.md)        |
| `phase-5-batch-b-remediation-p2-03-report.md`         | [Verifikasi remediasi akhir](docs/phase-5/phase-5-batch-b-remediation-p2-03-report.md) |

## Boundary owner, deployment, dan penerimaan — 8 file

| Path sebelum pemindahan                          | Lokasi arsip                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| `docs/phase-6-batch-a-workspace-remediation.md`  | [Remediasi workspace](docs/phase-6/phase-6-batch-a-workspace-remediation.md) |
| `docs/phase-9/inventory-9.0.md`                  | [Inventaris deployment awal](docs/phase-9/inventory-9.0.md)                  |
| `docs/phase-9/deployment-9.2.md`                 | [Persiapan deployment historis](docs/phase-9/deployment-9.2.md)              |
| `docs/phase-10/preflight-10.0.md`                | [Preflight host](docs/phase-10/preflight-10.0.md)                            |
| `docs/phase-10/oauth-v29-evidence-2026-10-20.md` | [Bukti OAuth v29](docs/phase-10/oauth-v29-evidence-2026-10-20.md)            |
| `docs/phase-10/manual-cards.md`                  | [Kartu procedure-v1](docs/phase-10/manual-cards.md)                          |
| `docs/phase-10/manual-results.md`                | [Hasil kartu manual](docs/phase-10/manual-results.md)                        |
| `docs/phase-10/acceptance-evidence.md`           | [Bukti acceptance dan batasnya](docs/phase-10/acceptance-evidence.md)        |

## Tambahan empat snapshot reset pada Task 5

Skrip pembacanya sudah dipensiunkan dari source aktif. Keempat snapshot berikut
dipindahkan dari `docs/` tanpa perubahan byte:

| Nama file                                  | Lokasi arsip                                                               |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `phase-5-9-reset-A.json`                   | [Reset 5.9 A](docs/phase-5/phase-5-9-reset-A.json)                         |
| `phase-5-9-reset-B.json`                   | [Reset 5.9 B](docs/phase-5/phase-5-9-reset-B.json)                         |
| `phase-5-batch-b-remediation-reset-A.json` | [Reset remediasi A](docs/phase-5/phase-5-batch-b-remediation-reset-A.json) |
| `phase-5-batch-b-remediation-reset-B.json` | [Reset remediasi B](docs/phase-5/phase-5-batch-b-remediation-reset-B.json) |

## Input yang tetap dipakai dan output pengujian baru

Empat input berikut tetap pada path semula dan tidak berubah byte:

| Input yang dipertahankan                                                                                 | Pembaca utama                               |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [phase-5-7-catalog-audit.sql](../docs/phase-5-7-catalog-audit.sql)                                       | Audit katalog aktif                         |
| [phase-5-8-catalog-audit.sql](../docs/phase-5-8-catalog-audit.sql)                                       | Audit katalog aktif dan test acceptance RPC |
| [phase-5-9-final-catalog.json](../docs/phase-5-9-final-catalog.json)                                     | Baseline audit katalog aktif                |
| [phase-5-batch-b-remediation-final-catalog.json](../docs/phase-5-batch-b-remediation-final-catalog.json) | Baseline audit katalog aktif                |

Snapshot performa A berpindah ke
[fixture history](../supabase/tests/fixtures/trivia/history/README.md), bersama
pembaruan lokasi yang dibaca test; isi dan expected `label: A` tetap sama.
`docs/phase-8/coverage-map.json` dan `preflight-8.0.md` tetap menjadi input coverage
test tanpa perubahan. Sembilan input yang dipertahankan pada Task 4 kini memiliki
disposisi lengkap: empat tetap, satu fixture history, dan empat snapshot arsip.

Jika `CR016_EVIDENCE_RUN=A/B` dipasang, test yang relevan sekarang menyimpan hasil
baru ke `artifacts/cr016/`, bukan menulis ulang file dokumentasi atau bukti lama.
Perubahan lokasi output tidak membuat hasil pengujian baru menjadi bukti live.

## Skrip lama yang dipensiunkan pada Task 5

Source lama tetap dapat ditelusuri melalui Git baseline pada path aslinya:

- `scripts/phase-5-evidence.ts`, `phase-5-remediation-evidence.ts`, dan
  `phase-5-remediation-exercise.ts`: reproduksi checkpoint tertentu, bukan audit
  umum untuk source/database sekarang.
- `scripts/generate-mcp-config.ts`: CLI No-auth historis yang tidak dipakai paket
  `.app.json` sekarang. Validator/schema yang masih dibaca test tetap ada.
- `scripts/phase-6-batch-a.ts` serta `phase-6-7.ts` sampai `phase-6-12.ts`:
  harness bertahap yang cakupannya sudah ada di `scripts/phase-6-13.ts`.
- `supabase/functions/_shared/foundation_test.ts`: test keberadaan runtime Deno
  dari fondasi lama; pin dan suite MCP Deno tetap dipertahankan.

Gunakan checkout asal ketika memerlukan reproduksi historis, bukan menjalankan
salinan skrip dengan migration atau helper yang berbeda. Daftar assertion yang
ditinjau serta batas bukti cleanup dicatat pada audit. Pada Task 6, workflow lama
dikonsolidasikan dan `phase-6-reuse-suites.ts` beserta marker pemicu gate juga
dipensiunkan. Bukti reuse yang terikat SHA/run lama tetap dapat dibaca melalui Git;
gate baru memakai exact candidate main SHA dan tidak memalsukan reuse historis.
