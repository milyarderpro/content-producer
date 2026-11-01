# CR-055 — Runtime range Node/Deno dan bukti G4 actual-version

**Status:** Accepted by coordinator for CI/tooling on 1 November 2026; formal G4 exact-final-SHA on `main` remains NOT RUN and required before the next backend release.
**Date:** 1 November 2026. **Base:** `main@0cd17c63d3b14569d2ebe00150f4e3dbf7171019`.
**Scope:** CI/tooling saja. Tidak mengedit ADR-001 historis, backend RPC, migration, RLS, OAuth, atau konfigurasi versi pemilik.

## Otoritas dan alasan

Pemilik sengaja mengubah `.nvmrc` ke `>=22`, `package.json.engines.node` ke `>=22 <25` dan `.deno-version` ke `>=2.9.7` di `main` pada SHA di atas. Catatan ADR-001 tanggal 8 Oktober tetap sejarah keputusan pin lama. Run [Actions #41278659728](https://github.com/milyarderpro/content-producer/actions/runs/41278659728) membuktikan `tests/foundation.test.ts` gagal karena mengharapkan string pin lama, bukan karena bug runtime range. Node yang benar-benar ter-resolve pada runner itu adalah 24.22.1. Kesesuaian actions/setup-node atau setup-deno terhadap range **tidak sama dengan** hasil G4.

## Arti range yang diimplementasikan dan batas dukungan

| Sumber deklarasi | Pernyataan pemilik (tetap) | Penerimaan preflight / batas |
| --- | --- | --- |
| `.nvmrc` | `>=22` | Dipadukan dengan engine `>=22 <25`; **Node 22.x, 23.x, 24.x** tanpa prerelease |
| `package.json.engines.node` | `>=22 <25` | Upper bound **<25**, reject 21.x dan 25.x |
| `.deno-version` | `>=2.9.7` | Runtime Deno **2.9.7 sampai akhir major 2.x**; Deno 3.x belum diuji sehingga gate menolak walaupun selector terbuka. Ini safety ceiling G4, **bukan perubahan file pemilik** |
| `packageManager` dan Supabase dependency | `pnpm@10.33.2`, `supabase@2.120.0` | Tetap exact pins, lockfile tetap diperiksa |

`scripts/runtime-range.ts` memakai parser **subset comparator numerik yang eksplisit dan diaudit** (`>=`, `>`, `<`, `<=`, `=`; tiga digit pada output aktual, major/minor/patch pada comparator). Operator lain seperti `^`, `~`, `||`, wildcard, alias, prerelease, output rusak dan angka tidak aman ditolak. Kontrak lower/upper diuji melalui boundary cases, **namun itu saja tidak cukup** untuk membuktikan seluruh rentang: `assertRuntimeSpecs` sekarang wajib cocok dengan **ketiga string deklarasi exact** `.nvmrc >=22`, engine `>=22 <25`, dan `.deno-version >=2.9.7` sebelum melaporkan `effective` tetap. Perubahan lain memerlukan review koordinator/change record baru; preflight menolak `>=22 <24.100` atau `>=2.9.7 <2.11` meskipun beberapa sampel lolos. Rentang deklarasi tidak diubah dan dependency semver baru tidak ditambahkan. Ini **bukan** janji compatibility untuk setiap patch/major dalam range: CI saat ini hanya membuktikan kombinasi aktual yang tampil di log.

## Selector Actions: irisan aman tanpa mengubah deklarasi pemilik

Ketiga workflow aktif (`.github/workflows/ci.yml`, `backend-gate-candidate.yml`, `backend-technical-gate.yml`) memakai **`node-version: '>=22 <25'`** untuk setiap `actions/setup-node@v4`, bukan lagi `node-version-file: .nvmrc`; dan **`deno-version: '>=2.9.7 <3'`** untuk setiap `denoland/setup-deno@v2`, bukan lagi `deno-version-file: .deno-version`. Versi ini membatasi pilihan setup runner ke irisan aman dari file pemilik, engine dan ceiling gate; workflow yang lebih lebar bisa memilih Node 25/Deno 3 lalu gagal sebelum tes bermakna. Tidak ada job, tahapan manual atau kebijakan gate yang dihapus. `tests/workflow-config.test.ts` menginventarisasi semua setup action (CI 1 Node/1 Deno, G4 3 Node/2 Deno, legacy 1 Node/1 Deno) dan fail-closed pada perubahan selector, termasuk kembali ke `*-version-file`.

## Identitas/runtime report dan keamanan G4

1. Preflight tetap menolak SHA salah, checkout kotor, manifest/shard drift, lockfile/Supabase pin salah, dan command gagal. Node dan Deno dikumpulkan dari output sebenarnya lalu dibandingkan dengan kontrak range, pnpm dan Supabase dengan pin exact. Gagal satu → `TOOL_VERSION_MISMATCH` fail-closed, bukan fallback ke spec.
2. `Identity.runtime` dan report G4 baru memuat **`declared`** (`nodeSelector`, `nodeEngine`, `denoSelector`), **`effective`** (Node `>=22.0.0 <25.0.0`, Deno `>=2.9.7 <3.0.0`), dan **`resolved`** (Node, Deno, pnpm, Supabase actual). Jika preflight tidak lolos, runtime = null, tidak mengarang versi.
3. `sameIdentity` membandingkan runtime bersama SHA/hash sebelum dan sesudah run. `gate-backend.ts --aggregate` memverifikasi bahwa laporan source, shard 1 dan shard 2 punya bukti runtime lengkap/valid **dan sama persis**; SHA/hash, manifest, kasus, audit keamanan, inspector, cleanup dan dua shard tetap wajib.
4. Perubahan preflight/report ini memerlukan **satu G4 CR-052 manual pada exact final SHA main setelah integrasi**, bukan pada PR atau source SHA historis. Koordinator akan memberi perintah terpisah; **tidak ada G4 yang dipicu oleh Issue #114**.

## Verifikasi dan batas

Test fokus baru mencakup lower-bound, outside major, malformed spec/output, **narrowed-but-sentinel-passing spec** (Node `>=22 <24.100`, Deno `>=2.9.7 <2.11`), selector tiga workflow, pin drift, resolved versions, cross-run equality dan report evidence. `pnpm run check` serta light Actions harus dibaca pada exact SHA head; status failed/skipped dilaporkan apa adanya. Belum ada test matrix Node 22 dan 23 atau runtime Deno minor lain; perlu validasi kompatibilitas sebelum mengiklankan seluruh kombinasi sebagai teruji. Tidak ada deployment, hosted OAuth, owner production writes, atau pengecualian keamanan.
