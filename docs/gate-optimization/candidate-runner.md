# Kandidat runner G3-T1 — Issue #88

**Status:** kandidat review, bukan cutover. Base `bbd598ead3df145a831fd32d7e3f4a5bce222161`. Gate lama `scripts/test-all.ts` dan workflow Actions tetap acuan sampai G4 dan keputusan CR-052 diterima.

## Cakupan

`gate:source` menjalankan `pnpm run check` sekali. Preflight mengikat SHA checkout bersih, hash manifest, lockfile, input migration/fixture/config, serta versi Node, pnpm, Deno, dan Supabase CLI. `gate:backend` menjalankan satu stack lokal disposable dengan satu reset, nama migration, MCP sekali, audit awal, Inspector 33 valid/invalid dan owner denial, audit sesudah, 41 file database serial sesuai konfigurasi Vitest, history, lint, local security advisors sebagai langkah sendiri, audit akhir, dan whitespace. `gate:full` menggabungkan komponen pada identitas yang sama. Kegagalan atau bukti wajib yang hilang memberi exit nonzero.

Tes runner berada di `tests/gate-runner.spec.mjs` dan dipanggil eksplisit dengan `node --import tsx tests/gate-runner.spec.mjs`. Pola `*.test.ts` milik manifest source tidak bertambah; manifest wajib tetap tidak diubah.

## Target lokal dan bukti

Set `GATE_CANDIDATE_SHA` ke commit 40 karakter yang diuji, `GATE_DISPOSABLE_PROJECT_ID` ke nama `issue-88-…-disposable`, dan `GATE_PORT_BASE` ke kelipatan sepuluh pada rentang 58000–64000. Runner menolak checkout kotor, SHA berbeda, metadata linked project, credential remote, target Docker yang sudah ada, dan port terpakai sebelum start/reset. Ia memeriksa container DB/REST/Kong, network, volume, dan port sebelum reset dan tahap backend berikutnya.

Runner membuat salinan runtime sementara untuk mengganti hanya `project_id` dan port di `supabase/config.toml`, lalu menghapusnya setelah stop. Hash config overlay dilaporkan. Karena identitas config runtime berubah, semua hasil lokal ini berlabel **DIAGNOSTIC_CONFIG_OVERLAY** dan bukan exact-SHA PASS formal menurut rancangan CR-052. Output child ditangkap; laporan JSON hanya memuat label tahap, status, durasi, hitungan aman, hash, versi pin, dan batas bukti. Token, SQL, payload fixture, serta output mentah tidak diteruskan.

## Status bukti

Catat preflight, diff, estimasi dari riwayat run, identitas stack, hasil check/tes fokus, satu run kandidat bila aman, cleanup, serta light CI head PR pada laporan akhir. `PASS` hanya untuk pemeriksaan yang selesai; `FAIL` untuk command/evidence wajib gagal; `BLOCKED` untuk preflight/target yang tidak aman; `NOT RUN` untuk tahap yang belum dimulai. Gate lama dan workflow kandidat GitHub tetap `NOT RUN` pada PR ini. Hasil lokal tidak membuktikan OAuth ChatGPT hosted, business Write production, atau kesetaraan G4.
