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

**Langkah pertama setelah koneksi private dan OAuth owner dibuat pada 10.1:**
periksa tanpa write apakah registry host menampilkan tool mutasi, termasuk
`create_page`, dan apakah izin/approval untuk tool write bisa diberikan.
Periksa metadata `readOnlyHint: false`, izin host, dan affordance approval
yang tersedia; metadata atau kebijakan default saja tidak membuktikan
entitlement. Jangan memanggil tool write demi menampilkan dialog approval,
termasuk dry-run. Jika tidak dapat dibuktikan tanpa invocation, hentikan 10.1
dengan diagnosis spesifik, tanpa lanjut read umum atau membangun paket.
Setelah lulus, barulah cek 33 tools dan tiga owner read seperti biasa.

Jika write terbukti tidak tersedia pada akun yang terhubung, 10.1 harus
`BLOCKED`, bukan 10.0 yang hanya menilai formulir dan delivery. Pilihan host
berbeda atau perubahan kontrak memerlukan keputusan owner. Tidak ada
kewajiban menaikkan paket tanpa bukti account-specific.

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
  teknis. Pemilik melakukan login/consent di akunnya, mengaktifkan plugin,
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
- Registrasi OAuth client khusus koneksi ChatGPT memakai policy backend yang
  sudah dirilis: catat client, redirect persis, scope, dan uji OAuth/owner
  hosted secara terfokus. Jika setup itu memerlukan perubahan Auth policy,
  token claim hook, middleware, RLS, atau security config backend, perlakukan
  sebagai perubahan keamanan: review, gate penuh pada SHA rilis baru, lalu
  verifikasi hosted. Jangan menyebut registrasi client saja sebagai bukti
  bahwa kebijakan akses berubah atau gate lama otomatis tidak berlaku.

## 4. Batas tindakan dan evidence

Hanya MCP dengan identitas owner yang sah boleh melakukan write bisnis.
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

## 6. Checkpoint 10.1 — Custom MCP, OAuth owner, dan gate write read-only

**Scope:** koneksi langsung dan OAuth private owner, lalu pemeriksaan
kemampuan write **tanpa mengeksekusi write**; semua tes bisnis read-only.

1. Verifikasi URL HTTPS dan discovery OAuth production. Tambahkan custom MCP
   secara private menurut UI resmi. Jika host memerlukan OAuth client baru,
   gunakan redirect dan metadata nyata, tidak menebak atau memakai kembali
   callback Vercel 9.5. Owner menyelesaikan login dan consent. Simpan
   rahasia hanya pada provider yang sesuai.
2. **Tindakan pertama segera setelah koneksi/OAuth:** inspeksi tools/list
   atau katalog koneksi, pastikan `create_page` dan tool write lain
   terekspos sebagai `readOnlyHint: false` serta izin/approval untuk
   write action bisa diminta melalui mekanisme host **tanpa memanggil tool
   mutasi**. Lihat konfigurasi perizinan dan controls UI bila ada; catat
   identitas koneksi yang aman. **Jika tool write hilang, dibatasi, atau
   approval tidak dapat dibuktikan tanpa write, STOP dengan satu diagnosis
   jelas; jangan lanjut baca profil atau membuat paket 10.2.** Jangan
   memicu approval melalui dummy payload, dry-run atau request write.
3. Hanya setelah gate write metadata/permission PASS, buktikan tepat
   33 nama tool dan `get_account_profile`, `get_workspace_context`,
   `list_pages` sebagai owner. Periksa Page pilot Phase 9, denial dari
   gate berlaku, dan tidak ada perubahan data. Catat koneksi host tanpa
   memasukkan ID koneksi atau token ke `mcp.json`.

**PASS 10.1 bila:** gate keberadaan tool write dan kesiapan approval
berhasil **tanpa eksekusi write**, OAuth owner dan 33 tool/ketiga read lulus,
tanpa kebocoran atau mutasi. Keberhasilan satu write nyata **bukan** gate
10.1; hanya di `MAN-02` setelah payload owner disetujui. Kegagalan gate
awal menghentikan Phase 10 sebelum 10.2.

