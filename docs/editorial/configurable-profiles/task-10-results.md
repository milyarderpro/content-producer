# Hasil sementara task 10 — rilis CR-062

Diperbarui 14 November 2026. Change `add-configurable-trivia-editorial-profiles`,
schema `spec-driven`. **Progres 9/10; task 10 belum selesai.**

## Positive QA config2 — blocker connector Issue #148

Percobaan publish format pada mcpv39 ditolak connector sebelum MCP karena key
map dinamis; katalog tetap revision0/kosong dan tidak ada Write sukses.
[Reproduksi, perbaikan dan kelanjutan](task-10-host-map-fix.md) memuat batas bukti.
Issue145 tetap FIXED; Issue148 masih OPEN sampai retest connector positif.

## Hasil terkini — perbaikan Issue #145

[PR146](https://github.com/milyarderpro/content-producer/pull/146) merged pada
`04ca90cbba3552f99b60b976cd0704f1219c618d`;
[G4 43561690208](https://github.com/milyarderpro/content-producer/actions/runs/43561690208)
PASS 11m12s, DB 238 tanpa skip, MCP 131, Inspector serta kedua audit/advisors/cleanup
lulus. Edge **mcp v39 ACTIVE**,26/26 file provider cocok source G4.

QA minimal owner OAuth pada Page config1 yang sama kini **PASS**: generation
context, config/timestamp 6 digit, workspace/Page discovery, runtime, discovery 33
dan anonymous business Read denial. Katalog Read baru juga PASS; metadata chat
33 tool tersedia. Tidak ada business Write. **Issue #145 FIXED berdasarkan LIVE
retest**; FAIL sebelumnya tetap historis. [Laporan/batas bukti](task-10-context-fix.md)
dan [JSON retest](task-10-issue145-live-retest.json) memuat rincian.

Sisa task 10 adalah positive QA config2 profile/data-only publish→Page→save/revise
→readback yang belum dijalankan. Tidak ada adopsi Page production atau publikasi.

## Rilis awal dan bukti historis sebelum Issue #145

PR [#139](https://github.com/milyarderpro/content-producer/pull/139),
[#141](https://github.com/milyarderpro/content-producer/pull/141), dan
[#143](https://github.com/milyarderpro/content-producer/pull/143) sudah merged.
Backend final `30e8b3e31fb394b913114ad33cd743021e8f748f` lulus
[G4 manual exact-SHA](https://github.com/milyarderpro/content-producer/actions/runs/43543996820)
**PASS**, 12m40s, committed config tanpa overlay. Source 208/frontend 19;
DB 33 file/238 kasus (158+80, nol skip); MCP 18 file/130 kasus dan Inspector 33 valid/
33 invalid+lima tool v1 ditolak+owner denial sekali pada shard 1. Kedua shard lulus
history 94, lint, local advisors terpisah, audit before/after/final dan cleanup.
Identitas SHA/hash/runtime semua report cocok; verifier aggregate lokal juga PASS.
Light CI merge SHA tersebut [PASS 38s](https://github.com/milyarderpro/content-producer/actions/runs/43543850536).

Supabase production yang dikonfirmasi menerima sembilan migration melalui CLI
2.120.0; history sekarang 94, latest `20261112142435`. Pin katalog hosted **PASS**
source/ACL persis (300 functions, 33 API, 19 RLS tables). Count dan hash row16 tabel
bisnis existing identik sebelum/sesudah migration, dengan proyeksi config1
mengabaikan tiga kolom baru. Rate limiter dan migration history tidak termasuk
klaim preservasi ini. Lima Page existing tetap config1; 53 post dan 328 fact utuh.

Edge `mcp` sekarang **v38 ACTIVE**, bundle
`b621a18c359fd43f6d7ed9c033450c55ce03e36138d99f21dab68262c1f7724f`.
Semua 26 file provider cocok byte source G4. Gateway verify_jwt=false dipertahankan;
middleware owner OAuth tetap aktif. `mcp-probe` v13 tidak berubah; frontend tidak
dideploy. Owner Read berhasil; workspace mengiklankan config_schema_versions [1,2].
Discovery publik mengembalikan 33 tool. Business Read tanpa OAuth menghasilkan
HTTP 200 **isError=true Authentication required** dan challenge; HTTP 200 itu
bukan bukti akses bisnis berhasil.

Backup schema/data native CLI disimpan privat di luar repo (0700/0600), checksum
dan gzip dibaca penuh serta count/history diperiksa. Cakupan public/internal/api/
supabase_migrations; Auth credentials tidak diekspor, Storage kosong, Edge v37
24 file dibackup dan diverifikasi terpisah. Restore belum diuji; PITR/physical
backup tidak tersedia. Percobaan archive awal gagal dan tidak dipakai. Jalur
retry forced-role ditolak auto-review dan tidak dijalankan; backup berhasil
melalui CLI standar tanpa forced session role.

Hosted advisors memperlihatkan WARN SECURITY DEFINER API 31→33 sesuai dua RPC baru
serta satu WARN Auth leaked-password protection existing. Ini berbeda dari
local advisors G4. Arsitektur/grant/owner denial cocok pin; tidak mengubah
keamanan untuk menghilangkan WARN generik. Referensi remediasi:
[API SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Plugin dan batas retest

Plugin Creator mengonfirmasi plugin PRIVATE existing 0.5.8,15/15 file runtime
cocok source, compatibility overlay 0.5.8 dan app binding tetap; tidak ada upload
release identik. Refresh tools pada koneksi existing mcpku2 telah dijalankan;
UI memperlihatkan **21 Write + 12 Read**, termasuk get/update_trivia_editorial_catalog.
Namun sesi Codex ini masih menyediakan 31 tool lama dan schema create_page
config1. Karena tool baru belum dideklarasikan pada sesi ini, catalog/Page QA
config2 **NOT RUN**. SQL management tidak dipakai untuk menggantikan OAuth owner
atau mengklaim host Write PASS.

[Petunjuk resmi refresh MCP](https://developers.openai.com/plugins/deploy/connect-chatgpt)
meminta verifikasi metadata lalu pengujian pada percakapan baru. Langkah berikutnya
adalah memuat metadata terbaru pada sesi/turn baru, memeriksa 33 tool dan schema 2,
lalu melanjutkan katalog→Page QA→plan/context→save/revise→readback untuk tiga
preset, custom dan ekstensi data-only. Gunakan koneksi/plugin yang sama, fresh
context, timestamp 6 digit, fakta/sumber/dedup dan tiga attestation. Berhenti pada
draft/readback; jangan mengadopsi lima Page existing atau merekam publikasi.
Review naskah hanya terhadap DNA referensi tertulis; layout ponsel tidak dibutuhkan.

Pemilik telah mengotorisasi penyelesaian operasional task 10 tanpa pertanyaan izin
ulang. Batas teknis metadata ini tidak mencabut otorisasi tersebut. Tidak perlu
mengulang deployment/G4 untuk source identik; pisahkan SHA dokumen dari backend
terpasang. [Rencana/rollback](task-10-release-plan.md),
[verifikasi](task-10-verification.json) dan [readback aman](task-10-live-release.json)
memuat cakupan/batas bukti. Task10 tetap unchecked sampai retest owner QA selesai.

## Riwayat kegagalan yang dipertahankan

G4 [43396490933](https://github.com/milyarderpro/content-producer/actions/runs/43396490933)
FAIL audit-before; source/MCP/cleanup PASS, DB/Inspector/advisors NOT RUN.
[Koreksi pin](task-10-g4-findings.md) tidak menulis ulang migration.
G4 [43406057727](https://github.com/milyarderpro/content-producer/actions/runs/43406057727)
FAIL shard2; source/shard1 lengkap dan kedua cleanup PASS.
[Issue #142/fix inventaris](task-10-shard2-results.md) mempertahankan run lokal 79/80
serta SEC-only retest 1 PASS. G4 final di atas membuktikan satu run lengkap 238 kasus
PASS; tidak mengubah hasil historis menjadi first-pass atau LIVE QA PASS.
