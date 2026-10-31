# Spec Delta — Trivia draft workflow

## Purpose

Menetapkan perilaku pembuatan draft trivia melalui instruksi biasa, dari riset
hingga readback, termasuk kelanjutan beberapa draft dan persetujuan terpisah.
Spesifikasi ini menjabarkan baseline PRD melalui [design](../../design.md), bukan
memberlakukan override kontrak frozen sebelum change record diterima.

## ADDED Requirements

### Requirement: TDW-01 Permintaan draft fleksibel dan sasaran jelas

ChatGPT SHALL mengenali Page, jumlah draft, dan tema dari bahasa biasa tanpa
format perintah wajib. Permintaan tunggal tanpa angka berarti satu draft;
jumlah atau Page yang ambigu MUST diklarifikasi sebelum Write. Jumlah mengikuti
batas content plan yang berlaku dan MUST NOT dipotong diam-diam.

#### Scenario: Permintaan satu draft tanpa angka

- **WHEN** pemilik meminta satu draft baru tanpa angka dan satu Page aktif jelas
- **THEN** ChatGPT menargetkan tepat satu draft pada Page tersebut tanpa meminta format perintah khusus

#### Scenario: Jumlah atau Page ambigu

- **WHEN** pemilik meminta "beberapa" tanpa angka atau beberapa Page dapat cocok
- **THEN** ChatGPT meminta jumlah atau pilihan Page sebelum melakukan Write

#### Scenario: Permintaan melebihi batas

- **WHEN** jumlah yang diminta melampaui batas content plan yang berlaku, saat ini 100
- **THEN** ChatGPT menjelaskan batas sebelum Write dan tidak membuat jumlah yang dipotong diam-diam

### Requirement: TDW-02 Konfigurasi Page terbaru mengendalikan draft

ChatGPT SHALL mengikuti jumlah fakta, format, topik, reuse scope, bahasa, dan
batas naskah Page. Tema MUST dipetakan ke pilihan yang diizinkan. Konteks terbaru
MUST diambil tepat sebelum fact-bearing Write; `config_updated_at` MUST tetap
memuat enam digit mikrodetik tanpa pembulatan.

#### Scenario: Tema cocok dengan konfigurasi

- **WHEN** permintaan menyebut "food and home" dan konfigurasi Page menyediakan topik yang sesuai
- **THEN** setiap draft mengikuti tema dan konfigurasi Page, dengan konten `en-US` menurut baseline

#### Scenario: Tema tidak dapat dipenuhi

- **WHEN** tema tidak mempunyai pemetaan yang sesuai dengan pilihan Page
- **THEN** ChatGPT menjelaskan kendala sebelum menyimpan konten di luar permintaan

#### Scenario: Konfigurasi berubah selama pekerjaan

- **WHEN** konfigurasi berubah setelah konteks yang dipakai untuk Write dibaca
- **THEN** Write ditolak tanpa hasil parsial dan ChatGPT membaca konteks serta meninjau dampaknya sebelum operasi baru

### Requirement: TDW-03 Izin draft terbatas dan akses owner tetap terjaga

Sistem MUST mempertahankan owner OAuth `mcpku2`, scope workspace, RLS, grant
default-closed, CAS, dan audit. Setelah penyelarasan izin melalui change record,
instruksi draft SHALL mencakup jumlah draft serta plan/claim/renew/failure yang
relevan, tanpa mengizinkan Setujui, discard, koreksi, atau publikasi otomatis.

#### Scenario: Membuat lima draft dalam scope yang disetujui

- **WHEN** pemilik meminta lima draft pada Page yang jelas dan aturan izin baru telah berlaku
- **THEN** ChatGPT dapat mengerjakan plan dan lima draft terkait tanpa membuat draft tambahan atau melakukan Setujui

#### Scenario: Akses lintas owner

- **WHEN** caller mencoba mengakses Page, plan, post, atau fakta workspace owner lain
- **THEN** sistem menolak akses tanpa membocorkan resource atau melakukan mutasi bisnis

### Requirement: TDW-04 Riset dan dedup mendahului copy final

