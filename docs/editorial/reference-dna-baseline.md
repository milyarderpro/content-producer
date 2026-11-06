# Baseline source 0.4.0 dan contoh audit

> Snapshot publik disanitasi: identifier QA/release dan tautan ChatGPT privat memakai alias. Isi naskah, skor, revision, content hash dan verdict dipertahankan. Hash fixture yang tercantum adalah hash bukti asli lokal; hash snapshot publik ada pada [indeks redaksi](reference-dna-public-evidence.md).

Dicatat 5 November 2026 untuk task 1.4. Lihat
[evaluasi dan input frozen](reference-dna-evaluation.md),
[Issue lokal/audit 18 draft](reference-dna-remediation-issue.md), serta
[CR-061](../decisions/2026-11-05-cr-061-plugin-reference-content-dna.md).

## Identitas source dan batas versi

- Source SHA: `2a98665f7e7d2ac5d63c06afe412dd3d0117c152`.
- Manifest `plugin/plugin.json`: `content-producer` 0.4.0.
- Source plugin tidak berubah selama task 1.1–1.4; hash 13 file di bawah.
- Audit percakapan sebelumnya mendapati source/cache lokal 0.4.0 identik.
  Cache bukan bukti release ChatGPT yang menghasilkan 18 draft.
- Model/versi model pembuat draft audit: **unknown**; prompt produksi asli:
  **tidak tersedia**. Jangan menggantinya dengan model penulis dokumen ini.
- Installed release/hash host dan archive hash: **belum diverifikasi**.
  Hash file source bukan hash ZIP atau bukti backend live.
- Bukti audit: **HISTORICAL**, get_post read-only pada percakapan pemilik
  5 November 2026, revision 1/status draft/quality_status passed.
  Kutipan disalin dari Canva copy readback di percakapan, bukan respons baru.
  Tidak ada raw export transcript atau tautan chat stabil pada repository ini.

## Fingerprint source

SHA-256 per file, diambil langsung dari worktree pada task 1.4:

```text
86ecb40fccf7f1dae9563f308c62c97921edef77626125eddf757e761b36de27  plugin/plugin.json
51e72d5559cb963fb62fb2a69e1314eedb2d1764b9e99192114c29a6ee9e3a08  plugin/.app.json
882af1852533521bab469bd9b18f1f0b602e07ac106da29bed5e978da17eace1  plugin/skills/content-producer/SKILL.md
9f8af2201d4633bf9d1797be549d766b147e31186143e34bbbe25a651485242e  plugin/skills/content-producer/references/core/workflow.md
11e39235838073c6e9f377f7a57eb7ec4399c1f9f48a82daaaed08940c35e7d4  plugin/skills/content-producer/references/core/lifecycle.md
58f60ebc12013d66bcf6a76ce0719f143ed7002cb8e9c1011cacd7f33cd3e55f  plugin/skills/content-producer/references/core/tool-sequences.md
804fc11d8a84b7233e5b768f105370b9987751902630a1efede9697edfb1d648  plugin/skills/content-producer/references/core/source-policy.md
7b0947939ab9c6e262d49b01664c1a7f3219790199833175ca4a03d3db18204f  plugin/skills/content-producer/references/core/output-contract.md
ee9d6d04b9d2a9fce2d4d706b2bc3aa1f6d62febfb52c6cff0c0b3ab5e457c52  plugin/skills/content-producer/references/niches/trivia/content-dna.md
2032d3d7f6e9316be2e513b4db1c033a63b92f7e6d8f8b1eab885fc1665b9bed  plugin/skills/content-producer/references/niches/trivia/formats.md
02d2e905be1af958cde10f59f609dc8585536452aa0ebd65b4f087225cd8c8dd  plugin/skills/content-producer/references/niches/trivia/fact-checking.md
808f1f3729753ef137022115103b269228c3f32dc639cafaf53756dd53437dd7  plugin/skills/content-producer/references/niches/trivia/dedup-ontology.md
5420563789262b81a5e88fa3c62ec42403b608ec18bd5d150d86bb33f99ffe3b  plugin/skills/content-producer/references/niches/trivia/quality-rubric.md
```

