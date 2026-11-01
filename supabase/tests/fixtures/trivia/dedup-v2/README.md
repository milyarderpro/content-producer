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

`case_id` dan `reference.fixture_identity_id` stabil tetapi **bukan UUID fakta DB**. `identity_status` dan `usage` adalah keadaan fiktif, bukan data pemilik. `evidence_expired_only=true` hanya pada legacy v1 status verified: riset URL baru dan cek reuse tetap perlu saat implementasi; status koreksi negatif tetap history hint **tidak eligible**, walaupun label `same`. Field `verified` contoh legacy **tidak** memasok evidence v1 untuk insert DB. URL atau subjek sama tidak cukup untuk merge. `distinct` mewajibkan `material_difference`; `uncertain` bukan `distinct` otomatis.

**Provenance v1 yang benar-benar diadaptasi:** `ai-dedup-v1-curious_mind-post-011-11` (V2-007/008), `post-007-7` (V2-021), `post-008-8` (V2-022), `post-003-3` (V2-031), dan `post-002-2` (V2-032), dengan prefix ID lengkap sama seperti contoh pertama. Referensi kalimat diambil dari gold v1; query baru ditulis ulang atau dibalik makna. Itu **bukan** verifikasi klaim yang pernah beredar di dataset `dataset-reference/post-*.txt`.

**Audit contoh yang ditolak sebagai parafrasa:** `ai-dedup-v1-curious_mind-post-001-1` sampai `post-016-16` (16 ID berurutan; bentuk lengkap mengikuti prefix v1), semua pasangan exact pada potongan yang diinspeksi hanya berubah tanda titik/seru. Sebagian klaim referensi dipakai ulang untuk kasus baru di atas, tetapi **label punctuation v1 tidak disalin**. Sisa 134 pasangan v1 tidak dipakai dan belum diaudit satu per satu. Tidak mengisi kuota 150 tanpa audit.

Korpus terbagi menjadi `24` development dan `12` holdout; breakdown label/kategori/asal/status/usage ada di manifest. Holdout dibekukan sebelum evaluator menyaksikan output retrieval. Perhitungan checksum memakai byte file secara langsung dengan newline terakhir:

```sh
sha256sum supabase/tests/fixtures/trivia/dedup-v2/holdout.v1.jsonl
cat supabase/tests/fixtures/trivia/dedup-v2/holdout.sha256
pnpm exec vitest run tests/trivia-dedup-v2.test.ts
```

Validasi fixture bukan pengujian RPC, kemampuan DB, atau kualitas fakta historis.
