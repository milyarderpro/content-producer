# Rencana implementasi alur draft trivia sederhana

**Status:** rencana implementasi, belum diterapkan atau diuji live.  
**Dasar source:** GitHub `main` `d3f62d02955de12922d8e9e405f0ce8cb22b0c8c`, diperiksa 28 Oktober 2026.  
**Keputusan produk:** rangkaian percakapan pemilik tentang draft sederhana, sumber URL, deduplikasi sebelum naskah final, dan persetujuan terpisah pada 28 Oktober 2026.

Dokumen ini menguraikan **cara mengerjakan** hasil produk dalam [PRD alur draft sederhana](simplified-trivia-draft-workflow-prd.md). Jika ringkasan di sini tampak berbeda, kebutuhan produk dalam PRD menjadi acuan desain; kontrak frozen tetap berlaku sampai change record diterima. Dokumen ini merencanakan perubahan besar terhadap kontrak frozen di `plans/` dan **belum** mengubah kontrak itu. Sebelum implementasi, tulis change record di `docs/decisions/` yang menyebut override tepat atas kontrak tool, schema, sumber, dedup, reservasi, dan approval. Pertahankan migration serta bukti historis. Source lokal dan SHA GitHub tidak membuktikan versi production yang terpasang; verifikasi runtime mengikuti [operations](../docs/operations.md).

## 1. Hasil yang diinginkan

Instruksi pemilik dapat meminta **satu atau beberapa draft** pada Page tertentu, dengan tema atau topik tertentu. Contoh “pilih Page A, buat satu draft post baru” dan “pilih Page A, buat lima draft post baru topik tentang food and home” hanyalah variasi permintaan, bukan format wajib atau batas produk. ChatGPT mengerjakan riset, penggantian calon duplikat, penyusunan copy, penyimpanan, dan readback **untuk setiap draft** dalam percakapan yang sama. Pemilik meninjau hasilnya; `approve_post` dan publikasi tetap tindakan terpisah.

Alur target:

```text
Pilih Page → baca konfigurasi → riset calon fakta + URL cadangan
→ cari kemungkinan duplikat di database → nilai makna dan ganti calon bermasalah
→ pilih set final → tulis dan rapikan copy/caption
→ simpan satu draft serta kaitkan fakta secara atomik → baca kembali draft
→ ulangi untuk jumlah draft yang diminta, dengan cek pemakaian baru
→ pemilik meninjau → Setujui setelah seluruh penghalang selesai
→ publikasi manual → catat performa bila tersedia
```

**Batas hasil:** tidak ada metode otomatis yang menjamin semua parafrasa bermakna sama ditemukan. Backend menemukan kandidat dan menegakkan identitas/pemakaian yang diketahui; ChatGPT menilai kesamaan makna calon yang ditemukan. Jangan melaporkan jaminan dedup 100%.

## 2. Keputusan produk yang harus dipertahankan

