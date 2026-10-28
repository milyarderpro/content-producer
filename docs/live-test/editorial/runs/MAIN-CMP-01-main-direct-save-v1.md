# MAIN-CMP-01 — direct-save v1 baseline

## Identitas

- Case `MAIN-CMP-01`, attempt `baseline`, cohort `main-direct-save-v1-owner-reported`; mode `guided_explicit`.
- Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`, expected/selected `comparison`, profile `fast_trivia`, topic `animals`, language `en-US`, tujuh fakta, CTA comment.
- Waktu sesi, versi plugin/backend, Page config dan `config_updated_at`, recent variety: `UNVERIFIED`. Respons diteruskan pemilik pada 28 Oktober 2026.
- Workflow `COMPLETED / PASS`, `last_completed_stage: READBACK`, first copy `PERSISTED`, evidence `LIVE_OWNER_REPORTED`. Post `a556c0ce-b98f-4634-9b50-1939c91c0249`, `draft`, revision 1, quality `pending`.
- Prompt berikut disiapkan koordinator; exact text yang ditempel penguji tidak dibuktikan byte-for-byte.

## Prompt final koordinator

```text
Jalankan `MAIN-CMP-01` dengan hanya PRIVATE Content Producer pada Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Buat dan simpan tepat satu draft `comparison` tentang African versus Asian elephants; gunakan kontras paralel dengan spesies, metrik, dan kondisi selaras. Tulis naskah orisinal `en-US` yang natural, konkret, mengejutkan atau berguna tanpa clickbait, dan cepat dipindai.

Ikuti alur normal: riset/bukti → dedup lengkap (READ terarah bila hasil terpotong) → maksimal satu reservasi → maksimal satu `save_post` → `get_post`. Izin kedua Write itu sudah termasuk; jangan menunggu GO. Jika syarat gagal atau Write ditolak, berhenti tanpa retry; jika respons save hilang, rekonsiliasi READ, jangan buat draft kedua. Bila save pasti gagal setelah reservasi, boleh release reservasi kasus ini saja. Jangan revisi, approve, atau publikasikan. Balasan akhir: CANVA COPY pertama, caption, hashtags, format; jika tersimpan, post ID/status/revision, kecocokan `get_post`, system/editorial checks (terutama `trivia.surprise_substantive`), dan metrik server. Jika tidak, tahap dan error persis serta status reservasi. Ringkas sumber tanpa daftar URL.
```

## CANVA COPY pertama — PERSISTED

```text
African savanna vs. Asian elephants

Trunk-tip projections — African: two; Asian: one.

Per front foot — African: usually 4 toenails; Asian: usually 5.

Molar ridges — African: diamond pattern; Asian: parallel lines.

Visible tusks — African: usually both sexes; Asian: some males.

Head domes — African: one; Asian: two.

Ears — African: larger, fan-shaped; Asian: smaller, rectangular.

Back profile — African: dips down; Asian: rounded.

Which difference caught your eye?
```

## Facebook caption

```text
African savanna and Asian elephants have distinct features. Here's a quick side-by-side guide to their trunks, feet, teeth, tusks, heads, ears, and backs. Which contrast stood out to you?
```

## Hashtags

```text
#ElephantFacts #WildlifeComparison #AnimalAnatomy
```

## Bukti alur dan source

- Riset dilaporkan pada tujuh perbandingan anatomi stabil memakai sumber Tier B: International Elephant Foundation, Smithsonian's National Zoo, Zoo Atlanta, San Diego Zoo Wildlife Alliance, IFAW. Reviewer tidak mengaudit URL ataupun klaim satu per satu.
- Dedup: 140 keputusan lengkap dan diterima menurut tester. Kandidat mentah dan `material_differences` tidak tersedia bagi reviewer.
- Satu reservasi untuk tujuh fakta berhasil; satu `save_post` berhasil; `get_post` dilaporkan MATCH untuk Canva copy, caption, hashtags, format, revision, hash, dan 7/7 fact bindings `allocated`. Hash literal tidak tercantum.
- Tidak ada retry, draft kedua, revisi, approval atau publikasi. `save_post_outcome: CONFIRMED_OWNER_REPORTED`; `readback_outcome: MATCH_OWNER_REPORTED`. Tidak ada Write `UNCONFIRMED` ataupun alokasi tersisa.
- `quality_status: pending`, bukan `ready`. Bukti adalah hasil penguji yang diteruskan pemilik, tidak didukung readback langsung oleh koordinator.

## Checks dan metrik server yang dilaporkan

- System: 18 passed, satu warning nonblocking `trivia.profile.preferred_band: needs_review` sebab Canva 63 kata di bawah preferensi 65–85; beberapa baris pendek. Tidak ada hard failure.
- Editorial: 18 pass, semua kriteria kritis dan `trivia.surprise_substantive: pass`. Source/safety/caption/copying checks pass menurut tester, namun pemeriksaan sumber independen `UNVERIFIED`.
- Metrik: 474 Canva characters, 402 facts characters, 63 kata, 26 estimated visual lines, 22.1 detik estimated read, replay ratio 1.7, estimated loops 2. Ini bukan metrik views aktual.
- Qualifier jumlah kuku dan gading (`usually`, `some`) dipertahankan pada copy. Perbandingan menyebut African savanna vs Asian; jangan mengekstrapolasi variasi individu ke klaim universal.

## DNA reviewer pada copy pertama

- Familiarity 2/2: dua subjek dikenal.
- Surprise 2/2: ujung belalai, kuku, geraham, gading dan kubah kepala memberi lima kontras kuat.
- Specificity 2/2: perbandingan anatomi dan qualifier jelas.
- Coherence 2/2: tujuh perbandingan paralel satu tema.
- Scanability 2/2: baris pendek berpola side-by-side.
- Utility/emotion 1/2: berguna untuk pengenalan visual, tetapi hook berupa judul dan daya emosional rendah.
- **Total 11/12 KUAT**, `format_fit: FIT`, `PERSISTED`. Penilaian hanya diagnostik, bukan verifikasi sumber atau persetujuan publikasi.

## Keputusan

Satu hasil `PASS` pada empat kasus awal (tiga PASS dan SSF BLOCKED), kemudian lanjut `MAIN-MVF-01` sesuai matriks. Record terkait #47 serta kalibrasi editorial #54. Semua nilai bersifat owner-reported, runtime `UNVERIFIED`; tidak ada credential, operation key, reservation token atau URL rinci.
