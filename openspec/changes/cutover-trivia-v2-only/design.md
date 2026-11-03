# Design

## Context

Lihat [proposal](proposal.md) untuk tujuan dan dua spec untuk perilaku yang dituju. Source saat ini memasang 36 tool MCP: 33 tool lama/bersama dan tiga tool v2. Lima nama adalah alur konten khusus v1; dua tool pemeliharaan fakta mempunyai cabang v1 dan v2. V2 juga masih menggunakan helper SQL yang bernama `_v1`. Rantai 84 migration lama dibutuhkan untuk membangun schema; source dan riwayat production tidak perlu disusun ulang untuk menghentikan operasi v1.

Snapshot production saat rencana sebelumnya mencatat post/fakta v1 **dan** v2. Angka itu bukan preflight eksekusi. Dokumen dan test historis masih mengasumsikan kompatibilitas v1, khususnya CR-053/054 dan TDW-16/17. Override kontrak ini harus dicatat melalui change record baru; bukti historis tidak ditulis ulang.

## Goals / Non-Goals

**Goals:**

- Menutup seluruh jalur konten trivia v1 yang dapat dipanggil, termasuk akses langsung RPC dan replay, sambil menjaga v2 serta tool umum tetap bekerja.
- Mengosongkan konten produk pemilik secara atomik, dengan perbandingan identitas/Page/config sebelum dan sesudah.
- Menyediakan satu jalur rilis yang dapat diuji pada migration chain saat ini dan dibuktikan pada runtime production.

**Non-Goals:**

- Mengganti nomor versi kontrak tool umum yang masih dipakai v2.
- Mengganti baseline schema, mengarsipkan migration aktif, memperbaiki histori migration production, atau menghapus semua identifier `_v1` dari helper internal.
- Menghapus akun, OAuth, workspace, Page, niche, konfigurasi, atau bukti historis; mengubah aturan editorial v2.

## Decisions

### 1. Pensiunkan surface v1, pertahankan fondasi bersama

Hapus registrasi lima tool khusus v1 (`trivia_find_similar_facts`, `trivia_register_and_reserve_facts`, `trivia_release_facts`, `save_post`, `revise_post`) dari Edge MCP. Migration maju mencabut akses dan menutup signature RPC v1 yang sesuai, termasuk overload v1 untuk `trivia_reverify_fact` dan `trivia_correct_fact`. Cabang input v1 pada dua tool pemeliharaan bersama dihapus; overload v2 dan kontrak tool umum dipertahankan. Audit semua jalur replay, pilot, alias, dan akses langsung PostgREST agar nama v1 tidak dapat dipanggil melalui rute lain.

Helper internal yang masih diperlukan v2 tetap ada dan diuji. Nama `_v1` internal bukan izin menjalankan kontrak v1. Menghapus/menamai ulang seluruh helper dan menulis baseline baru ditolak untuk change ini karena memperluas risiko pada transaksi v2 tanpa menambah kemampuan pensiun v1.

### 2. Reset konten terbatas dan gagal tertutup

Inventaris ulang tabel bisnis, foreign key, JSON snapshot, ledger, reservasi, job, serta scope owner saat apply. Susun matriks hapus/pertahankan: post, fakta, evidence/binding, plan/item/event, metrik, history dan operation ledger konten dihapus; Auth, workspace, Page, niche, Page config dan data identitas terkait dipertahankan. Jika ada owner lain atau referensi baru yang belum diputuskan, hentikan reset alih-alih memperluas scope otomatis.

Sebelum tindakan, ekspor schema, data yang akan dihapus, identitas/Page/config pembanding, dan catatan migration ke backup lokal berakses terbatas; periksa checksum dan keterbacaan tanpa commit/unggah atau mencetak konten dan credential. Reset memakai transaksi dengan lock yang sesuai, verifikasi precondition, penghapusan berurutan menurut dependensi, dan pemeriksaan nol konten sebelum commit. Batasi write selama jendela reset dan tunggu operasi in-flight; setelah commit, verifikasi lagi bahwa v1 tetap tertutup dan data tetap tidak berubah. `db reset --linked` tidak digunakan karena akan menjatuhkan objek remote dan tidak sesuai dengan pelestarian Page.

### 3. Satu rantai migration maju dan satu checkpoint rilis

