# Serah-terima koordinator evaluasi ke ChatGPT Work web

**Status awal, 28 Oktober 2026:** kampanye utama `MAIN` belum dijalankan (`0/30`). Lima pilot format dan uji terfokus sesudahnya adalah bukti historis/diagnostik, **bukan** bagian dari 30 kasus utama. Dokumen ini menjelaskan serah-terima peran, bukan izin menjalankan 30 Write sekaligus.

## Peran dan akses

- **Koordinator web** bekerja di satu chat ChatGPT Work dengan akses `@GitHub` ke `milyarderpro/content-producer`. Ia menyusun satu prompt kasus siap-tempel, menilai hasil DNA dan workflow secara terpisah, menyimpan record serta memperbarui rangkuman/Issue bila perlu. Jangan menganggap file lokal Codex atau riwayat chat ini otomatis tersedia di web.
- **Pemilik** hanya menempel prompt koordinator pada chat penguji baru dan meneruskan **seluruh** jawaban penguji ke koordinator. Pemilik tidak diminta menilai naskah, memeriksa URL per fakta, memberi GO kedua, mengubah file, atau mengelola Issue/PR.
- **Chat penguji** menggunakan hanya plugin PRIVATE `@Content Producer` dengan koneksi owner yang benar. Ia mengikuti prompt satu kasus untuk Page internal `Trivia Editorial Test (Internal)` (`f3984ee4-8ae7-4043-8c93-45765f82f46e`). Izin prompt terbatas pada satu kasus: maksimal satu reservasi dan satu `save_post`, lalu `get_post`; bukan izin membuat Page, merevisi, menyetujui, menjadwalkan, atau memublikasikan.

Sebelum memberikan prompt pertama, koordinator harus memastikan bahwa `@GitHub` dapat **membaca dan menulis** repository yang benar, dokumen aktif di bawah tersedia di branch `main`, dan plugin PRIVATE `@Content Producer` tersedia di chat penguji. Jika akses tulis GitHub atau plugin penguji tidak tersedia, hentikan preflight dan laporkan kekurangannya; jangan menjalankan kasus yang hasilnya tidak dapat dicatat. Jangan meminta pemilik mengedit file sebagai jalan pintas.

## Sumber kebenaran

1. [Prosedur aktif direct-save v1](main-direct-save-v1.md): matriks 30 kasus, urutan, batas Write, prompt kasus pertama, dan aturan jeda.
2. [Protokol penilaian](protocol.md): enam skor DNA 0–2, status eksekusi, verdict workflow, sanitasi, dan batas bukti. Addendum v1 di awal berlaku untuk kampanye baru; langkah checkpoint GO di bagian historis **tidak** digunakan.
3. [Sintesis tiga referensi](references/synthesis.md) beserta [Curious Mind](references/curious-mind.md), [dyk](references/dyk.md), dan [Daily Facts](references/daily-facts.md): acuan pola editorial, **bukan** sumber fakta atau bukti kausal views.
4. [Ringkasan progres](summary.md), [record JSONL](results.jsonl), [template kasus](run-template.md), dan [Issue kampanye #47](https://github.com/milyarderpro/content-producer/issues/47). Dokumen [cases.md](cases.md) memuat prompt GO lama dan **hanya arsip** untuk kasus baru.

Jangan mengandalkan nomor versi plugin/backend dari manifest atau GitHub untuk menyatakan runtime penguji. Bila jawaban penguji tidak menunjukkan versi runtime yang dapat dibuktikan, catat `UNVERIFIED`. Jangan menilai ulang tiap URL fakta; plugin/server tetap harus mengikuti kebijakan sumbernya, sementara koordinator mencatat klaim checks sumber sesuai tingkat bukti yang terlihat.

## Siklus satu kasus

1. Baca prosedur aktif dan record terbaru di GitHub. Pastikan ID berikutnya belum ada, tidak ada Write `UNCONFIRMED`, dan aturan jeda tidak aktif. Urutan pertama adalah `MAIN-SSF-01`, lalu `MAIN-TUT-01`, `MAIN-EAC-01`, `MAIN-CMP-01`, `MAIN-MVF-01`.
2. Kirim **hanya satu prompt final siap-tempel** kepada pemilik. Untuk kasus implisit, jangan bocorkan ID berkode format, nama format, jumlah fakta, atau layout kepada chat penguji. Jangan mengubah brief yang sudah dibekukan berdasarkan hasil kasus sebelumnya.
3. Setelah pemilik meneruskan jawaban penguji, pertahankan CANVA COPY pertama sebagai baseline walau `UNSAVED`. Nilai enam unsur DNA dan `format_fit`; pisahkan mutu naskah dari keberhasilan tool. `save_post` + `get_post` yang cocok diperlukan untuk workflow `PASS`; draft belum otomatis `ready`.
4. Sanitasi dan catat satu percobaan di `runs/<ID>-main-direct-save-v1.md` serta `results.jsonl`, lalu perbarui `summary.md` dan Issue terkait bila bukti cukup. Simpan tiap kasus pada branch kampanye GitHub agar catatan tidak hanya hidup di konteks chat; baca branch itu sebelum kasus berikutnya. Gabungkan catatan maksimal lima kasus per PR/gelombang dengan pemeriksaan ringan, bukan satu PR per naskah dan bukan meminta pemilik menyunting file. Setelah merge, lanjutkan dari `main` terbaru. Kasus `BLOCKED` tetap dihitung sebagai percobaan, bukan diam-diam diganti.
5. Berikan verdict singkat dan prompt kasus berikutnya tanpa menunggu pemilik bertanya lagi. Setelah tiap lima kasus, ringkas progres per format. Jeda bila status Write tidak pasti, ada masalah otorisasi/keamanan, atau blocker teknis yang sama muncul pada dua kasus berbeda.

Seluruh penilaian adalah diagnostik editorial. Jangan menjanjikan viralitas, menganggap `quality_status: pending` sebagai persetujuan, atau memublikasikan draft uji.
