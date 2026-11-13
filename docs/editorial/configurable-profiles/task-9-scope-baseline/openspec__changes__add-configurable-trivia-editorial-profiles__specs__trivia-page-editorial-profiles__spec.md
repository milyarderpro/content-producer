# Spec Delta

## Purpose

Memungkinkan setiap Page memakai satu profil DNA referensi yang terikat versi, sehingga Curious Mind, DYK, Daily Facts, dan profil tambahan dapat diproduksi melalui backend, MCP, dan plugin yang sama tanpa mencampurkan identitas editorialnya.

## ADDED Requirements

### Requirement: TEP-01 Page memilih satu profil utama

Config Page versi 2 SHALL merujuk satu versi profil utama yang sah dalam workspace. Pemilihan atau pergantian profil MUST menjadi update Page eksplisit; permintaan draft biasa MUST NOT mengganti profil tersimpan atau mencampurkan preset secara otomatis.

#### Scenario: Tiga Page berbeda
- **WHEN** tiga Page memilih profil Curious Mind, DYK, dan Daily Facts
- **THEN** setiap generation context memuat profilnya sendiri dan plugin yang sama menulis berdasarkan profil Page sasaran

#### Scenario: Mengubah profil Page
- **WHEN** owner meminta profil baru untuk satu Page dengan CAS config yang sah
- **THEN** hanya Page tersebut berpindah dan Page lain serta post historis tetap utuh

#### Scenario: Page memakai campuran custom
- **WHEN** owner menerbitkan satu profil custom dengan panduan gabungan eksplisit dari DYK dan Daily Facts lalu memilih versi profil tersebut untuk satu Page
- **THEN** context dan penulis memakai satu definisi hasil gabungan yang tercatat provenance-nya, tanpa inheritance lintas profil, perubahan kode, atau perpindahan Page lain

### Requirement: TEP-02 Resolusi aturan membedakan preferensi dan batas

Generation context SHALL membedakan batas keras efektif dari preferensi editorial dan contoh. Preferensi panjang, komposisi surprise, urutan, dan bobot MUST NOT menjadi gate wajib baru; instruksi eksplisit tetap harus berada dalam pilihan serta batas Page dan mesin yang sah.

#### Scenario: Fakta medium tetap layak
- **WHEN** sebuah fakta akurat, relevan, dan memberi manfaat tetapi tidak dinilai high surprise
- **THEN** penulis dapat mempertahankannya berdasarkan profil tanpa menolak seluruh post karena tidak semua baris ekstrem

#### Scenario: Owner menentukan jumlah tertentu
- **WHEN** owner meminta sepuluh fakta dan profil serta batas Page mengizinkannya
- **THEN** penulis mengikuti sepuluh fakta tanpa mengurangi menjadi delapan hanya karena preferensi profil

#### Scenario: Override melampaui batas mesin
- **WHEN** override item atau config meminta budget di atas ceiling mesin
- **THEN** sistem menolak dengan lokasi batas yang gagal, bukan melakukan clipping diam-diam

### Requirement: TEP-03 Tiga preset mempertahankan bukti masing-masing

Seed SHALL menyediakan `curious_mind`, `dyk`, dan `daily_facts` dengan preferensi serta contoh yang diturunkan dari dataset masing-masing. Profil MUST membedakan pengamatan corpus dari rekomendasi penulis, menandai duplikasi/OCR, dan tidak menjanjikan sebab-akibat viral.

#### Scenario: Daily Facts dipilih
- **WHEN** Page memakai preset Daily Facts
- **THEN** preferensi mengutamakan sekitar enam fakta yang lebih menjelaskan, hook sentence case, tanpa emoji, serta CTA like dan follow yang sesuai karakter referensi

#### Scenario: DYK dipilih
- **WHEN** Page memakai preset DYK
- **THEN** preferensi mengenali tujuh–delapan fakta pendek, hook uppercase, variasi curiosity/emosi/manfaat, emoji CTA opsional, dan variasi bentuk koleksi

#### Scenario: Curious Mind dipilih
- **WHEN** Page memakai preset Curious Mind
- **THEN** preferensi mempertahankan fakta padat, subjek familiar, kumpulan single-subject/themed/mixed, dan variasi kapitalisasi hook yang tercatat tanpa menyalin kalimat rusak