1. Jumlah **draft** mengikuti instruksi pemilik; bila perintahnya tunggal tanpa angka, gunakan satu draft, sedangkan “beberapa” tanpa angka perlu klarifikasi. Jumlah **fakta per draft** mengikuti konfigurasi Page. Batas request mengikuti content plan yang aktif (sekarang 100 item), tidak boleh dipotong diam-diam. ChatGPT meriset calon lebih banyak daripada jumlah fakta final untuk tiap draft, misalnya 9–10 calon untuk target 7, tanpa menjadikan angka cadangan sebagai syarat database. Bila calon habis, ChatGPT melanjutkan riset dan pencarian dalam percakapan yang sama.
2. Pencarian terhadap perpustakaan fakta dilakukan **sebelum** copy final ditulis. Fakta yang sudah dipakai pada scope Page/workspace yang berlaku diganti. Fakta yang kesamaan maknanya masih meragukan disisihkan dan diganti; jangan memaksanya menjadi `distinct`. Fakta lama yang sama tetapi masih layak dipakai menggunakan identitas lama.
3. Perpustakaan fakta menyimpan satu identitas untuk satu proposisi. Kalimat postingan boleh berubah tanpa menghasilkan identitas fakta baru. Cek juga duplikasi di antara calon untuk draft yang sama.
4. Input sumber wajib yang diminta dari ChatGPT cukup **kalimat fakta dan tepat satu `source_url` untuk setiap fakta final**. ChatGPT meneliti dukungan sumber ketika membuat fakta. URL adalah jejak rujukan, bukan pembuktian otomatis bahwa klaim benar. Catatan dukungan pendek boleh ada tetapi tidak menjadi syarat simpan atau approval. Waktu pembuatan draft dapat dicatat otomatis sebagai waktu penyimpanan, bukan diberi label tanggal verifikasi sumber.
5. Hapus kewajiban `tier`, `source_type`, judul, penerbit, `independence_group`, klasifikasi `risk_class`/`freshness_class`, tanggal kedaluwarsa, dan paket bukti rinci dari alur trivia baru. Jangan membuka dan meneliti ulang setiap URL saat `approve_post`. Perubahan makna fakta saat revisi memerlukan riset baru untuk fakta yang berubah.
6. Semua topik Page mengikuti alur umum yang sama; tidak ada jalur atau larangan khusus hanya karena topik kesehatan, keselamatan, hukum, atau keuangan. Teks tetap harus akurat dan sesuai kebijakan keselamatan umum yang berlaku.
7. Tidak ada kewajiban menulis tahun atau frasa akademik pada copy publik. Bila sebuah klaim akan menyesatkan tanpa penjelasan waktu yang panjang, ChatGPT memilih fakta atau sudut kalimat lain yang tetap benar dan natural. Bahasa konten trivia tetap `en-US` sampai ada keputusan terpisah.
8. Hilangkan **panggilan reservasi paket terpisah** sebelum `save_post_v2`. Pendaftaran/pemilihan identitas fakta, pengikatan ke post, dan pengecekan pemakaian ulang dilakukan dalam satu transaksi penyimpanan. Draft lain yang sudah memakai fakta sesuai scope yang berlaku dihitung sebagai pemakaian; discard melepaskan alokasi yang belum dipublikasikan, sedangkan publikasi mempertahankan riwayatnya.
9. `save_post_v2` membuat `draft`, tidak pernah otomatis `ready`. Struktur/URL salah, duplikat yang diketahui, keputusan makna belum jelas, jumlah fakta atau batas keras naskah yang gagal **menolak simpan tanpa draft parsial**; ChatGPT memperbaikinya dalam percakapan yang sama. ChatGPT mengirim tiga hasil pemeriksaan editorial ringkas bersama save/revise; hasil `needs_revision` menolak perubahan, sedangkan hasil `pass` dicatat pada revision/hash yang dihasilkan. Draft yang tersimpan boleh memuat catatan gaya nonblocking. Setujui memerlukan hasil `pass` pada versi terkini.
10. `approve_post` memeriksa ulang **versi draft yang ditinjau pemilik**. Duplikasi/pemakaian ulang yang diketahui, URL yang hilang, batas keras naskah, hubungan fakta–copy yang salah, serta pemeriksaan yang belum selesai menghalangi `ready`. Saran gaya yang tidak menghalangi dipisahkan dari masalah yang wajib diperbaiki. Persetujuan tidak otomatis memublikasikan post.
11. Untuk dua atau lebih draft, buat satu content plan tanpa jadwal berisi jumlah item dan tema yang diminta; klaim **satu item tiap kali**, simpan dan baca kembali satu draft per item. Draft berikutnya memperhitungkan fakta yang baru dipakai oleh draft sebelumnya. Kegagalan satu item tidak menghapus draft yang sudah berhasil; laporkan ID plan/post dan jumlah tersisa, lalu pulihkan dari `get_content_plan` tanpa membuat ulang hasil sukses. Instruksi awal mencakup izin scoped untuk plan, claim/renew/failure, dan draft sesuai jumlah, sesudah change record. Tema pengguna dipetakan ke topik/format Page yang diizinkan, bukan diabaikan atau dipaksakan menjadi topik yang tidak cocok.

## 3. Perilaku instruksi pembuatan draft dari awal sampai readback

