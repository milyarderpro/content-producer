# Design

## Context

Motivasi ada pada [proposal](proposal.md). Baseline source yang diperiksa adalah `2b685313f9c65105e8b22858af2657a11c502e95`, hasil sinkronisasi dengan `origin/main`. Temuan source bukan klaim deployment runtime terkini. Perencanaan ini tidak mengubah source implementasi atau data production.

Pembatas tersebar di beberapa lapisan:

- `supabase/functions/mcp/schemas.ts`: lima enum format, sebelas topik, lima key bobot wajib, dua profil kepadatan, config literal versi 1, batas 9 fakta/90 karakter per fakta/500 blok/600 copy, dan `emoji_allowed: false`.
- `page_plan.ts`, `foundation.ts`, `trivia_v2.ts`, `post_base.ts`, `post_approval.ts`, dan `post_publication.ts`: bentuk config/response ketat, empat interaction goals, posisi/array maksimal sembilan. Mengubah input save saja akan membuat output atau lifecycle tetap gagal.
- Migration `20261008165228...`, `20261011164409...`, `20261012124850...` dan kelanjutannya: validator config, renderer dan pemeriksaan profile/word/wrap/replay. `post_render_v2` masih menggunakan renderer v1 secara internal.
- Migration `20261102014204_add_save_post_v2.sql`, `20261102050000_add_revise_post_v2.sql`, `20261102070605_add_trivia_v2_approval_gate.sql`: snapshot hanya config versi 1, pemilihan kepadatan berdasarkan nama `themed_utility`, validasi posisi 1–9, serta current gate yang membaca config Page.
- `plugin/skills/content-producer/` dan CR-061: sudah mempunyai review penulis, tetapi default hook, CTA tunggal, lima format, dan dua profil masih dibundel sebagai aturan umum. Penerimaan historis 0.5.7 tetap bukti historis yang sah, bukan izin mengubah data QA lagi.
- Katalog source saat ini 31 tool; pin audit migration source mencatat 85 migration. Inventaris sesudah perubahan harus dihitung dari source kandidat, bukan menyalin angka gate historis.

### Bukti corpus yang menjadi dasar

Statistik di bawah dihitung per akun setelah empat duplikasi ID Curious Mind dibuang. Identitas referensi adalah pasangan akun dan POST-id karena POST-055 muncul pada dua akun. Tiga file tetap tidak diedit.

| Pengamatan | Curious Mind | DYK | Daily Facts |
| --- | ---: | ---: | ---: |
| Record mentah / ID unik | 55 / 51 | 103 / 103 | 18 / 18 |
| Engagement lengkap | 51 | 100 | 18 |
| Rentang jumlah fakta | 6–10 | 5–11 | 5–7 |
| Jumlah dominan | 8 | 7–8 | 6 |
| Median kata seluruh copy | 82 | 89 | 97,5 |
| Median kata per fakta | 9 | 10 | 14 |
| Maksimum kata seluruh copy | 109 | 125 | 124 |
| Maksimum karakter copy mentah | 624 | 708 | 728 |
| Record dengan copy >600 karakter | 2 | 14 | 7 |
| Record dengan blok fakta >500 karakter | 5 | 25 | 10 |
| Label high / medium / low | 209 / 185 / 10 | 339 / 427 / 17 | 60 / 47 / 2 |
| Record dengan emoji hati | 0 | 60 | 0 |

Penghitungan kata memakai token alfanumerik sederhana, sehingga bukan metrik authoritative renderer. Pengambilan baris fakta mengecualikan subjudul telur DYK dan CTA tengah POST-057. Curious Mind mengandung OCR/urutan kata rusak; statistik barisnya bersifat diagnostik. Batas baru harus diuji pada rekonstruksi bentuk, bukan menyertifikasi kebenaran klaim mentah. Seluruh record adalah pilihan jutaan views menurut pengumpulan owner; tidak tersedia kelompok gagal atau pengukuran kausal retention. Duplikasi lintas akun dan likes DYK yang dibulatkan tidak dianggap bukti independen.

### Audit ulang CTA — keputusan pemilik 12 November 2026

Seluruh 176 baris dibaca; setelah dedup akun+ID terdapat 172 record. Pemeriksaan CTA memakai baris isi sesudah jumlah fakta yang tercatat, dengan perlakuan khusus subjudul telur dan CTA tengah DYK POST-057. Ketiga file tidak diedit. Seluruh 172 record mempunyai bagian CTA; tiga CTA Curious Mind rusak/ambigu akibat OCR sehingga maksudnya tidak dipaksakan menjadi label pasti.

| Akun | Bukti CTA | Implikasi untuk profil |
| --- | --- | --- |
| Curious Mind, 51 record | Follow dominan, juga comment keyword, save, dan double-tap; beberapa penutup menggabungkan teaser dengan follow | Panduan follow berbasis manfaat/topik, tanpa mewajibkan satu rumus CTA pada semua post |
| DYK, 103 record | Sedikitnya 14 CTA jelas menggabungkan beberapa ajakan: POST-059/060/061, POST-069, POST-143–152 | Mendukung pertanyaan + like, berbagi pengalaman di komentar + like, like + tag, serta like + follow; pola lain termasuk share, save, keyword, dan reaction |
| Daily Facts, 18 record | Seluruh 18 memakai “Like the facts? Like the video and follow for more!” | Like + follow adalah pola referensi yang berulang; tidak perlu ditentukan mana tujuan utama |

