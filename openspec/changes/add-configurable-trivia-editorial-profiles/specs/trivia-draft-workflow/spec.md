# Spec Delta

## MODIFIED Requirements

### Requirement: TDW-02 Konfigurasi Page terbaru mengendalikan draft

ChatGPT SHALL mengikuti jumlah fakta, format, topik, reuse scope, bahasa, dan batas naskah Page. Tema MUST dipetakan ke pilihan yang diizinkan. Konteks terbaru MUST diambil tepat sebelum fact-bearing Write; `config_updated_at` MUST tetap memuat enam digit mikrodetik tanpa pembulatan. Untuk config versi 2, konteks SHALL menyertakan profil DNA dan referensi katalog versi tepat serta membedakan aturan keras dari preferensi; config versi 1 tetap mempertahankan perilaku kompatibelnya.

#### Scenario: Tema cocok dengan konfigurasi
- **WHEN** permintaan menyebut "food and home" dan konfigurasi Page menyediakan topik yang sesuai
- **THEN** setiap draft mengikuti tema dan konfigurasi Page, dengan konten `en-US` menurut baseline

#### Scenario: Tema tidak dapat dipenuhi
- **WHEN** tema tidak mempunyai pemetaan yang sesuai dengan pilihan Page
- **THEN** ChatGPT menjelaskan kendala sebelum menyimpan konten di luar permintaan

#### Scenario: Konfigurasi berubah selama pekerjaan
- **WHEN** konfigurasi berubah setelah konteks yang dipakai untuk Write dibaca
- **THEN** Write ditolak tanpa hasil parsial dan ChatGPT membaca konteks serta meninjau dampaknya sebelum operasi baru

#### Scenario: Profil terikat versi dibaca
- **WHEN** Page memakai config versi 2 dengan profil DYK
- **THEN** plugin memakai definisi serta contoh DYK versi yang dikembalikan context dan tidak menggantinya dengan panduan gabungan tiga referensi

#### Scenario: Versi profil lain diterbitkan
- **WHEN** katalog editorial bertambah tetapi config serta binding Page tetap identik
- **THEN** context dan save tetap memakai versi yang sudah terikat tanpa migrasi otomatis atau stale akibat definisi yang tidak terkait

### Requirement: TDW-04 Riset dan dedup mendahului copy final

ChatGPT SHALL meriset calon lebih banyak daripada jumlah fakta final untuk draft yang sedang dikerjakan, dengan kalimat dan URL nyata. Dedup dan seleksi MUST selesai sebelum copy final; calon terpakai, meragukan, atau hasil Read tidak lengkap MUST diganti. Cadangan yang kurang SHALL memicu riset tambahan. Penulis MUST menyeleksi fakta menurut profil Page; contoh viral bukan bukti fakta. Beberapa batch dedup MUST mempunyai versi katalog fakta yang konsisten sebelum save.

#### Scenario: Calon bermasalah diganti dalam percakapan yang sama
- **WHEN** dedup menunjukkan calon sudah terpakai, `uncertain`, atau hasilnya tidak lengkap
- **THEN** ChatGPT memakai calon cadangan atau meriset calon baru, mencarinya, lalu menulis copy dari set final

#### Scenario: Fakta yang dapat dipakai tidak cukup
- **WHEN** riset tidak menyediakan cukup calon yang dapat dipakai setelah upaya yang wajar
- **THEN** ChatGPT melaporkan tahap dan alasan berhenti, hasil yang sudah terbukti, dan sisa pekerjaan tanpa mengarang fakta atau URL

#### Scenario: Sepuluh fakta membutuhkan beberapa Read
- **WHEN** jumlah calon final melebihi kapasitas satu panggilan dedup
- **THEN** plugin membagi Read sesuai kapasitas, mempertahankan candidate key unik serta pemeriksaan seluruh match, dan menyelaraskan ulang Read bila versi katalog fakta berbeda