ChatGPT SHALL meriset calon lebih banyak daripada jumlah fakta final untuk
draft yang sedang dikerjakan, dengan kalimat dan URL nyata. Dedup dan seleksi
MUST selesai sebelum copy final; calon terpakai, meragukan, atau hasil Read tidak
lengkap MUST diganti. Cadangan yang kurang SHALL memicu riset tambahan.

#### Scenario: Calon bermasalah diganti dalam percakapan yang sama

- **WHEN** dedup menunjukkan calon sudah terpakai, `uncertain`, atau hasilnya tidak lengkap
- **THEN** ChatGPT memakai calon cadangan atau meriset calon baru, mencarinya, lalu menulis copy dari set final

#### Scenario: Fakta yang dapat dipakai tidak cukup

- **WHEN** riset tidak menyediakan cukup calon yang dapat dipakai setelah upaya yang wajar
- **THEN** ChatGPT melaporkan tahap dan alasan berhenti, hasil yang sudah terbukti, dan sisa pekerjaan tanpa mengarang fakta atau URL

### Requirement: TDW-05 Satu save menghasilkan satu draft utuh

`save_post_v2` SHALL menyimpan tepat satu post `draft`, resolusi identitas,
pengaitan/alokasi fakta, dan penyelesaian item plan terkait secara atomik tanpa
reservasi paket terpisah. Kegagalan MUST membatalkan seluruh perubahan bisnis
draft itu, bukan draft lain yang sudah tersimpan. Save MUST NOT membuat `ready`.

#### Scenario: Save berhasil tanpa reservasi paket

- **WHEN** fakta final, keputusan identitas, versi katalog, konfigurasi, copy, editorial, dan claim bila ada semuanya sah
- **THEN** satu post `draft` beserta fakta dan alokasinya tersimpan tanpa panggilan register/reserve terpisah

#### Scenario: Satu fakta menyebabkan kegagalan

- **WHEN** fakta pada posisi tertentu gagal diperiksa dalam save
- **THEN** tidak ada post, fakta baru, alokasi, atau penyelesaian item parsial dari transaksi itu, dan draft sebelumnya tetap ada

### Requirement: TDW-06 Kualitas keras dan editorial ditegakkan saat save dan revise

Sistem SHALL menghitung metrik renderer resmi dan menolak struktur, URL, jumlah,
format, identitas/reuse, atau batas keras yang gagal. Tiga hasil editorial
per draft MUST `pass` dan terikat revision/hash keluaran; `needs_revision` MUST
menolak perubahan. Catatan gaya nonblocking SHALL ditampilkan terpisah.

#### Scenario: Copy melewati batas keras

- **WHEN** copy melampaui budget Page atau tidak cocok dengan pengaitan fakta
- **THEN** save/revise ditolak tanpa post/revisi baru dan memberi lokasi serta tindakan perbaikan

#### Scenario: Editorial belum lulus

- **WHEN** kesesuaian makna, caption tanpa klaim tambahan yang tidak didukung, atau ketiadaan masalah substansi bernilai `needs_revision`
- **THEN** perubahan ditolak sampai ChatGPT memperbaiki naskah dan menilai ulang

#### Scenario: Hanya saran gaya yang tersisa

- **WHEN** seluruh pemeriksaan wajib lulus dan hanya ada catatan gaya nonblocking
- **THEN** draft dapat tersimpan, metrik server dan tiga hasil `pass` dicatat untuk revision/hash tersebut

### Requirement: TDW-07 Setiap draft dibuktikan melalui readback

Setelah setiap save/revise berhasil, ChatGPT SHALL memanggil `get_post` dan
mencocokkan Page, fakta, URL, copy, status, revision/hash, serta hasil pemeriksaan
yang dilaporkan. ChatGPT MUST NOT menyatakan keberhasilan penuh hanya dari copy
di chat, HTTP 200, host approval, atau respons Write tanpa readback.

#### Scenario: Satu draft terbukti tersimpan

