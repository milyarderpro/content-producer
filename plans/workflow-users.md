# Panduan Workflow Pengguna — Content Producer MVP

Dokumen ini adalah panduan operasional singkat. Aturan produk tetap mengacu pada `plans/PRD.md`, sedangkan detail penyimpanan dan transaksi mengacu pada `plans/database-design.md`. Jika panduan ini berbeda dari kedua dokumen tersebut, panduan ini harus diperbarui.

## Workflow produksi konten

1. **Anda memilih plugin di ChatGPT**

   Buka chat, aktifkan plugin, kemudian berikan perintah sederhana, misalnya:

   > Buatkan 3 post untuk Page Curious World, tema mixed facts, untuk jadwal Senin sampai Rabu.

2. **Sistem membaca profil Page**

   Plugin mengambil pengaturan Page dari Supabase, seperti:

   - Nama Page.
   - Niche dan tema yang diperbolehkan.
   - Gaya bahasa.
   - Target audiens US, UK, CA, dan AU.
   - Mode jumlah fakta: `fixed` atau `adaptive` 5–9.
   - Anggaran karakter template Canva.
   - Kebijakan pemakaian ulang fakta: unik untuk seluruh workspace atau unik hanya dalam Page tersebut.
   - Format video statis 13 detik.
   - Riwayat konten yang pernah dibuat.

3. **ChatGPT mencari dan menyeleksi fakta**

   ChatGPT menyusun kandidat fakta, memeriksa sumber, lalu memilih fakta yang:

   - Menarik dan mudah dipahami.
   - Memiliki potensi rasa penasaran atau kejutan.
   - Cocok ditampilkan dalam waktu 13 detik.
   - Tidak terlalu rumit atau memerlukan penjelasan panjang.
   - Aman dan tidak menyesatkan.

   Pada mode `adaptive`, sistem menyiapkan kandidat sampai batas maksimum lalu mulai dari jumlah minimum Page. Dengan default 5/7/9, sistem mulai dari 5 fakta terbaik. Fakta tambahan hanya dipakai jika kualitas tetap tinggi dan anggaran karakter masih cukup. Jadi hasil dapat berisi 5, 6, 7, 8, atau 9 fakta tanpa pemilihan acak murni.

4. **Plugin memeriksa kesamaan dan kelayakan penggunaan**

   Sebelum naskah diselesaikan, plugin mengecek apakah klaim sudah memiliki catatan fakta utama (canonical), lalu membaca Page yang pernah memakainya. Setiap klaim tetap hanya memiliki satu catatan utama; izin memakainya kembali ditentukan oleh kebijakan Page tujuan.

   Pemeriksaan mencakup:

   - Fakta yang sama persis.
   - Fakta yang hanya berbeda susunan kata.
   - Fakta dengan subjek dan klaim yang sama.
   - Fakta yang sudah direservasi oleh proses lain.

   Jika Page memakai `workspace_unique`, fakta yang pernah dipakai Page mana pun diganti. Jika Page memakai `page_unique`, fakta dari Page lain boleh dipakai kembali, tetapi fakta yang pernah dipakai Page tujuan tetap diganti. Default Page baru adalah `workspace_unique`.

5. **ChatGPT menulis naskah final**

   Fakta yang lolos kemudian ditulis menggunakan:

   - Natural American English.
   - Kosakata yang tetap mudah dipahami audiens UK, CA, AU, dan global.
   - Kalimat pendek dan cepat dibaca.
   - Hook kuat.
   - Gaya menarik tanpa clickbait berlebihan.
   - Struktur yang mengikuti DNA tiga dataset referensi.

   Sistem menghitung panjang hook, setiap fakta, seluruh blok fakta, CTA, dan Canva copy final. Fakta yang panjang membuat jumlah akhir cenderung mendekati minimum; fakta yang ringkas memungkinkan jumlah lebih banyak.

6. **Pemeriksaan kualitas**

   Sebelum ditampilkan, sistem memeriksa:

   - Keunikan fakta.
   - Kejelasan kalimat.
   - Konsistensi angka, nama, dan satuan.
   - Kesesuaian dengan Page.
   - Keterbacaan untuk video 13 detik.
   - Seluruh batas karakter Page.
   - Caption dan hashtag.
   - Kelengkapan sumber referensi.

