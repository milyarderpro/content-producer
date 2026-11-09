# Saved-copy lima format — task 6.3

> Snapshot publik disanitasi: identifier QA/release dan tautan ChatGPT privat memakai alias. Isi naskah, skor, revision, content hash dan verdict dipertahankan. Hash fixture yang tercantum adalah hash bukti asli lokal; hash snapshot publik ada pada [indeks redaksi](reference-dna-public-evidence.md).

Tanggal: 6 November 2026. Scope: lima draft QA terpisah, masing-masing satu
skenario dalam chat baru, melalui PRIVATE Content Producer 0.5.6 / owner OAuth
`mcpku2`. [Task 6.2](reference-dna-installed-host-verification.md) membuktikan
release/ref/runtime/owner Read; pengujian ini membuktikan state draft tersimpan.

## Scope izin dan identitas

Pemilik telah memberi izin pekerjaan QA dan meminta task berikutnya. Payload
konkret setiap draft diselesaikan serta direview sebelum instruksi save dikirim.
Write dibatasi pada lima draft baru di **Content Producer QA Sandbox (Verified)**,
`page_public_id=QA-ID-7b6e770529b4`.
Baseline `list_posts` Page tersebut kosong. Page/config tidak diubah;
`workspace_unique`, `en-US`, adaptive min 5 / preferred 7 / max 9 tetap berlaku.
Tidak mengedit 18 draft audit Corious Facts, approve/ready, schedule, publish,
cleanup atau membuat plan. Lima operasi singular ini bukan bukti batch task 6.4.

- Source paket: `82f698b0c7f873fc5906919ae64f34242cb49e61`.
- Plugin release: `QA-RELEASE-cb7b33da5f8d`, versi `0.5.6`.
- Fingerprint 15 file: `4d5ff6463ae803c9fd01b3d13b038fcd686db336430f087b2bdc25665962e169`.
- Config: `QA-ID-70dc81dc5199`;
  timestamp teks `2026-10-21T16:08:12.627461Z` (enam digit dipertahankan).
- Host ChatGPT, thinking effort Medium; nama/versi model tepat tidak tersedia.
- Keberhasilan ini tidak mengidentifikasi commit backend live maupun mengubah
  bukti deployment/G4.

## Riset dan cara eksekusi

Atas instruksi pemilik, **tidak membuka atau memverifikasi ulang URL sumber**.
Menggunakan pool riset QA sebelumnya dari [kandidat](reference-dna-preview-candidate-0.5.0.md)
[C2](reference-dna-preview-candidate-0.5.1.md),
[C3](reference-dna-preview-candidate-0.5.2.md),
[C6](reference-dna-preview-candidate-0.5.6.md),
dan [revisi editorial](reference-dna-owner-revision-r1.md). URL per fakta dicatat
dalam payload dan diperiksa kembali sebagai binding, bukan diverifikasi ulang
isi halamannya. `trivia.sources.url_valid` membuktikan validitas URL menurut
kontrak server, bukan kebenaran seluruh isi sumber. Tidak mengklaim riset baru.

Prompt persiapan: resolve owner/workspace, baca generation context Page tepat,
baca DNA/dua contoh/playbook, dedup v2 sebelum copy, keluarkan SAME ineligible,
buat preview satu format dengan opening/payoff/ending berbeda, natural en-US,
literal `Did you know?`, plain lines dan satu CTA; belum Write. Input setiap
kasus memakai pool lama dan format/topik/goal yang tercatat pada fixture.

Setelah review, prompt save menyebut tepat satu draft dan payload lengkap:
copy/fakta/urutan/caption/hashtag/URL harus persis; refresh dedup final, tinjau
semua match; baca context terbaru tepat sebelum Write; `save_post_v2` schema 2,
`text_metrics={}`, `plan_item=null`, `scheduled_at=null`; satu operation key
untuk satu operasi logis; rekonsiliasi bila respons hilang. Lalu `get_post`
dengan sources/checks. Tidak menyimpan operation key atau credential di bukti.

Urutan save serial E08 → E01 → E03 → E04 → E02. Sebelum mengirim save berikut,
coordinator memanggil `get_post` secara independen dengan
`include_sources=true`, `include_checks=true` dan membandingkan copy, body,
source order, caption, hashtag, Page, format, revision/hash dan checks. Readback
langsung merupakan bukti state; ringkasan dedup/context/invocation host adalah
bukti respons host, bukan raw tool trace lengkap.

## Review dan percobaan awal yang dipertahankan

- E01: pool awal berisi fakta lama workspace; diganti dari pool riset lain yang
  tersedia. Preview delapan fakta dikurangi satu baris cakar/grip karena sudut
  cakar muncul lagi pada penutup. Opening memperjelas nama “panda”, bahasa
  whistle disingkat; hasil tujuh fakta.
