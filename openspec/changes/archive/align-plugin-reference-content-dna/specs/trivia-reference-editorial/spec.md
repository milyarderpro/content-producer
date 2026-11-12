# Spec Delta

## Purpose

Menetapkan perilaku editorial plugin agar Canva copy trivia mengikuti pola perhatian Curious Mind, DYK, dan Daily Facts, memakai American English nonakademik, serta selesai disunting sebelum disimpan.

## ADDED Requirements

### Requirement: TRE-01 Angle mengikuti DNA referensi dan audiens

Plugin SHALL memilih angle yang langsung dikenali audiens US, UK, CA, dan AU serta menawarkan kejutan kredibel, emosi, atau kegunaan konkret. Kategori topik saja MUST NOT dianggap angle. Pilihan MUST mengikuti permintaan, config, dan ragam referensi tanpa menyalin satu post lengkap atau menganggap dataset sebagai bukti fakta.

#### Scenario: Permintaan umum tanpa tema
- **WHEN** pemilik meminta draft baru tanpa menentukan subjek
- **THEN** plugin memilih angle familiar dari topik yang diizinkan dan mempertimbangkan recent variety; pilihan tidak otomatis mengulang hewan, antariksa, atau pengingat keselamatan

#### Scenario: Tema tubuh atau sejarah diberikan
- **WHEN** pemilik menentukan tema yang diizinkan tetapi tidak termasuk pola paling sering dipakai sebelumnya
- **THEN** plugin mempertahankan tema dan mencari sifat, konsekuensi, atau asal-usul yang mengejutkan alih-alih menggantinya ke tema yang lebih mudah

### Requirement: TRE-02 Contoh lengkap mengarahkan penulisan

Plugin SHALL menyediakan contoh Canva copy lengkap dan beranotasi untuk variasi tiga akun, pasangan contoh lemah/perbaikan, serta alasan pemilihan dan urutan fakta. Sebelum menulis, plugin MUST menggunakan contoh pola yang relevan. Contoh MUST membedakan bukti pola dari verifikasi fakta dan MUST NOT dijadikan teks produksi yang tinggal disalin.

#### Scenario: Penulis memilih utility
- **WHEN** plugin menyiapkan post penyimpanan makanan
- **THEN** plugin merujuk contoh utility lengkap dan contoh lemah yang relevan, bukan hanya deskripsi abstrak format, serta memverifikasi klaim final secara independen

#### Scenario: Klaim referensi belum terbukti
- **WHEN** contoh sumber viral mengandung klaim yang belum terverifikasi atau berlebihan
- **THEN** anotasi menandainya sebagai kelemahan referensi dan contoh positif tidak mempertahankan klaim itu sebagai fakta siap pakai

### Requirement: TRE-03 Set fakta memiliki variasi nilai pembaca

Plugin SHALL memilih fakta mandiri yang masing-masing menambah sudut, kejutan, atau kegunaan. Set final MUST menghindari deretan spesifikasi sejenis, fakta dasar pengisi, dan pengulangan reaksi meskipun proposisinya berbeda. Jenis fakta MUST mengikuti subjek dan format, tanpa resep wajib angka/emosi/sejarah pada setiap post.

#### Scenario: Comparison hanya mengganti angka
- **WHEN** calon post berisi lima baris diameter dengan struktur yang sama tanpa hubungan yang mudah dibayangkan
- **THEN** plugin menyusun kembali angle dan komposisinya sebelum save, atau memakai daftar spesifikasi hanya jika itu permintaan eksplisit pemilik

#### Scenario: Perawatan anak berulang
- **WHEN** dua fakta hewan mengulang bantuan merawat anak dengan aktor berbeda dan tidak memberi nilai baru yang cukup
- **THEN** plugin mempertahankan fakta yang lebih kuat dan meriset pengganti yang menambah sudut berbeda

### Requirement: TRE-04 Urutan mengikuti daya tarik

Plugin SHALL membuka dengan fakta kuat yang mandiri dan mudah dipahami, memvariasikan sudut di tengah, serta menutup dengan fakta berbeda yang mudah diingat. Urutan sumber atau pola definisi–anatomi–fungsi MUST NOT menjadi urutan otomatis. Judul dan CTA MUST sesuai dengan kekuatan isi.

