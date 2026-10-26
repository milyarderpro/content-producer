# CR-050 — Diagnostik aman untuk penolakan sumber trivia

**Status:** source sudah digabung ke `main` dan full gate lokal terisolasi lulus; runtime live belum diuji dan belum di-deploy.

**Issue:** [#49](https://github.com/milyarderpro/content-producer/issues/49).

## Addendum audit katalog setelah merge

**Defect gate:** [Issue #51](https://github.com/milyarderpro/content-producer/issues/51).

PR #50 digabung ke `main` pada SHA `879c547d5cd0d78ed2dbce99283c85753f0ca591`.
[Full gate #40329988395](https://github.com/milyarderpro/content-producer/actions/runs/40329988395)
berakhir **FAIL** pada audit katalog awal: skrip masih mengharapkan 70 migration,
sedangkan CR-050 menambah migration ke-71. Clean reset migration dan regresi
OAuth/owner telah selesai, tetapi Inspector, `test-all`, dan pemeriksaan akhir
belum berjalan. Ini kegagalan kompatibilitas audit dengan perubahan yang
disetujui, bukan PASS gate atau bukti perilaku production.

Perbaikan audit harus mengunci byte migration CR-050, membandingkan body dua
fungsi private yang diganti dengan isi migration tersebut, dan tetap menguji
owner, security mode, SET options, ACL, semua fungsi lainnya, grants, RLS,
riwayat migration, serta kebersihan fixture terhadap baseline 67 migration
yang diterima. Jangan mengubah baseline historis. Jalankan ulang satu full gate
pada SHA `main` final sebelum deployment; status live tetap belum terverifikasi.

[PR #52](https://github.com/milyarderpro/content-producer/pull/52) memperbaiki audit tanpa
mengubah migration atau backend runtime. [Full gate #40364895835](https://github.com/milyarderpro/content-producer/actions/runs/40364895835)
pada exact `main` SHA `be7ce5455863d3c51f4cfdd9ec6c9263e837ede3` selesai
**SUCCESS** dalam 13m56s: clean reset, OAuth/owner, audit sebelum/sesudah
Inspector, 33-tool Inspector dan cross-owner denial, `test-all`, history
migration, DB lint, audit akhir, whitespace, dan evidence upload lulus.
[Issue #51](https://github.com/milyarderpro/content-producer/issues/51) ditutup
untuk defect gate ini saja. Dokumentasi setelah gate memakai SHA tersendiri;
gate backend boleh direuse hanya jika source backend, migration, security config,
dan runtime dependency tetap identik. Ini belum membuktikan deployment atau
memperbaiki kegagalan live pada Issue #49.

**Keputusan pemilik:** 26 Oktober 2026, bedakan penyebab `FACT_SOURCE_INSUFFICIENT` agar diagnosis cepat tanpa audit URL per fakta.

## Batas keputusan

Pertahankan kode error utama `FACT_SOURCE_INSUFFICIENT` dan seluruh kebijakan sumber. Untuk `trivia_register_and_reserve_facts`, validasi input memberi satu diagnostik pertama berupa posisi fakta 1–9 dan kategori aman: metadata tidak valid, pasangan tier/type salah, duplikasi canonical URL, tidak ada sumber A/B, Tier A wajib untuk fakta sensitif, kurang kelompok sumber independen, atau `as_of_date` wajib. Kategori metadata tidak valid **tidak** mengklaim field atau URL spesifik. Kegagalan lain dan jalur koreksi yang tidak mempunyai posisi mempertahankan error umum.

SQL menaruh hanya tag kategori allowlist pada `DETAIL`; MCP memvalidasinya kembali sebelum mengisi `field_errors` yang sudah opsional dalam kontrak frozen. Detail mentah, URL, klaim, token, dan pesan SQL tidak boleh diteruskan. Satu Tier B yang valid tetap cukup untuk `stable` + `standard`. Preflight statis ini tidak menggantikan pemeriksaan otoritatif saat reservasi di bawah lock.

## Batas bukti dan rilis

Tiga penolakan live CMP/MVF belum mempunyai payload maupun versi runtime terverifikasi. Perubahan ini meningkatkan kemampuan diagnosis; **bukan** bukti akar live telah ditemukan atau `FIXED`. Test fokus dan full gate di atas membuktikan kandidat source, bukan runtime hosted. Deployment dan retest live tetap tindakan terpisah.
