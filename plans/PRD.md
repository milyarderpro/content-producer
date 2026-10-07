# Product Requirements Document — Content Producer MVP

## 1. Informasi dokumen

| Bagian | Keterangan |
|---|---|
| Nama produk | Content Producer |
| Versi produk | MVP |
| Versi dokumen | 1.1 |
| Status | Draf utama — arsitektur modular disetujui |
| Tanggal | 6 Oktober 2026 |
| Bahasa dokumen | Bahasa Indonesia |
| Bahasa konten | Bahasa Inggris |
| Pengguna MVP | Satu pemilik yang mengelola beberapa Facebook Page |
| Antarmuka utama | ChatGPT dengan custom MCP plugin pribadi |
| Database dan hosting MCP | Supabase |

Dokumen ini menjadi sumber utama untuk tujuan produk, ruang lingkup MVP, pengalaman pengguna, aturan konten, kebutuhan fungsional, kebutuhan non-fungsional, dan syarat penerimaan.

Kedudukan dokumen perencanaan adalah sebagai berikut:

- `plans/database-design.md` menjadi sumber utama untuk tabel, kolom, index, constraint, database function, dan aturan transaksi.
- `plans/implementation-plan.md` belum dibuat dalam rangkaian dokumen baru ini. Setelah dibuat, dokumen tersebut menjadi sumber utama untuk urutan pengerjaan, struktur repository, kontrak MCP tool, pengujian, dan deployment.
- `plans/module-contract.md` akan menjadi sumber utama untuk kontrak yang wajib dipenuhi setiap modul niche.
- `plans/trivia-content-dna.md` akan menjadi sumber utama untuk aturan editorial, format, deduplikasi, dan evaluasi khusus niche trivia.
- `plans/workflow-users.md` tetap menjadi ringkasan alur penggunaan sehari-hari.

Dokumen dalam folder `archive/` hanya merupakan riwayat rancangan lama dan bukan acuan implementasi baru.

---

## 2. Ringkasan produk

Content Producer adalah plugin pribadi di ChatGPT untuk memproduksi naskah Facebook Reels berbahasa Inggris bagi beberapa Facebook Page milik satu pengguna. Produk dirancang sebagai platform multi-niche, tetapi MVP hanya mengaktifkan modul trivia/fakta.

Konten ditujukan terutama untuk audiens Amerika Serikat, Inggris, Kanada, dan Australia. Sistem menggunakan American English sebagai standar ejaan, tetapi pilihan katanya harus netral, natural, dan mudah dipahami oleh audiens global.

Format utama adalah Reel sekitar 13 detik yang secara visual menyerupai satu gambar atau kartu informasi. Background dapat bergerak secara halus, sedangkan teks utamanya tetap statis. Sistem tidak membuat video atau desain. Sistem menghasilkan:

- Teks yang siap disalin ke Canva.
- Caption yang siap disalin ke Facebook.
- Hashtag yang relevan.
- Sumber internal untuk memeriksa setiap fakta.
- Data status dan jadwal post.

ChatGPT bertindak sebagai mesin penalaran, penelitian, penulisan, dan percakapan. Supabase bertindak sebagai sumber data resmi, memori lintas chat, pemeriksa duplikasi, penyimpan content plan dan performa, serta tempat menjalankan MCP server. GitHub menjadi sumber kode dan version control.

MVP tidak menggunakan OpenAI API, Embeddings API, Vercel, dashboard web, Canva API, atau Facebook Graph API.

---

## 3. Latar belakang

Produk ini dirancang berdasarkan audit tiga dataset referensi Facebook Reels yang dikumpulkan dan dipilih oleh pemilik karena masing-masing post memiliki jutaan views:

- Curious Mind.
- DYK.
- Daily Facts.

Dataset tersebut digunakan untuk mempelajari pola konten, bukan sebagai database fakta yang otomatis dianggap benar. Pola penting yang ditemukan antara lain:

- Hook yang cepat dikenali, terutama bentuk `Did you know?`.
- Kumpulan fakta singkat dalam satu kartu.
- Topik yang familiar tetapi memiliki sudut mengejutkan.
- Penggunaan angka, perbandingan, rekor, asal-usul, atau kemampuan unik.
- Bahasa sederhana dan cepat dipindai.
- CTA singkat pada bagian akhir.
- Struktur visual yang dapat dipahami tanpa voice-over.

Dataset juga mengandung risiko seperti pengulangan, klaim tanpa konteks, susunan kata yang kurang rapi, dan fakta yang mungkin salah atau sudah berubah. Karena itu, sistem harus meniru DNA format dan gaya komunikasinya tanpa menyalin teks dan tanpa menganggap dataset sebagai sumber kebenaran.

---

## 4. Masalah yang diselesaikan

Tanpa sistem terpusat, produksi konten untuk beberapa Page menghadapi masalah berikut:

1. Sulit mengingat fakta yang sudah pernah digunakan.
2. Fakta yang sama dapat muncul kembali dalam bentuk parafrasa.
3. Setiap chat ChatGPT memiliki konteks yang berbeda dan tidak mengetahui pekerjaan chat lain.
4. Dua chat dapat memilih fakta yang sama pada saat bersamaan.
5. Format output AI sering masih perlu dibersihkan sebelum dipindahkan ke Canva.
6. Gaya bahasa dan struktur dapat berubah-ubah antar-post.
7. Sumber fakta tidak tersimpan secara konsisten.
8. Kalender konten sulit dikelola ketika jumlah Page bertambah.
9. Revisi di satu chat dapat bertabrakan dengan revisi dari chat lain.
10. Sistem yang terlalu kompleks akan memperlambat produksi dan sulit dipelihara oleh satu pengguna.
11. Batch yang terputus tidak memiliki checkpoint yang jelas untuk dilanjutkan pada chat lain.
12. Hasil publikasi tidak tercatat sehingga sistem tidak dapat mempelajari pola terbaik untuk setiap Page.
13. Aturan niche yang berbeda dapat tercampur jika fondasi produk terlalu khusus untuk trivia.

Content Producer harus menyelesaikan masalah tersebut dengan alur percakapan yang sederhana dan penyimpanan data yang terpusat.

---

## 5. Visi produk

Membuat sistem produksi konten yang memungkinkan pengguna meminta satu post, beberapa post, atau kalender konten melalui percakapan biasa, kemudian memperoleh naskah berkualitas yang unik, terverifikasi, konsisten, dan siap dipindahkan ke Canva serta Facebook.

Sistem harus terasa sederhana bagi pengguna, tetapi tetap disiplin dalam:

- Memilih fakta.
- Menyimpan sumber.
- Mencegah duplikasi.
- Mengelola beberapa Page.
- Menangani beberapa chat paralel.
- Menyimpan status dan jadwal post.
- Melanjutkan content plan yang belum selesai.
- Mencatat hasil publikasi sebagai feedback untuk keputusan berikutnya.
- Menambahkan niche baru tanpa mengubah arti data niche yang sudah ada.

---

## 6. Tujuan MVP

### 6.1 Tujuan utama

1. Menghasilkan konten trivia/fakta berbahasa Inggris berdasarkan DNA tiga dataset referensi.
2. Mendukung beberapa Facebook Page dalam satu workspace.
3. Memungkinkan konfigurasi gaya dan campuran topik berbeda untuk setiap Page.
4. Mencegah penggunaan kembali fakta sesuai rule setiap Page, dengan default larangan di seluruh workspace.
5. Mendeteksi fakta yang sama walaupun ditulis ulang dengan kata berbeda.
6. Mendukung beberapa chat ChatGPT yang bekerja paralel tanpa collision atau pelanggaran rule Page.
7. Menghasilkan Canva copy, caption, dan hashtag yang siap disalin.
8. Mendukung pembuatan satu post, batch post, dan rencana kalender.
9. Menyimpan sumber untuk setiap fakta.
10. Menyimpan status post dari draf sampai selesai dipublikasikan.
11. Menjaga MVP tetap kecil dan mudah dipahami.
12. Menyediakan fondasi yang dapat diperluas untuk niche lain di masa depan.
13. Mengautentikasi pemilik sebelum mengizinkan akses ke data atau write tools.
14. Menyimpan content plan dan setiap slot rencana agar batch dapat dilanjutkan antar-chat.
15. Mencatat metrik performa secara manual melalui chat dan menghasilkan insight awal per Page.

### 6.2 Hasil yang diharapkan bagi pengguna

Setelah sistem selesai, alur kerja pengguna menjadi:

```text
Hubungkan plugin sebagai pemilik
→ berikan perintah di ChatGPT
→ tinjau hasil
→ minta revisi bila perlu
→ setujui
→ salin Canva copy
→ salin caption dan hashtag
→ posting manual ke Facebook
→ tandai post sebagai posted
→ catat metrik performa ketika tersedia
```

### 6.3 Ukuran kesederhanaan

MVP dianggap tetap sederhana jika:

- Tidak memerlukan dashboard tambahan untuk penggunaan rutin.
- Tidak memerlukan akun atau billing OpenAI Platform.
- Tidak memerlukan layanan hosting selain Supabase.
- Tidak memiliki background AI worker atau job queue.
- Tidak memiliki tabel versi post atau audit log terpisah.
- Tidak memiliki sistem role atau tim.
- Satu content plan diproses bertahap ketika chat aktif, bukan sebagai background job.
- Tabel core tetap netral terhadap niche; tabel khusus hanya dibuat untuk niche yang membutuhkannya.
- Tugas umum dapat dilakukan dengan perintah bahasa natural di ChatGPT.

---

## 7. Bukan tujuan MVP

Hal berikut tidak dibangun pada MVP:

- Posting otomatis ke Facebook.
- Facebook Graph API.
- Penjadwalan otomatis ke Facebook.
- Integrasi Canva API.
- Pembuatan desain, gambar, background, animasi, atau video.
- Pembuatan voice-over atau naskah narasi.
- Dashboard web khusus.
- Aplikasi mobile.
- Banyak pengguna atau kolaborasi tim.
- Role seperti owner, editor, atau reviewer.
- Plugin publik untuk pengguna lain.
- Vercel atau hosting web terpisah.
- OpenAI Platform project.
- OpenAI API key.
- Embeddings API atau vector database.
- AI generation yang berjalan otomatis di background.
- Job queue atau tabel generation task.
- Post version history penuh.
- Generic audit framework.
- Posting ulang fakta setelah masa tunggu tertentu.
- Pengambilan analytics Facebook secara otomatis; metrik MVP dimasukkan secara manual melalui chat.
- Prediksi views atau jaminan konten viral.
- Scraping kompetitor secara otomatis.
- Niche quote, psikologi, motivasi, atau niche selain trivia pada MVP.

