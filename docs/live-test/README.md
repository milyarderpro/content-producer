# Live Test & Fix — workflow aktif Content Producer

**Berlaku mulai:** 21 Oktober 2026 · **Cakupan:** pengujian langsung plugin PRIVATE Content Producer **v0.2.3** melalui owner OAuth `mcpku2` (terverifikasi di [Issue #29](https://github.com/milyarderpro/content-producer/issues/29); v0.2.2 adalah baseline awal historis), remediasi, dan retest. **Kampanye:** [Issue #25](https://github.com/milyarderpro/content-producer/issues/25). **Masalah awal:** [Issue #26](https://github.com/milyarderpro/content-producer/issues/26).

## Keputusan sederhana

**Workflow aktif untuk pekerjaan baru adalah: PROMPT → UJI DI CHAT BARU → CATAT HASIL → ISSUE BUG → PR FIX → GITHUB ACTIONS → RETEST.**

- **Phase 10 tetap historis selesai / Pilot-ready.** Bukti dan dokumen Phase 0–10 **tidak dihapus atau dinyatakan gagal**.
- Pemilik **tidak melanjutkan Phase 11 atau menutup AC-001..AC-014 melalui workflow ini**. Status historis `PENDING` tetap jujur, bukan otomatis `PASS`/dihapus. Workflow baru bukan sertifikasi `MVP Complete`.
- `plans/PRD.md`, `plans/tool-inventory.md`, migration, core/niche constraints dan keamanan tetap kontrak teknis. Proses uji boleh disederhanakan, **bukan** aturan auth/data/security.
- **Satu sumber operasional:** dokumen ini + [matriks 33 tool](test-matrix.md) + [log hasil](results.md). GitHub Issue adalah sumber bukti/triage, PR adalah sumber perubahan kode dan Actions adalah bukti regresi/CI. Jangan membuat laporan fase terpisah.

## Satu putaran tes: lima langkah

1. **Rancang.** Asisten memilih satu **LT-###** dari matriks dan menulis prompt lengkap: tujuan, Page/post/plan sasaran bila perlu, tool yang diharapkan, precondition, hasil yang diharapkan dan larangan. Utamakan kegagalan inti **draft baru tidak tersimpan** (#26) setelah read preflight. Hindari rangkaian tool tak terkait dalam satu prompt.
2. **Eksekusi.** Pemilik menempel prompt ke **chat ChatGPT baru** dengan hanya plugin PRIVATE Content Producer yang terhubung ke owner OAuth `mcpku2`. Untuk Write: pemilik meninjau payload dan **menyetujui operasi tertentu** sebelum dieksekusi. Jangan menganggap izin tes umum sebagai izin mutasi.
3. **Kembalikan bukti.** Pemilik mengirim respons lengkap, error code, tool name dan urutan panggilan yang terlihat, serta hasil `get_post`/`get_content_plan` atau Read lain bila relevan. Hilangkan token OAuth, password, client secret, reservation token, access credential, PII atau rahasia lain. Simpan tautan bukti yang stabil pada Issue (bukan menebak isi chat).
4. **Nilai dan catat.** Reviewer memperbarui [results.md](results.md) + baris di [test-matrix.md](test-matrix.md) melalui PR dokumentasi atau komentar Issue #25. `PASS` hanya bila jalur **live** sesuai ekspektasi dan, untuk Write, ada readback yang membuktikan state. `FAIL` jika bukti menunjukkan pelanggaran aktual; `BLOCKED` jika prasyarat/izin/data/bukti belum cukup; `NOT RUN` jika belum dilakukan. Penolakan yang benar pada negative test dapat `PASS` **jika** status state tidak berubah sesuai target. Catat tingkat bukti (`LIVE`, `CI/FIXTURE`, `HISTORICAL`) secara terpisah.
5. **Remediasi/retest.** Jika `FAIL` atau error yang belum jelas, buat/tautkan Issue bug per akar masalah (kumpulan gejala serupa boleh satu Issue). Implementer membuat PR fokus dan menjalankan Actions sesuai risiko. Setelah perubahan **benar-benar terpasang** di runtime yang hendak diuji dan diizinkan pemilik, ulang **prompt yang sama** (dengan hanya ID/objek uji baru jika mutasi) + regresi yang terdampak. Catat before/after, SHA, PR, Actions dan versi backend/plugin. Status `FIXED` baru setelah **retest terbukti**, bukan setelah PR/CI lulus saja.

> **Aturan praktis:** satu chat = satu skenario yang jelas; satu error = satu record; satu akar masalah = satu Issue; satu paket perubahan terkait = satu PR. Tidak ada checkpoint fase baru, ritual sembilan kartu, atau 101 prompt wajib.

## Keamanan pengujian langsung

- **Read tools:** uji pada owner workspace yang sudah terhubung tanpa mengubah data. Read yang seharusnya ditolak (misalnya metrik post belum `posted`) diuji sebagai _expected-denial_.
- **Write tools:** gunakan Page/data **khusus testing yang disetujui pemilik**; jika belum ada, hentikan di `BLOCKED` dan minta keputusan objek uji. **Jangan** merusak atau mengganti `corious-facts` dan Page/post pilot historis hanya untuk mendapat PASS.
- **Operasi irreversible atau bermakna dunia nyata** (`mark_post_posted`, `record_post_performance`, `archive_post`, `trivia_correct_fact`, discard/cancel pada data nyata): uji positif lewat fixture/database terisolasi kecuali telah ada peristiwa nyata dan persetujuan owner untuk ID yang tepat. Jangan membuat Facebook post ID/URL, `published_at`, snapshot engagement, atau fakta sumber palsu di production.
- MCP tidak otomatis menerbitkan ke Facebook, membuat video Canva, atau mengambil analitik Facebook. Kalender hanya jadwal internal. Jangan membuat fitur palsu untuk meluluskan tes.
- Retry Write dengan **operation_key + semantic payload yang sama** untuk operasi logis sama; kalau respons hilang, baca state dulu. Jangan membuat operasi baru diam-diam. CAS revision/hash dan owner OAuth/RLS tidak boleh dibypass. Jangan memakai SQL admin/service role sebagai substitusi Write MCP live.
- Saat tes keamanan, input berbahaya diperlakukan sebagai data tak tepercaya. Semua Write harus memiliki izin spesifik atas aksi, objek dan state yang diperkirakan.

## Handoff implementer: GitHub tetap wajib

Setiap bug Issue harus memuat **ID LT, gejala, expected vs actual, prasyarat dan exact error, sanitized input/output atau trace, reproduksi minimal, dampak P0/P1/P2, lokasi dugaan (hipotesis saja), bukti state readback, dan acceptance retest**. Jangan mengarang root cause ketika tidak ada trace.

- **P0:** bahaya keamanan/integritas atau core flow seluruhnya terblokir dan telah terkonfirmasi.
- **P1:** alur utama gagal pada skenario valid atau berisiko menyebabkan data salah; ada workaround atau cakupan terbatas.
- **P2:** minor, UX, diagnostik, atau edge case non-kritis. Tingkat keparahan harus berdasarkan bukti, bukan kekhawatiran.

Implementer memulai dari Issue, membuat branch/PR yang menyebut `Refs #N`, menambah tes yang gagal sebelum perbaikan (jika bisa), menulis perbaikan minimum tanpa kontrak baru yang diam-diam, lalu merekam run Actions/commit SHA. **Docs-only:** gunakan existing light PR CI; **TypeScript/config:** `pnpm run check` + focused tests; **auth, RLS, migration, backend write/security:** pertahankan kontrol CR-020/044 dan gunakan [gate CR-052](../decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md) manual exact final SHA `main` (efektif sejak merge PR #105) sebelum deployment yang diotorisasi. Lulus CI lokal/terisolasi tidak sama dengan PASS plugin live. PR merge/deployment dan perubahan production hanya dengan keputusan pemilik yang sesuai; jangan merunning full gate hanya untuk Markdown.

## Batas durasi CI wajib — estimasi sebelum dijalankan

Seluruh implementer mengikuti **aturan utama di
[`AGENTS.md`](../../AGENTS.md)**. Sebelum menjalankan/men-trigger GitHub
Actions atau CI lokal, tentukan **estimasi durasi** dengan merujuk isi job
dan run sebelumnya. Jika gate yang **sudah diizinkan diperkirakan lebih dari
10 menit**, **mulai/dispatch sesuai izin**, catat check, estimasi,
candidate SHA, URL dan status sementara, lalu **hentikan pemantauan
chat tanpa menunggu hasil atau polling berulang**. Periksa kembali
setelah pemilik mengetik **`lanjutkan`**. Push/PR tetap memerlukan izin
tersendiri; run yang masih berjalan **bukan PASS**.

Ini **bukan** aturan menunggu 10 menit lalu berhenti. Jika workflow
sudah berjalan, jangan membatalkannya sepihak; cukup cantumkan URL/status
dan hentikan polling. Gate backend/security yang wajib tetap **harus
dipenuhi sebelum deploy** dan tidak boleh dilewati karena batas waktu.
Jangan mengulang full gate ketika focused CI atau reuse SHA yang sah sudah
mencukupi.

## Definisi selesai untuk kampanye ini

1. Semua **33 tool telah dipetakan** dengan hasil dan batas bukti yang eksplisit; bukan harus mengeksekusi seluruh mutasi destruktif di production.
2. **Core E2E draft baru** melalui ChatGPT berhasil disimpan **sekali**, terbaca kembali dengan `get_post`, dan checks/status benar, atau tetap BLOCKED dengan alasan konkret.
3. Setiap kegagalan yang tereproduksi memiliki Issue, PR/fix atau keputusan defer yang disetujui owner, regresi, serta hasil retest.
4. Tidak ada P0/P1 tak ditangani pada **alur pengguna yang dipilih untuk digunakan**. Kesiapan ini adalah keputusan operasional pemilik; **bukan** persetujuan Phase 11, `MVP Complete`, atau klaim seluruh AC PASS.

Laporan tetap ringkas: kirim satu prompt, terima hasil, catat verdict, lanjut. Tidak memaksakan deadline tujuh hari jika bukti/fix belum tersedia.

## Titik awal

[Issue #26](https://github.com/milyarderpro/content-producer/issues/26) — **percobaan draft historis berhenti pada tahap dedup Read**: `trivia_find_similar_facts` gagal `VALIDATION_FAILED` dalam empat percobaan; `trivia_register_and_reserve_facts` dan `save_post` **tidak dipanggil**. Ringkasan tahap dan error sudah diketahui, tetapi **payload tepat keempat panggilan asli belum tersedia**, sehingga kesamaan akar sebab dengan LT-016 belum terbukti. **LT-E2E-01 tetap OPEN / BLOCKED**; tidak ada bukti kegagalan `save_post` atau draft baru berhasil disimpan. Mulai lagi hanya dari Read preflight dan payload Write spesifik yang disetujui pemilik.

## Paket sumber lintas percakapan — LT-E2E-01

**Paket asli tidak ditemukan.** Berkas [fixture tujuh fakta gajah](fixtures/lt-e2e-01-elephant-source-pack.json) adalah **rekonstruksi terverifikasi dari penelitian primer dan bukti [Issue #26](https://github.com/milyarderpro/content-producer/issues/26)**, bukan salinan `lt_e2e_01_elephant_prewrite_preview.json`. Tujuh kandidat memakai ontologi SQL v1; F6 mengikuti keputusan editorial pemilik persis. Metadata sumber, copy Canva, batas klaim, dan ringkasan dedup Read disimpan sebagai input stabil untuk chat lain.

**Status LT-E2E-01: BLOCKED untuk Write / draft belum diuji.** Enam kandidat lolos dedup Read menurut laporan pemilik, F6 lolos satu Read navigator; 35 match Moon yang ditampilkan dinilai berbeda, tetapi hasilnya terbatas dan harus diulang sebelum Write. Fixture tidak menyimpan token reservasi, operation key, CAS konfigurasi, expiry runtime, fact ID hasil Write atau post ID baru. Ambil snapshot Page terkini, teliti hasil dedup dan sumber, periksa renderer, lalu minta izin khusus atas scope `trivia_register_and_reserve_facts` dan `save_post` yang tepat; masing-masing belum dijalankan. Jangan mengaitkan dengan plan 22 Oktober, mengubah post Moon atau menerbitkan konten. Bukti dan catatan kekurangan ada di [log](results.md) dan [Issue #26](https://github.com/milyarderpro/content-producer/issues/26).
