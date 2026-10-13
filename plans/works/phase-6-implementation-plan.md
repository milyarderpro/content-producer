# Phase 6 — MCP Edge Function implementation plan

Status: rencana eksekusi; implementasi Phase 6 belum dimulai.
Baseline source: `b5770f8` pada `main`, 67 migration, 33 `api` RPC, dan
`[functions.mcp] enabled = false`. Belum ada
`supabase/functions/mcp/index.ts` atau workflow GitHub Actions. Angka katalog
Phase 5 berasal dari verifikasi lokal terakhir; checkpoint 6.0 harus
membuktikan ulang bahwa baseline dapat dijalankan di CI.

## 1. Tujuan dan sumber keputusan

Phase 6 membuat satu MCP server Streamable HTTP di Supabase Edge Function
`mcp`. Server mengekspos tepat 33 tool sebagai facade untuk 33 RPC Phase 5,
ditambah `GET /health` yang **bukan** tool. Tidak ada business SQL atau aturan
domain baru di handler MCP.

Urutan kewenangan tetap mengikuti `AGENTS.md` dan
`plans/implementation-plan.md` §3. Baca bagian yang relevan dari sumber ini
sebelum setiap checkpoint:

1. `plans/PRD.md` — kebutuhan produk, batas MVP, dan acceptance criteria.
2. `plans/implementation-plan.md` — scope dan verification gate Phase 6.
3. `plans/tool-inventory.md` — nama, schema, auth, annotations, error,
   idempotency, dan test requirements untuk tiap tool.
4. `plans/database-design.md` dan `plans/module-contract.md` — boundary
   owner, Page, plan, post, fact, metrics, serta perilaku niche.
5. `plans/use-case-inventory.md` — urutan penggunaan dan kasus pemulihan
   yang perlu dibuktikan tanpa menambah tool di luar inventory.
6. `plans/phase-0-decision-register.md` dan accepted change records di
   `docs/decisions/` — keputusan yang merekonsiliasi kontrak.
7. Implementasi dan test Phase 5 — bentuk RPC aktual, bukan izin untuk
   mengganti kontrak frozen secara diam-diam.

Jika kontrak berbenturan, catat change record sebelum mengubah schema, tool
contract, atau perilaku editorial. Perbaikan database yang diperlukan harus
additive dan dibuktikan dengan tes; jangan menulis ulang migration lama.

## 2. Cara kerja satu task per checkpoint

- Satu chat/task implementer hanya menangani **satu** checkpoint di bawah.
  Jangan memulai checkpoint berikutnya dalam task yang sama.
- Gunakan satu branch Phase 6 dan satu draft pull request. Kerjakan task
  berurutan dari commit terakhir pada branch itu; jangan menulis langsung ke
  `main` atau menjalankan beberapa implementer secara paralel.
- GitHub Issue yang akan dibuat kemudian menjadi checklist kemajuan dan tautan
  bukti. Dokumen ini menjelaskan pekerjaan; Issue tidak mengubah kontrak.
- Setelah checkpoint lulus, catat commit SHA, file yang berubah, jumlah tool
  kumulatif, tautan CI, tes yang lulus/gagal, dan hal yang masih tertunda.
  Centang Issue hanya bila bukti checkpoint tersedia.
- CI merah atau bukti acceptance yang belum ada menghentikan checkpoint
  berikutnya. Perbaikan dilakukan dalam task yang sempit, lalu bukti terkait
  diperbarui sebelum lanjut.
- Audit Batch A dilakukan oleh task reviewer terpisah setelah 6.6 (15 tool).
  Audit Batch B dan gate akhir dilakukan setelah 6.13 (33 tool). Implementer
  tidak mengesahkan auditnya sendiri.

Saat 6.0 dimulai, ubah tracker Phase 6 menjadi `In progress`. Ubah menjadi
`Complete` hanya setelah audit akhir dan seluruh gate Phase 6 lulus.

## 3. CI dan pengujian yang hemat