- **WHEN** save menghasilkan ID post dan `get_post` mengembalikan isi serta state yang sesuai
- **THEN** ChatGPT dapat melaporkan ID dan isi draft itu sebagai hasil tersimpan

#### Scenario: Readback sementara gagal

- **WHEN** respons save diterima tetapi `get_post` belum berhasil
- **THEN** ChatGPT menjelaskan batas bukti dan merekonsiliasi post yang sama tanpa membuat draft pengganti untuk memenuhi readback

### Requirement: TDW-08 Beberapa draft memakai satu content plan tanpa jadwal

Permintaan dua draft atau lebih SHALL membuat satu content plan tanpa jadwal,
jumlah item tepat, dan tema pada `plan_intent`. ChatGPT MUST mengklaim satu item
sebelum mengerjakan draftnya, menyimpan dan membaca post serta progres plan
sebelum item berikutnya. `completed` SHALL berarti draft tersimpan.

#### Scenario: Lima draft bertema

- **WHEN** pemilik meminta lima draft bertema food and home pada Page yang sah
- **THEN** satu plan berisi lima item dikerjakan bertahap hingga lima ID draft berbeda memiliki readback, tanpa reuse yang diketahui melanggar scope

#### Scenario: Permintaan satu draft

- **WHEN** pemilik hanya meminta satu draft
- **THEN** alur langsung memakai save/readback tanpa mewajibkan content plan

### Requirement: TDW-09 Hasil sebagian dan kelanjutan tidak menggandakan output

ChatGPT SHALL melaporkan ID plan, jumlah diminta, jumlah draft yang terbukti,
ID post, serta sisa dan kendala. Kelanjutan MUST membaca `get_content_plan`
lebih dulu, tidak membuat ulang item completed, dan meminta pilihan bila beberapa
plan cocok. Kegagalan berikutnya MUST NOT menghapus hasil sebelumnya.

#### Scenario: Item keempat gagal setelah tiga readback

- **WHEN** tiga dari lima draft terbukti dan item keempat gagal
- **THEN** tiga draft tetap ada dan ringkasan menyebut tiga selesai, dua tersisa, ID plan/post, serta kegagalan yang didukung bukti

#### Scenario: Melanjutkan dari chat baru

- **WHEN** pemilik meminta melanjutkan dan hanya satu plan aktif yang sesuai
- **THEN** ChatGPT membaca progres, merekonsiliasi output yang ada, dan hanya mengerjakan sisa item

#### Scenario: Respons pembuatan plan hilang

- **WHEN** hasil create-plan belum dapat dipastikan
- **THEN** ChatGPT merekonsiliasi state atau replay operasi identik sebelum membuat plan lain

### Requirement: TDW-10 Claim dan lease membatasi attempt yang berhak

Alur beberapa draft MUST mempertahankan lease 30 menit, satu renewal yang
diizinkan, failure/retry, dan pemulihan menurut kontrak plan. Save baru MUST
memerlukan claim sah; claim kedaluwarsa/direbut ulang MUST NOT mengizinkan mutasi
bisnis baru. Replay save sukses dengan operation key/payload semantik identik
SHALL mengembalikan hasil tersimpan walau claim kedaluwarsa, tanpa mutasi bisnis
baru dan tetap melalui otorisasi.

#### Scenario: Claim habis saat riset

- **WHEN** claim kedaluwarsa sebelum save baru
- **THEN** sistem menolak attempt lama dan ChatGPT membaca state serta mengikuti reclaim/recovery yang sah

#### Scenario: Key baru dengan claim kedaluwarsa bukan replay

- **WHEN** save baru dikirim dengan operation key baru memakai claim yang sudah kedaluwarsa
- **THEN** sistem menolak save baru tanpa membuat post atau mutasi bisnis tambahan, bukan memperlakukannya sebagai replay save sebelumnya

#### Scenario: Dua chat mengerjakan plan sama

- **WHEN** dua chat berkompetisi atas item plan yang sama
- **THEN** hanya attempt yang berhak dapat menyelesaikan item dan tidak ada dua output aktif untuk item itu

