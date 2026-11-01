# P2-T2 — Baseline dan usulan ambang dedup v2 (revisi koordinator)

**Checkpoint:** `main@0cd17c63d3b14569d2ebe00150f4e3dbf7171019`; perubahan pada branch PR #115. 1 November 2026, sebelum retrieval v2 P3-T3. Corpus v2 dibekukan setelah review: **93** kasus, development **60**, holdout **33**. Hash raw-byte holdout berada di `holdout.sha256`; dataset tidak pernah dinilai terhadap hasil v2 saat label/ambang ini disusun.

## Tiga bukti yang berbeda

| Baseline | Status | Bukti dan keterbatasan |
| --- | --- | --- |
| **HISTORICAL v1** | **HISTORICAL PASS (dilaporkan)** | `dedup-v1/evaluation-report-v1.json` checkpoint `phase-4.7`: 150 pasangan (105 development / 45 holdout), candidate recall@20 = **1**, false auto merge = 0; `supabase/tests/database/trivia-candidate-retrieval.test.ts`. Memakai ontology dan evidence v1, label `ai_reviewed`, kandidat capped 20. **Bukan** baseline kalimat v2. |
| **CURRENT v1 pada corpus baru** | **NOT RUN** | Hanya V2-007, 008, 021, 022, 031, 032 (6 legacy) **potentially comparable** setelah input ontology, paket evidence dan status v1 dibuktikan sah. Status sekarang **not comparable / NOT RUN** untuk keenamnya sampai validasi. Semua 87 native tidak boleh diberi ontology palsu atau diikutkan dalam denominator v1. |
| **v2** | **NOT RUN** | `trivia_find_similar_facts_v2` dan Read P3-T3 belum ada; tidak ada run database, retrieval, host, LIVE atau oracle `complete`. Test fixture dan MOCK rumus bukan data retrieval. |

## Dataset dan kontrak evaluator

Corpus mengandung **40 parafrasa** (25 development / 15 holdout), **40 hard negatives** (27 / 13), 18 `same` dengan status historis negatif (masing-masing 6 `invalidated`, 6 `superseded`, 6 `rejected`), 6 alias/unit, 3 exact, 4 uncertain. Keseluruhan **49 same, 40 distinct, 4 uncertain**. 87 native tanpa envelope v1 mulai `needs_review` atau negative correction status; 6 legacy status fixture `verified` butuh **evidence v1 nyata** bila kelak disuntik ke DB. V2-036 sengaja ambigu referen kapal yang tidak disebut identitasnya, bukan membandingkan sail dengan flag.

`evaluateRetrieval` menerima **corpus frozen** dan **outcomes per case**, dengan **mapping readback yang terpisah dari outcome**. Tiap `IdentityReadback` mengikat `case_id`, `fixture_identity_id`, `fact_public_id` UUID, claim/status/usage/origin hasil readback dan referensi bukti. Validator mencocokkan dengan gold dan menolak ID arbitrer di outcome. Mapping **tidak bisa terbukti otentik** hanya dari TypeScript; untuk status `isolated_db` operator wajib melampirkan actual DB seed/readback trace dan cleanup. `evidence_kind='mock'` selalu diberi label **MOCK**. Missing mapping menghasilkan **NOT RUN**; mapping rusak hard error; missing outcome pada run evaluated hard error.

`identity_decision` adalah event keputusan sungguhan `decision_event`: aktor (`chatgpt`/`backend`/`reviewer`), tahap (`read_review`, `save_resolution`, `revise_resolution`, `registration`), target `fact_public_id` saat keputusan `same`, dan `evidence_ref`. `none` berarti jejak menangkap tidak adanya keputusan; `decision_capture='unavailable'` berarti metrik salah-gabung **NOT RUN**, **bukan nol**. Tidak boleh menyebut `same` otomatis jika hanya kandidat muncul di Read.

- **Recall@K** = kasus `same` dengan **reference canonical fact_public_id** hasil mapping readback terlihat pada peringkat <= K / semua `same` yang dievaluasi. `complete=false` tidak dibuang dari penyebut, tetapi dilaporkan terpisah bersama miss ID.
- **False merge** = jumlah kasus dengan keputusan nyata `same` terhadap target salah: (`distinct` atau `uncertain` yang diputus same) **atau** (`same` yang diarahkan ke ID selain gold canonical) / jumlah kasus dengan **event keputusan nyata** yang ditangkap, termasuk same/distinct/uncertain. Laporan menyertakan `distinct_false_merge` / seluruh distinct yang benar-benar direview dan `wrong_target_merge` / seluruh same yang benar-benar direview. Jika tidak ada event keputusan yang ditangkap pada kelompok, hasilnya **NOT RUN**, bukan 0. Daftar ID kasus false merge/wrong target selalu ditampilkan.
- **Distinct candidate visible** adalah indikator Read saja, tidak dianggap false merge. `uncertain` dan `incomplete` tetap breakdown terpisah per split/kategori/asal/status.
- **HANYA MOCK TEST:** recall@2 **2/3**, satu distinct diputus `same` (false merge **1/1**), satu incomplete. Test tambahan mengarahkan positive `same` ke ID salah dan harus menghitungnya sebagai false merge. Ini unit rumus, bukan kualitas retrieval v2.

