# Kontrak Read fakta trivia v2 — P2-T3

**Status:** kontrak desain sebelum P3-T3; retrieval/RPC v2, oracle database,
eksperimen A/B, host, dan LIVE **NOT RUN**. **Baseline:** A (`complete` dan
`catalog_version` per workspace) menurut CR-053. Dokumen ini melengkapi
[kontrak contoh P1](trivia-draft-v2.md), [identitas P2-T1](trivia-fact-identity-v2.md),
[corpus dan ambang P2-T2](../../supabase/tests/fixtures/trivia/dedup-v2/baseline-and-thresholds.md),
TFL-06..10, serta [design](../../openspec/changes/simplify-trivia-draft-workflow/design.md).
Angka dan oracle di bawah dibekukan **sebelum** hasil retrieval v2 dilihat.
Perubahan aturan memerlukan versi kontrak/fixture baru dan review sebelum evaluasi;
hasil P3 tidak boleh dipakai untuk menyesuaikan expected.

**Pelengkap P5 Accepted:**
[CR-056](../decisions/2026-11-02-cr-056-versioned-trivia-maintenance.md)
menambah `fact_updated_at` pada setiap match sebagai CAS canonical maintenance,
presisi enam digit dan berasal dari snapshot Read yang sama. Predicate, ranking,
cap, `complete`, eligibility dan katalog A di dokumen ini tetap dibekukan;
penambahan field bukan tuning retrieval. Bukti P5 terpisah dari status desain
historis di atas dan tercatat pada [hasil P5](../../openspec/changes/simplify-trivia-draft-workflow/phase-5-results.md).

## 1. Input, scope, dan himpunan kandidat wajib

`trivia_find_similar_facts_v2` menerima `request_schema_version: 2`, workspace,
Page owner, serta 1–9 pasangan `candidate_key`/`claim_text` en-US (1–500 karakter).
Tidak meminta URL, ontologi, sumber, atau keputusan makna pada Read. Satu request
menggunakan satu snapshot katalog workspace yang konsisten; semua baris, usage,
status, dan `catalog_version` di respons berasal dari snapshot yang sama.
Owner/Page diselesaikan sebelum data bisnis dibaca. Identitas workspace lain
tidak masuk himpunan maupun petunjuk hitungan.
Read v1 yang masih sah tetap memakai envelope v1. Untuk kandidat wajib
v2-native tanpa ontologi v1 sah, pengecualian CR-054 mengizinkan penolakan
terarah `FACT_REVIEW_REQUIRED`; kandidat/usage tidak boleh diam-diam
disembunyikan, dan request v1 lain tidak boleh ditolak massal. Ini tidak
menuntut proyeksi sukses v1 penuh untuk native v2.

Untuk **setiap** kalimat query, bentuk `n = internal.trivia_normalize_claim_v1`
yang sama dengan identity registry v1; perbandingan exact mengikuti
`normalized_claim`. Himpunan wajib `M(n)` berisi **semua identitas canonical**
dalam workspace yang memenuhi sedikitnya satu predicate berikut, tanpa filter
status koreksi, evidence, asal v1/v2, atau eligibility:

1. `normalized_claim = n` (exact normalized);
2. full-text `search_vector` terhadap `plainto_tsquery('simple', n)` memberi
   `ts_rank_cd > 0`;
3. `extensions.similarity(normalized_claim, n) >= 0.20`.

Himpunan menggunakan `public.trivia_facts` yang sama untuk v1 dan v2, termasuk
`needs_review`, `verified`, `invalidated`, `superseded`, dan `rejected`.
Status negatif harus tetap terlihat sebagai petunjuk history jika predicate
terpenuhi; tidak boleh disaring dulu untuk membuat hasil tampak lengkap.
Pencarian ini **menghasilkan kandidat**, bukan keputusan semantik. Ia mungkin
melewatkan parafrasa tanpa sinyal leksikal; `complete=true` tidak menyatakan
seluruh parafrasa dunia ditemukan. `distinct` hanya boleh diputus setelah
perbedaan proposisi material ditinjau; `same` menggunakan ID canonical lama
bila layak. `uncertain`, `same` yang terpakai/tidak layak, atau dua fakta final
yang diketahui bermakna sama memicu penggantian calon.

Urutkan `M(n)` secara stabil: exact normalized lebih dulu, lalu `ts_rank_cd`
menurun, lalu similarity trigram menurun, lalu `fact_public_id` menaik.
NULL/non-match score bernilai nol untuk pengurutan. ID, bukan posisi output,
menjadi referensi review. Urutan ini bukan skor kepastian makna. Tidak ada
auto-merge berdasarkan ranking, kata sama, atau URL sama. Implementasi P3
boleh mengoptimalkan query/index, tetapi tidak boleh mengubah predicate,
pengurutan, atau truthfulness `complete` tanpa revisi kontrak sebelum evaluasi.