- E08: enam fakta dipertahankan. Baris raspberry menghapus hubungan sebab yang
  membingungkan antara ventilasi dan tertindih. “Ethylene” menjadi “ripening
  gas” dengan akibat yellowing dan qualifier “can”, sesuai pool lama.
- E02 awal **BLOCKED preview**, belum Write: host mengeluarkan delapan calon
  karena pernah tampil dalam revisi editorial yang belum tersimpan. Prompt
  awal “sudah dipakai” ambigu; setelah dibedakan dari allocation workspace,
  host menilai ulang match semantik. Ini repair terarah dalam chat yang sama,
  bukan first-pass PASS. Klaim lookout/sentinel yang diketahui SAME tetap
  dikeluarkan meskipun salah satu retrieval frasa lain tidak menemukannya.
  Tujuh fakta preview koreksi dikurangi cooperative digging agar tidak
  mengulang burrow, opening menjadi “Adult meerkats…”, penutup snuggling.
  Match generik care/group name berbeda dari pengajaran scorpion/chamber
  toilet/snuggling; tidak memaksa identitas SAME menjadi DISTINCT.
- E03: tujuh perbandingan dipertahankan; qualifier “savanna”, “generally”,
  “usually”, “often”, “rarely” dan “visible” tetap ada.
- E04: preview tujuh fakta dikurangi baris diet/ekosistem berulang. Opening
  menyebut flying fox bats agar identitas jelas; enam fakta, tanpa label
  Myth/Fact berulang.
- UI kadang menampilkan “This response couldn’t load”. Reload response hanya
  memulihkan tampilan respons yang ada, bukan regenerasi atau replay Write.
  Tidak membuat operasi pengganti.

Perubahan naskah ini adalah hasil review QA sebelum save, **bukan patch baru
instruksi plugin**. Tidak menyatakan host sudah konsisten menghasilkan copy
layak tanpa arahan. Temuan prompt ambiguity dan retrieval recall di atas
dipertahankan; bukan diagnosis kegagalan backend/save maupun klaim FIXED.

## Hasil LIVE saved-copy

**PASS task 6.3: 5/5 format, 32 fact bindings.** Semua berstatus `draft`,
revision 1, `quality_status=passed`; lima system checks dan tiga editorial
checks lulus pada revision/hash yang sama. Approval, plan item dan jadwal
`null`, tidak ada current fact warnings. `list_posts` terakhir membuktikan
tepat lima post QA, tanpa halaman lanjutan; baseline Page ini nol.

| Kasus | Format | Fakta | Canva / blok fakta (karakter) | Post ID | Readback |
| --- | --- | ---: | --- | --- | --- |
| E01 (PRIVATE-REFERENCE-0eccd08038bd) | `single_subject_fast` | 7 | 467/600 · 418/500 | `QA-ID-834222c2456a` | PASS exact |
| E08 (PRIVATE-REFERENCE-479968246778) | `themed_utility` | 6 | 460/600 · 406/500 | `QA-ID-1112e26848ac` | PASS exact |
| E02 (PRIVATE-REFERENCE-5dee84859d1e) | `emotional_animal_collection` | 6 | 430/600 · 370/500 | `QA-ID-2f4994901bb3` | PASS exact |
| E03 (PRIVATE-REFERENCE-eafa608b55c3) | `comparison` | 7 | 540/600 · 487/500 | `QA-ID-2efa1c2e80c0` | PASS exact |
| E04 (PRIVATE-REFERENCE-ce9889ad2a2a) | `myth_vs_fact` | 6 | 376/600 · 321/500 | `QA-ID-9b0689b5acf3` | PASS exact |

Host melaporkan catalog version 18, 19, 20 dan 21 untuk E08, E01, E03
dan E04. Versi katalog final E02 tidak tertangkap dalam salinan respons;
tidak ditebak dari urutan save. Preview koreksi E02 melaporkan tujuh calon
`complete=true`; enam dipilih sebelum save. Seluruh save lulus
`trivia.reuse.allowed`. Match berbeda ditinjau DISTINCT; SAME ineligible
dikeluarkan.
Context terbaru/timestamp dan langkah dedup/save/get_post dilaporkan host;
coordinator mengonfirmasi hasil state secara independen, tanpa business Write
langsung dari coordinator. `complete=true` bukan jaminan exhaustive recall.

| Kasus | Content hash revision 1 |
| --- | --- |
| E01 | `8cc192c32553fb318eac17ad08a3a332a099836741d912228451cef6ef846963` |
| E08 | `19910c446e9bbcf4927f69ce10100cab40da7cac6402994aa68cd68fee3a601e` |
| E02 | `4ae1eea255aeba9b0c06ee246408093403e05226a345305ff3a8599e4f28373d` |
| E03 | `33ef3b282bf02fbc1fc64d954aecef0925733cee29ab3a954b9065f11e6934ad` |
| E04 | `707ed63a9aa5b06fd0c4ffa06682a8a405112f0300901d8658c9c95cb65c7c79` |

