# Uji utama 30 kasus — direct-save v1

**Status 28 Oktober 2026:** prosedur aktif disiapkan; **0/30 kasus utama telah dijalankan**. Pilot lima format dan retest terfokus tetap di luar denominator. Prompt panjang ber-checkpoint GO di [cases.md](cases.md) adalah arsip v7, bukan teks yang dikirim pada kampanye ini. Page target hanya `Trivia Editorial Test (Internal)` (`f3984ee4-8ae7-4043-8c93-45765f82f46e`), bukan Page Facebook yang akan dipublikasi.

## Operasi dan peran

Reviewer menyiapkan **satu prompt siap-tempel per kasus** dari matriks dan pola di bawah, lalu menyimpan teks final yang diberikan. Pemilik hanya membuka chat baru dengan plugin PRIVATE Content Producer, menempel prompt itu, dan mengirim seluruh jawaban penguji kembali. Pemilik tidak perlu memeriksa URL, memberi GO tambahan, menilai naskah, mengedit file, atau mengelola Issue/PR. Menempel prompt mengizinkan **hanya kasus itu**: maksimal satu reservasi fakta dan satu `save_post` untuk satu draft internal, bukan izin serentak 30 kasus. Tidak ada `approve_post`, revisi, publikasi, Page baru, atau draft kedua. Jika reservasi pasti ditinggalkan setelah kegagalan save yang terkonfirmasi, plugin boleh melepaskan **reservasi kasus itu saja** setelah rekonsiliasi; jangan release ketika state save belum pasti.

Plugin tetap meneliti dan memeriksa sumber **sesuai kebijakan yang berlaku**, lalu menuntaskan dedup sebelum Write. Reviewer menilai DNA dan alur tool secara terpisah tanpa membuka URL per fakta. Copy pertama yang terlihat tetap baseline walau draft tidak tersimpan. Hasil `get_post` yang cocok diperlukan untuk workflow `PASS`; draft yang tersimpan belum otomatis `ready`. Jika hasil Write hilang, lakukan rekonsiliasi READ dan jangan membuat operation key/payload baru untuk “mencoba lagi”. Error atau hold dicatat apa adanya, bukan disulap menjadi draft.

Kampanye berarti **30 chat terpisah**, hingga 30 draft internal dan 30 reservasi berhasil; jumlah faktual bisa lebih kecil jika beberapa kasus berhenti. Perencanaan kasar 10–30 menit per kasus berarti **5–15 jam kumulatif**, dengan ketidakpastian tinggi: pilot yang tersendat pernah jauh lebih lama. Ini bukan janji durasi; jalankan beberapa sesi kerja, bukan satu batch otomatis. Evaluasi tiap lima kasus (satu per format). Kasus yang `BLOCKED` tetap dihitung sebagai satu percobaan dari 30 dan tidak diganti diam-diam. Kasus berikutnya boleh berjalan bila stop-nya terjelaskan dan tidak menyisakan Write yang tak pasti. **Jeda kampanye** jika ada state Write `UNCONFIRMED`, masalah otorisasi/keamanan, atau blocker teknis yang sama pada dua kasus berbeda; reviewer men-triase sebelum prompt selanjutnya. Satu preview lemah atau source hold yang aman tidak memulai ulang pilot.

## Pola prompt yang dibekukan

Untuk kasus **terpandu**, reviewer mengirim kalimat pembuka berikut, mengganti `{brief}` dengan teks kolom matriks dan `{format}` dengan format yang tercatat. ID internal boleh disebut karena format memang eksplisit.

> Jalankan `{ID}` dengan hanya PRIVATE Content Producer pada Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Buat dan simpan tepat satu draft `{format}` tentang {brief}. Tulis naskah orisinal `en-US` yang natural, konkret, mengejutkan atau berguna tanpa clickbait, dan cepat dipindai.

Untuk kasus **implisit**, reviewer mengirim pembuka ini dengan `{brief}` saja. **Jangan masukkan ID yang mengandung kode format, format yang diharapkan, jumlah fakta, hook, CTA, atau layout** ke prompt penguji. Pemetaan internal tetap ada di matriks.

> Gunakan hanya PRIVATE Content Producer pada Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Buat dan simpan tepat satu draft trivia `en-US` yang natural tentang {brief}. Pilih sendiri format paling sesuai dari konfigurasi Page.

Sambungkan pembuka mana pun dengan penutup yang **sama persis** berikut. Reviewer hanya mengirim teks gabungan, tanpa heading/tabel reviewer:

