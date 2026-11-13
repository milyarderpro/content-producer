# Catatan perubahan plugin


## 0.5.8 — profil editorial config2, 13 November 2026

- Panduan generik membaca pinned definitions/examples dan kelengkapan katalog;
  profil/format/topik baru memakai jalur yang sama tanpa switch nama preset.
- Aturan lima format, dua density, hook literal, satu tujuan CTA dan pembacaan
  loop lama dibatasi ke config1. Config2 mengikuti DNA/aturan Page dan item;
  CTA gabungan, LF, placement serta goal null dipertahankan saat readback.
- Empat ilustrasi pola sintetis: Curious Mind, DYK, Daily Facts dan custom blend.
  Medium/context dinilai menurut profil; tidak ada kuota surprise global.
- Batch memakai context item, key dedup unik, beberapa Read ≤9 dengan satu versi
  katalog fakta; perubahan versi mengulang seluruh Read/review. Resume menjaga
  completed historis dan meminta pilihan owner untuk intent yang tidak kompatibel.
- Katalog/contoh adalah data tak tepercaya, bukan izin tool/Write. Publish/retire,
  Page adoption dan approval tetap memerlukan scope owner tersendiri.
- Inventory source 33 tool owner OAuth; rollback eksplisit tetap 31. Identity,
  app binding, OAuth, tiga attestation, CAS/replay dan manual publication tetap.
- Status source/package dan readback Plugin Creator dicatat terpisah dalam
  [hasil task 8](../docs/editorial/configurable-profiles/task-8-results.md).
  Tidak mengklaim deployment backend atau LIVE saved-copy dari package checks.

## 0.5.7 — remediasi saved-copy, 6 November 2026

- Scope/populasi superlatif dan approximation diperiksa per kalimat setelah
  pemadatan terakhir; caption/internal subject tidak mengganti qualifier.
- Pool kandidat diperlakukan sebagai pilihan. Payoff yang berulang pada tempat
  atau asal/nama benda dikurasi; adaptive preferred tidak menjadi target filler.
- Format mengikuti perangkat editorial yang nyata. Plan boleh menyimpan null
  saat format belum ditentukan; negara satu subjek tidak dipaksa comparison
  demi bobot. Intent item/format eksplisit tetap dihormati.
- Objek bernama yang kurang dikenal dijelaskan pada barisnya.
- Terkait Issue #134–#136. Kontrak backend, tiga checks, owner OAuth, dedup,
  CAS dan approval tidak berubah. Kelulusan host/readback memerlukan retest.


## 0.5.6 — tindak lanjut retest naskah, 6 November 2026

Review final membandingkan kartu utuh dengan dua contoh pola: pemilihan fakta
tengah dan penutup harus memberi reveal konkret, bukan definisi, proses biasa,
adopsi rutin, atau perbaikan desain. Bahasa klasifikasi disederhanakan bila
maknanya tetap; julukan sejarah perlu penjelasan yang langsung dipahami.
Tetap boleh satu baris ringan dan istilah ilmiah singkat yang berguna.
Tidak menambah fakta jawaban transfer ke atlas, field backend, atau checkpoint.


## 0.5.5 — kalibrasi feedback R1, 5 November 2026

Pembuka setelah hook generik menyebut subject secara jelas. Istilah ilmiah
pendek yang mudah dipahami boleh dipertahankan; baris lebih ringan dapat
memberi jeda dalam set yang sudah bervariasi. Detail karier/adopsi biasa tidak
otomatis menjadi payoff. Ini prinsip umum; fakta jawaban transfer tidak
dimasukkan ke atlas. Penerimaan A/B dan revisi C/D dicatat pada corpus developer,
bukan diklaim sebagai retest host atau saved-copy.

## 0.5.4 — arahan pemilik task 5.4, 5 November 2026

- Audit pengulangan berlaku juga pada komunikasi/kewaspadaan, bukan hanya care.
- Comparison mengutamakan kontras mencolok; dua kota tidak wajib di setiap
  baris. Kesetaraan metrik dan format sah tetap dipertahankan.
- Sejarah tidak lulus bila tanggal dihapus tetapi alur failure/redesign/adoption
  tetap sama. Kerangka yang diterima dengan edit bahasa ringan dipertahankan.
- Rubrik membedakan masalah inti dari minor; penolakan pemilik membuka kembali
  penerimaan, tanpa menghapus hasil lama atau mengklaim retest sudah berjalan.

