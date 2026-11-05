# Spec Delta

## MODIFIED Requirements

### Requirement: TFL-04 Identitas canonical dan pemetaan v1 tetap satu

Sistem SHALL memakai satu registry canonical untuk fakta v2 setelah reset. Jika kecocokan ditemukan dan kesamaan makna diputuskan, calon MUST merujuk identitas canonical yang sama; ini tidak menjamin semua parafrasa terdeteksi. Proposisi berbeda MUST NOT digabung hanya karena subjek sama. Pemetaan ID v1 historis tidak lagi menjadi syarat operasi setelah konten lama dihapus.

#### Scenario: Parafrasa ditemukan dan diputuskan same

- **WHEN** ChatGPT memutuskan bahwa calon mempunyai makna sama dengan fakta v2 yang ditemukan
- **THEN** calon merujuk identitas canonical yang ada, bukan membuat identitas baru untuk menghindari reuse

#### Scenario: Batas klaim saat parafrasa tidak ditemukan

- **WHEN** Read lengkap menurut aturan retrieval tidak menemukan suatu parafrasa dari fakta lama yang masih tersimpan
- **THEN** hasil hanya menyatakan tidak ada duplikasi yang terdeteksi, bukan menjamin semua parafrasa ditemukan atau seluruh identitas semantik sudah tersatukan

#### Scenario: Dua proposisi tentang subjek sama

- **WHEN** dua klaim menyebut subjek sama tetapi memiliki perbedaan makna material
- **THEN** sistem mempertahankan identitas yang berbeda sesuai keputusan dedup yang sah

### Requirement: TFL-05 Status historis dibedakan dari kelayakan reuse

Pencarian SHALL mencakup fakta dan pemakaian v2 yang masih tersimpan, termasuk published. Fakta invalidated, superseded, atau rejected tetap petunjuk riwayat, bukan layak pakai. Calon yang ditemukan dan diputuskan `same` dengan fakta itu MUST diganti; identitas lama MUST NOT dipakai dan ID baru MUST NOT dibuat untuk melewati riwayatnya. Fakta v1 yang dihapus tidak lagi menjadi sumber riwayat runtime.

#### Scenario: Fakta invalidated pernah digunakan

- **WHEN** calon mirip dengan fakta v2 yang masih tersimpan dan sudah invalidated
- **THEN** pencarian memperlihatkan petunjuk riwayat dan status tidak layaknya, bukan menyembunyikannya sebagai fakta yang tidak pernah digunakan

#### Scenario: Calon same dengan fakta lama yang tidak layak

- **WHEN** calon ditemukan dan diputuskan bermakna sama dengan fakta tersimpan berstatus invalidated, superseded, atau rejected
- **THEN** ChatGPT mengganti calon, tidak memakai identitas yang tidak layak, dan tidak membuat ID baru untuk melewati riwayat fakta tersebut

#### Scenario: Identitas v1 hanya kedaluwarsa

- **WHEN** reset telah menghapus fakta v1 dan referensinya
- **THEN** pencarian baru tidak mengklaim fakta v1 masih ada atau merekayasa petunjuk riwayatnya

### Requirement: TFL-10 Alokasi atomik menegakkan scope reuse

Sistem MUST memeriksa dan mengalokasikan identitas di dalam transaksi save yang sama sehingga dua penggunaan serentak pada scope terlarang tidak sama-sama berhasil. Draft teralokasi SHALL dihitung sebagai pemakaian. Scope MUST mengikuti `workspace_unique` atau `page_unique` dari konfigurasi Page untuk seluruh konten v2 yang tersimpan.

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

- **WHEN** reservasi, save, atau koreksi v1 lama bersaing dengan save v2
- **THEN** operasi v1 ditolak dan tidak dapat menghasilkan alokasi setelah reset selesai

### Requirement: TFL-12 Migrasi dan backfill mempertahankan data serta keamanan

Migration cutover SHALL mempertahankan rantai dan histori migration yang ada, serta keamanan owner/RLS/grant. Setelah backup dan reset production yang berhasil, data konten lama tidak wajib dipertahankan di runtime atau di-backfill lagi. Operasi v2 MUST tetap memakai identitas, snapshot, lock, CAS, dan idempotency yang benar.

#### Scenario: Rantai migration dijalankan pada instalasi bersih

- **WHEN** seluruh migration historis diikuti migration cutover dijalankan pada database bersih
- **THEN** schema v2 dapat dipakai dan RPC konten v1 tidak dapat diakses

#### Scenario: Backfill diulang

- **WHEN** backfill historis dijalankan ulang sebelum reset pada state yang sudah dipetakan
- **THEN** tidak ada identitas atau pemakaian ganda, dan snapshot historis tidak berubah

#### Scenario: Data v1 berubah setelah backfill awal

- **WHEN** write v1 yang masih didukung sebelum cutover mengubah identitas, status, atau pemakaian
- **THEN** pencarian dan pemeriksaan v2 melihat perubahan itu sampai operasi v1 ditutup dan konten direset

#### Scenario: Data v1 berubah setelah penutupan

- **WHEN** caller mencoba write v1 setelah migration cutover
- **THEN** write ditolak tanpa memperbarui identitas, status, atau pemakaian

#### Scenario: Scope owner tetap terlindungi

- **WHEN** caller bukan owner mencoba operasi v2 atau akses langsung tabel bisnis
- **THEN** RLS dan grant tetap menolak akses yang tidak sah
