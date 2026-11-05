# Task 5.2 — Backup, migration dan Edge production

**Tanggal:** 4 November 2026. **Status:** PASS LIVE untuk scope task 5.2;
reset konten dan retest draft/plugin masih task 5.3–5.4.

## Kandidat dan izin

Backend exact G4 SHA `37fbbbeb0a0c628d9c5e628b21b5f804a4df9501`,
[run #41854239512](https://github.com/milyarderpro/content-producer/actions/runs/41854239512)
PASS 8m51s. Pemilik menyetujui seluruh langkah cutover dan remediasi pada
4 November 2026. Source backend/config/migration tidak berubah sejak gate;
perubahan checklist/laporan dipisahkan dari backend SHA.

## Scope terbaru dan backup

Target `content-producer-production` (`xjonnilnypchtxogtopb`), PostgreSQL
17.11. Satu akun/owner/workspace `cad2885e-952e-41b3-9eae-d2d9d75d533d`;
4 Page/config dan satu niche tetap. Fingerprint keempat Page/config sama
dengan inventaris historis. Data terbaru: **39 post (28 v1, 11 v2), 265 fakta,
69 evidence, 269 binding, 5 plan/13 item/18 event, 60 history, 0 metrik,
31 reservation set, 1 catalog, 111 ledger konten**. Kenaikan satu post v2
sejak inventaris termasuk scope reset semua konten owner yang disetujui.
Tidak ada owner lain, claim/reservasi aktif atau ledger incomplete; cron/pgmq
tidak ada dan inventaris tetap 17 tabel.

Backup lokal satu snapshot melalui `scripts/cutover-backup.sh`, client
pg_dump/pg_restore **17.11** dari container lokal, credential sementara CLI
hanya di memori. Lokasi di luar repository:
`/home/ongkay/.codex/backups/content-producer/cutover-v2-20261104-41854239512/`.
Direktori **0700**, seluruh file **0600**, arsip **1,240,589 byte**;
SHA-256 arsip `e0c54743304e37c6ead76b43c576b2e8435835b8cd06f9d86344c23e160ed2cc`.
Checksum, `pg_restore --list` dan pembacaan penuh arsip PASS.
Comparator JSON valid, 84 migration cocok dengan source sebelum cutover.
Histori pendamping dari COPY text memerlukan decode backslash PostgreSQL:
file asli dipertahankan, salinan `migration-history.decoded.jsonl` memvalidasi
84 JSON record dan diikutkan SHA256SUMS. Bukan mengubah arsip asli.

Hash comparator backup dan pre-apply production identik:
`6c68ad6e9a3d2891852878f57dd0fcced0ccd1cbaec1d3ae328227174450030a`.
Hitungan konten dan pekerjaan aktif dicek kembali sebelum apply. Restore
production belum diuji dan tidak diklaim berhasil.

## Rilis dan readback

Dry-run hanya memilih `20261103072943_retire_trivia_v1_rpcs.sql`.
`db push --linked --project-ref ... --skip-vault --yes` menerapkannya tanpa
seed/roles/Vault. Readback: **85 migration**, latest **20261103072943**,
**31 API signatures**, lima nama v1 absen; hanya dua overload maintenance v2
tersisa. Konten masih 39 post/265 fakta setelah migration.

`mcp` v36 → **v37**, verify_jwt tetap **false**, owner OAuth di middleware
tetap aktif. Deploy awal ditolak auto-review karena flag dianggap perubahan
keamanan; dua pembacaan metadata dan committed config membuktikan false sudah
berlaku, lalu retry yang sama dengan bukti tersebut diizinkan. Tidak ada
penggantian mode auth atau grant pilot. Bundle provider SHA-256:
`d666ffe0cf2c63ccac8d8ec5ecf595b1d6f4c4d2c82622a0ee23a6853565cdc4`.
**24/24 file source provider identik** dengan source kandidat; probe v13 tetap.

Katalog live 31 tool; lima v1 absen; ketiga tool v2 ada. Lima direct RPC v1
masing-masing **404/PGRST202** dengan publishable key yang tidak dicetak.
Panggilan MCP lama `trivia_release_facts` ditolak unknown tool memakai ID
sintetis yang bukan reservasi nyata; tidak ada business dispatch. Panggilan
business anonim ditolak dengan auth challenge, meskipun HTTP 200.
Owner profile/workspace/Page QA terbaca; dedup v2 berhasil (`complete=true`).
Audit read-only: **17 RLS**, **0 anon API execute**, maintenance v2 saja.
Ini bukti owner Read/v2 Read; keberhasilan save/readback positif adalah task 5.4.
