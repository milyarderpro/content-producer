# Spec Delta — Tool diagnostics

## Purpose

Memastikan seluruh tool memberi kegagalan yang dapat dipahami dan ditindaklanjuti
tanpa membocorkan rahasia atau menyesatkan tentang hasil perubahan data. Kebutuhan
ini berlaku lintas versi dan tidak dibatasi pada tiga tool draft v2.

## ADDED Requirements

### Requirement: TDX-01 Seluruh tool tercakup oleh diagnostik

Setiap tool Read/Write yang tersedia SHALL memiliki diagnostik untuk lapisan
input, akses, domain, rate limit, transport, dan output yang berlaku. Inventaris
SHALL mengikuti katalog aktual, termasuk v1 selama transisi. Penyelesaian proyek
MUST mencakup seluruh tool, bukan hanya kelompok internal D1.

#### Scenario: Tool baru ditambahkan selama transisi

- **WHEN** tiga tool v2 ditambahkan ke katalog yang masih mendukung v1
- **THEN** inventaris cakupan error mencakup semua tool aktual dan tidak berhenti pada baseline 33

#### Scenario: Hanya diagnostik jalur draft selesai

- **WHEN** D1 selesai tetapi tool lain pada D2 belum tercakup
- **THEN** diagnostik seluruh tool dan proyek belum dinyatakan selesai, serta label D1/D2 tidak dianggap persetujuan rilis lebih awal

### Requirement: TDX-02 Kegagalan menyediakan konteks dan tindakan aman

Respons gagal yang sampai dari tool SHALL memuat kode stabil, penjelasan
sederhana, tool/tahap, keamanan retry, dan langkah perbaikan konkret. Lokasi
field/posisi MUST disertakan bila diketahui secara aman. Informasi yang tersedia
MUST NOT digantikan error umum tanpa lokasi atau tindakan yang relevan.

#### Scenario: URL fakta tertentu kosong

- **WHEN** validasi mengetahui bahwa sumber fakta ke-3 kosong
- **THEN** respons menunjuk fakta/field itu dan mengarahkan perbaikan URL, bukan hanya menyatakan input tidak valid

#### Scenario: Caption melebihi batas

- **WHEN** pemeriksaan mengetahui caption melewati budget
- **THEN** respons menunjuk caption dan batas/pelanggaran yang aman untuk membantu ChatGPT memperbaikinya

### Requirement: TDX-03 Kategori dan penyebab mengikuti bukti

Diagnostik MUST membedakan input, perubahan data/benturan, akses ditolak,
rate limit/gangguan sementara, dan kegagalan internal belum terdiagnosis.
Penyebab yang belum diketahui MUST NOT ditebak. Kegagalan unknown SHALL memberi
kategori/tahap yang diketahui, ID diagnostik aman, serta langkah pemeriksaan berikutnya.

#### Scenario: Gangguan internal belum terdiagnosis

- **WHEN** lapisan kegagalan diketahui tetapi akar sebab belum dapat ditentukan
- **THEN** respons menyatakan keterbatasan, memberi ID diagnostik yang dapat dicocokkan, dan tidak menuduh validator/domain tertentu tanpa bukti

#### Scenario: Gangguan output dapat dibedakan dari jaringan

- **WHEN** sistem mengetahui respons terlalu besar atau tidak sesuai schema
- **THEN** diagnostik mempertahankan tahap/kategori yang diketahui dan tidak merangkum semua kasus sebagai database tidak tersedia tanpa penjelasan

### Requirement: TDX-04 Kepastian hasil Write dinyatakan secara benar

Sistem SHALL membedakan penolakan sebelum operasi bisnis, rollback yang
dipastikan, dan hasil Write yang belum pasti setelah dispatch. Respons hilang,
oversize, atau output rusak MUST NOT dianggap bukti rollback bila commit belum
dapat disangkal. Recovery SHALL merekonsiliasi state sebelum operasi logis baru.

#### Scenario: Output tidak valid setelah save mungkin commit

- **WHEN** Write telah dikirim dan respons tidak dapat dipercaya atau hilang
- **THEN** pesan menyatakan hasil belum dapat dipastikan dan mengarahkan pembacaan state atau replay key/payload identik

#### Scenario: Penolakan pasti sebelum domain dijalankan

- **WHEN** input ditolak sebelum operasi bisnis dipanggil
- **THEN** respons dapat menyatakan tidak ada perubahan bisnis dari permintaan itu tanpa mengklaim gangguan commit

#### Scenario: Transaksi diketahui rollback

- **WHEN** sistem mempunyai bukti penolakan domain membatalkan transaksi
- **THEN** respons menjelaskan bagian yang gagal dan perbaikannya tanpa menyatakan draft parsial telah tersimpan

### Requirement: TDX-05 Recovery sesuai jenis kegagalan

Rate limit SHALL menyertakan waktu tunggu yang relevan. Konflik revision/hash
MUST meminta Read dan review baru. Akses ditolak MUST NOT menyarankan mencoba
owner lain. Replay Write MUST mempertahankan key/payload semantik yang sama;
retry MUST terbatas dan mengikuti state claim serta hasil rekonsiliasi.

#### Scenario: Rate limit