Hitungan 14 DYK adalah minimum yang jelas, bukan hasil classifier otomatis: POST-059/060/061 mengajak respons/komentar serta like, POST-069 mengajak like + tag, dan sepuluh POST-143–152 mengajak reaction + follow. “Like learning something new?” adalah pertanyaan tentang kesukaan, bukan permintaan like; “share one of yours” meminta pengalaman di komentar, bukan share video; “tap & follow” tanpa target tap tidak otomatis diberi dua label. Emoji “drop a heart” yang ambigu juga tidak dipaksa menjadi comment atau react.

CTA dapat generik, terkait topik, berbentuk pertanyaan, memakai janji konten berikutnya, atau gabungan. Satu bagian CTA dapat memuat beberapa kalimat/baris: DYK POST-060 mempunyai empat baris tidak kosong. Pada POST-057, CTA berada setelah fakta keenam dan sebelum fakta ketujuh; ini variasi penempatan, bukan alasan membuang fakta atau memindahkan CTA diam-diam. Maksimum panjang bagian CTA yang diekstrak dengan separator LF adalah 93/122/51 karakter untuk Curious Mind/DYK/Daily Facts, masih di bawah default baru 140 karakter.

Kesimpulan audit: aturan wajib satu tujuan, hierarki tujuan utama/tambahan, atau batas dua/tiga aksi tidak berasal dari corpus. Banyaknya ajakan tidak menjadi hard gate. Semua contoh memang mempunyai CTA; audit ini tidak mengubah keharusan hadirnya komponen CTA. Tidak ada bukti bahwa jumlah ajakan tertentu menyebabkan views lebih tinggi.

Fingerprint source saat proposal:

- `dataset-reference/post-coriousmind.txt`: `7388ba52b29aab246841c0d046535f19568c32def0ae6e56a43b3d4254b485da`.
- `dataset-reference/post-dyk.txt`: `4d975bd91fa6ebfecc101ca6958b5b0bacd2490a6ccb1ad72a55274ac283594f`.
- `dataset-reference/post-dailyfacts.txt`: `f00bf8cbd7c33735e40a9c21e9052677f05eaabc172ee60c50d322c340edf329`.

## Goals / Non-Goals

**Goals:**

- Mengimplementasikan kemampuan yang dideskripsikan dalam [katalog](specs/trivia-editorial-catalog/spec.md), [profil Page](specs/trivia-page-editorial-profiles/spec.md), dan [delta workflow](specs/trivia-draft-workflow/spec.md).
- Memungkinkan penambahan format/profil/topik dalam struktur trivia yang didukung melalui data owner; plugin membaca panduannya tanpa paket baru untuk setiap format.
- Menjaga perbedaan tiga referensi dan menyediakan dasar evaluasi yang mencakup semua pola, tanpa menjadikan frekuensi corpus sebagai kuota post.
- Mendukung profil custom campuran sebagai satu definisi eksplisit; mempertahankan versi/provenance post sambil menunda laporan DNA/CTA baru sesuai persetujuan peringkasan scope.
- Menjaga kompatibilitas config v1 dan seluruh kontrol transaksi, sumber, reuse, approval, dan isolasi.

**Non-Goals:**

- Menjalankan kode dari katalog, menambahkan quiz interaktif/carousel/voiceover, atau menjanjikan semua struktur konten masa depan cukup dengan konfigurasi.
- Menghapus seluruh batas teknis, mengizinkan klaim tanpa sumber, atau menyalin post/error referensi.
- Membuat plugin/app/connection baru, dashboard konfigurasi, AI worker/API, embeddings, atau integrasi publikasi Facebook/Canva.
- Menambahkan laporan/perbandingan performa per versi DNA, dimensi insights `editorial_profile`/`editorial_profile_version`, atau filter/pengelompokan `cta_actions` pada rilis ini. Kompatibilitas analitik lama tetap wajib; pencatatan versi serta label opsional tidak ditunda.
- Mengganti config Page production atau menjalankan retest Write tanpa scope terpisah. Tidak mengarsipkan change lain dalam tahap proposal.

## Decisions

### D1 — Registri data versioned, bukan penambahan enum berulang

Tambahkan `public.trivia_editorial_definitions` untuk tiga kind: `format`, `topic`, dan `profile`. Baris memuat workspace, public ID, kind, key, versi integer, `definition_schema_version: 1`, payload JSON tertutup, hash server, waktu pembuatan, dan metadata retirement terpisah dari isi immutable. Unique `(workspace_id, kind, key, version)` serta index lookup/cursor mengikuti filter Read. Referensi memakai public ID, versi, dan hash; cross-workspace reference ditolak.

Tambahkan `internal.trivia_editorial_catalog_state` dengan satu revision bigint per workspace. Nomor ini diekspos sebagai string desimal `editorial_catalog_version`, terpisah dari versi katalog fakta. Publish/retire menggunakan operation ledger dan lock workspace yang sudah ada; mutasi tidak menambah versi katalog fakta. Penguncian selalu workspace sebelum baris definisi/config agar urutan konsisten dengan save.

