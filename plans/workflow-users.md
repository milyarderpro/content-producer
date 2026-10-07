# Panduan Workflow Pengguna — Content Producer MVP

Dokumen ini adalah panduan operasional singkat. Aturan produk mengacu pada `plans/PRD.md`, sedangkan detail penyimpanan dan transaksi mengacu pada `plans/database-design.md`. MVP hanya memproduksi niche trivia, tetapi workflow core dirancang agar niche lain dapat ditambahkan tanpa mengubah cara kerja dasar pengguna.

## Workflow produksi satu post

1. **Hubungkan plugin sebagai owner**

   Saat koneksi pertama atau sesi autentikasi berakhir, selesaikan Supabase Auth OAuth 2.1. Plugin hanya boleh membaca atau mengubah workspace milik owner yang terautentikasi.

2. **Berikan permintaan dalam bahasa natural**

   Contoh:

   > Buatkan satu post trivia untuk Page Curious World tentang animals.

   Setiap operasi harus memiliki Page dan niche yang jelas. Pada MVP, niche aktif adalah `trivia`. Jika kelak satu Page memiliki beberapa niche aktif, plugin memakai default yang tidak ambigu atau meminta Anda memilih.

3. **Sistem membaca konteks Page dan niche**

   Plugin mengambil:

   - Identitas Page, zona waktu, dan target market.
   - Konfigurasi trivia Page.
   - Topik dan format yang diizinkan.
   - Mode jumlah fakta dan text budget.
   - Kebijakan reuse fakta.
   - Subjek, hook, CTA, dan format yang baru digunakan.
   - Insight performa yang sudah tersedia.

4. **ChatGPT meneliti kandidat fakta**

   ChatGPT mencari sumber publik yang layak dan menyeleksi fakta yang menarik, mudah dipahami, aman, serta cocok untuk format Reel sekitar 13 detik. Dataset referensi hanya digunakan untuk mempelajari DNA konten, bukan sebagai sumber kebenaran.

5. **Plugin memeriksa duplikasi dan mereservasi fakta**

   Pemeriksaan mencakup exact match, parafrasa, structured fact key, kemiripan teks, riwayat penggunaan, dan reservasi proses lain. Kandidat final dibuat atau dihubungkan ke row canonical, lalu direservasi secara atomic.

   - `workspace_unique`: fakta yang pernah dipakai Page mana pun tidak dapat digunakan.
   - `page_unique`: fakta boleh pernah dipakai Page lain, tetapi tidak boleh pernah dipakai Page tujuan.

6. **ChatGPT menyusun post**

   Hasil menggunakan natural American English yang tetap mudah dipahami audiens US, UK, CA, AU, dan global. Sistem memilih format trivia, profil panjang, render style, dan interaction goal yang sesuai.

   Default render style adalah fakta per baris tanpa nomor. Numbering digunakan hanya ketika urutan atau checklist memang membantu.

7. **Quality gate dijalankan**

   Pemeriksaan sistem memastikan referensi data, reservasi, reuse rule, jadwal, schema version, revision, dan text budget valid. Pemeriksaan editorial menilai dukungan sumber, keamanan, kejelasan, bahasa, hook, CTA, caption, keterbacaan, dan risiko menyalin referensi.

8. **Draft disimpan dan ditampilkan**

   Post disimpan sebagai `draft` sebelum hasil dinyatakan berhasil. Fakta dihubungkan melalui `trivia_post_facts` dengan urutan, wording final, dan snapshot verifikasi.

   Hasil ditampilkan dalam bagian terpisah:

   **CANVA COPY**

   - Hook.
   - Fakta dalam urutan final.
   - CTA.

   **FACEBOOK CAPTION**

   Caption siap salin yang tidak menambahkan klaim baru.

   **HASHTAGS**

   Hashtag yang relevan.

   **INFORMASI INTERNAL**

   - Post ID, Page, niche, format, status, dan jadwal.
   - Interaction goal.
   - Sumber fakta.
   - Ringkasan system checks dan editorial checks.

   Informasi internal tidak disalin ke Canva atau Facebook.

9. **Tinjau, revisi, setujui, atau buang**

   Contoh revisi:

   - “Ganti fakta nomor 3.”
   - “Buat hook lebih kuat.”
   - “Buat CTA untuk mendorong share.”
   - “Caption terlalu panjang.”

   Penggantian fakta selalu melewati deduplikasi dan reservasi ulang. Revisi post `ready` mengembalikannya ke `draft` untuk diperiksa lagi.

   Untuk menyetujui:

   > Setujui post ini.

   Setelah semua pemeriksaan lolos dan persetujuan diberikan, status berubah menjadi `ready`.

   Jika post tidak akan digunakan:

   > Buang draft ini.

   Status berubah menjadi `discarded` dan alokasi fakta yang belum pernah dipublikasikan dilepas. `Discarded` tidak sama dengan `archived`.

