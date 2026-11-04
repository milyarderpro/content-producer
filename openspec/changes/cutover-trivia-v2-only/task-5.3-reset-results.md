# Task 5.3 — Reset konten production

**Tanggal:** 4 November 2026. **Status:** PASS LIVE untuk task 5.3.
Pemilik membatasi sesi ini sampai task 5.3; task 5.4 dan 5.5 **NOT RUN**
pada sesi ini. Plugin PRIVATE belum diperbarui dan belum ada draft QA baru.

## Prasyarat dan transaksi

Backend G4 exact SHA `37fbbbeb0a0c628d9c5e628b21b5f804a4df9501`,
[run #41854239512](https://github.com/milyarderpro/content-producer/actions/runs/41854239512)
PASS; [backup dan rilis task 5.2](task-5.2-release-results.md) terverifikasi.
Target tetap `xjonnilnypchtxogtopb`, workspace owner
`cad2885e-952e-41b3-9eae-d2d9d75d533d`.
Pemilik diberi tahu jendela write dibatasi; preflight tidak menemukan claim,
reservasi aktif, pekerjaan incomplete, cron/pgmq atau owner lain.

`scripts/cutover-reset-content.sql` dijalankan melalui psql dengan
ON_ERROR_STOP dan backup_confirmed=on. Credential login sementara CLI hanya
di memori. Seluruh penghapusan memakai transaksi dan lock dari skrip yang
sudah diuji. Sebelum delete, assertion tambahan di dalam lock menuntut hash
comparator backup sama, tepat 39 post/265 fakta/5 plan/111 ledger konten,
85 migration serta seluruh nama RPC v1 absen. Assertion ini memperketat
precondition tanpa mengubah urutan penghapusan atau source backend.

COMMIT teramati. DELETE berurutan menghasilkan:
18 event, 60 history, 0 metrik, 269 binding, 69 evidence, 39 post,
13 item, 5 plan, 31 set reservasi, 265 fakta, 111 ledger konten dan 1 catalog.

## Readback dari koneksi terpisah

| Objek konten | Sebelum | Setelah |
| --- | ---: | ---: |
| Post (28 v1 + 11 v2) | 39 | 0 |
| Fakta | 265 | 0 |
| Evidence v2 | 69 | 0 |
| Binding/snapshot | 269 | 0 |
| Plan | 5 | 0 |
| Item plan | 13 | 0 |
| Event plan | 18 | 0 |
| Riwayat write post | 60 | 0 |
| Metrik | 0 | 0 |
| Set reservasi | 31 | 0 |
| Catalog | 1 | 0 |
| Ledger konten | 111 | 0 |

Tetap ada **1 akun Auth, 1 workspace, 4 Page, 4 config** dan niche yang sama;
**5 ledger create_page/update_page** dipertahankan. Hash seluruh pembanding
ID akun dan baris workspace/Page/config/niche pada backup, sebelum apply,
di dalam reset dan setelah commit identik:
`6c68ad6e9a3d2891852878f57dd0fcced0ccd1cbaec1d3ae328227174450030a`.

Readback katalog: **0 nama RPC v1**; ledger konten/replay cache **0**, sehingga
respons konten lama tidak tersisa pada ledger dan jalur replay v1 tetap tertutup.
Lima direct RPC v1 sudah dibuktikan 404/PGRST202 dan MCP lama unknown tool
pada task 5.2; penutupan fungsi tetap terbukti setelah reset. Tidak mengulang
business Write historis untuk mengisi bukti. Owner `get_post` untuk satu ID
post QA lama mengembalikan **POST_NOT_FOUND**, tanpa membuat pengganti.

Backup asli tetap di direktori lokal terbatas di luar repository; tidak ada
isi konten/credential di commit. Restore production belum dilakukan/diklaim.
Progres OpenSpec **14/16**. Berikutnya task 5.4 (update plugin dan host QA)
hanya pada sesi yang meneruskannya; belum ada klaim cutover end-to-end lengkap
atau keberhasilan host/save v2 sesudah reset.
