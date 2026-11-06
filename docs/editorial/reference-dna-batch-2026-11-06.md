# Uji batch lima draft — task 6.4

> Snapshot publik disanitasi: identifier QA/release dan tautan ChatGPT privat memakai alias. Isi naskah, skor, revision, content hash dan verdict dipertahankan. Hash fixture yang tercantum adalah hash bukti asli lokal; hash snapshot publik ada pada [indeks redaksi](reference-dna-public-evidence.md).

Tanggal: 6 November 2026. ID: **DNA-BATCH-056-01**.
Plugin PRIVATE Content Producer **0.5.6**, owner OAuth existing `mcpku2`.
Chat host (PRIVATE-REFERENCE-81426f193193).
Source paket `82f698b0c7f873fc5906919ae64f34242cb49e61`;
release `QA-RELEASE-cb7b33da5f8d`, dikonfirmasi melalui
metadata Plugin Creator sebelum pengujian. Nama/versi model tepat tidak
tersedia; selector host menunjukkan thinking effort Medium.

## Scope dan input

Pemilik meminta pengerjaan task 6.4 setelah penjelasan skenario satu batch
lima draft, lalu mengirim `lanjutkan`. Target sama dengan task 6.3:
**Content Producer QA Sandbox (Verified)**,
`QA-ID-7b6e770529b4`. Owner/workspace/Page di-resolve
melalui Read autentikasi existing sebelum pengujian. Tidak membuat koneksi kedua.

Prompt inti yang benar-benar dikirim:

```text
Buat 5 draft trivia baru untuk Content Producer QA Sandbox (Verified), page_public_id QA-ID-7b6e770529b4, niche trivia. Ini uji task 6.4 yang diizinkan pemilik. Resolve owner/workspace melalui koneksi existing plugin. Ikuti config Page dan standar DNA referensi. Pilih angle/format/topik/goal yang sah dari bahan riset tersedia di bawah, dengan variasi antarpost.
```

Prompt tambahan menetapkan satu plan tanpa jadwal bernama
`QA DNA batch 2026-11-06 T64`, lima draft baru, satu item aktif per host turn,
save/get_post sources+checks/get_content_plan, tanpa mengubah Page/config,
post lama atau plan lain. Tidak approve/ready, publish, schedule, discard,
cleanup atau membuat replacement plan/post. Operation key dipertahankan untuk
retry operasi logis sama; respons hilang direkonsiliasi.

**Tidak ada instruksi jumlah fakta**, profil count tertentu atau permintaan
override pada prompt awal maupun lanjutan. Angka lima merujuk jumlah draft.
Host memilih format/topik/goal dan `profile_key` saat membuat plan.

Pemilik melarang membuka/verifikasi ulang URL. Input memakai pool riset QA lama
untuk trees, Canadian places, Australia, zipper dan moons, dengan klaim serta
URL nyata yang tercatat dalam [C1](reference-dna-preview-candidate-0.5.0.md),
[C2](reference-dna-preview-candidate-0.5.1.md), dan
[revisi pemilik R2](reference-dna-owner-revision-r2.md).
Pool ini membatasi pilihan subjek/kandidat; run ini bukan tes pencarian topik
tanpa bahan maupun riset baru. Tidak mengklaim audit ulang kebenaran sumber.
URL valid dan source snapshot tersimpan bukan bukti server membuka halaman.

Setelah item pertama, input mengeluarkan kandidat redistribusi air akar karena
pemetaan sumbernya belum cukup pasti. Ini penyempitan bahan yang meragukan,
bukan instruksi fact count, penambahan pengisi atau perubahan config. Host
tetap wajib meninjau eligibility melalui dedup live; kemunculan dalam preview
lama tidak disamakan dengan allocation workspace.

Template lanjutan pada plan sama:

```text
Lanjut T64. Baca get_content_plan QA-ID-6efb71a0e89b dahulu, kemudian selesaikan tepat satu item pending berikutnya sampai save, get_post sources/checks, dan progres plan. Pertahankan scope/pool/config yang sama, jangan membuka URL, jangan mengubah item completed atau membuat plan baru. Tampilkan copy tersimpan dan ID/progres ringkas.
```

