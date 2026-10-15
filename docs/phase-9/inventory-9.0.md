# Phase 9 checkpoint 9.0 — Inventaris deployment (read-only)

- Tanggal inventaris: 2026-10-15 (Asia/Jakarta).
- Status checkpoint: **PENDING — production target dan baseline remote belum terkonfirmasi**. Phase 9 telah mulai (**In progress**); checkpoint 9.1 **belum dimulai**.
- Baseline `main`: `c9b33ff728adc4c523d71b0ab5aadad3878ab252` (merge PR #7), sesudah PR #6 (`85a3778c82fdc0dddc2de7908dc21dee6a5c04ba`).
- Branch inventaris/source berikutnya: `codex/phase-9-deployment`; draft PR ke `main` mengikuti checkpoint ini.
- Dasar: `AGENTS.md`, Issue #8, `plans/works/phase-9-implementation-plan.md`, PRD §29 dan §31, CR-019, CR-020, database design, tool inventory, acceptance traceability, migration source.
- Batas: pemeriksaan cloud **baca-saja**; perubahan hanya file dokumentasi pada branch GitHub. **Tidak** melakukan Supabase link/restore/reset/migration/function deployment, perubahan Auth, secret, provisioning, import/deploy Vercel, atau perubahan `main`.

## Inventaris source yang sudah dibuktikan

| Area | Temuan pada baseline main |
| --- | --- |
| Migration source | **67** berkas SQL di `supabase/migrations/` dari `20261008045700_baseline_extensions_and_schemas.sql` sampai `20261012124852_materialize_trivia_candidate_input.sql`; urutan menurut timestamp filename. Semua file migration lama tetap tidak disentuh. |
| Schema/database | `supabase/config.toml`: API meng-ekspos schema `api`, `auto_expose_new_tables = false`, PostgreSQL lokal major 17; tabel bisnis berada dalam desain core/trivia; `supabase/seed.sql` bersifat no-op untuk fixture tambahan. |
| MCP | `supabase/functions/mcp/index.ts` → `edge.ts` → middleware OAuth/owner → handler/registry. `registry.ts` menjumlahkan 11 grup tool; kontrak frozen menetapkan **33 MCP tools**. Angka hosted belum diuji. |
| Authentication | `supabase/functions/mcp/auth.ts` memvalidasi signature, issuer, audience/resource, waktu, scopes, OAuth client, dan owner/workspace. `[functions.mcp] verify_jwt = false` di `config.toml` sengaja membiarkan discovery/challenge mencapai middleware; **bukan** izin anonymous tool calls. |
| Frontend Vercel | `auth-frontend/README.md` dan placeholder `src/.gitkeep`, `static-host-config/.gitkeep`; **belum ada aplikasi/build/rute auth**. Diperlukan `/login`, `/oauth/consent`, `/logout` dan safe errors; root directory Vercel nantinya `auth-frontend/`. Implementasi baru checkpoint 9.1. |
| CI/toolchain | `.github/workflows/phase-6-ci-baseline.yml`, `phase-7-light-ci.yml`, `phase-8-light-ci.yml` tersedia sebagai referensi; belum ada gate release Phase 9. `package.json` mengunci pnpm 10.33.2 dan Supabase CLI 2.120.0; `pnpm run test-all` tersedia. Gate baru merupakan 9.2–9.3, **belum dijalankan**. |

## Kandidat cloud (baca-saja, belum ditetapkan sebagai target)

Akun Supabase yang terhubung mengembalikan **satu** project: `triviaku` (ref `dnchhvsrfyruptlnafef`), region `ap-northeast-1`, status **INACTIVE**, dibuat 2026-10-02. **Project ini bukan production Content Producer sampai pemilik mengonfirmasi identitas, riwayat, tujuan, dan persetujuan eksplisit.** Tidak diaktifkan atau dipakai untuk staging/production.

- Pemeriksaan `list_migrations`: **gagal** (`Connection terminated due to connection timeout`). Migration history remote: **UNKNOWN**; **tidak boleh** diasumsikan kosong atau sejalan dengan 67 berkas lokal.
- Pemeriksaan `list_tables` untuk `public`, `api`, `internal`: **gagal** karena koneksi database timeout. Keberadaan tabel, baris production, identitas pengguna, dan apakah project pernah dipakai sebagai production: **UNKNOWN**.
- Metadata Edge Functions belum memberikan bukti terverifikasi tentang deployment MCP pada target production. Jangan mengklaim function sudah deployed/absen.
- Target Supabase production yang disetujui pemilik: **PENDING** (belum ada keputusan). Referensi project di atas hanya kandidat yang terlihat, bukan persetujuan.
- Akun/team Vercel: **PENDING**; tidak tersedia akses terverifikasi ke workspace/dashboard, daftar project, domain, ataupun historical deployments. Provider **Vercel sudah dipilih** pada runbook, tetapi akun/team/domain belum.
- Penanggung jawab: pemilik melakukan pemilihan project/team, login, consent, dan memasukkan konfigurasi rahasia lewat dashboard/secure prompt; implementer menyiapkan instruksi serta pemeriksaan teredaksi pada checkpoint selanjutnya. Pelaksana backup/rollback operasional dan hak aksesnya: **PENDING konfirmasi**.

## Rencana backup, migration, dan rollback (belum dieksekusi)

1. **Gate identitas:** pemilik mengonfirmasi satu project Supabase production dan satu akun/team Vercel. Periksa status active, kegunaan project, isi dan owner data, riwayat deployment/migration, lokasi, kebutuhan retention, serta apakah sudah terdapat pengguna/traffic. Jika belum dapat dibuktikan, **STOP** sebelum cloud write.
2. **Gate history/data:** inventaris remote schema/tabel dan row-count teredaksi, `supabase_migrations.schema_migrations`, function terpasang, RLS/grant/advisor dan data existing. Bandingkan dengan 67 migration source secara kronologis. Bila history berbeda, migration asing, schema drift, atau data bermakna tak terklasifikasi: **STOP** untuk rekonsiliasi yang disetujui, tanpa `migration repair`, SQL ad-hoc, atau reset.
3. **Backup sebelum write:** bila ada data, pilih backup yang tersedia pada plan Supabase (managed backup/PITR bila tersedia dan/atau logical export database yang konsisten), cakup schema/roles/data yang relevan, simpan secara aman di luar repository, catat waktu, cakupan, ukuran/checksum, retention, dan uji restorability pada lingkungan aman. Jangan menyimpan dump, token, password, atau secret di GitHub. Bila benar-benar kosong, dokumentasikan bukti keadaan kosong dan rencana snapshot sesudah inisialisasi. Backup belum dibuat atau diverifikasi.
4. **Prasyarat deployment:** gate teknis Phase 9.3 **PASS pada exact SHA `main` yang dibekukan**; project dan akses owner terkonfirmasi; histori remote cocok dengan source; backup lulus bila dibutuhkan. Satu operator melakukan migration berurutan **dari file repo** dengan mekanisme resmi serta dry-run jika didukung CLI. Jangan push seed test. Periksa applied/source history, schema, RLS, grant, dan advisor pada setiap batas tahap. Tidak ada perintah deployment dieksekusi di 9.0.
5. **Rollback frontend/function:** bila versi sebelumnya tersedia, redeploy/revert ke versi Vercel dan Edge Function yang tercatat beserta SHA; untuk deployment pertama, gunakan cara menonaktifkan akses/endpoints secara aman bila rollback versi tidak tersedia. **Database:** hindari down-migration destruktif; gunakan additive forward-fix yang direview, atau restore backup melalui prosedur insiden yang disetujui dan memperhitungkan kehilangan data sejak snapshot. Target recovery point/time, operator yang berwenang, jalur eskalasi, dan rehearsal restore: **PENDING**.
6. **Stop condition:** tanpa persetujuan target, backup terverifikasi (jika ada data), history cocok, dan gate 9.3 PASS, dilarang melakukan Phase 9.4. Phase 8 tetap Deferred menurut CR-019/020.

## Bukti eksekusi 9.0

- Pengambilan metadata/read file dilakukan melalui konektor GitHub pada ref eksplisit `main` dan konektor Supabase dengan operasi hanya baca-saja.
- Source baseline serta kelengkapan tree diverifikasi dari GitHub Git ref/tree: tree tidak truncated, **399 entries**, **67 SQL migrations**.
- Tidak ada local checkout/shell yang dibuat; karena itu `git status`, `git diff --check`, dan test process exit code lokal tidak diklaim. Branch baru dibuat dari SHA persis `main`, tanpa perubahan unrelated lokal.
- Untuk 9.0, **CI belum dijalankan**; bukan PASS. Penyusunan gate/action merupakan scope 9.2–9.3.
- Hanya `plans/implementation-plan.md` dan dokumen inventaris ini yang boleh berubah. Draft PR dan SHA aktual direkam pada Issue #8.
- Keputusan akhir checkpoint: **PENDING** sampai target production, kondisi remote, dan akun/team Vercel terverifikasi serta disetujui pemilik. Jangan centang Issue 9.0 dan jangan mulai 9.1.