| Langkah | ChatGPT | Backend/MCP | Hasil atau pemulihan |
| --- | --- | --- | --- |
| 1. Kenali permintaan | Kenali Page, jumlah draft, serta tema/topik; bila perintah tunggal tanpa angka gunakan satu, bila “beberapa” tanpa angka atau Page ambigu minta klarifikasi. | Owner OAuth, workspace, Page, dan `get_page_generation_context`; untuk dua atau lebih draft, `create_content_plan` dengan item tanpa jadwal. | Page/tema sesuai config; jumlah item plan persis jumlah yang diminta. |
| 2. Riset | Untuk plan, klaim satu item sebelum riset draft itu. Pilih topik/format yang diizinkan; cari calon ekstra dan satu URL per calon. | `claim_content_plan_items` dengan `limit: 1` untuk multi-draft; tidak ada Write fakta/post pada tahap riset. Jika buntu, panggil `report_content_plan_item_failure` dengan claim sah dan baca progres plan. | Calon yang maknanya jelas dan sesuai gaya Page; claim yang gagal atau kedaluwarsa ditangani sebelum simpan. |
| 3. Cari fakta lama | Kirim kalimat calon ke pencarian v2; bandingkan makna dan pemakaian. | Kembalikan kandidat ringkas, ID, status pemakaian, `complete`, dan versi katalog workspace. | `same`, `distinct`, atau `uncertain`; jika `complete=false`, ganti calon, jangan anggap bersih. |
| 4. Ganti calon | Singkirkan yang sudah dipakai atau masih meragukan; riset ulang hanya bila cadangan kurang. | Pencarian Read dapat diulang untuk calon baru. | Set final tanpa duplikasi yang **terdeteksi**. |
| 5. Tulis | Buat hook, copy Canva, caption, hashtag, dan URL internal; rapikan panjang/isi. | Aturan render dan budget Page menjadi acuan; server tetap menghitung hasil resmi saat simpan. | Naskah final mengikuti fakta yang telah dipilih. |
| 6. Simpan | Kirim `save_post_v2` untuk satu item/draft, beserta Page, fakta, satu URL masing-masing, keputusan dedup, versi katalog, naskah, dan tiga hasil editorial `pass`. | Satu transaksi memeriksa versi katalog, identitas, reuse, URL, jumlah, batas keras, dan hasil editorial; membuat post `draft` hanya bila semua lulus. | Keberhasilan utuh atau error terarah tanpa post/fakta/alokasi parsial. |
| 7. Pulihkan | Jika terjadi benturan baru, ganti fakta terkait dan perbarui copy dalam chat yang sama. Jika respons hilang, baca keadaan/replay operasi identik sebelum mencoba operasi baru. | Idempotency, owner scope, revision/hash, dan error terstruktur tetap berlaku. | Tidak membuat post ganda akibat retry. |
| 8. Baca kembali dan ulangi | Tampilkan hanya post yang terbukti tersimpan; untuk plan baca progres item, lalu klaim item berikutnya hingga jumlah permintaan terpenuhi. | `get_post` mengembalikan post tiap draft; `get_content_plan` mengembalikan progres serta ID post untuk pemulihan lintas chat. | Pemilik melihat ID plan/post, jumlah berhasil/tersisa, dan masalah secara jelas. |

Jika setelah upaya yang wajar tidak tersedia cukup calon tanpa duplikat, ChatGPT menyebut tahap dan kendalanya, jumlah draft yang diminta, ID draft yang sudah terbukti tersimpan, dan jumlah yang belum selesai. Satu transaksi hanya menyimpan satu draft; hasil yang sudah tersimpan tidak dibatalkan oleh kegagalan draft berikutnya. Jangan mengarang fakta, menyatakan draft tersimpan tanpa readback, membuat draft tambahan di luar permintaan, atau membuat Write berulang dengan operation key baru hanya untuk menembus penolakan yang sama.

## 4. Perubahan tool dan pembagian tanggung jawab