Aktifkan RLS pada tabel baru, cabut grant langsung dari PUBLIC/anon/authenticated/service_role sesuai pola project, dan berikan akses minimum pada role API melalui RPC owner. Tidak memberi caller akses tabel/helper langsung. Foreign key dan validator mencegah referensi silang owner; seluruh lookup mengikat workspace sebelum key.

Alternatif menambah enum keenam lalu ketujuh ditolak karena memerlukan deployment setiap format. Key string bebas tanpa katalog ditolak karena menghilangkan validasi. Katalog global yang bisa diedit owner ditolak karena perubahan satu owner tidak boleh memengaruhi owner lain.

### D2 — Dua tool katalog untuk memenuhi janji tanpa kode

Tambahkan dua tool/RPC owner; nama berikut merupakan kontrak yang diusulkan:

| Tool | Perilaku |
| --- | --- |
| `get_trivia_editorial_catalog` | Read request versi 1, workspace, filter kind/key/version atau daftar reference tepat, `include_examples`, limit/cursor; mengembalikan definisi, hash/versi, status, kelengkapan, dan versi katalog editorial |
| `update_trivia_editorial_catalog` | Write request versi 1 dengan operation key, `expected_editorial_catalog_version`, serta union action `publish`/`retire`; publish memakai expected previous version atau null untuk key baru; retire menarget versi tepat dan alasan |

Publish membuat versi baru atomik setelah seluruh referensi dan payload lolos. Retirement menutup pengikatan baru; Page yang sudah terikat tetap berfungsi. Tidak ada hard delete. Versi yang retired tetap dapat dibaca dan direplay. Replay identik diperiksa sebelum state mutable, tetap sesudah autentikasi owner.

Error stale katalog editorial memakai `EDITORIAL_CATALOG_CONFLICT`; referensi yang tidak dapat dipilih memakai `EDITORIAL_DEFINITION_UNAVAILABLE`. Keduanya masuk kontrak diagnostik dengan lokasi dan saran aman, tanpa membocorkan owner lain. Schema/payload tidak sah tetap memakai keluarga error validasi yang ada.

Batas awal: key `^[a-z][a-z0-9_]{1,49}$`, maksimum 128 key per kind/workspace, payload format/topik 16 KiB dan profil 64 KiB. Read maksimal 20 definisi ringkas dan 64 KiB per halaman; bila examples tidak muat, kembalikan reference/cursor serta penanda incomplete yang eksplisit. Definisi tepat yang masih tidak muat ditolak saat publish, bukan dipotong saat Read. Output tidak memuat ledger/key operasi atau credential.

Katalog runtime menjadi 33 tool (31 lama + satu Read + satu Write); ini target rancangan, bukan bukti runtime. Tool konten v1 tetap absen. Tidak menggunakan SQL manual sebagai mekanisme normal penambahan format.

### D3 — Schema definisi memisahkan dimensi yang sebelumnya tercampur

Semua definisi mempunyai display name, deskripsi, provenance pola, schema/struktur yang didukung, dan notes terbatas. Teks merupakan data editorial; tidak bisa memberi izin Write, mengganti source policy, atau menyisipkan kode/prompt tingkat sistem.

- **Format:** `content_structure: trivia_card_v2`, `architectures` dari single-subject/themed/mixed, label mekanisme/manfaat berupa key deskriptif terbatas, density preferences, panduan pemilihan/urutan, dan contoh positif/anti-example. Mekanisme seperti consequence/explanation/contrast dapat bergabung. Validasi semantik comparison tetap pekerjaan penulis; server tidak mengklaim memahami semua perbandingan dari string.
- **Topik:** key, label, cakupan, contoh subjek, dan grouping untuk ragam/insights. Tidak ada daftar sebelas topik eksklusif pada config v2; format/topik baru tetap harus diregistrasi dan diizinkan Page.
- **Profil:** referensi versi tepat format/topik, bobot per key, preferensi density yang dapat mempunyai key tambahan, hook templates/casing, voice, units preference, panduan/contoh CTA dan kebijakan emoji, panduan seleksi/urutan, contoh berprovenance, dan batas default. Panduan CTA tidak menjadi allowlist aksi/kombinasi atau kewajiban memilih satu tujuan.

Graf referensi hanya mengizinkan profil → format/topik; format dan topik tidak dapat merujuk profil atau kode. Resolver memvalidasi seluruh referensi dalam workspace, kind, dan versi yang tepat. Binding Page mencatat waktu pengikatan server untuk membedakan pemakaian sah sebelum retirement dari pengikatan baru; update field Page yang tidak mengganti referensi mempertahankan waktu binding itu.

Profil custom campuran diterbitkan sebagai satu definisi biasa: owner menetapkan hasil gabungan voice, kepadatan, format/topik, hook, dan panduan CTA dari referensi yang dipilih. Sumber inspirasi/versinya dicatat pada provenance, bukan graph inheritance atau resolver berbobot lintas profil. Contoh: ritme bahasa DYK dengan penjelasan lebih panjang seperti Daily Facts mempunyai key profil custom sendiri. Page mengikat satu versi hasil tersebut; tidak perlu kode baru atau mencampur Page lain.

