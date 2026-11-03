# Hasil P5 — Setujui, lifecycle, dan maintenance fakta

**Tanggal:** 2 November 2026. **Scope:** P5-T1/T2/T3, CR-053/054 dan
[CR-056](../../../../docs/decisions/2026-11-02-cr-056-versioned-trivia-maintenance.md).
**Basis source:** `c6da942724dfb32f531581e372e6cb1e278c9820` + working diff P5,
belum merupakan kandidat committed exact-SHA.
**Issue:** [#117](https://github.com/milyarderpro/content-producer/issues/117).

## Implementasi dan kontrak

- Gate v2 menghitung ulang renderer, jumlah/format/budget, Page/config, binding,
  URL, canonical status/reuse, hash dan jadwal. Tiga editorial P4 harus pass pada
  revision/hash terkini. Warning style tidak menjadi gate/waiver v1 pada v2.
- Shared approval/publish/revoke/reschedule/archive memahami versi konten,
  mempertahankan envelope input/output lama dan snapshot schema 2 untuk v2.
  Publikasi/metrics tetap pencatatan manual. Failed draft sesudah correction
  tetap dapat di-discard eksplisit tanpa menghapus failed evidence/history.
- Maintenance menggunakan overload dua nama tool yang sama sesuai persetujuan
  CR-056. Reverify mengubah URL canonical, bukan binding; correction menegakkan
  CAS, izin eksplisit, dedup/katalog successor, lineage dan dampak mutable.
- Pelengkap Read yang disetujui menyediakan `fact_updated_at` presisi enam digit
  dari statement snapshot yang sama. Tests mengambilnya lewat Read publik lalu
  memakainya untuk CAS; tidak mengambil tanggal verifikasi dari snapshot post.
- Tujuh migration additive baru; migration lama tidak ditulis ulang. Kontrak
  rinci: [lifecycle v2](../../../../docs/contracts/trivia-v2-lifecycle.md).

## Preflight dan hasil lokal

Estimasi sebelum eksekusi: source check 1–3 menit, fokus P5 1–4 menit, regresi
legacy/P4 2–5 menit; berdasarkan cakupan script, stack lokal tersedia, serta
riwayat light CI `41287158232` sekitar 50 detik. Tidak menjalankan full gate
duplikat atau Actions selama implementasi. Semua Write hanya fixture lokal.

| Pemeriksaan | Hasil dan batas |
| --- | --- |
| `pnpm run check` final | PASS: lint/typecheck, 14 file/150 root tests, frontend typecheck/build dan 19 tests |
| `api-trivia-v2-lifecycle.test.ts` + `api-trivia-v2-maintenance.test.ts` | PASS 18 kasus; 57 detik sebelum pelengkap Read |
| Read/corpus/lifecycle/maintenance sesudah pelengkap Read | PASS 4 file/22 kasus; 1m29s; dataset/cap/completeness dan public CAS tidak berubah |
| Lifecycle setelah pemetaan budget di RPC | PASS 6 kasus; 15 detik, termasuk kegagalan config/budget melalui `approve_post` |
| Legacy/P4: approval quality, lifecycle, lifecycle concurrency, reschedule, correction, v2 save | PASS 6 file/53 kasus; 5m09s. Run ini mendahului pelengkap field timestamp Read; Read/corpus diuji lagi sesudahnya pada baris di atas |
| Migration names/history | PASS: 84 file; seluruh source/applied local cocok |
| DB lint `--local --fail-on error` | Exit 0, nol error. Warning termasuk array initializer, volatilitas helper lama, dan analisis return pada exception handler tetap terlihat; bukan klaim warning-free |
| Local security advisors terpisah | PASS: `results: []`, tidak ada temuan |
| ACL focused P5 | PASS: dua overload baru milik `content_producer_api_owner`, definer dengan empty search_path; authenticated saja, PUBLIC/anon tidak mendapat execute; helper baru invoker dan tidak dapat dipanggil authenticated/anon/PUBLIC |
| Whitespace dan validasi change | PASS: `git diff --check`; `openspec validate simplify-trivia-draft-workflow --type change --strict --json` valid tanpa issues |

Run regresi pertama mencapai timeout shell 120 detik tanpa hasil akhir dan
**bukan PASS**. Tidak ada proses tersisa; run diulang dengan timeout yang sesuai
dan menghasilkan PASS 5m09s di atas. Satu fixture sintetis dari run terputus
diidentifikasi melalui jendela waktu dan pasangan user fixture yang sama;
cleanup scoped selesai, tanpa reset stack atau penghapusan data lain.

## Cakupan kasus

- Page nonaktif, jumlah/config format/budget terkini, binding tidak lengkap,
  URL invalid, benturan reuse, system failed dan editorial stale/needs_revision.
- Approval eksplisit, owner denial, CAS revision, same-key replay,
  ready-reschedule, revoke/reapprove, publikasi eksplisit/replay, archive/readback
  serta metrics append-only dengan nilai tidak diketahui null.
- ID legacy yang hanya expired tetap dapat dipakai v2 lalu approved/published
  tanpa mengembalikan expiry/tier v1 sebagai gate.
- Reverify same meaning dari public Read CAS, URL invalid/perubahan makna,
  stale CAS, owner denial, replay, perubahan katalog, snapshot ready/published
  tetap utuh; dua URL bersaing dengan CAS sama dalam kedua urutan commit.
- Invalidate dan supersede, izin correction eksplisit, successor stale/URL
  invalid/existing identity rollback, lineage dan negative-history discovery,
  approval mutable dibatalkan serta posted/archived evidence tetap utuh.
- Delapan race correction–approval/publish: konten v1/v2 × approve/publish ×
  kedua urutan commit. Sesi holder/waiter berbeda dan `wait_event_type='Lock'`
  teramati; tidak hanya `Promise.all` tanpa bukti overlap.

## Inventaris gate dan handoff

Runtime collection (`vitest list --no-staticParse --json`) mencatat **46 file/
221 kasus**, bertambah tepat 2 file/18 kasus dari baseline 44/203. Static parse
tidak dipakai untuk denominator karena loop race menghasilkan beberapa kasus.
Manifest G4, partisi 21+25, validator jumlah file/kasus dan regresinya diperbarui.
Tidak ada suite lama dihapus, tidak ada skip, dan MCP tetap 15 file/82 pada scope
ini. Daftar tool/adapter MCP versi baru tetap pekerjaan P6.

**NOT RUN:** full G4 Actions manual exact final SHA main, authenticated Inspector
versi campuran P6, host, deployment, business Write production dan LIVE retest.
Gate formal tetap P7 sebelum deployment berizin; hasil lokal bukan bukti rilis
formal, kesiapan cutover v1, atau status FIXED untuk masalah live. PR/Actions
masih memerlukan commit/push/PR sesuai izin pemilik; tidak dijalankan otomatis.
