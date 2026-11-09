# Preview baseline 0.4.0 — attempt B1

> Snapshot publik disanitasi: identifier QA/release dan tautan ChatGPT privat memakai alias. Isi naskah, skor, revision, content hash dan verdict dipertahankan. Hash fixture yang tercantum adalah hash bukti asli lokal; hash snapshot publik ada pada [indeks redaksi](reference-dna-public-evidence.md).

Tanggal: 5 November 2026, timezone Asia/Jakarta. Tingkat bukti: **PREVIEW HOST**,
bukan LIVE saved-copy dan belum verdict semantik. Ini attempt baru task 5;
status NOT RUN historis pada [record awal](reference-dna-baseline.md) tidak ditimpa.

Host: ChatGPT web melalui Chrome, chat baru terpisah per kasus dengan
Content Producer dipilih secara eksplisit. Model exact tidak terlihat; selector
menampilkan **Medium** (thinking effort), bukan identitas versi model.
Release saat seluruh baseline dijalankan: `QA-RELEASE-acfec925389b`,
plugin `QA-PLUGIN-58151d60d6a8`, USER/PRIVATE, 0.4.0.
Readback Plugin Creator membuktikan seluruh 13 file source identik dengan
baseline frozen SHA `2a98665f7e7d2ac5d63c06afe412dd3d0117c152`;
overlay kompatibilitas existing dicatat terpisah.

Input adalah prefix + JSON config + prompt inti dari
[evaluasi frozen](reference-dna-evaluation.md), tanpa instruksi editorial tambahan.
Mention plugin adalah konteks pemilihan host, sama untuk baseline/kandidat.
Input lengkap dicocokkan pada composer sebelum pengiriman; 12 file input dan
SHA-256 berada di `artifacts/reference-dna-evaluation/input-manifest.json`.
Chat standar digunakan untuk pemanggilan plugin; personalisasi host tidak
terisolasi sepenuhnya. Karena itu hasil adalah pembanding pada host yang sama,
bukan eksperimen model terkontrol sempurna.

Percobaan setup pertama hanya mengirim prefix dan tidak termasuk B1; tidak
mengisi output hilang dengan rewrite. Beberapa respons menampilkan couldn't
load; teks di bawah diambil setelah Reload response, bukan regenerasi.
Label UI seperti Writing, format dan tombol Copy tidak dimasukkan ke copy.
Seluruh hook–fakta–CTA ditranskripsikan tanpa penyuntingan.

Setiap respons menyatakan preview unsaved/no Write. Tidak ada business Write
yang dijalankan oleh coordinator; audit seluruh trace host tetap dibedakan dari
pernyataan model. Beberapa kasus melakukan Read sumber/Pages/dedup; pemilihan
Page tidak selalu sama karena prompt frozen hanya memberi config. Scope dan
limitasi itu tetap menjadi bagian interpretasi pembanding.

## E01 — B1

Chat sumber (PRIVATE-REFERENCE-34f48698b229) · source 0.4.0 · PREVIEW.

```text
7 surprising facts about red pandas

Red pandas were scientifically described before giant pandas were.

They use a wrist bone like a thumb to grip bamboo.

Flexible ankles help them climb down trees headfirst.

Their bushy tails help them balance on narrow branches.

Despite belonging to Carnivora, they mostly eat bamboo.

Their reddish fur blends with mosses growing on trees.

Red pandas are endangered as their forest habitat shrinks.

Share these facts with an animal lover.
```

## E02 — B1

Chat sumber (PRIVATE-REFERENCE-fde807b00212) · source 0.4.0 · PREVIEW.

```text
Meerkats Look After Each Other

While others forage, one meerkat watches the horizon for danger.

Group members take turns serving as lookout throughout the day.

Different alarm calls warn of threats from land or sky.

Some adults stay behind to guard pups at the burrow.

Helpers bring food to pups still learning to forage.

Older meerkats introduce pups to increasingly challenging prey for practice.

Meerkats also huddle together for warmth on chilly mornings.

Share this remarkable example of teamwork.
```

## E03 — B1

Chat sumber (PRIVATE-REFERENCE-1743230fba98) · source 0.4.0 · PREVIEW.

```text
African vs. Asian elephants: 7 differences

African savanna elephants are generally larger than Asian elephants.

African ears are larger; Asian ears are noticeably smaller.

African trunks have two fingerlike tips; Asian trunks have one.

Asian elephants have twin-domed heads; African savanna elephants have rounder heads.

Asian backs usually arch; African savanna backs typically dip.

Female African elephants can grow tusks; Asian females rarely show them.

Africa has two living elephant species; Asia has one.

Which difference surprised you most?
```

## E04 — B1

Chat sumber (PRIVATE-REFERENCE-5230eadb4d53) · source 0.4.0 · PREVIEW.

```text
Seven more bat myths, corrected

Myth: Bats only live in caves. Fact: Some roost in trees.

Myth: Bats build nests. Fact: They use existing shelters instead.

Myth: Bats chew house wires. Fact: They do not gnaw wires.

Myth: Bats are filthy. Fact: They regularly groom their fur.

Myth: All bats hibernate. Fact: Some migrate during winter.

Myth: All bats eat insects. Fact: Some also eat fruit.

Myth: All bats echolocate. Fact: Some fruit bats rely on vision.

Which myth surprised you most?
```

## E05 — B1

Chat sumber (PRIVATE-REFERENCE-9929f218ec91) · source 0.4.0 · PREVIEW.