---

## 8. Keputusan produk yang sudah tetap

| Bagian | Keputusan MVP |
|---|---|
| Jenis plugin | Custom MCP plugin pribadi |
| Pengguna | Satu pemilik |
| Jumlah workspace aktif | Satu |
| Jumlah Page | Beberapa Page |
| Niche aktif | Trivia/fakta |
| Bahasa konten | English |
| Standar ejaan | American English |
| Audiens utama | US, UK, CA, AU |
| Pemahaman bahasa | Harus tetap mudah dipahami secara global |
| Format | Reel sekitar 13 detik, teks statis dengan background bergerak |
| Pembuatan AI | ChatGPT Plus yang sedang digunakan pengguna |
| OpenAI API | Tidak digunakan |
| Database | Supabase Postgres |
| Hosting MCP | Supabase Edge Functions |
| Hosting tambahan | Tidak ada; Vercel tidak digunakan |
| Autentikasi MCP | Supabase Auth OAuth 2.1; hanya owner yang diizinkan |
| Interface operasional | Percakapan ChatGPT |
| Canva | Copy/paste manual |
| Facebook | Upload, caption, hashtag, dan publish dilakukan manual |
| Kebijakan pemakaian ulang fakta | Dapat diatur per Page; default `workspace_unique` |
| Kalender | `content_plans` dan `content_plan_items` menyimpan intent/progress; post menyimpan jadwal final |
| Feedback performa | Dicatat manual melalui chat; tanpa Facebook API |
| Kerja paralel | Wajib didukung |
| Repository | Private GitHub repository |
| Environment | Local development dan satu Supabase production project |

Kode market untuk Inggris disimpan sebagai `GB`, tetapi pengguna dapat menyebutnya sebagai UK. Sistem tidak boleh memperlakukan UK dan GB sebagai dua market berbeda.

---

## 9. Pengguna dan persona

### 9.1 Persona utama

Pengguna MVP adalah satu pemilik yang:

- Mengelola beberapa Facebook Page.
- Memproduksi konten trivia secara rutin.
- Menggunakan ChatGPT Plus.
- Mendesain post di Canva.
- Mengunggah konten secara manual ke Facebook.
- Dapat membuka beberapa chat untuk mengerjakan tugas berbeda.
- Tidak ingin mengoperasikan dashboard atau workflow teknis setiap hari.

### 9.2 Kebutuhan utama pengguna

Pengguna harus dapat:

- Meminta konten dengan bahasa natural.
- Memilih Page tujuan.
- Membiarkan sistem memilih tema atau menentukan tema sendiri.
- Meminta satu post atau beberapa post.
- Membuat rencana konten untuk rentang tanggal tertentu.
- Memilih niche aktif atau memakai default niche Page.
- Meminta revisi sebagian tanpa membuat ulang seluruh post.
- Mengetahui sumber fakta jika ingin memeriksanya.
- Menyalin hasil tanpa membersihkan format.
- Menandai post yang sudah dipublikasikan.
- Membuang draft tanpa membakar item niche yang belum pernah dipublikasikan.
- Mencatat views, shares, comments, saves, dan metrik lain yang tersedia.
- Meminta insight performa berdasarkan Page, niche, topik, format, hook, dan CTA.
- Bekerja dari beberapa chat tanpa koordinasi manual antar-chat.

---

## 10. Prinsip desain produk

### 10.1 ChatGPT adalah creative engine

ChatGPT bertanggung jawab untuk:

- Memahami permintaan pengguna.
- Memilih arah topik.
- Meneliti dan memeriksa sumber publik melalui kemampuan yang tersedia di ChatGPT.
- Menilai kemiripan makna dari kandidat fakta yang dikembalikan sistem.
- Menulis hook, fakta, CTA, caption, dan hashtag.
- Melakukan quality review sebelum menyajikan hasil.

### 10.2 Supabase adalah system of record

Supabase bertanggung jawab untuk:

- Menyimpan workspace, Page, niche registry, dan konfigurasi Page per niche.
- Menyimpan content plan, setiap slot rencana, post, jadwal, dan metrik performa.
- Menyimpan fakta trivia dan sumbernya.
- Menyimpan hubungan eksplisit antara post trivia dan fakta yang digunakan.
- Menjalankan pencarian kandidat duplikat.
- Melakukan reservasi fakta secara atomic.
- Mencegah benturan antar-chat.
- Menjalankan MCP server melalui Edge Functions.

Riwayat chat bukan sumber data resmi. Data yang perlu digunakan lintas chat harus disimpan di Supabase.

### 10.3 GitHub adalah source of truth untuk kode

Private GitHub repository menyimpan:

- Source code MCP server.
- Database migrations.
- Instruksi server dan aturan produksi yang bersifat stabil.
- Schema MCP tools.
- Automated tests.
- Dokumentasi proyek.
- Dependency lockfile.

Secret dan credential tidak boleh disimpan di repository.

### 10.4 Generic core, niche-specific module

Fondasi produk harus generik, tetapi aturan khusus niche tidak dipaksakan ke semua niche.

Core generik mencakup:

- Workspace.
- Page.
- Niche registry.
- Konfigurasi Page per niche.
- Content plan dan plan item.
- Post.
- Jadwal.
- Status.
- Output package.
- Performance metrics.

Modul trivia mencakup:

- Fakta.
- Sumber fakta.
- Structured fact key.
- Pemeriksaan duplikasi.
- Reservasi fakta.
- Hubungan post dengan fakta melalui junction table khusus trivia.

Jika kelak ditambahkan niche quotes, sistem dapat menambahkan modul seperti `quote_items` tanpa menjadikan quotes sebagai trivia facts. Pendekatan yang sama berlaku untuk psikologi, motivasi, dan niche lain.

---

## 11. Gambaran arsitektur MVP

```text
Pengguna
   ↓
ChatGPT Plus
   ↓
Custom MCP plugin pribadi
   ↓ Streamable HTTP
Supabase Edge Function: /functions/v1/mcp
   ↓
Supabase Postgres
```

Komponen runtime MVP hanya:

1. ChatGPT Plus.
2. Supabase Edge Functions.
3. Supabase Postgres.

GitHub dan komputer lokal digunakan untuk pengembangan, version control, pengujian, dan deployment, bukan untuk melayani request produksi.

### 11.1 Batas tanggung jawab MCP server

MCP server:

- Menyediakan tool terstruktur kepada ChatGPT.
- Memvalidasi seluruh input.
- Membaca dan menulis data Supabase.
- Menjalankan pencarian kandidat fakta serupa.
- Menjalankan reservasi dan pelepasan fakta.
- Menjaga constraint dan concurrency.
- Mengembalikan hasil terstruktur yang dapat dipakai ChatGPT.

MCP server tidak:

- Memanggil OpenAI API.
- Menulis konten dengan model AI sendiri.
- Melakukan arbitrary web crawling.
- Menjalankan proses AI di background.
- Mengunggah post ke Canva atau Facebook.

### 11.2 Batasan Supabase Edge Functions

MCP dirancang stateless. Semua keadaan penting harus tersimpan di database. Satu request tidak boleh bergantung pada memory proses Edge Function sebelumnya.

---

## 12. Model data tingkat produk

Model data dipisahkan menjadi core generik dan modul niche. Detail kolom ditentukan di `database-design.md`.

| Lapisan | Data | Fungsi |
|---|---|---|
| Core | `workspaces` | Menyimpan ruang kerja dan owner. |
| Core | `pages` | Menyimpan identitas Page dan konfigurasi umum lintas-niche. |
| Core | `niches` | Registry modul niche yang tersedia dan versinya. |
| Core | `page_niche_configs` | Menyimpan konfigurasi khusus satu niche pada satu Page. |
| Core | `content_plans` | Menyimpan intent, snapshot konfigurasi, dan progress batch. |
| Core | `content_plan_items` | Menyimpan setiap slot rencana sebelum atau sesudah post dibuat. |
| Core | `posts` | Menyimpan output final, status, jadwal, dan payload niche berversi. |
| Core | `post_metrics` | Menyimpan snapshot performa yang dimasukkan secara manual. |
| Trivia | `trivia_facts` | Menyimpan klaim canonical, sumber, deduplikasi, dan reservasi. |
| Trivia | `trivia_post_facts` | Menyimpan hubungan ber-FK antara post dan fakta, urutan, wording, serta snapshot verifikasi. |

### 12.1 Aturan extensibility

- Satu Page dapat mengaktifkan satu atau beberapa niche melalui `page_niche_configs`; MVP hanya menyediakan `trivia`.
- Satu post memiliki tepat satu `niche_key`.
- Satu content plan memiliki tepat satu Page dan satu niche; kalender multi-niche dibentuk dari beberapa plan.
- `posts` menyimpan `niche_key`, `format_key`, `content_schema_version`, dan payload konten berversi.
- `trivia_facts` hanya digunakan oleh niche trivia.
- Relasi ke item niche tidak menggunakan foreign key polymorphic. Setiap niche yang membutuhkan library memiliki junction table sendiri.
- Penambahan niche baru tidak boleh mengubah arti data trivia yang sudah ada.
- Tabel khusus niche baru hanya ditambahkan jika niche tersebut benar-benar membutuhkannya.
- Niche tanpa reusable library, seperti motivation pada tahap awal, boleh hanya menyimpan output pada `posts`.
- Setiap modul niche wajib memenuhi kontrak konfigurasi, payload, format, quality checks, deduplikasi, reservasi/release bila relevan, sumber/atribusi, rendering, dan evaluasi.

---

## 13. Pengelolaan Facebook Page

### 13.1 Membuat Page

Pengguna dapat membuat profil Page melalui percakapan. Minimal data yang diperlukan:

- Nama Page.
- Kode atau slug yang unik.
- Zona waktu.
- Target market.
- Niche yang diaktifkan, dengan satu-satunya pilihan MVP `trivia`.
- Default niche Page jika kelak lebih dari satu niche diaktifkan.
- Topik yang diperbolehkan.
- Campuran jenis post.
- Mode jumlah fakta: tetap atau adaptif.
- Anggaran karakter template Canva.
- Kebijakan reuse fakta.
- Preferensi hook, CTA, caption, hashtag, dan emoji.

Jika sebagian informasi tidak diberikan, sistem memakai default MVP dan menampilkan ringkasannya.

### 13.2 Konfigurasi umum dan konfigurasi per niche

