# Panduan operasi production

Panduan ini menjelaskan cara memastikan identitas runtime, merilis perubahan,
memulihkan layanan, dan menelusuri masalah. Untuk pekerjaan lokal baca
[development](development.md); untuk pemilihan gate dan batas durasi baca
[testing](testing.md). Izin deployment dan perubahan data tetap mengikuti
[AGENTS.md](../AGENTS.md) serta keputusan pemilik untuk tindakan yang tepat.

**Tanggal peninjauan:** 27 Oktober 2026. Task dokumentasi ini tidak mengakses atau
mengubah production. Command di bawah adalah prosedur bersyarat, bukan bukti bahwa
command sudah dijalankan atau otorisasi untuk langsung mengeksekusinya.

## 1. Satu ringkasan versi, dengan sumber bukti yang jelas

Pemilik menyatakan project sudah digunakan di production. Source dan bukti lokal
yang tersedia perlu dibedakan dari pemeriksaan live terbaru:

| Komponen             | Yang dapat dirujuk sekarang                                                                                                                                      | Batas bukti                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Source yang ditinjau | Backend `main` SHA `be7ce5455863d3c51f4cfdd9ec6c9263e837ede3` setelah PR #52                                                                                     | Bukan exact SHA deployment yang baru diperiksa                                                     |
| Paket plugin         | Manifest kandidat source `0.2.7` setelah perubahan editorial/CR-051; pemilik sebelumnya mengonfirmasi plugin terpasang `0.2.6`. LT-016 v0.2.3 adalah riwayat.    | Kandidat belum diunggah/terpasang; release ID dan versi aktif saat ini belum diverifikasi langsung |
| Edge `mcp`           | CR-049 mencatat Edge tetap v33 saat rollout SQL 22 Oktober; v31/v32 adalah record lebih awal                                                                     | Versi aktif serta exact source/bundle SHA sekarang belum diverifikasi                              |
| Database             | Ada 71 migration source pada backend SHA di atas; CR-049 terakhir mencatat 70 migration production setelah rollout                                               | Applied production history dan drift sekarang belum diperiksa                                      |
| Gate historis CR-049 | Kandidat `1a4e755a48f3c77eb557b931fd6bd99d5e1b24fd`, [run 39768822314](https://github.com/milyarderpro/content-producer/actions/runs/39768822314)                | Record pada CR-049; jangan menempelkan exact-SHA PASS tersebut ke HEAD yang berbeda                |
| Gate CR-050          | Backend SHA `be7ce5455863d3c51f4cfdd9ec6c9263e837ede3`, [run 40364895835](https://github.com/milyarderpro/content-producer/actions/runs/40364895835) **SUCCESS** | Gate lokal terisolasi; bukan bukti deployment atau retest live                                     |
| Frontend             | Tracker merekam hosting production; source memakai `auth-frontend/`, build `dist/`, Git auto-deployment dimatikan                                                | Deployment aktif, environment, dan flag hosted sekarang belum diperiksa                            |
| Kampanye live        | Log lokal merekam 11 Read PASS; LT-E2E-01 masih BLOCKED pada record tersebut                                                                                     | Status Issue atau hasil setelah log itu belum diperiksa                                            |

Sumber: [log live](live-test/results.md),
[CR-049](decisions/2026-10-22-cr-049-get-post-source-evidence-null-preservation.md),
[CR-050](decisions/2026-10-26-cr-050-trivia-source-error-diagnostics.md),
[tracker historis](../archive/plans/implementation-plan.md#16-phase-tracker), dan
[audit cleanup](cleanup-audit.md). Perbarui tabel ini hanya dengan bukti yang dapat
ditelusuri; cantumkan kapan diperiksa, bukan sekadar menaikkan nomor versi.

### Format catatan runtime/rilis

Catat di Issue/PR operasional yang sesuai, tanpa credential:

```text
Waktu pemeriksaan dan operator:
Target Supabase/project ref serta frontend yang dikonfirmasi:
Backend source SHA dan bundle/deployment yang terbukti:
Migration source vs applied history, drift, dan hasil audit:
Plugin source SHA/version, archive hash, release ID dan app binding:
Frontend source SHA/deployment ID dan konfigurasi publik yang ditinjau:
Gate/check: SHA, URL run, status selesai, dan scope:
Backup/recovery point serta versi rollback yang tersedia:
Izin tindakan dan scope perubahan:
Verifikasi setelah perubahan dan batas bukti:
```

## 2. Verifikasi runtime sebelum mengambil tindakan

1. Pastikan akses owner, identitas project production yang sudah ada, domain
   frontend, serta lingkungan yang dituju. Jangan memilih project dari nama
   folder lokal; project `triviaku` yang dikecualikan bukan target pengganti.
2. Baca metadata deployment provider, bundle/source yang tersedia, versi plugin,
   dan history migration melalui akses yang berhak. Jika hanya sebagian data
   terlihat, tulis bagian yang belum dapat dibuktikan.
3. Cocokkan resource URL MCP, issuer Auth, owner, app binding, dan configuration
   security. Jangan menyalin token/key atau nilai secret ke hasil pemeriksaan.
4. Jika pemeriksaan hosted diizinkan, bedakan health/metadata/discovery dari
   bisnis Read. `get_account_profile({})`, `get_workspace_context({})`, dan
   `list_pages` dipakai untuk memeriksa owner/workspace sesuai workflow live.
5. Jika source dan runtime berbeda atau history tidak dikenal, hentikan rencana
   perubahan itu dan telusuri perbedaannya. Jangan memakai reset, `migration repair`,
   atau SQL ad-hoc untuk membuat history tampak cocok.

Health tidak membuktikan login atau write berhasil. Schema yang dilihat ChatGPT
bisa merupakan snapshot lama; periksa metadata pada chat baru setelah refresh
koneksi yang sama bila diperlukan. Referensi LT-016 merekam masalah ini tanpa
perlu membuat plugin atau koneksi kedua.

## 3. Menyiapkan rilis sesuai risiko

- Mulai dari Issue dan PR fokus. Tentukan komponen mana yang dirilis: migration,
  Edge, frontend, atau paket plugin; jangan merilis komponen lain karena kebetulan
  berada dalam repository yang sama.
- Tetapkan candidate SHA dan scope, periksa Git diff, serta estimasikan seluruh
  CI sebelum push/PR/dispatch. Ikuti stop rule jika gate wajib lebih dari 10 menit.
- Perubahan migration/RLS/grant/identity/owner/write permission/business RPC
  memerlukan full CR-020 gate pada kandidat final sebelum deployment. Urutan
  focused OAuth/owner dan Inspector mengikuti CR-044.
- Dokumentasi dan paket-only memakai light/focused checks. Reuse gate backend
  hanya jika source terpasang, migration, konfigurasi security, dan dependency
  runtime yang relevan tetap identik; catat backend SHA dan SHA paket/dokumen
  secara terpisah.
- Periksa kompatibilitas antara schema database dan versi Edge/frontend/plugin
  yang masih aktif. Tetapkan urutan rilis dan target rollback yang benar-benar
  kompatibel, bukan sekadar versi yang lebih lama.

CI passing, merge PR, dan izin deployment adalah hal berbeda. Deployment juga
tidak memberi izin menjalankan operasi bisnis production sebagai smoke test.

## 4. Migration dan Edge Function

Bagian ini dijalankan hanya sesudah target, gate, backup yang diperlukan, serta
otorisasi operator/pemilik terpenuhi. Baca `--help` versi yang dipin sebelum
command yang belum dikenal. Login/link/secret dilakukan melalui mekanisme aman;
password, token, dan connection string tidak dimasukkan ke command contoh.

### Migration pada project terkonfirmasi

`SUPABASE_PROJECT_REF` pada contoh adalah ref publik target yang **sudah
dikonfirmasi**, diberikan sebagai environment proses. `--linked` bukan bukti
bahwa checkout terhubung ke target yang benar.

```sh
pnpm exec supabase migration list --help
pnpm exec supabase db push --help
```

Setelah memastikan ref tidak kosong dan target benar:

```sh
pnpm exec supabase migration list --linked --project-ref "$SUPABASE_PROJECT_REF"
pnpm exec supabase db push --linked --project-ref "$SUPABASE_PROJECT_REF" --skip-vault --dry-run
```

Tinjau daftar migration yang akan diterapkan, urutan, serta kesesuaiannya dengan
source/gate. `--skip-vault` membatasi alur ini agar tidak menyinkronkan Vault dari
config; perubahan Vault, roles, atau seed bukan bagian implisit rilis migration.
Dry-run bukan bukti backup, keamanan, maupun keberhasilan apply.

Hanya setelah hasil tersebut sesuai dan izin apply tersedia:

```sh
pnpm exec supabase db push --linked --project-ref "$SUPABASE_PROJECT_REF" --skip-vault
```

Baca ulang history dan audit hosted yang relevan setelah apply. Pertahankan file
migration lama dan jalankan perubahan dari source yang sudah diuji. Fixture/seed
test tidak diikutkan ke production. Jika ada history asing atau apply parsial,
telusuri dahulu dan gunakan perbaikan yang direview, bukan reset production.

### Edge dari source kandidat yang sudah lolos

```sh
pnpm exec supabase functions deploy --help
```

Sesudah izin deployment function dan kompatibilitas database dikonfirmasi:

```sh
pnpm exec supabase functions deploy mcp --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
```

Nama `mcp` ditulis eksplisit agar deployment tidak mencakup semua function.
Flag gateway tersebut mempertahankan discovery/challenge aplikasi; middleware
tetap memvalidasi owner OAuth. Jangan menambahkan `--prune`, mengganti mode auth,
atau mengaktifkan grant pilot sebagai bagian tak tercatat dari deploy.

Verifikasi versi/source bundle provider dan configuration, health/discovery,
penolakan akses tanpa izin, serta owner Read yang diotorisasi. Catat hasilnya
terpisah. Migration-only tidak otomatis membutuhkan redeploy Edge bila dependency
dan kontrak yang berlaku memang tidak berubah, seperti rollout CR-049.

## 5. Frontend dan paket plugin

### Frontend autentikasi

Konfigurasi source hosting memakai root `auth-frontend/`, build `pnpm run build`,
dan output `dist/`. `git.deploymentEnabled=false` pada `vercel.json` berarti push
Git tidak boleh dianggap otomatis memperbarui frontend. Verifikasi setting
provider aktual dan deploy hanya dengan otorisasi yang sesuai.

Build memasukkan dua variabel publik: `VITE_SUPABASE_URL` dan
`VITE_SUPABASE_PUBLISHABLE_KEY`. Verifikasi rewrite/header, direct refresh route,
login, consent approve/deny, logout, redirect yang dibatasi, dan pesan error aman
pada browser. Izin menguji login tidak mencakup business Write.

Route `/phase-9-5` dan callback/pilot memiliki flag server-side tersendiri.
Status OFF dalam catatan lama bukan bukti setting sekarang. Jangan mengaktifkan
`PHASE95_ENABLED`/`PHASE95_WRITE_ENABLED` sebagai jalan pintas pengujian biasa.

### Plugin PRIVATE

Periksa kandidat/filelist/hash terhadap source, lalu ZIP yang benar-benar akan
diunggah, manifest version, dan daftar 13 file yang diizinkan. CI mengambil nama
ZIP/artefak dari versi manifest. Nama file saja tetap bukan bukti versi terpasang
atau kesamaan byte; gunakan manifest dan hash nyata dari kandidat yang diperiksa.

Update plugin PRIVATE yang sudah ada, dengan satu app owner OAuth `mcpku2`.
Pertahankan `.app.json`; paket sekarang tidak menyertakan `mcp.json`/`.mcp.json`
atau credential OAuth. Generator No-auth lama hanya referensi/regresi, bukan
koneksi kedua atau jalur operasi production normal.

Catat archive hash/release ID, baca ulang versi/binding yang terpasang, refresh
metadata koneksi jika schema berubah, lalu verifikasi pada chat baru dengan plugin
yang benar. Instalasi sukses belum membuktikan setiap tool atau business Write
berhasil; pilih retest yang benar-benar terdampak.

## 6. Backup dan pemulihan

Catat kemampuan backup/PITR yang benar-benar tersedia, recovery point terbaru,
operator berwenang, target pemulihan, dan batas kehilangan data/waktu yang diterima
pemilik. Jika backup terkelola tidak mencukupi, tentukan ekspor konsisten yang
aman di luar repository dan buktikan dapat dipulihkan pada lingkungan terisolasi
sesuai risiko sebelum perubahan data berisiko.

Backup database tidak otomatis mencakup seluruh Auth configuration, file Storage,
Edge deployment, secret, frontend, atau paket plugin. Catat cakupan, checksum,
retention, serta prosedur pengembaliannya. Jangan mencatat restore rehearsal
sebagai PASS jika hanya memiliki file dump.

| Komponen             | Pendekatan pemulihan                                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Edge/frontend        | Kembalikan deployment/source yang sudah diverifikasi dan kompatibel dengan schema sekarang; periksa ulang akses dan fungsi terdampak           |
| Database             | Utamakan forward-fix yang direview; restore hanya berdasarkan backup/recovery point yang sah dan keputusan pemilik atas dampak kehilangan data |
| Plugin               | Kembalikan release/paket yang dikenal dan cocok dengan backend, lalu periksa binding/schema pada host                                          |
| Auth/security config | Pulihkan nilai melalui pengelola konfigurasi yang berhak, dengan bukti setting dan penolakan akses yang sesuai                                 |

Jangan membatalkan migration dengan SQL destruktif atau `db reset --linked` sebagai
rollback rutin. Mengembalikan source saja belum membuktikan state pulih. Catat
verifikasi setelah recovery dan hal yang masih belum berfungsi.

## 7. Menelusuri masalah tanpa menebak akar sebab

| Gejala                          | Bukti awal yang diperiksa                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Host tidak melihat schema baru  | Versi/binding plugin, katalog backend, refresh koneksi yang sama, dan signature pada chat baru                                  |
| HTTP 200 tetapi tool gagal      | `isError`, `structuredContent.error`, urutan pemanggilan, serta lapisan MCP/RPC                                                 |
| `DATABASE_UNAVAILABLE`          | Respons terlalu besar/tidak cocok schema, jaringan/RPC, dan reproduksi fixture; bukan otomatis database mati                    |
| `OWNER_ACCESS_REQUIRED`         | Owner tervalidasi, workspace aktif, resource/audience, dan context tool call; jangan membuka akses untuk menghilangkan error    |
| Draft dikatakan gagal tersimpan | Tool terakhir yang sungguh terpanggil, payload/error yang disanitasi, dan state readback; dedup Read bisa berhenti sebelum save |
| CAS atau operation key conflict | State terkini dan maksud operasi asli; jangan membuat key/versi pengganti diam-diam                                             |
| Metrik kosong atau ditolak      | Status publikasi, periode, sumber/definisi, dan data yang memang tersedia                                                       |

Log aplikasi sengaja dibatasi; jangan menyalakan pencatatan raw token, request body,
SQL, atau sumber privat untuk diagnosis cepat. Gunakan bukti yang disanitasi dan
reproduksi terisolasi. Jika memakai log/provider API untuk diagnosis Supabase,
periksa dokumentasi resminya dan akses yang sesuai sebelum menggunakannya.

## 8. Status dan batas bukti historis

Phase 10 tetap `Complete — Pilot-ready`; Phase 11 diparkir dan final AC-001..014
tetap PENDING menurut record historis. Status pemakaian production sekarang tidak
mengubahnya menjadi PASS. MAN-01..09 dan `procedure-v1` tetap dipertahankan;
MAN-10..11 adalah validasi opsional pasca-MVP menurut CR-027.

CR-048 menerima trace owner OAuth langsung MAN-03/04 bersama bukti binding/read
plugin yang sudah ada. Trace baru ChatGPT dengan parent-plugin terpilih untuk
write spesifik itu tidak direkam. MAN-05/06 membuktikan plan tiga slot, bukan
ambang tujuh post/tujuh hari AC-007/008. Rincian ada di
[acceptance evidence](../archive/docs/phase-10/acceptance-evidence.md) dan
[manual results](../archive/docs/phase-10/manual-results.md).

Percobaan lama Issue #26 terhenti pada `trivia_find_similar_facts`; reserve/save
tidak dipanggil menurut trace ringkas yang tersedia. Payload asli belum lengkap,
jadi kesamaan akar sebab dengan LT-016 tidak dianggap terbukti. Retest LT-016
sudah PASS menurut log lokal; E2E draft baru masih BLOCKED pada record tersebut.
Jangan mengulang write lama untuk mengisi celah bukti tanpa scope baru yang tepat.

Pengujian/remediasi baru mengikuti [Live Test & Fix](live-test/README.md),
[matriks](live-test/test-matrix.md), dan [log](live-test/results.md), bukan memulai
ulang checkpoint. Source/CLI telah ditinjau pada task dokumentasi. Task 6 juga
memeriksa akses/proteksi GitHub dan riwayat CI; runtime live, backup capability,
serta setting hosted tetap belum dibaca ulang pada cleanup ini dan perlu
diperiksa dalam pekerjaan operasional yang benar-benar diotorisasi.

## 9. Usulan cutover gate rilis G4 dan rollback (Issue #104)

**BELUM EFEKTIF:** CR-052 **PROPOSED — NOT EFFECTIVE**; tidak ada
perubahan required checks, deployment, production data, ataupun
business Write. Dua run kandidat pada
`a64a55ebb1e3c76112cd211724c2eb6bc256699a` telah PASS:
[#41072354433](https://github.com/milyarderpro/content-producer/actions/runs/41072354433)
(9m41s) dan
[#41074001136](https://github.com/milyarderpro/content-producer/actions/runs/41074001136)
(9m43s). **Run ketiga dan bukti lokal PENDING**, bukan PASS;
overlay lokal `DIAGNOSTIC_CONFIG_OVERLAY` bukan formal exact-config.
Orchestrator wajib meninjau laporan, advisor lokal, kesetaraan
source/backend, dan kriteria CR sebelum langkah berikutnya.

**Prosedur sesudah keputusan tertulis (jangan jalankan sekarang):**

1. Catat SHA `main` final, klasifikasi diff, pin/manifest/lock/config,
   serta bukti local + tiga run GitHub. Jika config overlay dipakai
   lokal, tandai diagnostik dan minta keputusan kontrak eksplisit.
2. Setelah izin cutover terpisah, dispatch manual
   [`backend-gate-candidate.yml`](../.github/workflows/backend-gate-candidate.yml)
   dari `main` dengan `candidate_sha` 40 hex yang sama dengan
   `github.sha` dan checkout. Runner harus ephemeral, unlinked,
   config committed exact di Actions; jangan menjalankan mode ini
   di PC lokal yang mempunyai stack Supabase aktif.
3. Verifikasi PASS job source/frontend dan dua DB shard 19+22,
   MCP 15 file/82 kasus, Inspector 33 valid/33 invalid plus owner
   denial, total DB **41 file/182 kasus tanpa skip**, 72 migration
   source/history, DB lint, **local security advisors terpisah**
   pada dua shard, audit catalog RLS/grant/default ACL/fixture
   pre/post/final, cleanup, hash identitas, dan aggregate PASS.
   Simpan artifact aman `candidate-source-<sha>` dan
   `candidate-db-shard-1/2-<sha>`; jangan unggah raw credentials.
4. Review contexts aktual/branch protection dan minta izin
   tersendiri sebelum required check/entrypoint diaktifkan.
   Workflow saat ini hanya manual `workflow_dispatch`, jadi PASS
   tidak otomatis menjadi required check pada PR.

**Rollback CI:** pertahankan
[`backend-technical-gate.yml`](../.github/workflows/backend-technical-gate.yml)
dan `pnpm run test-all` tanpa perubahan. Jika kesetaraan gagal,
**blok rilis** dan melalui keputusan/PR terpisah pulihkan required
check/entrypoint legacy; dispatch full legacy pada exact SHA
final yang disetujui, konfirmasi bukti PASS, dokumentasikan alasan
dan perbaiki kandidat. Jangan mengubah migration/production
sebagai rollback workflow. Rujuk [CR-052](decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md)
untuk audit same-SHA dan syarat penerimaan.
