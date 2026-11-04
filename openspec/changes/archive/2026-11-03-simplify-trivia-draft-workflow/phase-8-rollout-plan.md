# P8-T1 — usulan cutover dan latihan pemulihan

**Status:** Rencana diterima pemilik; P8-T1 **PASS pada kriteria CR-058**.
**Tanggal pemeriksaan:**
3 November 2026. [CR-058](../../../../docs/decisions/2026-11-03-cr-058-p8-production-qa-rollback-verification.md)
menerima pemeriksaan kompatibilitas pada Page QA production sebagai pengganti
latihan runtime terisolasi. Dokumen ini tidak mengizinkan penghentian pembuatan v1,
perubahan plugin, deployment, atau perubahan data production. Arah produk v2
utama dan batas Read v1 mengikuti [CR-054](../../../../docs/decisions/2026-11-01-cr-054-v2-primary-and-v1-creation-retirement.md).

## Baseline yang sudah terbukti

| Area | Bukti dan batas |
| --- | --- |
| Rilis backend/plugin | [P7](phase-7-results.md#p7-t2--hasil-host-terkendali-3-november-2026) mencatat G4 formal aggregate PASS pada source backend `350a4c83f18e9bfb6017ef52e35913ec258ac661`, [run 41456400517](https://github.com/milyarderpro/content-producer/actions/runs/41456400517), 84 migration terpasang, lalu Edge `mcp` ACTIVE v36 dengan digest `d4e70699cee7e0b42c9b601ecf7aadcf62a5d1c1bdc8262f161e66e945e78404`, dan plugin PRIVATE 0.3.0 release `pluginrel_6ae8a89e7920819193898a565017ca8c`. Urutan backend sebelum plugin telah dijalankan di P7. Digest deployment tidak membuktikan Git SHA secara langsung; P7 mencatat perbandingan path source yang relevan. |
| Host v2 | P7 H01–H05 PASS pada Page QA yang ditetapkan, termasuk satu draft, lima draft, partial/resume dan readback. H06 PASS untuk respons save yang ditahan di batas host dan replay tanpa duplikasi; bukan simulasi putus jaringan atau lease expiry. Semua post P7 tetap draft ketika bukti tersebut dicatat. |
| Data campuran production | Pembacaan agregat 3 November: **28 post v1** (22 draft, 4 ready, 2 discarded) dan **9 post v2** (8 draft, 1 ready). Ada lima plan: satu completed dengan 5/5 item, tiga pending dengan total tujuh item, dan satu cancelled. Pada Page QA sendiri ada dua post v1 (satu draft, satu discarded) dan delapan post v2 draft. Saat pembacaan, tidak ada claim item aktif/expired atau reservasi fakta aktif. Angka ini snapshot waktu pemeriksaan, bukan janji state tetap. |
| Pemakaian operasi | Ledger production: total `save_post` v1 28, `revise_post` v1 10, `save_post_v2` 9, `revise_post_v2` 1. Dalam jendela 24 jam saat pemeriksaan, `save_post`/`revise_post` v1 tercatat 0 dan v2 tercatat 9/1. Ini hitungan operasi sukses di ledger; tidak mengidentifikasi versi plugin pada setiap chat, request Read, instalasi lama, atau percobaan gagal sebelum Write. Angka nol bukan bukti tidak ada pengguna v1. |
| Plugin lama | Plugin Creator menunjukkan current release 0.3.0 dan arsip release 0.2.11 serta sebelumnya. Arsip tersedia tidak membuktikan jumlah instalasi aktif maupun penggunaan sekarang. Data instalasi aktif belum tersedia dari permukaan yang diperiksa; statusnya **UNVERIFIED**. |
| Keamanan/pemulihan | 84/84 migration dan Edge v36 masih terkonfirmasi pada target production saat pemeriksaan. Katalog `api`: 38 signature, seluruhnya tidak dapat dieksekusi `anon`, seluruhnya dapat dieksekusi `authenticated` menurut pemeriksaan privilege; 11/11 tabel `public` ber-RLS. Supabase Security Advisor mengembalikan dua kelas WARN: 38 temuan `authenticated_security_definer_function_executable` dan satu `auth_leaked_password_protection`, tanpa temuan ERROR dalam hasil yang diperiksa. Grant `authenticated` ini perlu dibaca bersama kontrak owner check/RLS dan tidak dinyatakan PASS hanya dari hitungan; setting password adalah isu Auth terpisah. Ekspor schema/data sebelum migration P7 ada di penyimpanan lokal terbatas, tetapi restore belum dilatih dan bukan target rollback data v2. |

## Kriteria yang diajukan untuk keputusan cutover pembuatan v1

Kriteria berikut **diterima pemilik sebagai rencana keputusan cutover**, bukan
bukti bahwa seluruh gate cutover telah lulus. Penilaian dilakukan
terhadap runtime dan source yang diidentifikasi, dengan bukti CI/FIXTURE dan
LIVE/host dipisahkan.

1. **Alur v2:** bukti host pada Page QA mencakup satu draft, lima draft dalam
   plan, pemulihan setelah hasil sebagian, dan readback setiap post. Jumlah
   tersimpan harus sama dengan permintaan yang berhasil, tanpa ID ganda atau
   mutasi parsial. P7 H01–H05 sudah memenuhi paket dasar ini; P8-T2 masih perlu
   retest live pada runtime/objek berizin sebelum cutover dilaksanakan.
2. **Pencarian fakta:** pada corpus berlabel 93 kasus, recall parafrasa pada
   20 hasil teratas minimal **38/40**, keputusan salah gabung **0**, riwayat
   negatif **18/18** terlihat tetapi tidak dapat dipakai, dan flag `complete`
   benar terhadap oracle penuh pada semua kasus. Trace keputusan nyata wajib
   ada; validasi bentuk corpus saja tidak dihitung sebagai hasil retrieval.
3. **Pemulihan:** respons hilang harus diikuti readback, lalu replay hanya
   dengan operation key dan payload semantik identik. Lease expired,
   config/revision conflict, dan retry setelah rollback harus menghasilkan
   diagnostik yang tepat, tanpa post atau claim ganda. H06 baru membuktikan
   kasus respons host; cakupan lain memakai bukti fixture/G4 dan pemeriksaan
   Page QA menurut CR-058, dengan batas bukti masing-masing.
4. **Data lama:** sampel status v1 (`draft`, `discarded`) serta v2 (`draft`)
   pada Page QA dibaca melalui jalur owner yang sah;
   snapshot, sumber, approval dan riwayat tidak berubah. Untuk `posted` dan
   `archived` yang tidak ada pada snapshot production serta `ready` yang tidak
   ada pada Page QA, gunakan bukti fixture/CI dan catat batas LIVE, tanpa
   mengarang post production. Pengelolaan v1 yang masih sah, termasuk revisi,
   maintenance, replay dan pekerjaan in-flight, tetap berjalan. Read v1 boleh
   memberi `FACT_REVIEW_REQUIRED` hanya pada batas CR-054, bukan hasil bersih
   palsu atau kegagalan massal.
5. **Plugin lama:** sebelum menutup pembuatan v1, inventaris instalasi aktif
   dan panggilan tool harus dapat membedakan pembuatan v1, maintenance/replay
   v1, dan v2 tanpa menyimpan token, operation key, payload, atau sumber privat.
   Bila telemetri tidak tersedia, statusnya **UNVERIFIED** dan cutover tidak
   dinyatakan PASS. Tidak ada syarat otomatis tujuh hari/tiga chat.
6. **Rilis/security:** setiap perubahan backend/migration/security memakai
   G4 manual aggregate PASS pada exact SHA final yang akan dipasang. Periksa
   migration/history, grant/RLS, advisor dan owner denial, serta bandingkan
   versi Edge dan plugin terpasang sebelum/sesudah. P7 G4 berlaku untuk backend
   yang tidak berubah; SHA dokumen ini sendiri bukan bukti backend baru. WARN
   advisor production harus direkonsiliasi dengan kontrak grant/security;
   jangan disamakan dengan PASS advisor lokal atau langsung dianggap defect.

Semua enam area harus memiliki bukti yang relevan dan keputusan pemilik sebelum
jalur pembuatan v1 dinonaktifkan. Kepuasan manual pemilik terhadap v2 adalah
masukan produk yang kuat, tetapi tidak menggantikan bukti kompatibilitas data
campuran dan pemulihan.

## Target, pemicu dan prosedur rollback yang diajukan

**Target awal yang diterima untuk rilis berikutnya:** backend P7 yang kini aktif (84 migration,
Edge `mcp` v36) bersama plugin PRIVATE 0.3.0. Ini titik stabil untuk
perubahan **setelah** P7; tidak ada versi backend yang lebih lama dari 84
migration yang boleh dianggap target aman bagi post v2. Untuk kesalahan plugin
baru, pemulihan pertama adalah kembali ke release 0.3.0 pada app `mcpku2`
dengan backend tetap v36. Release 0.2.11 hanya kandidat inspeksi kompatibilitas
v1, bukan target rollback yang disetujui untuk data v2. Untuk kesalahan backend,
gunakan forward-fix atau binary yang telah dibuktikan kompatibel dengan schema
dan data v2, setelah gate/otorisasi yang berlaku. Jangan reset production,
menurunkan schema, atau mengembalikan dump P7 di atas data baru.

**Pemicu yang diterima:** tool v2 hilang dari katalog host setelah rilis; owner denial
atau grant/RLS tidak sesuai; write/readback berbeda, post ganda, plan kehilangan
item/progres; kesalahan lintas v1/v2 yang merusak maintenance/replay; atau
kenaikan error bisnis yang terbukti berasal dari rilis. Pada gejala write
ambigu, hentikan pembuatan baru sementara, baca state, dan jangan replay
dengan operation key/payload baru. Eskalasi keputusan rollback setelah bukti
target, dampak dan scope dicatat. Kegagalan gate sebelum deploy memblok deploy.

**Urutan yang diterima:** (1) catat source SHA, deployment ID/digest, plugin release,
migration, status advisor dan state plan/claim/reservasi tanpa rahasia; (2)
hentikan hanya pembuatan baru bila tersedia mekanisme yang telah diuji dan
disetujui, sambil mempertahankan Read/maintenance/replay yang sah; (3) pulihkan
plugin/backend ke target yang telah dilatih, backend mendahului plugin bila
keduanya perlu berubah; (4) baca ulang sampel v1/v2 serta plan dan pastikan
ID, status, revision/hash, snapshot dan 5/5 item yang telah selesai tetap sama;
(5) uji owner denial dan ketersediaan tool, lalu buka kembali pembuatan baru
hanya setelah hasil dan izin tindakan tercatat. Tidak ada feature flag untuk
menonaktifkan creation v1 yang telah dibuktikan pada runtime sekarang;
prosedur tidak boleh mengandaikannya tersedia.

## Pemeriksaan Page QA production menurut CR-058

Pemilik memilih tetap memakai production dan mengubah kriteria P8-T1.
Pemeriksaan memakai Page QA P7, operasi **Read saja**, tanpa mengganti Edge,
plugin, schema atau data. Ini menguji bahwa runtime aktif tetap dapat membaca
data campuran dan plan. Pengujian rollback deployment sungguhan **NOT RUN**;
ekspor backup P7 juga belum pernah dipulihkan. Keduanya tidak dinyatakan PASS.

| Objek Page QA | Hasil Read owner OAuth awal | Hasil ulang / batas |
| --- | --- | --- |
| Post v1 discarded `3f53edb4-f035-4b39-ad24-d31a3b3468a6` | `get_post` sukses, schema 1, status discarded, revision 2, tujuh fakta, hash `a2ddd0caaf5e793a3fab49fca1227277de8a9181a6cc7a2c25cfec780fc04922` | **PASS:** Read ulang menunjukkan status, revision, jumlah fakta dan hash identik |
| Post v1 draft `04c12175-cd24-465d-aec5-c0554d4870af` | `get_post` sukses, schema 1, status draft, revision 5, tujuh fakta, hash `9cf21e65d66b09503794f57254c498de215e018b7e4afb6a4281c0cae2a14d46` | **PASS:** Read ulang menunjukkan status, revision, jumlah fakta dan hash identik |
| Post v2 draft `26b66e2e-c8fb-424a-a314-285b2f5faf02` | `get_post` sukses, schema 2, status draft, revision 1, lima fakta, hash `60f7de7df738d8a9375ecec8735d88686bf8b0e06e2da1db65f5ccea32c7af71` | **PASS:** Read ulang menunjukkan status, revision, jumlah fakta dan hash identik |
| Plan v2 `b612779a-3d14-46d0-a971-bed0148a5609` | `get_content_plan` sukses, status completed, requested 5, kelima item completed dengan attempt 1 | **PASS:** Read ulang 5/5 completed, lima post aktif berbeda, attempt tiap item tetap 1 |

Pemeriksaan Read tidak membuktikan jalur update/maintenance v1, claim aktif,
lease expiry, atau replay secara LIVE; fixture/G4 dan P7 H06 memberi bukti
terpisah sebagaimana dicatat di atas. Inventaris instalasi plugin lama juga
belum lengkap. **Verdict P8-T1: PASS** untuk kriteria yang diubah CR-058:
rencana target/pemicu/prosedur diterima pemilik dan Read ulang Page QA PASS.
Rollback deployment **NOT RUN**; ketiadaan inventaris instalasi aktif berarti
cutover pensiun pembuatan v1 **belum siap**. P8-T2 masih memerlukan retest LIVE
serta keputusan tindakan tersendiri.
