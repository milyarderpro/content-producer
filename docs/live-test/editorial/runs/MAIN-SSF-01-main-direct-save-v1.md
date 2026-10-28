# MAIN-SSF-01 — baseline / main-direct-save-v1

## Identitas kasus

- `case_id`: `MAIN-SSF-01`; `attempt_id`: `baseline`; `cohort_id`: `main-direct-save-v1-owner-reported`.
- Waktu sesi: **UNVERIFIED** (hasil diteruskan dalam kampanye 28 Oktober 2026, Asia/Jakarta; tidak ada timestamp eksekusi penguji).
- Prompt revision: `main-direct-save-v1`, mode `guided_explicit`.
- Page target: `f3984ee4-8ae7-4043-8c93-45765f82f46e` (`Trivia Editorial Test (Internal)`); `config_id`, `config_updated_at`, snapshot Page/config, dan `recent_variety`: **UNVERIFIED** dalam hasil sesi.
- Format expected / selected: `single_subject_fast` / `single_subject_fast`; topic `animals`; bahasa `en-US`; tujuh fakta. Pemilihan format eksplisit, bukan implisit.
- Versi runtime plugin, backend, dan release ID: **UNVERIFIED**; tidak disebut dalam laporan penguji. Tidak diinfer dari manifest GitHub.
- Bukti: seluruh jawaban penguji diteruskan pemilik ke chat koordinator; `evidence_level: LIVE_OWNER_REPORTED` (bukan inspeksi langsung semua panggilan tool).
- `execution_status: BLOCKED`; `workflow_verdict: BLOCKED`; `stop_category: POLICY_HOLD`; alasan `FACT_REVIEW_REQUIRED`.
- `last_completed_stage: DEDUP`; `failure_stage: RESERVATION`.
- `editorial_basis: UNSAVED`; `format_fit: FIT`; `editorial_outcome: KUAT` (11/12).
- Post public ID/revision, approval, quality status, metrics, dan save readback: **tidak ada** karena belum ada draft tersimpan.

## Prompt siap-tempel yang dikirim koordinator

Teks di bawah adalah prompt lengkap yang **disiapkan dan dikirim** koordinator. Teks yang benar-benar ditempel pemilik ke chat penguji tidak dikirim ulang, sehingga kesamaan byte `UNVERIFIED`.

```text
Jalankan `MAIN-SSF-01` dengan hanya PRIVATE Content Producer pada Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Buat dan simpan tepat satu draft `single_subject_fast` tentang octopuses sebagai satu subjek; variasikan anatomi dan perilaku tanpa mengulang makna. Tulis naskah orisinal `en-US` yang natural, konkret, mengejutkan atau berguna tanpa clickbait, dan cepat dipindai.

Ikuti alur normal: riset/bukti → dedup lengkap (READ terarah bila hasil terpotong) → maksimal satu reservasi → maksimal satu `save_post` → `get_post`. Izin kedua Write itu sudah termasuk; jangan menunggu GO. Jika syarat gagal atau Write ditolak, berhenti tanpa retry; jika respons save hilang, rekonsiliasi READ, jangan buat draft kedua. Bila save pasti gagal setelah reservasi, boleh release reservasi kasus ini saja. Jangan revisi, approve, atau publikasikan. Balasan akhir: CANVA COPY pertama, caption, hashtags, format; jika tersimpan, post ID/status/revision, kecocokan `get_post`, system/editorial checks (terutama `trivia.surprise_substantive`), dan metrik server. Jika tidak, tahap dan error persis serta status reservasi. Ringkas sumber tanpa daftar URL.
```

## CANVA COPY pertama — UNSAVED, tidak direvisi

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

## FACEBOOK CAPTION — dilaporkan, belum tersimpan

```text
From eyes and arms to shelter-making and hunting, these seven octopus facts show just how varied their adaptations can be.
```

## HASHTAGS — dilaporkan, belum tersimpan

```text
#OctopusFacts #MarineBiology #OceanLife
```

## Jejak tindakan — dari laporan penguji, urutan dipertahankan

