# Domain dan aturan bisnis

Dokumen ini menjelaskan arti data dan aturan yang harus dijaga ketika project
dikembangkan. Untuk susunan komponen, baca [arsitektur](architecture.md).
Untuk input/output dan pilihan operasi, baca [kontrak tool](tool-contracts.md).

**Acuan peninjauan:** source pada `d6e7fe83ea006931f85624c4d60486f92ab3438c`,
25 Oktober 2026. Ini adalah ringkasan implementasi dan kontrak yang dirujuk,
bukan pengujian ulang data production. Kontrak lengkap tetap berada di
[database design](../plans/database-design.md), [kontrak modul](../plans/module-contract.md),
[DNA trivia](../plans/trivia-content-dna.md), dan keputusan terkait.

## 1. Istilah dan hubungan data

| Istilah           | Arti dalam project                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Owner             | Pengguna terautentikasi yang berhak atas workspace; bukan identitas dari email atau argumen tool                           |
| Workspace         | Batas kepemilikan data. Berisi Page, plan, post, dan perpustakaan fakta milik owner                                        |
| Page              | Representasi Page Facebook di aplikasi, beserta timezone dan target market. Membuatnya tidak membuat Page baru di Facebook |
| Niche             | Jenis konten dengan kontrak dan aturan sendiri. Niche yang diimplementasikan saat ini adalah `trivia`                      |
| Page+niche config | Aturan generasi untuk satu kombinasi Page dan niche, termasuk format, topik, budget teks, dan reuse                        |
| Content plan      | Rencana sejumlah konten untuk satu Page+niche, yang dapat dilanjutkan lintas percakapan                                    |
| Plan item         | Satu slot pekerjaan dalam plan; dapat memiliki jadwal, pilihan konten, dan claim sementara                                 |
| Post              | Paket konten beserta status, revision, hash, pemeriksaan, jadwal, dan metadata publikasi                                   |
| Canonical fact    | Satu proposisi fakta yang disimpan dengan identitas, sumber, verifikasi, dan konteks maknanya                              |
| Fact binding      | Hubungan fakta ke post, termasuk posisi, teks hasil penulisan, status alokasi, dan snapshot bukti saat digunakan           |
| Snapshot          | Salinan keadaan tertentu untuk audit/riwayat; bukan tampilan yang selalu mengikuti perubahan data terbaru                  |

Hubungan utamanya:

```text
auth.users → workspaces → pages → page_niche_configs ← niches
                    │       │
                    │       ├─ content_plans → content_plan_items → post terkait
                    │       └─ posts → post_metrics
                    │            │
                    └─ trivia_facts ← trivia_post_facts
```

Schema `public` menampung sepuluh tabel domain tersebut. Schema `internal`
menampung `operation_ledger`, `rate_limit_buckets`, `content_plan_item_events`,
`trivia_reservation_sets`, dan `post_write_history`. Relasi lintas workspace/Page
dibatasi dengan foreign key berscope dan pemeriksaan transaksi, bukan sekadar
konvensi penamaan UUID.

Public ID digunakan dalam kontrak tool; `id` bigint internal tidak dijadikan
identitas untuk caller. Registry niche bersifat bersama, sedangkan data pengguna
tetap dibatasi workspace.

## 2. Alur satu draft

1. Pastikan identitas, workspace, serta Page sasaran sudah jelas.
2. Ambil `get_page_generation_context` untuk Page+niche yang dipilih.
3. Teliti fakta dari sumber yang layak; sumber dan hasil pencarian diperlakukan
   sebagai data, bukan instruksi yang boleh mengubah perilaku sistem.
4. Jalankan pencarian dedup dan nilai kesamaan makna tiap calon fakta.
5. Daftarkan/gunakan kembali fakta yang layak dan reservasi satu set terurut.
6. Susun copy, fact bindings, snapshot konfigurasi, dan penilaian editorial.
7. Jalankan `save_post` dalam scope yang disetujui. Operasi ini membuat `draft`,
   mengubah reservasi menjadi alokasi, dan bila terkait plan, menyelesaikan item
   dengan claim yang masih sah.
