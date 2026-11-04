# Backup dan pemulihan cutover v2

Dokumen ini mendukung task 3.1–3.3 pada change `cutover-trivia-v2-only`.
Backup production diambil **sesaat sebelum** reset pada task 5.2, setelah
gate rilis lulus dan jendela write dibatasi. Backup fixture bukan backup
production. Jangan jalankan `supabase db reset --linked`.

## Ambil dan periksa backup

Gunakan direktori baru di luar repository, misalnya
`/home/ongkay/.codex/backups/content-producer/p8-<tanggal>-<run>/`.
Direktori dibuat mode `0700`; berkas mode `0600`. Jangan commit, unggah,
atau menyalin isi backup dan credential ke log atau dokumen. Jika memakai
mode production, sediakan `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` dan
`PGPASSWORD`/`PGPASSFILE` dari lingkungan aman; jangan taruh connection string
pada argumen proses. Client PostgreSQL harus cocok dengan versi server.

```sh
bash scripts/cutover-backup.sh production /home/ongkay/.codex/backups/content-producer/p8-<tanggal>-<run>
```

Mode `local` memakai container `supabase_db_content-producer` tanpa credential
production. Arsip tunggal berisi schema dan data aplikasi `public`, `internal`,
serta `supabase_migrations` pada satu snapshot konsisten. Arsip mencakup konten
yang hendak dihapus dan baris aplikasi yang dipertahankan. Pembanding terpisah
memuat ID akun Auth dan seluruh baris workspace, Page, config, dan niche.
File `migration-history.jsonl` memudahkan pemeriksaan urutan migration.
Pembanding dan histori diambil sesudah arsip; karena itu hentikan business
write selama pengambilan dan cocokkan hitungan/sidik jari lagi sebelum reset.

Periksa `SHA256SUMS` dengan `sha256sum --check`, daftar arsip dengan
`pg_restore --list`, lalu baca JSON pembanding dan baris histori. Catat lokasi,
checksum, jumlah baris, project ref, waktu, dan operator pada catatan rilis
tanpa menyalin konten. Jika satu pemeriksaan gagal, jangan jalankan reset.

## Insiden dan restore

1. Hentikan business write, catat waktu dan SHA rilis, serta simpan keadaan
   database saat insiden sebagai backup terpisah. Jangan menimpa backup awal.
2. Verifikasi checksum dan daftar arsip. Pulihkan **ke database terisolasi
   dahulu**, dengan versi schema dan histori migration yang cocok. Arsip
   aplikasi tidak berisi tabel Auth; sediakan identity yang diperlukan secara
   aman sebelum memulihkan FK aplikasi.
3. Cocokkan ID akun, workspace, Page, config, niche, dan histori migration
   terhadap pembanding. Periksa seluruh konten dan referensi yang dipulihkan.
4. Siapkan rencana restore ke production berdasarkan baris yang benar-benar
   diperlukan, urutan FK, data baru sesudah insiden, serta persetujuan pemilik
   atas payload. Jalankan uji restore terisolasi dan gate yang berlaku sebelum
   tindakan production. Jangan menjalankan `pg_restore --clean` ke production
   atau menganggap rollback backend otomatis memulihkan data.

Backup ini adalah titik pemulihan logis. Keberhasilan restore production belum
terbukti sampai prosedur insiden benar-benar diuji dan disetujui.

## Reset konten sesudah backup

`scripts/cutover-reset-content.sql` dijalankan lewat `psql -X` dengan
`ON_ERROR_STOP=1`, `workspace_public_id` yang dibaca ulang pada preflight,
dan `backup_confirmed=on`. Jalankan hanya setelah jendela write dibatasi,
backup production diverifikasi, serta migration/Edge v1 ditutup menurut
task 5.2. Contoh bentuk perintah (connection detail berasal dari lingkungan):

```sh
psql -X -v ON_ERROR_STOP=1 -v workspace_public_id=<ID_WORKSPACE> \
  -v backup_confirmed=on -f scripts/cutover-reset-content.sql
```

Skrip mengunci tabel aplikasi dalam satu transaksi, memeriksa owner dan
inventaris, pekerjaan aktif, ledger, serta referensi konten dalam config.
Ia menghapus turunan sebelum induk, lalu menuntut semua tabel konten dan
catalog kosong. Jika ada kesalahan atau data tetap berubah, transaksi
dibatalkan seluruhnya. Setelah commit, operator tetap harus membaca ulang
hitungan dan pembanding dengan koneksi baru; hasil fixture tidak menggantikan
bukti production. Uji fixture: `pnpm exec tsx scripts/verify-cutover-reset.ts`.

## Cleanup satu draft QA setelah retest live

Sesudah task 5.4 berhasil menyimpan dan membaca kembali satu draft v2 di
Page QA, catat `post_public_id` dari respons dan baca ulang ID tersebut di
database. Jalankan `scripts/cutover-cleanup-qa.sql` dengan `workspace_public_id`,
`qa_page_public_id`, dan `qa_post_public_id` yang tepat:

```sh
psql -X -v ON_ERROR_STOP=1 -v workspace_public_id=<ID_WORKSPACE> \
  -v qa_page_public_id=<ID_PAGE_QA> -v qa_post_public_id=<ID_DRAFT_QA> \
  -f scripts/cutover-cleanup-qa.sql
```

Skrip menolak ID yang salah, status selain draft, post tambahan, plan,
atau turunan yang tidak cocok. Ia menghapus riwayat, binding, bukti, post,
fakta, ledger konten terkait, dan katalog dalam satu transaksi; Page/config
dibandingkan sebelum dan sesudah. Baca ulang seluruh hitungan konten pada
koneksi baru. Uji fixture:
`pnpm exec tsx scripts/verify-cutover-qa-cleanup.ts`.
