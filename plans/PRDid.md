# Dokumen Kebutuhan Produk — Content Producer MVP

## 1. Informasi dokumen

| Bagian | Keterangan |
|---|---|
| Nama produk | Content Producer |
| Versi produk | MVP |
| Versi dokumen | 1.1 |
| Status | Draf diselaraskan — menunggu persetujuan |
| Tanggal | 6 Oktober 2026 |
| Bahasa dokumen | Bahasa Indonesia |
| Bahasa konten yang dihasilkan | Bahasa Inggris |
| Platform utama | Plugin pribadi ChatGPT dengan custom MCP server |
| Database | Supabase/Postgres |
| Pengguna utama | Satu pemilik sekaligus pengelola konten |

Dokumen ini menjelaskan produk yang akan kita bangun, alasan produk ini diperlukan, fitur yang wajib tersedia di MVP, batasan produk, standar kualitas, dan syarat agar sistem dianggap siap digunakan untuk produksi.

Dokumen ini belum membahas bentuk tabel database secara terperinci atau urutan pekerjaan coding. Keduanya akan dibuat dalam dokumen terpisah:

- `plans/database-design.md`
- `plans/implementation-plan.md`

### 1.1 Batas kewenangan dokumen

Agar implementasi tidak menafsirkan aturan yang sama secara berbeda:

- `PRDid.md` menjadi sumber utama untuk ruang lingkup produk, perilaku pengguna, aturan konten, dan acceptance criteria.
- `database-design.md` menjadi sumber utama untuk nama tabel, kolom, status, constraint, transaksi, dan tanggung jawab database function.
- `implementation-plan.md` menjadi sumber utama untuk urutan pengerjaan, struktur repository, nama MCP tool final, deployment, dan pengujian.
- Semua ID yang keluar melalui MCP atau ditampilkan kepada pengguna adalah UUID `public_id`. Primary key `bigint` internal tidak pernah diekspos.
- Jika ketiga dokumen berbeda, implementasi harus dihentikan pada bagian tersebut dan ketiga dokumen diperbarui bersama. Tim tidak boleh memilih interpretasi sendiri.

## 2. Ringkasan produk

Content Producer adalah plugin pribadi di ChatGPT untuk membantu membuat konten trivia dan fakta berbahasa Inggris bagi beberapa Facebook Page.

Konten ditujukan terutama untuk audiens Amerika Serikat, Inggris, Kanada, dan Australia. Walaupun menggunakan American English sebagai standar utama, bahasa yang dipakai harus tetap mudah dipahami oleh pembaca global.

Format konten adalah Facebook Reel berdurasi sekitar 13 detik. Bentuknya menyerupai satu kartu informasi atau gambar statis. Hanya latar belakang yang bergerak secara halus. Karena itu, sistem tidak perlu membuat naskah voice-over, pembagian scene, video, animasi, atau gambar. Sistem hanya perlu menghasilkan teks berkualitas yang siap disalin ke Canva.

Sistem harus dapat:

- Mengelola beberapa Facebook Page dalam niche trivia yang sama.
- Membuat satu post atau banyak post sekaligus.
- Membuat kalender konten berdasarkan permintaan pengguna.
- Menyimpan setiap fakta yang sudah pernah digunakan.
- Mencegah fakta yang sama digunakan kembali, meskipun ditulis dengan kalimat berbeda.
- Digunakan dari beberapa chat ChatGPT secara bersamaan tanpa bentrok.
- Menyimpan sumber dan riwayat perubahan setiap post.
- Menghasilkan teks yang sudah rapi dan siap disalin ke Canva.

Supabase menjadi sumber data utama. Chat ChatGPT hanya menjadi tempat berinteraksi dengan sistem. Isi percakapan bukan sumber data resmi dan tidak boleh menjadi satu-satunya tempat penyimpanan informasi.

## 3. Latar belakang

Sistem ini dibuat berdasarkan hasil audit tiga dataset post Facebook yang sudah dipilih oleh pemilik karena memiliki performa sangat tinggi dan jutaan views:

| Dataset | Jumlah post |
|---|---:|
| Curious Mind | 55 |
| DYK | 103 |
| Daily Facts | 18 |
| Total | 176 |

Dari 176 post tersebut terlihat beberapa pola utama:

- Rata-rata terdapat sekitar 7,54 fakta dalam satu post.
- Jumlah fakta berkisar antara 5 sampai 11.
- Terdapat 77 post bertipe themed trivia.
- Terdapat 68 post bertipe single-subject trivia.
- Terdapat 24 post bertipe mixed trivia.
- Format yang paling sering muncul adalah `Did you know? + 8 facts + CTA`.
- Format dengan 6, 7, dan 9 fakta juga sering digunakan.
- Topik yang paling sering muncul antara lain hewan, tubuh manusia, makanan, food science, alam, sains, geografi, negara, kota, sejarah, dan general trivia.

Pola yang terlihat kuat adalah menggunakan objek atau topik yang sudah dikenal, kemudian memasangkannya dengan informasi yang mengejutkan. Bentuk kejutannya sering berupa:

- Angka yang besar atau tidak terduga.
- Perbandingan ukuran atau skala.
- Rekor atau hal paling ekstrem.
- Kemampuan unik hewan.
- Sejarah yang tidak banyak diketahui.
- Asal-usul benda atau makanan yang mengejutkan.
- Klasifikasi yang berlawanan dengan anggapan umum.
- Kebiasaan budaya atau kondisi geografis yang tidak biasa.
- Tips praktis yang mudah diterapkan.

Walaupun sangat berguna sebagai referensi gaya, dataset tersebut juga memiliki beberapa masalah:

- Ada ID dan isi post yang berulang.
- Ada susunan kata yang rusak.
- Ada kesalahan tanda baca.
- Ada fakta yang terlalu mutlak.
- Ada fakta yang mungkin salah, sudah tidak berlaku, atau tidak memiliki konteks cukup.
- Ada klaim yang berhubungan dengan kesehatan, hukum, makanan, dan keselamatan sehingga membutuhkan pemeriksaan lebih ketat.

Karena itu, dataset hanya digunakan untuk memahami pola konten. Dataset tidak boleh dianggap sebagai sumber fakta yang sudah terverifikasi.

## 4. Masalah yang ingin diselesaikan

Ketika mengelola beberapa Facebook Page, proses produksi konten akan menghadapi masalah berikut:

1. Sulit mengingat fakta mana yang sudah pernah digunakan.
2. Fakta yang sama dapat muncul kembali dengan susunan kata berbeda.
3. Beberapa chat ChatGPT tidak otomatis mengetahui pekerjaan chat lainnya.
4. Dua chat dapat memilih fakta yang sama pada waktu yang hampir bersamaan.
5. Dua chat dapat mengubah post yang sama dan saling menimpa.
6. Dua proses dapat membuat slot kalender yang sama.
7. Request yang terkirim ulang karena timeout dapat membuat post ganda.
8. AI dapat menghasilkan fakta yang terdengar meyakinkan tetapi salah.
9. Output AI sering masih perlu dirapikan sebelum bisa dimasukkan ke Canva.
10. Tidak ada catatan terpusat mengenai sumber fakta, versi naskah, dan status post.

Content Producer harus menyelesaikan semua masalah tersebut dalam satu sistem yang dapat digunakan melalui percakapan biasa di ChatGPT.

## 5. Visi produk

Membuat satu sistem produksi konten yang memungkinkan pemilik meminta post atau kalender konten melalui bahasa sehari-hari, lalu menerima naskah trivia berbahasa Inggris yang orisinal, terverifikasi, tidak berulang, dan siap disalin ke Canva.

Sistem harus terasa sederhana ketika digunakan, tetapi tetap disiplin dalam menyimpan data, mengunci fakta, memeriksa sumber, menangani proses paralel, dan mencatat setiap perubahan.

## 6. Tujuan MVP

### 6.1 Tujuan utama

1. Menghasilkan konten trivia berbahasa Inggris berdasarkan DNA konten dari tiga dataset referensi.
2. Mendukung beberapa Facebook Page dalam niche trivia yang sama.
3. Memastikan fakta yang sudah digunakan tidak muncul kembali di Page mana pun dalam workspace yang sama.
4. Memungkinkan beberapa chat bekerja bersamaan tanpa menghasilkan benturan data.
5. Membuat single post, batch post, dan kalender konten.
6. Menghasilkan teks yang dapat langsung disalin ke Canva.
7. Menyimpan sumber untuk setiap fakta yang digunakan.
8. Menyimpan riwayat revisi setiap post.
9. Memisahkan environment development dan production.

### 6.2 Tujuan tambahan

1. Setiap post dapat ditelusuri kembali ke fakta, sumber, blueprint, dan versi naskah yang digunakan.
2. Sistem aman ketika menerima request yang sama lebih dari satu kali.
3. Sistem dapat melanjutkan atau memulihkan proses ketika terjadi timeout atau kegagalan sebagian.
4. Fondasi sistem dapat dikembangkan untuk niche lain pada masa mendatang tanpa merombak seluruh arsitektur.

## 7. Hal yang tidak dibangun dalam MVP

MVP tidak mencakup:

