# Retest D6 saved-copy — plugin 0.5.7

> Snapshot publik disanitasi: identifier QA/release dan tautan ChatGPT privat memakai alias. Isi naskah, skor, revision, content hash dan verdict dipertahankan. Hash fixture yang tercantum adalah hash bukti asli lokal; hash snapshot publik ada pada [indeks redaksi](reference-dna-public-evidence.md).

**LIVE PASS — 10/10 naskah; task 6.5 tuntas (28/28).**
Empat kasus gagal diremediasi pada post QA yang sama, enam hasil sebelumnya
dibaca ulang dan dinilai kembali tanpa perubahan. Ini penerimaan hasil akhir
setelah repair terarah, bukan kelulusan seluruh generasi pertama atau jaminan views.

ID `DNA-D6-057-R2` · 6 November 2026 · reviewer Codex.
Reviewer juga menyusun remediasi; bukan blind review atau owner acceptance baru.
[FAIL historis 6 PASS/4 FAIL](reference-dna-d6-saved-review-2026-11-06.md)
dan fixture lamanya dipertahankan. [Fixture retest lengkap](../live-test/fixtures/reference-dna-d6-retest-0.5.7-2026-11-06.json)
memuat 80 penilaian dimensi dengan kutipan, readback, plan, config dan batas bukti.

## Source, CI dan rilis yang terbukti

