# Profil query `api-read-rpcs.test.ts` — Issue #78

## Scope dan preflight

- Tanggal: 29 Oktober 2026. Base `main`: `66fce0dc8c610e1d891e9a09871a606cb785740c`. Branch: `codex/issue-78-read-rpcs-query`.
- Diff hanya mencakup adapter query pada `supabase/tests/database/api-read-rpcs.test.ts` dan dokumen ini. Empat kasus, seluruh ekspresi SQL fixture/RPC, assertion, expected, cleanup, role/JWT, ACL, pagination, rate limit, dan pemeriksaan timestamp enam digit tetap ada. Tidak ada perubahan migration, RPC, helper bersama, script gate, atau workflow.
- Prasyarat: Supabase CLI 2.120.0 (bantuan `start` dan `db query` diperiksa), Docker lokal, dependency `pnpm install --frozen-lockfile`, dan 72 migration pada DB disposable. Riwayat light CI sebelum run: [40847376028](https://github.com/milyarderpro/content-producer/actions/runs/40847376028) sekitar 39 detik, [40846701449](https://github.com/milyarderpro/content-producer/actions/runs/40846701449) 35 detik, [40844156159](https://github.com/milyarderpro/content-producer/actions/runs/40844156159) 37 detik. Estimasi sebelum eksekusi: baseline fokus 40–90 detik, kandidat fokus 15–45 detik, `pnpm run check` 1–3 menit, light CI 20–60 detik. Full backend gate: `NOT RUN` untuk PR fokus ini.

## Isolasi database dan uji mismatch

Runner sementara berada di `/tmp/issue-78-read-rpcs-runner`, sedangkan `project_id` pada config salinan runner adalah `issue-78-read-rpcs-disposable`. Folder dan identitas project sengaja berbeda. Config runner memakai port 57320–57329, dengan DB 57322; worktree PR tetap memakai config repository. Runner tidak membawa metadata `.temp` linked project. Sebelum start, identitas container dan port disposable belum ada. Setelah start, container DB disposable `523d544b…` terverifikasi running dengan nama `supabase_db_issue-78-read-rpcs-disposable`, network `supabase_network_issue-78-read-rpcs-disposable`, volume `supabase_db_issue-78-read-rpcs-disposable`, dan binding port 57322. DB pengguna `7fff50e7…` tetap memakai nama/network/volume `content-producer` serta port 54322. Tidak ada reset stack pengguna, koneksi linked/remote, atau production Write.

Adapter membaca `project_id` dan `[db].port` dari `supabase/config.toml` lokal. Sebelum kasus pertama, `docker inspect` harus cocok pada nama, status running, network, volume, dan port. ID container yang cocok dipin untuk semua `docker exec`; kegagalan config atau target mengeluarkan marker aman tanpa SQL atau kredensial. Pada uji negatif, hanya config runner sementara diubah dari port 57322 menjadi 57332 saat container tetap di 57322. Proses keluar nonzero dengan `LOCAL_DATABASE_TARGET_MISMATCH`, **0 kasus** dan **0 query `psql`**; config lalu dipulihkan. Uji positif berikutnya pada nama folder yang berbeda dari `project_id` lulus 4/4.

## Metode dan hasil

Baseline dan kandidat dijalankan berurutan pada DB disposable yang sama dengan `pnpm exec vitest run --config vitest.database.config.ts supabase/tests/database/api-read-rpcs.test.ts --reporter verbose`. Instrumentasi hanya ada pada salinan runner sementara dan mencatat waktu proses tanpa SQL atau output error mentah. File kandidat final kemudian disalin ulang identik byte demi byte dan dijalankan tanpa instrumentasi. Waktu wall clock mencakup startup Vitest.

| Ukuran                       |     Baseline | Kandidat terinstrumentasi |    Kandidat final |
| ---------------------------- | -----------: | ------------------------: | ----------------: |
| `supabase db query`          | 74 panggilan |                         0 |   0 (dari source) |
| Total waktu proses CLI query |     74,981 s |                         0 |                 0 |
| Median proses CLI query      |   990,077 ms |                         — |                 — |
| Sesi `psql` lokal            |            0 |                        74 |  74 (dari source) |
| Total waktu proses `psql`    |            — |                   8,721 s | Tidak diprofilkan |
| Median proses `psql`         |            — |                100,260 ms | Tidak diprofilkan |
| Durasi wall clock fokus      |     76,131 s |                   9,819 s |           8,756 s |
| Hasil kasus                  |   `PASS` 4/4 |                `PASS` 4/4 |        `PASS` 4/4 |

| Kasus, urutan source                              |  Baseline | Kandidat terinstrumentasi | Kandidat final |
| ------------------------------------------------- | --------: | ------------------------: | -------------: |
| Katalog API dan ACL                               |    945 ms |                    137 ms |          99 ms |
| Proyeksi owner, pagination, timestamp, rate limit | 30.521 ms |                  3.731 ms |       3.535 ms |
| Penolakan sembilan read lintas owner              | 13.896 ms |                  1.325 ms |       1.558 ms |
| Validasi, not-found, empty-success, state         | 29.672 ms |                  3.560 ms |       2.504 ms |

Instrumentasi kandidat mencatat **107 panggilan assertion** pada empat kasus (10, 62, 9, 26). Baseline memakai pernyataan assertion dan alur kasus yang sama; diff tidak mengubah keduanya. Angka historis 40,53 detik dari 26 Oktober pada Issue #78 adalah pembanding lingkungan lain, bukan baseline lokal ini.

## Implementasi dan batas bukti

SQL dikirim ke `psql` lewat stdin, bukan argumen proses. Setiap panggilan membuka sesi PostgreSQL baru. Setelan role/JWT pada RPC tetap dalam satu statement dengan `set_config(..., true)`. `ON_ERROR_STOP=1` mempertahankan kegagalan, sedangkan `VERBOSITY=terse`, pembatasan log statement error, dan parser marker menjaga redaksi. `row_to_json` mempertahankan tipe hasil yang diuji, termasuk string timestamp enam digit. SQL fixture dan cleanup tidak berubah.

Profil ini membuktikan hasil lokal pada stack disposable dan kandidat tersebut. Light CI akan dilaporkan pada PR/head SHA; ia tidak menjalankan suite DB ini. Full CR-020/044 gate tetap berlaku pada kandidat/deployment yang sesuai dan tidak diklaim oleh PR fokus ini.