Checkpoint 6.0 harus membuktikan bahwa GitHub Actions dapat menjalankan
project ini. Gunakan GitHub-hosted Ubuntu runner, Node yang memenuhi
`>=24.15.0 <25`, pnpm `10.33.2`, `pnpm install --frozen-lockfile`, dan
Supabase CLI project-pinned `2.120.0` melalui pnpm. Jalankan Supabase stack
lokal di runner dengan Docker. Jangan link project Supabase remote, deploy,
atau memasukkan production secret. Batasi izin workflow ke yang dibutuhkan;
job pengujian cukup membaca repository.

Urutan 6.0: buktikan dulu koneksi GitHub dapat menambah file workflow; job
pengujian sendiri cukup memakai `permissions: contents: read`. Jalankan
preflight kecil (install, Supabase start/reset, satu tes terfokus), lalu satu
baseline `pnpm run test-all`. Jika runner tidak sanggup menjalankan stack
atau permission workflow ditolak, selesaikan hambatan CI lebih dulu. Jangan
menyebut Phase 6 dapat diuji sepenuhnya di cloud sebelum preflight lulus.

Setelah CI siap:

- Setiap perubahan TypeScript/configuration menjalankan `pnpm run check`
  sesuai `AGENTS.md`. Jalankan function/contract tests yang terfokus pada
  checkpoint dan regresi yang berhubungan langsung.
- Pin versi MCP Inspector yang dipakai CI agar satu commit diuji dengan versi
  alat yang sama pada setiap run.
- Setelah MCP tersedia, quick smoke Inspector cukup memeriksa initialize,
  tool list, dan tool yang baru berubah. Quick smoke bukan bukti bahwa semua
  33 tool sudah diuji.
- Saat function tests ditambahkan, hubungkan ke `pnpm run test-all` dan CI.
  Periksa log agar gate akhir benar-benar menjalankan tes Phase 6, bukan hanya
  suite database Phase 5 yang sudah ada.
- Pada batas Batch A dan gate akhir, jalankan gate penuh **berurutan**:
  clean local reset, `pnpm run test-all`, `pnpm run smoke-test`,
  `pnpm run supabase:verify`, security/catalog audit, Inspector untuk tool
  yang tersedia, dan `git diff --check`. Pastikan MCP contract/function tests
  sudah terhubung ke `test-all`; jalankan tes terpisah hanya untuk cakupan
  yang belum dipanggil agregat. `test-all` sudah memanggil `check` serta
  validasi nama migration, sedangkan `smoke-test` mengulang database suite;
  catat duplikasi ini dalam laporan agar tidak dianggap bukti independen.
- Jangan mengulang gate penuh pada commit yang sama tanpa risiko tersisa atau
  kegagalan konkret. Gate Batch B dapat sekaligus menjadi gate akhir Phase 6
  bila tidak ada perubahan setelahnya. Perubahan setelah gate wajib diuji
  ulang sesuai dampaknya sebelum klaim selesai.

CI harus menyimpan log dan hasil yang dapat dibaca reviewer, termasuk command,
exit code, commit SHA, jumlah tool, dan kegagalan. Jangan cetak bearer token,
service key, password, claim/reservation token, atau payload sensitif ke log.
Gunakan fixture lokal yang dibersihkan; jangan menyentuh project Supabase
remote atau data production.

## 4. Aturan bersama untuk setiap tool

Setiap tool memakai nama persis dari inventory, title/description yang tepat,
input dan output schema eksplisit serta tertutup, security scheme OAuth,
annotations yang sesuai, dan `openWorldHint = false`. Semua 33 tool butuh
OAuth; tidak ada tool anonim. `get_account_profile` adalah satu-satunya tool
dengan profile metadata. `GET /health` tetap di luar `tools/list` dan tidak
membaca data owner.