## Baseline dan kontrol

Sebelum run: **0 plan dan 5 post QA** (lima hasil task 6.3).
`fact_count` Page tetap adaptive min 5 / preferred 7 / max 9,
`workspace_unique`, `en-US`, `plain_lines`.
Config `QA-ID-70dc81dc5199`, timestamp teks
`2026-10-21T16:08:12.627461Z`; tidak dikonversi menjadi Date.
Batas Canva 600 karakter, blok fakta 500, satu fakta 90.

Plan yang benar-benar tersimpan:
`QA-ID-6efb71a0e89b`.
Readback awal menunjukkan requested_count 5, posisi 1–5 dan seluruh item
`item_config={"profile_key":"fast_trivia"}`. Tidak ada key `fact_count`
atau override `fixed:5`; jumlah fakta tetap mengikuti config adaptive.
Tidak memaksakan representasi kelima format atau semua bobot topik pada
batch kecil; cakupan lima format sudah diuji terpisah pada task 6.3.

Coordinator hanya melakukan Read. Semua business Write dijalankan oleh host
ChatGPT memakai plugin terpilih. Sesudah setiap item, coordinator membaca
`get_content_plan` lalu `get_post(include_sources=true, include_checks=true)`
untuk membuktikan state, ID/binding/copy/revision/hash/checks. Hasil HTTP,
ringkasan model dan checkbox bukan pengganti readback.

## Hasil task 6.4

**PASS LIVE pada scope batch/count/config/progress/readback.**
Satu plan completed, requested 5 / proven 5 / remaining 0;
pending/in_progress/failed/cancelled semuanya 0. Terdapat **33 fact bindings**,
dengan jumlah fakta **7, 7, 7, 6, 6**. Seluruh item tetap tanpa override count.
Enam fakta pada trees/Australia sah dalam adaptive 5–9; preferensi fast 7–8
tidak diperlakukan sebagai minimum yang memicu filler.

Inventaris akhir: **1 plan dan 10 post QA**, tepat lima tambahan terhadap
baseline lima post task 6.3. ID/status/revision/updated_at lima post QA lama
tetap sama. Config dan timestamp Page/config sebelum/sesudah identik.
Tidak ada replacement plan/post, approval, penjadwalan atau publikasi.

| Posisi | Subjek | Format | Fakta | Post ID | Revision / quality |
| --- | --- | --- | ---: | --- | --- |
| 1 | Moons | `comparison` | 7 | `QA-ID-6343ba3a3224` | 1 / passed |
| 2 | Canadian places | `single_subject_fast` | 7 | `QA-ID-5ac933583f9f` | 1 / passed |
| 3 | Zipper | `single_subject_fast` | 7 | `QA-ID-6821aa81b974` | 1 / passed |
| 4 | Trees | `single_subject_fast` | 6 | `QA-ID-1b061bd35c5e` | 1 / passed |
| 5 | Australia | `comparison` | 6 | `QA-ID-069385c57142` | 1 / passed |

Semua get_post memuat source snapshots, lima system checks passed dan tiga
editorial checks pass, tanpa current fact warnings. Check revision/hash cocok
dengan post. Assembled hook–facts–CTA sama dengan canva_copy; body dan binding
fakta berurutan cocok. Host copy item 2–5 yang terlihat juga persis sama dengan
readback coordinator. Jawaban final item 1 gagal dimuat sehingga display host
item itu **NOT RUN**; state draft/copy tetap terbukti melalui get_post.

| Posisi | Content hash revision 1 |
| --- | --- |
| 1 | `4dc750e3c7a54bb6dc20c98bbbfa91ab8e43267202a6e86f333b9262d25040b9` |
| 2 | `9a99e2e8e82c351df676c8a06e07588323ce28b17a05081a3bbe4c4462f6e2a7` |
| 3 | `cbc857c28caf74384b799fb5c2f4dc303bee6b6cf4ade69954a6807a3d2f1405` |
| 4 | `a60a0b9c423dbc18f8b8f3fd2aae3c7d0f913ce79416157f4754e401b305febc` |
| 5 | `19b008bed4212b559a5ce6e8724a1beea0f40a03e9e42e81a7b6f827488e9e4e` |