Seed format mengenali lima key lama ditambah `themed_curiosity` dan `mixed_curiosity`. Koleksi ilmuwan adalah tema history dengan format yang cocok; rangkaian ecological consequences memakai mekanisme consequence dalam koleksi bertema. Owner dapat mendaftarkan nama format lebih khusus kemudian. Tujuh seed bukan batas katalog baru.

Bobot memakai map dinamis, nilai integer 0–100, tepat key allowed choices, total 100 per distribusi. Bobot nol berarti tidak diutamakan otomatis, bukan dilarang dipilih eksplisit. Distribusi bukan kuota suatu batch kecil. Jangan mengubah topik body/history menjadi animals hanya agar mudah memenuhi gaya.

### D4 — Config versi 2 memakai profil pinned dan resolver tunggal

`TriviaConfigV2` adalah cabang baru yang dipilih `config_schema_version: 2`, dengan `editorial_profile_ref`, allowed format/topic references, maps bobot, aturan count/budget/layout, panduan CTA/style policy, dan optional overrides terstruktur. `allowed_interaction_goals` legacy tidak menjadi field wajib atau allowlist penolakan CTA config2. Create/update Page tetap request envelope 1; input/output memakai union config 1/2. Module context harus mengiklankan kedua config versions dengan content version tetap 2.

Owner memilih versi profil tepat. Page menyimpan referensi format/topik yang dipilih dan aturan efektif hasil resolver; config/profile change menghasilkan timestamp baru. Tidak ada lookup `latest` saat save. Definisi immutable menjamin publikasi versi lain tidak membuat draft stale; `config_updated_at` dan binding tepat tetap wajib cocok. Tidak menambah expected editorial catalog version pada setiap save yang tidak memerlukannya.

Resolver memperhitungkan: ceiling mesin → default profil/format → override Page eksplisit → override item/instruksi yang diizinkan. Count/budget adalah pilihan akhir yang harus sah dalam ceiling; override item tidak dapat memperluas izin atau hard budget Page. Field yang tumpang tindih mempunyai satu hasil efektif, bukan JSON merge bebas. Default format dalam profil tidak otomatis menjadi pilihan diizinkan di luar allowed references Page.

`item_config.profile_key` tetap berarti density preference, bukan penggantian DNA utama. Plan config versi 2 mengizinkan density key yang terdaftar pada profil dan format null sampai komposisi. `interaction_goal` plan boleh null; bila diisi, nilainya menjadi intent yang dapat dipenuhi bersama ajakan lain, bukan instruksi menghapus semua ajakan lain. Pending/in-progress items dicek ulang terhadap Page terkini; intent yang tidak lagi cocok memerlukan review owner, bukan modifikasi otomatis item completed. `plan_intent` tetap menyimpan tema/jumlah draft, bukan menjadi override jumlah fakta.

### D5 — Tiga preset terpisah dan bisa disunting melalui versi baru

| Preferensi seed | `curious_mind` | `dyk` | `daily_facts` |
| --- | --- | --- | --- |
| Default count range / preferred | 6–10 / 8 | 5–11 / 8 | 5–7 / 6 |
| Ritme umum | Padat, declarative, weird everyday detail | Ringkas, conversational, variasi emosi/kemampuan/manfaat | Kalimat lebih menjelaskan, konkret dan teratur |
| Kata/fakta sebagai preferensi | 8–11 | 8–12 | 12–16 |
| Kata total sebagai preferensi | 70–95 | 75–100 | 85–115 |
| Hook | Variasi `Did You Know?`/`DID YOU KNOW?`/sentence case | Default `DID YOU KNOW`, varian exclamation tersedia | Default `Did you know?` |
| CTA | Follow dominan, variasi sesuai isi; teaser + follow juga ada | Ajakan tunggal/gabungan, pertanyaan, react/follow/comment/tag/share/save sesuai konteks; emoji opsional | Contoh berulang “Like the facts? Like the video and follow for more!”; like + follow tanpa hierarki |
| Emoji | Default off | Opsional terutama CTA | Default off |

Angka di atas adalah rekomendasi awal yang dikalibrasi dari corpus, bukan persentil yang diklaim atau gate universal. Density utility dalam setiap profil dapat lebih pendek dari ritme utama. Tidak wajib satu angka, satu emosi, satu sejarah pada setiap post; label surprise tidak menjadi kuota. Profil Daily Facts tidak wajib memakai topik AS untuk seluruh post, tetapi pola tempat/kota dan penyimpanan makanan mempunyai contoh representatif sendiri.

Seed bobot topik/format memakai hasil audit yang sudah tersedia dan melengkapi adjudikasi per record yang belum tercatat, setelah duplikasi/OCR diperiksa; file audit hasil implementasi harus merekam pengelompokan dan pembulatan, bukan menyalin rekomendasi gabungan lama sebagai frekuensi akun. Jangan mengulang seluruh audit tanpa perubahan input atau gap bukti yang jelas. Rentang count dan hard budget pada Page dapat disesuaikan eksplisit selama dalam ceiling. Profil adalah inspirasi editorial, bukan branding/naskah pesaing yang disalin.

