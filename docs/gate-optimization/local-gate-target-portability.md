# Portabilitas target gate lokal — Issue #86

## Scope dan preflight

- Tanggal: 29 Oktober 2026. Base `main` `243e561c4f3f931a992b42f0a0456342d5551220`; branch `codex/issue-86-local-gate-targets` pada worktree terisolasi. Checkout asal yang memuat perubahan pengguna tidak disentuh.
- Scope diff: `supabase/tests/database/api-page-plan-writes.test.ts`, ekspor satu fungsi pada `supabase/tests/database/helpers/plan-lifecycle.ts`, `scripts/phase-6-13.ts`, dan dokumen ini. Tidak ada expected, migration, source produk, atau konfigurasi gate yang diubah.
- Prasyarat: Node 24.15.0, pnpm 10.33.2, Supabase CLI pin 2.120.0, Deno, Docker, 72 migration, serta stack disposable tanpa metadata linked project. Bantuan `supabase start --help` dan `supabase stop --help` diperiksa sebelum start/stop.
- Riwayat light CI sebelum tes: [40877204312](https://github.com/milyarderpro/content-producer/actions/runs/40877204312) pada base `243e561c`, 42 detik; [40876830466](https://github.com/milyarderpro/content-producer/actions/runs/40876830466), 43 detik. Estimasi sebelum run: start 1–2 menit, Page/plan sekitar 49 detik dari tes fokus historis, Inspector 78–109 detik menurut [baseline](baseline-and-inventory.md), `pnpm run check` sekitar 1 menit, light CI sekitar 42 detik. Kedua tes database dijalankan berurutan. Full backend gate **NOT RUN** untuk PR fokus.

## Target dan isolasi

Runner salinan `/tmp/issue-86-gate-runner` memakai `project_id` **`issue-86-local-gate-disposable`**, berbeda dari nama folder runner dan dari stack pengguna `content-producer`. Konfigurasi runner sementara memakai API **60321** dan DB **60322**; konfigurasi commit tidak berubah. Sebelum start, container DB/REST/API, network, volume, dan port 60320–60329 untuk identitas disposable tidak ada/semuanya bebas. Start stack baru berhasil dalam **65,970 detik** tanpa reset stack pengguna.

Inspeksi sebelum query pertama membuktikan DB ID `efb08fb63e81…`, nama `supabase_db_issue-86-local-gate-disposable`, status running, network `supabase_network_issue-86-local-gate-disposable`, volume `supabase_db_issue-86-local-gate-disposable`, dan binding `5432/tcp` ke **60322**. REST ID `8097019f7d94…` dan API/Kong ID `6347b97f0470…` running pada network yang sama; URI DB REST menunjuk nama DB disposable, sedangkan binding API `8000/tcp` menuju **60321**. Stack pengguna terpisah: DB ID `7fff50e7a3e5…`, network/volume `content-producer`, port DB **54322**, API **54321**.

Page/plan memakai ID DB hasil resolver helper yang memeriksa config, nama, status, network, volume, dan port. Jalur sinkron serta sesi race asynchronous memakai `docker exec -i`; SQL dan token masuk melalui stdin. Error yang dilempar hanya label teredaksi. Inspector memvalidasi ulang DB/REST/API sebelum fixture, memastikan host DB pada URI REST menunjuk DB yang sama, lalu memakai image dan network REST lokal. Container PostgREST tambahan memakai nama unik dan port loopback yang dipilih bebas saat runtime serta divalidasi sesudah start. Host Deno sementara dibentuk dari source host lokal dengan dua port runtime dan import `file:` ke source asli; file source di repository tidak diubah. Resource/JWT audience, issuer, `supabaseUrl`, dan izin jaringan Deno mengikuti port host sementara.

Uji negatif mengubah hanya config runner sementara. Saat port DB diubah ke **60332** dan port API ke **60331** tanpa mengubah container, masing-masing proses keluar nonzero dengan penanda mismatch sebelum kasus/fixture/HTTP; wrapper Docker mencatat **0 percobaan `exec` atau `run`**. Uji ketiga menyuntik network REST yang salah hanya ke hasil `docker inspect` melalui wrapper; proses juga keluar nonzero dengan penanda mismatch dan **0 percobaan `exec` atau `run`**. Config dipulihkan sebelum tes positif. Tidak ada container atau network pengguna yang dimodifikasi.

## Hasil fokus dan kebersihan

| Pemeriksaan                  | Status      | Durasi dan bukti                                                                                                                                                                     |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| File Page/plan lengkap       | **PASS**    | 18/18 kasus; **54,567 detik** wall clock. Race async, role/JWT, denial owner, dan expected tetap utuh.                                                                               |
| Inspector authenticated      | **PASS**    | Initialize/list, 33/33 tool valid dan 33/33 invalid; penolakan auth/owner dan redaksi log lulus. **160,106 detik** wall clock; 68 panggilan `tools/call` termasuk skenario tambahan. |
| `pnpm run check`             | **PASS**    | Format, lint, typecheck, 11 file/71 tes source, build, 19 tes frontend.                                                                                                              |
| `git diff --check`           | **PASS**    | Whitespace diff bersih sebelum push.                                                                                                                                                 |
| Audit cleanup/katalog        | **PASS**    | Audit katalog **2,491 detik**; 72 migration, 0 workspace fixture `p54-*`/`phase53-*`, 0 container PostgREST sementara. Stack pengguna tetap pada ID dan port semula.                 |
| Light CI head PR             | PENDING     | URL/status/durasi dicatat sesudah PR.                                                                                                                                                |
| Full backend CR-020/044 gate | **NOT RUN** | Di luar scope PR portabilitas ini.                                                                                                                                                   |

Setelah audit, stack disposable dihentikan dengan `--project-id issue-86-local-gate-disposable --no-backup` dalam **14,064 detik**. Container DB/REST/API disposable sudah tidak ada; ID, status running, dan port DB stack pengguna tetap sama.

## Batas bukti

Tes fokus menggunakan fixture lokal dan tidak membuktikan kondisi production/live maupun seluruh full backend gate. Light CI hanya memeriksa source pada SHA head PR; ia tidak menjalankan database/Inspector. Tidak ada linked/remote database, credential atau data production, deployment, merge, ataupun production business Write. Pembuktian G3 pada SHA gate yang sama tetap pekerjaan terpisah.
