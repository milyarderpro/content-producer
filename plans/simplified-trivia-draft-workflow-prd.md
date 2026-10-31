# PRD — Alur draft trivia sederhana

## 1. Informasi dokumen

| Bagian | Keterangan |
| --- | --- |
| Produk | Content Producer, niche `trivia` |
| Status | Usulan kebutuhan produk; belum diimplementasikan atau diuji live |
| Tanggal | 29 Oktober 2026 |
| Pengguna utama | Pemilik yang mengelola beberapa Facebook Page melalui plugin PRIVATE ChatGPT |
| Bahasa dokumen | Indonesia |
| Bahasa konten trivia | `en-US`, sesuai konfigurasi yang berlaku |
| Acuan pelaksanaan | [Rencana implementasi alur draft sederhana](simplified-trivia-draft-workflow-implementation-plan.md) |
| Baseline source yang ditinjau | GitHub `main` `d3f62d02955de12922d8e9e405f0ce8cb22b0c8c`; ini bukan bukti versi production terpasang |

Dokumen ini menyatakan **hasil dan batas produk yang dituju** berdasarkan keputusan pemilik dalam percakapan 28–29 Oktober 2026 dan audit ulang source. [Rencana implementasi](simplified-trivia-draft-workflow-implementation-plan.md) memecahnya menjadi pekerjaan teknis dan urutan verifikasi. Bila kedua dokumen tampak berbeda, hasil produk dalam PRD ini menjadi acuan desain; kontrak frozen yang berlaku sekarang baru berubah setelah change record diterima. `plans/PRD.md` dan kontrak lain dalam `plans/` tetap merupakan baseline frozen sampai perubahan yang tepat dicatat dalam `docs/decisions/`. Dokumen ini tidak memberi izin deploy, mutasi data production, perubahan plugin terpasang, atau pengujian business Write pada data nyata.

## 2. Masalah dan tujuan

### Masalah saat ini

Pemilik ingin meminta satu atau beberapa draft trivia melalui percakapan biasa, tetapi alur sekarang sering berhenti sebelum draft tersimpan. ChatGPT harus mengisi struktur fakta, klasifikasi dan paket sumber yang rinci, meninjau banyak kandidat duplikat, mereservasi seluruh set fakta, lalu mengirim payload penyimpanan yang harus cocok persis. Satu fakta yang gagal dapat menggagalkan seluruh set. Pesan error dan hasil pencarian yang panjang belum selalu cukup membantu ChatGPT memperbaiki masalah dalam percakapan yang sama.

Bukti masalah live harus tetap dinilai per kejadian. Pada catatan Issue #26 historis, proses berhenti di dedup Read; `trivia_register_and_reserve_facts` dan `save_post` tidak terpanggil. Dokumen ini tidak menyimpulkan bahwa semua kegagalan punya akar sebab yang sama.

### Tujuan produk

Satu instruksi pemilik menghasilkan **jumlah draft yang diminta**, tersimpan dan dapat dibaca kembali satu per satu, jika tersedia cukup fakta yang dapat dipakai dan operasi diizinkan. Instruksi dapat menyebut Page, jumlah draft, serta tema atau batasan topik. Contoh “pilih Page A, buat satu draft post baru” dan “pilih Page A, buat lima draft post baru topik tentang food and home” bukan format perintah wajib, Page tetap, atau batas jumlah. ChatGPT meneliti calon fakta, mencari kemungkinan duplikat sebelum menulis copy final untuk setiap draft, mengganti calon bermasalah, memperbaiki naskah yang melampaui batas, dan menangani benturan penyimpanan dalam percakapan yang sama. Pemilik meninjau hasil dan secara terpisah memerintahkan Setujui bila sudah cocok.

Keberhasilan berarti **setiap draft yang diminta** benar-benar ada di database, dengan Page, fakta, URL, copy, status, serta revision yang sesuai hasil `get_post`. Teks yang hanya muncul di chat belum merupakan draft tersimpan. Jika hanya sebagian tersimpan, hasilnya dilaporkan sebagai sebagian selesai, bukan keberhasilan penuh.

## 3. Prinsip produk