Middleware harus memvalidasi token sebelum tool memanggil RPC: signature,
issuer, audience/resource, `exp`, `nbf`, scopes, OAuth `client_id`, actor,
dan owner workspace. Ketiadaan/kerusakan token menghasilkan challenge HTTP
yang benar. Identitas dan client context tidak boleh dipercaya dari argumen
tool. Audience yang diterima harus sama dengan resource MCP canonical yang
diiklankan discovery; jangan melemahkan validasi audience bila token lokal
atau hosted belum sesuai. Teruskan **JWT asli pengguna** yang tervalidasi,
termasuk claim `client_id`, ke `.schema('api').rpc(...)`; jangan membuat JWT
pengganti, menyisipkan claim dari argumen, atau memakai service-role client.
Dengan demikian `auth.uid()`, ownership, RLS, dan rate-limit group Phase 5
tetap berlaku. Phase 0 AUTH-003 mengatur custom access token hook bila
Supabase OAuth belum mengikat audience secara native; implementasi hosted
dan konfigurasinya berada pada Phase 9, tetapi invariant-nya diuji secara
lokal di sini.

Facade memvalidasi dan meneruskan field kontraktual tanpa silent merge atau
default baru yang mengubah arti payload. Semua write menjaga operation key,
replay, CAS, confirmation, dan atomicity RPC. Semua result menggunakan
`structuredContent` sebagai data utama dan ringkasan `content` yang konsisten.
Peta error stabil dan aman: tidak ada raw SQL/SQLSTATE, internal bigint,
stack trace, secret, token, atau data Page milik orang lain pada response/log.
Batasi request 256 KiB dan structured response 256 KiB sesuai inventory;
gunakan rate group database dari RPC yang sesuai setelah auth dan sebelum
mutation, tanpa membuat limiter bisnis kedua di facade. Ukur latency tool
tipikal terhadap limit Edge Function yang berlaku saat implementasi.

Tes utama melewati endpoint MCP dan RPC publik, bukan hanya helper privat.
Untuk setiap tool, buktikan input valid dan invalid yang representatif;
untuk write, tambahkan replay, mismatch key, auth/owner denial, dan recovery
atau rollback yang relevan. Jangan memakai hasil `tools/list` saja sebagai
bukti tool dapat dijalankan.

## 5. Checkpoint berurutan

| Checkpoint | Scope tool baru | Jumlah kumulatif |
|---|---:|---:|
| 6.0 — CI baseline | 0 | 0 |
| 6.1 — MCP transport dan health | 0 | 0 |
| 6.2 — OAuth dan request context | 0 | 0 |
| 6.3 — Foundation | 4 | 4 |
| 6.4 — Page dan plan dasar | 5 | 9 |
| 6.5 — Claim/lease/failure plan | 3 | 12 |
| 6.6 — Retry/replacement/cancel plan | 3 | 15 |
| Audit independen Batch A | 0 | 15 |
| 6.7 — Trivia search/reserve/release | 3 | 18 |
| 6.8 — Trivia reverify/correct | 2 | 20 |
| 6.9 — Post save/list/get | 3 | 23 |
| 6.10 — Post revise/reschedule | 2 | 25 |
| 6.11 — Post approval/discard | 3 | 28 |
| 6.12 — Post posted/archive | 2 | 30 |
| 6.13 — Metrics | 3 | 33 |
| Audit independen Batch B + gate akhir | 0 | 33 |

### 6.0 — CI baseline

Tambahkan workflow GitHub Actions minimum pada branch Phase 6. Pastikan
workflow write permission, Docker, versi toolchain, clean reset migration,
dan baseline Phase 5 di runner benar-benar berfungsi. Simpan tautan run dan
catat konsumsi waktu/resource. Tidak ada handler MCP atau tool baru.

### 6.1 — MCP transport dan health

Buat entrypoint `supabase/functions/mcp/index.ts` yang tipis, shared server,
registry, instruksi awal server, transport Streamable HTTP, dan `GET /health`.
Aktifkan function lokal dengan `verify_jwt = false` agar discovery/challenge
mencapai middleware. Pasang gate MCP yang gagal tertutup sejak checkpoint ini:
sebelum 6.2 selesai, request MCP tanpa konteks autentikasi yang sah tidak
boleh mencapai initialize, `tools/list`, atau handler apa pun. Uji initialize
dan route/protocol error lewat harness internal; pada 6.1 endpoint HTTP publik
hanya health/preflight tanpa data owner, lalu discovery ditambahkan di 6.2.
Belum ada business tool. Auth middleware lengkap dan tes penolakannya
diselesaikan pada 6.2. Jangan memperkenalkan business SQL.

