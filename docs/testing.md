# Panduan pengujian dan CI

Tujuannya adalah memeriksa perubahan yang relevan tanpa kehilangan gate keamanan
atau mengulang suite berat yang sama. Instruksi mengikat ada di
[AGENTS.md](../AGENTS.md); aturan pelepasan perubahan mengikuti
[CR-020](decisions/2026-10-15-phase-9-10-risk-based-mvp-acceptance.md) dan
[CR-044](decisions/2026-10-20-phase-10-gate-order-and-backend-sha-reuse.md).

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
4. Bila pemeriksaan **wajib diperkirakan lebih dari 10 menit**, berhenti sebelum
   men-trigger-nya. Laporkan estimasi/basis, workflow/check, SHA, hasil yang sudah
   selesai, sisa gate, serta URL Issue/PR/run yang tersedia, lalu akhiri respons.
5. Tunggu pesan **`lanjutkan`** berikutnya untuk meneruskan langkah CI tersebut.
   Pesan itu bukan izin merge, deploy, atau menulis data production.

Ini bukan timer yang menyuruh menunggu sepuluh menit dahulu. Jika run milik pihak
lain sudah berjalan, atau sebuah run ternyata jelas akan melampaui sepuluh menit,
biarkan berjalan tanpa membatalkan sepihak, catat URL/status sekali, hentikan
polling, dan serahkan kendali sampai ada `lanjutkan`. Run yang belum selesai tetap
belum PASS. Gate yang ditunda tetap wajib sebelum deployment yang memerlukannya.

## 2. Arti setiap command

| Command dari root                                  | Cakupan                                                        | Prasyarat / efek                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `pnpm run format:check`                            | Format repository sesuai ignore/config Prettier                | Membaca source; cakupannya lebih luas dari file yang diubah                        |
| `pnpm run lint`                                    | ESLint                                                         | Dependency root                                                                    |
| `pnpm run typecheck`                               | TypeScript Node tooling, root test, dan test database          | Tidak menjalankan query database                                                   |
| `pnpm run test`                                    | Vitest untuk `tests/**/*.test.ts`                              | Bukan suite database atau Deno; mencakup input kontrak/dokumen dan paket           |
| `pnpm run frontend:typecheck`                      | `checkJs` source browser                                       | Tidak membuktikan browser/hosting/OAuth live                                       |
| `pnpm run frontend:build`                          | Build statis frontend                                          | Menulis `auth-frontend/dist/` dengan konfigurasi publik proses                     |
| `pnpm run frontend:test`                           | Tiga file test Node frontend                                   | Menggunakan fixture/mocking; termasuk route/callback                               |
| `pnpm run check`                                   | Seluruh tujuh command di atas, berurutan                       | Tidak menjalankan suite MCP atau database; membangun frontend                      |
| `pnpm run verify-migrations`                       | Pola nama file SQL migration                                   | Tidak memeriksa SQL, applied history, atau drift                                   |
| `pnpm run test:mcp`                                | Deno check, lint MCP, dan 15 file test MCP yang disebut script | Deno; mock/fixture protokol, tanpa stack DB untuk suite ini                        |
| `pnpm run test:database`                           | Vitest config database, 40 file test pada baseline             | Docker/Supabase lokal berjalan dengan migration yang sesuai; menulis fixture lokal |
| `pnpm run test-all`                                | `check` → `verify-migrations` → `test:mcp` → `test:database`   | Deno dan DB lokal siap; tidak menyalakan/reset stack sendiri                       |
| `pnpm run smoke-test`                              | Struktur repository, `verify-migrations`, lalu suite database  | Bukan health-only check; menjalankan DB suite lagi bila dipakai bersama test-all   |
| `pnpm run package-plugin`                          | Validasi source dan pembuatan kandidat 13 file                 | Mengganti kandidat output lama; tidak membuat ZIP/install                          |
| `pnpm exec tsx scripts/verify-plugin-candidate.ts` | Kesamaan daftar file, byte, dan hash kandidat/source           | Kandidat/filelist sudah dibuat                                                     |

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

