# Bukti DNA referensi — snapshot publik

Source runtime, test dan konfigurasi dipublikasikan tanpa perubahan byte dari
kandidat yang telah diuji. Dokumentasi dan hasil QA lengkap juga dipublikasikan,
dengan identifier objek/release dan URL ChatGPT privat diganti alias stabil.
Isi Canva copy, source URL fakta, skor, revision, content hash, PASS/FAIL serta
batas riset dipertahankan. Ini bukan perubahan expected untuk menutupi defect.

Bukti lengkap dan histori commit sebelum sanitasi tetap tersimpan lokal; histori
tersebut tidak di-push ke repository publik. QA-ID/QA-RELEASE/QA-PLUGIN dan
PRIVATE-REFERENCE adalah alias dokumentasi, bukan identifier/URL untuk dipakai
pada tool production. Metadata public_snapshot pada JSON menjelaskan batas ini.

Hash fixture yang disebut laporan lama merujuk bukti asli sebelum redaksi.
[Indeks fingerprint](reference-dna-public-evidence-index.json) mencatat SHA-256
asli lokal dan snapshot publik per file agar keduanya tidak tertukar. Filelist
paket serta 15 file runtime tetap identik dengan kandidat terpasang 0.5.7.

Task 6.5 telah lulus setelah repair terarah (10/10), lima format dan batch 5/5.
[Laporan akhir](reference-dna-d6-retest-0.5.7-2026-11-06.md) memisahkan bukti LIVE,
CI, kegagalan historis, dan keterbatasan. Public snapshot ini tidak menjalankan
Write, riset URL, deployment atau evaluasi host baru.
