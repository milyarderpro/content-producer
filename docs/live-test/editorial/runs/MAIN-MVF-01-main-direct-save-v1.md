# MAIN-MVF-01 — baseline / main-direct-save-v1

## Identitas, izin, dan batas bukti

- `case_id: MAIN-MVF-01`; `attempt_id: baseline`; `cohort_id: main-direct-save-v1-owner-reported`.
- Sesi penguji: timestamp asli **UNVERIFIED**, jawaban diteruskan dalam kampanye 28 Oktober 2026 (Asia/Jakarta). `evidence_level: LIVE_OWNER_REPORTED`, bukan trace yang diinspeksi langsung.
- `prompt_revision: main-direct-save-v1`, `prompt_mode: guided_explicit`. Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`; Page config, `config_updated_at`, `recent_variety`, dan runtime version plugin/backend **UNVERIFIED**.
- Format expected/selected: `myth_vs_fact`/`myth_vs_fact`, `animals`, `fast_trivia`, `en-US`, tujuh pasangan myth/fact. `execution_status: COMPLETED`, `workflow_verdict: PASS`; `editorial_basis: PERSISTED`.
- Post public ID `0ac5f74b-1db6-4820-8c2f-8c80d9feeb3f`, `status: draft`, revision 1, quality `pending` (belum approved atau published).
- Tidak ada second draft, retry, revision, approval, atau publikasi menurut penguji. Teks prompt berikut adalah **prompt yang disiapkan dan dikirim koordinator**; byte prompt yang benar-benar ditempel pemilik `UNVERIFIED`.

## Prompt yang dikirim kepada pemilik

```text
Jalankan `MAIN-MVF-01` dengan hanya PRIVATE Content Producer pada Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Buat dan simpan tepat satu draft `myth_vs_fact` tentang miskonsepsi hewan yang sungguh umum; koreksi tepat tanpa membuat mitos palsu. Tulis naskah orisinal `en-US` yang natural, konkret, mengejutkan atau berguna tanpa clickbait, dan cepat dipindai.

Ikuti alur normal: riset/bukti → dedup lengkap (READ terarah bila hasil terpotong) → maksimal satu reservasi → maksimal satu `save_post` → `get_post`. Izin kedua Write itu sudah termasuk; jangan menunggu GO. Jika syarat gagal atau Write ditolak, berhenti tanpa retry; jika respons save hilang, rekonsiliasi READ, jangan buat draft kedua. Bila save pasti gagal setelah reservasi, boleh release reservasi kasus ini saja. Jangan revisi, approve, atau publikasikan. Balasan akhir: CANVA COPY pertama, caption, hashtags, format; jika tersimpan, post ID/status/revision, kecocokan `get_post`, system/editorial checks (terutama `trivia.surprise_substantive`), dan metrik server. Jika tidak, tahap dan error persis serta status reservasi. Ringkas sumber tanpa daftar URL.
```

## CANVA COPY pertama — PERSISTED menurut matching get_post

```text
7 animal myths, put to the test

Myth: Bats are blind. Fact: All bat species can see.

Myth: Camel humps hold water. Fact: They store fat.

Myth: Dogs see only gray. Fact: They see blue and yellow.

Myth: Ostriches bury their heads. Fact: They lie flat when threatened.

Myth: Chameleons change color only to hide. Fact: Some use it to signal.

Myth: Porcupines fire quills. Fact: Quills detach on contact.

Myth: Sharks are cancer-proof. Fact: Sharks can develop cancer.