#### Scenario: Pembukaan terlalu umum
- **WHEN** post berjudul kemampuan luar biasa dibuka dengan makanan utama hewan yang sudah lazim diketahui
- **THEN** plugin mengganti atau memindahkan pembukaan dan meninjau janji judul tanpa menambahkan kata sensasional sebagai pengganti kualitas fakta

#### Scenario: Prosedur memang memerlukan urutan
- **WHEN** pemilik meminta langkah aman yang saling bergantung
- **THEN** plugin mempertahankan urutan prosedural yang benar dan tidak mengacak langkah demi efek kejutan

### Requirement: TRE-05 Bahasa publik natural dan nonakademik

Canva copy SHALL memakai American English yang ringkas, konkret, aktif, dan nyaman bagi pembaca umum empat market. Plugin MUST membuang filler, atribusi riset yang tidak perlu, istilah teknis yang tidak menambah nilai, dan pola kalimat mekanis. Penyederhanaan MUST mempertahankan negasi, jumlah, kondisi, scope, serta ketidakpastian yang material.

#### Scenario: Istilah teknis menutupi reveal
- **WHEN** kalimat mengutamakan nama molekul atau istilah anatomi yang tidak diperlukan untuk memahami kejutannya
- **THEN** plugin menonjolkan hasil atau sifat yang mudah dibayangkan dengan makna yang sama dan menyimpan detail sumber di informasi internal

#### Scenario: Kalimat menjadi pendek dengan menghapus qualifier
- **WHEN** penyingkatan mengubah kemampuan beberapa hewan terlatih menjadi kemampuan semua hewan
- **THEN** plugin mempertahankan qualifier atau memilih fakta lain; copy tidak dinyatakan selesai karena terdengar lebih menarik

### Requirement: TRE-06 Hook dan kepadatan mengikuti referensi

Plugin SHALL memakai `Did you know?` sebagai hook default, fakta plain lines terpisah blank line, dan satu CTA pendek sesuai tujuan. Fast trivia memilih 7–8 fakta dan utility 5–6 saat config dan instruksi mengizinkan. Preferensi panjang MUST NOT menjadi minimum kata yang memicu padding, dan semua budget Page MUST dipenuhi.

#### Scenario: Lima draft diminta
- **WHEN** pemilik meminta lima draft tanpa menentukan jumlah fakta
- **THEN** plugin membuat lima item dengan jumlah fakta sesuai profil dan config, tanpa menambahkan override `fixed: 5` hanya karena jumlah draft lima

#### Scenario: Fixed count atau judul eksplisit
- **WHEN** instruksi atau item plan secara sah menetapkan lima fakta atau judul tertentu
- **THEN** plugin mengikuti instruksi tersebut sambil mempertahankan kualitas pemilihan fakta; pengecualian tidak dipakai sebagai default batch berikutnya

### Requirement: TRE-07 Comparison bervariasi dan myth correction natural

Comparison SHALL menjaga kesetaraan metrik dalam setiap pasangan, tetapi dapat membandingkan dimensi berbeda antarpoin. Myth correction SHALL langsung mengoreksi miskonsepsi tanpa kewajiban label `Myth:`/`Fact:` berulang. Plugin MUST memakai lima format yang diizinkan dan MUST NOT memalsukan pemetaan format untuk mengejar kemiripan contoh.

#### Scenario: Pasangan biasa mengorbankan daya tarik
- **WHEN** post membandingkan fitur kota tetapi pasangan hanya menunjukkan fasilitas biasa yang berbeda
- **THEN** plugin MUST memilih kontras yang menarik, memvariasikan ritme, dan MAY membangunnya lintas baris atau terhadap baseline yang jelas; plugin MUST NOT memaksa dua kota dalam setiap baris atau menganggap format sah menggantikan kurasi

#### Scenario: Dua spesies dibandingkan
- **WHEN** post membandingkan gajah Afrika dan Asia
- **THEN** baris dapat membandingkan telinga, bentuk kepala, gading, dan ukuran dengan pasangan setara, bukan diwajibkan membandingkan tinggi pada semua baris