| Tool/area | Rencana kontrak baru |
| --- | --- |
| `get_page_generation_context` | Tetap menyediakan jumlah fakta, format, reuse scope, dan budget Page; kurangi data yang hanya dibutuhkan paket sumber lama bila tidak lagi digunakan. |
| `trivia_find_similar_facts_v2` | Pertahankan kemampuan pencarian lewat tool bernama v2 dengan input kalimat calon dan Page. Keluarkan kandidat ringkas, status pemakaian, ID, `complete`, dan versi katalog workspace; jangan meminta ChatGPT mengisi ontologi untuk Read. Bila hasil terlalu panjang, kembalikan `complete=false` agar calon diganti, bukan memotong tanpa tanda atau memaksa review panjang. Tool v1 tetap sementara. |
| `trivia_register_and_reserve_facts` | Tidak dipakai pada alur v2. Pertahankan v1 sementara untuk plugin/runtime lama, lalu pensiunkan setelah cutover dan retest terverifikasi. `trivia_release_facts` ikut ditinjau karena tidak ada reservasi v2 yang perlu dilepas. |
| `save_post_v2` | Tool bernama v2 menerima fakta final, tepat satu `source_url` per fakta, keputusan identitas ringkas, versi katalog, copy, tiga hasil editorial, Page, plan item bila multi-draft, dan operation key. Satu transaksi melakukan resolusi identitas, cek reuse, batas keras, alokasi, dan penyimpanan draft. Tidak ada token reservasi dari ChatGPT. |
| `revise_post_v2` | Tool bernama v2 mempertahankan identitas fakta bila makna tetap; perubahan makna memakai pencarian/URL baru dan pengaitan atomik. CAS revision/hash wajib; tiga pemeriksaan editorial diulang dan dicatat pada revision/hash baru, sehingga hasil lama tidak berlaku. Revisi `ready` kembali ke `draft`. |
| `get_post`/list | Tampilkan fakta, URL, status pemakaian, hasil check, dan masalah spesifik tanpa membuka rahasia internal. Post lama v1 tetap terbaca. |
| `approve_post` | Cek ulang versi/hash terbaru, status Page, identitas dan reuse fakta, URL yang tercatat, hard budget/renderer, serta masalah editorial yang menghalangi. Tidak meriset ulang URL otomatis. |
| Publish/plan/metrics | `mark_post_posted` tetap membutuhkan `ready` dan konfirmasi publikasi manual. Dua atau lebih draft memakai satu content plan tanpa jadwal; klaim satu item tiap kali dan simpan satu draft per item. Pemulihan membaca `get_content_plan` sebelum Write baru. Metric/performance tetap manual. Audit tool yang ada dan v2 untuk asumsi reservasi, source snapshot v1, dan binding lama. |
| Reverify/correction | Adaptasi `trivia_reverify_fact` untuk pembaruan URL canonical v2 pada makna sama dan `trivia_correct_fact` untuk invalidasi/supersesi v2 dengan izin pemilik terpisah. Kedua jalur tidak meminta tier/expiry v1 dan tidak mengubah snapshot post terpublikasi. Draft yang mengganti URL sendiri memakai `revise_post_v2`. |

**Diagnostik seluruh tool:** audit jalur error semua tool (baseline 33, bertambah selama transisi), termasuk schema MCP sebelum RPC, owner OAuth/izin, business RPC, rate limit, timeout, respons hilang, respons terlalu besar, dan output yang tidak cocok schema. Bentuk error v2 harus konsisten: kode stabil, penjelasan sederhana, tool/tahap, `retryable`, tindakan aman, lokasi field/posisi bila diketahui, `retry_after_seconds` bila relevan, serta ID diagnostik aman untuk kegagalan yang belum dapat dipastikan. ChatGPT merangkum dalam bahasa Indonesia dan tidak menebak akar sebab. Pertahankan kompatibilitas error v1 selama transisi; jangan meneruskan SQL mentah, token, data owner lain, atau payload privat.

Selama transisi, tiga tool dengan input yang berubah besar memakai nama v2 terpisah; nama/schema v1 tetap tersedia untuk plugin lama. `get_post`, `approve_post`, dan `mark_post_posted` mempertahankan nama/input dan bercabang menurut versi konten post. Jangan mengganti schema input v1 mendadak sehingga plugin terpasang rusak. MCP tetap tipis; logika transaksi dan dedup deterministik berada di core/niche database.

## 5. Data, migrasi, dan batas transaksi