Identitas, zona waktu, target market, dan preferensi platform disimpan sebagai konfigurasi umum Page. Aturan yang hanya berlaku pada trivia disimpan pada `page_niche_configs`, bukan sebagai kolom khusus trivia di `pages`.

Setiap Page dapat memiliki gaya berbeda tanpa memisahkan database fakta trivia. Contohnya:

- Page A lebih banyak animals dan nature, memakai `fixed` 5 fakta, dan `workspace_unique`.
- Page B lebih banyak geography dan history, memakai `adaptive` 5–9 fakta dengan preferensi 7, dan `page_unique`.
- Page C memakai mixed trivia lebih sering dan memakai `fixed` 8 fakta.

Semua Page tetap memakai satu database fakta canonical dalam workspace. Namun, konfigurasi trivia setiap Page mempunyai aturan produksi sendiri:

- `fact_count`: mode `fixed` atau `adaptive`.
- `text_budget`: batas karakter hook, setiap fakta, seluruh blok fakta, CTA, dan Canva copy final.
- `fact_reuse_scope`: `workspace_unique` atau `page_unique`. Nilai default Page baru adalah `workspace_unique`.

Mode `fixed` memakai satu nilai 5–9. Mode `adaptive` memakai `min`, `preferred`, dan `max`; default Page baru adalah minimum 5, preferred 7, dan maksimum 9. Mode adaptif tidak memilih angka secara acak. Sistem menentukan jumlah akhir dari panjang fakta yang sudah ditulis, kualitas kandidat, dan ruang teks yang tersisa.

`workspace_unique` berarti Page tujuan hanya boleh memakai fakta yang belum pernah digunakan pada Page mana pun di workspace. `page_unique` berarti Page tujuan boleh memakai fakta yang pernah digunakan Page lain, tetapi fakta tersebut tidak boleh pernah digunakan sebelumnya pada Page tujuan yang sama.

Kebijakan selalu dievaluasi dari konfigurasi Page tujuan. Sebagai contoh, Page B dengan `page_unique` boleh menggunakan fakta yang pernah dipakai Page A. Namun Page A dengan `workspace_unique` tidak boleh menggunakan fakta yang sudah pernah dipakai Page B.

Kebijakan ini diterapkan ketika Page tujuan membuat atau mengganti fakta, bukan sebagai hak kepemilikan permanen. Jika Page A lebih dahulu memakai fakta secara `workspace_unique`, post A tetap valid ketika Page B kemudian memakai fakta tersebut melalui `page_unique`. Pemakaian B tidak mengubah atau membatalkan post A.

Saat post dibuat, sistem menyimpan snapshot konfigurasi jumlah fakta, `text_budget`, jumlah yang benar-benar diterapkan, dan `fact_reuse_scope` di payload post. Perubahan konfigurasi Page hanya berlaku untuk post baru. Post lama memakai snapshot semula kecuali pengguna secara eksplisit meminta revisi untuk menerapkan kebijakan Page terbaru.

### 13.3 Memilih Page dan niche

Setiap operasi pembuatan, revisi, penjadwalan, dan perubahan status harus memiliki Page tujuan dan niche yang jelas. Jika nama Page ambigu, ChatGPT harus meminta pengguna memilih sebelum melakukan write.

Jika pengguna tidak menyebut niche:

- Gunakan default niche bila Page hanya memiliki satu niche aktif atau sudah memiliki default yang tidak ambigu.
- Minta pengguna memilih jika beberapa niche aktif dan intent tidak dapat ditentukan dengan aman.
- Jangan menyimpan post dengan niche yang tidak aktif untuk Page tersebut.

---

## 14. DNA konten trivia

### 14.1 Format post

MVP mendukung lima format editorial trivia. `format_key` disimpan pada post dan divalidasi oleh modul trivia.

| Kode | Arti |
|---|---|
| `single_subject_fast` | Beberapa fakta cepat mengenai satu subjek familiar. |
| `themed_utility` | Fakta praktis dalam satu tema, seperti penyimpanan makanan atau pet safety. |
| `emotional_animal_collection` | Fakta hewan yang menggabungkan surprise, emotion, dan shareability. |
| `comparison` | Fakta yang menonjolkan skala, angka, rekor, atau perbandingan. |
| `myth_vs_fact` | Membalik asumsi umum dengan koreksi yang dapat diverifikasi. |

Untuk kompatibilitas editorial, setiap post juga dapat dikelompokkan sebagai `themed`, `single_subject`, atau `mixed`, tetapi pengukuran performa memakai `format_key` yang lebih spesifik. Distribusi format disimpan pada konfigurasi trivia setiap Page dan dapat berubah berdasarkan data performa.

### 14.2 Jumlah dan panjang fakta

- Setiap Page memilih mode `fixed` atau `adaptive`.
- `fixed` menetapkan jumlah pasti 5–9, misalnya 5, 7, atau 8.
- `adaptive` menetapkan minimum, preferred, dan maksimum dalam rentang 5–9.
- Default Page baru adalah `adaptive`: minimum 5, preferred 7, maksimum 9.
- Mode adaptif harus mencoba mencapai preferred, lalu dapat menambah fakta sampai maksimum jika kandidat tetap kuat dan seluruh text budget masih terpenuhi.
- Jumlah fakta tidak boleh ditentukan dengan random murni.
- Permintaan eksplisit pengguna dapat mengganti jumlah untuk satu post dalam batas 5–9 tanpa mengubah konfigurasi Page.
- Satu fakta berisi satu klaim utama.
- Profil `fast_trivia` menargetkan 7–8 fakta, 8–11 kata per fakta, dan sekitar 65–85 kata total jika text budget mengizinkan.
- Profil `practical_utility` menargetkan 5–6 fakta, 10–14 kata per fakta, dan sekitar 65–85 kata total jika text budget mengizinkan.
- Batas mutlak tetap 5–9 fakta kecuali pengguna menyetujui pengecualian.
- Setiap fakta diusahakan tidak lebih dari 18 kata.
- Default setiap fakta maksimal 90 karakter.
- Batas karakter Page lebih berwenang daripada target jumlah kata.
- Keterbacaan lebih penting daripada memenuhi jumlah fakta.
- Sistem menyimpan atau menghitung `word_count`, jumlah kata per fakta, `line_count`, `estimated_read_seconds`, dan perkiraan kebutuhan replay sebagai sinyal editorial.

Algoritma mode adaptif:

1. Menyiapkan kandidat terverifikasi sampai batas `max` Page dan mengurutkannya berdasarkan kualitas.
2. Menulis fakta terbaik sampai jumlah `min` Page dengan kalimat sepadat mungkin tanpa mengubah makna.
3. Menambahkan fakta ke-6 sampai preferred jika setiap batas karakter tetap terpenuhi.
4. Menambahkan fakta setelah preferred sampai maksimum hanya jika fakta tetap kuat dan masih muat.
5. Berhenti sebelum kandidat berikutnya menyebabkan batas karakter terlewati.

Jika jumlah minimum tidak muat, sistem harus mencoba memperpendek wording tanpa mengurangi akurasi. Jika tetap tidak muat, sistem meminta pengguna mengganti template, mengubah budget, atau menyetujui pengecualian di bawah minimum. Jumlah di bawah 5 tetap memerlukan pengecualian eksplisit. Sistem tidak boleh menurunkan kualitas fakta, memotong kalimat, atau mengarang klaim untuk memenuhi kuota.

Pada mode fixed, sistem harus mencoba memenuhi jumlah yang dipilih. Jika jumlah tersebut tidak muat atau fakta berkualitas tidak cukup, sistem tidak mengurangi jumlah secara diam-diam; sistem menjelaskan kendala dan meminta persetujuan pengguna.

### 14.3 Anggaran karakter Canva

Default Page baru:

| Bagian | Batas default |
|---|---:|
| Hook | 45 karakter |
| Satu fakta | 90 karakter |
| Seluruh blok fakta | 500 karakter |
| CTA | 50 karakter |
| Seluruh Canva copy | 600 karakter |

Karakter hook, kalimat fakta, dan CTA dihitung termasuk spasi serta tanda baca. Batas per fakta menghitung kalimat faktanya; batas blok fakta menghitung bentuk final beserta nomor atau bullet dan line break. Batas Canva copy menghitung string final persis seperti yang akan disalin. Batas blok dan total tetap diperiksa walaupun setiap fakta lulus batas individual.

Nilai tersebut adalah baseline MVP dan dapat disesuaikan per Page setelah diuji pada template Canva yang sebenarnya. Sistem tidak boleh menyiasati overflow dengan menghapus konteks penting atau menyarankan ukuran font yang tidak nyaman dibaca.

Default `render_style` adalah `plain_lines` tanpa nomor. `numbered` hanya digunakan ketika urutan, checklist, atau langkah praktis memang membantu. Render style ikut dihitung dalam text budget final.

### 14.4 Hook

Hook default:

```text
Did you know?
```

Variasi diperbolehkan jika singkat, jujur, dan sesuai isi, misalnya:

```text
Most people don't know this...
These facts sound made up—but they're real.
Here are 6 facts you probably never learned.
```

Aturan hook:

- Mengikuti `text_budget.hook_max_chars`; default 45 karakter dan hard ceiling MVP 90.
- Tidak menjanjikan sesuatu yang tidak diberikan.
- Tidak menggunakan sensational claim yang tidak dapat dibuktikan.
- Tidak menggunakan ALL CAPS secara berlebihan.

### 14.5 Ciri fakta yang diprioritaskan

Fakta yang diprioritaskan memiliki satu atau beberapa sifat berikut:

- Subjeknya sudah dikenal banyak orang.
- Bertentangan dengan dugaan umum.
- Memiliki angka konkret.
- Memiliki perbandingan yang mudah dibayangkan.
- Menjelaskan rekor atau kondisi ekstrem.
- Mengungkap asal-usul yang tidak terduga.
- Menjelaskan kemampuan unik hewan atau alam.
- Mengungkap sejarah benda sehari-hari.
- Memberikan pengetahuan praktis yang aman.

Fakta harus menarik karena substansinya, bukan karena bahasa yang dilebih-lebihkan.

### 14.6 Topik awal

Topik allowlist MVP:

- `animals`
- `pet_safety`
- `food_science`
- `food_storage_home`
- `practical_utility`
- `human_body`
- `nature_science`
- `geography`
- `history_origins`
- `inventions_everyday`
- `general_trivia`

Bobot awal yang disarankan:

| Topik | Bobot awal |
|---|---:|
| Animals dan pet safety | 30% |
| Human body, food science, dan myth-busting | 20% |
| Practical utility dan food storage/home | 15% |
| Geography dan places | 15% |
| Nature dan space/science | 10% |
| History, origins, inventions, dan people | 10% |

