# MAIN-SSF-01 — direct-save v1 baseline

## Identitas dan verdict

- `case_id: MAIN-SSF-01`; `attempt_id: baseline`; `cohort_id: main-direct-save-v1-owner-reported`.
- `page_public_id: f3984ee4-8ae7-4043-8c93-45765f82f46e`; format `single_subject_fast`, topic `animals`, `en-US`, tujuh fakta, mode `guided_explicit`.
- Tanggal sesi, actual Page config, `config_updated_at`, `recent_variety`, dan versi runtime plugin/backend: `UNVERIFIED`. Laporan diteruskan pemilik pada 28 Oktober 2026, Asia/Jakarta.
- `execution_status: BLOCKED`, `workflow_verdict: BLOCKED`, `stop_category: POLICY_HOLD`. Tahap terakhir `DEDUP`, failure `RESERVATION`; alasan `FACT_REVIEW_REQUIRED`.
- `editorial_basis: UNSAVED`; `format_fit: FIT`; reviewer DNA `11/12 KUAT`. Tidak ada post ID, status, revision, quality checks pada post tersimpan, atau approval.
- `evidence_level: LIVE_OWNER_REPORTED`. Ini bukti jawaban penguji yang diteruskan pemilik, bukan inspeksi langsung tool. Identitas byte prompt yang ditempel pemilik tidak dibuktikan.

## Prompt final yang sebelumnya disiapkan koordinator

```text
Jalankan `MAIN-SSF-01` dengan hanya PRIVATE Content Producer pada Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Buat dan simpan tepat satu draft `single_subject_fast` tentang octopuses sebagai satu subjek; variasikan anatomi dan perilaku tanpa mengulang makna. Tulis naskah orisinal `en-US` yang natural, konkret, mengejutkan atau berguna tanpa clickbait, dan cepat dipindai.

Ikuti alur normal: riset/bukti → dedup lengkap (READ terarah bila hasil terpotong) → maksimal satu reservasi → maksimal satu `save_post` → `get_post`. Izin kedua Write itu sudah termasuk; jangan menunggu GO. Jika syarat gagal atau Write ditolak, berhenti tanpa retry; jika respons save hilang, rekonsiliasi READ, jangan buat draft kedua. Bila save pasti gagal setelah reservasi, boleh release reservasi kasus ini saja. Jangan revisi, approve, atau publikasikan. Balasan akhir: CANVA COPY pertama, caption, hashtags, format; jika tersimpan, post ID/status/revision, kecocokan `get_post`, system/editorial checks (terutama `trivia.surprise_substantive`), dan metrik server. Jika tidak, tahap dan error persis serta status reservasi. Ringkas sumber tanpa daftar URL.
```

## CANVA COPY pertama — UNSAVED

```text
Octopuses have a few unexpected tricks.

Veined octopuses carry coconut shells to build shelters later.

An octopus's pupil is rectangular, not round.

Octopus suckers can taste chemicals when they touch something.

Some octopuses raise skin bumps to mimic rocky surfaces.

An octopus's brain loops around its food tube.

Unlike squid, octopuses have no internal supporting shell.

Day octopuses sometimes punch fish during group hunts.

Follow for more unexpected animal science.
```

## Facebook caption pertama — UNSAVED

```text
From eyes and arms to shelter-making and hunting, these seven octopus facts show just how varied their adaptations can be.
```

## Hashtags pertama — UNSAVED

```text
#OctopusFacts #MarineBiology #OceanLife
```

## Jejak pelaksanaan penguji