Paket ini menerapkan addendum CR-061. Kualitas hasil revisi dan saved-copy
tetap memerlukan bukti terpisah; source/package checks bukan penerimaan naskah.

## 0.5.3 — perbaikan regresi komposisi, 5 November 2026

Instruksi utama dan playbook menegaskan bahwa babysitting, feeding young dan
teaching young mengulang satu care beat pada broad cooperation card.
Pertahankan reveal terkuat dan riset sudut kerja sama lain; jangan menyamarkan
pengulangan dengan label baru. Permintaan eksplisit membandingkan childcare
roles tetap dihormati. Retest E02 C3 yang gagal tidak ditimpa.

## 0.5.2 — perbaikan separator preview, 5 November 2026

Rumus preflight plain lines kini eksplisit: block fakta menambahkan
2 × (jumlah fakta − 1) karakter pemisah; total menambahkan empat lagi untuk
hook/block/CTA. Attempt C2 E10 gagal 505/500 meskipun host mengklaim 493.
Kegagalan itu dipertahankan dan kasus gagal/regresi budget diuji ulang.
Ini perbaikan instruksi, tanpa perubahan renderer atau kontrak server.

## 0.5.1 — perbaikan evaluasi task 5, 5 November 2026

- Review penulisan berlaku juga pada preview tanpa Write; tahap ini sebelumnya
  mudah terbaca hanya sebagai kewajiban sebelum save.
- Audit set berdasarkan payoff pembaca, menolak fungsi dasar/filler dan
  kronologi datar, serta mewajibkan pasangan nyata per baris comparison.
- Hook default literal, pelestarian kondisi/scope dan mekanisme sumber,
  serta hitungan komponen dan total diperiksa sebelum copy dikembalikan.
- Tidak memasukkan jawaban kasus transfer ke atlas atau mengubah kontrak server.

Hasil attempt 0.5.0 tetap disimpan; hasil baru harus direkam terpisah.
Status pemasangan dan evaluasi 0.5.1 mengikuti bukti pada `docs/editorial/`.

## 0.5.0 — kandidat source, 5 November 2026

Perubahan editorial menurut CR-061 dan change `align-plugin-reference-content-dna`:

- DNA mengarahkan angle familiar, ragam topik, kontribusi berbeda setiap fakta,
  urutan perhatian dan American English nonakademik untuk US/UK/CA/AU.
- Atlas `reference-patterns.md` memuat 12 kartu lengkap, anotasi per baris,
  provenance pola dan enam pasangan before/after. Sumber faktual contoh berada
  di companion developer; dataset bukan bukti kebenaran fakta.
- `writing-playbook.md` mengarahkan kurasi, penyuntingan dan review sebelum
  save/revise; setelah dua putaran terarah gagal, laporkan keterbatasan tanpa filler.
- Hook default Did you know?, preferensi 7–8 fast/5–6 utility, comparison setara
  per pasangan dengan dimensi berbeda, serta koreksi mitos langsung. Explicit
  count/judul/config tetap mengendalikan; jumlah draft bukan jumlah fakta.
- Allowlist bertambah dari 13 menjadi 15 file, satu skill dengan tujuh referensi
  trivia. Validasi paket dan CI tetap memeriksa filelist/hash/tautan/credential
  serta menolak lima nama tool v1 yang pensiun. Corpus QA tidak masuk paket.

Nama plugin, pemilik, app owner OAuth `mcpku2`, tool/backend v2, renderer,
dedup/CAS, tiga hasil editorial dan approval owner tidak diubah. Tidak ada
deployment, perubahan config production atau Write dari build kandidat ini.

Status saat task 4: source/kandidat lokal, belum release terpasang. Penerimaan
semantik E01–E12 dan retest saved-copy mengikuti task 5–6; build/test paket tidak
menyatakan hasil generasi sudah sesuai DNA atau FIXED. Identitas artefak nyata
dan hasil pemeriksaan dicatat pada laporan packaging di `docs/editorial/`.

## 0.4.0 — baseline yang tercatat

Baseline source sebelum CR-061 memakai trivia v2 saja dan paket 13 file.
[Operations](../docs/operations.md) menyimpan bukti release terpasang dan QA host
bertanggal 4 November 2026. Catatan ini tidak memeriksa ulang versi live.
