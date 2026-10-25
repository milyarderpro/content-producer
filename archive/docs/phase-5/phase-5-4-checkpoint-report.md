# Phase 5 checkpoint 5.4 — Batch A audit handoff

Tanggal: 11 Oktober 2026. Baseline: `2d451cf`, working tree bersih, 31 migration
dan 13 API RPC. **Implementasi 5.4 siap untuk audit independen Batch A**, dengan
dua public-RPC race proofs 5.6 yang secara eksplisit masih tertunda. Laporan ini
bukan persetujuan audit, completion claim seluruh Phase 5, atau izin lanjut 5.5.

## 1. Keputusan sebelum migration

Rencana rinci: `plans/works/phase-5-4-implementation-plan.md`.
Keputusan: **CR-011 Accepted**, di
`docs/decisions/2026-10-11-phase-5-4-plan-lifecycle-reconciliation.md`.
Keduanya dibuat sebelum migration 5.4, mengikuti persetujuan dan empat arahan
pengguna. Dokumen frozen dan seluruh migration baseline dipertahankan.

CR-011 menetapkan urutan lock konkret, tradeoff serialisasi per Page, replay
kosong/1–3 item tanpa token di ledger, event history privat, retention tanpa
expiry MVP, tabel transisi dan prioritas aggregate, renewal arithmetic, failure
allowlist, serta penjadwalan dua bukti public-RPC sampai 5.6. CR-009 identity
bridge dan CR-010 replay/config/schedule 5.3 tetap berlaku.

## 2. File dan migration

Source akhir: **36 migration**, bertambah lima. Dua migration utama diikuti
tiga additive hardening; tidak ada migration applied yang ditulis ulang.
Semua file dibuat melalui `supabase migration new` setelah membaca CLI help.

| Migration dalam `supabase/migrations/`                    | Tujuan                                                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `20261011101751_phase_5_4_plan_lifecycle_foundation.sql`  | UPDATE RLS/grants plan/item, privat event history, shared locks/lease/status/projection/replay helpers            |
| `20261011101753_phase_5_4_plan_lifecycle_rpcs.sql`        | Tepat enam API RPC, typed signatures, kernel ledger/rates, narrow ACL                                             |
| `20261011104153_harden_phase_5_4_replay_projections.sql`  | Closed nested override/interaction goal validation, unique event references, resource/history binding             |
| `20261011104603_guard_phase_5_4_terminal_plan_claims.sql` | Terminal aggregate guard termasuk legacy inconsistent fixture; cancelled_at guard; discarded-post UUID validation |
| `20261011104806_map_phase_5_4_statement_cancellation.sql` | Explicit query_canceled handler; WHEN OTHERS tidak menangkap kondisi itu                                          |

File lainnya:

- `supabase/tests/database/api-plan-lifecycle.test.ts`: **12 tests**.
- `supabase/tests/database/api-plan-concurrency.test.ts`: **8 tests**.
- `supabase/tests/database/helpers/plan-lifecycle.ts`: fixture cleanup, caller
  contexts, separate sessions/barriers, safe error capture dan token-free assertion
  digests. Fixture Page/plan memakai existing authenticated RPC.
- `docs/phase-5-4-catalog-audit.sql`: reproducible read-only catalog evidence;
  tidak memproyeksikan token atau row payload.
- `api-page-plan-writes.test.ts`, `api-read-rpcs.test.ts`,
  `api-security-kernel.test.ts`, `trivia-post-facts.test.ts`: hanya pembaruan
  allowlist/count 13 → 19 dan judul terkait. Exact-name/privilege assertions dan
  baseline ownership, schema, RLS serta validator coverage dipertahankan.

## 3. Delta allowlist

API sekarang tepat **19 routines**, masing-masing sekali, seluruhnya executable
hanya oleh authenticated. Inventory map final Phase 5 tetap 33; hanya sembilan
write dan sepuluh read yang sekarang diimplementasikan.

| Tambahan 5.4                     | Typed signature sesudah prefix `api.`             | Rate group       |
| -------------------------------- | ------------------------------------------------- | ---------------- |
| claim_content_plan_items         | `(integer,uuid,uuid,uuid,integer,integer)`        | contention_write |
| renew_content_plan_claim         | `(integer,uuid,uuid,uuid,uuid)`                   | contention_write |
| report_content_plan_item_failure | `(integer,uuid,uuid,uuid,uuid,text,text,boolean)` | contention_write |
| retry_content_plan_item          | `(integer,uuid,uuid,uuid,text)`                   | write            |
| replace_discarded_plan_item      | `(integer,uuid,uuid,uuid,uuid,text,boolean)`      | write            |
| cancel_content_plan              | `(integer,uuid,uuid,uuid,text,boolean)`           | write            |

