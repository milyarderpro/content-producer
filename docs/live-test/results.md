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

### LT-016-RETEST — 21 Oktober 2026 — PARTIAL (runtime PASS, host schema FAIL)

Pemilik menjalankan `get_account_profile` dan tepat tiga variasi READ
`trivia_find_similar_facts` pada chat baru dengan plugin PRIVATE
Content Producer / owner OAuth `mcpku2`. **C PASS** (unit `"count"`,
direction `"none"`, 5 matches, sinyal numeric 1), **B PASS**
(unit `null`, direction `"none"`, 5 matches, numeric 0;
unit null dipertahankan), dan **A PASS expected rejection**
(unit `"count"`, `comparison_direction` omitted).
A ditolak dengan pesan
`INVALID_ARGUMENT: Input validation error: Invalid arguments for tool trivia_find_similar_facts: candidates.0.qualifiers.comparison_direction: Invalid option`
yang merinci seluruh delapan nilai enum tertutup; bukan lagi
`VALIDATION_FAILED` generik dari SQL. Pemilik tidak melaporkan Write.

**Temuan yang masih FAIL:** definisi tool yang _terlihat oleh host_
tetap mengiklankan `comparison_direction?: string` (opsional,
bebas), bukan required enum. Bukti penolakan A konsisten dengan
validasi sebelum backend RPC, tetapi raw RPC/server trace
untuk membuktikan nihil pemanggilan backend belum tersedia.
Metadata plugin dan versi Edge tidak muncul di hasil Read.

**Verifikasi navigator independen:** melalui Plugin Creator, PRIVATE
plugin ID `plugins_6ad5bf91a278819182951ebb312eca06` memiliki release
aktif `pluginrel_6ad88fd9d5a88191b680e9416d649adf`,
**v0.2.3**, mengikat registered app yang sama dalam
`.app.json` (`asdk_app_6ad6ebeab5fc8191a1d2cd54b87cd96f`).
Source GitHub `trivia_fact.ts` telah memakai required closed enum.
Deklarasi connector yang tersedia pada sesi navigator sendiri
masih menunjukkan `comparison_direction?: string`, konsisten
dengan metadata host lama. [Dokumentasi OpenAI](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)
menjelaskan snapshot tool dan mekanisme refresh metadata yang tidak
selalu otomatis. **Belum dipastikan lapisan cache spesifiknya.**

