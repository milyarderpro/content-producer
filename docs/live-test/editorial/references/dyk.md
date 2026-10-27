# Audit referensi — dyk

Sumber: [`post-dyk.txt`](../../../../dataset-reference/post-dyk.txt). File ini dipakai untuk pola editorial, bukan sumber pembuktian fakta. Pemilik menyatakan sampelnya berjuta views; file tidak menyediakan field views atau pembanding post berperforma rendah.

## Cakupan dan hitungan

| Ukuran                            |                                                              Hasil |
| --------------------------------- | -----------------------------------------------------------------: |
| Rekaman JSONL                     |                                                                103 |
| Rentang ID dalam file             |                                              `POST-055`–`POST-157` |
| Hook                              |                              102 `DID YOU KNOW`, 1 `DID YOU KNOW!` |
| Arsitektur label utama            | 46 single subject, 41 themed, 9 mixed; 7 memakai label khusus lain |
| Jumlah fakta metadata             |                                           5–11; rerata sekitar 7,6 |
| Kata seluruh `content`            |                       rerata sekitar 86; termasuk hook dan penutup |
| Metadata engagement tidak lengkap |           `POST-081`, `POST-131`, `POST-151` memiliki nilai `null` |

`POST-055` juga ada di file Curious Mind tetapi merupakan **post berbeda**; ID global tidak unik dan kunci audit harus menyertakan akun. `POST-059`, `POST-060`, dan `POST-070` memiliki jumlah baris nonkosong yang tidak cocok dengan `fact_count + hook + CTA`; ini dapat berupa CTA tambahan atau susunan tidak rapi. Dari 788 baris tengah (setelah baris pertama dan terakhir dikecualikan), panjang rata-rata sekitar 9,8 kata dan median 10; ini proksi, bukan hitungan fakta definitif. Statistik kata dihitung dari whitespace dan bukan metrik renderer/server.

Sebelas pasangan **unik berdasarkan ID** dyk–Curious Mind mempunyai **baris fakta yang identik seluruhnya** setelah huruf kecil dan tanda baca dinormalisasi; 13 kemunculan raw mencakup dua pasangan yang terhitung ulang karena rekaman Curious Mind duplikat. CTA, emoji, atau label topik dapat berbeda. Empat pasangan lain berbagi sekitar 75–89% baris fakta secara identik menurut heuristik yang sama. Ini bukan bukti siapa menyalin siapa, tetapi mengurangi independensi tiga sumber sebagai contoh bentuk; lihat [metode dan pasangan](synthesis.md#overlap-dan-denominator).

## DNA yang teramati

- **Topik:** label terbanyak Animal Facts (19/103), Human Body (10), Food Science (9), dan Nature & Science (6). Beragam label yang lebih kecil mencakup hewan, tempat, sejarah, teknologi, budaya, dan praktik sehari-hari.
- **Format:** banyak koleksi berjangkar satu subjek atau satu tema, lazimnya 7–8 fakta. Variasi khusus mencakup koreksi mitos, perbandingan, dan trivia emosional tentang perilaku hewan. Metadata `format` terutama menggambarkan jumlah fakta, bukan nama lima `format_key` plugin; pemetaan ke format plugin harus melalui penilaian editorial.
- **Gaya:** hook kapital pendek, baris fakta lugas, pembukaan cepat, sering memakai kontras/angka/kemampuan yang mengejutkan. Bahasa percakapan terasa lebih emotif daripada Curious Mind, termasuk seruan dan emoji. Ini cocok sebagai bukti bahwa teks perlu mudah dipindai, **bukan** alasan memasukkan ALL CAPS, emoji, guilt-bait, atau sensasionalisme ke kebijakan `conversational_credible`.
- **CTA:** penutup beragam (`like`, `subscribe`, `follow`, share); 40/103 baris terakhir memuat `follow` dan 32/103 memuat `like`. Sebagian kalimat menggabungkan lebih dari satu tujuan atau memakai tekanan emosional. Plugin sebaiknya mempertahankan satu interaksi yang relevan dengan format.
- **Daya tarik bentuk:** subjek mudah dikenali, variasi sudut dalam satu koleksi, myth reversal, dan fakta relasional yang dapat dipahami tanpa penjelasan akademis panjang.

## Batas dan hal yang tidak ditiru

Beberapa contoh bertema home remedies, kesehatan, keselamatan, atau binatang berbahaya (`POST-056`, `POST-060`, `POST-063`) memerlukan tinjauan sumber dan keselamatan ekstra sebelum dipakai sebagai ide. Klaim faktual dalam dataset tidak diperlakukan sebagai benar hanya karena engagement tinggi. Ada pula CTA beremoji, frasa manipulatif, dan kasus tanpa CTA yang jelas (`POST-057` berakhir dengan fakta, bukan ajakan); semua itu adalah variasi data, bukan ketentuan produk. Output baru harus mempertahankan `en-US` yang natural dan jelas untuk US/UK/CA/AU, menghindari slang regional serta kalimat yang terlalu ilmiah atau terlalu dramatis.