### D6 — Ceiling lebih luas tetapi tetap terbatas

Ceiling mesin untuk config v2 berikut dipilih di atas maksimum corpus guna menyediakan ruang qualifier dan variasi baru. Ini batas transport/renderer, bukan target desain setiap video:

| Ukuran | Ceiling mesin v2 |
| --- | ---: |
| Fakta/posisi | 1–12 |
| Hook | 120 karakter / 18 kata |
| Satu fakta | 160 karakter / 30 kata |
| Blok fakta termasuk separator | 900 karakter |
| CTA | 180 karakter / 32 kata |
| Canva copy termasuk hook/CTA/separator | 1.100 karakter / 160 kata |

Default hard budget seed profil adalah hook 60, fakta 150, blok 750, CTA 140, copy 900 karakter; ceiling kata digunakan sebagai batas maksimum, dengan preferensi lebih sempit pada D5. Copy mentah terpanjang 728 karakter dan blok fakta terpanjang 660, sehingga default baru menyediakan ruang tanpa membutuhkan pelonggaran untuk setiap referensi. Klaim yang tidak dapat dipadatkan jujur tetap diganti, bukan dipotong qualifier-nya.

Config v1 tetap memakai batas lamanya. Renderer v2 dipisahkan dari ketergantungan pada validator/renderer konten v1, tanpa membuka tool v1. Untuk config v2, wrap/time/replay adalah metrics advisori, bukan gate lama 3 lines/fact atau ratio 2,5 yang tersamar. Menurut addendum penerimaan 13 November 2026, review naskah/layout ponsel bukan gate change ini. Hard budget tetap ditegakkan; technical PASS tidak menyatakan penerimaan editorial. NFC dan pemisah LF tetap deterministik; emoji dihitung konsisten sebagai karakter Unicode dan tidak dihapus. `text_metrics: {}` tetap input; server menghitung metrics.

CTA config2 mendukung beberapa baris dalam komponen teks yang sama; LF internal dihitung pada budget dan dipertahankan pada copy/readback. Tambahkan `cta_placement` opsional pada payload config2 dengan bentuk `after_facts` (default bila tidak diisi) atau `after_fact` beserta posisi fakta valid 1..jumlah fakta. Penempatan menentukan penyisipan CTA pada assembled copy tanpa mengubah posisi/identitas fakta. Blok fakta dan metriknya tetap menghitung fakta saja; full-copy metrics menghitung seluruh komponen serta separator. Ini tetap struktur trivia hook, fakta, dan CTA, tanpa menambah kuis/narasi atau bahasa layout executable.

Hard batas ini harus muncul sama pada input, output, SQL, binding arrays, readback, release/publication IDs, dan lifecycle. Tidak cukup menaikkan `facts.max` di save.

### D7 — CTA mengikuti DNA tanpa tujuan utama wajib

CTA config2 adalah teks natural yang dapat menggabungkan beberapa ajakan. Tidak ada tujuan utama wajib, hierarki primary/secondary, batas semantik jumlah aksi, maupun allowlist kombinasi yang harus terdaftar. Jangan mengganti batas lama menjadi “maksimal dua ajakan”. Profil memuat panduan nada, hubungan dengan topik, contoh/template, dan variasi penempatan; semuanya membantu penulis memilih pola yang sesuai, bukan memaksa satu kalimat atau campuran tertentu. Kebijakan emoji dan budget teks efektif tetap berlaku.

Metadata `cta_actions` bersifat deskriptif dan opsional, berupa label tanpa peringkat, misalnya react/follow/comment/tag/share/save. Label tidak bergantung enum enam aksi tersebut atau wajib dipetakan ke satu dari empat goal lama. Metadata kosong, tidak lengkap, atau wording baru tidak menyebabkan CTA sah ditolak. Penulis membaca makna kalimat utuh; server tidak mengklaim dapat menyimpulkan intent dari kata “like”, “share”, atau emoji saja. Nilai metadata yang diberikan tetap harus valid secara struktur, tetapi kelengkapan klasifikasinya bukan syarat save.

Untuk config2, input `interaction_goal` boleh tidak diisi atau null dan disimpan sebagai null bila tidak diberikan; column serta seluruh projection/filter lama yang terdampak harus mendukungnya. Bila diisi demi kompatibilitas, nilai legacy tersebut hanya anotasi opsional, tidak menyatakan tujuan utama, tidak membatasi CTA, dan tidak memaksa tag menjadi comment. Config1 tetap memerlukan nilai serta validasi legacy; record/hash lama tidak ditulis ulang. Jangan memilih goal palsu hanya agar constraint lama lolos. Snapshot menyimpan metadata deskriptif yang diberikan, teks serta penempatan CTA. Analytics lama mempertahankan arti goal historis dan menangani null sebagai tak terklasifikasi tanpa membuat label paksa; laporan/filter baru berdasarkan label CTA ditunda. Dukungan label opsional tidak memerlukan classifier CTA atau laporan multiaksi baru.

