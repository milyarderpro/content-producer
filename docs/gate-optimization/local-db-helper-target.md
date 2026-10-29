# Target database lokal helper plan lifecycle — Issue #84

## Scope dan preflight

- Tanggal: 29 Oktober 2026. Base `main`: `ab4381a645baee768fa8cad8f77c50f6cb894940`. Branch: `codex/issue-84-local-db-helper-target`. Diff PR hanya `supabase/tests/database/helpers/plan-lifecycle.ts` dan dokumen ini.
- Helper lama memakai nama tetap `supabase_db_content-producer` untuk query sinkron dan sesi asynchronous. Pada runner dengan `project_id` berbeda, baseline fungsional **NOT RUN** karena akan menargetkan stack pengguna; acuan baseline hanya source pada base SHA. `api-page-plan-writes.test.ts` juga memiliki nama tetap dan berada di luar scope PR ini.
- Prasyarat: Node 24.15.0, pnpm 10.33.2, Supabase CLI 2.120.0, Docker lokal, serta 72 migration pada stack disposable. Bantuan CLI pin `supabase start --help` dan `supabase stop --help` diperiksa sebelum pemakaian. Riwayat light CI sebelum tes: [40873887518](https://github.com/milyarderpro/content-producer/actions/runs/40873887518) sekitar 22 detik pada base; [40855830593](https://github.com/milyarderpro/content-producer/actions/runs/40855830593) 20 detik; [40854029703](https://github.com/milyarderpro/content-producer/actions/runs/40854029703) sekitar 42 detik. Estimasi sebelum tes: start 1–2 menit, lima kasus fokus berurutan 1–3 menit, `pnpm run check` sekitar 1 menit, light CI 20–60 detik. Full backend gate **NOT RUN** untuk PR fokus.

## Isolasi database dan fail-closed

Runner salinan berada di `/tmp/issue-84-helper-runner`; `project_id` sementara `issue-84-db-helper-disposable` sengaja berbeda dari nama folder. Port DB runner **59322**; config worktree PR tetap port repository. Sebelum start, tidak ada container/network/volume/port disposable. Start stack baru selesai dalam **78,699 detik** (exit `0`), menerapkan 72 migration, tanpa metadata `.temp` linked project atau reset stack pengguna.

Sebelum query dan setiap kasus positif, inspeksi memastikan container ID `cfbfa369…`, nama `supabase_db_issue-84-db-helper-disposable`, status running, network `supabase_network_issue-84-db-helper-disposable`, volume `supabase_db_issue-84-db-helper-disposable`, serta binding `5432/tcp` ke **59322**. Stack pengguna tetap pada ID `7fff50e7…`, nama/network/volume `content-producer`, port **54322**. Semua tes berjalan dari runner sementara; source helper di runner identik byte demi byte dengan kandidat PR.

Helper kandidat membaca `project_id` dan `[db].port` dari `supabase/config.toml` lokal, menolak config hilang/ambigu, lalu memverifikasi nama, status, network, volume, dan binding port melalui `docker inspect`. Pemeriksaan dievaluasi saat modul diimpor, sebelum satu kasus atau SQL. ID container tervalidasi dipin dalam argumen bersama `docker exec -i` untuk `spawnSync` dan `spawn` async. Kegagalan hanya mengeluarkan `LOCAL_DATABASE_CONFIG_INVALID` atau `LOCAL_DATABASE_TARGET_MISMATCH`, tanpa SQL, credential, atau output inspect mentah.

Uji negatif hanya mengubah runner sementara: `[db].port` dibuat **59332** sementara container tetap di **59322**; uji kedua menyuntik hasil inspeksi network yang salah melalui wrapper `docker` sementara yang memblokir `exec`. Keduanya keluar nonzero dengan `LOCAL_DATABASE_TARGET_MISMATCH` sebelum kasus berjalan dan mencatat **0 percobaan `docker exec`**. Config runner dipulihkan sebelum tes positif; tidak ada container/network nyata yang diputus atau diubah untuk uji mismatch.

## Tes fokus berurutan

Setiap command menggunakan `pnpm exec vitest run --config vitest.database.config.ts <file> --testNamePattern <kasus> --reporter verbose` pada runner disposable, setelah preflight ID/config/network/volume/port. Tidak ada dua tes berjalan paralel pada DB bersama. Angka wall clock mencakup startup Vitest.

| Jalur dan kasus yang dipilih                                                                  | Hasil      |       Durasi |
| --------------------------------------------------------------------------------------------- | ---------- | -----------: |
| Plan sinkron: `CORE-001/002 exact empty`                                                      | `PASS` 1/1 | 12,755 detik |
| Plan sinkron dan pembatalan: `SEC-BUSY query cancellation maps`                               | `PASS` 1/1 |  2,724 detik |
| Sesi race async: `CON-PLAN/REPLAY parallel workers`                                           | `PASS` 1/1 |  3,089 detik |
| Wrapper trivia: `RPC-FACT-001 / CORE-001 preserves ordered`                                   | `PASS` 1/1 |  3,097 detik |
| Wrapper post dan pembatalan: `DATABASE_BUSY held workspace and actual statement cancellation` | `PASS` 1/1 |  8,247 detik |

Total lima command fokus **29,912 detik**. Kasus lain dalam kelima file sengaja tidak dijalankan; setiap command melaporkan satu kasus lulus dan sisanya skipped. Query audit akhir pada ID disposable menemukan **0** workspace fixture `p54-*` dan tetap **72** migration. SQL fixture, role/JWT, transaksi dan sesi terpisah untuk race, `safeError`, redaksi stdin/log, penanganan `DATABASE_BUSY`, serta cancellation tidak diubah oleh diff helper.

## Batas bukti

Pemeriksaan lokal wajib untuk kandidat TypeScript: `pnpm run check` dan `git diff --check`; hasilnya dicatat pada PR. Light CI head PR juga dicatat terpisah. Kelulusan lima kasus fokus membuktikan jalur helper yang dipilih pada stack disposable ini, bukan seluruh suite database, helper hardcoded lain, kondisi live, atau full CR-020/044 gate. Tidak ada linked/remote database, production credential/data, deployment, atau production business Write. Perbandingan full gate dan exact-SHA G4 tetap pekerjaan berikutnya.
