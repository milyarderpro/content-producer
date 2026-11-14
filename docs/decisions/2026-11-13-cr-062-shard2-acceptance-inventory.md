# CR-062 — rekonsiliasi inventaris penerimaan shard 2

Tanggal 13 November 2026. Koreksi test terhadap kontrak CR-062 yang sudah diterima;
bukan perubahan izin, schema atau migration. Verifikasi kandidat serta G4 ulang
masih diperlukan sebelum rilis.

G4 43406057727 pada 93c38cb8 lulus source dan shard 1 lengkap, termasuk 158 kasus
DB, MCP130, Inspector33/33, advisors/audit dan cleanup. Shard 2 lulus audit katalog
sebelum/sesudah, tetapi command test database gagal; cleanup PASS dan aggregate FAIL.
Reproduksi SEC-only membuktikan `expected 33 to be 31`; tiga kasus lain pada run
terfilter itu skipped, bukan bukti seluruh shard selesai.

api-phase-five-acceptance dan phaseFiveOperationMap belum memuat tambahan CR-062:
get_trivia_editorial_catalog, update_trivia_editorial_catalog dan dua tabel RLS.
Pin/audit runtime dan kontrak task 2/7 sudah mensyaratkan 33 RPC serta 19 RLS.
Koreksi menyamakan exact expected set menjadi 33 operasi (21 Write,12 Read),
menambahkan guard operation_key/expected_editorial_catalog_version pada Write,
dan menunjuk test owner katalog yang sudah ada. Proyeksi allowlist memperluas
query historis secara eksplisit; file SQL historis tetap utuh.

Tetap wajib: nol overload/allowlist difference/grant caller/helper/public,
owner policies, private-definer inventory, immutable metrics dan exact names
terhadap registry. Pemeriksaan tabel bisnis 19 ditambahkan di samping 19 RLS.
Tidak ada pengurangan assertion, penerimaan RPC tambahan tanpa daftar, skip,
perubahan timeout atau perubahan runtime. Kasus DB tetap 238 pada 33 file.

Rencana verifikasi: seluruh shard 2 (18 file/80 kasus) serial dengan fixture lokal
terisolasi; source/frontend check; PR/Actions; merge dan G4 exact final main baru.
User sudah memberi otorisasi operasional task 10 tanpa permintaan izin ulang.
Hasil gagal lama dipertahankan dan tidak menjadi klaim LIVE/FIXED.

## Kelanjutan reproduksi — policy dua tabel baru

Run seluruh shard lokal menghasilkan 79 PASS/1 FAIL dalam 292,94 detik, tanpa skip;
cleanup 20 tabel business/Auth/Storage nol. Setelah count/allowlist diperbaiki,
assertion berikutnya masih mensyaratkan helper identitas v1 pada semua policy.
Migration katalog yang sudah diterima menggunakan scoped workspace EXISTS,
active workspace dan owner_user_id=(SELECT auth.uid()) pada dua tabel baru.

Koreksi penerimaan dibatasi pada empat policy di dua tabel katalog: exact names,
command, role API owner tunggal, ekspresi owner/workspace/active, USING dan
WITH CHECK sesuai command. Policy 17 tabel lama tetap memakai assertion helper
v1 semula. Tidak mengizinkan auth.uid() secara umum atau mengubah policy runtime.
Hasil 79 PASS awal dipertahankan; retest hanya kasus SEC yang gagal. Skips dari
filter retest tidak dihitung sebagai test yang lulus. Formal G4 tetap mengeksekusi
semua 238 kasus tanpa skip pada exact final SHA baru.

## Verifikasi 14 November 2026

SEC-only setelah koreksi exact policy: 1 PASS, 3 skipped karena name filter.
80 kasus unik terverifikasi setelah menggabungkan retest ini dengan 79 PASS
pada run penuh sebelumnya; bukan satu run full-shard PASS. Cleanup lokal 20 tabel
nol; check source/frontend final PASS208/19 dan OpenSpec strict/whitespace PASS.
OID pada JSON audit adalah string; role dibandingkan dengan oid::text secara
exact. Percobaan numeric OID sebelumnya dicatat terpisah sebagai diagnostik.
