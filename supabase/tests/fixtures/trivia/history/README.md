# Snapshot performa historis untuk regresi

`phase-5-9-performance-A.json` dipindahkan dari `docs/` pada Task 5 cleanup,
25 Oktober 2026, tanpa perubahan byte. File ini tetap dibaca oleh
`api-trivia-populated-performance.test.ts`; expected `label: A` tidak diubah.

Snapshot merekam pengukuran pada checkpoint lama, bukan hasil performa production
sekarang. Hasil pengujian baru yang diminta lewat `CR016_EVIDENCE_RUN=A/B` disimpan
terpisah pada `artifacts/cr016/`; file historis ini tidak ditulis ulang.

Lihat [panduan testing](../../../../../docs/testing.md) dan
[indeks arsip](../../../../../archive/README.md) untuk konteks serta lokasi bukti lain.
