# CR-050 — Diagnostik aman untuk penolakan sumber trivia

**Status:** kandidat lokal, belum diuji pada runtime live atau di-deploy.

**Issue:** [#49](https://github.com/milyarderpro/content-producer/issues/49).

**Keputusan pemilik:** 26 Oktober 2026, bedakan penyebab `FACT_SOURCE_INSUFFICIENT` agar diagnosis cepat tanpa audit URL per fakta.

## Batas keputusan

Pertahankan kode error utama `FACT_SOURCE_INSUFFICIENT` dan seluruh kebijakan sumber. Untuk `trivia_register_and_reserve_facts`, validasi input memberi satu diagnostik pertama berupa posisi fakta 1–9 dan kategori aman: metadata tidak valid, pasangan tier/type salah, duplikasi canonical URL, tidak ada sumber A/B, Tier A wajib untuk fakta sensitif, kurang kelompok sumber independen, atau `as_of_date` wajib. Kategori metadata tidak valid **tidak** mengklaim field atau URL spesifik. Kegagalan lain dan jalur koreksi yang tidak mempunyai posisi mempertahankan error umum.

SQL menaruh hanya tag kategori allowlist pada `DETAIL`; MCP memvalidasinya kembali sebelum mengisi `field_errors` yang sudah opsional dalam kontrak frozen. Detail mentah, URL, klaim, token, dan pesan SQL tidak boleh diteruskan. Satu Tier B yang valid tetap cukup untuk `stable` + `standard`. Preflight statis ini tidak menggantikan pemeriksaan otoritatif saat reservasi di bawah lock.

## Batas bukti dan rilis

Tiga penolakan live CMP/MVF belum mempunyai payload maupun versi runtime terverifikasi. Perubahan ini meningkatkan kemampuan diagnosis; **bukan** bukti akar live telah ditemukan atau `FIXED`. Test fokus perlu membuktikan kategori, redaksi, dan jalur sukses minimal. Karena migration/business RPC berubah, satu full CR-020 gate pada kandidat final wajib sebelum deployment; aturan estimasi lebih dari 10 menit dalam `AGENTS.md` tetap berlaku. Commit, PR, merge, deploy, dan retest live adalah izin terpisah.
