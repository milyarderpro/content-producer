# DNA-TUT-01 — baseline

- Bukti: jawaban lengkap chat penguji yang diteruskan pemilik pada 27 Oktober 2026. Prompt acuan ada di [`mini-test-v1.md`](../mini-test-v1.md#dna-tut-01--selesai-pass); kesamaan byte dengan prompt yang ditempel `UNVERIFIED`.
- Page: `Trivia Editorial Test (Internal)`, public ID `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Format diminta/dilaporkan: `themed_utility`; tema perawatan buku kertas; bahasa `en-US`.
- Runtime plugin/backend `UNVERIFIED`; nomor schema/kontrak `1` bukan versi runtime. `config_updated_at` tidak dilaporkan.
- Alur yang dilaporkan: account/workspace/Page context → riset dan dedup Read → review 20 kandidat F4 → satu `trivia_register_and_reserve_facts` berhasil → satu `save_post` berhasil → `get_post` cocok dengan copy, caption, hashtags, urutan, dan enam fact bindings. Tidak ada retry, draft kedua, revisi, approval, atau publikasi.
- Dedup: F1–F3 dan F5–F6 `review_required: false`; F4 `true` dengan 20 keputusan `distinct` dan alasan subjek/proposisi berbeda. Tidak ada `uncertain` atau kandidat yang dilaporkan terlewat. `trivia.dedup.review_complete: passed` menurut server.
- Sumber: penguji melaporkan dua dukungan independen per fakta dari Library of Congress dan Northeast Document Conservation Center; enam fakta `verified`, source policy server `passed`. Reviewer tidak membuka URL atau memverifikasi klaim secara independen.
- Post public ID `550eccc7-627a-4cc3-9411-f3d04b165482`, `status: draft`, `revision: 1`, `quality_status: pending`, bindings 6/6. System checks 19/19 pass (satu check berkategori warning dilaporkan pass); editorial criteria 18/18 pass tanpa risk flags. Server: 83 kata, 483 karakter CANVA, 25 baris visual, estimated read 27,7 detik, replay ratio 2,130769, 3 loops. `pending` tidak berarti `ready` dan tidak ada approval.

## Penilaian editorial reviewer atas copy pertama yang tersimpan

| DNA 0–2         | Skor | Dasar ringkas                                                                                                                                                   |
| --------------- | ---: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Familiarity     |    2 | Buku dan rak buku mudah dikenali audiens luas.                                                                                                                  |
| Surprise        |    0 | Sebagian besar saran—kering, jauh dari matahari, tangan bersih—mudah ditebak; F4/F6 memberi detail berguna tetapi belum menjadi kejutan kuat.                   |
| Specificity     |    2 | Ada tindakan konkret: bookends, buku berat mendatar, pegang bagian tengah punggung buku.                                                                        |
| Coherence       |    2 | Keenam baris tetap dalam satu tema penyimpanan/penanganan buku.                                                                                                 |
| Scanability     |    1 | Struktur jelas dan lolos batas server, tetapi 83 kata/25 baris membutuhkan sekitar 27,7 detik estimasi baca pada Reel 13 detik; beberapa kalimat masih panjang. |
| Utility/emotion |    2 | Semua baris dapat dipraktikkan, dengan CTA save yang relevan.                                                                                                   |

**Total 9/12 — `PERLU REVISI` secara DNA; `format_fit: FIT`.** Format praktis, enam fakta, caption dan hashtag terpisah, `en-US` natural dan tidak akademis. Hook “6 small habits that protect your books” akurat tetapi generik. F5 “before turning the pages of books” terdengar agak kaku; F4/F6 lebih khas dan layak ditempatkan lebih menonjol bila kelak ada revisi. Tidak ada revisi baseline dalam uji ini. Kelulusan 18/18 kriteria editorial server adalah laporan pemeriksaan pada draft, **bukan** bukti bahwa novelty/hook memenuhi target DNA referensi. Sumber per klaim dan penyalinan tidak diaudit ulang oleh reviewer.

## CANVA COPY pertama — PERSISTED, revision 1

```text
6 small habits that protect your books

Keep books cool and dry; avoid damp rooms and humidity swings.

Move books out of direct sunlight to slow fading and light damage.

Use bookends so upright books don't lean and strain their bindings.

Lay heavy, oversized books flat on a shelf that supports their covers.

Wash and fully dry your hands before turning the pages of books.

Push nearby books back, then grasp the spine's middle, not its top.

Save these tips for your bookshelf.
```

## FACEBOOK CAPTION dan HASHTAGS pertama

```text
Help your favorite paper books face less wear. These six simple storage and handling habits are worth keeping in mind when you organize your shelves. Save this for your next bookshelf refresh.
```

`#BookCare #BookStorage #BookLovers`

## Verdict dan tindak lanjut

`execution_status: COMPLETED`; `workflow_verdict: PASS` karena `save_post` terkonfirmasi dan `get_post` cocok. Kelemahan editorial tidak mengubah status tool atau mewajibkan revisi sekarang. Pengaman dedup kasus SSF berhasil dipraktikkan dalam kasus ini: 20 kandidat yang memerlukan review mendapat keputusan eksplisit dan server menerima reservasi. Ini satu contoh berhasil, bukan bukti `FACT_REVIEW_REQUIRED` SSF telah diperbaiki atau versi live terverifikasi. Lanjutkan satu kasus `DNA-EAC-01`; sintesis editorial dibuat sesudahnya. Belum membuat Issue baru dari satu kelemahan hook/kejutan ini; nilai pola berulang lintas kasus saat sintesis.
