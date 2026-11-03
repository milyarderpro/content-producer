# P8-T2 — retest live dan pemantauan

**Tanggal:** 3 November 2026. **Change:** `simplify-trivia-draft-workflow`.
**Status:** retest LIVE Read dan satu Write/readback v2 **PASS** pada Page QA
production. Keputusan pensiun pembuatan v1 **ditunda** karena kriteria cutover
belum seluruhnya terbukti. Ini laporan LIVE terpisah dari bukti CI/FIXTURE P7.

## Target dan bukti awal

Runtime production yang diperiksa memakai 84 migration applied, Edge `mcp` v36
digest `d4e70699cee7e0b42c9b601ecf7aadcf62a5d1c1bdc8262f161e66e945e78404`,
plugin PRIVATE Content Producer 0.3.0 dan owner OAuth `mcpku2`. Page fixture
`Content Producer QA Sandbox (Verified)` ber-ID
`3c7dc8b2-43db-42b5-abd6-d334aac0ff83`. Source/backend P7 yang menjadi
rujukan gate tetap `350a4c83f18e9bfb6017ef52e35913ec258ac661`; tidak ada
perubahan backend atau plugin dalam retest ini. Sumber status live adalah
connector production dan [chat host P8-T2](https://chatgpt.com/c/6ae94677-dcec-83ec-824f-a37f0fa08c6f),
bukan manifest lokal saja.

Sebelum Write P8, production memiliki **28 post schema v1** dan **9 post schema
v2**. Pada Page QA, `list_posts` mengembalikan satu draft v1, satu post v1
`discarded`, dan delapan draft v2. Post QA dan plan P7 yang sudah ada
dipertahankan.

## Retest LIVE melalui ChatGPT host

Dalam chat baru dengan hanya plugin PRIVATE Content Producer, owner dan
workspace terautentikasi, Page aktif serta generation context terbaca. Daftar
sembilan draft QA terbaca. `get_post` berhasil untuk v1 draft
`04c12175-cd24-465d-aec5-c0554d4870af` (schema 1, revision 5, tujuh
fakta), v1 discarded `3f53edb4-f035-4b39-ad24-d31a3b3468a6` (schema 1,
revision 2, tujuh fakta), dan v2 draft
`26b66e2e-c8fb-424a-a314-285b2f5faf02` (schema 2, revision 1, lima
fakta). Semua 19 binding fakta pada tiga post memiliki source snapshot menurut
respons host. `get_content_plan` untuk
`b612779a-3d14-46d0-a971-bed0148a5609` menunjukkan **5/5 completed**,
lima ID post berbeda, setiap item satu attempt, nol failed/in-progress. Tiga
post dan plan tersebut tidak direvisi oleh retest Read.

Pembacaan SQL agregat/metadata, tanpa menampilkan payload, membandingkan
`content_hash` ketiga post dengan baseline P8-T1: semuanya identik. Fingerprint
`generation_snapshot` sebelum retest Write juga dicatat untuk pembandingan
akhir: v1 draft `8b72ec2391eaa10b80a6d5a95b761892`, v1 discarded
`022bbd4905b37fd8f9786c5750b60507`, dan v2 draft
`76779c93db955b2abc13f67aae51ad67` (MD5 atas representasi JSONB, bukan
isi snapshot). API owner `get_post` menampilkan source snapshot per binding,
tetapi tidak mengekspos `generation_snapshot` sebagai field terpisah; klaim
utuhnya snapshot bertumpu pada pembandingan database terbatas tersebut.

Pratinjau satu draft v2 bertema barcode disusun sebelum Write. Delapan
calon fakta diteliti; `trivia_find_similar_facts_v2` melaporkan 8/8 hasil
`complete` dan nol match pada saat pembacaan. Tujuh calon dipilih dengan URL
GS1/GS1 US per kalimat. Tiga kalimat perlu diperjelas sebelum Write agar satu
URL mendukung seluruh klaim. Dedup diulang untuk tujuh kalimat final: 7/7
`complete`, nol match, katalog versi `10`. Pratinjau dan dedup Read sendiri
**bukan** bukti draft tersimpan.

Pemilik mengizinkan tepat satu draft v2 barcode berisi tujuh fakta GS1 pada
Page QA production, diikuti readback, tanpa persetujuan, jadwal, plan atau
publikasi. Tepat sebelum Write, host membaca ulang generation context dan
mempertahankan teks `config_updated_at` enam digit mikrodetik
`2026-10-21T16:08:12.627461Z`. Host memanggil `save_post_v2` sekali dengan
operation key baru; respons menyatakan
`replayed: false`, lalu `get_post` berhasil. Post baru
`a3b435cf-46a5-4ad6-8b26-864d5ce79e2c` tetap **draft**, schema 2,
revision 1, tanpa jadwal atau plan, `quality_status: passed`, hash
`4791b776fa33a74e034a06b45f26accb3a2c27ac1a777cbbcacc626e64ec21af`.
Readback owner OAuth yang terpisah dari chat host mengonfirmasi tujuh kalimat
sesuai urutan, tujuh URL sumber sesuai posisi, 7/7 source snapshot, dan semua
pemeriksaan sistem/editorial lulus. Tidak ada approval. Ini **PASS** untuk
retest Write/readback yang diizinkan; tidak menguji approval atau publikasi.

Sesudah Write, pembacaan database agregat menunjukkan 28 post v1 tetap dan
post v2 bertambah **9 → 10**; pada Page QA draft v2 bertambah **8 → 9**.
Pencarian `list_posts` dengan topik barcode menemukan tepat satu post baru.
Tiga post sampel P8-T1 tetap memiliki status, revision, `content_hash`, dan
fingerprint `generation_snapshot` identik dengan baseline di atas. Dalam
scope satu operasi uji ini, draft berhasil **1/1**, error Write yang tampak
**0**, dan duplikasi yang ditemukan **0**; ini tidak menyatakan tingkat error
atau duplikasi seluruh pengguna production nol.

## Pemantauan penggunaan dan batasnya

Sebelum Write P8, ledger operasi sukses pada production mencatat total `save_post` v1 **28**,
`revise_post` v1 **10**, `save_post_v2` **9**, dan `revise_post_v2` **1**.
Pembuatan v1 terakhir tercatat **28 Oktober**, maintenance `revise_post` v1
terakhir **24 Oktober** (tanggal UTC),
`save_post_v2` tercatat 1 pada 2 November dan 8 pada 3 November, serta
`revise_post_v2` 1 pada 2 November. Ledger ini hanya mencakup operasi yang
berhasil; tidak menunjukkan percobaan gagal sebelum commit, request Read,
versi plugin yang mengirim request, atau jumlah instalasi lama aktif. Log Edge
HTTP tidak mengungkap nama tool/hasil bisnis dalam respons 200. Karena itu
error bisnis keseluruhan dan pemakaian plugin lama tetap **UNVERIFIED**, bukan
nol.

Pada Page QA, plan lama P7 tetap completed 5/5. Dua plan lama lain masih
pending dengan 1 dan 3 item; tidak ada item in-progress pada hasil daftar.
Rencana pending tersebut tidak diambil alih atau dibersihkan untuk retest.

## Keputusan rilis

Rencana P8-T1 yang disetujui pemilik tetap berlaku. Pensiun pembuatan v1
**belum diajukan untuk pelaksanaan**: inventaris instalasi aktif/plugin lama
belum tersedia, dan trace keputusan salah gabung pada corpus belum dibuktikan
sebagai nol. Pemilik menyetujui rencana P8-T1 dan secara terpisah satu Write QA
P8-T2; belum ada izin tindakan cutover. Tidak ada deployment, rollback,
perubahan grant, penghentian v1, persetujuan draft, atau publikasi. Post lama,
snapshot dan pekerjaan plan in-flight dipertahankan. Bukti P7 G4/fixture tidak
diberi label LIVE; verdict masalah live terdahulu tidak diubah menjadi `FIXED`
tanpa retest yang relevan terhadap masalah tersebut.

G4 P7 [run 41456400517](https://github.com/milyarderpro/content-producer/actions/runs/41456400517)
PASS 46 file/221 kasus DB, termasuk `api-trivia-v2-corpus.test.ts` yang
memuat 93 query/92 identitas fixture dan menegakkan recall parafrasa
minimal 38/40, negatif 18/18, serta `complete` terhadap oracle SQL. Ini
**CI/FIXTURE**, bukan hasil LIVE dan bukan trace keputusan editorial per kasus
untuk membuktikan nol salah gabung. Kriteria cutover bagian itu belum diberi
verdict PASS menyeluruh.

**Verdict P8-T2: PASS** untuk retest host dan pemantauan terbatas yang
diizinkan. **Cutover: BLOCKED** sampai seluruh kriteria P8-T1 dan izin
tindakan tersendiri tersedia; v1 tetap tersedia menurut batas CR-054.
