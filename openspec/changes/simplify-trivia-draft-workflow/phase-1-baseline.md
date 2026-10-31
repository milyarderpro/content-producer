# P1-T1 — Baseline dan inventaris dependensi

**Tanggal:** 31 Oktober 2026. **Change:** `simplify-trivia-draft-workflow`.
**Source yang diperiksa:** `3b385a679770e20c5ba193b470874a35c08b786a`.
Working tree bersih saat pemeriksaan dimulai. Dokumen ini merupakan inventaris
source dan rekonsiliasi bukti yang tersedia, bukan audit live baru atau izin
mengubah data production.

## 1. Cara membaca bukti

- **SOURCE:** pembacaan file/riwayat Git pada SHA di atas. Ini dapat membuktikan
  isi kandidat source, bukan deployment atau instalasi aktif.
- **HISTORICAL:** record sebelumnya yang ditautkan, dengan tanggal dan batas
  bukti aslinya. Hasil itu tidak diberi ulang sebagai PASS LIVE sesi ini.
- **NOT RUN:** pemeriksaan runtime, database production, atau host yang tidak
  dilakukan dalam sesi ini. Nilai yang tidak diketahui bukan nol.

Tidak ada hosted OAuth, tool bisnis, query database, deployment, packaging,
reset, atau mutasi production dalam pemeriksaan ini. Dua percobaan membaca Issue
#26 dan daftar release melalui `gh` tidak berjalan karena executable tidak
tersedia (`command not found`). Tidak ada akses remote yang berhasil dari
percobaan tersebut, dan tidak dicoba bypass menggunakan credential lain.

## 2. Source, runtime, dan plugin

### Source yang teramati

- HEAD lokal: `3b385a679770e20c5ba193b470874a35c08b786a`.
- Manifest [plugin](../../../plugin/plugin.json): **0.2.11**. Ini kandidat source.
- [Server MCP](../../../supabase/functions/mcp/server.ts) mendeklarasikan
  `content-producer-mcp` versi **0.1.0**. Versi service ini berbeda dari nomor
  deployment Edge dan versi plugin.
- Ada **72 migration source tracked**, dihitung dengan
  `git ls-files "supabase/migrations/*.sql" | wc -l`; file terbaru menurut nama
  adalah `20261027075748_relax_trivia_visual_limit_and_dedup_diagnostics.sql`.
  Hitungan ini bukan applied history database.
- Commit terakhir yang menyentuh path `plugin/` adalah
  `bd59bc21f6dd17db4c84b4c768adcdf38dc52265`, 28 Oktober 2026, untuk targeted
  dedup READ recovery. Commit terakhir pada path `supabase/` adalah
  `ca4a1483542490f177492252232c0ebac236acb5`, 30 Oktober 2026, untuk query test
  lokal. Keduanya provenance path, **bukan exact SHA deployment**.
