# P2-T2 — Corpus dedup v2 (fixture only)

**Source checkpoint:** `main` `0cd17c63d3b14569d2ebe00150f4e3dbf7171019` (1 November 2026). **Scope:** bahasa klaim en-US, synthetic/AI editorial labels; tidak ada bukti produksi, hasil RPC v2 atau pemeriksaan kebenaran dunia nyata.

## Tahap 1 — bukti dan keterbatasan

| Sumber | Diketahui melalui pembacaan source | NOT RUN / batas |
| --- | --- | --- |
| OpenSpec task 2.2, TFL-04..10, proposal/design; PRD FR-03/04 | Canonical identity, status historis, Read kalimat+Page, `complete`, katalog A dan keputusan same/distinct/uncertain adalah kontrak v2 | RPC/DB/host/LIVE v2 NOT RUN |
| `docs/contracts/trivia-fact-identity-v2.md` §1–3; CR-053 dan CR-054 | ID existing satu registry, v2-native tanpa ontology v1 tidak boleh mendapat representasi palsu; v1 Read boleh fail-closed jika native wajib | Implementasi v2 NOT RUN |
| `dedup-v1/{manifest.json,thresholds-v1.json,evaluation-report-v1.json,gold-cases.ts}` | **HISTORICAL v1** 150 pasangan, 105 development/45 holdout, `phase-4.7` melaporkan candidate recall@20 **1**, false automatic merges 0 | Input ontology v1, label `ai_reviewed`, limit 20: bukan baseline retrieval kalimat v2 |
| Test DB `trivia-candidate-retrieval`, `api-trivia-public-gold`, `api-trivia-populated-performance` | Menilai kandidat, public RPC dan beban ontology v1 pada checkpoint historis | Current v1 pada corpus baru NOT RUN |
| Migration `20261012124852_materialize_trivia_candidate_input.sql`, `20261011131505_phase_5_5_trivia_registration_reservation_rpcs.sql`, `supabase/functions/mcp/trivia_fact.ts` | `internal.trivia_candidates_v3` memfilter `needs_review/verified` dan adapter v1 tetap meminta ontology; cap maksimal 20 | `invalidated/superseded/rejected` belum semuanya tampak sebagai history hint melalui filter v1 |

## Aturan editorial

`case_id` dan `reference.fixture_identity_id` stabil tetapi **bukan UUID fakta DB**. `identity_status` dan `usage` adalah keadaan fiktif, bukan data pemilik. `evidence_expired_only=true` hanya pada legacy v1 status verified: riset URL baru dan cek reuse tetap perlu saat implementasi; status koreksi negatif tetap history hint **tidak eligible**, walaupun label `same`. Sesuai P2-T1 §1.1, semua **v2-native tanpa envelope v1** memakai status awal `needs_review`, kecuali status koreksi negatif `invalidated`/`superseded`/`rejected` yang sah sebagai riwayat lintas versi. Ini tidak berarti `needs_review` native otomatis tidak eligible untuk alur v2: aturan versi harus ditentukan P3. Hanya **6 legacy** memakai contoh `verified`, dan status fixture itu **tidak** memasok evidence v1 untuk insert DB. URL atau subjek sama tidak cukup untuk merge. `distinct` mewajibkan `material_difference`; `uncertain` bukan `distinct` otomatis.

**Provenance v1 yang benar-benar diadaptasi:** `ai-dedup-v1-curious_mind-post-011-11` (V2-007/008), `post-007-7` (V2-021), `post-008-8` (V2-022), `post-003-3` (V2-031), dan `post-002-2` (V2-032), dengan prefix ID lengkap sama seperti contoh pertama. Referensi kalimat diambil dari gold v1; query baru ditulis ulang atau dibalik makna. Itu **bukan** verifikasi klaim yang pernah beredar di dataset `dataset-reference/post-*.txt`.

**Audit contoh yang ditolak sebagai parafrasa:** `ai-dedup-v1-curious_mind-post-001-1` sampai `post-016-16` (16 ID berurutan; bentuk lengkap mengikuti prefix v1), semua pasangan exact pada potongan yang diinspeksi hanya berubah tanda titik/seru. Sebagian klaim referensi dipakai ulang untuk kasus baru di atas, tetapi **label punctuation v1 tidak disalin**. Sisa 134 pasangan v1 tidak dipakai dan belum diaudit satu per satu. Tidak mengisi kuota 150 tanpa audit.

