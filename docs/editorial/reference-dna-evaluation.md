# Evaluasi DNA referensi — E01–E12

**Status 6 November 2026:** [review akhir corpus](reference-dna-review-2026-11-06.md)
mencatat 12 hasil akhir PREVIEW pada ambang D6, dengan retest C5/C6 dan
repair host terarah. Ini bukan 12/12 generasi pertama 0.5.6 PASS; E01/E07
memerlukan satu repair dan E11 dua repair. Tidak ada verifikasi ulang URL,
LIVE-save atau klaim FIXED. Bukti source/release 0.5.6 terpisah dari
penerimaan manual A–D task 5.4.

## Catatan sebelumnya — HISTORICAL

Paragraf, register dan skor berikut merekam keadaan sebelum retest
6 November. Untuk penerimaan terbaru gunakan review di atas.

**Pembaruan terakhir:** pemilik menerima A/E02, B/E07, C/E10, D/E11 pada
[revisi R2](reference-dna-owner-revision-r2.md); feedback dan seluruh revisi
menutup task 5.4. Task 5.2–5.3 tetap terbuka untuk retest generasi host;
penerimaan naskah manual tidak menghidupkan kembali skor PASS host historis.
Tidak ada revisi tambahan hanya untuk preferensi kecil.

**Riwayat 5 November 2026 setelah feedback awal task 5.4:** penerimaan
reviewer sebelumnya dibuka kembali. Pemilik meminta revisi substantif
A/E02, C/E10, D/E11 dan bahasa ringan B/E07. PASS pada register lama tetap
historis, tidak menutup penolakan ini. [Feedback](reference-dna-owner-review.md)
dan [revisi R1](reference-dna-owner-revision-r1.md) menjadi tindak lanjut;
task 5.2–5.4 masih terbuka.

Pembaruan R1 pemilik: A/E02 diterima setelah edit kecil yang telah diterapkan;
B/E07 diterima secara editorial. C/E10 dan D/E11 diseleksi/disunting kembali
pada [R2](reference-dna-owner-revision-r2.md), belum owner accepted.
Penerimaan manual A/B tidak menggantikan retest host instruksi terpasang.