1. Petakan kolom, constraint, trigger, RPC, dan projection v1 yang mewajibkan ontologi, paket sumber, expiry, reservation token, atau 18 editorial checks. Tambah schema v2 secara **additive** dengan `content_schema_version` baru; jangan mengubah migration terpasang. Buat satu registry identitas canonical lintas v1/v2 dan pemetaan ID v1 yang eksplisit. Representasi sumber/binding v2 boleh terpisah karena constraint v1 ketat, tetapi tidak boleh menghasilkan identitas paralel untuk makna sama.
2. Record v2 memuat identitas fakta dari registry bersama, kalimat canonical, tepat satu `source_url`, workspace, riwayat pemakaian Page/post, serta status koreksi. URL harus berupa web `http`/`https` tanpa credential atau alamat lokal; itu validasi bentuk, bukan riset ulang isi. Satu URL boleh mendukung beberapa fakta; URL sama tidak berarti faktanya sama.
3. Backfill ID fakta dan pemakaian v1 ke registry/indeks pencarian bersama secara terukur. Pencarian calon baru melihat **fakta dan pemakaian lama maupun baru**, termasuk published serta fakta corrected/invalidated sebagai petunjuk riwayat. Fakta invalidated/superseded/rejected tidak layak dipakai ulang. Fakta v1 yang hanya expired boleh memakai identitas lama pada v2 setelah URL baru diteliti, tanpa menjadikan expiry v1 syarat v2. Pertahankan ID/snapshot/approval/post lama dan bukti sumber v1; jangan mengubahnya menjadi klaim v2 yang tidak pernah diperiksa.
4. Pertahankan `workspace_unique`/`page_unique` sesuai konfigurasi Page. Cek dan alokasikan fakta dalam transaksi simpan yang sama, di bawah owner/workspace/Page locks yang konsisten. Dua simpan bersamaan untuk fakta yang sama pada scope terlarang menghasilkan satu sukses dan satu benturan spesifik, bukan dua draft duplikat atau reservasi yatim.
5. `trivia_find_similar_facts_v2` mengembalikan `complete` dan versi katalog fakta workspace yang berubah pada identitas/status/alokasi relevan. `complete=false` atau hasil host yang terpotong berarti calon harus diganti. `save_post_v2` membandingkan versi katalog itu di bawah lock; bila berubah, tolak tanpa menulis dan minta Read baru. Backend menegakkan exact/normalized identity, ID canonical terpilih, dan reuse, tetapi **tidak** mengklaim memutuskan semua parafrasa tanpa penilaian ChatGPT. Jangan membuat identitas baru diam-diam untuk calon yang belum selesai ditinjau.
6. Simpan error yang dapat ditindaklanjuti: posisi fakta/field, kode stabil dari taksonomi v2, dan aksi aman. Kode final dibekukan pada P1-T3, bukan diimprovisasi per handler. Jangan menaruh token, source text panjang, atau payload privat dalam log. Pertahankan idempotency: respons hilang direkonsiliasi dengan operation key **dan payload semantik yang sama**; perubahan fakta/copy adalah percobaan logis baru setelah state dibaca.
7. Persetujuan dan publikasi memeriksa state terkini di dalam transaksi. Revisi isi membatalkan approval; perubahan jadwal saja mengikuti kontrak khusus yang diputuskan. Discard melepaskan alokasi belum terbit tanpa menghapus riwayat; published tetap tercatat.
8. Untuk dua atau lebih draft, buat satu content plan tanpa jadwal dengan tema di `plan_intent`, lalu klaim **satu item pada satu waktu**. Setiap item memakai satu transaksi `save_post_v2` dan satu operation key sendiri, bukan transaksi gabungan semua post. Setelah readback, baca progres plan dan gunakan penggunaan fakta terbaru untuk item berikutnya. Bila terputus, `get_content_plan` menjadi sumber progres/ID post; jangan membuat ulang item `completed`. Hormati lease 30 menit, satu renewal, dan pelaporan failure yang aman.
9. Jangan menyatukan berbagai penyebab menjadi `VALIDATION_FAILED` atau `DATABASE_UNAVAILABLE` jika lapisan dan lokasi yang aman sudah diketahui. Tentukan taksonomi error dan mapping tiap tool; untuk penyebab yang belum diketahui, berikan kategori/tahap serta ID diagnostik yang cocok dengan log tersanitasi. Respons kehilangan Write tetap berstatus belum pasti sampai state direkonsiliasi. Pesan harus menjelaskan tindakan berikutnya tanpa menyarankan retry buta atau membuka data rahasia.

## 6. Tahapan implementasi dan keluaran — 8 phase, 23 task

