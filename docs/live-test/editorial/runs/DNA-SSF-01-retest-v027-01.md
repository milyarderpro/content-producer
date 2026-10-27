# DNA-SSF-01 — retest-v027-01

**Bukti:** laporan pemilik dari chat penguji, 27 Oktober 2026. Plugin pribadi dirilis sebagai v0.2.7 dan backend `mcp` v35 dideploy sebelum uji; identitas release/runtime yang dipaparkan di respons kasus tetap `UNVERIFIED`. Ini retest di luar denominator 30 kasus utama, bukan pengganti baseline.

**Hasil:** `BLOCKED` pada satu `trivia_register_and_reserve_facts` dengan `FACT_REVIEW_REQUIRED` dan `facts[0].dedup_reviews`. Tidak ada reservasi berhasil, `save_post`, `get_post`, post ID, server checks, atau metrik server. Copy pertama tetap `UNSAVED`; tidak ada retry, revisi, approval, atau publikasi.

## Copy pertama — UNSAVED

```text
Sea turtles are full of surprises.

Sea turtles cannot tuck their heads and flippers inside their shells.

They breathe air with lungs, even while living at sea.

Warmer nest sand generally produces more female hatchlings.

Leatherbacks have flexible, leathery shells instead of hard ones.

Adult green turtles eat mostly seagrass and algae.

Hawksbills use narrow beaks to reach sponges in reefs.

Some ridley turtles nest in mass gatherings called arribadas.

Sea turtles release excess salt through glands near their eyes.

Which fact surprised you most?
```

Caption: “From their unusual shells to the way their hatchlings develop, sea turtles have some remarkable adaptations. Which of these facts was new to you?” Hashtags: `#SeaTurtles #OceanFacts #MarineLife`.

## Alur dan triase

Pemeriksaan account/workspace/Page/context dan riset awal berhasil. `trivia_find_similar_facts` untuk delapan kandidat semula tampil terpotong; chat berhenti sebelum Write. Setelah arahan lanjutan dalam **chat yang sama**, delapan READ terarah dengan `max_matches_per_candidate: 20` dilaporkan lengkap. F1 menunjukkan `review_required: true` dengan 20 kandidat; F2–F8 `false`. Penguji melaporkan 20 keputusan `distinct` untuk F1, lalu satu reservasi ditolak:

```text
FACT_REVIEW_REQUIRED: Semantic deduplication needs explicit review.
facts[0].dedup_reviews: A required semantic review decision is missing or inconsistent.
```

Audit READ-only lanjutan terhadap payload asli F1 memastikan 20/20 `candidate_fact_public_id` valid, unik, dan cocok dengan READ terarah; tidak ada kandidat yang terlewat. Semua keputusan `distinct` mengirim `material_differences: ["other", "relation"]`. Sebanyak 16 keputusan konsisten, tetapi empat (indeks 9, 11, 15, 16) keliru menyebut `relation`: kandidat dan F1 sama-sama mempunyai `relation_key: "has_named_part_or_property"`. Keempatnya berbeda `subject_key`, sehingga `other` valid. Ini empat ketidakkonsistenan konkret yang sesuai dengan validasi SQL dan error `FACT_REVIEW_REQUIRED`; audit ini tidak membuktikan bahwa tidak ada penyebab lain. Tidak ada retry atau Write baru. Diagnostik posisi dari CR-051 terbukti tampak pada respons live; penghapusan batas total 28 baris **tidak** teruji oleh kasus ini karena tidak ada draft.

| Indeks | `candidate_fact_public_id`             | Kandidat                 |
| ------ | -------------------------------------- | ------------------------ |
| 9      | `88722a0d-ab26-4128-aa2a-83c9fabcf481` | Honey bee pollen baskets |
| 11     | `3656d186-f05f-41f5-8b43-0b6ddc816529` | Honey bee wax glands     |
| 15     | `5b5744d0-d6f9-4c27-b4d3-a1d5ba830ff6` | Saturn's rings           |
| 16     | `6aaf4eb2-5f6b-48e5-b399-9d83aa63303b` | Saturn composition       |

## Penilaian editorial sementara

Arsitektur satu subjek dan delapan baris fakta sesuai `single_subject_fast`; bahasa `en-US` natural dan kualifikasi spesies umumnya jelas. Namun hook generik, satu fakta bernilai kejutan rendah (“They breathe air with lungs”), dan urutan belum membuka dengan fakta paling kuat. Copy pertama layak sebagai baseline uji, tetapi belum dinilai siap terbit. Dukungan sumber per URL, dedup semantik final, renderer, dan kelayakan `ready` tetap tidak diverifikasi oleh reviewer.

Tindak lanjut: [Issue #63](https://github.com/milyarderpro/content-producer/issues/63) untuk preflight label pembeda per kandidat; [Issue #56](https://github.com/milyarderpro/content-producer/issues/56) untuk READ dedup lengkap; dan [Issue #58](https://github.com/milyarderpro/content-producer/issues/58) untuk diagnostik posisi/batas visual.