Dibekukan untuk task 1.3 pada 5 November 2026. Acuan:
[design D6](../../openspec/changes/align-plugin-reference-content-dna/design.md#d6--evaluasi-semantik-dengan-kasus-regresi-dan-transfer),
[CR-061](../decisions/2026-11-05-cr-061-plugin-reference-content-dna.md),
[draf Issue/audit](reference-dna-remediation-issue.md).
Ini corpus QA, tidak dibundel ke plugin dan tidak mengubah config production.

## Input bersama yang dibekukan

Prefix **persis sama** sebelum setiap prompt inti, pada baseline dan kandidat:

```text
For this evaluation, return an unsaved Canva copy preview only. Follow the supplied Page config. Do not call any Write tool.
```

Input lengkap = prefix + blok JSON config di bawah + prompt inti satu kasus.
Tidak ada item plan/override jumlah fakta atau judul tambahan. Kolom routing
berikut adalah ekspektasi review, bukan teks tambahan pada prompt.
Konten en-US; target pembaca US/UK/CA/AU. Snapshot Page Corious Facts pada
audit read-only 5 November: target_markets ["US"], timezone Asia/Jakarta,
config_updated_at teks "2026-10-19T10:33:17.018070Z". Target empat market
berasal dari brief pemilik; config Page tidak diubah. Snapshot historis ini
bukan generation context untuk Write baru. Source snapshot tidak memiliki
UUID, token atau credential.

```json
{
  "allowed_formats": [
    "single_subject_fast",
    "themed_utility",
    "emotional_animal_collection",
    "comparison",
    "myth_vs_fact"
  ],
  "format_weights": {
    "single_subject_fast": 35,
    "themed_utility": 20,
    "emotional_animal_collection": 20,
    "comparison": 15,
    "myth_vs_fact": 10
  },
  "allowed_topics": [
    "animals",
    "pet_safety",
    "food_science",
    "food_storage_home",
    "practical_utility",
    "human_body",
    "nature_science",
    "geography",
    "history_origins",
    "inventions_everyday",
    "general_trivia"
  ],
  "topic_group_weights": {
    "animals_pet_safety": 30,
    "human_body_food_myth": 20,
    "practical_utility": 15,
    "places_geography": 15,
    "nature_space": 10,
    "history_inventions_people": 10
  },
  "fact_count": {
    "mode": "adaptive",
    "min": 5,
    "preferred": 7,
    "max": 9
  },
  "profiles": {
    "fast_trivia": {
      "fact_count_min": 7,
      "fact_count_max": 8,
      "words_per_fact_min": 8,
      "words_per_fact_max": 11,
      "total_words_min": 65,
      "total_words_max": 85
    },
    "practical_utility": {
      "fact_count_min": 5,
      "fact_count_max": 6,
      "words_per_fact_min": 10,
      "words_per_fact_max": 14,
      "total_words_min": 65,
      "total_words_max": 85
    }
  },
  "fact_reuse_scope": "workspace_unique",
  "render_style": "plain_lines",
  "allowed_interaction_goals": [
    "share",
    "save",
    "comment",
    "follow"
  ],
  "text_budget": {
    "hook_max_chars": 45,
    "fact_max_chars": 90,
    "facts_total_max_chars": 500,
    "cta_max_chars": 50,
    "canva_total_max_chars": 600
  },
  "caption": {
    "max_chars": 500
  },
  "hashtags": {
    "default_count": 3,
    "min_count": 0,
    "max_count": 5
  },
  "style": {
    "english_variant": "en-US",
    "tone": "conversational_credible",
    "emoji_allowed": false,
    "regional_slang_allowed": false
  }
}
```

Preferensi kata/count bukan minimum untuk padding. Hard constraints source 0.4.0:
maksimal 18 kata/fakta, 12 hook, 14 CTA, 100 kata Canva, 3 wrapped lines/fakta,
2 wrapped lines hook/CTA, replay_ratio 2.5, estimated_loops 3. Ukuran wrap/metrics
resmi memerlukan renderer; estimasi preview tidak disebut server PASS.
Batas karakter snapshot juga berlaku. Jangan memanggil Write demi mendapat metrics.

## Kasus dan expected behavior

| ID | Kelompok | Prompt inti persis | Routing yang diharapkan | Profil | Expected behavior |
| --- | --- | --- | --- | --- | --- |
| E01 | regresi | `Create a fast trivia card about red pandas.` | `single_subject_fast` | `fast_trivia` | Pembuka berupa kemampuan/keunikan, bukan diet umum; variasi angle. |
| E02 | regresi | `Create an emotional animal card about meerkat cooperation.` | `emotional_animal_collection` | `fast_trivia` | Caregiving tidak diulang sebagai dua kejutan; perilaku teramati tanpa motif rekaan. |
| E03 | transfer | `Compare African and Asian elephants for a general audience.` | `comparison` | `fast_trivia` | Pasangan setara dengan dimensi berbeda; bahasa sederhana. |
| E04 | regresi | `Create a card correcting common bat myths.` | `myth_vs_fact` | `fast_trivia` | Koreksi langsung; hindari parade label dan saran handling yang menyesatkan. |
| E05 | regresi | `Create surprising comparisons about moons in our solar system.` | `comparison` | `fast_trivia` | Hubungan mudah dibayangkan, bukan daftar diameter. |
| E06 | transfer | `Create a fast trivia card about human teeth.` | `single_subject_fast` | `fast_trivia` | Relatable dan mengejutkan; bukan bab anatomi. |
| E07 | transfer | `Create a fast trivia card about rice.` | `single_subject_fast` | `fast_trivia` | Botani/sejarah/skala bervariasi; bukan tabel nutrisi. |
| E08 | transfer | `Create useful storage facts about berries and leafy greens.` | `themed_utility` | `practical_utility` | Object/action/condition/outcome jelas, aman, saveable. |
| E09 | transfer | `Create a trivia card about unusual everyday life in Australia.` | `single_subject_fast` | `fast_trivia` | Kehidupan sehari-hari, budaya/tempat familiar; klaim berubah diperiksa. |
| E10 | transfer | `Compare surprising features of Canadian cities.` | `comparison` | `fast_trivia` | Perbandingan jelas per pasangan, bukan ranking tanpa basis. |
| E11 | transfer | `Create a card about the surprising history of the zipper.` | `single_subject_fast` | `fast_trivia` | Origin/usage beragam pada benda familiar; bukan kronologi datar. |
| E12 | transfer | `Create a card about unexpected abilities of trees.` | `single_subject_fast` | `fast_trivia` | Mekanisme konkret; tidak mengubahnya menjadi motif manusia. |

Empat regresi: E01/E02/E04/E05 menguji kegagalan audit. Delapan transfer:
E03/E06–E12 menguji penerapan pada subjek/detail baru. Jika contoh positif kelak
memakai subjek sama (misalnya gajah atau beras), tahan fakta/angle evaluasi
dari kartu pelatihan; catat overlap dan kebocoran di run record. Jangan menyebut
hafalan contoh sebagai keberhasilan transfer.

## Rubrik D6

Nilai setiap dimensi 0–2 disertai kutipan exact dari output serta alasan singkat.
2 = jelas memenuhi; 1 = memenuhi dengan masalah minor; 0 = perlu revisi substantif.
Jangan mengisi skor ketika output belum ada.

| Dimensi | Bukti untuk nilai 2 | Indikasi nilai 0 |
| --- | --- | --- |
| A familiarity/angle | Subjek familiar dan sudut jelas | Hanya label topik tanpa angle |
| B surprise atau utility | Reveal/kegunaan konkret pada fakta | Fakta dasar/pengingat umum mendominasi |
| C komposisi | Setiap poin menambah nilai pembaca | Angka sejenis atau caregiving berulang |
| D urutan | Pembuka kuat, tengah bervariasi, akhir berbeda | Urutan sumber/definisi otomatis |
| E naturalness | American English natural, konkret, nonakademik | Jargon, label mekanis, gaya textbook |
| F pola referensi | Ritme/shape selaras contoh relevan, original | Ringkasan artikel atau salinan kartu |
| G scanability/format | Satu gagasan per baris, mudah dipindai, format sah | Kalimat padat/format salah/filler |
| H CTA | Satu tujuan natural terkait isi | CTA kaku/tidak relevan/multiaksi |

Ambang kandidat **setiap kasus**: minimal 13/16; tidak ada dimensi 0;
naturalness E wajib 2; tidak ada masalah akurasi, qualifier, config atau budget.
Bila syarat ini gagal, verdict FAIL meskipun total tinggi. Rata-rata bukan gate.
Dimensi baseline yang gagal harus membaik tanpa mengurangi akurasi; pertahankan
bukti attempt gagal. Gate ini milik penerimaan QA, bukan field/error/backend
approval baru. Pemilik meninjau hasil corpus, bukan checkpoint GO setiap draft.

## Kontrol negatif dan batas izin

| ID | Input/situasi terisolasi | Expected behavior | Bukti/metode | Status |
| --- | --- | --- | --- | --- |
| N01 | Create five varied trivia drafts; tanpa fact count | Lima item; tidak menambahkan fixed:5 dari draft count | Fixture/trace tanpa business Write | NOT RUN |
| N02 | Permintaan eksplisit exactly five facts | Lima fakta dihormati tanpa filler | Preview count-control | NOT RUN |
| N03 | Explicit literal table of moon diameters | Tabel sah sesuai permintaan; tidak dipaksa menjadi surprise card | Preview instruction-control | NOT RUN |
| N04 | Format diminta di luar allowed_formats | Jelaskan batas, tidak memalsukan enum/mengubah config | Fixture/trace | NOT RUN |
| N05 | Klaim some trained dogs dipendekkan menjadi all dogs | Kehilangan qualifier ditolak/diperbaiki | Pasangan fixture semantik | NOT RUN |
| N06 | Preview baik, payload/readback kembali formal | Tidak DNA PASS; rekonsiliasi post sama menurut CAS/izin | Fixture/trace; LIVE terpisah | NOT RUN |
| N07 | Set akurat tetapi textbook; tiga checks dapat pass | Perbaiki sebelum save; jangan menambah check server | Fixture/trace | NOT RUN |
| N08 | Kandidat kurang setelah dua putaran perbaikan terarah | Laporkan batas; tanpa filler, force DISTINCT, count reduction atau loop tak berbatas | Fixture/trace | NOT RUN |

Kontrol dijalankan terpisah dari E01–E12 dan tidak mengubah prompt pembanding.
Expected refusal pada negative control bisa PASS bila bukti sesuai; scripted
trace tidak membuktikan perilaku AI nyata.

## Register hasil

Versi baseline source 0.4.0 pada SHA 2a98665f7e7d2ac5d63c06afe412dd3d0117c152;
kandidat 0.5.0 masih rencana, bukan release terpasang. Status saat task 1.3:

| Kasus | Baseline versi | Kandidat versi | Model/host | Bukti baseline/kandidat | Baseline | Kandidat |
| --- | --- | --- | --- | --- | --- | --- |
| E01 | source 0.4.0 | belum dibuat | belum direkam | belum ada / belum ada | NOT RUN | NOT RUN |
| E02 | source 0.4.0 | belum dibuat | belum direkam | belum ada / belum ada | NOT RUN | NOT RUN |
| E03 | source 0.4.0 | belum dibuat | belum direkam | belum ada / belum ada | NOT RUN | NOT RUN |
| E04 | source 0.4.0 | belum dibuat | belum direkam | belum ada / belum ada | NOT RUN | NOT RUN |
| E05 | source 0.4.0 | belum dibuat | belum direkam | belum ada / belum ada | NOT RUN | NOT RUN |
| E06 | source 0.4.0 | belum dibuat | belum direkam | belum ada / belum ada | NOT RUN | NOT RUN |
| E07 | source 0.4.0 | belum dibuat | belum direkam | belum ada / belum ada | NOT RUN | NOT RUN |
| E08 | source 0.4.0 | belum dibuat | belum direkam | belum ada / belum ada | NOT RUN | NOT RUN |
| E09 | source 0.4.0 | belum dibuat | belum direkam | belum ada / belum ada | NOT RUN | NOT RUN |
| E10 | source 0.4.0 | belum dibuat | belum direkam | belum ada / belum ada | NOT RUN | NOT RUN |
| E11 | source 0.4.0 | belum dibuat | belum direkam | belum ada / belum ada | NOT RUN | NOT RUN |
| E12 | source 0.4.0 | belum dibuat | belum direkam | belum ada / belum ada | NOT RUN | NOT RUN |

## Pembaruan task 5 — 5 November 2026

Register di atas adalah keadaan historis task 1.3. Evaluasi host kini sudah
menghasilkan 12 baseline B1 dan 12 kandidat C1 pada input frozen yang sama:
[seluruh baseline](reference-dna-preview-baseline-2026-11-05.md),
[seluruh kandidat dan sumber](reference-dna-preview-candidate-0.5.0.md).
Plugin terpasang diperbarui melalui Plugin Creator dari 0.4.0 ke 0.5.0 dan
seluruh source dibaca balik: [bukti rilis](reference-dna-plugin-release-2026-11-05.md).
Host ChatGPT web/Chrome, thinking effort Medium; identitas model exact unknown.
Ini PREVIEW, bukan bukti LIVE-save. Pengumpulan output task 5.1 selesai;
review dan perbaikan task 5.2–5.3 belum selesai.

| Kasus | Attempt/source | Output baseline/kandidat | Status review C1 saat pencatatan |
| --- | --- | --- | --- |
| E01 | B1 0.4.0 / C1 0.5.0 | Ada / ada | FAIL budget; review delapan dimensi belum selesai |
| E02 | B1 0.4.0 / C1 0.5.0 | Ada / ada | Review delapan dimensi belum selesai |
| E03 | B1 0.4.0 / C1 0.5.0 | Ada / ada | Review delapan dimensi belum selesai |
| E04 | B1 0.4.0 / C1 0.5.0 | Ada / ada | Review delapan dimensi belum selesai |
| E05 | B1 0.4.0 / C1 0.5.0 | Ada / ada | Review delapan dimensi belum selesai |
| E06 | B1 0.4.0 / C1 0.5.0 | Ada / ada | Review delapan dimensi belum selesai |
| E07 | B1 0.4.0 / C1 0.5.0 | Ada / ada | Review delapan dimensi belum selesai |
| E08 | B1 0.4.0 / C1 0.5.0 | Ada / ada | Review delapan dimensi belum selesai |
| E09 | B1 0.4.0 / C1 0.5.0 | Ada / ada | Review delapan dimensi belum selesai |
| E10 | B1 0.4.0 / C1 0.5.0 | Ada / ada | FAIL budget; review delapan dimensi belum selesai |
| E11 | B1 0.4.0 / C1 0.5.0 | Ada / ada | Review delapan dimensi belum selesai |
| E12 | B1 0.4.0 / C1 0.5.0 | Ada / ada | FAIL budget; review delapan dimensi belum selesai |

Hitungan lokal menemukan hook E01 47/45 karakter, CTA E10 54/50 dan CTA E12
52/50. Pernyataan host bahwa copy sudah sesuai limits tidak diterima begitu
saja. Temuan komposisi, urutan, qualifier dan akurasi masih ditelaah; belum ada
klaim seluruh kasus memenuhi ambang D6. Kegagalan C1 tidak boleh ditimpa oleh
attempt perbaikan berikutnya.

## Penutupan review naskah task 5.2–5.3

Pada 5 November 2026, [review semantik lengkap](reference-dna-semantic-review.md)
menilai setiap output pada delapan dimensi dengan kutipan, membandingkan
baseline, mempertahankan seluruh FAIL dan merekam attempt perbaikan baru.
Tabel sebelumnya adalah keadaan saat pencatatan 5.1, bukan status akhir ini.

| Kasus | Attempt / source diterima | Skor D6 | Hasil |
| --- | --- | ---: | --- |
| E01 | C3 / 0.5.2 | 15/16 | PASS PREVIEW |
| E02 | C4 / 0.5.3 | 14/16 | PASS PREVIEW |
| E03 | C2 / 0.5.1 | 15/16 | PASS PREVIEW |
| E04 | C2 / 0.5.1 | 15/16 | PASS PREVIEW |
| E05 | C2 / 0.5.1 | 16/16 | PASS PREVIEW |
| E06 | C2 / 0.5.1 | 13/16 | PASS PREVIEW |
| E07 | C2 / 0.5.1 | 15/16 | PASS PREVIEW |
| E08 | C3 / 0.5.2 | 15/16 | PASS PREVIEW |
| E09 | C2 / 0.5.1 | 15/16 | PASS PREVIEW |
| E10 | C3 / 0.5.2 | 15/16 | PASS PREVIEW |
| E11 | C2 / 0.5.1 | 13/16 | PASS PREVIEW |
| E12 | C3 / 0.5.2 | 16/16 | PASS PREVIEW |

Output utuh:
[C2 0.5.1](reference-dna-preview-candidate-0.5.1.md),
[C3 0.5.2](reference-dna-preview-candidate-0.5.2.md),
[C4 0.5.3](reference-dna-preview-candidate-0.5.3.md).
Tidak ada dimensi nol; naturalness seluruh kasus 2. E06 dan E11 tepat
ambang dan masih mencatat minor, bukan contoh unggulan.

E10 C2 tetap FAIL block 505/500; C3 memperbaikinya menjadi 476/500.
E02 C3 tetap FAIL care berulang; C4 menggantinya dan mencapai 14/16.
Reuse tujuh output C2 dijelaskan menurut scope patch berikutnya. Ini bukan
klaim satu run baru 12 kasus semuanya pada 0.5.3. Selector C4 berubah dari
Medium saat penyiapan menjadi High saat hasil dibaca, tanpa agent mengubahnya;
model exact unknown dan tidak diklaim eksperimen effort terkontrol.

Pemilik mengarahkan agar tidak mengulang verifikasi URL dan memusatkan task
pada naskah. Karena itu pemeriksaan ulang URL lengkap tidak diklaim PASS;
review makna memakai riset yang tersedia dan tidak mengabaikan masalah yang
sudah diketahui. Wrapped-line/system checks dan saved-copy masih NOT RUN.
Source/check/package PASS dan preview PASS tetap terpisah dari LIVE-save.
Plugin PRIVATE terpasang kini 0.5.3; [release/hash/checks](reference-dna-plugin-release-2026-11-05.md)
tercatat. Task 5.4 feedback pemilik dan task 6 tetap terbuka.

Task 5.4: [paket review pemilik](reference-dna-owner-review.md) menyajikan
empat kartu aktual beserta pembanding, termasuk E11 yang tepat ambang,
dan akses seluruh 12 kasus. Status PENDING FEEDBACK; belum ada konfirmasi
editorial atau revisi pemilik yang boleh dianggap selesai.

## Format record setiap attempt

Simpan attempt baru, jangan menimpa output gagal:

- Kasus/attempt, tanggal dengan timezone, reviewer.
- Source SHA, manifest version, package/archive hash; installed release/hash
  bila terbukti. Model dan host hanya bila terlihat; selainnya unknown.
- Prefix, config dan prompt lengkap atau rujukan persis ke input frozen ini.
  Catat seluruh penyimpangan input, routing dan overlap corpus.
- Output Canva copy **utuh** apa adanya; jangan menggantinya dengan rewrite.
  Jika sumber diteliti, catat URL/dukungan secara terpisah.
- Delapan skor dan kutipan bukti; pemeriksaan akurasi/qualifier/config/budget.
- Verdict PASS/FAIL/BLOCKED/NOT RUN dan tingkat bukti SOURCE, PREVIEW,
  CI/FIXTURE, LIVE atau HISTORICAL; sumber evidence/locator.
- Untuk saved-copy kelak: revision/hash dan copy readback yang sama; ikuti
  workflow live dan izin objek/payload. Jangan menaruh token/credential.

PREVIEW PASS tidak membuktikan save; source test bukan penilaian naturalness.
Jika host baseline terisolasi belum tersedia, catat NOT RUN, jangan memakai
draft audit lama sebagai output E01–E12.
