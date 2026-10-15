# Phase 9 — Production deployment: runbook implementasi

Status: **rencana, belum dieksekusi**. Baseline dokumen adalah main setelah merge PR #6 (85a3778c82fdc0dddc2de7908dc21dee6a5c04ba). Catat ulang SHA main saat checkpoint 9.0 dimulai. Phase 8 tetap Deferred by CR-019; tidak ada E3/E4 atau 101 prompt live yang diklaim lulus.

## 1. Tujuan dan sumber kontrak

Phase 9 menyiapkan satu project Supabase production, frontend autentikasi minimal di Vercel, dan Edge Function MCP yang dapat diakses melalui HTTPS. Phase 9 membuktikan migration, Auth/OAuth, RLS/privilege, koneksi owner, penolakan tanpa autentikasi, dan pemulihan. Paket plugin ChatGPT final dan 11 kartu uji manual adalah Phase 10; pilot editorial dan MVP Complete tidak boleh diklaim dari deployment saja.

Urutan sumber kebenaran:

1. AGENTS.md; plans/PRD.md §29, §31–33; plans/implementation-plan.md Phase 9 dan §16.
2. docs/decisions/2026-10-15-phase-8-manual-acceptance-resequencing.md (CR-019) dan docs/decisions/2026-10-15-phase-9-10-risk-based-mvp-acceptance.md (CR-020).
3. plans/database-design.md, plans/tool-inventory.md, plans/acceptance-traceability.md, dan migration yang sudah di-commit.
4. Dokumen resmi Supabase dan Vercel yang berlaku pada hari eksekusi. Bila kontrak frozen berbenturan dengan perilaku platform, catat change record sebelum mengubah kontrak atau keamanan.

Pemilik memilih **Vercel** untuk frontend autentikasi. Ini pilihan deployment proyek, bukan kewajiban arsitektur PRD. Frontend hanya melayani login, OAuth consent/deny, logout, dan error aman; bukan dashboard. Browser hanya boleh menerima Supabase project URL dan publishable key, tanpa service-role key, password database, atau OAuth client secret.

## 2. Alur kerja, otorisasi, dan bukti

Kerjakan **satu checkpoint 9.x per task/chat** secara berurutan. Gunakan satu Issue Phase 9 untuk status dan evidence. Checkpoint 9.0–9.2 menyiapkan perubahan source pada branch Phase 9 dan draft PR menuju main; jangan melakukan cloud write pada tahap tersebut. Tinjau dan merge source/config/dokumen yang diperlukan sebelum gate 9.3. Gate dijalankan pada SHA main yang persis akan di-deploy. Bila perbaikan backend, migration, security config, atau dokumentasi kandidat mengubah SHA, jalankan tes terfokus untuk perbaikan dan gate penuh sekali lagi pada SHA baru. Setelah gate lulus, jangan mengubah kandidat sampai deployment. Laporan setelah deployment boleh di-commit terpisah dengan menyebut SHA backend yang benar-benar di-deploy.

Pekerjaan cloud 9.4 memerlukan target production yang telah diidentifikasi dan disetujui pemilik. Project bernama triviaku yang dahulu terlihat INACTIVE **bukan** otomatis project production. Jangan link, reset, apply migration, mengatur Auth/secret, atau deploy ke project apa pun sebelum identitas target, kondisi data, dan backup dipastikan. Jangan meminta pemilik menyalin password, token, atau secret ke chat, Issue, PR, log, atau repository.

Untuk setiap checkpoint, catat baseline/head SHA, file berubah, perintah dan exit code, durasi, tautan CI, hasil aktual, target project yang aman untuk dicatat (tanpa credential), risiko, dan pekerjaan tertunda. Jika Actions berjalan lama, catat run URL dan status PENDING lalu berhenti; periksa run yang sama ketika pemilik meminta lanjutkan. PENDING tidak berarti PASS.

## 3. Checkpoint 9.0 — Inventaris dan keputusan deployment

**Scope:** baca-saja dan perencanaan; belum membuat resource cloud.

