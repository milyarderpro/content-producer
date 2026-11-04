# Proposal

## Why

Pemilik ingin memulai ulang konten dengan trivia v2 sebagai satu-satunya alur yang dapat digunakan. Cutover ini dipersempit agar v1 benar-benar berhenti beroperasi tanpa membongkar helper bersama atau mengganti riwayat migration yang masih diperlukan untuk memahami dan membangun schema saat ini.

## What Changes

- **BREAKING:** Kosongkan seluruh konten produk milik pemilik di Supabase production, termasuk post dan fakta v1/v2, plan, metrik, serta turunan dan riwayat kontennya. Pertahankan akun/OAuth, workspace, Page, niche, dan pengaturan Page agar v2 dapat langsung dipakai.
- **BREAKING:** Pensiunkan seluruh operasi konten trivia v1 pada katalog MCP dan akses RPC langsung. Panggilan dari plugin lama, termasuk replay atau permintaan yang tertunda, harus ditolak tanpa membuat konten baru. Tool umum tetap tersedia untuk konten v2 dengan kontrak yang sekarang.
- Arahkan plugin Content Producer dan dokumentasi operasional aktif hanya ke alur v2. Catat risiko bahwa instalasi plugin lama dapat gagal setelah cutover; pemilik telah menerimanya.
- Sediakan backup, preflight scope, pengosongan transaksional, pemeriksaan identitas/Page sebelum dan sesudah, gate G4 exact-SHA, dan uji live v2 yang membedakan source dari runtime terpasang.
- Remediasi G4 yang disetujui pemilik pada 4 November 2026: resolve Node/Deno sekali per run dalam range yang berlaku, lalu gunakan versi exact yang sama untuk source, kedua shard, dan aggregate. Pemeriksaan runtime aktual tetap fail-closed; rincian di CR-060.
- Pertahankan rantai migration dan histori production yang ada. Tambahkan migration maju untuk menutup v1; simpan helper internal bersama meskipun sebagian namanya berakhiran `_v1` selama v2 masih memerlukannya. Pembersihan nama dan baseline schema baru menjadi change terpisah.

## Capabilities

### New Capabilities

- `content-data-reset`: keadaan konten pemilik kosong yang terverifikasi, dengan akun dan Page tetap utuh.
- `trivia-v2-only-runtime`: hanya operasi konten trivia v2 yang dapat dipanggil setelah cutover, sementara tool umum tetap kompatibel.

### Modified Capabilities

- `trivia-draft-workflow`: ganti kewajiban kompatibilitas post/operasi v1 dan kriteria pensiun creation bertahap pada TDW-16/17 dengan cutover v2 saja setelah gate, backup, dan reset.
- `trivia-fact-library`: akhiri kewajiban pemetaan/backfill dan kompetisi write v1 setelah reset, sambil mempertahankan identitas canonical, dedup, reuse, dan keamanan v2.
- `tool-diagnostics`: inventaris diagnostik mengikuti 31 tool aktif; nama v1 yang dipensiunkan ditolak, sedangkan diagnostik tool aktif tetap lengkap.

[CR-059](../../../docs/decisions/2026-11-03-cr-059-trivia-v2-only-cutover.md) mencatat override terhadap CR-053/054 dan batas yang tetap berlaku dari CR-052. Spesifikasi dan keputusan historis tidak ditulis ulang.

## Impact

- Supabase: migration maju, penutupan RPC v1, skrip reset data terbatas, audit RLS/grant, serta test database dan G4. Tidak ada `db reset --linked` atau `migration repair` pada change ini.
- Edge MCP dan plugin PRIVATE: lima tool khusus v1 keluar dari katalog; tool v2 dan tool umum tetap. Pembaruan plugin mengikuti pilihan pemilik: Plugin Creator dan Content Producer.
- README, kontrak tool, operasi, pengujian, matriks live, dan instruksi aktif diselaraskan. Migration lama, kontrak frozen, dan bukti historis disimpan sebagai sejarah, bukan dihapus.
- Production tetap memakai project yang sama. Proposal ini belum melakukan penghapusan data, perubahan kode, rilis, atau perubahan plugin terpasang.