- Posting otomatis ke Facebook.
- Integrasi Facebook Graph API.
- Penjadwalan post langsung ke Facebook.
- Integrasi Canva API.
- Pembuatan desain Canva otomatis.
- Pembuatan gambar, video, animasi, atau background.
- Pembuatan voice-over.
- Niche quote, motivasi, psikologi, atau niche lain.
- Banyak pengguna atau tim dengan pembagian role.
- Dashboard web khusus.
- Publikasi plugin ke direktori plugin umum.
- Pengambilan data kompetitor secara otomatis.
- Penyalinan kalimat, identitas visual, atau branding kompetitor.
- Jaminan bahwa post akan viral atau mendapatkan jutaan views.
- Optimasi jadwal berdasarkan Facebook Analytics.
- Pembelajaran otomatis dari performa post Facebook.

Fitur-fitur tersebut dapat dipertimbangkan setelah MVP terbukti stabil.

## 8. Keputusan yang sudah ditetapkan

| Bagian | Keputusan |
|---|---|
| Niche MVP | Trivia dan fakta |
| Jumlah Page | Mendukung beberapa Page |
| Niche antar-Page | Sama-sama trivia/fakta |
| Audiens utama | US, UK, CA, AU |
| Bahasa utama | Neutral international English |
| Standar ejaan | American English |
| Pemahaman global | Wajib |
| Format video | Reel 13 detik, seperti gambar statis dengan background bergerak |
| Tujuan output | Disalin manual ke Canva |
| Publikasi | Manual ke Facebook |
| Database | Supabase/Postgres |
| Antarmuka pengguna | Percakapan ChatGPT |
| Backend tools | Custom MCP server |
| Sumber data resmi | Supabase, bukan riwayat chat |
| Aturan fakta | Fakta yang sudah digunakan tidak boleh dipakai kembali di Page lain |
| Kerja paralel | Wajib didukung sejak MVP |
| Repository | Private GitHub repository |
| Cara pengembangan | Coding lokal, deploy development, lalu production |

Label audiens “UK” digunakan dalam percakapan pengguna, sedangkan kode market yang disimpan adalah `GB`. Sistem wajib memetakan keduanya dan tidak boleh memperlakukan UK/GB sebagai dua market berbeda.

## 9. Pengguna utama

Pengguna MVP adalah satu pemilik sekaligus pengelola beberapa Facebook Page.

Pengguna tersebut:

- Membuat konten secara rutin.
- Menggunakan ChatGPT untuk membantu produksi.
- Menggunakan Canva untuk desain akhir.
- Memublikasikan post secara manual ke Facebook.
- Membutuhkan konten dalam jumlah cukup banyak.
- Dapat membuka beberapa chat untuk mengerjakan Page atau tugas yang berbeda.
- Tidak harus memahami database, SQL, API, atau MCP.

Sistem harus menyembunyikan kerumitan teknis dalam penggunaan sehari-hari. Pengguna cukup menjelaskan hasil yang diinginkan, memilih Page, dan meninjau hasilnya.

## 10. Istilah penting

| Istilah | Arti |
|---|---|
| Workspace | Ruang utama yang berisi semua Page, fakta, post, dan kalender milik pengguna. |
| Page | Profil konfigurasi untuk satu Facebook Page. |
| Blueprint | Kumpulan aturan konten yang dibuat dari hasil audit dataset dan disimpan berdasarkan versi. |
| Fact unit | Satu klaim fakta yang berdiri sendiri dan dapat diperiksa. |
| Fact cluster | Kelompok makna untuk mengenali fakta yang sama walaupun kalimatnya berbeda. |
| Candidate fact | Fakta yang baru ditemukan dan belum lolos verifikasi. |
| Verified fact | Fakta yang sudah diperiksa dan memiliki sumber yang layak. |
| Fact allocation | Catatan penguncian sementara (`reserved`) atau penggunaan permanen (`consumed`) suatu fakta. |
| Consumed fact | Fakta yang sudah dipakai dalam post tersimpan dan tidak boleh digunakan lagi. |
| Post package | Seluruh output post yang siap digunakan, termasuk Canva copy dan caption. |
| Generation batch | Sekelompok generation task dengan satu `batch_id`; tidak mempunyai parent row tersendiri. |
| Generation task | Satu row proses untuk menghasilkan tepat satu calon post. |
| Calendar slot | Posisi jadwal untuk satu post pada tanggal dan waktu tertentu. |
| Lock version | Nomor versi yang digunakan untuk mencegah dua chat saling menimpa perubahan. |
| Idempotency key | ID unik agar pengulangan request tidak membuat data ganda. |

## 11. Cakupan fitur MVP

### 11.1 Fitur yang wajib tersedia

- Login dan autentikasi pemilik.
- Satu workspace aktif untuk pemilik pada MVP. Schema tetap memungkinkan lebih dari satu workspace pada pengembangan berikutnya.
- Beberapa profil Facebook Page.
- Pengaturan konten untuk setiap Page.
- Blueprint konten yang memiliki versi.
- Database fakta terverifikasi.
- Penyimpanan sumber fakta.
- Pemeriksaan duplikat berdasarkan teks dan makna.
- Penguncian fakta secara aman.
- Pembuatan satu post.
- Pembuatan beberapa post sekaligus.
- Pembuatan kalender konten.
- Revisi, persetujuan, penolakan, dan lifecycle post.
- Output siap salin ke Canva.
- Dukungan beberapa chat secara paralel.
- Idempotency untuk setiap tindakan yang menulis data.
- Riwayat versi post.
- Status task, ringkasan batch, dan error yang jelas.
- Audit log untuk tindakan penting.
- Environment local, development, dan production.
- Endpoint MCP di `/mcp` menggunakan Streamable HTTP.
- OAuth untuk akses production.

### 11.2 Fitur yang ditunda

- Banyak anggota tim.
- Role owner, editor, dan reviewer dalam penggunaan nyata.
- Dashboard visual.
- Import metrik Facebook otomatis.
- Rekomendasi otomatis berdasarkan performa Facebook.
- Penggunaan kembali fakta setelah masa tunggu tertentu.
- Bahasa selain Inggris.
- Niche selain trivia.
- Integrasi Canva.
- Integrasi Facebook.
- Plugin publik.

## 12. Alur penggunaan utama

### 12.1 Membuat profil Page

1. Pengguna meminta sistem membuat Page baru.
2. Sistem meminta informasi yang belum tersedia, seperti nama Page, target negara, zona waktu, topik, dan jumlah post.
3. Sistem menampilkan ringkasan pengaturan.
4. Pengguna menyetujui pengaturan.
5. Sistem menyimpan Page dan mengembalikan `page_public_id`.

### 12.2 Membuat satu post

1. Pengguna memilih Page.
2. Pengguna dapat menentukan topik atau membiarkan sistem memilih.
3. Sistem membuat satu generation batch berisi satu task dengan idempotency key.
4. Sistem mencari verified facts yang belum pernah dipakai.
5. Fakta dikunci melalui fact allocation dalam satu database transaction.
6. Naskah dibuat menggunakan blueprint aktif.
7. Sistem memeriksa kualitas, keamanan, bahasa, panjang teks, dan kesesuaian fakta.
8. Jika pemeriksaan gagal, sistem mencoba memperbaiki dalam batas yang sudah ditentukan.
9. Jika berhasil, post dan versi pertamanya disimpan.
10. Fakta berubah dari reserved menjadi consumed.
11. Pengguna menerima post package yang siap disalin ke Canva.

### 12.3 Membuat beberapa post sekaligus

1. Pengguna menentukan Page dan jumlah post.
2. Pengguna dapat menentukan pembagian topik atau rentang tanggal.
3. Sistem membuat beberapa generation task dengan satu `batch_id`; tidak ada parent job table.
4. Setiap chat mengklaim satu task dan mengunci fakta yang berbeda untuk task tersebut.
5. Setiap post dibuat dan diperiksa secara terpisah.
6. Post yang berhasil tetap disimpan walaupun item lain gagal.
7. Fakta dari item yang gagal dilepaskan kembali.
8. Sistem melaporkan jumlah berhasil, gagal, dan alasan kegagalan.

### 12.4 Membuat kalender konten

1. Pengguna menentukan Page.
2. Pengguna menentukan tanggal mulai dan selesai.
3. Pengguna menentukan jumlah post per hari.
4. Pengguna dapat menentukan waktu post dan pembagian topik.
5. Sistem membuat calendar slots yang tidak saling bertabrakan.
6. Sistem membuat atau memasangkan post pada setiap slot.
7. Sistem memeriksa keseimbangan topik, CTA, dan jenis post.
8. Kalender disimpan sebagai draf.
9. Pengguna dapat meninjau, memindahkan, atau menyetujui post.
10. Pengguna mengaktifkan kalender setelah susunan siap.
11. Sistem tidak memublikasikan kalender tersebut ke Facebook.

### 12.5 Merevisi post

1. Pengguna menyebutkan `post_public_id` atau memilih post dari daftar.
2. Sistem mengambil versi terbaru.
3. Sistem menerapkan perubahan yang diminta.
4. Sistem tidak boleh mengubah arti fakta secara diam-diam.
5. Jika fakta diganti, sistem lebih dahulu membuat revision allocation group yang terkait dengan post; consumed facts lama tetap tidak dapat dipakai ulang.
6. Jika revisi fakta dibatalkan, reserved replacement allocations dilepas secara idempotent.
7. Sistem membuat versi baru, bukan menimpa versi lama.
8. `lock_version` bertambah.
9. Jika chat menggunakan versi lama, perubahan ditolak dan chat diminta memuat versi terbaru.

