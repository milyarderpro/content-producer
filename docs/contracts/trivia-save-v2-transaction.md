# Transaksi `save_post_v2` — P4 T1

Dokumen ini menjelaskan RPC database yang ditambahkan pada P4 T1. Tool MCP,
projection `get_post` v2, revisi, gate Setujui v2, dan alur beberapa draft masih
menjadi task berikutnya. Keberadaan RPC lokal tidak membuktikan deployment atau
keberhasilan LIVE.

## Urutan transaksi

1. Validasi bentuk request, copy terender, dan tiga hasil editorial `pass`.
   Operation key UUID v4 dan payload semantik masuk ledger owner. Replay yang
   cocok mengembalikan respons tersimpan **sebelum** claim, config, atau katalog
   yang dapat berubah diperiksa; key sama dengan payload berubah ditolak.
2. Lock workspace yang sama dengan jalur trivia v1, lalu lock Page/config.
   Bandingkan `config_public_id` dan timestamp enam mikrodetik dari context;
   bandingkan `expected_catalog_version` dengan versi katalog workspace A.
   Lock workspace menserialisasi write v1/v2 pada scope ini. Perubahan tak
   terkait pun menolak versi lama.
3. Periksa format, topik, tujuan, jumlah fakta, renderer, semua budget Page,
   URL, keputusan dedup dan seluruh kandidat wajib yang diketahui. Jika ada
   plan item, lock plan dan item serta periksa claim/lease yang masih sah.
4. Dalam transaksi yang sama buat satu post `draft`, fakta canonical baru bila
   diperlukan, evidence satu URL per fakta, dan binding/alokasi dengan snapshot
   v2. Reuse menghitung usage v1/v2 serta reservasi v1 aktif. Snapshot v1 dan
   bukti canonical lama tidak ditulis ulang. Server menghitung hash dan metrik,
   lalu menyimpan hasil system/editorial `pass` pada revision 1/hash tersebut.
5. Jika ada item, ubah menjadi `completed`, tambahkan event, dan perbarui
   ringkasan plan. Simpan respons tersanitasi pada history/ledger. Kegagalan
   pada tahap mana pun membatalkan seluruh perubahan bisnis transaksi itu.

RPC mengembalikan ringkasan post, plan atau `null`, dan `replayed`. Readback
`get_post` lintas versi masih pekerjaan P4 T3; ringkasan Write saja belum cukup
untuk klaim draft terbukti tersimpan pada host.

## Kode error D1

| Kode | Tindakan |
| --- | --- |
| `VALIDATION_FAILED`, `CONTENT_PAYLOAD_INVALID`, `CONTENT_RENDER_MISMATCH` | Perbaiki field, urutan fakta, atau copy; jangan mengulang payload yang salah. |
| `CONTENT_BUDGET_EXCEEDED` | Sesuaikan komponen naskah dengan budget Page. |
| `EDITORIAL_REVIEW_REQUIRED` | Perbaiki naskah dan nilai ulang tiga pemeriksaan sebelum operasi baru. |
| `FACT_REVIEW_REQUIRED` | Cari ulang atau ganti calon; kandidat wajib atau keputusan dedup belum cocok. |
| `FACT_NOT_ELIGIBLE`, `FACT_REUSE_BLOCKED` | Ganti calon yang status/reservasi/pemakaiannya tidak layak. |
| `FACT_CATALOG_CONFLICT` | Baca ulang dedup dan versi katalog, tinjau keputusan, lalu pakai key baru setelah hasil lama pasti. |
| `PAGE_VERSION_CONFLICT` | Ambil generation context terbaru dan tinjau dampak config. |
| `PLAN_ITEM_CLAIM_MISMATCH`, `PLAN_ITEM_CLAIM_EXPIRED`, `PLAN_STATUS_CONFLICT` | Baca plan/claim; hanya attempt yang sah boleh melakukan save baru. |
| `OPERATION_KEY_REUSED` | Jangan ubah payload pada key yang sama; rekonsiliasi operasi lama. |
| `DATABASE_BUSY`, `RATE_LIMITED` | Ikuti batas tunggu; hasil Write yang sempat dikirim perlu rekonsiliasi sebelum key baru. |

Kegagalan domain yang diketahui adalah rollback transaksi. Respons hilang setelah
dispatch memiliki hasil **belum pasti**: baca state atau replay dengan key dan
payload semantik identik. Replay sukses tetap mengembalikan post yang sama
meskipun claim kemudian kedaluwarsa; save baru dengan key baru tetap memerlukan
claim sah. Tahap MCP dan lokasi field yang aman akan dipetakan pada P6, tanpa
menampilkan claim token, operation key, URL privat panjang, atau SQL mentah.
