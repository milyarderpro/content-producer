# Hasil task 5 — transaksi, snapshot3 dan lifecycle post

**Selesai 12 November 2026 (Asia/Jakarta), LOCAL/FIXTURE.** Change
`add-configurable-trivia-editorial-profiles`, schema `spec-driven`, scope task 5.
[Kontrak transaksi](../../contracts/trivia-post-editorial-snapshots.md) dan
[fingerprint/verifikasi](task-5-verification.json) menjadi handoff berikutnya.

## Perubahan yang selesai

Tiga migration baru dibuat dengan CLI pin 2.120.0, tanpa menulis ulang migration
applied atau mereset stack:

- `20261112133936_integrate_trivia_editorial_post_snapshots.sql`: tambahan
  editorial context pada satu signature save/revise, goal opsional config2,
  renderer/rules server, snapshot3, binding ceiling, readback dan lifecycle.
- `20261112135417_preserve_config2_unclassified_insight_dimensions.sql`: null
  goal/density config2 tetap eligible sebagai kelompok tak terklasifikasi pada
  insights existing; exclusions serta arti dimensi legacy dipertahankan.
- `20261112135704_harden_editorial_snapshot_metadata.sql`: menolak definition
  key null/bool, topic scope hilang, architecture/choices yang tidak cocok pada
  validator snapshot. Snapshot valid dan config1 tidak diubah.

Save/revise tetap request/content2. Tambahan parameter terakhir
`p_editorial_context` bersifat conditional untuk config2; kedua writer masing-masing
mempunyai tepat satu signature 18 argumen, tanpa overload publik. Named request
dapat menghilangkan goal; field wajib lain tetap divalidasi. Config1 tetap
memerlukan goal dan tidak boleh membawa envelope profil baru.

Server mengikat exact references, key/architecture/density serta rules hash dengan
Page terkunci. Snapshot3 menyimpan config identity/time enam mikrodetik, aturan
keras dan preferensi yang dipakai, identitas/key versi DNA/format/topik, scope topik,
CTA teks/placement/metadata dan estimator. Full immutable definitions dapat
kembali dibaca dari exact references. Tidak memilih goal atau label palsu.

Claim/replay, workspace→Page→target locks, fact catalog CAS, semua dedup reviews,
source URL, reuse, status, attestations, revision/hash dan ledger/history tetap
menggunakan mekanisme existing. Revisi membuat successor bindings dan
membatalkan approval ready. Metadata CTA ikut hash post melalui snapshot penuh;
fungsi `post_hash_v2` dan renderer config1 tidak diganti.

Get config2 mengembalikan snapshot3 dan seluruh posisi/sumber/metrics; list
menambahkan context editorial ringkas. Approval/publication membandingkan binding
serta rules dengan Page terkini, tanpa mengikuti latest. Publish versi katalog
baru dan retirement versi yang telah diikat Page saja tidak mengganti post atau
approval. Adopsi Page baru membutuhkan review/revise eksplisit. Posted/archived
membaca provenance asli. Release/publication IDs dan replay mendukung 12 elemen.

Insights existing menerima key dinamis dan null annotations config2. `profile`
tetap density, bukan DNA; null dikelompokkan sebagai JSON null. Tidak menambahkan
laporan/filter DNA/CTA atau mengubah heuristic `cta_pattern` lama.

## Kandidat dan preflight

Basis `c02c5413479cebf50f39abc10149fafca757611a` + working files, tanpa
commit kandidat baru. Fingerprint sembilan file ada pada JSON hasil; bukan bukti
G4 formal exact-SHA. Seluruh pekerjaan task 1–4 dan file pengguna dipertahankan.

Workflow CI/source serta riwayat lokal task4 diperiksa sebelum eksekusi:
estimasi kelompok database 2–5 menit, check 1–3 menit, migration/lint/advisors <1
menit. Tidak memicu Actions/full gate. SQL dikompilasi dan alur Page config2 →
context → save tanpa goal → get snapshot3 → approve diuji dalam transaksi rollback
sebelum migration utama di-apply. Pengetatan metadata juga di-smoke rollback.