### Requirement: TEP-04 Bahasa dan hook mengikuti profil

Penulis SHALL memakai American English yang natural untuk US, UK, CA, dan AU dengan panjang, ritme, kapitalisasi hook, dan tingkat penjelasan profil terpilih. Satuan ganda MUST NOT diwajibkan pada setiap fakta; konteks dan qualifier material MUST tetap dipertahankan.

#### Scenario: Dua profil menulis topik sama
- **WHEN** DYK dan Daily Facts membahas telur
- **THEN** keduanya dapat berbeda dalam panjang kalimat, penjelasan, hook, dan CTA meskipun memakai klaim terverifikasi yang sebanding

#### Scenario: Istilah teknis diperlukan
- **WHEN** istilah pendek diperlukan agar klaim tetap akurat
- **THEN** penulis mempertahankan atau menjelaskannya secara ringkas tanpa mengubahnya menjadi klaim lebih luas demi gaya

### Requirement: TEP-05 Kepadatan dapat mewakili rentang corpus

Config dan renderer profil SHALL mendukung sedikitnya rentang lima–sebelas fakta serta teks yang lebih panjang dari batas lama bila masih dalam ceiling baru. Median corpus MUST menjadi preferensi, bukan syarat seluruh post atau alasan mengecilkan font agar lolos.

#### Scenario: Sepuluh fakta DYK pendek
- **WHEN** config mengizinkan sepuluh fakta singkat yang masing-masing memenuhi budget
- **THEN** save, readback, revise, approval, dan publication record dapat menangani seluruh sepuluh posisi secara utuh

#### Scenario: Enam fakta Daily Facts lebih panjang
- **WHEN** enam fakta melampaui preferensi fast trivia lama tetapi memenuhi budget profil Daily Facts
- **THEN** sistem tidak menolak hanya karena target lama 65–85 kata atau 8–11 kata per fakta

### Requirement: TEP-06 CTA mengikuti profil tanpa pembatas tujuan

Pada config2 CTA SHALL mengikuti panduan DNA profil, dengan satu atau beberapa ajakan tanpa tujuan utama wajib, hierarki, batas jumlah aksi, atau allowlist kombinasi. Metadata aksi SHALL opsional, deskriptif, dan tanpa peringkat; `interaction_goal` MUST boleh absen/null pada Write dan readback tanpa pemaksaan klasifikasi. Budget, struktur, emoji policy, kehadiran CTA, dan kontrak config1 tetap berlaku.

#### Scenario: CTA Daily Facts gabungan
- **WHEN** CTA mengikuti pola like dan follow dalam satu kalimat serta memenuhi budget
- **THEN** copy sah tanpa memilih mana tujuan utama, mendaftarkan kombinasi, atau menghapus salah satu ajakan

#### Scenario: Pertanyaan dan like DYK
- **WHEN** CTA meminta pendapat pembaca lalu mengajak like sebagaimana pola POST-059/060
- **THEN** kedua ajakan dapat dipertahankan dan tidak dipaksa menjadi hanya comment atau hanya react

#### Scenario: Tidak ada batas dua atau tiga ajakan
- **WHEN** CTA sintetis memuat tiga atau lebih ajakan yang tetap memenuhi struktur, budget, dan kebijakan emoji
- **THEN** sistem tidak menolak karena jumlah tujuan atau kombinasi belum terdaftar; review penulis tetap menilai kewajaran terhadap profil

#### Scenario: Klasifikasi tidak tersedia
- **WHEN** CTA config2 sah tetapi label aksi tidak diberikan, wording baru/ambigu, atau tidak cocok dengan goal legacy
- **THEN** save/revise menerima `interaction_goal` absen/null dan label opsional, tanpa mengarang satu tujuan; get/list/lifecycle mengembalikan state utuh

#### Scenario: Anotasi goal tidak membatasi CTA
- **WHEN** post config2 mengisi goal legacy demi kompatibilitas tetapi CTA juga mempunyai ajakan lain
- **THEN** anotasi tidak menjadi primary goal atau pembatas ajakan lain; bila anotasi tidak diberikan, sistem menyimpan null tanpa memilih tujuan otomatis

