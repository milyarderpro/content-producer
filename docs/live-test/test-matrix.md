# Matriks 33 MCP tools — Live Test & Fix

**Kampanye:** [#25](https://github.com/milyarderpro/content-producer/issues/25) · **Versi awal:** 21 Oktober 2026 · **Panduan:** [README](README.md) · **Hasil eksekusi:** [results.md](results.md).

**Status kampanye baru semuanya `NOT RUN`.** Ini tidak menyangkal bukti Phase 10 atau read-only inspection sebelumnya: PASS historis/CI harus dicatat sebagai referensi `HISTORICAL`/ `CI/FIXTURE`, bukan otomatis menjadi PASS pada pengujian ChatGPT baru.

Setiap LT dapat memiliki subkasus valid, invalid/expected-denial, retry dan concurrency. Untuk Write, `PASS LIVE` memerlukan izin spesifik, respons sukses yang sah dan verifikasi owner-scoped readback; untuk tool destruktif, keberhasilan fixture diberi label `PASS CI/FIXTURE`, tidak diberi label sukses LIVE.

## Master inventory

| ID     | Kelompok  | Tool                              | Akses | Metode uji                 | Hasil yang diharapkan                          | Status  |
| ------ | --------- | --------------------------------- | ----- | -------------------------- | ---------------------------------------------- | ------- |
| LT-001 | Koneksi   | get_account_profile               | Read  | Live                       | Profil owner muncul tanpa token                | NOT RUN |
| LT-002 | Koneksi   | get_workspace_context             | Read  | Live                       | Workspace/niche aktif terbaca                  | NOT RUN |
| LT-003 | Page      | list_pages                        | Read  | Live                       | List dua Page saat baseline; ID+slug           | NOT RUN |
| LT-004 | Page      | create_page                       | Write | Owner-approved test Page   | Tepat satu Page/config baru; readback          | NOT RUN |
| LT-005 | Page      | update_page                       | Write | Owner-approved test Page   | Hanya field diminta berubah; stale CAS ditolak | NOT RUN |
| LT-006 | Page      | get_page_generation_context       | Read  | Live                       | Config ID, CAS, allowed rules tersedia         | NOT RUN |
| LT-007 | Plan      | list_content_plans                | Read  | Live                       | Daftar plan sesuai filter                      | NOT RUN |
| LT-008 | Plan      | create_content_plan               | Write | Owner-approved test plan   | Plan dan item tepat; readback                  | NOT RUN |
| LT-009 | Plan      | get_content_plan                  | Read  | Live                       | Progress dan jadwal item konsisten             | NOT RUN |
| LT-010 | Plan      | claim_content_plan_items          | Write | Disposable plan            | Maksimal 3 claim dan lease valid               | NOT RUN |
| LT-011 | Plan      | renew_content_plan_claim          | Write | Disposable live claim      | Satu perpanjangan sah; renewal kedua ditolak   | NOT RUN |
| LT-012 | Plan      | report_content_plan_item_failure  | Write | Disposable live claim      | Gagal aman; detail error tersimpan             | NOT RUN |
| LT-013 | Plan      | retry_content_plan_item           | Write | Disposable failed item     | Failed kembali pending; riwayat tetap          | NOT RUN |
| LT-014 | Plan      | replace_discarded_plan_item       | Write | Fixture preferred          | Penggantian hanya discard sebelum publish      | NOT RUN |
| LT-015 | Plan      | cancel_content_plan               | Write | Disposable plan            | Hanya item tersisa batal, output selesai tetap | NOT RUN |
| LT-016 | Trivia    | trivia_find_similar_facts         | Read  | Live                       | Kandidat duplikat dan reuse terbaca            | NOT RUN |
| LT-017 | Trivia    | trivia_register_and_reserve_facts | Write | Approved new draft         | Reserve verified facts; token/ID valid         | NOT RUN |
| LT-018 | Trivia    | trivia_release_facts              | Write | Abandoned test reservation | Unused reservation dilepas; tak ganggu alokasi | NOT RUN |
| LT-019 | Trivia    | trivia_reverify_fact              | Write | Fixture preferred          | Evidence same-meaning diperbarui aman          | NOT RUN |
| LT-020 | Trivia    | trivia_correct_fact               | Write | Fixture only by default    | Invalidate/successor benar; posts terdampak    | NOT RUN |
| LT-021 | Post      | list_posts                        | Read  | Live                       | Status/filter/page match                       | NOT RUN |
| LT-022 | Post      | get_post                          | Read  | Live                       | Copy/checks/source/hash cocok                  | NOT RUN |
| LT-023 | Post      | save_post                         | Write | Approved new draft         | Draft persisted sekali; get_post cocok         | NOT RUN |
| LT-024 | Post      | revise_post                       | Write | Disposable draft           | CAS revision/hash; stale ditolak               | NOT RUN |
| LT-025 | Post      | reschedule_post                   | Write | Disposable draft           | Slot internal tepat; conflict aman             | NOT RUN |
| LT-026 | Post      | approve_post                      | Write | Explicit reviewed draft    | Approval exact hash; quality blocking          | NOT RUN |
| LT-027 | Post      | revoke_post_approval              | Write | Disposable ready draft     | Ready kembali draft; copy tetap                | NOT RUN |
| LT-028 | Post      | discard_post                      | Write | Disposable post only       | Discard terminal; allocations dilepas          | NOT RUN |
| LT-029 | Publikasi | mark_post_posted                  | Write | Fixture / real event only  | Hanya setelah publikasi manual nyata           | NOT RUN |
| LT-030 | Publikasi | archive_post                      | Write | Fixture / real posted only | Arsip setelah posted; sejarah dipertahankan    | NOT RUN |
| LT-031 | Performa  | record_post_performance           | Write | Fixture / real metric only | Snapshot hanya metrik nyata/fixture            | NOT RUN |
| LT-032 | Performa  | get_post_performance              | Read  | Expected denial on ready   | POST_NOT_PUBLISHED untuk post ready            | NOT RUN |
| LT-033 | Performa  | get_performance_insights          | Read  | Live empty-data case       | Tidak mengarang insight bila tanpa data        | NOT RUN |

## Alur end-to-end utama: kegagalan menyimpan draft

**LT-E2E-01 — Membuat satu draft baru dari ChatGPT**

- **Status awal:** `BLOCKED — NEEDS TRACE`. Sumber: laporan pemilik [#26](https://github.com/milyarderpro/content-producer/issues/26); tool yang benar-benar gagal **belum diketahui**. Jangan klaim `save_post` pasti bermasalah.
- **Langkah:** identitas owner → pilih Page yang disetujui → `get_page_generation_context` → riset/sumber kredibel → `trivia_find_similar_facts` → keputusan dedup → `trivia_register_and_reserve_facts` → periksa exact output/attestation → `save_post` → `get_post`.
- **PASS:** tepat satu draft baru tersimpan, `post_public_id`, `revision`, `content_hash`, evidence, quality checks, fact bindings dan status `draft` cocok dari hasil live tool dan readback. Tidak ada otomatis `ready` atau `posted`.
- **FAIL:** input valid dan telah diotorisasi tetapi tool gagal atau state tidak sesuai. Simpan trace yang disanitasi untuk menentukan lokasi gagal.
- **BLOCKED:** bukti error lama belum lengkap, izin write/data Page belum disetujui, atau source evidence tidak lolos policy.
- **Prioritas:** investigasi pertama setelah Read preflight. Retest harus memakai konten/fakta baru yang valid, bukan membuat duplikat/ulang write dengan key baru tanpa reconciliation.

## Rekap kampanye

| Indikator                   | Awal 21 Oktober 2026 |
| --------------------------- | -------------------- |
| Tool tersedia               | 33                   |
| PASS live baru              | 0                    |
| PASS CI/fixture kampanye    | 0                    |
| FAIL terkonfirmasi          | 0                    |
| BLOCKED (tool individual)   | 0                    |
| NOT RUN (tool individual)   | 33                   |
| Report perlu bukti tambahan | 1 — LT-E2E-01 / #26  |

**Setiap status baris akan berubah hanya setelah tes kampanye direview dan direkam.** Pastikan ringkasan dan [results.md](results.md) diselaraskan setiap kali ada bukti baru.