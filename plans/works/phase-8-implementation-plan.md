# Phase 8 — Full verification suite: rencana implementasi

Status: rencana eksekusi; Phase 8 belum dimulai. CR-018 sudah Accepted dan
menetapkan lingkungan serta gate pre-production. Baseline yang telah di-merge
adalah `main` `69b3ad06346e084cd2242dd0e9ccfdf6192953f5` (Phase 7). Catat
ulang SHA `main` saat 8.0 dimulai. Pembagian checkpoint di sini mengatur cara
kerja, bukan mengurangi acceptance criteria frozen.

## 1. Tujuan dan sumber kebenaran

Phase 8 membuktikan porsi acceptance pre-production sebelum production
disentuh menurut CR-018. Tiga jalur
bukti wajib berbeda: deterministic, prompt/workflow, dan content/editorial.
Satu jalur tidak boleh menggantikan jalur lain.

Baca `AGENTS.md` dan sumber ini sebelum bekerja:

1. `plans/PRD.md` §31–32 dan `plans/implementation-plan.md` Phase 8 untuk
   acceptance, scope, dan verification gate.
2. `plans/acceptance-traceability.md` untuk requirement, acceptance criteria,
   evidence ID, dan tiga laporan wajib.
3. `plans/use-case-inventory.md` untuk 31 user goals, 101 frozen prompt cases,
   scoring, repetition, fixture, dan environment gates E1–E5.
4. `plans/tool-inventory.md`, `plans/workflow-users.md`, dan
   `plans/trivia-content-dna.md` untuk tepat 33 tools, workflow, dan rubrik
   editorial. `plans/database-design.md` dan accepted change records tetap
   mengatur data, security, locking, dan lifecycle.
5. Implementasi dan tes Phase 5–7 untuk membedakan bukti yang sudah ada dari
   bukti Phase 8 yang masih perlu dijalankan.

Frozen prompt text, expected behavior, threshold, dan hard-fail definitions
tidak diubah untuk membuat evaluasi lulus. Defect diperbaiki pada lapisan
pemiliknya; perubahan kontrak membutuhkan change record sebelum diterapkan.
GitHub Issue hanya tracker, bukan pengganti kontrak.

## 2. Keputusan lingkungan dan batas bukti

CR-018 telah merekonsiliasi urutan gate Phase 8–10:

- E1/E2 berjalan pada GitHub-hosted runner dengan Supabase lokal sementara.
- E3 memakai custom MCP di staging terisolasi, dengan owner, OAuth, data,
  fixture, dan autentikasi uji yang terpisah dari production.
- E4 memakai private **test** plugin dari source skill Phase 7 yang terhubung
  hanya ke staging. Ini membuktikan aktivasi skill dan workflow ChatGPT untuk
  101 frozen prompts; custom MCP E3 saja belum membuktikan keduanya.
- E5, URL/koneksi production, OAuth/frontend production, dan paket plugin
  final tetap diuji pada Phase 9–10.

Matriks Phase 8 harus membedakan `PASS-pre-production`,
`DEFERRED-to-Phase-9/10`, dan `PASS-final-MVP`. Porsi deployment-dependent
`AC-001`/`AC-012` tidak boleh diklaim lulus dari staging. Phase 8 boleh
`Complete` setelah seluruh gate pre-production CR-018 dan audit independen
lulus; itu bukan acceptance final MVP.

Pada 8.0, buktikan kemampuan host, koneksi uji, fixture reset, dan perekaman
101 kasus sesuai protokol sebelum memulai evaluasi besar. Jika jalurnya tidak
feasible, tandai `BLOCKED`. Jangan mengganti live runs dengan simulasi,
memakai production sebagai staging, atau mengasumsikan ratusan tindakan
manual pengguna. Perubahan lanjutan pada kontrak memerlukan change record
baru sebelum diterapkan.

### Pembagian peran saat menghubungkan ChatGPT

- AI pelaksana menyiapkan kode, konfigurasi dan fixture staging, paket uji,
  tes teknis, serta laporan melalui branch/PR GitHub. Koneksi staging dan
  paket uji harus dibedakan dari paket serta endpoint production Phase 10.
- Pengguna memakai akun ChatGPT miliknya sendiri untuk login bila belum login,
  menyetujui pemasangan koneksi/plugin uji dan menyelesaikan OAuth staging
  jika UI memintanya. Pengguna tidak memberikan password, token, atau kode
  autentikasi kepada AI. Ini pekerjaan awal yang terbatas, bukan login ulang
  untuk setiap prompt.