### 6.2 — OAuth dan request context

Tambahkan protected-resource discovery, `WWW-Authenticate`, validasi token
dan OAuth client, owner check, request ID, safe logger, serta context untuk
RPC. Uji token hilang, signature/issuer/resource/masa berlaku/scope/client
invalid, browser session tanpa client, dan non-owner denial tanpa existence
leak. Uji bahwa resource discovery cocok persis dengan audience token yang
diterima. Gunakan fixture issuer/token lokal yang aman untuk membuktikan
middleware; catat secara eksplisit bagian OAuth provider yang belum dapat
dibuktikan lokal. Konfigurasi OAuth server hosted, consent akun nyata, PKCE
end-to-end, refresh/relink, dan penerimaan seluruh token success HTTP `2xx`
diverifikasi pada Phase 9–10, bukan diklaim lulus dari fixture Phase 6.
Tool tetap 0; semua jalur database menunggu auth lulus.

### 6.3 — Empat tool foundation

Tambahkan `get_account_profile`, `get_workspace_context`, `list_pages`, dan
`get_page_generation_context`. Buktikan owner success, empty state, filter
dan pagination yang relevan, redaksi data privat, serta tidak ada business
mutation pada read. Profile metadata hanya pada tool pertama. Target: 4 tool.

### 6.4 — Lima tool Page dan plan dasar

Tambahkan `create_page`, `update_page`, `list_content_plans`,
`create_content_plan`, dan `get_content_plan`. Buktikan schema config,
slug/default, exact CAS, batas item/posisi, replay/payload mismatch,
non-owner, rollback, serta schedule conflict melalui MCP path. Target: 9 tool.

### 6.5 — Tiga tool claim dan failure

Tambahkan `claim_content_plan_items`, `renew_content_plan_claim`, dan
`report_content_plan_item_failure`. Buktikan lease, expiry, replay claim
tanpa perpanjangan tersembunyi, token privacy, rate limit, dan race yang
relevan melalui public MCP path. Target: 12 tool.

### 6.6 — Tiga tool recovery dan cancel

Tambahkan `retry_content_plan_item`, `replace_discarded_plan_item`, dan
`cancel_content_plan`. Buktikan retry berbeda dari replacement, explicit
confirmation, completed output tidak terhapus, replay, dan race claim/cancel.
Target: 15 tool. Berhenti untuk audit Batch A.

### 6.7 — Tiga tool trivia awal

Tambahkan `trivia_find_similar_facts`,
`trivia_register_and_reserve_facts`, dan `trivia_release_facts`. Buktikan
search tidak auto-merge, reserve/release owner-scoped, replay, token tidak
tercatat di ledger/log, dan contention reservation. Target: 18 tool.

### 6.8 — Dua tool koreksi fakta

Tambahkan `trivia_reverify_fact` dan `trivia_correct_fact`. Buktikan exact
CAS, lineage, stale/reuse denial, effect pada draft/ready, dan immutable
posted/archived snapshot. Target: 20 tool.

### 6.9 — Tiga tool post dasar

Tambahkan `save_post`, `list_posts`, dan `get_post`. Save harus memakai
reservation dan active plan claim bila terkait plan; hasilnya draft, bukan
auto-approved. Uji replay, rollback, ownership, safe list/get, dan pagination.
Target: 23 tool.

### 6.10 — Dua tool edit dan jadwal

Tambahkan `revise_post` dan `reschedule_post`. Buktikan exact revision dan
content hash untuk revise, serta exact revision untuk reschedule. Uji quality
evidence, source/privacy validation, schedule conflict, dan replay.
Target: 25 tool.

### 6.11 — Tiga tool approval dan discard

Tambahkan `approve_post`, `revoke_post_approval`, dan `discard_post`.
Approval harus menuntut intent eksplisit dan evidence current. Uji stale
evidence, perubahan revision, release alokasi pre-publication, replay, serta
correction versus approval race. Target: 28 tool.

### 6.12 — Dua tool published history

Tambahkan `mark_post_posted` dan `archive_post`. Yang pertama hanya mencatat
publikasi manual, tidak mengirim ke Facebook. Buktikan approval/provenance,
snapshot posted/archived immutable, legal transition, replay, dan privacy.
Target: 30 tool.

