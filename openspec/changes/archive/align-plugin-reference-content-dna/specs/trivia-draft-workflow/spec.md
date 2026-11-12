# Spec Delta

## MODIFIED Requirements

### Requirement: TDW-04 Riset dan dedup mendahului copy final

ChatGPT SHALL meriset calon lebih banyak daripada jumlah fakta final untuk draft yang sedang dikerjakan, dengan kalimat dan URL nyata. Dedup dan seleksi MUST selesai sebelum copy final; calon terpakai, meragukan, atau hasil Read tidak lengkap MUST diganti. Cadangan yang kurang SHALL memicu riset tambahan. Plugin MUST memilih angle dan set bervariasi sesuai `trivia-reference-editorial` sebelum menyelesaikan copy.

#### Scenario: Calon bermasalah diganti dalam percakapan yang sama
- **WHEN** dedup menunjukkan calon sudah terpakai, `uncertain`, atau hasilnya tidak lengkap
- **THEN** ChatGPT memakai calon cadangan atau meriset calon baru, mencarinya, lalu menulis copy dari set final

#### Scenario: Fakta yang dapat dipakai tidak cukup
- **WHEN** riset tidak menyediakan cukup calon yang dapat dipakai setelah upaya yang wajar
- **THEN** ChatGPT melaporkan tahap dan alasan berhenti, hasil yang sudah terbukti, dan sisa pekerjaan tanpa mengarang fakta atau URL

#### Scenario: Calon valid tetapi koleksi menyerupai buku pelajaran
- **WHEN** set calon sah tetapi berisi spesifikasi berulang, pembukaan umum, atau fakta pengisi
- **THEN** plugin mengkurasi, meriset pengganti, dan menilai ulang variasi serta urutannya sebelum final copy, tanpa memaksa fakta tidak layak menjadi `distinct`

### Requirement: TDW-06 Kualitas keras dan editorial ditegakkan saat save dan revise

Sistem SHALL menghitung metrik resmi dan menolak struktur, URL, jumlah, format, identitas/reuse, atau budget keras yang gagal. Tiga hasil editorial MUST `pass` dan terikat revision/hash; `needs_revision` MUST menolak perubahan. Catatan gaya nonblocking tetap terpisah. Plugin MUST menyelesaikan penyuntingan DNA sebelum Write tanpa mengubah gate atau arti tiga hasil server.

#### Scenario: Copy melewati batas keras
- **WHEN** copy melampaui budget Page atau tidak cocok dengan pengaitan fakta
- **THEN** save/revise ditolak tanpa post/revisi baru dan memberi lokasi serta tindakan perbaikan

#### Scenario: Editorial belum lulus
- **WHEN** kesesuaian makna, caption tanpa klaim tambahan yang tidak didukung, atau ketiadaan masalah substansi bernilai `needs_revision`
- **THEN** perubahan ditolak sampai ChatGPT memperbaiki naskah dan menilai ulang

#### Scenario: Hanya saran gaya yang tersisa
- **WHEN** seluruh pemeriksaan wajib lulus, penyuntingan DNA plugin telah selesai, dan hanya ada preferensi gaya minor nonblocking
- **THEN** draft dapat tersimpan, metrik server dan tiga hasil `pass` dicatat untuk revision/hash tersebut tanpa field attestation tambahan

#### Scenario: DNA belum terpenuhi meskipun server dapat menerima
- **WHEN** naskah masih akademis atau melanggar standar komposisi referensi tetapi diperkirakan lolos tiga pemeriksaan v2
- **THEN** plugin memperbaiki naskah sebelum mengirim save/revise atau melaporkan keterbatasan; plugin tidak memakai `quality_status: passed` sebagai pengganti penyuntingan dan tidak mengubah `no_known_substantive_issue` menjadi skor gaya

### Requirement: TDW-07 Setiap draft dibuktikan melalui readback

Setelah setiap save/revise berhasil, ChatGPT SHALL memanggil `get_post` dan mencocokkan Page, fakta, URL, copy, status, revision/hash, serta checks. ChatGPT MUST NOT menyatakan keberhasilan penuh dari preview, HTTP 200, host approval, atau respons Write saja. Klaim DNA tersimpan MUST memakai Canva copy readback yang sama dengan naskah yang dinilai; pemeriksaan server dan penilaian DNA MUST dilaporkan terpisah.

#### Scenario: Satu draft terbukti tersimpan
- **WHEN** save menghasilkan ID post dan `get_post` mengembalikan isi serta state yang sesuai
- **THEN** ChatGPT dapat melaporkan ID dan isi draft itu sebagai hasil tersimpan, dengan penilaian DNA mengacu pada copy tersebut

#### Scenario: Readback sementara gagal
- **WHEN** respons save diterima tetapi `get_post` belum berhasil
- **THEN** ChatGPT menjelaskan batas bukti dan merekonsiliasi post yang sama tanpa membuat draft pengganti untuk memenuhi readback

#### Scenario: Versi yang dinilai berbeda dengan versi tersimpan
- **WHEN** readback tidak cocok dengan copy yang telah disunting atau hanya versi chat yang mengikuti DNA
- **THEN** hasil tidak diklaim lulus DNA, post yang sama direkonsiliasi menurut CAS dan scope izin, dan tidak ada save baru sekadar mengganti bukti
