# Proposal

## Why

Alur trivia saat ini membebankan struktur identitas, paket bukti sumber,
reservasi, dan koordinasi payload yang rinci kepada ChatGPT sehingga permintaan
draft dapat berhenti sebelum hasil tersimpan. Perubahan ini menjabarkan kebutuhan
dalam [PRD alur draft sederhana](../../../plans/simplified-trivia-draft-workflow-prd.md)
agar instruksi biasa menghasilkan jumlah draft yang diminta, tersimpan utuh dan
terbukti melalui readback, dengan keamanan serta riwayat tetap terjaga.

## What Changes

- Dukung instruksi fleksibel untuk satu atau beberapa draft pada Page yang jelas,
  termasuk jumlah, tema, konfigurasi Page, hasil sebagian, dan kelanjutan pekerjaan.
  Gunakan content plan tanpa jadwal untuk dua draft atau lebih; proses satu item
  setiap kali.
- Sederhanakan riset dan input fakta menjadi kalimat serta tepat satu
  `source_url` per fakta final. Cari kemungkinan duplikat sebelum copy final;
  ganti calon terpakai, meragukan, atau yang hasil pencariannya belum lengkap.
- Sediakan `trivia_find_similar_facts_v2`, `save_post_v2`, dan `revise_post_v2`.
  Simpan identitas, alokasi fakta, dan satu draft secara atomik tanpa reservasi
  paket terpisah; baca kembali setiap draft dengan `get_post`.
- Pertahankan baseline pemeriksaan `complete` dan versi katalog workspace dari
  PRD. Validasi kandidat relevan dalam transaksi hanya alternatif untuk diuji dan
  ditinjau pemilik, bukan perubahan kontrak yang telah disetujui.
- Terapkan pemeriksaan mekanis dan tiga pemeriksaan editorial per draft yang
  terikat revision/hash. Setujui tetap perintah terpisah; tidak membuka ulang
  seluruh URL. Publikasi Canva/Facebook dan pencatatan metrik tetap manual.
- Sediakan error yang jelas, aman, dan dapat ditindaklanjuti untuk **seluruh
  tool**, termasuk kejelasan hasil Write yang belum pasti. D1/D2 hanya pembagian
  pekerjaan internal; urutan rilis terpisah belum disetujui.
- Pertahankan satu identitas canonical lintas v1/v2 serta keterbacaan dan arti
  riwayat lama. Jalur pembuatan v1 tersedia selama transisi; kriteria terukur untuk
  cutover, pemakaian plugin lama, dan rollback diajukan untuk keputusan pemilik.
- Pertahankan baseline [rencana implementasi](../../../plans/simplified-trivia-draft-workflow-implementation-plan.md):
  **8 fase dan 23 task**. Gunakan G4 CR-052 manual exact-SHA sebagai gate rilis
  backend sesuai aturan repository terbaru.
- **BREAKING — perubahan kontrak yang direncanakan, belum diberlakukan:** alur v2
  mengganti kewajiban sumber, ontologi input, reservasi, dan editorial v1; kelak
  penghentian pembuatan v1 juga memengaruhi plugin lama. Catat override dalam
  change record yang diterima sebelum implementasi; schema tool v1 tidak diganti
  mendadak selama transisi.

Langkah ini hanya membuat `proposal.md` dan `design.md` beserta metadata scaffold
CLI. Tidak mengubah PRD, plan, change record, source, konfigurasi workflow,
deployment, atau data; tidak membuat delta spec maupun `tasks.md`. Persetujuan
pencatatan bukan persetujuan kontrak baru atau izin implementasi.

## Capabilities

### New Capabilities

Inventaris `openspec list --specs --json` pada 31 Oktober 2026 kosong. Nama berikut
adalah batas capability yang direncanakan untuk artefak specs pada langkah
berikutnya yang diotorisasi, bukan klaim bahwa perilakunya belum ada sama sekali
di source atau bahwa file spec sudah dibuat.

- `trivia-draft-workflow`: pembuatan dan revisi draft sederhana, orkestrasi
  satu/beberapa draft melalui content plan, readback, pemeriksaan kualitas,
  persetujuan terpisah, serta pengelolaan post lintas versi.
- `trivia-fact-library`: identitas canonical lintas v1/v2, retrieval dan keputusan
  dedup, sumber satu URL pada v2, alokasi/reuse transaksional, koreksi, dan riwayat
  pemakaian yang mempertahankan snapshot lama.
- `tool-diagnostics`: diagnostik seluruh tool pada lapisan input, akses, domain,
  transport, dan output; recovery sesuai kepastian hasil operasi dan penjelasan
  Indonesia tanpa membocorkan data privat.

### Modified Capabilities

Tidak ada capability OpenSpec terdaftar untuk dimodifikasi. Kontrak frozen di
`plans/` dan keputusan yang berlaku tetap menjadi acuan sampai override diterima.

## Impact

- Area implementasi mendatang: migration/RPC/helper serta test database di
  `supabase/`, adapter/schema/error MCP di `supabase/functions/mcp/`, instruksi
  `plugin/skills/content-producer/`, test lintas komponen, dan inventaris gate.
- Database berubah additive; tidak menulis ulang migration terpasang atau
  menganggap fakta/snapshot v1 telah diteliti menurut v2. Owner OAuth, workspace,
  RLS, grant default-closed, CAS, idempotency, dan audit tetap berlaku.
- Tidak menambah OpenAI API, embeddings/vector search, worker AI, dashboard,
  otomatisasi Canva/Facebook, tier, expiry, ontologi input v2, riset ulang URL
  saat Setujui, atau kewajiban tahun pada copy.
- Bukti source, CI/FIXTURE, dan LIVE dibedakan. Rilis backend, pemasangan plugin,
  business Write, serta penghentian jalur lama memerlukan scope izin tersendiri.
