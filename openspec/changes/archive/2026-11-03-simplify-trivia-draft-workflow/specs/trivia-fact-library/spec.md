# Spec Delta — Trivia fact library

## Purpose

Menjaga identitas fakta, sumber sederhana, pencarian lintas versi, dan pemakaian
ulang yang konsisten untuk draft trivia. Baseline tetap memakai kelengkapan Read
dan versi katalog workspace; alternatif validasi kandidat relevan dalam
[design](../../design.md) belum menjadi pengganti kontrak ini.

## ADDED Requirements

### Requirement: TFL-01 Satu URL cukup sebagai input sumber fakta v2

Setiap fakta final v2 MUST mengirim kalimat dan tepat satu `source_url` web
`http`/`https` tanpa credential atau alamat lokal. Sistem MUST NOT mewajibkan
tier, source type, judul, penerbit, independence group, risk/freshness class,
expiry, atau paket bukti rinci untuk save/revise/Setujui v2.

#### Scenario: Fakta dengan sumber minimum

- **WHEN** fakta final didukung satu URL valid dan seluruh syarat draft lainnya lulus
- **THEN** fakta diterima tanpa metadata sumber v1 atau tanggal kedaluwarsa

#### Scenario: URL hilang atau bentuknya tidak diizinkan

- **WHEN** fakta tidak memiliki URL, memiliki jumlah URL yang salah, atau memakai credential, alamat lokal, `javascript:`, atau `data:`
- **THEN** sistem menolak dengan posisi fakta/field sumber yang aman dan tindakan perbaikan

#### Scenario: URL yang sama mendukung klaim berbeda

- **WHEN** satu URL mendukung beberapa proposisi yang berbeda
- **THEN** URL yang sama diizinkan dan tidak menjadi dasar menggabungkan identitas fakta

### Requirement: TFL-02 Dukungan sumber dinilai saat riset

ChatGPT SHALL membuka dan menilai dukungan URL pada tahap riset, lalu mengganti
sumber atau fakta yang tidak didukung. Backend SHALL memperlakukan URL sebagai
jejak rujukan, bukan pembuktian isi. Timestamp penyimpanan MUST NOT disebut
tanggal verifikasi sumber; catatan dukungan pendek tidak menjadi syarat wajib.

#### Scenario: Halaman tidak mendukung proposisi

- **WHEN** sumber membahas topik yang sama tetapi tidak mendukung klaim calon
- **THEN** ChatGPT mengganti sumber atau fakta sebelum menyimpan dan tidak mengklaim URL tersebut telah diverifikasi oleh backend

#### Scenario: Fakta berubah makna saat revisi

- **WHEN** revisi mengubah proposisi fakta
- **THEN** fakta yang berubah menjalani riset dan URL baru, tanpa mewajibkan riset ulang semua fakta yang tidak berubah

### Requirement: TFL-03 Bahasa natural dan jalur topik umum

Alur v2 MUST NOT mewajibkan tahun atau frasa akademik pada setiap copy fakta.
ChatGPT SHALL memilih fakta/sudut kalimat yang akurat dan singkat jika konteks
waktu yang panjang diperlukan. Topik Page SHALL memakai alur umum tanpa larangan
atau jalur sumber khusus hanya karena kategorinya, dengan kebijakan keselamatan umum tetap berlaku.

#### Scenario: Klaim memerlukan konteks waktu panjang

- **WHEN** klaim menjadi menyesatkan tanpa penjelasan waktu yang tidak cocok dengan batas naskah
- **THEN** ChatGPT memilih sudut kalimat atau fakta lain, bukan menambahkan tahun wajib ke seluruh fakta

#### Scenario: Topik kesehatan pada Page yang mengizinkannya

- **WHEN** tema termasuk kesehatan, keselamatan, hukum, atau keuangan dalam pilihan Page
- **THEN** riset mengikuti alur umum kalimat + URL dengan penilaian akurasi dan keselamatan, tanpa metadata sumber khusus karena kategori saja

### Requirement: TFL-04 Identitas canonical dan pemetaan v1 tetap satu