Bukti config1 dibuat **sebelum migration task 5**: fixture disimpan melalui
signature 17 lama, lalu sesudah apply di-replay dengan semantic payload/operation
key yang sama. Respons replay, seluruh readback, content hash recompute identik;
fixture dibersihkan. Ini bukti kompatibilitas ledger historis lokal, bukan Write
owner production.

## Verifikasi final

| Pemeriksaan | Hasil dan batas |
| --- | --- |
| Database kelompok A | PASS 2 file/73 kasus, 0 skip, 165,08 detik; 21 kasus workflow schema3 baru +18 legacy v2 serta 34 primitive/golden |
| Database kelompok B, lima file unchanged | PASS 30 kasus pada run 119,82 detik; dua file lain pada run tersebut mempunyai assertion inventaris stale dan dicatat di bawah |
| Retest dua file B yang diperbarui | PASS 2 file/6 kasus, 0 skip, 28,18 detik |
| Cakupan database unik final | PASS 9 file/109 kasus unik; gabungan hasil fokus di atas, **bukan satu full gate** |
| `pnpm run check` penutup | PASS lint/typecheck, 14 file/184 test source; frontend typecheck/build dan 19 test |
| DB lint lokal api/internal/public, level error/fail-on error | PASS 0 temuan |
| Local security advisors terpisah, type security/fail-on error | PASS 0 temuan |
| Migration filename/history | PASS 93 nama/versi source cocok tepat dengan history lokal |
| ACL/identity/cleanup | PASS 33 API signatures; writer 18 args/defaults 7 dan 6; 0 caller execute helper baru; owner NOLOGIN/NOBYPASSRLS/tanpa schema CREATE; direct post grants tertutup; 0 post/binding/history/definition/state/config2 fixture tertinggal |
| Golden/ledger config1 | PASS tiga definisi fungsi lama identik task 4; replay/readback/hash fixture sebelum migration identik setelah apply |
| Frozen task 1, OpenSpec strict, referensi/whitespace | PASS; bukan bukti host/LIVE |

Kelompok A:

```sh
pnpm exec vitest run --config vitest.database.config.ts \
  supabase/tests/database/api-trivia-v2-save.test.ts \
  supabase/tests/database/core-primitives-and-validators.test.ts
```

Kelompok B:

```sh
pnpm exec vitest run --config vitest.database.config.ts \
  supabase/tests/database/pages-and-page-niche-configs.test.ts \
  supabase/tests/database/api-read-rpcs.test.ts \
  supabase/tests/database/api-security-kernel.test.ts \
  supabase/tests/database/posts-and-post-metrics.test.ts \
  supabase/tests/database/trivia-post-facts.test.ts \
  supabase/tests/database/api-metrics.test.ts \
  supabase/tests/database/api-metrics-insights.test.ts
```

Retest B hanya memakai dua file yang gagal: `api-metrics.test.ts` dan
`trivia-post-facts.test.ts`. Lima file B lainnya, source SQL dan dependency-nya
tetap identik sejak hasil PASS; tidak menjalankan ulang gate tak terdampak.

## Temuan dan perbaikan selama implementasi

- Run A awal 148,03 detik: 66 PASS/5 FAIL. Empat kesalahan fixture baru (kode
  error `complete=false` menurut helper existing, replace argumen null yang tidak
  mengenai SQL, dua revoke tanpa expected hash) diperbaiki. Gap nyata: null goal
  dianggap missing dimension; migration kedua mempertahankan null config2 tanpa
  mengarang klasifikasi atau mengubah arti data lama.
