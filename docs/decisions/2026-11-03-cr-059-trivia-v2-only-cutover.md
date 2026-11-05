# CR-059 — Cutover trivia v2 saja dan batas kompatibilitas

**Tanggal:** 3 November 2026.
**Status:** diterima sebagai keputusan pemilik untuk change
[`cutover-trivia-v2-only`](../../openspec/changes/archive/2026-11-05-cutover-trivia-v2-only/proposal.md);
implementasi dan rilis belum dibuktikan oleh record ini.

## Keputusan pemilik dan cakupan

Pemilik meminta seluruh operasi konten trivia v1 dihentikan, konten produk
production dimulai kembali dari kosong, dan v2 menjadi satu-satunya alur konten.
Pemilik menerima risiko plugin lama gagal setelah cutover. Keputusan berikutnya
mempersempit pekerjaan: rantai migration dan histori production tetap ada;
helper internal bersama, termasuk nama `_v1` yang masih dipakai v2, tetap ada;
nomor versi tool umum tidak diganti. Akun/OAuth, workspace, Page, niche, dan
pengaturan Page tetap utuh. Semua post/fakta v1 **dan v2**, plan, metrik, dan
turunan konten milik pemilik termasuk reset, setelah backup dan preflight yang
ditetapkan dalam [design](../../openspec/changes/archive/2026-11-05-cutover-trivia-v2-only/design.md).

## Override kontrak sebelumnya

Keputusan ini **menggantikan**, pada saat cutover yang telah lulus gate dan
terverifikasi, kewajiban kompatibilitas operasi v1 dalam
[CR-053 §2.6/§4](2026-10-31-cr-053-simplified-trivia-draft-workflow.md),
[CR-054 §2–4](2026-11-01-cr-054-v2-primary-and-v1-creation-retirement.md),
serta [TDW-16/17](../../openspec/specs/trivia-draft-workflow/spec.md).
Pengecualian Read v1 `FACT_REVIEW_REQUIRED` dalam CR-054 hanya berlaku selama
tool Read v1 masih aktif; setelah cutover nama tool itu ditolak sepenuhnya.
Kewajiban mempertahankan post/snapshot v1, maintenance/replay v1, dan plugin
lama pada runtime aktif berakhir setelah reset yang disetujui. Bukti dan
keputusan historis itu tidak diubah atau dihapus.

Spesifikasi utama lain yang memuat masa transisi juga disesuaikan oleh delta
change ini: [TFL-04/05/10/12](../../openspec/specs/trivia-fact-library/spec.md)
tidak lagi mewajibkan pencarian, reuse, write, atau backfill data v1 **sesudah
reset**; [TDX-01/07](../../openspec/specs/tool-diagnostics/spec.md) mengikuti
katalog aktif dan tidak lagi menjanjikan error kompatibel untuk nama tool v1
yang sudah dipensiunkan. Identitas canonical, pencegahan duplikasi, status
fakta, lock, CAS, idempotency, diagnostik, dan keamanan owner tetap berlaku
untuk v2. Tool umum tetap memakai kontrak request/response saat ini dan
mengelola konten v2 baru.

## Surface dan pembuktian

Lima nama MCP/RPC khusus v1 yang ditutup adalah `trivia_find_similar_facts`,
`trivia_register_and_reserve_facts`, `trivia_release_facts`, `save_post`, dan
`revise_post`. Overload v1 pada `trivia_reverify_fact` dan
`trivia_correct_fact` juga ditutup; overload v2 tetap bekerja. Jalur direct
RPC, alias, pilot, replay operation key lama, serta operasi in-flight harus
gagal tertutup tanpa menciptakan kembali konten. Tool umum dan tiga nama v2
tetap tersedia; katalog target **31 tool aktif** dari source 36.

[CR-052](2026-10-29-cr-052-full-backend-gate-equivalence.md) tetap gate rilis
manual exact-SHA pada `main`, dengan source/frontend, dua shard database,
MCP, migration/history, lint, local security advisors terpisah, audit
RLS/grant/ACL/fixture, owner denial, cleanup, dan aggregate PASS. Penggantian
inventaris Inspector dari 36 menjadi **31 valid + 31 invalid + lima nama v1
absen/ditolak**, bukan pengurangan pemeriksaan keamanan. Test historis v1
tetap bukti historis; gate aktif perlu memetakan setiap test yang tidak lagi
berlaku ke penolakan v1 atau pemeriksaan v2 yang setara. Tidak ada skip diam-diam.

Urutan rilis, backup, reset transaksional, dan uji host berada pada
[tasks](../../openspec/changes/archive/2026-11-05-cutover-trivia-v2-only/tasks.md). Record ini
tidak sendiri membuktikan G4 PASS, deployment, penghapusan data, atau uji LIVE.
