# Live Test & Fix — workflow aktif Content Producer

**Berlaku mulai:** 21 Oktober 2026 · **Cakupan:** pengujian langsung plugin PRIVATE Content Producer v0.2.2 melalui owner OAuth `mcpku2`, remediasi, dan retest. **Kampanye:** [Issue #25](https://github.com/milyarderpro/content-producer/issues/25). **Masalah awal:** [Issue #26](https://github.com/milyarderpro/content-producer/issues/26).

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

- **Read tools:** uji pada owner workspace yang sudah terhubung tanpa mengubah data. Read yang seharusnya ditolak (misalnya metrik post belum `posted`) diuji sebagai *expected-denial*.
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

Implementer memulai dari Issue, membuat branch/PR yang menyebut `Refs #N`, menambah tes yang gagal sebelum perbaikan (jika bisa), menulis perbaikan minimum tanpa kontrak baru yang diam-diam, lalu merekam run Actions/commit SHA. **Docs-only:** gunakan existing light PR CI; **TypeScript/config:** `pnpm run check` + focused tests; **auth, RLS, migration, backend write/security:** gunakan gate CR-020/044 yang relevan pada SHA final sebelum deployment. Lulus CI lokal/terisolasi tidak sama dengan PASS plugin live. PR merge/deployment dan perubahan production hanya dengan keputusan pemilik yang sesuai; jangan merunning full gate hanya untuk Markdown.

## Definisi selesai untuk kampanye ini

1. Semua **33 tool telah dipetakan** dengan hasil dan batas bukti yang eksplisit; bukan harus mengeksekusi seluruh mutasi destruktif di production.
2. **Core E2E draft baru** melalui ChatGPT berhasil disimpan **sekali**, terbaca kembali dengan `get_post`, dan checks/status benar, atau tetap BLOCKED dengan alasan konkret.
3. Setiap kegagalan yang tereproduksi memiliki Issue, PR/fix atau keputusan defer yang disetujui owner, regresi, serta hasil retest.
4. Tidak ada P0/P1 tak ditangani pada **alur pengguna yang dipilih untuk digunakan**. Kesiapan ini adalah keputusan operasional pemilik; **bukan** persetujuan Phase 11, `MVP Complete`, atau klaim seluruh AC PASS.

Laporan tetap ringkas: kirim satu prompt, terima hasil, catat verdict, lanjut. Tidak memaksakan deadline tujuh hari jika bukti/fix belum tersedia.

## Titik awal

[Issue #26](https://github.com/milyarderpro/content-producer/issues/26) — **pemilik melaporkan draft baru gagal tersimpan**. Error tool, trace dan state saat kejadian belum tersedia dalam kampanye ini. Prioritas investigasi: **LT-E2E-01** (lihat matriks); jangan otomatis mengatakan `save_post` penyebabnya karena bisa gagal di tahap dedup, reserve, evidence schema, context/CAS atau approval host. Mulai dari Read preflight, lalu reproduksi yang disetujui pemilik.