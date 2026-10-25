# Phase 7 — Plugin skill dan package source: rencana implementasi

Status: rencana eksekusi; Phase 7 belum dimulai. Baseline adalah `main` setelah
merge Phase 6 pada `65bd6341427dbdf63f175fbb63dcf73c197b2aa9`. Catat SHA
`main` yang aktual saat checkpoint 7.0 dimulai. Rencana ini membagi Phase 7
menjadi checkpoint 7.0–7.4; pembagian kerja ini tidak mengubah kontrak frozen.

## 1. Tujuan dan sumber kebenaran

Phase 7 menghasilkan skill Content Producer, portable plugin source, validator,
dan kandidat paket lokal. Package final yang terhubung ke remote MCP dibuat
setelah koneksi production terbukti pada Phase 10. Phase 7 tidak membuat URL
MCP production, registered connection ID, atau `plugin/mcp.json` final dengan
nilai sementara.

Baca `AGENTS.md` dan sumber berikut sebelum mengubah perilaku:

1. `plans/PRD.md` dan `plans/implementation-plan.md` §7 — scope, boundary,
   deliverable, dan verification gate.
2. `plans/workflow-users.md` dan `plans/use-case-inventory.md` — urutan kerja,
   klarifikasi, pemulihan, dan batas tindakan.
3. `plans/tool-inventory.md` — nama dan kontrak tepat 33 tool. Skill tidak
   menciptakan tool, parameter, atau otorisasi baru.
4. `plans/module-contract.md` dan `plans/trivia-content-dna.md` — pemisahan
   core/niche serta aturan editorial trivia.
5. `plans/database-design.md`, `plans/phase-0-decision-register.md`, dan
   accepted change records — fakta, reservasi, lifecycle, security, dan
   keputusan platform yang telah dibekukan.
6. Implementasi MCP Phase 6 pada `supabase/functions/mcp/` — bentuk tool
   aktual yang harus cocok dengan inventory, bukan pengganti kontrak frozen.

Dekat waktu implementasi, cocokkan format portable `plugin.json`, `mcp.json`,
dan `SKILL.md` dengan dokumentasi resmi OpenAI/Agent Plugins saat itu.
`mcp.json` adalah konfigurasi server MCP portabel; registered connection
mapping ChatGPT adalah artefak berbeda. Jika format host dan kontrak frozen
berbenturan, catat change record sebelum mengubah kontrak atau perilaku.
GitHub Issue hanya pelacak progres, bukan sumber kontrak.

## 2. Alur kerja dan batas fase

- Satu task/chat implementer menangani tepat satu checkpoint secara berurutan.
  Gunakan satu branch `codex/phase-7-plugin`, satu draft PR ke `main`, dan satu
  GitHub Issue Phase 7. Jangan menulis langsung ke `main`.
- Setiap task dimulai dari HEAD branch yang sudah selesai sebelumnya. Catat
  baseline dan head SHA, file berubah, hasil tes aktual, tautan CI, risiko,
  serta pekerjaan tertunda pada Issue dan PR. Commit pada branch Phase 7
  setelah checkpoint terverifikasi; checkpoint berikutnya mulai dari commit
  tersebut. Centang checkpoint hanya jika buktinya tersedia. CI merah
  menghentikan checkpoint berikutnya.
- Jika GitHub Actions lama, catat SHA, tautan run, dan status `PENDING`, lalu
  berhenti. Saat pengguna menulis "lanjutkan" pada chat yang sama, periksa
  hasil run tersebut sebelum mengambil langkah berikutnya.
- Satu audit independen dilakukan setelah 7.4 dan gate akhir. Implementer
  tidak mengesahkan audit sendiri. Temuan diperbaiki pada branch/PR yang sama,
  lalu perubahan dan bukti barunya diaudit ulang sebelum merge.
- Ubah tracker §16 menjadi `In progress` saat 7.0 dimulai dan `Complete` hanya
  setelah gate akhir dan audit independen lulus. Mulai Phase 8 dari `main`
  setelah PR Phase 7 di-merge.