#### Scenario: CTA beberapa baris
- **WHEN** CTA config2 mempunyai beberapa baris seperti POST-060 DYK dan memenuhi budget termasuk separator
- **THEN** renderer, hash, save/revise, dan readback mempertahankan LF serta seluruh kalimat tanpa memaksa satu baris

#### Scenario: CTA sebelum fakta terakhir
- **WHEN** payload config2 memilih `cta_placement` setelah fakta keenam dari tujuh, mengikuti pola POST-057 DYK
- **THEN** copy menyisipkan CTA di posisi tersebut dan tetap mempertahankan tujuh fakta, identitas/urutannya, serta metrik yang dihitung server

#### Scenario: CTA DYK menggunakan hati
- **WHEN** profil DYK mengizinkan reaction dan emoji pada CTA
- **THEN** CTA dengan hati dapat dirender dan dibaca kembali dengan karakter yang sama

#### Scenario: Profil melarang emoji
- **WHEN** copy menggunakan emoji sementara config efektif melarangnya
- **THEN** sistem menolak pelanggaran gaya eksplisit tersebut tanpa mengubah teks diam-diam

#### Scenario: Intent plan bukan tujuan eksklusif
- **WHEN** item plan config2 meminta follow dan CTA juga mengajak like atau berdiskusi
- **THEN** gabungan tidak ditolak hanya karena ajakan lain ada; intent yang diminta tetap dipenuhi tanpa memilih primary goal

### Requirement: TEP-07 Fakta tidak ditentukan oleh referensi viral

Dataset dan contoh profil SHALL menjadi bukti pola, bukan verifikasi fakta produksi. Penulis MUST meneliti klaim final, mempertahankan qualifier, menjalankan dedup, dan menulis naskah baru; peniruan DNA MUST NOT berarti menyalin post lengkap atau kesalahan sumber.

#### Scenario: Pembuka viral ternyata tidak didukung
- **WHEN** fakta referensi yang menarik tidak didukung sumber yang dibuka
- **THEN** penulis mencari angle terverifikasi yang mempunyai fungsi editorial sebanding atau melaporkan keterbatasan tanpa menerbitkan klaim tersebut

### Requirement: TEP-08 Versi profil tercatat dalam riwayat

Post SHALL menyimpan versi/hash profil, format, topik, dan aturan efektif yang dipakai. Readback MUST mengembalikan provenance tersebut; penerbitan versi katalog baru MUST NOT menulis ulang copy, snapshot, hash, atau approval post lama.

#### Scenario: Profil diedit setelah post diterbitkan
- **WHEN** owner membuat versi profil baru
- **THEN** post lama tetap menunjukkan versi dan aturan aslinya, sedangkan penggunaan versi baru memerlukan pemilihan Page yang eksplisit

### Requirement: TEP-09 Plugin yang sama membaca profil sebelum menulis

Plugin Content Producer SHALL mengambil aturan dan contoh relevan profil aktif sebelum memilih angle dan menyelesaikan copy. Referensi runtime MUST tersedia melalui katalog sehingga format/profil baru dalam schema yang didukung tidak memerlukan pemasangan plugin baru.

#### Scenario: Format baru belum disebut dalam file plugin
- **WHEN** format baru terdaftar secara sah dan dipilih Page
- **THEN** plugin memahami definisi serta contoh yang dibaca dari katalog, tanpa bergantung pada switch lima nama atau file panduan baru per format

#### Scenario: Panduan belum lengkap terbaca
- **WHEN** respons katalog memberi cursor atau penanda contoh belum lengkap
- **THEN** plugin mengambil bagian yang dibutuhkan sebelum mengklaim telah mengikuti profil, atau melaporkan keterbatasan pembacaan

### Requirement: TEP-10 Review DNA memakai profil sasaran

Review penulis SHALL menilai angle, kontribusi tiap fakta, pembuka, ritme tengah, penutup, bahasa, dan CTA terhadap profil sasaran. Review MUST tetap terpisah dari tiga attestations v2 dan MUST NOT menggunakan skor teknis sebagai bukti kemiripan atau virality.

#### Scenario: Kalimat lebih panjang sesuai Daily Facts
- **WHEN** kalimat natural dan akurat sesuai profil Daily Facts meskipun lebih panjang daripada preferensi DYK
- **THEN** reviewer tidak menolaknya hanya berdasarkan preferensi profil lain