**Keputusan:** LT-016 tetap **FAIL / PARTIAL retest** sampai
metadata tool pada koneksi `mcpku2` di-refresh, lalu pengguna
melihat field required enum di chat baru. Jangan buat plugin/koneksi
baru, jangan deploy ulang, jangan jalankan CI backend atau Write.
Detail: [Issue #29 komentar retest](https://github.com/milyarderpro/content-producer/issues/29#issuecomment-6313695477).
**Issue #26** tetap `NEEDS TRACE`; sebab draft gagal sebelumnya
belum terhubung secara pasti ke kasus ini.

### LT-016-SCHEMA-REFRESH — 21 Oktober 2026 — FINAL PASS LIVE (owner-reported)

Setelah pemilik menjalankan **Refresh** pada koneksi registered app `mcpku2`
yang sudah ada (tanpa membuat koneksi atau plugin baru), satu **chat
ChatGPT baru** dengan definisi tool sesi itu mengonfirmasi bahwa
`mcp__mcpku2__trivia_find_similar_facts` mengiklankan
`qualifiers.comparison_direction` sebagai field **REQUIRED**
(tanpa `?`) dan enum tertutup berisi delapan nilai:
`increase`, `decrease`, `greater_than`, `less_than`,
`at_least`, `at_most`, `equal`, `none`. Deskripsi yang terlihat
adalah `Find duplicate fact candidates and reuse limits; semantic
identity requires your review.` Tidak ada tool yang dieksekusi
pada sesi schema-only ini. Bukti: **signature yang dikutip oleh pemilik
dari definisi sesi**, bukan raw katalog server yang direkam independen.

Digabung dengan **LT-016-RETEST sebelumnya** pada plugin PRIVATE
`mcpku2`: varian C dan B masing-masing **SUCCESS** (5 matches),
`numbers.unit=null` dipertahankan, dan varian A tanpa
`comparison_direction` menerima **expected MCP input-validation
rejection** yang menyebut enum; bukan lagi SQL `VALIDATION_FAILED`.
Pada retest terdahulu schema host masih optional/free-string; ini
**bukti historis kondisi sebelum refresh**, bukan status terkini.

Verifikasi terpisah oleh navigator melalui Plugin Creator menyatakan
PRIVATE plugin yang sama sudah v0.2.3, release
`pluginrel_6ad88fd9d5a88191b680e9416d649adf` dan registered app
tetap sama. Edge `mcp` v32 dan bundle SHA adalah bukti rollout
implementer di [Issue #29](https://github.com/milyarderpro/content-producer/issues/29),
bukan pembacaan Edge saat sesi schema-only.

**Final verdict LT-016: PASS LIVE**, berdasarkan gabungan bukti
perilaku runtime owner-reported, rejection negatif, deklarasi host
required enum setelah refresh, fix PR #31 dan CI fokus yang lulus.
**Batas:** tidak ada trace RPC backend untuk kasus negatif; tes
MCP terisolasi di CI menegakkan tidak diteruskannya payload invalid,
sementara pesan live mengindikasikan validasi sebelum RPC. Tidak ada
business Write pada tes-tes ini. Tidak mengeklaim bahwa versi plugin
atau Edge dapat dibuktikan dari schema-only session.

**Status kampanye:** 11 Read tool PASS / 0 FAIL / 22 Write NOT RUN.
[Issue #29](https://github.com/milyarderpro/content-producer/issues/29)
boleh ditutup sebagai perbaikan dan retest yang terbukti menurut
batas di atas. [Issue #26](https://github.com/milyarderpro/content-producer/issues/26)
tetap `NEEDS TRACE` untuk alur pembuatan draft dan tidak dianggap
otomatis terselesaikan.

### LT-E2E-01 — trace percobaan lama ditemukan (21 Oktober 2026)

Pemilik kembali ke chat percobaan draft sebelumnya dan mengirim
ringkasan pemanggilan MCP yang terjadi: `get_page_generation_context`
**SUCCESS**, `get_post` **SUCCESS**, dan
`trivia_find_similar_facts` **FAIL `VALIDATION_FAILED` sebanyak
empat percobaan**. Tool `trivia_register_and_reserve_facts` serta
`save_post` **tidak dipanggil**. Tidak ada draft tersimpan, menurut
ringkasan tersebut.

**Diagnosis yang diperbarui:** proses lama terhenti pada tahap
pencarian duplikasi yang bersifat Read, **bukan pada penyimpanan
`save_post`**. Gejala dan tool yang gagal konsisten dengan
LT-016 / [Issue #29](https://github.com/milyarderpro/content-producer/issues/29)
yang sudah diselesaikan, tetapi payload persis keempat request lama
tidak tersedia. Oleh sebab itu kesamaan penyebab `comparison_direction`
hanya **hipotesis sangat mungkin**, bukan bukti forensik.

**LT-016** sudah PASS di runtime dan katalog baru, namun **LT-E2E-01
belum PASS**: jalur `trivia_register_and_reserve_facts → save_post →
get_post` belum dicoba ulang setelah perbaikan. Status
`BLOCKED — AWAITING OWNER-APPROVED E2E WRITE SCOPE`: minta
Page disposable yang disetujui, serta tinjauan fakta/sumber dan payload
tepat untuk reservasi lalu penyimpanan satu draft. Tidak ada izin Write
yang tersirat dari laporan error ini. [Issue #26](https://github.com/milyarderpro/content-producer/issues/26)
tetap OPEN.

## Laporan sebelum kampanye

| ID        | Tanggal dilaporkan | Gejala pengguna                              | Bukti saat ini                                                                                    | Tindakan                                                                                                                      | Status                      |
| --------- | ------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| LT-E2E-01 | 21 Okt 2026        | Draft creation terhenti sebelum reserve/save | Ringkasan lama: `trivia_find_similar_facts` gagal `VALIDATION_FAILED` 4×; reserve/save NOT CALLED | [#26](https://github.com/milyarderpro/content-producer/issues/26) — pastikan Page uji dan payload Write disetujui sebelum E2E | BLOCKED — AWAITING APPROVAL |

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

### LT-E2E-01 — fixture direkonstruksi, Write tetap BLOCKED (21 Oktober 2026)

File lama `lt_e2e_01_elephant_prewrite_preview.json` hanya dilaporkan sebagai lampiran percakapan sebelumnya; salinan yang dapat dibaca belum ditemukan dalam tree repository, pencarian nama, file percakapan/Project yang tersedia atau artifact run ringan yang diperiksa. **Tidak dipulihkan.** [Fixture pengganti](fixtures/lt-e2e-01-elephant-source-pack.json) dengan penanda `VERIFIED_RECONSTRUCTION_NOT_ORIGINAL` memuat tujuh kandidat, sumber penelitian primer (F1–F7), copy English dan pembatasan studi; F6 mempertahankan kata-kata canonical dan Canva yang disetujui pemilik pada [Issue #26](https://github.com/milyarderpro/content-producer/issues/26#issuecomment-6315832321). Semua relasi berada dalam allowlist SQL v1 dan arah perbandingan `none` sesuai kontrak.

Bukti dedup yang dapat dikutip: **6/6 Read owner-reported + 1/1 Read navigator** berhasil; 35 hasil Moon top-five `numeric`-only dinilai bukan duplikat semantik. Ini bukan pemeriksaan menyeluruh ataupun snapshot dedup saat Write. Sumber `published_at`/`updated_at` yang tanggal pastinya tak diketahui tetap `null`; tanggal akses dan koreksi artikel F4 dicatat terpisah. Belum ada reservasi, `save_post` atau readback draft baru; field runtime (CAS, operation key, reservation token, expiry, fact/post IDs) sengaja tidak disimpan.

**Outcome E2E: BLOCKED / belum ada PASS draft.** Berikutnya hanya setelah pekerjaan pemulihan fixture ini ditinjau: buka fixture dari repository dalam chat baru, jalankan Read preflight terbaru, cek budget renderer, review tepat satu draft dan izin produksi per Write sebelum eksekusi. Tidak ada Write, deploy, full CI atau perubahan backend pada tugas fixture ini. Referensi: [Issue #26](https://github.com/milyarderpro/content-producer/issues/26).
