# Review pemilik — task 5.4

Tanggal: 5 November 2026, Asia/Jakarta.
Change: `align-plugin-reference-content-dna`, schema spec-driven.
Progress sebelum feedback: 22/28. Status kini: **A–D ACCEPTED EDITORIAL — TASK 5.4 SELESAI**.

Tujuan review ini: pemilik menilai kesesuaian suara, angle, komposisi,
urutan dan format dengan Curious Mind, DYK dan Daily Facts. Skor reviewer
tidak menggantikan penilaian selera pemilik. Permintaan "lanjutkan task 5.4"
bukan feedback bahwa contoh sudah sesuai.

Tidak ada generasi baru, verifikasi ulang URL, perubahan plugin/source produksi,
business Write atau approval draft. Ini penerimaan corpus QA sekali untuk
perubahan plugin, bukan checkpoint GO tambahan pada setiap draft produksi.
Bukti PREVIEW, bukan LIVE-save atau janji performa Facebook.
Plugin terakhir yang diverifikasi terpasang 0.5.3; seluruh hasil terpilih
berasal dari attempt yang tercatat, bukan satu run baru 12 kasus 0.5.3.

## Empat contoh utama untuk dibaca

Empat kartu mencakup hewan emosional, makanan sehari-hari, comparison tempat,
dan sejarah benda. D sengaja dipilih dari salah satu dua kasus yang paling
lemah (E06/E11, 13/16), sehingga review tidak hanya menampilkan hasil terbaik.
Semua copy berikut **utuh dan sama persis dengan output host**, tanpa rewrite
untuk presentasi. Baseline utuh dan seluruh kutipan per dimensi ada pada
[laporan semantik](reference-dna-semantic-review.md).

| Contoh | Kasus/attempt | Source | Skor reviewer | Pokok yang perlu dinilai |
| --- | --- | --- | ---: | --- |
| A — Meerkat cooperation | E02/C4 | 0.5.3 | 14/16 | Empati berasal dari tindakan, bukan kata emotional; nilai komposisi/urutan masih 1. |
| B — Rice | E07/C2 | 0.5.1 | 15/16 | Baris warna masih lebih biasa daripada reveal aroma; istilah genus/koji perlu dinilai apakah tetap nyaman. |
| C — Canadian cities | E10/C3 | 0.5.2 | 15/16 | Kontras streetscape dan climate bisa terasa lebih umum daripada pembuka. |
| D — Zipper history | E11/C2 | 0.5.1 | 13/16 | Masih ada alur kronologis dan dua failure beats. Skor 13/16, perlu judgement pemilik, bukan disembunyikan sebagai contoh unggulan. |

## A — Meerkat cooperation

Baseline pendek: “Some adults stay behind to guard pups at the burrow.”

Perubahan: Dari beberapa baris merawat pups menuju satu care reveal dan perilaku kelompok lain. Komunikasi masih cukup dominan.

```text
Did you know?

Meerkat helpers teach pups how to handle dangerous prey.

One meerkat often watches for danger while others search for food.

Guards make quiet calls while the group forages nearby.

Soft contact calls help moving meerkat groups stay together.

Meerkats take turns calling while warming up in the sun.

Group members groom each other, helping maintain their social bonds.

Meerkat groups defend their territory together against neighboring groups.

Share this with someone who loves animals.
```

Catatan terbuka: Empati berasal dari tindakan, bukan kata emotional; nilai komposisi/urutan masih 1.