- AI hanya boleh mengoperasikan UI akun pengguna jika kemampuan tersebut
  benar-benar tersedia dan diizinkan dalam task. Akses GitHub saja tidak
  berarti AI dapat memasang plugin, menyelesaikan OAuth, membuka chat baru,
  atau menjalankan 101 kasus ChatGPT secara otomatis.
- Pada 8.0, buktikan dengan satu koneksi uji dan beberapa prompt contoh siapa
  yang dapat membuka fresh conversation, mengirim prompt, melihat tool calls,
  dan merekam hasil. Catat langkah manual yang diperlukan. Jika setiap run
  memerlukan pengguna mengoperasikan chat secara manual dalam jumlah besar,
  jangan mulai 8.4–8.11; rekonsiliasi ulang metode evaluasi dan gate dengan
  change record. Jangan menyerahkan ratusan percobaan manual kepada pengguna
  sebagai asumsi tersembunyi.

## 3. Alur kerja dan batas

- Satu task/chat menangani tepat satu checkpoint. Gunakan satu GitHub Issue,
  satu branch `codex/phase-8-verification`, dan satu draft PR menuju `main`
  untuk seluruh fase. Mulai dari `main` terbaru; jangan menulis langsung ke
  `main` atau membuat PR terpisah per checkpoint.
- Setiap checkpoint mencatat baseline/head SHA, file berubah, command dan
  hasil aktual, tautan CI, evidence ID/case ID, jumlah pass/fail/needs-review,
  risiko, dan langkah berikutnya di Issue/PR. Centang hanya setelah bukti
  wajib tersedia. Jika Actions lama, simpan run URL dan `PENDING`, berhenti,
  lalu lanjutkan pemeriksaan hasil saat pengguna menulis "lanjutkan".
- AI menangani tes teknis dan penilaian berbasis rubrik. Pengguna menilai
  sampel editorial akhir serta menyatakan persetujuan atau alasan penolakan.
  Jangan meminta pengguna mengulang pemeriksaan schema/security yang dapat
  diotomatisasi.
- Tidak ada production deploy, data production, Facebook/Canva API, OpenAI API
  dari server, perubahan 33-tool surface tanpa change record, atau secret
  dalam repository/laporan. Fixture yang memerlukan write hanya berada dalam
  lingkungan uji terisolasi dan dapat di-reset.
- Satu audit independen dilakukan setelah gate akhir. Jika audit menemukan
  defect, perbaiki pada branch/PR yang sama dan audit ulang delta. Ubah
  tracker §16 menjadi `In progress` saat 8.0 dimulai dan `Complete` hanya
  setelah seluruh gate, review owner, dan audit independen lulus. Phase 9
  dimulai dari `main` setelah merge, pada task terpisah.

## 4. Strategi verifikasi yang hemat waktu dan RAM lokal

- Kerjakan kode, fixture, laporan, dan review melalui GitHub. Jalankan
  pemeriksaan deterministik di GitHub Actions pada runner Ubuntu yang mampu
  menjalankan Docker/Supabase lokal; PC pengguna tidak menjadi runner wajib.
- CI ringan pada setiap checkpoint menjalankan checks/tes terfokus sesuai
  file yang berubah. Jalankan `pnpm run check` setelah perubahan TypeScript
  atau konfigurasi. L1–L3 dijalankan sekali per build; ulangi hanya setelah
  kegagalan, perubahan relevan, atau infrastructure flake yang diklasifikasi.
- Full gate `pnpm run test-all` dari fresh checkout dan clean reset dilakukan
  pada akhir 8.13, bukan pada setiap commit Markdown/prompt report. Tambahkan
  concurrency, advisors, performance, dan evaluasi yang belum tercakup sebagai
  gate terpisah sesuai kontrak. `test-all` sudah memanggil `check`; jangan
  mengulang `smoke-test` bila hanya menduplikasi database suite.
- Pisahkan workflow CI ringan dari full gate manual/akhir. Setelah audit,
  perubahan dokumentasi penutupan hanya memerlukan verifikasi sesuai
  dampaknya; jangan memicu full Supabase reset/test-all kedua kali tanpa
  perubahan implementasi atau risiko baru.
- L4/L5/L6 tidak dinyatakan lulus oleh Actions saja. Pakai ChatGPT dengan
  koneksi uji terverifikasi untuk prompt/workflow; simpan hasil teredaksi.
  Laporan gabungan boleh dihitung oleh CI, tetapi skor tidak boleh diciptakan
  oleh parser atau assertion yang hanya memeriksa teks skill.
