# Retest editorial host 0.5.6 — attempt C6

> Snapshot publik disanitasi: identifier QA/release dan tautan ChatGPT privat memakai alias. Isi naskah, skor, revision, content hash dan verdict dipertahankan. Hash fixture yang tercantum adalah hash bukti asli lokal; hash snapshot publik ada pada [indeks redaksi](reference-dna-public-evidence.md).

Tanggal 6 November 2026, Asia/Jakarta; reviewer Codex. Source dasar `413121c8246b5de10a2093467b21bd2704b347fc` + diff plugin 0.5.6. Release terpasang `QA-RELEASE-cb7b33da5f8d`, 15 source files cocok readback. ZIP/hash/check ada pada [bukti rilis](reference-dna-plugin-release-2026-11-05.md#update-056--retest-naskah-6-november-2026). ChatGPT web/Chrome, selector Medium pada semua kasus; model exact unknown. Chat baru dan mention plugin per kasus awal.

## Input dan batas bukti

Prefix, JSON config, dan core prompt per kasus dari [corpus frozen](reference-dna-evaluation.md) dipertahankan. Atas instruksi pemilik 6 November, C6 **menambahkan** catatan bersama berikut sesudah core prompt:

```text
Owner instruction for this editorial-only retest: do not browse, open, or verify source URLs. Focus on the generated script and reference DNA. Use already available knowledge/research; do not invent evidence or claim fresh factual verification. This remains an unsaved preview with no Write tools.
```

Ini perubahan input yang eksplisit, bukan retest dengan kondisi riset identik B1. Tidak ada fakta jawaban R2 atau feedback contoh pemilik yang dimasukkan ke prompt awal. Coordinator tidak melakukan source-URL verification; host C6 juga diminta tidak melakukannya. Tidak ada klaim dukungan sumber baru, dedup eligibility, renderer atau LIVE-save. Klaim fakta dinilai terhadap pengetahuan/riset yang sudah tersedia dan qualifier teks, tanpa menghapus masalah yang diketahui.

E01/E07 memerlukan satu putaran editorial terarah dan E11 dua putaran. Itu **prompt-assisted host repair**, bukan bukti plugin 0.5.6 selalu menyelesaikan review secara mandiri pada generasi pertama. Copy final di bawah berasal dari respons host; coordinator tidak me-rewrite satu baris pun agar lolos. File QA tidak masuk atlas/paket runtime.

T1/T2 adalah permintaan teks biasa karena UI gagal menampilkan respons. Naskah pertama E07/E08/E10 yang tidak terbaca tetap BLOCKED, tidak diklaim identik dengan restatement yang baru bisa dibaca. E07-T1 berikutnya masih FAIL bahasa/seleksi, lalu diperbaiki. Tidak menghitung pemuatan ulang UI sebagai repair editorial.

## Output gagal yang dipertahankan

### E01 — C6

```text
Did you know?

Red pandas have a false thumb made from a wrist bone.

They can climb down trees headfirst by rotating their ankles.

Thick fur covers even the bottoms of their feet.

Red pandas wrap their bushy tails around themselves in cold weather.

Despite eating bamboo, their digestive systems resemble those of carnivores.

They mark their surroundings with scent to communicate with others.

Red pandas got the name 'panda' before giant pandas did.

Share this with someone who loves red pandas.
```

FAIL: cold-weather payoff berulang dan kalimat digestive systems/carnivores masih formal.

### E07 — C6-T1

```text
Did you know?

Wild rice isn't true rice; it comes from different grasses.

Flooding rice fields helps control weeds, not just water crops.

Black rice turns deep purple when cooked, thanks to pigments.

Sticky rice clings because its starch is mostly amylopectin.

Rice terraces let farmers grow crops on steep hillsides.

Koji mold helps turn rice starch into sugar for sake.

Basmati rice shares an aroma compound with freshly popped popcorn.

Follow for more everyday food surprises.
```

FAIL: amylopectin tidak menambah payoff yang mudah dipahami, terrace line terlalu ringan untuk set ini.

### E11 — C6

```text
Did you know?

The zipper got its name from rubber boots, not pants.

Early zipper-like fasteners were designed to close shoes, not jackets.

Sewing machine pioneer Elias Howe patented an early closure design.

An early clasp fastener appeared at the 1893 Chicago World's Fair.

Zippers also appeared on tobacco pouches before becoming clothing staples.

Children's clothing helped popularize zippers as easy-to-use fasteners.

In 1937, men's fashion embraced zippers in the "Battle of the Fly."

Follow for more surprising invention stories.
```

FAIL: sepatu/boots berdekatan, paten/debut/adopsi mendominasi, Battle of the Fly belum dijelaskan. Host sendiri mengakui middle/ending belum selesai.

### E11-R1 — C6-R1

```text
Did you know?

The zipper got its name from rubber boots, not pants.

Elias Howe patented an early zipper-like closure back in 1851.

Early versions used hooks and eyes instead of today's interlocking teeth.

Some zippers use continuous plastic coils instead of separate teeth.

Certain zipper pulls lock automatically when you release the tab.

Specialized waterproof zippers help keep water out of diving suits.

Apollo astronauts wore spacesuits with zippers designed to hold pressure.

Follow for more surprising invention stories.
```

FAIL: patent date dan beberapa komponen desain masih seperti pelajaran; waterproof/pressure sealing mengulang containment. Tidak diberikan PASS hanya karena lebih bervariasi dari timeline.

## Prompt tindak lanjut persis

### E01R1

```text
Directed editorial repair round 1. Read the whole card as an ordinary reader: the two cold-weather lines repeat a payoff, and the digestive-system sentence reads like a textbook. Keep the strong opening and naming ending, replace or edit the weak middle without losing factual meaning, and return only the finished plain-text hook, distinct fact lines and one CTA. Follow the existing config; do not browse or verify URLs or call any Write tool.
```

### E07R1

```text
Directed editorial repair round 1. The amylopectin sentence is unnecessary jargon about ordinary stickiness, and terraces on hillsides is a weak filler here. Keep the good opening and popcorn ending, and replace or repair the weak middle with different, easy-to-retell food surprises while preserving factual meaning. Follow the same config. Return only the finished Canva copy in one fenced text code block, with blank lines. No HTML, widgets, browsing, URL verification, fresh factual-verification claims or Write tools.
```

### E11R1

```text
Directed editorial repair round 1. Your own assessment identifies weak adoption milestones and an unexplained historical nickname. Finish the internal repair before returning the card: replace those weak facts with genuinely different, concrete surprises about this same object, and choose a memorable ending. Follow the existing adaptive config without padding. Do not repeat the same timeline in a different order. Return only the finished hook, fact lines and one CTA. Do not browse or verify URLs, do not claim fresh source verification, and do not call any Write tool.
```

### E11R2

```text
Directed editorial repair round 2 (final bounded round). The patent date and two component-design lines still read like a lesson. Waterproofing and pressure sealing also repeat a containment payoff. Keep only the strongest line from each cluster. Replace weak lines with different concrete surprises, such as an unexpected use or transformation of this everyday object, using your existing knowledge. Do not pad to seven: the supplied adaptive range allows five strong facts. Return only the final Canva copy in one fenced text code block; no HTML, widgets or commentary. No browsing, URL verification, invented evidence or Write tools.
```

### T1

```text
Please return the Canva copy from your last response as plain text only: hook, blank-line-separated facts, and one CTA. Preserve your last wording and fact order. Do not use HTML, widgets, an app view, a table, or a canvas. Do not browse, open or verify source URLs, and do not call any Write tool. Do not add a caption, sources or internal information.
```

### T2

```text
The previous response failed to render. Return the Canadian-city Canva copy again, using one fenced text code block only. Include the hook, blank lines between facts and one CTA; no HTML, interactive view, table, analysis or sources. Keep the same requested subject and supplied config. No browsing, opening or verification of source URLs and no Write tools.
```

## Output final yang dibaca dan dinilai

### E01 — C6-R1

Chat host (PRIVATE-REFERENCE-80b31dfd63d7).

```text
Did you know?

Red pandas have a false thumb made from a wrist bone.

They can climb down trees headfirst by rotating their ankles.

Their sharp, partly retractable claws help them grip tree branches.

Red pandas wrap their bushy tails around themselves in cold weather.

They mostly eat bamboo, but their guts resemble those of meat eaters.

They use scent marks to send messages to other red pandas.

Red pandas got the name "panda" before giant pandas did.

Share this with someone who loves red pandas.
```

Hitungan lokal: `{"facts":7,"hook":13,"maxFact":69,"block":444,"cta":45,"total":506,"words":86,"maxWords":12}`. 86 kata melebihi preferensi 65–85, tetapi masih di bawah hard cap 100; preferensi bukan gate yang diubah.

### E06 — C6

Chat host (PRIVATE-REFERENCE-0f08931d0ac0).

```text
Did you know?

Your teeth begin forming months before you are born.

Tooth enamel is the hardest substance in the human body.

Plaque is a sticky bacterial film, not merely leftover food.

First permanent molars arrive without replacing any baby teeth.

Tiny ligaments let your teeth shift slightly while you chew.

Some people never develop one or more of their wisdom teeth.

Baby tooth roots gradually dissolve before those teeth fall out.

Follow for more surprising body facts.
```

Hitungan lokal: `{"facts":7,"hook":13,"maxFact":64,"block":427,"cta":38,"total":482,"words":78,"maxWords":11}`.

### E07 — C6-T1-R1

Chat host (PRIVATE-REFERENCE-484b4b1a241f).

```text
Did you know?

Wild rice isn't true rice; it comes from different grasses.

Flooding rice fields helps control weeds, not just water crops.

Black rice turns deep purple when cooked, thanks to pigments.

Sushi rice gets its tangy flavor from vinegar, not fish.

Puffed rice expands when heat turns moisture inside into steam.

Koji mold helps turn rice starch into sugar for sake.

Basmati rice shares an aroma compound with freshly popped popcorn.

Follow for more everyday food surprises.
```

Hitungan lokal: `{"facts":7,"hook":13,"maxFact":66,"block":433,"cta":40,"total":490,"words":79,"maxWords":10}`.

### E08 — C6-T1

Chat host (PRIVATE-REFERENCE-05502989fd5c).

```text
Did you know?

Refrigerate berries promptly; leaving them warm speeds up softening and spoilage.

Keep berries unwashed until eating; extra moisture can encourage mold.

Spread delicate raspberries in a shallow container to limit crushing.

Dry washed leafy greens thoroughly before refrigerating to reduce sogginess.

Line a greens container with a clean towel to absorb condensation.

Keep leafy greens away from apples; ethylene can accelerate yellowing.

Save these tips for your next grocery trip.
```

Hitungan lokal: `{"facts":6,"hook":13,"maxFact":81,"block":442,"cta":43,"total":502,"words":73,"maxWords":11}`.

### E10 — C6-T2

Chat host (PRIVATE-REFERENCE-46fd7a6ff208).

```text
Did you know?

Calgary’s +15 walkways cross streets overhead; Toronto’s PATH runs underground.

Montreal’s Metro rides on rubber tires; Toronto’s subway uses steel wheels.

Quebec City retains old walls; Halifax has a star-shaped hilltop citadel.

Vancouver’s harbor welcomes seaplanes that land right on the water.

Ottawa’s Rideau Canal can become a skating route in winter.

Montreal’s Olympic Stadium has a tower leaning over its roof.

Toronto’s island airport has a pedestrian tunnel beneath Lake Ontario.

Which Canadian city surprised you most?
```

Hitungan lokal: `{"facts":7,"hook":13,"maxFact":79,"block":496,"cta":39,"total":552,"words":81,"maxWords":11}`.

### E11 — C6-R2

Chat host (PRIVATE-REFERENCE-9ec95c02f859).

```text
Did you know?

The zipper got its name from rubber boots, not pants.

Early zippers appeared on tobacco pouches before becoming clothing staples.

Apollo astronauts wore spacesuits with pressure-sealing zippers.

Some luggage zippers have two sliders that can be locked together.

A zipper can turn two separate sleeping bags into one larger bag.

Follow for more surprising invention stories.
```

Hitungan lokal: `{"facts":5,"hook":13,"maxFact":75,"block":331,"cta":45,"total":393,"words":59,"maxWords":12}`. Lima fakta sesuai adaptive 5–9; tidak ada override fixed count atau penambahan filler keenam.

Hitungan termasuk blank-line separators. Ini preflight lokal, bukan metrik server. D6 dan perbandingan baseline ada pada [review terbaru](reference-dna-review-2026-11-06.md). Tidak ada draft/data production yang ditulis.