- **Page / generation context** — **Hasil yang dilaporkan:** Target Page tercantum dalam prompt; output config atau `config_updated_at` tidak tercantum dalam respons · **Batas bukti:** Identitas Page internal dalam respons/izin, readback config tidak terlihat
- **Research + source evidence** — **Hasil yang dilaporkan:** Riset/bukti disebut selesai; organisasi yang disebut Natural History Museum, Smithsonian Ocean, Monterey Bay Aquarium, studi primer di *Cell* dan *Nature Ecology & Evolution* · **Batas bukti:** Tidak tersedia per-claim packet, tier, URL, atau audit independen; teks sumber tambahan “Natural History Museum+4” tidak menjelaskan pasangan fakta/sumber
- **Semantic dedup READ** — **Hasil yang dilaporkan:** Dilaporkan 7/7 lengkap; 5 posisi membutuhkan review; 100 keputusan (99 `distinct`, 1 `same`) · **Batas bukti:** Tidak ada daftar 100 kandidat, `candidate_fact_public_id`, `relation_key`, `material_differences`, atau array request aktual; kesesuaian semantik tidak dapat dinilai
- **Satu reservasi: `trivia_register_and_reserve_facts`** — **Hasil yang dilaporkan:** **Ditolak** `FACT_REVIEW_REQUIRED` pada `facts[2].dedup_reviews` (F3: suckers can taste chemicals); tester melaporkan reservasi tidak terbentuk · **Batas bukti:** Satu penolakan yang terlapor, bukan bukti pasti kandidat mana/label mana tidak konsisten
- **`save_post`** — **Hasil yang dilaporkan:** **NOT_CALLED** · **Batas bukti:** Tidak ada draft tersimpan
- **`get_post`** — **Hasil yang dilaporkan:** **NOT_CALLED** · **Batas bukti:** Tidak ada post ID/readback, dan tidak ada server checks pada post
- **Retry / release / approve / publication** — **Hasil yang dilaporkan:** Tidak ada retry, draft kedua, revisi, approval, atau publikasi menurut laporan; release tidak relevan karena reservasi tidak terbentuk · **Batas bukti:** Tidak memverifikasi runtime di luar laporan

### Error yang diteruskan (tanpa credential)

```text
INVALID_ARGUMENT: Error code: INVALID_ARGUMENT; Error: RuntimeException: Error calling MCP tool: [TextContent(type='text', text='FACT_REVIEW_REQUIRED: Semantic deduplication needs explicit review. facts[2].dedup_reviews: A required semantic review decision is missing or inconsistent.', annotations=None, meta=None)]
```

Diagnosis terbatas: penolakan menandai `facts[2].dedup_reviews` sebagai keputusan yang hilang atau tidak konsisten. Hitungan 100 keputusan tidak membuktikan keputusan F3 cocok dengan candidate ID, label, dan alasan yang sebenarnya diwajibkan server. Satu `same` mungkin valid atau tidak; **jangan mengatribusikan sebab kepadanya tanpa payload**. Hasil ini bukan bukti bug server dan tidak sama dengan kasus sebelumnya yang READ-nya terpotong. Tindak lanjut dapat memakai Issue #56 (kelengkapan preflight) dan #63 (perbandingan label pembeda) sebagai konteks, bukan otomatis mengklaim akar yang sama. Tidak ada Write `UNCONFIRMED`; reject dilaporkan eksplisit dan tidak diulang.

## Reviewer — critical checks dan batas sumber