Bobot dapat disesuaikan per Page. Sistem tidak wajib melakukan rotasi geografis US, UK, CA, dan AU. Topik lokal boleh digunakan selama konteksnya cukup sehingga pembaca dari negara lain tetap memahami isinya.

### 14.7 CTA

- Satu baris pendek.
- Mengikuti `text_budget.cta_max_chars`; default 50 karakter dan hard ceiling MVP 100.
- Relevan dengan isi.
- Bervariasi antar-post.
- Tidak menipu atau memaksa interaksi.
- Selaras dengan `interaction_goal` post: `share`, `save`, `comment`, atau `follow`.

Contoh:

```text
Follow for more surprising facts.
Which fact surprised you most?
Save this for later.
Share this with someone who loves trivia.
```

---

## 15. Gaya bahasa Inggris

### 15.1 Standar bahasa

- Menggunakan natural American English.
- Menggunakan American spelling secara konsisten.
- Pilihan kata tetap netral bagi pembaca US, UK, CA, AU, dan global.
- Menghindari slang yang hanya dipahami satu wilayah.
- Tidak mencampurkan beberapa standar ejaan dalam satu post.
- Tidak menerjemahkan struktur kalimat Indonesia secara literal.

### 15.2 Gaya kalimat

- Singkat dan langsung.
- Conversational tetapi tetap kredibel.
- Menggunakan kata yang umum dipahami.
- Satu ide utama per kalimat.
- Menggunakan active voice jika natural.
- Menghindari jargon dan penjelasan panjang.
- Istilah teknis penting dijelaskan secara sangat singkat.
- Tidak menggunakan emoji kecuali diizinkan oleh konfigurasi Page.
- Tidak menggunakan filler untuk menambah panjang.

### 15.3 Angka dan satuan

- Angka numerik digunakan jika lebih mudah dipindai.
- Pemisah ribuan harus konsisten.
- Satuan harus mudah dipahami audiens utama.
- Dua satuan dapat digunakan jika membantu, misalnya `10 ft (3 m)`.
- Tahun atau `as of` harus disebut bila diperlukan agar fakta yang dapat berubah tidak menyesatkan.

### 15.4 Kerapian

Output tidak boleh mengandung:

- Kalimat terpotong.
- Susunan kata rusak.
- Kesalahan grammar yang jelas.
- Tanda baca yang tidak konsisten.
- Pengulangan informasi.
- Label internal dalam Canva copy.
- URL atau ID database dalam Canva copy.
- Teks yang tampak seperti hasil OCR rusak.

---

## 16. Aturan fakta dan sumber

### 16.1 Dataset referensi bukan sumber fakta

Tiga dataset kompetitor hanya digunakan untuk pola topik, struktur, dan gaya. Klaim di dalamnya harus diverifikasi ulang sebelum digunakan.

### 16.2 Sumber yang tidak cukup

Hal berikut tidak cukup sebagai bukti tunggal:

- Ingatan model AI.
- Post media sosial.
- Komentar pengguna.
- Website agregator tanpa sumber.
- Blog yang hanya menyalin klaim dari tempat lain.
- Dataset kompetitor.

### 16.3 Prioritas sumber

Urutan sumber yang diprioritaskan:

1. Pemerintah, universitas, jurnal, museum, lembaga ilmiah, atau sumber primer.
2. Organisasi resmi dan publikasi referensi bereputasi baik.
3. Media sekunder berkualitas yang menyebutkan sumber aslinya.

### 16.4 Data sumber minimum

Setiap fakta yang disimpan dan digunakan harus memiliki minimal:

- URL sumber.
- Judul halaman atau dokumen.
- Nama penerbit atau organisasi.
- Tanggal akses.
- Catatan singkat mengenai dukungan sumber terhadap klaim.
- Tanggal `as_of` jika faktanya dapat berubah.

Satu sumber kuat dapat cukup untuk fakta stabil. Fakta sensitif, angka yang dapat berubah, rekor, hukum, kesehatan, atau keselamatan membutuhkan sumber primer atau konfirmasi tambahan. Jika bukti tidak cukup, fakta tidak boleh digunakan.

### 16.5 Fakta time-sensitive

Fakta berikut dianggap mudah berubah:

- Populasi.
- Harga.
- Peringkat.
- Rekor.
- Hukum dan peraturan.
- Pejabat atau jabatan.
- Statistik periodik.
- Status operasi suatu tempat atau organisasi.

Fakta tersebut harus menyimpan `as_of`, menyebut tahun bila diperlukan, dan diperiksa kembali sebelum digunakan jika datanya sudah tidak segar.

### 16.6 Topik sensitif

Topik berikut harus dihindari atau diperiksa lebih ketat:

- Diagnosis dan pengobatan medis.
- Dosis obat atau suplemen.
- Food safety.
- Racun dan keselamatan hewan peliharaan.
- Survival advice.
- Nasihat hukum atau keuangan.
- Instruksi yang dapat menimbulkan bahaya.

Konten `human_body` harus bersifat edukatif umum dan bukan medical advice.

---

## 17. Keunikan fakta dan kebijakan pemakaian ulang

Bagian ini membedakan dua konsep yang tidak boleh dicampur:

- **Keunikan canonical** menentukan apakah dua kalimat merepresentasikan klaim yang sama. Satu klaim hanya memiliki satu row canonical dalam satu workspace.
- **Kebijakan pemakaian ulang** menentukan apakah row canonical tersebut boleh digunakan untuk Page tujuan. Keputusan ini mengikuti `fact_reuse_scope` milik Page.

Dengan demikian, `page_unique` tidak membuat salinan row fakta. Mode tersebut hanya dapat mengizinkan row canonical yang sama dipakai oleh Page lain.

### 17.1 Definisi duplikat

Dua fakta dianggap sama jika inti klaimnya sama, walaupun:

- Menggunakan susunan kata berbeda.
- Menggunakan sinonim.
- Menggunakan satuan berbeda.
- Salah satunya menambahkan detail kecil.
- Salah satunya memakai perbandingan.

Contoh berikut dianggap fakta yang sama:

```text
Octopuses have three hearts.
An octopus has a total of 3 hearts.
```

Dua fakta mengenai subjek yang sama tetap dapat dianggap berbeda jika klaim utamanya benar-benar berbeda.

### 17.2 Kebijakan pemakaian ulang

- Setiap Page memakai `fact_reuse_scope` dari konfigurasi Page tujuan.
- `workspace_unique` melarang pemakaian fakta yang sudah digunakan pada Page mana pun.
- `page_unique` mengizinkan pemakaian fakta dari Page lain, tetapi melarang pengulangan pada Page tujuan yang sama.
- Rule diperiksa secara atomic saat reservation dan diperiksa kembali saat save; penggunaan baru di Page lain tidak diterapkan secara retroaktif pada post lama.
- Default untuk Page baru adalah `workspace_unique`.
- Fakta pada post `draft` atau `ready` dianggap telah dialokasikan dan tidak tersedia bagi request yang melanggar reuse rule.
- Fakta baru dianggap digunakan secara permanen setelah post menjadi `posted`.
- Fakta yang sedang direservasi oleh satu chat tidak boleh diambil chat lain.
- Reservasi yang dilepas karena proses dibatalkan membuat fakta tersedia kembali.
- Reuse berdasarkan periode waktu belum termasuk MVP.

Jika fakta diganti ketika post masih `draft` atau `ready`, alokasi fakta lama dilepas karena fakta tersebut tidak lagi menjadi bagian post. Jika post `draft` atau `ready` menjadi `discarded`, seluruh alokasi faktanya dilepas. Pencatatan fakta pada post `posted` atau `archived` tidak pernah dilepas.

### 17.3 Lapisan pemeriksaan tanpa embeddings

MVP tidak menggunakan vector embeddings. Pemeriksaan dilakukan melalui:

1. Normalisasi teks.
2. Exact normalized hash.
3. Structured fact key yang merepresentasikan subject, relation, object, angka, dan qualifier penting.
4. PostgreSQL Full Text Search.
5. `pg_trgm` untuk kemiripan teks.
6. Perbandingan entitas, angka, dan sumber sebagai sinyal tambahan.
7. Penilaian semantik oleh ChatGPT terhadap kandidat fakta serupa yang dikembalikan MCP.

Database menyaring dan mengembalikan kandidat. ChatGPT menilai apakah maknanya benar-benar sama. Keputusan akhir tetap harus ditegakkan melalui reservasi atomic dan unique constraints.

Exact duplicate tidak pernah dibuat sebagai row fakta baru. Jika reuse diizinkan, sistem menggunakan kembali row canonical yang sudah ada; jika tidak diizinkan, kandidat ditolak untuk Page tujuan.

### 17.4 Reservasi fakta dan kerja paralel

Reservasi fakta harus atomic. Jika dua chat mencoba mengambil fakta yang sama:

- Hanya satu chat yang boleh berhasil.
- Chat lain harus menunggu transaction selesai, lalu mengevaluasi ulang rule Page; gunakan row canonical jika masih diizinkan atau pilih pengganti jika diblokir.
- Tidak boleh terjadi silent collision.
- Reservasi yang ditinggalkan harus memiliki masa kedaluwarsa.
- Pelepasan reservasi harus aman dijalankan ulang.

Ketika post berhasil disimpan, Page ditambahkan ke riwayat penggunaan fakta. Pemakaian berikutnya ditentukan oleh `workspace_unique` atau `page_unique`. Jika fakta diganti saat revisi, fakta baru harus direservasi terlebih dahulu, lalu perubahan riwayat fakta baru dan lama dilakukan secara aman.

---

## 18. Output post

### 18.1 Post package

Setiap post yang berhasil dibuat harus memiliki bagian berikut:

| Bagian | Ditampilkan kepada pengguna | Disalin ke Canva/Facebook |
|---|---:|---:|
| Page tujuan | Ya | Tidak |
| Post ID | Ya | Tidak |
| Status | Ya | Tidak |
| Niche, topik, format, dan interaction goal | Ya | Tidak |
| Canva copy | Ya | Canva |
| Facebook caption | Ya | Facebook |
| Hashtags | Ya | Facebook |
| Saran background | Opsional | Referensi Canva |
| Jadwal | Jika tersedia | Tidak |
| Sumber fakta | Ya, sebagai referensi internal | Tidak |
| Catatan quality check | Ringkas | Tidak |
| Ringkasan performa | Jika sudah dicatat | Tidak |