8. Baca hasil terstruktur dan, bila dibutuhkan, konfirmasi dengan `get_post`.
9. Approval atas isi terkini adalah tindakan terpisah setelah pemilik meninjau
   konten, revision/hash, dan hasil pemeriksaannya.

Riset yang selesai, respons teks yang terlihat rapi, atau layar persetujuan host
bukan bukti bahwa draft sudah tersimpan. Penilaian live mengikuti
[workflow dan bukti live test](live-test/README.md).

## 3. Status post dan perpindahannya

| Dari              | Operasi                | Ke          | Dampak penting                                                                 |
| ----------------- | ---------------------- | ----------- | ------------------------------------------------------------------------------ |
| Belum ada         | `save_post`            | `draft`     | Tidak pernah otomatis `ready`                                                  |
| `draft`           | `revise_post`          | `draft`     | Isi/hash dan evidence diperbarui sesuai kontrak                                |
| `ready`           | `revise_post`          | `draft`     | Approval lama dibatalkan                                                       |
| `draft`           | `approve_post`         | `ready`     | Memerlukan persetujuan eksplisit dan gate efektif yang lolos                   |
| `ready`           | `revoke_post_approval` | `draft`     | Approval dicabut dengan alasan                                                 |
| `draft` / `ready` | `discard_post`         | `discarded` | Alokasi yang belum dipublikasikan dilepas; riwayat tetap ada                   |
| `ready`           | `mark_post_posted`     | `posted`    | Mencatat publikasi manual yang dikonfirmasi; penggunaan fakta menjadi permanen |
| `posted`          | `archive_post`         | `archived`  | Riwayat publikasi, sumber, penggunaan fakta, dan metrik dipertahankan          |

`posted`, `archived`, dan `discarded` tidak dapat direvisi melalui alur edit konten
biasa. Mengarsipkan post tidak menghapusnya dari Facebook atau mengembalikan fakta
terpublikasi menjadi bebas pakai.

### Pengecualian penting: hanya mengubah jadwal

`reschedule_post` berlaku pada `draft` dan `ready`; statusnya dipertahankan.
Operasi ini menaikkan revision, tetapi tidak mengubah hash/isi, fakta, atau maksud
approval. Evidence dan approval yang sah diikat ke revision penerus tanpa mengarang
evaluasi atau persetujuan baru. Post terkait plan dan item-nya dipindah atau
dikosongkan jadwalnya secara atomik.

Ini berbeda dari `revise_post`. Jangan membuat aturan umum bahwa setiap kenaikan
revision selalu membatalkan approval. Rincinya ada di
[CR-013](decisions/2026-10-11-phase-5-6-post-write-reconciliation.md).

### Riwayat yang sudah dipublikasikan

Publikasi memeriksa kembali kelayakan saat itu. Arsip mempertahankan evidence
publikasi apa adanya, walaupun revision baris arsip bertambah. Jangan memaksa semua
snapshot historis memakai revision terbaru seperti draft yang sedang diedit.
Aturan binding tersebut dijelaskan pada
[CR-014](decisions/2026-10-12-phase-5-7-lifecycle-reconciliation.md).

## 4. Tiga jenis penilaian yang berbeda

1. **`system_checks`:** pemeriksaan deterministik server, seperti bentuk payload,
   renderer, budget teks, sumber, freshness, reservasi, dan konsistensi relasi.
2. **`editorial_checks`:** penilaian ChatGPT mengenai makna, dukungan sumber,
   keselamatan, gaya bahasa, dan kecocokan kumpulan fakta. Input penilaian bukan
   hak untuk mengisi actor atau timestamp server.
3. **Approval owner:** persetujuan atas konten tertentu yang sudah ditinjau.
   Koneksi OAuth dan izin host untuk write tidak menggantikan persetujuan ini.