Tidak ada save_post, revise_post, reschedule_post, trivia RPC 5.5, generic
executor, status mutation RPC atau overload. Catalog `phase_5_6_rpc_count=0`.

## 4. Lock protocol dan pembuktiannya

Urutan aktual: request/owner validation → existing rate bucket → ledger key →
Page FOR UPDATE → distinct schedule bigint keys numeric ascending (bila occupancy
berubah) → plan FOR UPDATE → item rows → related post rows → append event dan
complete ledger. Claim mengambil item dengan position,id dan SKIP LOCKED;
cancellation mengambil item ID ascending. Lease expiry diperiksa dengan
clock_timestamp sesudah lock/wait. Tidak ada schedule acquisition sesudah lock
plan/item/post.

Same-Page workers deliberately serialize, sehingga update aggregate dan cancel
tidak berlomba melalui lock upgrade. SKIP LOCKED tetap nyata: fixture session
menahan item pertama saja, dan authenticated public claim mengambil item kedua
sebelum locker commit. Different Pages dapat maju independen.

Bukti `api-plan-concurrency.test.ts`:

- Tiga public claim workers mendapat enam item berbeda; duplicate operation-key
  workers menghasilkan satu mutation dan satu replay, tanpa event/attempt ganda.
- Public claim melewati held item; Page lain tetap maju ketika Page pertama
  mempunyai public claim transaction terbuka.
- Claim-first/cancel-first public transactions terbukti menunggu satu arah lewat
  pg_blocking_pids; hasil cancelled legal, stale renewal ditolak, deadlock count
  tidak bertambah.
- Retry-first/claim-first mempertahankan attempt; competing renewals punya satu
  pemenang; old renewal setelah reclaim ditolak; expiry sesudah wait ditolak.
- Cancellation menahan lower numeric slot dan menunggu higher slot, sebelum
  RowShareLock plan/item/post. Slot yang dilepas dapat ditempati plan baru;
  cancellation-versus-create RPC race menghasilkan satu non-cancelled occupant.
- Held Page melewati lock_timeout → DATABASE_BUSY, tanpa item/event/ledger
  mutation; same key dapat dipakai kembali sesudah locker selesai.

Administrative locks hanya contention fixtures dan catalog observations. Domain
calls yang dibuktikan adalah public API routines sebagai authenticated dengan
owner/client request context, bukan panggilan helper sebagai database owner.

## 5. Replay, token dan audit history

Ledger v4 khusus enam operasi menyimpan bounded exact response tanpa token,
resources dan ordered claim_event_public_ids. Claimed/reclaimed event menyimpan
typed original token dan lease metadata. Empty claim menyimpan array kosong
tanpa event; replay tetap kosong meskipun item kemudian bisa diklaim.

Replay 1/2/3 item membaca immutable event milik ledger/workspace/actor yang sama,
mengembalikan original response dan token, hanya mengubah replayed=true. Sesudah
renewal, reclaim, failure atau cancellation, respons historis tetap sama tanpa
memperpanjang lease, menambah attempt atau event. Current lease validator tetap
menolak expired/mismatched token; cancelled plan tetap terminal.

Token retained sepanjang no-expiry ledger horizon MVP, bukan expiry lease. Caller
tidak memiliki akses tabel/sequence/event helper. API owner hanya SELECT/INSERT;
UPDATE trigger melarang rewrite, dan tidak ada DELETE privilege/RPC history.
Test-only administrator membersihkan fixture dalam dependency order.

Live-fixture test membuktikan **0 token value dalam ledger**; audit juga memeriksa
token keys/value counts. Rejected detail/token input tidak di-echo ke error.
Test SQL memakai stdin, result ditahan di memory, error hanya safe code, dan
assertions membandingkan digest agar failure output tidak mencetak token. Direct
literal-SQL fixture sessions mematikan error-statement/parameter logging; tidak
ada application logging atau RAISE NOTICE token-bearing payload.

