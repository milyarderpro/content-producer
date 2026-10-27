# CR-051 — Hapus batas total baris visual dan perjelas penolakan dedup

**Status:** disetujui pemilik pada 27 Oktober 2026; perubahan source kandidat, belum dibuktikan live.

**Pelacakan:** [Issue #58](https://github.com/milyarderpro/content-producer/issues/58).

**Motivasi:** dua draft trivia yang dinilai kuat secara DNA tercatat memiliki 29 estimated visual lines dan tertahan oleh hard limit 28. Estimator baris bukan bukti tampilan Canva akhir. Kasus `DNA-SSF-01` juga menerima `FACT_REVIEW_REQUIRED` tanpa posisi fakta; hasil dedup yang terlihat terpotong. Penyebab persis penolakan live itu tetap tidak terverifikasi.

## Perubahan terhadap kontrak frozen

Keputusan ini mengesampingkan **hanya** batas total 28 estimated visual lines pada `plans/trivia-content-dna.md` §9.3 dan `plans/phase-0-decision-register.md` §10.3 serta butir 8 pada §10.11 (QUALITY-001/002). `line_count` tetap dihitung dan dikembalikan sebagai informasi, tetapi tidak lagi menjadi syarat `trivia.readability.hard_limits` atau penghalang `draft → ready`. Tidak ada angka pengganti dan tidak ada warning baru. Batas kata, baris per fakta/hook/CTA, replay, loop, karakter komponen/final, akurasi sumber, dedup, keselamatan, dan persetujuan owner yang eksplisit tetap berlaku.

Untuk `trivia_register_and_reserve_facts`, kode utama `FACT_REVIEW_REQUIRED` tetap sama. Bila resolver reservasi mempunyai posisi fakta yang valid, SQL menambahkan `DETAIL` allowlist `REVIEW_DIAG:<position>:REVIEW_MISSING_OR_INVALID`. MCP memvalidasi detail itu dan menampilkan hanya `facts[index].dedup_reviews` serta alasan aman bahwa keputusan review belum lengkap atau tidak konsisten. Resolver koreksi lama tidak berubah. Tidak ada klaim, URL, kandidat, token, atau SQL mentah yang dipaparkan; penolakan dan aturan anti-duplikasi tidak dilonggarkan.

## Bukti dan rilis

Regresi harus membuktikan 29 baris tidak lagi gagal **karena total baris** dan batas lain tetap memblokir bila dilanggar; readback tetap mengembalikan metrik. Regresi dedup harus membuktikan posisi/diagnostik aman, redaksi, serta perilaku penolakan yang tidak berubah. Karena business helper SQL berubah, satu full CR-020 gate wajib pada backend SHA final sebelum deployment. Light/focused tests saja tidak membuktikan runtime production. Retest live pada versi terverifikasi diperlukan sebelum menandai perbaikan `FIXED`; tidak ada approval/publikasi otomatis untuk draft lama.
