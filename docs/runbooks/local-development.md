# Pengarah pengembangan lokal

Panduan lokal yang dipelihara sekarang adalah
[docs/development.md](../development.md). Untuk cakupan command dan pemilihan gate
gunakan [testing](../testing.md); untuk rilis atau perubahan hosted gunakan
[operations](../operations.md).

Path runbook ini dipertahankan agar referensi lama tetap dapat ditemukan.
Prosedur Phase 5 sebelumnya dapat dibaca pada
[snapshot Git sebelum cleanup](https://github.com/milyarderpro/content-producer/blob/cada9de9ffe916f232cf3efee84f987769fd1c6b/docs/runbooks/local-development.md)
atau melalui riwayat Git lokal. Snapshot itu adalah baseline historis, termasuk
pernyataan bahwa MCP belum aktif; bukan keadaan source sekarang.

## Ringkasan pemakaian lokal

- Jalankan command dari root repository, memakai pin Node/pnpm/Supabase CLI.
- Deno diperlukan ketika menjalankan suite MCP atau harness HTTP.
- Stack database dan fixture memakai lingkungan lokal disposable, bukan
  project production yang kebetulan terhubung ke CLI.
- Wrapper `supabase:reset`, `supabase:seed`, dan `supabase:verify` memilih
  database lokal secara eksplisit. Reset menghapus data lokal; stop biasa
  mempertahankan data.
- Validasi nama migration, pemeriksaan applied history, dan test database
  memiliki cakupan berbeda; lihat tabel command di panduan testing.
- `test-all` sudah mencakup suite database. Jangan menambahkan `smoke-test`
  sebagai duplikasi gate yang sama.
- Estimasikan CI sebelum run; ikuti stop rule jika gate wajib lebih dari 10 menit.
- Output CLI lokal dapat mengandung credential. Sanitasi sebelum mencatat bukti.

Konfigurasi saat ini sudah memiliki entrypoint `mcp` enabled dan frontend auth.
Keduanya tetap membutuhkan konfigurasi lingkungan dan owner yang sesuai untuk
flow yang hendak diuji. Detail schema/owner/RLS ada di
[arsitektur](../architecture.md#5-susunan-data-dan-batas-keamanan).
