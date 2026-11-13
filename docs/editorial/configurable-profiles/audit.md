# Audit tambahan dan bukti reproduksi task 1

12 November 2026, basis source `c02c5413479cebf50f39abc10149fafca757611a`.
Status bukti: **LOCAL/CORPUS**, bukan verifikasi klaim, preview produksi, QA
visual, atau LIVE. Audit pola lama di `plans/trivia-content-dna.md` §3 dan
[design](../../../openspec/changes/add-configurable-trivia-editorial-profiles/design.md)
dipakai kembali. Pekerjaan baru hanya mengisi matriks per record, adjudikasi
gap format/topik, pengelompokan mekanisme, bobot dan reproduksi hitungan.
Tidak membaca ulang seluruh corpus untuk menilai akurasi/editorial dari nol.

## Input dan unit hitung

| File di `dataset-reference/` | SHA-256 utuh | Mentah / akun+ID unik |
| --- | --- | ---: |
| `post-coriousmind.txt` | `7388ba52b29aab246841c0d046535f19568c32def0ae6e56a43b3d4254b485da` | 55 / 51 |
| `post-dyk.txt` | `4d975bd91fa6ebfecc101ca6958b5b0bacd2490a6ccb1ad72a55274ac283594f` | 103 / 103 |
| `post-dailyfacts.txt` | `f00bf8cbd7c33735e40a9c21e9052677f05eaabc172ee60c50d322c340edf329` | 18 / 18 |

Ketiga hash identik dengan proposal/design. Jumlah 176/172 tidak sama dengan
171 exact-unique content bodies pada DNA frozen; keduanya benar karena unitnya
berbeda. Curious Mind POST-016/017/018/019 masing-masing muncul dua kali pada
baris 16/20, 17/21, 18/22, 19/23, dengan payload identik. Statistik dedup akun+ID
menghitung masing-masing sekali. POST-047 dan POST-052 Curious Mind berbeda ID
namun copy identik, sehingga 172 akun+ID menjadi 171 isi unik. Keduanya tetap
ditandai dalam matriks; tidak dianggap dua bukti keberhasilan independen.

POST-055 Curious Mind dan POST-055 dyk adalah record berbeda; identitas selalu
pasangan profil/akun dan ID, tidak memakai ID global saja. Pengulangan proposisi
lintas akun (misalnya deer Curious Mind POST-003 dan DYK POST-113) tidak disertifikasi
sebagai exact duplicate. Audit ini bukan semantic dedup produksi atau anotasi
seluruh pasangan klaim. Pengulangan intra-post DYK POST-153 fakta 3/4 ditandai.

## Hasil statistik yang direproduksi

| Ukuran (akun+ID unik) | Curious Mind | DYK | Daily Facts |
| --- | ---: | ---: | ---: |
| Engagement lengkap | 51 | 100 | 18 |
| Count min–max | 6–10 | 5–11 | 5–7 |
| Median kata copy / fakta | 82 / 9 | 89 / 10 | 97,5 / 14 |
| Maksimum kata copy | 109 | 125 | 124 |
| Maksimum karakter copy mentah | 624 | 708 | 728 |
| Copy >600 karakter | 2 | 14 | 7 |
| Blok fakta >500 karakter | 5 | 25 | 10 |
| Maksimum blok fakta | 574 | 635 | 660 |
| Maksimum CTA (LF internal) | 93 | 122 | 51 |
| Record memuat hati U+2764 | 0 | 60 | 0 |
| Label surprise high / medium / low | 209 / 185 / 10 | 339 / 427 / 17 | 60 / 47 / 2 |

Kata = token `[A-Za-z0-9]+`, karakter = Unicode code point Python `len`, tanpa
normalisasi atau edit raw content. Ini metrik diagnostik, bukan renderer resmi.
Copy mentah mempertahankan seluruh newline/OCR/subjudul. Fakta diekstrak dari
baris tidak kosong setelah hook sebanyak `fact_count`, dengan dua pengecualian
tercatat: subjudul `🥚 Egg Facts` DYK POST-070 dikeluarkan; CTA POST-057
dipisahkan dari posisi tengah. Blok = fakta dengan separator dua LF. CTA
menggabungkan seluruh baris sesudah fakta dengan satu LF, bukan mengambil baris
terakhir saja. Parser mempertahankan tujuh fakta pada POST-057. Tidak memakai
transformasi ini untuk menulis ulang dataset atau menjustifikasi klaim mentah.

