# Spec Delta

## Purpose

Menyediakan katalog editorial milik workspace agar owner dapat mengembangkan format, topik, dan profil DNA melalui data tervalidasi tanpa perubahan kode selama struktur konten trivia yang didukung tetap sama.

## ADDED Requirements

### Requirement: TEC-01 Definisi editorial mempunyai scope owner

Sistem SHALL menyediakan definisi format, topik, dan profil dengan key, versi, hash, dan identitas workspace. Seluruh pembacaan dan perubahan MUST mengikuti owner OAuth, isolasi workspace, serta grant default-closed.

#### Scenario: Owner membaca katalognya
- **WHEN** owner meminta daftar format atau definisi tertentu
- **THEN** sistem mengembalikan hanya definisi workspace yang berhak diakses beserta versi, hash, status pemilihan, dan pagination yang lengkap

#### Scenario: Caller memakai identitas workspace lain
- **WHEN** caller mencoba membaca atau memublikasikan definisi workspace owner lain
- **THEN** sistem menolak tanpa membocorkan definisi atau menimbulkan perubahan

### Requirement: TEC-02 Format baru dapat ditambahkan sebagai data

Owner SHALL dapat mendaftarkan format baru yang memakai struktur hook–facts–CTA melalui tool katalog yang sama. Format yang sah MUST tersedia bagi pemilihan Page tanpa pengeditan source, migration baru, build ulang plugin, atau deployment tambahan.

#### Scenario: Menambahkan historical curiosities
- **WHEN** owner memublikasikan format baru dengan key baru, definisi, architecture yang didukung, panduan, dan contoh yang sah
- **THEN** format dapat dipilih pada config Page dan digunakan untuk save/readback tanpa penambahan enum atau handler khusus nama tersebut

#### Scenario: Format memakai CTA di antara fakta
- **WHEN** format config2 memakai penempatan CTA setelah posisi fakta tertentu yang didukung renderer
- **THEN** format tetap memakai komponen hook, fakta, dan CTA yang sah tanpa handler baru atau kewajiban CTA berada paling akhir

#### Scenario: Nama baru tanpa registrasi
- **WHEN** draft atau Page merujuk key yang belum terdaftar di workspace
- **THEN** sistem menolak referensi tersebut; penerimaan key berbentuk string tidak berarti seluruh key otomatis diizinkan

### Requirement: TEC-03 Katalog tidak mengeksekusi kemampuan baru

Definisi katalog MUST berupa data terbatas yang mengikuti schema yang didukung. Definisi MUST NOT memuat kode executable atau mengubah otorisasi, riset sumber, dedup, approval, batas mesin, maupun struktur payload di luar kontrak trivia.

#### Scenario: Definisi meminta kuis interaktif
- **WHEN** format memerlukan input jawaban, scoring, atau struktur selain hook–facts–CTA yang belum didukung
- **THEN** registrasi ditolak dengan penjelasan bahwa kemampuan tersebut memerlukan perubahan sistem

#### Scenario: Panduan mencoba melewati sumber
- **WHEN** teks contoh atau panduan menyuruh penulis mengabaikan sumber, owner scope, atau batas sistem
- **THEN** panduan diperlakukan sebagai data tak tepercaya dan tidak mengubah aturan wajib workflow

### Requirement: TEC-04 Perubahan menerbitkan versi immutable

Perubahan definisi SHALL menghasilkan versi baru dengan hash baru. Isi versi yang sudah dipublikasikan MUST immutable dan tetap dapat dibaca melalui referensi versi tepat; penerbitan versi baru MUST NOT mengganti referensi Page atau post secara otomatis.

#### Scenario: Profil DYK diperbarui
- **WHEN** owner memublikasikan versi kedua profil DYK
- **THEN** versi pertama tetap utuh dan Page yang terikat versi pertama tidak berpindah sampai ada update Page yang sah

#### Scenario: Definisi yang dirujuk ingin dihapus
- **WHEN** owner meminta penghapusan versi yang mempunyai referensi tersimpan
- **THEN** sistem tidak menghapus isi atau merusak riwayat; mekanisme retirement tersedia untuk membatasi pemilihan baru

### Requirement: TEC-05 Penulisan katalog memakai CAS dan replay

Mutasi katalog SHALL memerlukan operation key, versi katalog editorial yang diharapkan, dan versi definisi sebelumnya bila relevan. Operasi MUST atomik dan replay identik MUST mengembalikan hasil tersimpan tanpa membuat versi kedua.

#### Scenario: Dua perubahan bersamaan
- **WHEN** dua request memublikasikan definisi berdasarkan versi katalog editorial yang sama
- **THEN** hanya perubahan yang memenuhi CAS dapat commit dan request stale ditolak tanpa versi parsial

#### Scenario: Respons publish hilang
- **WHEN** operasi telah commit tetapi owner mengirim replay dengan key dan payload semantik identik
- **THEN** sistem mengembalikan versi serta hash hasil operasi pertama tanpa publikasi tambahan

### Requirement: TEC-06 Retirement menjaga pemakaian yang sudah terikat

