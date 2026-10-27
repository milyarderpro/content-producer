# DNA-EAC-01 — baseline

- Bukti: jawaban lengkap chat penguji yang diteruskan pemilik pada 27 Oktober 2026. Prompt acuan ada di [`mini-test-v1.md`](../mini-test-v1.md#dna-eac-01--selesai-pass-penyimpanan-quality-gagal); kesamaan byte dengan prompt yang ditempel `UNVERIFIED`.
- Page: `Trivia Editorial Test (Internal)`, public ID `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Format diminta/dilaporkan: `emotional_animal_collection`; topik `animals`, perilaku flamingo merawat anak; bahasa `en-US`; CTA `share`.
- Runtime plugin/backend `UNVERIFIED`; nomor modul `1` bukan bukti versi runtime. `config_updated_at` tidak dilaporkan.
- Dedup: F1–F8 masing-masing dilaporkan menerima 20 kandidat; semua `review_required: false`, tidak ada kandidat identik yang dilaporkan, dan `dedup_reviews: []` diterima server. Satu reservasi berhasil; delapan fakta baru dialokasikan. Sumber dilaporkan sebagai dua Tier B dari kelompok penerbit berbeda per fakta (16 entri), semuanya `verified`/`stable`/`standard`. Source policy, freshness dan dedup server `passed`. Reviewer tidak membuka URL atau memverifikasi klaim secara independen.
- Satu `save_post` berhasil, lalu `get_post` cocok pada delapan fakta, urutan, CANVA COPY, caption, hashtags, revision, dan content hash. Post public ID `0b403985-c6ec-400c-866b-d2dfdfe101ac`, `status: draft`, `revision: 1`, `scheduled: null`. Tidak ada retry, draft kedua, revisi, approval, atau publikasi.
- Server: `editorial overall: pass`; `system overall: failed` karena `trivia.readability.hard_limits` gagal pada **29 baris visual > batas 28**. `preferred profile band: needs_review` karena 88 kata > preferensi 85. Source policy, dedup, fact freshness, exact renderer, serta component/final budget dilaporkan pass. Metrik: 568 karakter CANVA, hook 41, CTA 49, estimated read 29,9 detik, replay ratio 2,3, tiga loops. `save_post` tidak ditolak, tetapi draft belum memenuhi quality gate dan tidak `ready`.

## Penilaian editorial reviewer atas copy pertama yang tersimpan

| DNA 0–2         | Skor | Dasar ringkas                                                                                                                                                           |
| --------------- | ---: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Familiarity     |    2 | Flamingo dan perilaku mengasuh anak mudah dipahami audiens umum.                                                                                                        |
| Surprise        |    2 | Panggilan dari dalam telur, crop milk kedua induk, pengenalan suara, dan induk memucat memberi beberapa fakta tak terduga.                                              |
| Specificity     |    2 | Klaim konkret tentang inkubasi, makan anak, kelompok crèche, dan pengenalan suara.                                                                                      |
| Coherence       |    2 | Delapan baris menyatu dalam satu tema perkembangan anak dalam koloni.                                                                                                   |
| Scanability     |    1 | Satu klaim utama per baris, tetapi copy 88 kata/29 baris melampaui hard limit server; tidak bisa dinilai siap untuk kartu visual.                                       |
| Utility/emotion |    1 | Relasi induk–anak terasa relevan, tetapi beberapa baris masih seperti daftar zoologi dan kalimat caption “not claims about human emotions” terdengar defensif/akademis. |

**Total 10/12 — `KUAT` untuk DNA copy pertama; `format_fit: FIT`.** Struktur delapan fakta, satu subjek, dan satu CTA share sesuai format. `en-US` dalam CANVA COPY umumnya natural; istilah “crèches” segera diberi arti. Hook “goes beyond the nest” membangun tema, tetapi tidak sekuat fakta paling mengejutkan. Klaim “A few other adults watch over…” tidak boleh diubah menjadi motif manusia tanpa bukti. Nilai DNA tinggi **tidak menghapus** hard readability failure. Tidak ada revisi baseline atau audit URL per fakta.

## CANVA COPY pertama — PERSISTED, revision 1

```text
Flamingo chick care goes beyond the nest.

In mud-nesting colonies, both partners build a nest mound.

Male and female flamingos take turns incubating their egg.

Flamingo chicks can call from inside their eggs.

Both parents can feed chicks special milk from their throats.

After leaving their nests, chicks gather in groups called crèches.

A few other adults watch over these groups of chicks.

Parents recognize their own chick by its distinctive call.

Some parents grow paler while making crop milk for chicks.

Share these remarkable flamingo family behaviors.
```

## FACEBOOK CAPTION dan HASHTAGS pertama

```text
From shared egg care to a chick's recognizable call, flamingo colonies offer a remarkable look at raising young. These are observed behaviors, not claims about human emotions.
```

`#Flamingos #AnimalBehavior #WildlifeFacts`

## Verdict

`execution_status: COMPLETED`; `workflow_verdict: PASS` karena `save_post` dan `get_post` terkonfirmasi cocok. **Kelayakan quality: gagal** pada hard readability; status tetap `draft`, bukan `ready`. Ini kegagalan kualitas output praapproval, bukan kegagalan penyimpanan/tool atau bukti bug renderer. Perlakukan satu baris kelebihan dan density preference sebagai temuan editorial/preflight; jangan revisi post dalam baseline. Bersama [`PILOT-SSF-01`](PILOT-SSF-01-baseline.md), ini adalah contoh kedua draft 29/28 baris dalam format berbeda; sintesis perlu mempertimbangkan guardrail margin visual sebelum save tanpa mengubah batas server.