1. **Sederhana bagi pemilik dan ChatGPT.** Untuk setiap fakta final, input sumber wajib cukup kalimat fakta dan **satu URL** yang mendukungnya. Tidak ada kewajiban mengisi `tier`, `source_type`, judul, penerbit, `independence_group`, `risk_class`, `freshness_class`, tanggal kedaluwarsa, atau paket bukti rinci pada alur baru.
2. **Riset dilakukan saat memilih fakta.** ChatGPT membuka dan menilai sumber pada tahap riset. URL yang tersimpan adalah jejak rujukan, bukan bukti otomatis bahwa klaim benar. `approve_post` tidak membuka atau meneliti ulang semua URL. Catatan dukungan pendek boleh dibuat bila membantu, tetapi bukan syarat simpan atau Setujui.
3. **Cegah pengulangan sebelum menulis.** Pencarian fakta lama dilakukan sebelum copy final. Kesamaan makna dinilai dari klaim, bukan sekadar kata atau URL yang sama. Calon yang jelas sudah dipakai atau masih meragukan diganti otomatis dengan calon lain.
4. **Satu makna, satu identitas fakta yang dikenali.** Perubahan gaya kalimat tidak membuat identitas baru. Fakta lama dan fakta baru berada dalam satu pandangan pencarian serta pemakaian ulang. Dua fakta tentang subjek sama tidak digabung jika proposisinya berbeda.
5. **Simpan utuh atau gagal utuh.** Pendaftaran atau pemilihan identitas, cek pemakaian ulang, pengaitan fakta, dan penyimpanan draft terjadi dalam satu transaksi. Alur baru tidak memerlukan panggilan `trivia_register_and_reserve_facts` yang terpisah sebelum `save_post_v2`.
6. **Setujui berarti masalah yang diketahui sudah selesai.** Sistem menolak persetujuan bila pemeriksaan wajib yang dapat ditegakkan masih gagal. Saran gaya yang tidak menghalangi ditampilkan terpisah. Setujui tidak memublikasikan post.
7. **Bahasa publik tetap natural.** Tidak ada kewajiban menulis tahun atau frasa akademik di setiap kalimat fakta. Bila sebuah klaim membutuhkan konteks waktu panjang agar tidak menyesatkan, ChatGPT memilih sudut kalimat atau fakta lain yang tetap akurat dan singkat.
8. **Semua topik Page memakai alur umum.** Topik kesehatan, keselamatan, hukum, dan keuangan tidak otomatis dilarang atau diberi jalur sumber khusus hanya karena kategorinya. ChatGPT tetap harus menulis klaim yang akurat dan mematuhi kebijakan keselamatan umum.
9. **Jujur tentang batas otomatisasi.** Pencarian dapat melewatkan parafrasa tertentu. Produk hanya menyatakan “tidak ada duplikasi yang terdeteksi”, bukan menjamin bebas duplikasi 100% atau membuktikan seluruh URL benar tanpa pemeriksaan manusia.
10. **Jumlah dan tema mengikuti permintaan.** Satu instruksi dapat meminta satu atau beberapa draft untuk Page tertentu, dengan tema seperti food and home. ChatGPT menghormati konfigurasi Page, menjaga variasi antardraft, dan memeriksa pemakaian fakta dari draft yang telah tersimpan dalam permintaan yang sama.
11. **Error harus membantu memperbaiki masalah.** Setiap tool yang gagal menjelaskan apa yang diketahui, di tahap mana kegagalan terjadi, bagian mana yang terdampak bila dapat ditentukan, dan langkah aman berikutnya. Pemilik menerima ringkasan dalam bahasa Indonesia; kode teknis tetap tersedia untuk penelusuran.

## 4. Alur pengguna dari awal sampai akhir

