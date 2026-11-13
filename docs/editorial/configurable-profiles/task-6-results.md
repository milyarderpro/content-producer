# Hasil task 6 — plan dan batch config2

**Selesai 13 November 2026 (Asia/Jakarta), LOCAL/FIXTURE.** Change
`add-configurable-trivia-editorial-profiles`, schema `spec-driven`, scope task 6.
Implementasi dimulai 12 November dan verifikasi dilanjutkan 13 November.
[Kontrak plan/batch](../../contracts/trivia-config2-plan-batch.md) dan
[fingerprint/verifikasi](task-6-verification.json) menjadi handoff task 7.

## Perubahan yang selesai

Migration aditif `20261112142435_add_config2_content_plan_context.sql` dibuat
melalui Supabase CLI pin 2.120.0 dan diterapkan pada stack fixture lokal, tanpa
reset. SQL dikompilasi dan alur create → claim → context item → save → readback →
approve di-smoke dalam transaksi rollback sebelum apply. Migration sebelumnya
tetap dipertahankan; cleanup final hanya menghapus trailing whitespace pada satu
baris migration baru, tanpa perubahan logika setelah apply.

Plan config2 menerima pilihan katalog dinamis, format/topik null dan override
item yang mempersempit aturan Page. Goal item adalah intent non-eksklusif;
post tetap boleh goal null serta mempunyai beberapa ajakan CTA. Jumlah item
adalah jumlah draft, bukan jumlah fakta per draft. Plan memakai `plan_config.schema_version: 3`
serta creation context schema2 yang immutable; JSON config1 tetap kompatibel.

`get_page_generation_context` mempunyai satu signature 10 argumen dengan
`p_plan_item_public_id uuid default null` di akhir. Pemanggilan lama sembilan
argumen tetap bekerja. Context item menyajikan aturan Page terkini + override,
rules hash dan metadata review plan, tanpa lease token. Claim memvalidasi item
terpilih terhadap Page saat ini; save memeriksa CAS, aturan item, jadwal dan
lease serta menyelesaikan post/item/ledger/event secara atomik. Context Page
langsung tidak dapat melewati override item.

Pending/in-progress yang masih kompatibel dapat dilanjutkan dengan context dan
review terbaru setelah Page berubah. Intent/override yang tak lagi sah ditolak,
tanpa mengubah completed atau mengganti profil diam-diam. `get_content_plan`
menambahkan `page_review`; creation snapshot, completed post dan hash histori
tetap utuh. Snapshot3 post dari plan menambahkan `plan_context` server dengan ID
plan/item, override yang dipakai dan intent goal. Revise/approval mempertahankan
override tersebut, termasuk saat Page terkini memerlukan keputusan owner baru.

Panduan batch mempertahankan maksimal sembilan calon per Read dan 20 match per
calon. Set 10–12 memakai beberapa Read dengan key unik dan satu versi katalog
fakta konsisten. Incomplete menghentikan Write; perubahan versi antarbaca
memerlukan pengulangan seluruh set, bukan penggantian nomor versi. Server tetap
memeriksa seluruh final matches dan reuse sebelum insert. Tidak ada receipt,
worker atau business SQL baru pada handler MCP.

## Kandidat, preflight dan riwayat run

Basis `c02c5413479cebf50f39abc10149fafca757611a` + working files, tanpa commit
kandidat baru. Hash source task 6, dependensi pengujian dan fingerprint seluruh
migration/config lokal dicatat pada JSON verifikasi. Bukti ini bukan formal G4
exact-SHA. Toolchain: Node 24.15.0, pnpm 10.33.2, Supabase CLI 2.120.0.

Scope CI/source dan riwayat lokal task 4/5 diperiksa sebelum run. Estimasi database
3–5 menit per kelompok, check source 1–3 menit, audit/lint/advisors kurang dari
satu menit per command. Kedua kelompok final selesai di bawah lima menit;
tidak menjalankan Actions atau full gate duplikat.

Sesi test pada 12 November hilang setelah lingkungan berganti. Tidak ada hasil
terminal yang dapat diperiksa; statusnya **UNKNOWN**, tidak dihitung PASS. Pada
13 November, run pertama menghasilkan 61 PASS/2 FAIL dalam 233,30 detik: dua
fixture insert native v2 belum mengosongkan seluruh default envelope v1 dan
belum menyertakan evidence. Helper fixture diperbaiki mengikuti kontrak native
v2; expected penolakan dedup dan source backend tidak dilemahkan. Seluruh kelompok
A diulang dan lulus pada source final.

