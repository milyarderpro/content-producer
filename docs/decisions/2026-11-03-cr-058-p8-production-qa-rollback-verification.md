# CR-058 — Verifikasi pemulihan P8-T1 pada Page QA production

**Status:** Accepted untuk **lokasi dan bentuk verifikasi P8-T1** serta
rencana kriteria, target, pemicu dan prosedur pada
[`phase-8-rollout-plan.md`](../../openspec/changes/simplify-trivia-draft-workflow/phase-8-rollout-plan.md);
tindakan cutover tetap memerlukan keputusan terpisah. **Tanggal:** 3 November 2026.
**Change:** `simplify-trivia-draft-workflow`, P8-T1 / checklist 8.1.

## Keputusan pemilik

Setelah diberi pilihan antara latihan rollback pada runtime Supabase lokal
terisolasi dan mengubah kriteria P8-T1 agar tetap di production, pemilik memilih:

> Tetap production; ubah kriteria P8-T1

Setelah pemeriksaan Read Page QA dan rancangan target/pemicu/prosedur
disajikan, pemilik menjawab **“Ya, setujui rencana P8-T1”**. Persetujuan ini
berlaku pada rencana P8-T1, bukan izin menonaktifkan pembuatan v1, mengganti
release production, atau melakukan rollback sungguhan.

Keputusan ini melanjutkan preferensi pemilik pada P7 untuk memakai Supabase
production. Page `Content Producer QA Sandbox (Verified)`
`3c7dc8b2-43db-42b5-abd6-d334aac0ff83` sudah ditetapkan sebagai fixture
production P7. Scope P8-T1 pada Page itu adalah pembacaan dan pemeriksaan
kompatibilitas data campuran v1/v2 serta plan; perubahan data baru tetap
memerlukan scope objek/payload yang tepat.

## Override verifikasi yang terbatas

P8-T1 memakai **pemeriksaan kompatibilitas pada Page QA production** sebagai
pengganti syarat latihan rollback pada runtime Supabase terisolasi. Pemeriksaan
harus mencatat runtime/backend/plugin terpasang, readback post v1/v2 dan progres
plan, serta memastikan tidak ada perubahan tak diminta pada ID, status,
revision/hash atau item. Bukti CI/fixture yang sudah ada untuk replay,
maintenance dan penolakan owner tetap terpisah dari pemeriksaan production.

Pemeriksaan ini **tidak membuktikan pergantian backend atau plugin lama secara
nyata**, restore backup, atau pemulihan saat insiden. Target rollback harus
kompatibel dengan schema dan data v2; binary sebelum 84 migration dan dump
sebelum P7 bukan target aman untuk data baru. Bila nanti ada rollback sungguhan,
operator tetap memerlukan izin tindakan, bukti kompatibilitas target, gate yang
berlaku, dan pemeriksaan sebelum/sesudah. Pembuatan v1 tidak dinonaktifkan hanya
karena pemeriksaan Page QA lulus.

Keputusan ini tidak mengubah keamanan owner OAuth, RLS/grant, satu identitas
canonical, maintenance/replay/in-flight v1, batas Read CR-054, atau syarat
readback dan G4 exact-SHA untuk perubahan backend. P8-T2 tetap menuntut retest
LIVE yang relevan sebelum keputusan pensiun pembuatan v1.

Rincian kriteria, inventaris dan prosedur yang diajukan dicatat pada
[`phase-8-rollout-plan.md`](../../openspec/changes/simplify-trivia-draft-workflow/phase-8-rollout-plan.md).