### Requirement: TDW-11 Replay dan rekonsiliasi mempertahankan satu operasi logis

Write SHALL memakai operation key dan payload semantik yang sama untuk replay
operasi logis yang sama. Respons hilang MUST memicu rekonsiliasi atau replay
identik sebelum operasi baru. Konflik revision/hash MUST memicu pembacaan dan
review baru. Replay save yang telah berhasil MUST tetap mengembalikan hasil
operasi tersimpan sesudah claim kedaluwarsa tanpa post kedua. Rate limit dan
retry MUST diikuti tanpa loop tak berbatas.

#### Scenario: Save commit tetapi respons hilang

- **WHEN** save mungkin telah commit dan responsnya hilang
- **THEN** readback atau replay identik menemukan satu post, bukan membuat post kedua dengan key baru

#### Scenario: Replay save sukses setelah respons hilang dan claim kedaluwarsa

- **GIVEN** save telah commit dengan claim sah tetapi responsnya hilang
- **WHEN** caller yang tetap berwenang mengirim replay dengan operation key dan payload semantik yang sama setelah claim kedaluwarsa
- **THEN** sistem mengembalikan hasil operasi yang telah tersimpan dengan ID post yang sama tanpa menolak hanya karena claim kedaluwarsa
- **AND** replay tidak membuat post/alokasi kedua atau mengubah item completed; `get_post` membaca kembali hasil tersimpan tersebut

#### Scenario: Payload berubah sebelum hasil lama pasti

- **WHEN** ChatGPT ingin mengganti fakta/copy setelah respons Write hilang
- **THEN** state operasi lama direkonsiliasi dahulu dan perubahan payload tidak dikirim sebagai replay operasi lama

### Requirement: TDW-12 Revisi menjaga identitas dan membatalkan evidence lama

`revise_post_v2` SHALL mempertahankan identitas untuk makna sama; perubahan
makna/penggantian fakta MUST melalui riset, URL, dan dedup baru serta pengaitan
atomik. CAS revision/hash dan editorial baru MUST berlaku. Revisi isi pada
`ready` SHALL kembali ke `draft`; URL makna sama dapat diperbarui pada post belum terbit.

#### Scenario: Revisi kata tanpa perubahan makna

- **WHEN** pemilik meminta perubahan kata pada draft v2 tanpa mengubah proposisi
- **THEN** identitas dipertahankan, revision/hash serta pemeriksaan diperbarui sesuai isi, dan hasil lama tidak diperlakukan sebagai editorial baru

#### Scenario: Mengganti fakta pada post ready

- **WHEN** fakta pada post `ready` diganti dengan proposisi lain
- **THEN** riset/dedup fakta baru dijalankan, perubahan atomik menghasilkan `draft`, dan approval lama dibatalkan

#### Scenario: Hanya jadwal berubah

- **WHEN** pemilik hanya mengubah jadwal melalui operasi penjadwalan yang berlaku
- **THEN** sistem mengikuti kontrak khusus jadwal dan tidak menganggapnya otomatis sebagai revisi substansi

### Requirement: TDW-13 Setujui terpisah dan memeriksa versi tepat

`approve_post` MUST memerlukan perintah pemilik atas revision/hash yang ditinjau
dan memeriksa state terkini secara atomik. Page aktif, binding, URL, identitas/
reuse, jumlah/format/batas keras, dan tiga editorial `pass` terkini MUST lulus.
Setujui MUST NOT meneliti ulang semua URL, menuntut tier/expiry v2, atau memublikasikan post.

#### Scenario: Draft lulus dan owner menyetujui versi tepat

- **WHEN** seluruh syarat wajib lulus dan pemilik memberi perintah Setujui untuk revision/hash yang telah dibaca
- **THEN** post menjadi `ready` tanpa riset ulang URL atau publikasi otomatis

#### Scenario: Persetujuan stale atau ada masalah wajib

- **WHEN** revision/hash berubah atau pemeriksaan wajib tidak lulus
- **THEN** Setujui ditolak, masalah dijelaskan, dan status tidak dipaksa menjadi `ready`

