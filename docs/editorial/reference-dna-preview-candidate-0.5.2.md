# Retest budget 0.5.2 — attempt C3

> Snapshot publik disanitasi: identifier QA/release dan tautan ChatGPT privat memakai alias. Isi naskah, skor, revision, content hash dan verdict dipertahankan. Hash fixture yang tercantum adalah hash bukti asli lokal; hash snapshot publik ada pada [indeks redaksi](reference-dna-public-evidence.md).

Tanggal 5 November 2026, Asia/Jakarta. Reviewer Codex. **PREVIEW HOST**.
Release `QA-RELEASE-2fbb876b33b8`; seluruh 15 source
dibaca balik dan hash cocok paket. Mapping app/identitas tetap.
Host ChatGPT web/Chrome, thinking effort Medium; model exact unknown.
Input frozen dicocokkan, chat baru per kasus, tanpa feedback atau contoh jawaban.
Tidak mengulang verifikasi URL sesuai instruksi pemilik.

Perubahan 0.5.1→0.5.2 hanya rumus separator/budget dan versi.
E10 gagal di C2 diulang bersama E01/E02/E08/E12 sebagai regresi terkait.
Output berikut utuh tanpa rewrite. Reload response hanya untuk membaca output
yang gagal dimuat, bukan regenerasi. Respons menyatakan unsaved/no Write;
tidak ada business Write yang dipanggil coordinator atau klaim LIVE-save.

## E01 — C3

Chat sumber (PRIVATE-REFERENCE-02f02c5acd3f).

```text
Did you know?

Red pandas can climb down trees headfirst using flexible ankles.

Their extra "thumb" is actually a modified wrist bone.

Despite their carnivore digestive system, they mostly eat bamboo.

Red pandas use their tongues to investigate scent marks.

Their reddish fur helps camouflage them among mossy forest trees.

In cold weather, their bushy tails double as cozy blankets.

Hungry red panda cubs make high-pitched whistles for their mothers.

Share this with someone who loves red pandas.
```

## E02 — C3

Chat sumber (PRIVATE-REFERENCE-28fd4fa7a584).

```text
Did you know?

Some meerkats skip foraging to babysit pups at the burrow.

Helpers bring food to pups still learning to forage.

A lookout stands guard while other meerkats search for food.

Their warning calls can signal different levels of danger.

Older meerkats teach pups how to handle live prey.

Meerkats call to stay connected while searching for food.

When it's cold, meerkats huddle close together for warmth.

Share this with an animal lover.
```

## E08 — C3

Chat sumber (PRIVATE-REFERENCE-0b57f7773975).

```text
Did you know?

Keep berries unwashed in the fridge; rinse them just before eating.

Remove crushed or spoiled berries before storing the rest.

Leave strawberry tops attached until you are ready to prepare them.

Wrap lettuce in a dry paper towel to absorb excess moisture.

Store loose spinach in an open bag inside the refrigerator crisper.

Keep prewashed, ready-to-eat salad greens refrigerated; another rinse is unnecessary.

Save these tips for your next grocery trip.
```

## E10 — C3

Chat sumber (PRIVATE-REFERENCE-3428f349b81d).

```text
Did you know?

Toronto's PATH goes underground; Calgary's +15 skywalks rise above streets.

Ottawa skates on a canal; Winnipeg on frozen rivers.

Québec City keeps old ramparts; Halifax has a star-shaped fort.

Vancouver has a seaside path; Edmonton has sprawling river-valley parkland.

Montréal has outdoor stairs; St. John's has colorful row houses.

Toronto runs streetcars; Vancouver runs driverless SkyTrain cars.

Victoria's winters bring rain; Calgary's Chinooks bring sudden warmth.

Which city would surprise you most?
```

## E12 — C3

Chat sumber (PRIVATE-REFERENCE-4ec3f86d53ef).

```text
Did you know?

Coast redwoods can drink water straight from coastal fog.

Some mangroves push excess salt out through their leaves.

Quaking aspens can grow entire groves from connected roots.

Some lodgepole pinecones open only after intense heat melts resin.

Trees can wall off infected wood instead of repairing it.

Aspen bark can make sugars even after leaves have fallen.

Redwood trunks can shrink and swell between day and night.

Share these surprising tree abilities.
```

## Hitungan lokal

Block memasukkan dua newline antar fakta. Ini bukan metrik server.

| Kasus | Hook | Maks fakta | Block | CTA | Total | Kata | Maks kata/fakta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| E01 | 13 | 67 | 442 | 45 | 504 | 78 | 10 |
| E02 | 13 | 60 | 405 | 32 | 454 | 74 | 10 |
| E08 | 13 | 85 | 414 | 43 | 474 | 74 | 11 |
| E10 | 13 | 75 | 476 | 35 | 528 | 75 | 10 |
| E12 | 13 | 66 | 423 | 38 | 478 | 75 | 10 |

E10 kini sesuai budget. **E02 tetap FAIL semantik**: babysit, bring food dan
teach pups mengulang tiga care beats. Passing C2 E02 tidak dipakai untuk
menyembunyikan regresi C3. Instruksi perlu diperbaiki secara terarah dan
E02 diuji ulang sebagai attempt baru. Kasus lain ditinjau pada
[review delapan dimensi](reference-dna-semantic-review.md).
