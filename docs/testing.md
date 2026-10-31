# Panduan pengujian dan CI

Tujuannya adalah memeriksa perubahan yang relevan tanpa kehilangan gate keamanan
atau mengulang suite berat yang sama. Instruksi mengikat ada di
[AGENTS.md](../AGENTS.md); aturan pelepasan perubahan mengikuti
[CR-020](decisions/2026-10-15-phase-9-10-risk-based-mvp-acceptance.md) dan
[CR-044](decisions/2026-10-20-phase-10-gate-order-and-backend-sha-reuse.md).
[CR-052](decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md) menetapkan
**gate rilis G4 manual exact-SHA yang efektif sejak merge PR #105**
(`ca5c43597af97c95ea9eaa87876237fd2d45e10c`). Gate legacy CR-020/044 berlaku sebelum merge;
kini hanya rollback tanpa mengurangi kontrol keamanannya.

**Dasar peninjauan:** baseline `d6e7fe83ea006931f85624c4d60486f92ab3438c` dan
pembaruan script/workflow cleanup lokal, ditinjau 25 Oktober 2026. File workflow
baru merupakan perubahan kandidat lokal, belum bagian dari commit baseline itu.
Daftar command di sini bukan catatan bahwa seluruh suite dijalankan pada cleanup.

## 1. Estimasi sebelum menjalankan pemeriksaan

Aturan berlaku untuk CI lokal, Actions, dispatch, dan push/PR yang men-trigger CI.
Sebelum menjalankan:

1. Sebutkan command atau workflow, candidate SHA, scope diff, dan prasyaratnya.
2. Periksa isi job dan riwayat run yang relevan; perhitungkan install, download
   image/dependency, reset, suite, serta upload artefak. Timeout YAML bukan estimasi.
3. Cari apakah pemeriksaan fokus atau bukti passing pada backend SHA yang tetap
   identik sudah memenuhi kebutuhan. Jangan memulai full gate duplikat tanpa alasan.
4. Bila pemeriksaan yang sudah diizinkan diperkirakan **lebih dari 10 menit**,
   jalankan/dispatch dan konfirmasi sekali bahwa run dimulai. Laporkan
   estimasi/basis, SHA, URL run, dan status sementara, lalu akhiri respons tanpa
   menunggu hasil atau memantau log berulang.
5. Tunggu pesan **`lanjutkan`** berikutnya untuk memeriksa hasil atau
   melanjutkan pekerjaan. Pesan itu bukan izin merge, deploy, atau menulis data
   production.

Ini bukan timer yang menyuruh menunggu sepuluh menit dahulu. Jika run milik pihak
lain sudah berjalan, atau sebuah run ternyata jelas akan melampaui sepuluh menit,
biarkan berjalan tanpa membatalkan sepihak, catat URL/status sekali, hentikan
polling, dan serahkan kendali sampai ada `lanjutkan`. Run yang belum selesai tetap
belum PASS. Gate wajib tetap dijalankan sebelum deployment yang memerlukannya.

## 2. Arti setiap command