> Ikuti alur normal: riset/bukti → dedup lengkap (READ terarah bila hasil terpotong) → maksimal satu reservasi → maksimal satu `save_post` → `get_post`. Izin kedua Write itu sudah termasuk; jangan menunggu GO. Jika syarat gagal atau Write ditolak, berhenti tanpa retry; jika respons save hilang, rekonsiliasi READ, jangan buat draft kedua. Bila save pasti gagal setelah reservasi, boleh release reservasi kasus ini saja. Jangan revisi, approve, atau publikasikan. Balasan akhir: CANVA COPY pertama, caption, hashtags, format; jika tersimpan, post ID/status/revision, kecocokan `get_post`, system/editorial checks (terutama `trivia.surprise_substantive`), dan metrik server. Jika tidak, tahap dan error persis serta status reservasi. Ringkas sumber tanpa daftar URL.

Pola ini adalah teks prompt lengkap setelah substitusi literal, **bukan** instruksi untuk pemilik menyusun prompt. Reviewer yang menyerahkan versi siap-tempel dan mencatatnya pada record kasus. Prompt yang benar-benar ditempel tetap `UNVERIFIED` bila pemilik tidak mengirim ulang teksnya; jangan mengklaim identitas byte.

## Matriks beku v1

Empat kasus pertama per format terpandu; kasus 05–06 implisit. Nama format di kolom **hanya untuk reviewer** pada kasus implisit. Brief tidak boleh ditambah arahan baru setelah hasil diketahui; deviasi memerlukan revisi baru. Topik yang berpotensi menyentuh keamanan pangan/hewan/tubuh mengikuti source/safety policy plugin, bukan dikurangi syaratnya demi menyimpan draft.

| ID internal | Mode     | Format diharapkan             | `{brief}` untuk prompt                                                                              |
| ----------- | -------- | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| MAIN-SSF-01 | terpandu | `single_subject_fast`         | octopuses sebagai satu subjek; variasikan anatomi dan perilaku tanpa mengulang makna                |
| MAIN-SSF-02 | terpandu | `single_subject_fast`         | honeybees sebagai satu subjek; variasikan perilaku, anatomi, dan fungsi                             |
| MAIN-SSF-03 | terpandu | `single_subject_fast`         | human liver untuk pembaca umum; jangan memberi diagnosis atau pengobatan                            |
| MAIN-SSF-04 | terpandu | `single_subject_fast`         | rice sebagai satu subjek; jangan ubah trivia pangan menjadi saran keselamatan tanpa bukti           |
| MAIN-SSF-05 | implisit | `single_subject_fast`         | the Moon as one familiar subject for a quick trivia card                                            |
| MAIN-SSF-06 | implisit | `single_subject_fast`         | deer as one familiar animal subject for a quick trivia card                                         |
| MAIN-TUT-01 | terpandu | `themed_utility`              | penyimpanan berries; berikan tindakan aman dan hasilnya tanpa janji masa simpan universal           |
| MAIN-TUT-02 | terpandu | `themed_utility`              | penyimpanan fresh culinary herbs; bedakan jenis herb bila material                                  |
| MAIN-TUT-03 | terpandu | `themed_utility`              | penyimpanan bread; perhatikan jenis/kondisi dan hindari klaim universal                             |
| MAIN-TUT-04 | terpandu | `themed_utility`              | penanganan leftovers yang aman; angka suhu/waktu harus didukung bukti yang sesuai                   |
| MAIN-TUT-05 | implisit | `themed_utility`              | practical care of kitchen sponges                                                                   |
| MAIN-TUT-06 | implisit | `themed_utility`              | helping pets stay hydrated in warm weather                                                          |
| MAIN-EAC-01 | terpandu | `emotional_animal_collection` | perilaku sosial elephants yang benar-benar teramati; jangan mengarang motif manusia                 |
| MAIN-EAC-02 | terpandu | `emotional_animal_collection` | ingatan dan interaksi sosial crows yang teramati; hindari klaim loyalitas manusiawi                 |
| MAIN-EAC-03 | terpandu | `emotional_animal_collection` | kerja sama dolphins yang teramati; sebut spesies/konteks bila penting                               |
| MAIN-EAC-04 | terpandu | `emotional_animal_collection` | sinyal sosial horses yang dapat diamati; bedakan perilaku dan perasaan yang disimpulkan             |
| MAIN-EAC-05 | implisit | `emotional_animal_collection` | a warm trivia card about penguin parenting                                                          |
| MAIN-EAC-06 | implisit | `emotional_animal_collection` | a warm trivia card about dogs' social signals                                                       |
| MAIN-CMP-01 | terpandu | `comparison`                  | African versus Asian elephants; gunakan kontras paralel dengan spesies, metrik, dan kondisi selaras |
| MAIN-CMP-02 | terpandu | `comparison`                  | alligators versus crocodiles; bedakan pola umum dari pengecualian spesies                           |
| MAIN-CMP-03 | terpandu | `comparison`                  | dogs versus wolves; hindari stereotip perilaku universal dan pertahankan cakupan populasi           |
| MAIN-CMP-04 | terpandu | `comparison`                  | brown versus white chicken eggs; bandingkan hal sejenis hanya jika sumber mendukung                 |
| MAIN-CMP-05 | implisit | `comparison`                  | a card comparing the Arctic and Antarctic                                                           |
| MAIN-CMP-06 | implisit | `comparison`                  | a card comparing everyday UK and US words for the same things                                       |
| MAIN-MVF-01 | terpandu | `myth_vs_fact`                | miskonsepsi hewan yang sungguh umum; koreksi tepat tanpa membuat mitos palsu                        |
| MAIN-MVF-02 | terpandu | `myth_vs_fact`                | miskonsepsi makanan yang sungguh umum; jangan menyamarkan saran food safety sebagai trivia ringan   |
| MAIN-MVF-03 | terpandu | `myth_vs_fact`                | miskonsepsi tubuh manusia yang sungguh umum; tanpa diagnosis/pengobatan                             |
| MAIN-MVF-04 | terpandu | `myth_vs_fact`                | miskonsepsi ruang angkasa yang sungguh umum; pertahankan konteks astronomi penting                  |
| MAIN-MVF-05 | implisit | `myth_vs_fact`                | a card correcting several common weather misconceptions                                             |
| MAIN-MVF-06 | implisit | `myth_vs_fact`                | a card correcting several common household-care misconceptions                                      |

