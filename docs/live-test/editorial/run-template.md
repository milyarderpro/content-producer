# Template bukti satu kasus draft tersimpan

Salin template ini ke `runs/<case_id>-<attempt_id>.md` **hanya setelah percobaan dijalankan**. Baseline memakai `attempt_id: baseline`; retest mendapat ID berbeda dan tidak menimpa baseline. Isi `NOT RUN`/`UNVERIFIED` bila bukti tidak ada; jangan mengisi hasil dugaan. Sanitasi sebelum menyimpan atau membagikan. Record ringkas pasangan percobaannya berada di `results.jsonl` menurut [protokol](protocol.md).

Template ini untuk percobaan yang menargetkan draft tersimpan. Jangan memakainya untuk menyebut preview tanpa Write sebagai `PASS` workflow penyimpanan; mode uji editorial-only dan bukti yang dibutuhkan harus ditetapkan terpisah sebelum dipakai.

## Identitas kasus

- `case_id`:
- `attempt_id` dan `cohort_id`:
- Waktu dan zona waktu sesi:
- Prompt revision: catat revisi yang benar-benar dikirim (`v4`, adaptasi pilot, atau `v7`), jangan menebak:
- Mode: `pilot_guided` / `pilot_direct_save` / `guided_explicit` / `minimal_implicit`
- Page public ID, config ID, `config_updated_at` teks persis, dan bukti config tidak berubah (bukan ID Facebook):
- Format diharapkan (catatan reviewer, bukan bagian prompt implisit):
- Format dipilih output, jika ada:
- Alasan pemilihan format (khusus kasus implisit), termasuk bila alternatif layak:
- Ringkasan `recent_variety`/alokasi relevan dari context sebelum kasus:
- Plugin/backend/versi runtime yang **terbukti** atau `UNVERIFIED`; letak buktinya:
- Tautan/ID bukti sesi yang aman, jika tersedia:
- Status pelaksanaan: `COMPLETED` / `BLOCKED` / `NOT RUN`; alasan bila terhenti:
- `stop_category`: `POLICY_HOLD` / `PERMISSION` / `PREREQUISITE` / `UNCONFIRMED` / `WORKFLOW_ERROR` / tidak berlaku:
- `editorial_basis`: `PERSISTED` / `UNSAVED` / `NONE`:
- `workflow_verdict`: `PASS` / `FAIL` / `BLOCKED` / `NOT RUN`:

## Prompt yang benar-benar ditempel

Tempel teks prompt persis seperti yang dikirim bila tersedia, bukan hanya case ID. Jika pemilik hanya meneruskan hasil tanpa teks prompt yang ditempel, simpan prompt yang disiapkan reviewer sebagai acuan dan tandai kesesuaian byte `UNVERIFIED`; jangan mengklaim keduanya identik. Catat setiap penyimpangan; jangan memasukkan hasil retest ke batch baseline tanpa label.

## Copy pertama yang terlihat dan jejak workflow awal, setelah sanitasi

Simpan jejak awal **utuh secara semantik dan berurutan sampai stop/readback**, termasuk satu checkpoint payload final, keputusan GO/STOP, penolakan, peringatan, dan output parsial. Pemilik hanya meneruskan respons; reviewer yang mencatat dan menyantisasi. Kandidat yang dinilai ialah **copy pertama yang benar-benar terlihat sebelum revisi**, bila ada. Jangan menggantinya dengan revisi yang lebih bagus. Bila copy terlihat sebelum save tetapi tidak tersimpan, labeli `UNSAVED`. Jangan menyalin artikel sumber lengkap.

| Tahap                      | Tool/aksi dan waktu | Hasil terbukti, error, atau state yang belum pasti | Persetujuan Write dan ringkasan payload tersanitasi |
| -------------------------- | ------------------- | -------------------------------------------------- | --------------------------------------------------- |
| Context Page sebelum Write | Belum diisi         | Belum diisi                                        | Tidak berlaku                                       |
| Riset dan dedup Read       | Belum diisi         | Belum diisi                                        | Tidak berlaku                                       |
| Reservasi fakta            | Belum diisi         | Belum diisi                                        | Belum diisi                                         |
| `save_post`                | Belum diisi         | Belum diisi                                        | Belum diisi                                         |
| `get_post` readback        | Belum diisi         | Belum diisi                                        | Tidak berlaku                                       |

