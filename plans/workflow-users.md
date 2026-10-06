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
   - Jumlah fakta per post.
   - Format video statis 13 detik.
   - Riwayat konten yang pernah dibuat.

3. **ChatGPT mencari dan menyeleksi fakta**

   ChatGPT menyusun kandidat fakta, memeriksa sumber, lalu memilih fakta yang:

   - Menarik dan mudah dipahami.
   - Memiliki potensi rasa penasaran atau kejutan.
   - Cocok ditampilkan dalam waktu 13 detik.
   - Tidak terlalu rumit atau memerlukan penjelasan panjang.
   - Aman dan tidak menyesatkan.

4. **Plugin memeriksa duplikasi**

   Sebelum naskah diselesaikan, plugin mengecek seluruh fakta yang sudah pernah dibuat atau sedang dikerjakan di chat lain.

   Pemeriksaan mencakup:

   - Fakta yang sama persis.
   - Fakta yang hanya berbeda susunan kata.
   - Fakta dengan subjek dan klaim yang sama.
   - Fakta yang sudah direservasi oleh proses lain.

   Jika ditemukan kemiripan, ChatGPT menggantinya dengan fakta lain.

5. **ChatGPT menulis naskah final**

   Fakta yang lolos kemudian ditulis menggunakan:

   - Natural American English.
   - Kosakata yang tetap mudah dipahami audiens UK, CA, AU, dan global.
   - Kalimat pendek dan cepat dibaca.
   - Hook kuat.
   - Gaya menarik tanpa clickbait berlebihan.
   - Struktur yang mengikuti DNA tiga dataset referensi.

6. **Pemeriksaan kualitas**

   Sebelum ditampilkan, sistem memeriksa:

   - Keunikan fakta.
   - Kejelasan kalimat.
   - Konsistensi angka, nama, dan satuan.
   - Kesesuaian dengan Page.
   - Keterbacaan untuk video 13 detik.
   - Caption dan hashtag.
   - Kelengkapan sumber referensi.

7. **Hasil ditampilkan dalam bagian terpisah**

   Format hasil akhirnya kira-kira seperti ini:

   **CANVA COPY**

   - Hook atau headline.
   - Fakta 1.
   - Fakta 2.
   - Fakta 3.
   - Fakta 4.
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

9. **Post disetujui dan disimpan**

   Setelah Anda mengatakan:

   > Setujui post ini.

   Status post berubah dari `draft` menjadi `ready`. Fakta yang digunakan juga diamankan agar tidak dipakai oleh post lain.

10. **Salin ke Canva dan Facebook**

   Proses manualnya:

   - Salin bagian **CANVA COPY** ke template Canva.
   - Tambahkan background bergerak.
   - Ekspor sebagai video Reel 13 detik.
   - Upload ke Facebook.
   - Salin bagian **FACEBOOK CAPTION**.
   - Salin bagian **HASHTAGS**.
   - Publikasikan atau jadwalkan melalui Facebook.

11. **Tandai sebagai sudah diposting**

   Setelah konten terbit, Anda cukup mengatakan:

   > Tandai post ABC123 sudah diposting.

   Sistem mengubah status menjadi `posted`. Riwayat tersebut akan dipakai untuk mencegah konten yang sama dibuat kembali.

## Jika membuat kalender konten

Perintahnya juga tetap sederhana:

> Buat kalender 14 post untuk Page Curious World, satu post per hari mulai 10 Oktober, dengan tema campuran.

Sistem akan:

1. Membuat 14 post satu per satu.
2. Memeriksa duplikasi setiap post.
3. Memberikan tanggal pada setiap post.
4. Menyimpannya dalam status `draft` atau `ready`.
5. Menampilkan daftar post berdasarkan tanggal.
6. Memungkinkan Anda merevisi, memindahkan jadwal, atau mengganti salah satu post.

Kalender tidak memerlukan tabel atau sistem terpisah; kalender merupakan tampilan dari post yang sudah memiliki tanggal jadwal.

## Jika bekerja menggunakan beberapa chat

Anda dapat menjalankan beberapa chat secara paralel, misalnya:

- Chat 1 mengerjakan Page A.
- Chat 2 mengerjakan Page B.
- Chat 3 membuat kalender Page C.

Setiap chat tetap menggunakan database yang sama. Reservasi fakta akan mencegah dua chat mengambil fakta yang sama pada waktu bersamaan.

Untuk MVP, AI bekerja ketika chat sedang aktif—belum ada proses produksi otomatis yang terus berjalan sendiri di background.

Dengan demikian, pekerjaan rutin Anda nantinya hanya:

**Berikan perintah → review hasil → setujui → salin ke Canva → salin caption dan hashtag ke Facebook → tandai sebagai posted.**

Alur ini sesuai dengan mekanisme plugin MCP: ChatGPT memilih tool yang diperlukan, server memproses data, lalu hasilnya digunakan untuk melanjutkan percakapan dan menghasilkan output akhir. [Dokumentasi resmi OpenAI](https://developers.openai.com/plugins/concepts/mcp-server)