- **WHEN** tool menolak karena batas pemanggilan
- **THEN** respons menyebut waktu tunggu dan ChatGPT tidak menjalankan busy loop atau mengubah operation key untuk melewati batas

#### Scenario: Revision conflict

- **WHEN** revision atau content hash tidak cocok dengan state saat ini
- **THEN** respons meminta pembacaan dan peninjauan ulang, bukan overwrite otomatis

#### Scenario: Akses ditolak

- **WHEN** tool menolak akses karena scope/owner tidak sah
- **THEN** recovery menghentikan akses tersebut tanpa mengarahkan percobaan terhadap owner/resource lain

### Requirement: TDX-06 Diagnostik dan log melindungi data privat

Respons/log diagnostik MUST NOT memuat token, credential, operation key privat,
SQL mentah, payload atau sumber panjang, serta informasi resource owner lain.
ID diagnostik SHALL menghubungkan respons dengan konteks server tersanitasi tanpa
menjadikannya credential atau saluran pembocoran data.

#### Scenario: Error mentah berisi rahasia

- **WHEN** error upstream atau payload mempunyai token, SQL, URL privat panjang, atau data owner lain
- **THEN** respons dan log hanya memuat konteks yang diizinkan, kode/ID aman, serta recovery tanpa menyalin rahasia

#### Scenario: Menelusuri ID diagnostik

- **WHEN** operator mencocokkan ID dari respons unknown dengan log yang sah
- **THEN** kategori/tahap dapat ditelusuri pada konteks tersanitasi tanpa membutuhkan token atau operation key privat

### Requirement: TDX-07 Kompatibilitas error lintas versi dipertahankan

Error v1 yang masih didukung SHALL tetap kompatibel dengan plugin lama.
Taksonomi dan contoh request/response error MUST ditetapkan sebelum coding;
schema tertutup MUST NOT diberi field baru sembarangan. Respons v2 SHALL memakai
kontrak versi yang jelas tanpa membuat plugin v1 salah menafsirkan hasil.

#### Scenario: Plugin lama menerima kegagalan

- **WHEN** tool v1 gagal selama masa transisi
- **THEN** plugin lama tetap dapat memahami kontrak respons yang didukung dan tidak dipaksa membaca envelope v2

#### Scenario: Taksonomi belum dibekukan

- **WHEN** nama kode/field error final belum ditetapkan dalam kontrak contoh
- **THEN** implementasi mapping baru tidak mengimprovisasi kontrak berbeda per handler

### Requirement: TDX-08 Penolakan host dibedakan dari respons MCP

Jika host menolak sebelum tool berjalan, plugin SHALL menjelaskan bahwa operasi
belum mencapai MCP berdasarkan bukti yang tersedia. Sistem MUST NOT mengarang
`structuredContent`, kode domain, atau akar sebab database untuk respons yang
tidak pernah diterimanya.

#### Scenario: Host menolak pemanggilan

- **WHEN** pemanggilan tidak mencapai tool MCP karena kontrol host
- **THEN** ChatGPT menyebut batas host yang diketahui tanpa mengklaim menerima error transaksi atau hasil Write backend

### Requirement: TDX-09 Ringkasan Indonesia mempertahankan bukti progres

ChatGPT SHALL menjelaskan tool/tahap gagal, penyebab yang didukung, tindakan
yang telah dicoba, dan perubahan data yang terbukti melalui Read dalam bahasa
Indonesia. Ringkasan beberapa draft MUST memuat progres dari plan/readback,
bukan menyembunyikan error di balik "terjadi kendala" atau menebak jumlah sukses.

#### Scenario: Draft keempat gagal setelah tiga draft terbukti

- **WHEN** plan dan readback membuktikan tiga draft sukses sebelum kegagalan item keempat
- **THEN** ringkasan menyebut tiga hasil/ID yang terbukti, ID plan, tahap serta error relevan, tindakan yang sudah dicoba, dan pekerjaan tersisa

#### Scenario: Penyebab belum diketahui

- **WHEN** tool hanya memberi kategori/tahap dan ID diagnostik aman
- **THEN** ChatGPT menerangkan ketidakpastian tersebut dan langkah berikutnya tanpa mengarang akar sebab

### Requirement: TDX-10 Cakupan error dapat diaudit per tool dan lapisan

Bukti verifikasi SHALL memetakan setiap tool aktual ke kasus error yang berlaku,
recovery, dan pemeriksaan kebocoran. Kasus tidak berlaku MUST mempunyai alasan.
Input salah, benturan, owner denial, rate limit, response loss, oversize/schema
output, dan unknown MUST tercakup secara relevan tanpa menyamakan CI dengan bukti LIVE.

#### Scenario: Meninjau kelengkapan diagnostik

- **WHEN** hasil verifikasi seluruh tool dinilai
- **THEN** inventaris, kasus, alasan pengecualian, hasil uji, serta batas bukti dapat diperiksa dan tool yang belum tercakup tidak ditandai PASS

#### Scenario: CI lulus tetapi alur host belum diuji

- **WHEN** test fixture/CI lulus tanpa retest host yang relevan
- **THEN** laporan tetap membedakan CI/FIXTURE dari LIVE dan tidak menyatakan masalah live FIXED hanya dari hasil tersebut
