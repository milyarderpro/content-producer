# DNA-SSF-01 — retest-v028-01

**Bukti:** jawaban akhir chat penguji yang diteruskan pemilik pada 27 Oktober 2026. Ini retest terfokus atas kegagalan dedup F1, di luar 30 kasus utama. Pemilik sebelumnya menerima tautan plugin PRIVATE v0.2.8 setelah rilis, tetapi jawaban sesi ini tidak mengekspos release ID atau versi runtime; `plugin_version` dan `backend_version` pada record sesi tetap `UNVERIFIED`.

**Hasil:** `COMPLETED`, workflow `PASS` berdasarkan satu reservasi berhasil, satu `save_post` berhasil, dan `get_post` yang dilaporkan memverifikasi draft. Post internal `2eeb89a9-d5e1-4173-a904-a90b7854cc72` berstatus `draft`, revision 1, `quality_status: pending`; tidak ada approval atau publikasi. Ini membuktikan request dedup yang dahulu tertolak kini diterima pada percobaan ini, bukan reliabilitas umum semua kandidat.

## Prompt acuan dan batas sesi

Prompt yang disiapkan reviewer meminta satu retest `DNA-SSF-01/retest-v028-01` dengan plugin PRIVATE pada Page internal, format `single_subject_fast`, subjek sea turtles dan fakta pertama tentang ketidakmampuan menarik kepala/sirip ke dalam cangkang. Alur normal diizinkan langsung sampai satu draft dan `get_post`, tanpa checkpoint GO. Setiap `material_differences` harus cocok dengan field kandidat yang tepat; satu Write ditolak berarti berhenti tanpa retry. Tidak boleh revisi, approval, atau publikasi. Kesamaan byte antara prompt acuan dan yang ditempel pemilik tidak diverifikasi.

Page: `Trivia Editorial Test (Internal)` (`f3984ee4-8ae7-4043-8c93-45765f82f46e`); niche `trivia`, format `single_subject_fast`, profile `fast_trivia`, locale `en-US`, audiens US/UK/CA/AU, reuse `page_unique`, config ID dan `config_updated_at` tidak dilaporkan.

## Copy pertama — tersimpan menurut readback

```text
7 sea turtle facts worth knowing

Sea turtles cannot tuck their heads or flippers inside their shells.

They breathe air with lungs, so they must surface regularly.

Female sea turtles return to sandy beaches to lay eggs.

Their broad, paddle-shaped front flippers power them through ocean water.

Leatherback sea turtles have flexible shells instead of hard ones.

Sea turtles have no teeth; their jaws form beaklike edges.

The temperature of nesting sand helps determine hatchlings' sex.

Which fact surprised you most?
```

Caption: “Sea turtles are built for ocean life in ways that may surprise you. Which of these seven facts was new to you?”

Hashtags: `#SeaTurtles` `#OceanFacts` `#MarineLife`.

## Alur dan checks yang dilaporkan

| Tahap                               | Hasil                                                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Context Page                        | Aktif; 7–8 fakta, format dan locale sesuai                                                                                          |
| Dedup READ/review                   | 7/7 posisi; F1 20/20 kandidat dan F3 20/20 kandidat; 40 keputusan `distinct`; 0 label pembeda tidak valid menurut preflight penguji |
| `trivia_register_and_reserve_facts` | Sukses, 7 fakta baru terdaftar/direservasi; tidak ada `FACT_REVIEW_REQUIRED`                                                        |
| `save_post`                         | Sukses, satu draft                                                                                                                  |
| `get_post`                          | Verifikasi READ dilaporkan berhasil; hash dan respons mentah tidak disertakan                                                       |

Server dilaporkan memberi 19/19 system checks `passed` (termasuk sumber, dedup, reservasi, renderer, readability) dan 18/18 editorial criteria `pass`. `quality_status` tetap `pending`, sehingga draft **bukan** `ready`. Metrik server: 522/600 karakter Canva, 81 kata, estimasi baca 27,5 detik, 7 fakta. Error/`field_errors`: tidak ada Write yang ditolak. Pemeriksaan sumber per URL **tidak** dilakukan reviewer; status dukungan klaim mengikuti laporan tool/server. Tidak ada revisi, approval, atau publikasi.

## Penilaian DNA reviewer — terpisah dari checks server

| Dimensi 0–2     | Skor | Alasan                                                                                                     |
| --------------- | ---: | ---------------------------------------------------------------------------------------------------------- |
| Familiarity     |    2 | Sea turtles mudah dikenali di pasar sasaran.                                                               |
| Surprise        |    1 | Cangkang leatherback, tidak bergigi, dan suhu sarang menarik; tiga baris lain sangat mudah ditebak.        |
| Specificity     |    1 | Mayoritas klaim jelas, tetapi fakta bernapas, bertelur, dan sirip terlalu umum untuk slot trivia terbatas. |
| Coherence       |    2 | Tujuh fakta tetap pada satu subjek dengan sudut anatomi dan reproduksi.                                    |
| Scanability     |    2 | Setiap fakta satu baris pendek, pemisahan jelas, 81 kata dalam profil yang disukai.                        |
| Utility/emotion |    1 | Ada rasa ingin tahu, tetapi tidak ada beat emosional atau fakta penutup yang sangat mudah dibagikan.       |

**Total 9/12 — `PERLU REVISI`; `format_fit: FIT`.** Bahasa `en-US` natural, mudah dipindai, tidak akademis. Hook “worth knowing” jujur tetapi generik; CTA tunggal untuk komentar sesuai tema, meski caption mengulang pertanyaan yang hampir sama. Urutan membuka dengan fakta kuat, lalu tiga fakta yang akrab menurunkan momentum. Ini bukan kegagalan tool atau sumber; server editorial pass dan penilaian daya tarik DNA mengukur hal berbeda. Estimasi baca 27,5 detik dibanding video sekitar 13 detik adalah petunjuk kepadatan/replay, bukan bukti performa penonton.

**Keputusan:** simpan revision 1 sebagai baseline; jangan merevisi otomatis demi skor. Kegagalan dedup spesifik terdahulu teratasi pada satu retest ini. Catat kekurangan hook/pemilihan fakta pada [Issue #54](https://github.com/milyarderpro/content-producer/issues/54) yang sudah melacak pola editorial berulang. [Issue #63](https://github.com/milyarderpro/content-producer/issues/63) mencatat keberhasilan live ini dengan batas versi runtime sesi; jangan menyimpulkan semua dedup telah bebas masalah. Tiga puluh kasus utama tetap `NOT RUN`.