## 7. Checkpoint 10.2 — Paket final dan instalasi private

**Scope:** konfigurasi paket, validasi, instalasi, belum write bisnis.

1. Hasilkan `plugin/mcp.json` dari URL/nama server yang terbukti di 10.1,
   memakai schema/generator Phase 7. Bandingkan format dengan
   [spesifikasi paket OpenAI](https://developers.openai.com/plugins/build/plugins)
   saat eksekusi. Konfigurasi OAuth portabel harus sesuai format yang didukung
   dan hasil handshake nyata; jangan menulis credential, ID koneksi host,
   atau placeholder. Jika generator/schema lama tidak cukup, perbaiki secara
   terfokus dan uji. **Source Phase 7 sekarang sengaja menolak `mcp.json`,
   tidak memasukkannya dalam allowlist paket, melarang URL endpoint dalam
   kandidat, dan validator/generator hanya menerima `type`/`url`.** Ubah
   validator, allowlist, pemeriksaan sensitif, generator dan tes secara
   terkendali untuk paket final: endpoint HTTPS publik yang terverifikasi
   boleh masuk `mcp.json`, sementara credential/query/token tetap ditolak.
   Jika host memerlukan deklarasi OAuth dalam paket, gunakan field schema
   resmi yang dibuktikan pada koneksi live; jangan menganggap `oauth.mode =
   discovery` pada input generator sebagai bukti auth paket. Catat change
   record bila kontrak frozen berubah.
2. Validasi manifest (termasuk `shortDescription` yang saat ini 45 karakter;
   panduan paket host membatasi subtitle, sehingga pendekkan sesuai batas
   host yang diverifikasi), semua
   referensi skill, exact 33 tool, allowlist isi paket, path safety, dan hash
   file. Naikkan versi manifest untuk paket final, bangun arsip sebagai
   artifact CI dari workflow Phase 10 yang dapat diambil melalui jalur 10.0,
   lalu verifikasi **isi
   arsip hasil**, bukan hanya source. Catat SHA-256 arsip dan daftar file.
   Paket tidak boleh berisi backup, dataset, secret, atau state lokal.
3. Instal arsip terverifikasi melalui jalur private yang dibuktikan pada 10.0;
   bila host tidak dapat menerima arsip/artifact itu, berhenti, bukan
   mengklaim paket terpasang. Mulai chat baru, pilih
   plugin, buktikan skill aktif dan tiga read owner tetap benar melalui paket
   terpasang. Cocokkan hash/versi terpasang dengan kandidat. Jika koneksi
   custom MCP 10.1 tampil sebagai plugin terpisah, jangan biarkan kedua plugin
   terpilih pada kartu manual; gunakan hanya paket final dan verifikasi bahwa
   satu koneksi MCP yang benar dipakai, baik melalui konfigurasi portabel
   maupun mapping terdaftar yang telah dibuktikan host.

**PASS bila:** paket final tervalidasi dan terpasang private, skill dan MCP
bekerja bersama, 33 tool tersedia, dan belum ada write bisnis. Koneksi custom
MCP saja belum memenuhi 10.2.

## 8. Checkpoint 10.3 — `MAN-01..MAN-02`: aktivasi dan Page

Jalankan prosedur beku dengan prompt persis yang diikat dari data nyata tepat
sebelum tiap kartu. Sebelum MAN-02, tampilkan seluruh payload Page baru
termasuk config, zona waktu, market dan make_default; dapatkan persetujuan
owner atas payload persis sebelum satu-satunya write `create_page`. `MAN-01` membuktikan pemilihan plugin,
identitas owner, dan pembacaan Page pilot Phase 9 yang sudah ada. `MAN-02`
membuat **satu Page
tambahan** dengan konfigurasi trivia yang disetujui; gunakan `create_page`
melalui OAuth owner, baca kembali Page/config, dan pastikan Page Phase 9 tetap
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