Dalam Phase 7, skill adalah lapisan workflow. MCP/Phase 5 tetap berwenang atas
autentikasi, owner scope, validasi, state, transaksi, rate limit, dan error.
Skill tidak mengakses database langsung, tidak menganggap response tool
sebagai otorisasi, dan tidak menyalin source tak tepercaya sebagai instruksi.
Tidak ada perubahan RPC, migration, tool surface, deploy, instalasi ChatGPT,
Supabase remote, atau secret produksi dalam scope ini. Jika pekerjaan tersebut
ternyata diperlukan, hentikan checkpoint dan rekonsiliasi kontrak dahulu.

## 3. Strategi CI yang hemat

- Pada 7.0, siapkan workflow GitHub Actions untuk branch Phase 7 dengan
  dependency project yang dipin dan izin baca repository. Jalankan pemeriksaan
  ringan dahulu. Workflow Phase 6 hanya memantau branch Phase 6 dan tidak
  menjadi bukti otomatis bagi branch baru.
- Pada 7.1–7.3, jalankan tes unit/kontrak paket atau skill yang terfokus
  satu kali setelah perubahan terkait siap diperiksa; ulangi hanya bila ada
  kegagalan atau perubahan yang menyentuh hasil tes tersebut.
  Jalankan `pnpm run check` setelah perubahan TypeScript atau konfigurasi.
  Jangan menyalakan Supabase lokal atau mengulang seluruh suite database hanya
  untuk perubahan manifest dan Markdown.
- Hubungkan tes paket yang relevan ke `pnpm run test`, sehingga dipanggil oleh
  `pnpm run check` dan `pnpm run test-all`. `pnpm run package-plugin` tetap
  memvalidasi dan membangun kandidat paket secara eksplisit.
- Pada 7.4, jalankan satu gate akhir berurutan di runner GitHub: install dari
  lockfile, Supabase lokal dan clean migration reset, `pnpm run test-all`,
  `pnpm run package-plugin`, pemeriksaan isi kandidat paket, dan
  `git diff --check`. `test-all` sudah memanggil `check`, verifikasi nama
  migration, tes MCP, dan tes database; jangan menghitung eksekusi yang sama
  sebagai bukti independen atau mengulang `smoke-test` tanpa risiko konkret.
  Jalankan `check` terpisah pada checkpoint hanya bila diwajibkan oleh perubahan
  TypeScript/konfigurasi; jangan tambahkan lagi pada gate akhir.
- Simpan command, exit code, jumlah tes, SHA, dan tautan run dalam laporan
  checkpoint. Gate pada SHA lama tidak membuktikan perubahan kode setelahnya;
  uji ulang sesuai dampak. Jangan menjalankan gate penuh berulang pada SHA
  yang sama tanpa kegagalan atau risiko yang jelas.

## 4. Checkpoint 7.0 — Persiapan dan baseline CI

**Scope:** rencana kerja, tracker, dan jalur verifikasi; belum membuat skill.

1. Pastikan `main` memuat merge Phase 6 dan working tree/branch awal bersih.
2. Buat GitHub Issue Phase 7 dari checkpoint pada rencana ini, branch Phase 7,
   dan satu draft PR. Catat SHA baseline; jangan mengarang nomor PR sebelum
   GitHub mengembalikannya.
3. Ubah tracker Phase 7 menjadi `In progress`. Sinkronkan `plugin/README.md`
   yang masih menyebut `mcp.json` akan dibuat pada Phase 7: yang disiapkan
   sekarang adalah schema/generator, sedangkan file final menunggu Phase 10.
4. Siapkan CI ringan pada branch baru: pinned install, `pnpm run check`, dan
   pemeriksaan diff. Pastikan log dan status run dapat dibaca di PR/Issue.

**Selesai bila:** issue, branch, draft PR, baseline SHA, dan CI ringan tersedia;
tracker/README tidak ambigu. Berhenti sebelum membuat manifest atau skill.

## 5. Checkpoint 7.1 — Portable manifest dan MCP config generator

**Scope:** struktur paket dan identitas; belum membuat koneksi MCP final.

1. Buat `plugin/plugin.json` sebagai portable root manifest dengan `$schema`,
   identity, version, description, dan presentation metadata yang benar.
   Metadata OpenAI, bila dipakai, berada di `extensions.com.openai` sesuai
   schema yang berlaku. Field/path opsional hanya menunjuk file yang
   benar-benar ada dan tetap di dalam root plugin; jangan menunjuk MCP config
   atau mapping yang ditunda.