## 2. Batas respons dan arti `complete`

Maksimum **20 match per calon** dan **9 calon per Read** sesuai schema P1.
Hitung seluruh `M(n)` sebelum menerapkan limit 20. Kembalikan prefix terurut
hingga 20 dengan field P1: `fact_public_id`, `claim_text`, `status`,
`reuse_eligibility`, `used_on_page`, `used_in_workspace`. Tidak ada token
reservasi, ID internal, atau sumber privat. `complete=true` **jika dan hanya
jika** seluruh `M(n)` pada snapshot itu terlihat di `matches[]` dan seluruh
field wajib valid. `M(n)=0` berarti `matches=[]`, `complete=true`; klaim aman
hanya “tidak ada duplikasi yang terdeteksi oleh aturan retrieval pada versi ini”.
Jika `|M(n)|>20`, `matches` memuat 20 teratas dan `complete=false` untuk calon
itu, termasuk bila match ke-21 adalah fakta negatif, v1, atau terpakai.
Calon lain dalam batch boleh tetap `complete=true`. Tidak ada silent truncation.

Jika batas ukuran respons, timeout, atau kegagalan query menghalangi penyajian
prefix/field yang valid, sistem mengembalikan error Read terarah atau respons
valid dengan `complete=false` untuk semua calon terdampak; ia tidak boleh
mengembalikan `complete=true` dari pemeriksaan parsial. Jika host memotong
respons, kehilangan field, atau tidak menampilkan match yang wajib ditinjau,
caller menganggap calon tersebut **incomplete walau flag server true**.
Calon incomplete, `uncertain`, atau yang match `same`-nya terlarang diganti
dengan calon cadangan yang diriset dan dibaca lagi. Jangan menyimpan calon itu,
memaksa review panjang, atau menafsirkan hasil kosong yang terpotong sebagai
bersih. Kegagalan Read seluruhnya tidak mempunyai `catalog_version` yang sah
untuk Write. Jika cadangan kurang, riset lagi; jika tetap kurang, laporkan
progres dan titik berhenti tanpa menebak jumlah draft sukses.

Eligibility diproyeksikan terpisah dari `status`: status negatif selalu
`not_eligible`; reservasi v1 aktif menjadi `actively_reserved`; usage pada
scope `workspace_unique`/`page_unique` menjadi `workspace_blocked` atau
`page_blocked`; sisanya `eligible` bila aturan versi yang sah mengizinkan.
Jika beberapa blocker ada sekaligus, prioritas projection adalah
`not_eligible` → `actively_reserved` → `workspace_blocked` →
`page_blocked` → `eligible`; booleans usage tetap menunjukkan pemakaian
meski blocker prioritas lain menang. `needs_review` pada native v2 tidak
otomatis `not_eligible` hanya karena envelope v1 absen: satu URL v2 sah dan
aturan reuse tetap diperiksa saat Write.
`used_on_page`/`used_in_workspace` menghitung alokasi draft **dan** published
lintas v1/v2; released/noncurrent bukan penggunaan aktif, tetapi history
published tetap dipertahankan. Kelayakan Read adalah petunjuk snapshot,
bukan izin Write: waktu reservasi, status, owner, config dan usage dicek ulang
setelah lock. Expiry evidence v1 saja tidak menghapus identitas atau usage;
URL baru yang diteliti dapat dipakai v2 bila status/reuse mengizinkan.

## 3. Versi katalog A dan event yang mengubahnya

`catalog_version` adalah string desimal counter monotonic **per workspace**,
diambil dari snapshot Read yang sama. Caller menyalinnya tanpa Number/Date
conversion sebagai `expected_catalog_version` pada save/revise v2. Counter
bertambah atomik bersama commit perubahan state berikut, termasuk jalur v1:

| Event committed | Dampak versi |
| --- | --- |
| Identitas baru, perubahan claim/normalisasi atau projection identitas yang mengubah predicate/urutan/claim yang dibaca | Naik |
| Perubahan status koreksi, lineage, atau kelayakan evidence yang dapat mengubah hasil/eligibility | Naik |
| Reservasi v1 diperoleh, dilepas, atau dibersihkan secara termaterialisasi sehingga eligibility berubah | Naik |
| Binding/usage current dialokasikan, dilepas, atau menjadi published; perubahan reuse scope yang memengaruhi eligibility | Naik |
| Replay ledger tanpa mutasi, rollback, Read, atau lewatnya TTL tanpa mutasi row | Tidak naik |