## Verifikasi final

| Pemeriksaan | Hasil dan batas |
| --- | --- |
| Database A: plan lifecycle + save/revise | PASS 2 file/63 kasus, 0 skip, 231,73 detik; termasuk 12 kasus baru plan/batch config2 |
| Database B: concurrency, Page/plan, context, kernel dan validators | PASS 7 file/86 kasus, 0 skip, 174,74 detik |
| Cakupan database unik final | PASS 9 file/149 kasus; gabungan dua run fokus, bukan full gate |
| `pnpm run check` | PASS lint/typecheck; 14 file/184 test source; frontend typecheck/build dan 19 test |
| DB lint lokal api/internal/public, level error/fail-on error | PASS 0 temuan |
| Local security advisors terpisah, type security/level info/fail-on error | PASS 0 temuan |
| Migration filename/history | PASS 94 nama/versi source cocok tepat dengan history lokal |
| ACL/identity | PASS 33 API signatures; satu generation context 10 args; save/revise masing-masing 18 args; tujuh helper plan/editorial private; owner NOLOGIN/NOBYPASSRLS/tanpa schema CREATE; direct caller data access tertutup |
| Cleanup | PASS 0 plan/item/event/post/binding/post-history/definition/catalog-state/config2 fixture tertinggal |
| Legacy | PASS hash definisi `post_hash_v2`, `post_render_v1`, `post_render_v2` identik bukti task 5; test config1, replay dan concurrency tetap lulus |
| Frozen task 1, OpenSpec strict, referensi dan whitespace | PASS; LOCAL/CORPUS atau review dokumen, bukan LIVE |

Kelompok A:

```sh
pnpm exec vitest run --config vitest.database.config.ts \
  supabase/tests/database/api-plan-lifecycle.test.ts \
  supabase/tests/database/api-trivia-v2-save.test.ts
```

Kelompok B:

```sh
pnpm exec vitest run --config vitest.database.config.ts \
  supabase/tests/database/api-plan-concurrency.test.ts \
  supabase/tests/database/api-page-plan-writes.test.ts \
  supabase/tests/database/content-plans-and-plan-items.test.ts \
  supabase/tests/database/pages-and-page-niche-configs.test.ts \
  supabase/tests/database/api-security-kernel.test.ts \
  supabase/tests/database/core-primitives-and-validators.test.ts \
  supabase/tests/database/api-read-rpcs.test.ts
```

Dua belas kasus baru mencakup:

- Dua draft × 12 fakta, format/goal null, readback/progres, create/save replay
  identik serta 24 bindings tanpa draft ganda.
- Override count/density/budget, beberapa ajakan CTA tanpa primary goal,
  approve/revise dengan provenance item tetap.
- Pilihan tak terdaftar, perluasan budget/count, layout berbeda serta penggantian
  DNA ditolak tanpa plan/ledger parsial.
- Page berubah: pending kompatibel memakai context baru, stale save ditolak;
  pending tak kompatibel diblokir; completed snapshot/plan config tetap historis.
- Active claim tetap memerlukan CAS dan budget terkini; direct Page context serta
  item foreign tidak dapat melewati scope/override; Read tidak memberi token.
- Katalog berubah di antara Read 9+3: save stale rollback, seluruh set direview
  ulang konsisten sebelum save. Hasil >20 match memberikan complete=false;
  fabricated complete/review kosong ditolak tanpa post atau completion.
- Pinned retired definition, replay setelah Page berubah, cancel menjaga completed,
  expired lease/reclaim, old-token denial serta failure/retry/resume.
- Inventaris signature dan ACL helper tetap tertutup untuk caller.

## Batas handoff

Task 6 menuntaskan SQL/core, panduan workflow dan fixture plan/batch. Task 7
menyelaraskan facade/schema MCP, registry, diagnostics dan pin/manifest G4;
task 8 mengonsumsi panduan pada plugin. MCP masih 31 tool, database 33 signature.
Tidak mengklaim host/plugin sudah menerima tambahan parameter atau output baru.

Actions/formal G4 exact final SHA main, MCP/Inspector, packaging/install baru,
visual QA, deployment serta LIVE task ini **NOT RUN**. Tidak melakukan commit,
push, PR, merge, publikasi Issue atau mutasi Page/post production. G4 dengan
committed config dan aggregate PASS tetap wajib sebelum deployment berizin.
