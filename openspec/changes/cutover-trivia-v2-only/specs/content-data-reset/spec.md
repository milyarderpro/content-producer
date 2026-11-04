# Spec Delta

## Purpose

Menetapkan keadaan konten produk yang kosong dan dapat dibuktikan, sambil mempertahankan identitas pemilik serta konfigurasi Page untuk memulai v2 dari awal.

## ADDED Requirements

### Requirement: Seluruh konten produk pemilik dikosongkan
Setelah reset production berhasil, sistem MUST tidak lagi menyimpan post, fakta, evidence, binding, plan, item plan, metrik, reservasi, atau riwayat dan snapshot operasi konten lama milik pemilik, baik v1 maupun v2.

#### Scenario: Pemeriksaan keadaan kosong
- **WHEN** seluruh tabel dan referensi konten pemilik diperiksa setelah reset
- **THEN** jumlah konten aktif dan turunan historisnya adalah nol

#### Scenario: Pemilik meminta konten lama
- **WHEN** pemilik meminta post, fakta, atau plan yang termasuk dalam reset
- **THEN** sistem tidak menampilkan konten itu dan tidak membuat pengganti otomatis

### Requirement: Identitas dan pengaturan tetap utuh
Reset MUST mempertahankan akun dan koneksi OAuth pemilik, workspace, Page, niche, serta konfigurasi Page dengan ID dan nilai yang sama.

#### Scenario: Koneksi pemilik sesudah reset
- **WHEN** pemilik memakai koneksi yang telah ada sesudah reset
- **THEN** workspace dan Page yang sama tetap tersedia tanpa setup ulang

#### Scenario: Perbandingan pengaturan Page
- **WHEN** identitas dan konfigurasi Page dibandingkan sebelum dan sesudah reset
- **THEN** ID, status, locale, niche, aturan, dan waktu pembaruan yang tidak diminta berubah tetap sama

### Requirement: Reset gagal tertutup
Reset MUST membatalkan seluruh penghapusan jika scope pemilik, cakupan data, referensi, pekerjaan aktif, backup, atau pemeriksaan wajib tidak sesuai.

#### Scenario: Data berubah sebelum reset
- **WHEN** inventaris terbaru menunjukkan konten atau referensi di luar scope yang disetujui
- **THEN** reset berhenti tanpa menghapus sebagian data dan perbedaannya dilaporkan

#### Scenario: Satu langkah penghapusan gagal
- **WHEN** satu penghapusan atau pemeriksaan akhir gagal di dalam transaksi reset
- **THEN** semua perubahan data dalam transaksi itu dibatalkan

### Requirement: V2 dapat dimulai dari Page yang dipertahankan
Setelah cutover dan reset, pemilik SHALL dapat membuat konten trivia v2 pada Page yang sama melalui izin dan pemeriksaan yang berlaku.

#### Scenario: Draft baru dari keadaan kosong
- **WHEN** pemilik meminta draft v2 pada Page yang dipertahankan dengan data yang sah
- **THEN** draft dapat disimpan dan dibaca ulang tanpa bergantung pada konten lama

### Requirement: Bukti reset dapat diaudit
Laporan reset MUST mencatat cakupan, backup, hitungan sebelum dan sesudah, perbandingan data yang dipertahankan, serta batas pemulihan tanpa mengklaim uji yang belum dilakukan.

#### Scenario: Operator menyatakan reset selesai
- **WHEN** reset production dilaporkan selesai
- **THEN** laporan memisahkan bukti database live, gate CI, runtime terpasang, dan uji host v2