Sistem SHALL memakai satu registry canonical dengan pemetaan ID v1 yang eksplisit.
Jika kecocokan ditemukan dan kesamaan makna diputuskan, calon MUST merujuk
identitas canonical yang sama; ini tidak menjamin semua parafrasa terdeteksi.
Proposisi berbeda MUST NOT digabung hanya karena subjek sama. Fakta dan pemakaian
v1/v2 SHALL terlihat bersama tanpa identitas paralel untuk makna yang dikenali sama.

#### Scenario: Parafrasa ditemukan dan diputuskan same

- **WHEN** ChatGPT memutuskan bahwa calon mempunyai makna sama dengan fakta v1 yang ditemukan
- **THEN** calon merujuk identitas canonical lama, bukan membuat identitas baru untuk menghindari reuse

#### Scenario: Batas klaim saat parafrasa tidak ditemukan

- **WHEN** Read lengkap menurut aturan retrieval tidak menemukan suatu parafrasa dari fakta lama
- **THEN** hasil hanya menyatakan tidak ada duplikasi yang terdeteksi, bukan menjamin semua parafrasa ditemukan atau seluruh identitas semantik sudah tersatukan

#### Scenario: Dua proposisi tentang subjek sama

- **WHEN** dua klaim menyebut subjek sama tetapi memiliki perbedaan makna material
- **THEN** sistem mempertahankan identitas yang berbeda sesuai keputusan dedup yang sah

### Requirement: TFL-05 Status historis dibedakan dari kelayakan reuse

Pencarian SHALL mencakup fakta/pemakaian lama dan baru, termasuk published.
Fakta invalidated, superseded, atau rejected tetap petunjuk riwayat, bukan layak
pakai. Calon yang ditemukan dan diputuskan `same` dengan fakta itu MUST diganti;
identitas lama MUST NOT dipakai dan ID baru MUST NOT dibuat untuk melewati
riwayatnya. Fakta v1 yang hanya expired SHALL dapat memakai identitas lama setelah
riset URL baru tanpa expiry sebagai syarat v2.

#### Scenario: Fakta invalidated pernah digunakan

- **WHEN** calon mirip dengan fakta historis yang sudah invalidated
- **THEN** pencarian memperlihatkan petunjuk riwayat dan status tidak layaknya, bukan menyembunyikannya sebagai fakta yang tidak pernah digunakan

#### Scenario: Calon same dengan fakta lama yang tidak layak

- **WHEN** calon ditemukan dan diputuskan bermakna sama dengan fakta lama berstatus invalidated, superseded, atau rejected
- **THEN** ChatGPT mengganti calon, tidak memakai identitas yang tidak layak, dan tidak membuat ID baru untuk melewati riwayat fakta tersebut

#### Scenario: Identitas v1 hanya kedaluwarsa

- **WHEN** makna fakta v1 tetap sama, hanya bukti lamanya expired, dan URL baru telah diteliti
- **THEN** v2 dapat mempertahankan identitas itu bila reuse/status lain mengizinkan tanpa memperpanjang atau menulis ulang snapshot lama

### Requirement: TFL-06 Pencarian sederhana dan hasil ringkas

`trivia_find_similar_facts_v2` SHALL menerima Page dan kalimat calon tanpa
ontologi 17 relation key, angka/qualifier terstruktur, atau review panjang untuk
Read. Hasil SHALL memuat ID, klaim lama, status identitas/kelayakan, dan pemakaian
pada scope Page/workspace yang cukup bagi ChatGPT untuk menilai makna.

#### Scenario: Read hanya dengan kalimat calon dan konteks sah

- **WHEN** ChatGPT mencari calon menggunakan kalimat biasa pada Page owner
- **THEN** sistem mengembalikan kandidat ringkas lintas v1/v2 tanpa meminta ChatGPT merakit ontologi input

#### Scenario: Fakta sama terpakai pada scope Page

- **WHEN** kandidat mempunyai pemakaian pada scope yang melarang calon dipakai lagi
- **THEN** hasil membedakan status pemakaian itu dari status identitas dan menampilkan informasi aman untuk memilih pengganti

### Requirement: TFL-07 Keputusan makna menyaring set final

