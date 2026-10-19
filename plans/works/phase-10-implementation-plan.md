# Phase 10 — Koneksi ChatGPT, plugin final, dan pilot: runbook implementasi

**Status:** Phase 9 `Complete`; Phase 10 `In progress`, 10.0 mengikuti CR-028.
Catat SHA `main` yang aktual ketika 10.0 dimulai. Rencana ini membagi Phase 10
menjadi delapan task berurutan (10.0–10.7); satu task hanya mengerjakan satu
checkpoint. Lulusnya Phase 10 memberi status **Pilot-ready**, bukan **MVP
Complete**. Phase 11 tetap menangani kesiapan operasi dan handoff.

## 1. Kontrak dan keadaan awal

Baca sebelum mengerjakan checkpoint:

1. `AGENTS.md`, `plans/PRD.md` §29, §31–34, §36,
   `plans/implementation-plan.md` Phase 10–11 dan §16.
2. `docs/decisions/2026-10-15-phase-8-manual-acceptance-resequencing.md`
   (CR-019), `docs/decisions/2026-10-15-phase-9-10-risk-based-mvp-acceptance.md`
   (CR-020), dan
   `docs/decisions/2026-10-18-phase-10-mvp-evidence-boundary.md` (CR-027),
   dan `docs/decisions/2026-10-18-phase-10-proof-sequencing.md` (CR-028).
   CR-027 membatasi publikasi/metrik nyata; CR-028 mengatur waktu pembuktian
   host, instalasi dan pengikatan data per kartu.
3. `plans/tool-inventory.md`, `plans/workflow-users.md`,
   `plans/use-case-inventory.md`, `plans/acceptance-traceability.md`, dan
   `plugin/skills/content-producer/references/core/tool-sequences.md`.
4. `plugin/plugin.json`, `plugin/README.md`,
   `plugin/schemas/mcp-connection-input.schema.json`, generator dan validator
   paket Phase 7; catatan gate Phase 9 di Issue #8 dan audit di Issue #20.

Production MCP Phase 9 berada di
`https://xjonnilnypchtxogtopb.supabase.co/functions/v1/mcp`. Saat rencana ini
ditulis, backend production yang telah diaudit memakai SHA
`be3bf04b703a4aff16510c496600c9796c13b57a`, dengan 33 tool, 68 migration,
dan satu Page pilot Phase 9.5 `phase-9-5-pilot-trivia`. **Periksa ulang** alias,
SHA deployment, health, konfigurasi keamanan, dan inventaris data secara
baca-saja sebelum memakai nilai ini; jangan menganggap catatan historis sebagai
keadaan production saat eksekusi. Page Phase 9.5 tetap ada sebagai bukti dan
tidak boleh dihitung sebagai Page tambahan `MAN-02`.

Phase 8 berstatus `Deferred by CR-019`. Inventaris 101 prompt tetap utuh sebagai
regresi, tetapi tidak menjadi 101 percakapan live untuk MVP. Sembilan kartu
`MAN-01..MAN-09` wajib; `MAN-10..MAN-11` hanya observasi opsional setelah MVP
dengan kejadian nyata. Cross-owner denial tetap dibuktikan oleh gate otomatis
Phase 9, bukan dengan meminta pemilik menyediakan akun kedua.

## 2. Prasyarat kemampuan host — dibuktikan bertahap menurut CR-028

PRD §34 semula menganggap menu Plus sebagai syarat awal, bukan bukti izin
write. Pada 10.0, screenshot akun pemilik menampilkan **Add custom MCP
server**, pilihan **OAuth**, dan **Create as a plugin**. Jalur artefak
GitHub Actions sudah diunduh dan hash diverifikasi; fasilitas Plugin Creator
menerima arsip lokal ZIP/tar.gz menjadi plugin PRIVATE. Ini hanya bukti
**formulir OAuth dan jalur delivery/intake**, bukan izin tool write atau
instalasi final. Jangan mencentang peringatan risiko, membuat koneksi,
login/OAuth, ataupun mengunggah paket di 10.0.