2. Siapkan schema/validator/generator untuk `plugin/mcp.json` dengan format
   portabel: server bernama, transport `streamable-http`, URL HTTPS, dan
   konfigurasi OAuth yang sesuai kontrak tanpa credential. Parameter generator
   adalah data koneksi yang kelak terverifikasi; jangan mensyaratkan registered
   connection ID dalam `mcp.json` karena ID itu milik mapping ChatGPT yang
   berbeda. Jangan tulis file final atau nilai rekaan dalam source package.
   Fixture sintetis hanya hidup di test/temporary output dan bukan endpoint
   production. Jangan memilih mode registrasi OAuth atau client ID production
   sebelum konfigurasi koneksi terverifikasi pada fase berikutnya.
3. Jangan membuat compatibility manifest atau registered MCP mapping pada
   Phase 7. Jika uji host di fase berikutnya membuktikan kebutuhan format
   kompatibilitas, dokumentasikan bukti lalu tambahkan pada fase tersebut.
4. Uji manifest valid/invalid, path traversal, input kosong, URL/OAuth yang
   tidak valid, dan ketiadaan secret serta placeholder koneksi di paket.

**Selesai bila:** manifest dan generator tervalidasi melalui tes terfokus;
`plugin/mcp.json` final dan registered connection ID belum ada. Berhenti
sebelum menulis workflow skill.

## 6. Checkpoint 7.2 — Skill dan referensi core

**Scope:** workflow umum yang dapat dipakai niche lain tanpa menanam aturan
trivia dalam core.

1. Buat `plugin/skills/content-producer/SKILL.md` dengan `name` dan
   `description` pada metadata, kriteria aktivasi yang cocok dengan user goals,
   serta petunjuk kapan membaca referensi. Jaga instruksi utama ringkas;
   detail berada di file referensi. Jangan tulis dependency MCP dalam
   `agents/openai.yaml` dengan URL rekaan; konfigurasi dependency host yang
   perlu endpoint nyata menunggu Phase 10.
2. Buat `references/core/` untuk workflow, lifecycle, tool sequence, source
   policy, dan output contract sesuai rencana fase.
3. Jelaskan pemilihan Page/niche, context, klarifikasi pilihan ambigu,
   penelitian ChatGPT, dedup/reserve, compose/evaluate/save, revisi,
   approval/discard, publikasi manual, dan pencatatan performa. Untuk batch,
   jelaskan claim kecil, penyimpanan progres, resume, retry, dan cancel.
4. Pertahankan operation key saat retry logical operation; minta persetujuan
   eksplisit untuk approval, discard, posting, archive, cancel, replace, atau
   fact correction sesuai tool contract; tangani stale revision, conflict,
   lost response, dan non-owner tanpa menebak state. Jangan meminta token,
   service key, database password, atau secret dari pengguna.
5. Bedakan CANVA COPY, FACEBOOK CAPTION, HASHTAGS, dan informasi internal.
   Jangan mengklaim draft telah disimpan sebelum tool save berhasil, dan
   jangan mengklaim Facebook telah diunggah oleh sistem.

**Selesai bila:** parser lokal memuat metadata skill, semua referensi core ada
dan tertaut, urutan tool cocok dengan inventory, dan skenario terfokus untuk
klarifikasi, retry, lifecycle, serta batas manual lulus. Jangan mengklaim
skill+MCP telah berjalan pada ChatGPT; bukti itu menunggu Phase 10. Berhenti
sebelum menulis referensi trivia.

## 7. Checkpoint 7.3 — Referensi niche trivia

**Scope:** aturan editorial trivia; tidak mengubah modul backend.

1. Buat `references/niches/trivia/` untuk content DNA, formats, fact checking,
   dedup ontology, dan quality rubric. Ringkas aturan dari
   `plans/trivia-content-dna.md`; hindari salinan panjang yang mudah divergen.
2. Pertahankan lima format, dua length profile, tone `en-US` yang mudah
   dipahami audiens global, source tiers, freshness, qualifier, kebijakan
   topik sensitif, anti-copying, dan batas density/renderer yang berlaku.