#### Scenario: Fakta valid tetapi koleksi lemah
- **WHEN** seluruh klaim didukung tetapi koleksi berisi pengisi atau berulang dan tidak mengikuti profil
- **THEN** plugin memperbaiki pemilihan dan copy sebelum Write tanpa mengubah arti tiga attestations atau memaksa fakta menjadi distinct

### Requirement: TDW-06 Kualitas keras dan editorial ditegakkan saat save dan revise

Sistem SHALL menghitung metrik renderer resmi dan menolak struktur, URL, jumlah, format, identitas/reuse, atau batas keras yang gagal. Tiga hasil editorial per draft MUST `pass` dan terikat revision/hash keluaran; `needs_revision` MUST menolak perubahan. Catatan gaya nonblocking SHALL ditampilkan terpisah. Config versi 2 MUST memakai aturan efektif profil/Page; preferensi gaya atau estimasi putaran tidak menjadi gate global. Plugin MUST menyelesaikan review profil sebelum Write.

#### Scenario: Copy melewati batas keras
- **WHEN** copy melampaui budget Page atau tidak cocok dengan pengaitan fakta
- **THEN** save/revise ditolak tanpa post/revisi baru dan memberi lokasi serta tindakan perbaikan

#### Scenario: Editorial belum lulus
- **WHEN** kesesuaian makna, caption tanpa klaim tambahan yang tidak didukung, atau ketiadaan masalah substansi bernilai `needs_revision`
- **THEN** perubahan ditolak sampai ChatGPT memperbaiki naskah dan menilai ulang

#### Scenario: Hanya saran gaya yang tersisa
- **WHEN** seluruh pemeriksaan wajib dan review penulis sudah selesai serta hanya ada catatan gaya nonblocking
- **THEN** draft dapat tersimpan, metrik server dan tiga hasil `pass` dicatat untuk revision/hash tersebut tanpa attestation DNA baru

#### Scenario: Format tambahan sah
- **WHEN** save config versi 2 memakai format terdaftar yang dipilih Page dan belum pernah ada dalam enum lima format lama
- **THEN** format diterima melalui aturan katalog tanpa diganti nama, sementara referensi asing atau tidak terdaftar tetap ditolak

#### Scenario: Budget profil lebih longgar dari legacy
- **WHEN** copy config versi 2 memenuhi batas efektif yang sah meskipun melewati jumlah atau panjang legacy
- **THEN** semua komponen serta metrik tersimpan utuh dan tidak dipotong agar menyerupai batas config versi 1

#### Scenario: CTA gabungan tanpa goal utama
- **WHEN** save/revise config2 memakai beberapa ajakan yang memenuhi budget, tanpa `interaction_goal` atau label aksi lengkap
- **THEN** draft diterima tanpa hierarki atau allowlist kombinasi CTA; null goal serta teks/penempatan CTA dipertahankan pada snapshot dan readback, dan tidak ada aturan plugin pengganti yang memaksa hanya satu tujuan

### Requirement: TDW-07 Setiap draft dibuktikan melalui readback

Setelah setiap save/revise berhasil, ChatGPT SHALL memanggil `get_post` dan mencocokkan Page, fakta, URL, copy, status, revision/hash, serta hasil pemeriksaan yang dilaporkan. ChatGPT MUST NOT menyatakan keberhasilan penuh hanya dari copy di chat, HTTP 200, host approval, atau respons Write tanpa readback. Post config versi 2 MUST menampilkan provenance profil/format/topik dan aturan efektif yang sama dengan snapshot penulisan; klaim DNA MUST mengacu pada copy tersebut.

#### Scenario: Satu draft terbukti tersimpan
- **WHEN** save menghasilkan ID post dan `get_post` mengembalikan isi serta state yang sesuai
- **THEN** ChatGPT dapat melaporkan ID dan isi draft itu sebagai hasil tersimpan

#### Scenario: Readback sementara gagal
- **WHEN** respons save diterima tetapi `get_post` belum berhasil
- **THEN** ChatGPT menjelaskan batas bukti dan merekonsiliasi post yang sama tanpa membuat draft pengganti untuk memenuhi readback