Counter naik sekali per **transaksi mutasi katalog**, bukan angka tetap per
fakta/post. Mutasi beberapa fakta di satu transaksi tidak menjanjikan selisih
versi tertentu. Perubahan fakta lain dalam workspace tetap menaikkan versi;
baseline A sengaja konservatif. Perubahan di workspace lain tidak menaikkan
versi workspace ini. Hook v1 dipasang sebelum backfill; catch-up/audit di bawah
workspace gate menutup celah antara write v1 committed dan pandangan v2.
P3-T1/T2 membuktikan event-set, history dan trigger/RPC aktual; daftar ini
bukan klaim schema sudah terpasang. TTL lewat sendiri tidak naik, tetapi
eligibility bergantung waktu sehingga Read dan Write harus mengevaluasi waktu
sekarang dan Write recheck setelah lock.

Save/revise **mengambil workspace gate**, lalu membandingkan versi yang
terbaca dengan `expected_catalog_version` sebelum mutasi bisnis. Ketidakcocokan
memberi `FACT_CATALOG_CONFLICT` dan rollback tanpa post/fakta/alokasi/plan
completed parsial, **meskipun perubahan tidak terkait calon**. Caller melakukan
Read ulang untuk semua calon final, meninjau match dan usage baru, lalu
menyusun operasi baru sesuai state. Riset URL yang masih mendukung klaim tidak
perlu otomatis diulang. Konflik config memakai `PAGE_VERSION_CONFLICT` dan
context Page baru dengan enam digit mikrodetik asli. Replay operasi lama yang
telah commit memakai key/payload semantik identik setelah rekonsiliasi; replay
tidak diblokir semata oleh katalog/config yang kemudian berubah.

## 4. Contoh kontrak sintetis dan oracle sebelum P3

Contoh ini **bukan respons runtime**. `F1`/`F2` adalah alias ID canonical
sintetis; wire memakai UUID. `v=42` dan `v=43` adalah contoh string, bukan
janji increment per operasi. Bentuk wire lengkap tetap schema P1.

| Kasus | State/query dalam satu workspace | Oracle Read dan tindakan |
| --- | --- | --- |
| O01 | `M(n)=0`, snapshot v42 | `matches=[]`, `complete=true`, `catalog_version="42"`; hanya tidak ada match terdeteksi |
| O02 | F1 exact normalized, status verified, belum dipakai | F1 tampil, `complete=true`; `same` memakai ID F1 bila review makna setuju |
| O03 | F1 parafrasa terjaring trigram/full-text, F2 mirip kata tetapi angka/negasi berbeda | Keduanya tampil bila memenuhi predicate; review `same`/`distinct` berdasar makna, tanpa auto-merge |
| O04 | F1 invalidated, F2 superseded, F3 rejected dan semuanya memenuhi predicate | Ketiganya tampil dengan status/`not_eligible`; `same` pada salah satu diganti, bukan ID baru |
| O05 | F1 berstatus layak tetapi allocated draft pada Page yang sama | F1 tampil dengan `used_on_page=true` dan blocker; calon `same` diganti |
| O06 | F1 published pada Page A; Read Page B dengan `workspace_unique` | F1 tampil `used_in_workspace=true`, `workspace_blocked`; tidak dialokasikan ulang |
| O07 | F1 published pada Page A; Read Page B dengan `page_unique` | F1 tampil dengan usage workspace, tetapi bisa `eligible` di B jika tak ada blocker lain |
| O08 | F1 mempunyai reservasi v1 aktif | F1 tampil `actively_reserved`; setelah TTL lewat, Read boleh melihat eligibility baru dengan versi sama, Write tetap recheck waktu |
| O09 | Tepat 20 identitas memenuhi predicate | Semua 20 tampil, `complete=true`, termasuk status negatif dan v1 |
| O10 | 21 identitas memenuhi predicate; yang ke-21 adalah status negatif | Hanya 20 pertama tampil, `complete=false`; calon diganti, bukan “bersih” |
| O11 | Batch dua calon: A punya 21 match, B punya nol | A `complete=false`, B `complete=true`; satu `catalog_version` snapshot untuk keduanya |
| O12 | Server valid lengkap, host menghilangkan match/field wajib | Caller menganggap incomplete dan mengganti calon; tidak mengarang respons lain |
| O13 | Read v42 lalu mutasi identitas/usage **lain** commit pada workspace menjadi v43 | Save v42 ditolak `FACT_CATALOG_CONFLICT`, rollback, Read ulang; tidak ada pengecualian B |
| O14 | Read v42 lalu write v1/simpan v2/koreksi yang relevan commit menjadi v43 | Save v42 ditolak; Read baru melihat ID/status/usage terkini sebelum keputusan baru |
| O15 | Query timeout/oversize sebelum seluruh kandidat wajib diketahui | Error Read atau `complete=false` pada calon terdampak; tidak ada versi sah untuk keputusan final dari respons gagal |
| O16 | Calon `same` terhadap F1 yang hanya evidence v1 expired, status/usage masih mengizinkan | F1 tetap terlihat; v2 dapat memakai ID sama setelah riset satu URL baru, tanpa menulis ulang snapshot v1 |

