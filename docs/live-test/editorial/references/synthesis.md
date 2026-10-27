# Sintesis tiga referensi — DNA untuk evaluasi trivia

Audit sumber: [Curious Mind](curious-mind.md), [dyk](dyk.md), dan [Daily Facts](daily-facts.md). Total 176 rekaman JSON nonkosong yang dapat diparse; baris kosong di akhir file Daily Facts tidak dihitung. Empat rekaman Curious Mind adalah duplikat identik, sehingga ada **172 rekaman unik berdasarkan akun + ID**. `POST-055` digunakan oleh dua akun untuk konten berbeda, sehingga ID saja bukan kunci global. Semua statistik sumber tetap dilaporkan dengan denominator raw/unik yang jelas.

## Overlap dan denominator

| Unit hitung                              | Jumlah | Kegunaan                                                                           |
| ---------------------------------------- | -----: | ---------------------------------------------------------------------------------- |
| Rekaman sumber raw (nonkosong)           |    176 | Menjelaskan isi JSON yang valid, termasuk rekaman ulang; bukan jumlah baris fisik  |
| Record unik `account + id`               |    172 | Dasar statistik metadata/post; tidak menyiratkan naskah independen                 |
| String `content` unik persis             |    171 | Mengungkap `POST-047` dan `POST-052` Curious Mind yang sama persis                 |
| Susunan baris tengah unik ternormalisasi |    160 | Proksi variasi naskah tanpa baris pertama/terakhir, bukan identitas semantik fakta |

Normalisasi hitungan terakhir: ambil baris nonkosong di antara baris pertama dan terakhir, ubah huruf menjadi kecil, hilangkan tanda baca, dan rapikan whitespace. Baris tengah adalah **proksi fakta**, sebab beberapa post memiliki heading tambahan atau tanpa CTA. Dengan cara ini terdapat **11 pasangan unik berdasarkan ID lintas Curious Mind–dyk dengan seluruh baris fakta identik**; bila empat rekaman Curious Mind yang berulang tetap dihitung, terdapat 13 kemunculan pasangan raw. Contohnya `POST-002`/`POST-103`, `POST-003`/`POST-113`, dan `POST-009`/`POST-134`; CTA/emoji atau metadata dapat berbeda. Empat pasangan tambahan memiliki 75–89% baris fakta identik menurut pembagi jumlah baris yang lebih pendek (`POST-005`/`POST-136`, `POST-011`/`POST-132`, `POST-012`/`POST-131`, `POST-024`/`POST-149`). Ini heuristik tekstual, bukan penilaian plagiarisme atau atribusi asal. Perulangan antar-akun **tidak boleh dihitung sebagai konfirmasi independen** bahwa suatu format atau klaim menghasilkan views.

## Pola bersama yang layak diuji

| Unsur   | Pola referensi                                                     | Target editorial plugin                                   |
| ------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| Jangkar | Hewan, tubuh, makanan, rumah, atau tempat yang akrab               | Topik mudah dikenali audiens US/UK/CA/AU                  |
| Kejutan | Kontras, myth reversal, angka, kemampuan, asal yang tidak disangka | Surprise bermakna dan terverifikasi, bukan shock palsu    |
| Baris   | Fakta pendek, mandiri, sering satu proposisi                       | Satu klaim utama per baris, qualifier penting tetap utuh  |
| Koleksi | Satu subjek atau satu tema; sebagian mixed kurang koheren          | Hubungan antarbaris jelas, tanpa filler/duplikasi makna   |
| Bahasa  | English percakapan, American-leaning, mudah dipindai               | `en-US` natural, konkret, nonakademis, tanpa slang sempit |
| Rangka  | Hook singkat → fakta terpisah → CTA                                | Hook jujur, scanability baik, satu CTA relevan            |

Curious Mind memberi contoh jangkar dan variasi fakta dalam 7–9 baris; dyk memperlihatkan energi emosional, myth reversal, dan format hewan; Daily Facts memperlihatkan utilitas sehari-hari serta tema tempat dengan 5–7 baris. Kombinasi yang diinginkan **bukan menyalin rata-rata**, melainkan memilih format yang cocok dan menghindari kelemahan tiap akun: mixed tanpa payung, CTA berlebihan/berulang, klaim terlalu pasti, emoji/guilt-bait, serta baris panjang yang sulit dipindai.

Kelima `format_key` plugin merupakan **kategori editorial produk**, bukan label yang tersedia langsung di dataset. Audit tidak boleh menyamakan `architecture` atau string `format` sumber dengan `single_subject_fast`, `themed_utility`, `emotional_animal_collection`, `comparison`, atau `myth_vs_fact` tanpa menilai naskahnya. Panjang dan jumlah fakta di dokumen format adalah preferensi; hard limit hanya dapat dikonfirmasi oleh system checks pada workflow tersimpan.

**Kekuatan bukti berbeda menurut format.** Single-subject pendek dan koleksi satu tema berulang jelas pada Curious Mind dan dyk; contoh utilitas juga terlihat terutama di Daily Facts, walau tips keamanan perlu disaring. `myth_vs_fact` tampak sebagai perangkat pada sebagian post (misalnya dyk `POST-056`), sedangkan perbandingan paralel dan koleksi beberapa hewan dengan satu emosi tidak dominan atau konsisten di sumber. Karena itu lima format adalah **hipotesis desain plugin yang diuji**, bukan klaim bahwa masing-masing sama banyak atau sama sukses dalam tiga dataset. Uji format langka tetap perlu, tetapi jangan memakai dataset ini untuk menyatakan format itu terbukti viral.

## Batas interpretasi

- Pemilik memilih hanya post viral; tanpa kelompok pembanding, analisis tidak membuktikan pola tertentu menyebabkan jutaan views atau memprediksi performa Page baru.
- Engagement yang tercatat bukan views; tiga record dyk memiliki beberapa nilai engagement `null`.
- Setiap klaim baru harus diteliti dari sumber independen. Dataset dan kolom `dna`/`surprise` adalah bukti pola dan anotasi, bukan sumber fakta.
- Menurut pemilik, video referensi berdurasi sekitar 13 detik dan gerak utamanya berada di latar; file JSONL tidak memuat video untuk memverifikasi hal itu. Viewer dapat membaca melalui replay, jadi jangan menyimpulkan seluruh teks harus selesai dalam satu putaran.
- Penilaian naskah memberi bukti gaya/format; hanya jejak workflow dan readback draft yang mendukung klaim penyimpanan serta checks server. Keduanya belum membuktikan kelayakan terbit atau potensi views.