- Koneksi ChatGPT staging harus membuktikan OAuth discovery, authorization
  code + PKCE S256, resource/audience, scopes, consent/deny, refresh/relink,
  dan token success `2xx` pada batas yang relevan. Mock lokal membuktikan
  handler saja; bukti production Phase 9 dan installed plugin Phase 10
  dicatat terpisah sesuai CR-018.

## 5. Format dan aturan bukti prompt

Sebelum menjalankan batch prompt, kunci versi model/host/plugin/MCP/tool
schema digest, fixture version, baseline SHA, rubrik, dan expected behavior.
Catat per case: ID, exact prompt, environment/host surface, model dan versi
plugin/MCP, schema digest, fixture, run ID/nomor repetition, waktu mulai/akhir,
expected required/optional/forbidden tools, expected confirmation/final state,
selected tools berurutan, argumen/result teredaksi, actual confirmation/error,
final state melalui jalur verifikasi yang diizinkan, respons asisten, skor,
hard-fail code, hasil `pass`/`fail`/`needs_review`, dan reviewer.
Jangan simpan token, secret, full copyrighted source, internal bigint, atau
riwayat chat tak terkait.

- Semua 101 frozen cases harus mempunyai hasil; generated paraphrases adalah
  tambahan dan dilaporkan terpisah. Positive dan boundary/recovery coverage
  harus mencapai 33/33 tools masing-masing.
- L4 tool-selection diulang minimal tiga kali dalam fresh conversation dengan
  fixture sama. Multi-turn chain diulang tiga kali setelah reset fixture.
  Critical auth/security/confirmation/idempotency/stale/negative harus 3/3.
  Per-case pass memerlukan skor >=90 tanpa hard fail. Target suite: direct
  100%, indirect >=90% per run batch tanpa repeated miss pada goal sama,
  follow-up >=95%, consequential clarification 100%, critical
  auth/security/confirmation 100%, deterministic idempotency/concurrency
  100%, negative 100% tanpa forbidden write, overall >=95% dan mean score
  >=95. Noncritical indirect 2/3 hanya boleh menurut syarat frozen di
  `plans/use-case-inventory.md` §19–21; hard fail tidak bisa ditutup skor rata.
- Sebelum setiap run, verifikasi fixture, migration/RLS/RPC, schema digest,
  MCP initialization, dan OAuth discovery. Setelah write, verifikasi state
  melalui jalur yang diizinkan lalu reset fixture sebelum repetition berikut.
- Jika ChatGPT task tidak dapat membuat conversation baru atau mengakses
  koneksi staging, jangan mengklaim 3/3 dari satu transcript. Simpan progress
  per case, tandai `PENDING`, dan lanjutkan melalui host yang memenuhi
  protokol. Jangan memasukkan hint tambahan di tengah run frozen.

## 6. Checkpoint dan acceptance per task

### 8.0 — Preflight lingkungan dan coverage

Catat SHA `main`; buat Issue, branch, dan draft PR. Gunakan keputusan CR-018
yang sudah Accepted; jangan membuat keputusan lingkungan ulang tanpa gap baru.
Petakan 101 ID, 31 goals, 33 positive + 33 boundary paths, 14 acceptance
criteria, serta kebutuhan fixture/host tanpa mengubah expected behavior.
Periksa kemampuan akses ChatGPT staging dan pengumpulan evidence melalui satu
preflight non-destructive; buktikan pembagian peran dan beban manual menurut
§2, termasuk apakah skill uji benar-benar aktif,
bukan hanya bahwa koneksi MCP bisa dibuat. Preflight bukan pengganti 101
kasus. Resource dan secret staging hanya disiapkan dalam batas CR-018 dan
tidak boleh masuk repository atau laporan.

**Lulus bila:** batas lingkungan CR-018 terbukti dapat dijalankan, baseline serta
coverage matrix tersedia, jalur bukti L4/L5 feasible. Jika live path belum
feasible atau membutuhkan ratusan chat manual dari pengguna, checkpoint
berhenti `BLOCKED` untuk prompt work; tes deterministik boleh disiapkan tanpa
mengklaim Phase 8 selesai.

### 8.1 — Harness, fixture, dan report schema

Siapkan fixture versi tetap, mapping placeholder ke public IDs, reset/idempotent
cleanup, laporan case teredaksi, validator 101-ID coverage, scoring/hard-fail,
dan linkage requirement trace. Uji parser/validator dengan fixture positif
dan negatif. Jangan menulis scripted assistant answer sebagai bukti live run.