### 18.2 Format Canva copy

Canva copy terdiri dari:

1. Hook.
2. Daftar fakta dalam urutan final.
3. CTA.

Aturan:

- Tidak berisi JSON.
- Tidak berisi markdown internal.
- Tidak berisi URL sumber.
- Tidak berisi ID atau catatan teknis.
- Memiliki line break yang rapi.
- Dapat langsung disalin tanpa editing wajib.
- Sesuai dengan area teks pada format Reel 13 detik.
- Memenuhi component budget dan total budget dari snapshot konfigurasi Page.

### 18.3 Caption

- Siap ditempel langsung ke Facebook.
- Mendukung isi visual tanpa menyalin semua fakta secara mentah.
- Menggunakan bahasa yang sama dengan post.
- Tidak membuat klaim tambahan yang belum diverifikasi.
- Target maksimum MVP: 500 karakter, kecuali konfigurasi Page menetapkan lebih pendek.

### 18.4 Hashtag

- Default 3 hashtag jika relevan.
- Rentang MVP 0–5 hashtag.
- Relevan dengan topik dan identitas Page.
- Tidak menggunakan hashtag acak hanya untuk mengejar jangkauan.
- Tidak mengulang kata secara berlebihan.

---

## 19. Lifecycle post

Jalur publikasi normal:

```text
draft → ready → posted → archived
```

Jalur membuang konten yang tidak jadi dipublikasikan:

```text
draft → discarded
ready → discarded
```

Arti status:

- `draft`: Naskah sudah disimpan tetapi masih dapat direvisi.
- `ready`: Naskah sudah disetujui dan siap dipindahkan ke Canva/Facebook.
- `posted`: Pengguna telah memublikasikan post secara manual di Facebook.
- `discarded`: Draft atau ready dibatalkan sebelum publikasi; alokasi item niche yang belum pernah dipublikasikan dilepas.
- `archived`: Post yang pernah dipublikasikan tidak lagi aktif dalam workflow harian; penggunaan item niche tetap permanen.

Aturan:

- Sistem tidak boleh menandai `posted` secara otomatis.
- Pengguna harus memberi perintah setelah publikasi manual selesai.
- Post `posted`, `discarded`, dan `archived` tidak dapat direvisi pada MVP. Jika pengguna membutuhkan versi baru, sistem membuat post baru yang melewati pemeriksaan fakta dan kualitas dari awal.
- Hanya post `posted` yang dapat menjadi `archived`.
- `discarded` harus merupakan tindakan eksplisit pengguna dan tidak sama dengan riwayat publikasi.
- Mengarsipkan post tidak membuat faktanya dapat dipakai kembali.
- Perubahan status yang tidak valid harus ditolak dengan penjelasan jelas.

---

## 20. Alur utama pengguna

### 20.1 Membuat satu post

1. Pengguna memilih Page, niche, dan bila diinginkan topik. Niche default boleh digunakan jika tidak ambigu.
2. Sistem membaca konfigurasi umum Page, konfigurasi Page+niche, insight performa, dan riwayat konten.
3. ChatGPT meneliti kandidat fakta dan sumber.
4. MCP mencari fakta serupa di seluruh workspace dan membaca riwayat Page pemakainya.
5. ChatGPT membuang atau mengganti kandidat yang melanggar rule Page atau meragukan.
6. MCP mereservasi fakta final secara atomic.
7. ChatGPT menyusun Canva copy, caption, dan hashtag.
8. ChatGPT menjalankan pemeriksaan kualitas.
9. MCP menyimpan post sebagai `draft`, menghubungkannya dengan fakta melalui `trivia_post_facts`, dan menyimpan snapshot konfigurasi serta verifikasi.
10. Sistem menampilkan post package kepada pengguna.
11. Pengguna dapat merevisi atau menyetujui post.
12. Setelah disetujui, status berubah menjadi `ready`.

### 20.2 Merevisi post

Pengguna dapat meminta perubahan seperti:

- Mengganti hook.
- Memperpendek kalimat.
- Mengubah CTA.
- Mengubah caption atau hashtag.
- Mengganti satu atau beberapa fakta.

Aturan revisi:

- Revisi bahasa tidak boleh mengubah arti fakta.
- Mengganti fakta wajib melewati pemeriksaan dan reservasi ulang.
- Sistem harus menolak update jika post telah berubah di chat lain sejak dibaca.
- Revisi tidak memerlukan tabel version history penuh; post cukup menyimpan revision number dan waktu perubahan terakhir.
- Hanya post `draft` atau `ready` yang dapat direvisi. Revisi post `ready` mengembalikannya ke `draft` untuk diperiksa ulang.
- Post `posted`, `discarded`, atau `archived` tidak direvisi; permintaan perubahan dibuat sebagai post baru.

### 20.3 Membuat batch post

1. Pengguna menentukan Page, niche, jumlah post, tema, atau rentang tanggal.
2. Sistem membuat `content_plan` dan seluruh `content_plan_items` sebagai checkpoint sebelum menghasilkan post.
3. ChatGPT memproses item dalam chunk kecil, dengan default 3–5 post per putaran aktif.
4. Setiap post disimpan dan ditautkan ke plan item segera setelah berhasil.
5. Kegagalan satu item tidak menghapus post lain yang sudah berhasil.
6. Sistem memperbarui progress plan dan menampilkan jumlah selesai, perlu revisi, belum diproses, dan gagal.

Tidak ada backend generation job. Batch berlangsung selama chat aktif dan dapat dilanjutkan pada chat yang sama atau chat lain dengan membaca `content_plan` beserta item yang belum selesai.

### 20.4 Membuat kalender konten

1. Pengguna menentukan Page, niche, rentang tanggal, frekuensi, dan preferensi topik.
2. Sistem membuat satu `content_plan` dan satu `content_plan_item` untuk setiap slot yang diminta.
3. ChatGPT membuat post per item dan mengisi `scheduled_at` pada post final.
4. Sistem memeriksa agar satu Page tidak memiliki dua post pada slot yang sama.
5. Pengguna dapat meminta progress, melanjutkan item yang belum selesai, mengganti post, atau memindahkan jadwal.

Kalender yang ditampilkan kepada pengguna tetap berupa daftar post terjadwal. `content_plans` dan `content_plan_items` menyimpan intent serta progress; keduanya bukan scheduler atau background queue.

### 20.5 Menyalin dan memublikasikan

1. Pengguna menyalin bagian Canva copy ke template Canva.
2. Pengguna menambahkan background bergerak dan mengekspor video 13 detik.
3. Pengguna mengunggah video ke Facebook.
4. Pengguna menyalin caption dan hashtag.
5. Pengguna memublikasikan atau menjadwalkan post di Facebook.
6. Pengguna memberi tahu sistem bahwa post sudah dipublikasikan.
7. Sistem mengubah status menjadi `posted` dan, jika diberikan, menyimpan Facebook post ID serta URL publikasi.
8. Setelah metrik tersedia, pengguna dapat memasukkannya melalui chat untuk disimpan sebagai snapshot performa.

---

## 21. Dukungan beberapa chat

Pengguna dapat menggunakan beberapa chat, misalnya:

- Chat A membuat post untuk Page A.
- Chat B membuat kalender Page B.
- Chat C merevisi post Page C.

Syarat perilaku:

- Semua chat membaca sumber data yang sama di Supabase.
- Reservasi fakta dilakukan oleh database, bukan hanya berdasarkan memory chat.
- Setiap post memiliki revision number atau mekanisme concurrency setara.
- Update dari versi lama ditolak, bukan menimpa diam-diam.
- Jadwal ganda untuk Page dan waktu yang sama dicegah.
- Operasi release dan perubahan status harus idempotent secara praktis jika request diulang.

MVP tidak mengoordinasikan chat melalui background worker. Koordinasi terjadi melalui transaksi dan constraint database pada setiap tool call.

Content plan adalah checkpoint lintas-chat. Chat baru dapat mengambil progress plan, lalu hanya memproses item yang belum selesai tanpa membuat ulang slot atau post yang sudah berhasil.

---

## 22. Perencanaan konten

### 22.1 Jenis permintaan

Sistem harus memahami setidaknya:

- Satu post tanpa jadwal.
- Satu post untuk tanggal tertentu.
- Sejumlah post untuk satu Page.
- Sejumlah post yang dibagi ke beberapa tanggal.
- Kalender harian atau beberapa kali per hari.
- Tema tunggal.
- Tema campuran.
- Sistem memilih topik berdasarkan bobot Page.
- Melanjutkan content plan yang belum selesai.
- Mencatat performa dan meminta insight atas post yang telah dipublikasikan.

### 22.2 Keseimbangan kalender

Untuk rentang beberapa hari, sistem harus menghindari:

- Topik yang sama terus-menerus tanpa diminta.
- Hook yang identik pada semua post.
- CTA yang identik pada semua post.
- Subjek yang terlalu mirip pada hari berdekatan.
- Terlalu banyak mixed trivia sehingga identitas Page terasa acak.

### 22.3 Target geografis

US, UK, CA, dan AU adalah kelompok audiens utama, bukan empat silo konten terpisah. Sistem tidak wajib merotasi target negara untuk setiap post.

Jika post membahas hal yang spesifik untuk Australia, Inggris, Kanada, atau Amerika Serikat, sistem harus memberi konteks yang cukup agar pembaca dari negara lain tetap memahami fakta tersebut.

---

## 23. MCP tools tingkat produk

Kontrak detail ditentukan dalam implementation plan, tetapi MVP ditargetkan memiliki tool berikut:

| Tool | Tujuan |
|---|---|
| `health_check` | Memastikan MCP dan database dapat diakses. |
| `get_workspace_context` | Mengambil aturan global dan ringkasan workspace. |
| `list_niches` | Menampilkan modul niche yang aktif dan tersedia. |
| `list_pages` | Menampilkan Page atau mengambil konteks Page tertentu. |
| `create_page` | Membuat Page baru. |
| `update_page` | Memperbarui konfigurasi Page. |
| `get_page_generation_context` | Mengambil konfigurasi Page+niche, riwayat, variasi terbaru, dan insight performa untuk generasi. |
| `create_content_plan` | Membuat plan dan seluruh slot sebagai checkpoint batch/kalender. |
| `get_content_plan` | Mengambil progress dan item yang masih perlu diproses. |
| `trivia_find_similar_facts` | Mencari exact match dan kandidat fakta serupa. |
| `trivia_register_and_reserve_facts` | Membuat atau memakai row canonical, lalu mereservasi fakta secara atomic. |
| `trivia_release_facts` | Melepaskan reservasi yang tidak digunakan. |
| `save_post` | Menyimpan post baru beserta fakta terpilih. |
| `get_posts` | Mengambil post, daftar kerja, atau kalender berdasarkan filter. |
| `revise_post` | Menyimpan revisi dengan pemeriksaan revision number. |
| `update_post_status` | Mengubah status post melalui transisi yang valid. |
| `discard_post` | Membuang draft/ready dan menjalankan release behavior modul niche. |
| `record_post_performance` | Menyimpan snapshot metrik yang diberikan pengguna. |
| `get_performance_insights` | Merangkum pola performa berdasarkan Page, niche, topik, format, dan CTA. |