### Progres yang dibuktikan Read

| Snapshot | Pending | In progress | Completed | Failed | Cancelled |
| --- | ---: | ---: | ---: | ---: | ---: |
| initial_claim | 4 | 1 | 0 | 0 | 0 |
| after_item_1 | 4 | 0 | 1 | 0 | 0 |
| after_item_2 | 3 | 0 | 2 | 0 | 0 |
| after_item_3 | 2 | 0 | 3 | 0 | 0 |
| after_item_4 | 1 | 0 | 4 | 0 | 0 |
| after_item_5 | 0 | 0 | 5 | 0 | 0 |

Lanjutan dimulai dengan Read plan yang sama, termasuk sesudah jeda antar-turn.
Item completed tidak dibuat ulang. Setiap snapshot akhir item menunjukkan
tidak ada item aktif tertinggal sebelum turn berikut. attempt_count=1 adalah
counter attempt/claim item, bukan bukti hanya satu panggilan save.

## Percobaan gagal dan batas penerimaan

- Item 2: host melaporkan save awal ditolak karena facts block >500 karakter
  serta rollback. Raw error code/payload lengkap tidak tertangkap, sehingga
  tidak direka. Host memadatkan wording pada item yang sama; hasil akhirnya
  tujuh fakta, facts block 481/500 dan Canva 532/600. Inventaris akhir
  membuktikan tidak ada post tambahan dari percobaan ditolak. Ini **bukan
  first-pass PASS**, dan percobaan awal tetap dicatat.
- UI kadang gagal memuat respons. Reload response memulihkan tampilan respons
  existing, bukan regenerasi/replay Write. Jawaban final item 1 tetap tidak
  terbaca; keberhasilan save memakai bukti get_post independen.
- Tool sequence/context/dedup yang dijelaskan host adalah laporan host,
  **bukan raw invocation trace lengkap**. Tidak menebak commit backend live
  dari metadata/katalog. Tidak ada backend deployment.
- Prompt QA mengatur scope plan/turn dan memakai pool terbatas, tanpa
  instruksi fact count. Hasil ini bukan bukti semua batch bebas tema/model
  akan konsisten atau klaim seluruh 31 tool LIVE.

### Catatan editorial untuk task 6.5

**D6 belum dinilai; belum FIXED.** Kelulusan count/progres tidak menutup
catatan di bawah atau mengganti penilaian setiap naskah tersimpan:

| Item | Bukti yang perlu dinilai |
| --- | --- |
| 1 | Canonical Io menyebut solar system, copy menjadi “any other world”; rasio Charon/Moon kehilangan about. Tinjau scope/approximation; meaning_preserved pass bukan pengganti review. |
| 2 | Toronto PATH dan Montreal underground memberi pengalaman membaca berdekatan; tujuh fakta legal tidak membuktikan komposisi optimal. |
| 3 | Bootlaces, asal nama dan kematian sebelum nama masih berkelompok. Bandingkan dengan zipper lima fakta yang diterima pemilik tanpa memaksakan jumlah baru. |
| 5 | Format comparison tersimpan, tetapi isi dominan kumpulan satu negara tanpa kontras pasangan/baseline jelas; CTA contrast tidak menciptakan perbandingan. Opening City white ibises belum menyebut Australia setelah generic hook. |

Tidak merevisi item completed, mengganti post atau memberi skor D6 pada task
ini. Temuan diteruskan ke [draf remediasi](reference-dna-remediation-issue.md);
Issue/PR/Actions untuk patch tetap mengikuti izin/workflow, tidak diklaim sudah
dikirim. **Jangan menyebut seluruh hasil batch siap produksi hanya dari PASS
task 6.4**; task 6.5 masih terbuka.

## Naskah readback utuh

### Posisi 1 — Moons