1. Pastikan main memuat PR #6 dan working tree/branch awal bersih. Baca sumber kontrak di atas.
2. Petakan source yang akan dideploy: migration yang ada, schema api, fungsi MCP, konfigurasi verify_jwt, file auth-frontend yang saat ini baru README, dan workflow CI yang dapat dipakai ulang.
3. Inventaris project Supabase yang dapat diakses secara baca-saja. Untuk target yang dipilih pemilik, catat project ref, status, region, apakah kosong atau sudah berisi data, migration history, dan apakah pernah dipakai sebagai production. Jangan menganggap project lama aman berdasarkan nama.
4. Tetapkan satu target Supabase production dan satu akun/team Vercel atas keputusan pemilik. Catat siapa yang akan melakukan login, consent, penambahan konfigurasi, dan rollback.
5. Tentukan strategi export/backup sebelum perubahan bila ada data, cara memverifikasi hasilnya, urutan migration, serta titik berhenti bila kondisi remote berbeda dari source.
6. Buka Issue Phase 9 dan draft PR source. Ubah tracker §16 menjadi In progress hanya saat pekerjaan 9.0 benar-benar dimulai; belum menandai gate lulus.

**Selesai bila:** identitas target dan kondisi awal terdokumentasi, pilihan Vercel tercatat, jalur backup/rollback masuk akal, serta tidak ada tindakan remote yang mengubah state. Bila target belum pasti, 9.0 tetap PENDING; jangan menandai checkpoint berikutnya selesai.

## 4. Checkpoint 9.1 — Frontend autentikasi minimal

**Scope:** kode dan tes terfokus; tidak deploy.

1. Implementasikan frontend kecil di auth-frontend/ dengan rute /login, /oauth/consent, /logout, dan error aman. Gunakan build statis yang sesuai repository; kunci dependency dan lockfile. Jika memakai Vite, pastikan build/typecheck frontend sendiri terhubung ke pemeriksaan proyek karena tsconfig root saat ini tidak mencakup auth-frontend/.
2. Pertahankan authorization_id saat redirect ke login dan kembali ke consent. Tampilkan identitas client dan scope dari Supabase Auth; sediakan tindakan approve serta deny yang eksplisit. Jangan menyetujui otomatis.
3. Periksa validasi URL redirect, state error/expired request, logout, dan refresh langsung pada setiap rute. Bila SPA dipilih, sertakan fallback route pada konfigurasi Vercel dan uji bahwa /oauth/consent dapat dibuka langsung.
4. Pakai hanya project URL dan publishable key sebagai konfigurasi browser. Jangan masukkan secret ke `VITE_*`, `NEXT_PUBLIC_*`, source, bundle, atau CI artifact.
5. Uji route, pelestarian authorization_id, approve/deny, error state, dan ketiadaan secret. Jalankan pnpm run check setelah TypeScript/config berubah, serta build/typecheck frontend yang eksplisit.

**Selesai bila:** UI dan tes lulus secara lokal/CI ringan; belum ada URL Vercel production atau login production yang diklaim terbukti.

## 5. Checkpoint 9.2 — Siapkan deployment dan pemulihan

**Scope:** source, workflow, dan instruksi operator; belum cloud write.

1. Siapkan workflow gate teknis yang hanya memakai Supabase **lokal sementara** pada GitHub-hosted runner. Jangan menaruh kredensial production pada job tes.
2. Periksa versi Supabase CLI yang dipin serta output --help untuk perintah yang akan dipakai. Bekukan urutan deployment database dari migration source melalui CLI, dry-run/diff history, aturan menghentikan drift, dan audit katalog pascadeploy. Plugin Supabase dapat membantu inventaris, advisor, dan pemeriksaan hasil; jangan mengganti replay file migration dengan SQL ad hoc. Jangan mengedit migration lama atau menjalankan remote reset.
3. Tentukan cara men-deploy Edge Function dari source yang sama, termasuk seluruh dependency dan verify_jwt = false yang memang diwajibkan PRD agar discovery/challenge mencapai middleware. Pastikan middleware function tetap memvalidasi token, audience/resource, OAuth client, dan owner; flag ini bukan izin anonymous tools/call.
4. Siapkan petunjuk Vercel untuk pemilik: import repository GitHub, pilih Root Directory auth-frontend/, pastikan Production Branch main, periksa build/output sesuai implementasi 9.1, masukkan hanya URL Supabase dan publishable key ke environment Production, lalu catat domain HTTPS stabil. Jangan import atau deploy production sebelum gate 9.3.
5. Siapkan urutan pengaturan Supabase Auth: Site URL memakai origin Vercel, authorization path /oauth/consent, login owner, public signup disabled, OAuth client/redirect policy yang sesuai dokumentasi saat eksekusi, dan token success 2xx. Siapkan langkah verifikasi tanpa menyalin token ke laporan.
6. Buat checklist export/backup, rollback Vercel/function, dan forward-fix atau restore database. Siapkan format laporan yang mencatat SHA, migration history, advisor, URL, hasil OAuth, serta bukti redaksi secret.

