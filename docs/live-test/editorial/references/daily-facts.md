# Audit referensi — Daily Facts

Sumber: [`post-dailyfacts.txt`](../../../../dataset-reference/post-dailyfacts.txt). Hasil ini mendeskripsikan pola 18 sampel yang dipilih pemilik dari post berjuta views. File memiliki baris kosong di akhir; hanya 18 record JSON nonkosong yang dihitung, bukan jumlah baris fisik. Views tidak tercatat dalam file; tidak tersedia pembanding post nonviral.

## Cakupan dan hitungan

| Ukuran                 |                                                                       Hasil |
| ---------------------- | --------------------------------------------------------------------------: |
| Rekaman JSONL          |                                                  18 (`POST-158`–`POST-175`) |
| Arsitektur             |              12 themed, 6 mixed; tidak ada single-subject berlabel demikian |
| Jumlah fakta metadata  |                                                     5–7; rerata sekitar 6,1 |
| Kata seluruh `content` |                                    rerata sekitar 94; termasuk hook dan CTA |
| Hook                   |                                                          18 `Did you know?` |
| CTA akhir              |                     18 memakai kalimat identik yang meminta like dan follow |
| Topik utama            | Food Science 5, General Trivia 4, U.S. Cities 2, Western Countries Trivia 2 |

Tidak ditemukan selisih sederhana antara `fact_count` dan jumlah baris nonkosong dikurangi hook/CTA. Dari 109 baris tengah (setelah baris pertama dan terakhir dikecualikan), panjang rata-rata sekitar 13,4 kata dan median 14; ini proksi panjang fakta, bukan `text_metrics` server. Hitungan kata menormalkan whitespace.

## DNA yang teramati

- **Format:** kartu pendek berisi 5–7 fakta, sering berupa satu tema praktis (terutama penyimpanan makanan) atau kumpulan tempat/negara. Baris relatif lebih panjang daripada dua akun lain; jumlah fakta lebih sedikit tidak otomatis berarti lebih ringan dibaca.
- **Topik:** benda dan kegiatan yang akrab—makanan, dapur, kota besar, negara berbahasa Inggris—diberi detail penyimpanan, perubahan hasil, angka, rekor, atau kontras. Contoh geography cenderung menekankan US, UK, dan Canada, tetapi rencana audiens juga mencakup Australia.
- **Bahasa:** hook stabil dan sederhana; baris memakai nama objek di awal, lalu kondisi/tindakan dan konsekuensi. Gaya lebih penjelas daripada dua referensi lain. Beberapa kalimat panjang atau formal, sehingga aturan plugin perlu mengutamakan scanability dan kata sehari-hari, bukan meniru panjangnya.
- **CTA:** formula akhir diulang pada semua sampel serta meminta dua aksi. Ini menunjukkan adanya slot CTA, bukan pola kata atau jumlah aksi yang perlu direplikasi. `themed_utility` lebih selaras dengan satu CTA `save` yang relevan.

## Batas dan hal yang tidak ditiru

Survival, keamanan rumah, petunjuk food safety, dan perbandingan nutrisi dalam contoh seperti `POST-171`, `POST-174`, dan `POST-175` berpotensi berisiko jika klaim atau kondisi hilang. Banyak superlatif tempat dan angka dapat berubah menurut definisi, wilayah, serta tahun; verifikasi dari sumber independen diperlukan. Mixed trivia tanpa payung kuat dan CTA boilerplate yang berulang bukan target kualitas. Jangan mengambil tips praktis langsung dari dataset sebagai saran yang sudah aman.