Corrupted replay tests menolak unknown nested override, invented interaction
goal, duplicate reference, dan event dari operasi/plan lain. Completion-fault
test keenam RPC membuktikan atomic rollback termasuk seluruh cancellation set,
dan same-key retry setelah failure. Query cancellation sesudah event insertion
juga menjadi DATABASE_BUSY dan rollback penuh.

## 6. Transisi dan aggregate status

Tabel normatif lengkap berada dalam CR-011. Implementasi dan tests memastikan:

- Pending/expired in_progress → in_progress: token baru, attempt+1, 30 menit;
  started_at pertama dipertahankan. Renewal sekali, initial claim+60 maksimum.
- Active current lease → failed membersihkan lease; failed → pending hanya
  explicit retry, attempt/history tidak direset.
- Completed → pending hanya explicit replacement dengan related discarded post,
  semua output discarded, tidak pernah published/archived, slot masih valid.
- Explicit cancellation membersihkan pending/failed/in_progress; completed item
  dan post utuh, plan **cancelled** sekalipun sebagian completed.
- Aggregate precedence: explicit cancelled → all-terminal completed → any
  in_progress → completed+pending/failed partially_completed → only-failed failed
  → otherwise pending. Pending+failed tanpa completed adalah pending.
- Replay successful dengan key lama legal; repeated illegal transition dengan
  key baru ditolak. Ordinarily completed plan dapat dibuka oleh replacement;
  explicitly cancelled plan tidak dapat dibuka kembali.

Every public transition/aggregate branch yang dapat diproduksi enam operasi
diuji. All-terminal completion berasal dari save 5.6; derivasi completed diuji
sebagai fixture setup melalui shared helper untuk all-completed,
completed+cancelled dan all-cancelled, lalu public empty claim/preservation dan
cancellation rejection diuji. Ini **bukan public save/completion proof**.
Posted/ready/archived/discarded rows untuk replacement adalah administrative
fixtures dengan existing validators, bukan klaim bahwa lifecycle RPC 5.7 ada.

## 7. Security catalog akhir

Query audit dijalankan setelah kedua reset; final cleanup query sesudah 49-test
rerun juga lulus. Hasil:

| Assertion                                                 | Hasil                  |
| --------------------------------------------------------- | ---------------------- |
| API functions / authenticated EXECUTE                     | 19 / 19                |
| Allowlist difference / overload / unsafe API              | 0 / 0 / 0              |
| PUBLIC, anon, service_role business API execution         | 0                      |
| Caller/PUBLIC internal helper execution                   | 0                      |
| Caller table, column, sequence privileges                 | 0 / 0 / 0              |
| PUBLIC table/sequence privileges                          | 0 / 0                  |
| RLS-enabled domain/operational tables                     | 13 / 13                |
| API owner table ownership / role memberships              | 0 / 0                  |
| API owner login/superuser/bypassrls/inherit/schema CREATE | Semua false            |
| Missing API-owner SELECT policy / unsafe UPDATE policy    | 0 / 0                  |
| Unsafe explicit default ACL                               | 0                      |
| Event application SELECT/INSERT; UPDATE/DELETE            | true/true; false/false |
| Post row-lock UPDATE(id); post status UPDATE              | true; false            |
| Ledger token key/value; incomplete ledger; fault fixture  | 0 / 0; 0; 0            |

Seluruh 19 API: owner content_producer_api_owner, SECURITY DEFINER,
search_path=''. New helpers SECURITY INVOKER dengan search_path=''; auth.uid
identity bridge CR-009 tetap privat. New UPDATE policies mempunyai USING dan
WITH CHECK yang mengulangi owner identity. UPDATE(id) pada post diperlukan untuk
FOR UPDATE row lock, bukan permission menulis post business fields.

Sesudah final test cleanup: workspace, Page, plan, item, post, event, ledger dan
rate-bucket rows semuanya **0**. Seed tetap registry-only.

## 8. Commands dan hasil