**Selesai bila:** PR berisi semua source/config/runbook yang diperlukan, tes terfokus lulus, dan operator dapat mengeksekusi deployment tanpa menebak target, perintah, atau langkah pemulihan. Review PR sebelum merge.

## 6. Checkpoint 9.3 — Bekukan SHA dan jalankan satu gate penuh

**Scope:** merge kandidat yang sudah ditinjau, lalu verifikasi GitHub Actions; tidak ada production write.

1. Merge source kandidat ke main. Catat SHA main setelah merge sebagai satu-satunya kandidat deployment.
2. Pada SHA itu, jalankan gate GitHub Actions berurutan: install dari lockfile; satu clean reset Supabase lokal dari seluruh migration source; pnpm run test-all (termasuk check, validasi migration, MCP, database, dan tes frontend yang diintegrasikan); verifikasi source/applied migration; Security Advisor; audit katalog API RPC, 33 MCP tools, RLS dan privilege; MCP Inspector valid/invalid/auth untuk seluruh 33 tools; tes authenticated non-owner lewat server/RPC; git diff --check.
3. Simpan command, exit code, jumlah tes, SHA, durasi, dan artifact. Jangan menambahkan pnpm run smoke-test bila hanya mengulang suite database yang sudah dijalankan test-all.
4. Perbaiki defect dengan tes terfokus. Bila source/config/dokumen kandidat berubah, lakukan review/merge baru dan jalankan **satu gate penuh pada SHA baru**. Defect keamanan/data-integrity critical atau high menghentikan deployment.
5. Cocokkan artifact gate dengan SHA yang akan dipakai untuk CLI/function/frontend build. Bukti pada branch HEAD sebelum merge tidak menggantikan bukti SHA main setelah merge.

**Selesai bila:** seluruh gate PASS pada SHA kandidat yang tepat. Jika run masih berjalan, status tetap PENDING; jika gagal, 9.4 dilarang.

## 7. Checkpoint 9.4 — Deployment Supabase dan Vercel

**Scope:** cloud write terkontrol setelah 9.3 PASS dan target production disetujui pemilik.

1. Pemilik mengonfirmasi identitas project Supabase production dan akun/team Vercel, lalu menyelesaikan login dengan akunnya. Secret diisi melalui dashboard/secure prompt milik penyedia, bukan melalui chat.
2. Ambil export/backup sebelum perubahan bila project sudah berisi data; verifikasi file dan prosedur restore. Untuk project kosong, catat bukti kondisi kosong dan strategi backup setelah inisialisasi.
3. Dari SHA gate yang lulus, cek target link, migration history, dan daftar migration yang akan diterapkan. Jalankan dry-run resmi bila didukung CLI yang dipin. Jika muncul drift atau migration tak dikenal, berhenti. Jalankan migration berurutan **dari file repository**, satu pelaksana saja; jangan remote db reset, SQL editor ad hoc, atau replay manual yang menghilangkan history. Cocokkan daftar applied dengan source.
4. Verifikasi schema api, policy RLS, owner/grants, dan default privilege. Seed niche trivia hanya melalui jalur production yang telah ditinjau; jangan mendorong seed fixture lokal secara otomatis.
5. Di Vercel, impor repository dengan Root Directory auth-frontend/, masukkan environment browser-safe, deploy Production dari SHA/kode frontend yang telah lulus, dan uji /login, /oauth/consent, /logout termasuk direct refresh. Catat domain HTTPS final. Jika Vercel auto-deploy saat impor atau perubahan main, lakukan impor hanya pada tahap ini.
6. Atur Site URL, authorization path, consent/deny, client policy, owner login, dan setting keamanan Supabase Auth sesuai dokumen resmi terkini. Setelah identitas owner tersedia, buat workspace owner melalui provisioning aman yang telah ditinjau; public signup tetap disabled. URL callback/redirect harus tepat; jangan memakai wildcard sebagai jalan pintas.
7. Deploy Edge Function mcp dari source kandidat, dengan verify_jwt = false dan middleware OAuth/owner yang sudah diuji. Catat function version dan URL. Konfigurasi secret function yang memang diperlukan hanya melalui jalur aman; jangan log nilainya.
8. Setelah tiap perubahan, jalankan verifikasi terkait. Hentikan rangkaian bila migration, Auth, frontend, atau function berbeda dari ekspektasi; jangan menutupi kegagalan dengan perubahan tak tercatat.