| Phase | Task | Pekerjaan | Kriteria selesai |
| --- | ---: | --- | --- |
| 1. Baseline dan keputusan | 3 | Audit runtime, data v1, dan dependensi 33 tool; tulis change record atas kontrak frozen; tetapkan contoh v2, taksonomi error, izin berdasarkan jumlah draft yang diminta, serta acceptance. | Versi awal dan batas perubahan jelas sebelum coding. |
| 2. Identitas dan tolok ukur duplikasi | 3 | Tetapkan registry identitas lintas v1/v2, kebijakan fakta historis, dataset/ambang parafrasa, serta kontrak `complete` dan versi katalog. | Fakta lama tidak hilang dari pencarian; ukuran kemampuan dedup dan batas hasil Read jelas sebelum coding. |
| 3. Data dan pencarian v2 | 3 | Tambah migration additive, backfill/indeks baca lintas versi, pencarian ringkas dengan sinyal hasil lengkap, serta ACL/RLS dan rollback data. | Kandidat lama/baru terlihat; hasil Read tidak diam-diam terpotong; keamanan data teruji. |
| 4. Simpan dan revisi | 4 | Implementasikan transaksi `save_post_v2` per draft, benturan dan idempotency/error per posisi, `revise_post_v2`/discard, serta content plan otomatis untuk dua atau lebih draft. | Tiap request simpan menghasilkan satu draft utuh atau gagal utuh; plan melacak keberhasilan sebagian tanpa duplikasi. |
| 5. Setujui dan lifecycle | 3 | Terapkan catatan pemeriksaan editorial per draft terikat revision/hash, adaptasi approval/publish lintas versi, serta reverify/correction v2 dan riwayat. | Masalah wajib menahan `ready`; post v1 tetap dikelola menurut kontrak lama. |
| 6. Tool dan plugin | 3 | Sediakan tiga tool bernama v2 untuk input yang berubah; terapkan diagnostik aman pada seluruh tool yang tersedia; ubah instruksi ChatGPT untuk jumlah/tema fleksibel serta riset–dedup–copy–save–readback per item. | Plugin lama tetap kompatibel; pemilik tidak mengelola tier/ontology; setiap hasil punya readback dan error yang dapat ditindaklanjuti. |
| 7. Verifikasi | 2 | Jalankan test fokus termasuk error input/domain/auth/transport/output dan larangan kebocoran rahasia, serta full gate backend/security sesuai scope; uji host terisolasi atau terkendali untuk satu dan beberapa draft. | Bukti lokal/CI dan perilaku host tercatat dengan batasnya. |
| 8. Rilis dan pemantauan | 2 | Rilis backend sebelum plugin v2 dengan rollback yang jelas; retest live terbatas, pantau hasil, lalu putuskan pensiun v1. | Tidak ada klaim `FIXED` sebelum readback live yang relevan; v1 baru dipensiunkan setelah cutover terbukti. |


### Daftar 23 task dan batas selesainya

**Phase 1 — keputusan sebelum coding**

- **P1-T1 Baseline:** cocokkan SHA source, versi backend/plugin yang benar-benar terpasang, data fakta/post/plan v1, dan dependensi seluruh tool; hasilnya inventaris tanpa perubahan production.
- **P1-T2 Change record:** tulis override eksplisit atas sumber satu URL, dedup, reservasi, izin satu atau banyak draft, approval, schema v2, serta kompatibilitas v1; coding kontrak baru menunggu keputusan ini diterima.
- **P1-T3 Kontrak contoh:** bekukan contoh request/response sukses dan error untuk satu draft, lima draft bertema, Read tidak lengkap, benturan, lost response, dan hasil sebagian; tetapkan kode error, path, retry, serta daftar gate wajib Setujui.

**Phase 2 — identitas dan kualitas pencarian**

- **P2-T1 Identitas:** rancang satu registry canonical beserta pemetaan ID v1, status invalidated/superseded/rejected/expired, dan riwayat pemakaian; hasilnya aturan reuse yang tidak mengubah snapshot lama.
- **P2-T2 Dataset dedup:** siapkan pasangan parafrasa sama makna dan mirip kata tetapi beda makna, termasuk data lama, lalu catat baseline recall dan salah gabung sebelum optimasi.
- **P2-T3 Kontrak Read:** bekukan aturan retrieval, batas hasil, arti `complete`, versi katalog workspace, dan tindakan ChatGPT atas hasil tidak lengkap; ambang uji ditetapkan sebelum melihat hasil implementasi.

**Phase 3 — data dan Read v2**

- **P3-T1 Schema additive:** tambahkan registry/pemetaan, penyimpanan URL dan binding v2, serta `content_schema_version` tanpa menulis ulang migration lama; audit ACL/RLS/grant.
- **P3-T2 Backfill dan indeks:** petakan fakta serta pemakaian v1 ke pencarian bersama secara idempoten; buktikan published dan status koreksi tetap terdeteksi dan snapshot lama tidak berubah.
- **P3-T3 Pencarian database:** implementasikan RPC pencarian v2 dengan `complete` dan versi katalog; uji batas output, data lama/baru, workspace owner, dan hasil tidak lengkap tanpa keputusan “bersih” palsu.

**Phase 4 — draft dan pemulihan**