Prinsip tool:

- Nama action-oriented dan tidak ambigu.
- Satu tool memiliki satu tanggung jawab utama.
- Input dan output terstruktur.
- Read-only dan write annotations harus akurat.
- Write tool melakukan validasi dan mengembalikan ID stabil.
- Tool tidak mengembalikan secret atau data teknis yang tidak diperlukan.
- Tool error memberi tahu ChatGPT tindakan pemulihan yang aman.

---

## 24. Kebutuhan fungsional

### 24.1 Workspace dan Page

- **FR-WSP-001:** Sistem memiliki satu workspace aktif untuk pengguna MVP.
- **FR-WSP-002:** Workspace dimiliki oleh owner terautentikasi dan menyediakan default sistem serta satu riwayat fakta bersama.
- **FR-PAGE-001:** Pengguna dapat membuat beberapa Page.
- **FR-PAGE-002:** Setiap Page memiliki konfigurasi umum serta satu atau beberapa konfigurasi niche; MVP hanya mengaktifkan trivia.
- **FR-PAGE-003:** Page dapat dinonaktifkan tanpa menghapus riwayat post dan fakta.
- **FR-PAGE-004:** Sistem harus meminta pilihan jika Page tujuan tidak jelas.
- **FR-PAGE-005:** Sistem harus menentukan niche aktif secara eksplisit atau memakai default yang tidak ambigu.

### 24.2 Fakta trivia

- **FR-FACT-001:** Setiap fakta memiliki claim yang dinormalisasi dan metadata sumber.
- **FR-FACT-002:** Sistem mencari exact duplicate dan near duplicate sebelum fakta dapat digunakan.
- **FR-FACT-003:** Kelayakan memakai ulang row canonical diperiksa dengan `workspace_unique` atau `page_unique` sesuai konfigurasi Page tujuan.
- **FR-FACT-004:** Fakta harus dapat direservasi secara atomic.
- **FR-FACT-005:** Reservasi memiliki masa kedaluwarsa.
- **FR-FACT-006:** Fakta pada post tersimpan tidak dapat dipakai lagi jika melanggar kebijakan reuse Page tujuan.
- **FR-FACT-007:** Sistem dapat melepas fakta yang tidak jadi digunakan.
- **FR-FACT-008:** Perubahan wording tidak boleh mengubah normalized meaning tanpa pemeriksaan ulang.

### 24.3 Produksi post

- **FR-POST-001:** Pengguna dapat membuat satu post melalui bahasa natural.
- **FR-POST-002:** Pengguna dapat membuat beberapa post dalam satu percakapan.
- **FR-POST-003:** Post mengikuti konfigurasi Page dan aturan DNA konten.
- **FR-POST-004:** Post menyimpan `niche_key`, `format_key`, schema version, hook, body niche, CTA, Canva copy, caption, hashtags, konfigurasi snapshot, dan metadata.
- **FR-POST-005:** Hubungan post trivia dengan fakta disimpan melalui `trivia_post_facts`, bukan hanya referensi ID di JSON.
- **FR-POST-006:** Post baru disimpan sebagai `draft`.
- **FR-POST-007:** Pengguna dapat merevisi bagian tertentu.
- **FR-POST-008:** Revisi konflik ditolak menggunakan revision check.
- **FR-POST-009:** Pengguna dapat mengubah status melalui lifecycle yang valid, termasuk `discarded`.
- **FR-POST-010:** Sistem dapat mengambil post berdasarkan ID, Page, niche, status, tanggal, atau plan.

### 24.4 Kalender

- **FR-PLAN-001:** Pengguna dapat meminta rencana berdasarkan rentang tanggal dan frekuensi.
- **FR-PLAN-002:** Post terjadwal menyimpan waktu dan zona waktu yang jelas.
- **FR-PLAN-003:** Sistem mencegah slot yang sama untuk Page yang sama.
- **FR-PLAN-004:** Pengguna dapat memindahkan jadwal post.
- **FR-PLAN-005:** Pengguna dapat menampilkan kalender sebagai daftar post terurut.
- **FR-PLAN-006:** Sistem tidak mengirim jadwal ke Facebook.
- **FR-PLAN-007:** Plan menyimpan setiap slot yang diminta walaupun post belum berhasil dibuat.
- **FR-PLAN-008:** Plan yang terputus dapat dilanjutkan tanpa membuat ulang item yang sudah selesai.

### 24.5 Output

- **FR-OUT-001:** Canva copy dapat disalin tanpa pembersihan manual wajib.
- **FR-OUT-002:** Caption dan hashtag ditampilkan terpisah dari Canva copy.
- **FR-OUT-003:** Sumber ditampilkan terpisah dan tidak masuk ke teks publik.
- **FR-OUT-004:** Output menunjukkan Page, post ID, status, dan jadwal.
- **FR-OUT-005:** Sistem memberikan peringatan jika fakta memerlukan review manual.

### 24.6 Performa

- **FR-METRIC-001:** Pengguna dapat mencatat metrik post secara manual melalui chat.
- **FR-METRIC-002:** Satu post dapat memiliki lebih dari satu snapshot metrik dengan `captured_at` yang jelas.
- **FR-METRIC-003:** Sistem dapat merangkum performa menurut Page, niche, topik, format, interaction goal, hook, dan CTA.
- **FR-METRIC-004:** Sistem tidak mengklaim hubungan sebab-akibat atau jaminan viral dari data performa yang terbatas.

---

## 25. Quality gate

Quality gate dibagi menjadi pemeriksaan yang dapat ditegakkan sistem dan penilaian editorial. Keduanya disimpan terpisah agar sistem tidak memberi kesan bahwa database dapat membuktikan akurasi bahasa atau fakta secara otomatis.

### 25.1 System checks

1. Owner, workspace, Page, dan niche valid.
2. Konfigurasi Page+niche dan content schema version valid.
3. Jumlah fakta mengikuti snapshot konfigurasi atau override eksplisit pengguna.
4. Seluruh fact ID dan relasi `trivia_post_facts` valid.
5. Metadata sumber minimum tersedia.
6. Reservasi dan reuse rule valid.
7. Slot jadwal tidak bentrok.
8. Setiap komponen dan Canva copy final memenuhi text budget.
9. Canva copy bebas URL, ID, JSON, dan catatan teknis.
10. Revision number dan status transition valid.

### 25.2 Editorial checks

1. Klaim didukung sumber yang memadai.
2. Fakta time-sensitive memiliki konteks waktu.
3. Tidak ada medical, legal, financial, atau safety advice yang tidak layak.
4. American English konsisten dan mudah dipahami secara global.
5. Hook sesuai isi dan format niche.
6. CTA relevan dengan interaction goal.
7. Caption tidak menambahkan klaim baru.
8. Hashtag relevan dan tidak berlebihan.
9. Grammar, punctuation, line break, kepadatan kata, dan keterbacaan visual sudah layak.
10. Teks tidak menyalin dataset referensi atau sumber secara substansial.

Post hanya dapat menjadi `ready` setelah system checks lolos, editorial checks selesai, dan pengguna memberikan persetujuan eksplisit. Jika pemeriksaan kritis gagal, post tetap `draft` atau proses dihentikan dengan penjelasan yang dapat ditindaklanjuti.

---

## 26. Kebutuhan non-fungsional

### 26.1 Keandalan data

- Supabase adalah satu-satunya system of record produksi.
- Constraint penting harus ditegakkan di database, bukan hanya melalui prompt.
- Reservasi fakta harus transactional.
- Request yang diulang tidak boleh menghasilkan pelepasan atau perubahan status yang merusak data.
- Post tidak boleh tersimpan tanpa Page yang valid.
- Fakta tidak boleh dianggap digunakan tanpa hubungan dengan post yang valid.

### 26.2 Performa

Target server, tidak termasuk waktu ChatGPT meneliti atau menulis:

| Operasi | Target p95 |
|---|---:|
| Read sederhana | Maksimal 2 detik |
| Pencarian kandidat duplikat | Maksimal 3 detik |
| Reservasi atau write sederhana | Maksimal 3 detik |

Jika jumlah data bertambah dan target tidak tercapai, optimasi dilakukan melalui index dan query tuning sebelum menambah layanan baru.

### 26.3 Parallelism

- Minimal 10 request reservasi simultan harus dapat diuji tanpa satu fakta dimiliki dua reservation pada saat yang sama.
- Update post dari revision lama harus ditolak.
- Dua request pada slot Page yang sama tidak boleh membuat jadwal ganda.

### 26.4 Maintainability

- Business rules dipisahkan dari MCP transport handler.
- Aturan generik dipisahkan dari modul trivia.
- Core tidak mengimpor aturan bisnis khusus trivia; modul niche menggunakan layanan core melalui kontrak yang stabil.
- Setiap modul niche memiliki versioned configuration schema, content payload schema, validation, quality checks, tools, dan evaluation fixtures.
- Schema database dapat dibuat ulang dari migration.
- Dependency version dipin dan lockfile disimpan.
- Tool contract memiliki automated tests.
- Penambahan niche baru tidak mengharuskan rewrite modul trivia.

### 26.5 Observability

Log minimum:

- Request ID.
- Nama tool.
- Waktu mulai dan durasi.
- Status sukses atau gagal.
- Workspace, Page, post, atau fact ID yang relevan.
- Error code yang aman.
- Reservation conflict.

Log tidak boleh menyimpan:

- Database secret.
- Authorization header.
- Seluruh isi chat.
- Data sumber atau output penuh jika tidak diperlukan untuk debugging.

### 26.6 Biaya

- Tidak ada biaya OpenAI API terpisah.
- Penggunaan AI mengikuti batas akun ChatGPT Plus pengguna.
- Biaya infrastruktur hanya berasal dari penggunaan Supabase dan layanan pengembangan yang dipilih pengguna.
- Sistem tidak menambahkan embeddings, vector service, atau worker berbayar pada MVP.