**CR-032 menggantikan gate OAuth tersebut hanya pada 10.1:**
Pemilik memilih satu custom MCP **PRIVATE / No authentication** ke URL `mcp`
production yang sama. Tidak ada user login, OAuth, atau consent. Edge Function
menggunakan identitas satu workspace tetap dengan transaksi Postgres yang
turun ke role `authenticated`; RLS dan 33 RPC yang ada tetap berlaku.
Endpoint HTTPS-nya sendiri **publik**, meskipun plugin private, sehingga
siapa pun dengan URL dapat meminta pembacaan. Semua tool write terlihat
tetapi eksekusi RPC write ditolak selama 10.1. Pembuktian tool/approval
OAuth historis CR-028/031 bukan lagi syarat koneksi ini. 10.1 PASS hanya
bila host benar-benar menampilkan 33 tools termasuk `create_page` dan tiga
read berhasil. Tidak ada business write sebelum MAN-02 dengan persetujuan
payload tepat. Lihat [CR-032](../../docs/decisions/2026-10-18-phase-10-1-noauth-fixed-pilot.md).

## 3. Alur GitHub, status, dan biaya pengujian

- Gunakan satu Issue Phase 10, satu branch `codex/phase-10-plugin`, dan satu
  draft PR menuju `main`. Jangan mengarang nomor Issue/PR sebelum dibuat.
  Mulai 10.0 dari `main` terbaru; checkpoint berikutnya memakai HEAD branch
  yang sudah lulus. Jangan langsung menulis ke `main` atau merge sebelum audit
  independen akhir. Catat hasil checkpoint di Issue dan deskripsi PR.
- Satu task/chat menangani tepat satu checkpoint. Setiap task menyebut baseline
  dan HEAD SHA, perubahan, paket/plugin version, backend deployment SHA,
  perintah dan hasil tes, bukti ChatGPT, data production yang berubah, serta
  `PASS`, `FAIL`, atau `BLOCKED/PENDING` yang spesifik. Centang hanya bila
  kriteria selesai terbukti. `PENDING` bukan `PASS`.
- AI mengerjakan repository, paket, penilaian evidence, dan pemeriksaan
  teknis. Pemilik memilih koneksi No authentication 10.1 dan mengaktifkan plugin,
  menjalankan prompt kartu yang telah dibekukan, memberi data Page dan
  persetujuan editorial. Jangan meminta password, token, authorization code,
  client secret, service key, atau isi cookie di chat/Issue/PR/log.
- Jalankan tes terfokus untuk perubahan yang terjadi. Setelah perubahan
  TypeScript atau konfigurasi, jalankan `pnpm run check`. Untuk perubahan
  paket/skill saja, validasi paket, tes skill/MCP yang relevan, dan kartu
  manual yang terdampak. Jika backend, migration, Auth, atau security config
  berubah, jalankan gate penuh **sekali pada SHA deployment baru** sesuai
  CR-020 sebelum deploy; gate Phase 9 tidak lagi cukup. Jika backend deployed
  tetap identik, gunakan bukti gate Phase 9 yang terikat SHA dan jangan
  mengulang `test-all`/`smoke-test` hanya untuk Markdown atau paket.
- Jika Actions lama, catat URL, SHA, dan `PENDING` lalu berhenti memantau.
  Saat pemilik meminta "lanjutkan" pada task yang sama, periksa run yang sama;
  jangan memulai run pengganti tanpa alasan konkret.
