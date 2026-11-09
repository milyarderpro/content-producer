# Revisi editorial pemilik — attempt R2

Tanggal: 5 November 2026, Asia/Jakarta. Penyunting: Codex.
Acuan [feedback R1](reference-dna-owner-review.md#feedback-pemilik-atas-r1--5-november-2026).
Ini editorial revision, bukan hasil generasi host baru. R1 tetap utuh.
A diterima pemilik dengan edit subject; edit tersebut kini diterapkan.
B diterima dan tidak diubah. C/D kemudian diterima pemilik secara editorial;
[feedback final](reference-dna-owner-review.md#penerimaan-final-pemilik-atas-r2--5-november-2026)
menutup task 5.4 tanpa putaran pemolesan tambahan.
Task 5.2–5.3 tetap terbuka untuk retest host; tidak ada Write/saved-copy
atau skor PASS generasi baru. Copy R2 tidak diubah setelah diterima.

Perubahan A hanya menyebut Adult meerkats setelah generic hook.
C memakai kalimat Edmonton dari pemilik dan memperjelas ukuran serta bentuk
Sunken Garden. Kanal skating dipertahankan sebagai penutup.
D mempertahankan kematian sebelum nama dan early fastener membuka sendiri;
railroad brakes, military adoption dan cluster boots dikeluarkan. Tiga
pengganti membahas pressure seal, desain busana dan perhiasan yang berubah
bentuk. Dipilih **lima fakta**, secara eksplisit dalam config adaptive 5–9,
tanpa fixed override; preferensi tujuh tidak menjadi alasan filler.

Riset baru dibatasi pada pengganti C/D; URL fakta A/B yang diterima tidak
dibuka ulang. Tidak memasukkan jawaban transfer ke atlas/runtime plugin.
Sumber baru dan batas pengambilan tercatat di bawah, terpisah dari copy publik.

## A — E02 R2

```text
Did you know?

Adult meerkats give pups scorpions with the stingers removed for hunting practice.

Meerkats can close their ears to keep sand out while digging.

A lookout watches for danger while the group searches for food.

Their burrows have separate sleeping and toilet chambers.

They can team up to overwhelm venomous snakes.

They cool down by pressing their bellies against cooler rocks.

At night, the group snuggles together inside its burrow.

Share this with someone who loves animals.
```

Hitungan lokal termasuk separator: {"facts":7,"hook":13,"maxFact":82,"block":439,"cta":42,"full":498,"words":79,"maxWords":12}.

## B — E07 R2

```text
Did you know?

Wild rice is a different type of grass from regular rice.

Jasmine and basmati rice share an aroma compound found in popcorn.

Some rice varieties grow grains colored red, purple, or black.

Flooding rice paddies helps farmers keep competing weeds under control.

Glutinous rice has no gluten; its name describes its stickiness.

Sake makers use koji mold to turn rice starch into sugar.

Even rice husks can become fuel for electric power plants.

Follow for more everyday food surprises.
```

Hitungan lokal termasuk separator: {"facts":7,"hook":13,"maxFact":71,"block":447,"cta":40,"full":504,"words":82,"maxWords":11}.

## C — E10 R2

```text
Did you know?

A shopping mall in Edmonton has indoor roller coasters.

Near Victoria, a former limestone quarry holds a sunken garden spanning five acres.

Toronto's downtown airport sits on an island.

Montreal's underground walkways stretch for about 32 km.

Calgary takes downtown walkers above traffic on enclosed skywalks.

Halifax's hilltop fort is shaped like a star.

Winter can turn Ottawa's canal into a 7.8-km skating rink.

Which place would you want to see?
```

Hitungan lokal termasuk separator: {"facts":7,"hook":13,"maxFact":83,"block":420,"cta":34,"full":471,"words":74,"maxWords":13}.

## D — E11 R2

```text
Did you know?

Whitcomb Judson died before his invention got the name "zipper."

Early fasteners could jam or spring open unexpectedly.

An Apollo spacesuit used a special zipper to keep its air inside.

In the 1930s, some dresses showed off zippers as decorations.

A Van Cleef & Arpels necklace can zip up into a bracelet.

Follow for more surprising invention stories.
```

Hitungan lokal termasuk separator: {"facts":5,"hook":13,"maxFact":65,"block":309,"cta":45,"full":371,"words":61,"maxWords":12}.

## Sumber dan pemetaan perubahan baru

| Posisi | Bukti | Dukungan dan batas |
| --- | --- | --- |
| C F2 | [Butchart Sunken Garden](https://butchartgardens.com/garden/sunken-garden/), [media lokasi](https://butchartgardens.com/media/) | Halaman pemilik menyebut original quarry, limestone, Sunken Garden lima acres; media menempatkan lokasi 23 km utara Victoria. Detail baru tidak mengubah lokasi menjadi Victoria city proper. |
| D F1 | MIT yang sudah dibaca pada attempt lama | Tidak diverifikasi ulang; kematian Judson sebelum istilah zipper tetap dipertahankan sesuai feedback. |
| D F2 | [YKK history](https://ykkamericas.com/history-of-the-zipper/) | Early clasp locker bisa menarik dirinya terbuka; tidak diperluas menjadi sifat semua zipper modern. |
| D F3 | [Smithsonian Apollo 15 suit](https://www.si.edu/object/pressure-suit-a7-lb-irwin-apollo-15-flown%3Anasm_A19740132000) | Teks lengkap katalog diterima lewat search: dua zipper, salah satunya pressure sealing. Direct open 404; batas akses dicatat, bukan diklaim sukses. Kata special dan An Apollo membatasi scope. |
| D F4 | [V&A exhibition guide](https://www.vam.ac.uk/info/schiaparelli-fashion-becomes-art-exhibition-large-print-guide) | Bagian Zip me up menjelaskan zips yang ditonjolkan sebagai fitur desain; halaman dibuka. [Museo del Traje](https://www.cultura.gob.es/mtraje/en/visita/visita-virtual/vanguardias/el-glamour-de-los-anos-30/vestido-schiaparelli.html) juga memberi teks katalog via search tetapi direct open 429; bukan keharusan sumber tambahan. |
| D F5 | [Van Cleef heritage](https://www.vancleefarpels.com/en/the-maison/the-heritage-gallery/zip.html) | Halaman pembuat dibuka: Zip necklace transformable into bracelet; operasi slider mengubah bentuk. Tidak mengklaim semua kalung berzip bekerja demikian. |

Kelima fakta D memberi konteks historis melalui perbedaan penggunaan, bukan
inventor → redesign → adoption. Busana dan perhiasan berdekatan domainnya,
tetapi payoff berbeda: ornament exposed versus benda yang berubah bentuk.
Pemilik tetap menilai apakah pembedaan itu cukup; tidak dipaksa menjadi PASS.

Pemeriksaan: makna/qualifier bahan baru, budget karakter/kata lokal, tautan
dan git diff --check. Tidak ada klaim readback post, dedup eligibility,
renderer budget PASS atau efektivitas host. Tidak mengubah versi plugin hanya
untuk menyimpan naskah manual; aturan umum ditangani terpisah bila diperlukan.