## Ambang — PROPOSED, menunggu penerimaan pemilik (belum berlaku)

| Sinyal | Usulan pra-P3-T3 | Dasar/batas |
| --- | --- | --- |
| Recall@20 parafrasa | **>=95%** dari 40 cases (**>=38/40** total), laporkan 25 development / 15 holdout terpisah. Jangan tuning dengan holdout | 40 parafrasa (sebelumnya 9) sengaja ditambah sebelum outcome v2. Sampel kecil terhadap keragaman topik nyata; bukan jaminan semantik 100%. |
| False identity merge | **0** keputusan salah terhadap semua event `same` yang direkam; nol hanya boleh diklaim bila trace lengkap + ada keputusan nyata. `distinct_false_merge` dan `wrong_target_merge` terpisah | 40 hard negatives (sebelumnya 14), termasuk perubahan angka, negasi, relasi, waktu, populasi, lokasi dan kondisi. Ada risiko blind spot di luar corpus, jadi diperlukan review kualitatif. |
| Negative-history visibility dan eligibility | **18/18** `same` negatif terlihat dengan ID/status/usage pada Read lengkap; **0** eligible reuse, tidak membuat ID pengelak | Enam contoh per status negatif; ini kemampuan desain yang **NOT RUN** sampai registry/Read baru. |
| `complete` truthfulness | **100% benar relatif terhadap oracle** (tidak ada false-clean); **tidak dapat diukur di P2-T2** | **BLOCKED pada kontrak Read P2-T3**: aturan kandidat wajib, limit response, versi katalog, truncated output/host-visible incomplete belum dibekukan. Setelah T2 diterima, siapkan >=10 skenario cap/truncation beserta oracle final pada T3 **sebelum** menguji P3-T3. Jangan mengarang oracle sekarang. |

Angka 95%, 0 dan 100% masih **PROPOSED**, bukan target otomatis dari v1 atau acceptance yang sudah terjadi. Label gold dibekukan sebelum output v2; perubahan berikutnya butuh versi fixture dan review terpisah. Jika 40 contoh belum memenuhi ambang kepercayaan pemilik, tambahkan kasus dan hash baru **sebelum** outcome v2 diamati, bukan mengubah expected sesudahnya.

## Handoff Codex PC lokal — tidak dijalankan di PR ini

1. Rekam exact head commit `git rev-parse HEAD`, versi Node, pnpm dan `pnpm exec supabase --version` (pin `supabase@2.120.0` pada `package.json`, versi runtime belum diverifikasi), serta DB stack **benar-benar terisolasi**. Periksa keamanan/izin lokal sebelum seed. Jangan sentuh production.
2. Jalankan `pnpm install --frozen-lockfile`, `pnpm exec vitest run tests/trivia-dedup-v2.test.ts`, `pnpm run check`, catat exit code, durasi, jumlah test dan exact SHA. Baseline `tests/foundation.test.ts` yang bergantung versi Node dilacak **terpisah di Issue #114**; jangan diperbaiki dalam PR ini.
3. Baru setelah kontrak Read P2-T3 dan harness v2 tersedia, buat workspace/owner dummy terisolasi; seed/map `case_id → fixture_identity_id → fact_public_id`; **read back actual DB facts** beserta claim/status/usage/provenance dan trace untuk setiap kasus. V2-native tidak boleh disulap menjadi verified v1; legacy hanya jika paket ontology/evidence v1 sungguh sah. Semua fixture dibersihkan dalam `finally`, audit before/after dan error fail-closed.
4. Simpan `identity_readbacks` dan `outcomes` **di luar fixture gold** pada `artifacts/dedup-v2/<run-id>/`. Rekam `run_id`, SHA backend, versi stack, `limit_k`, `complete`, kandidat terurut, referensi ID, aktor/tahap/target dan `evidence_ref` setiap keputusan nyata. Identitas owner, credential, token dan isi privat harus disanitasi. Lampirkan readback evidence yang dapat diverifikasi koordinator, SHA, cleanup, numerator/denominator, ID miss/wrong target/false merge/incomplete.
5. Bila tidak ada keputusan untuk dilacak, `decision_capture='unavailable'`, false merge **NOT RUN**. Bila tidak ada mapping DB, seluruh evaluasi **NOT RUN**. Read `complete` belum boleh dianggap benar sampai P2-T3 mendefinisikan oracle. Jangan mengklaim G4, host/LIVE, atau database PASS dari fixture.

## CI / gate

`scripts/gate-suite-manifest.json` sekarang **14 source mandatory / 15 MCP / 41 DB**; tidak ada pengurangan, skip atau perubahan `baseSha` historis. Riwayat sebelum revisi: [Actions #41279912287](https://github.com/milyarderpro/content-producer/actions/runs/41279912287) exact `ec11792fc...` FAIL pada manifest drift serta Node foundation lama. Run `main@0cd17c63...` [#41278659728](https://github.com/milyarderpro/content-producer/actions/runs/41278659728) juga FAIL karena pin Node; Issue **#114** memisahkan perbaikannya. Estimasi light CI sesudah push 1–3 menit dari riwayat, G4 tidak ditrigger pada P2-T2. Status final revisi harus diambil dari Actions exact head dan tidak diasumsikan PASS karena focused unit test lulus.
