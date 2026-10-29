# Rencana implementasi optimasi besar full backend gate

**Status:** usulan rencana; belum mengubah workflow, test, atau kontrak rilis.

**Tanggal:** 29 Oktober 2026.

**Cakupan:** gate backend pada GitHub Actions dan PC lokal, termasuk test database, MCP, migration, serta bukti keamanan.

**Acuan:** [panduan testing](../docs/testing.md), [CR-020](../docs/decisions/2026-10-15-phase-9-10-risk-based-mvp-acceptance.md), dan [CR-044](../docs/decisions/2026-10-20-phase-10-gate-order-and-backend-sha-reuse.md).

Dokumen ini adalah rencana perubahan **cara menguji**, bukan izin menghapus pemeriksaan atau melepas backend ke production. CR-020 dan CR-044 tetap berlaku sampai change record penggantinya diterima. Gate yang cepat tetap harus menunjukkan perubahan kode dan migration yang diperiksa, hasil setiap kelompok test, serta batas buktinya. Test otomatis mengurangi risiko regresi yang diketahui; ia tidak dapat menjamin semua kemungkinan error tidak ada.

## 1. Masalah yang terukur

Pada [run 22 Oktober](https://github.com/milyarderpro/content-producer/actions/runs/39768822314), job penuh memakan 23 menit 19 detik. Pada [run 26 Oktober](https://github.com/milyarderpro/content-producer/actions/runs/40364895835), pembacaan timestamp log menunjukkan sekitar 13 menit 46 detik. Optimasi terdahulu bekerja, tetapi durasi masih terlalu besar untuk umpan balik pengembangan. Angka ini historis dan perlu diukur ulang pada kandidat berikutnya.

| Tahap pada run 26 Oktober | Waktu sekitar | Temuan |
| --- | ---: | --- |
| Start stack Supabase sementara | 1 menit 58 detik | Biaya persiapan mesin/container. |
| Reset dan migration | 29 detik | Pemeriksaan database bersih yang sekarang diwajibkan. |
| Authenticated Inspector | 1 menit 18 detik | Menguji jalur HTTP/MCP dan penolakan akses. |
| `test-all` | 9 menit 27 detik | Di dalamnya, 41 file/180 test database memakan sekitar 9 menit 11 detik. |

`test-all` menjalankan `check`, validasi nama migration, `test:mcp`, dan `test:database` berurutan. Workflow juga menjalankan `test:mcp` sebelum Inspector, sehingga suite itu dipanggil dua kali. Konfigurasi [Vitest database](../vitest.database.config.ts) menetapkan `fileParallelism: false`; ini melindungi test yang berbagi database, tetapi membuat semua file menunggu giliran. Lima file database terlama pada run 26 Oktober memakan total sekitar 3 menit 19 detik. Lima belas file masih memanggil `pnpm exec supabase db query` dari test; biaya pemanggilan berulang adalah hipotesis optimasi yang harus diukur, bukan penyebab yang sudah dibuktikan untuk seluruh 9 menit.

## 2. Hasil dan batas yang wajib

1. **Satu definisi gate.** GitHub Actions dan PC lokal memanggil skrip komponen serta daftar test yang sama. Perbedaan mesin boleh memengaruhi durasi, tidak boleh mengubah pemeriksaan yang lulus. Seluruh job harus memakai kandidat source/backend yang sama; hasil dari SHA berbeda tidak digabung menjadi PASS. Run lokal pada working tree yang masih berubah diberi label diagnostik, bukan bukti formal untuk SHA commit.
2. **Lebih sedikit pekerjaan yang berulang.** Setiap invariant aktif diuji pada lapisan yang tepat dan tidak dijalankan dua kali hanya karena script lama menyusunnya demikian. Test fase historis tidak otomatis menjadi kewajiban rilis; keputusan mempertahankan, menggabungkan, memindahkan ke suite manual, atau menghapus dibuat per test berdasarkan cakupan nyata.
3. **Keamanan tetap fail closed.** Pertahankan migration dari keadaan bersih, history dan lint, owner/cross-owner denial, OAuth, RLS/grant/ACL, transaksi dan race write, idempotency, keluaran MCP, audit fixture, serta larangan kebocoran rahasia. Selama v1 masih didukung, regresi kompatibilitas v1 yang relevan tetap wajib.
4. **Uji pada database sementara.** Tidak ada credential production, koneksi ke project linked, atau business Write production dalam gate. Runner lokal harus memakai ruang kerja dan stack uji tersendiri; ia menolak target yang tidak terbukti lokal dan tidak menghapus stack/data kerja pengguna.
5. **Cepat dengan bukti.** Target awal: full gate pada runner GitHub standar selesai dalam 10 menit atau kurang pada tiga run kandidat identik tanpa mengurangi cakupan wajib. Waktu lokal dicatat terpisah karena cache dan perangkat berbeda. Target ini adalah kriteria proyek optimasi, bukan angka yang sudah tercapai atau alasan meluluskan gate yang gagal.

## 3. Bentuk gate yang dituju

```text
Kandidat SHA yang sama
├─ gate:source  → format, lint, typecheck, test kode/frontend, paket yang terdampak
└─ gate:backend → stack uji terisolasi → migration bersih
                  → OAuth/owner + audit awal → Inspector/MCP
                  → test database aktif → history/lint/audit akhir

PASS hanya jika kedua jalur selesai PASS dan bukti SHA/cakupan cocok.
```

GitHub Actions dapat menjalankan `gate:source` bersamaan dengan `gate:backend`. Pada PC lokal, satu perintah `gate:full` mengorkestrasi **skrip komponen yang sama** dan membuat ringkasan hasil yang sama. `gate:backend` menjaga urutan OAuth/owner dan Inspector sebelum suite database, sesuai CR-044. Perintah untuk PR tetap berupa test fokus sesuai diff; full gate dijalankan satu kali pada kandidat akhir yang memerlukannya, bukan pada tiap percobaan.

Daftar test menjadi manifest yang dapat diaudit, bukan daftar tersembunyi di beberapa script. Kategori per test:

| Kategori | Perlakuan |
| --- | --- |
| Kontrak aktif atau regresi keamanan/integritas yang unik | Tetap wajib dalam full gate. |
| Cakupan sama dengan test lain yang lebih kuat | Gabungkan atau hapus duplikat setelah hasil dan invariant-nya dibandingkan. |
| Kontrak historis yang telah diganti dan tidak dipakai runtime sekarang | Pindah ke suite manual historis atau hapus dengan alasan yang tercatat. |
| Kompatibilitas v1 yang masih dipakai selama transisi | Tetap wajib sampai dukungan v1 benar-benar berakhir. |

Nama file atau label `phase` tidak cukup sebagai dasar pemindahan test. Test security, RLS, race, dan pemakaian fakta lama bisa tetap penting walaupun ditulis pada fase lama. Manifest menunjukkan **invariant → file test → status wajib/opsional → alasan**; test yang dipindahkan tidak diam-diam hilang dari inventaris.

## 4. Tahapan implementasi — 4 fase, 12 task

### Fase 1 — Tetapkan cakupan sebelum memangkas (3 task)

- **G1-T1 Profil dan inventaris:** catat durasi tiap tahap dan file dari run yang tersedia, daftar 41 file database serta semua pemanggilan test di workflow/script, dan baseline hasil lama. Tandai pengulangan seperti `test:mcp` tanpa langsung menghapusnya.
- **G1-T2 Matriks invariant:** petakan setiap test ke kontrak yang masih aktif, bug/regresi unik, keamanan, atau kontrak historis. Tandai test yang dapat digabung/dipindah/dihapus beserta penggantinya. Review khusus untuk v1 selama transisi dan alur v2 yang direncanakan. Hasilnya dokumen cakupan yang dapat diperiksa orchestrator.
- **G1-T3 Change record gate:** tetapkan pengganti tepat untuk kewajiban `pnpm run test-all`, urutan CR-044, jumlah/pola Inspector, penggunaan ulang SHA, dan bukti PASS dalam CR baru sebelum mengubah gate. Daftar pemeriksaan wajib tidak boleh berkurang hanya karena target waktu.

### Fase 2 — Percepat test tanpa melemahkan perilaku (3 task)

- **G2-T1 Perbaiki jalur query test:** mulai dari file terlama. Ukur jumlah dan waktu panggilan CLI/query; gunakan helper database yang lebih ringan bila terbukti setara. Pertahankan role/JWT, batas transaksi, sesi terpisah untuk race, error code, dan redaksi log. Jangan mengubah expected hasil agar test terlihat cepat.
- **G2-T2 Rapikan suite:** pecah `test-all` menjadi skrip komponen yang eksplisit, jalankan `test:mcp` sekali, dan terapkan klasifikasi G1-T2 pada test historis/duplikat. Test yang hanya dipindahkan ke suite manual tetap memiliki perintah yang terdokumentasi. Perubahan frontend/paket tidak masuk jalur database jika sudah diperiksa oleh `gate:source` pada SHA sama.
- **G2-T3 Optimasi lanjutan berbasis profil:** nilai biaya startup stack dan Inspector setelah G2-T1/T2. Optimalkan peluncuran proses/alat atau test yang lambat hanya jika hasilnya terukur dan pemeriksaan yang sama tetap dilakukan. Jangan meniadakan health check, clean migration, atau audit keamanan untuk menghemat detik. Paralelisme file database baru boleh dicoba setelah isolasi data dibuktikan; `fileParallelism: true` pada satu database bersama bukan solusi yang diterima.

### Fase 3 — Satu gate untuk GitHub dan PC lokal (3 task)

- **G3-T1 Runner bersama:** sediakan `gate:source`, `gate:backend`, dan `gate:full` yang membaca manifest sama, memeriksa versi dependency serta kandidat SHA, mencatat durasi, dan mengembalikan exit gagal bila satu tahap gagal. Bukti formal lokal memerlukan checkout bersih pada SHA kandidat; working tree yang berubah hanya menghasilkan hasil diagnostik. Mode lokal membuat/memakai stack uji terisolasi dan menolak koneksi remote/linked sebelum reset.
- **G3-T2 GitHub Actions:** ubah workflow menjadi job source dan backend yang dapat berjalan bersamaan pada SHA sama. Backend menggunakan satu lingkungan sementara, pemeriksaan awal yang cepat, satu reset bersih, serta test database aktif. PR menjalankan pemeriksaan fokus sesuai perubahan; manual full gate tetap tersedia untuk kandidat rilis. Pastikan required checks dan nama job yang dipakai aturan repo diperiksa sebelum cutover.
- **G3-T3 Bukti ringkas:** keluarkan satu ringkasan aman berisi SHA, versi alat, jumlah test aktif/opsional, status setiap kelompok, lima bagian terlama, durasi total, dan audit keamanan. Bila ada kegagalan, sebut tahap dan cara reproduksi lokal tanpa token, SQL sensitif, atau payload privat.

### Fase 4 — Buktikan kesetaraan dan ganti gate lama (3 task)

- **G4-T1 Perbandingan satu kandidat:** jalankan gate lama dan kandidat baru pada source/backend SHA identik di lingkungan uji, lalu cocokkan cakupan invariant dan hasilnya. Setiap test yang dihapus/dipindah punya alasan serta pemeriksaan pengganti atau bukti kontraknya sudah tidak berlaku. Kegagalan baru diselidiki; expected test/audit tidak dilemahkan untuk menyembunyikannya.
- **G4-T2 Uji GitHub dan PC lokal:** jalankan kandidat baru pada GitHub Actions dan PC lokal dengan fixture terisolasi; buktikan hasil yang setara, cross-owner denial, migration/history, dan bersihnya fixture. Ukur tiga run GitHub untuk target waktu; pengulangan ini mempunyai alasan teknis benchmarking yang dicatat, bukan gate duplikat tanpa tujuan. Bila target belum tercapai, kembali ke G2-T3 berdasarkan profil; gate lama tetap tersedia sampai pengganti lulus.
- **G4-T3 Cutover dan rollback:** setelah CR diterima dan bukti G4-T1/T2 lulus, jadikan gate baru sebagai pemeriksaan rilis, perbarui [testing](../docs/testing.md), [operations](../docs/operations.md), serta instruksi kerja. Catat cara kembali ke workflow lama bila gate baru memberi hasil palsu. Perubahan workflow/CI ini tidak memberi izin deploy atau Write production.

**Urutan:** G1 selesai sebelum test dipindahkan; G2 selesai sebelum runner baru dibekukan; G3 tersedia sebelum perbandingan G4; cutover hanya sesudah CR dan bukti kesetaraan. Bagi menjadi PR fokus menurut batas perubahan: kontrak/cakupan, helper dan suite, runner/Actions, lalu verifikasi/cutover. Satu implementer bertanggung jawab atas satu PR; orchestrator memeriksa manifest dan bukti sebelum langkah berikutnya.

Sebelum menjalankan test lokal atau memicu Actions, catat SHA, scope, prasyarat, riwayat run, dan estimasi durasi. Untuk pekerjaan optimasi ini, pemilik telah mendelegasikan pemantauan kepada AI. Setelah run yang sudah diizinkan dimulai, catat URL/status serta estimasinya dan periksa kesimpulannya bila antarmuka memungkinkan. Jika antarmuka tidak memungkinkan pemantauan lanjutan, berikan URL/status terakhir dan pesan handoff siap salin. Untuk run yang diperkirakan lebih dari 10 menit, ikuti batas pemantauan chat di [AGENTS.md](../AGENTS.md). Aturan ini mengatur pemantauan, bukan alasan melewati gate; jangan menyatakan PASS sebelum run selesai.

## 5. Kriteria penerimaan

1. Satu perintah lokal dan satu workflow GitHub memeriksa manifest serta kandidat backend yang sama. Tidak ada jalur `CI=true` yang diam-diam melewati test.
2. Semua invariant aktif yang dicatat pada G1-T2 tetap mempunyai pemeriksaan wajib, terutama owner/cross-owner, RLS/grant, migration bersih/history, race, idempotency, URL/sumber dan dedup yang masih berlaku, penyimpanan draft, serta kompatibilitas v1 selama transisi.
3. Suite MCP, database, dan source yang sama tidak dijalankan dua kali dalam satu full gate. Inspector tetap membuktikan jalur HTTP/auth yang tidak dibuktikan unit test.
4. Test database yang dibuat paralel hanya berjalan pada data/stack terisolasi; tidak ada flake akibat dua file mengubah state bersama. Pengulangan pada urutan berbeda tetap lulus.
5. Gate gagal bila satu check wajib gagal, hasil tidak lengkap, SHA tidak cocok, atau audit fixture/keamanan gagal. Bukti memberi tahap dan durasi tanpa rahasia.
6. Perbandingan lama/baru pada SHA sama lulus, lalu tiga run GitHub mengukur target 10 menit. Jika target gagal, laporkan durasi sebenarnya dan lanjutkan optimasi; jangan mengklaim gate sudah ringan.

## 6. Batas pekerjaan

Tidak mengubah aturan bisnis, schema production, atau hak akses untuk mempercepat test. Tidak memakai database production sebagai fixture. Tidak menghapus test hanya karena nama fase lama. Tidak memindahkan seluruh suite wajib ke jadwal malam agar gate rilis tampak cepat. Hasil CI tetap berbeda dari bukti plugin ChatGPT dan keberhasilan Write live.
