# Panduan pengembangan

Panduan ini menjelaskan cara menyiapkan lingkungan dan mengembangkan fitur dengan
mengikuti struktur project yang ada. Baca [arsitektur](architecture.md),
[domain](domain.md), dan [kontrak tool](tool-contracts.md) untuk konteks produknya.
Pemilihan pemeriksaan ada di [testing](testing.md); tindakan pada hosted environment
ada di [operations](operations.md).

**Dasar panduan:** baseline `d6e7fe83ea006931f85624c4d60486f92ab3438c` beserta
perubahan cleanup lokal yang dicatat pada audit, ditinjau 25 Oktober 2026.
Command berasal dari script repository serta bantuan CLI
Supabase 2.120.0 yang diperiksa; penulisan panduan tidak menjalankan database atau
deployment. Semua command di bawah dijalankan dari root repository, kecuali jika
disebutkan lain.

## 1. Prasyarat sesuai pekerjaan

| Alat              | Versi/acuan                                                   | Kapan diperlukan                                               |
| ----------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Node.js           | `24.15.0`, [.nvmrc](../.nvmrc); range package `>=24.15.0 <25` | Script, pemeriksaan, dan build frontend                        |
| pnpm              | `10.33.2`, [package.json](../package.json)                    | Dependency dan command project                                 |
| Supabase CLI      | `2.120.0`, dependency root yang dikunci                       | Stack lokal, migration, serta operasi Supabase                 |
| Deno              | `2.9.7`, [.deno-version](../.deno-version)                    | `test:mcp`, harness HTTP, dan tooling Edge langsung            |
| Docker            | Runtime yang dapat diakses pengguna lokal                     | Stack Supabase, suite database, dan harness HTTP               |
| GitHub CLI (`gh`) | Instalasi dan akun yang berhak atas repository                | Pemeriksaan Issue/PR/Actions dan alur perbaikan melalui GitHub |

Periksa versi sebelum bekerja. Jangan mengubah pin atau memperbarui dependency
hanya karena CLI menampilkan versi baru. `pnpm run check` tidak membutuhkan stack
database; `pnpm run test-all` membutuhkan Deno dan database lokal yang siap.

Git dan Bash juga harus tersedia untuk regresi workflow dalam `pnpm run check`.
Test menggunakan tree Git sementara tanpa membuat commit; runner CI memakai
Ubuntu 24.04. Untuk mengeksekusi tahap verifikasi ZIP dari shell CI, diperlukan
`zip`, `unzip`, `jq`, dan `sha256sum`. Tool ZIP tersebut bukan prasyarat command
Node `package-plugin`/verifikasi filelist saja.

## 2. Instalasi dependency dan konfigurasi

Setelah menyiapkan Node dan pnpm yang sesuai:

```sh
pnpm install --frozen-lockfile
```

Root dan `auth-frontend/` mempunyai package/lockfile dengan tujuan berbeda. Untuk
pekerjaan repository gunakan instalasi root. Hosting frontend menggunakan package
di direktori frontend, sebagaimana dijelaskan pada [README frontend](../auth-frontend/README.md).

### Variabel lingkungan tidak semuanya dibaca dari tempat yang sama