Daftar ini membekukan pembanding source; hash tidak menyatakan instruksi
terpasang pada host tertentu.

## Input audit dan config

Config nonrahasia persis dibekukan pada
[evaluasi](reference-dna-evaluation.md#input-bersama-yang-dibekukan).
Untuk 15 draft terbaru, input item plan yang teramati berbeda dari corpus:
`fact_count: {mode: fixed, value: 5}`, render_style plain_lines.
Tiga draft sebelumnya masing-masing tujuh fakta. Prompt pengguna yang memilih
override tidak tersedia. Karena input berbeda/tidak lengkap, contoh audit
berikut **bukan** hasil menjalankan prompt E01–E12.

## Contoh Canva copy audit utuh

Ini arsip actual tanpa penyuntingan/rewrite, bukan contoh positif siap produksi,
dan bukan verifikasi ulang kebenaran fakta. Public post IDs dipertahankan
sebagai locator nonrahasia; tidak menyertakan credential, owner UUID, claim token
atau operation key. Sumber bukti: get_post pada audit percakapan tersebut.

### A01 — Red panda superpowers

Locator post: `QA-ID-549e374e1d9d`; revision 1. Hubungan kasus: E01.
Model dan prompt asli unknown; tingkat bukti HISTORICAL.

```text
Red panda superpowers

Bamboo makes up most of a red panda's diet.

A modified wrist bone works like a thumb for gripping bamboo.

Flexible ankles let red pandas climb headfirst down tree trunks.

Bushy ringed tails help them balance and shield against cold.

Scent glands between their footpads help mark their territories.

Follow for more wildlife discoveries.
```

### A02 — Inside a meerkat family

Locator post: `QA-ID-34ca6c955494`; revision 1. Hubungan kasus: E02.
Model dan prompt asli unknown; tingkat bukti HISTORICAL.

```text
Inside a meerkat family

Meerkats form social groups, called mobs, that can reach 30 members.

Lookouts take turns scanning for danger while others forage.

Fathers help guard the pups growing up in their groups.

Even nonbreeding meerkats help care for the group's young.

Their varied calls include alarm barks warning of danger.

Share these surprising group behaviors.
```

### A03 — Five bat myths, corrected

Locator post: `QA-ID-f4f0e33a8290`; revision 1. Hubungan kasus: E04.
Model dan prompt asli unknown; tingkat bukti HISTORICAL.

```text
Five bat myths, corrected

Myth: Bats are blind. Fact: Bats can see.

Myth: Bats are flying mice. Fact: They aren't rodents.

Myth: All bats drink blood. Fact: Only three species do.

Myth: Every bat has rabies. Fact: Most do not.

Myth: Bats target human hair. Fact: Entanglement is uncommon.

Which bat myth did you believe?
```

### A04 — Five moons, compared by diameter

Locator post: `QA-ID-c080e6e70682`; revision 1. Hubungan kasus: E05.
Model dan prompt asli unknown; tingkat bukti HISTORICAL.

```text
Five moons, compared by diameter

Ganymede: about 5,262 km in mean diameter.

Callisto: about 4,821 km in mean diameter.

Io: about 3,643 km in mean diameter.

Earth's Moon: about 3,475 km in mean diameter.

Europa: about 3,122 km in mean diameter.

Which moon size surprised you most?
```

### A05 — Octopuses are stranger than they look

Locator post: `QA-ID-4a9eb23d821d`; revision 1. Hubungan kasus: tidak ada; contoh voice.
Model dan prompt asli unknown; tingkat bukti HISTORICAL.

```text
Octopuses are stranger than they look

Two of an octopus's three hearts pump blood through gills.

Copper-based hemocyanin gives octopus blood its striking blue color.

About two-thirds of an octopus's neurons lie outside its brain.

Octopus suckers sense chemicals, allowing their arms to taste.

Octopuses change skin color and texture to blend into surroundings.

A hard, parrot-like beak helps an octopus pierce prey.

Lost octopus arms can grow back over time.

Follow for more ocean discoveries.
```


## Baseline preview E01–E12

Host baseline yang dapat menjalankan percakapan baru dengan release/model
0.4.0 terverifikasi tidak tersedia melalui runner sesi ini. Menulis sendiri
jawaban setelah membaca design baru akan mencampur treatment dan baseline;
membaca draft lama juga tidak memenuhi input prompt frozen. Karena itu preview
tidak dijalankan dan tidak ada output/skor yang dikarang.

| Kasus | Versi source | Input | Model/host | Output utuh | Sumber riset baru | Status | Tingkat bukti |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E01 | 0.4.0 | prefix/config/prompt frozen | unknown / runner terpisah belum tersedia | belum ada | tidak dilakukan | NOT RUN | belum ada PREVIEW |
| E02 | 0.4.0 | prefix/config/prompt frozen | unknown / runner terpisah belum tersedia | belum ada | tidak dilakukan | NOT RUN | belum ada PREVIEW |
| E03 | 0.4.0 | prefix/config/prompt frozen | unknown / runner terpisah belum tersedia | belum ada | tidak dilakukan | NOT RUN | belum ada PREVIEW |
| E04 | 0.4.0 | prefix/config/prompt frozen | unknown / runner terpisah belum tersedia | belum ada | tidak dilakukan | NOT RUN | belum ada PREVIEW |
| E05 | 0.4.0 | prefix/config/prompt frozen | unknown / runner terpisah belum tersedia | belum ada | tidak dilakukan | NOT RUN | belum ada PREVIEW |
| E06 | 0.4.0 | prefix/config/prompt frozen | unknown / runner terpisah belum tersedia | belum ada | tidak dilakukan | NOT RUN | belum ada PREVIEW |
| E07 | 0.4.0 | prefix/config/prompt frozen | unknown / runner terpisah belum tersedia | belum ada | tidak dilakukan | NOT RUN | belum ada PREVIEW |
| E08 | 0.4.0 | prefix/config/prompt frozen | unknown / runner terpisah belum tersedia | belum ada | tidak dilakukan | NOT RUN | belum ada PREVIEW |
| E09 | 0.4.0 | prefix/config/prompt frozen | unknown / runner terpisah belum tersedia | belum ada | tidak dilakukan | NOT RUN | belum ada PREVIEW |
| E10 | 0.4.0 | prefix/config/prompt frozen | unknown / runner terpisah belum tersedia | belum ada | tidak dilakukan | NOT RUN | belum ada PREVIEW |
| E11 | 0.4.0 | prefix/config/prompt frozen | unknown / runner terpisah belum tersedia | belum ada | tidak dilakukan | NOT RUN | belum ada PREVIEW |
| E12 | 0.4.0 | prefix/config/prompt frozen | unknown / runner terpisah belum tersedia | belum ada | tidak dilakukan | NOT RUN | belum ada PREVIEW |

Ketika host tersedia, jalankan setiap input pada konteks baru; catat versi
terpasang/hash, model bila terlihat, prompt/config, output utuh dan sumber
yang benar-benar dibuka. Jangan mengisi output hilang dengan kutipan A01–A05.
Simpan attempt baru dan nilai delapan dimensi D6; hasil kandidat kelak memakai
input sama. Ketiadaan baseline execution harus tetap disebut dalam pembanding.

## Batas pekerjaan sesi ini

Tidak memanggil Write MCP, tidak membuat preview melalui produksi, tidak
mengubah post/plan/config. Tidak ada commit/push/PR/Actions/pemasangan/deployment.
Sesi ini hanya merekam dokumen; 12 preview, retest saved-copy dan klaim FIXED
masih belum terbukti. Penyelesaian task 1.4 berarti baseline source/audit dan
status NOT RUN tersedia sesuai kondisi task, bukan 12 preview sudah lulus.
