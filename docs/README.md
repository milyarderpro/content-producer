# Dokumentasi pengembang dan AI

## Mulai memahami project

Panduan berikut ditulis dalam bahasa Indonesia. Nama tool, field, status, dan path
tetap mengikuti kode agar mudah ditelusuri oleh pemilik maupun AI.

1. [Arsitektur](architecture.md) — tujuan produk, hubungan komponen, alur request,
   peta kode, dan titik masuk implementasi serta test.
2. [Domain dan aturan bisnis](domain.md) — arti data, lifecycle, fakta, reservasi,
   kualitas, plan, jadwal, dan metrik.
3. [Kontrak tool](tool-contracts.md) — peta 33 tool, konvensi input/output,
   pengecualian bootstrap, dan pemulihan error.
4. [Development](development.md) — setup lokal, konfigurasi, dan pola pengembangan fitur.
5. [Testing](testing.md) — cakupan command, test fokus, gate CI, dan estimasi durasi.
6. [Operations](operations.md) — identitas runtime, rilis, backup, pemulihan, dan diagnosis.

Panduan ini merangkum source dan keputusan yang dirujuk; bukan bukti bahwa setiap
perubahan source sudah terpasang di production. Kontrak frozen pada `plans/`
beserta keputusan perubahan yang diterima tetap menjadi acuan teknis.

SHA pada header panduan adalah baseline sebelum cleanup. Panduan juga mencakup
perubahan kandidat lokal yang dicatat pada audit; kondisi itu belum otomatis
menjadi commit, workflow GitHub yang sudah aktif, atau versi terpasang.

Instruksi kerja AI yang berlaku ada di [AGENTS.md](../AGENTS.md). Versi source dan
bukti deployment bertanggal dipusatkan di [operations](operations.md), sehingga
nomor versi pada record lama tidak dianggap otomatis sebagai versi live sekarang.

Untuk mulai merencanakan fitur, lihat
[contoh penelusuran perubahan](development.md#7-contoh-penelusuran-perubahan):
metadata Read, format trivia, niche baru, dan penyajian hasil plugin.

## Operasional dan bukti

- [Live Test & Fix](live-test/README.md) adalah workflow aktif untuk pengujian
  langsung dan remediasi menurut instruksi repository.
- [Evaluasi editorial trivia](live-test/editorial/README.md) menyiapkan audit tiga
  dataset, Page uji internal, dan prompt draft tersimpan; hasil uji belum tersedia.
- [Matriks pengujian](live-test/test-matrix.md) dan [hasil pengujian](live-test/results.md)
  mencatat cakupan serta batas bukti yang tersedia.
- [Audit cleanup](cleanup-audit.md) mencatat baseline lokal 25 Oktober 2026,
  dependensi, keputusan kandidat file, dan urutan Task 1–7.

- [G1 baseline dan inventaris full gate](gate-optimization/baseline-and-inventory.md) — profil Actions, pemanggilan suite, dan durasi historis.
- [Matriks invariant dan kasus gate](gate-optimization/invariant-matrix.md) — pemetaan cakupan 41 file dan bukti pengganti yang dibutuhkan.
- [CR-052 rancangan kesetaraan gate](decisions/2026-10-29-cr-052-full-backend-gate-equivalence.md) — keputusan PROPOSED, belum efektif; CR-020/044 tetap berlaku.

## Referensi kontrak dan sejarah

- [Kontrak frozen](../plans/README.md) menjelaskan peran dokumen `plans/` yang
  tetap menjadi acuan dan input test/packaging.
- [Runbook pengembangan lokal](runbooks/local-development.md) menjadi pengarah
  ke panduan development/testing dan referensi baseline historisnya.
- Baris `specified` dalam [acceptance traceability](../plans/acceptance-traceability.md)
  adalah pemetaan requirement frozen, bukan hasil verifikasi implementasi terkini.
- [Dokumen keputusan](decisions/) menjelaskan alasan dan batas perubahan. Status
  yang tercatat harus dibaca sesuai tanggal dan keputusan lanjutannya.
- [Arsip pengembangan](../archive/README.md) memuat indeks 51 rencana/laporan/
  artefak historis beserta lokasi sebelumnya, termasuk tracker fase, procedure-v1,
  dan batas acceptance. Bacaan awal untuk pengembangan tetap panduan di atas.
- Empat input audit Phase 5 dan dua file coverage Phase 8 masih berada pada path
  semula. Snapshot performa A kini berada di fixture history; output test baru
  masuk `artifacts/cr016/`. Penjelasan pembacanya ada di indeks arsip.