Retirement SHALL menutup versi definisi dari pemilihan atau pengikatan baru. Referensi yang sudah sah MUST tetap dapat dibaca dan digunakan sesuai binding sebelumnya; retirement MUST NOT membatalkan post, approval, atau Page yang sudah terikat secara diam-diam.

#### Scenario: Versi retired dipilih Page baru
- **WHEN** owner mencoba mengikat Page baru ke versi yang sudah retired
- **THEN** sistem menolak pilihan itu dan menawarkan pembacaan versi aktif yang sesuai

#### Scenario: Page lama tetap memakai versi retired
- **WHEN** Page sudah terikat versi itu sebelum retirement dan tidak mengubah binding
- **THEN** Page dan post historis tetap dapat memakai binding tersebut; penghentian produksi Page memerlukan tindakan eksplisit terpisah

### Requirement: TEC-07 Dimensi editorial dibedakan

Definisi format SHALL membedakan architecture koleksi, mekanisme penyampaian, manfaat pembaca, dan preferensi kepadatan. Sistem MUST mendukung single-subject, themed, dan mixed tanpa mewajibkan semua variasi tema menjadi format baru.

#### Scenario: Sebab-akibat ekologis
- **WHEN** profil memilih koleksi bertema dengan mekanisme consequence
- **THEN** fakta ekologis dapat disusun sebab-akibat tanpa dipaksakan menjadi tips, comparison, atau satu spesies

#### Scenario: Myth-busting satu makanan
- **WHEN** sebuah koleksi memakai satu subjek dan koreksi miskonsepsi
- **THEN** kedua dimensi itu dapat dinyatakan bersamaan tanpa dianggap sebagai pilihan yang saling meniadakan

### Requirement: TEC-08 Key dan bobot tidak bergantung daftar tetap

Pilihan format, topik, dan bobot SHALL mengacu pada definisi katalog yang terdaftar. Bobot MUST memakai key yang diizinkan, bernilai nonnegatif, dan mempunyai total yang sah; key berbobot nol tetap dapat dipilih eksplisit bila diizinkan.

#### Scenario: Format keenam diberi bobot
- **WHEN** owner menambahkan key format baru ke daftar Page beserta bobotnya
- **THEN** validator menerima key terdaftar tanpa meminta lima nama lama sebagai satu-satunya bentuk bobot

#### Scenario: Bobot menunjuk format yang tidak diizinkan
- **WHEN** bobot berisi key tidak dikenal, key di luar allowed choices, atau total tidak sah
- **THEN** config ditolak tanpa menyimpan config sebagian

### Requirement: TEC-09 Read bounded tetap lengkap

Read katalog SHALL menyediakan filter kind/key/version, pagination, dan batas ukuran yang eksplisit. Generation context MUST memuat definisi serta preferensi yang diperlukan untuk Page terpilih tanpa memotong diam-diam aturan atau contoh yang dinyatakan lengkap.

#### Scenario: Katalog besar
- **WHEN** jumlah definisi atau contoh melampaui satu halaman respons
- **THEN** respons memberi cursor dan penanda kelengkapan sehingga plugin dapat mengambil bagian yang diperlukan tanpa menganggap bagian terpotong sebagai katalog utuh

### Requirement: TEC-10 Katalog editorial terpisah dari katalog fakta

Versi katalog editorial SHALL mempunyai identitas terpisah dari `expected_catalog_version` dedup fakta. Publikasi definisi yang tidak dirujuk MUST NOT menyebabkan stale pada save yang memakai profil immutable dan config Page yang tetap sama.

#### Scenario: Format lain dipublikasikan saat riset
- **WHEN** owner menambahkan format yang tidak dipakai Page sementara draft memakai binding versi tepat yang masih sama
- **THEN** draft tidak gagal hanya karena nomor katalog editorial berubah; CAS config, binding editorial, dan katalog fakta tetap diperiksa menurut kontraknya

### Requirement: TEC-11 Seed dan kompatibilitas aman

Sistem SHALL menyediakan definisi awal yang mengenali lima format lama, koleksi curiosity bertema/campuran, dan topik ketiga dataset. Seed MUST idempotent, tidak menimpa definisi owner, serta tidak otomatis mengganti config atau konten Page lama.

#### Scenario: Seed diulang
- **WHEN** instalasi mengulang seed yang identik
- **THEN** tidak ada duplikasi versi atau penggantian definisi owner dan Page lama tetap memakai konfigurasi sebelumnya

### Requirement: TEC-12 Perubahan katalog mempunyai scope izin tersendiri

Instruksi menulis draft MUST NOT otomatis mengizinkan publikasi definisi, retirement, atau pergantian profil Page. Tool katalog Write SHALL dijalankan hanya untuk perubahan yang diminta owner dengan objek dan payload yang dapat ditinjau.

#### Scenario: Format tidak tersedia saat membuat draft
- **WHEN** plugin tidak menemukan pemetaan yang sah untuk permintaan draft
- **THEN** plugin melaporkan keterbatasan tanpa menambahkan format atau mengubah config diam-diam