```text
Did you know?

Phobos races around Mars roughly three times every day.

Ganymede is wider than Mercury, despite being a moon.

Triton circles Neptune backward relative to the planet's spin.

Titan's atmosphere is thicker than Earth's; our Moon barely has one.

Io has more volcanic activity than any other world.

Enceladus shines brightly; parts of Iapetus are dark as asphalt.

Charon is half Pluto's width; our Moon is a quarter of Earth's.

Which moon surprised you the most?
```

### Posisi 2 — Canadian places

```text
Did you know?

Butchart Gardens' five-acre Sunken Garden fills an old limestone quarry.

When conditions allow, Ottawa's Rideau Canal becomes a 7.8-km skating rink.

Calgary's Plus 15 carries walkers above streets on enclosed skywalks.

Toronto's PATH runs over 30 km, mostly beneath downtown.

Historic Quebec City retains North America's only complete colonial city walls.

Montreal's underground pedestrian network runs about 32 km.

Stanley Park spans about 400 hectares on Vancouver's coast.

Follow for more unexpected places.
```

### Posisi 3 — Zipper

```text
Did you know?

An Apollo spacesuit used a special zipper to seal in air.

Some 1930s dresses showed off zippers as decorative details.

Judson's early fastener was meant to replace long bootlaces.

Early fasteners could jam or spring open without warning.

The word zipper echoed the sound of fastening rubber boots.

Inventor Whitcomb Judson died before his fastener got that name.

A Van Cleef & Arpels Zip necklace transforms into a bracelet.

Follow for more unexpected invention stories.
```

### Posisi 4 — Trees

```text
Did you know?

Some mangroves push excess salt out through tiny leaf glands.

Neighboring trees of the same species can join their roots naturally.

Some pond pine cones release their seeds after a fire.

Silver birch branches can droop overnight as their water balance shifts.

Trees can wall off damaged wood to slow spreading decay.

Some oaks release airborne chemicals that ready nearby trees' defenses.

Share these surprising tree facts.
```

### Posisi 5 — Australia

```text
Did you know?

City white ibises scavenge, earning the nickname bin chickens.

Some Australian magpies swoop at people during nesting season.

Some Australian parks offer free gas or electric barbecues.

The rotary Hills Hoist became an Australian backyard icon.

Election-day sausage stalls are nicknamed democracy sausages.

Australian polymer banknotes have transparent security windows.

Which Australian contrast surprised you most?
```

## Artefak dan verifikasi

[Fixture bukti yang disanitasi](../live-test/fixtures/reference-dna-batch-2026-11-06.json)
memuat preflight, plan initial/final, progres per item, lima get_post dengan
sources/checks, copy yang terlihat dan hasil perbandingan. Tidak menyimpan
profile owner, operation key, claim token atau credential.

Scope repository hanya laporan/fixture/checklist; source paket dan backend
tidak berubah. Estimasi sebelum check lokal **kurang dari satu menit**,
berdasarkan JSON/equality/link/whitespace dan validasi OpenSpec task 6.3
yang selesai sekitar 0,3 detik. Reuse checks source/package 0.5.6 karena
payload source identik; tidak menjalankan backend gate, reset atau Actions.
Tidak commit/push/PR/merge/deploy atau cleanup pada task ini.

Pemeriksaan akhir **PASS** (sekitar 0,3 detik): fixture 1 plan/5 draft/33
bindings, count/override/progres, exact render dan binding, revision/hash/checks,
inventaris serta metadata QA lama, tautan lokal/whitespace,
`git diff --check` dan validasi OpenSpec strict. Progress **27/28**;
task 6.5 tetap terbuka. Source paket/backend tidak masuk diff.


Update sesudah pengujian ini: [review D6 task 6.5](reference-dna-d6-saved-review-2026-11-06.md)
mencatat 6 PASS/4 FAIL pada sepuluh naskah tersimpan. Status NOT RUN pada uraian
pengujian awal di atas tetap historis; penerimaan keseluruhan kini FAIL,
belum FIXED, dan task 6.5 masih terbuka.
