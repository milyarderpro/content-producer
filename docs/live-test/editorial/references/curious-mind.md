# Audit referensi — Curious Mind

Sumber: [`post-coriousmind.txt`](../../../../dataset-reference/post-coriousmind.txt). Audit ini membaca **bentuk konten**, bukan memvalidasi kebenaran fakta atau membuktikan penyebab views. Pemilik menyatakan setiap sampel dipilih dari post berjuta views; file hanya memuat engagement, tidak memuat views maupun sampel post yang kurang berhasil.

## Cakupan dan hitungan

| Ukuran                                   |                                                      Hasil |
| ---------------------------------------- | ---------------------------------------------------------: |
| Baris JSONL                              |                                                         55 |
| Rekaman unik berdasarkan ID dalam akun   |                                                         51 |
| Duplikat identik                         |              `POST-016`–`POST-019`, masing-masing dua kali |
| Naskah `content` unik setelah dedup ID   |                                                         50 |
| Arsitektur pada 51 rekaman unik          |                      23 themed, 20 single subject, 8 mixed |
| Jumlah fakta pada metadata unik          |                                   6–10; rerata sekitar 7,9 |
| Kata seluruh `content` pada rekaman unik |                   rerata sekitar 82; termasuk hook dan CTA |
| Hook pada 55 baris raw                   | 27 `Did You Know?`, 16 `DID YOU KNOW?`, 12 `Did you know?` |

Penghitungan kata menormalkan whitespace dalam `content` dan hanya perkiraan editorial, bukan `text_metrics` server. Untuk statistik pola, gunakan 51 rekaman unik menurut ID; angka hook raw ditampilkan agar anomali sumber terlihat. `POST-047` dan `POST-052` memiliki `content` identik tetapi ID dan engagement berbeda: keduanya tetap dua record, **bukan dua pola naskah independen**. Di 55 rekaman raw, 438 baris tengah (setelah baris pertama dan terakhir dikecualikan) rata-rata sekitar 9 kata, median 9; ini hanya proksi panjang fakta karena struktur hook/CTA tidak selalu rapi. Metadata `fact_count` tidak sama dengan jumlah baris nonkosong dikurangi hook dan CTA pada `POST-006`, `POST-033`, dan `POST-034`; dua CTA atau susunan teks tambahan dapat menjelaskannya. Jangan memperbaiki file referensi diam-diam.

## DNA yang teramati

- **Topik:** label raw yang paling sering adalah Animal Facts (8/55), lalu Food Facts, General Trivia, Human Body, dan Nature & Science (masing-masing 6/55). Ini bukan persentase target untuk Page baru; label topik saling berdekatan dan empat baris terduplikasi.
- **Susunan:** hook sangat pendek, lalu umumnya 7–9 fakta mandiri pada baris terpisah dan satu CTA. Single subject menggabungkan anatomi/asal/perilaku/angka dalam satu jangkar yang familiar; themed memakai payung sempit seperti makanan, geografi, atau teknologi. Urutan cenderung membuka dengan keanehan yang mudah dipahami dan menutup dengan fakta yang dapat dibagikan.
- **Ritme bahasa:** kalimat deklaratif, kata konkret, subjek umum, angka/perbandingan sesekali, sedikit terminologi teknis. Nuansanya American-leaning English yang dapat dibaca audiens lintas US/UK/CA/AU, bukan bukti semua baris telah disunting menjadi `en-US` konsisten. Bentuk huruf hook berubah-ubah; plugin sebaiknya memilih sentence case yang stabil.
- **CTA:** 43/55 baris raw berakhir dengan kalimat yang memuat `follow`; sisanya memakai variasi subscribe/comment atau penutup lain. Pola interaksi yang dapat diambil adalah **satu tujuan**, bukan menyalin CTA hiperbolik.
- **Daya tarik bentuk:** jangkar familiar + detail tak terduga, beberapa relasi fakta dalam satu koleksi, satu ide utama per baris, serta angka yang cukup spesifik untuk menimbulkan rasa ingin tahu.

## Batas dan hal yang tidak ditiru

Beberapa koleksi mixed longgar dan ada baris yang menyatukan lebih dari satu klaim. Klaim hukum, kesehatan, rekor, dan psikologi pada contoh seperti `POST-006`, `POST-031`, dan `POST-034` perlu sumber primer, tanggal, populasi, atau qualifier sebelum dipakai ulang secara konseptual. Di dataset juga ada wording yang terlalu yakin, klaim sensasional, dan CTA dengan janji berlebihan. Penutup `POST-016` dan `POST-018` bahkan tampak terpotong/tidak idiomatis; kemudahan scan tidak boleh dibeli dengan tata bahasa rusak. Jangan menjadikan kolom `dna`, `surprise`, maupun `engagement` sebagai penilaian fakta objektif. Untuk output baru, pertahankan hook jujur, fakta terverifikasi, koleksi koheren, satu CTA natural, dan kalimat orisinal.