```text
7 Moon Comparisons That Sound Unreal

Ganymede is wider than Mercury, despite being Jupiter's moon.

Titan's atmosphere is denser than Earth's, despite its lower gravity.

Europa may hold over twice the water in Earth's oceans.

Io has more volcanic activity than any other known world.

Callisto has more impact craters than any other solar-system object.

Triton orbits against Neptune's spin, unlike other large moons.

Phobos circles Mars three times daily; Deimos takes 30 hours.

Which moon surprised you most? Comment below.
```

## E06 — B1

Chat sumber (PRIVATE-REFERENCE-fb00494a4704) · source 0.4.0 · PREVIEW.

```text
7 Surprising Facts About Human Teeth

Tooth enamel is about 96 percent mineral, making it remarkably hard.

Unlike bones, your teeth do not contain any bone marrow.

A complete adult set has 32 teeth, including four wisdom teeth.

Tiny tubes inside dentin can contribute to sensitive teeth.

Fibrous ligaments connect your tooth roots to their sockets.

The pulp inside your teeth contains nerves and blood vessels.

Saliva can restore minerals to enamel during early tooth decay.

Follow for more fascinating human body facts.
```

## E07 — B1

Chat sumber (PRIVATE-REFERENCE-ab89ec40b3d0) · source 0.4.0 · PREVIEW.

```text
7 surprising facts about rice

More than 120,000 rice varieties exist around the world.

Brown rice retains its bran and germ after hulling.

Wild rice belongs to a different group of grasses.

Glutinous rice gets sticky despite containing no gluten protein.

Some rice grows in upland fields without standing water.

Parboiled rice is pressure-steamed before milling, not fully cooked.

Black rice gets its color from natural anthocyanin pigments.

Follow for more food science facts.
```

## E08 — B1

Chat sumber (PRIVATE-REFERENCE-b7dac133da5b) · source 0.4.0 · PREVIEW.

```text
Keep Berries and Greens Fresher

Refrigerate fresh berries promptly to help slow spoilage after picking.

Leave berries unwashed until serving; extra moisture speeds quality loss.

Keep raspberries in shallow containers to prevent crushing delicate fruit underneath.

Wrap lettuce in a dry paper towel inside a refrigerated container.

Keep leafy greens cold and protected from drying out to limit wilting.

Rinse produce under cool running water just before preparing or eating.

Save these tips for your next grocery trip.
```

## E09 — B1

Chat sumber (PRIVATE-REFERENCE-54aa5bf74938) · source 0.4.0 · PREVIEW.

```text
Everyday life in Australia has surprises!

Australian banknotes are made from polymer plastic, not paper.

Some public parks offer free electric barbecues for picnics.

Australian road trains can tow two or more trailers.

Queensland skips daylight saving while several southern states observe it.

Some rural mailboxes sit together beside main roads.

At patrolled beaches, red-and-yellow flags mark supervised swimming areas.

Some pedestrian crossing buttons click and vibrate for accessibility.

Which detail surprised you most?
```

## E10 — B1

Chat sumber (PRIVATE-REFERENCE-6b8b35a6e198) · source 0.4.0 · PREVIEW.

```text
7 Canadian cities, 7 surprising features

Toronto's PATH extends over 30 kilometers, mostly beneath downtown streets.

Montreal's RESO has roughly 32 kilometers of underground pedestrian passages.

Calgary's Plus 15 network connects downtown through 87 elevated bridges.

Vancouver's uninterrupted waterfront greenway stretches for 28 kilometers.

Ottawa's Rideau Canal becomes a 7.8-kilometer skateway when conditions allow.

Old Québec retains the only intact city fortifications north of Mexico.

Winnipeg's Forks has hosted Indigenous gatherings for at least 6,000 years.

Which city surprised you most?
```

## E11 — B1

Chat sumber (PRIVATE-REFERENCE-536af22bf4f1) · source 0.4.0 · PREVIEW.

```text
The zipper has a surprisingly long history!

An early zipper-like clothing closure was patented back in 1851.

Whitcomb Judson designed his clasp locker to fasten boots.

His invention debuted at Chicago's 1893 World's Fair.

Early clasp lockers often jammed or unexpectedly pulled apart.

Gideon Sundback replaced troublesome hooks with interlocking metal teeth.

B.F. Goodrich named its boot fastener "zipper" in 1923.

Zippers became widely used on clothing during the 1930s.

Follow for more surprising everyday history!
```

## E12 — B1

Chat sumber (PRIVATE-REFERENCE-0d1bfc4154a7) · source 0.4.0 · PREVIEW.

```text
7 Surprising Abilities of Trees

Persian silk trees fold their leaflets closed at night.

Some mangroves release excess salt through glands on their leaves.

Aspens can grow genetically identical trunks from shared root systems.

Some lodgepole pine cones open after heat melts their resin seals.

Tree rings can preserve clues about droughts centuries ago.

Trees cool nearby air as water evaporates from their leaves.

Trees exchange sugars for nutrients with fungi around their roots.

Share these surprising tree abilities with a nature lover!
```

## Rujukan riset yang dilaporkan host

Host menyebut San Diego Zoo/WWF/Smithsonian (E01), Smithsonian/Cambridge/SANBI
(E02), WCS/WWF/Smithsonian/International Elephant Foundation (E03), USGS/Bat
Conservation Trust/BCI/Smithsonian (E04), NASA (E05), ADA/Cleveland Clinic (E06),
USA Rice/IRRI/review ilmiah (E07), university extension (E08), otoritas Australia
(E09), pemerintah/pariwisata kota Kanada (E10), Lemelson-MIT/YKK/Smithsonian
(E11), dan Cambridge/Smithsonian/USGS/USDA/EPA (E12). Nama ini adalah laporan
host, belum pengganti review dukungan per klaim. URL dan review akurasi kandidat
akan dicatat terpisah; klaim host tentang budget/reuse bukan server PASS.
