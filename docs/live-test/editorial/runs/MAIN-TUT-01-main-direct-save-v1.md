# MAIN-TUT-01 — baseline / main-direct-save-v1

## Identitas kasus

- `case_id`: `MAIN-TUT-01`; `attempt_id`: `baseline`; `cohort_id`: `main-direct-save-v1-owner-reported`.
- Waktu asli sesi: **UNVERIFIED**; jawaban diteruskan saat kampanye 28 Oktober 2026 (Asia/Jakarta), tanpa timestamp penguji.
- Prompt revision: `main-direct-save-v1`; mode `guided_explicit`.
- Target Page: `f3984ee4-8ae7-4043-8c93-45765f82f46e`, Page internal `Trivia Editorial Test (Internal)`; konteks Page, config ID, `config_updated_at`, dan `recent_variety` aktual: **UNVERIFIED** dari respons yang diterima.
- Format expected/selected: `themed_utility`/`themed_utility`; tipe `practical_utility`, renderer `plain_lines`, language `en-US`, tema `food_storage_home`, 6 tips, CTA `save`.
- ID post internal yang dilaporkan: `59b1eab0-cfd0-473f-bf29-c7be37f4c6ff`, `status: draft`, `revision: 1`; `quality_status: pending`; approval dan publication tidak dilakukan. Revision/hash exact selain revision 1 **UNVERIFIED**.
- `execution_status: COMPLETED`; `workflow_verdict: PASS` (owner-reported, bukan inspeksi ulang mandiri melalui tool Content Producer).
- `editorial_basis: PERSISTED`; DNA reviewer 11/12 `KUAT`; `format_fit: FIT`.
- `evidence_level: LIVE_OWNER_REPORTED`; plugin/backend/runtime release `UNVERIFIED` (tidak ada versi runtime yang dapat dibuktikan dari jawaban).
- Copy pertama dan copy tersimpan dilaporkan cocok persis; pemilik tidak mengirim transkrip panggilan mentah, tetapi ringkasan dengan `get_post` cocok. Kesamaan byte dari prompt yang ditempel ke chat baru tetap `UNVERIFIED`.

## Prompt lengkap yang disiapkan dan dikirim koordinator

Teks di bawah adalah **prompt yang disiapkan** koordinator untuk kasus ini. Pemilik mengirim hasil penguji, bukan salinan teks prompt yang benar-benar ditempel, sehingga kesamaan byte `UNVERIFIED`. Tidak ada GO kedua.

```text
Jalankan `MAIN-TUT-01` dengan hanya PRIVATE Content Producer pada Page internal `f3984ee4-8ae7-4043-8c93-45765f82f46e`. Buat dan simpan tepat satu draft `themed_utility` tentang penyimpanan berries; berikan tindakan aman dan hasilnya tanpa janji masa simpan universal. Tulis naskah orisinal `en-US` yang natural, konkret, mengejutkan atau berguna tanpa clickbait, dan cepat dipindai.

Ikuti alur normal: riset/bukti → dedup lengkap (READ terarah bila hasil terpotong) → maksimal satu reservasi → maksimal satu `save_post` → `get_post`. Izin kedua Write itu sudah termasuk; jangan menunggu GO. Jika syarat gagal atau Write ditolak, berhenti tanpa retry; jika respons save hilang, rekonsiliasi READ, jangan buat draft kedua. Bila save pasti gagal setelah reservasi, boleh release reservasi kasus ini saja. Jangan revisi, approve, atau publikasikan. Balasan akhir: CANVA COPY pertama, caption, hashtags, format; jika tersimpan, post ID/status/revision, kecocokan `get_post`, system/editorial checks (terutama `trivia.surprise_substantive`), dan metrik server. Jika tidak, tahap dan error persis serta status reservasi. Ringkas sumber tanpa daftar URL.
```

## CANVA COPY pertama — PERSISTED menurut get_post

```text
Six berry storage moves worth knowing

Refrigerate fresh berries promptly; warm counters encourage faster spoilage.

Leave berries unwashed until eating; extra moisture can speed spoilage.

Remove spoiled or moldy berries before storing the rest.

Keep strawberry green tops on in storage; remove them after rinsing.

Put raspberries in shallow containers so the bottom ones aren't crushed.

Tray-freeze washed, dry berries before bagging so you can pour out portions.

Save this for your next berry haul.
```

