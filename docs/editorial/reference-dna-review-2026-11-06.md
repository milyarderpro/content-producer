# Review DNA akhir 6 November 2026

Task 5.2–5.3: **PASS pada hasil akhir PREVIEW yang dinilai**, dengan bukti campuran C2/C3/C5/C6 dan repair terarah. Ini bukan klaim 12/12 generasi pertama versi 0.5.6 PASS, bukan audit sumber baru, dan bukan LIVE-save/FIXED. Beberapa output awal 0.5.6 gagal; E01/E07 diperbaiki satu putaran dan E11 dua putaran lewat prompt tambahan. Kemandirian review host pada percobaan pertama belum terbukti konsisten.

Acuan D6 tetap ≥13/16, tanpa 0, naturalness E=2 dan tidak ada masalah makna/qualifier/config/budget yang diketahui. Tidak ada rata-rata sebagai waiver. Pemilik secara eksplisit meminta **tidak memverifikasi bukti URL**; seluruh penilaian ini mengikuti scope tersebut. Tidak mengklaim semua sumber sudah dicek ulang. Penerimaan R2 A–D task 5.4 tetap untuk naskah manual itu; tidak otomatis menjadi penerimaan pemilik atas setiap output baru ini.

## Register akhir per kasus

| Kasus | Bukti final | Versi | D6 | E | Verdict |
| --- | --- | --- | ---: | ---: | --- |
| E01 | [C6-R1](reference-dna-preview-candidate-0.5.6.md) | 0.5.6 | 15 | 2 | PASS PREVIEW |
| E02 | [C5](reference-dna-preview-candidate-0.5.5.md) | 0.5.5 | 13 | 2 | PASS PREVIEW |
| E03 | [C2](reference-dna-semantic-review.md#e03--bukti-delapan-dimensi) | 0.5.1 | 15 | 2 | PASS PREVIEW — reused |
| E04 | [C2](reference-dna-semantic-review.md#e04--bukti-delapan-dimensi) | 0.5.1 | 15 | 2 | PASS PREVIEW — reused |
| E05 | [C2](reference-dna-semantic-review.md#e05--bukti-delapan-dimensi) | 0.5.1 | 16 | 2 | PASS PREVIEW — reused |
| E06 | [C6](reference-dna-preview-candidate-0.5.6.md) | 0.5.6 | 13 | 2 | PASS PREVIEW |
| E07 | [C6-T1-R1](reference-dna-preview-candidate-0.5.6.md) | 0.5.6 | 15 | 2 | PASS PREVIEW |
| E08 | [C6-T1](reference-dna-preview-candidate-0.5.6.md) | 0.5.6 | 15 | 2 | PASS PREVIEW |
| E09 | [C2](reference-dna-semantic-review.md#e09--bukti-delapan-dimensi) | 0.5.1 | 15 | 2 | PASS PREVIEW — reused |
| E10 | [C6-T2](reference-dna-preview-candidate-0.5.6.md) | 0.5.6 | 15 | 2 | PASS PREVIEW |
| E11 | [C6-R2](reference-dna-preview-candidate-0.5.6.md) | 0.5.6 | 13 | 2 | PASS PREVIEW |
| E12 | [C3](reference-dna-semantic-review.md#e12--c3-1616--pass-pada-scope-preview) | 0.5.2 | 16 | 2 | PASS PREVIEW — reused |

**Reuse terbatas:** E03/E04/E05/E09/E12 dibaca ulang dari output historis; tabel delapan dimensi dan kutipan exact B1/C1/C2/C3 pada tautan di atas tetap berlaku. Tidak ada kegagalan baru yang diketahui pada naskah tersebut setelah kalibrasi pemilik. Tidak mengklaim kelimanya digenerasi ulang pada 0.5.6. Patch baru menekankan seleksi tengah/penutup dan bahasa klasifikasi; E01/E06/E07/E10/E11 menguji area itu dan E08 menjadi regresi utility/budget. E02 memakai C5 terbaru yang telah mengganti cluster calls/care. Ini evaluasi corpus dengan retest terarah, bukan sertifikasi seluruh perilaku rilis baru.

E02/E06/E11 tepat ambang 13 dan **bukan contoh unggulan**. E11 akhir masih lebih lemah daripada D/R2: luggage cukup biasa dan pouch adoption satu konteks ringan. Namun set akhir tidak lagi timeline; nama, pouch, pressure seal, keamanan luggage, dan penggabungan sleeping bags memberi payoff yang berbeda. Skor B/C/F tetap 1, tidak dinaikkan untuk membuatnya tampak maksimal. Perbedaan kualitas ini tetap terlihat pada laporan.

## Bukti delapan dimensi untuk output baru

### E01 — C6-R1, 15/16

| Dimensi | Skor | Kutipan exact dan alasan |
| --- | ---: | --- |
| A angle | 2 | “Red pandas have a false thumb made from a wrist bone.” — Wrist-bone thumb membuat subjek dan reveal langsung jelas. |
| B surprise/utility | 2 | “Red pandas got the name "panda" before giant pandas did.” — Nama panda lebih dahulu menjadi kejutan yang mudah diceritakan. |
| C komposisi | 1 | “Their sharp, partly retractable claws help them grip tree branches.” — Claws dan headfirst berdekatan di kemampuan memanjat; set lain tetap mencakup suhu, pencernaan, komunikasi dan nama. |
| D urutan | 2 | “Red pandas got the name "panda" before giant pandas did.” — Pembuka thumb kuat dan penutup nama berbeda, tanpa alur anatomi otomatis. |
| E naturalness | 2 | “They mostly eat bamboo, but their guts resemble those of meat eaters.” — Guts/meat eaters mengganti kalimat klasifikasi yang kaku; qualifier partly/mostly tetap. |
| F pola referensi | 2 | “Did you know?” — Hook literal dan fakta mandiri mengikuti shape kartu referensi. |
| G scanability/format | 2 | “They can climb down trees headfirst by rotating their ankles.” — Plain lines; tujuh fakta dan batas karakter terpenuhi. |
| H CTA | 2 | “Share this with someone who loves red pandas.” — Satu ajakan share kepada pembaca yang relevan. |

### E02 — C5, 13/16

| Dimensi | Skor | Kutipan exact dan alasan |
| --- | ---: | --- |
| A angle | 2 | “Older meerkats teach pups to handle prey using disabled animals.” — Cooperation meerkat jelas dari kalimat pertama. |
| B surprise/utility | 1 | “Older meerkats teach pups to handle prey using disabled animals.” — Teaching masih umum; war dance dan kebiasaan bangun memberi kejutan yang lebih khas. |
| C komposisi | 2 | “Rival meerkat groups advance together, tails raised in a war dance.” — Teaching, huddle, grooming, digging, contact calls, war dance, tradisi bangun bervariasi; tidak mengulang beberapa jenis warning/care. |
| D urutan | 2 | “Some meerkat groups keep different wake-up routines across generations.” — Tutup dengan perilaku lintas generasi, berbeda dari pembuka teaching. |
| E naturalness | 2 | “Rival meerkat groups advance together, tails raised in a war dance.” — Tails raised in a war dance adalah gambaran teramati; tidak menambahkan niat manusia. |
| F pola referensi | 1 | “Meerkats groom one another, helping maintain their social bonds.” — Satu baris social bonds agak generik; keseluruhan set sudah lebih beragam daripada C4. |
| G scanability/format | 2 | “Group members cooperate to dig and clear underground burrows.” — Satu gagasan per baris, tujuh fakta dan budget sesuai. |
| H CTA | 1 | “Share these surprising meerkat connections.” — Share satu tujuan, tetapi connections kurang natural dibanding contoh final R2; minor. |

### E06 — C6, 13/16

| Dimensi | Skor | Kutipan exact dan alasan |
| --- | ---: | --- |
| A angle | 2 | “Your teeth begin forming months before you are born.” — Perkembangan sebelum lahir menjadi angle familiar tentang tubuh sendiri. |
| B surprise/utility | 1 | “Tooth enamel is the hardest substance in the human body.” — Enamel hardest cukup umum; akar yang larut dan molar tanpa pengganti menambah reveal. |
| C komposisi | 1 | “First permanent molars arrive without replacing any baby teeth.” — Beberapa developmental facts berdekatan; plaque, gerak ligamen dan variasi wisdom teeth menambah pengalaman berbeda. |
| D urutan | 2 | “Baby tooth roots gradually dissolve before those teeth fall out.” — Penutup akar larut konkret; tidak ditutup fungsi/definisi umum seperti baseline. |
| E naturalness | 2 | “Tiny ligaments let your teeth shift slightly while you chew.” — Shift slightly while you chew menjelaskan gerak dengan kata sehari-hari. |
| F pola referensi | 1 | “Plaque is a sticky bacterial film, not merely leftover food.” — Masih lebih informatif daripada kartu terbaik referensi, tetapi bukan daftar definisi anatomi B1. |
| G scanability/format | 2 | “Some people never develop one or more of their wisdom teeth.” — Kalimat singkat, some membatasi scope; tujuh fakta/budget sesuai. |
| H CTA | 2 | “Follow for more surprising body facts.” — Satu follow yang sesuai topik. |

### E07 — C6-T1-R1, 15/16

| Dimensi | Skor | Kutipan exact dan alasan |
| --- | ---: | --- |
| A angle | 2 | “Wild rice isn't true rice; it comes from different grasses.” — Wild rice membuka familiar naming surprise, dengan kata grasses. |
| B surprise/utility | 1 | “Flooding rice fields helps control weeds, not just water crops.” — Flooding untuk weeds cukup ringan; puffed rice dan popcorn memberikan reveal yang lebih konkret. |
| C komposisi | 2 | “Puffed rice expands when heat turns moisture inside into steam.” — Identitas, pertanian, warna, rasa, ekspansi, fermentasi dan aroma berbeda; bukan tabel nutrisi. |
| D urutan | 2 | “Basmati rice shares an aroma compound with freshly popped popcorn.” — Penutup popcorn paling mudah dibayangkan dan diceritakan ulang. |
| E naturalness | 2 | “Koji mold helps turn rice starch into sugar for sake.” — Helps turn ... into sugar natural; tidak mengulang jargon amylopectin/genus. |
| F pola referensi | 2 | “Sushi rice gets its tangy flavor from vinegar, not fish.” — Benda/makanan sehari-hari dibaca sebagai koleksi kejutan, bukan bab proses pangan. |
| G scanability/format | 2 | “Black rice turns deep purple when cooked, thanks to pigments.” — Satu fakta tiap baris, tujuh fakta di bawah budget. |
| H CTA | 2 | “Follow for more everyday food surprises.” — Follow satu tujuan, konsisten dengan B/R2 yang diterima. |

### E08 — C6-T1, 15/16

| Dimensi | Skor | Kutipan exact dan alasan |
| --- | ---: | --- |
| A angle | 2 | “Refrigerate berries promptly; leaving them warm speeds up softening and spoilage.” — Storage berries/greens tetap jadi subjek tindakan yang langsung bisa dipakai. |
| B surprise/utility | 2 | “Spread delicate raspberries in a shallow container to limit crushing.” — Shallow container dan crushing menjelaskan pilihan wadah dan hasil. |
| C komposisi | 1 | “Line a greens container with a clean towel to absorb condensation.” — Dry dan towel sama-sama mengelola kelembapan, tetapi tindakan/kondisinya berbeda dan berguna; satu kedekatan minor. |
| D urutan | 2 | “Keep leafy greens away from apples; ethylene can accelerate yellowing.” — Berries di awal, greens di tengah/akhir, ditutup tetangga buah dan yellowing. |
| E naturalness | 2 | “Keep berries unwashed until eating; extra moisture can encourage mold.” — Instruksi konkret, singkat dan bersyarat; can menjaga probabilitas, bukan jaminan. |
| F pola referensi | 2 | “Dry washed leafy greens thoroughly before refrigerating to reduce sogginess.” — Utility memakai object/action/outcome seperti referensi, tanpa janji umur simpan. |
| G scanability/format | 2 | “Line a greens container with a clean towel to absorb condensation.” — Enam fakta plain lines; pemisah dihitung dan budget sesuai. |
| H CTA | 2 | “Save these tips for your next grocery trip.” — Save untuk pemakaian saat belanja, satu tujuan. |

### E10 — C6-T2, 15/16

| Dimensi | Skor | Kutipan exact dan alasan |
| --- | ---: | --- |
| A angle | 2 | “Calgary’s +15 walkways cross streets overhead; Toronto’s PATH runs underground.” — Underground/overhead memberi baseline perbandingan yang langsung terbayang. |
| B surprise/utility | 2 | “Toronto’s island airport has a pedestrian tunnel beneath Lake Ontario.” — Airport dengan tunnel di bawah danau memberi penutup visual, ditambah tower miring dan skating. |
| C komposisi | 1 | “Quebec City retains old walls; Halifax has a star-shaped hilltop citadel.” — Walls/fort agak ringan dan dua airport entries berdekatan domain; set tetap memuat pedestrian, roda kereta, pertahanan, air, musim dan arsitektur. |
| D urutan | 2 | “Toronto’s island airport has a pedestrian tunnel beneath Lake Ontario.” — Dua kontras di depan, ritme kalimat bervariasi, tunnel menjadi penutup berbeda. |
| E naturalness | 2 | “Vancouver’s harbor welcomes seaplanes that land right on the water.” — Land right on the water memakai bahasa sehari-hari; tidak memaksakan pasangan pada setiap baris. |
| F pola referensi | 2 | “Montreal’s Olympic Stadium has a tower leaning over its roof.” — Koleksi tempat berwujud mengikuti Daily Facts, tanpa katalog panjang jalan atau ranking. |
| G scanability/format | 2 | “Ottawa’s Rideau Canal can become a skating route in winter.” — Can dan in winter membatasi skating; tujuh fakta dan block 496/500 sesuai. |
| H CTA | 2 | “Which Canadian city surprised you most?” — Satu pertanyaan comment terkait keingintahuan tempat. |

### E11 — C6-R2, 13/16

| Dimensi | Skor | Kutipan exact dan alasan |
| --- | ---: | --- |
| A angle | 2 | “The zipper got its name from rubber boots, not pants.” — Benda familiar dengan asal nama yang terbalik dari dugaan pants. |
| B surprise/utility | 1 | “Some luggage zippers have two sliders that can be locked together.” — Luggage lock cukup biasa; space dan sleeping bags memberi nilai yang lebih kuat. Ini lolos minimum, bukan kartu unggulan. |
| C komposisi | 1 | “Early zippers appeared on tobacco pouches before becoming clothing staples.” — Tobacco-pouch adoption menjadi satu konteks ringan; space, keamanan luggage dan penggabungan sleeping bags menambah penggunaan berbeda. |
| D urutan | 2 | “A zipper can turn two separate sleeping bags into one larger bag.” — Tidak ada patent → redesign → military timeline; akhir dua bags menjadi satu adalah visual dan mudah diceritakan. |
| E naturalness | 2 | “Apollo astronauts wore spacesuits with pressure-sealing zippers.” — Pressure-sealing singkat dan dipahami dari spacesuit; tidak ada julukan sejarah tanpa penjelasan. |
| F pola referensi | 1 | “Some luggage zippers have two sliders that can be locked together.” — Masih kurang kaya daripada D/R2 yang diterima; CTA/shape dan beberapa reveal sudah sesuai, bukan alasan memberi 2. |
| G scanability/format | 2 | “A zipper can turn two separate sleeping bags into one larger bag.” — Can menyatakan kemampuan, bukan semua sleeping bags kompatibel; lima fakta sah di adaptive 5–9, tanpa filler keenam. |
| H CTA | 2 | “Follow for more surprising invention stories.” — Satu follow untuk invention stories. |

## Perbandingan dengan kegagalan baseline

- E01 B1 membuka deskripsi ilmiah/urutan yang kurang kuat; C6-R1 membuka wrist-bone thumb dan menutup asal nama. Makna flexible/rotating ankles tetap, tidak kembali ke mekanisme sharp claws yang salah pada C1.
- E02 B1/C4 menumpuk care atau calls; C5 memiliki satu teaching dan satu contact call di antara huddle, digging, war dance dan tradisi bangun. CTA masih minor sehingga H=1.
- E03 B1 sudah cukup baik; C2 mempertahankan generally, savanna dan visible pada gading. Tidak mengklaim semua baseline gagal.
- E04 B1/C1 bergaya label textbook; C2 memakai koreksi langsung. E05 menghilangkan overclaim baseline dan mempertahankan hubungan dibanding daftar diameter.
- E06 B1 5/16 seperti definisi anatomi; C6 memakai plaque-not-food, gerak saat mengunyah, molar tanpa pengganti dan akar larut. Tetap 13, bukan perfect card.
- E07 B1/C5 menyeret taxonomy/processing; C6-T1-R1 memakai familiar grass, warna, rasa, puffing, sake dan popcorn tanpa genus/amylopectin. Struktur/fakta berbeda dari B/R2; bukan salinan jawaban pemilik.
- E08 B1 12/16 menjadi utility dengan condition/action/outcome yang jelas; C6 tidak memberi klaim shelf-life atau menyuruh mencuci ulang semua prewashed greens.
- E09 B1 sudah 14 dan C2 15 tetap dipertahankan; E10 B1 7 berupa katalog kota/ukuran menjadi dua kontras jelas lalu tower/tunnel yang visual, bukan pasangan biasa pada setiap baris.
- E11 B1 urutan=0 dan pola=0; C6-R2 keduanya naik ke 2 dan 1. Nama membuka, penggabungan bags menutup; tidak ada urutan paten/perbaikan/adopsi militer. Luggage tetap minor, bukan klaim paling dekat referensi.
- E12 CTA/hard budget yang gagal pada B1/C1 diperbaiki pada C3; bahasa mekanisme tetap, tanpa niat manusia untuk trees.

## Makna, qualifier dan batas faktual

Qualifier material pada copy baru tetap terlihat: partly/mostly (E01), some (E02/E06), can (E08), can/in winter (E10), some/can (E11). Can pada sleeping bags tidak menyatakan setiap model kompatibel. Tidak ada sebab baru yang diketahui bertentangan dengan riset lama; Apollo pressure-seal juga sudah ada pada pool R2 yang diteliti sebelumnya. Fakta baru lain berasal dari pengetahuan/riset host; sesuai instruksi pemilik tidak dibuka URL untuk audit ulang dan tidak diklaim dukungan baru lengkap. Known-error review ini bukan factual certification.

Seluruh output final memenuhi hitungan karakter/kata keras lokal. Count E11 lima sesuai adaptive, E01 86 kata hanya melewati preferensi 85. Tidak memanggil renderer lewat business Write. State Page, dedup dan saved-copy tetap memerlukan task 6 yang terpisah.

## Implementasi dan pemeriksaan

0.5.6 memperjelas reader audition, bahasa klasifikasi sehari-hari, pemilihan fakta tengah/akhir dan penjelasan nickname. Tidak menambahkan jawaban transfer ke atlas, enum/attestation/backend/config baru. Check PASS 179 root + 19 frontend; package/verify 15 file dan readback seluruh source PASS. SHA dasar 413121c + diff plugin; hash/release pada [bukti rilis](reference-dna-plugin-release-2026-11-05.md#update-056--retest-naskah-6-november-2026). Tidak ada Actions, push, merge atau backend deployment.

Hasil gagal C5, C6 awal dan intermediate R1 tetap utuh. Penutupan task hanya menyatakan review corpus dan retest terarah selesai sesuai ambang D6, bukan jaminan generasi otomatis tanpa penyuntingan. Task 6 saved-copy tetap NOT RUN; tidak ada klaim FIXED atau write produksi.