- Tahap terakhir yang berhasil dan respons yang hilang/tidak pasti:
- Jika safety/source/dedup menahan kasus: aturan yang bekerja dan bukti; jangan catat sebagai defect tool tanpa triase:
- `reserved_until` dan status release bila ada; **jangan** tulis reservation token:
- Draft public ID, status, revision/hash, format, Page, jumlah fakta, dan system checks dari **`get_post`** (atau `UNVERIFIED`):
- Kecocokan isi readback dengan naskah yang dinilai; perbedaan bila ada:
- Bila response `save_post` hilang: filter Page/waktu pada `list_posts`, kandidat yang diperiksa dengan `get_post`, dasar kecocokan atau ambiguitas, keputusan **tidak replay**/same-key same-payload replay berizin; jangan simpan operation key mentah:
- Atribusi kegagalan sementara: bahan/klaim, instruksi/pemetaan plugin, tool/RPC, izin/prasyarat, atau belum diketahui; alasan:
- Perubahan Page config/plugin/backend/schema host selama kohort; keputusan pause/stratifikasi:

## Batas pemeriksaan sumber

- Riset, pemeriksaan kebijakan fakta, dan pemetaan sumber per klaim tetap dilakukan plugin; catat ringkasan serta peringatan yang dilaporkan.
- Reviewer kampanye ini **tidak membuka atau mengaudit URL sumber per fakta**. Jangan menyatakan klaim telah diverifikasi independen oleh reviewer; gunakan `UNVERIFIED` untuk aspek tersebut.
- Catat risiko klaim yang tampak dari copy, terutama keselamatan, angka/kondisi yang tidak jelas, atau mitos yang tampak dibuat-buat. Untuk `myth_vs_fact`, catat apakah plugin melaporkan bukti bahwa keyakinan itu umum, tanpa membuka tiap URL.

## Penilaian reviewer

| Kriteria kritis                     | Status       | Alasan/bukti  |
| ----------------------------------- | ------------ | ------------- |
| `trivia.meaning_preserved`          | `unverified` | Belum dinilai |
| `trivia.source_supported`           | `unverified` | Belum dinilai |
| `trivia.time_context_valid`         | `unverified` | Belum dinilai |
| `trivia.safety_appropriate`         | `unverified` | Belum dinilai |
| `trivia.caption_no_new_claim`       | `unverified` | Belum dinilai |
| `trivia.substantial_copying_absent` | `unverified` | Belum dinilai |

| DNA 0–2         | Skor | Alasan singkat |
| --------------- | ---: | -------------- |
| Familiarity     |    — | Belum dinilai  |
| Surprise        |    — | Belum dinilai  |
| Specificity     |    — | Belum dinilai  |
| Coherence       |    — | Belum dinilai  |
| Scanability     |    — | Belum dinilai  |
| Utility/emotion |    — | Belum dinilai  |

- Total DNA dan label editorial `KUAT` / `PERLU REVISI` / `LEMAH`, hanya jika ada naskah:
- Rubric/version/hash editorial yang benar-benar tersimpan dan noncritical checks yang gagal/perlu review:
- Verdict workflow independen dari label editorial; alasan dan bukti:
- `format_fit`: `FIT` / `DEVIATION` / `NOT REVIEWED`; jumlah fakta/kata perkiraan dan penyimpangan:
- English `en-US` natural untuk US/UK/CA/AU; contoh masalah bila ada:
- Hook, CTA satu tujuan, caption, hashtag, dan pemisahan copy/internal:
- Risiko kritis, ketidakpastian, dan keputusan `Issue` / `no Issue` beserta alasan:
- Batas bukti: draft/readback dan checks server hanya dinyatakan jika teramati; approval, publikasi Facebook, dan potensi views tidak diuji.

## Pemeriksaan sanitasi sebelum menyimpan

- [ ] Tidak ada OAuth token, secret, password, reservation/claim token, atau credential lain.
- [ ] Tidak ada PII atau payload privat yang tidak diperlukan.
- [ ] Tidak ada URL/ID Facebook, status tersimpan/`ready`, atau metrik yang direkayasa; public ID internal yang terbukti boleh dicatat.
- [ ] Respons pertama tetap utuh secara semantik; redaksi rahasia ditandai `[REDACTED]`.