## FACEBOOK CAPTION — PERSISTED menurut get_post

```text
A few small changes can make handling fresh berries simpler, from the fridge to the freezer. Keep this checklist for your next berry haul.
```

## HASHTAGS — PERSISTED menurut get_post

```text
#BerryStorage #FoodStorageTips #KitchenTips
```

## Jejak tool dan hasil dilaporkan secara berurutan

| Tahap | Bukti penguji | Ketidakpastian |
| --- | --- | --- |
| Page/context | ID Page internal sudah dibekukan pada prompt; format/tema dilaporkan | Tidak ada keluaran context/config atau `config_updated_at` yang terlihat |
| Riset/bukti | Penguji menyebut sumber FDA, University of Maine, Nebraska, Illinois, South Dakota State, Utah State, dan National Center for Home Food Preservation; frasa sumber “12 entri bukti per fakta”; ringkasan “FDA+3” | Frasa hitungan tidak dipisahkan per fakta; URL, source packet, tier dan klasifikasi untuk tiap tip tidak diaudit oleh reviewer |
| Semantic dedup READ | 40 keputusan review `distinct` dilaporkan diterima | Tidak tersedia daftar kandidat/relation labels dan payload lengkap; kelengkapan READ awal tidak dapat diperiksa independen |
| `trivia_register_and_reserve_facts` | Reservasi berhasil, enam fakta dialokasikan melalui satu rangkaian kasus | Token reservasi tidak disimpan |
| `save_post` | Berhasil satu kali, post `59b1eab0-cfd0-473f-bf29-c7be37f4c6ff`, draft rev 1 | Respons mentah/operation key tidak tersedia; tidak ada retry dilaporkan |
| `get_post` | Dilaporkan **cocok** seluruh CANVA COPY, caption, hashtags; format dan post ID/revision dilaporkan; 6/6 fact bindings `allocated` | Reviewer tidak melakukan READ alternatif; exact hash, Page ID readback, dan config pada result `UNVERIFIED` secara independen |
| Approval/revision/publication | Tidak dilakukan revisi, approval, atau publikasi | Quality masih `pending`, bukan `ready` |

Status reservasi: berhasil dan dikonversi pada penyimpanan; tidak ada sumber informasi bahwa reservasi perlu release. `save_post_outcome: CONFIRMED_OWNER_REPORTED`, `readback_outcome: MATCH_OWNER_REPORTED`. Tidak ada `UNCONFIRMED` Write dan tidak ada blocker teknis baru.

## Pemeriksaan kualitas, metrik server, dan batas bukti

| Aspek | Hasil yang dilaporkan |
| --- | --- |
| System checks | **18/19 passed**; satu warning nonblocking `trivia.profile.preferred_band`: dua fakta 9 kata, sedikit di bawah preferensi 10–14 kata; tidak diubah menjadi critical fail |
| Editorial checks | **18/18 pass**, termasuk seluruh kriteria critical menurut penguji |
| `trivia.surprise_substantive` | `pass` server-reported: strawberry green tops, shallow containers untuk raspberries, tray-freezing |
| Risk flag | `safety`; sumber disebut telah ditinjau oleh penguji/plugin; bukan bukti audit independen reviewer |
| Canva characters | 505 |
| Facts characters | 429 |
| Total words | 75 |
| Rendered lines | 28 |
| Estimated read time | 25.3 detik |
| Replay ratio | 1.946 |
| Estimated loops | 2 |
| Status quality | `pending`; bukan persetujuan terbit, tidak menguji Reel/video 13 detik ataupun prediksi views |

### Status critical checks reviewer vs server