Tambahkan migration pada akhir rantai yang ada. Jangan menulis ulang file migration historis atau mengubah tabel histori production. Clean install tetap menjalankan rantai lama lalu migration penutupan v1. Fixture upgrade memakai schema lama dengan data v1/v2 untuk menguji penolakan v1, kelangsungan v2, dan reset. Audit grant, RLS, owner OAuth, function signatures, serta no direct `anon` access.

Perubahan inventory gate dicatat sebagai override CR-052/CR-054 yang spesifik: dari source 36 tool menjadi 31 aktif setelah lima v1 keluar. Inspector menguji 31 panggilan valid dan 31 invalid, lima nama lama absen/ditolak, serta owner denial. Cakupan source/frontend, database, MCP, migration/history, lint, security advisors, RLS/grant/ACL, dan cleanup tidak dikurangi diam-diam. Gunakan satu G4 manual exact-SHA pada kandidat backend final sebelum rilis; ulang hanya jika source/security/migration/fixture berubah. Aturan estimasi CI >10 menit tetap berlaku.

### 4. Urutan production dan bukti v2

Setelah G4 PASS, ambil backup/preflight terbaru. Terapkan migration yang menutup RPC v1 lebih dulu sehingga Edge/plugin lama gagal tertutup, lalu deploy Edge dengan katalog 31 tool. Jalankan reset dengan batas write dan baca ulang hitungan serta identitas/Page/config. Perbarui plugin PRIVATE melalui Plugin Creator dan Content Producer. Uji host: katalog tanpa v1, pemanggilan v1 ditolak, akun/Page terbaca, dan v2 dapat membuat serta membaca ulang satu draft QA pada Page yang diizinkan. Bersihkan draft QA dan turunannya secara terarah setelah uji, lalu buktikan kembali keadaan konten kosong. Bila uji positif live tidak dapat dilakukan, laporkan `NOT RUN`/`BLOCKED`, bukan PASS; jangan mengklaim cutover selesai sepenuhnya.

Rollback Edge/plugin tidak memulihkan data yang dihapus. Jika rilis bermasalah, hentikan write, rekonsiliasi state, dan gunakan backup hanya melalui prosedur insiden tersendiri; jangan membuka kembali v1 secara otomatis. Migration lama tetap tersedia untuk rekonstruksi schema, tetapi kontrak v1 telah dipensiunkan.

## Risks / Trade-offs

- **Konten v2 lama ikut terhapus** → backup terbaru, hitungan tepat, dan laporan kehilangan eksplisit sebelum reset.
- **Plugin lama masih terpasang** → panggilan v1 gagal; pemilik telah menerima risiko dan dokumentasi mengarahkan pembaruan plugin.
- **Write bersamaan dengan reset** → jendela write terbatas, lock, precondition, dan pemeriksaan setelah commit; perbedaan scope menghentikan tindakan.
- **Helper internal lama digunakan v2** → biarkan helper tersebut, uji save/revise, dedup, CAS, idempotency, owner denial, dan readback v2.
- **Target gate berubah** → catat override, sesuaikan pin/manifest/Inspector secara terbuka, dan pertahankan audit keamanan yang sama.
- **Uji live membuat konten sementara** → gunakan hanya Page QA yang diizinkan, cleanup terarah, dan verifikasi final nol; bila cleanup gagal, laporkan keadaan sebenarnya.

## Migration Plan

1. Buat change record baru untuk override kompatibilitas v1 dan target gate; siapkan migration maju, Edge/plugin, test, skrip reset dan dokumen. Periksa jalur clean install dan upgrade fixture.
2. Review PR/Actions, jalankan G4 manual exact-SHA pada kandidat backend. Bila estimasi >10 menit, dispatch dan laporkan URL/SHA/status tanpa memantau sampai pemilik berkata `lanjutkan`.
3. Setelah PASS, backup dan preflight production; tutup RPC v1, deploy Edge v2 saja, kemudian reset konten dengan pemeriksaan transaksional serta post-commit.
4. Perbarui plugin, retest host dan QA v2, bersihkan fixture, lalu laporkan hitungan akhir, identitas/Page yang dipertahankan, versi terpasang, dan hasil LIVE/CI/FIXTURE secara terpisah.