**Lulus bila:** run bisa dicatat dan diulang tanpa kebocoran secret, missing
case/duplicate run/versi mismatch terdeteksi, dan laporan membedakan
deterministic, prompt/workflow, serta content evidence.

### 8.2 — Static, database, RPC, security

Lengkapi gap bukti schema, FK/unique, JSON, RLS/grants, dedup, reservation,
reuse, lifecycle, plan/resume, metrics, idempotency, rate limit, approval
snapshot, dan migration consistency. Pakai tes Phase 5–6 yang sudah ada;
tambah tes hanya untuk acceptance gap nyata. Jalankan security advisors lokal
dan dependency audit dengan klasifikasi temuan, bukan sekadar exit code.
Matriks juga harus menunjukkan multi-Page/config/default/niche, owner dan
non-owner, batas `api`/RLS/security-definer, pemisahan core/niche, pinned
dependency, no OpenAI API/embeddings/vector service, serta absence of secrets.
Untuk `AC-002`, cek sedikitnya tiga Page dengan config berbeda, default
adaptive 5/7/9, fixed 5–9, kedua reuse scope, dan niche trivia aktif.
Verifikasi log observability memuat request ID, tool, waktu/durasi, hasil,
public IDs yang relevan, safe error dan reservation conflict tanpa header
otorisasi, secret, full chat, atau full source/output. Uji input sumber yang
memuat prompt injection sebagai data tak tepercaya; tidak boleh menghasilkan
tool call/perintah dari teks sumber.

**Lulus bila:** trace matrix menunjukkan bukti aktual untuk seluruh kategori
ini, tidak ada data-integrity failure atau critical/high security issue
terbuka, dan focused checks pada perubahan baru lulus.

### 8.3 — MCP, concurrency, workflow E2, dan performance

Buktikan 33 tools dan `/health`, schema/annotation/auth/error/payload/response
safety, serta OAuth contract yang dapat diuji lokal. Jalankan concurrency
matrix PRD §32.5 dan workflow deterministik dengan public MCP/RPC path;
gunakan Inspector/API Playground sesuai gate E2. Ukur context, similar
search, reserve, save, plan progress, latest metrics, dan insights dengan
fixture, planner, sampel, dan threshold frozen yang relevan. Ukur p95 server
di luar waktu riset/penulisan ChatGPT: read sederhana <=2 detik, pencarian
kandidat duplikat <=3 detik, dan reservation/write sederhana <=3 detik;
catat jumlah sampel, data fixture, dan EXPLAIN bila query meleset. Buktikan
minimal tiga Page berbeda, satu post hingga approval, batch tujuh post,
kalender tujuh hari dengan setiap slot tetap tersimpan sebagai plan item,
interrupt/resume lintas chat, replacement, discard,
revoke, archive, mark posted manual, metrics history, dan cautious insights
melalui jalur yang sesuai. Uji dua revision, dua slot sama, sepuluh
reservation, dua claim, repeated release/status, correction versus
approve/publish, serta lost-response replay tanpa duplicate mutation.
Bukti OAuth hosted dan relink nyata menunggu environment yang disahkan pada
8.0; jangan menyamakan mock dengan hosted success.

**Lulus bila:** 33/33 valid/invalid/auth path dan seluruh race/restore yang
diwajibkan punya evidence, laporan performa menyebut metode serta hasil
aktual, dan gap hosted dinyatakan eksplisit hingga bukti live tersedia.

### 8.4–8.11 — Evaluasi 101 frozen prompts, kelompok kecil

Jalankan satu kelompok per task dengan protokol §5. Pembagian ini menjaga
context tiap task kecil; nomor case dan total tidak berubah:

| Checkpoint | Frozen case IDs | Jumlah |
|---|---|---:|
| 8.4 | `EV-DR-001..011` | 11 |
| 8.5 | `EV-DR-012..021`, `EV-IN-001..004` | 14 |
| 8.6 | `EV-IN-005..012`, `EV-FU-001..006` | 14 |
| 8.7 | `EV-FU-007..010`, `EV-CL-001..008` | 12 |
| 8.8 | `EV-RC-001..012` | 12 |
| 8.9 | `EV-RC-013..024` | 12 |
| 8.10 | `EV-RC-025..036` | 12 |
| 8.11 | `EV-NG-001..014` | 14 |
| **Total** | 21 direct + 12 indirect + 10 follow-up + 8 clarification + 36 recovery + 14 negative | **101** |