[Bukti JSON yang disanitasi](../live-test/fixtures/reference-dna-saved-copy-2026-11-06.json)
memuat expected copy/claims/sumber berurutan, readback sources/checks lengkap,
perbandingan exact, dan inventaris Page akhir. Tidak berisi owner profile,
operation key, claim/reservation token atau credential. Canonical claim,
rendered fact, URL, posisi, caption, hashtag dan seluruh copy cocok; validasi
revision/hash checks juga cocok.

## Naskah yang tersimpan

### E01 — single_subject_fast

```text
Did you know?

Red pandas got the name "panda" before giant pandas did.

Thick fur even covers the bottoms of red pandas' feet.

Reddish coats help them blend into moss-covered branches.

Young red pandas can whistle when they're distressed.

Red pandas use their tongues to inspect scent marks.

Red pandas have their own animal family, separate from bears.

When threatened, red pandas may stand upright and swipe with sharp claws.

Share this with a red panda fan.
```

### E08 — themed_utility

```text
Did you know?

Keep berries unwashed in the fridge; rinse them only before eating.

Leave strawberry tops attached until you're ready to prepare them.

Keep loose spinach in an open bag in your refrigerator's crisper.

Keep raspberries in shallow containers to prevent crushing.

Keep greens away from apples; their ripening gas can cause yellowing.

Prewashed, ready-to-eat salad needs refrigeration, but no extra rinse.

Save this for your next grocery trip.
```

### E02 — emotional_animal_collection

```text
Did you know?

Adult meerkats teach pups using scorpions with the stingers removed.

Meerkats can shut their ears to keep sand out while digging.

Their burrows have separate rooms for sleeping and using the toilet.

Together, meerkats can overwhelm even venomous snakes.

Meerkats press their bellies against cooler rocks to cool off.

At night, meerkats curl up and snuggle together.

Share this with someone who loves meerkats.
```

### E03 — comparison

```text
Did you know?

African elephants have two trunk "fingers"; Asian elephants have one.

African elephants have larger ears than Asian elephants.

Asian elephants have twin head domes; African elephants have rounder heads.

African savanna elephants generally outweigh Asian elephants.

Africa has two living elephant species; Asia has just one.

African savanna elephants' backs dip; Asian elephants' backs usually arch.

Female African elephants often have tusks; Asian females rarely have visible ones.

Which difference surprised you most?
```

### E04 — myth_vs_fact

```text
Did you know?

Flying fox bats use sight and smell, not echolocation.

Some bats roost in trees, not just caves.

Bats groom themselves regularly; they're not naturally filthy.

Some bats migrate for winter instead of hibernating.

Bats don't gnaw through wood or wires like mice.

Some bats eat fruit or drink nectar, not just insects.

Which bat myth surprised you the most?
```

## Batas verdict dan pemeriksaan

PASS di sini mencakup lima format **setelah guided pre-save review**, dedup,
save dan exact readback. Tidak mengubah kegagalan/repair preview lama menjadi
first-pass PASS. Skor D6 atas copy tersimpan belum diberikan pada task ini.
Batch task 6.4 dan penilaian/formal verdict task 6.5 **NOT RUN**; belum mengklaim
FIXED, konsistensi generasi mandiri, atau kenaikan views. Lima draft QA tetap
tersimpan; cleanup memerlukan scope terpisah.

Perubahan repository hanya laporan, fixture bukti dan checklist. Tidak mengubah
source paket, config produk atau backend; tidak commit/push/PR/merge/deploy.
Pemeriksaan lokal fokus: JSON/equality/IDs/check revision-hash, referensi lokal,
`git diff --check`, dan `openspec validate align-plugin-reference-content-dna
--strict`. Estimasi sebelum run kurang dari satu menit berdasarkan pemeriksaan
dokumen task 6.2 dan validasi OpenSpec sebelumnya; tidak memicu Actions. Checks
source/package 0.5.6 direuse karena seluruh payload source tetap sama.

Pemeriksaan akhir **PASS**: lima format/32 bindings dan inventaris 0→5,
copy/claims/URL/caption/hashtag exact, revision/hash/checks, tautan lokal,
whitespace, `git diff --check` dan validasi OpenSpec strict. Tidak ada
check source/backend atau Actions baru; task 6.3 dicentang, 6.4–6.5 tetap terbuka.


Update sesudah pengujian ini: [review D6 task 6.5](reference-dna-d6-saved-review-2026-11-06.md)
mencatat 6 PASS/4 FAIL pada sepuluh naskah tersimpan. Status NOT RUN pada uraian
pengujian awal di atas tetap historis; penerimaan keseluruhan kini FAIL,
belum FIXED, dan task 6.5 masih terbuka.
