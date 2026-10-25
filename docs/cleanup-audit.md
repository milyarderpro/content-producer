# Audit dan pelaksanaan cleanup project

**Tanggal:** 25 Oktober 2026. **Cakupan:** inventaris lokal, penelusuran dependensi,
keputusan cleanup, dan catatan pelaksanaan Task 1–7. Ini adalah pemeliharaan repository,
bukan kelanjutan checkpoint Phase 11 atau laporan acceptance production baru.

## Ringkasan hasil cleanup

Tujuh task memisahkan panduan aktif dari sejarah, mengurangi tooling yang sudah
digantikan, dan menata CI sesuai kebutuhan pemeliharaan. Hasil akhir dan batas
verifikasi Task 7 dicatat pada bagian 16. Baseline hitungan adalah HEAD sebelum
cleanup, bukan arsip rancangan lebih lama yang sudah dihapus pemilik.

**Status: Task 1–7 selesai untuk source dan verifikasi lokal.** Pelepasan perubahan
melalui commit/PR/Actions serta pemeriksaan runtime tetap memiliki scope tersendiri.

| Area                                                         | Baseline Task 1 | Kandidat akhir |
| ------------------------------------------------------------ | --------------: | -------------: |
| File tracked                                                 |             412 |            388 |
| File dalam `docs/` dan `plans/` aktif, termasuk input teknis |             122 |             78 |
| Skrip aktif                                                  |              25 |             14 |
| Workflow source                                              |              10 |              3 |
| Placeholder `.gitkeep`                                       |              20 |              2 |
| File test                                                    |              66 |             68 |
| Migration                                                    |              70 |             70 |
| Tool bisnis                                                  |              33 |             33 |

Enam panduan utama ada di indeks docs; AGENTS menunjukkan urutan baca yang relevan.
Sebanyak 51 payload historis dipertahankan di arsip, sedangkan snapshot performa
yang masih dibaca test dipindahkan ke fixture history. Empat input audit Phase 5,
dua input Phase 8, kontrak frozen, serta keputusan tetap tersedia.

Hasil check proyek, regresi CI, dan verifikasi ZIP terakhir dicatat pada Task 6.
Penyelesaian cleanup lokal tidak menyatakan workflow baru sudah berjalan di
GitHub atau runtime production telah diverifikasi ulang.

## 1. Kesimpulan dan batas keputusan

Project sudah production menurut pernyataan pemilik. Repository masih mencampur
kontrak aktif, instruksi operasional, bukti historis, dan tooling checkpoint lama.
Prioritas cleanup adalah membuat jalur baca yang akurat sebelum mengurangi file.

- Semua **412 file tracked pada baseline** tercakup dalam inventaris per kelompok
  di bawah. Pembacaan isi dan penelusuran dependensi difokuskan pada entrypoint,
  konfigurasi, command, test, workflow, dan referensi kandidat cleanup; ini bukan
  audit perilaku setiap baris kode.
- **Tidak ada penghapusan pada Task 1.** Keputusan DELETE/ARCHIVE adalah tujuan
  bersyarat untuk task berikutnya, bukan izin menghapus seluruh glob sekaligus.
- File tanpa pemanggil statis belum tentu tidak digunakan secara manual, oleh
  loader eksternal, atau pada deployment. Ketidakpastian dicatat sebagai syarat;
  default-nya tetap KEEP sampai syarat terpenuhi.
- Kontrak frozen dan keputusan yang masih berlaku tetap berwenang. Panduan baru
  harus merujuknya sampai penggantian kewenangan didokumentasikan secara eksplisit.
- Status production sekarang tidak mengubah hasil historis AC-001..AC-014,
  Phase 8, atau Phase 11 menjadi PASS.

## 2. Baseline yang dapat direproduksi

| Item                             | Hasil audit                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HEAD lokal                       | `d6e7fe83ea006931f85624c4d60486f92ab3438c` (`dell01`)                                                                                                   |
| Branch                           | `main`; working tree bersih sebelum Task 1                                                                                                              |
| Tracking ref lokal               | `origin/main` = `cada9de9ffe916f232cf3efee84f987769fd1c6b`; lokal ahead 1                                                                               |
| Kesegaran remote                 | Tidak melakukan fetch; tracking ref bukan bukti HEAD GitHub terbaru                                                                                     |
| Perubahan pemilik yang sudah ada | HEAD menghapus 13 file dan memperbarui 1 file: arsip rancangan lama, dataset tanpa ekstensi, placeholder; total 10.352 baris terhapus dan 1 ditambahkan |
| Perlakuan terhadap HEAD          | Dipertahankan; tidak di-reset, di-amend, atau dipulihkan penghapusannya                                                                                 |
| Runtime lokal yang dibaca        | Node `v24.15.0`, pnpm `10.33.2`, sesuai pin repository                                                                                                  |
| Akses GitHub                     | `gh` tidak tersedia (`command not found`); Issue/PR, required checks, serta riwayat/durasi Actions terbaru belum diverifikasi                           |
| Lingkungan production            | Tidak diakses pada audit ini; identitas/versi berikut adalah bukti tercatat di repository                                                               |

Daftar file baseline dapat direproduksi dengan:

```sh
git ls-tree -r --name-only d6e7fe83ea006931f85624c4d60486f92ab3438c
git show --stat d6e7fe83ea006931f85624c4d60486f92ab3438c
```

Angka inventaris mengacu pada baseline tersebut, tidak termasuk dokumen audit ini,
file untracked/ignored, dependency terpasang, build output, atau isi database.
`archive/` sudah kosong dan `artifacts/` hanya berisi `.gitkeep` ketika dibaca.
Riwayat file yang sudah dihapus pemilik tetap berada di Git sebelum HEAD.

### Baseline produk: pisahkan source dan bukti deployment

| Area               | Source / bukti tercatat                                                                                         | Status verifikasi Task 1                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Plugin             | `plugin/plugin.json` menyatakan `0.2.3`; `.app.json` adalah mapping app owner OAuth yang sudah ada              | Source lokal terkonfirmasi; instalasi terkini tidak diperiksa                                                                             |
| Koneksi            | `mcpku2`, 33 tool (11 Read / 22 Write) menurut runbook dan evidence kampanye                                    | Bukti historis repository, bukan pemanggilan tool baru                                                                                    |
| Edge               | README/AGENTS menyebut v31; hasil LT-016 merekam v32; CR-049 merekam Edge tetap v33 saat rollout SQL 22 Oktober | v33 adalah versi paling baru yang ditemukan pada record yang ditinjau; versi live sekarang dan exact deployed Edge SHA belum diverifikasi |
| Database           | Ada 70 migration source; CR-049 mencatat 70 migration production dan rollout SQL tanpa perubahan Edge           | Hitungan source terkonfirmasi; applied history sekarang belum dibaca                                                                      |
| Full gate historis | CR-049 merekam kandidat `1a4e755a48f3c77eb557b931fd6bd99d5e1b24fd` dan run `39768822314`                        | Referensi tersimpan; tidak mengklaim HEAD lokal mempunyai exact-SHA gate yang sama                                                        |
| Frontend           | Source auth tersedia; `vercel.json` mematikan Git auto-deployment; tracker merekam deployment Phase 9           | Source terkonfirmasi; deployment, flag sementara, dan konfigurasi hosted sekarang belum diperiksa                                         |
| Live tests         | `docs/live-test/results.md` merekam 11 Read PASS; LT-E2E-01 masih BLOCKED pada log tersebut                     | Status menurut record lokal; Issue terbaru dan hasil setelah record tersebut belum diperiksa                                              |