| Langkah | Perilaku yang diharapkan | Bukti/hasil yang terlihat |
| --- | --- | --- |
| 1. Pahami permintaan dan Page | ChatGPT mengenali Page, jumlah draft, tema atau batasan topik, workspace owner, niche, dan konfigurasi terbaru. Bila sasaran penting ambigu, minta penjelasan sebelum Write. Tema dipetakan ke topik yang diizinkan Page. Untuk dua draft atau lebih, buat satu content plan tanpa jadwal. | Sasaran pekerjaan jelas, termasuk jumlah draft, Page, tema, jumlah fakta per draft, format, reuse scope, bahasa, dan batas naskah; permintaan multi-draft mempunyai ID plan. |
| 2. Riset calon per draft | Untuk plan, ChatGPT mengklaim satu item sebelum mengerjakan draft itu. ChatGPT meneliti **lebih banyak calon daripada jumlah fakta final pada draft tersebut**; contoh target tujuh fakta dapat dimulai dengan sembilan atau sepuluh calon, bukan angka wajib. Tiap calon memiliki kalimat dan URL. Beberapa draft diproses bertahap agar calon dan URL tidak tercampur. | Kumpulan calon dan cadangan yang cukup untuk draft yang sedang dikerjakan, tanpa fakta atau URL rekaan. Jika riset buntu, laporkan failure item yang diklaim dan progres plan. |
| 3. Cari kemungkinan duplikat | ChatGPT mengirim kalimat calon ke pencarian sederhana. Sistem mencari fakta lama dan baru, termasuk riwayat pemakaian yang relevan. | Kandidat ringkas: ID, klaim lama, status pemakaian pada scope Page/workspace, serta informasi yang cukup untuk menilai kesamaan. |
| 4. Pilih fakta final | ChatGPT menilai kandidat sebagai `same`, `distinct`, atau `uncertain`. Fakta `same` yang sudah dipakai dan fakta `uncertain` disisihkan; ChatGPT memilih cadangan atau meriset lagi. Fakta dengan makna sama di dalam set calon juga disingkirkan. | Jumlah fakta final sesuai konfigurasi Page dan tidak memuat duplikasi yang telah terdeteksi. |
| 5. Tulis naskah | Setelah set final dipilih, ChatGPT menulis hook, Canva copy, caption, hashtag, dan info internal. ChatGPT memeriksa panjang serta hubungan fakta dengan copy, lalu memperbaiki masalah yang jelas. | Copy kasual `en-US` yang siap ditinjau, dengan URL sebagai info internal dan bukan teks publik wajib. |
| 6. Simpan draft | `save_post_v2` memeriksa konteks terbaru, identitas fakta, penggunaan ulang, URL, dan batas keras; kemudian membuat post `draft` beserta seluruh fakta dalam satu transaksi. | Satu ID post atau error yang menunjuk fakta/bagian naskah dan tindakan perbaikan. Tidak ada hasil parsial. |
| 7. Pulihkan bila perlu | Jika ada benturan baru, ChatGPT mengganti fakta terkait dan memperbarui copy dalam chat yang sama. Jika respons Write hilang, ChatGPT membaca state atau mengulang **operation key dan payload semantik yang sama** sebelum mencoba operasi baru. Hormati rate limit dan claim yang kedaluwarsa. | Tidak ada draft ganda karena retry; kendala yang tidak dapat diselesaikan dilaporkan dengan jelas. |
| 8. Baca kembali dan lanjutkan | Setelah **setiap** simpan berhasil, ChatGPT memanggil `get_post`, mencatat ID dan fakta yang telah dipakai, lalu melanjutkan draft berikutnya hingga jumlah yang diminta terpenuhi. | Pemilik menerima daftar draft yang terbukti tersimpan dan masalah tersisa; fakta yang sudah dipakai tidak diulang pada draft berikutnya sesuai reuse scope. |
| 9. Revisi dan Setujui | Pemilik dapat meminta revisi. Revisi substansi memeriksa ulang fakta yang berubah; revisi `ready` kembali ke `draft`. Setujui hanya terjadi setelah perintah terpisah untuk versi/hash draft yang ditinjau. | `ready` hanya setelah semua pemeriksaan wajib lulus dan owner menyetujui versi tepat. |
| 10. Publikasikan dan catat performa | Pemilik membuat desain di Canva dan memublikasikan secara manual ke Facebook. Setelah peristiwa nyata dikonfirmasi, sistem mencatat `posted`; metrik dicatat manual bila tersedia. | Riwayat publikasi dan metrik nyata tanpa pembuatan URL/ID/angka fiktif. |

Jika calon aman tidak cukup atau tool tidak dapat diakses, ChatGPT melaporkan tahap yang berhenti, alasan spesifik, jumlah yang sudah tersimpan, ID post yang telah dibaca kembali, serta jumlah yang belum selesai. Draft yang berhasil tetap ada; kegagalan draft berikutnya tidak membatalkan hasil sebelumnya. Produk tidak mengklaim draft tersimpan tanpa readback dan tidak membuat draft tambahan di luar jumlah yang diminta.

## 5. Kebutuhan fungsional

### FR-01 — Konteks Page dan izin tindakan

- Alur dimulai dari koneksi owner OAuth `mcpku2` dan Page yang unik dalam workspace owner. Aturan reuse mengikuti `workspace_unique` atau `page_unique` dari konfigurasi Page.
- Target perilaku instruksi pemilik adalah izin terbatas untuk **membuat sebanyak jumlah draft yang diminta pada Page yang dipilih** dari fakta dan copy yang dihasilkan dalam alur tersebut. Untuk lebih dari satu draft, izin itu mencakup pembuatan content plan tanpa jadwal, claim/renew/failure item, dan penyimpanan draft yang terkait; ini tidak meliputi Setujui, discard, koreksi fakta, pencatatan publikasi, atau mutasi lain. Tidak ada draft tambahan di luar jumlah permintaan. Aturan izin saat ini harus diselaraskan melalui change record sebelum perilaku ini diaktifkan; dokumen PRD saja bukan grant Write.
- Bila jumlah tidak disebut tetapi permintaan berbentuk tunggal (“buat draft baru”), buat satu. Bila pemilik meminta “beberapa” tanpa angka, minta jumlahnya. Bila ada satu Page aktif yang jelas, gunakan Page itu; bila beberapa Page mungkin cocok, minta pilihan. Tema yang tidak disebut mengikuti konfigurasi Page. Jumlah dalam satu permintaan didukung hingga batas content plan yang berlaku (saat ini 100); permintaan di atas batas dijelaskan sebelum Write dan tidak dipotong diam-diam.
- Konteks konfigurasi diambil lagi tepat sebelum fact-bearing Write. Enam digit mikrodetik `config_updated_at` dipertahankan dalam transport.

### FR-02 — Sumber minimum