#### Scenario: Preview berbeda dari readback
- **WHEN** copy atau profil yang dinilai berbeda dari isi serta provenance yang tersimpan
- **THEN** hasil tidak diklaim lulus DNA dan post yang sama direkonsiliasi mengikuti CAS serta scope izin

#### Scenario: Readback sebelas fakta
- **WHEN** save berhasil menyimpan sebelas fakta pada config yang mengizinkannya
- **THEN** seluruh fakta, sumber, posisi, dan array metrik dikembalikan tanpa batas output sembilan elemen

### Requirement: TDW-08 Beberapa draft memakai satu content plan tanpa jadwal

Permintaan dua draft atau lebih SHALL membuat satu content plan tanpa jadwal, jumlah item tepat, dan tema pada `plan_intent`. ChatGPT MUST mengklaim satu item sebelum mengerjakan draftnya, menyimpan dan membaca post serta progres plan sebelum item berikutnya. `completed` SHALL berarti draft tersimpan. Pilihan format dan override item MUST tervalidasi terhadap config/profil Page; jumlah draft MUST NOT menjadi jumlah fakta dan item completed MUST tetap historis.

#### Scenario: Lima draft bertema
- **WHEN** pemilik meminta lima draft bertema food and home pada Page yang sah
- **THEN** satu plan berisi lima item dikerjakan bertahap hingga lima ID draft berbeda memiliki readback, tanpa reuse yang diketahui melanggar scope

#### Scenario: Permintaan satu draft
- **WHEN** pemilik hanya meminta satu draft
- **THEN** alur langsung memakai save/readback tanpa mewajibkan content plan

#### Scenario: Format belum diputuskan saat membuat plan
- **WHEN** Page config versi 2 mengizinkan beberapa format dan perangkat editorial belum dipilih
- **THEN** item dapat menyimpan format null, lalu format terdaftar yang sesuai ditentukan saat komposisi tanpa memaksakan comparison untuk memenuhi bobot

#### Scenario: Profil berubah di tengah plan
- **WHEN** owner mengubah config Page sebelum item berikutnya dikerjakan
- **THEN** plugin membaca context terbaru, meninjau kecocokan item pending atau in-progress, dan melaporkan intent yang tidak lagi sah tanpa mengubah item completed atau beralih profil secara diam-diam

### Requirement: TDW-13 Setujui terpisah dan memeriksa versi tepat

`approve_post` MUST memerlukan perintah pemilik atas revision/hash yang ditinjau dan memeriksa state terkini secara atomik. Page aktif, binding, URL, identitas/reuse, jumlah/format/batas keras, dan tiga editorial `pass` terkini MUST lulus. Setujui MUST NOT meneliti ulang semua URL, menuntut tier/expiry v2, atau memublikasikan post. Untuk config versi 2, gate MUST memeriksa aturan dan binding editorial yang sah tanpa mengganti snapshot tersimpan dengan versi katalog terbaru secara otomatis.

#### Scenario: Draft lulus dan owner menyetujui versi tepat
- **WHEN** seluruh syarat wajib lulus dan pemilik memberi perintah Setujui untuk revision/hash yang telah dibaca
- **THEN** post menjadi `ready` tanpa riset ulang URL atau publikasi otomatis

#### Scenario: Persetujuan stale atau ada masalah wajib
- **WHEN** revision/hash berubah atau pemeriksaan wajib tidak lulus
- **THEN** Setujui ditolak, masalah dijelaskan, dan status tidak dipaksa menjadi `ready`

#### Scenario: Katalog bertambah tanpa perubahan Page
- **WHEN** versi profil baru dipublikasikan tetapi Page serta snapshot draft tetap terikat versi sebelumnya
- **THEN** approval menilai versi terikat tersebut dan tidak gagal hanya karena ada versi baru

#### Scenario: Page mengadopsi profil yang berbeda
- **WHEN** owner mengganti binding profil Page sehingga draft lama tidak lagi cocok dengan aturan efektif
- **THEN** gate menjelaskan perlunya review/revisi pada post yang sama tanpa memindahkan snapshot, mengarang approval, atau menulis ulang riwayat secara otomatis
