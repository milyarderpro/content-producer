# Backend Supabase

Direktori ini berisi konfigurasi lokal, migration SQL, RPC bisnis, Edge MCP, dan
test database. Pada baseline peninjauan 25 Oktober 2026 terdapat 70 migration
source dan 33 tool/RPC bisnis. Hitungan source bukan pemeriksaan applied history
production terkini; bukti versi dicatat di [operations](../docs/operations.md).

## Peta implementasi

- `migrations/`: riwayat schema, validator, helper, RPC, RLS, dan grant. Pertahankan
  migration yang sudah diterapkan; perubahan berikutnya memakai file baru.
- `functions/mcp/`: entrypoint aktif, default owner OAuth, transport, schema,
  serta handler tipis yang meneruskan operasi ke RPC `api`.
- `functions/deno.json` dan `deno.lock`: dependency/runtime Edge yang dikunci.
- `tests/database/` dan `tests/fixtures/`: regresi serta fixture lokal.
- `seed.sql`: saat ini no-op; registry niche `trivia` dikelola migration.

`functions.mcp` sudah enabled pada `config.toml`. `verify_jwt=false` di gateway
memungkinkan discovery/challenge mencapai middleware aplikasi, yang tetap
memeriksa token, owner, dan workspace. Schema bisnis Data API adalah `api`;
lokasi tabel di `public` bukan izin caller membaca tabel langsung.

Probe `functions/mcp-probe/`, helper rollback fixed-pilot, dan host test lokal
`functions/batch_a_server.ts` mempunyai tujuan terpisah. Status hosted atau
penghapusannya memerlukan penelusuran sendiri; bukan alasan melemahkan auth.

## Panduan kerja

- [Arsitektur dan peta SQL/test](../docs/architecture.md).
- [Aturan domain](../docs/domain.md) dan [kontrak tool](../docs/tool-contracts.md).
- [Setup stack/migration lokal](../docs/development.md).
- [Cakupan suite dan full gate](../docs/testing.md).
- [Verifikasi runtime, deployment, dan pemulihan](../docs/operations.md).

Test database/harness dapat menulis dan membersihkan fixture. Gunakan stack lokal
disposable; pengujian positif irreversible tidak diarahkan ke data owner production.