Penerimaan wajib mencakup like + follow Daily Facts, pertanyaan + like DYK, like + tag DYK, CTA beberapa baris, CTA sebelum fakta terakhir, dan wording ambigu tanpa pemaksaan label. Tambahkan kasus sintetis tiga atau lebih ajakan dalam budget sebagai regresi anti-pembatasan; kasus itu bukan klaim frekuensi corpus atau rekomendasi wajib produksi. Kehadiran komponen CTA tetap mengikuti kontrak; keputusan ini menghapus pembatas tujuan, bukan menambahkan kewajiban baru atas pola penulisan.

### D8 — Snapshot editorial baru di dalam alur konten v2

Content payload dan tool save/revise tetap versi 2. Tambahkan optional input `editorial_context` pada save/revise untuk config v2, berisi references profil/format/topik, architecture, density preference key, optional `cta_actions`, dan effective-rules hash dari context. Pada config v2 envelope editorial ini wajib secara conditional dan binding/hash dibandingkan server; label aksi CTA tetap opsional serta bukan bagian dari hash aturan efektif. Pada config v1 envelope tidak boleh dipakai untuk menyelundupkan profil baru. `cta_placement` berada pada payload konten; server menyimpan hasil normalisasinya dalam snapshot dan content hash bersama teks serta metadata yang diberikan, tanpa mengubah hash config1.

Server membangun generation snapshot schema 3 untuk config v2: immutable references + hashes, definisi/aturan efektif yang diperlukan audit, config identity/timestamp tepat, layout/locale/count, serta estimator version. Snapshot schema 2 lama tetap terbaca. Hash post config v1 tidak diubah; hash baru mencakup snapshot editorial yang benar-benar dipakai. `profile_key` kepadatan dipertahankan terpisah dari `editorial_profile_ref`.

Readback dan list/projection harus mengenali schema 2/3 snapshot serta array sampai 12. Identitas/versi DNA tetap disimpan pada snapshot dan ditampilkan melalui readback, tetapi dimensi/filter insights baru `editorial_profile`/`editorial_profile_version` ditunda. Analitik lama harus tetap menerima key dinamis serta goal null sesuai kontraknya tanpa mengganti arti `profile` kepadatan atau mengarang klasifikasi. Snapshot baru tidak mengikuti `latest` setelah definisi diperbarui. Revisi isi mengambil context baru, mengikat aturan yang sah, dan tetap membatalkan approval ready menurut kontrak.

Approval/publication memeriksa binding serta aturan efektif terhadap Page terkini. Bila Page mengadopsi profil berbeda, post lama yang tidak cocok memerlukan review/revisi eksplisit; gate tidak mengganti snapshot diam-diam. Publish definisi baru atau retirement saja tidak mengubah Page sehingga tidak membatalkan approval lama. Post posted/archived selalu dibaca sebagai riwayat aslinya.

### D9 — Read editorial dan transaksi tetap terpisah dari katalog fakta

Tetap pertahankan `trivia_find_similar_facts_v2` per batch maksimal sembilan calon dan maksimal 20 match per calon. Untuk 10–12 fakta, plugin memakai beberapa batch dengan candidate key unik. Semua keputusan final harus berasal dari versi katalog fakta yang konsisten; bila berubah, ulang Read yang diperlukan sebelum save. Tidak ada receipt dedup, embeddings, atau bypass `complete`.

Publish/retire katalog editorial memakai `expected_editorial_catalog_version`. Save/revise tetap memakai `expected_catalog_version` fakta, config CAS enam mikrodetik, operation key/payload yang identik untuk replay, serta revision/hash bila revise. Katalog editorial yang bertambah pada key lain tidak menimbulkan stale pada binding immutable yang masih sama. Replay sukses diperiksa sebelum validasi state mutable seperti retirement/config change, dengan otorisasi tetap wajib.

### D10 — Plugin yang sama mengonsumsi profil sebagai data

Perbarui paket Content Producer yang ada, identity dan `.app.json` owner OAuth tetap sama. Skill/core workflow mengajari mekanisme generik: baca Page context → baca definisi/contoh relevan yang belum lengkap → riset → dedup → compose sesuai profil → review → context terbaru → save → readback.

File panduan memuat workflow dan batas sumber/izin, bukan switch per nama akun atau format. Contoh baru berasal dari katalog; menambahkan key seperti `historical_curiosities` tidak memerlukan file runtime/ZIP baru. Panduan/exemplar adalah data editorial yang dibatasi, bukan instruksi untuk mengganti aturan host atau otorisasi.

Pertahankan review pre-write CR-061 dan arti tiga attestations. Ganti aturan eksklusif “hanya lima”, default hook global, no-emoji global, satu tujuan CTA global, dan rentang kata global untuk Page config v2 dengan resolusi profil. Plugin tidak meminta penulis memilih primary goal atau menghapus ajakan kedua/ketiga agar save lolos. Config v1 memakai jalur kompatibel. Semua output tetap memisahkan Canva copy, caption, hashtags, dan informasi internal.

### D11 — Kontrak lama disupersede melalui change record

Implementasi dimulai dengan Issue dan change record baru yang menyebut bagian frozen yang berubah pada `plans/trivia-content-dna.md`, module/tool/config contracts, CR-053, CR-059, dan CR-061. Proposal bukan izin mengubah kontrak frozen diam-diam.

