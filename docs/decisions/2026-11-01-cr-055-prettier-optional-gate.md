# CR-055 — Prettier opsional pada gate source

**Tanggal:** 1 November 2026

**Status:** Diterima oleh pemilik melalui [Issue #111](https://github.com/milyarderpro/content-producer/issues/111)

## Keputusan

Prettier style checking tidak lagi menjadi syarat lulus CI ringan,
`pnpm run check`, atau bukti source G4. Tujuannya agar implementer ChatGPT web dapat
menyerahkan perubahan melalui GitHub/Actions tanpa blocker gaya otomatis.
Penugasan formatter-only [Issue #110](https://github.com/milyarderpro/content-producer/issues/110)
digantikan; enam skill tidak diformat dalam perubahan ini.

## Batas operasional

- `pnpm run format` dan `pnpm run format:check`, dependency, pin, serta konfigurasi
  Prettier tetap tersedia untuk penggunaan manual. Formatter programatik untuk
  serializer laporan tetap berjalan.
- `git diff --check`, review isi dan referensi, locked install, lint, typecheck,
  root test, frontend typecheck/build/test, serta check MCP/probe/paket sesuai
  classifier tetap wajib dan fail-closed.
- G4 manual exact-SHA tetap memerlukan source, dua database shard, MCP,
  Inspector/owner denial, DB lint, security advisors, audit, hash, aggregate,
  dan cleanup. Gate legacy dan `test-all` tetap tersedia.
- Keputusan historis CR-052/053/054 tetap pada konteks dan tanggalnya. CR ini
  hanya mengecualikan pemeriksaan gaya Prettier sebagai gate source aktif.
  Tidak ada perubahan required checks, deployment, atau izin business Write.