---

## 27. Keamanan dan privasi MVP

### 27.1 Model akses

MVP adalah plugin pribadi untuk satu pemilik dan tidak dipublikasikan ke direktori umum. MCP menggunakan Supabase Auth OAuth 2.1. Setiap request harus memiliki identitas pengguna yang valid dan hanya owner yang diizinkan mengakses workspace.

`workspaces.owner_user_id` menjadi dasar ownership. Pemeriksaan authorization dilakukan server-side pada setiap read dan write; model tidak menentukan hak akses. Identitas yang dapat diedit pengguna seperti `user_metadata` tidak boleh menjadi dasar authorization.

### 27.2 Kontrol minimum

Implementasi harus:

- Mengekspos hanya tool yang diperlukan.
- Tidak menyediakan tool delete permanen.
- Memvalidasi seluruh input dengan schema ketat.
- Membatasi ukuran payload.
- Menerapkan rate limit yang wajar.
- Memverifikasi token dan ownership pada setiap request.
- Menggunakan database role dengan privilege minimum yang praktis dan tidak mengandalkan `TO authenticated` tanpa ownership predicate.
- Tidak pernah mengirim service role key kepada ChatGPT.
- Menyimpan secret hanya pada Supabase secret storage atau environment lokal.
- Mengaktifkan RLS pada setiap tabel exposed dan menggunakan `USING` serta `WITH CHECK` yang sesuai untuk update.
- Mendefinisikan Data API exposure dan database grants secara eksplisit; exposure schema tidak dianggap sama dengan RLS.
- Menghindari `SECURITY DEFINER` kecuali benar-benar diperlukan; fungsi privileged harus berada di schema internal, memeriksa owner, dan tidak dapat dipanggil publik tanpa grant yang disengaja.
- Tidak mengembalikan credential melalui tool response atau log.

### 27.3 Prompt injection dan sumber eksternal

- Isi website diperlakukan sebagai data tidak tepercaya.
- Instruksi yang ditemukan dalam halaman sumber harus diabaikan.
- MCP tidak boleh menjalankan perintah yang berasal dari teks sumber.
- URL dan metadata sumber harus divalidasi sebelum disimpan.

---

## 28. Error dan pemulihan

Error harus singkat, terstruktur, dan memberi langkah berikutnya.

Kategori minimum:

| Error | Tindakan |
|---|---|
| Tidak terautentikasi | Minta pengguna menghubungkan atau memperbarui autentikasi plugin. |
| Tidak memiliki akses | Tolak operasi tanpa membocorkan data workspace lain. |
| Page tidak ditemukan | Tampilkan Page yang tersedia. |
| Page ambigu | Minta pengguna memilih. |
| Niche tidak aktif atau ambigu | Gunakan default yang valid atau minta pengguna memilih. |
| Klaim sudah memiliki row canonical | Gunakan row tersebut; jangan membuat salinan fakta baru. |
| Pemakaian ulang tidak diizinkan | Gunakan fakta pengganti yang memenuhi kebijakan Page tujuan. |
| Reservasi kalah | Cari fakta lain. |
| Reservasi kedaluwarsa | Reservasi ulang setelah memeriksa status. |
| Sumber tidak cukup | Ganti atau teliti ulang fakta. |
| Jumlah fixed/adaptive tidak terpenuhi | Padatkan wording, ganti kandidat, atau minta persetujuan override. |
| Text budget terlewati | Tulis ulang lebih ringkas atau kurangi jumlah sesuai rule; jangan memotong klaim. |
| Revision conflict | Ambil post terbaru sebelum merevisi. |
| Slot jadwal bentrok | Tawarkan waktu lain. |
| Content plan terputus | Simpan progress dan lanjutkan hanya item yang belum selesai. |
| Input tidak valid | Jelaskan field yang perlu diperbaiki. |
| Database tidak tersedia | Jangan mengarang keberhasilan; minta pengguna mencoba kembali. |

Jika proses gagal setelah reservasi tetapi sebelum post berhasil disimpan, sistem harus melepaskan reservasi atau membiarkannya kedaluwarsa secara aman.

---

## 29. Environment dan deployment

### 29.1 Local development

Digunakan untuk:

- Mengembangkan MCP server.
- Menjalankan migration.
- Menguji database function.
- Menjalankan MCP Inspector.
- Menjalankan unit dan integration tests.

Data lokal adalah data uji dan boleh dihapus.

### 29.2 Production

Menggunakan satu Supabase project yang menyediakan:

- Postgres database.
- Edge Function MCP.
- Secret storage.
- Logs.
- URL HTTPS stabil.

URL MCP produksi mengikuti bentuk:

```text
https://<project-ref>.supabase.co/functions/v1/mcp
```

URL tersebut didaftarkan melalui menu ChatGPT Plugins → Create custom MCP server.

### 29.3 Staging

Hosted staging project tidak wajib pada MVP. Staging dapat ditambahkan ketika perubahan menjadi lebih sering, pengguna bertambah, atau risiko deployment meningkat.

### 29.4 Vercel

Vercel tidak digunakan pada MVP. Vercel atau hosting lain baru dipertimbangkan jika produk kelak membutuhkan dashboard, consent page OAuth, atau web application terpisah.

---

## 30. Ukuran keberhasilan

### 30.1 Kualitas data

| Ukuran | Target |
|---|---:|
| Pelanggaran `workspace_unique` atau `page_unique` pada saat fakta disimpan | 0 |
| Post `ready` tanpa sumber | 0 |
| Fakta yang dipakai tanpa melewati pemeriksaan duplikasi | 0 |
| Collision reservasi yang menghasilkan pelanggaran kebijakan reuse | 0 |
| Edit lama yang menimpa edit baru secara diam-diam | 0 |
| Akses workspace tanpa identitas owner yang valid | 0 |
| Relasi post trivia dengan fact ID yang tidak valid | 0 |
| Plan item selesai tanpa post yang sesuai | 0 |

### 30.2 Kualitas output

| Ukuran | Target |
|---|---:|
| Post `ready` yang lulus quality gate | 100% |
| Canva copy yang masih berisi URL/ID/JSON | 0 |
| Post `ready` yang melebihi text budget snapshot | 0 |
| Post dengan bahasa selain standar Page tanpa permintaan | 0 |
| Caption yang menambahkan fakta tidak terverifikasi | 0 |

### 30.3 Manfaat operasional

MVP dianggap bermanfaat jika pengguna dapat:

- Membuat satu post sampai siap salin dalam satu alur percakapan.
- Membuat kalender tujuh hari tanpa mengatur data secara manual di Supabase.
- Menggunakan beberapa chat tanpa mengecek fakta satu per satu antar-chat.
- Melanjutkan batch yang terputus dari checkpoint tanpa membuat ulang item selesai.
- Menemukan kembali post berdasarkan Page, status, atau tanggal.
- Menyalin Canva copy, caption, dan hashtag tanpa formatting ulang wajib.
- Mencatat performa post dan meminta ringkasan pola terbaik tanpa membuka database.

Views, reach, dan engagement tidak menjadi acceptance metric karena dipengaruhi algoritma Facebook, umur Page, desain, waktu publikasi, dan faktor lain di luar sistem.

---

## 31. Syarat penerimaan MVP

### AC-001 — Koneksi plugin

- ChatGPT dapat terhubung ke URL MCP Supabase.
- Pengguna menyelesaikan Supabase Auth OAuth 2.1 dan teridentifikasi sebagai owner.
- `health_check` berhasil.
- Daftar tool dapat dibaca tanpa error.
- Server menggunakan Streamable HTTP.
- Request tanpa token valid atau dari pengguna non-owner ditolak.

### AC-002 — Multi-Page

- Minimal tiga Page dapat dibuat.
- Masing-masing Page memiliki konfigurasi berbeda.
- Masing-masing Page dapat memilih `fixed` 5–9 atau `adaptive` dengan min/preferred/max.
- Default Page baru menggunakan `adaptive` 5/7/9 dan text budget baseline MVP.
- Masing-masing Page dapat memilih `workspace_unique` atau `page_unique`, dengan default `workspace_unique`.
- Post selalu tersimpan pada Page yang benar.
- Konfigurasi umum Page terpisah dari konfigurasi trivia pada `page_niche_configs`.
- Hanya niche aktif yang dapat digunakan; MVP mengaktifkan `trivia`.

### AC-003 — Satu post siap produksi

- Pengguna dapat meminta satu post melalui bahasa natural.
- Post memiliki 5–9 fakta, kecuali pengguna menyetujui jumlah lebih sedikit karena kualitas.
- Mode adaptive menghasilkan jumlah berdasarkan kualitas dan text budget, bukan random murni.
- Canva copy tidak melewati component budget atau total budget Page.
- Semua fakta memiliki sumber.
- Semua fakta terhubung melalui `trivia_post_facts` dengan urutan dan snapshot verifikasi.
- `niche_key`, `format_key`, dan content schema version tersimpan.
- Output memiliki Canva copy, caption, dan hashtag terpisah.
- Post tersimpan sebagai `draft` dan dapat diubah menjadi `ready`.

### AC-004 — Duplikasi exact dan parafrasa

- Insert row exact duplicate ditolak; row canonical yang sudah ada hanya dapat dipakai kembali jika rule Page mengizinkan.
- Parafrasa dengan inti klaim sama dikembalikan sebagai kandidat serupa.
- ChatGPT dapat memilih untuk menggantinya.
- Jika Page B sebagai Page tujuan memakai `workspace_unique`, fakta yang sudah digunakan Page A tidak dapat digunakan Page B.
- Pada `page_unique`, fakta dari Page A dapat digunakan Page B tetapi tidak dapat digunakan dua kali pada Page B.

### AC-005 — Parallel reservation

- Minimal 10 request mencoba mereservasi kandidat yang sama secara bersamaan.
- Hanya satu request yang berhasil memiliki fakta tersebut.
- Request lain menerima conflict yang dapat ditindaklanjuti.

### AC-006 — Revisi aman

- Revisi wording mempertahankan arti fakta.
- Penggantian fakta melewati deduplikasi dan reservasi baru.
- Revisi dengan revision number lama ditolak.
- Edit terbaru tidak tertimpa.

### AC-007 — Batch

- Pengguna dapat meminta minimal tujuh post.
- `content_plan` dan seluruh plan item dibuat sebelum proses generasi dimulai.
- Setiap post diproses melalui alur single-post.
- Post yang berhasil tetap tersimpan jika item lain gagal.
- Batch yang terputus dapat dilanjutkan hanya dari item yang belum selesai.
- Ringkasan hasil ditampilkan dengan jelas.