- **P4-T1 Simpan atomik:** implementasikan `save_post_v2` yang memeriksa versi katalog, konfigurasi, URL, jumlah/batas keras, identitas, reuse, serta tiga hasil editorial dalam satu transaksi; simpan hasil `pass` pada revision/hash, dan tolak `needs_revision` tanpa data parsial.
- **P4-T2 Benturan dan replay:** uji dua simpan bersamaan, operation key/payload identik, respons hilang, serta error posisi; revisi payload hanya memakai operasi baru sesudah state dibaca.
- **P4-T3 Revisi dan baca:** implementasikan `revise_post_v2`, binding/URL baru bila makna berubah, CAS, pemeriksaan editorial baru pada revision/hash, pembatalan approval, readback v1/v2, dan pelepasan alokasi saat discard.
- **P4-T4 Beberapa draft:** gunakan satu content plan tanpa jadwal untuk dua atau lebih draft; klaim satu item per giliran, simpan/readback, catat progres, tangani lease/failure, dan lanjutkan dari plan tanpa menggandakan item completed.

**Phase 5 — keputusan siap dan riwayat**

- **P5-T1 Gate Setujui v2:** baca tiga hasil editorial per draft yang dicatat P4 pada revision/hash terkini; gunakan lagi hasil validator mekanis P4-T1 saat Setujui, dan tampilkan saran gaya terpisah. P4-T1 tetap pemilik validasi keras saat simpan.
- **P5-T2 Setujui/publikasi:** buat `approve_post` dan `mark_post_posted` membaca gate menurut versi konten; buktikan v2 tidak kembali meminta tier/expiry dan v1 tetap mengikuti aturan lamanya.
- **P5-T3 Koreksi fakta:** adaptasi reverify URL v2 dan invalidasi/supersesi dengan izin owner terpisah; post published tetap mempertahankan snapshot sumber historis.

**Phase 6 — antarmuka ChatGPT**

- **P6-T1 Tool v2:** daftarkan `trivia_find_similar_facts_v2`, `save_post_v2`, dan `revise_post_v2` dengan schema input/output v2; pertahankan nama v1 dan uji plugin lama tidak salah membaca schema baru.
- **P6-T2 Diagnostik seluruh tool:** petakan error input MCP, auth, RPC, rate limit, transport, output, dan unknown untuk semua tool yang terpasang; respons memberi kode stabil, tahap, field bila diketahui, tindakan aman, serta ID diagnostik tersanitasi bila belum pasti.
- **P6-T3 Instruksi plugin:** perbarui urutan kerja satu/banyak draft, tema, calon cadangan, `complete=false`, retry aman, plan/resume, readback, dan ringkasan error bahasa Indonesia; hilangkan kewajiban tier/ontologi/reservasi dari alur v2.

**Phase 7 — bukti sebelum rilis**

- **P7-T1 Lokal/CI:** jalankan fixture dedup, transaksi/race, semua jalur error representatif, owner/cross-owner, v1 compatibility, dan gate CR-020 pada kandidat backend final; catat SHA, cakupan, dan status bukti.
- **P7-T2 Host terkendali:** uji tool/schema yang benar-benar terlihat ChatGPT, satu dan lima draft pada fixture/objek yang diizinkan, readback, hasil sebagian, serta pesan error; jangan menyamakan HTTP 200 dengan save sukses.

**Phase 8 — rilis dan hasil nyata**

- **P8-T1 Rollout:** verifikasi runtime target, rilis backend sebelum paket plugin v2, cek migration/security/rollback, lalu aktifkan plugin yang sesuai tanpa memutus v1 selama transisi.
- **P8-T2 Retest live:** uji ulang alur draft yang relevan dengan izin dan objek tepat, baca kembali post, pantau error/duplikasi, lalu putuskan penghentian v1 hanya setelah bukti cutover cukup.

**Dependensi:** P1 selesai sebelum perubahan kontrak; P2 selesai sebelum P3/P4; P3 menyediakan Read/registry sebelum P4 menulis; P4 menyelesaikan validasi keras saat simpan sebelum P5 menambahkan catatan editorial dan gate Setujui; P6 memakai schema backend yang stabil; P7 lulus sebelum P8. Pengujian fokus boleh berjalan di setiap task, sedangkan full gate backend final tidak diulang tanpa perubahan yang menuntutnya.