3. Tegaskan perbedaan judgment editorial ChatGPT, check deterministik server,
   dan approval owner. Dataset referensi hanya contoh pola, bukan sumber
   kebenaran fakta atau teks untuk disalin.
4. Uji contoh dan anti-contoh representatif untuk sumber lemah, fakta stale,
   duplicate vs anti-duplicate, klaim sensitif, hook/CTA, serta lima format.
   Kegagalan harus mengarahkan revisi atau penolakan yang aman.

**Selesai bila:** lima referensi trivia tersedia, tautan dari skill benar,
aturan core dan niche konsisten dengan dokumen frozen, dan tes terfokus lulus.
Berhenti sebelum gate paket akhir.

## 8. Checkpoint 7.4 — Validasi, kandidat paket, dan gate akhir

1. Perluas `scripts/package-plugin.ts`, yang pada baseline baru memeriksa
   empat string manifest dan menerima manifest yang belum ada. Pada Phase 7,
   file wajib yang hilang atau rusak harus gagal secara jelas.
2. Validasi schema manifest dan generator, skill metadata/instructions,
   semua reference link, konsistensi urutan tool dan aturan core/trivia.
   Periksa path traversal dan symlink keluar dari root plugin.
3. Buat kandidat paket lokal yang hanya memuat file yang diizinkan. Periksa
   daftar isi kandidat yang benar-benar dihasilkan, bukan hanya source tree:
   tidak ada secret, token, test database, data production, dataset mentah,
   placeholder endpoint, `mcp.json` final, atau registered mapping rekaan.
   Simpan daftar file dan hash sebagai bukti CI; jangan unggah kandidat paket,
   install, publish, atau deploy.
4. Jalankan gate akhir §3 pada SHA final implementasi. Simpan hasil aktual,
   artifact candidate lokal yang diabaikan Git, dan laporan singkat. Jika
   Actions masih berjalan, status tetap `PENDING` sampai hasilnya diperiksa.

**Selesai bila:** semua acceptance source/package Phase 7 terbukti pada SHA
yang sama; kandidat paket dihasilkan dan diperiksa pada runner/lokal, tetapi
belum diklaim sebagai plugin production yang terhubung atau telah diuji host.
Berhenti untuk audit independen.

## 9. Audit, penutupan, dan pekerjaan tertunda

Auditor pada task terpisah membandingkan branch/PR dengan baseline Phase 6,
membaca kontrak frozen serta evidence CI, memeriksa paket dan instruksi, dan
melaporkan temuan dengan file/baris serta dampak. Audit menilai seluruh
checkpoint 7.0–7.4 sekali di akhir. Jika ada temuan, remediasi dilakukan pada
branch yang sama lalu auditor memeriksa delta dan gate yang sesuai SHA baru.

Setelah gate dan audit lulus, perbarui Issue/PR serta tracker menjadi
`Complete`, verifikasi perubahan penutupan sesuai dampaknya, lalu merge PR.
Phase 8 dimulai dari `main` terbaru pada task terpisah.

Yang tetap tertunda: evaluasi 101 frozen prompts, full workflow/content
evaluation, dan user editorial sign-off adalah Phase 8; deploy serta OAuth
hosted adalah Phase 9; koneksi ChatGPT nyata, `plugin/mcp.json` final,
dependency skill yang membutuhkan endpoint nyata, registered mapping yang
terverifikasi, instalasi plugin pribadi, dan pilot adalah Phase 10. Jangan
menandai bukti tersebut PASS pada Phase 7.

## 10. Handoff wajib setiap task

Tinggalkan ringkasan yang dapat dipakai task berikutnya:

1. Checkpoint, baseline/head SHA, branch, Issue, dan draft PR.
2. File yang berubah dan kaitannya dengan kontrak frozen.
3. Command, exit code, jumlah tes, tautan CI, dan status `PASS`/`PENDING`.
4. Hasil validasi paket/skill dan item yang sengaja belum final.
5. Risiko, temuan, atau bukti deferred serta langkah tepat berikutnya.
6. Pernyataan bahwa checkpoint berikutnya dan Phase 8+ belum dimulai.
