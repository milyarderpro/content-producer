# Retest host 0.5.5 — attempt C5

> Snapshot publik disanitasi: identifier QA/release dan tautan ChatGPT privat memakai alias. Isi naskah, skor, revision, content hash dan verdict dipertahankan. Hash fixture yang tercantum adalah hash bukti asli lokal; hash snapshot publik ada pada [indeks redaksi](reference-dna-public-evidence.md).

Tanggal 6 November 2026, Asia/Jakarta; reviewer Codex. Source dasar `413121c8246b5de10a2093467b21bd2704b347fc`. Plugin 0.5.5, release `QA-RELEASE-856cae14200c`, metadata Plugin Creator dikonfirmasi pada sesi ini. ChatGPT web/Chrome, selector Medium; model exact unknown. Chat baru per kasus, mention Content Producer. Prefix/config/core prompt sama dengan [corpus frozen](reference-dna-evaluation.md); tidak memasukkan feedback atau jawaban R2 ke prompt C5.

PREVIEW HOST, bukan LIVE-save. Coordinator tidak membuka/memeriksa URL sumber. Host melakukan riset sesuai prompt lama; nama sumber yang dilaporkan adalah provenance host, bukan independent verification. Respons menyatakan no Write; tidak ada business Write oleh coordinator. Pemilihan Page/dedup pada host tidak terkontrol seragam: beberapa respons menemukan beberapa Page, E02 membaca draft meerkat terbaru. Jadi tidak ada klaim transfer terisolasi sempurna atau sebab kausal tunggal.

Urutan skor: A angle, B surprise/utility, C komposisi, D urutan, E naturalness, F pola, G scanability, H CTA. Skala D6 tidak diubah. Review terbaru tidak mempertahankan PASS lama hanya karena totalnya tinggi.

## E01 — C5

Chat host (PRIVATE-REFERENCE-b17b62d0405c).

```text
Did you know?

Red pandas can climb down tree trunks headfirst, thanks to flexible ankles.

Their extra gripping “thumb” is actually a modified wrist bone.

Red pandas leave scent messages using glands between their footpads.

Their reddish fur helps them blend into moss-covered trees.

They usually live alone, except when mating or raising cubs.

Despite belonging to the carnivore order, they mostly eat bamboo.

In cold weather, they wrap their bushy tails around themselves.

Share this with someone who loves red pandas.
```

Skor A–H: **2/2/2/2/1/1/2/2 = 14/16**. FAIL: “Despite belonging to the carnivore order” tetap bahasa klasifikasi akademis; naturalness 1.

## E02 — C5

Chat host (PRIVATE-REFERENCE-8bddc79b2f4e).

```text
Did you know?

Older meerkats teach pups to handle prey using disabled animals.

On chilly mornings, meerkats huddle before basking in the sun.

Meerkats groom one another, helping maintain their social bonds.

Group members cooperate to dig and clear underground burrows.

Soft calls help foraging meerkats stay in touch while apart.

Rival meerkat groups advance together, tails raised in a war dance.

Some meerkat groups keep different wake-up routines across generations.

Share these surprising meerkat connections.
```

Skor A–H: **2/1/2/2/2/1/2/1 = 13/16**. PASS PREVIEW 13/16: teaching, huddle, grooming, digging, contact calls, war dance dan kebiasaan bangun bervariasi. Teaching masih umum, grooming satu konteks ringan; CTA “connections” agak kaku. Tidak ada cluster caregiving/calls seperti C4.

## E06 — C5

Chat host (PRIVATE-REFERENCE-c539a15827dc).

```text
Did you know?

Babies are born with 20 teeth hiding beneath their gums.

Tooth enamel is the hardest substance in the human body.

Small ligaments hold your tooth roots inside their sockets.

Exposed dentin's tiny tubes can make cold drinks hurt.

Your first permanent molars often appear around age six.

Saliva can replace minerals lost during early tooth decay.

Teeth aren't bones, even though both are hard and white.

Follow for more surprising facts about your body.
```

Skor A–H: **2/1/1/1/2/1/2/2 = 12/16**. FAIL 12/16: ligamen, molar usia enam, enamel dan mineral masih dominan pelajaran anatomi. Dentin/cold drinks memberi payoff konkret tetapi belum mengangkat set.

## E07 — C5

Chat host (PRIVATE-REFERENCE-1cb9e4e261a2).

```text
Did you know?

Fragrant rice shares its popcorn-like aroma compound with popcorn.

Black rice can turn purple when cooked, thanks to natural pigments.

Despite its name, glutinous rice contains no gluten.

Some rice grows in upland fields that are never flooded.

Brown rice keeps the bran and germ removed from white rice.

Rice was domesticated near China's Yangtze River thousands of years ago.

Wild rice belongs to a different genus than ordinary rice.

Follow for more everyday food surprises.
```

Skor A–H: **2/1/1/1/1/1/2/2 = 11/16**. FAIL 11/16: “different genus” kaku; bran/germ dan “thousands of years ago” memberi tengah/akhir ringan berturut-turut. Bukan kerangka R2 yang diterima.

## E11 — C5

Chat host (PRIVATE-REFERENCE-1dabead2dd18).

```text
Did you know?

The word “zipper” first caught on through rubber boots, not pants.

An early version jammed and even needed an instruction booklet.

Zipper ancestors also fastened tobacco sacks and mail pouches.

World War I troops used zippers on clothing and gear.

Metal teeth eventually replaced the original hooks-and-eyes design.

In 1937, zippers challenged buttons in the “Battle of the Fly.”

Inventor Whitcomb Judson died before anyone called it a zipper.

Follow for more unexpected invention stories.
```

Skor A–H: **2/1/0/1/1/1/2/2 = 10/16**. FAIL 10/16: military use, metal teeth dan “Battle of the Fly” tanpa penjelasan masih lemah. Komposisi 0, naturalness 1; pembuka bagus tidak menutup defect tengah.

## Respons belum dapat dibaca

- E08: chat (PRIVATE-REFERENCE-ae2162bbb951), BLOCKED untuk penilaian C5: final response gagal dimuat; tidak diberi skor atau digantikan rewrite.
- E10: chat (PRIVATE-REFERENCE-291d87340351), BLOCKED untuk penilaian C5 setelah reload response/reload halaman; tidak dianggap FAIL isi atau PASS.

Kegagalan C5 dipertahankan. Tindak lanjut 0.5.6 memperjelas reader audition, klasifikasi sehari-hari, dan seleksi tengah/akhir. Tidak menambahkan fakta transfer ke atlas. Perbandingan B1/C1–C4 delapan dimensi tetap pada [review historis](reference-dna-semantic-review.md); attempt ini tidak mengubah output lama.