- **Page/context:** target internal benar menurut prompt. Snapshot context/config dan waktu pengambilan `UNVERIFIED`.
- **Research:** penguji menyebut Natural History Museum, Smithsonian Ocean, Monterey Bay Aquarium dan riset primer di *Cell* serta *Nature Ecology & Evolution*. Dukungan per-klaim dan URL tidak diaudit reviewer; ringkasan sumber “Natural History Museum+4” bukan peta klaim.
- **Dedup:** tujuh READ lengkap dilaporkan, lima posisi memerlukan review; 100 keputusan dikirim (99 `distinct`, satu `same`). Kandidat ID, `material_differences`, dan relasi pada request sebenarnya tidak tersedia untuk reviewer.
- **Reservasi:** tepat satu `trivia_register_and_reserve_facts` ditolak `FACT_REVIEW_REQUIRED` pada `facts[2].dedup_reviews`, F3 tentang octopus suckers tasting chemicals. Tidak ada reservasi terkonfirmasi.
- **Save/readback:** `save_post: NOT_CALLED`, `get_post: NOT_CALLED`, sehingga `readback_outcome: NO_POST_ID`. Tidak ada retry, draft kedua, revisi, approval atau publikasi; release tidak relevan karena tidak ada reservasi.
- **Batas diagnosis:** 100 review terkirim tidak menjamin kelengkapan/konsistensi semantic decision per kandidat; sebab tepatnya `UNVERIFIED`. Jangan mengklaim bug RPC atau atribusi otomatis ke Issue #56/#63.

### Error verbatim dari respons penguji

```text
INVALID_ARGUMENT: Error code: INVALID_ARGUMENT; Error: RuntimeException: Error calling MCP tool: [TextContent(type='text', text='FACT_REVIEW_REQUIRED: Semantic deduplication needs explicit review. facts[2].dedup_reviews: A required semantic review decision is missing or inconsistent.', annotations=None, meta=None)]
```

## Critical checks, source evidence, dan metrik

- `trivia.meaning_preserved`: dukungan sumber `UNVERIFIED` oleh reviewer, tidak ada matching source packet.
- `trivia.source_supported`: penguji menyebut institusi/jurnal, tetapi dukungan per klaim dan pemeriksaan server post `UNVERIFIED`.
- `trivia.time_context_valid`: tidak terlihat klaim time-sensitive, check server `UNVERIFIED`.
- `trivia.safety_appropriate`: tidak terlihat saran high-risk, check server `UNVERIFIED`.
- `trivia.caption_no_new_claim`: caption tampak merangkum copy tanpa fakta baru; check server `UNVERIFIED`.
- `trivia.substantial_copying_absent`: tidak dilakukan audit per-sumber dan check server `UNVERIFIED`.
- `trivia.surprise_substantive`: kejutan dinilai substantif oleh penguji/reviewer dari copy pertama, **tidak ada hasil PASS server**.
- System checks, editorial checks, `text_metrics`, `quality_status` dan `save_post` belum tersedia karena tidak ada post.

## DNA reviewer — first visible copy

- **Familiarity 2/2:** octopuses mudah dikenali.
- **Surprise 2/2:** coconut shelters, taste through suckers, fish-punching terasa konkret dan mengejutkan.
- **Specificity 2/2:** beberapa spesies, ciri, dan perilaku disebut eksplisit.
- **Coherence 2/2:** tujuh fakta bervariasi tanpa pengulangan makna yang jelas.
- **Scanability 2/2:** satu ide utama per baris, struktur jelas dan bahasa natural.
- **Utility/emotion 1/2:** rasa ingin tahu kuat, manfaat/emotional beat langsung terbatas.
- **Total 11/12 KUAT, FIT, UNSAVED:** hook dan CTA generik; skor tidak membuktikan akurasi fakta atau layak terbit.

## Keputusan

Satu `BLOCKED / POLICY_HOLD` dihitung sebagai percobaan utama, tanpa mengubah draft atau mengulangi Write. SSF tidak disamakan dengan kegagalan save karena `save_post` tidak dipanggil. Terkait #47; konteks #56/#63 bukan bukti akar yang sama. Berikutnya `MAIN-TUT-01` dalam urutan beku. Catatan telah disanitasi: tanpa token, OAuth, operation key, claim credentials, atau URL fakta rinci.
