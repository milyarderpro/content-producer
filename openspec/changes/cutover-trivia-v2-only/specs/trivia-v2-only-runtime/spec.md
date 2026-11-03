# Spec Delta

## Purpose

Menjadikan trivia v2 satu-satunya alur konten yang dapat digunakan setelah cutover, tanpa mengubah kontrak alat umum yang tetap diperlukan pemilik.

## ADDED Requirements

### Requirement: Katalog hanya menawarkan alur konten v2
Katalog MCP MUST tidak menawarkan tool khusus pencarian, reservasi, penyimpanan, atau revisi trivia v1; tool v2 dan tool umum yang diperlukan v2 MUST tetap tersedia.

#### Scenario: Katalog diperiksa
- **WHEN** host meminta daftar tool setelah cutover
- **THEN** lima tool khusus v1 tidak ada, sedangkan tool v2 dan tool umum tetap ada

#### Scenario: Plugin lama memanggil tool v1
- **WHEN** plugin lama memanggil nama tool konten v1 yang dipensiunkan
- **THEN** panggilan ditolak tanpa membaca atau mengubah konten

### Requirement: Operasi konten v1 tertutup pada backend
Backend MUST menolak jalur RPC, payload, replay, dan operasi pemeliharaan khusus konten trivia v1, termasuk permintaan yang sedang berlangsung saat cutover, tanpa mengubah konten v2.

#### Scenario: RPC v1 dipanggil langsung
- **WHEN** caller mencoba membuat, mencari, mereservasi, merevisi, atau mengelola konten melalui kontrak trivia v1
- **THEN** operasi gagal tanpa membuat atau mengubah konten

#### Scenario: Replay v1 sesudah reset
- **WHEN** caller mengirim ulang operation key dari operasi v1 lama
- **THEN** operasi tidak memulihkan konten yang telah dikosongkan

#### Scenario: Write v1 bersamaan dengan cutover
- **WHEN** satu write v1 belum selesai saat reset dimulai
- **THEN** write itu tidak dapat menghasilkan konten v1 setelah reset dinyatakan selesai

### Requirement: Tool umum tetap kompatibel untuk v2
Tool akun, workspace, Page, plan, lifecycle, dan metrik SHALL mempertahankan kontrak request/response yang masih dipakai v2, termasuk nomor versi permintaan saat ini.

#### Scenario: Pemilik memakai Page yang sama
- **WHEN** pemilik memakai input tool umum yang sah untuk Page yang dipertahankan
- **THEN** tool menerima input itu dan dapat mengelola konten v2 baru sesuai izin

### Requirement: Plugin terbaru hanya memakai v2
Plugin Content Producer MUST memakai alur trivia v2 untuk dedup, save, revise, dan readback, tanpa fallback atau pengelolaan konten v1.

#### Scenario: Draft v2 pertama
- **WHEN** pemilik meminta draft baru setelah reset pada Page yang dipertahankan
- **THEN** plugin memakai tool v2 dan membaca kembali hasil yang tersimpan

#### Scenario: Pemilik meminta post yang dihapus
- **WHEN** pemilik meminta pengelolaan post lama yang termasuk reset
- **THEN** plugin menjelaskan konten itu tidak tersedia tanpa merekayasa atau memulihkannya otomatis

### Requirement: Bukti cutover membedakan gate dan runtime live
Rilis MUST diverifikasi dengan gate exact-SHA, penolakan v1, keamanan owner, dan pemeriksaan v2 pada runtime terpasang; hasil yang belum dijalankan MUST tidak diberi status PASS.

#### Scenario: Gate belum lengkap
- **WHEN** aggregate G4 exact-SHA belum PASS
- **THEN** cutover backend dan reset production tidak dijalankan

#### Scenario: Retest sesudah rilis
- **WHEN** backend dan plugin terbaru telah terpasang
- **THEN** laporan memisahkan SHA source, versi terpasang, hasil database live, dan hasil host v2