### Requirement: TDW-14 Publikasi dan metrik merekam peristiwa manual nyata

Sistem SHALL mencatat publikasi hanya setelah konfirmasi manual yang nyata dan
state `ready` yang masih sah. Canva/Facebook serta pengambilan metrik tetap
manual. Sistem MUST NOT membuat URL/ID publikasi atau angka metrik fiktif dan
MUST NOT mengembalikan tier/expiry v1 sebagai gate publikasi v2.

#### Scenario: Publikasi manual dikonfirmasi

- **WHEN** pemilik mengonfirmasi publikasi nyata untuk post ready yang masih sah
- **THEN** pencatatan `posted` mempertahankan fakta/sumber historis dan tidak mengunggah konten ke Facebook

#### Scenario: Metrik belum diketahui

- **WHEN** pemilik belum mempunyai pengamatan metrik tertentu
- **THEN** nilai tidak direkayasa sebagai angka dan pencatatan/insights tetap mengikuti kontrak pengamatan manual

### Requirement: TDW-15 Lifecycle mempertahankan arti alokasi dan riwayat

Discard pada post belum terbit SHALL melepaskan alokasi sesuai kontrak tanpa
menghapus riwayat atau otomatis membuat replacement. Publikasi/arsip MUST
mempertahankan riwayat pemakaian dan snapshot sumber. Revoke, reschedule,
archive, serta pengelolaan post lama SHALL tetap mengikuti kontrak versinya.

#### Scenario: Discard output plan

- **WHEN** pemilik secara eksplisit membuang draft yang menjadi output plan
- **THEN** alokasi belum terbit dilepas, riwayat tetap ada, dan item tidak otomatis dibuka untuk draft tambahan

#### Scenario: Post published diarsipkan

- **WHEN** post terpublikasi diarsipkan melalui tindakan yang sah
- **THEN** pemakaian fakta published dan snapshot historis tetap ada, bukan menjadi fakta bebas pakai

### Requirement: TDW-16 Tool v2 terpisah dan post v1 tetap kompatibel

Sistem SHALL menyediakan `trivia_find_similar_facts_v2`, `save_post_v2`, dan
`revise_post_v2` dengan kontrak versi jelas. Tool v1 MUST tetap kompatibel selama
transisi. Read/lifecycle bersama MUST memahami versi konten; post v1 SHALL tetap
terbaca dan dikelola dengan arti serta snapshot lama.

#### Scenario: Plugin baru dan lama selama transisi

- **WHEN** host memakai plugin baru atau plugin v1 yang masih didukung
- **THEN** plugin baru memilih v2 dan plugin lama tidak dipaksa membaca schema baru sebagai schema v1

#### Scenario: Membaca post historis

- **WHEN** `get_post` atau list membaca post v1 bersama post v2
- **THEN** hasil memuat versi yang tepat dan data lama tidak ditampilkan seolah telah melalui riset/pemeriksaan v2

### Requirement: TDW-17 Pensiun pembuatan v1 menunggu bukti dan keputusan

Pembuatan v1 MUST NOT dihentikan sebelum kriteria cutover terukur diterima
pemilik dan terbukti. Bukti SHALL mencakup keberhasilan v2, kompatibilitas post
lama, pemakaian plugin lama, dan rollback. Penghentian MUST membedakan pembuatan
baru dari maintenance/replay historis serta mempertahankan keterbacaan data.

#### Scenario: Kriteria atau bukti belum tersedia

- **WHEN** ambang cutover belum diterima atau observasi pemakaian plugin lama tidak tersedia
- **THEN** tidak ada klaim cutover lulus dan pembuatan v1 tidak dipensiunkan berdasarkan log kosong atau angka contoh 7 hari/3 chat

#### Scenario: Meninjau penghentian pembuatan lama

- **WHEN** bukti cutover dan latihan rollback diajukan kepada pemilik
- **THEN** keputusan mempertimbangkan post v1/v2, plan in-flight, maintenance/replay, dan data historis tanpa menganggap CI PASS sebagai izin rilis/penghentian
