# Proposal

## Why

Sistem trivia saat ini mengunci lima format, dua profil kepadatan, tanpa emoji, dan paling banyak sembilan fakta, sementara Curious Mind, DYK, dan Daily Facts mempunyai kombinasi format, bahasa, panjang, dan CTA yang berbeda. Pemilik membutuhkan satu backend/MCP dan plugin yang sama agar setiap Page dapat memilih DNA referensi sendiri, serta menambahkan variasi editorial yang didukung melalui katalog tanpa perubahan kode atau deployment baru.

## What Changes

- Menambahkan katalog editorial milik workspace untuk definisi format, topik, dan profil DNA yang tervalidasi, memiliki versi immutable, serta dapat dibaca, dipublikasikan, dan dipensiunkan melalui tool owner OAuth. Format baru pada struktur hook–facts–CTA menjadi perubahan data katalog, bukan enum atau fungsi baru.
- Menambahkan config Page versi 2 dengan satu profil DNA utama, referensi versi format/topik, bobot dinamis, preferensi penulisan, dan batas keras yang diresolusikan server. Seed menyediakan `curious_mind`, `dyk`, dan `daily_facts` sebagai profil terpisah. Campuran custom memakai definisi profil tersendiri dengan panduan gabungan yang dipilih owner; tidak mencampur ketiganya secara otomatis atau menambah mesin inheritance profil.
- Mengembangkan lima format lama dengan koleksi curiosity bertema dan campuran. Architecture, mekanisme penyampaian, dan manfaat pembaca menjadi dimensi terpisah; sejarah atau sebab-akibat tidak otomatis memerlukan format backend tersendiri.
- Mendukung rentang ketiga dataset: jumlah fakta hingga 12 sebagai batas teknis terkontrol, budget teks yang lebih luas, kapitalisasi hook per profil, serta emoji opsional. CTA dapat memuat beberapa ajakan tanpa tujuan utama wajib, hierarki utama/tambahan, batas jumlah tujuan, atau daftar kombinasi wajib. Pola CTA per profil menjadi panduan, dengan dukungan beberapa baris dan penempatan sebelum fakta terakhir yang ditemukan pada DYK. Preferensi jumlah/kepadatan/urutan tidak menjadi gate global baru.
- Memperbarui plugin Content Producer yang sama agar membaca profil dan contoh relevan dari generation context/katalog sebelum riset dan penulisan, lalu menilai naskah terhadap profil yang dipilih. Tidak membuat plugin, koneksi MCP, worker AI, atau layanan generasi baru.
- Mengikat versi profil/format/topik dan aturan efektif pada generation snapshot serta readback, tanpa mengubah arti tiga attestations v2. Metadata aksi CTA bersifat deskriptif dan opsional; field legacy `interaction_goal` tidak wajib dipilih untuk post config2. Mempertahankan config versi 1, post lama, replay, CAS, approval, dan alur content plan; penerapan profil baru pada Page production membutuhkan perubahan eksplisit.
- Menguji keluasan pola ketiga dataset, penambahan format lewat data tanpa deploy, isolasi owner, save/revise/readback/lifecycle, dan konsistensi versi; merilis perubahan backend melalui gate G4 exact-SHA yang berlaku.
- Mengorganisasi implementasi menjadi 10 paket kerja yang mencakup test serta dokumentasinya masing-masing, memakai kembali audit dan mekanisme project yang relevan. Laporan/filter baru berdasarkan versi DNA atau label CTA ditunda; provenance post tetap disimpan dan analitik lama tetap kompatibel.

## Capabilities

### New Capabilities

- `trivia-editorial-catalog`: katalog format, topik, dan profil yang dapat dikelola owner, versi immutable, referensi tervalidasi, dan ekstensi editorial tanpa kode dalam struktur trivia yang didukung.
- `trivia-page-editorial-profiles`: pemilihan serta resolusi profil per Page, tiga preset berbasis bukti, preferensi dan batas efektif, snapshot versi, dan konsumsi profil oleh plugin yang sama.

### Modified Capabilities

- `trivia-draft-workflow`: generation context, validasi save/revise, readback, batch, dan approval yang mengenali config/profil terikat versi sambil mempertahankan kontrak transaksi dan izin v2.

## Impact

- Database/RPC: katalog dan versi, validasi config, Page/plan/context, renderer, snapshot/hash, save/revise, lifecycle, projection, serta kompatibilitas analitik lama terhadap key dinamis dan goal null. Tidak menambahkan dimensi/filter insights DNA atau label CTA pada rilis ini.
- MCP: schema config/input/output dan katalog tool, termasuk dua tool katalog baru; pilihan format/topik menjadi key tervalidasi server. Tool umum tetap request versi 1 dan alur konten tetap v2.
- Plugin/dokumen/test: `plugin/skills/content-producer/`, packaging, kontrak frozen yang disupersede melalui change record baru, regresi database/MCP/source, audit katalog/grant/RLS, dan matriks evaluasi ketiga dataset.
- Perubahan bersifat aditif untuk config versi 1. Kemampuan baru memakai config versi 2; kompatibilitas config v1 tidak membuka kembali tool atau konten trivia v1 yang sudah dipensiunkan.
- Di luar scope rilis yang direncanakan: laporan/perbandingan performa per versi DNA serta filter/pengelompokan label CTA baru. Data provenance yang diperlukan tetap dicatat agar kemampuan tersebut dapat ditambahkan kelak.
- Di luar scope eksekusi proposal: implementasi, commit/push/PR/merge, deploy, pembuatan/pengubahan Page production, penulisan post, publikasi Facebook, OpenAI API, embeddings, UI baru, dan pengarsipan change lain. Proposal tidak menjanjikan hasil viral atau penyalinan naskah referensi.

## Penyesuaian penerimaan — 13 November 2026

Instruksi pemilik mengeluarkan review naskah manual dan QA layout ponsel dari
penerimaan change ini. Task9 berfokus pada integrasi teknis per profil dan
ekstensi data-only; tidak mengklaim kelulusan editorial dari technical PASS.
Kontrol runtime, G4 dan batas LIVE tetap. Lihat [addendum CR-062](../../../docs/decisions/2026-11-13-cr-062-task-9-technical-acceptance.md).
