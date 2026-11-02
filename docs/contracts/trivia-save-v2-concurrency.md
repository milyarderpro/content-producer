# Benturan dan replay `save_post_v2` — P4 T2

Laporan ini mencatat **CI/FIXTURE lokal**, bukan hasil LIVE atau bukti deployment.
Baseline adalah scope A. Sumber B tidak diaktifkan atau dibandingkan sebagai
perubahan keputusan.

| Benturan | Lock/urutan yang diuji | Hasil yang dibuktikan |
| --- | --- | --- |
| Key sama, payload sama | Dua sesi; waiter teramati `wait_event_type='Lock'` | Satu post dan lima alokasi; respons kedua `replayed=true` dengan ID/hash sama. |
| Identitas sama, key berbeda | Dua urutan commit; waiter teramati menunggu lock | Satu save per identity set; operasi kedua mendapat `FACT_CATALOG_CONFLICT`, perlu Read dan review ulang. |
| Set tumpang tindih lintas Page | Waiter teramati menunggu lock workspace | Katalog stale ditolak; setelah review ulang, `workspace_unique` menolak fakta pada `facts[3]` dengan `FACT_REUSE_BLOCKED`. Tidak ada post parsial. |
| Reuse lintas scope | Dua Page `page_unique` dan workspace terpisah | Dua Page memakai lima canonical fact yang sama; workspace lain boleh memiliki identity set sendiri. |
| Write v1 / reservasi v1 / koreksi v1 | Kedua urutan terhadap save v2, waiter teramati menunggu lock | Reservasi aktif menolak v2; save v2 yang commit membuat reservasi v1 berikutnya ditolak. Write v1 yang commit lebih dulu menolak v2. Koreksi lebih dulu menolak save stale; koreksi setelah save v2 menurunkan kualitas post menjadi `failed` pada revision baru. |
| Timeout lock | Sesi dengan `statement_timeout` 250 ms di belakang lock workspace | `DATABASE_BUSY`, tanpa post/fakta/alokasi; retry key dan payload yang sama setelah lock lepas menghasilkan satu draft. |
| Respons save hilang | Commit sesi terpisah, respons diabaikan oleh caller | Sebelum rekonsiliasi, hasil caller **belum pasti**. Replay berwenang dengan key/payload sama mengembalikan ID semula, tanpa post, alokasi, atau event completed tambahan, meskipun item sudah completed dan claim tidak lagi aktif. |
| Key baru dengan claim tidak sah | Item completed dengan claim lama; item lain dengan lease yang dibuat kedaluwarsa di fixture | Key baru pada item completed mendapat `PLAN_ITEM_CLAIM_MISMATCH`; claim kedaluwarsa mendapat `PLAN_ITEM_CLAIM_EXPIRED`. Tidak ada mutasi bisnis tambahan. |

Pemeriksaan `pg_stat_database.deadlocks` pada dua rangkaian overlap tetap sama.
Lock overlap diamati melalui `pg_stat_activity`, bukan disimpulkan hanya dari
hasil akhir. Kode `FACT_CATALOG_CONFLICT` meminta dedup Read dan keputusan baru;
`FACT_REUSE_BLOCKED`, `FACT_NOT_ELIGIBLE`, dan `FACT_REVIEW_REQUIRED` membawa
detail posisi `facts[n]` dari RPC. Respons yang hilang tidak boleh dianggap gagal
atau diulang dengan key baru sebelum rekonsiliasi.

Fixture tidak menunggu 30 menit lease riil. Cabang expired diuji dengan timestamp
claim valid yang dimundurkan secara terisolasi; replay pada item completed
menguji syarat lebih kuat bahwa claim semula sudah tidak aktif. Tidak ada klaim
tentang host, produksi, atau perbandingan B dari pengujian ini.