- Source kandidat: `8069bb1bfd03316700e0dca9cfb4c6c8e880229a` pada [PR #137](https://github.com/milyarderpro/content-producer/pull/137);
  PR terbuka, belum merge. Branch dibuat dari remote main agar histori QA privat
  tidak ikut diunggah. Instruksi runtime sama byte-nya dengan source lokal kandidat.
- [Actions](https://github.com/milyarderpro/content-producer/actions/runs/42176824421) **PASS**, exact SHA di atas, 53 detik
  (estimasi sebelum run 1–3 menit). Lokal `pnpm run check` PASS:
  14 file/184 test source dan 19 test frontend; lint/typecheck/build lulus.
  Packaging + verify kandidat PASS 15 file. Tidak menjalankan G4 karena tidak
  ada perubahan backend/security/schema; tidak mengklaim deployment backend.
- Plugin PRIVATE yang sama berhasil diperbarui melalui Plugin Creator:
  versi **0.5.7**, release `QA-RELEASE-10c52114aae7`.
  Readback 15/15 file sama byte/hash dengan kandidat; manifest overlay versi
  diperbarui sambil mempertahankan identitas/presentasi/app owner OAuth `mcpku2`.
  Tidak ada koneksi MCP kedua.
- Hash index source: `ed5efd75511671e4dc185913c08f1b510fda03f49e591d653d9bd232c1d367d6`.
  Hash ZIP update 16 file (15 portable + compatibility overlay):
  `20ce9fd9fdfe2a51b942c475174967e485f3e2e4869e3954d7243f502e915de3`.

## Scope dan kontrol live

Workspace `QA-ID-e45fbfa3970f`, Page
**Content Producer QA Sandbox (Verified)** `QA-ID-7b6e770529b4`.
Pemilik meminta perbaikan sampai 6.5 tuntas; prompt host membatasi objek/payload
pada empat post QA gagal, kurasi retained facts, wording dan koreksi format.

- Empat chat Chrome baru memilih hanya Content Producer. Thinking effort
  Medium terlihat; ID model tepat tidak tersedia. Host membaca instruksi/context,
  post sources/checks, dedup dan context terbaru sebelum `revise_post_v2`/CAS;
  coordinator hanya Read dan mencocokkan state independen.
- B1 revision 1→2, B2 1→2→3 (dua repair), B3 1→2, B5 1→2.
  Empat exact Canva copy host cocok dengan `get_post` final, termasuk blank line;
  revision/hash-bound system 5/5 dan editorial 3/3 passed, semua tetap draft.
- Enam regresi E01/E08/E02/E03/E04/B4 tetap identik byte/hash/bindings terhadap
  bukti sebelumnya. Ini retest state dan review ulang saved-copy, **bukan enam
  percobaan generasi baru pada 0.5.7**.
- Inventaris QA tetap 10 post, tidak ada pengganti/post/plan baru. Plan
  `QA-ID-6efb71a0e89b` tetap completed **5/5** dengan item,
  output ID, timestamp dan intent historis tidak berubah; nol pending/failed.
  Kontrol batch awal tanpa instruksi fact count tetap bukti task 6.4, bukan
  klaim batch first-pass baru pada 0.5.7. Kelima output plan sekarang lulus D6.
- Config tetap `QA-ID-70dc81dc5199`, timestamp teks exact
  `2026-10-21T16:08:12.627461Z`, en-US/adaptive 5–9/preferred 7/workspace_unique.
  Pilihan final 7/5/5/6/5 fakta pada B1–B5 bukan fixed-five override. Tidak ada
  perubahan Page/config, canonical claim/URL, plan completed, approval/publikasi,
  atau Write ke 18 draft audit/production.

## Hasil D6

A angle, B surprise/utility, C komposisi, D urutan, E naturalness,
F pola referensi, G scanability/format, H CTA. Setiap kasus minimal 13/16,
tidak ada 0, E wajib 2, serta gate makna/qualifier/config/budget tidak bermasalah.
Tidak menggunakan rata-rata untuk menutupi FAIL.

| Kasus | Revision | Format | A–H | Skor | Verdict |
| --- | ---: | --- | --- | ---: | --- |
| E01 | 1 | single_subject_fast | 2/2/2/2/2/2/2/2 | 16/16 | PASS |
| E08 | 1 | themed_utility | 2/2/2/1/2/2/2/2 | 15/16 | PASS |
| E02 | 1 | emotional_animal_collection | 2/2/2/2/2/2/2/2 | 16/16 | PASS |
| E03 | 1 | comparison | 2/2/2/1/2/2/2/2 | 15/16 | PASS |
| E04 | 1 | myth_vs_fact | 2/2/2/1/2/2/2/2 | 15/16 | PASS |
| B1 | 2 | comparison | 2/2/2/1/2/2/2/2 | 15/16 | PASS |
| B2 | 3 | single_subject_fast | 2/2/1/2/2/2/2/2 | 15/16 | PASS |
| B3 | 2 | single_subject_fast | 2/2/2/2/2/2/2/2 | 16/16 | PASS |
| B4 | 1 | single_subject_fast | 2/2/2/2/2/2/2/2 | 16/16 | PASS |
| B5 | 2 | single_subject_fast | 2/1/2/2/2/1/2/2 | 14/16 | PASS |

Lima format task 6.3 **5/5 PASS**, kelima output batch **5/5 PASS** setelah
remediasi; kontrol requested/completed/ID/readback **PASS**. Batas preferensi
fast 7–8 tidak dipakai untuk mempertahankan filler; adaptive Page tetap mengendalikan.

## Remediasi dan pemisahan attempt

- **B1 / #134:** `solar system` dipulihkan pada Io; dua `about` pada rasio
  Charon/Bulan dipertahankan dalam kalimat publik. Ketujuh identitas/URL/urutan sama.
- **B2 / #135:** Montreal underground dan park-area filler dibuang. Toronto
  di bawah dan Calgary di atas memberi pengalaman berbeda dalam lima fakta.
  Revision 2 belum final diterima: superlatif geografis luas tidak diperlukan
  dan review konservatif meminta penyempitan tanpa riset baru. Repair kedua
  membuang klaim keunikan tersebut dari copy, menjaga deskripsi tembok dan
  menutup dengan Ottawa skating. Snapshot revision 2 tersimpan dalam fixture;
  revision 3 adalah hasil yang dinilai PASS.
- **B3 / #135:** bootlaces dan death-before-name dibuang, hanya satu asal nama
  dipertahankan. Space seal, mechanical failure, bunyi nama, fashion dan jewelry
  memberi lima payoff berbeda; tidak menambah fakta demi preferred count.
- **B5 / #136:** format post `comparison`→`single_subject_fast`, Australia
  jelas di opening, Hills Hoist dijelaskan sebagai clothesline, BBQ ringan
  dibuang dan democracy sausages menjadi penutup. CTA sesuai fakta biasa.
  Completed item tetap menyimpan comparison sebagai intent historis. Kontrak
  [revise_post_v2](../../supabase/migrations/20261102050000_add_revise_post_v2.sql)
  memvalidasi format terhadap Page config, tanpa mengharuskan format current post
  sama dengan completed item atau menulis ulang plan; ini bukan perubahan backend.

B2/B5 mengalami konflik catalog yang dikembalikan rolled_back; host membaca
dedup/context baru sebelum revisi berhasil. B2 juga melaporkan validasi panjang
lokal sebelum Write. Tidak ada replay buta atas hasil unknown; hasil akhir
terbukti revision/readback, bukan dari approval host atau HTTP 200. Pada coordinator,
Read list_posts limit 100 ditolak karena maksimum 50; pemanggilan 50 berikutnya
mengembalikan inventaris lengkap. Ini tidak memicu business Write.

## Exact copy dan delapan dimensi

### E01 — PASS 16/16

Post `QA-ID-834222c2456a`, revision 1,
hash `8cc192c32553fb318eac17ad08a3a332a099836741d912228451cef6ef846963`. Pola: RP01, RP03.

| Dimensi | Skor | Kutipan readback | Alasan |
| --- | ---: | --- | --- |
| A familiarity/angle | 2 | “Red pandas got the name "panda" before giant pandas did.” | Subjek langsung bernama; asal sebutan panda menjadi angle familiar dengan kebalikan yang jelas. |
| B surprise/utility | 2 | “Red pandas use their tongues to inspect scent marks.” | Penggunaan lidah untuk memeriksa scent marks merupakan kemampuan spesifik yang mudah diceritakan ulang. |
| C komposisi | 2 | “Thick fur even covers the bottoms of red pandas' feet.”<br>“Reddish coats help them blend into moss-covered branches.”<br>“Young red pandas can whistle when they're distressed.”<br>“Red pandas have their own animal family, separate from bears.” | Insulasi kaki, kamuflase, suara dan identitas keluarga memberi empat pengalaman berbeda; tidak mengulang diet atau gerak memanjat. |
| D urutan | 2 | “When threatened, red pandas may stand upright and swipe with sharp claws.” | Penutup berdiri dan mengayun cakar memberi adegan visual baru setelah nama dan indra. |
| E naturalness | 2 | “Young red pandas can whistle when they're distressed.” | Contraction they're dan kata whistle/distressed terasa percakapan; tidak diawali taksonomi ilmiah. |
| F pola referensi | 2 | “Did you know?” | Hook literal dan perpindahan nama–fisik–indra–pertahanan mengikuti kartu hewan tanpa menyalin fakta contoh. |
| G scanability/format | 2 | “Red pandas got the name "panda" before giant pandas did.” | Tujuh baris mandiri dengan satu gagasan utama; exact rendering dan budget revision ini lulus. |
| H CTA | 2 | “Share this with a red panda fan.” | Share diarahkan kepada red panda fan, satu aksi dan penerima yang relevan. |

### E08 — PASS 15/16

Post `QA-ID-1112e26848ac`, revision 1,
hash `19910c446e9bbcf4927f69ce10100cab40da7cac6402994aa68cd68fee3a601e`. Pola: RP06, RP05.

| Dimensi | Skor | Kutipan readback | Alasan |
| --- | ---: | --- | --- |
| A familiarity/angle | 2 | “Keep berries unwashed in the fridge; rinse them only before eating.” | Berries/greens dan kebiasaan sebelum makan langsung dikenali sebagai kebutuhan rumah tangga. |
| B surprise/utility | 2 | “Keep greens away from apples; their ripening gas can cause yellowing.” | Apel yang mempercepat yellowing memberi akibat konkret; bukan janji umur simpan pasti. |
| C komposisi | 2 | “Leave strawberry tops attached until you're ready to prepare them.”<br>“Keep loose spinach in an open bag in your refrigerator's crisper.”<br>“Keep raspberries in shallow containers to prevent crushing.” | Persiapan strawberry, kemasan spinach dan wadah raspberry masing-masing menawarkan tindakan berbeda. |
| D urutan | 1 | “Prewashed, ready-to-eat salad needs refrigeration, but no extra rinse.” | Penutup ready-to-eat/no extra rinse berguna, tetapi kembali ke tema pencucian pembuka; variasi ending lebih ringan daripada baris gas. |
| E naturalness | 2 | “Keep greens away from apples; their ripening gas can cause yellowing.” | Ripening gas menjelaskan istilah tanpa kuliah ethylene; qualifier can tetap terdengar natural. |
| F pola referensi | 2 | “Did you know?” | Plain hook, rotasi objek/tindakan dan saveable ending selaras pola utility Daily Facts. |
| G scanability/format | 2 | “Prewashed, ready-to-eat salad needs refrigeration, but no extra rinse.” | Enam baris dengan kondisi unwashed/ready-to-eat yang terbaca; batas keras dan source bindings lulus. |
| H CTA | 2 | “Save this for your next grocery trip.” | Save untuk grocery trip mempunyai alasan pakai yang jelas dan satu aksi. |

### E02 — PASS 16/16

Post `QA-ID-2f4994901bb3`, revision 1,
hash `4ae1eea255aeba9b0c06ee246408093403e05226a345305ff3a8599e4f28373d`. Pola: RP03, RP01.

| Dimensi | Skor | Kutipan readback | Alasan |
| --- | ---: | --- | --- |
| A familiarity/angle | 2 | “Adult meerkats teach pups using scorpions with the stingers removed.” | Adult meerkats menyebut spesies sesudah hook generik dan membuka dengan praktik mengajar yang spesifik. |
| B surprise/utility | 2 | “Adult meerkats teach pups using scorpions with the stingers removed.” | Scorpion dengan stinger dilepas memberi detail mengejutkan; bukan kalimat umum hewan saling membantu. |
| C komposisi | 2 | “Meerkats can shut their ears to keep sand out while digging.”<br>“Their burrows have separate rooms for sleeping and using the toilet.”<br>“Together, meerkats can overwhelm even venomous snakes.”<br>“Meerkats press their bellies against cooler rocks to cool off.” | Telinga, chamber toilet, pertahanan ular dan pendinginan tubuh memberi nilai berbeda tanpa cluster caregiving atau warning calls. |
| D urutan | 2 | “At night, meerkats curl up and snuggle together.” | Awal hunting practice dan akhir snuggling memberi perubahan rasa penasaran ke adegan hangat. |
| E naturalness | 2 | “Their burrows have separate rooms for sleeping and using the toilet.” | Using the toilet dan cool off merupakan kata sehari-hari, tanpa jargon anatomi. |
| F pola referensi | 2 | “At night, meerkats curl up and snuggle together.” | Snuggle adalah perilaku terlihat, dekat pola DYK, tanpa mengarang motif cinta manusia. |
| G scanability/format | 2 | “Adult meerkats teach pups using scorpions with the stingers removed.” | Enam fakta utuh dalam adaptive; tidak ada pengisi demi tujuh dan render/budget lulus. |
| H CTA | 2 | “Share this with someone who loves meerkats.” | Satu ajakan share kepada orang yang menyukai meerkat sesuai isi. |

### E03 — PASS 15/16

Post `QA-ID-2efa1c2e80c0`, revision 1,
hash `33ef3b282bf02fbc1fc64d954aecef0925733cee29ab3a954b9065f11e6934ad`. Pola: RP11, RP01.

| Dimensi | Skor | Kutipan readback | Alasan |
| --- | ---: | --- | --- |
| A familiarity/angle | 2 | “African elephants have two trunk "fingers"; Asian elephants have one.” | Pasangan African/Asian elephants langsung jelas bagi pembaca umum. |
| B surprise/utility | 2 | “African elephants have two trunk "fingers"; Asian elephants have one.” | Dua trunk fingers versus satu memberi perbedaan fisik yang mudah dibayangkan. |
| C komposisi | 2 | “Asian elephants have twin head domes; African elephants have rounder heads.”<br>“African savanna elephants generally outweigh Asian elephants.”<br>“Africa has two living elephant species; Asia has just one.”<br>“African savanna elephants' backs dip; Asian elephants' backs usually arch.” | Bentuk kepala, berat, spesies dan punggung merupakan dimensi berbeda; bukan deret satu ukuran. |
| D urutan | 1 | “Female African elephants often have tusks; Asian females rarely have visible ones.” | Awal kuat dan akhir tusks sah, tetapi telinga/kepala di tengah masih berasa identifikasi; ini kekurangan ritme minor. |
| E naturalness | 2 | “Female African elephants often have tusks; Asian females rarely have visible ones.” | Have/usually/visible dan fingers dalam tanda kutip mudah dipahami; tidak memakai istilah teknis yang menutupi reveal. |
| F pola referensi | 2 | “Did you know?” | Like-for-like per pasangan mengikuti RP11 dengan variasi dimensi yang sah. |
| G scanability/format | 2 | “African savanna elephants' backs dip; Asian elephants' backs usually arch.” | Setiap baris membandingkan dimensi sama; generally/savanna/usually/often/rarely/visible dipertahankan dan budget lulus. |
| H CTA | 2 | “Which difference surprised you most?” | Which difference menanyakan perbandingan yang benar-benar ada dengan satu aksi comment. |

### E04 — PASS 15/16

Post `QA-ID-9b0689b5acf3`, revision 1,
hash `707ed63a9aa5b06fd0c4ffa06682a8a405112f0300901d8658c9c95cb65c7c79`. Pola: RP05, RP03.

| Dimensi | Skor | Kutipan readback | Alasan |
| --- | ---: | --- | --- |
| A familiarity/angle | 2 | “Flying fox bats use sight and smell, not echolocation.” | Flying fox bats memberi nama subjek dan langsung membantah anggapan semua bat berekolokasi. |
| B surprise/utility | 2 | “Flying fox bats use sight and smell, not echolocation.” | Sight/smell memberi alternatif kemampuan yang konkret, bukan hanya negasi. |
| C komposisi | 2 | “Some bats roost in trees, not just caves.”<br>“Bats groom themselves regularly; they're not naturally filthy.”<br>“Some bats migrate for winter instead of hibernating.”<br>“Bats don't gnaw through wood or wires like mice.” | Roost, grooming, migrasi dan kebiasaan menggerogoti membawa empat angle yang berbeda. |
| D urutan | 1 | “Some bats eat fruit or drink nectar, not just insects.” | Ending buah/nectar benar menambah sudut, tetapi kejutan lebih ringan daripada navigasi pembuka; tidak perlu mengulang label myth. |
| E naturalness | 2 | “Bats groom themselves regularly; they're not naturally filthy.” | They're not naturally filthy terasa bahasa pembaca umum, tanpa klaim bebas penyakit atau saran handling. |
| F pola referensi | 2 | “Did you know?” | Koreksi langsung mengikuti pola RP05; tidak ada parade Myth/Fact mekanis. |
| G scanability/format | 2 | “Some bats migrate for winter instead of hibernating.” | Enam koreksi singkat, some tetap ada, format myth_vs_fact sesuai isi dan budget lulus. |
| H CTA | 2 | “Which bat myth surprised you the most?” | Pertanyaan tentang bat myth relevan dengan koreksi yang baru dibaca. |

### B1 — PASS 15/16

Post `QA-ID-6343ba3a3224`, revision 2,
hash `2a11fb8a7ab2753d377b41c05ec53b4c88b386d0e2a604845eb85036501c533a`. Pola: RP12.

```text
Did you know?

Phobos races around Mars roughly three times every day.

Ganymede is wider than Mercury, despite being a moon.

Triton circles Neptune backward relative to the planet's spin.

Titan's atmosphere is thicker than Earth's; our Moon barely has one.

Io is the solar system's most volcanically active world.

Enceladus shines brightly; parts of Iapetus are dark as asphalt.

Charon is about half Pluto's width; our Moon is about a quarter of Earth's.

Which moon surprised you the most?
```

| Dimensi | Skor | Kutipan readback | Alasan |
| --- | ---: | --- | --- |
| A familiarity/angle | 2 | “Ganymede is wider than Mercury, despite being a moon.” | Bulan dibanding planet yang familiar membuka skala yang mudah dibayangkan. |
| B surprise/utility | 2 | “Io is the solar system's most volcanically active world.” | Aktivitas gunung api memberi kejutan berbeda; cakupan solar system kini eksplisit. |
| C komposisi | 2 | “Phobos races around Mars roughly three times every day.”<br>“Titan's atmosphere is thicker than Earth's; our Moon barely has one.”<br>“Enceladus shines brightly; parts of Iapetus are dark as asphalt.”<br>“Charon is about half Pluto's width; our Moon is about a quarter of Earth's.” | Gerak, ukuran, atmosfer, vulkanisme, kecerahan dan rasio memberi dimensi berbeda. |
| D urutan | 1 | “Triton circles Neptune backward relative to the planet's spin.” | Beberapa fakta orbit di awal masih berdekatan; minor, tidak memerlukan seleksi ulang. |
| E naturalness | 2 | “Phobos races around Mars roughly three times every day.” | Races, barely dan kata sehari-hari mengalir tanpa gaya paper. |
| F pola referensi | 2 | “Did you know?” | Ragam kontras visual mengikuti pola nature surprises; bukan tabel diameter. |
| G scanability/format | 2 | “Charon is about half Pluto's width; our Moon is about a quarter of Earth's.” | Kalimat mandiri, dua about pada rasio tetap terbaca; exact rendering dan budget lulus. |
| H CTA | 2 | “Which moon surprised you the most?” | Satu pertanyaan spesifik tentang moon, sesuai goal comment. |

### B2 — PASS 15/16

Post `QA-ID-5ac933583f9f`, revision 3,
hash `7261a7aee4b6a4778447af8f10fceade3fc9527ff15aa02aeba2b2467e8ea16b`. Pola: RP07, RP08.

```text
Did you know?

Near Victoria, Butchart Gardens' five-acre Sunken Garden sits in an old limestone quarry.

Toronto's PATH stretches over 30 km, mostly beneath downtown.

Historic Quebec City still preserves its complete colonial city walls.

In Calgary, Plus 15 skywalks take pedestrians over streets inside enclosed bridges.

When winter conditions allow, Ottawa's Rideau Canal becomes a 7.8-km skating rink.

Follow for more unexpected places.
```

| Dimensi | Skor | Kutipan readback | Alasan |
| --- | ---: | --- | --- |
| A familiarity/angle | 2 | “Near Victoria, Butchart Gardens' five-acre Sunken Garden sits in an old limestone quarry.” | Taman bekas quarry menjadi tempat konkret yang segera dapat dibayangkan; nama Butchart Gardens jelas. |
| B surprise/utility | 2 | “When winter conditions allow, Ottawa's Rideau Canal becomes a 7.8-km skating rink.” | Kanal menjadi arena skating saat kondisi musim dingin memungkinkan memberi perubahan yang mudah diceritakan. |
| C komposisi | 1 | “Toronto's PATH stretches over 30 km, mostly beneath downtown.”<br>“In Calgary, Plus 15 skywalks take pedestrians over streets inside enclosed bridges.” | Dua rute pejalan kaki masih berdekatan tema, tetapi kini memberi kontras bawah/atas; minor, bukan tiga jaringan setara ditambah luas taman. |
| D urutan | 2 | “Near Victoria, Butchart Gardens' five-acre Sunken Garden sits in an old limestone quarry.”<br>“When winter conditions allow, Ottawa's Rideau Canal becomes a 7.8-km skating rink.” | Quarry membuka, infrastruktur dan sejarah berselang, skating menutup; tidak lagi park-area ending. |
| E naturalness | 2 | “Historic Quebec City still preserves its complete colonial city walls.” | Sits in, still preserves dan becomes memakai bahasa umum; superlatif geografis luas dibuang tanpa menambah klaim. |
| F pola referensi | 2 | “Did you know?”<br>“When winter conditions allow, Ottawa's Rideau Canal becomes a 7.8-km skating rink.” | Perjalanan antarjenis tempat dan ending visual dekat Daily Facts; tidak berupa tabel spesifikasi kota. |
| G scanability/format | 2 | “Near Victoria, Butchart Gardens' five-acre Sunken Garden sits in an old limestone quarry.” | Lima fakta dalam adaptive, satu gagasan/baris, maksimum tiga baris visual dan hard budget lulus. |
| H CTA | 2 | “Follow for more unexpected places.” | Satu ajakan follow relevan untuk tempat tak terduga. |

### B3 — PASS 16/16

Post `QA-ID-6821aa81b974`, revision 2,
hash `0dc1d2c33fa3963a4f727d94cfe486115ba7cc19256f25397e69130bc6c7f47d`. Pola: RP09, RP10.

```text
Did you know?

An Apollo spacesuit used a special zipper to seal in air.

Early zipper-like fasteners could jam or spring open unexpectedly.

The word zipper echoed the sound of fastening rubber boots.

Some 1930s dresses showed off zippers as decorative details.

A Van Cleef & Arpels Zip necklace can turn into a bracelet.

Follow for more unexpected invention stories.
```

| Dimensi | Skor | Kutipan readback | Alasan |
| --- | ---: | --- | --- |
| A familiarity/angle | 2 | “An Apollo spacesuit used a special zipper to seal in air.” | Zipper benda familiar dibuka lewat pemakaian antariksa yang tidak biasa. |
| B surprise/utility | 2 | “A Van Cleef & Arpels Zip necklace can turn into a bracelet.” | Kalung berubah gelang memberi payoff konkret yang mudah diceritakan ulang. |
| C komposisi | 2 | “An Apollo spacesuit used a special zipper to seal in air.”<br>“Early zipper-like fasteners could jam or spring open unexpectedly.”<br>“The word zipper echoed the sound of fastening rubber boots.”<br>“Some 1930s dresses showed off zippers as decorative details.”<br>“A Van Cleef & Arpels Zip necklace can turn into a bracelet.” | Space seal, kegagalan mekanis, bunyi nama, dekorasi fashion dan perhiasan berbeda; hanya satu fakta asal/nama dipertahankan. |
| D urutan | 2 | “An Apollo spacesuit used a special zipper to seal in air.”<br>“A Van Cleef & Arpels Zip necklace can turn into a bracelet.” | Dari space ke kegagalan, nama, fashion dan perhiasan; tidak lagi tiga langkah asal-usul berulang. |
| E naturalness | 2 | “Early zipper-like fasteners could jam or spring open unexpectedly.” | Jam, spring open dan turn into adalah kata sehari-hari dengan can/could/some tetap. |
| F pola referensi | 2 | “Did you know?”<br>“The word zipper echoed the sound of fastening rubber boots.” | Kartu benda familiar berisi reveal lintas penggunaan, dekat pola RP10 tanpa menyalin faktanya. |
| G scanability/format | 2 | “Some 1930s dresses showed off zippers as decorative details.” | Lima baris terkurasi sah adaptive; pendek, exact render, semua batas lulus. |
| H CTA | 2 | “Follow for more unexpected invention stories.” | Satu ajakan follow untuk cerita penemuan yang sesuai isi. |

### B4 — PASS 16/16

Post `QA-ID-1b061bd35c5e`, revision 1,
hash `a60a0b9c423dbc18f8b8f3fd2aae3c7d0f913ce79416157f4754e401b305febc`. Pola: RP12, RP01.

| Dimensi | Skor | Kutipan readback | Alasan |
| --- | ---: | --- | --- |
| A familiarity/angle | 2 | “Some mangroves push excess salt out through tiny leaf glands.” | Mangrove dan salt lewat daun mengubah pohon familiar menjadi kemampuan yang konkret. |
| B surprise/utility | 2 | “Some mangroves push excess salt out through tiny leaf glands.” | Push excess salt out memberi mekanisme dan hasil singkat yang bisa diceritakan ulang. |
| C komposisi | 2 | “Neighboring trees of the same species can join their roots naturally.”<br>“Some pond pine cones release their seeds after a fire.”<br>“Silver birch branches can droop overnight as their water balance shifts.”<br>“Trees can wall off damaged wood to slow spreading decay.” | Root graft, fire-triggered seed release, gerak malam dan pembatasan decay masing-masing memberi pengalaman berbeda. |
| D urutan | 2 | “Some oaks release airborne chemicals that ready nearby trees' defenses.” | Awal membuang garam dan akhir chemical defense berbeda skala/fungsi; tengah tidak mengikuti bab struktur pohon. |
| E naturalness | 2 | “Trees can wall off damaged wood to slow spreading decay.” | Wall off damaged wood menjelaskan proses tanpa istilah akademis; tidak memberi pohon niat atau pikiran manusia. |
| F pola referensi | 2 | “Did you know?” | Perpindahan kemampuan konkret mengikuti pola nature surprises RP12 dengan fakta sendiri. |
| G scanability/format | 2 | “Silver birch branches can droop overnight as their water balance shifts.” | Enam fakta cukup dalam adaptive; some/can/same species tetap dipertahankan, semua budget lulus. |
| H CTA | 2 | “Share these surprising tree facts.” | Share tree facts singkat, satu aksi dan relevan untuk pembaca pecinta alam. |

### B5 — PASS 14/16

Post `QA-ID-069385c57142`, revision 2,
hash `7a4f3e3211095a4d8dc43977181d810900c09efc221fa638dae891f143610027`. Pola: RP07, RP08.

```text
Did you know?

In Australian cities, white ibises scavenge, earning the nickname “bin chickens.”

Some Australian magpies swoop at people during nesting season.

Australian polymer banknotes have transparent windows for security.

Australia’s Hills Hoist is a rotary clothesline and a backyard icon.

In Australia, election-day sausage stalls are nicknamed “democracy sausages.”

Which Australian fact surprised you most?
```

| Dimensi | Skor | Kutipan readback | Alasan |
| --- | ---: | --- | --- |
| A familiarity/angle | 2 | “In Australian cities, white ibises scavenge, earning the nickname “bin chickens.”” | Lokasi Australia dan nickname bin chickens langsung terlihat pada opening. |
| B surprise/utility | 1 | “Australian polymer banknotes have transparent windows for security.” | Nama dan kebiasaan menarik; fitur jendela uang serta ikon jemuran masih lebih ringan daripada reveal terkuat. |
| C komposisi | 2 | “In Australian cities, white ibises scavenge, earning the nickname “bin chickens.””<br>“Some Australian magpies swoop at people during nesting season.”<br>“Australian polymer banknotes have transparent windows for security.”<br>“Australia’s Hills Hoist is a rotary clothesline and a backyard icon.”<br>“In Australia, election-day sausage stalls are nicknamed “democracy sausages.”” | Scavenging, perilaku nesting, uang, backyard dan pemilu memberi fungsi berbeda; BBQ paling ringan dibuang. |
| D urutan | 2 | “In Australia, election-day sausage stalls are nicknamed “democracy sausages.”” | Penutup democracy sausages lebih kuat daripada fitur uang dan menghubungkan kehidupan sehari-hari dengan pemilu. |
| E naturalness | 2 | “Australia’s Hills Hoist is a rotary clothesline and a backyard icon.” | Hills Hoist kini dijelaskan sebagai clothesline sehingga pembaca tidak perlu mengenal merek. |
| F pola referensi | 1 | “Did you know?”<br>“Australian polymer banknotes have transparent windows for security.” | Country trivia sudah terbentuk, walau tengahnya masih memiliki dua detail budaya ringan; minor. |
| G scanability/format | 2 | “In Australian cities, white ibises scavenge, earning the nickname “bin chickens.”” | Format single_subject_fast sesuai daftar satu negara, tidak lagi menjanjikan comparison; baris/budget lulus. |
| H CTA | 2 | “Which Australian fact surprised you most?” | Fact mengganti contrast; satu pertanyaan relevan untuk comment. |

## Batas riset, egress dan kelanjutan

Tidak ada URL sumber fakta yang dibuka/diverifikasi ulang sesuai arahan pemilik.
Makna dinilai terhadap canonical snapshots dan pool QA lama; beberapa kalimat
dipersempit secara konservatif. sources.url_valid bukan verifikasi isi sumber
oleh server. **PASS adalah penerimaan editorial serta state tersimpan pada scope
ini, bukan sertifikasi faktual baru, owner approval produksi, atau jaminan viral.**

Metadata chat/post/release lengkap hanya ada lokal, tidak dikirim pada PR/Issues.
Bukti publik memakai source SHA, CI dan ringkasan hasil yang disanitasi. Tidak
mengubah FAIL historis menjadi PASS atau menambah jawaban evaluasi ke atlas runtime.
Tidak mengarsipkan change otomatis. Perbaikan #134–#136 memenuhi retest scoped ini;
review normal, context/dedup/checks dan approval tetap berlaku saat produksi.

Issue [#134](https://github.com/milyarderpro/content-producer/issues/134), [#135](https://github.com/milyarderpro/content-producer/issues/135), dan [#136](https://github.com/milyarderpro/content-producer/issues/136) telah dibaca ulang CLOSED/COMPLETED sesudah komentar retest tersanitasi.

Fingerprint fixture retest SHA-256: `93e3074d188a3d3b40d5cc7227ff516bc1f1b49648c993fb11a46148a714eea2`. Fixture FAIL historis tetap `67ce79adc7f87a93ddec61e6aed113ad26fc4ca4cfa387521651f619fc7ee184`.