- Setiap fakta final pada alur v2 mengirim **tepat satu `source_url`** bersama kalimat fakta. URL berbentuk tautan web `http` atau `https` tanpa credential pada alamat, bukan `javascript:`, `data:`, atau alamat lokal; batas ukuran ditetapkan dalam kontrak teknis. Ini pemeriksaan bentuk URL, bukan pembuktian isi halaman. URL sama boleh mendukung beberapa fakta dan tidak berarti maknanya sama.
- ChatGPT menilai dukungan URL terhadap klaim saat riset. Jika sumber tidak mendukung, ganti sumber atau fakta sebelum simpan. Ketiadaan URL atau URL rusak ditunjukkan pada posisi fakta. Timestamp draft tidak boleh ditampilkan sebagai tanggal verifikasi sumber.
- Persetujuan tidak mewajibkan riset ulang URL. Fakta yang berubah makna saat revisi memerlukan riset dan URL baru untuk fakta tersebut; revisi membuat pemeriksaan editorial per draft yang lama kedaluwarsa sampai dinilai ulang untuk revision/hash baru. Riwayat sumber pada post lama tidak ditulis ulang diam-diam.

### FR-03 — Pencarian dan keputusan duplikasi

- Pencarian Read menerima Page dan kalimat calon, tanpa mewajibkan ChatGPT mengisi ontologi 17 `relation_key`, angka/qualifier terstruktur, atau review panjang hanya untuk mencari.
- Hasil menampilkan kemungkinan kesamaan lintas fakta v1 dan v2, termasuk fakta yang pernah dipakai. Status kelayakan dipakai ulang dibedakan dari status identitas atau riwayat; fakta lama yang dikoreksi/diinvalidasi tetap dapat menjadi petunjuk bahwa makna pernah digunakan, walaupun tidak layak dipakai lagi.
- ChatGPT memutuskan kesamaan makna kandidat yang terlihat. `same` memakai identitas lama bila layak dan belum terpakai pada scope yang berlaku; bila sudah terpakai, calon diganti. `distinct` hanya bila perbedaan maknanya material. `uncertain` diganti, tidak dipaksa menjadi `distinct`.
- Hasil pencarian mengembalikan `complete` dan versi katalog fakta workspace. `complete=false`, hasil terpotong, atau kandidat kuat yang belum selesai ditinjau **bukan** hasil bersih; ChatGPT mengganti calon itu dan mencari calon baru, tanpa memaksa review panjang. `complete=true` berarti seluruh kandidat yang diwajibkan oleh aturan retrieval pada versi katalog tersebut sudah ditampilkan, bukan jaminan semua parafrasa di dunia ditemukan. `save_post_v2` menolak versi katalog yang berubah sejak Read agar ChatGPT mencari ulang sebelum Write.
- Sebelum implementasi pencarian v2, tetapkan dataset berlabel dan ukuran keberhasilan untuk temuan parafrasa, salah gabung, serta hasil pada data lama. Tidak ada target 100% yang direkayasa setelah melihat hasil test.

### FR-04 — Simpan draft atomik

- `save_post_v2` menerima fakta final, masing-masing satu `source_url`, keputusan identitas ringkas yang diperlukan, copy, hasil editorial ringkas, Page, versi katalog dari Read, dan operation key. Satu transaksi menyelesaikan identitas canonical, cek versi katalog serta pemakaian ulang, alokasi, dan post `draft`. Jika katalog berubah, ChatGPT mencari ulang calon terkait; server tidak mengklaim memutuskan kesamaan semantik sendiri.
- Versi katalog workspace berubah setiap kali identitas fakta, status koreksi, atau alokasi pemakaian yang relevan berubah. Read mengembalikan versi itu; Write memeriksa versi yang sama di bawah lock workspace. Jika berubah, sistem mengembalikan konflik terarah dan tidak menyimpan sebagian. Kandidat yang terlihat sebagai `same` mengacu pada ID canonical yang sama; kandidat `uncertain` atau hasil Read belum lengkap tidak boleh dikirim sebagai fakta final.
- Dua simpan serentak atas fakta yang sama pada scope terlarang tidak boleh sama-sama berhasil. Draft yang sudah mengalokasikan fakta dihitung sebagai pemakaian. Discard melepaskan alokasi belum terbit; post terpublikasi tetap menjadi riwayat pemakaian.
- Error minimal menunjukkan posisi/bagian, kode, dan tindakan aman untuk fakta yang sudah dipakai, kemiripan yang belum diputuskan, URL hilang, teks terlalu panjang, perubahan katalog/konfigurasi, serta konflik/retry yang relevan. Nama kode final mengikuti taksonomi error v2 yang dibekukan sebelum coding; error tidak membocorkan rahasia atau payload privat panjang.
- Kegagalan satu fakta membatalkan **transaksi draft yang sedang dibuat**, bukan draft lain yang sudah tersimpan. Satu transaksi berhasil menghasilkan satu draft; tidak otomatis `ready`. Permintaan beberapa draft terdiri dari beberapa transaksi per draft dengan ID dan operation key masing-masing.