Untuk contoh wire sukses berisi match dan versi, lihat
`single.findRequest`/`single.findResponse` dalam
[fixture P1](../../tests/fixtures/trivia-draft-v2.ts). O01 adalah bentuk
`{candidate_key, complete: true, matches: []}` di dalam envelope P1; O10
memakai bentuk yang sama dengan `complete: false` serta **tepat 20** match,
bukan array berisi 21 atau flag `true`. Contoh error stale dan recovery
`FACT_CATALOG_CONFLICT` ada di `errors.catalog` pada fixture yang sama.
Nilai fixture hanyalah bentuk kontrak; oracle O01–O16 di atas menentukan
expected berdasarkan keadaan database, bukan menganggap fixture sebagai hasil
retrieval nyata.

Oracle truthfulness membandingkan **himpunan penuh `M(n)` dari snapshot database**
dengan `matches[]`, flag, urutan, cap, dan versi; bukan menebak dari hanya
respons yang terlihat. Minimal O01–O16 menjadi fixture DB terisolasi P3-T3,
dengan variasi limit/status dan audit before/after. Kriteria `complete` adalah
**100% benar relatif terhadap oracle**: tidak ada `complete=true` jika satu
ID wajib/field hilang. Evaluasi tetap **NOT RUN** sampai DB v2 ada. Corpus
P2-T2 dan ambang recall parafrasa@20 >=38/40, false merge 0 dengan trace
keputusan nyata, serta history negatif 18/18 tidak diubah oleh oracle ini.

## 5. Protokol pembanding A/B, belum dijalankan

Baseline **A** diimplementasikan dan diuji dahulu. **B** hanya kandidat
eksperimen terisolasi bila scope eksperimen diizinkan; B tidak mengganti
`catalog_version`, schema P1, atau aturan stale pada A saat ini. Gunakan
corpus/threshold P2-T2 yang sama, snapshot seed dan beban identik, dua sesi DB,
barrier/lock overlap yang tercatat, serta kedua urutan commit. B harus
menjalankan ulang predicate retrieval bagi setiap fakta final **di dalam**
transaksi setelah workspace gate, mencakup kandidat yang baru muncul; hanya
membandingkan ID dari Read lama tidak sah. Ikat review pada kalimat query,
versi aturan, ID dan versi makna kandidat; recheck usage/status/TTL. Bentuk
fingerprint/receipt belum dipilih dan tidak menjadi kontrak baru di sini.

| Kelompok kasus wajib | Bukti yang dicatat untuk A dan B |
| --- | --- |
| Perubahan fakta tidak terkait setelah Read | A menolak versi lama; B hanya boleh menerima bila semua validasi relevan lulus |
| Dua save ID sama: Page sama, workspace_unique lintas Page, page_unique lintas Page | State akhir, satu penggunaan sah per scope, rollback pihak kalah, kedua commit order |
| Parafrasa/kandidat baru atau makna/status berubah setelah Read | Retrieval ulang B melihat kandidat baru; tak ada ID/pemakaian pengelak atau keputusan lama yang tidak sah |
| Dua set fakta tumpang tindih; Read/retrieval ulang incomplete | Seluruh transaksi kalah rollback; tak ada false-clean atau draft parsial |
| Reservasi, save, correction v1 berhadapan dengan v2 | Visibility registry/usage/status lintas versi, waktu tunggu, rollback dan kedua commit order |
| Same-key replay, respons hilang, lock timeout, config stale, error tengah save | Satu hasil logis, rekonsiliasi sebelum operasi baru, tidak ada deadlock/data parsial |

Jika lock timeout terjadi sebelum mutasi dan rollback terbukti, laporkan
penolakan sementara serta waktu tunggu yang diketahui. Bila respons Write
hilang setelah dispatch, hasilnya **unknown**, bukan rollback yang diasumsikan:
baca state/ledger yang sah dan replay hanya key/payload semantik identik.
Jangan menciptakan key baru atau berpindah A/B sebelum hasil lama jelas.

Catat SHA, fixture/readback, overlap lock, kandidat yang terlihat/terlewat,
penolakan tidak terkait, jumlah Read ulang, riset ulang yang benar-benar perlu,
latensi/waktu tunggu, deadlock dan state akhir. Toleransi pelanggaran scope,
false-clean serta data parsial **nol**; manfaat performa B belum mempunyai
ambang diterima. Hasil eksperimen, jika kelak ada, tetap bahan keputusan
pemilik. Mengganti A memerlukan hasil, ambang manfaat yang disetujui, revisi
FR-03/FR-04, contoh kontrak, dan change record sebelum coding pengganti.