Which animal myth had you heard before?
```

## FACEBOOK CAPTION

```text
A few familiar animal myths don't match the evidence. Which correction surprised you most?
```

## HASHTAGS

```text
#AnimalFacts #WildlifeMyths #NatureTrivia
```

## Trace aksi yang dilaporkan (urutan semantik)

| Tahap | Bukti yang diteruskan pemilik | Batas |
| --- | --- | --- |
| Page/generation context | Format dan topic sesuai Page/prompt | Snapshot config, recent_variety dan versi runtime tidak disertakan |
| Riset/bukti | 7 sumber Tier B dari Bat Conservation International, San Diego Zoo Wildlife Alliance, American Kennel Club, Smithsonian (ringkasan “Bat Conservation International+6”) | Tidak tersedia pemetaan per-mitos/per-koreksi atau verifikasi bahwa semua mitos umum; URL tidak diaudit koordinator |
| Dedup READ | 7 × 20 kandidat diperiksa; 120 keputusan `distinct` untuk yang perlu review; lengkap/passed menurut penguji | Array kandidat, per-fact flags, labels, dan detail `same`/ `distinct` tidak terlihat reviewer |
| Reservasi | Satu `trivia_register_and_reserve_facts` berhasil; 7 fakta dialokasikan pada save | Reservation token disanitasi dan tidak dicatat |
| `save_post` | Berhasil tepat satu kali, internal draft ID di atas, revision 1 | Raw operation key/request tidak tersedia |
| `get_post` | `MATCH` untuk konten, status, revision, dan content hash; 7 facts allocated | Literal hash dan seluruh field asli tidak diberikan; caption/hashtag dinyatakan bagian dari draft tetapi exact per-field match tidak dirinci secara eksplisit |
| Hasil akhir | Tidak ada revisi, approval, publikasi, atau save kedua | Quality pending; bukan ready |

`save_post_outcome: CONFIRMED_OWNER_REPORTED`; `readback_outcome: MATCH_OWNER_REPORTED`; `last_completed_stage: READBACK`. Tidak ada Write `UNCONFIRMED` atau reservasi sisa yang perlu release.

## Checks, metrik, dan penilaian critical

| Metrik/check server | Nilai reported |
| --- | --- |
| Blocking system checks | 18/18 passed; overall `passed` |
| Preferred band | `needs_review`, satu warning nonblocking: 86 kata melewati preferensi maksimum 85 (hard limits tetap lolos) |
| Editorial | 18/18 `pass`, overall `pass`, semua critical disebut pass |
| `trivia.surprise_substantive` | `pass` server-reported, bukan skor DNA reviewer |
| Source policy, dedup, exact rendering | `passed` menurut penguji |
| Canva chars | 512/600 |
| Facts block chars | 438/500 |
| Words | 86 |
| Visual lines | 27 |
| Estimated read | 29 detik |
| Replay ratio | 2.23 |
| Estimated loops | 3 |

Checks kritis (`trivia.meaning_preserved`, `source_supported`, `time_context_valid`, `safety_appropriate`, `caption_no_new_claim`, `substantial_copying_absent`, `surprise_substantive`) dilaporkan lulus melalui agregat editorial 18/18, bukan inspeksi koordinator terhadap payload dan sumber mentah. Source accuracy, representasi mitos umum, dan plagiarisme **UNVERIFIED secara independen**. Tidak ada detail risk flag dalam jawaban; jangan mengarang `none` atau status lain. Nilai estimated read/replay bukan ukuran views aktual.

## DNA editorial — copy pertama, tidak direvisi

| Unsur | Skor | Alasan |
| --- | ---: | --- |
| Familiarity | 2 | Kelelawar, unta, anjing, burung unta, bunglon, landak, dan hiu familiar; sebagian mitos dikenal luas |
| Surprise | 1 | Beberapa koreksi mudah ditebak, meskipun bunglon dan hiu menyediakan nilai tambah |
| Specificity | 1 | Myth/fact ringkas, tetapi beberapa correction sangat umum: “All bat species can see” universal; “They lie flat when threatened” menyederhanakan respons burung unta; perlu source-specific qualifiers sebelum publish |
| Coherence | 2 | Tujuh pasangan koreksi konsisten dalam satu koleksi mitos hewan |
| Scanability | 2 | Label Myth/Fact jelas, satu pasangan per baris, CTA tunggal; 86 kata sedikit melebihi preferensi namun bukan hard fail |
| Utility/emotion | 1 | Bermanfaat untuk meluruskan miskonsepsi, tetapi hook generik dan emotional/utility payoff terbatas |
| **Total** | **9/12 PERLU REVISI** | `format_fit: FIT`, penilaian diagnostik independen dari server editorial checks |

Gaya `en-US` cukup natural, pertanyaan penutup cocok untuk CTA interaksi. Fakta bahwa server menganggap `trivia.surprise_substantive: pass` tidak membatalkan reviewer surprise 1/2: evaluasi berbeda. Laporan penguji **tidak secara terpisah menunjukkan bukti prevalence masing-masing myth**; jangan menganggap myth buatan atau salah tanpa evidensi, tetapi jangan pula menyatakan semua terbukti populer. Klaim universal pada kelelawar dan kalimat burung unta adalah **risiko ketepatan formulasi**, bukan fact-check debunk oleh koordinator.

## Verdict dan keputusan gelombang

- Workflow **PASS / COMPLETED**, `PERSISTED` menurut satu reserve, satu save, matching get_post; `quality_status: pending`, bukan `ready`.
- DNA **9/12 PERLU REVISI**, `format_fit: FIT`, baseline tidak direvisi.
- Campaign sesudah kasus: **5/30**, 4 `PASS`, 1 `BLOCKED / POLICY_HOLD` (SSF), 0 `FAIL`; 25 `NOT RUN`. Tidak ada blocker teknis yang sama pada dua MAIN kasus, insiden otorisasi/keamanan, atau Write `UNCONFIRMED`.
- Laporan satu putaran lima format dan PR dokumentasi pertama perlu diperiksa, lalu berikutnya kasus **implisit** `MAIN-SSF-05` sesuai urutan beku v1; jangan menyertakan ID/format pada prompt penguji implisit.
- Issue #54 boleh menerima catatan kalibrasi surprise/hook berulang; jangan mengklasifikasikan koreksi mitos sebagai bug RPC hanya dari penilaian DNA.
- Sanitisasi: tidak ada credential, operation key, OAuth, reservation token, data privat pemilik, atau URL per klaim.