Per checkpoint, simpan case-level evidence dan ringkasan pass/fail/needs-review,
hard fails, perubahan fixture/version, serta kategori defect. Jangan memakai
model context sebelumnya sebagai pengganti fresh conversation. Jika defect
memaksa metadata/skill/MCP berubah, catat versi baru dan buat impact matrix:
ulang semua kasus terdampak, dan regresi representatif kasus lain. Jika
perubahan shared instructions/tool metadata dapat memengaruhi seluruh suite,
ulang seluruh 101 kasus pada versi final. Jangan gabungkan hasil versi lama
dan baru tanpa bukti kasus lama tetap berlaku; jangan mengubah frozen prompt
text.
Generated paraphrases dijalankan dan dilaporkan terpisah setelah frozen
baseline kategori terkait stabil.

**Lulus bila:** seluruh kasus kelompok mempunyai repetition dan state
evidence sesuai kontrak; bukan sekadar prompt sudah dikirim. Threshold
kategori dan overall baru dihitung setelah 8.11.

### 8.12 — Content evaluation dan penilaian owner

Evaluasi output nyata/rubrik untuk lima format, dua profil, semua topic groups,
global `en-US`, sumber, freshness, topik sensitif, budget, readability,
non-copying, duplicate/anti-duplicate, caption yang tidak menambah klaim,
dan insight yang berhati-hati. Sertakan negative cases dengan sumber lemah,
klaim sensitif, serta prompt injection di teks riset.
Pertahankan kasus panjang/pendek dan kombinasi budget pada PRD §32.4.
Tautkan output ke case/fixture dan hasil sistem, bukan hanya skor model.
Tentukan sampel owner review sebelum melihat skor akhir; sampel harus
merepresentasikan lima format, dua profil, dan variasi topik/Page. Minta
pengguna menilai sampel editorial final dan simpan keputusan serta alasan
ringkas tanpa menganggap persetujuan otomatis atau meminta upload Facebook.

**Lulus bila:** content report lengkap, kegagalan sumber/safety tidak lolos,
dan pengguna menyetujui representasi DNA editorial untuk sampel uji.

### 8.13 — Gate akhir, trace, dan audit independen

Dari fresh checkout pada SHA final implementasi, jalankan clean Supabase reset,
`pnpm run test-all`, package validation, security/advisors, concurrency,
performance, prompt-report validator, dan `git diff --check`. Jalankan
`smoke-test` hanya bila ada risiko tersisa yang tidak dicakup `test-all`.
Hasilkan deterministic report, prompt/workflow report, content report,
security/advisors report, performance baseline, 14-AC matrix, dan requirement
trace terhadap `plans/acceptance-traceability.md`. Cocokkan 101/101 case,
category/overall thresholds, 33/33 positive + boundary, zero hard fail,
zero data-integrity failure, tidak ada critical/high security issue yang
belum diterima, serta keputusan owner. AC matrix harus mencatat evidence dan
status pre-production/deferred/final secara terpisah menurut CR-018; audit
seluruh 42 functional requirements dan baris quality,
non-functional, security, serta error recovery pada trace register. Jangan
mengisi AC production dengan simulasi staging. Simpan command,
exit code, SHA, run URL, artifact digest, dan bukti yang masih tertunda.

**Lulus bila:** semua verification gate Phase 8 dan CR-018
terpenuhi pada bukti aktual, lalu auditor independen menyetujui HEAD yang
sama. Jika bukti live, editorial approval, atau gate masih pending, verdict
`belum siap`; jangan menandai tracker `Complete` atau mulai Phase 9.
Porsi production `AC-001`/`AC-012` tetap `DEFERRED-to-Phase-9/10`; laporan
Phase 8 tidak boleh menyatakannya `PASS-final-MVP`.

## 7. Penutupan dan handoff

Setelah audit lulus, selaraskan tracker §16, Issue, dan PR; verifikasi delta
penutupan sesuai dampaknya, lalu merge. Mulai Phase 9 dari `main` terbaru pada
task terpisah. Paket final/installed plugin, production OAuth/connection,
dan production pilot tetap mengikuti keputusan change record serta fase
pemiliknya; jangan mengklaimnya lulus dari staging atau source-level tests.

Setiap task menyerahkan checkpoint, branch/Issue/PR, baseline/head SHA,
perubahan, hasil tes aktual, case/evidence IDs, status `PASS`/`PENDING`/
`FAILED`/`BLOCKED`, risiko, dan langkah berikutnya. Untuk Actions panjang,
pengguna dapat meminta "lanjutkan" di chat yang sama setelah run selesai.