### FR-05 — Kualitas draft dan persetujuan

- Server menghitung metrik renderer dan batas keras secara resmi. ChatGPT memperbaiki copy yang terlalu panjang atau tidak sesuai sebelum menyimpan. Struktur salah, URL hilang/tidak berbentuk web, identitas/duplikasi belum selesai, jumlah fakta salah, serta batas keras teks **menolak `save_post_v2` tanpa membuat draft**. Draft yang berhasil boleh memiliki catatan gaya nonblocking; masalah substansi yang baru diketahui setelah simpan harus diperbaiki melalui revisi sebelum Setujui.
- ChatGPT melakukan tiga pemeriksaan editorial **per draft** sebelum `save_post_v2` atau `revise_post_v2`: makna fakta sesuai copy, caption tidak menambah klaim yang belum didukung, dan tidak ada masalah substansi yang diketahui. Hasil `pass` dikirim bersama payload dan dicatat pada revision/hash yang dihasilkan; bila salah satu hasil `needs_revision`, tool menolak perubahan tanpa menyimpan post/revisi baru agar ChatGPT memperbaiki naskah. `get_post` mengembalikan hasil yang tercatat. Ini pemeriksaan ChatGPT atas naskah yang disusun, bukan verifikasi isi URL oleh backend.
- Syarat wajib Setujui untuk v2: Page aktif dan revision/hash tepat; seluruh fakta terhubung ke copy yang benar; satu URL berformat valid per fakta; tidak ada duplikat/reuse yang diketahui atau keputusan `uncertain`; jumlah fakta, format, dan batas keras lulus; tiga hasil editorial `pass` tercatat pada revision/hash terkini. Pemeriksaan ini ringkas, bukan paket sumber per fakta atau 18 kriteria lama. Saran gaya nonblocking ditampilkan terpisah. Server menegakkan hasil yang tercatat, tetapi tidak membuktikan sendiri dukungan isi URL.
- `approve_post` memeriksa ulang state terkini dalam transaksi tanpa otomatis membuka kembali URL. Persetujuan membutuhkan perintah pemilik yang eksplisit atas versi/hash yang dibaca; perubahan substansi membatalkan persetujuan sebelumnya.
- Pencatatan publikasi memeriksa state `ready` yang masih sah dan konfirmasi publikasi manual. Aturan v2 tidak boleh kembali menuntut tier/expiry melalui gate publikasi lama.

### FR-06 — Revisi, koreksi, plan, dan riwayat

- Revisi kata tanpa perubahan makna mempertahankan identitas fakta. Perubahan makna atau penggantian fakta menjalani riset dan pencarian ulang, lalu mengganti pengaitan secara atomik. Revision/hash conflict memerlukan pembacaan ulang sebelum perubahan baru.
- Pada draft v2 yang belum terbit, URL untuk makna sama dapat diperbarui lewat `revise_post_v2` tanpa ID fakta baru. `trivia_reverify_fact` untuk v2 memperbarui URL canonical bagi makna sama tanpa tier/expiry; `trivia_correct_fact` untuk v2 menginvalidasi atau mengganti makna dengan persetujuan pemilik yang terpisah. Kedua jalur v2 tidak menulis ulang snapshot post terpublikasi dan tidak memaksakan tier/expiry lama. Nama tool dapat tetap sama bila input versi v2 dibedakan secara aman.
- Permintaan **satu** draft langsung memakai alur save/readback. Permintaan **dua atau lebih** draft otomatis membuat satu content plan tanpa jadwal dengan jumlah item yang diminta dan tema dalam `plan_intent`; pemilik tidak perlu mengelola plan itu secara manual. ChatGPT mengklaim dan memproses **satu item setiap kali**, menyimpan satu draft per item, lalu membaca kembali post dan progres plan sebelum item berikutnya. Claim/lease 30 menit, satu perpanjangan yang diizinkan, failure item, retry, dan pemulihan di chat berikutnya tetap berlaku. `completed` berarti draft tersimpan, bukan `ready` atau `posted`. Jika hanya ada satu plan aktif yang sesuai saat pemilik meminta melanjutkan, lanjutkan plan itu; jika beberapa cocok, minta pilihan plan.
- Post v1 tetap dapat dibaca dan dikelola sesuai kontrak lamanya selama transisi. Data lama tidak diubah seolah-olah telah melewati riset v2.

### FR-07 — Permintaan beberapa draft dan tema