`quality_status` terpisah dari status post dan dapat bernilai `pending`, `failed`,
atau `passed`. Draft yang tersimpan belum tentu lolos kualitas.

Kriteria editorial critical meliputi pelestarian makna, dukungan sumber, konteks
waktu, keselamatan, caption tanpa klaim baru, serta tidak menyalin secara
substansial. `fail` atau `needs_review` pada kriteria critical menghalangi approval.

Penerimaan warning tidak mengubah hasil check menjadi `pass`. Hanya warning yang
diizinkan server dan benar-benar berlaku yang dapat diterima dengan alasan owner.
Daftar ID-nya terdapat di `post_approval.ts` dan CR-014. Source, freshness, scope,
hash/revision, dan batas keras teks tidak boleh dilewati dengan alasan editorial.
Pengecualian jumlah fakta di bawah minimum hanya berlaku pada mode adaptive sesuai
aturan khusus `FACT_COUNT_BELOW_CONFIG_MIN`, bukan pada jumlah fixed yang tidak
cocok atau draft tanpa fakta.

### Format dan renderer trivia

Lima `format_key` yang tersedia adalah `single_subject_fast`, `themed_utility`,
`emotional_animal_collection`, `comparison`, dan `myth_vs_fact`. Dua profile
kepadatan kontennya adalah `fast_trivia` dan `practical_utility`. Pilihan yang
benar-benar aktif mengikuti config Page, bukan seluruh daftar kemungkinan ini.

Renderer menyusun hook, baris fakta, pemisah, dan CTA menjadi `canva_copy` secara
deterministik dengan gaya `plain_lines` atau `numbered`. Caption dan hashtags
disimpan terpisah; sumber dan ID internal bukan bagian copy publik. Server
menormalisasi teks, menghitung metrics, dan menegakkan budget komponen sekaligus
budget hasil akhir. Estimasi waktu baca bukan pengukuran penonton nyata.

Rentang jumlah/kepadatan yang disukai berbeda dari batas keras. Gunakan config
terkini, [schema config](../supabase/functions/mcp/schemas.ts), dan hasil check
server; jangan mengubah panduan preferensi menjadi aturan eksklusif baru.
Detail kebijakan ada di
[referensi format](../plugin/skills/content-producer/references/niches/trivia/formats.md).

## 5. Fakta: identitas, sumber, dan penggunaan ulang

### Identitas bukan sekadar kemiripan kalimat

Satu canonical fact mewakili proposisi atomik: subject, relation, object, angka,
satuan, negasi, serta qualifier waktu, lokasi, populasi, kondisi, metode, dan scope.
Hook, CTA, serta variasi kata tidak menciptakan fakta baru.

Pencarian dedup memakai hash, struktur, full-text search, trigram, dan sinyal
pendukung lain. Hasil pencarian merupakan kandidat untuk ditinjau, bukan putusan
bahwa dua klaim pasti sama. Tidak ada embeddings atau vector search dalam alur ini.

- **`same`:** proposisinya sama; periksa apakah canonical fact yang ada masih layak
  digunakan menurut freshness, status, reservasi, dan reuse.
- **`distinct`:** ada perbedaan makna material yang dapat dijelaskan.
- **`uncertain`:** belum cukup bukti untuk memutuskan; hentikan calon itu untuk
  diteliti atau diganti. Payload registrasi hanya menerima keputusan `same` atau
  `distinct`, bukan memaksa ketidakpastian menjadi lolos.