Urutan kirim: enam putaran suffix `01, 05, 02, 06, 03, 04`; dalam tiap putaran `SSF → TUT → EAC → CMP → MVF`. Jadi lima prompt pertama adalah `MAIN-SSF-01`, `MAIN-TUT-01`, `MAIN-EAC-01`, `MAIN-CMP-01`, `MAIN-MVF-01` dan **langsung dihitung sebagai 1–5/30**. Reviewer tidak meminta pemilik menjalankan kelimanya sekaligus; tunggu hasil tiap kasus, nilai, simpan, lalu kirim prompt berikutnya.

### Prompt pertama siap-tempel — `MAIN-SSF-01`

Teks di bawah adalah hasil substitusi literal pola terpandu + penutup. Ini **satu-satunya** prompt yang diberikan sekarang; kasus berikutnya menunggu hasilnya.

> Jalankan `MAIN-SSF-01` dengan hanya PRIVATE Content Producer pada Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Buat dan simpan tepat satu draft `single_subject_fast` tentang octopuses sebagai satu subjek; variasikan anatomi dan perilaku tanpa mengulang makna. Tulis naskah orisinal `en-US` yang natural, konkret, mengejutkan atau berguna tanpa clickbait, dan cepat dipindai.
>
> Ikuti alur normal: riset/bukti → dedup lengkap (READ terarah bila hasil terpotong) → maksimal satu reservasi → maksimal satu `save_post` → `get_post`. Izin kedua Write itu sudah termasuk; jangan menunggu GO. Jika syarat gagal atau Write ditolak, berhenti tanpa retry; jika respons save hilang, rekonsiliasi READ, jangan buat draft kedua. Bila save pasti gagal setelah reservasi, boleh release reservasi kasus ini saja. Jangan revisi, approve, atau publikasikan. Balasan akhir: CANVA COPY pertama, caption, hashtags, format; jika tersimpan, post ID/status/revision, kecocokan `get_post`, system/editorial checks (terutama `trivia.surprise_substantive`), dan metrik server. Jika tidak, tahap dan error persis serta status reservasi. Ringkas sumber tanpa daftar URL.

## Penilaian dan bukti

Gunakan enam skor DNA 0–2, `format_fit`, status kritis yang benar-benar terlihat, dan verdict workflow **terpisah** menurut [protocol.md](protocol.md). `COMPLETED`/`BLOCKED`/ `NOT RUN` bukan label mutu; `KUAT`/`PERLU REVISI`/`LEMAH` tidak membuktikan kebenaran klaim. Record satu percobaan di `results.jsonl` dan `runs/<ID>-main-direct-save-v1.md`; jangan menimpa pilot/retest. Sumber per klaim tetap tugas plugin dan server; reviewer tidak mengaudit URL satu per satu. Catat release/runtime/config hanya bila terlihat, selain itu `UNVERIFIED`. Jika first copy lemah, catat kelemahannya tanpa mempercantik skor melalui revisi dalam kasus yang sama.
