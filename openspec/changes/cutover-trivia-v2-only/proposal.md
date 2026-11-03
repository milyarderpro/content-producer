# Proposal

## Why

Pemilik ingin memulai ulang konten dengan trivia v2 sebagai satu-satunya alur yang dapat digunakan. Cutover ini dipersempit agar v1 benar-benar berhenti beroperasi tanpa membongkar helper bersama atau mengganti riwayat migration yang masih diperlukan untuk memahami dan membangun schema saat ini.

## What Changes

- **BREAKING:** Kosongkan seluruh konten produk milik pemilik di Supabase production, termasuk post dan fakta v1/v2, plan, metrik, serta turunan dan riwayat kontennya. Pertahankan akun/OAuth, workspace, Page, niche, dan pengaturan Page agar v2 dapat langsung dipakai.
- **BREAKING:** Pensiunkan seluruh operasi konten trivia v1 pada katalog MCP dan akses RPC langsung. Panggilan dari plugin lama, termasuk replay atau permintaan yang tertunda, harus ditolak tanpa membuat konten baru. Tool umum tetap tersedia untuk konten v2 dengan kontrak yang sekarang.
- Arahkan plugin Content Producer dan dokumentasi operasional aktif hanya ke alur v2. Catat risiko bahwa instalasi plugin lama dapat gagal setelah cutover; pemilik telah menerimanya.
- Sediakan backup, preflight scope, pengosongan transaksional, pemeriksaan identitas/Page sebelum dan sesudah, gate G4 exact-SHA, dan uji live v2 yang membedakan source dari runtime terpasang.
- Pertahankan rantai migration dan histori production yang ada. Tambahkan migration maju untuk menutup v1; simpan helper internal bersama meskipun sebagian namanya berakhiran `_v1` selama v2 masih memerlukannya. Pembersihan nama dan baseline schema baru menjadi change terpisah.

## Capabilities

### New Capabilities

- `content-data-reset`: keadaan konten pemilik kosong yang terverifikasi, dengan akun dan Page tetap utuh.
- `trivia-v2-only-runtime`: hanya operasi konten trivia v2 yang dapat dipanggil setelah cutover, sementara tool umum tetap kompatibel.

### Modified Capabilities

Tidak ada spec utama yang terdaftar. Keputusan ini menggantikan bagian transisi v1 yang masih aktif dalam kontrak terdahulu melalui change record saat implementasi.

## Impact

- Supabase: migration maju, penutupan RPC v1, skrip reset data terbatas, audit RLS/grant, serta test database dan G4. Tidak ada `db reset --linked` atau `migration repair` pada change ini.
- Edge MCP dan plugin PRIVATE: lima tool khusus v1 keluar dari katalog; tool v2 dan tool umum tetap. Pembaruan plugin mengikuti pilihan pemilik: Plugin Creator dan Content Producer.
- README, kontrak tool, operasi, pengujian, matriks live, dan instruksi aktif diselaraskan. Migration lama, kontrak frozen, dan bukti historis disimpan sebagai sejarah, bukan dihapus.
- Production tetap memakai project yang sama. Proposal ini belum melakukan penghapusan data, perubahan kode, rilis, atau perubahan plugin terpasang.
