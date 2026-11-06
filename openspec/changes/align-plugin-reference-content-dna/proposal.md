# Proposal

## Why

Draft Corious Facts yang sudah tersimpan lolos pemeriksaan v2, tetapi sebagian terasa seperti daftar spesifikasi, ringkasan buku pelajaran, atau pengingat umum; pemilihan angle, komposisi, urutan, dan bahasa belum menyerupai Curious Mind, DYK, dan Daily Facts. Pemilik meminta DNA referensi menjadi standar penulisan **sebelum draft disimpan**, dengan American English yang natural untuk US, UK, CA, dan AU.

## What Changes

- Menjadikan kecocokan DNA dan bahasa nonakademik sebagai kewajiban proses penulisan plugin sebelum `save_post_v2`/`revise_post_v2`, melalui seleksi dan penyuntingan internal tanpa checkpoint persetujuan tambahan. Tiga hasil editorial server tetap sama; `quality_status: passed` tidak diklaim sebagai bukti DNA.
- Merevisi `content-dna.md` dan menambah `reference-patterns.md` serta `writing-playbook.md`: angle familiar, variasi kejutan, urutan perhatian, 12 contoh Canva copy lengkap beranotasi, pasangan contoh lemah/perbaikan, dan batas pelestarian makna.
- Mengembalikan `Did you know?` sebagai hook default; fast trivia umumnya 7–8 fakta dan utility 5–6, mengikuti instruksi eksplisit serta config. Jumlah draft tidak diubah menjadi jumlah fakta.
- Memperjelas comparison agar kesetaraan metrik berlaku dalam setiap pasangan, sedangkan dimensi antarpoin dapat bervariasi; myth-busting memakai koreksi natural, tanpa kewajiban mengulang label `Myth:`/`Fact:`.
- Mempertahankan pilihan topik luas sesuai config dan referensi, termasuk tubuh, makanan, negara/kota, sejarah, dan benda sehari-hari; menghindari post yang hanya berisi angka sejenis atau fakta dasar dengan judul sensasional.
- Menambahkan evaluasi 12 kasus dengan pembanding lama/baru, review semantik, dan retest saved-copy/readback yang diotorisasi secara terpisah. Memperbarui allowlist paket, hash/file-count checks, routing referensi, dan versi kandidat agar referensi benar-benar terbundel.
- Menyiapkan change record editorial sebelum implementasi aturan yang berbeda dari baseline frozen/CR-053, dengan pemisahan tegas antara kewajiban penulis di plugin dan validasi server.

## Capabilities

### New Capabilities

- `trivia-reference-editorial`: perilaku editorial plugin dari pemilihan angle hingga Canva copy final, pembelajaran contoh, review DNA sebelum penyimpanan, dan evaluasi hasil nonakademik.

### Modified Capabilities

- `trivia-draft-workflow`: mengintegrasikan seleksi DNA sebelum copy final, review internal sebelum save/revise, pemisahan kualitas server dari DNA, serta kesetaraan copy yang dievaluasi dengan hasil readback.

## Impact

- Target: `plugin/skills/content-producer/`, manifest versi kandidat, `scripts/plugin-package.ts`, test paket/editorial, langkah paket pada `.github/workflows/ci.yml`, serta dokumentasi keputusan dan evaluasi yang relevan. Dua referensi runtime baru menambah kandidat dari 13 menjadi 15 file; corpus evaluasi tetap di luar paket.
- API/backend tetap: 31 tool, schema/payload v2, renderer, database, OAuth, RLS, dedup, CAS, timestamp, dan approval tidak diubah. Tidak menambah source quota, OpenAI API, model worker, atau format backend baru.
- Di luar scope: mengedit 18 draft lama, mengubah config Page/plan production, menyimpan draft uji, commit/push/PR/merge, pemasangan plugin, dan deployment pada tahap proposal. Issue/PR/Actions, pemasangan, serta retest live mengikuti izin dan workflow yang berlaku saat implementasi.
- Bukti: audit sebelumnya pada 5 November 2026 membaca 18 draft; 15 terbaru memakai item plan `fixed: 5`, bukan pembatasan backend. Paket source dan cache lokal yang diperiksa versi 0.4.0 identik; hal itu tidak membuktikan release ChatGPT terpasang. Data referensi adalah pilihan post jutaan views oleh pemilik, bukan sampel untuk menjanjikan causal lift atau virality.