### 12.6 Bekerja dari beberapa chat

Setiap chat bekerja secara mandiri, tetapi membaca dan menulis ke Supabase yang sama.

Contoh pembagian:

- Chat A membuat kalender Page A.
- Chat B membuat post Page B.
- Chat C meninjau dan merevisi draf.
- Chat D membuat batch untuk minggu berikutnya.

Setiap operasi harus membawa `public_id` workspace, Page, task/batch, atau post yang jelas. Sistem tidak boleh hanya bergantung pada ingatan percakapan.

## 13. DNA konten

### 13.1 Jenis susunan konten

MVP mendukung tiga bentuk utama. Nilai machine-readable yang dipakai di database dan tool adalah `themed`, `single_subject`, dan `mixed`.

#### Themed trivia

Nilai `architecture`: `themed`.

Beberapa fakta yang berbeda tetapi masih berada dalam satu tema.

Contoh:

- Perbatasan negara yang tidak biasa.
- Cara menyimpan makanan.
- Kemampuan unik hewan.
- Fakta kota-kota Amerika.

#### Single-subject trivia

Nilai `architecture`: `single_subject`.

Beberapa fakta mengenai satu objek, hewan, negara, makanan, organ, atau tokoh.

Contoh:

- Fakta tentang gurita.
- Fakta tentang Islandia.
- Fakta tentang telur.
- Fakta tentang hati manusia.

#### Mixed trivia

Nilai `architecture`: `mixed`.

Beberapa fakta kuat dari topik yang berbeda dalam satu post.

Mixed trivia digunakan lebih sedikit agar Page tidak terasa acak terus-menerus.

Untuk architecture `mixed`, `primary_topic` disimpan sebagai `general_trivia` dan `theme` boleh null. Untuk `themed` atau `single_subject`, `primary_topic` mengikuti topic dominan dan `theme` diisi bila ada tema/subjek spesifik.

Pembagian awal yang disarankan:

| Jenis | Persentase awal |
|---|---:|
| Themed trivia | 45% |
| Single-subject trivia | 40% |
| Mixed trivia | 15% |

Persentase dapat diubah untuk masing-masing Page.

### 13.2 Jumlah fakta

- Jumlah normal: 6–8 fakta.
- Default untuk satu kartu Canva: 6 fakta.
- Batas MVP: 5–9 fakta.
- Permintaan lebih dari 9 fakta ditolak dengan penjelasan bahwa blueprint MVP belum mendukungnya. Dukungan tersebut memerlukan versi blueprint atau perluasan scope baru.
- Setiap fakta sebaiknya menyampaikan satu klaim utama.
- Panjang satu fakta biasanya tidak lebih dari 18 kata.
- Total teks Canva biasanya sekitar 65–120 kata, termasuk hook dan CTA.

Jika fakta berkualitas yang tersedia tidak cukup, sistem harus mengurangi jumlah fakta atau menjelaskan kekurangannya. Sistem tidak boleh menambahkan fakta lemah atau mengarang isi hanya untuk memenuhi jumlah.

### 13.3 Hook

Hook utama adalah:

```text
Did you know?
```

Sistem boleh memakai variasi yang sudah dikontrol, misalnya:

```text
Most people don't know this...
These facts sound made up—but they're real.
Here are 6 facts you probably never learned.
```

Hook harus singkat, jujur, dan sesuai dengan isi. Hook tidak boleh menjanjikan sesuatu yang tidak diberikan oleh post.

Batas hook MVP adalah 90 karakter.

### 13.4 Ciri fakta yang diprioritaskan

Fakta yang baik biasanya memiliki satu atau beberapa unsur berikut:

- Membahas sesuatu yang sudah dikenal banyak orang.
- Memberikan informasi yang bertentangan dengan dugaan umum.
- Memiliki angka konkret.
- Memiliki perbandingan yang mudah dibayangkan.
- Menjelaskan rekor atau kondisi ekstrem.
- Mengungkap asal-usul yang tidak terduga.
- Menjelaskan kemampuan unik hewan atau alam.
- Mengungkap sejarah penggunaan benda sehari-hari.
- Memberikan manfaat praktis yang aman.

Setiap fakta harus menarik karena isinya, bukan karena menggunakan bahasa yang berlebihan.

### 13.5 Topik utama

Topic allowlist awal MVP berikut menjadi nilai machine-readable pada fakta, post, task, dan kalender:

- `animals` — hewan dan perilaku hewan.
- `food_science` — makanan dan food science.
- `human_body` — tubuh manusia dan anatomi yang aman.
- `nature_science` — alam dan sains.
- `geography` — negara, kota, geografi, dan landmark.
- `history_origins` — sejarah dan asal-usul.
- `inventions_everyday` — penemuan dan benda sehari-hari.
- `general_trivia` — general trivia yang dipilih dengan hati-hati.

Pembagian awal kalender:

| Kelompok topik | Persentase awal |
|---|---:|
| `animals` | 25% |
| `food_science` | 20% |
| `human_body` | 15% |
| `nature_science` | 15% |
| `geography` | 15% |
| `history_origins` | 5% |
| `inventions_everyday` | 3% |
| `general_trivia` | 2% |

Bobot tersebut hanya menjadi pengaturan awal dan dapat disesuaikan per Page, tetapi penambahan slug di luar allowlist memerlukan versi blueprint baru.

### 13.6 CTA

CTA cukup satu baris pendek. CTA harus bervariasi agar post tidak terasa seperti template yang sama berulang-ulang.

Contoh:

```text
Follow for more surprising facts.
Which fact surprised you most?
Save this for later.
Share this with someone who loves trivia.
```

CTA tidak boleh menipu, terlalu memaksa, atau meminta interaksi yang tidak berhubungan dengan isi.

Batas CTA MVP adalah satu baris dan 100 karakter.

## 14. Gaya bahasa Inggris

### 14.1 Standar bahasa

- Menggunakan neutral international English.
- American English menjadi standar ejaan utama.
- Tetap terdengar wajar bagi audiens Inggris, Kanada, dan Australia.
- Mudah dipahami oleh pembaca global.
- Tidak menggunakan slang yang hanya dikenal di wilayah tertentu.
- Tidak mencampur beberapa standar ejaan dalam satu post.

### 14.2 Gaya kalimat

- Kalimat pendek dan langsung.
- Menggunakan kata yang umum dipahami.
- Satu ide utama dalam satu kalimat.
- Menggunakan active voice jika terasa alami.
- Menghindari jargon.
- Jika istilah teknis penting, berikan penjelasan sangat singkat.
- Tidak menggunakan pembukaan panjang.
- Tidak menggunakan emoji kecuali Page mengizinkannya.
- Tidak menggunakan huruf kapital secara berlebihan.

### 14.3 Angka dan satuan

- Gunakan angka numerik jika lebih mudah dipindai.
- Gunakan tanda pemisah ribuan dengan konsisten.
- Gunakan satuan yang familiar bagi audiens utama.
- Gunakan dua satuan jika satu satuan saja dapat membingungkan, misalnya `10 ft (3 m)`.
- Fakta mengenai peringkat, populasi, harga, hukum, atau rekor harus memiliki tanggal pemeriksaan internal.

### 14.4 Tata bahasa dan kerapian

Output tidak boleh memiliki:

- Susunan kata yang terbalik.
- Kalimat terpotong.
- Kesalahan tanda baca yang jelas.
- Teks seperti hasil OCR yang rusak.
- Campuran label teknis dalam Canva copy.
- Fakta tanpa subjek yang jelas.

Setiap output harus melewati pemeriksaan grammar dan spelling sebelum disimpan sebagai post yang siap ditinjau.

## 15. Aturan fakta dan sumber

### 15.1 Apa yang tidak dianggap sebagai sumber tepercaya

Hal berikut tidak cukup untuk membuktikan suatu fakta:

- Dataset kompetitor.
- Ingatan model AI.
- Post media sosial.
- Komentar pengguna.
- Blog tanpa sumber.
- Situs yang hanya menyalin fakta dari situs lain.

### 15.2 Data yang harus dimiliki setiap fakta

Setiap fakta yang digunakan harus memiliki:

- Bentuk klaim yang sudah dinormalisasi.
- Status verifikasi.
- Minimal satu URL sumber.
- Judul sumber.
- Nama penerbit atau organisasi.
- Tanggal sumber diakses.
- Catatan apakah sumber benar-benar mendukung klaim.
- Tanggal `as_of` jika fakta dapat berubah.

### 15.3 Urutan kualitas sumber

Sumber yang diprioritaskan:

1. Pemerintah, universitas, jurnal, museum, lembaga ilmiah, atau sumber primer.
2. Organisasi resmi dan publikasi referensi yang memiliki reputasi baik.
3. Media sekunder berkualitas yang menunjukkan sumber aslinya.

Untuk angka, hukum, kesehatan, keselamatan, rekor, atau klaim yang dapat berubah, sistem harus menggunakan sumber primer atau dua sumber independen yang layak.

### 15.4 Status verifikasi dan status penggunaan fakta

Verifikasi fakta dan penggunaan fakta adalah dua lifecycle terpisah. Keduanya tidak boleh digabungkan ke dalam satu kolom status.

Status `app.facts.verification_status`:

```text
candidate    → verifying | rejected | duplicate
verifying    → verified | needs_review | rejected | duplicate
needs_review → verified | rejected | duplicate
verified     → verifying (revalidation) | rejected (correction)
```

Penjelasan:

- `candidate`: fakta baru ditemukan.
- `verifying`: fakta sedang diperiksa.
- `needs_review`: bukti atau kemiripan fakta ambigu dan perlu keputusan manual.
- `verified`: fakta sudah layak digunakan.
- `rejected`: fakta ditolak karena salah, lemah, atau tidak aman.
- `duplicate`: fakta memiliki makna yang sama dengan fakta yang sudah ada.

Status penggunaan berada pada `ops.fact_allocations.status`:

```text
reserved → consumed
    ↘ released
    ↘ expired
```

- `reserved`: fakta dikunci sementara untuk generation task atau revisi post.
- `consumed`: fakta sudah digunakan pada post tersimpan dan tidak boleh digunakan lagi.
- `released`: fakta dilepaskan karena job tidak selesai.
- `expired`: masa penguncian fakta berakhir.

Hanya fakta dengan verification status `verified`, belum kedaluwarsa, dan tanpa allocation aktif yang boleh dipilih untuk produksi. Riwayat perubahan verifikasi disimpan sebagai audit event; row fakta menyimpan keadaan verifikasi terkini.

### 15.5 Fakta yang dapat berubah

Fakta berikut dianggap time-sensitive:

- Hukum dan aturan.
- Harga.
- Populasi.
- Peringkat.
- Rekor dunia.
- Pejabat atau jabatan.
- Status operasi suatu tempat atau organisasi.
- Statistik yang terus diperbarui.

Fakta time-sensitive harus:

- Memiliki tanggal `as_of`.
- Memiliki jadwal pemeriksaan ulang.
- Tidak digunakan setelah kedaluwarsa.
- Diverifikasi ulang sebelum kembali digunakan.
- Menyebut tahun pada teks publik jika tanpa tahun pembaca dapat salah memahami.

### 15.6 Topik sensitif

Topik berikut membutuhkan pemeriksaan lebih ketat dan, jika perlu, persetujuan manual:

- Kesehatan dan medis.
- Food safety.
- Pet safety dan racun untuk hewan.
- Survival tips.
- Hukum.
- Instruksi yang dapat membahayakan seseorang.

MVP tidak boleh memberikan diagnosis, pengobatan, dosis, nasihat hukum, nasihat keuangan, atau petunjuk berbahaya. Topik tubuh manusia harus tetap bersifat edukatif dan bukan nasihat medis.

## 16. Pencegahan fakta duplikat

### 16.1 Arti duplikat

Dua fakta dianggap sama jika menyampaikan inti informasi yang sama, walaupun:

- Menggunakan kata berbeda.
- Menggunakan satuan berbeda.
- Memiliki urutan kata berbeda.
- Salah satunya menggunakan perbandingan.
- Salah satunya menambahkan konteks kecil.

Contoh:

```text
Octopuses have three hearts.
An octopus has a total of 3 hearts.
```

Kedua kalimat tersebut adalah satu fakta yang sama.

### 16.2 Lapisan pemeriksaan duplikat

Sistem harus memeriksa duplikat melalui beberapa lapisan:

1. Teks yang sudah dinormalisasi.
2. Claim hash.
3. Semantic key atau bentuk subject–predicate–value.
4. Semantic similarity dengan fakta yang sudah ada.
5. Perbandingan entitas, angka, dan sumber sebagai sinyal tambahan.

### 16.3 Cakupan larangan duplikat

- Pemeriksaan berlaku di seluruh workspace.
- Fakta yang sudah digunakan Page A tidak boleh digunakan Page B.
- Mengubah susunan kalimat tidak membuat fakta menjadi baru.
- Fakta dari job gagal boleh tersedia kembali jika belum menjadi post tersimpan.
- Fakta yang masih reserved tidak boleh dipilih job lain.
- Fitur memakai kembali fakta setelah periode tertentu tidak termasuk MVP.

### 16.4 Fakta yang berhubungan

Dua fakta yang membahas subjek sama dapat dianggap berbeda jika klaim utamanya benar-benar berbeda.

Jika sistem tidak yakin, fakta harus ditandai untuk ditinjau. Sistem tidak boleh mengambil keputusan longgar hanya agar persediaan fakta terlihat lebih banyak.

## 17. Bentuk hasil yang siap untuk Canva

Setiap hasil harus berupa post package terstruktur.

| Bagian | Wajib | Fungsi |
|---|---:|---|
| `post_public_id` | Ya | UUID publik post |
| `page_public_id` | Ya | UUID publik Page tujuan |
| `status` | Ya | Status post |
| `topic` | Ya | Topik utama; disimpan sebagai `app.posts.primary_topic` |
| `theme` | Tidak | Tema spesifik bila relevan; boleh null untuk mixed/general trivia |
| `architecture` | Ya | Jenis susunan post |
| `hook` | Ya | Kalimat pembuka |
| `facts` | Ya | Daftar fakta sesuai urutan |
| `cta` | Ya | Kalimat penutup |
| `canva_copy` | Ya | Teks bersih yang siap disalin |
| `caption` | Ya | Caption Facebook |
| `hashtags` | Ya | Hashtag relevan dalam jumlah terbatas |
| `visual_direction` | Ya | Saran background dan gerakan halus |
| `fact_count` | Ya | Jumlah fakta |
| `source_notes` | Ya | Array ringkasan internal per fakta dari source metadata; tidak masuk Canva copy |
| `quality_result` | Ya | Hasil pemeriksaan kualitas |
| `version_public_id` | Ya | UUID publik versi naskah |
| `version_number` | Ya | Nomor versi naskah |

Aturan `canva_copy`:

- Tidak mengandung JSON.
- Tidak mengandung markdown.
- Tidak mengandung label teknis.
- Tidak menampilkan URL sumber.
- Tidak menampilkan ID internal.
- Memiliki line break yang rapi.
- Setiap fakta mudah dibedakan.
- Ditutup dengan satu CTA.
- Dapat langsung disalin tanpa dibersihkan terlebih dahulu.

Aturan pelengkap:

- Caption maksimal 500 karakter.
- Hashtag berjumlah 0–5; default 3 jika relevan.
- Hashtag tidak boleh mengulang kata yang tidak relevan hanya untuk jangkauan.

Contoh bentuk umum:

```text
Did you know?

[Fact 1]

[Fact 2]

[Fact 3]

[Fact 4]

[Fact 5]

[Fact 6]

Follow for more surprising facts.
```

## 18. Kebutuhan pengelolaan Page

### FR-PAGE-001 — Membuat Page

Pengguna dapat membuat profil Page baru dengan nama dan slug yang unik dalam workspace.

### FR-PAGE-002 — Pengaturan Page

Setiap Page menyimpan:

- Nama.
- Status aktif atau paused.
- Target negara utama dan tambahan.
- Zona waktu.
- Locale.
- Bobot topik.
- Topik yang diperbolehkan.
- Topik yang dilarang.
- Pembagian jenis post.
- Jumlah fakta default.
- Gaya CTA.
- Pilihan penggunaan emoji.
- Frekuensi post default.
- Blueprint aktif.

### FR-PAGE-003 — Page harus selalu jelas

Setiap tindakan yang membuat atau mengubah konten harus memiliki `page_public_id` yang jelas.

Jika pengguna memiliki beberapa Page dan permintaannya ambigu, sistem harus meminta pengguna memilih Page. Sistem tidak boleh menebak jika tebakannya dapat menyimpan konten ke Page yang salah.

### FR-PAGE-004 — Riwayat fakta digunakan bersama

Pengaturan setiap Page tetap terpisah, tetapi riwayat penggunaan fakta berlaku di seluruh workspace.

## 19. Kebutuhan pembuatan konten

### FR-GEN-001 — Membuat satu post

Sistem dapat membuat satu post package lengkap berdasarkan Page, topik, dan arahan pengguna.

### FR-GEN-002 — Membuat batch

Sistem dapat membuat beberapa post dalam satu generation batch tanpa mengulang fakta antar-post.

### FR-GEN-003 — Hanya memakai verified facts

Post tidak boleh diselesaikan menggunakan candidate fact yang belum lolos verifikasi.

### FR-GEN-004 — Mencatat blueprint

Setiap post mencatat versi blueprint yang digunakan.

### FR-GEN-005 — Mendukung variasi

Pengguna dapat meminta perubahan topik, jumlah fakta, jenis susunan, CTA, atau gaya bahasa selama masih sesuai aturan produk.

### FR-GEN-006 — Menjaga arti fakta

Revisi bahasa tidak boleh mengubah angka, tanggal, subjek, kualifikasi, atau arti suatu fakta.

### FR-GEN-007 — Tidak menggunakan filler

Jika fakta kuat tidak mencukupi, sistem harus mengurangi jumlah fakta atau menjelaskan bahwa persediaan tidak cukup.

### FR-GEN-008 — Mengembalikan ID yang stabil

Setiap batch, task, post, versi, calendar, dan slot harus memiliki UUID publik yang dapat digunakan pada percakapan berikutnya. ID `bigint` internal tidak boleh keluar melalui MCP.

## 20. Pemeriksaan kualitas

Sebelum post berstatus `needs_review`, sistem harus memeriksa:

1. Semua fakta sudah verified.
2. Semua fakta memiliki sumber.
3. Tidak ada fakta duplikat.
4. Tidak ada fakta yang sudah consumed.
5. Naskah sesuai dengan Page dan blueprint.
6. Jumlah fakta sesuai batas.
7. Panjang tiap fakta sesuai batas.
8. Total teks masih layak untuk satu Canva card.
9. Grammar dan spelling benar.
10. American English digunakan secara konsisten.
11. Hook sesuai dengan isi.
12. CTA singkat dan relevan.
13. Canva copy tidak mengandung metadata internal.
14. Tidak ada konten berbahaya atau dilarang.
15. Fakta time-sensitive masih berlaku.
16. Naskah tidak mengubah arti fakta.
17. Naskah tidak menyalin kalimat dari dataset atau sumber.

Hasil pemeriksaan kualitas harus disimpan di database, bukan hanya ditampilkan sementara di chat.

## 21. Status dan versi post

### 21.1 Status post

```text
draft        → needs_review | rejected | archived
needs_review → approved | rejected | archived
approved     → needs_review | scheduled | published | rejected | archived
scheduled    → approved | published | archived
published    → archived
rejected     → archived
```

Penjelasan singkat:

- `draft`: post tersimpan tetapi belum menjadi paket lengkap; hanya digunakan untuk recovery atau penyimpanan eksplisit pekerjaan belum selesai.
- `needs_review`: post lengkap dan lolos pemeriksaan otomatis, tetapi belum disetujui pengguna.
- `approved`: post sudah disetujui pengguna.
- `scheduled`: post sudah ditempatkan pada kalender.
- `published`: pengguna menandai bahwa post sudah dipublikasikan.
- `rejected`: post ditolak dan tidak dilanjutkan.
- `archived`: post tidak lagi digunakan.

`failed` adalah status generation task, bukan status post. Task yang sedang ditulis atau diperiksa tetap `facts_reserved` sampai difinalisasi, dilepas, gagal, atau lease-nya dipulihkan. Alur normal `finalize_post` langsung membuat post berstatus `needs_review`; status `draft` bukan hasil normal finalisasi.

Revisi substantif pada post approved mengembalikannya ke `needs_review`. Post scheduled harus dilepas dari slot menjadi approved sebelum revisi substantif. Transisi `approved → published` mendukung publikasi manual tanpa kalender; archive dari scheduled juga harus melepaskan atau membatalkan slot secara atomik.

`reject_post` memerlukan alasan dan optimistic lock. Post scheduled harus dilepas dari slot lebih dahulu. Fakta pada post rejected tetap consumed agar fakta yang pernah diproduksi tidak muncul kembali secara tidak sengaja.

### 21.2 Riwayat versi

- Setiap revisi membuat versi baru.
- Versi lama tidak dihapus atau ditimpa.
- Sistem menyimpan siapa yang membuat perubahan dan kapan perubahan dibuat.
- Sistem menyimpan alasan atau instruksi revisi.
- Satu versi ditandai sebagai versi terbaru.
- Pengguna dapat melihat versi terbaru dan riwayat sebelumnya.

### 21.3 Persetujuan

- Post hasil AI yang berhasil difinalisasi dimulai sebagai `needs_review`.
- Pengguna dapat menyetujuinya.
- Persetujuan tidak berarti post langsung dipublikasikan.
- Jika post yang sudah disetujui direvisi, status review harus diperbarui kembali.

## 22. Kalender konten

### FR-CAL-001 — Membuat kalender

Sistem dapat membuat kalender untuk satu Page berdasarkan:

- Tanggal mulai dan selesai.
- Jumlah post per hari.
- Zona waktu.
- Jam yang diinginkan.
- Pembagian topik.
- Pembagian jenis post.

### FR-CAL-002 — Tidak ada slot ganda

Satu Page tidak boleh memiliki dua post dalam calendar slot yang sama.

### FR-CAL-003 — Konten harus seimbang

Post yang berdekatan sebaiknya tidak terus-menerus memakai:

- Topik yang sama.
- Subjek yang sama.
- Jenis post yang sama.
- CTA yang sama.
- Fokus negara yang sama.

### FR-CAL-004 — Slot boleh kosong atau sudah berisi post

Sistem dapat:

- Membuat slot lebih dahulu, lalu mengisi post kemudian; atau
- Membuat post sekaligus dan langsung menempatkannya ke slot.

Pilihan kedua merupakan orkestrasi ChatGPT atas tool generation dan calendar yang terpisah. `create_calendar` sendiri tidak membuat teks post atau menjalankan background generation.

### FR-CAL-005 — Tidak memublikasikan ke Facebook

Status kalender hanya digunakan untuk perencanaan internal.

### FR-CAL-006 — Memindahkan jadwal dengan aman

Ketika post dipindahkan, sistem harus memeriksa slot tujuan dan mencatat perubahan tersebut.

### FR-CAL-007 — Lifecycle kalender

```text
draft → active → completed → archived
draft/active → archived
```

- `create_calendar` selalu membuat kalender `draft`.
- `activate_calendar` memvalidasi minimal satu slot dan tidak ada conflict sebelum mengubahnya menjadi `active`.
- Kalender otomatis menjadi `completed` setelah seluruh slot non-cancelled berstatus `published` dan minimal satu slot telah published.
- `archive_calendar` mengarsipkan kalender. Jika masih ada slot planned/ready, pengguna harus secara eksplisit memilih pembatalan slot masa depan; scheduled posts terkait dikembalikan ke `approved` secara atomik.

## 23. Dukungan kerja paralel

Dukungan beberapa chat merupakan syarat MVP, bukan fitur tambahan.

### 23.1 Atomic fact allocation

Pemilihan dan penguncian fakta harus dilakukan dalam satu database transaction.

Pola berikut tidak diperbolehkan:

```text
SELECT fakta
→ menunggu proses lain
→ INSERT allocation
```

Pola tersebut berbahaya karena dua chat dapat membaca fakta yang sama sebelum salah satunya menyimpan allocation.

Jika dua task atau revisi mencoba mengambil fakta yang sama:

- Hanya satu yang boleh berhasil mengunci fakta tersebut.
- Proses lainnya harus mencari fakta lain.
- Jika tidak ada fakta lain, sistem memberikan error yang jelas.
- Fakta yang sama tidak boleh masuk ke dua draf yang berhasil.

### 23.2 Masa berlaku allocation

- Allocation berstatus `reserved` memiliki waktu kedaluwarsa.
- Post atau revisi yang berhasil mengubah allocation menjadi consumed.
- Task atau revisi yang gagal/dibatalkan melepaskan allocation.
- Proses yang ditinggalkan tidak boleh mengunci fakta selamanya.
- Proses pembersihan allocation harus aman jika dijalankan ulang.

### 23.3 Idempotency

Setiap operasi yang membuat atau mengubah data harus memiliki idempotency key.

Jika request yang sama terkirim dua kali:

- Sistem tidak membuat task/batch kedua.
- Sistem tidak membuat post kedua.
- Sistem tidak membuat versi atau slot kedua.
- Sistem mengembalikan hasil atau ID dari request pertama.
- Jika request pertama gagal secara terminal, replay key yang sama mengembalikan error tersimpan tanpa menjalankan ulang write; percobaan baru yang disengaja memakai idempotency key baru.

### 23.4 Optimistic concurrency

Setiap record yang dapat diedit memiliki `lock_version` atau mekanisme yang setara.

Ketika chat menyimpan perubahan:

- Chat harus mengirim versi yang sebelumnya dibaca.
- Jika versi tersebut sudah lama, update ditolak.
- Sistem mengembalikan versi terbaru.
- Chat diminta memuat ulang sebelum mengedit.
- Sistem tidak menggunakan silent last-write-wins.

### 23.5 Target kapasitas paralel

MVP harus lulus pengujian minimal 10 permintaan reservasi fakta atau pembuatan post yang dimulai secara bersamaan tanpa:

- Fakta ganda.
- Task atau batch ganda karena retry.
- Perubahan saling menimpa.
- Slot kalender ganda.

## 24. Generation batch dan task

Satu generation task mewakili tepat satu calon post. Batch hanya merupakan pengelompokan task melalui `batch_id`; tidak ada parent job row atau parent job status yang disimpan.

Status generation task:

```text
pending → facts_reserved → completed
   ↘ cancelled       ↘ failed
facts_reserved → pending  (lease recovery jika belum consumed)
```

Setiap task menyimpan workspace, Page, blueprint, `batch_id`, nomor item, request, lease, attempt count, status, waktu proses, error aman, dan post hasil jika berhasil.

Baseline MVP membatasi satu task sampai 3 attempts. Setelah attempt ketiga gagal atau lease kedaluwarsa tanpa hasil, task menjadi `failed`; retry tidak membuat task baru.

Status batch dihitung dari task rows setiap kali dibaca:

```text
pending | in_progress | completed | partially_completed | failed | cancelled
```

`partially_completed` berarti minimal satu task completed dan minimal satu task failed atau cancelled. Ringkasan batch juga memuat count per status, sehingga tidak ada parent row yang dapat berbeda dengan keadaan item sebenarnya.

Urutan aturan derived status:

1. Semua task pending → `pending`.
2. Ada task pending atau `facts_reserved` setelah pekerjaan dimulai → `in_progress`.
3. Semua task completed → `completed`.
4. Ada task completed dan ada task failed/cancelled, tanpa task aktif → `partially_completed`.
5. Semua task cancelled → `cancelled`.
6. Kombinasi terminal lain tanpa task completed → `failed`.

`create_generation_batch` harus segera mengembalikan `batch_id`. Beberapa chat kemudian memanggil `prepare_next_post` untuk mengambil task secara aman. Pembuatan teks bersifat pull-based di chat; backend tidak menjalankan text generation otonom di background.

## 25. MCP tools yang dibutuhkan

Nama tool berikut adalah kontrak final MVP dan harus sama dengan `implementation-plan.md`. Database function internal boleh memiliki nama berbeda hanya jika pemetaannya terdokumentasi dengan jelas.

### 25.1 Workspace dan Page

- `get_workspace`
- `list_pages`
- `get_page_context`
- `create_page`
- `update_page`

### 25.2 Facts

- `get_fact_inventory`
- `check_fact_candidates`
- `submit_fact_candidates`
- `list_facts_needing_review`
- `review_fact_candidates`

### 25.3 Pembuatan konten

- `create_generation_batch`
- `prepare_next_post`
- `validate_post_draft`
- `finalize_post`
- `release_generation_task`
- `get_generation_batch`

### 25.4 Post

- `get_post`
- `list_posts`
- `prepare_post_revision`
- `release_post_revision`
- `revise_post`
- `approve_post`
- `reject_post`
- `mark_post_published`
- `archive_post`

### 25.5 Kalender

- `preview_calendar_plan`
- `create_calendar`
- `assign_post_to_slot`
- `unassign_post_from_slot`
- `get_calendar`
- `reschedule_calendar_slot`
- `activate_calendar`
- `archive_calendar`

### 25.6 Internal smoke

- `health_check` — read-only, tetap memerlukan OAuth setelah fase authentication selesai.

Setiap tool harus memiliki:

- Tanggung jawab yang jelas dan tidak terlalu luas.
- Input schema.
- Output schema.
- UUID public IDs yang stabil.
- Validasi.
- Pemeriksaan authorization.
- Annotations yang sesuai dengan sifat read-only, write, atau destructive.
- Error yang dapat dipahami model dan pengguna.

Operasi internal seperti memilih row, mengunci fakta, atau menaikkan versi tidak perlu menjadi tool yang dapat dipanggil langsung oleh pengguna.

## 26. Login dan keamanan akses

### 26.1 Authentication

- Production MCP server menggunakan OAuth 2.1 yang sesuai dengan MCP authorization flow.
- Koneksi ChatGPT mewakili pengguna yang sudah login.
- Endpoint HTTP health yang terpisah boleh tanpa login jika hanya mengembalikan status infrastruktur dan tidak membaca data pengguna.
- MCP `health_check` wajib menggunakan OAuth setelah fase authentication. Panggilan MCP tanpa authentication hanya boleh ada sementara pada spike lokal sebelum auth dibangun, dan tidak boleh tersedia pada deployment remote development maupun production.
- Semua data pribadi dan operasi write wajib menggunakan authentication.

### 26.2 Authorization

- Pengguna hanya dapat mengakses workspace yang dimilikinya.
- Semua operasi memeriksa workspace dan Page di sisi server.
- Model AI tidak boleh dijadikan pengaman akses.
- `workspace_public_id` atau `page_public_id` asing harus ditolak.
- Mengubah argument tool tidak boleh memungkinkan pengguna membuka data lain.

### 26.3 Keamanan Supabase

- RLS aktif pada setiap tabel yang berada di exposed schema.
- Database grants dan RLS policies dikonfigurasi secara jelas.
- Policy menggunakan data kepemilikan yang tepercaya.
- Policy tidak menggunakan user-editable metadata untuk menentukan hak akses.
- Supabase secret key hanya tersedia di server.
- Secret key tidak pernah masuk ke plugin, browser, tool result, log, atau repository.
- Penggunaan `SECURITY DEFINER` dibatasi dan ditinjau secara khusus.
- Credential development dan production harus berbeda.

## 27. Gambaran data yang perlu disimpan

Desain final memakai 12 tabel hybrid yang didefinisikan lengkap di `database-design.md`:

- Enam tabel bisnis: `app.workspaces`, `app.pages`, `app.content_blueprints`, `app.facts`, `app.posts`, dan `app.calendars`.
- Enam tabel operasional: `ops.generation_tasks`, `ops.fact_allocations`, `ops.post_versions`, `ops.calendar_slots`, `ops.idempotency_keys`, dan `ops.audit_events`.

Topik dan bobot Page berada pada JSONB config tervalidasi. Sources serta keadaan verifikasi terkini berada pada row fakta; riwayatnya berada pada audit events. Allocation reserved/consumed dan relasi fakta–post digabungkan pada fact allocations. Tidak ada tabel terpisah untuk owner membership, topic taxonomy, fact sources, fact verification, parent generation job, atau fact usage pada MVP.

Aturan penting seperti fakta unik, slot unik, dan allocation aktif harus dijaga oleh database constraint dan transaction. Aturan tersebut tidak boleh hanya mengandalkan kode aplikasi.

## 28. Gambaran arsitektur

```text
Beberapa chat ChatGPT
        ↓
Plugin pribadi Content Producer
        ↓ Streamable HTTP + OAuth
Custom MCP server
        ├── authentication dan authorization
        ├── validasi input
        ├── pengaturan generation task dan allocation
        ├── validasi kandidat dan metadata sumber
        ├── pemeriksaan duplikat
        ├── fact allocation
        ├── content quality checks
        └── layanan post dan kalender
        ↓
Supabase/Postgres
        ├── sumber data utama
        ├── database transaction
        ├── uniqueness constraints
        ├── RLS
        └── audit history
```

### 28.1 Tanggung jawab ChatGPT dan plugin

- Menerima permintaan pengguna dalam bahasa sehari-hari.
- Menanyakan informasi yang benar-benar diperlukan.
- Mengikuti workflow produksi.
- Memanggil tool yang tepat.
- Menampilkan hasil dengan jelas.
- Meneliti sumber publik yang relevan dan memperlakukan seluruh isi web sebagai data tidak tepercaya.
- Menulis atau merevisi naskah hanya berdasarkan fakta yang sudah disetujui sistem.

### 28.2 Tanggung jawab MCP server

- Memeriksa authentication dan authorization.
- Memvalidasi seluruh input.
- Mengatur generation task dan batch summary.
- Menjaga fakta tidak berulang.
- Membuat embedding, memeriksa duplikasi, dan menerapkan kebijakan source pada kandidat yang diserahkan ChatGPT.
- Menangani allocation dan concurrency.
- Menyimpan post dan kalender.
- Menjalankan pemeriksaan kualitas.
- Mengembalikan structured results.

Pada MVP, MCP server tidak melakukan arbitrary URL fetching. ChatGPT meneliti sumber publik, lalu MCP memvalidasi payload, source metadata, verifikasi, dan deduplikasi sebelum data disimpan.

### 28.3 Tanggung jawab Supabase

- Menjadi sumber data resmi.
- Menjaga hubungan antar-data.
- Menjalankan transaction dan locking.
- Menjaga uniqueness constraints.
- Menjalankan RLS.
- Menyimpan migration history dan backup.

## 29. Environment dan repository

### 29.1 Environment

| Environment | Kegunaan | Jenis data |
|---|---|---|
| Local | Coding dan automated tests | Data percobaan yang boleh dibuang |
| Development | Uji integrasi ChatGPT dan acceptance test | Data uji non-production |
| Production | Pembuatan konten yang sebenarnya | Data produksi utama |

Development dan production harus memiliki:

- Project Supabase berbeda.
- Database berbeda.
- Credential berbeda.
- Deployment MCP berbeda.
- Domain atau URL berbeda.

### 29.2 Repository GitHub

- Menggunakan private GitHub repository.
- Coding dilakukan di lokal.
- Perubahan dibuat melalui feature branch.
- Branch development digunakan untuk deployment development.
- Branch utama yang dilindungi digunakan untuk production.
- Database migrations disimpan di Git.
- Dependency lockfile disimpan di Git.
- File `.env` tidak masuk Git.
- Hanya `.env.example` tanpa nilai secret yang boleh masuk Git.

### 29.3 Deployment MCP

Production MCP server harus memiliki:

- HTTPS yang stabil.
- Endpoint `/mcp` dengan Streamable HTTP.
- Health endpoint yang terpisah.
- Logging dan metrics.
- Timeout.
- Rate limiting.
- Kemampuan rollback.
- Tool schema yang sebisa mungkin backward-compatible.

## 30. Kebutuhan non-fungsional

### 30.1 Keandalan

- Fakta tidak boleh berubah menjadi consumed tanpa post atau usage record yang sesuai.
- Retry tidak boleh membuat data baru yang sama.
- Batch failure tidak boleh menghapus item yang sudah berhasil.
- Fakta dari item yang gagal harus dilepaskan.
- Backup dan prosedur restore wajib tersedia sebelum production.

### 30.2 Target kecepatan

Target berikut tidak menghitung waktu ketika penyedia eksternal sedang tidak tersedia.