### 6.13 — Tiga tool metrics

Tambahkan `record_post_performance`, `get_post_performance`, dan
`get_performance_insights`. Buktikan metric append-only, replay, null versus
zero, likes subset, pagination, sample size/period/caveat pada insights,
dan owner scope. Target: tepat 33 tool. Selesaikan server instructions,
metadata/schema census, dan full Inspector calls untuk seluruh tool.
Berhenti untuk audit Batch B dan gate akhir.

## 6. Audit, deferred evidence, dan fase berikutnya

Audit Batch A memeriksa checkpoint 6.0–6.6: baseline CI, auth, 15 tool,
positive/negative public MCP calls, kontrak metadata, akses RPC, log privacy,
serta hasil gate penuh. Audit Batch B memeriksa 18 tool berikutnya dan regresi
seluruh 33 tool. Reviewer memakai commit SHA dan log CI yang sama, menulis
temuan berprioritas, dan tidak menganggap checklist Issue sebagai bukti tes.
Setiap temuan blocker harus diperbaiki dan diaudit ulang sebelum lanjut/merge.

Gate akhir harus membuktikan initialize, tepat 33 nama/schema/annotations,
validasi input, auth private read/write, error aman, ukuran result, latency
tipikal, tidak ada secret di response/log, dan setiap tool benar-benar dapat
dipanggil dengan input valid/invalid representatif lewat MCP Inspector.
Periksa juga bahwa 33 RPC, privilege, RLS, migration source/history, dan
fixture cleanup Phase 5 tidak terdegradasi. Laporkan hasil aktual; jangan
menulis PASS untuk pekerjaan yang hanya direncanakan atau masih deferred.

Koneksi ChatGPT ke endpoint remote, persetujuan OAuth akun nyata, deploy,
plugin package, dan prompt pilot berada pada Phase 9–10 sesuai
`plans/implementation-plan.md`. Tes lokal Phase 6 harus membuktikan protokol
dan enforcement OAuth dengan fixture aman; catat PKCE, consent, refresh/relink,
serta token exchange `2xx` sebagai bukti hosted yang tertunda sampai Phase
9–10 bila tidak dapat dibuktikan lokal. Jangan mengklaim acceptance
interaktif ChatGPT telah lulus sebelum fase koneksi. Tidak ada OpenAI API,
Facebook/Canva API, embeddings, background generation, atau cloud resource
action di project Supabase pada Phase 6 ini.

## 7. Format handoff per checkpoint

Setiap task meninggalkan ringkasan singkat yang dapat dipakai chat berikutnya:

1. Checkpoint, baseline commit, head commit, dan tautan draft PR/Issue.
2. Tool yang baru ditambahkan dan jumlah kumulatif tepat.
3. File yang berubah dan kaitannya dengan kontrak inventory.
4. CI run URL, command, exit code, tes focused, dan hasil Inspector.
5. Risiko/temuan/deferred evidence yang belum lulus; tindakan berikutnya.
6. Pernyataan bahwa checkpoint berikutnya, deploy, dan Phase 7+ belum dimulai.

GitHub Issue hanya menyalin urutan checkpoint dan tautan bukti dari runbook
ini. Bila Issue, report, atau chat berbeda pendapat tentang perilaku tool,
ikuti kontrak frozen dan accepted change record, lalu perbaiki tracker.

## 8. Referensi platform untuk 6.0

- Supabase: https://supabase.com/docs/guides/deployment/ci/testing
- Supabase MCP auth:
  https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- Supabase OAuth token/RLS:
  https://supabase.com/docs/guides/auth/oauth-server/token-security
- GitHub-hosted runners:
  https://docs.github.com/en/actions/concepts/runners/github-hosted-runners
- MCP Inspector CLI:
  https://github.com/modelcontextprotocol/inspector/blob/main/docs/cli-smoke-testing.md

Dokumentasi platform diperiksa kembali saat command, versi, atau perilaku
auth/transport benar-benar diimplementasikan. Frozen project documents tetap
menjadi sumber kontrak utama.
