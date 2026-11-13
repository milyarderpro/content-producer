# CR-062 — koreksi pin katalog dari clean replay task 10

Tanggal 13 November 2026. Status: koreksi teknis diverifikasi lokal; PR/Actions
serta merge dan gate rilis kandidat berikutnya tetap diperlukan. Ini penjelasan
asal perubahan expected audit, bukan perubahan kontrak frozen atau izin rilis.

G4 final SHA `3b56ff33b9229765a88f1a04f31877c60fe9c820` gagal sebelum test DB.
[Diagnosis dan bukti](../editorial/configurable-profiles/task-10-g4-findings.md)
membuktikan pin functions lama berasal dari satu baris berisi enam spasi pada
definisi lokal api.create_content_plan. Migration committed sudah berisi baris
kosong; fresh replay menghasilkan hash berbeda dengan metadata yang identik.
Seluruh fungsi lain dan delapan section katalog lain sama.

Keputusan implementasi: pin hasil replay migration committed yang sudah diperiksa,
bukan definisi lokal yang berbeda byte. Section functions berubah dari
`2c4a6c227d646b8d23995733791cf479c53df20293ec98eada513e14a8bf7db8`
menjadi `9f971044e3ed67533c93b45e9a606e42b6d6948ad327b6e7dc2c066538786452`.

Comparator tetap byte-exact; tidak menambahkan trim, pengecualian fungsi,
allowlist hash alternatif, skip, timeout baru, atau perubahan migration.
Negative control source-only dan function ACL tetap harus FAIL. Pin migration,
manifest, schema, owner, grant dan RLS tidak diperluas. Bukti lama tetap historis.

Fresh replay kedua dengan satu reset dan pin terkoreksi lulus audit penuh serta
cleanup (101 detik). Source/frontend check lulus. Hasil ini tidak menggantikan
G4 manual pada final SHA main baru setelah merge perbaikan yang diotorisasi.
Deployment dan business Write belum diotorisasi oleh perbaikan ini.