#### Scenario: General trivia tidak memiliki pemetaan sah
- **WHEN** pola referensi campuran tidak dapat diwakili format dan config yang aktif tanpa mengubah maknanya
- **THEN** plugin memilih angle yang masih memenuhi permintaan dan format, atau menjelaskan keterbatasan; plugin tidak menambah format backend atau mengganti config diam-diam

### Requirement: TRE-08 Review DNA dilakukan sebelum write

Plugin MUST menilai dan memperbaiki angle, komposisi, pembuka/penutup, naturalness, serta kecocokan contoh sebelum mengirim save/revise. Copy yang masih berupa buku pelajaran, filler, atau daftar spesifikasi generik MUST direvisi atau diganti faktanya dalam scope izin. Kekurangan calon MUST dilaporkan tanpa menyimpan pengisi atau menambah checkpoint GO.

#### Scenario: Akurat tetapi tidak sesuai DNA
- **WHEN** semua fakta didukung dan tiga pemeriksaan v2 dapat pass tetapi copy masih mekanis
- **THEN** plugin memperbaiki copy atau seleksi sebelum Write; plugin tidak mengirimnya hanya karena server diperkirakan menerima

#### Scenario: Upaya wajar belum menghasilkan set yang layak
- **WHEN** penggantian dan riset tambahan dalam scope permintaan belum cukup untuk memenuhi jumlah serta kualitas
- **THEN** plugin melaporkan keterbatasan dan progres yang terbukti tanpa mengurangi jumlah secara diam-diam atau mengarang fakta

### Requirement: TRE-09 DNA dan kualitas server memiliki bukti terpisah

Plugin SHALL mempertahankan arti tiga hasil editorial v2 dan `quality_status`, tanpa field atau error baru untuk skor DNA. Klaim kesesuaian draft tersimpan MUST mengacu pada Canva copy readback yang sama dengan copy yang dinilai. Preview, pemeriksaan paket, dan penilaian semantik MUST dibedakan dari hasil LIVE.

#### Scenario: Preview bagus tetapi payload berbeda
- **WHEN** copy di chat memenuhi DNA tetapi payload atau hasil readback memuat versi formal yang berbeda
- **THEN** hasil tidak dianggap lulus DNA; plugin menunjukkan ketidaksesuaian dan merekonsiliasi post yang sama tanpa membuat draft pengganti atau write di luar izin

#### Scenario: Pemeriksaan otomatis lulus
- **WHEN** paket, tautan, inventory, dan fixture lulus
- **THEN** laporan menyatakan bukti CI/FIXTURE dan tidak menyatakan perilaku generasi atau draft live sudah diperbaiki

### Requirement: TRE-10 Paket menyertakan referensi yang digunakan

Paket yang dirilis SHALL menyertakan seluruh referensi editorial yang dirutekan dari skill, dengan tautan lokal valid dan identitas artefak yang dapat diverifikasi. Corpus evaluasi serta data audit pemilik MUST terpisah dari referensi runtime. Perubahan paket MUST mempertahankan identitas plugin dan koneksi owner yang sama.

#### Scenario: File hanya ada pada source
- **WHEN** referensi baru ditautkan dari skill tetapi tidak masuk paket hasil build
- **THEN** verifikasi kandidat gagal dan paket tidak dinyatakan siap dipasang

### Requirement: TRE-11 Evaluasi menilai tulisan dan hasil tersimpan

Penerimaan perubahan SHALL mencakup pembanding lama/baru pada prompt yang sama, review semantik per kasus, serta retest save/readback pada host dan objek yang diotorisasi. Setiap hasil MUST mencatat versi paket, status, dan tingkat bukti. Nilai kata kunci atau rata-rata skor MUST NOT menutupi kasus yang masih akademis atau menyesatkan.

#### Scenario: Satu kasus masih seperti buku pelajaran
- **WHEN** mayoritas kasus membaik tetapi satu naskah masih berisi daftar angka berulang atau filler
- **THEN** kasus itu tetap FAIL dan penerimaan editorial belum lengkap sampai diperbaiki serta diuji ulang

#### Scenario: Izin uji write belum ada
- **WHEN** preview dan pemeriksaan source sudah selesai tetapi izin objek/payload live belum diberikan
- **THEN** retest persisted-copy dicatat BLOCKED atau NOT RUN sesuai bukti, tanpa mengubah draft nyata atau mengklaim FIXED
