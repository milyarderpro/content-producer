# Tasks

Kotak tercentang menunjukkan implementasi dan verifikasi source/fixture yang selesai,
bukan bukti cutover production. Rantai migration dan histori production dipertahankan.

## 1. Keputusan dan batas data

- [x] 1.1 Catat change record yang secara eksplisit mengganti kewajiban kompatibilitas v1 pada CR-053/054 dan TDW-16/17, menetapkan 31 tool aktif plus lima penolakan v1 tanpa melemahkan CR-052; verifikasi tautan keputusan, cakupan override, dan `git diff --check`.
- [x] 1.2 Inventaris ulang production secara read-only: owner/workspace/Page/config, semua tabel dan referensi konten v1/v2, FK, JSON snapshot, operation ledger, reservasi, job, dan histori migration; hasilkan matriks hapus/pertahankan dan verifikasi tidak ada data owner lain yang diam-diam masuk scope.

## 2. Penutupan alur konten v1

- [x] 2.1 Tambahkan migration maju yang menutup lima RPC khusus v1 dan overload v1 untuk dua tool pemeliharaan, termasuk replay/in-flight; pertahankan overload v2, helper bersama, dan tool umum. Verifikasi clean install dan upgrade fixture, direct-RPC v1 ditolak, v2 positif, serta audit grant/RLS/owner denial.
- [x] 2.2 Lepas lima nama v1 dari registry/handler Edge dan cabang input v1 pada dua tool pemeliharaan; audit jalur pilot, alias, dan PostgREST. Verifikasi katalog 31 nama, lima panggilan lama gagal tanpa perubahan data, `pnpm run check`, dan test MCP fokus.
- [x] 2.3 Pertahankan perilaku tool umum untuk post/fakta v2 melalui test fokus lifecycle, plan, metrik, dedup, save/revise, CAS, replay, dan readback; dokumentasikan batas kompatibilitas yang dipertahankan pada kontrak tool serta verifikasi test database/MCP terkait.

## 3. Reset konten dan pemulihan

- [ ] 3.1 Buat prosedur backup lokal terbatas untuk schema, konten yang akan dihapus, identitas/Page/config pembanding, dan histori migration; dokumentasikan restore insiden serta verifikasi checksum dan keterbacaan tanpa commit/unggah konten atau credential.
- [ ] 3.2 Buat skrip reset transaksional dari matriks 1.2, dengan scope owner, lock, pemeriksaan precondition, urutan FK, dan perbandingan data tetap. Verifikasi fixture v1/v2 menghasilkan nol konten, fixture scope berubah membatalkan semua, dan Page/config tetap identik.
- [ ] 3.3 Tambahkan prosedur cleanup terarah untuk satu draft QA beserta turunannya setelah retest live; verifikasi pada fixture bahwa hanya ID QA yang dihapus dan hasil akhir nol tanpa mengubah Page/config.

## 4. Plugin, dokumentasi, dan gate

- [ ] 4.1 Perbarui source plugin Content Producer melalui Plugin Creator dan Content Producer agar memakai v2 saja tanpa fallback v1; verifikasi paket/skill, owner OAuth, kasus draft baru, dan respons saat post lama diminta.
- [ ] 4.2 Selaraskan README, arsitektur, domain, kontrak tool, development, testing, operations, AGENTS.md, serta matriks/panduan live dengan 31 tool aktif dan v2 saja. Tandai kontrak/hasil v1 historis tanpa menghapusnya; verifikasi referensi, tautan, dan `git diff --check`.
- [ ] 4.3 Perbarui manifest, pin katalog, Inspector, gate runner, dan test menjadi 31 valid/31 invalid plus lima nama v1 absen/ditolak serta owner denial. Verifikasi suite gate fokus, audit migration/history/RLS/grant/security advisors tetap wajib, dan tidak ada skip keamanan yang disembunyikan.

## 5. Integrasi dan rilis production

- [ ] 5.1 Review perubahan terintegrasi, jalankan check/test fokus dan Issue/PR/Actions sesuai aturan proyek, estimasikan durasi, lalu dispatch satu G4 manual exact-SHA kandidat backend. Verifikasi URL, SHA, config/hash, status, dan aggregate PASS sebelum rilis; jika >10 menit, laporkan run dimulai lalu tunggu `lanjutkan` untuk memeriksa hasil.
- [ ] 5.2 Setelah G4 PASS, ambil backup dan preflight production terbaru, tutup RPC v1 melalui migration maju, lalu deploy Edge katalog v2. Verifikasi versi terpasang, v1 direct/MCP ditolak, v2 dan owner OAuth tetap berfungsi, serta perbedaan scope menghentikan tindakan.
- [ ] 5.3 Dalam jendela write yang dibatasi, jalankan reset konten production sesuai matriks; verifikasi hitungan konten nol, operasi lama tidak replay, dan ID/hash akun/workspace/Page/config sebelum-sesudah identik. Jika ada mismatch, catat `BLOCKED` tanpa penghapusan sebagian.
- [ ] 5.4 Perbarui plugin PRIVATE, uji host pada Page QA yang disetujui dengan satu draft v2 dan readback, lalu cleanup ID QA secara terarah. Verifikasi v1 absen/ditolak, hasil akhir konten nol, Page/config tetap, dan jangan beri PASS pada uji yang belum berjalan.
- [ ] 5.5 Catat laporan akhir yang memisahkan LIVE, CI/FIXTURE, source SHA, versi backend/plugin terpasang, backup, hitungan sebelum/sesudah, serta risiko plugin lama; verifikasi setiap status task sesuai bukti dan tidak menyebut rollback data yang belum diuji sebagai berhasil.

## Workflow follow-up

- Sync dan archive change melalui alur OpenSpec tersendiri setelah seluruh pekerjaan dan bukti rilis selesai.
