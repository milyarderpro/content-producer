Config1 mengunci lima format, dua density, paling banyak sembilan fakta dan satu
goal CTA. Config2 memungkinkan Page memilih satu profil editorial pinned dari
katalog owner versioned, termasuk Curious Mind, DYK, Daily Facts dan custom.
Format/topik/profil tambahan pada struktur trivia yang didukung dapat dipakai
melalui data tanpa switch kode atau paket plugin baru.

Perubahan mencakup sembilan migration aditif, resolver Page/item, renderer hingga
12 fakta, CTA gabungan/LF/placement dan goal null, snapshot3 serta readback,
plan/resume, dua facade katalog owner, schema MCP dan panduan plugin 0.5.8.
Config1/snapshot2 tetap kompatibel; owner OAuth/RLS/grants tertutup, CAS/replay,
sumber/dedup dan approval revision/hash tetap ditegakkan. Tidak ada auto-adoption
Page production atau perubahan koneksi plugin.

## Verifikasi

- LOCAL/FIXTURE: 16 integrasi profil+custom/data-only; 169 hash runtime/demo tetap.
- Database 11 file/174 kasus unik PASS setelah retest 13 kasus Page secara serial;
  run awal memuat dua timeout 5000ms. Tidak menaikkan timeout atau melemahkan assertion.
- `pnpm run check`: 208 source dan 19 frontend; MCP 18 file/130 kasus PASS.
- Authenticated Inspector 33 valid/33 invalid, lima v1 ditolak, owner denial/privacy PASS.
- Pin katalog 94 migration/33 RPC/19 RLS, 5 negative controls, lint, advisors lokal
  terpisah dan cleanup PASS. Paket 15 file/ZIP/hash cocok.
- Inventory G4 direkonsiliasi ke 238 kasus runtime, 158+80 pada 15+18 file;
  collection statis tidak mengikuti semua tabel impor. Seluruh kasus lama tetap.

Full G4 manual pada exact final main SHA dan LIVE config2 masih **NOT RUN**.
Light CI bukan pengganti gate tersebut. Sesudah merge berizin, deployment tetap
menunggu source+dua shard+aggregate PASS, target/backup dan izin deployment.

## Risiko dan rollout

Schema/RPC/config2 harus dipasang sebelum diadopsi Page. Deploy database kemudian
Edge dari kandidat yang lolos gate, dengan verifikasi compatibility dan owner
OAuth. Setelah data config2 ada, jangan kembali ke reader lama yang tidak
memahami snapshot3; gunakan forward-fix/release kompatibel dan pertahankan history.
DNA ditinjau terhadap profil referensi tertulis; layout ponsel bukan gate.
Tidak ada frontend baru, Facebook/Canva API, worker AI, atau laporan DNA/CTA baru.

Refs #138.

Light CI kandidat backend `a71fe5c` [PASS dalam 54 detik](https://github.com/milyarderpro/content-producer/actions/runs/43393463414). Handoff dan rencana rollback: `docs/editorial/configurable-profiles/task-10-results.md` serta `task-10-release-plan.md`.