- **`trivia.meaning_preserved`** — **Penilaian reviewer / bukti:** `UNVERIFIED` terhadap sumber asli; tidak ada bukti tiap qualifier dipertahankan, meskipun naskah tampak bernuansa
- **`trivia.source_supported`** — **Penilaian reviewer / bukti:** `UNVERIFIED` secara independen; penguji menyebut institusi/jurnal, tanpa paket per klaim maupun checks server
- **`trivia.time_context_valid`** — **Penilaian reviewer / bukti:** Tidak ada as-of/tanggal relevan yang diminta dalam copy; check server `UNVERIFIED`
- **`trivia.safety_appropriate`** — **Penilaian reviewer / bukti:** Tidak tampak instruksi berisiko tinggi pada copy; check server `UNVERIFIED`
- **`trivia.caption_no_new_claim`** — **Penilaian reviewer / bukti:** Caption terlihat meringkas isi tanpa klaim faktual baru yang jelas; check server `UNVERIFIED`
- **`trivia.substantial_copying_absent`** — **Penilaian reviewer / bukti:** `UNVERIFIED`; tidak dilakukan pemeriksaan kesamaan teks terhadap sumber
- **`trivia.surprise_substantive`** — **Penilaian reviewer / bukti:** Reviewer menilai variasi kejutan kuat; **bukan PASS server**, karena reservasi ditolak sebelum penyimpanan
- **System/editorial checks dan `text_metrics`** — **Penilaian reviewer / bukti:** **UNVERIFIED/NOT AVAILABLE**; tidak ada `save_post`/`get_post`

Penguji tetap memikul kewajiban riset/policy sumber. Reviewer tidak membuka URL per fakta; klaim seperti pupil rectangular, lingkar otak pada saluran makan, dan fish punching belum divalidasi independen di sini. Tidak ada jaminan `ready`, publikasi, atau views.

## DNA 0–2 — copy pertama

- **Familiarity** — **Skor:** 2 · **Bukti editorial:** Subjek octopuses mudah dikenali; hook jelas
- **Surprise** — **Skor:** 2 · **Bukti editorial:** Coconut shelters, taste through suckers, dan fish-punching menyediakan kejutan substantif
- **Specificity** — **Skor:** 2 · **Bukti editorial:** Spesies/konteks dan mekanisme konkret pada sebagian besar baris; bukan slogan umum
- **Coherence** — **Skor:** 2 · **Bukti editorial:** Tujuh fakta tentang satu hewan, anatomi dan perilaku bervariasi tanpa pengulangan makna material
- **Scanability** — **Skor:** 2 · **Bukti editorial:** Satu gagasan utama per baris pendek, baris terpisah, en-US percakapan
- **Utility/emotion** — **Skor:** 1 · **Bukti editorial:** Rasa ingin tahu kuat; tidak ada utilitas langsung atau ikatan emosi yang menonjol
- **Total** — **Skor:** **11/12** · **Bukti editorial:** **KUAT** secara DNA pada copy `UNSAVED`, tidak berarti kebenaran fakta/kelayakan publikasi

`format_fit: FIT`: tujuh fakta sesuai preferensi `single_subject_fast`. Teks berbahasa Inggris natural untuk audiens lintas negara. Hook “Octopuses have a few unexpected tricks” relatif generik; CTA “Follow for more unexpected animal science” hanya satu aksi tetapi tidak menonjol. Caption dan hashtag konsisten dengan copy yang terlihat. Struktur tidak cukup untuk menyatakan source/checks PASS. Naskah pertama tidak diperbaiki atau direvisi pada kasus ini.

## Verdict dan tindakan

- **Editorial:** `KUAT 11/12` dengan basis `UNSAVED`. Tidak boleh dihitung sebagai draft tersimpan.
- **Workflow:** `BLOCKED / POLICY_HOLD` pada RESERVATION; `save_post` dan `get_post` tidak dipanggil. Bukan `FAIL` penyimpanan, bukan `UNCONFIRMED`.
- **Atribusi sementara:** paket keputusan dedup/review atau penyelarasan terhadap validator; sebab spesifik `UNVERIFIED`, tidak terbukti defect backend. Satu kasus utama belum memicu aturan jeda “blocker teknis sama pada dua kasus berbeda”.
- **Issue:** catat pada Issue kampanye #47 dan kaitkan temuan sejenis dengan #56/#63 sebatas bukti; tidak membuka Issue defect baru tanpa payload/duplikasi lintas kasus.
- **Keputusan:** baseline dijaga. Kasus `MAIN-TUT-01` berikutnya dapat dijalankan dengan prompt v1 yang sudah dibekukan, **tanpa perubahan atau retry pada MAIN-SSF-01**.
- Tidak ada rahasia/token, OAuth, reservation token, atau URL klaim per-fakta yang dicatat. Error yang diteruskan tidak memuat credential.