- [Registry](../../../supabase/functions/mcp/registry.ts) memasang 11 kelompok
  handler. [Inventaris kontrak](../../../docs/tool-contracts.md#3-daftar-33-tool)
  memetakan **33 tool: 11 Read dan 22 Write**. Belum ada tiga tool v2 pada
  konstanta registry kelompok yang diinventarisasi.

### Rekonsiliasi record yang berbeda

- [Operations §1](../../../docs/operations.md#1-satu-ringkasan-versi-dengan-sumber-bukti-yang-jelas)
  masih merangkum kandidat plugin 0.2.7 dan konfirmasi pemasangan 0.2.6.
  [README plugin](../../../plugin/README.md) menyebut kandidat 0.2.11 dan
  pemasangan terakhir yang dikonfirmasi sebelum kandidat itu 0.2.10. Record lebih
  baru tersebut dicatat sebagai konfirmasi historis, bukan bukti release ID/hash
  atau plugin aktif yang dibaca langsung pada sesi ini. Ringkasan lama tidak
  dipakai untuk menyatakan runtime sekarang masih 0.2.6.
- Operations mencatat Edge v33 dan 70 migration production dari rollout CR-049;
  71 migration source pada baseline CR-050. Source sekarang mempunyai 72 file.
  Ini perbedaan baseline bukti, **bukan bukti drift production**. Versi Edge,
  bundle SHA, applied history, dan drift saat ini **NOT RUN**.
- [Uji hummingbirds 28 Oktober](../../../docs/live-test/editorial/runs/DNA-SSF-02-v029-01.md)
  melaporkan satu reservasi, satu `save_post`, dan readback draft v1 berhasil;
  versi runtime sesi tersebut tetap `UNVERIFIED`. Ini bukti kasus historis, bukan
  uji v2 atau pembuktian semua kegagalan draft telah diperbaiki.
- [Log kampanye lama](../../../docs/live-test/results.md) tetap menyatakan
  LT-E2E-01/#26 berhenti di dedup Read, reserve/save tidak terpanggil, dan retest
  draft pada record itu BLOCKED. Bukti editorial kemudian tidak menulis ulang
  verdict kasus lama maupun membuktikan akar sebabnya identik.
- Frontend dan konfigurasi hosting aktif tidak dibaca ulang. Source
  `auth-frontend/` serta deployment historis tidak membuktikan versi live.

**Batas verifikasi:** identitas/bundle deployment terkini, applied migration
history, release ID/hash plugin aktif, seluruh instalasi plugin lama, dan
statistik penggunaan versi plugin masih belum terverifikasi langsung.

## 3. Inventaris data v1 dan kebutuhan pemetaan

Inventaris model mengikuti [domain](../../../docs/domain.md) dan migration;
tidak menyatakan jumlah record production sekarang.

- Core: `workspaces`, `niches`, `pages`, `page_niche_configs`, `content_plans`,
  `content_plan_items`, `posts`, dan `post_metrics`.
- Trivia: `trivia_facts` dan `trivia_post_facts`. Fakta mempunyai identity/hash,
  ontologi, sumber/freshness/status, serta state reservasi. Junction menyimpan
  posisi, wording, alokasi/published/released dan snapshot sumber.
- Operasional: `internal.operation_ledger`, `internal.rate_limit_buckets`,
  `internal.content_plan_item_events`, `internal.trivia_reservation_sets`, dan
  `internal.post_write_history`. Ledger/replay dan event/history tidak diganti
  dengan catatan percakapan.
- Post v1: `draft`, `ready`, `posted`, `archived`, `discarded`; revision/hash,
  snapshot, editorial, approval, sumber, serta metrik perlu tetap terbaca dengan
  arti lama. Fakta: needs_review/verified/rejected/invalidated/superseded, dengan
  expiry terpisah dari verification status. Plan/item menyimpan progres dan claim.
- Jumlah fakta menurut status, penggunaan per Page/workspace, reservasi aktif,
  post menurut status, dan plan/claim in-flight production: **NOT RUN**. Belum ada
  statistik kelengkapan pemetaan yang sah untuk dijadikan rencana backfill.

[Preflight editorial 26 Oktober](../../../docs/live-test/editorial/preflight.md)
mencatat empat Page setelah pembuatan satu Page internal dengan config/readback
cocok. Log 21 Oktober mencatat plan tiga item pending dan post Moon ready.
Contoh-contoh itu adalah inventaris objek historis yang diketahui, **bukan total
data terkini**, bukan izin mengeditnya, dan bukan fixture yang boleh dihapus.

P2/P3 perlu mempertahankan ID/snapshot lama serta memetakan semua identitas dan
pemakaian ke registry bersama, termasuk perubahan v1 setelah backfill pertama.
Fakta yang ditemukan dan diputuskan `same` merujuk ID lama; calon `same` dengan
invalidated/superseded/rejected diganti tanpa ID pengelak. Ini tidak menjamin
semua parafrasa ditemukan. Identitas v1 expired-only tidak otomatis tidak layak
pada v2 setelah riset URL baru menurut PRD.

## 4. Pemetaan seluruh tool dan dependensi

Semua kelompok melalui auth/owner/workspace serta adapter `invoke`; diagnostik
input/auth/domain/rate/transport/output perlu dipetakan per tool, termasuk yang
tidak berubah inputnya. Daftar ini mencakup semua 33 nama baseline.

1. **`foundation.ts` (4 Read):** `get_account_profile`, `get_workspace_context`,
   `list_pages`, `get_page_generation_context`. Bootstrap profile/workspace
   mempunyai envelope khusus. Generation context membawa config, reuse,
   freshness/reservation policy v1, versi konten, dan presisi timestamp.
2. **`page_plan.ts` (2 Read/3 Write):** `list_content_plans`, `get_content_plan`,
   `create_page`, `update_page`, `create_content_plan`. Config default dan snapshot
   plan perlu memahami v2; count/theme/unscheduled plan tidak mengubah izin Page.
3. **`plan_claim.ts` (3 Write):** `claim_content_plan_items`,
   `renew_content_plan_claim`, `report_content_plan_item_failure`. Claim/lease,
   token privat, attempt, dan error menentukan siapa yang berhak menyimpan.
4. **`plan_recovery.ts` (3 Write):** `retry_content_plan_item`,
   `replace_discarded_plan_item`, `cancel_content_plan`. Bergantung pada hubungan
   item/output serta status post; completed bukan ready, discard bukan replacement.
5. **`trivia_fact.ts` (1 Read/2 Write):** `trivia_find_similar_facts`,
   `trivia_register_and_reserve_facts`, `trivia_release_facts`. Titik perubahan
   utama: ontologi input, review panjang, sumber rinci, expiry, serta token/set
   reservasi v1. Ketiganya tidak langsung dihapus oleh penambahan v2.
6. **`trivia_correction.ts` (2 Write):** `trivia_reverify_fact`,
   `trivia_correct_fact`. Source/freshness dan successor memakai kontrak v1;
   perlu versi sumber baru, lineage, CAS, serta perlindungan snapshot published.
7. **`post_base.ts` (2 Read/1 Write):** `list_posts`, `get_post`, `save_post`.
   Save terikat reservation token, generation snapshot, binding, renderer,
   editorial dan claim; read projection memuat sumber/checks/hash v1.
8. **`post_edit.ts` (2 Write):** `revise_post`, `reschedule_post`. Revisi fakta
   baru masih memerlukan reservasi v1. Jadwal saja mempunyai semantik approval
   tersendiri; tidak disamakan dengan revisi substansi.
9. **`post_approval.ts` (3 Write):** `approve_post`, `revoke_post_approval`,
   `discard_post`. Gate kualitas, versi/hash, snapshot approval, alokasi dan
   pelepasannya perlu bercabang menurut versi konten.
10. **`post_publication.ts` (2 Write):** `mark_post_posted`, `archive_post`.
    Periksa ready yang masih sah, snapshot dan published usage; v2 tidak boleh
    tersangkut tier/expiry v1. Publikasi tetap peristiwa manual nyata.
11. **`post_metrics.ts` (2 Read/1 Write):** `get_post_performance`,
    `get_performance_insights`, `record_post_performance`. Pertahankan definisi
    metrik, status eligible, snapshot append-only dan batas kesimpulan; audit
    projection/join versi serta seluruh diagnostiknya.

Handler dan test MCP berada di `supabase/functions/mcp/`; test kelompok memakai
suffix `_test.ts`. Regresi DB relevan berada di `supabase/tests/database/`:
`api-trivia-facts`, `api-trivia-concurrency`, `api-trivia-correction`,
`api-post-save-revise`, `api-post-concurrency`, `api-post-approval-quality`,
`api-post-lifecycle`, `api-post-lifecycle-concurrency`, `api-plan-lifecycle`,
`api-plan-concurrency`, `api-metrics`, dan `api-source-evidence-mcp-compat`, semua
dengan suffix `.test.ts`. Ini titik regresi yang diidentifikasi, bukan hasil run.

## 5. Titik kontrak yang memerlukan change record

- `trivia_fact.ts` mewajibkan subject/relation/object, numbers, qualifiers,
  normalization/ontology version untuk Read. Registrasi menambah sources, tier,
  independence, freshness/risk, expiry, review dan reservation context.
- `post_base.ts` mewajibkan reservation token, generation snapshot, binding dan
  editorial v1; kualitas sumber/expiry juga berada pada SQL lifecycle, bukan
  hanya deskripsi tool yang dapat disederhanakan lewat prompt.
- `server.ts` dan skill plugin menginstruksikan reservasi sebelum save.
  Continuation gate plugin v1 dapat HOLD seluruh set bila hasil tetap terpotong;
  v2 targetnya mengganti calon yang tidak lengkap sesuai PRD.
- `foundation.ts` mempunyai diagnostik posisi untuk dua kategori fakta, tetapi
  banyak kegagalan fetch/parse/ukuran/schema masih menjadi
  `DATABASE_UNAVAILABLE`. Kepastian commit tidak dapat disimpulkan dari error itu.
- Source `save_post` melakukan replay hasil operasi sebelum business locks dan
  validasi claim baru. Pertahankan perbedaan replay sukses dan save baru pada v2:
  expiry claim tidak membatalkan hasil yang sudah commit, otorisasi tetap berlaku.

Acuan frozen yang perlu direkonsiliasi: tool inventory §§6, 11–15, 18–19;
module contract §§6, 9, 11–15, 17–18; database design §§8, 11–15, 17; trivia DNA
bagian sumber/freshness serta §19; PRD lama §§16–17, 20–21, 25; workflow pengguna
produksi satu post serta batch/beberapa chat. Keputusan CR-005/012/013/014/046/049/
050/051 dan keamanan/izin yang berlaku tetap diperhatikan.

## 6. Gate dan handoff Phase 1

[G4 CR-052](../../../docs/decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md)
adalah gate rilis manual exact final SHA `main` dengan committed config dan
source, dua shard, serta aggregate PASS. Bukti lama exact-SHA tidak dipindahkan
ke HEAD ini. Inventaris baseline 41 file/182 DB, MCP 15/82, Inspector 33 valid/
33 invalid + owner denial harus berkembang bersama v2 tanpa melemahkan cakupan.

P1-T1 menyerahkan inventaris source, data-model/objek historis yang diketahui,
seluruh tool, provenance, dan daftar ketidakpastian di atas. Ini tidak menutup
kebutuhan verifikasi runtime/data sebelum migration, backfill, rilis, atau
cutover. P1-T2 memerlukan change record untuk keputusan pemilik; P1-T3 baru dapat
dibekukan sebagai kontrak yang diterima setelah keputusan yang dibutuhkannya ada.