- Run A berikutnya 164,55 detik: 70 PASS/2 FAIL. Satu publikasi fixture kedua
  memakai platform ID sintetis sama sehingga terkena unique constraint; diganti
  metadata nullable yang sah. Satu contention legacy menerima `DATABASE_BUSY`
  ketika ada probe DB paralel. Ekspektasi tidak dilonggarkan; isolated retest dan
  final A berurutan lulus dengan expected `FACT_CATALOG_CONFLICT` semula.
- Probe pure validator membuktikan null profile definition key dan topic scope
  hilang masih diterima. Migration ketiga menutupnya, dengan positive snapshot
  tetap sah serta enam mutasi metadata dan content/CTA mismatch ditolak.
- Diagnostic retest tiga kasus PASS dengan 36 kasus lain tidak dipilih/skipped;
  run filter itu bukan bukti seluruh suite dan tidak dihitung pada 109 kasus unik.
- B awal 34 PASS/2 FAIL. Dua inventaris masih 31 signature. Probe junction
  membuktikan error tepat pada assertion inventaris, bukan constraint/grant.
  Expected direkonsiliasi ke 33 sesuai dua RPC katalog CR-062, ditambah pemeriksaan
  eksplisit nama keduanya. Seluruh 12 tabel subset/RLS dan caller denial existing
  tetap diperiksa. Retest 6/6 PASS.
- Check penutup menemukan dua escape kutip yang tidak perlu pada template SQL
  test baru; dirapikan tanpa mengubah string SQL, lalu check lengkap PASS.

## Bukti perilaku

- Save/get/approve/publication menangani 1/10/11/12 fakta dengan null goal dan
  arrays utuh; 13 ditolak tanpa hasil parsial. Binding 130 karakter, metrics server,
  CTA empat baris/emoji/sebelum fakta terakhir serta metadata baru/kosong terbaca.
- Ketiga preset memakai snapshot/rules masing-masing. Revisi dengan goal null
  atau label berubah tetap menjaga identity fakta dan menghasilkan hash yang tepat.
- Missing/foreign refs, architecture/density tidak sah, stale config/fact catalog,
  incomplete review, failed attestation dan fake metrics ditolak atomik, tanpa
  post/fact/usage/operation ledger parsial. Owner lain tetap ditolak.
- Save/revise response hilang direkonsiliasi lewat replay identik setelah Page
  berubah dan definisi retired. Payload berbeda dengan key sama ditolak.
- Publish versi profil baru/retirement profil+format+topic yang sudah diikat tidak
  mengganti snapshot atau merusak approval. Page adoption menolak approval lama;
  revise dengan context baru mengikat versi baru secara eksplisit.
- Ready direvisi menjadi draft, approval null, 12 bindings lama tetap immutable.
  Reschedule menjaga content hash; revoke/discard merilis 12 IDs; publication dan
  archive menjaga provenance meskipun Page kemudian berpindah profil.
- Format/topik baru lewat katalog dan Page dipakai tanpa switch nama source;
  metrics/history/insights membaca key dinamis serta goal/density null sebagai
  unclassified. Permintaan dimensi DNA baru tetap ditolak.
- Concurrency save config2 menghasilkan satu commit dan satu rollback stale
  katalog dengan 12 allocations, tanpa duplikasi atau pelemahan lock/reuse.

## Batas handoff

Task 5 menuntaskan jalur **SQL/core post**. Plan/override/batch config2 task 6;
facade dan schema MCP, diagnostics, registry/pin/manifest G4 task 7; plugin task 8;
integrasi/preview lintas sistem task 9; rilis task 10. Source MCP masih 31 tool,
API database 33 signature. Hasil SQL tidak mengklaim host/plugin config2 sudah
terpasang atau seluruh kontrak facade telah menerima snapshot3.

G4 manual exact final SHA main dengan committed config dan aggregate PASS tetap
wajib sebelum deployment berizin. Actions/formal G4, browser/visual QA, packaging
baru, install, deployment dan LIVE task ini **NOT RUN**. Tidak melakukan commit,
push, PR, merge, publikasi Issue, mutasi Page/post production atau klaim FIXED live.