| Jenis perubahan                                                       | Pemeriksaan yang sesuai                                                                                 | Batas bukti                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Markdown developer biasa                                              | Format file berubah, tautan/anchor, ketepatan isi, whitespace; light CI pada PR                         | Tidak perlu full backend gate hanya untuk dokumentasi                         |
| Dokumen kontrak atau input audit dipindah/diubah                      | Pemeriksaan di atas + pembaca/test/packaging/audit yang terdampak                                       | Ekstensi `.md`/`.json` tidak otomatis berarti dampaknya ringan                |
| TypeScript atau konfigurasi                                           | `pnpm run check` + test perilaku terkait                                                                | Pilih gate tambahan berdasarkan dampak, bukan hanya ekstensi                  |
| Instruksi/metadata paket plugin                                       | Test paket terkait, packaging dan verifikasi kandidat; MCP/manual yang terdampak                        | Light CI; gunakan gate backend lama hanya bila syarat unchanged backend benar |
| Transport MCP tanpa perubahan keputusan izin                          | `check` + focused protocol/security tests                                                               | Sesuai CR-044; bukan kategori untuk perubahan owner authorization             |
| Migration, RLS, grant, identity/owner, write permission, business RPC | `check` dan focused tests selama pengembangan; satu full CR-020 gate pada kandidat final sebelum deploy | Full gate tidak dihapus oleh batas waktu CI                                   |
| Frontend login/consent/routing                                        | Source checks, test Node terkait, pemeriksaan browser; nilai dampak auth dan gate tambahannya           | Build/unit test bukan bukti login production atau PKCE                        |

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

Urutan wajib CR-044 dalam full gate: setelah satu clean reset lokal, jalankan
focused OAuth/owner dan authenticated Inspector **sebelum** suite database panjang
dalam `test-all`. Pertahankan locked install, migration history, DB lint lokal,
audit katalog/privilege/RLS dan kebersihan fixture, whitespace, serta bukti yang
disanitasi. CR-044 juga mempertahankan audit sebelum/sesudah Inspector; periksa
urutan job aktual, jangan menganggap nama workflow membuktikan seluruh urutannya
sudah sesuai. Inspector dan audit akhir memastikan jalur dan state setelahnya.
Jangan menambah `smoke-test` sebagai pengulangan DB suite yang sudah tercakup.

Workflow backend yang sudah dikonsolidasikan memakai urutan tersebut: satu reset,
focused OAuth/owner, audit awal, Inspector, audit sesudahnya, suite lengkap,
history/lint, lalu audit akhir. Marker checkpoint lama sudah dipensiunkan;
perubahan source/PR tidak otomatis memicu full gate.

### Penggunaan ulang gate backend

Boleh merujuk gate lama hanya jika source backend terpasang, migration,
konfigurasi keamanan, dan dependency runtime terkait tetap identik. Simpan
backend SHA yang diuji/di-deploy terpisah dari SHA dokumentasi atau paket.
Merge SHA berbeda bukan exact-SHA PASS otomatis. Tetap jalankan pemeriksaan
fokus untuk paket/MCP dan manual card yang terdampak sesuai scope perubahan.

## 5. Workflow CI yang masih tersedia

| Workflow                                                                      | Peran                                                                                                                             |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [ci.yml](../.github/workflows/ci.yml)                                         | PR/push ke main dan manual: format, check source/frontend, MCP/probe/paket sesuai dependency; tanpa database/reset/hosted request |
| [backend-technical-gate.yml](../.github/workflows/backend-technical-gate.yml) | Full CR-020/044 manual pada main dengan exact candidate SHA, stack lokal terisolasi, serta bukti hasil yang disanitasi            |
| [hosted-oauth-probe.yml](../.github/workflows/hosted-oauth-probe.yml)         | Probe hosted manual pada main: metadata publik dan challenge tanpa token; tanpa business tools/call                               |

Task 6 memeriksa GitHub sebagai admin pada 25 Oktober 2026: branch protection
`main` mengembalikan `Branch not protected`, daftar ruleset dan rules untuk branch
kosong. Tidak ada required status checks yang terpasang pada pemeriksaan itu.
Kebijakan dapat berubah; periksa ulang sebelum mengganti workflow di masa depan.
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

Nama ZIP dan artefak diambil dari versi manifest plugin; source v0.2.3 menghasilkan
nama v0.2.3, bukan label checkpoint yang ditulis permanen. Kandidat 13 file,
allowlist, hash ekstraksi, dan larangan credential/bundled MCP tetap diperiksa.

Basis durasi yang tersedia: job light run 39915940238 berlangsung 29 detik,
run 39800520559 40 detik, sementara full gate 39768822314 berlangsung 23 menit
19 detik pada job-nya. Itu bukti historis, bukan jaminan cold run berikutnya.
Perubahan CI saja memakai source/config tests lokal; full gate baru tidak wajib
dijalankan hanya untuk konsolidasi ini. Jika gate itu kemudian diperlukan sebelum
deployment backend, estimasi ulang dan terapkan stop rule sebelum dispatch.

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