Null engagement ada di DYK POST-081/131/151. Nilai null tidak diisi nol;
likes DYK yang dibulatkan tidak diperlakukan sebagai pengukuran presisi.
Surprise labels diwarisi dari audit awal, bukan penilaian baru atau gate.

## Matriks per record dan adjudikasi

[record-matrix.json](record-matrix.json) berisi **172 baris keputusan** dengan
file/baris asal (termasuk semua posisi duplikat), profil, architecture, format,
topik, mekanisme, manfaat pembaca, count, CTA shape/actions/placement, flags dan
notes. [report.json](report.json) memberi statistik, hitungan/bobot per akun dan
172 kasus ukuran/penempatan. Keduanya dapat dicocokkan ke raw tanpa membuat
salinan penuh 176 naskah di runtime atau paket plugin.

Dasar mapping memakai `architecture`, `topic`, `theme`, `fact_types` dan `dna`
yang sudah ada; label mekanisme bersifat deskriptif, tidak membuktikan hubungan
kausal/kebenaran. Pengelompokan mekanisme: angka/rekor → `scale_or_record`,
sejarah/asal → `origin_or_history`, contradiction/myth → `assumption_reversal`,
biologi/sains → `concrete_explanation`, oddity tempat/budaya → `everyday_oddity`,
utility → `action_condition_outcome`; consequence ditambahkan pada DYK
POST-059/087/140/150 dan paired contrast pada POST-146. Label dapat bersamaan;
record tanpa sinyal metadata memakai `curiosity_detail`. Manfaat curiosity,
practical reference dan recognizable behavior tetap dimensi terpisah.

Adjudikasi tambahan yang penting:

- Label Themed/Single/Mixed dinormalisasi menjadi themed/single_subject/mixed.
  DYK POST-084/131 (beberapa bandara), POST-150 (wood/fungi), POST-157 (tema body)
  diberi themed; label sumber tetap tersedia melalui locator, tidak diedit.
- Lima format lama tetap dikenal. Themed curiosity dan mixed curiosity menampung
  koleksi biasa; history bukan otomatis format baru, consequence bukan utility
  jika tidak ada tindakan pembaca, dan angka tunggal bukan otomatis comparison.
  DYK POST-146 adalah comparison berpasangan; POST-056 myth correction;
  POST-121 tetap themed_curiosity karena tidak seluruh set adalah koreksi myth.
- Emotional animal dipilih pada DYK POST-086/091/094/096/097/124/127/128 karena
  perilaku/sosial menonjol; ini keputusan preferensi, bukan truth label atas
  motif hewan. Record hewan lain tetap fast/themed curiosity sesuai set.
- Curious Mind POST-037 diberi utility/pet_safety meski beberapa baris mentah
  tidak koheren; flag ini bukan penerimaan naskah untuk produksi. Daily Facts
  POST-174/175 memakai mixed architecture dan utility format: tindakan praktis
  lintas objek tidak dipaksa menjadi koleksi curiosity atau dilarang oleh
  compatibility format legacy pada config2. Ini contoh perlunya definisi katalog
  yang terpisah dari compatibility config1.
- Pemetaan topik memakai sebelas seed key lama sebagai awal, bukan allowlist
  config2. World laws/culture masuk grouping geography, psychology masuk body,
  history/people masuk history_origins; raw theme tidak diubah. Koleksi campuran
  general_trivia tidak otomatis diganti menjadi animals. Daily storage
  POST-164/167/170/172/173 masuk food_storage_home; utility lain tetap practical.

OCR yang dikonfirmasi pada gap: Curious Mind POST-005 fragmen fakta terbalik,
POST-016/018/022 CTA rusak (POST-018 juga fakta terbalik), DYK POST-064 `la` dan
`l egg`. Flag bukan inventaris menyeluruh semua salah eja. Tiga CTA Curious Mind
yang rusak tetap tanpa label aksi pasti; tidak diperbaiki lalu dianggap contoh
referensi sah. Raw source dipertahankan dan tidak dijadikan fakta produksi.

## CTA khusus dan label opsional