#### Scenario: Urutan tidak menaik terus
- **WHEN** koleksi DYK memiliki variasi kejutan dan konteks tanpa klimaks bertingkat
- **THEN** reviewer menilai nilai tiap baris dan koherensinya, tanpa memaksakan formula universal myth–angka–emosi–manfaat

### Requirement: TEP-11 Legacy config tetap mempunyai arti lama

Config versi 1 dan post tersimpan SHALL tetap dapat dibaca dan diproses menurut kontrak kompatibelnya. Penerapan config versi 2 MUST eksplisit dan MUST NOT mengubah Page production, plan completed, atau konten lama sebagai efek samping instalasi seed.

#### Scenario: Upgrade tanpa adopsi Page
- **WHEN** backend yang mendukung profil dipasang tetapi owner belum mengubah Page
- **THEN** Page tetap menggunakan config lama dengan perilaku serta batas lamanya

### Requirement: TEP-12 Estimasi baca tidak dianggap data penonton

Waktu baca, jumlah baris estimasi, dan putaran video SHALL dilaporkan sebagai estimasi mekanis. Pada config versi 2, estimasi tersebut MUST menjadi saran keterbacaan dan tidak menjadi penolakan berbasis ambang replay global lama selama batas keras efektif terpenuhi.

#### Scenario: Naskah melewati estimasi putaran lama
- **WHEN** copy memenuhi batas config versi 2 tetapi estimasi membaca melampaui ambang lama
- **THEN** sistem menampilkan estimasi dan saran review visual tanpa mengklaim retention nyata atau otomatis menolak karena ambang tersebut

### Requirement: TEP-13 Bukti penerimaan mencakup tiga profil

Penerimaan SHALL mencakup matriks pola ketiga akun, review naskah per profil, penambahan format melalui data, dan save/readback pada runtime yang diotorisasi. Bukti LIVE, CI/FIXTURE, dan preview MUST dilaporkan terpisah tanpa menyebut pengujian yang belum dijalankan sebagai PASS.

#### Scenario: Dua profil berhasil dan satu masih campuran
- **WHEN** DYK dan Curious Mind diterima tetapi output Daily Facts masih mengikuti gaya DYK
- **THEN** kasus Daily Facts tetap FAIL dan tidak ditutupi skor rata-rata tiga profil

#### Scenario: Profil campuran diuji terpisah
- **WHEN** owner memilih profil custom campuran yang didefinisikan eksplisit
- **THEN** penerimaan menilai output terhadap definisi gabungan tersebut dan membuktikan context/save/readback/revise, bukan menilai campuran itu sebagai kegagalan meniru salah satu preset

#### Scenario: Referensi keempat ditambahkan tanpa kode
- **WHEN** format, topik, dan profil referensi baru didaftarkan melalui tool katalog pada fixture dengan source/plugin yang dibekukan
- **THEN** Page dapat memilih profil dan memakai context/save/readback/revise tanpa edit source, migration, build, atau deploy tambahan selama percobaan

### Requirement: TEP-14 Analitik lama tetap kompatibel

Analitik lama SHALL tetap menerima data config1/2 dengan key dinamis dan goal null tanpa mengubah arti `profile` kepadatan atau goal historis. Provenance DNA dan label CTA opsional MUST tetap tersimpan serta tersedia pada readback. Laporan/perbandingan per versi DNA dan filter/pengelompokan label CTA baru SHALL ditunda dari scope rilis ini.

#### Scenario: Data baru dibaca analitik lama
- **WHEN** insights lama membaca post config2 dengan key dinamis atau goal null
- **THEN** hasil tidak gagal karena enum legacy, arti kepadatan/goal historis tetap, dan goal null tampil sebagai tidak terklasifikasi tanpa memilih tujuan otomatis

#### Scenario: Laporan DNA belum termasuk rilis
- **WHEN** owner meminta perbandingan performa per versi DNA atau pengelompokan label CTA baru
- **THEN** plugin menjelaskan kemampuan laporan tersebut ditunda dan tidak mengklaim hasil tersedia; versi DNA serta label yang diberikan tetap dapat diperiksa melalui readback post