Change `align-plugin-reference-content-dna` sudah selesai 28/28 dan berada di `openspec/changes/archive/align-plugin-reference-content-dna/` pada source task 1. Baseline utama CR-061 sudah tersinkronisasi; pertahankan kewajiban TDW-04/06/07 serta bukti LIVE historisnya saat menerapkan delta ini. Rekonsiliasi ini dicatat dalam [CR-062](../../../docs/decisions/2026-11-12-cr-062-configurable-trivia-editorial-profiles.md); tidak mengarsipkan ulang atau membuka ulang pekerjaan historis.

Perubahan schema umum bersifat aditif: config 1 tetap diterima, config 2 memakai pilihan baru, request envelope umum 1 dan konten 2 tetap. Direct SQL business grants, owner OAuth, source/dedup, claim/lease, CAS, replay, approval dan publication boundaries dipertahankan. Tidak reset database/post production atau auto-rewrite migration lama.

### Pengorganisasian implementasi — 10 paket kerja

Persetujuan pemilik atas peringkasan berlaku pada 10 paket di [tasks](tasks.md), dengan test fokus dan dokumentasi menjadi kriteria selesai setiap paket. Audit yang sudah ada, operation ledger, locking, dan helper project dipakai kembali bila sesuai; lengkapi gap bukti tanpa audit ulang penuh atau framework baru. Kelompok pengujian akhir hanya memeriksa integrasi lintas paket, bukan menunda seluruh test hingga akhir. Pemeriksaan unchanged-SHA dapat dipakai kembali sesuai AGENTS; gate rilis G4 dan kontrol keamanan tidak dikurangi.

Pengurangan scope fungsional hanya laporan/perbandingan DNA dan filter/pengelompokan CTA baru. Pemilihan satu DNA, profil campuran eksplisit, penambahan referensi/format melalui data, CTA fleksibel, snapshot serta kompatibilitas tetap menjadi penerimaan rilis pertama. Peringkasan tidak mengubah izin implementasi/commit/push/PR/merge/deploy/Write production. Tidak ada target durasi implementasi yang dianggap terbukti hanya dari jumlah checkbox.

## Risks / Trade-offs

- **[Katalog menjadi prompt injection]** → schema tertutup, batas ukuran, tidak ada executable code/URL instruction fetch, dan panduan selalu di bawah aturan sumber/izin host. Test adversarial pada examples wajib.
- **[Profile update mengubah semua Page]** → versi immutable dan pinned references; adopsi versi baru melalui CAS Page eksplisit. Retirement menutup selection baru, bukan mematikan binding lama.
- **[Naskah lebih panjang sulit dibaca]** → preferensi corpus tetap sempit, mechanical estimate transparan; QA visual bukan gate menurut instruksi pemilik 13 November 2026; tidak mengklaim loop estimasi sebagai retention nyata.
- **[Style classifier dianggap bukti fakta]** → schema/technical PASS dan penilaian DNA dipisahkan; sources produksi diperiksa ulang, contoh viral bukan sumber fakta.
- **[Input menerima 12 tetapi output menolak]** → matriks lintas context/plan/save/revise/get/approve/discard/publication/metrics dan smoke pada 10/11/12 posisi, bukan test save saja.
- **[Snapshot/compatibility drift]** → golden post config v1, replay sebelum/sesudah config berubah, pemisahan kepadatan/DNA, dan migrasi aditif tanpa mengubah hash histori.
- **[Katalog besar memperbesar context]** → summaries paginated, examples selected, cursor/completeness eksplisit; tidak mengirim 176 record ke setiap permintaan draft.
- **[Nama profil diasumsikan jaminan cloning/viral]** → penerimaan per pola dan output; kesamaan editorialis bukan jaminan performa atau izin menyalin isi.

## Migration Plan

1. Terima change record dan kontrak perubahan; gunakan audit corpus/hash serta cakupan regresi yang sudah tersedia dan lengkapi gap tanpa mengubah expected untuk menutupi defect. Tentukan matriks capaian di bawah sebelum implementasi; laksanakan dalam 10 paket dengan test/dokumen per paket.
2. Buat migration baru melalui Supabase CLI project yang dipin, setelah membaca help; jangan upgrade CLI/dependency sebagai efek samping. Tambah storage/RLS/RPC katalog, seed idempotent, resolver/config2, snapshot/renderer/lifecycle compatibility pada fixture terisolasi.
3. Tambah facade dan schema MCP aditif, update registry/catalog closure/diagnostics, audit pin serta manifest G4 dengan alasan objek/grant yang berubah. Tetap pertahankan lima tool v1 absen/ditolak dan owner denial. Target jumlah tool dihitung ulang dari registry, bukan angka historis.
4. Perbarui plugin yang sama dan dokumentasi; jalankan check serta regresi fokus menurut estimasi. Suite baru masuk manifest tanpa melemahkan coverage lama. Pengujian penerimaan berfokus pada integrasi teknis fixture; review naskah/layout ponsel dikeluarkan dari scope sesuai instruksi pemilik.
5. Commit/push/PR/merge memerlukan scope masing-masing. Setelah kandidat rilis final berada di `main` melalui alur yang diotorisasi, jalankan satu full backend gate formal G4 manual pada exact SHA itu sebelum deployment: committed config, source, dua stack/shard dan aggregate PASS. Bila run yang diizinkan diperkirakan >10 menit, mulai, catat SHA/URL/estimasi, lalu hentikan pemantauan chat sesuai AGENTS; tidak menandai PASS sebelum hasil selesai. Deployment dan instalasi tetap mempunyai izin terpisah.
6. Sesudah deployment yang diotorisasi, verifikasi katalog/context actual dan instal versi baru plugin yang sama. Uji saved-copy hanya pada Page/fixture terisolasi yang diotorisasi, lalu readback. Tidak mengubah OdlyTrue/corious facts atau Page production lain otomatis.
7. Adopsi profil per Page menjadi tindakan owner terpisah. Rollback menutup pengikatan config2 baru dan memakai release kompatibel yang tetap mampu membaca data config2; jangan memasang backend lama yang tidak dapat membaca post baru atau menghapus katalog untuk memaksa rollback. Definisi/binding lama tetap utuh; perbaikan forward diprioritaskan.

