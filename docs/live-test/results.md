# Log hasil — Content Producer Live Test & Fix

**Kampanye:** [Issue #25](https://github.com/milyarderpro/content-producer/issues/25) · **Matriks:** [test-matrix.md](test-matrix.md) · **Workflow:** [README.md](README.md).

Dokumen ini adalah **log ringkas hasil kampanye baru**, bukan duplikasi seluruh trace chat. Simpan bukti yang telah disanitasi, tool input/output yang relevan dan tautan diskusi di GitHub Issue; jangan menyimpan akses token, OAuth client secret, reservation token atau kredensial.

## Hasil yang telah dinilai

### LT-READ-A — 21 Oktober 2026 — 5 PASS LIVE (owner-reported)

Pemilik menjalankan pengujian di chat ChatGPT baru dengan PRIVATE Content Producer dan owner OAuth `mcpku2`, kemudian mengirim laporan lima pemanggilan MCP nyata berurutan. **Reviewer menerima kelima tool sebagai PASS dalam cakupan Read dasar yang diminta.** Bukti berupa **laporan hasil yang diteruskan pemilik**, bukan raw invocation trace independen, CI, atau screenshot langsung. Ringkasan disimpan pada [Issue #25, komentar LT-READ-A](https://github.com/milyarderpro/content-producer/issues/25#issuecomment-6312425727). Tidak ada error maupun Write yang dilaporkan.

| Test ID | Tool                          | Verdict   | Actual, menurut laporan owner                                         |
| ------- | ----------------------------- | --------- | --------------------------------------------------------------------- |
| LT-001  | `get_account_profile`         | PASS LIVE | Owner admin / Content Producer terbaca tanpa error                    |
| LT-002  | `get_workspace_context`       | PASS LIVE | Workspace owner; module trivia v1; 2 Page aktif, default status draft |
| LT-003  | `list_pages`                  | PASS LIVE | `corious-facts` dan `phase-9-5-pilot-trivia`, dua Page aktif          |
| LT-006  | `get_page_generation_context` | PASS LIVE | Config ID tersedia, policy/aturan lengkap; eligible verified facts 0  |
| LT-021  | `list_posts`                  | PASS LIVE | 1 post Moon `ready`, revisi 3, quality passed; tidak ada draft lain   |

**Catatan batas bukti:** `eligible_fact_count=0` dan performance signals kosong bukan bukti bug; keduanya hanya keadaan yang dilaporkan. Tidak ada bukti revisi konfigurasi/CAS terpisah yang disalin ke laporan ini. `list_posts` hanya membuktikan satu post pada saat tes, **tidak mengidentifikasi alasan draft baru sebelumnya gagal tersimpan** (Issue #26). Tidak dilakukan Write, retry, reservasi, pembuatan atau publikasi.

**Rekap setelah LT-READ-A:** 5 PASS LIVE owner-reported, 28 NOT RUN, tanpa Write. LT-READ-B dicatat terpisah di bawah; total kampanye setelah dua sesi adalah 10 PASS / 1 FAIL / 22 NOT RUN.

### LT-READ-B — 21 Oktober 2026 — 5 PASS / 1 FAIL LIVE (owner-reported)

Pemilik menjalankan **enam tool Read** lewat PRIVATE Content Producer pada koneksi owner OAuth `mcpku2` di chat baru. Seluruh enam tool terpanggil; **nol Write**. Bukti yang tersedia adalah laporan yang diteruskan pengguna berisi parameter dan error aktual, bukan raw server trace independen. Temuan terperinci dicatat di [Issue #29](https://github.com/milyarderpro/content-producer/issues/29); campaign [Issue #25](https://github.com/milyarderpro/content-producer/issues/25).

| Test ID | Tool                        | Verdict                 | Actual                                                                                                                                              |
| ------- | --------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| LT-007  | `list_content_plans`        | PASS LIVE               | 1 plan `08c75cc2-c123-4471-852a-4c159f26f22e`, pending, 3 item                                                                                      |
| LT-009  | `get_content_plan`          | PASS LIVE               | 3/3 pending; 22/24/26 Oktober 2026 pukul 21 WIB; 0 claim/attempt                                                                                    |
| LT-022  | `get_post`                  | PASS LIVE               | Moon post ready rev 3; 7 allocated, verified facts, 3 NASA URLs; 19/19 system dan 18/18 editorial checks, approved hash cocok                       |
| LT-016  | `trivia_find_similar_facts` | **FAIL — needs triage** | MCP `INVALID_ARGUMENT` / SQL `VALIDATION_FAILED` pada satu calon fakta dengan `numbers.unit:null` dan `qualifiers:{negated:false}`; tidak ada match |
| LT-032  | `get_post_performance`      | PASS — EXPECTED DENIAL  | `POST_NOT_PUBLISHED` untuk post ready, bukan published; penolakan sesuai kontrak                                                                    |
| LT-033  | `get_performance_insights`  | PASS — EMPTY VALID DATA | `eligible_post_count=0`, `excluded_post_count=1` karena `not_published`, `groups=[]`; tidak ada metrik direkayasa                                   |

**Analisis LT-016:** Payload yang dilaporkan kelihatan cocok dengan `candidate` Zod/`findInput` di `supabase/functions/mcp/trivia_fact.ts`, tetapi backend menggunakan validator kanonis tambahan `internal.trivia_candidate_v1` yang memanggil `trivia_canonical_numbers_v2` dan `trivia_canonical_qualifiers_v3`. Fixture sukses `supabase/tests/database/helpers/trivia-rpc.ts` memakai `unit:"count"` dan `comparison_direction:"none"`. Belum dipastikan aturan mana yang menolak; **ini kegagalan pada input uji live, bukan akar masalah backend terverifikasi**. [Issue #29](https://github.com/milyarderpro/content-producer/issues/29) meminta uji perbedaan input terisolasi dan perbaikan kontrak atau petunjuk penggunaan bila terbukti.

**Konsekuensi:** seluruh **11 Read tools telah dieksekusi sekurangnya sekali** dalam kampanye; **10 PASS (termasuk expected-denial) / 1 FAIL yang sedang ditriase**, dan 22 Write tools belum diuji kampanye ini. Laporan draft gagal tersimpan [Issue #26](https://github.com/milyarderpro/content-producer/issues/26) belum memiliki trace lama yang mengidentifikasi titik gagal dan tidak otomatis disamakan dengan `LT-016`.

### LT-016-DIAG — 21 Oktober 2026 — diagnosis selesai; fix/retest masih PENDING

Pemilik menjalankan tepat tiga panggilan **READ** `trivia_find_similar_facts`
dengan klaim Moon yang sama:

| Varian | Unit      | comparison_direction | Hasil                 | Match |
| ------ | --------- | -------------------- | --------------------- | ----- |
| C      | `"count"` | `"none"`             | **SUCCESS**           | 5     |
| A      | `"count"` | **dihilangkan**      | **VALIDATION_FAILED** | —     |
| B      | `null`    | `"none"`             | **SUCCESS**           | 5     |

Perbedaan sinyal angka: unit `"count"` memperoleh
`score_components.numeric=1`, sedangkan unit `null` memperoleh `0`
pada match pertama. Walaupun lima ID hasil cocok, **nilai unit bukan
normalisasi kosmetik**, jangan mengubahnya secara otomatis.

**Root cause confirmed from repository source:**
`internal.trivia_canonical_qualifiers_v3` di migration
`20261009113820_finalize_batch_a_contract_remediation.sql` memerlukan key
`comparison_direction`. Sementara itu input schema MCP
`supabase/functions/mcp/trivia_fact.ts` menerimanya sebagai opsional;
`plans/tool-inventory.md` masih belum merefleksikan
[CR-005](../decisions/2026-10-09-comparison-direction-candidate-contract.md)
yang telah menerima enum wajib. **Tidak ada alasan melonggarkan SQL validator.**

**Issue:** [#29](https://github.com/milyarderpro/content-producer/issues/29).
**Outcome tool tetap:** LT-016 **FAIL live** sampai MCP/package sesuai kontrak,
perubahan dirilis, dan **retest live** berhasil.
**LT-E2E-01:** #26 tetap `NEEDS TRACE`; kegagalan historis menyimpan draft
belum terbukti merupakan error yang sama. Semua pengujian ini READ-only.

## Laporan sebelum kampanye

| ID        | Tanggal dilaporkan | Gejala pengguna                                                                    | Bukti saat ini                                                                  | Tindakan                                                                                                                      | Status                |
| --------- | ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| LT-E2E-01 | 21 Okt 2026        | Draft baru tidak berhasil disimpan melalui plugin ChatGPT; ada tool MCP yang gagal | Laporan pengguna; belum ada nama tool/payload/error/readback dari percobaan itu | [#26](https://github.com/milyarderpro/content-producer/issues/26) — kumpulkan trace dan diagnosa, jangan langsung write ulang | BLOCKED — NEEDS TRACE |

## Template record satu pengujian (salin untuk setiap kasus)

```text
ID:
Tanggal & sesi ChatGPT:
Plugin / koneksi: PRIVATE Content Producer / owner OAuth mcpku2
Target & precondition (Page/post/plan; redacted bila perlu):
Prompt asli:
Tool invoked + urutan:
Aksi Write yang disetujui (jika ada):
Expected:
Actual:
Error code / message:
Readback/state:
Outcome: PASS | FAIL | BLOCKED | NOT RUN
Evidence: link Issue/comment + sanitized trace
Severity & suspected component (jika FAIL; label hipotesis):
Fix issue:
Fix PR / SHA / GitHub Actions run:
Retest evidence / result:
Residual risk:
```

## Cara menyimpulkan verdict

- **PASS:** output sesuai ekspektasi dan bukti cukup. Untuk Write, harus ada state readback; untuk expected-denial, server menolak dengan benar serta tidak ada perubahan state yang tidak diminta.
- **FAIL:** deviasi nyata didukung trace, hasil readback atau replay terisolasi yang tepat. Jangan menyebut 33 tool gagal hanya dari satu workflow.
- **BLOCKED:** operasi tidak aman/tidak diizinkan, data belum tersedia, error tidak bisa diatribusi ke tool, atau trace hilang.
- **NOT RUN:** belum dieksekusi. Riwayat Phase 10 tidak menggantikan eksekusi kampanye baru.
- **`FIXED` bukan verdict tool:** hanya boleh dicantumkan pada Issue bug setelah patch, Actions dan retest sukses; tuliskan jenis bukti LIVE atau CI/FIXTURE dengan jujur.

## Handoff

Kumpulkan masalah dan link perbaikan pada [Issue #25](https://github.com/milyarderpro/content-producer/issues/25). Setiap masalah terpisah memakai Issue khusus, seperti [#26](https://github.com/milyarderpro/content-producer/issues/26). Implementer membuat PR yang terhubung ke Issue, tidak menyalin seluruh chat ke source code.