ChatGPT SHALL menilai kandidat yang terlihat sebagai `same`, `distinct`, atau
`uncertain`. `same` MUST memakai ID lama bila layak dan belum terpakai; `distinct`
MUST mempunyai perbedaan material; `uncertain` atau `same` terpakai MUST diganti.
Calon `same` dengan identitas tidak layak MUST juga diganti tanpa ID pengelak.
Set final MUST NOT memuat dua fakta bermakna sama yang sudah dikenali.

#### Scenario: Makna sama dan masih layak

- **WHEN** calon diputuskan `same` terhadap identitas yang layak serta belum terpakai pada scope relevan
- **THEN** identitas itu dipakai kembali, bukan didaftarkan sebagai fakta baru

#### Scenario: Kesamaan belum pasti atau penggunaan terlarang

- **WHEN** calon bernilai `uncertain` atau `same` terhadap fakta yang sudah terpakai
- **THEN** ChatGPT mengganti calon dan tidak mengubah keputusan menjadi `distinct` hanya agar save lolos

#### Scenario: Duplikasi di dalam set calon

- **WHEN** dua calon pada draft yang sama diketahui menyatakan proposisi sama
- **THEN** ChatGPT menyisihkan salah satunya dan memenuhi jumlah fakta dengan calon lain

### Requirement: TFL-08 Kelengkapan Read dinyatakan secara jujur

Read SHALL mengembalikan `complete` dan versi katalog workspace. `complete=true`
MUST berarti seluruh kandidat wajib menurut aturan retrieval pada versi itu
ditampilkan. Hasil terpotong/tidak lengkap atau review wajib belum selesai
MUST NOT dianggap bersih; ChatGPT SHALL mengganti calon, bukan memaksa review panjang.

#### Scenario: Hasil melebihi batas respons

- **WHEN** kandidat wajib tidak semuanya dapat ditampilkan dalam batas keluaran
- **THEN** Read menyatakan `complete=false` dan tidak menampilkan hasil seolah sudah lengkap

#### Scenario: Host memotong hasil yang semula lengkap

- **WHEN** ChatGPT hanya melihat sebagian hasil atau field review wajib tidak terlihat
- **THEN** calon tidak dipakai sebagai fakta final dan ChatGPT mencari calon pengganti

#### Scenario: Read lengkap tanpa kecocokan

- **WHEN** seluruh aturan retrieval dijalankan dan tidak ada kandidat wajib yang ditemukan
- **THEN** hasil dapat dinyatakan lengkap pada versi tersebut, dengan klaim terbatas tidak ada duplikasi yang terdeteksi

### Requirement: TFL-09 Perubahan katalog menolak Write stale

Versi katalog workspace MUST berubah saat identitas, status koreksi, atau alokasi
pemakaian yang relevan berubah. Save MUST memeriksa versi dari Read yang sama di
bawah lock workspace dan menolak versi stale tanpa perubahan parsial, disertai
recovery Read ulang. Alternatif validasi kandidat relevan belum menggantikan aturan ini.

#### Scenario: Katalog berubah antara Read dan save

- **WHEN** perubahan katalog commit setelah Read dan sebelum pemeriksaan save
- **THEN** save ditolak dengan konflik yang menjelaskan tindakan pencarian ulang tanpa post/fakta/alokasi parsial

#### Scenario: Perubahan tidak terkait juga mengubah versi

- **WHEN** fakta lain yang tidak terkait calon mengubah versi katalog menurut aturan baseline
- **THEN** save tetap menolak versi lama; tidak ada pengecualian otomatis berdasarkan alternatif yang belum disetujui

#### Scenario: Pemulihan tidak memerlukan riset ulang sumber yang sah

- **WHEN** konflik hanya memerlukan dedup Read baru dan makna/dukungan sumber tidak berubah
- **THEN** ChatGPT dapat memakai kembali hasil riset yang masih sah sambil meninjau hasil dedup terbaru sebelum Write

### Requirement: TFL-10 Alokasi atomik menegakkan scope reuse

Sistem MUST memeriksa dan mengalokasikan identitas di dalam transaksi save yang
sama sehingga dua penggunaan serentak pada scope terlarang tidak sama-sama
berhasil. Draft teralokasi SHALL dihitung sebagai pemakaian. Scope MUST mengikuti
`workspace_unique` atau `page_unique` dari konfigurasi Page, termasuk lintas v1/v2.