### AC-008 — Kalender

- Pengguna dapat membuat rencana tujuh hari.
- Setiap post memiliki `scheduled_at` yang benar.
- Tidak ada dua post pada Page dan slot yang sama.
- Setiap slot tersimpan sebagai `content_plan_item`, termasuk slot yang belum memiliki post.
- Kalender dapat diambil sebagai daftar terurut beserta progress plan.

### AC-009 — Lifecycle manual

- Jalur publikasi normal mengikuti `draft → ready → posted → archived`.
- Post `draft` atau `ready` dapat menjadi `discarded` hanya melalui tindakan eksplisit.
- `discarded` melepaskan alokasi fakta yang belum dipublikasikan; `archived` tidak melepaskan penggunaan fakta.
- Status `posted` hanya diberikan setelah perintah pengguna.
- Post `posted`, `discarded`, dan `archived` tidak dapat direvisi pada MVP.
- Sistem tidak mencoba mengunggah ke Facebook.

### AC-010 — Bahasa dan format

- American spelling konsisten.
- Bahasa mudah dipahami audiens US, UK, CA, AU, dan global.
- Tidak ada slang regional yang membingungkan.
- Canva copy dapat langsung disalin.

### AC-011 — Tanpa layanan AI tambahan

- Tidak ada OpenAI API key dalam aplikasi.
- Tidak ada request ke OpenAI Platform API.
- Tidak ada embeddings atau vector database.
- Seluruh penalaran dan penulisan dilakukan oleh ChatGPT yang sedang digunakan pengguna.

### AC-012 — Hosting sederhana

- MCP berjalan di Supabase Edge Functions.
- Tidak ada deployment Vercel.
- Tidak ada dashboard web khusus; autentikasi menggunakan alur OAuth yang didukung MCP/Supabase.

### AC-013 — Feedback performa

- Pengguna dapat menyimpan Facebook post ID atau URL setelah publikasi.
- Pengguna dapat memasukkan minimal views, comments, dan shares melalui chat.
- Metrik tersimpan sebagai snapshot bertanggal dan tidak menimpa snapshot lama.
- Sistem dapat merangkum performa berdasarkan Page, topik, format, dan interaction goal tanpa menjanjikan hasil viral.

### AC-014 — Fondasi multi-niche

- Registry niche dan konfigurasi Page+niche tersedia.
- Core post, plan, lifecycle, dan metrics tidak bergantung pada struktur trivia.
- Trivia memiliki `trivia_facts` dan `trivia_post_facts` sendiri.
- Menambahkan modul niche baru tidak memerlukan perubahan arti data trivia yang sudah ada.

---

## 32. Pengujian wajib

### 32.1 Database tests

Daftar berikut menetapkan cakupan produk. Kasus database yang rinci dan menjadi acuan implementasi terdapat pada bagian pengujian di `plans/database-design.md`.

- Exact duplicate constraint.
- Structured key duplicate.
- Atomic reservation.
- Reservation expiry dan release.
- Fact-to-post consistency.
- Foreign key dan urutan pada `trivia_post_facts`.
- Valid status transitions.
- Release alokasi saat `discarded` dan retensi penggunaan saat `archived`.
- Schedule uniqueness.
- Content plan progress dan resume.
- Ownership dan RLS policy.
- Multiple metric snapshots.
- Revision conflict.
- Validasi konfigurasi `fixed` dan `adaptive`.
- Validasi component budget dan total budget.

### 32.2 MCP contract tests

- Tool discovery.
- Authentication dan authorization failure.
- Input schema valid dan tidak valid.
- Structured output.
- Tool annotations.
- Safe error response.
- Payload size limit.
- Tidak ada secret pada response.

### 32.3 Workflow tests

- Membuat Page.
- Memilih niche default dan menangani niche ambigu/nonaktif.
- Membuat satu post.
- Mengganti satu fakta.
- Menyetujui post.
- Membuat batch.
- Membuat kalender.
- Menghentikan dan melanjutkan content plan dari chat lain.
- Memindahkan jadwal.
- Membuang draft sebagai `discarded`.
- Menandai post sebagai `posted`.
- Mencatat metrik dan meminta insight.
- Mengambil post dari chat lain.

### 32.4 Content evaluation

Evaluation set harus mencakup:

- Lima format trivia: single-subject fast, themed utility, emotional animal collection, comparison, dan myth-vs-fact.
- Profil fast trivia dan practical utility.
- Seluruh topik allowlist.
- Fakta exact duplicate.
- Fakta parafrasa.
- Fakta dengan angka atau satuan berbeda.
- Klaim lemah atau sumber tidak cukup.
- Fakta time-sensitive.
- Topik sensitif.
- Permintaan dengan Page ambigu.
- Konten Australia yang tetap dapat dipahami audiens global.
- Kalimat yang benar secara fakta tetapi terlalu panjang untuk Canva.
- Lima fakta panjang yang memerlukan pemadatan atau pengecualian.
- Sembilan fakta pendek yang masih muat dalam seluruh text budget.
- Fakta individual lulus batas tetapi gabungan blok fakta melebihi budget.

### 32.5 Parallel tests

- Sepuluh reservasi fakta bersamaan.
- Dua revisi pada post yang sama.
- Dua request untuk slot Page yang sama.
- Release yang dikirim ulang.

---

## 33. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi MVP |
|---|---|---|
| AI membuat fakta palsu | Konten tidak akurat | Source requirement, manual review, quality gate |
| Fakta sama ditulis ulang | Konten berulang | Hash, structured key, FTS, trigram, review semantik ChatGPT |
| Dua chat mengambil fakta sama pada saat bersamaan | Penggunaan melanggar rule Page | Atomic reservation, row lock, dan pemeriksaan riwayat penggunaan |
| Token tidak valid atau akses lintas-owner | Penyalahgunaan tool/data | OAuth 2.1, authorization server-side, ownership check, RLS, rate limit |
| ChatGPT Plus mencapai usage limit | Produksi tertunda | Batch kecil, lanjutkan dari data tersimpan, tidak menjanjikan background processing |
| Supabase tidak tersedia | Tool gagal | Error jujur, retry manual, jangan mengarang keberhasilan |
| Sumber berubah atau hilang | Sulit memverifikasi ulang | Simpan metadata sumber dan tanggal akses |
| Teks terlalu panjang | Sulit dibaca pada Reel 13 detik | Adaptive fact count, component budget, total Canva budget, quality gate |
| Page terdengar identik | Brand differentiation lemah | Konfigurasi Page dan campuran topik terpisah |
| Schema terlalu trivia-specific | Sulit menambah niche | Generic pages/posts core dan tabel niche terpisah |
| Batch terputus | Slot hilang atau dibuat dua kali | Content plan, plan items, idempotency, dan chunk 3–5 item |
| Draft yang dibuang membakar fakta | Library cepat habis | Status `discarded` dan release alokasi niche |
| Metrik dibaca sebagai jaminan sebab-akibat | Keputusan editorial menyesatkan | Simpan snapshot, tampilkan konteks sampel, dan larang klaim jaminan viral |
| Scope bertambah sebelum MVP stabil | Proyek menjadi kompleks | Enforce non-goals dan acceptance criteria |

---

## 34. Ketergantungan

MVP bergantung pada:

- Akun ChatGPT Plus yang memiliki menu Plugins dan Create custom MCP server.
- Private GitHub repository.
- Supabase project.
- Supabase CLI dan local development tools.
- Kemampuan ChatGPT untuk menggunakan custom MCP tools.
- Kemampuan penelitian/browsing ChatGPT yang tersedia saat produksi fakta.
- Canva untuk desain manual.
- Facebook untuk publikasi manual.

Perubahan fitur atau limit pada ChatGPT Plus dan Supabase berada di luar kendali produk dan perlu diperiksa kembali saat implementasi.

---

## 35. Pengembangan setelah MVP

Urutan ekspansi yang disarankan setelah MVP stabil:

1. Hosted staging environment.
2. Analytics dan rekomendasi performa yang lebih matang.
3. Modul niche quotes.
4. Modul niche psychology.
5. Modul niche motivation.
6. Pengguna dan role tambahan.
7. Dashboard web.
8. Canva integration.
9. Facebook publishing dan analytics integration.
10. Background automation jika benar-benar diperlukan.

Setiap niche baru harus mendefinisikan:

- Configuration schema dan default Page.
- Versioned content payload schema.
- Format, generation instructions, dan rendering profile.
- Bentuk reusable source item bila diperlukan.
- Aturan keunikan, deduplikasi, reservasi, dan release bila diperlukan.
- System checks dan editorial checks.
- Kebijakan sumber atau atribusi.
- Performance dimensions dan evaluation fixtures.

Niche baru tidak boleh dipaksakan menggunakan `trivia_facts` jika model datanya berbeda.

---

## 36. Definition of Done MVP

MVP dinyatakan selesai apabila:

1. Semua acceptance criteria lulus.
2. Database dapat dibuat dari migration pada environment kosong.
3. MCP dapat dideploy ke Supabase Edge Functions.
4. Custom MCP plugin dapat dibuat dan digunakan di ChatGPT.
5. Seluruh tool utama lulus contract test.
6. Parallel reservation dan revision conflict lulus pengujian.
7. Pengguna dapat membuat Page, post, batch, kalender, dan melanjutkan content plan melalui chat.
8. Output siap disalin ke Canva dan Facebook.
9. Pemakaian fakta selalu mengikuti `workspace_unique` atau `page_unique` milik Page tujuan.
10. Tidak ada OpenAI API, embeddings, Vercel, dashboard, atau auto-posting dalam runtime MVP.
11. OAuth, ownership check, RLS, dan Data API exposure telah diverifikasi.
12. Pengguna dapat mencatat performa dan mengambil insight dasar melalui chat.
13. Dokumentasi database, workflow, module contract, trivia DNA, dan implementation plan sudah selaras dengan PRD ini.

---

## 37. Referensi teknis

- [OpenAI — Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
- [OpenAI — Add custom MCP server](https://developers.openai.com/api/docs/guides/custom-mcp-server)
- [Supabase — Deploy MCP servers](https://supabase.com/docs/guides/ai-tools/byo-mcp)
- [Supabase — Edge Functions](https://supabase.com/docs/guides/functions)

Referensi teknis digunakan untuk memastikan rancangan dapat diimplementasikan. Jika dokumentasi platform berubah, implementation plan harus diperbarui tanpa mengubah tujuan produk kecuali perubahan tersebut memengaruhi scope atau pengalaman pengguna.