Korpus setelah review koordinator terbagi menjadi **60 development dan 33 holdout (93 total)**; breakdown label/kategori/asal/status/usage ada di manifest. Holdout dibekukan sebelum evaluator menyaksikan output retrieval. Perhitungan checksum memakai byte file secara langsung dengan newline terakhir:

```sh
sha256sum supabase/tests/fixtures/trivia/dedup-v2/holdout.v1.jsonl
cat supabase/tests/fixtures/trivia/dedup-v2/holdout.sha256
pnpm exec vitest run tests/trivia-dedup-v2.test.ts
```

Validasi fixture bukan pengujian RPC, kemampuan DB, atau kualitas fakta historis.

## Revisi koordinator 1 November 2026 — sebelum outcome retrieval v2

- **93 kasus**: 60 development, 33 holdout; **49 same, 40 distinct, 4 uncertain**. Kategori: **40 paraphrase, 40 hard_negative, 6 alias_unit, 3 exact, 4 uncertain**. Asal: 6 legacy dan 87 v2-native sintetis. Status total: 6 legacy `verified`, 66 `needs_review`, 7 `invalidated`, 7 `superseded`, 7 `rejected`; usage draft 48, published 26, none 19.
- **18 same dengan negative status**: masing-masing **6 invalidated, 6 superseded, 6 rejected**. Kasus `same` tidak eligible untuk memakai ulang status negatif; hasil Read semestinya menampilkan petunjuk history. Tidak ada insertion evidence v1 palsu.
- Kasus V2-037..V2-067 menambah 31 parafrasa dengan perubahan struktur, sinonim, arah aktif/pasif serta kondisi; V2-068..V2-093 menambah 26 hard negatives yang berbeda angka, negasi, arah relasi, waktu, lokasi, populasi, kondisi dan unit. Review label dilakukan **sebelum** akses ke outcome v2; tidak ada tuning dari hasil retrieval.
- V2-036 tetap `uncertain` tetapi query kini menyebut **vessel tak beridentitas** dengan layar biru dan lokasi harbour; bisa kapal referensi atau kapal lain. Ini bukan lagi klaim "blue flag" yang jelas berbeda objek. ID kasus lama tetap stabil.
- Data v1 yang dipakai tidak bertambah; audit hanya berlaku pada 6 adaptasi yang disebut di atas. Referensi yang dikutip dari koleksi konten tidak menjadi bukti kebenaran dunia nyata.
- Checksum di `holdout.sha256` diperbarui untuk byte JSONL revisi termasuk LF terakhir. **Holdout disegel ulang sebelum ada run v2**, bukan akibat observasi hasil. Pastikan SHA raw-byte, manifest serta label lulus test.
- `scripts/gate-suite-manifest.json` kini menyertakan `tests/trivia-dedup-v2.test.ts` sebagai mandatory (**14 source, 15 MCP, 41 DB**) dan tetap mempertahankan semua gate G4, `baseSha` historis, dan fail-closed drift.
- Validator menolak v2-native `verified` tanpa envelope v1; evaluator mengharuskan mapping `case_id → fixture_identity_id → fact_public_id` dari **readback stack terisolasi** yang dicek lawan klaim/status/usage/provenance gold. `reference_identity_id` **tidak diterima** dari outcome. Event keputusan berisi aktor, tahap, target UUID, referensi bukti; `same` terhadap identity salah dan `distinct`/ `uncertain` yang diputuskan same dihitung salah gabung. Unit test bertanda `mock` bukan bukti DB.
- **Batas verifikasi:** mapping yang diisi oleh harness hanya dapat diverifikasi secara struktural oleh evaluator; otentikasi bahwa record benar-benar dibaca dari DB membutuhkan log run, trace readback, stack terisolasi dan review Codex. Input `mock` tidak boleh dicatat sebagai baseline nyata.
- **Oracle `complete` belum tersedia**: daftar kandidat wajib, limit/versi katalog dan perilaku truncation/host harus difinalkan pada **Read P2-T3** sebelum true/false dapat dievaluasi terhadap oracle. Corpus pasangan tunggal tidak membuktikan benar-tidaknya `complete`; P2-T2 hanya membekukan usulan kebijakan, tidak menyatakan angka hasil.