- Jumlah draft diambil dari instruksi pemilik; jumlah fakta **per draft** tetap mengikuti konfigurasi Page. Tema atau topik yang diminta memandu pilihan fakta, format, dan variasi, selama sesuai daftar topik/format Page yang aktif. Istilah umum seperti “food and home” dipetakan secara wajar ke pilihan yang diizinkan; jika tidak ada pilihan yang cocok, ChatGPT menyampaikan kendalanya sebelum menyimpan konten di luar permintaan.
- Untuk beberapa draft, ChatGPT mengulangi riset → pencarian → seleksi → copy → simpan → readback **untuk tiap draft**. Pencarian berikutnya memperhitungkan draft yang baru saja tersimpan dan calon yang sudah dipakai dalam permintaan yang sama. Sistem tidak menghasilkan beberapa copy dengan fakta identik hanya untuk mencapai angka target.
- Setiap draft memiliki item plan, operation key, status, dan hasil readback sendiri bila permintaan berisi dua atau lebih draft. Jika hanya sebagian selesai, ChatGPT melaporkan ID plan, jumlah yang diminta, jumlah yang berhasil, ID post, dan bagian yang belum selesai; kelanjutan membaca `get_content_plan` lebih dulu agar tidak menggandakan draft yang sudah ada. Satu draft tanpa plan tetap direkonsiliasi lewat operation key dan `get_post`.

### FR-08 — Kontrak tool dan transisi

- Kemampuan pencarian dipertahankan melalui `trivia_find_similar_facts_v2`; `save_post_v2` dan `revise_post_v2` memiliki input sederhana yang terpisah dari v1. Nama v1 yang sudah ada tetap tersedia selama transisi. `trivia_register_and_reserve_facts` dan `trivia_release_facts` tidak dipakai pada alur v2; keduanya dipertahankan sementara untuk kompatibilitas v1 dan dipensiunkan hanya setelah cutover terbukti.
- Tool v2 memakai nama berbeda untuk tiga operasi dengan input yang berubah besar, serta versi request/response v2 yang jelas. Tool lain seperti `get_post`, `approve_post`, dan `mark_post_posted` dapat mempertahankan nama dan inputnya, tetapi respons/gate internal bercabang menurut versi konten post. Uji host membuktikan plugin baru memilih v2 dan plugin lama tetap bekerja selama masa transisi.
- Audit seluruh tool yang tersedia (baseline 33, bertambah selama transisi) untuk asumsi reservasi, sumber v1, binding fakta, dan status. MCP tetap menjadi adapter tipis; transaksi dan aturan domain berada pada core/niche database.

### FR-09 — Diagnostik yang mudah dipahami untuk semua tool

- Persyaratan ini berlaku bagi **seluruh tool yang tersedia** (baseline sekarang 33, bertambah selama transisi), baik Read maupun Write, dan untuk penolakan pada lapisan input MCP, autentikasi/otorisasi, aturan bisnis database, batas pemanggilan, respons yang hilang, serta ketidakcocokan output. Jangan membatasi perbaikan pesan pada penyimpanan draft atau alur trivia v2 saja. Selama transisi, kontrak error v1 yang sudah dipakai plugin lama tetap kompatibel. Bila penolakan terjadi di host sebelum tool MCP berjalan, instruksi plugin menjelaskan keterbatasan itu; MCP tidak mengklaim mempunyai `structuredContent` untuk respons yang tidak pernah diterimanya.
- Respons gagal yang sampai ke ChatGPT memuat kode stabil, kalimat sederhana tentang masalah, nama tool/tahap yang relevan, apakah aman untuk mencoba lagi, dan langkah perbaikan yang konkret. Bila sumbernya diketahui, sertakan lokasi yang tepat, misalnya “fakta ke-3: URL sumber kosong” atau “caption melewati batas 20 karakter”. Nama field/path boleh disertakan untuk debugging; pemilik melihat penjelasan bahasa Indonesia tanpa harus memahami struktur payload.
- Bedakan **kesalahan input**, **data sudah berubah atau benturan**, **akses ditolak**, **rate limit/gangguan sementara**, dan **kegagalan internal yang belum terdiagnosis**. `VALIDATION_FAILED` tanpa field yang salah atau `DATABASE_UNAVAILABLE` untuk semua jenis gangguan tidak cukup ketika informasi aman yang lebih spesifik tersedia. Jika penyebab belum dapat diketahui, jangan menebak: berikan kategori/tahap yang benar, ID diagnostik aman untuk mencocokkan log tersanitasi, serta langkah pemeriksaan berikutnya.
- Pesan retry harus sesuai keadaan. `RATE_LIMITED` menyebut waktu tunggu; respons Write yang hilang mengarahkan pembacaan state atau replay dengan operation key dan payload yang sama; revision/hash conflict meminta pembacaan ulang; akses ditolak tidak menganjurkan mencoba owner lain. Kesalahan pada draft keempat dari lima juga menyebut tiga draft yang sudah terbukti tersimpan dan satuan kerja yang gagal.
- Detail error tidak boleh membuka token, operation key privat, SQL mentah, credential, informasi resource owner lain, URL/teks sumber panjang, atau payload privat. Kode dan ID diagnostik cukup untuk penelusuran; catatan server menyimpan konteks tersanitasi yang dapat dicocokkan tanpa rahasia.
- ChatGPT tidak boleh menyembunyikan error tool di balik kalimat “terjadi kendala”. Ia harus menyebut tool dan tahap yang gagal, ringkasan penyebab yang didukung respons, tindakan yang sudah dicoba, serta apakah ada perubahan data yang telah dibuktikan lewat Read.