Pemetaan per record memakai makna ajakan utuh dari audit CTA yang sudah ada,
bukan classifier kata. CTA ambigu tetap tanpa aksi pasti. DYK POST-075/076/101/
123/139 memakai target emoji yang tidak cukup eksplisit untuk memaksa comment
atau react. Itu status ketidakpastian metadata, bukan kegagalan CTA.

| Kasus | Bentuk yang harus dipertahankan | Penerimaan config2 kelak |
| --- | --- | --- |
| Daily Facts POST-158–175 (18/18) | `Like the facts? Like the video and follow for more!` | react + follow, tanpa primary goal; pertanyaan awal bukan ajakan like tambahan |
| DYK POST-059/060 | Pertanyaan/permintaan pengalaman + like | Kedua ajakan sah; POST-060 empat baris, 122 karakter dengan LF |
| DYK POST-061 | Like + pengalaman cleaning di komentar | “share one of yours” tidak otomatis share video |
| DYK POST-069 | Like + tag | Tag tidak dipaksa jadi goal comment |
| DYK POST-143–152 | Tap hati + follow (10 record) | Dua ajakan tanpa hierarki |
| DYK POST-057 | CTA setelah fakta 6, sebelum fakta 7 | `after_fact` posisi6, tujuh fakta tetap lengkap |
| Curious Mind POST-006/033/034 | Teaser kemudian follow pada baris berbeda | Seluruh bagian CTA, bukan hanya baris terakhir |
| Curious Mind POST-016/018/022 | OCR rusak/ambigu | Label kosong; jangan menebak copy atau intent |
| DYK POST-055/057/095 | “Like learning something new?” kemudian subscribe | Pertanyaan kesukaan tidak dihitung react; follow sebagai deskripsi subscribe |
| Synth-CTA-3 | “Like the video, save it for later, and follow for more.” | Kasus sintetis tiga ajakan dalam budget; bukan frekuensi atau rekomendasi wajib corpus |

Sedikitnya 14 CTA DYK jelas gabungan: 3+1+10 pada tabel. Ini minimum yang
terkonfirmasi, bukan klaim bahwa tidak ada gabungan lain. Tak ada batas jumlah
ajakan yang diturunkan dari minimum itu. Semua 172 record memiliki komponen CTA;
tidak menyimpulkan CTA boleh kosong. Metadata actions boleh absen/tidak lengkap,
null goal bukan klasifikasi palsu; teks dan placement authoritative.

## Rekomendasi bobot seed dan pembulatan

Bobot berikut baru rekomendasi seed untuk versi awal profil, **belum dipasang**.
Denominator masing-masing 51/103/18 pasangan akun+ID; empat duplikasi ID dibuang,
POST-047/052 tetap dua ID seperti tabel design dan ditandai tidak independen.
Hitungan per key lengkap ada di report. Ini statistik pilihan corpus (termasuk
bias seleksi dan pengulangan), bukan probabilitas sukses atau kuota batch.

Metode: `floor(100*n/N)`, lalu sisa poin ke remainder terbesar; seri diurutkan
key ASCII naik. Semua key allowed disertakan, nol tetap dapat dipilih eksplisit.
Pengelompokan adalah hasil adjudikasi di atas; tidak menyalin bobot gabungan
35/20/20/15/10 atau topic groups lama sebagai frekuensi akun.

| Format | Curious Mind n / % | DYK n / % | Daily Facts n / % |
| --- | ---: | ---: | ---: |
| single_subject_fast | 20 / 39 | 39 / 38 | 0 / 0 |
| themed_utility | 1 / 2 | 7 / 7 | 8 / 45 |
| emotional_animal_collection | 0 / 0 | 8 / 8 | 0 / 0 |
| comparison | 0 / 0 | 1 / 1 | 0 / 0 |
| myth_vs_fact | 0 / 0 | 1 / 1 | 0 / 0 |
| themed_curiosity | 22 / 43 | 37 / 36 | 6 / 33 |
| mixed_curiosity | 8 / 16 | 10 / 9 | 4 / 22 |
| Total | 51 / 100 | 103 / 100 | 18 / 100 |

| Topic key | Curious Mind % | DYK % | Daily Facts % |
| --- | ---: | ---: | ---: |
| animals | 14 | 22 | 0 |
| pet_safety | 2 | 1 | 0 |
| food_science | 13 | 15 | 0 |
| food_storage_home | 0 | 0 | 28 |
| practical_utility | 0 | 6 | 17 |
| human_body | 17 | 12 | 0 |
| nature_science | 10 | 14 | 0 |
| geography | 12 | 6 | 33 |
| history_origins | 10 | 10 | 0 |
| inventions_everyday | 10 | 10 | 0 |
| general_trivia | 12 | 4 | 22 |
| Total | 100 | 100 | 100 |