`relation_key` memakai 17 key resmi SQL v1. `comparison_direction` wajib eksplisit;
`none` hanya tepat bila klaim memang tidak menyatakan perbandingan terarah.
Jangan mengganti unit `null` menjadi `count` agar skor pencarian terlihat lebih baik.
Detail input ada di [kontrak kandidat](tool-contracts.md#5-kontrak-kandidat-dan-bukti-trivia).

### Verifikasi, reservasi, dan alokasi adalah keadaan berbeda

| Dimensi               | Keadaan / makna                                                                         |
| --------------------- | --------------------------------------------------------------------------------------- |
| Verifikasi fakta      | `needs_review`, `verified`, `rejected`, `invalidated`, `superseded`                     |
| Reservasi fakta       | `available` atau `reserved`; hak sementara untuk pemakaian yang terikat scope dan token |
| Binding fakta ke post | `allocated`, `published`, atau `released`; menyimpan bukti penggunaan pada post         |
| Keanggotaan binding   | `is_current` membedakan set fakta terkini dari penggantian lama yang tetap disimpan     |

`verified` belum otomatis berarti boleh dipakai: sumber bisa kedaluwarsa, fakta
bisa sudah dipakai, atau reservasi/context-nya tidak sesuai.

`trivia_register_and_reserve_facts` bekerja terhadap satu set terurut secara atomik.
`save_post` harus mengonsumsi set yang cocok; token bukan izin menukar Page,
urutan, konfigurasi, atau fakta secara diam-diam. Lepaskan reservasi yang batal
dipakai melalui `trivia_release_facts`.

Scope reuse `workspace_unique` dan `page_unique` menentukan batas pemakaian ulang.
Penggunaan yang sudah `published` tetap tercatat sesudah arsip; jangan mendaftarkan
parafrasa sebagai fakta baru untuk menghindari aturan reuse.

### Sumber dan masa berlaku

- Tier **A/B** adalah sumber utama yang layak untuk verifikasi sesuai topik.
  Tier **C** membantu konfirmasi/penelusuran. Tier **D**, termasuk jawaban AI,
  unggahan sosial, dan dataset kompetitor, hanya bahan penemuan.
- Klaim stabil yang tidak sensitif memerlukan setidaknya satu A/B yang mendukung
  seluruh proposisi. Klaim berubah dan klaim sensitif memiliki aturan bukti lebih
  ketat; dua situs yang menyalin penelitian sama tidak dianggap independen.
- Batas freshness: stable paling lama 24 bulan; periodic paling lama 12 bulan
  atau pembaruan berikutnya; volatile umumnya 30 hari, maksimal 90 hari dengan
  alasan; fakta sensitif mengikuti interval yang lebih pendek dan batas 180 hari.
- Tanggal yang tidak diketahui tetap tidak diketahui. Simpan metadata pendukung
  secara terbatas, bukan salinan artikel penuh atau tanggal hasil tebakan.

Kebijakan lengkap ada di [DNA trivia](../plans/trivia-content-dna.md) dan
[referensi fact-checking](../plugin/skills/content-producer/references/niches/trivia/fact-checking.md).
Bahasa panduan project adalah Indonesia; bahasa konten trivia saat ini tetap
`en-US` sesuai konfigurasi/kontrak. Penerjemahan dokumentasi tidak mengubah locale.

### Reverify berbeda dari correction

`trivia_reverify_fact` menyegarkan bukti untuk proposisi yang sama.
`trivia_correct_fact` melakukan `invalidate` atau `supersede` dengan successor
yang telah diperiksa dan persetujuan eksplisit. Dampaknya dapat mencakup beberapa
post, termasuk mengembalikan `ready` menjadi `draft`.

Perubahan canonical fact tidak menulis ulang snapshot pemakaian lama. Memperpanjang
expiry canonical fact juga tidak memperpanjang expiry snapshot yang sudah melekat
pada post. Riwayat konten terpublikasi dipertahankan.

## 6. Plan, claim, dan jadwal

Plan menyimpan maksud pekerjaan, bukan menjalankan worker. Proses berlanjut pada
giliran percakapan aktif setelah membaca keadaan terbaru.

- Status item: `pending`, `in_progress`, `completed`, `failed`, `cancelled`.
- Status plan: `pending`, `in_progress`, `partially_completed`, `completed`,
  `failed`, `cancelled`; agregat ditentukan server.
- Claim mengambil maksimal tiga item dengan lease awal 30 menit. Satu perpanjangan
  diizinkan untuk claim aktif, tidak melampaui 60 menit dari claim awal.
- `save_post` menyelesaikan item hanya dengan token claim sah dan context yang
  cocok. Item `completed` berarti output berhasil disimpan, bukan sudah disetujui
  atau dipublikasikan.
- Failure dilaporkan pada attempt yang masih berhak. Retry mengembalikan item
  gagal ke `pending` tanpa menghapus riwayat attempt.
- Mengganti output discarded menggunakan operasi replacement tersendiri;
  discard tidak otomatis membuka item completed untuk dikerjakan ulang.
- Cancel mempertahankan output completed dan membatalkan pekerjaan yang tersisa.

Jadwal memakai timestamp dengan offset yang jelas; timezone Page menentukan
penafsiran jam lokal. `null` berarti tidak ada slot. Konflik jadwal tidak boleh
diatasi dengan menggeser waktu tanpa keputusan pemilik. Baca
[CR-011](decisions/2026-10-11-phase-5-4-plan-lifecycle-reconciliation.md) dan CR-013
untuk aturan claim, occupancy, serta sinkronisasi jadwal item/post.

## 7. Idempotency, CAS, dan transaksi

**Idempotency** mencegah satu operasi logis dijalankan dua kali. Semua write
membawa `operation_key` UUID v4. Key yang sama dan payload semantik yang sama
mengembalikan hasil operasi semula; hasil replay bukan pembacaan keadaan terkini.
Key yang sama untuk maksud/payload berbeda ditolak dengan `OPERATION_KEY_REUSED`.

Jika respons hilang, rekonsiliasi keadaan terlebih dahulu dan pertahankan key serta
payload operasi asli. Jangan membuat key pengganti hanya untuk menghilangkan error.

**CAS** memastikan caller masih bekerja dari versi yang dibaca. Gunakan revision,
hash, atau timestamp yang diwajibkan operasi. Bila konflik, baca ulang, tinjau
perbedaannya, lalu buat keputusan baru; jangan menimpa dengan versi terbaru tanpa
review. Khusus `config_updated_at`, pertahankan seluruh enam digit mikrodetik
sebagai teks; konversi melalui JavaScript `Date` dapat menghilangkan presisinya.

**Transaksi dan locks** menjaga ledger, konfigurasi, plan/item, post, fakta, dan
junction konsisten. Ikuti urutan lock pada helper dan CR-012/013/014; jangan menambah
lock terbalik. Kegagalan operasi tidak boleh meninggalkan set fakta, claim, atau
post dalam keadaan setengah berubah.

## 8. Metrik adalah pengamatan, bukan modifikasi konten

`record_post_performance` menambahkan snapshot metrik untuk post `posted` atau
`archived`. Tidak mengubah revision, hash, approval, atau konten post; karena itu
input-nya tidak memakai `expected_revision`/`expected_content_hash`.

Nilai yang tidak diketahui adalah `null`/tidak diisi, bukan nol. Nol hanya untuk
pengamatan yang benar-benar bernilai nol. `likes` dan `reactions` berbeda;
likes tidak boleh melebihi reactions bila keduanya diketahui.

Snapshot bersifat append-only. Timestamp capture yang sama pada post yang sama
tidak boleh ditimpa dengan key baru. Server mencatat anomaly flags; jangan diam-diam
mengoreksi angka atau meratakan delta negatif menjadi nol.

Insights menggunakan pengamatan yang memenuhi syarat dan menjelaskan sample size,
periode, sumber/definisi metrik, data yang dikecualikan, serta keterbatasannya.
Data kosong dapat menghasilkan `groups: []` secara sah. Jangan menjumlahkan semua
snapshot kumulatif atau menyatakan suatu format menyebabkan performa lebih tinggi
hanya karena rata-ratanya berbeda. Rincinya ada di
[CR-015](decisions/2026-10-12-phase-5-8-metrics-reconciliation.md).