| Operasi | Target |
|---|---:|
| Tool read sederhana, p95 | Maksimal 2 detik |
| Pembuatan batch/task, p95 | Maksimal 2 detik |
| Satu post dari verified facts yang sudah tersedia, p95 | Maksimal 90 detik |
| Batch 7 post | Maksimal 10 menit |
| Kalender 30 slot | Maksimal 20 menit |

Proses batch bersifat pull-based. `create_generation_batch` mengembalikan `batch_id`, beberapa chat memproses task melalui `prepare_next_post`, dan progress dibaca melalui `get_generation_batch`. Tidak ada backend text-generation job otonom pada MVP.

### 30.3 Ketersediaan

- Target availability MVP: 99,0% per bulan.
- Maintenance terjadwal dan gangguan pihak ketiga tidak dihitung sebagai kegagalan internal.
- Health check harus dapat membedakan masalah server sendiri dan masalah dependency.

### 30.4 Logging dan observability

Log boleh menyimpan:

- Request ID dan correlation ID.
- ID pengguna dalam bentuk aman.
- Workspace ID.
- Page ID.
- Batch ID atau task public ID.
- Nama tool.
- Durasi.
- Status berhasil atau gagal.
- Error code.
- Allocation conflict.

Log tidak boleh menyimpan:

- OAuth access token.
- Supabase secret key.
- Database password.
- Full authorization header.
- Seluruh isi percakapan jika tidak diperlukan.

### 30.5 Kemudahan pemeliharaan

- Business rules dipisahkan dari MCP transport handler.
- Module Page, fact, generation, post, calendar, dan auth dipisahkan.
- Database dapat dibuat ulang dari migration pada database kosong.
- Tool contracts memiliki automated tests.
- Aturan penting memiliki database tests.

### 30.6 Pengendalian biaya

- Batch memiliki batas maksimum.
- Operasi kandidat fakta, embedding, dan generation memiliki rate limit.
- Retry dibatasi.
- Sistem memeriksa cache dan duplikat sebelum menjalankan operasi mahal.
- Development tidak boleh memakai production credential.

## 31. Penanganan error

Error harus memiliki kode yang tetap dan penjelasan yang dapat ditindaklanjuti.

Kode minimum:

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `WORKSPACE_NOT_FOUND`
- `PAGE_NOT_FOUND`
- `PAGE_NOT_ACTIVE`
- `BLUEPRINT_NOT_ACTIVE`
- `INVALID_JSON_SCHEMA_VERSION`
- `INVALID_PAGE_CONFIGURATION`
- `FACT_DUPLICATE_EXACT`
- `FACT_DUPLICATE_SEMANTIC`
- `FACT_REVIEW_REQUIRED`
- `INSUFFICIENT_VERIFIED_FACTS`
- `TASK_ALREADY_CLAIMED`
- `FACT_ALREADY_ALLOCATED`
- `FACT_ALLOCATION_EXPIRED`
- `IDEMPOTENCY_CONFLICT`
- `RESOURCE_VERSION_CONFLICT`
- `POST_QUALITY_FAILED`
- `CALENDAR_SLOT_CONFLICT`
- `INVALID_STATE_TRANSITION`
- `CROSS_WORKSPACE_REFERENCE`
- `RATE_LIMITED`
- `DEPENDENCY_UNAVAILABLE`
- `INTERNAL_ERROR`

Setiap error harus menjelaskan:

- Apa yang gagal.
- Kode error.
- Apakah aman untuk mencoba ulang.
- ID yang berhubungan.
- Tindakan yang disarankan.

Error tidak boleh menampilkan:

- Stack trace.
- SQL mentah.
- Token.
- Secret.
- Credential internal.

## 32. Audit log

Tindakan berikut harus dicatat:

- Page dibuat atau diubah.
- Fakta diverifikasi, ditolak, ditandai duplikat, dialokasikan, dilepas, kedaluwarsa, atau digunakan.
- Generation task/batch dibuat, selesai, gagal, atau dibatalkan.
- Post dibuat, direvisi, disetujui, dijadwalkan, atau diarsipkan.
- Kalender dibuat.
- Calendar slot diubah.
- Konflik versi atau allocation terjadi.

Setiap audit event minimal memiliki:

- Waktu.
- Actor.
- Request ID.
- Jenis entity.
- Entity ID.
- Tindakan.
- Ringkasan perubahan yang aman.

Audit event tidak boleh diubah setelah dibuat.

## 33. Ukuran keberhasilan MVP

### 33.1 Kualitas produk

| Ukuran | Target |
|---|---:|
| Fakta consumed yang terduplikat dalam workspace | 0 |
| Post berhasil yang memiliki sumber | 100% |
| Post berhasil yang lulus quality checks | 100% |
| Edit versi lama yang diam-diam menimpa versi baru | 0 |
| Calendar slot ganda | 0 |
| Data ganda akibat retry | 0 |
| Canva copy rusak yang diketahui saat release | 0 |

### 33.2 Operasional

| Ukuran | Target |
|---|---:|
| Tool calls berhasil di luar gangguan pihak ketiga | Minimal 99% |
| Task/revisi gagal yang melepaskan allocation | 100% |
| Conflict error yang memberikan tindakan lanjutan | 100% |
| Secret penting ditemukan di repository atau log | 0 |

### 33.3 Manfaat bagi pengguna

MVP dianggap bermanfaat jika:

- Pengguna dapat membuat post tanpa merapikan ulang strukturnya.
- Pengguna dapat membuat kalender satu minggu dalam satu alur percakapan.
- Beberapa chat dapat berjalan bersamaan tanpa koordinasi fakta secara manual.
- Setiap post dapat ditelusuri ke Page, fakta, sumber, dan versinya.

Jumlah views bukan kriteria kelulusan MVP karena performa Facebook juga dipengaruhi algoritma distribusi, kondisi Page, waktu publikasi, desain, dan faktor lain yang tidak dikendalikan sistem.

## 34. Syarat penerimaan MVP

### AC-001 — Koneksi MCP

- ChatGPT dapat menemukan MCP server.
- MCP `health_check` berhasil setelah OAuth.
- Endpoint HTTP health terpisah tidak membocorkan data pengguna atau secret.
- Tool metadata dan schema terbaca tanpa error.

### AC-002 — Keamanan akses

- Pengguna yang login dapat mengakses workspace miliknya.
- Workspace atau Page asing ditolak.
- Pengguna tanpa login tidak dapat memakai private atau write tools.

### AC-003 — Membuat Page pertama

- Page dapat dibuat.
- Page dapat diambil kembali menggunakan `page_public_id`.
- Locale, target negara, topik, dan blueprint tersimpan dengan benar.

### AC-004 — Membuat satu post

- Sistem menghasilkan post package berstatus `needs_review` dengan 5–9 fakta.
- Semua fakta memiliki sumber.
- Semua fakta lolos verifikasi.
- Post lolos quality checks.
- Canva copy dapat langsung disalin.

### AC-005 — Tidak mengulang fakta antar-Page

- Fakta yang sudah dipakai Page A ditolak untuk Page B.
- Parafrase dari fakta tersebut juga ditolak.

### AC-006 — Allocation paralel

- Minimal 10 request dijalankan bersamaan.
- Tidak ada satu fakta yang masuk ke lebih dari satu draf berhasil.
- Request yang kalah mendapatkan fakta lain atau error yang jelas.

### AC-007 — Aman terhadap retry

- Request write yang sama dikirim lebih dari satu kali.
- Sistem hanya membuat satu hasil.
- Sistem mengembalikan ID hasil pertama.

### AC-008 — Perlindungan terhadap edit lama

- Dua chat membuka versi post yang sama.
- Chat pertama menyimpan revisi.
- Update dari chat kedua ditolak karena versinya sudah lama.
- Versi dari chat pertama tidak tertimpa.

### AC-009 — Membersihkan allocation dari task atau revisi gagal

- Task atau revisi gagal setelah mengambil fakta.
- Fakta yang belum dipakai dilepaskan atau kedaluwarsa.
- Fakta dapat digunakan kembali oleh task baru.

### AC-010 — Konflik kalender

- Dua chat membuat slot yang sama.
- Hanya satu slot berhasil dibuat.
- Request lainnya menerima `CALENDAR_SLOT_CONFLICT`.

### AC-011 — Batch gagal sebagian

- Salah satu post dalam batch gagal.
- Post lain yang berhasil tetap tersimpan.
- Fakta dari post gagal dilepaskan.
- Ringkasan batch yang dihitung dari task rows menghasilkan status `partially_completed`; tidak ada parent job row.
- Jumlah berhasil dan gagal dilaporkan dengan jelas.

### AC-012 — Kualitas bahasa

- American English digunakan secara konsisten.
- Teks mudah dipahami di US, UK, CA, AU, dan secara global.
- Tidak ada slang regional yang tidak dijelaskan.

### AC-013 — Fakta yang sudah kedaluwarsa

- Fakta time-sensitive yang kedaluwarsa tidak dapat dipakai.
- Fakta dapat kembali menjadi verified setelah diperiksa ulang.

### AC-014 — Pemisahan environment

- Development tidak dapat membaca atau menulis data production.
- Development dan production memakai project serta credential yang berbeda.

### AC-015 — Lifecycle kalender

- Calendar baru berstatus `draft`.
- Calendar tanpa slot atau dengan collision tidak dapat diaktifkan.
- Calendar valid dapat berubah menjadi `active`.
- Calendar menjadi `completed` setelah seluruh slot non-cancelled published dan minimal satu slot published.
- Archive dengan planned/ready slots memerlukan konfirmasi pembatalan eksplisit dan mengembalikan scheduled posts terkait ke `approved`.