- Jika plugin metadata/tool schema berubah, refresh koneksi dan uji ulang
  kartu yang terkena sesuai
  [panduan OpenAI](https://developers.openai.com/plugins/deploy/connect-chatgpt).
  Catat source SHA, hash paket final, dan versi terpasang. Paket yang diuji
  harus sama dengan paket yang dinyatakan final.
- Registrasi OAuth client adalah prosedur historis Phase 9 dan **tidak**
  dipakai untuk koneksi No authentication CR-032. Apabila diaudit, policy backend
  yang sudah dirilis: catat client, redirect persis, scope, dan uji OAuth/owner
  hosted secara terfokus. Jika setup itu memerlukan perubahan Auth policy,
  token claim hook, middleware, RLS, atau security config backend, perlakukan
  sebagai perubahan keamanan: review, gate penuh pada SHA rilis baru, lalu
  verifikasi hosted. Jangan menyebut registrasi client saja sebagai bukti
  bahwa kebijakan akses berubah atau gate lama otomatis tidak berlaku.

## 4. Batas tindakan dan evidence

Selama 10.1 tidak ada write bisnis. Identitas fixed pilot di sisi server
menggantikan OAuth owner untuk koneksi No authentication; hal ini tidak
dapat mengotentikasi pemanggil publik. Pembukaan write setelah 10.1 butuh
persetujuan payload dan keputusan operasional terpisah.
Page tambahan, draft, revisi, approval, dan plan yang bertahan di production
adalah data pilot sungguhan milik owner. Prompt kartu yang dikirim pemilik
memberi otorisasi untuk tindakan tepat yang dijelaskan di kartu; jangan
meminta persetujuan yang sama berulang. Untuk isi faktual atau revisi yang
belum terlihat saat prompt dikirim, tampilkan hasil dan minta tinjauan owner
sebelum approval editorial. Jangan membuat fixture fiktif lalu menghapusnya.
Jangan melakukan auto-publish ke Facebook, membuat ID publikasi palsu,
memasukkan metrik rekaan, menghubungkan Canva/Facebook API, atau menjalankan
SQL admin sebagai jalan pintas. Jangan mengubah/mencabut dua OAuth client uji
Phase 9 tanpa keputusan pemilik; review risikonya pada laporan akhir.

Setiap kartu wajib memiliki dalam `docs/phase-10/manual-cards.md`: urutan
langkah dan template prompt, prasyarat, target Page/post/plan, tool yang
diharapkan, perilaku terlarang, pemeriksaan state aman, recovery, dan batas
persetujuan. **Bekukan seluruh prosedur dan guardrails MAN-01..MAN-09 di
10.0** sebagai `procedure-v1`; tidak ada data bisnis production yang
dipilih diam-diam. Parameter Page dan konfigurasi diminta tepat sebelum
MAN-02, topik/sumber serta batas editorial sebelum MAN-03, revisi serta
persetujuan tepat versi/hash pada MAN-04, dan nama plan serta slot jadwal
sebelum MAN-05. ID baru dari kartu sebelumnya dibaca kembali lalu diikat
pada kartu terkait. Sebelum setiap kartu dijalankan, validasi pilihan owner,
rekam payload/approval yang diperlukan dan **bekukan prompt lengkap hasil
substitusi**; placeholder tidak pernah dieksekusi. Perubahan prosedur
setelah freeze memerlukan revisi bertanda dan rerun hanya kartu terdampak.
Kartu negatif dengan prompt tetap (`MAN-08/09`) langsung dibekukan di 10.0.

Laporan `docs/phase-10/manual-results.md` berisi per kartu: ID, prompt persis,
versi/hash plugin, referensi chat, tool terpilih, hasil aktual, state aman
(misalnya public ID atau jumlah baris), `PASS/FAIL/PENDING`, dan catatan
reviewer. Argumen/result penuh hanya disimpan bila diperlukan dan teredaksi.
Tunjukkan link Issue/PR dan ringkasan bukti, bukan token atau konten pribadi
yang tidak diperlukan. Bukti dari Inspector/server saja tidak menggantikan
penggunaan plugin terpasang di ChatGPT.

## 5. Checkpoint 10.0 — Preflight host dan prosedur kartu

**Scope:** baca-saja, dokumen dan pembuktian transfer, tanpa koneksi baru,
OAuth, instalasi paket atau write bisnis. CR-028 berlaku.

1. Konfirmasi runbook, CR-027, Phase 9 audit/gate dan baseline `main`.
   Gunakan satu branch dan satu draft PR; status tracker In progress.
2. Buktikan dari UI akun pemilik bahwa formulir pembuatan custom MCP private
   tersedia dan OAuth dapat dipilih. Bedakan UI form dari koneksi,
   entitlement write, approval, dan keberhasilan write. Bukti izin tool
   write **dipindah ke gate pertama 10.1** dan tidak diperlukan untuk PASS
   10.0.
3. Buktikan **jalur transfer/ingestion**, bukan instalasi akhir: unduh
   artifact GitHub Actions dari run SHA yang lulus, periksa isi dan hash,
   identifikasi pemegang akses unduh serta akses upload/private plugin
   melalui Plugin Creator yang menerima ZIP/tar.gz. Tidak mengunggah atau
   memasang arsip kandidat. Final `mcp.json`, versi/hash final, dan hasil
   instalasi hanya dapat diuji pada 10.2.
4. Bekukan prosedur, langkah, expected/forbidden tool, guardrails,
   checkpoint persetujuan dan recovery untuk `MAN-01..MAN-09` sebagai
   template `procedure-v1`; simpan prompt tetap `MAN-08/09`.
   `MAN-10..11` tetap opsional post-MVP. **Tidak meminta semua nilai
   Page, konten, atau jadwal pada 10.0**. Nilai disetujui dan prompt
   executable dibekukan tepat sebelum kartu yang memakainya.
5. Siapkan evidence ledger, risiko residual, dan workflow CI ringan
   yang memeriksa perubahan relevan pada SHA HEAD. Gunakan bukti gate
   berat Phase 9 selama backend/security/deployment SHA tidak berubah.

**PASS 10.0 bila:** form custom MCP/OAuth terbukti pada UI owner; jalur
artifact Actions ke penerima paket PRIVATE di akun owner dibuktikan
(download, hash, host intake), prosedur dan kontrol sembilan kartu beku,
runbook/CR/Issue/PR/tracker konsisten, CI ringan SHA final PASS, dan tidak
ada OAuth, instalasi, koneksi baru atau business write. **Tidak
mensyaratkan** izin write, plugin final terpasang, atau data Page sebelum
10.1/10.2/10.3. Jika bukti tersebut tidak ada, beri BLOCKED spesifik.

## 6. Checkpoint 10.1 — No authentication, fixed pilot dan tiga read

**Scope:** adaptasi existing production MCP, satu koneksi plugin PRIVATE
ChatGPT tanpa autentikasi pengguna, tanpa bisnis write ataupun final package.
CR-032 mengesampingkan gate owner OAuth CR-028/031 untuk koneksi ini.

1. Verifikasi SHA HEAD PR #23, catat CR-032 dan risiko endpoint publik **sebelum**
   mengubah source. Buktikan lewat tes terfokus bahwa Edge-only DB connection,
   `SET LOCAL ROLE authenticated` dan claims server-side membatasi satu
   workspace pilot lewat RLS; `anon` tidak mendapat grant langsung pada
   33 RPC, tabel, sequence atau helper. Bila identitas gagal, STOP.
2. Pertahankan exactly 33 MCP tool/RPC, dengan `create_page` terdaftar,
   descriptor tanpa OAuth, input schema tertutup, dan read-only adapter
   profile yang mengembalikan public workspace id. Semua mutasi server-blocked
   pada 10.1. Jalankan tes terfokus, `pnpm run check`, dan CI ringan.
3. Jalankan **tepat satu** gate CR-020 lengkap pada SHA final; bila Actions
   lama, catat URL/SHA dan STOP sampai `lanjutkan` untuk memeriksa run yang
   sama. Deploy hanya setelah PASS ke project production Phase 9 yang sama,
   bukan MCP demo atau project baru. Verifikasi secret tetap di Edge saja.
4. Pemilik membuat **satu** koneksi/plugin PRIVATE dengan **No authentication**
   ke URL production `mcp` yang ada. Katalog ChatGPT harus menampilkan tepat
   33 tool unik termasuk `create_page`; gunakan hanya tiga tool baca
   `get_account_profile`, `get_workspace_context`, dan `list_pages`.
   Catat hasil aktual dan jumlah bisnis row/ledger tetap. Jangan menjalankan
   write meskipun host menyediakannya.

**PASS 10.1 hanya bila:** gate final SHA dan deployment PASS, host private
No authentication membuktikan 33 tool serta ketiga read, tanpa write bisnis.
Bukti local/Inspector/HTTP terpisah bukan bukti host ChatGPT. Jika hosting
atau konektor tidak bisa menjalankan salah satu tahap, beri satu tindakan
manual yang jelas, tandai PENDING dan berhenti di 10.1; jangan mulai 10.2.

## 7. Checkpoint 10.2 — PRIVATE final package via registered mcpku

**Status:** v0.2.0 ZIP source passed CI but installed as desktop-only;
owner Chrome proved it was absent from Work web chat selector, while existing
registered `mcpku` was selectable. CR-036 corrects the **packaging contract**
without touching the unchanged No-auth production backend.

1. Use the **same** installed PRIVATE `Content Producer` plugin identity.
   In portable root `plugin.json` declare
   `extensions.com.openai.apps = "./.app.json"`; map one required alias
   `content-producer` to the existing registered ChatGPT MCP ID
   `asdk_app_6ad4ef8b42588191a749b8b9f356b662`. The ID is an app
   locator, not credential. No `mcp.json` or `.mcp.json` in the new source
   archive. Remove those stale files from the previous installed release
   during guarded Plugin Creator **update**, not create. Registered MCP
   `mcpku` remains No authentication with fixed-workspace public reads and
   server-blocked write calls. Do not create additional connections.
2. Manifest v0.2.1, one skill and ten references stay in a 13-file strict
   allowlist. Validate exact mapping and rejecting alternate/optional IDs,
   no bundled remote MCP, path safety, frozen 33 names, source links, secrets,
   ZIP entries, extracted bytes and SHA-256. Run focused tests and
   `pnpm run check` only; allow lightweight CI at the new SHA. Reuse
   backend SHA `14d4955e07a55d0d5040e647d210ddab5ca282cd` and
   [full CR-020 PASS #39142242292](https://github.com/milyarderpro/content-producer/actions/runs/39142242292);
   do not repeat `test-all`, deploy or change production.
3. After CI PASS and final ZIP SHA-256 recorded, use Plugin Creator
   `update_plugin` against the **existing** PRIVATE release with its
   exact ID and release precondition. If upload/host mapping fails, record
   the **exact error** and leave 10.2 PENDING; do not install a duplicate.
   Read back installed version and preserved PRIVATE identity.
4. Owner opens a **fresh ChatGPT Work web conversation**, selects only
   final `Content Producer` plugin (registered `mcpku` is a dependency,
   not an additional selected plugin), proves skill `content-producer`
   and 33 MCP tools together including `create_page`, and performs only
   `get_account_profile({})`, `get_workspace_context`, `list_pages`
   on the fixed existing pilot workspace. Record 11 Read + 22 Write tools,
   3/3 read results and source plugin/release. **Then** check plugin
   selection/read usability from ChatGPT mobile. No Write tool invocation.

**10.2 PASS only when final package is truly usable outside desktop,
skill+MCP actually work together, exactly 33 tools and three reads succeed,
and evidence is recorded in Issue #22/PR #23.** A valid ZIP or installed
version alone is not sufficient. Keep PR draft and do not begin 10.3 here.

### 10.2 signoff — 2026-10-19: PASS

Owner confirmed v0.2.1 works in ChatGPT Work web and the phone's web
browser (native mobile app not tested). Fresh web chat used the installed
skill and registered mcpku's 33 tools together: 3 Read PASS, 0 Write.
Plugin Creator verified v0.2.1, PRIVATE and the same release ID.
Final ZIP/hash and CI proof are recorded in Issue #22 and PR #23.
The public No-auth read risk remains; 10.3–10.7 and 14 MVP ACs are PENDING.


## 8. Checkpoint 10.3 — `MAN-01..MAN-02`: aktivasi dan Page

Jalankan prosedur beku dengan prompt persis yang diikat dari data nyata tepat
sebelum tiap kartu. Sebelum MAN-02, tampilkan seluruh payload Page baru
termasuk config, zona waktu, market dan make_default; dapatkan persetujuan
owner atas payload persis sebelum satu-satunya write `create_page`. `MAN-01` membuktikan pemilihan plugin,
identitas owner, dan pembacaan Page pilot Phase 9 yang sudah ada. `MAN-02`
membuat **satu Page
tambahan** dengan konfigurasi trivia yang disetujui; gunakan `create_page`
melalui koneksi fixed pilot yang diotorisasi untuk MAN-02, baca kembali Page/config, dan pastikan Page Phase 9 tetap
ada. Jangan membuat Page kedua jika respons write hilang: periksa state dan
replay dengan operation key/payload yang sama. Catat public ID dan jumlah
Page setelahnya tanpa menyimpan token.

**PASS bila:** kedua kartu lulus, tepat satu Page tambahan dibuat, config dan
owner sesuai, tidak ada duplicate write atau perubahan pada Page lama.
Syarat `AC-002` bahwa **minimal tiga Page dapat dibuat dengan konfigurasi
berbeda** dibuktikan secara deterministik di database/CI terisolasi, bukan
dengan menambah Page production ketiga untuk uji. Rujuk tes yang benar-benar
menjalankan tiga Page, pilihan `fixed`/`adaptive`, dan variasi reuse scope;
bila belum ada, tambahkan tes
terfokus dan biarkan bukti `AC-002` `PENDING` sampai lulus.


**Hasil implementasi 10.3 (19 Oktober 2026): PASS, bukan Pilot-ready.**
MAN-01 lulus melalui tiga pembacaan langsung plugin; MAN-02 lulus setelah
satu Page tambahan `corious facts` (ID
`37457236-17ec-4486-8880-6832460ae411`) dibuat dengan payload yang
disetujui, terbaca kembali dengan config trivia v1 yang benar, dan Page
Phase 9.5 tetap ada. Total dua Page aktif dan tidak ada duplikasi.
Full gate teknis/keamanan backend
[#39234992064](https://github.com/milyarderpro/content-producer/actions/runs/39234992064)
PASS pada SHA `6f104747f3414d7b9066749035c1ccf23f54ce0a`;
tes tiga Page dengan konfigurasi berbeda dan replay ledger lulus di
lingkungan terisolasi. Pemilik mengonfirmasi penghapusan secret write
sementara. **Batas bukti audit 10.7:** inventaris secret tidak terbaca
independen, dan ledger production tidak dibaca langsung setelah write
karena kontrol koneksi menolak query tersebut. Tidak ada kewajiban eksplisit
dua pembacaan independen itu untuk PASS checkpoint 10.3; jangan mengklaim
bahwa keduanya telah diperiksa. PR #23 tetap draft; 10.4–10.7 dan 14 AC
MVP tetap PENDING.

## 9. Checkpoint 10.4 — `MAN-03..MAN-04`: draft dan editorial

Pada Page baru, minta pilihan owner tentang topik, sumber dan batas editorial
tepat sebelum MAN-03, lalu ikat dan bekukan prompt kartu terkait. Jalankan
prompt itu untuk penelitian trivia yang bersumber,
pemeriksaan kemiripan, reservasi, `save_post`, dan pembacaan kembali draft
(`MAN-03`). Sumber eksternal diperlakukan sebagai data tak tepercaya; fakta
yang tidak dapat diverifikasi tidak dipaksakan menjadi konten. Lalu uji satu
revisi dengan CAS, tampilkan hasil quality check, dan lakukan approval **hanya
setelah owner meninjau versi tepat yang disetujui** (`MAN-04`). Bila quality
check memblokir, post tetap draft; jangan memakai waiver tanpa dasar kontrak.
Penolakan approval pada bukti blocking harus dirujuk ke tes MCP/RPC
deterministik; keberhasilan approval satu post tidak membuktikan cabang
penolakan. Tidak perlu sengaja membuat post gagal atau approval palsu di
production.

**PASS bila:** draft tersimpan dan dapat diambil, provenance tersedia, revisi
tidak menimpa state lama secara diam-diam, approval merujuk konten terkini,
serta tidak ada bypass quality gate.

## 10. Checkpoint 10.5 — `MAN-05..MAN-06`: plan dan chat baru

Dengan Page yang sama, buat satu content plan kecil dengan slot internal
yang disetujui owner (`MAN-05`). Tampilkan item/jadwal persis; jangan
mengartikan penjadwalan internal sebagai publikasi Facebook terjadwal.
Mulai percakapan ChatGPT **baru** dan temukan kembali plan atau post melalui
plugin (`MAN-06`), bukan mengandalkan memori chat sebelumnya. Jangan membuat
plan kedua akibat hasil yang terlambat; gunakan ledger/replay yang benar.

**PASS bila:** plan tersimpan dengan item/slot yang benar, retrieval pada
percakapan baru berhasil, dan tidak ada duplikasi plan atau klaim background
worker. `AC-007` menuntut batch **minimal tujuh post** dan `AC-008` kalender
**tujuh hari**; plan pilot kecil ini tidak membuktikan kedua ambang tersebut.
Rujuk tes deterministik local/CI yang mencakup jumlah, slot, progres, dan
resume. `AC-007` memerlukan tujuh **post yang diproses**, bukan hanya tujuh
plan item; `AC-008` memerlukan tujuh hari dengan slot benar. Tambah tes
terfokus bila belum ada. Tandai ambang `AC-007/008`
`PENDING` sampai bukti aktual tersedia, tanpa membuat tujuh post production
sekadar untuk mengisi kuota uji.

## 11. Checkpoint 10.6 — `MAN-07..MAN-09`: copy dan batas aman

`MAN-07`: tampilkan teks copy-ready dari post yang disetujui, sumber internal,
dan hasil tinjauan editorial owner. Owner boleh menyalin ke Canva/Facebook,
tetapi publikasi nyata tidak diwajibkan. `MAN-08`: jalankan prompt ambigu
yang dibekukan dan pastikan plugin meminta klarifikasi **tanpa write**.
`MAN-09`: minta auto-publish yang tidak didukung dan masukkan instruksi
berbahaya sebagai **teks sumber uji**, lalu pastikan tidak ada tool publikasi,
`mark_post_posted`, atau write tak diminta dan tidak ada klaim bahwa publikasi
terjadi. Bandingkan state/ledger sebelum dan sesudah `MAN-08/09`; tidak adanya
tool call yang terlihat saja belum cukup untuk membuktikan nol write. Jangan
memakai konten berbahaya sebagai instruksi operator.

**PASS bila:** output lolos review owner tanpa pembersihan wajib, dua kartu
negatif tidak menghasilkan write/claim terlarang, dan `MAN-01..MAN-09` kini
semuanya mempunyai evidence aktual.

## 12. Checkpoint 10.7 — Penutupan dan audit independen

1. Cocokkan laporan sembilan kartu dengan versi/hash plugin final, backend
   deployment SHA, Page/post/plan state, dan gate Phase 9 yang masih berlaku.
   Periksa tidak ada defect keamanan/integritas critical atau high. Catat
   risiko residual: dua OAuth client uji, Security Advisor WARN yang telah
   ditinjau, serta batas backup/restore; jangan klaim selesai atau cabut
   client tanpa keputusan pemilik.
2. Lengkapi `docs/phase-10/acceptance-evidence.md` untuk `AC-001..AC-014`
   dengan bukti atau `PENDING` yang jujur. Bedakan bukti manual production
   dari tes deterministic local/CI dan pekerjaan Phase 11. Secara khusus,
   dua Page production tidak membuktikan ambang tiga Page `AC-002`, dan
   plan kecil tidak membuktikan tujuh post/hari `AC-007/008`.
   Bukti lifecycle posted dan metrics/insights berasal dari tes deterministik
   berfixture sintetis di local/CI, bukan post/metric palsu di production.
   `MAN-10..MAN-11` dicatat `DEFERRED — POST-MVP`.
3. Minta audit independen atas PR, paket terpasang, sembilan kartu, bukti
   teknis/hosted, dan state production. Implementer tidak menandatangani
   audit sendiri. Perbaiki temuan pada branch/PR yang sama, ulangi hanya
   tes/kartu yang terdampak, lalu audit ulang perubahan tersebut.
4. Setelah audit PASS, merge PR dan sinkronkan tracker/Issue. Jika merge
   mengubah bytes paket, instal dan verifikasi lagi paket tepat yang dinyatakan
   final; dokumen merge saja tidak memerlukan ulang sembilan kartu.

**PASS Phase 10/Pilot-ready bila:** koneksi dan plugin private final bekerja,
sembilan kartu `MAN-01..MAN-09` PASS, gate Phase 9 atau gate backend pengganti
valid, tidak ada critical/high security atau integrity defect, dan audit
independen menyetujui. `MVP Complete` tetap menunggu Phase 11, bukan
`MAN-10..MAN-11` atau 101 prompt live.

## 13. Pemulihan dan titik berhenti

- Form custom MCP/OAuth atau jalur artifact ke intake private tidak tersedia:
  hentikan pada 10.0. Jika setelah koneksi/OAuth tool write atau cara meminta
  approval tidak dapat dibuktikan tanpa write, hentikan **10.1** sebelum
  membaca data owner lain atau membuat paket. Putuskan host/akun dengan
  owner, jangan melewati plugin melalui API admin.
- OAuth salah owner, tool count bukan 33, scope terbuka, secret tampak, atau
  unauthorized write: nonaktifkan koneksi/plugin sementara dan selidiki
  sebelum melanjutkan.
- Error write atau timeout: baca state/ledger dan replay hanya operation key
  serta payload semula. Jangan membuat key baru sampai hasil sebelumnya jelas.
- Sumber fakta meragukan, quality check blocking, jadwal tidak jelas, atau
  permintaan ambigu: berhenti pada item terkait dan minta keputusan owner.
- Perbaikan backend/security: bekukan SHA baru, gate penuh, deploy, lalu ulangi
  host/card yang terdampak; jangan memakai bukti SHA lama sebagai PASS.
- Defect plugin-only: jalankan tes terfokus, buat paket baru, pasang versi itu,
  dan ulangi kartu yang terkena. Jangan reset production untuk membuat uji
  bersih.
- Bila pilot harus dihentikan, nonaktifkan plugin/koneksi atau batasi akses
  sesuai insiden; data owner yang sudah dibuat dipertahankan untuk audit dan
  diperbaiki melalui alur produk. Tidak ada reset/SQL destruktif tersirat.

## 14. Referensi host pada saat rencana ditulis

- [OpenAI — Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt)
  menjelaskan urutan custom MCP dahulu, paket/skill kemudian, dan uji chat
  terpasang.
- [OpenAI — Package your plugin](https://developers.openai.com/plugins/build/plugins)
  menjelaskan manifest portabel dan `mcp.json`; format host harus diperiksa
  kembali sebelum 10.2.
- [OpenAI — Connecting custom MCP servers in ChatGPT](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)
  menjelaskan kebijakan akun/workspace yang dapat berubah. Bukti UI akun
  pemilik pada 10.0, bukan asumsi PRD lama, menentukan kelayakan jalur ini.

## 15. Checkpoint 10.1 — final host acceptance, 18 Oktober 2026

**10.1 PASS (CR-032/CR-033/CR-034), bukan Phase 10 Complete atau MVP
Complete.** Owner berhasil membuat dan menyambungkan satu custom MCP
**PRIVATE** di ChatGPT bernama `mcpku`, menggunakan **No authentication** dan
production URL `https://xjonnilnypchtxogtopb.supabase.co/functions/v1/mcp`.
Tangkapan layar dari UI owner memperlihatkan `Write 22` dan `Read 11` =
**33 tools**. Ketersediaan nama `create_page` diverifikasi juga lewat
registri tool langsung pada koneksi `mcpku`. Menampilkan tool Write **tidak**
memberi izin mengeksekusi RPC write: pilot latch tetap default CLOSED.

Pemulihan dari error ChatGPT `400 apps_sdk_error / mcp_validation` pada
`mark_post_posted` didokumentasikan oleh CR-034: hanya metadata katalog
No authentication mengganti tiga pola `\\p{Cc}` dengan rentang Unicode
control equivalent, tanpa mengubah validator RPC/Zod atau domain contract.

Bukti keamanan dan backend final:

- [Full CR-020 gate #39142242292 SUCCESS](https://github.com/milyarderpro/content-producer/actions/runs/39142242292)
  pada source SHA `14d4955e07a55d0d5040e647d210ddab5ca282cd`,
  attempt 1, tanpa rerun.
- Supabase production project tetap `xjonnilnypchtxogtopb`, Edge Function
  `mcp` **v11 ACTIVE**, hash
  `4b7b72da2e30ae3895b7b00e2eb6434a189b78aa2174e1807822bb9dae4fea2b`,
  `verify_jwt=false` sesuai No authentication.
- [Remote read-only hosted verification #39143625413 PASS](https://github.com/milyarderpro/content-producer/actions/runs/39143625413):
  initialize/tools/list keduanya HTTP 200; 33 nama tool unik termasuk
  `create_page`, 177/177 schema regex portabel, ukuran katalog 99.975 byte.
- **Bukti nyata di host ChatGPT menggunakan plugin terpasang `mcpku`:**
  `get_account_profile({})` **PASS**, mengembalikan profil owner-scoped dan
  `workspace_public_id`; `get_workspace_context` **PASS**, mengembalikan
  satu workspace dengan modul `trivia` aktif; `list_pages` **PASS**,
  mengembalikan tepat satu existing pilot Page `phase-9-5-pilot-trivia`.
  Ketiga pemanggilan dilakukan melalui connector `mcpku`, bukan SQL
  administrator atau fixture. Tidak ada tool write dipanggil.
- Pemeriksaan production setelah 3 live reads: **1 Page / 1 konfigurasi /
  1 operation ledger / 0 post / 0 plan / 0 trivia fact / 0 metric**.
  Tiga read dapat mencatat aktivitas rate limiter internal, tetapi tidak
  menulis data bisnis.

**Batas status:** Risiko endpoint publik No authentication yang dapat
membaca workspace pilot tunggal tetap **OPEN**; RLS/fixed identity tidak
mengautentikasi setiap pemanggil HTTP. Seluruh 14 MVP acceptance criteria
`AC-001..014` tetap **PENDING**. Paket final/skill serta manifest dan
pemasangan Phase 10.2 **BELUM DIKERJAKAN**, `MAN-01..MAN-09` tetap NOT RUN,
first business write `MAN-02` hanya setelah approval payload persis owner,
10.3–10.7 belum dimulai. Draft PR #23 tetap terbuka dan tidak di-merge
sebelum audit independen 10.7.