| Check | Penilaian |
| --- | --- |
| `trivia.meaning_preserved` | Server editorial `pass` dilaporkan (18/18 total); pengujian independen preservasi klaim sumber `UNVERIFIED` |
| `trivia.source_supported` | Dilaporkan lulus oleh penguji/server; tanpa audit URL per fakta reviewer |
| `trivia.time_context_valid` | Server `pass` dilaporkan; tidak ada klaim shelf-life universal yang tampak |
| `trivia.safety_appropriate` | Server `pass` dilaporkan; risk flag `safety`; tips food handling tidak otomatis terbukti aman tanpa dukungan sumber |
| `trivia.caption_no_new_claim` | Caption tampak meringkas tips tanpa klaim fakta baru; server `pass` dilaporkan |
| `trivia.substantial_copying_absent` | Server `pass` dilaporkan, tetapi reviewer tidak membandingkan teks dengan halaman sumber |
| `trivia.surprise_substantive` | Server-reported `pass`; reviewer memberi 1/2 untuk surprise berdasarkan preview pertama |
| Source facts | Reviewer **tidak** menyatakan independently verified; sumber dan checks terbatas pada pengakuan penguji dengan readback owner-reported |

Peringatan dua fakta 9 kata tidak sama dengan kegagalan workflow. Batas total baris 28 historis dicabut melalui CR-051; jangan menghukum 28 rendered lines menggunakan aturan lama. Replay ratio dan estimated read time adalah metrik server, bukan bukti durasi konsumsi video.

## Penilaian DNA reviewer — copy pertama, tanpa revisi

| Unsur | Skor | Alasan |
| --- | ---: | --- |
| Familiarity | 2 | Penyimpanan berries dan kegunaan dapur mudah dipahami |
| Surprise | 1 | Dua–tiga tip khas (green tops, shallow raspberry containers, tray freezing), tetapi refrigeration, washing dan removing mold umum |
| Specificity | 2 | Tips konkret dengan kondisi/tindakan/hasil, menyebut strawberry/raspberry ketika material |
| Coherence | 2 | Enam item pada satu pekerjaan penyimpanan, mencakup fridge dan freezer tanpa mitos/umur simpan universal |
| Scanability | 2 | Kalimat langsung, gagasan jelas per baris, 75 kata menurut server; label aksi singkat |
| Utility/emotion | 2 | Dapat langsung dijadikan checklist, CTA `save` relevan |
| **Total** | **11/12** | **KUAT**, `PERSISTED`; bukan diagnosis keamanan/akurasi atau kelayakan terbit |

`format_fit: FIT` — enam tips sesuai preferensi `themed_utility` (kondisi, tindakan, hasil), hook jelas meski tidak sangat kuat secara emosi, CTA tunggal `save`, caption sesuai; bahasa `en-US` cukup natural untuk US/UK/CA/AU. Surprise = 1/2 tidak bertentangan dengan `trivia.surprise_substantive: pass` server karena rubric diagnostik berbeda dan tidak ada ambang pass/fail plugin pada skor DNA reviewer.

## Verdict, atribusi, dan tindak lanjut

- **Editorial**: `11/12 KUAT`, berdasarkan copy pertama `PERSISTED` menurut `get_post` yang dilaporkan.
- **Workflow**: `PASS` (`COMPLETED`), reservasi berhasil dan dikonversi, satu save, matching get_post, enam allocations; readback dilaporkan oleh penguji lewat pemilik.
- **Critical status**: reported editorial 18/18 pass dan safety flag reviewed by plugin; reviewer tidak mengaudit sumber/fakta atau merekonstruksi release/runtime.
- **Issue**: tambahkan update ke #47; belum ada alasan membuat defect Issue khusus dari warning preferred band atau variasi surprise. Catat perbedaan dari #54 sebagai kalibrasi editorial, bukan fix.
- **Stop/pause policy**: SSF sebelumnya `BLOCKED` dedup, TUT kini `PASS`; bukan blocker yang sama pada dua kasus MAIN. Tidak ada Write `UNCONFIRMED`, masalah keamanan/izin baru, atau approval. Sesuai urutan beku, lanjut `MAIN-EAC-01` setelah penyimpanan record branch dan update Issue terverifikasi; **jangan** mengubah atau menambah draft MAIN-TUT-01.
- **Sanitasi**: hanya ID post internal, teks naskah dan bukti yang perlu; tanpa credential, operation key, reservation/claim token, data pribadi, atau URL bukti per fakta.