7. **Draft disimpan lalu hasil ditampilkan dalam bagian terpisah**

   Setelah lolos pemeriksaan, post lebih dahulu disimpan sebagai `draft`. Format hasilnya kira-kira seperti ini:

   **CANVA COPY**

   - Hook atau headline.
   - Fakta 1 sampai jumlah final yang dipilih sistem, umumnya 5–9.
   - CTA singkat.

   **FACEBOOK CAPTION**

   Caption yang sudah siap ditempel ke Facebook.

   **HASHTAGS**

   Hashtag yang relevan dengan tema dan Page.

   **INFORMASI INTERNAL**

   - Post ID.
   - Nama Page.
   - Status.
   - Jadwal.
   - Daftar sumber.

   Informasi internal dan sumber tidak perlu disalin ke Canva atau Facebook.

8. **Anda melakukan review**

   Anda bisa langsung menyetujui atau meminta perubahan dengan bahasa biasa, misalnya:

   - “Ganti fakta nomor 3.”
   - “Buat hook lebih kuat.”
   - “Caption terlalu panjang.”
   - “Gunakan tema animals saja.”
   - “Buat bahasanya lebih conversational.”

   Jika sebuah fakta diganti, fakta penggantinya kembali melewati pemeriksaan duplikasi.

9. **Post disetujui**

   Setelah Anda mengatakan:

   > Setujui post ini.

   Post sudah tersimpan sebagai `draft` sejak hasil pertama ditampilkan. Persetujuan mengubah statusnya menjadi `ready`; pencatatan penggunaan fakta tetap mengikuti kebijakan Page tujuan.

10. **Salin ke Canva dan Facebook**

   Proses manualnya:

   - Salin bagian **CANVA COPY** ke template Canva.
   - Tambahkan latar bergerak.
   - Ekspor sebagai video Reel 13 detik.
   - Upload ke Facebook.
   - Salin bagian **FACEBOOK CAPTION**.
   - Salin bagian **HASHTAGS**.
   - Publikasikan atau jadwalkan melalui Facebook.

11. **Tandai sebagai sudah diposting**

   Setelah konten terbit, Anda cukup mengatakan:

   > Tandai post ABC123 sudah diposting.

   Sistem mengubah status menjadi `posted`. Pencatatan fakta tersebut akan digunakan untuk menilai pemakaian berikutnya sesuai kebijakan Page tujuan.

## Jika membuat kalender konten

Perintahnya juga tetap sederhana:

> Buat kalender 14 post untuk Page Curious World, satu post per hari mulai 10 Oktober, dengan tema campuran.

Sistem akan:

1. Membuat 14 post satu per satu.
2. Memeriksa duplikasi setiap post.
3. Memberikan tanggal pada setiap post.
4. Menyimpan setiap post baru sebagai `draft`.
5. Mengubah post yang Anda setujui menjadi `ready`.
6. Menampilkan daftar post berdasarkan tanggal.
7. Memungkinkan Anda merevisi, memindahkan jadwal, atau mengganti salah satu post.

Kalender tidak memerlukan tabel atau sistem terpisah; kalender merupakan tampilan dari post yang sudah memiliki tanggal jadwal.

## Jika bekerja menggunakan beberapa chat

Anda dapat menjalankan beberapa chat secara paralel, misalnya:

- Chat 1 mengerjakan Page A.
- Chat 2 mengerjakan Page B.
- Chat 3 membuat kalender Page C.

Setiap chat tetap menggunakan database yang sama. Reservasi mencegah dua chat memiliki fakta yang sama pada waktu bersamaan. Setelah transaksi pertama selesai, kelayakan pemakaian berikutnya tetap ditentukan oleh kebijakan Page tujuan.

Untuk MVP, AI bekerja ketika chat sedang aktif—belum ada proses produksi otomatis yang terus berjalan sendiri di latar belakang.

Dengan demikian, pekerjaan rutin Anda nantinya hanya:

**Berikan perintah → tinjau hasil → setujui → salin ke Canva → salin caption dan hashtag ke Facebook → tandai sebagai `posted`.**

Detail teknis tidak perlu diingat saat penggunaan harian; plugin memilih tool yang diperlukan, sedangkan Anda cukup memberi perintah, meninjau hasil, dan mengonfirmasi perubahan status.