## 35. Pengujian yang wajib dilakukan

### 35.1 Unit tests

- Normalisasi teks fakta.
- Claim hash.
- Semantic key.
- Pemeriksaan panjang teks.
- Validasi struktur post.
- Validasi perubahan status.
- Error mapping.
- Idempotency.

### 35.2 Database tests

- Unique constraints.
- Atomic fact allocation.
- Allocation expiry.
- Allocation cleanup.
- Optimistic concurrency.
- Calendar slot conflict.
- RLS untuk akses yang diizinkan.
- RLS untuk akses yang ditolak.
- Membuat database kosong dari seluruh migrations.

### 35.3 MCP contract tests

- MCP initialization.
- Tool discovery.
- Input valid.
- Input tidak valid.
- Output schema.
- Authentication challenge.
- Tool annotations.
- Structured errors.

### 35.4 Content evaluation

Simpan kumpulan prompt pengujian yang dapat dijalankan kembali:

- Membuat satu post secara langsung.
- Meminta post dengan bahasa tidak langsung.
- Permintaan tanpa Page yang jelas.
- Topik dengan verified facts yang tidak cukup.
- Membuat batch.
- Membuat kalender.
- Merevisi menggunakan `post_public_id`.
- Meminta niche yang tidak didukung.
- Meminta fakta berbahaya.
- Mencoba memakai fakta lama.
- Menjalankan beberapa chat.
- Permintaan yang seharusnya tidak memanggil tool.

### 35.5 Pengujian serangan dan penyalahgunaan

- Sumber web mengandung prompt injection.
- Pengguna meminta sistem melewati verifikasi.
- Pengguna mengirim workspace ID milik pihak lain.
- Request lama diputar ulang.
- OAuth token tidak valid.
- Batch terlalu besar.
- Argument tool rusak.
- Dua sumber memberikan informasi berbeda.

## 36. Privasi dan keamanan konten

- Hanya menyimpan data yang diperlukan.
- Tidak menyimpan seluruh percakapan ChatGPT jika tidak diperlukan.
- Semua isi sumber eksternal dianggap sebagai untrusted input.
- Instruksi yang ditemukan di dalam sumber harus diabaikan.
- Sistem tidak boleh membuka prompt internal, token, secret, atau konfigurasi server.
- Tidak membuat konten yang merendahkan kelompok, budaya, atau negara tertentu.
- Tidak membuat trivia yang bersifat penuh kebencian, seksual, eksploitatif, atau terlalu grafis.
- Tidak membuat kutipan palsu.
- Tidak menyajikan rumor atau legenda sebagai fakta pasti.
- Folklore atau legenda harus diberi label dengan jelas.
- Engagement tidak boleh dibangun menggunakan informasi palsu.

## 37. Risiko dan cara menguranginya

| Risiko | Dampak | Cara mengurangi |
|---|---|---|
| AI membuat fakta palsu | Kepercayaan turun atau konten berbahaya | Verified-fact gate, sumber, quality checks, manual review |
| Fakta sama ditulis ulang | Page menjadi repetitif | Canonical claim, semantic key, similarity check, allocation workspace |
| Dua chat bentrok | Fakta ganda atau perubahan hilang | Transaction, uniqueness constraint, idempotency, lock version |
| Hukum atau rekor sudah berubah | Informasi salah | `as_of` date, expiry, dan revalidation |
| Terlalu mirip kompetitor | Masalah orisinalitas | Dataset hanya untuk pola, tidak menyalin kalimat |
| Teks terlalu padat | Sulit dibaca di Canva | Batas fakta, kata, dan pemeriksaan layout density |
| Hasil AI tidak konsisten | Kualitas berubah-ubah | Blueprint berversi, structured tools, evaluation set |
| OAuth rumit | Integrasi terlambat | Dibangun dan diuji sejak awal menggunakan provider yang matang |
| Sumber eksternal tidak tersedia | Riset gagal | Retry terbatas, error jelas, stok verified facts |
| Biaya meningkat | Operasional mahal | Batch limit, cache, rate limit, pemantauan penggunaan |
| Prompt injection dari sumber | Kebocoran data atau tindakan tidak diinginkan | Least privilege, validasi, sumber dianggap sebagai data |
| Ekspektasi viral terlalu tinggi | Produk dianggap gagal walau bekerja benar | Ukur kualitas yang dapat dikendalikan, tidak menjanjikan views |

## 38. Ketergantungan sistem

Sistem membutuhkan:

- Akun ChatGPT yang mendukung plugin dan custom MCP server.
- Hosting HTTPS untuk MCP server.
- OAuth 2.1.
- Supabase development dan production.
- Private GitHub repository.
- Deployment workflow.
- Sumber informasi publik yang layak yang dapat diteliti ChatGPT.
- Model untuk menghasilkan dan memperbaiki naskah.
- Proses manual Canva dan Facebook milik pengguna.

## 39. Syarat sebelum production

Sistem belum boleh dipakai sebagai production sebelum:

- PRD disetujui.
- Database design disetujui.
- Implementation plan disetujui.
- Threat model ditinjau.
- Development dan production benar-benar terpisah.
- Seluruh database migrations dapat dijalankan dari awal.
- RLS tests berhasil.
- Authorization tests berhasil.
- Acceptance criteria penting berhasil.
- Pengujian paralel berhasil.
- Tidak ada security issue tingkat tinggi yang diketahui.
- Secrets scan bersih.
- Backup dan restore sudah diuji.
- Content evaluation memenuhi standar.
- Production MCP diuji melalui chat baru.
- Prosedur rollback tersedia.

## 40. Pengembangan setelah MVP

Setelah MVP stabil, sistem dapat dikembangkan untuk:

1. Mencatat metrik Facebook secara manual atau otomatis.
2. Memberikan rekomendasi berdasarkan performa setiap Page.
3. Mendukung niche lain dengan blueprint terpisah.
4. Mendukung banyak pengguna dan approval workflow.
5. Terhubung ke Canva.
6. Terhubung ke Facebook untuk scheduling dan publishing.
7. Memiliki dashboard atau MCP App UI.
8. Memiliki aturan penggunaan kembali fakta setelah jangka waktu tertentu.
9. Mendukung bahasa lain.
10. Menjadi plugin publik atau produk komersial.

## 41. Keputusan teknis dan parameter yang perlu dikalibrasi

Keputusan berikut sudah dikunci untuk MVP:

- MCP server menggunakan TypeScript dan berjalan sebagai Supabase Edge Function.
- Supabase Auth menjadi OAuth 2.1 authorization server dengan PKCE; Dynamic Client Registration dipakai sesuai dukungan panduan Supabase saat implementasi.
- Auth/consent web direkomendasikan memakai Next.js di Vercel.
- Content generation dilakukan oleh ChatGPT; backend hanya memakai OpenAI API untuk embedding.
- Baseline embedding adalah `text-embedding-3-small` dengan dimensi 1536 dan disimpan sebagai `halfvec(1536)`.
- Tidak ada external queue atau parent job table; `ops.generation_tasks` dan atomic claim `SKIP LOCKED` menjadi queue MVP.
- Baseline task/allocation TTL adalah 20 menit.
- URL project Supabase dipakai untuk development dan production; custom domain ditunda.

Parameter berikut tetap harus dikalibrasi sebelum migration atau release final:

- Semantic duplicate threshold.
- Konfirmasi topic allowlist yang sudah ditetapkan dan finalisasi JSON Schema versi 1; slug baru memerlukan versi blueprint baru.
- Batas batch dan rate limit berdasarkan load/cost test.
- Detail workflow penelitian serta source policy.
- TTL final setelah UAT.
- Retention idempotency dan audit.
- Ketersediaan model embedding, Supabase CLI, Edge Runtime, dan extension pada saat implementasi.

Perubahan terhadap keputusan yang sudah dikunci wajib diperbarui pada PRD, database design, dan implementation plan sebelum coding bagian terkait.

## 42. Referensi teknis

- OpenAI — Build an MCP server: https://developers.openai.com/plugins/build/mcp-server
- OpenAI — Plugin authentication: https://developers.openai.com/plugins/build/auth
- OpenAI — Package your plugin: https://developers.openai.com/plugins/build/plugins
- OpenAI — Connect and test your plugin: https://developers.openai.com/plugins/deploy/connect-chatgpt
- Supabase — Managing environments: https://supabase.com/docs/guides/deployment/managing-environments
- Supabase — Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase — Securing the Data API: https://supabase.com/docs/guides/api/securing-your-api

## 43. Persetujuan PRD

Dengan menyetujui dokumen ini, pemilik produk menyetujui bahwa:

1. MVP hanya berfokus pada niche trivia dan fakta.
2. Sistem mendukung beberapa Page dalam niche yang sama.
3. Fakta yang sudah digunakan tidak boleh digunakan lagi pada Page lain dalam workspace.
4. Dukungan beberapa chat secara paralel adalah syarat wajib.
5. Output dibuat untuk disalin manual ke Canva.
6. Publishing ke Facebook tetap dilakukan secara manual.
7. Sistem tidak menjanjikan hasil viral atau jumlah views tertentu.
8. Database design dan implementation plan dapat disusun berdasarkan PRD ini.
