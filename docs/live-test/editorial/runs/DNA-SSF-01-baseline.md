# DNA-SSF-01 — baseline

- Bukti: jawaban lengkap chat penguji yang diteruskan pemilik pada 27 Oktober 2026. Prompt acuan ada di [`mini-test-v1.md`](../mini-test-v1.md#dna-ssf-01--aktif); kesamaan byte dengan prompt yang ditempel `UNVERIFIED`.
- Page: `Trivia Editorial Test (Internal)`, public ID `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Format diminta/dilaporkan: `single_subject_fast`; topik sea turtles; bahasa `en-US`.
- Runtime: versi plugin `UNVERIFIED`, backend `UNVERIFIED`; module version yang dilaporkan `1`; `config_updated_at` yang dilaporkan `2026-10-26T06:03:13.793118Z`. Identitas konfigurasi dan kesamaan runtime dengan retest sebelumnya belum terverifikasi.
- Alur yang dilaporkan: `get_account_profile` → `get_workspace_context` → `list_pages` → `get_page_generation_context` → riset → `trivia_find_similar_facts` → `get_page_generation_context` → satu `trivia_register_and_reserve_facts` ditolak. Kode `FACT_REVIEW_REQUIRED`; pesan `Semantic deduplication needs explicit review.` Respons tidak memuat `field_errors`.
- Tahap terakhir berhasil: dedup Read. Tahap gagal: reservasi. Tidak ada reservasi terkonfirmasi, `save_post`, `get_post`, post ID, revision, system/editorial checks tersimpan, atau metrik server. Naskah pertama berstatus `UNSAVED`; tidak ada retry, revisi, approval, atau publikasi.
- Ringkasan sumber hanya laporan penguji: tujuh paket terstruktur dari NOAA dan penelitian primer untuk navigasi magnetik. Reviewer tidak membuka URL dan tidak memverifikasi klaim secara independen. Tidak ada bukti bahwa penolakan disebabkan sumber; server menyebut tinjauan dedup.

## Penilaian editorial atas copy pertama

| DNA 0–2 | Skor | Dasar ringkas |
| --- | ---: | --- |
| Familiarity | 2 | Sea turtles mudah dikenali lintas audiens sasaran. |
| Surprise | 2 | Kontras cangkang leatherback, suhu sarang, navigasi magnetik, dan arribada memberi beberapa momen baru. |
| Specificity | 2 | Klaim yang hanya berlaku pada jenis tertentu diberi nama spesies; tiap baris mengandung satu proposisi utama. |
| Coherence | 2 | Ketujuh baris tetap dalam satu subjek, dengan variasi anatomi, makanan, navigasi, dan reproduksi. |
| Scanability | 2 | Baris pendek, pemisah jelas, bahasa umum; ini penilaian visual reviewer, **bukan** metrik renderer server. |
| Utility/emotion | 1 | Ada rasa ingin tahu, tetapi hook “worth knowing” dan CTA “ocean wildlife fan” generik; penutup belum menjadi fakta terkuat secara jelas. |

**Total 11/12 — `KUAT` pada copy `UNSAVED`; `format_fit: FIT`.** Tujuh fakta dan satu CTA sesuai arsitektur `single_subject_fast`. `en-US` natural dan tidak bergaya buku teks; “arribadas” dijelaskan sebagai peristiwa bersarang massal. Caption tidak tampak menambah klaim faktual baru. Urutan fakta dan hook masih bisa diperkuat, tetapi baseline tidak diubah. Dukungan sumber per klaim, dedup semantik, batas renderer, serta kelayakan `ready` tetap `UNVERIFIED`; skor DNA tidak membatalkan hold server.

## CANVA COPY pertama — UNSAVED

```text
7 sea turtle facts worth knowing.

Sea turtles can't tuck their heads or flippers into shells.

Leatherbacks have leathery skin, not a hard outer shell.

Adult green turtles mostly eat seagrasses and algae.

Hawksbills use sharp beaks to reach food in reef crevices.

Warmer nest sand generally produces more female sea turtles.

Loggerhead hatchlings use Earth's magnetic field to navigate.

Some olive ridleys nest together in mass events called arribadas.

Share these with an ocean wildlife fan.
```

## FACEBOOK CAPTION dan HASHTAGS pertama

```text
Seven quick sea turtle facts, from shell anatomy to navigation and nesting. Pass them along to an ocean wildlife fan.
```

`#SeaTurtles #OceanWildlife #AnimalFacts`

## Verdict dan triase berikutnya

`execution_status: BLOCKED`; `workflow_verdict: BLOCKED / POLICY_HOLD`. Ini **bukan** kegagalan `save_post` dan belum membuktikan bug server maupun kesalahan tertentu pada prompt. Aturan plugin memang mensyaratkan keputusan `same`/`distinct`/`uncertain` yang eksplisit untuk kandidat semantik. Laporan belum menyertakan ringkasan kandidat/keputusan dedup dan bagian `dedup_reviews` dari request reservasi, sehingga penyebab spesifik belum bisa diatribusikan. Jangan melakukan retry Write atau mengganti fakta berdasarkan dugaan. Minta satu ringkasan READ-only tersanitasi dari chat yang sama; tunda `DNA-TUT-01` sampai hasilnya ditinjau.