Referensi: [hasil live test](live-test/results.md),
[CR-049](decisions/2026-10-22-cr-049-get-post-source-evidence-null-preservation.md),
[phase tracker](../archive/plans/implementation-plan.md#16-phase-tracker).
Link eksternal di dokumen tersebut dipertahankan sebagai referensi; tidak dinilai
ulang sebagai PASS pada Task 1.

## 3. Inventaris seluruh kelompok tracked

KEEP = pertahankan. CONSOLIDATE = gabungkan/perbarui informasi atau fungsi sambil
menjaga referensi. ARCHIVE = simpan sebagai sejarah di luar jalur baca utama.
DELETE = kandidat penghapusan setelah syarat dan dependensinya dituntaskan.

| Kelompok baseline    |    File | Keputusan utama                       | Alasan / task pelaksana                                                               |
| -------------------- | ------: | ------------------------------------- | ------------------------------------------------------------------------------------- |
| File root            |      16 | KEEP / CONSOLIDATE                    | Konfigurasi/pin/lock tetap; README dan AGENTS diperbarui di Task 3                    |
| `.github/`           |      11 | CONSOLIDATE                           | 10 workflow + 1 marker; rincian Task 6 di bagian 7                                    |
| `artifacts/`         |       1 | KEEP                                  | Placeholder direktori output yang dirujuk foundation test                             |
| `auth-frontend/`     |      21 | KEEP / CONSOLIDATE                    | Source auth, build, hosting, 3 test; README usang; route uji bukan file bebas hapus   |
| `dataset-reference/` |       3 | KEEP                                  | Ketiga dataset dibaca test provenance dedup                                           |
| `docs/`              |      99 | CONSOLIDATE / ARCHIVE                 | Ada kontrak/fixture operasional di antara laporan historis; rincian bagian 4          |
| `plans/`             |      23 | KEEP / ARCHIVE                        | 10 dokumen top-level masih kontrak; 13 rencana kerja kandidat arsip                   |
| `plugin/`            |      16 | KEEP / CONSOLIDATE                    | 13 file paket, README, schema generator lama, dan 1 placeholder                       |
| `scripts/`           |      25 | KEEP / CONSOLIDATE / ARCHIVE / DELETE | Pisahkan utilitas aktif, gate aktif, dan harness checkpoint; rincian bagian 5         |
| `supabase/`          |     185 | KEEP                                  | 70 migration, 54 file functions, 57 file tests, seed, dan 3 file root boundary/config |
| `tests/`             |      12 | KEEP / CONSOLIDATE                    | 6 file test root + 6 placeholder; rincian bagian 6                                    |
| **Total**            | **412** |                                       | Kelompok di tabel ini tidak tumpang tindih                                            |

Terdapat **66 file test**, bukan 66 test case: 6 root Vitest, 40 database,
17 Deno (15 MCP, 1 probe, 1 foundation opsional), dan 3 frontend Node.
Tidak semuanya dijalankan oleh satu command yang sama.

## 4. Matriks dokumen dan sumber pengetahuan

| File / kelompok                                                                                                               | Jumlah | Keputusan                           | Syarat dan dependensi                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------- | -----: | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`, `AGENTS.md`, `docs/README.md`                                                                                    |      3 | CONSOLIDATE                         | Task 3: satu urutan baca; pisahkan status source, runtime, dan sejarah; jangan menyalin semua kontrak ke AGENTS                                                                                    |
| `auth-frontend/README.md`, `supabase/README.md`, `plugin/README.md`, `docs/runbooks/local-development.md`                     |      4 | CONSOLIDATE                         | Task 3: ganti narasi fase dengan prosedur terkini; pertahankan batas auth dan operasional                                                                                                          |
| `plans/PRD.md`, `database-design.md`, `module-contract.md`, `tool-inventory.md`, `trivia-content-dna.md`, `workflow-users.md` |      6 | KEEP; ringkas ke panduan baru       | Task 2: peta arsitektur/domain/tool harus menunjuk kontrak ini sampai penggantian formal; tool inventory dan DNA adalah input test/packaging                                                       |
| `plans/phase-0-decision-register.md`                                                                                          |      1 | KEEP                                | Register keputusan bukan sampah checkpoint; buat peta keputusan aktif pada Task 2–3                                                                                                                |
| `plans/use-case-inventory.md`, `acceptance-traceability.md`                                                                   |      2 | KEEP                                | Input coverage test; inventaris regresi dan status historis tidak boleh hilang saat ringkasan dibuat                                                                                               |
| `plans/implementation-plan.md`                                                                                                |      1 | CONSOLIDATE, lalu ARCHIVE bersyarat | Tracker masih dirujuk banyak file; sediakan status operasional pengganti dan petakan referensi sebelum dipindah                                                                                    |
| `plans/works/*.md`                                                                                                            |     13 | ARCHIVE bersyarat                   | Task 4 setelah panduan pengganti tersedia dan rujukan AGENTS/README/keputusan diperbarui; bukan antrean kerja baru                                                                                 |
| `docs/decisions/*.md`                                                                                                         |     48 | KEEP; CONSOLIDATE indeks            | Jangan mengarsipkan semua berdasarkan kata `phase`; CR-005/017/020/042–049 dan keputusan lain masih menjelaskan kontrak/gate. Bedakan accepted, proposed, historical, dan superseded melalui bukti |
| `docs/live-test/{README.md,test-matrix.md,results.md}`                                                                        |      3 | KEEP / CONSOLIDATE                  | Workflow dan evidence aktif menurut AGENTS; Task 3 dapat merujuknya, penggantian alurnya perlu keputusan eksplisit                                                                                 |
| `docs/live-test/fixtures/lt-e2e-01-elephant-source-pack.json`                                                                 |      1 | KEEP                                | Paket rekonstruksi untuk skenario yang masih BLOCKED; bukan data temporer yang sudah selesai                                                                                                       |
| `docs/phase-10/*.md`                                                                                                          |      5 | ARCHIVE bersyarat                   | Task 4: pertahankan procedure-v1 dan batas bukti MAN-01..09/CR-048; ringkas referensi di panduan aktif terlebih dahulu                                                                             |
| `docs/phase-9/{inventory-9.0.md,deployment-9.2.md}`                                                                           |      2 | ARCHIVE bersyarat                   | Ekstrak prosedur recovery/deployment yang masih berlaku ke operations; penanda N/A/NOT DEPLOYED tetap sejarah, bukan status sekarang                                                               |
| `docs/phase-8/{coverage-map.json,preflight-8.0.md}`                                                                           |      2 | KEEP sampai test direkonsiliasi     | Dibaca langsung oleh `tests/phase-8-coverage.test.ts`; jika dipindah, ubah pembaca dalam perubahan yang sama                                                                                       |
| Empat input audit Phase 5 yang disebut di bagian 8                                                                            |      4 | KEEP; relokasi terkendali           | Aset verifikasi keamanan, bukan sekadar laporan; jangan edit snapshot/hash atau mengubah expected agar lolos                                                                                       |
| `docs/phase-5*` selain empat input tersebut                                                                                   |     30 | ARCHIVE bersyarat                   | Termasuk laporan, SQL audit lama, output A/B/performance; periksa rujukan silang dan tiga evidence scripts sebelum pemindahan                                                                      |
| `docs/phase-6-batch-a-workspace-remediation.md`                                                                               |      1 | ARCHIVE bersyarat                   | Simpan alasan boundary owner/CR-017 pada panduan/keputusan aktif dahulu                                                                                                                            |
| `docs/architecture/.gitkeep`                                                                                                  |      1 | DELETE bersyarat                    | Hapus scaffold setelah lokasi dokumentasi arsitektur final ditetapkan pada Task 2/4                                                                                                                |
| `dataset-reference/*.txt`                                                                                                     |      3 | KEEP                                | `trivia-candidate-retrieval.test.ts` membaca ID provenance dari ketiganya; DNA juga merujuknya                                                                                                     |

Baris di bagian ini melintasi beberapa kelompok top-level dan bukan hitungan total
tambahan. Pengarsipan harus membawa relasi link yang diperlukan; gunakan riwayat
Git untuk duplikasi yang benar-benar sudah digantikan, bukan membuat salinan baru.

### Ketidaksesuaian dokumentasi yang perlu diperbaiki

| ID   | Temuan terbukti dari source lokal                                                                                                                         | Tindak lanjut                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| D-01 | README/AGENTS masih v0.2.2/v31; manifest v0.2.3; record CR-049 sudah v33                                                                                  | Task 3: satu ringkasan versi bertanggal dengan label bukti, tidak menganggap source otomatis sudah terpasang |
| D-02 | `docs/README.md` menyebut runbook lokal sebagai lingkungan terkini, tetapi runbook mengaku baseline Phase 5 dan MCP belum aktif                           | Task 3: tulis setup terkini dari command/config yang ada                                                     |
| D-03 | `supabase/README.md` menyatakan 67 migration dan MCP disabled; source berisi 70 migration dan `functions.mcp.enabled=true`                                | Task 3: selaraskan boundary README dan panduan utama                                                         |
| D-04 | README root menyatakan `package-plugin` baru memvalidasi setelah manifest Phase 7 tersedia                                                                | Task 3: ganti instruksi prospektif dengan perilaku utilitas sekarang                                         |
| D-05 | Frontend README masih menyebut hosting dan consent sebagai pekerjaan mendatang; plugin README menyebut v0.2.3 belum terpasang dan MAN-03/04 pending       | Task 3: bedakan sejarah masing-masing checkpoint dari hasil yang tercatat kemudian                           |
| D-06 | AGENTS masih menyebut titik gagal draft belum teridentifikasi; live log sudah menyatakan reserve/save tidak dipanggil dan kegagalan terjadi di dedup Read | Task 3: gunakan ringkasan terbaru dengan batas bahwa payload lama dan E2E Write belum dibuktikan             |
| D-07 | Beberapa keputusan tetap berjudul/status `proposed` atau `pending` walau perubahan terkait sudah ada di Git                                               | Task 2–4: pertahankan status historis atau tambahkan supersession berbukti; merge source bukan bukti rollout |

## 5. Matriks seluruh 25 skrip

| File di `scripts/`                                                                                                      | Jumlah | Keputusan                             | Alasan / syarat                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------- | -----: | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check.ts`, `run.ts`, `test-all.ts`, `verify-migrations.ts`, `supabase-local.ts`                                        |      5 | KEEP                                  | Entry command package dan helper eksekusi; bukan tooling sekali pakai                                                                                                         |
| `package-plugin.ts`, `plugin-package.ts`, `plugin-config.ts`, `verify-plugin-candidate.ts`                              |      4 | KEEP / CONSOLIDATE                    | Packaging aktif; `plugin-config.ts` mencampur validator manifest aktif dan generator No-auth historis, jangan hapus file keseluruhan                                          |
| `smoke-test.ts`                                                                                                         |      1 | CONSOLIDATE                           | Struktur + verify-migrations + database suite; menduplikasi DB bila dijalankan bersama test-all. Jelaskan cakupan, bukan menghapus proteksi database                          |
| `generate-mcp-config.ts`                                                                                                |      1 | ARCHIVE/DELETE bersyarat              | CLI generator No-auth lama, tidak dipakai paket `.app.json` sekarang; helper dan schema-nya masih divalidasi packaging/test                                                   |
| `phase-5-evidence.ts`, `phase-5-remediation-evidence.ts`, `phase-5-remediation-exercise.ts`                             |      3 | ARCHIVE bersyarat                     | Pemanggil yang ditemukan berupa laporan historis; bawa referensi/snapshot yang dibutuhkan, atau gantikan reproduksinya dengan catatan Git yang jelas                          |
| `phase-6-batch-a.ts`, `phase-6-7.ts`, `phase-6-8.ts`, `phase-6-9.ts`, `phase-6-10.ts`, `phase-6-11.ts`, `phase-6-12.ts` |      7 | DELETE bersyarat                      | Harness checkpoint yang bertumbuh; tidak ditemukan pemanggil eksternal statis pada checkout. Task 5 wajib memetakan kasus unik terhadap 6.13 dan test aktif sebelum menghapus |
| `phase-6-13.ts`                                                                                                         |      1 | KEEP; rename pada Task 5 bila berguna | Harness HTTP/Inspector yang masih dipanggil tiga workflow; nama fase tidak menunjukkan kode mati                                                                              |
| `phase-6-1-http-smoke.ts`                                                                                               |      1 | KEEP / CONSOLIDATE                    | Masih dipanggil baseline workflow; evaluasi overlap terhadap harness aktif sebelum menggantinya                                                                               |
| `phase-6-catalog-audit.ts`                                                                                              |      1 | KEEP; relokasi input terkendali       | Audit migration, ACL/RLS, fungsi, dan cleanup; masih dipanggil technical gates                                                                                                |
| `phase-6-reuse-suites.ts`                                                                                               |      1 | ARCHIVE bersyarat                     | Terikat SHA/run Phase 6 tertentu, bukan mekanisme reuse umum; masih disebut workflow lama, walau env reuse-nya diset false                                                    |
| **Total**                                                                                                               | **25** |                                       | Perubahan nama dan semua pemanggil harus atomik                                                                                                                               |

Task 5 hanya menghapus harness setelah perbandingan cakupan, bukan karena angka
fase. Jika penghapusan kode ternyata mengubah auth, rollback, atau perilaku bisnis,
perlakukan sebagai perubahan backend terpisah dengan gate yang relevan.

## 6. Test, fixture, runtime, dan scaffold

| File / kelompok                                         | Keputusan                            | Alasan / syarat                                                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/foundation.test.ts`                              | KEEP / CONSOLIDATE                   | Memeriksa boundary dan pin runtime; nama Phase 1 bukan alasan menghapus perlindungan                                                                             |
| `tests/plugin-{config,package,skill,trivia}.test.ts`    | KEEP / CONSOLIDATE                   | Memeriksa kontrak paket, path containment, credential exclusion, editorial, tool order, dan regresi #45; pisahkan assertion sejarah bila perlu                   |
| `tests/phase-8-coverage.test.ts`                        | CONSOLIDATE                          | Validasi inventaris desain, bukan bukti E2E; pertahankan pemetaan 101 kasus/33 tool/14 AC tanpa mengunci panduan baru ke narasi blocker lama                     |
| `supabase/tests/database/`                              | KEEP                                 | 40 test, 6 helper, 1 setup, 1 fixture renderer; nama phase/batch tidak berarti tidak aktif                                                                       |
| `supabase/tests/fixtures/trivia/dedup-v1/`              | KEEP                                 | Delapan file: cases, loader, manifest, thresholds, checksum, holdout terkompresi, laporan JSON/Markdown; beberapa dibaca langsung test, sisanya metadata terkait |
| `supabase/functions/mcp/*_test.ts`                      | KEEP                                 | 15 file dalam command `test:mcp`; auth, owner, kontrak, serta perilaku tool                                                                                      |
| `auth-frontend/tests/*.test.mjs`                        | KEEP                                 | Tiga file dipanggil `frontend:test`; route dan callback uji punya gate/denial sendiri                                                                            |
| `supabase/functions/_shared/foundation_test.ts`         | DELETE bersyarat                     | Hanya memeriksa adanya versi Deno; bukan test domain. Task 5 dapat menghapus setelah merekonsiliasi referensi ADR tooling dan cakupan command Deno               |
| `supabase/functions/batch_a_server.ts`                  | KEEP; rename terkendali              | Host HTTP lokal dipanggil `phase-6-13.ts`; bukan entrypoint production dan bukan kode bebas hapus                                                                |
| `supabase/functions/mcp/pilot_{db,write,write_10_4}.ts` | KEEP                                 | Diimpor entrypoint/helper aktif untuk rollback fixed-pilot; penghapusannya mengubah runtime/auth dan di luar cleanup test biasa                                  |
| `supabase/functions/mcp-probe/`                         | KEEP sampai retirement terverifikasi | Tiga file; config masih enabled dan ada focused workflow. CR-030 memang menyebut probe temporer, tetapi keberadaan/status hosted sekarang belum diperiksa        |
| `auth-frontend/api/phase-9-5/` dan route UI terkait     | KEEP sampai retirement terverifikasi | Lima file callback/pilot, dipanggil app/UI, dites, dan terkait flag server-side. Tidak boleh dihapus sebagai laporan fase                                        |
| `supabase/migrations/*.sql`, `supabase/seed.sql`        | KEEP                                 | 70 migration membentuk riwayat dan audit hash; seed adalah bagian alur reset lokal                                                                               |
| Lockfiles, konfigurasi dan pin versi                    | KEEP                                 | Root/frontend pnpm lock serta Deno lock memiliki scope berbeda; bukan otomatis duplikasi                                                                         |

### Dua puluh placeholder tracked

**KEEP:** `artifacts/.gitkeep`, karena foundation test mengharuskan direktorinya
ada dan output packaging menggunakan lokasi itu.

**DELETE bersyarat pada Task 4/5:** 19 scaffold berikut. Penghapusan tetap
memerlukan pemeriksaan loader/config/referensi ketika task dijalankan:

- `auth-frontend/static-host-config/.gitkeep`;
- `docs/architecture/.gitkeep`;
- `plugin/.codex-plugin/.gitkeep`;
- sembilan `.gitkeep` di `supabase/functions/_shared/`: `auth`, `config`,
  `contracts`, `core`, `database`, `mcp`, `modules/trivia`, `observability`,
  `validation`;
- `supabase/tests/functions/.gitkeep`;
- enam `.gitkeep` di `tests/`: `concurrency`, `evals/trivia`, `integration`,
  `mcp-contract`, `security`, `workflows`.

File `_shared/foundation_test.ts` bukan placeholder dan dinilai terpisah.
Dependency terpasang, coverage, build output dan artefak ignored bukan target
penghapusan tracked; `.gitignore` sudah menampung kategori output utama.

## 7. Matriks seluruh workflow dan prasyarat CI cleanup

Nama berikut relatif terhadap `.github/workflows/`. Trigger adalah hasil membaca
source, bukan bukti workflow saat ini enabled atau required di GitHub.

| Workflow                        | Trigger source                                       | Keputusan untuk Task 6                                                                                 |
| ------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `phase-10-light-ci.yml`         | PR ke main, push branch Phase 10, manual             | CONSOLIDATE menjadi light CI aktif; perbaiki klasifikasi deletion dan label versi paket                |
| `phase-9-5-callback-ci.yml`     | PR ke main untuk path callback/UI tertentu           | KEEP / CONSOLIDATE; overlap project check dengan light CI, tetap pertahankan cakupan callback          |
| `phase-9-technical-gate.yml`    | Manual, main + exact candidate SHA                   | KEEP / CONSOLIDATE menjadi technical gate yang jelas; cek urutan CR-044                                |
| `phase-10-1-technical-gate.yml` | Push marker pada branch Phase 10                     | CONSOLIDATE setelah pengganti gate terbukti; membawa urutan focused OAuth/Inspector sebelum full suite |
| `phase-6-ci-baseline.yml`       | Push branch Phase 6, manual                          | ARCHIVE/DELETE bersyarat; pindahkan check unik dan pemanggil harness/reuse sebelum pensiun             |
| `phase-7-light-ci.yml`          | Push branch Phase 7, manual                          | ARCHIVE/DELETE bersyarat; meski namanya light, source menjalankan test-all dengan DB                   |
| `phase-8-light-ci.yml`          | Push branch Phase 8, manual                          | ARCHIVE/DELETE bersyarat setelah coverage check memiliki tempat yang sesuai                            |
| `phase-9-frontend-ci.yml`       | Push branch Phase 9, manual                          | CONSOLIDATE dengan pemeriksaan aktif; mempertahankan pin/help preflight yang diperlukan                |
| `phase-10-1-probe-ci.yml`       | Push branch Phase 10 untuk probe/config/workflow     | KEEP sampai keputusan retirement probe; cakupan probe tidak termasuk command test:mcp biasa            |
| `phase-10-oauth-host-probe.yml` | Push branch Phase 10 hanya jika workflow ini berubah | ARCHIVE/CONSOLIDATE bersyarat; ini request hosted, bukan test lokal otomatis                           |

`.github/phase-10-1-final-candidate.txt` adalah **ARCHIVE bersyarat** bersama
penggantian marker-triggered gate. Mengeditnya pada branch lama dapat men-trigger
full gate; jangan menjadikannya file pencatatan cleanup.

### Temuan CI yang harus dibawa ke task pelaksana

1. **Deletion tidak diklasifikasikan:** light CI menggunakan
   `git diff --name-only --diff-filter=ACMR`. Perubahan yang hanya menghapus TS,
   test, atau file plugin dapat tidak mengaktifkan pemeriksaan yang relevan.
   Task 5 harus memastikan pemilihan check mencakup penghapusan sebelum menghapus
   kode/test; lakukan perbaikan minimum lebih awal jika perlu, sisanya Task 6.
2. **Dependency lintas path:** `plans/tool-inventory.md` dan
   `plans/trivia-content-dna.md` dibaca packaging/test, tetapi perubahan Markdown
   kontrak saja tidak mengaktifkan project/package check dari classifier saat ini.
   Task 4 perlu memilih check eksplisit; Task 6 memperbaiki pemetaan path.
3. **Runtime dependency/config:** classifier MCP belum mencantumkan `deno.lock`
   dan `supabase/config.toml`. Nilai dampaknya sebelum mengubah path filter;
   jangan menyamakan light check dengan full security gate.
4. **Nama output paket usang:** ZIP, artefak, dan ringkasan light CI masih
   menyebut v0.2.2 sementara manifest source v0.2.3. Task 6 gunakan identitas yang
   konsisten dengan kandidat paket, tanpa mengklaim paket otomatis terpasang.
5. **Dua urutan gate:** Phase 9 menjalankan full suite sebelum Inspector;
   Phase 10 gate menjalankan focused OAuth/Inspector lebih awal sesuai CR-044.
   Konsolidasi harus mempertahankan seluruh check dan urutan yang berlaku.
6. **Branch protection belum diketahui:** nama check/ruleset yang diwajibkan
   belum dapat dibaca. Jangan menghapus/rename workflow seolah tidak required.

Tidak ada workflow yang dijalankan, di-dispatch, atau dipoll pada audit ini.
Timeout YAML (10/20/25/120 menit) bukan estimasi durasi aktual. Riwayat Actions
perlu diakses sebelum memutuskan run remote pada task berikutnya.

## 8. Dependency yang menghalangi penghapusan langsung

| Pemanggil / pembaca                                                                       | Target yang harus tersedia                                                                                                                                         | Konsekuensi cleanup                                                                                         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `scripts/phase-6-catalog-audit.ts`                                                        | `docs/phase-5-batch-b-remediation-final-catalog.json`, `docs/phase-5-9-final-catalog.json`, `docs/phase-5-7-catalog-audit.sql`, `docs/phase-5-8-catalog-audit.sql` | Empat input operasional di antara laporan lama; pindahkan dengan pembaca dan pertahankan byte/hash baseline |
| `supabase/tests/database/api-phase-five-acceptance.test.ts`                               | `docs/phase-5-8-catalog-audit.sql`                                                                                                                                 | Relokasi SQL juga harus memperbarui test ini                                                                |
| `tests/phase-8-coverage.test.ts`                                                          | Coverage map, preflight, use-case inventory, tool inventory, acceptance traceability                                                                               | Arsip dokumen Phase 8/plans harus atomik dengan pembaca dan semantik status historis                        |
| `scripts/plugin-package.ts`, `tests/plugin-package.test.ts`, `tests/plugin-skill.test.ts` | `plans/tool-inventory.md`                                                                                                                                          | Packaging dan tool-order check gagal bila kontrak dihapus/dipindah tanpa rekonsiliasi                       |
| `tests/plugin-trivia.test.ts`                                                             | `plans/trivia-content-dna.md`                                                                                                                                      | DNA frozen masih pembanding format/profile editorial                                                        |
| Packaging validator dan plugin config tests                                               | `plugin/schemas/mcp-connection-input.schema.json`, bagian generator `scripts/plugin-config.ts`                                                                     | Generator lama tidak masuk ZIP tetapi masih menjadi kontrak validasi source                                 |
| `trivia-candidate-retrieval.test.ts`, `api-trivia-public-gold.test.ts`                    | Dataset provenance, loader/cases dedup, checksum/holdout/report terkait                                                                                            | Dataset dan laporan JSON tertentu adalah input regresi, bukan output sementara                              |
| Technical gates Phase 6/9/10                                                              | `phase-6-13.ts`, `phase-6-catalog-audit.ts`; host `batch_a_server.ts` dari harness                                                                                 | Rename/hapus harus menjaga seluruh rantai pemanggil                                                         |
| `scripts/check.ts`                                                                        | Format, lint, typecheck, root tests, frontend typecheck/build/tests                                                                                                | `pnpm run check` lebih luas dari typecheck dan menghasilkan frontend build lokal                            |
| `scripts/test-all.ts`, `scripts/smoke-test.ts`                                            | Keduanya dapat menjalankan database suite                                                                                                                          | Hindari menjalankan keduanya sebagai gate duplikat                                                          |

## 9. Urutan eksekusi Task 2–7

| Task                            | Hasil yang dituju                                                                         | Prasyarat / pemeriksaan selesai                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 2 — Produk, arsitektur, kontrak | `docs/architecture.md`, `domain.md`, `tool-contracts.md`; peta source dan keputusan aktif | Cocokkan kontrak dengan implementasi dan CR; tandai ketidakpastian runtime, tidak mengubah schema/tool                                   |
| 3 — Development, operations, AI | `development.md`, `testing.md`, `operations.md`; README/AGENTS/index selaras              | Selesaikan D-01..07 sebatas bukti; panduan mempertahankan izin Write, CAS, idempotency, owner isolation, dan aturan estimasi CI          |
| 4 — Dokumen historis            | Arsip terbatas, duplikasi/scaffold keluar dari jalur baca                                 | Pengganti tersedia; setiap link dan input test/packaging/audit tetap dapat ditemukan; jangan menghapus empat input audit sebagai laporan |
| 5 — Skrip, test, fixture        | Kurangi harness superseded dan assertion sejarah; pertahankan regresi                     | Perbandingan cakupan unik; klasifikasi deletion/check eksplisit diselesaikan lebih dahulu; rename + pemanggil atomik                     |
| 6 — CI                          | Jalur light/focused/full yang jelas dan workflow historis dipensiunkan                    | Akses GitHub/ruleset dan riwayat durasi tersedia; gate CR-020/044 tetap lengkap; retirement hosted diputuskan terpisah                   |
| 7 — Verifikasi/onboarding       | Panduan dapat menuntun penambahan fitur, ringkasan hasil dan sisa pekerjaan               | Periksa referensi dan pemeriksaan sesuai diff akhir; source, CI, dan live evidence dibedakan                                             |

Ini adalah task cleanup berurutan yang diminta pemilik, bukan sequential phase
checkpoint lama. Setiap task menjaga checkout tetap konsisten. Bila dependensi
menuntut perubahan pendukung kecil lebih awal, catat alasannya dalam task tersebut;
jangan meninggalkan repo rusak sambil menunggu Task 6.

### Ketidakpastian yang harus dibawa ke task berikutnya

- **GitHub:** belum ada Issue/PR cleanup baru atau Actions run untuk Task 1;
  `gh` belum tersedia. Pembuatan PR/push/commit menunggu instruksi yang sesuai,
  preflight CI, dan akses GitHub. Perbaikan yang diwajibkan memakai Issue/PR/Actions
  tetap harus ditelusuri melalui workflow tersebut.
- **Production:** exact Edge bundle SHA, plugin terpasang, frontend deployment,
  flag callback/pilot/probe, dan applied migration terkini belum diverifikasi.
  Task 3 menulis prosedur verifikasinya; tidak menebak dari HEAD lokal.
- **Retirement:** penghapusan probe hosted, route OAuth/pilot, atau fallback auth
  memerlukan keputusan dan verifikasi tersendiri, bukan efek samping cleanup.
- **Acceptance:** gap historis dan LT-E2E-01 dipertahankan dengan batas buktinya;
  task cleanup tidak memerlukan pengulangan business Write production.

## 10. Verifikasi Task 1

Scope perubahan Task 1 hanya Markdown: laporan ini dan tautannya pada indeks
developer. Tidak diperlukan full backend gate, database reset, atau pengulangan
test domain untuk menyatakan audit lokal selesai.

**Preflight lokal:** gunakan Prettier terpasang hanya untuk dua file Markdown,
ditambah `git diff --check`. Estimasi masing-masing **kurang dari 1 menit**, karena
tidak ada install, build, Docker, atau suite database. Riwayat Actions tidak
tersedia; estimasi ini berdasarkan pekerjaan command lokal yang dibatasi tersebut,
bukan klaim waktu workflow remote.

Hasil pemeriksaan lokal pada 25 Oktober 2026:

- `pnpm exec prettier --check docs/cleanup-audit.md docs/README.md` — **PASS**
  setelah format tabel laporan diperbaiki; kedua file sesuai style Prettier.
- `git diff --check` — **PASS** untuk perubahan tracked.
- `git diff --no-index --check -- /dev/null docs/cleanup-audit.md` — **PASS**
  untuk laporan baru yang belum tracked, agar tidak terlewat oleh diff biasa.
- Inventaris Git, hitungan kelompok, serta referensi pembaca penting ditinjau;
  perubahan terbatas pada dua file Markdown. Commit pemilik tetap utuh.

**Task 1 selesai untuk audit lokal.** GitHub CI dan status production sekarang
tetap **belum diverifikasi**, bukan PASS. Task berikutnya adalah Task 2 sesuai
urutan di bagian 9; tidak ada penghapusan atau perubahan runtime pada Task 1.

## 11. Pelaksanaan Task 2 — panduan produk, arsitektur, dan kontrak

**Tanggal:** 25 Oktober 2026. Source acuan tetap
`d6e7fe83ea006931f85624c4d60486f92ab3438c`; hasil Task 1 yang belum di-commit
dipertahankan. Dokumen baru menggunakan bahasa Indonesia yang natural; identifier
teknis dipertahankan agar sesuai kode.

Hasil dokumentasi:

- [Arsitektur](architecture.md): tujuan produk, komponen, rantai
  OAuth/owner → MCP → RPC, batas data, peta kode/SQL/test, dan keputusan penting.
- [Domain](domain.md): hubungan data, lifecycle, pengecualian reschedule,
  approval/quality, renderer, fakta, reservasi, plan, CAS, dan metrik.
- [Kontrak tool](tool-contracts.md): seluruh 33 tool, 11 Baca/22 Tulis, lokasi
  handler, input/output bersama dan pengecualiannya, serta pemulihan error.
- [Indeks dokumentasi](README.md) diperbarui ke bahasa Indonesia dan memberi
  urutan baca panduan baru, kontrak, operasional aktif, serta referensi historis.

Penelusuran mencakup entrypoint/transport/auth, seluruh 11 kelompok handler,
schema bersama, source adapter, frontend auth/build, definisi tabel, RPC utama,
test terkait, instruksi plugin, dan keputusan domain/security yang dirujuk.
Kontrak frozen, source aplikasi, migration, serta workflow CI tidak diubah.

Hal yang tetap harus diperhatikan pada Task 3:

- Buat panduan development, testing, dan operations serta selaraskan README
  boundary/AGENTS; jangan menganggap runbook Phase 5 sebagai prosedur terkini.
- Verifikasi versi live melalui jalur berizin sebelum mengisi ringkasan deployment;
  dokumentasi Task 2 menjelaskan source, bukan bukti pemeriksaan runtime baru.
- Pertahankan perbedaan profile bootstrap, discovery anonim, persetujuan koneksi,
  persetujuan post, serta pengecualian approval pada perubahan jadwal saja.

**Preflight verifikasi:** format lima file Markdown, pemeriksaan referensi lokal
dan peta 33 tool terhadap source, serta whitespace diff. Estimasi masing-masing
kurang dari 1 menit karena tidak melibatkan install, build, Docker, atau database.
Tidak diperlukan full gate backend untuk perubahan dokumentasi ini. Riwayat
Actions tetap belum tersedia dari lingkungan Task 1; tidak ada workflow remote
yang dijalankan.

Hasil pemeriksaan lokal:

- **PASS:** 125 referensi lokal beserta anchor diperiksa pada lima dokumen.
- **PASS:** 33 nama dan nomor tool cocok dengan inventory frozen serta seluruh
  nama tool pada 11 kelompok handler yang diimpor registry. Pembagian 11 Baca dan
  22 Tulis cocok dengan peta operasi yang ditinjau.
- **PASS:** Prettier pada `docs/README.md`, `architecture.md`, `domain.md`,
  `tool-contracts.md`, dan `cleanup-audit.md`, setelah format dokumen baru dirapikan.
- **PASS:** whitespace diff tracked dan setiap dokumen baru, termasuk file
  Task 1 yang belum tracked; pemeriksaan file baru menggunakan
  `git diff --no-index --check -- /dev/null <path>`.

**Task 2 selesai untuk dokumentasi source.** Verifikasi ini bukan PASS CI GitHub
atau retest live. Task berikutnya adalah Task 3; seluruh file lama masih tersedia
untuk rekonsiliasi dan cleanup berikutnya.

## 12. Pelaksanaan Task 3 — panduan kerja dan operasi

**Tanggal:** 25 Oktober 2026. HEAD source tetap
`d6e7fe83ea006931f85624c4d60486f92ab3438c`; perubahan dokumentasi Task 1–2
dipertahankan. Panduan dan penjelasan baru menggunakan bahasa Indonesia, dengan
nama teknis sesuai kode.

Hasil dokumentasi:

- [Development](development.md): prasyarat, instalasi, environment, stack lokal,
  migration, frontend, packaging, dan pola pengembangan fitur.
- [Testing](testing.md): cakupan command yang sebenarnya, pemilihan test, aturan
  estimasi/stop CI, full gate dan reuse, serta batas bukti lokal/CI/live.
- [Operations](operations.md): ringkasan versi berbukti, pemeriksaan runtime,
  prosedur rilis bersyarat, backup/pemulihan, diagnosis, dan batas bukti historis.
- README root, README backend/frontend/plugin, indeks docs, dan AGENTS diselaraskan
  dengan panduan tersebut. AGENTS mempertahankan aturan keamanan, estimasi CI,
  kewenangan tindakan, kontrak frozen, dan procedure-v1 dengan urutan baca baru.
- Path runbook lokal dipertahankan sebagai pengarah; prosedur operasional
  dipusatkan pada panduan baru. Snapshot Phase 5 tersedia melalui Git bertanggal
  agar rujukan historis tetap dapat ditelusuri.

Temuan D-01..D-06 diperbarui pada pintu masuk/panduan aktif. Status proposed/pending
dalam record keputusan lama (D-07) tetap dibaca menurut konteks dan bukti lanjutan;
tidak diubah menjadi accepted atau live PASS hanya karena source sudah merged.

### Dasar pemeriksaan command

- Membaca package scripts, wrapper lokal, cakupan check/test-all/smoke-test,
  harness HTTP, packaging, konfigurasi build/hosting, serta workflow yang berlaku.
- Mengambil dokumentasi CLI melalui Context7 `/supabase/cli`, lalu memeriksa
  `pnpm exec supabase --help` dan bantuan `start`, `stop`, `db reset`,
  `migration new/list`, `functions serve/deploy`, serta `db push` pada CLI 2.120.0.
- Bantuan CLI menegaskan bahwa argumen nama pada `functions serve` bersifat legacy
  dan semua function dilayani. Panduan tidak mengasumsikan isolasi dari nama itu.
- `db push` mendukung `--skip-vault`; contoh rilis memakai flag itu agar sinkronisasi
  Vault tidak menjadi efek implisit. Dry-run/apply hanya didokumentasikan, tidak
  dijalankan. Tidak ada start/reset DB, test domain, deploy, atau business Write.
- `gh` belum tersedia saat diperiksa kembali; riwayat Actions terbaru, required
  checks, dan setting hosted tidak diklaim terverifikasi.

**Preflight verifikasi lokal:** format Markdown, pemeriksaan tautan/anchor,
kecocokan command terhadap package/source, pelestarian aturan penting di AGENTS,
serta whitespace diff. Estimasi masing-masing kurang dari 1 menit; hanya file
lokal dan tooling terpasang, tanpa install/build/database. Source aplikasi,
migration, konfigurasi, dan workflow tidak berubah; full backend gate tidak
diperlukan pada task dokumentasi ini.

Hasil verifikasi lokal:

- **PASS:** 231 tautan lokal beserta anchor pada 14 dokumen panduan/README/audit.
- **PASS:** 41 rujukan command package sesuai script yang tersedia, pemanggil tsx
  mengarah ke file yang ada, tujuh subcheck dan urutan test-all sesuai source,
  serta pin Node/pnpm/Supabase/Deno cocok.
- **PASS:** butir penting AGENTS dipertahankan: estimasi dan stop CI, izin terpisah,
  gate CR-020/044, owner/RLS, presisi CAS, keamanan token, dan batas bukti historis.
- **PASS:** peta 33 tool tetap sesuai inventory dan source, 11 Baca/22 Tulis.
- **PASS:** format Prettier setelah tabel dirapikan dan whitespace diff untuk
  file tracked maupun dokumen baru yang belum tracked.
- **PASS:** diff source aplikasi, migration, konfigurasi, dependency, dan workflow
  kosong. Snapshot runbook historis tersedia pada commit Git yang dirujuk.

**Task 3 selesai untuk dokumentasi lokal.** CI GitHub dan runtime live tidak
diperiksa sebagai bagian task ini; command deployment hanya didokumentasikan.
Berikutnya Task 4 menerapkan cleanup dokumen historis berdasarkan matriks audit,
setelah memastikan referensi dan input test/packaging/audit tetap tersedia.

## 13. Pelaksanaan Task 4 — pemisahan dokumen historis

**Tanggal:** 25 Oktober 2026. HEAD tetap
`d6e7fe83ea006931f85624c4d60486f92ab3438c` beserta perubahan lokal Task 1–3.
Kandidat yang dipindahkan dibandingkan dahulu dengan Git agar tidak menimpa
perubahan pengguna. Keputusan Task 4 diterapkan pada dokumen, bukan penghapusan
test, migration, runtime, atau workflow.

### Hasil penataan

| Tindakan                               | Jumlah | Hasil                                                                                   |
| -------------------------------------- | -----: | --------------------------------------------------------------------------------------- |
| Arsip rencana kerja dan tracker        |     14 | 13 dokumen `plans/works/` dan implementation plan lengkap masuk `archive/plans/`        |
| Arsip laporan/artefak Phase 5          |     25 | 9 Markdown, 12 JSON, 4 SQL audit lama masuk `archive/docs/phase-5/`                     |
| Arsip boundary/deployment/acceptance   |      8 | Laporan Phase 6, dua dokumen Phase 9, lima dokumen Phase 10                             |
| Hapus scaffold dokumentasi             |      1 | `docs/architecture/.gitkeep`; panduan arsitektur sekarang berupa `docs/architecture.md` |
| Pertahankan input Phase 5 di path lama |      9 | Baseline audit, input performa, dan pasangan reset yang masih dibaca                    |

Total **47 file dipindahkan**, dengan satu
[indeks arsip berbahasa Indonesia](../archive/README.md) yang memetakan lokasi lama
ke lokasi baru. File sejarah tidak disalin sebagai dua paket bukti terpisah.
`plans/implementation-plan.md` menjadi pengarah singkat dan mempertahankan anchor
`#16-phase-tracker` bagi referensi lama. [Indeks kontrak](../plans/README.md)
menjelaskan sembilan kontrak yang tetap berada di `plans/`.

Empat direktori lokal yang benar-benar kosong setelah pemindahan juga dihapus
dengan `rmdir`: `docs/architecture/`, `docs/phase-9/`, `docs/phase-10/`, dan
`plans/works/`. Masing-masing diperiksa kosong lebih dahulu; ini tidak menambah
penghapusan file tracked di luar placeholder yang disebut di atas.

Bahasa dan hasil historis tidak diterjemahkan atau ditulis ulang. Penyesuaian pada
payload arsip dibatasi pada tujuan tautan lokal. Procedure-v1 pada
`manual-cards.md` harus tetap identik byte; hasil MAN, status AC, CR-048, dan
keterbatasan bukti tetap mengikuti record asal. Panduan aktif mengarah ke arsip
hanya untuk kebutuhan penelusuran sejarah.

### Koreksi inventaris dependensi dari Task 1

Empat input audit keamanan tetap di `docs/` tanpa perubahan:
`phase-5-7-catalog-audit.sql`, `phase-5-8-catalog-audit.sql`,
`phase-5-9-final-catalog.json`, dan
`phase-5-batch-b-remediation-final-catalog.json`.

Penelusuran lanjutan menemukan lima input tambahan yang juga dipertahankan:

- `phase-5-9-performance-A.json` dibaca langsung oleh
  `api-trivia-populated-performance.test.ts`. Ini belum tercatat pada audit awal.
- `phase-5-9-reset-A.json` dan `phase-5-9-reset-B.json` dibaca oleh
  `scripts/phase-5-evidence.ts`.
- `phase-5-batch-b-remediation-reset-A.json` dan pasangan B dibaca secara dinamis
  oleh `scripts/phase-5-remediation-evidence.ts`.

Dua file Phase 8 tetap pada path dan byte semula karena coverage test membacanya.
Sembilan kontrak frozen dan 48 keputusan juga dipertahankan tanpa perubahan byte.
Tidak ada perubahan expected test/audit untuk mengakomodasi cleanup.

Skrip remediasi yang dipin ke SHA lama memeriksa keseluruhan checkout historis,
termasuk path lama dalam `plans/` dan `docs/`. Skrip tersebut bukan command umum
untuk HEAD sekarang dan harus dipahami pada checkout asalnya. Sementara itu,
test gold/performa masih dapat menulis output evidence ke `docs/` melalui
`CR016_EVIDENCE_RUN=A/B`; penataan output/script itu menjadi bagian Task 5.

### Prasyarat dan verifikasi

Source aplikasi, migration, konfigurasi keamanan, serta dependency runtime tetap
sama. Task 4 tidak memerlukan full database gate untuk memindahkan bukti statis.
Path/hashes input operasional diperiksa secara eksplisit agar deletion tidak
terlewat oleh classifier light CI yang hanya memakai ACMR.

Preflight kandidat: HEAD di atas + diff dokumentasi lokal. Setelah membaca isi
workflow dan config Vitest, estimasi pemeriksaan tautan/hash/format/whitespace
masing-masing kurang dari 1 menit; enam file root Vitest diperkirakan kurang dari
2 menit karena hanya fixture/schema/file lokal, tanpa Docker atau suite database.
Riwayat Actions terbaru belum tersedia (`gh` belum terpasang). Tidak ada push,
PR, dispatch, atau polling workflow remote.

Hasil verifikasi lokal:

- **PASS:** 47 pemindahan sesuai snapshot sebelum Task 4. Sebanyak 40 file
  identik byte dan 7 Markdown hanya menyesuaikan tujuan tautan yang diperlukan.
- **PASS:** procedure-v1 identik byte; 328 source/input/kontrak/keputusan yang
  dilindungi tetap pada path dan hash semula, termasuk sembilan input Phase 5,
  dua file Phase 8, sembilan kontrak frozen, serta 48 keputusan.
- **PASS:** 436 tautan lokal, termasuk 17 anchor, diperiksa pada 121 Markdown;
  seluruh 47 arsip tercantum di indeks, dan identitas tujuan tautan payload arsip
  sesuai sebelum/sesudah pemindahan. Link eksternal tidak diklaim diuji ulang.
- **PASS:** enam file root Vitest, total 31 test, selesai dalam 667 ms. Cakupannya
  foundation, coverage kontrak Phase 8, konfigurasi/paket plugin, skill core,
  dan editorial trivia; bukan suite database atau retest live.
- **PASS:** format panduan/indeks yang berubah setelah dirapikan. Indeks di
  `archive/` dan `plans/` diperiksa eksplisit dengan ignore path dinonaktifkan
  hanya untuk file indeks/pengarah, bukan memformat ulang payload arsip.
- **PASS:** whitespace perubahan tracked; file baru dan perubahan link arsip
  diperiksa terpisah agar tidak terlewat karena masih untracked.

**Task 4 selesai untuk cleanup dokumen lokal.** Commit pemilik dan perubahan
Task 1–3 dipertahankan. Status acceptance historis tidak diubah; runtime production,
database, serta workflow tidak diubah atau dijalankan.

Berikutnya Task 5 meninjau skrip/test/fixture berdasarkan cakupan, termasuk input
performa yang baru ditemukan, output evidence opsional ke `docs/`, dan pemanggil
harness. Pastikan deletion serta dependency lintas path diperiksa secara eksplisit
sebelum penghapusan kode; workflow wajib tetap dipertahankan sampai penggantinya
memenuhi kontrak dan required checks sudah diperiksa.

## 14. Pelaksanaan Task 5 — skrip, test, dan fixture

**Tanggal:** 25 Oktober 2026. Kandidat adalah HEAD
`d6e7fe83ea006931f85624c4d60486f92ab3438c` beserta diff cleanup lokal Task 1–5.
Perubahan pengguna dan arsip Task 4 dipertahankan. Sebelum menghapus kode,
pemanggil executable ditelusuri dan kandidat lama dipastikan tidak berisi diff
pengguna terhadap HEAD.

### Disposisi yang diterapkan

- **Hapus 11 skrip lama:** tujuh harness checkpoint bertahap, tiga skrip evidence
  Phase 5, dan CLI generator No-auth. Source aslinya dapat ditelusuri pada Git
  baseline; tidak ditambahkan sebagai salinan TypeScript executable di arsip.
- **Pertahankan harness aktif:** `phase-6-13.ts`, host `batch_a_server.ts`,
  `phase-6-1-http-smoke.ts`, serta audit katalog tetap utuh dan pada path semula.
- **Pertahankan pembaca yang masih dipakai workflow:** `phase-6-reuse-suites.ts`
  tetap ada sampai Task 6 memutuskan workflow penggantinya. Validator/schema
  generator legacy yang dibaca packaging/test juga tetap ada; yang dihapus
  hanya CLI-nya yang tidak dipanggil.
- **Hapus satu test fondasi Deno lama** yang hanya memeriksa keberadaan
  `Deno.version.deno`. Pin dan seluruh 15 test MCP tetap ada; catatan ADR-001
  sebagai bukti Phase 1 tidak ditulis ulang. Pengujian Deno sekarang memang
  dijalankan melalui suite MCP ketika diperlukan, bukan melalui test keberadaan
  runtime yang terpisah.
- **Hapus 17 placeholder kosong.** `artifacts/.gitkeep` dipertahankan untuk
  boundary output dan `plugin/.codex-plugin/.gitkeep` dipertahankan karena
  `api-phase-five-acceptance.test.ts` masih membaca direktori tersebut. Dependensi
  yang terakhir ini memperbaiki kandidat penghapusan awal Task 1.
- **Pindahkan empat snapshot reset** ke arsip tanpa mengubah byte setelah skrip
  pembacanya dipensiunkan. Arsip historis menjadi 51 file.
- **Pindahkan snapshot performa A** ke
  `supabase/tests/fixtures/trivia/history/`, dengan isi yang sama. Test pembacanya
  diperbarui secara bersamaan dan expected `label: A` dipertahankan.
- **Pisahkan output test baru:** helper `scripts/evidence-output.ts` menulis
  output opsional CR-016 ke `artifacts/cr016/` untuk label A/B, bukan `docs/`.
  Dua test database hanya berubah pada I/O evidence dan lokasi input historis;
  query, threshold, assertion perilaku, serta cleanup fixture tetap dipertahankan.

### Pemetaan cakupan tujuh harness lama

Analisis statis menelusuri nama tool, label assertion literal, dan predicate
`check()` pada source lama dibandingkan harness aktif. Angka di tabel adalah
label yang ditemukan, bukan hasil eksekusi baru terhadap database/Inspector.

| Harness lama         | Tool census lama | Label check literal | Pengganti    |
| -------------------- | ---------------: | ------------------: | ------------ |
| `phase-6-batch-a.ts` |               15 |                  32 | Harness 6.13 |
| `phase-6-7.ts`       |               18 |                  50 | Harness 6.13 |
| `phase-6-8.ts`       |               20 |                  62 | Harness 6.13 |
| `phase-6-9.ts`       |               23 |                  81 | Harness 6.13 |
| `phase-6-10.ts`      |               25 |                  90 | Harness 6.13 |
| `phase-6-11.ts`      |               28 |                 102 | Harness 6.13 |
| `phase-6-12.ts`      |               30 |                 112 | Harness 6.13 |

Harness aktif memuat 33 nama tool dan 133 label check literal. Seluruh nama tool
lama tercakup. Label lama yang tidak dibawa adalah census parsial serta larangan
probe workspace pada setiap call, yang sudah digantikan pemeriksaan owner/workspace
per call menurut CR-043. Perbedaan predicate pada label yang sama adalah census
Inspector yang meningkat menjadi 33 dan teks caption fixture checkpoint; predicate
lain yang dipetakan tetap sama. Regresi inactive/foreign-owner pada harness aktif
dipertahankan. Tidak ada klaim harness HTTP telah dijalankan ulang pada Task 5.

### Perbaikan minimum light CI untuk deletion

Classifier kini membaca deletion dan kedua sisi rename melalui `--no-renames`
serta filter ACMRD. Daftar path memakai NUL; formatter hanya menerima file yang
masih ada. Perubahan dibatasi pada body klasifikasi/daftar format, tanpa mengganti
nama job, trigger, izin, atau full gate yang mungkin menjadi required check.

Test baru mengeksekusi shell workflow yang sebenarnya terhadap tree Git sementara,
tanpa commit/config Git atau akses GitHub. Cakupannya deletion TypeScript, rename
TypeScript ke Markdown, deletion handler MCP, pemindahan file keluar plugin, dan
path dengan spasi. Test helper evidence memeriksa output A/B dan no-op label lain
pada filesystem terisolasi; tidak mengubah expected bukti historis.

### Preflight pemeriksaan

`check.ts` menjalankan tujuh pemeriksaan source/frontend tanpa Docker atau suite
database. Basis yang tersedia: root Vitest Task 4 selesai 667 ms; dua test baru
memakai filesystem/tree Git lokal. Estimasi `pnpm run check` **1–3 menit**,
focused tooling tests **kurang dari 1 menit**, dan pemeriksaan integritas/tautan/
format masing-masing **kurang dari 1 menit**. Riwayat Actions terbaru belum dapat
dibaca karena `gh` belum tersedia; tidak ada push/PR/dispatch remote.

Perubahan tidak menyentuh keputusan izin, RPC, schema, migration, atau runtime
MCP. Full backend gate tidak dipilih untuk refactor output test/harness mati ini.
Suite database/HTTP tidak dianggap PASS dari analisis statis; perubahan I/O diuji
terisolasi dan source assertion/SQL dibandingkan secara eksplisit. Hasil run
dicatat di bawah ini.

### Hasil verifikasi lokal

- **PASS:** focused tooling tests, 2 file / 11 test, selesai 463 ms.
- **PASS:** `pnpm run check` lengkap: format, ESLint, typecheck, 8 file root
  Vitest / 42 test, frontend typecheck/build, dan 19 test Node frontend. Sebelas
  regresi tooling di atas termasuk dalam 42 test root, bukan tambahan 11 test
  unik ketika menghitung cakupan keseluruhan.
- **PASS:** 235 source/input/arsip yang dilindungi tetap identik dengan snapshot
  awal Task 5. Lima snapshot yang dipindahkan juga identik byte dengan Git asal.
- **PASS:** analisis dua test database mempertahankan 13 assertion perilaku dan
  22 call SQL/fixture, setelah menormalisasi referensi lokasi snapshot historis.
  Tidak ada perubahan threshold, query, atau expected hasil untuk meloloskan cleanup.
- **PASS:** pemetaan tool/check/predicate tujuh harness lama terhadap harness
  aktif; perbedaan census/caption dan kebijakan CR-043 ditinjau eksplisit.
- **PASS:** 438 tautan lokal pada 122 Markdown; tidak ada pemanggil executable
  untuk kode yang dipensiunkan; direktori skrip berisi 15 file aktif.
- **PASS:** format indeks yang diabaikan Prettier default diperiksa eksplisit;
  whitespace diff dan diff source runtime/dependency/migration ditinjau.

Tujuh belas placeholder dan test Deno lama sudah dikeluarkan. Dua placeholder
yang masih diperlukan tetap ada; 20 direktori lokal yang kosong setelah cleanup
dihapus dengan `rmdir` yang gagal bila ada isi, tanpa penghapusan rekursif.

**Task 5 selesai untuk source dan verifikasi lokal.** Database/HTTP suite,
Actions remote, serta runtime production tidak diuji pada task ini; tidak ada
commit, push, deployment, atau business Write. Test database hanya direfaktor
pada penulisan output dan lokasi bukti historis, dengan pemeriksaan terisolasi
serta pelestarian SQL/assertion di atas.

Berikutnya Task 6 menangani konsolidasi CI, pemetaan dependency lintas path,
label artefak paket, dan workflow historis. Sebelum menghapus/rename workflow,
akses GitHub serta required checks/ruleset dan riwayat durasi harus diperiksa.
`phase-6-reuse-suites.ts` tetap mengikuti keputusan workflow itu; keberadaan
nama fase saja tidak menjadi alasan menghilangkan check yang masih dibutuhkan.

## 15. Pelaksanaan Task 6 — konsolidasi CI

**Tanggal:** 25 Oktober 2026. Kandidat lokal tetap HEAD
`d6e7fe83ea006931f85624c4d60486f92ab3438c` + diff Task 1–6. Autentikasi GitHub
dilakukan pemilik; pemeriksaan remote berikut hanya baca-saja. Tidak ada perubahan
branch protection, ruleset, registry Actions, deployment, atau data production.

### Prasyarat GitHub yang sudah diperiksa

- Akun aktif mempunyai akses admin repository. Repository publik, default branch
  `main`; SHA remote `cada9de9ffe916f232cf3efee84f987769fd1c6b`, sesuai tracking ref
  lokal. Commit pemilik `d6e7fe8` tetap ahead satu dan tidak diubah.
- Endpoint protection `main` mengembalikan HTTP 404 **Branch not protected**,
  bukan kegagalan autentikasi. Ruleset repository beserta parent dan rules yang
  berlaku pada `main` sama-sama kosong. Tidak ada required status checks yang
  terpasang pada saat pemeriksaan. Kebijakan tidak dibuat atau diubah pada Task 6.
- Source workflow remote main berisi sepuluh file, sesuai baseline lokal.
  Registry Actions juga menampilkan record workflow sementara/historis yang
  tidak lagi berada di source main. Record/run historis tersebut tidak dihapus
  atau dinonaktifkan melalui API.
- Job light [39915940238](https://github.com/milyarderpro/content-producer/actions/runs/39915940238)
  PASS dalam 29 detik dan [39800520559](https://github.com/milyarderpro/content-producer/actions/runs/39800520559)
  PASS dalam 40 detik. Waktu job dipakai terpisah dari `updatedAt` metadata run.
- Job full gate [39768822314](https://github.com/milyarderpro/content-producer/actions/runs/39768822314)
  PASS dalam **23 menit 19 detik**. Event SHA-nya `67e3fbcef48a052d089a0d6fe8854a070a6ea2de`;
  source wrapper pada SHA tersebut secara eksplisit checkout kandidat
  `1a4e755a48f3c77eb557b931fd6bd99d5e1b24fd`. Ini mengonfirmasi mengapa SHA event
  berbeda dari kandidat yang dicatat CR-049; bukan exact-SHA PASS bagi HEAD cleanup.

### Tiga workflow pengganti

| Workflow baru                | Cakupan dan pengganti                                                                                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                     | Satu PR/push-main/manual light CI: source/frontend/root regressions, MCP, probe terisolasi, serta paket sesuai path. Menggantikan light/source/coverage/callback CI yang tumpang tindih |
| `backend-technical-gate.yml` | Full CR-020/044 manual pada exact main SHA. Menggabungkan technical gate dan check keamanan/database yang masih berlaku dari workflow fase lama                                         |
| `hosted-oauth-probe.yml`     | Probe hosted publik yang sekarang manual pada main; tidak otomatis menghubungi production ketika file workflow berubah                                                                  |

Kesepuluh workflow source lama dipensiunkan. Marker pemicu full gate dan
`scripts/phase-6-reuse-suites.ts` yang hanya dipakai workflow lama juga dihapus;
tidak ada pinned reuse script yang digunakan untuk menyatakan kandidat baru PASS.
Skrip aktif menjadi 14 file. Source lama tetap dapat ditelusuri melalui Git.

Light CI mempertahankan deletion/rename dan pemisah NUL, menambah dependency
kontrak tool/DNA, coverage map, fixture/dataset, config frontend, Deno lock/config,
pin runtime, dan workflow itu sendiri. Manual/no-valid-base menjalankan seluruh
light checks. Perubahan yang memerlukan review risiko backend ditandai pada
summary tanpa otomatis menjalankan database/full gate.

Full gate tetap memakai satu reset, focused OAuth/owner sebelum Inspector dan
suite panjang, audit katalog/ACL/RLS/kebersihan fixture sebelum dan sesudah
Inspector, test-all sekali tanpa smoke-test duplikat, migration history, DB lint,
audit akhir, dan bukti tersanitasi yang diunggah walaupun gate gagal. Tiga snapshot
katalog disimpan terpisah. Full gate hanya manual, tidak membatalkan run lain,
dan tidak mengandung deployment atau business Write production.

Nama ZIP dan artefak mengikuti versi manifest, bukan v0.2.2 yang ditulis permanen.
Allowlist 13 file, `.app.json`, larangan bundled MCP, hash ekstraksi, serta scan
credential tetap ada. Scan tidak mencetak baris credential jika menemukan masalah.
Dokumentasi testing/operations/plugin dan AGENTS diselaraskan.

### Verifikasi yang dipilih dan estimasinya

Konfigurasi CI tidak mengubah source backend, migration, atau keputusan izin;
full gate **bukan** pemeriksaan wajib Task 6 dan tidak dijalankan. Bila diperlukan
pada rilis backend berikutnya, bukti historis 23 menit menuntut stop sebelum
dispatch dan pesan `lanjutkan` sesuai aturan pemilik.

Estimasi lokal: `pnpm run check` **1–3 menit**, focused CI regressions **kurang
dari 1 menit**, actionlint statis **kurang dari 1 menit**, serta packaging dan
verifikasi ZIP nyata **kurang dari 1 menit**. Basisnya run lokal Task 5 dan isi
command yang tidak menjalankan Docker/database atau hosted request. Jika nanti
push/PR diotorisasi, estimasi cold light Actions **3–8 menit** perlu diperiksa
ulang pada candidate SHA final dan kondisi cache/network saat itu.

Actionlint 1.7.12 diambil sementara dari release resmi; checksum arsip cocok dengan
checksum release. Tool berada di `/tmp/opencode`, bukan dependency runtime project.
Regresi menguji shell classifier aktual, pemilihan dependency, manual/PR base,
urutan dan pembatasan full gate, serta identitas artefak dari manifest. Hasil
eksekusi dicatat di bawah ini.

### Hasil verifikasi lokal

- **PASS:** focused CI regressions, 2 file / 20 test. Run check pertama berhenti
  pada aturan ESLint `no-regex-spaces` di test baru; regex diperbaiki memakai
  quantifier yang setara, tanpa menonaktifkan lint atau mengubah expected perilaku.
- **PASS:** `pnpm run check` lengkap setelah perbaikan: format, ESLint, typecheck,
  9 file root / 57 test, frontend typecheck/build, dan 19 test frontend.
  Dua puluh test fokus merupakan bagian dari 57 test root.
- **PASS:** actionlint 1.7.12 untuk tiga workflow, memeriksa syntax/context Actions.
  ShellCheck/Pyflakes tidak tersedia dan tidak diklaim dijalankan; shell classifier,
  metadata, serta packaging diuji langsung secara lokal.
- **PASS:** kandidat plugin 13 file dibangun dan diverifikasi; shell packaging
  CI yang sebenarnya membuat `content-producer-private-v0.2.3.zip`, memeriksa
  allowlist, `.app.json`, hash ekstraksi, serta larangan bundled MCP/credential.
  Hash ZIP lokal run ini:
  `15d34a6fef696c12a372ccbf121c57f9e6c13bf60df7402f343859922baa417d`.
  Ini hash hasil build tersebut, bukan expected tetap untuk semua build/instalasi.
- **PASS:** 234 source/input/arsip terlindungi tetap identik. Pengurangan satu
  dari snapshot Task 5 hanya skrip reuse yang memang dipensiunkan. Source runtime,
  migration, schema, dependency, dan instruksi paket plugin tidak berubah.
- **PASS:** 436 tautan lokal/anchor pada 122 Markdown, 14 skrip aktif dan tiga
  workflow source; pemanggil executable marker/reuse lama tidak tersisa.
- **PASS:** validasi nama 70 migration, format indeks yang diperiksa eksplisit,
  whitespace diff, dan peninjauan diff runtime/dependency/migration yang tetap kosong.

**Task 6 selesai untuk konsolidasi source dan verifikasi lokal.** GitHub sudah
diperiksa untuk proteksi, source workflow, serta riwayat run; perubahan baru belum
dipush dan belum mendapat run Actions tersendiri. Registry/history GitHub tidak
diubah. Full gate, probe hosted, deployment, dan business Write tidak dijalankan.

Berikutnya Task 7 memeriksa konsistensi akhir, menelusuri skenario pengembangan
dari panduan AI, serta merangkum hasil cleanup dan gate/batas bukti yang tersisa.

## 16. Pelaksanaan Task 7 — verifikasi akhir dan onboarding AI

**Tanggal:** 25 Oktober 2026. Pemilik telah menempatkan perubahan Task 1–6 pada
staging area sebelum task ini dimulai. Index dan HEAD diperlakukan sebagai
pekerjaan pengguna; Task 7 hanya melengkapi Markdown di working tree.

### Simulasi penelusuran dari panduan

Simulasi dilakukan oleh agen pada sesi ini melalui README → panduan relevan →
source/kontrak/test. Ini pemeriksaan kemampuan navigasi dan perencanaan, bukan
eksekusi fitur yang belum dibuat, pengujian agen lain, atau bukti live.

| Skenario                     | Jalur yang berhasil ditelusuri                                                                                                                                     | Kategori pemeriksaan sebelum rilis                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Metadata tambahan `get_post` | Tool contracts → `post_base.ts` (`getInput`, `postPackage`, `getOutput`) → `api.get_post` dan migration lanjutan/CR-049 → MCP/read-RPC/source-evidence regressions | Schema/permission/null/size checks; full gate jika RPC berubah                                             |
| Format trivia baru           | Domain/DNA/module contract → enum/config `schemas.ts` → `internal.post_render_v1` dan quality helpers → renderer fixture dan plugin trivia tests                   | Keputusan kontrak/versioning, test fokus, gate backend untuk perubahan aturan SQL/renderer                 |
| Niche baru                   | Module contract → registry dan batas core → literal `trivia` di `page_plan.ts`, context serta save/revise schema → persistence/fixture niche                       | Perluasan schema/dispatch secara sadar, compatibility data lama, RLS/owner tests dan gate sesuai perubahan |
| Penjelasan output plugin     | Skill/output contract → plugin skill/package tests → kandidat/filelist/ZIP → prosedur update host                                                                  | Focused/light CI jika hanya penyajian; tidak otomatis memerlukan full gate backend                         |

Penelusuran menemukan pelengkap panduan yang nyata: Git/Bash diperlukan untuk
regresi CI, tool ZIP dibutuhkan hanya untuk shell packaging terkait, dan niche
baru tidak cukup ditambahkan pada registry SQL karena schema saat ini masih
khusus trivia. Hal ini diperjelas dalam
[contoh pengembangan](development.md#7-contoh-penelusuran-perubahan).
Header development/testing serta indeks juga membedakan baseline commit dari
diff cleanup lokal agar workflow baru tidak dikira sudah ada pada SHA lama.

### Pemeriksaan akhir yang dipilih

Kandidat staging berisi 388 file, termasuk 68 file test; test count bukan bukti
semua suite dijalankan. Tidak ditemukan kebutuhan perubahan kode/config tambahan
pada Task 7. Fingerprint 266 file non-Markdown diambil sebelum edit dokumentasi.

Hasil `pnpm run check` Task 6 (57 root test dan 19 frontend test), actionlint,
serta verifikasi ZIP digunakan kembali untuk code/config yang tetap sama.
Task 7 menjalankan pemeriksaan perubahan dokumen, command/referensi, integritas
input/arsip/paket, serta pelestarian staging. Tidak menjalankan ulang suite hanya
untuk menambah label PASS setelah Markdown berubah.

**Preflight:** setiap pemeriksaan statis lokal diperkirakan kurang dari 1 menit,
berdasarkan jumlah file dan run Task 6. Scope: HEAD
`d6e7fe83ea006931f85624c4d60486f92ab3438c` + kandidat staging Task 1–6 + Markdown
Task 7. Tidak ada install, Docker/reset, full gate, push/PR/dispatch, atau polling
Actions pada task ini. Full gate bukan gate wajib untuk delta dokumentasi ini.

### Handoff dan batas bukti akhir

| Bagian                                                          | Status / kebutuhan berikutnya                                                                                                                  |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Pemeriksaan code/config lokal                                   | PASS pada Task 6; dipakai kembali hanya selama byte source tetap sama                                                                          |
| Verifikasi dokumen dan onboarding                               | PASS untuk penelusuran source dan pemeriksaan statis lokal yang dirinci di bawah                                                               |
| Actions baru untuk kandidat cleanup                             | NOT RUN; perlu review/commit/push/PR yang diotorisasi dan estimasi ulang sebelum trigger                                                       |
| Deno MCP/probe, database, HTTP/Inspector suite pada cleanup ini | NOT RUN; test serta gate tetap tersedia, tidak diklaim lulus dari check Node                                                                   |
| Full CR-020/044 gate baru                                       | NOT RUN; tidak diperlukan untuk delta ini. Tetap wajib jika perubahan backend/rilis berikutnya memerlukannya, dengan stop rule sebelum trigger |
| Runtime/plugin/backup production terbaru                        | Tidak diverifikasi ulang; gunakan prosedur operations pada pekerjaan berizin                                                                   |
| Acceptance historis dan kampanye live                           | Tetap sesuai bukti lama; cleanup tidak menutup AC atau menyatakan bug live FIXED                                                               |
| Git dan staging                                                 | Perubahan pemilik dipertahankan; update Markdown Task 7 perlu ditinjau bersama kandidat sebelum commit                                         |

Tidak ada merge, deployment, publikasi, rekayasa metrik, atau business Write.

### Hasil akhir Task 7

- **PASS:** enam pembaruan Markdown sesuai format dan tidak menambah dokumen
  panduan terpisah yang menduplikasi enam panduan utama.
- **PASS:** 458 tautan lokal/anchor pada dokumentasi serta 47 rujukan command
  package pada panduan aktif/audit sesuai script yang tersedia.
- **PASS:** nama dan urutan 33 tool sesuai kontrak frozen; seluruh nama juga
  cocok dengan registry source. Pembagian tetap 11 Baca dan 22 Tulis.
- **PASS:** 51 payload arsip sesuai relokasi yang ditetapkan; 44 identik byte
  dengan asal dan 7 hanya menyesuaikan tautan. Procedure-v1 dan fixture performa
  historis tetap identik byte. Empat input audit sama dengan baseline Git.
- **PASS:** 234 source/input/arsip terlindungi tetap sama, dan seluruh 266 file
  non-Markdown identik dengan awal Task 7. Tidak ada perubahan code/config yang
  memerlukan pengulangan check Task 6; hasil 57 root test, 19 frontend test,
  actionlint, dan verifikasi ZIP tetap memiliki scope yang sama.
- **PASS:** 13 file kandidat paket cocok dengan source dan ZIP lokal Task 6
  mempertahankan hash yang telah diverifikasi.
- **PASS:** HEAD dan index pengguna tetap sama. Fingerprint index tetap
  `687b3cda1be5ea4a3b7495c7386357ac639271586776539b9154e6f459fb20f9`;
  whitespace staged/unstaged valid. Hanya enam Markdown Task 7 yang menjadi
  perubahan tambahan di working tree dan belum masuk staging.

**Seluruh tujuh task selesai dalam scope cleanup lokal.** Kriteria yang sudah
dipenuhi adalah navigasi AI/pengembang, pemisahan sejarah dan kontrak aktif,
pengurangan tooling superseded, pemeliharaan input/test yang masih dibutuhkan,
serta CI source yang terstruktur dan diperiksa. Ini bukan sertifikasi live baru,
penutupan acceptance historis, atau otorisasi commit/push/merge/deployment.
