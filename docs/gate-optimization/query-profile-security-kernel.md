# Profil query `api-security-kernel.test.ts` — Issue #76

## Scope dan preflight

- Tanggal pengukuran: 29 Oktober 2026. Base `origin/main`: `1da6245db99b7930d5c43730ba5640cd4cfd9b41`. Branch: `codex/issue-76-security-kernel-query`.
- Perubahan kandidat terbatas pada adapter query di `supabase/tests/database/api-security-kernel.test.ts`. Delapan deklarasi kasus, fixture, SQL assertion, nilai expected, role/JWT, transaksi, serta dua skenario sesi race tetap dipertahankan. Tidak ada perubahan migration, RPC, MCP, suite composition, atau workflow.
- Prasyarat: Node 24.15.0, pnpm 10.33.2, Supabase CLI 2.120.0, Docker, migration lokal. Bantuan `supabase --help`, `supabase start --help`, dan `supabase db query --help` diperiksa sebelum pemakaian. Riwayat light CI terbaru pada 29 Oktober: [40841887638](https://github.com/milyarderpro/content-producer/actions/runs/40841887638) selesai 22 detik, [40841525240](https://github.com/milyarderpro/content-producer/actions/runs/40841525240) 19 detik, [40839801218](https://github.com/milyarderpro/content-producer/actions/runs/40839801218) 26 detik. Estimasi sebelum run: baseline fokus 45–90 detik, kandidat fokus 15–45 detik ditambah kemungkinan tunggu jendela rate limit, `pnpm run check` 1–3 menit, light CI sekitar 20–60 detik. Full gate historis 23 menit 19 detik dan bukan gate PR fokus ini.

## Isolasi database

Runner sementara di `/tmp/issue-76-security-kernel-query` disalin dari base tanpa metadata `.temp` linked project. Hanya konfigurasi runner sementara yang memakai `project_id = "issue-76-security-kernel-query"` dan port 55320–55329; `supabase/config.toml` di worktree PR tidak diubah. Sebelum start, tidak ada container dengan identitas itu. Setelah start, `supabase_db_issue-76-security-kernel-query` memakai network `supabase_network_issue-76-security-kernel-query`, volume `supabase_db_issue-76-security-kernel-query`, dan port 55322. Stack pengguna tetap pada `supabase_db_content-producer`, network `supabase_network_content-producer`, volume `supabase_db_content-producer`, dan port 54322. Stack uji memiliki 72 migration dan fungsi kernel yang relevan. Tidak ada reset stack pengguna, linked project, credential production, atau production Write.

## Metode dan hasil

Baseline dan kandidat dijalankan berurutan pada satu DB disposable, masing-masing dengan `pnpm exec vitest run --config vitest.database.config.ts supabase/tests/database/api-security-kernel.test.ts --reporter verbose`. Instrumentasi hanya ada pada salinan runner sementara: catat waktu proses tanpa SQL, token, atau output error mentah. Kandidat final kemudian disalin ulang byte demi byte tanpa instrumentasi dan dites lagi. Angka wall clock mencakup startup Vitest serta tunggu jendela rate limit; jumlah waktu proses query adalah penjumlahan seluruh panggilan dan dapat melebihi wall clock karena sesi asinkron paralel.

| Ukuran                                 |                              Baseline |   Kandidat terinstrumentasi | Kandidat final tanpa instrumentasi |
| -------------------------------------- | ------------------------------------: | --------------------------: | ---------------------------------: |
| `supabase db query`                    | 76 panggilan: 65 sinkron, 11 asinkron |                           0 |                    0 (dari source) |
| Total waktu proses `supabase db query` |                             118,101 s |                           0 |                                  0 |
| Median `supabase db query`             |                          1.049,287 ms |                           — |                                  — |
| Sesi `psql` lokal                      |   1 pemegang lock, di luar profil CLI | 77: 65 sinkron, 12 asinkron |                   77 (dari source) |
| Total waktu proses `psql` terukur      |                     Tidak diprofilkan |                    17,889 s |                  Tidak diprofilkan |
| Median `psql`                          |                                     — |                   84,192 ms |                                  — |
| Durasi wall clock fokus                |                              85,993 s |                    15,745 s |                           26,782 s |
| Hasil                                  |                            `PASS` 8/8 |                  `PASS` 8/8 |                         `PASS` 8/8 |

| Kasus G1, urutan source                        |  Baseline | Kandidat terinstrumentasi | Kandidat final |
| ---------------------------------------------- | --------: | ------------------------: | -------------: |
| API-owner role, private helpers, API catalog   |  1.048 ms |                    136 ms |          89 ms |
| Caller table, sequence, internal-helper denial |  5.331 ms |                    396 ms |         381 ms |
| Request identity dan owner RLS                 | 12.565 ms |                    938 ms |         979 ms |
| Hash semantik dan timeout mapping              |  2.070 ms |                    175 ms |         158 ms |
| Ledger lock contention dan `DATABASE_BUSY`     | 17.042 ms |                  9.000 ms |       8.950 ms |
| Concurrent replay, key reuse, rollback         | 12.015 ms |                  1.051 ms |       1.008 ms |
| Completion terikat workspace dan operasi       | 13.689 ms |                  1.164 ms |       1.097 ms |
| Rate bucket atomik dan limit                   | 20.382 ms |                  1.467 ms |      13.087 ms |

Kasus rate bucket sengaja menunggu awal menit UTC bila dimulai setelah detik ke-40; itulah variasi terbesar antara dua run kandidat. Kasus ledger lock tetap menahan lock sekitar 8 detik dan memeriksa respons `DATABASE_BUSY` serta batas waktunya. Semua penolakan owner/ACL dan seluruh assertion G1 tetap dieksekusi. `pnpm run check` pada kandidat: `PASS` (format, lint, typecheck, 67 root test, frontend build dan 19 frontend test). `git diff --check`: `PASS`.

## Implementasi dan batas bukti

`psql` dijalankan melalui `docker exec -i` ke container yang mengikuti nama project lokal. Setiap pemanggilan membuat sesi PostgreSQL baru; sesi lock holder, dua klaim bersamaan, dan delapan konsumsi rate limit tetap terpisah. SQL masuk melalui stdin, bukan argumen proses. `ON_ERROR_STOP=1` menjaga status gagal, `VERBOSITY=terse` serta pembatasan log error SQL mencegah statement fixture tampil; error yang diteruskan ke assertion hanya kode aplikasi, `permission denied`, atau marker `forced rollback`. `querySingleRow` membungkus SELECT dengan `row_to_json`, mempertahankan tipe nilai yang diasert.

Profil ini membuktikan regresi lokal/fixture pada base dan kandidat tersebut. Durasi 45,46 detik tanggal 26 Oktober adalah pembanding historis di Issue #76, bukan baseline environment ini. Light CI pada SHA PR dicatat terpisah di PR; full CR-020/044 gate tetap berlaku untuk kandidat G4/deployment yang sesuai, dan PR ini tidak menjalankannya atau membuktikan runtime production.