| Komponen       | Nama yang dibaca                                                                                                       | Cara pemakaian                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Contoh root    | `.env.example`: identitas publik dan URL                                                                               | Acuan nama, bukan pemuat konfigurasi otomatis untuk semua script                  |
| Build frontend | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`                                                                   | Environment proses build; hanya dua nilai publik ini masuk `dist/config.js`       |
| Edge OAuth     | `MCP_RESOURCE_URL`, `MCP_ISSUER_URL`, `MCP_OWNER_USER_ID`, `SUPABASE_URL`, serta publishable/anon key sesuai `auth.ts` | Environment Edge; resource/issuer/owner harus cocok dengan lingkungan yang dituju |
| Harness HTTP   | Fixture lokal yang dibuat script                                                                                       | Bukan token owner production atau konfigurasi untuk deployment                    |

Script build frontend tidak memuat `.env` sendiri, dan wrapper Node tidak
menyediakan pemuat `.env` umum. Menyalin `.env.example` menjadi `.env` saja tidak
menjamin suatu command menerima nilainya. Berikan konfigurasi melalui environment
proses atau mekanisme CLI/hosting yang memang digunakan komponen tersebut.

Pisahkan nilai lokal dari production. Simpan credential dan token di tempat lokal
yang tidak tracked atau pengelola secret yang sesuai; jangan masukkan ke dokumen,
argumen command, log, atau Issue. Output CLI lokal juga dapat berisi credential.

## 3. Menjalankan stack database lokal

Mulai stack yang dikonfigurasi oleh `supabase/config.toml`:

```sh
pnpm run supabase:start
```

Pada inisialisasi database baru, migration dan seed diterapkan. Volume lokal yang
sudah ada tidak boleh dianggap otomatis sama dengan source terbaru. Untuk
membangun ulang database disposable dari seluruh migration, gunakan reset berikut
setelah memastikan data lokalnya boleh dibuang:

```sh
pnpm run supabase:reset
```

Reset **menghapus data database lokal**, memutar ulang migration, dan menjalankan
seed. Wrapper memilih `--local` secara eksplisit serta menangani container Realtime
agar tidak berlomba dengan reset. Seed saat ini adalah no-op; registry `trivia`
dibuat oleh migration, bukan diisi sebagai fixture production.

Dua pemeriksaan berikut berbeda:

```sh
pnpm run verify-migrations
pnpm run supabase:verify
```

Yang pertama memeriksa nama file migration tanpa database. Yang kedua membaca
history database lokal untuk dibandingkan dengan source; tinjau hasilnya,
jangan menganggap script nama file membuktikan SQL sudah diterapkan.

Untuk menjalankan seed lokal tanpa reset ada `pnpm run supabase:seed`. Baca isi
`supabase/seed.sql` sebelum memakainya jika nanti seed berubah.

Selesai memakai stack:

```sh
pnpm run supabase:stop
```

Stop biasa mempertahankan data. Flag `--no-backup` pada CLI stop menghapus volume;
flag itu bukan bagian command stop repository.

### Edge lokal dan fixture owner

`functions.mcp` sudah enabled pada konfigurasi; tidak perlu menunggu fase baru
atau membuat entrypoint placeholder. Namun, start stack tidak otomatis menyediakan
owner fixture, resource URL, dan konfigurasi OAuth yang cocok untuk semua panggilan.

Untuk pengujian HTTP terintegrasi, gunakan harness lokal yang sudah ada setelah
preflight durasi pada [testing](testing.md). Harness membuat owner/credential
sintetis dan menggunakan loopback; jangan menggantinya dengan koneksi production.

Untuk debugging manual, periksa bantuan sebelum menentukan environment lokal:

```sh
pnpm exec supabase functions serve --help
```

CLI 2.120.0 melayani semua function lokal; argumen nama function adalah argumen
legacy, bukan isolasi hanya satu function. `--env-file` memasok environment yang
dipilih. `--no-verify-jwt` pada gateway tidak menonaktifkan validasi owner OAuth
di aplikasi. Jangan memilih `fixed-pilot` sebagai cara menghindari konfigurasi
atau pengujian auth.

## 4. Mengembangkan frontend autentikasi

Frontend tidak memiliki script `dev` atau dashboard produk. Source browser ada di
`auth-frontend/src/`; build menyalin aset ke `auth-frontend/dist/`.

```sh
pnpm run frontend:typecheck
pnpm run frontend:build
pnpm run frontend:test
```

Command di atas adalah pilihan pemeriksaan, bukan keharusan menjalankan semuanya
berulang kali jika sudah tercakup oleh `check`. Estimasikan durasi sebelum run.
Build tanpa konfigurasi publik diperbolehkan untuk pemeriksaan source; hasilnya
menampilkan pesan konfigurasi aman, bukan bukti login bekerja.

Preview browser memerlukan server statis dengan fallback route ke `index.html`.
Server statis umum belum tentu menerapkan rewrite/header dari `vercel.json`.
Periksa direct open/refresh `/login`, `/oauth/consent`, `/logout`, dan `/error`
pada host yang benar ketika memvalidasi routing. Pengujian Node tidak menggantikan
pemeriksaan browser terhadap route atau flow OAuth yang berubah.

## 5. Pola mengerjakan fitur atau perbaikan

1. **Tentukan perilaku yang berubah.** Catat tujuan, scope data, expected/actual,
   dan kontrak terkait. Untuk bug live, ikuti [Live Test & Fix](live-test/README.md)
   dan tautkan Issue yang sesuai.
2. **Periksa Git dan bukti awal.** Pertahankan pekerjaan pengguna, termasuk file
   untracked. Identifikasi source kandidat dan perubahan yang benar-benar
   dimaksudkan; jangan memperlakukan perubahan lokal lain sebagai sampah.
3. **Telusuri rantai implementasi.** Mulai dari handler/schema, lalu RPC/helper
   SQL dan test domain; untuk perubahan instruksi, mulai dari skill plugin.
4. **Selesaikan konflik kontrak dahulu.** Perubahan schema, nama/semantik tool,
   renderer, ontology, atau perilaku editorial membutuhkan keputusan perubahan
   yang terdokumentasi sebelum implementasi kontrak barunya.
5. **Buat perubahan fokus.** MCP menangani bentuk dan pemetaan; domain/transaksi
   berada pada core/niche SQL yang sesuai. Test menargetkan perilaku atau regresi,
   bukan sekadar mengulang baris implementasi.
6. **Pilih verifikasi sesuai risiko.** Gunakan [matriks pemeriksaan](testing.md),
   catat estimasi, jalankan pemeriksaan yang diperlukan, dan rekam hasilnya.
7. **Serahkan perubahan melalui alur GitHub.** Perbaikan memakai Issue, PR fokus,
   dan Actions. Commit/push/PR dijalankan sesuai instruksi pemilik; tidak otomatis
   berarti izin merge, deployment, atau mutasi production.

### Menambahkan migration

Project memakai migration SQL imperatif. Periksa bantuan dan buat file melalui
CLI yang dikunci, bukan dengan mengarang timestamp filename:

```sh
pnpm exec supabase migration new --help
pnpm exec supabase migration new deskripsi_perubahan
```

Edit file baru, pertahankan migration yang sudah dibagikan/diterapkan, lalu uji
urutan migration pada database lokal disposable. Perubahan tabel/RPC juga perlu
memperhatikan RLS, grant, helper, locks, CAS, idempotency, dan compatibility reader.
Perbarui audit katalog secara terarah bila baseline memang berubah; jangan
mengubah expected snapshot agar menutupi perubahan yang belum dijelaskan.

### Mengubah paket plugin

Instruksi plugin adalah perilaku yang dikirim ke host, berbeda dari dokumentasi
developer. Pertahankan kontrak dan istilah yang diuji oleh test paket.

```sh
pnpm run package-plugin
pnpm exec tsx scripts/verify-plugin-candidate.ts
```

Command pertama membangun ulang `artifacts/plugin-candidate/` dari source yang
diizinkan; kandidat lama pada lokasi itu diganti. Command kedua memeriksa isi dan
hash terhadap source serta filelist. Keduanya tidak membuat ZIP, menginstal plugin,
atau membuka izin write. Detail ada di [README plugin](../plugin/README.md).

## 6. Saat lingkungan lokal bermasalah

| Gejala                                           | Penelusuran awal                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Docker tidak dapat diakses                       | Periksa runtime dan izin socket lokal; jangan mengalihkan test ke hosted database                                         |
| Start pertama lambat                             | Periksa unduhan image dan tahap yang berjalan; untuk rangkaian CI tetap ikuti estimasi dan stop rule                      |
| SQL/history lokal tidak cocok                    | Bandingkan source dan history; reset hanya database disposable yang datanya boleh dihapus                                 |
| `deno` tidak ditemukan                           | Siapkan versi `.deno-version` sebelum `test:mcp`/harness; jangan menghapus test untuk mengatasi dependency yang belum ada |
| Frontend build berhasil tetapi login tidak jalan | Periksa konfigurasi publik, URL Auth, route, dan flow pada lingkungan yang benar                                          |
| Packaging gagal setelah dokumen dipindah         | Periksa pembaca `plans/tool-inventory.md`, DNA, schema generator, dan link dalam paket                                    |

Referensi CLI diperiksa melalui Context7 `/supabase/cli` dan bantuan versi lokal.
Dokumentasi upstream dapat lebih baru dari pin project; pada eksekusi berikutnya
tetap periksa `--help` untuk command yang belum dikenal.

## 7. Contoh penelusuran perubahan

Contoh berikut menunjukkan cara menemukan kontrak, kode, test, dan kategori gate.
Ini jalur perencanaan berdasarkan source yang tersedia, bukan implementasi fitur
baru atau izin menjalankan write. Setelah memilih perubahan, tetapkan scope serta
keputusan kontraknya sebelum mengedit.

### A. Menambah metadata pada get_post

1. Baca [kontrak tool](tool-contracts.md), lalu input `getInput` dan output
   `getOutput`/`postPackage` pada
   [post_base.ts](../supabase/functions/mcp/post_base.ts). Respons tertutup berarti
   field baru harus sesuai pada kedua sisi, bukan hanya ditambahkan ke SQL.
2. Telusuri `api.get_post` pada seluruh migration dan helper yang membangun
   projection-nya. Mulai dari peta SQL di [arsitektur](architecture.md), termasuk
   [CR-049](decisions/2026-10-22-cr-049-get-post-source-evidence-null-preservation.md)
   untuk nullable source evidence. Pertahankan pemisahan field publik dan privat;
   `generation_snapshot` bukan field yang dibuka read tersebut.
3. Tentukan regresi pada [post_base_test.ts](../supabase/functions/mcp/post_base_test.ts),
   [api-read-rpcs.test.ts](../supabase/tests/database/api-read-rpcs.test.ts), dan
   [api-source-evidence-mcp-compat.test.ts](../supabase/tests/database/api-source-evidence-mcp-compat.test.ts)
   yang relevan. Periksa owner denial, opsi include_sources/checks, ukuran hasil,
   dan pelestarian nested `null`.
4. Perubahan RPC dilakukan melalui migration baru dan mengikuti kategori business
   RPC: check/test fokus selama pengembangan, lalu satu full CR-020/044 gate pada
   kandidat final sebelum deploy. Estimasikan gate sebelum trigger; tidak perlu
   menguji write pada data production untuk memeriksa projection Read.

### B. Menambah format trivia

1. Mulai dari [DNA trivia](../plans/trivia-content-dna.md) dan
   [kontrak modul](../plans/module-contract.md), lalu tetapkan perubahan kontrak
   dan dampak versioning/compatibility-nya.
2. Periksa enum `allowed_formats` dan object `format_weights` pada
   [schemas.ts](../supabase/functions/mcp/schemas.ts), enum post input/output,
   validator/default config SQL, serta `internal.post_render_v1` dan quality
   helpers. Menambahkan nama di config saja belum membuat format diterima.
3. Perbarui instruksi/rubric niche dan fixture renderer yang relevan. Titik awal
   regresi adalah [plugin-trivia.test.ts](../tests/plugin-trivia.test.ts),
   [api-post-render-quality.test.ts](../supabase/tests/database/api-post-render-quality.test.ts),
   dan [post-render-v1.json](../supabase/tests/database/fixtures/post-render-v1.json).
4. Pastikan data lama tetap terbaca, makna fakta tetap terjaga, dan batas efektif
   sesuai config serta validator aktif. Perubahan aturan SQL/renderer membutuhkan
   gate backend; perubahan judul panduan tidak cukup untuk mengubah kontrak itu.

### C. Menambah niche selain trivia

1. Tetapkan scope produk dan ikuti [module contract](../plans/module-contract.md).
   Tentukan schema, versi, renderer, checks, sumber, persistence, dan apakah
   reusable library memang diperlukan. Niche baru tidak otomatis memakai facts
   atau reservasi trivia.
2. Baca [page_plan.ts](../supabase/functions/mcp/page_plan.ts): `pageInput` dan
   `configPatch` saat ini memakai `z.literal('trivia')` serta `triviaConfig`.
   Context output di [foundation.ts](../supabase/functions/mcp/foundation.ts)
   dan jalur save/revise juga memiliki kontrak khusus trivia. Registry SQL saja
   belum cukup; jalur schema/dispatch yang relevan harus mendukung niche baru.
3. Rancang perubahan dengan menjaga core owner/workspace/Page, lifecycle,
   idempotency, serta RLS. Gunakan peta schema/test pada arsitektur dan kontrak
   modul; tambah fixture khusus niche tanpa menafsirkan ulang data trivia lama.
4. Bila butuh tool baru, selesaikan perubahan inventory secara eksplisit.
   Jumlah 33 adalah baseline yang sedang berjalan, bukan alasan menambah generic
   executor. Migration/RPC/izin yang berubah memakai gate backend yang sesuai.

### D. Memperjelas tampilan hasil pada instruksi plugin

1. Untuk perubahan penyajian yang tidak mengubah aturan domain, mulai dari
   [SKILL.md](../plugin/skills/content-producer/SKILL.md) dan
   [output-contract.md](../plugin/skills/content-producer/references/core/output-contract.md).
   Pertahankan pemisahan copy publik/informasi internal dan klaim status yang
   berasal dari hasil server, bukan perkiraan.
2. Gunakan [plugin-skill.test.ts](../tests/plugin-skill.test.ts) dan
   [plugin-package.test.ts](../tests/plugin-package.test.ts), lalu build/verifikasi
   kandidat yang benar-benar dikirim. Perubahan aturan editorial tetap memerlukan
   rekonsiliasi kontrak walaupun hanya berada pada file Markdown.
3. Paket-only memakai focused/light CI dan validasi host yang terdampak; full
   backend gate dapat dirujuk hanya jika backend/dependency terkait tetap identik.
   Update plugin dan persetujuan suatu post tetap tindakan terpisah.
