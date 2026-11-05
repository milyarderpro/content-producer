# Task 4.3 — Pemetaan gate v1 ke v2

**Status:** kandidat source/fixture; bukti G4 exact-SHA dan LIVE adalah task 5.1–5.5.

CR-059 menghentikan lima RPC konten v1 dan overload maintenance v1. Test yang
memanggil RPC itu untuk memperoleh hasil sukses tidak dapat menjadi gate aktif.
Source test lama disimpan utuh di `archive/tests/database/`; nama yang sama
tidak dijalankan oleh gate aktif. Ini penggantian kontrak yang disetujui pemilik,
bukan `skip`, pengubahan expected error agar tampak hijau, atau penghapusan
bukti historis.

| Test historis | Kontrak yang dipensiunkan | Pemeriksaan aktif pengganti |
| --- | --- | --- |
| `api-batch-b-remediation` | Save/revise v1, snapshot dan peringatan profil v1 | `api-trivia-v2-save`, `api-trivia-v2-lifecycle`, `api-trivia-v2-maintenance`, `api-page-plan-writes` |
| `api-post-approval-quality` | Rubrik 18 kriteria dan sumber v1 pada approval | `api-trivia-v2-save` (kegagalan editorial/budget), `api-trivia-v2-lifecycle` (approval, penolakan, revoke, publish), `api-trivia-v2-maintenance` (perubahan fakta) |
| `api-post-concurrency` | Save/revise v1 dalam race | `api-trivia-v2-save` (replay/CAS/lock/timeout), `api-trivia-v2-maintenance` (race correction), `api-plan-concurrency` |
| `api-post-lifecycle-concurrency` | Lifecycle post v1 dan v1-v2 race | `api-trivia-v2-lifecycle` (lifecycle v2), `api-trivia-v2-maintenance` (approval/publish vs correction dua urutan), `api-trivia-v2-save` (save vs correction) |
| `api-post-lifecycle` | Post v1 sebagai fixture untuk operasi umum | `api-trivia-v2-lifecycle`, `api-trivia-v2-save`, `api-metrics`, `api-security-kernel` |
| `api-post-render-quality` | Renderer dan batas profil v1 | `api-trivia-v2-save` (URL, renderer, hard budget, editorial dan rollback), `trivia-draft-v2-contracts` (source) |
| `api-post-reschedule` | Post v1 sebagai fixture untuk slot | `api-trivia-v2-lifecycle` (reschedule/revoke), `api-page-plan-writes`, `api-plan-concurrency` |
| `api-post-save-revise` | Bentuk payload, reservasi, save dan revise v1 | `api-trivia-v2-save` (save/revise, plan atomik, replay, CAS, binding history, discard) |
| `api-source-evidence-mcp-compat` | Tujuh bentuk source metadata v1 | `api-trivia-v2-save` (URL evidence), `api-trivia-v2-read` (tanpa bocor sumber), `mcp/trivia_v2_test.ts` |
| `api-trivia-concurrency` | Reserve/release v1 dalam race | `api-trivia-v2-save` (fact/identity lock, timeout), `api-trivia-v2-maintenance` (CAS correction), `api-security-kernel` (ACL/owner/rate limit) |
| `api-trivia-correction` | Koreksi v1 dan v1-v2 race | `api-trivia-v2-maintenance` (reverify/correct, CAS, lineage, approval dan publication) |
| `api-trivia-facts` | Read/reserve/release v1, source/risk envelope | `api-trivia-v2-read`, `api-trivia-v2-corpus`, `api-trivia-public-gold`, `api-trivia-v2-save` |
| `api-trivia-source-diagnostics` | Diagnostik payload sumber/review v1 | `api-trivia-v2-save` (validasi URL dan rollback), `api-trivia-v2-read` (source-free), `mcp/trivia_v2_test.ts` (error aman) |

Pemeriksaan yang tidak boleh hilang: source/frontend; dua shard DB terisolasi
dengan seluruh file aktif PASS tanpa skip; MCP; Inspector 31 valid dan 31
invalid, lima nama v1 absen/ditolak, serta owner denial; migration names dan
applied history; DB lint; local security advisors terpisah; audit katalog,
grant, ACL, RLS, serta fixture sebelum/sesudah/akhir; cleanup dan aggregate
exact-SHA. `api-security-kernel`, `api-phase-five-acceptance`,
`api-read-rpcs`, suite plan/metrik, dan seluruh test schema tetap aktif.

Jumlah file dan kasus aktif dipin dari hasil suite setelah pemetaan, lalu
divalidasi silang oleh manifest, runner, shard proof dan aggregate. Jumlah
lama 46/221 tetap sebagai bukti sebelum pensiun v1, bukan target rilis v2.

## Bukti lokal task 4.3 — 4 November 2026

- Suite database aktif: **33/33 file dan 132/132 kasus PASS** pada Supabase lokal.
- MCP: **114/114 kasus PASS**; test fokus manifest dan runner gate: **28/28 PASS**;
  `pnpm run check` PASS untuk source dan frontend.
- Authenticated Inspector: **31/31 valid dan 31/31 invalid PASS**, lima nama v1
  ditolak, owner denial PASS, serta pemeriksaan privasi log HTTP PASS.
- Audit setelah suite dan setelah Inspector: **85 migration source/applied**,
  **31 RPC**, lima nama v1 absen, **17/17 RLS**, schema/source/ACL cocok, dan
  **nol fixture/fault**. Histori migration cocok, DB lint `--fail-on error`
  keluar 0, dan security advisors lokal melaporkan **No issues found**.
- Tidak ada `.skip` atau `.todo` pada suite database, MCP, dan source aktif;
  `git diff --check` PASS. Dua shard **15+18 file** tetap dipin pada manifest
  dan divalidasi test runner, bersama tahap history, lint, advisors, audit,
  cleanup, serta aggregate.

Ini bukti **CI/FIXTURE lokal** untuk task 4.3. Gate rilis G4 dua shard dengan
config dan SHA persis, Issue/PR/Actions, serta bukti LIVE adalah task 5.1–5.5;
hasil lokal ini tidak menggantikannya.
