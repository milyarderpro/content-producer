# Bukti sesi 1 — task 1.1–2.3

Tanggal: 3 November 2026. Cabang source: `codex/cutover-trivia-v2-only-s1`.
Status ini adalah **source/fixture**, bukan bukti backend atau plugin production
sudah berganti. Tidak ada migration, deployment, atau business Write production
pada sesi ini. Inventaris production dibaca saja dan dicatat terpisah dalam
[matriks inventaris](production-inventory-2026-11-03.md).

| Task | Bukti dan hasil |
| --- | --- |
| 1.1 | [CR-059](../../../docs/decisions/2026-11-03-cr-059-trivia-v2-only-cutover.md) dan delta spec baru; `openspec validate cutover-trivia-v2-only --strict` PASS. |
| 1.2 | Inventaris owner, Page/config, konten, FK, JSON, ledger, reservasi, job, dan 84 migration production secara read-only; scope satu workspace, tanpa owner lain. |
| 2.1 | Migration maju lokal menutup lima RPC v1 dan dua overload maintenance v1; clean reset PASS, upgrade fixture yang memuat satu post v1 dan satu post v2 PASS, direct-RPC v1 dan replay lama ditolak, v2 save/lookup/reverify serta owner denial PASS. Lock `NOWAIT` diuji dengan pembaca aktif dan membatalkan operasi lock tanpa menunggu. Grant `anon` dan RLS tabel inti diaudit oleh skrip fixture. |
| 2.2 | Katalog MCP fixture 31 nama; lima nama lama absen dan panggilannya ditolak sebelum database; versi 1 pada maintenance ditolak; jalur fixed-pilot menolak lima nama lama. `pnpm run check` PASS. |
| 2.3 | Test database fokus: 10 skenario save/plan/replay/revisi/CAS/metrik dan 13 skenario lifecycle/koreksi v2 PASS. Test MCP: 7 skenario v2/cutover dan 7 skenario tool umum PASS. Kontrak kompatibilitas tool umum dicatat di [tool-contracts](../../../docs/tool-contracts.md). Respons maintenance `needs_review` diperbaiki agar sesuai database v2. |

Pemeriksaan akhir: `pnpm run check` PASS (14 file/156 test source dan
19 test frontend), `deno check`/lint fokus PASS, test MCP fokus PASS,
`openspec validate --strict` PASS, dan `git diff --check` PASS.
Semua fixture database bersifat sintetis. Run database yang dipilih
melewati skenario historis yang sengaja memanggil v1; pembaruan seluruh
suite/gate 31 tool adalah task 4.3, dan G4 exact-SHA adalah task 5.1.
Keduanya belum diberi status PASS di sini.