Setiap tahap perubahan source memakai Issue/PR fokus sesuai aturan repository. Sebelum CI lokal/Actions atau push/PR yang memicu CI, catat SHA, cakupan, pekerjaan yang akan berjalan, serta estimasi durasi. Perubahan business RPC/migration/izin memerlukan satu full CR-020 gate pada kandidat backend final sebelum deployment berizin. Jika estimasi lebih dari sepuluh menit, mulai run yang sudah diizinkan, laporkan URL/status sementara sekali, lalu akhiri pemantauan chat sesuai [AGENTS.md](../AGENTS.md). Tidak ada deployment, mutasi data production, pemasangan plugin, atau business Write production yang diotorisasi oleh dokumen rencana ini saja.

## 7. Uji penerimaan minimum

1. **Satu instruksi, jumlah sesuai permintaan:** untuk satu draft, Page unik → riset calon ekstra → dedup Read v2 → copy → `save_post_v2` → `get_post`; Page, fakta, URL, copy, status, dan revision cocok. Untuk lima draft bertema food and home, buat satu plan tanpa jadwal dan selesaikan lima item berurutan hingga lima ID post berbeda terbukti tersimpan, dengan topik sesuai Page dan fakta yang baru dipakai ikut diperiksa pada draft berikutnya.
2. **Parafrasa:** dua kalimat bermakna sama tetapi berbeda kata muncul sebagai kandidat; ChatGPT memakai ID lama jika masih tersedia, atau mengganti calon bila sudah dipakai. Dua klaim tentang subjek sama tetapi makna berbeda tidak salah digabung.
3. **Cadangan dan ketidakpastian:** calon yang sudah terpakai dan calon `uncertain` diganti dalam percakapan yang sama; final set tidak berisi dua fakta dengan makna sama yang dikenali.
4. **Benturan saat simpan:** pemakaian oleh proses lain setelah Read menghasilkan error posisi yang jelas. ChatGPT memperbarui calon/copy dan mencoba operasi baru secara aman; tidak ada post/fact parsial atau duplikasi.
5. **Sumber sederhana:** tepat satu `source_url` per fakta diterima tanpa tier, publisher, kelompok independensi, expiry, atau kewajiban tahun pada copy. URL tidak dibaca ulang otomatis saat approval. Perubahan makna dalam revisi memakai riset baru untuk fakta itu.
6. **Kualitas naskah:** copy yang melewati batas keras ditolak tanpa post parsial, lalu diperbaiki ChatGPT; hasil resmi server menentukan lulus/gagal. Pemeriksaan editorial ringkas terikat revision/hash; hanya catatan gaya nonblocking boleh tersimpan bersama draft.
7. **Approval:** owner meninjau versi/hash tepat; duplicate/reuse yang diketahui, URL hilang, hard budget, atau check penting yang belum selesai menolak approval. Approval tidak memublikasikan post.
8. **Keamanan dan kompatibilitas:** owner OAuth, RLS/cross-owner denial, grant default-closed, same-key replay, old post readback, discard, publish manual, dan metrik manual tetap benar. Tidak ada kehilangan riwayat v1.
9. **Hasil sebagian dan kelanjutan:** bila item plan keempat gagal setelah tiga readback berhasil, ketiga post itu tetap ada dan dilaporkan dengan ID plan/post; kelanjutan membaca plan dan hanya mengejar item tersisa tanpa membuat ulang yang sudah selesai.
10. **Error seluruh tool:** setiap tool yang tersedia (baseline 33, bertambah saat transisi) memberi kegagalan yang konsisten dan aman. Uji input salah dengan lokasi field, benturan, izin, rate limit, respons Write hilang, output tidak sesuai, dan gangguan tak dikenal. Pesan menyebut tindakan aman dan ID diagnostik bila penyebab belum pasti; ChatGPT menjelaskannya kepada pemilik dalam bahasa Indonesia tanpa menebak atau membocorkan rahasia.

Uji lokal/fixture menjadi tempat utama debugging payload, transaksi, dan regresi. Uji host terkendali mencakup satu serta beberapa draft; retest live terbatas minimal membuktikan satu alur ujung-ke-ujung yang relevan dengan readback pada runtime terverifikasi. HTTP 200, CI lulus, atau teks copy di chat saja tidak membuktikan draft tersimpan.

## 8. Di luar perubahan ini

Tidak menambah OpenAI API di backend, embeddings/vector search, worker AI latar belakang, pembuatan video Canva, publikasi Facebook otomatis, atau pengambilan analitik Facebook otomatis. Tidak menjalankan kembali rencana fase historis atau 30 kasus editorial yang ditunda sebagai syarat perubahan ini. Jika kelak ingin mengubah batas tersebut, buat keputusan dan scope tersendiri.
