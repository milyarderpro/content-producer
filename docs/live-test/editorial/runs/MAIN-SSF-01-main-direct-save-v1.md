# MAIN-SSF-01 — baseline

## Identitas dan hasil

- Case `MAIN-SSF-01`, attempt `baseline`, cohort `main-direct-save-v1-owner-reported`; mode `guided_explicit`.
- Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`, format `single_subject_fast`, topic `animals`, `en-US`, tujuh fakta.
- `execution_status: BLOCKED`, `workflow_verdict: BLOCKED`, `stop_category: POLICY_HOLD`, `failure_stage: RESERVATION`, `last_completed_stage: DEDUP`.
- `editorial_basis: UNSAVED`, `format_fit: FIT`, DNA `11/12 KUAT`; tidak ada draft, post ID, revision, quality checks atau readback.
- Evidence `LIVE_OWNER_REPORTED`, diteruskan 28 Oktober 2026. Waktu sesi, plugin/backend runtime, Page config dan `config_updated_at` tidak dapat diverifikasi.
- Prompt berikut disiapkan koordinator; teks yang sebenarnya ditempel tidak terbukti identik.

## Prompt koordinator

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

## Facebook caption

```text
From eyes and arms to shelter-making and hunting, these seven octopus facts show just how varied their adaptations can be.
```

## Hashtags

```text
#OctopusFacts #MarineBiology #OceanLife
```

## Jejak tool yang dilaporkan

- Riset memakai Natural History Museum, Smithsonian Ocean, Monterey Bay Aquarium, serta publikasi primer di Cell dan Nature Ecology & Evolution. Kesesuaian sumber per fakta belum diaudit independen.
- Dedup READ 7/7 lengkap menurut penguji; lima posisi wajib review; 100 keputusan dikirim (99 `distinct`, 1 `same`). Payload detail dan candidate IDs tidak diberikan.
- Satu `trivia_register_and_reserve_facts` ditolak: `INVALID_ARGUMENT` / `FACT_REVIEW_REQUIRED` di `facts[2].dedup_reviews`. Pesan: “A required semantic review decision is missing or inconsistent.” Penguji melaporkan tidak ada reservasi terbentuk.
- `save_post: NOT_CALLED`, `get_post: NOT_CALLED`. Tidak ada retry, second draft, revisi, approval atau publikasi.
- Penyebab tepat keputusan dedup yang hilang/tidak konsisten `UNVERIFIED`; bukan bukti bug RPC. Terkait #56 dan #63 hanya sebagai konteks.

## Critical checks dan editorial review

- Tidak ada system/editorial checks post, `text_metrics`, atau server verdict `trivia.surprise_substantive`; semuanya `UNVERIFIED` pada kasus tanpa save.
- Klaim sumber, meaning preserved, safety, caption no-new-claim, substantial copying dan time-context tidak diaudit per-URL oleh reviewer.
- Skor reviewer: familiarity 2, surprise 2, specificity 2, coherence 2, scanability 2, utility/emotion 1. Total `11/12 KUAT`, `FIT`, copy `UNSAVED`. Hook dan CTA generik; tujuh fakta variatif dan konkret.
- Kasus dihitung sebagai satu dari 30 tanpa retry; tak ada `UNCONFIRMED` Write. Catatan ini tidak mengklaim `ready` atau publikasi. Rahasia, operation key dan reservation token tidak disertakan.