### Matriks penerimaan

| Kelompok | Bukti yang diwajibkan |
| --- | --- |
| Corpus | Parse 176 record; 172 ID per akun; duplikat/OCR/null ditandai; matriks setiap record ke architecture, mechanism, profile, CTA dan count tersedia tanpa menyebut semua naskah siap publikasi |
| Curious Mind | Single-subject food/body, themed food, mixed trivia, angka/kontras dan follow CTA; termasuk 9–10 fakta serta konteks ringan yang tidak harus high surprise |
| DYK | Single-subject, themed animal collection, comparison, myth, utility, historical collection, consequence, mixed; termasuk 10–11 fakta, uppercase, reaction/emoji, dan CTA tag/comment |
| Daily Facts | Koleksi kota/tempat, storage utility, mixed, 5–7 fakta, kalimat lebih menjelaskan, sentence-case, CTA react + follow tanpa emoji |
| Profil custom | Satu profil campuran dengan panduan hasil gabungan eksplisit dapat dipilih Page dan melewati context/save/readback/revise tanpa inheritance engine atau perubahan Page lain |
| CTA lintas profil | CTA DYK pertanyaan + like / like + tag, Daily Facts like + follow, beberapa baris, penempatan sebelum fakta terakhir, null goal dan label opsional terbaca utuh; kasus sintetis 3+ ajakan sah tanpa daftar kombinasi atau hierarki; config1 tetap kompatibel |
| Extensibility | Setelah build/deploy fixture, daftarkan format, topik, dan profil referensi baru lewat RPC/tool, Page pilih, context/save/readback/revise sukses; hash source/plugin/registry tidak berubah sepanjang percobaan |
| Analitik kompatibel | Insights lama tetap dapat membaca data config1/2 dengan key dinamis dan goal null tanpa klasifikasi palsu; versi DNA dan label opsional tersedia pada readback, tanpa mensyaratkan laporan/filter DNA/CTA baru |
| Integrity | Unknown key/cross-owner/reference cycle/retired new binding/stale CAS/replay/lost response/unsafe URL/over-budget/emoji policy ditolak tanpa hasil parsial |
| Lifecycle | Config1 golden dan config2 10/11/12 fakta; batch/resume, reschedule/revoke/discard/publish/archive; references/metrics/IDs tidak terpotong; history dan approval tetap tepat |
| Acceptance | Hasil teknis per kasus/profil; review naskah dan QA layout ponsel dikeluarkan dari gate. CI/FIXTURE tidak menggantikan LIVE dan satu profil technical FAIL tidak ditutupi rata-rata. Tidak ada klaim kelulusan editorial dari technical PASS |

Referensi tambahan yang dibaca untuk prinsip privilege/RLS: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). Implementasi tetap mengikuti role/API architecture project, bukan memberikan grant langsung yang tidak diperlukan.

## Pembekuan task 1 — 12 November 2026

[CR-062](../../../docs/decisions/2026-11-12-cr-062-configurable-trivia-editorial-profiles.md) membekukan D1–D11 untuk perubahan config2. [Kontrak/kompatibilitas](../../../docs/editorial/configurable-profiles/contract.md), [audit tambahan](../../../docs/editorial/configurable-profiles/audit.md), matriks 172 record serta fingerprint artefak tersedia sebelum perubahan source implementasi. Nama dua tool D2 adalah kontrak frozen; bentuk wire rinci tetap wajib konsisten dengan batas/perilaku tersebut. Ini bukti kontrak/corpus lokal, bukan PASS implementasi, release atau LIVE.

## Addendum penerimaan task9 — 13 November 2026

[Keputusan pemilik](../../../docs/decisions/2026-11-13-cr-062-task-9-technical-acceptance.md) mengeluarkan review naskah manual dan QA layout
ponsel dari gate change ini. Matriks profil di atas mengarahkan variasi input
serta assertion teknis, bukan penilaian naturalness/kemiripan. Tidak memindahkan
review itu ke task10. D1–D11 fungsional, kontrol penulisan runtime, ketiga input
corpus dan pemisahan LOCAL/FIXTURE/LIVE tetap dipertahankan.