#### Scenario: Dua save pada Page sama

- **WHEN** dua transaksi mencoba mengalokasikan ID canonical sama pada Page yang sama
- **THEN** paling banyak satu save baru berhasil; transaksi lain ditolak atau direkonsiliasi tanpa pemakaian terlarang

#### Scenario: Scope workspace_unique lintas Page

- **WHEN** dua Page mencoba memakai identitas sama dan kebijakan reuse yang berlaku melarangnya pada workspace
- **THEN** kedua alokasi tidak sama-sama berhasil

#### Scenario: Scope page_unique lintas Page

- **WHEN** identitas dipakai pada Page berbeda di bawah kebijakan yang mengizinkan reuse lintas Page
- **THEN** masing-masing dapat dialokasikan setelah memenuhi versi katalog terbaru dan seluruh pemeriksaan lain

#### Scenario: Write v1 berlangsung selama transisi

- **WHEN** reservasi, save, atau koreksi v1 berkompetisi dengan save v2
- **THEN** pemeriksaan lintas versi melihat state yang relevan dan tidak membolehkan konflik pemakaian yang dilarang kontrak

### Requirement: TFL-11 Koreksi dan sumber tidak menulis ulang snapshot published

Reverify v2 SHALL memperbarui URL canonical untuk makna sama tanpa tier/expiry.
Correction v2 SHALL menginvalidasi atau mengganti makna dengan izin owner
terpisah. Keduanya MUST mempertahankan snapshot post published; perubahan URL
lokal pada draft belum terbit SHALL memakai revise tanpa identitas baru bila makna tetap.

#### Scenario: Memperbarui URL canonical

- **WHEN** reverify v2 yang sah mengganti URL untuk proposisi sama
- **THEN** identitas tetap dan snapshot sumber post yang sudah terpublikasi tidak ditulis ulang

#### Scenario: Menginvalidasi fakta bermasalah

- **WHEN** pemilik memberi izin correction yang sah terhadap fakta v2
- **THEN** status/lineage serta dampak pada post mutable mengikuti kontrak correction, sementara riwayat published tetap utuh

### Requirement: TFL-12 Migrasi dan backfill mempertahankan data serta keamanan

Perubahan data SHALL additive dan backfill pemetaan/pemakaian v1 MUST idempoten.
ID, isi post, snapshot, approval historis, serta bukti sumber lama MUST tetap
bermakna sama. Perubahan v1 selama transisi MUST tetap terlihat di registry
bersama. Scope owner dan penutupan akses langsung bisnis MUST tetap ditegakkan.

#### Scenario: Backfill diulang

- **WHEN** pemetaan data lama dijalankan ulang pada state yang sudah dipetakan
- **THEN** tidak ada identitas atau pemakaian ganda, dan snapshot historis tidak berubah

#### Scenario: Data v1 berubah setelah backfill awal

- **WHEN** write v1 yang masih didukung mengubah state identitas, status, atau pemakaian yang relevan
- **THEN** pencarian dan pemeriksaan v2 berikutnya melihat perubahan tersebut tanpa membutuhkan backfill manual lagi

### Requirement: TFL-13 Evaluasi retrieval ditetapkan sebelum implementasi dinilai

Dataset berlabel dan ambang temuan parafrasa/salah gabung MUST disepakati sebelum
implementasi pencarian dinilai. Evaluasi SHALL mencakup data lama dan proposisi
berbeda yang mirip kata. Hasil MUST dilaporkan terhadap baseline, tanpa tuning
expected setelah hasil atau jaminan semua parafrasa ditemukan.

#### Scenario: Menilai hasil pencarian v2

- **WHEN** implementasi dievaluasi terhadap dataset yang disepakati
- **THEN** recall parafrasa, salah gabung, dan kasus data lama dilaporkan dengan ambang yang ditetapkan sebelumnya

#### Scenario: Ambang belum disepakati

- **WHEN** dataset atau ambang keberhasilan belum diterima
- **THEN** kualitas retrieval tidak dinyatakan PASS dan angka target tidak direkayasa setelah hasil terlihat
