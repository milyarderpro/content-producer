# Spec Delta

## MODIFIED Requirements

### Requirement: TDX-01 Seluruh tool tercakup oleh diagnostik

Setiap tool Read/Write yang tersedia SHALL memiliki diagnostik untuk lapisan input, akses, domain, rate limit, transport, dan output yang berlaku. Inventaris SHALL mengikuti katalog aktif setelah cutover; nama v1 yang dipensiunkan MUST ditolak dan tidak dihitung sebagai tool aktif. Penyelesaian proyek MUST mencakup seluruh tool aktif, bukan hanya kelompok draft.

#### Scenario: Tool baru ditambahkan selama transisi

- **WHEN** katalog setelah cutover berisi 31 tool aktif
- **THEN** cakupan diagnostik meliputi semua 31 tool dan lima nama v1 absen atau ditolak

#### Scenario: Hanya diagnostik jalur draft selesai

- **WHEN** diagnostik jalur draft selesai tetapi tool umum lain belum tercakup
- **THEN** diagnostik seluruh tool dan proyek belum dinyatakan selesai

### Requirement: TDX-07 Kompatibilitas error lintas versi dipertahankan

Error tool yang tetap aktif SHALL mengikuti envelope dan versi kontrak masing-masing; schema tertutup MUST NOT diberi field baru sembarangan. Nama tool v1 yang dipensiunkan MUST ditolak tanpa menjalankan operasi bisnis atau menjanjikan kompatibilitas envelope v1. Respons v2 SHALL memakai kontrak versi yang jelas.

#### Scenario: Plugin lama menerima kegagalan

- **WHEN** plugin lama memanggil tool v1 yang telah dipensiunkan
- **THEN** panggilan ditolak sebelum operasi bisnis tanpa mengharuskan plugin lama memahami envelope v2

#### Scenario: Tool umum gagal saat mengelola v2

- **WHEN** tool umum aktif gagal pada input konten v2
- **THEN** respons mengikuti kontrak tool umum saat ini dan diagnostik aman yang berlaku

#### Scenario: Taksonomi belum dibekukan

- **WHEN** nama kode/field error final belum ditetapkan dalam kontrak contoh
- **THEN** implementasi mapping baru tidak mengimprovisasi kontrak berbeda per handler
