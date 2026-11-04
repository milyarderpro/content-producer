# Bukti fixture task 3.1–3.3

**Lingkungan:** Supabase lokal `supabase_db_content-producer`, migration terakhir
`20261103072943`. Tidak ada penghapusan atau backup baru pada production.

| Task | Pemeriksaan | Hasil |
| --- | --- | --- |
| 3.1 | `cutover-backup.sh local` pada direktori baru di luar repo; `sha256sum --check`, `pg_restore --list`, pembacaan penuh arsip, JSON pembanding, histori migration, mode izin | PASS. Arsip fixture terbaca; 85 baris migration; direktori `0700`, file `0600`. |
| 3.2 | `verify-cutover-reset.ts`: satu post v1, satu post v2 beserta fakta v2; workspace kedua disisipkan sebelum percobaan pertama | PASS. Scope berubah menyebabkan rollback tanpa kehilangan post. Setelah workspace tambahan dibuang, reset membuat semua tabel konten dan ledger konten nol; Page/config sama persis. |
| 3.3 | `verify-cutover-qa-cleanup.ts`: satu draft v2; pertama memakai ID post salah, lalu ID tepat | PASS. ID salah tidak mengubah data. ID tepat menghapus draft dan turunannya hingga konten nol; Page/config sama persis. |
| Kode | `pnpm run check` | PASS: lint, typecheck, 156 unit test, frontend typecheck/build, 19 frontend test. |

Backup fixture berada di direktori privat lokal; arsip dan pembanding tidak
masuk Git. Pengujian ini membuktikan perilaku fixture, bukan status production.
Backup production, deployment, reset live, dan retest host berada pada task 5.
