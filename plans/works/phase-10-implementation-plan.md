# Phase 10 — Koneksi ChatGPT, plugin final, dan pilot: runbook implementasi

**Status:** Phase 9 `Complete`; Phase 10 `In progress`; 10.0–10.3 PASS, 10.4–10.7 PENDING. Current connection: PRIVATE Content Producer v0.2.2 → owner OAuth `mcpku2` (CR-042..CR-045). Sections describing No authentication record earlier checkpoint history, not current execution instructions.
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

**Historical 10.1–10.3:** CR-032 temporarily selected a PRIVATE
No-auth/fixed-pilot connection to the production `mcp` URL. That route
used server-fixed pilot identity, exposed reads to anyone knowing the URL,
and required default-absent, exact-payload grants for business writes.
CR-037/038 describe permits for that historical mode. Preserve its test
and MAN-01/02 results as historical evidence, never as the current
authentication or grant procedure.

**Current host acceptance (CR-042..CR-045, 20 October 2026):** production
`mcp` v29 defaults to owner OAuth. Backend SHA
`6a8c42d8a3ffb846b8bd92663dbfbdbc9cc22e92` passed
[CR-020 gate #39372282908](https://github.com/milyarderpro/content-producer/actions/runs/39372282908).
The existing PRIVATE Content Producer plugin was updated in place to
v0.2.2, release `pluginrel_6ad708422a988191afc09772ee7eb261`,
with one required `mcpku2` OAuth binding. Package/docs SHA
`31cb86a3e528bdb599f96078c1ca08edb85c6f0b` passed
[light CI #39379688115](https://github.com/milyarderpro/content-producer/actions/runs/39379688115).
The plugin page displayed 33 tools (11 Read, 22 Write); a chat launched
from that page showed `@Content Producer`, `Used mcpku2`, and successful
`get_account_profile`, `get_workspace_context` and `list_pages`.
The app-specific host setting is `ask_before_writes`. This is read-only
host acceptance, not evidence of a live OAuth business write. No second
plugin, login loop, fixed-pilot grant, or full gate rerun is needed for
unchanged backend source.

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
  teknis. Pemilik mempertahankan koneksi owner OAuth `mcpku2` dan plugin PRIVATE v0.2.2,
  menjalankan prompt kartu yang telah dibekukan, memberi data Page dan
  persetujuan editorial. Jangan meminta password, token, authorization code,
  client secret, service key, atau isi cookie di chat/Issue/PR/log.
- Jalankan tes terfokus untuk perubahan yang terjadi. Setelah perubahan
  TypeScript atau konfigurasi, jalankan `pnpm run check`. Untuk perubahan
  paket/skill saja, validasi paket, tes skill/MCP yang relevan, dan kartu
  manual yang terdampak. CR-044: selama pengembangan cukup `check` dan tes
  terfokus; jangan gate penuh per commit percobaan. Setelah satu reset lokal,
  gate penuh menjalankan OAuth/owner dan Inspector lebih dulu, baru suite
  database panjang; seluruh audit CR-020 tetap wajib. Perubahan migration,
  RLS, privilege, identitas/otorisasi owner, izin write, atau logika bisnis
  RPC memerlukan **satu gate penuh pada kandidat final** sebelum deploy.
  Perubahan transport MCP terbatas tanpa perubahan keputusan izin memakai
  tes protokol/keamanan terfokus. Dokumentasi atau paket plugin saja memakai
  CI ringan. Bukti gate backend boleh digunakan kembali bila kode backend,
  migration, konfigurasi keamanan, dan dependensi runtime yang dideploy
  tidak berubah; catat SHA backend dan SHA dokumentasi/paket secara terpisah.
  Jangan memicu gate penuh hanya karena commit dokumentasi.
- Jika Actions lama, catat URL, SHA, dan `PENDING` lalu berhenti memantau.
  Saat pemilik meminta "lanjutkan" pada task yang sama, periksa run yang sama;
  jangan memulai run pengganti tanpa alasan konkret.
- Jika plugin metadata/tool schema berubah, refresh koneksi dan uji ulang
  kartu yang terkena sesuai
  [panduan OpenAI](https://developers.openai.com/plugins/deploy/connect-chatgpt).
  Catat source SHA, hash paket final, dan versi terpasang. Paket yang diuji
  harus sama dengan paket yang dinyatakan final.
- Koneksi OAuth owner `mcpku2` sudah ada dan teruji. Jangan membuat
  koneksi/plugin tambahan atau meminta login ulang tanpa error autentikasi
  aktual. Untuk perubahan Auth policy, token claim hook, middleware,
  RLS, atau security config backend, lakukan review dan gate penuh pada
  SHA rilis baru, lalu verifikasi hosted. Pembaruan dokumen/paket saja
  memakai light CI dan gate backend SHA yang tidak berubah.

## 4. Batas tindakan dan evidence

10.1 melarang write bisnis dan kini mempunyai bukti OAuth owner
read-only. Untuk MAN-03 dan kartu berikutnya, gunakan hanya plugin
PRIVATE `@Content Producer` v0.2.2 dengan app OAuth `mcpku2`.
Permintaan OAuth berjalan sebagai owner yang diverifikasi; fixed-pilot
`pilotMode` tidak aktif. Grant sementara CR-037/038 hanya berlaku pada
jalur fixed-pilot dan **tidak diperlukan atau dibaca** oleh jalur OAuth.
Jangan meminta pemilik mengaktifkan/mencabut grant tersebut untuk
kartu OAuth. Tetap minta keputusan owner untuk cakupan tindakan bisnis
dan biarkan host meminta persetujuan sebelum write.

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

## 6. Checkpoint 10.1 — koneksi MCP (PASS; riwayat dan keadaan kini)

CR-032 No-auth/fixed-pilot menghasilkan PASS historis pada 18 Oktober.
CR-042 menggantinya untuk penggunaan saat ini. Setelah CR-043/044,
backend OAuth v29 lulus gate #39372282908 pada SHA
`6a8c42d8a3ffb846b8bd92663dbfbdbc9cc22e92`.
ChatGPT menampilkan 33 tool dan tiga read owner berhasil melalui
`mcpku2`. Jangan mengulang pemasangan koneksi atau grant fixed-pilot
untuk melanjutkan kartu Phase 10.

## 7. Checkpoint 10.2 — paket PRIVATE (PASS; v0.2.2 kini aktif)

CR-036 mengantar paket v0.2.1 yang dahulu memakai `mcpku`
No authentication; itu adalah bukti historis 10.2. CR-045 memperbarui
**plugin PRIVATE yang sama** ke v0.2.2 dengan satu required app
`content-producer` → `mcpku2` OAuth, tanpa `mcp.json` atau secret.
[Issue #22](https://github.com/milyarderpro/content-producer/issues/22#issuecomment-6285034464)
mencatat readback release, 33 tool, tiga read, dan parent-plugin
`@Content Producer` yang teramati. Instalasi paket, koneksi, dan
tiga read tidak perlu diulang selama versi dan binding tidak berubah.
Keberadaan 22 tool Write dan pengaturan `ask_before_writes` tidak
membuktikan satu pun write telah berhasil. MAN-03/04 tetap PENDING.

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

**Current MAN-03/04 handoff (CR-038 historical permit, CR-042..045 OAuth):**
Owner has chosen Moon phases / `nature_science` /
`single_subject_fast` / `fast_trivia`, preferably seven distinct
verified claims (not a quota), `follow`, English US, NASA source
checks and draft-only side effects. This is content direction, not
approval to publish or to approve an unseen draft. Under the current
OAuth path, `pilotMode=false`; the default-absent CR-038 grant check is
not executed. No manual grant activation/revocation script is part of
the OAuth procedure. Existing focused and full backend gate evidence
is reusable while backend source and security configuration remain
unchanged.

Immediately before any MAN-03 reservation, confirm the installed
v0.2.2 OAuth plugin, owner workspace, target `corious-facts` Page,
current zero-or-known draft state, and a fresh
`get_page_generation_context`. Pass its `config_updated_at` text
**exactly, including six microsecond digits**; never round-trip it
through JavaScript `Date` or reuse a stale value. Verify each
source/claim and similarity result. Compile one exact owner-approved
draft-only prompt and stable operation keys; run at most one logical
reserve followed by one logical `save_post`, then read the draft back.
If a response is lost, reconcile state and replay only the identical
key/payload; if the context changed or a claim is uncertain, stop
without creating replacement keys. The earlier
`FACT_RESERVATION_CONTEXT_CHANGED` failure remains historical:
the actual failed v25 arguments were unavailable, while isolated DB
tests showed complete `.018070Z` accepted and truncated `.018Z`
rejected. Do not claim its original cause was proven.
MAN-04 requires a separate review of persisted copy, sources, checks,
revision and content hash before any revision or approval.

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

## 15. Historical No-auth host acceptance, 18 Oktober 2026 (superseded for current operation)

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

## 16. OAuth recovery and current handoff — 20 Oktober 2026

CR-042/043 restored protected-resource discovery and owner workspace
resolution. Backend SHA `6a8c42d8a3ffb846b8bd92663dbfbdbc9cc22e92`
passed the full CR-020 gate #39372282908 and is deployed as active
Edge `mcp` v29. CR-044 permits reuse of that gate for unchanged backend
source, migrations, runtime dependencies and security configuration.
CR-045 updated the same PRIVATE plugin to v0.2.2 on package/docs SHA
`31cb86a3e528bdb599f96078c1ca08edb85c6f0b`; light CI
#39379688115 passed. The host showed the parent `@Content Producer`
selection, required `mcpku2` connection, 33 tools and three successful
owner reads. Host permission is `ask_before_writes`; an OAuth business
write has not yet been proven.

**Next executable checkpoint:** 10.4 / MAN-03, then MAN-04. Use the
OAuth plugin and the exact owner-directed card boundaries above.
Do not perform a fixed-pilot grant ritual or retry the historical
No-auth failed operation. Refresh generation context, preserve the
full timestamp and use one approved draft-only operation sequence.
Record its actual result before any MAN-04 revision or approval.
No new backend full gate, deployment, plugin upload or OAuth login
is required solely to start this unchanged-backend card.