## Indeks contoh untuk implementasi/penerimaan

Locator di bawah memilih pola untuk seed/examples kelak, bukan post siap
dipublikasikan. Riset ulang klaim final dan copy original tetap wajib. Naskah
historis CR-061 dan [hasil 28/28 serta LIVE 10/10](../reference-dna-d6-retest-0.5.7-2026-11-06.md)
tidak dibuka ulang. Contoh katalog runtime kelak harus terbatas dan ditulis ulang
secara original, bukan menyalin seluruh corpus.

| Profil / kasus | Locator akun+ID | Dimensi evaluasi |
| --- | --- | --- |
| Curious single food/body | Curious Mind POST-002/010 | Subjek familiar, padat, count dan voice |
| Curious themed/mixed | Curious Mind POST-007/015 | Food collection vs beberapa domain, tidak memaksa comparison |
| Curious history | Curious Mind POST-021/054 | Scientists/medieval sebagai tema; bukan format history wajib |
| Curious count 9–10 | Pilih `fact_count` 9/10 di report | Seluruh posisi tanpa clipping; OCR record tetap flagged |
| DYK animal/emotion | dyk POST-062/094 | Single-subject vs koleksi behavior, uppercase, emoji opsional |
| DYK compare/myth | dyk POST-146/056 | Paired contrast vs correction, qualifier tetap |
| DYK history/consequence/mixed | dyk POST-148/087/143 | Tema history, sebab-akibat ekologis, mixed; tanpa dipaksa utility |
| DYK utility | dyk POST-061/074 | Action-condition-outcome; klaim safety harus diteliti ulang |
| DYK 10–11 | Pilih `fact_count` 10/11 di report | Render/save/readback/lifecycle penuh |
| Daily places/storage/mixed | Daily Facts POST-163/164/158 | Kalimat menjelaskan, 5–7 fakta, sentence-case, CTA react+follow tanpa emoji |
| Custom (sintetis) | `dyk_explanatory_custom` calon fixture | Satu definisi: voice DYK + panjang penjelasan Daily Facts, provenance kedua versi; Page memilih versi tepat; context/save/readback/revise, Page lain utuh |
| Referensi keempat (sintetis) | `historical_curiosities` format + topik/profil baru | Publish lewat tool fixture setelah build, source/plugin/registry hash tetap selama percobaan |

Custom dan referensi keempat bukan hasil audit corpus atau seed tambahan yang
sudah dipublikasikan. Review ponsel template 13 detik, naskah per preset/custom,
serta integrasi semua jalur tetap task 9 dan belum dijalankan di task ini.

## Reproduksi dan batas hasil

Jalankan dari root (Python 3 stdlib, tidak membutuhkan service/database):

```sh
python docs/editorial/configurable-profiles/reproduce.py --check
openspec validate add-configurable-trivia-editorial-profiles --strict
git diff --check
```

Script reproduksi tidak
menulis file, mengakses jaringan, mengompilasi runtime atau memanggil business
Write. Tanpa `--check`, script mencetak report JSON untuk perbandingan; jangan
menimpa bukti frozen sebelum menjelaskan drift. `--check` memverifikasi tiga
hash/count, seluruh locator matriks, statistik design, CTA khusus, bobot dan
fingerprint artefak. Semantic mapping adalah adjudikasi editorial tercatat;
script hanya menguji konsistensi/coverage-nya, bukan kebenaran klaim atau kualitas
AI. Drift input/artefak gagal tertutup, bukan diikuti pembaruan expected otomatis.

Preflight: scope docs/corpus lokal pada SHA basis di atas + working docs;
workflow light `ci.yml` sudah dibaca, durasi historis tersedia 29/40/53 detik,
tetapi tidak dipicu tanpa scope PR/push. Estimasi pemeriksaan lokal <1 menit.
Hasil lokal dan command aktual dicatat pada task completion; **Actions exact-SHA,
backend/MCP config2, G4, preview, visual QA, instalasi dan LIVE baru NOT RUN**.
Tidak ada klaim FIXED atau deployment dari statistik corpus.