| Command dari root                                  | Cakupan                                                                             | Prasyarat / efek                                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm run format:check`                            | Format repository sesuai ignore/config Prettier                                     | Membaca source; cakupannya lebih luas dari file yang diubah                                       |
| `pnpm run lint`                                    | ESLint                                                                              | Dependency root                                                                                   |
| `pnpm run typecheck`                               | TypeScript Node tooling, root test, dan test database                               | Tidak menjalankan query database                                                                  |
| `pnpm run test`                                    | Vitest untuk `tests/**/*.test.ts`                                                   | Bukan suite database atau Deno; mencakup input kontrak/dokumen dan paket                          |
| `pnpm run frontend:typecheck`                      | `checkJs` source browser                                                            | Tidak membuktikan browser/hosting/OAuth live                                                      |
| `pnpm run frontend:build`                          | Build statis frontend                                                               | Menulis `auth-frontend/dist/` dengan konfigurasi publik proses                                    |
| `pnpm run frontend:test`                           | Tiga file test Node frontend                                                        | Menggunakan fixture/mocking; termasuk route/callback                                              |
| `pnpm run check`                                   | Seluruh tujuh command di atas, berurutan                                            | Tidak menjalankan suite MCP atau database; membangun frontend                                     |
| `pnpm run verify-migrations`                       | Pola nama file SQL migration                                                        | Tidak memeriksa SQL, applied history, atau drift                                                  |
| `pnpm run test:mcp`                                | Deno check, lint MCP, dan 15 file test MCP yang disebut script                      | Deno; mock/fixture protokol, tanpa stack DB untuk suite ini                                       |
| `pnpm run test:database`                           | Vitest database **41 file saat ini** (40 pada baseline historis)                    | Docker/Supabase lokal dengan migration sesuai; menulis fixture lokal                              |
| `pnpm run test-all`                                | **Legacy CR-020/044**: `check` → `verify-migrations` → `test:mcp` → `test:database` | Tidak start/reset stack; tetap dipertahankan untuk gate sebelum merge dan rollback, bukan gate G4 |
| `pnpm run gate:source`                             | Source/frontend, versi/manifest, bukti source untuk G4                              | Komponen source kandidat; PASS saja bukan release evidence lengkap                                |
| `pnpm run gate:backend`                            | Isolated reset/audit, DB dan MCP/Inspector, history/lint/advisors                   | Mendukung shard 19+22 di Actions; masing-masing shard memiliki stack mandiri                      |
| `pnpm run gate:full`                               | Konjungsi source dan backend suite kandidat G4                                      | Lokal dengan overlay adalah `DIAGNOSTIC_CONFIG_OVERLAY`, bukan formal exact-config                |
| `pnpm run smoke-test`                              | Struktur repository, `verify-migrations`, lalu suite database                       | Bukan health-only check; menjalankan DB suite lagi bila dipakai bersama test-all                  |
| `pnpm run package-plugin`                          | Validasi source dan pembuatan kandidat 13 file                                      | Mengganti kandidat output lama; tidak membuat ZIP/install                                         |
| `pnpm exec tsx scripts/verify-plugin-candidate.ts` | Kesamaan daftar file, byte, dan hash kandidat/source                                | Kandidat/filelist sudah dibuat                                                                    |

**Inventaris aktif:** database **41 file/182 kasus** pada manifest G4;
angka **40 file** pada catatan baseline hanya historis. Bukti rilis formal
setelah merge berasal dari Actions manual dengan committed exact config,
source + dua shard database + aggregate PASS, bukan dari eksekusi
`test-all` secara terpisah. Lokal `gate:full` PASS berlabel
`DIAGNOSTIC_CONFIG_OVERLAY` hanya diagnostik ketika overlay mengganti
`project_id`/port; perubahan security config, migration, fixture, atau
suite wajib fail-closed. Ketiga run exact-SHA Actions PASS 9m41s,
9m43s, dan 9m50s pada `a64a55e…`.

`test:mcp` tidak mencakup `mcp-probe/handler_test.ts`. Jika probe diubah, pilih
test-nya secara eksplisit dan tinjau workflow terkait. Test keberadaan runtime
Deno lama di `_shared/` sudah dipensiunkan; pin dan 15 file suite MCP tetap ada.
Jangan mengklaim semua test Edge lulus hanya dari command `test:mcp`.

Output opsional test CR-016 (`CR016_EVIDENCE_RUN=A/B`) disimpan di
`artifacts/cr016/` melalui `scripts/evidence-output.ts`. Snapshot performa historis
yang masih menjadi input berada di `supabase/tests/fixtures/trivia/history/`;
payload dan expected-nya dipertahankan. Test unit memeriksa pemisahan output baru
dari input/docs, tanpa mengakses database.

## 3. Memilih pemeriksaan sesuai perubahan

| Jenis perubahan                                                       | Pemeriksaan yang sesuai                                                                                             | Batas bukti                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Markdown developer biasa                                              | Format file berubah, tautan/anchor, ketepatan isi, whitespace; light CI pada PR                                     | Tidak perlu full backend gate hanya untuk dokumentasi                                                       |
| Dokumen kontrak atau input audit dipindah/diubah                      | Pemeriksaan di atas + pembaca/test/packaging/audit yang terdampak                                                   | Ekstensi `.md`/`.json` tidak otomatis berarti dampaknya ringan                                              |
| TypeScript atau konfigurasi                                           | `pnpm run check` + test perilaku terkait                                                                            | Pilih gate tambahan berdasarkan dampak, bukan hanya ekstensi                                                |
| Instruksi/metadata paket plugin                                       | Test paket terkait, packaging dan verifikasi kandidat; MCP/manual yang terdampak                                    | Light CI; reuse hanya jika backend/security/dep identik menurut CR-044                                      |
| Transport MCP tanpa perubahan keputusan izin                          | `check` + focused protocol/security tests                                                                           | Sesuai CR-044; bukan kategori untuk perubahan owner authorization                                           |
| Migration, RLS, grant, identity/owner, write permission, business RPC | `check` dan focused tests; **satu full gate pada SHA final**: legacy sebelum merge, G4 Actions manual setelah merge | G4 mewajibkan source + kedua shard 41/182 + advisors terpisah + aggregate PASS; deployment tetap perlu izin |
| Frontend login/consent/routing                                        | Source checks, test Node terkait, pemeriksaan browser; nilai dampak auth dan gate tambahannya                       | Build/unit test bukan bukti login production atau PKCE                                                      |

Perubahan security config atau dependency runtime tidak boleh dianggap tidak
berdampak hanya karena business handler tidak berubah. Jika klasifikasi risiko
belum jelas, telusuri keputusan izin dan deployment sebelum memilih gate.

### Contoh test fokus

Setelah estimasi dan prasyarat terpenuhi, pilih command sesuai perubahan. Contoh
berikut adalah pilihan terpisah, bukan urutan yang harus selalu dijalankan:

```sh
pnpm exec vitest run tests/plugin-config.test.ts tests/plugin-package.test.ts tests/plugin-skill.test.ts tests/plugin-trivia.test.ts
```

```sh
pnpm exec vitest run --config vitest.database.config.ts supabase/tests/database/api-post-save-revise.test.ts supabase/tests/database/api-post-concurrency.test.ts
```

```sh
node --test --test-concurrency=1 auth-frontend/tests/auth.test.mjs auth-frontend/tests/direct-routes.test.mjs
```

Pemilihan file bisa berubah menurut diff. Pemeriksaan fokus yang passing bukan
pengganti full gate untuk perubahan backend yang memang mewajibkannya.

## 4. Harness HTTP dan full gate

`scripts/phase-6-13.ts` masih merupakan harness aktif meski namanya berisi fase.
Ia membuat fixture, PostgREST/container lokal tambahan, token sintetis, dan host
HTTP loopback, lalu memeriksa alur nyata ke RPC serta MCP Inspector 2.5.0.
Harness dapat mengunduh Inspector melalui `npx`; perhitungkan pada estimasi.

```sh
pnpm exec tsx scripts/phase-6-13.ts
```

Command ini memerlukan stack lokal dan Deno. Opsi `--preflight` melewati bagian
Inspector, tetapi tetap menjalankan fixture serta skenario HTTP/write lokal;
bukan dry-run read-only atau pemeriksaan beberapa detik yang boleh diasumsikan.
`scripts/phase-6-catalog-audit.ts` memeriksa history, source, ACL/RLS, dan sisa
fixture terhadap baseline yang dipin; empat input Phase 5 masih dibacanya.

Suite `api-page-plan-writes.test.ts` memakai helper `psql` lokal yang sudah
digunakan suite plan lain, bukan menjalankan CLI Supabase untuk setiap query.
Seluruh 18 kasus, termasuk pemeriksaan owner/JWT dan penolakan lintas owner,
tetap dijalankan. Pada checkout lokal 26 Oktober 2026, durasi file ini turun
dari sekitar 333 detik (Actions sebelumnya) menjadi 49 detik (test fokus);
angka ini tetap hasil test fokus historis, bukan durasi full gate G4.

**Gate historis sebelum merge PR #105 (kini legacy/rollback CR-020/044):** satu stack lokal
terisolasi dengan satu clean reset, focused OAuth/owner, audit awal,
authenticated Inspector, audit sesudah Inspector, lalu `pnpm run test-all`
termasuk suite database; lanjutkan migration history, DB lint, final catalog
ACL/RLS/fixture audit, whitespace, cleanup dan evidence teredaksi. Urutan
satu-reset/`test-all` ini tetap didokumentasikan untuk **rollback**, bukan
syarat rilis yang berlaku setelah CR-052 efektif.

**Gate rilis aktif sejak merge PR #105 — G4 CR-052:** dispatch
[`backend-gate-candidate.yml`](../.github/workflows/backend-gate-candidate.yml)
**manual di `main` pada exact final SHA**. Job source/frontend dan **dua
Supabase stack terisolasi** berjalan dengan **satu clean reset per shard**;
shard 1 melaksanakan MCP **15 file/82 kasus**, authenticated Inspector
**33 valid/33 invalid + owner denial** tepat sekali; kedua shard mengeksekusi
**19+22 = 41 file/182 kasus DB** tanpa skip dengan audit sebelum/sesudah/akhir,
migration names/history, DB lint, **local security advisors terpisah**,
fixture/whitespace/cleanup. Verifikasi ketiga report, identitas SHA/hash yang
sama, status semua tahap, dan **aggregate PASS** sebelum menerima bukti formal.
Actions memakai committed exact config; PC dengan `DIAGNOSTIC_CONFIG_OVERLAY`
(`project_id`/port saja) adalah bukti reproduksibilitas diagnostik, bukan
formal exact-config. Bila security config, migration, fixture atau suite berubah,
**fail-closed**. Jangan menambah `smoke-test` untuk menggandakan DB suite.

Belum ada required status context atau branch protection yang otomatis
menjalankan/mewajibkan G4. Operator harus mengecek run manual dan aggregate
pada exact SHA; check atau deployment tidak dianggap PASS dari nama workflow.

### Penggunaan ulang gate backend

Boleh mereferensikan bukti backend historis hanya jika source backend terpasang,
migration, konfigurasi keamanan, dan dependency runtime terkait tetap identik.
Reuse ini tidak menggantikan full gate pada SHA final ketika diwajibkan
untuk rilis backend berisiko menurut CR-052 setelah merge. Simpan
backend SHA yang diuji/di-deploy terpisah dari SHA dokumentasi atau paket.
Merge SHA berbeda bukan exact-SHA PASS otomatis. Tetap jalankan pemeriksaan
fokus untuk paket/MCP dan manual card yang terdampak sesuai scope perubahan.

## 5. Workflow CI yang masih tersedia

| Workflow                                                                      | Peran                                                                                                                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ci.yml](../.github/workflows/ci.yml)                                         | PR/push ke main dan manual: format, check source/frontend, MCP/probe/paket sesuai dependency; tanpa database/reset/hosted request                       |
| [backend-gate-candidate.yml](../.github/workflows/backend-gate-candidate.yml) | **G4 release gate manual exact-SHA setelah merge PR #105**: source + dua shard terisolasi + aggregate PASS, dengan committed config; **tidak otomatis** |
| [backend-technical-gate.yml](../.github/workflows/backend-technical-gate.yml) | Full legacy CR-020/044 manual exact-SHA: **rollback sekarang**, gate historis sebelum merge; satu stack + `test-all`                                    |
| [hosted-oauth-probe.yml](../.github/workflows/hosted-oauth-probe.yml)         | Probe hosted manual pada main: metadata publik dan challenge tanpa token; tanpa business tools/call                                                     |

Task 6 memeriksa GitHub sebagai admin pada 25 Oktober 2026: branch protection
`main` mengembalikan `Branch not protected`, daftar ruleset dan rules untuk branch
kosong. Tidak ada required status checks yang terpasang pada pemeriksaan itu.
Pemeriksaan G4 pada 31 Oktober 2026 juga menunjukkan `main` tanpa required
status contexts/branch protection otomatis; detail protection tidak dapat
dibaca oleh integrasi (403). Karena itu operator harus memeriksa manual
exact-SHA Actions dan aggregate PASS; periksa ulang dengan admin sebelum
mengubah required checks atau kebijakan branch.
Konsolidasi source tidak menghapus riwayat run/workflow pada registry Actions.

Classifier light CI kini menyertakan deletion dan memecah rename menjadi dua path
untuk memilih check. File yang hilang tidak dikirim ke formatter; daftar path
memakai pemisah NUL agar spasi tidak memecah argumen. Regresi shell workflow diuji
dengan tree Git lokal, tanpa commit atau koneksi GitHub.

Pemetaan kini mencakup kontrak tool/DNA, coverage input, fixture/dataset, konfigurasi
frontend, lock/config Deno, pin runtime, dan perubahan workflow itu sendiri.
Dispatch CI manual atau event tanpa base yang sah memilih seluruh pemeriksaan
ringan. Review risiko backend ditandai terpisah, bukan otomatis menjalankan full
gate. Dependency baru tetap harus ditambahkan ke pemetaan dan regresinya.

Nama ZIP dan artefak diambil dari versi manifest plugin; kandidat source v0.2.7
menghasilkan nama v0.2.7, bukan label checkpoint yang ditulis permanen. Kandidat 13 file,
allowlist, hash ekstraksi, dan larangan credential/bundled MCP tetap diperiksa.

Basis durasi yang tersedia: job light run 39915940238 berlangsung 29 detik,
run 39800520559 40 detik, sementara full gate 39768822314 berlangsung 23 menit
19 detik pada job-nya. Itu bukti historis, bukan jaminan cold run berikutnya.
Perubahan CI saja memakai source/config tests lokal; full gate baru tidak wajib
dijalankan hanya untuk konsolidasi ini. Jika gate itu kemudian diperlukan sebelum
deployment backend, estimasi ulang lalu dispatch sesuai izin; hentikan pemantauan
chat setelah run dimulai bila perkiraan durasinya lebih dari sepuluh menit.

## 6. Bukti lokal, CI, dan live

- **Lokal/fixture:** membuktikan perilaku pada lingkungan terisolasi yang dijalankan.
- **Actions:** membuktikan check pada SHA dan scope run tertentu; hasil harus selesai.
- **Live:** mengikuti [Live Test & Fix](live-test/README.md), matrix, dan log;
  write memerlukan izin spesifik dan readback yang membuktikan state.
- **Historis:** bukti pada tanggal/runtime sebelumnya; belum tentu status sekarang.

Catat command/workflow, SHA, estimasi, exit code/conclusion, cakupan, URL bukti,
dan batas yang belum diuji. Jangan menyimpan token, credential, payload privat,
atau output CLI yang belum disanitasi.

Pakai `PASS`, `FAIL`, `BLOCKED`, atau `NOT RUN` dengan batas bukti yang jelas.
`FIXED` untuk masalah live memerlukan retest setelah runtime benar-benar berubah,
bukan hanya PR merged atau CI passing. Keberhasilan fixture publikasi/metrics
tidak membuktikan publikasi Facebook maupun pengamatan performa nyata.

## 7. Gate rilis G4 manual exact-SHA dan batas bukti

Workflow [`backend-gate-candidate.yml`](../.github/workflows/backend-gate-candidate.yml)
menjadi **gate rilis manual exact-SHA sejak merge PR #105** pada
`ca5c43597af97c95ea9eaa87876237fd2d45e10c`.
Trigger tetap `workflow_dispatch` pada `main`; **tidak ada required status
context maupun branch protection** yang mengeksekusi gate secara otomatis.
Operator wajib memeriksa input `candidate_sha`, `github.sha`, checkout SHA,
PASS job source, kedua database shard dan aggregate, SHA/hash manifest/lock/
input/partisi dan artifact aman. Job aggregate bernama
`G4 release evidence aggregate (manual exact SHA)`. Workflow
[`backend-technical-gate.yml`](../.github/workflows/backend-technical-gate.yml)
dan `pnpm run test-all` tetap tersedia sebagai rollback CR-020/044.
Gate legacy hanya digunakan sebagai rollback setelah merge PR #105.

Perbandingan same-SHA `aa0c38bd1d9df941128802a0c4848d507a8f6077`:
[candidate #41058481162](https://github.com/milyarderpro/content-producer/actions/runs/41058481162)
PASS 12m01s versus
[legacy #41060272610](https://github.com/milyarderpro/content-producer/actions/runs/41060272610)
PASS 15m26s, keduanya DB 41 file/182 kasus, MCP dan Inspector 33/33 + denial.
**Legacy tidak memiliki bukti advisors lokal mandiri**; kandidat
menjalankan `supabase db advisors --local --type security` sebagai tahap
terpisah pada tiap shard, bukan DB lint atau audit katalog.

Setelah rebalance **19+22**, pada SHA
`a64a55ebb1e3c76112cd211724c2eb6bc256699a` tiga run Actions
**PASS**: [#41072354433](https://github.com/milyarderpro/content-producer/actions/runs/41072354433)
**9m41s**, [#41074001136](https://github.com/milyarderpro/content-producer/actions/runs/41074001136)
**9m43s** dan
[#41157962349](https://github.com/milyarderpro/content-producer/actions/runs/41157962349)
**9m50s**. Run ketiga: source 12 file/91 tes, shard 1 19 file/97,
shard 2 22 file/85; **41 file/182 kasus DB** dan aggregate PASS tanpa skip.
MCP 15/82, Inspector 33/33 + owner denial, audit before/after/final,
migration/history, DB lint, advisors terpisah dan cleanup PASS.
Orchestrator menyetujui kesetaraan cakupan pada
[review PR #105](https://github.com/milyarderpro/content-producer/pull/105#issuecomment-6537758736).

Lokal `gate:full` pada SHA sama **PASS 18m50s** tetapi berlabel
**`DIAGNOSTIC_CONFIG_OVERLAY`**, bukan PASS formal exact-config:
overlay hanya `project_id`/port untuk isolasi PC.
Jika security config, migration, fixture, suite atau SHA berubah,
**fail-closed**. Bukti formal rilis harus Actions dengan **committed exact
config** (`ACTIONS_EXACT_CONFIG`). CI fixture tidak membuktikan
hosted OAuth, deployment atau live business Write. Rincian keputusan di
[CR-052](decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md).

Untuk perubahan workflow/docs jalankan `pnpm exec vitest run tests/workflow-config.test.ts`,
Prettier, `git diff --check` dan
`pnpm run check` melalui light CI PR head. Tidak perlu dispatch ulang
full backend gate pada draft #105; tiga Actions kandidat telah selesai.
Required checks hanya dapat diaktifkan melalui keputusan terpisah.