**Selesai bila:** production schema, frontend HTTPS, Auth/OAuth, dan MCP function terpasang dengan version/SHA tercatat. Deployment sukses belum berarti gate hosted lulus.

## 8. Checkpoint 9.5 — Gate hosted dan penutupan Phase 9

1. Uji /health; MCP initialize/list menunjukkan tepat 33 tools. Request tanpa token, token salah audience/resource, dan owner yang tidak diizinkan tidak boleh menjalankan tools. Denial lintas owner yang authenticated wajib telah dibuktikan otomatis pada 9.3; uji production dengan identitas kedua hanya jika tersedia secara sah dan aman.
2. Uji discovery OAuth, PKCE, consent approve/deny, refresh dan otorisasi ulang, seluruh respons sukses token 2xx, owner context, serta error aman dengan klien OAuth uji yang sah. Ini membuktikan mekanisme hosted; koneksi custom MCP dan relink di ChatGPT tetap dibuktikan pada Phase 10. Jangan menyimpan token dalam bukti.
3. Verifikasi migration history source = applied, audit katalog 33 API RPC, RLS/privilege production sesuai kontrak, dan Security Advisor. Periksa log secara teredaksi.
4. Lakukan smoke baca-saja pada Page/workspace owner. Setelah pemeriksaan baca-saja lulus, pilot write kecil hanya pada Page/data yang disetujui pemilik; cek tidak ada reservation/ledger bocor. Jangan membuat publication atau metrics palsu. Kartu MAN-01..MAN-11 tetap Phase 10.
5. Periksa jalur rollback frontend/function ke versi sebelumnya jika tersedia; pada deployment pertama, siapkan cara menonaktifkan endpoint atau kembali ke respons aman. Dokumentasikan forward-fix/restore migration dan uji prosedur pada lingkungan aman tanpa restore destruktif pada data production. Catat biaya/usage baseline dan siapa yang akan merespons insiden.
6. Tulis laporan final dengan deployment SHA, frontend package SHA, URL aman, hasil setiap gate, waktu, pembatasan, dan matriks 14 AC dengan status PASS/PENDING serta bukti masing-masing. Minta audit independen pada hasil Phase 9 sebelum mulai Phase 10; implementer tidak menyatakan audit sendiri lulus.

**Selesai bila:** gate hosted lulus, laporan dan rollback siap, tidak ada defect keamanan/data-integrity kritis atau high, serta audit independen menyetujui hasil. Phase 9 boleh Complete; status Pilot-ready menunggu plugin final dan MAN-01..MAN-09 pada Phase 10. MVP Complete menunggu MAN-10..MAN-11 dengan kejadian sungguhan serta Phase 11.

## 9. Titik berhenti wajib

- Target Supabase belum teridentifikasi atau project berisi data/riwayat yang tidak cocok: hentikan cloud write.
- Gate 9.3 tidak PASS pada SHA tepat: hentikan deployment.
- Backup yang disyaratkan belum dapat diverifikasi: hentikan migration production.
- OAuth/owner/RLS gagal: hentikan akses MCP dan pilot write sampai diperbaiki.
- Perubahan schema setelah migration production: gunakan migration additive/forward-fix atau restore yang disetujui; jangan edit history atau reset production.
- Bukti ChatGPT skill, 101 prompt, dan 11 kartu manual belum dijalankan pada Phase 9: catat PENDING sesuai CR-020.

## 10. Referensi platform yang diperiksa saat penulisan

- [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations) dan [CLI db push/dry-run](https://supabase.com/docs/reference/cli/supabase-db-push).
- [Supabase OAuth 2.1 server](https://supabase.com/docs/guides/auth/oauth-server/getting-started) dan [Edge Function configuration](https://supabase.com/docs/guides/functions/function-configuration).
- [Vercel Git deployments](https://vercel.com/docs/git), [monorepo Root Directory](https://vercel.com/docs/monorepos), [environment variables](https://vercel.com/docs/environment-variables), dan [rewrites](https://vercel.com/docs/routing/rewrites).

Dokumentasi platform dapat berubah. Sebelum menjalankan 9.4, cocokkan lagi UI/CLI dan sintaks dengan versi yang terpasang; gunakan CLI --help untuk perintah yang belum dikenal.
