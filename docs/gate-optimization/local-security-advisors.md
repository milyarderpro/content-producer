# Validasi local security advisors — Issue #82

## Scope dan preflight

- Tanggal: 29 Oktober 2026. Source/base `main`: `a6c10ac5d6ad7c96e875615542927519cc1de830`. Branch: `codex/issue-82-local-security-advisors`. Satu-satunya file PR adalah dokumen ini; tidak ada perubahan script, workflow, manifest, package, tes, migration, source, CR-052, atau trivia.
- Tujuan: membuktikan kemampuan **security advisors lokal** Supabase CLI versi proyek sebagai pemeriksaan tersendiri. [CR-020](../decisions/2026-10-15-phase-9-10-risk-based-mvp-acceptance.md), [CR-052](../decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md), dan [matriks G1](invariant-matrix.md) membedakannya dari `db lint` dan audit katalog/RLS/grant. [Dokumentasi Advisors](https://supabase.com/docs/guides/observability/advisors) dan [perbaikan upstream #5887](https://github.com/supabase/cli/pull/5887) memberi konteks, bukan bukti perilaku versi pin.
- Prasyarat: `pnpm install --frozen-lockfile`, Docker lokal, stack disposable dengan 72 migration. `pnpm exec supabase --version` menghasilkan **2.120.0**. Bantuan `pnpm exec supabase db advisors --help` diperiksa sebelum memilih `--local`, `--type security`, `--level info`, `--fail-on`, `--output-format json`, dan `--workdir`; bantuan `start`/`stop` juga diperiksa sebelum penggunaan. Tidak ada credential linked/remote atau production.
- Riwayat light CI sebelum pengujian: [40854029703](https://github.com/milyarderpro/content-producer/actions/runs/40854029703) pada base selesai sekitar 42 detik; [40853516406](https://github.com/milyarderpro/content-producer/actions/runs/40853516406) sekitar 41 detik; [40852722451](https://github.com/milyarderpro/content-producer/actions/runs/40852722451) sekitar 36 detik. Estimasi sebelum run: start stack sekitar 118 detik menurut baseline historis pemilik, reset sekitar 29 detik bila diperlukan, tiga fase advisor sekitar 1–3 menit termasuk inspeksi, light CI sekitar 20–60 detik. Pemeriksaan dokumen: Prettier, referensi, `git diff --check`, lalu light CI. Full backend gate `NOT RUN` untuk PR ini.

## Isolasi dan database bersih

Runner salinan berada di `/tmp/issue-82-advisor-runner`, terpisah dari worktree PR; `project_id` runner adalah `issue-82-security-advisors-disposable`, port DB 58322, dan tidak ada metadata `.temp` linked project. Sebelum start, container, network, volume, dan port `5832x` disposable belum ada. Start membuat volume baru dan menerapkan **72 migration**; durasinya **66,244 detik**, exit `0`. Karena volume benar-benar baru, baseline diambil pada database bersih tanpa reset tambahan (`NOT RUN`). Konfigurasi repository di worktree PR tidak diubah.

Sebelum query dan kontrol negatif, `docker inspect` memastikan ID container `4882db2d…`, nama `supabase_db_issue-82-security-advisors-disposable`, status running, network `supabase_network_issue-82-security-advisors-disposable`, volume `supabase_db_issue-82-security-advisors-disposable`, serta binding `5432/tcp` ke port host **58322**. ID ini dipin untuk seluruh SQL kontrol. Stack pengguna memiliki ID `7fff50e7…`, nama/network/volume `content-producer`, dan port host **54322**. Identitas/config/port disposable diverifikasi ulang sebelum perubahan dan setiap fase advisor/audit. Tidak ada query atau reset pada stack pengguna.

## Command dan hasil teredaksi

Command advisor final yang diuji dari runner: `pnpm exec supabase db advisors --local --type security --level info --fail-on error --output-format json --workdir /tmp/issue-82-advisor-runner`. Output JSON ditangkap dalam memori; hanya jumlah, tingkat, identitas lint yang diperlukan, durasi, dan status exit yang dicatat. Detail/deskripsi/metadata temuan, SQL, token, dan credential tidak dicetak atau disimpan. Run awal eksplorasi memakai `--fail-on none` untuk memisahkan keberadaan temuan dari status exit; run kontrol berikutnya memakai `--fail-on error` untuk memeriksa perilaku gate.

| Fase pada DB disposable                    |      Durasi | Exit    | Temuan security menurut level | Hasil                                               |
| ------------------------------------------ | ----------: | ------- | ----------------------------- | --------------------------------------------------- |
| Baseline volume baru, `--fail-on none`     | 1,680 detik | `0`     | 0                             | `PASS` — tidak ada temuan                           |
| Ringkasan ulang baseline, `--fail-on none` | 1,150 detik | `0`     | 0                             | `PASS` — hasil tetap sama                           |
| Kontrol negatif pertama, `--fail-on none`  | 1,185 detik | `0`     | 1 `ERROR`                     | `PASS` — lint terdeteksi; exit nol sesuai flag      |
| Kontrol negatif kedua, `--fail-on error`   | 1,136 detik | nonzero | 1 `ERROR`                     | `PASS` — threshold benar-benar menggagalkan command |
| Sesudah cleanup, `--fail-on error`         | 1,195 detik | `0`     | 0                             | `PASS` — kembali bersih                             |

Kontrol negatif dibuat **hanya** pada DB disposable: tabel `public.issue_82_advisor_negative_control` tanpa RLS dan `GRANT SELECT ... TO anon`, tanpa data. Query pada ID container terverifikasi membuktikan `relrowsecurity=false` dan privilege `anon SELECT=true`. Kedua run advisor dengan kontrol aktif memuat lint `rls_disabled_in_public` untuk tabel tersebut pada tingkat `ERROR`. Tabel dihapus setelah setiap run; audit akhir memperoleh **0 tabel, 0 policy, 0 grant** yang terkait kontrol dan tetap **72 migration**. Sesudah stop eksplisit `--project-id issue-82-security-advisors-disposable --no-backup`, container/network/volume disposable hilang, sedangkan DB/network/volume pengguna tetap ada.

## Verdict dan batas bukti

- **Kemampuan command CLI pin:** `PASS`. Versi 2.120.0 menjalankan security advisors lokal dan menghasilkan JSON yang dapat dihitung pada stack disposable.
- **Sensitivitas dan exit gate lokal:** `PASS` untuk kontrol `rls_disabled_in_public`; temuan `ERROR` muncul dan `--fail-on error` keluar nonzero. Baseline/final bersih pada migration source base di atas. Ini tidak menyatakan semua aturan advisor telah diuji.
- **Pemasangan pada runner/Actions G3 dan bukti exact-SHA G4:** `NOT RUN` / belum terbukti. Dokumen ini tidak mengubah gate. G3 masih perlu langkah advisor eksplisit yang terpisah; G4 harus membuktikannya pada kandidat SHA yang sesuai dengan kontrak CR-020/044/052.
- `db lint`, audit katalog, full backend gate, hosted Security Advisor, deployment, dan kondisi production: `NOT RUN` / tidak dibuktikan oleh uji ini. Light CI PR hanya memeriksa cakupan docs/source yang benar-benar dijalankan; hasilnya dicatat terpisah pada head PR.