10. **Publikasikan secara manual**

    - Salin Canva copy ke template.
    - Tambahkan background bergerak.
    - Ekspor sebagai Reel sekitar 13 detik.
    - Upload atau jadwalkan di Facebook.
    - Salin caption dan hashtag.

11. **Tandai sebagai posted**

    Setelah benar-benar terbit:

    > Tandai post ABC123 sudah diposting. URL-nya adalah …

    Sistem mengubah status menjadi `posted` dan menyimpan `published_at`, Facebook post ID, atau URL jika diberikan. Fakta pada post tersebut dianggap telah digunakan secara permanen sesuai reuse rule.

12. **Catat performa ketika tersedia**

    Contoh:

    > Update performa post ABC123: 1.8M views, 23K shares, 8K comments, dicatat hari ini.

    Sistem menyimpan snapshot baru tanpa menimpa snapshot lama. Data ini digunakan untuk menemukan pola topik, format, hook, CTA, panjang, dan interaction goal yang paling efektif pada Page tersebut. Sistem tidak menjanjikan performa viral atau menganggap korelasi sebagai sebab-akibat.

## Workflow batch dan kalender

Contoh:

> Buat kalender 14 post trivia untuk Page Curious World, satu post per hari mulai 10 Oktober, dengan tema campuran.

Sistem akan:

1. Membuat satu `content_plan` untuk Page dan niche tersebut.
2. Membuat satu `content_plan_item` untuk setiap tanggal atau slot yang diminta.
3. Memproses item dalam chunk kecil, dengan default 3–5 post per putaran aktif.
4. Menjalankan workflow single-post untuk setiap item.
5. Menyimpan setiap post segera setelah berhasil.
6. Mempertahankan post yang sudah berhasil jika item lain gagal.
7. Menampilkan jumlah selesai, perlu revisi, belum diproses, dan gagal.

Tidak ada AI worker atau proses generasi di background. Jika chat berhenti sebelum 14 post selesai, plan tetap menyimpan intent dan progress.

Untuk melanjutkan:

> Lanjutkan content plan kalender Curious World yang belum selesai.

Sistem hanya mengerjakan item yang belum selesai dan tidak membuat ulang post yang sudah tersimpan.

Kalender yang dilihat pengguna tetap berupa daftar post berdasarkan tanggal. `content_plans` dan `content_plan_items` berfungsi sebagai checkpoint, bukan scheduler Facebook.

## Workflow beberapa chat

Beberapa chat dapat digunakan secara paralel, misalnya:

- Chat 1 membuat post Page A.
- Chat 2 melanjutkan content plan Page B.
- Chat 3 merevisi post Page C.

Semua chat memakai Supabase sebagai system of record. Database menangani:

- Reservasi fakta atomic.
- Reuse rule Page tujuan.
- Optimistic revision conflict.
- Keunikan slot jadwal.
- Idempotency operasi penting.
- Progress content plan.

Jika dua chat mencoba memakai fakta yang sama atau mengubah post yang sama, salah satunya menerima conflict yang dapat ditindaklanjuti; sistem tidak menimpa data secara diam-diam.

## Status post

Jalur publikasi:

```text
draft → ready → posted → archived
```

Jalur pembatalan sebelum publikasi:

```text
draft → discarded
ready → discarded
```

- `draft`: masih dapat direvisi.
- `ready`: sudah disetujui dan siap dipublikasikan.
- `posted`: sudah benar-benar dipublikasikan.
- `discarded`: dibatalkan sebelum publikasi; alokasi item niche dilepas.
- `archived`: post yang pernah dipublikasikan dikeluarkan dari workflow aktif; penggunaan item niche tetap tercatat.

Post `posted`, `discarded`, atau `archived` tidak direvisi pada MVP. Jika diperlukan versi baru, sistem membuat post baru.

## Perintah operasional yang umum

- “Buatkan satu post trivia animals untuk Page A.”
- “Buat 5 post trivia dengan format yang bervariasi.”
- “Lanjutkan content plan yang belum selesai.”
- “Tampilkan draft Page A minggu ini.”
- “Ganti fakta nomor 4 pada post ABC123.”
- “Setujui post ABC123.”
- “Buang draft ABC123.”
- “Pindahkan jadwal post ABC123 ke Jumat pukul 19.00.”
- “Tandai ABC123 sudah diposting dan simpan URL ini.”
- “Catat performa ABC123: …”
- “Format trivia apa yang paling banyak menghasilkan share di Page A?”

## Yang tidak dilakukan MVP

- Tidak membuat desain atau video.
- Tidak mengunggah atau menjadwalkan post melalui Facebook API.
- Tidak mengambil analytics Facebook secara otomatis.
- Tidak menjalankan generasi AI di background.
- Tidak memakai OpenAI API atau embeddings.
- Tidak mengaktifkan niche selain trivia.

Alur rutin akhirnya adalah:

**Berikan perintah → tinjau draft → revisi atau setujui → salin ke Canva/Facebook → tandai `posted` → catat performa.**