**Contoh hasil yang diharapkan:** `save_post_v2` ditolak karena fakta ke-2 sudah dipakai pada scope Page → pesan menyebut “fakta ke-2 sudah dipakai”, kode `FACT_REUSE_BLOCKED`, dan langkah “pilih calon lain, perbarui copy, lalu cek ulang”. Jika respons database tidak terbaca, pesan menyebut bahwa hasil simpan **belum dapat dipastikan** dan memberi ID diagnostik; ChatGPT membaca state sebelum mencoba operasi baru.

## 6. Batas data, keamanan, dan kompatibilitas

- Identitas fakta lintas v1/v2 memiliki **satu registry canonical dengan pemetaan ID v1 yang eksplisit**; representasi sumber/binding v2 boleh berbeda tetapi tidak menciptakan identitas paralel untuk makna sama. Backfill indeks pencarian mencakup fakta serta pemakaian lama dan baru, termasuk riwayat published. Fakta `invalidated`, `superseded`, dan `rejected` tetap dapat muncul sebagai petunjuk riwayat tetapi tidak boleh dipakai ulang sebagai fakta layak. Fakta v1 yang hanya kedaluwarsa dapat memakai identitas lama pada v2 setelah URL baru diteliti; expiry v1 tidak berubah menjadi syarat v2. Snapshot lama tetap utuh.
- Perubahan database bersifat additive; migration yang telah diterapkan tidak ditulis ulang. Constraint, trigger, RPC, projection `get_post`, hash, dan lifecycle gate harus memahami versi konten yang sesuai. Snapshot dan approval v1 tetap dibaca dengan arti lama.
- Owner OAuth, scope workspace, RLS, penutupan grant langsung `anon`, CAS, idempotency, dan audit operasi tetap berlaku. Uji otomatis membuktikan penolakan lintas owner dan bahwa kegagalan transaksi tidak meninggalkan data parsial.
- Respons Write yang hilang diselesaikan lewat pembacaan state atau replay dengan operation key dan payload semantik **yang sama**. Fakta/copy baru merupakan operasi logis baru setelah keadaan lama direkonsiliasi.
- Riset sumber dan teks eksternal adalah data tak tepercaya. Token, service-role key, OAuth secret, operation key privat, serta sumber penuh tidak dicatat dalam log/dokumen publik.

## 7. Kriteria penerimaan produk

1. **Instruksi satu draft berhasil:** pada Page uji yang sah, permintaan satu draft menghasilkan satu post `draft`; `get_post` membuktikan Page, jumlah fakta, URL, copy, status, revision, dan kualitas yang dilaporkan cocok.
2. **Duplikat lama dan parafrasa:** pencarian menemukan kasus parafrasa berlabel yang telah disepakati, termasuk fakta v1; fakta berbeda makna tidak salah digabung. Calon `same` yang sudah dipakai dan `uncertain` diganti tanpa pemilik harus mengulang prompt.
3. **Penyimpanan bersamaan:** benturan setelah pencarian menunjuk fakta terkait; hanya satu penggunaan yang menang pada scope terlarang; tidak ada post/fakta/alokasi parsial.
4. **Sumber sederhana:** tepat satu `source_url` per fakta cukup; tidak ada tier, metadata penerbit, expiry, atau tahun wajib pada copy. URL yang kosong/tidak berformat web ditolak dengan lokasi jelas. Persetujuan tidak meneliti ulang semua URL.
5. **Naskah dan Setujui:** naskah yang melewati batas keras ditolak tanpa draft parsial lalu diperbaiki ChatGPT; hanya catatan gaya nonblocking yang boleh ikut draft. Pemeriksaan editorial ringkas terikat revision/hash; Setujui memakai versi/hash tepat, menolak masalah wajib, dan tidak memublikasikan post.
6. **Pemulihan:** respons save hilang, rate limit, config berubah, atau claim kedaluwarsa tidak menghasilkan draft ganda atau retry tanpa batas. Jika tidak dapat diselesaikan, hasil akhir menyebut tahap dan kendala sebenarnya.
7. **Siklus penuh:** revisi, discard, plan/batch, Setujui, pencatatan publikasi manual, dan metrik manual berfungsi pada v2; post v1 tetap terbaca serta riwayat published tetap utuh.
8. **Keamanan dan bukti:** owner/cross-owner, RLS, grant, operasi atomik, dan kompatibilitas diuji lokal. Uji ChatGPT plugin yang relevan membuktikan readback draft pada runtime terverifikasi. Bukti lokal/CI/LIVE dilaporkan terpisah; klaim `FIXED` memerlukan retest live yang sesuai.
9. **Instruksi beberapa draft bertema:** permintaan lima draft bertema food and home membuat satu content plan tanpa jadwal dengan lima item, lalu menghasilkan lima ID post `draft` yang berbeda pada Page yang dipilih. Masing-masing punya readback, fakta/URL/copy sesuai tema dan konfigurasi, serta tidak mengulang fakta yang diketahui sudah dipakai dalam permintaan itu. Jika item keempat gagal, tiga draft sukses dan ID plan dilaporkan sebagai hasil sebagian; kelanjutan membaca plan dan tidak membuat ulang ketiganya.
10. **Error semua tool dapat ditindaklanjuti:** setiap tool memiliki respons gagal yang aman dan konsisten. Test mencakup input salah dengan lokasi field, benturan data, akses ditolak, rate limit, respons Write hilang, respons terlalu besar/tidak sesuai schema, dan gangguan tak dikenal. ChatGPT menampilkan penjelasan Indonesia yang benar, tindakan aman, serta ID diagnostik untuk kasus yang belum dapat dipastikan; tidak ada rahasia atau dugaan akar sebab tanpa bukti.

