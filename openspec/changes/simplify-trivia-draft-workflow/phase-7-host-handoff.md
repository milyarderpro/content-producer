# P7-T2 — handoff host ChatGPT terkendali

**Status:** BLOCKED; seluruh skenario bisnis host di bawah NOT RUN.
**Prasyarat yang sudah selesai:** P7-T1 G4 formal PASS pada backend source
`350a4c83f18e9bfb6017ef52e35913ec258ac661`,
[run 41456400517](https://github.com/milyarderpro/content-producer/actions/runs/41456400517).
**Plugin kandidat source:** 0.3.0, bukan bukti versi terpasang.

## 1. Prasyarat yang belum tersedia

- Chat ChatGPT baru dengan plugin PRIVATE dan koneksi owner OAuth `mcpku2`
  yang benar-benar menampilkan tiga tool v2/schema yang sesuai.
- Identitas runtime/backend dan versi plugin terpasang dari bukti operator.
  Host tidak boleh menebak source/deployment SHA dari nama tool atau health.
- Page/objek khusus uji yang diizinkan pada runtime terisolasi kompatibel v2,
  beserta konfigurasi aktif dan scope jumlah draft. Data owner production tidak
  otomatis menjadi fixture dari izin remediasi repository.
- Untuk lost response/hard failure: fasilitas gangguan terkendali pada fixture,
  bukan memutus koneksi production, memanipulasi DB production, atau mengarang
  error yang tidak benar-benar terjadi.

Sesi coding tidak menyediakan tool bisnis `mcpku2`/akses chat host tersebut.
Inspector HTTP nyata yang sudah PASS adalah bukti integrasi fixture, bukan
pengganti perilaku ChatGPT. Pengujian host tidak memulai rollout P8 secara
diam-diam. Jika operator belum mempunyai runtime uji v2 yang sesuai, catat
BLOCKED dengan identitas/prasyarat yang kurang.

## 2. Prompt pertama — preflight Read saja

Pemilik menempel prompt ini pada chat baru; tidak perlu mengirim credential:

```text
Lakukan preflight Read saja untuk P7-T2 Content Producer. Gunakan plugin
PRIVATE yang terhubung melalui owner OAuth mcpku2. Jangan menjalankan Write.

1. Sebutkan apakah trivia_find_similar_facts_v2, save_post_v2, dan
   revise_post_v2 benar-benar tersedia dalam tool/schema sesi ini. Jangan
   menganggapnya tersedia hanya karena disebut dalam prompt atau instruksi.
2. Jalankan get_account_profile({}), get_workspace_context({}), lalu list_pages
   dengan scope workspace yang benar dari respons. Jangan menampilkan token,
   credential, operation key, claim token atau reservation token.
3. Laporkan Page khusus testing yang benar-benar ditemukan. Jangan memilih
   atau mengubah Page produksi/historis dan jangan membuat Page baru. Jika
   belum ada objek uji yang ditetapkan, berhenti setelah daftar Read.
4. Untuk Page uji yang sudah ditetapkan pemilik, ambil generation context dan
   laporkan ID config serta timestamp config sebagai teks asli enam digit
   mikrodetik, bahasa, jumlah fakta, topik/format yang diizinkan, reuse scope
   dan batas naskah. Jangan mengonversi timestamp ke JavaScript Date.
5. Bedakan versi plugin/runtime/backend yang memiliki bukti dari yang belum
   diketahui. Katalog tool, HTTP 200 dan G4 source bukan bukti deployment.

Hasil akhir dalam bahasa Indonesia: tool yang tersedia, urutan Read, Page/
workspace ID yang boleh dibagikan, konfigurasi terkait, dan blocker bila ada.
Tidak ada save/register/reserve/create-plan/approve/publish dalam preflight ini.
```

Kembalikan respons/trace tersanitasi pada Issue uji yang sesuai. Bila tool v2
tidak terlihat, jangan memaksakan jalur v1 atau menyatakan dedup bersih.

## 3. Paket skenario setelah preflight sesuai

Ini pemetaan cakupan task, **bukan ambang pengulangan/cutover baru**. Operator
menetapkan ID target fixture dan instruksi draft yang tepat sebelum eksekusi.
Setiap chat menguji satu skenario yang jelas; sumber konten diteliti nyata,
sedangkan gangguan/sumber sintetis hanya dipakai dalam fixture yang dinyatakan.

| ID lokal | Skenario host | Bukti yang harus terlihat | Status |
| --- | --- | --- | --- |
| H01 | Satu draft tanpa plan | context terbaru, Read v2, save atomik, `get_post`: satu ID, `draft`, revision/hash, fakta/URL/copy/checks cocok | NOT RUN |
| H02 | Lima draft bertema food and home jika config mengizinkan | satu plan lima item tanpa jadwal, claim satu per giliran, tema sesuai config, lima ID berbeda dengan readback tiap draft; jumlah 5/5/0 | NOT RUN |
| H03 | Penggantian calon | kandidat fixture `same` terpakai/uncertain/incomplete diganti, Read sah baru sebelum copy/save; tidak ada ID pengelak | NOT RUN |
| H04 | Hard budget/error terarah | attempt fixture melebihi batas ditolak dengan lokasi/recovery, tidak ada draft parsial; koreksi naskah mengikuti state pasti | NOT RUN |
| H05 | Hasil sebagian dan resume chat baru | berhenti setelah tiga dari lima readback; chat baru membaca plan dan output, hanya mengerjakan dua sisa, completed tidak dibuat ulang | NOT RUN |
| H06 | Respons Write hilang | gangguan fixture terbukti setelah dispatch; rekonsiliasi/replay key dan payload semantik identik menemukan ID semula, readback cocok dan output tidak ganda; lease expiry mengikuti kontrak | NOT RUN |

Permintaan draft mencakup plan/claim/renew/failure relevan menurut kontrak;
Setujui, koreksi, discard, publikasi dan metrik tetap tindakan terpisah.
Tidak ada Facebook URL/ID/metrik fiktif atau grant rollback fixed-pilot.

## 4. Bentuk bukti tersanitasi per skenario

```text
ID skenario / waktu / operator / chat baru:
Status: PASS | FAIL | BLOCKED | NOT RUN
Tingkat bukti: HOST FIXTURE (atau LIVE hanya bila benar-benar sesuai)
Runtime target dan bukti deployment/source SHA:
Plugin terpasang / versi / sumber bukti:
Scope objek uji / instruksi jumlah dan tema:
Tool/schema terlihat / urutan panggilan:
Page ID / plan ID bila ada:
Diminta / terbukti melalui readback / tersisa:
Post ID per item / status / revision / content hash:
Config timestamp asli / hasil Read dan checks yang relevan:
Error code / tahap / diagnostic ID aman / outcome Write:
Tindakan recovery yang benar-benar dilakukan / bukti tidak ada output ganda:
Ringkasan Indonesia / batas bukti / tautan trace stabil:
```

Operation key/payload identik dipertahankan oleh operator/host untuk replay,
tetapi key privat, token dan payload panjang tidak masuk laporan. Host approval,
teks copy di chat, HTTP 200 dan CI PASS tidak menggantikan `get_post`/progres plan.
P7-T2 baru dicentang setelah seluruh cakupan task mempunyai bukti yang sah;
handoff ini sendiri bukan penyelesaian task atau keputusan cutover P8.