| Gate                                                     | Hasil                                                                |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| Focused 5.4                                              | PASS, 20/20 di dua file                                              |
| Clean reset acceptance 1                                 | PASS, 36 source migrations                                           |
| pnpm run check                                           | PASS, format/lint/typecheck dan 3 foundation tests                   |
| pnpm run test-all                                        | PASS, 75/75 database tests, 21 files; check dan migration validation |
| pnpm run verify-migrations                               | PASS, 36 valid filenames                                             |
| pnpm run smoke-test                                      | PASS, 75/75 database tests, 21 files; repository smoke               |
| pnpm run supabase:verify                                 | PASS, local applied history/order sama dengan 36 source migrations   |
| Security Advisor --local --type security --fail-on error | PASS, No issues found; diulang sesudah reset 2 dan final cleanup     |
| Clean reset acceptance 2                                 | PASS setelah failed bootstrap attempt yang tidak dihitung lulus      |
| Post-reset 2 focused + 5.1/5.2/5.3 regressions           | PASS, 49/49 di lima file                                             |
| Final read-only catalog/cleanup audit                    | PASS, hasil §7                                                       |
| git diff --check                                         | PASS                                                                 |

Seluruh invocation database eksplisit --local atau psql container
supabase_db_content-producer. Label Remote pada migration list --local hanyalah
format CLI, bukan remote action. CLI help dibaca untuk migration new/up/list,
db query/reset/advisors. Test-all ~806 detik, smoke ~804 detik, post-reset rerun
~658 detik; timeout tool diberikan cukup dan tidak ada acceptance test terputus.

### Iterasi gagal dan recovery yang tidak disembunyikan

1. Foundation pertama gagal parse CASE di IF; katalog membuktikan migration
   belum applied dan tabel belum ada. Parentheses diperbaiki sebelum apply.
2. Fixture CTE pada subquery dan missing ready/post evidence diperbaiki di test
   harness; production constraints tidak dilemahkan.
3. Public replay corruption regression awal gagal: object-only override menerima
   unknown key. Additive hardening migration memperketat closed projection;
   regression dan seluruh suite kemudian lulus.
4. Inspection menemukan WHEN OTHERS mengecualikan query_canceled; additive
   handler + timed completion-fault regression membuktikan mapping/rollback.
   Test mengaktifkan statement timer sebelum SELECT; SET LOCAL di dalam function
   mencatat GUC 15s tetapi tidak mengaktifkan timer untuk statement yang sudah
   mulai. Transport nanti harus mempertahankan request/statement deadline.
5. Percobaan reset acceptance kedua berhenti saat platform Initialising schema,
   sebelum migration aplikasi. Database logs 11:23:06 UTC menunjukkan duplicate
   tenants_external_id_index untuk realtime-dev; API schema belum ada dan
   Realtime bootstrap tenant sudah ada. Bukti mengarah pada concurrent local
   platform tenant seeding; CLI hanya memberi generic container exit 1. Tidak
   ada source migration yang diubah untuk menutupinya. Retry benar-benar
   me-recreate database dan replay semua 36 source migrations, lalu 49 tests,
   catalog, migration history dan advisor lulus. Failed attempt tidak dihitung
   sebagai salah satu dari dua clean reset yang berhasil.

## 9. Mandatory deferred evidence untuk audit Batch A

| Evidence                                                                        | Status 5.4 / Batch A      | Checkpoint pembuktian |
| ------------------------------------------------------------------------------- | ------------------------- | --------------------- |
| save_post versus cancel_content_plan melalui public RPC, kedua commit order     | **DEFERRED — NOT PASSED** | 5.6; final gate 5.9   |
| Opposite-direction reschedule_post melalui public RPC, dua-slot numeric locking | **DEFERRED — NOT PASSED** | 5.6; final gate 5.9   |

Auditor harus mencatat keduanya tertunda sesuai CR-011. Fixture/helper/schedule
creation tests tidak menggantikan dua bukti ini. Tidak ada API 5.6 ditambahkan
lebih awal. Seluruh Phase 5 belum dapat dinyatakan selesai.

## 10. Scope dan titik berhenti

Tidak ada pekerjaan 5.5+, MCP/Edge handler, OAuth parser/middleware, frontend,
worker, production seed, OpenAI/embeddings/vector, Facebook/Canva API, cloud
resource, remote linking/deploy, secret, commit atau push. Perubahan Git baseline
hanya empat allowlist tests; semua implementasi baru tersedia sebagai untracked
files untuk review, tanpa perubahan migration committed.

**Berhenti pada handoff ini. Langkah berikutnya adalah audit independen Batch A**
atas CR-011, implementation, source migrations, catalog dan bukti test, dengan
dua deferral di atas. 5.5 memerlukan hasil audit diterima dan otorisasi pengguna
terpisah; tidak ada self-approval atau perintah lanjut yang dijalankan.