## 8. Pengukuran hasil

- **Indikator utama:** proporsi permintaan pembuatan draft yang menghasilkan **jumlah draft tersimpan sesuai permintaan**, dengan `get_post` sukses dan `status=draft` pada Page yang benar untuk tiap draft, tanpa prompt revisi tambahan dari pemilik. Catat jumlah diminta, jumlah berhasil, dan hasil sebagian. Baseline diambil dari hasil live yang benar-benar tercatat; jangan menebak persentase sekarang.
- **Indikator masalah:** tool, tahap, kode, dan ID diagnostik aman saat gagal; proporsi error dengan lokasi/tindakan yang jelas; jumlah calon yang diganti karena duplikat/ketidakpastian; benturan simpan; draft yang masih memiliki penghalang Setujui; dan kejadian duplikasi yang ditemukan sesudahnya.
- **Pengukuran pencarian:** kemampuan menemukan kasus parafrasa berlabel dan tingkat salah gabung dibanding baseline saat ini, termasuk data historis. Ambang lulus disepakati **sebelum** perubahan pencarian dinilai.
- **Batas klaim:** tidak ada angka performa produk, tingkat keberhasilan, atau bebas duplikasi yang boleh dinyatakan tercapai hanya dari test lokal, HTTP 200, atau CI passing.

## 9. Pembagian implementasi: 8 phase, 23 task

| Phase | Task | Keluaran utama |
| --- | ---: | --- |
| 1. Baseline dan keputusan | 3 | Inventaris runtime/data/dependensi; change record override kontrak frozen; contoh kontrak, taksonomi error lintas tool, izin jumlah draft yang diminta, dan acceptance yang disepakati. |
| 2. Identitas dan tolok ukur duplikasi | 3 | Aturan ID lintas versi; kebijakan fakta lama dan pemakaian; dataset serta ambang evaluasi pencarian. |
| 3. Data dan pencarian v2 | 3 | Migration additive dan backfill; Read v2 dengan hasil lengkap/kelanjutan; ACL/RLS dan rollback data teruji. |
| 4. Simpan dan revisi | 4 | Transaksi save per draft; error/idempotency/benturan; revise/discard; orkestrasi beberapa draft, claim, dan recovery plan/batch. |
| 5. Setujui dan lifecycle | 3 | Gate kualitas v2; approval/publish lintas versi; reverify/correction dan snapshot riwayat. |
| 6. Tool dan plugin | 3 | Schema serta output MCP v2; diagnostik aman dan konsisten untuk seluruh tool yang tersedia; instruksi ChatGPT riset→dedup→copy→save→readback dan pemulihan. |
| 7. Verifikasi | 2 | Test fokus, termasuk error pada tiap lapisan dan pencegahan kebocoran rahasia, serta full gate backend/security sesuai perubahan; uji host terisolasi/terkendali. |
| 8. Rilis dan pemantauan | 2 | Urutan backend→plugin dan rollback; retest live, pemantauan hasil, lalu keputusan pensiun v1. |

Urutan kerja wajib menyelesaikan aturan identitas, pencarian, dan syarat Setujui sebelum `save_post_v2` dianggap siap. Setiap perubahan source mengikuti Issue/PR fokus dan gate sesuai [AGENTS.md](../AGENTS.md), [testing](../docs/testing.md), serta [operations](../docs/operations.md). Uji live menggunakan fixture/objek yang diizinkan dan [Live Test & Fix](../docs/live-test/README.md). Release backend, plugin, dan data production adalah keputusan terpisah.

## 10. Di luar cakupan

- OpenAI API di backend, embeddings/vector search, worker AI latar belakang, dan dashboard produk baru.
- Pembuatan video/desain Canva, publikasi Facebook otomatis, atau pengambilan metrik Facebook otomatis.
- Kewajiban paket sumber profesional, tier, expiry, atau pemeriksaan ulang setiap URL pada saat Setujui.
- Sertifikasi ulang seluruh fase historis, 101 prompt lama, atau klaim seluruh acceptance historis menjadi PASS.