[Output asal C4](reference-dna-preview-candidate-0.5.3.md#e02--c4) · [baseline B1](reference-dna-preview-baseline-2026-11-05.md).

## B — Rice

Baseline pendek: “Black rice gets its color from natural anthocyanin pigments.”

Perubahan: Istilah kimia tidak mendominasi; aroma dihubungkan ke popcorn, pemakaian beras ke sake dan listrik.

```text
Did you know?

Wild rice isn't actually rice; it belongs to another grass genus.

Jasmine and basmati rice share an aroma compound found in popcorn.

Some rice varieties grow grains colored red, purple, or black.

Flooding rice paddies helps farmers keep competing weeds under control.

Glutinous rice has no gluten; its name describes its stickiness.

Koji mold converts rice starch into sugar during sake brewing.

Even rice husks can become fuel for electric power plants.

Follow for more everyday food surprises.
```

Catatan terbuka: Baris warna masih lebih biasa daripada reveal aroma; istilah genus/koji perlu dinilai apakah tetap nyaman.

[Output asal C2](reference-dna-preview-candidate-0.5.1.md#e07--c2) · [baseline B1](reference-dna-preview-baseline-2026-11-05.md).

## C — Canadian cities

Baseline pendek: “Toronto's PATH extends over 30 kilometers, mostly beneath downtown streets.”

Perubahan: Angka jalur kota terpisah diganti pasangan fitur per baris, dengan dimensi berbeda.

```text
Did you know?

Toronto's PATH goes underground; Calgary's +15 skywalks rise above streets.

Ottawa skates on a canal; Winnipeg on frozen rivers.

Québec City keeps old ramparts; Halifax has a star-shaped fort.

Vancouver has a seaside path; Edmonton has sprawling river-valley parkland.

Montréal has outdoor stairs; St. John's has colorful row houses.

Toronto runs streetcars; Vancouver runs driverless SkyTrain cars.

Victoria's winters bring rain; Calgary's Chinooks bring sudden warmth.

Which city would surprise you most?
```

Catatan terbuka: Kontras streetscape dan climate bisa terasa lebih umum daripada pembuka.

[Output asal C3](reference-dna-preview-candidate-0.5.2.md#e10--c3) · [baseline B1](reference-dna-preview-baseline-2026-11-05.md).

## D — Zipper history

Baseline pendek: “An early zipper-like clothing closure was patented back in 1851.”

Perubahan: Pembuka tanggal diganti fungsi boot laces, penutup tanggal diganti inventor tidak sempat mendengar nama zipper.

```text
Did you know?

Zippers began as a way to replace laces on boots.

An early version flopped at the 1893 Chicago World's Fair.

Early fasteners could jam or even spring open unexpectedly.

Gideon Sundback improved the design using interlocking metal teeth.

American soldiers used zippers on clothing and gear during World War I.

The name "zipper" came from the sound of fastening rubber boots.

The original inventor died before his invention was called a zipper.

Follow for more surprising invention stories.
```

Catatan terbuka: Masih ada alur kronologis dan dua failure beats. Skor 13/16, perlu judgement pemilik, bukan disembunyikan sebagai contoh unggulan.

[Output asal C2](reference-dna-preview-candidate-0.5.1.md#e11--c2) · [baseline B1](reference-dna-preview-baseline-2026-11-05.md).

## Akses seluruh 12 kasus

Empat kartu di atas adalah pilihan ringkas. Pemilik dapat menilai seluruh set
melalui record utuh berikut; nilai keseluruhan tidak menyembunyikan dua kasus
yang tepat ambang.

| Kasus | Attempt/source | Skor | Output utuh |
| --- | --- | ---: | --- |
| E01 | C3/0.5.2 | 15/16 | [Record](reference-dna-preview-candidate-0.5.2.md) |
| E02 | C4/0.5.3 | 14/16 | [Record](reference-dna-preview-candidate-0.5.3.md) |
| E03 | C2/0.5.1 | 15/16 | [Record](reference-dna-preview-candidate-0.5.1.md) |
| E04 | C2/0.5.1 | 15/16 | [Record](reference-dna-preview-candidate-0.5.1.md) |
| E05 | C2/0.5.1 | 16/16 | [Record](reference-dna-preview-candidate-0.5.1.md) |
| E06 | C2/0.5.1 | 13/16 | [Record](reference-dna-preview-candidate-0.5.1.md) |
| E07 | C2/0.5.1 | 15/16 | [Record](reference-dna-preview-candidate-0.5.1.md) |
| E08 | C3/0.5.2 | 15/16 | [Record](reference-dna-preview-candidate-0.5.2.md) |
| E09 | C2/0.5.1 | 15/16 | [Record](reference-dna-preview-candidate-0.5.1.md) |
| E10 | C3/0.5.2 | 15/16 | [Record](reference-dna-preview-candidate-0.5.2.md) |
| E11 | C2/0.5.1 | 13/16 | [Record](reference-dna-preview-candidate-0.5.1.md) |
| E12 | C3/0.5.2 | 16/16 | [Record](reference-dna-preview-candidate-0.5.2.md) |

## Catatan feedback dan tindak lanjut

| Item | Status |
| --- | --- |
| Contoh dan pembanding disiapkan | DONE — kartu A–D dan akses seluruh 12 kasus |
| Penilaian pemilik | ACCEPTED EDITORIAL — A/B/C/D setelah revisi terakhir; penolakan awal tetap dicatat di bawah |
| Revisi yang diminta | DONE — R1/R2 utuh, penerimaan final R2 dan batas bukti tercatat |
| Task 5.4 | DONE — A/B/C/D diterima setelah revisi R2; feedback utuh ada pada penutupan di bawah |

Riwayat setelah feedback R1: A diterima dengan edit subject yang kini
diterapkan, B diterima tanpa perubahan. C/D masih menunggu review atas
[R2](reference-dna-owner-revision-r2.md). A/B tidak diminta dinilai ulang.

Pertanyaan review: untuk A–D, mana sudah sesuai DNA referensi dan mana masih
terasa seperti rangkuman buku? Cukup sebut label dan bagian yang ingin diubah:
topik/angle, pilihan fakta, pengulangan, pembuka/penutup, atau bahasa.
Bila semua sudah sesuai, catat feedback itu secara eksplisit. Bila ada revisi,
rekam ucapan pemilik dan perubahan yang dikerjakan, pertahankan output lama,
lalu lakukan pemeriksaan/retest sesuai dampaknya. Jangan mengartikan penilaian
corpus sebagai izin business Write, approval ready atau publikasi.

## Verifikasi dokumen

Copy disalin dari record attempt dan dicocokkan byte teksnya; tidak ada
placeholder hasil, klaim owner acceptance rekaan atau contoh baru yang
dimasukkan ke plugin. Pemeriksaan dokumen: review isi/tautan dan
`git diff --check`. Tidak perlu gate backend atau generasi ulang untuk
sekadar menyajikan bukti yang sudah ada.


## Feedback pemilik — 5 November 2026

> A — Masih perlu revisi komposisi. Pembukanya sudah kuat dan bahasanya cukup natural. Namun tiga fakta tentang panggilan suara terasa berulang; menjaga kewaspadaan juga muncul dua kali. Ganti sebagian dengan kemampuan atau kebiasaan yang memberikan kejutan berbeda. DNA referensi membutuhkan variasi pengalaman membaca, bukan hanya fakta yang berbeda secara teknis.
>
> B — Paling mendekati DNA referensi. Sudutnya bervariasi: identitas, aroma, warna, pertanian, nama, fermentasi, dan pemanfaatan limbah. Pembuka serta penutupnya cukup menarik. Masih ada frasa akademis seperti “another grass genus” dan “converts rice starch”. Sederhanakan bahasanya; kerangka naskahnya sudah layak dipertahankan.
>
> C — Masih perlu revisi besar pada pemilihan fakta. Pasangan perbandingannya sudah jelas, tetapi banyak pasangan hanya menunjukkan perbedaan biasa. “Kota ini punya jalur pesisir; kota itu punya taman” belum menghasilkan kejutan. Pola kalimat yang sama sepanjang kartu juga terasa seperti tabel geografi. Pilih perbedaan yang lebih mencolok dan memiliki alasan kuat untuk dibandingkan; jangan memaksakan dua kota berpasangan pada setiap baris.
>
> D — Masih perlu revisi urutan dan komposisi. Pembukanya membaik, tetapi bagian tengah tetap mengikuti sejarah perkembangan: versi awal → masalah → perbaikan → pemakaian militer. Fakta asal nama dan penemunya meninggal sebelum nama “zipper” muncul lebih dekat dengan rasa penasaran referensi. Naikkan salah satunya, lalu ganti sebagian kronologi dengan sudut berbeda yang sudah diverifikasi.
>
> Verdict: B cocok dengan revisi bahasa ringan; A perlu variasi fakta; C perlu pemilihan fakta ulang; D perlu mengurangi kronologi. Skor tinggi sebelumnya belum cukup mencerminkan kedekatan suara dan daya tarik dengan tiga referensi.

Feedback ini mengoreksi penerimaan reviewer sebelumnya. A/E02 dan C/E10 gagal
komposisi/daya tarik, D/E11 gagal urutan/komposisi, B/E07 perlu penyuntingan
bahasa. Skor sebelumnya tetap historis; bukan penerimaan aktif.
Task 5.2–5.3 dibuka kembali untuk remediasi dan retest sesuai hasil review.

## Pelaksanaan revisi R1

[Empat naskah R1](reference-dna-owner-revision-r1.md) tersedia sebagai
penyuntingan langsung dari pool riset yang sudah dibaca. B mempertahankan
tujuh fakta/urutan; D memilih enam fakta secara eksplisit dalam rentang
adaptive. Ketika disiapkan R1 belum dinilai pemilik; hasil penilaian dan revisi
berikutnya dicatat di bawah. R1 bukan output host baru.

Aturan lintas topik, comparison dan rubric diperbaiki pada source 0.5.4,
menurut addendum CR-061. Plugin existing sudah diperbarui dan seluruh 15
hash source dibaca balik; check/package PASS terpisah dari penerimaan R1.
Pada tahap R1 task 5.4 masih terbuka; penutupan setelah penerimaan R2 dicatat
di bagian final di bawah.

## Feedback pemilik atas R1 — 5 November 2026

> A — Sudah cocok, dengan satu perbaikan kecil. Variasi faktanya sekarang jauh lebih hidup: berburu, anatomi, kewaspadaan, sarang, pertahanan, suhu tubuh, dan kebiasaan tidur. Pembukanya menarik, penutupnya hangat—dekat dengan DNA DYK.
> Ubah awal menjadi “Adult meerkats…”, karena “Adults” belum jelas merujuk pada hewan apa setelah hook generik. Selebihnya, komposisi dan urutannya layak dipertahankan.
>
> B — Sudah cocok secara editorial. Bahasanya lebih natural, setiap baris membawa sudut berbeda, dan penutup pemanfaatan sekam memberi kejutan tambahan. “Aroma compound” masih cukup mudah dipahami; istilah ilmiah pendek tidak otomatis membuat naskah akademis.
> Fakta warna beras merupakan bagian paling ringan, tetapi masih memberi jeda visual yang bagus. Tidak perlu menggantinya hanya untuk memaksimalkan kejutan setiap baris. Tujuh fakta dan urutannya dapat dipertahankan.
>
> C — Jauh membaik; masih perlu penguatan satu fakta dan sedikit penyuntingan. Sekarang terasa seperti kumpulan tempat yang ingin dikunjungi, bukan tabel geografi.
> - “Edmonton puts roller coasters…” kurang natural. Lebih baik: “A shopping mall in Edmonton has indoor roller coasters.”
> - Quarry menjadi garden masih terlalu umum untuk menghasilkan kejutan kuat. Tambahkan ciri khas yang didukung sumber atau pilih tempat lebih menarik.
> - Penutup kanal menjadi arena skating sudah kuat. Pertahankan di akhir.
>
> D — Masih belum cukup kuat. Enam fakta boleh; masalahnya ada pada bobot pilihan fakta. Pekerjaan railroad brakes terasa seperti trivia biografi pengisi. Pemakaian militer juga belum mengejutkan tanpa konteks tambahan. Sementara itu, asal nama, bunyi boots, dan penggantian bootlaces masih berkumpul di wilayah informasi yang berdekatan.
> Pembuka dan fakta fastener yang bisa terbuka sendiri menarik. Pertahankan keduanya, lalu cari pengganti untuk fakta tengah yang lemah. Memindahkan urutan saja belum cukup. Jangan memaksakan enam fakta jika kandidat keenam tidak memberikan nilai baru—jumlah akhir tetap mengikuti config yang berlaku.
>
> Penilaian R1: A diterima dengan penyuntingan kecil; B diterima secara editorial; C perlu revisi ringan–sedang; D perlu seleksi fakta ulang. Ini penilaian atas naskah yang ditampilkan; keberhasilan generasi host tetap perlu dibuktikan melalui retest.

A diterima bersyarat satu edit jelas (Adult meerkats), B diterima secara editorial.
C dan D belum diterima pada feedback R1; penerimaan R2 dicatat pada penutupan di bawah. Penerimaan ini hanya atas naskah yang ditampilkan,
bukan klaim perilaku generasi host. R1 tetap utuh; R2 dicatat terpisah.

## Penerimaan final pemilik atas R2 — 5 November 2026

> C — Sudah cocok secara editorial; tidak perlu mengganti fakta lagi. Detail quarry kini memberikan transformasi yang mudah dibayangkan. Urutannya juga bervariasi: hiburan → taman → bandara → jalur bawah tanah → skywalk → benteng → skating. Penutup Ottawa kuat dan CTA sesuai dengan rasa ingin mengunjungi tempat-tempat tersebut. Ini sudah dekat dengan DNA Daily Facts.
>
> D — Sudah cocok; perbaikannya paling terasa. Sekarang setiap baris memberikan kejutan berbeda: asal nama, kegagalan mekanis, penggunaan di antariksa, fashion, dan perhiasan. Alurnya tidak lagi terasa seperti kronologi penemuan.
> Kalung yang bisa berubah menjadi gelang menjadi penutup terbaik karena konkret, visual, dan mudah diceritakan ulang. Lima fakta cukup untuk versi ini selama mengikuti config; jangan menambah fakta hanya demi menyamai jumlah pada contoh lain.
>
> Penerimaan editorial contoh: A, B, C, dan D sudah sesuai arah DNA referensi setelah revisi terakhir. Tidak diperlukan putaran revisi tambahan hanya untuk memoles preferensi kecil. Penerimaan ini mencakup pilihan fakta, bahasa, komposisi, dan alur naskah yang ditampilkan; verifikasi faktual serta retest generasi host tetap memiliki bukti masing-masing.

**ACCEPTED EDITORIAL: A, B, C, D.** A adalah R2 setelah edit Adult meerkats;
B sama persis dengan R1 yang diterima; C/D adalah R2 yang ditampilkan.
Tidak ada perubahan copy setelah penerimaan ini. D tetap lima fakta dalam
config adaptive 5–9. Tidak ada polishing tambahan yang diminta.

Task 5.4 selesai: contoh dan pembanding disajikan, feedback awal/R1/R2 dan
revisi tercatat. Ini penerimaan corpus QA, bukan checkpoint GO setiap draft,
bukan approval ready, bukan otorisasi Write dan bukan bukti generasi host.
Task 5.2–5.3 tetap terbuka untuk retest host pada instruksi terpasang;
task 6 saved-copy tetap terpisah. Seluruh bukti FAIL/penilaian lama dipertahankan.
