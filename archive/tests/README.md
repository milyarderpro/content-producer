# Arsip test trivia v1

`database/api-trivia-public-gold-v1.ts` dan
`database/api-trivia-v2-corpus-legacy.ts` adalah salinan test historis sebelum
cutover. Keduanya menyebut RPC v1 yang telah dipensiunkan, sehingga tidak menjadi
syarat gate aktif. Data gold dan corpus asli tetap di
`supabase/tests/fixtures/trivia/` untuk penelusuran.

Tiga belas suite database yang membutuhkan keberhasilan operasi v1 dipindahkan
utuh ke direktori ini. Alasan dan test v2 yang menggantikannya dicatat dalam
[pemetaan task 4.3](../../openspec/changes/cutover-trivia-v2-only/task-4.3-test-mapping.md).
Suite arsip tidak dijalankan sebagai gate rilis v2; namanya tetap dapat
ditelusuri melalui Git dan file di direktori ini.

Syarat aktifnya adalah `supabase/tests/database/api-trivia-v2-corpus.test.ts`:
92 identitas, 40/40 parafrasa, 18/18 riwayat negatif, serta respons tanpa
URL atau data sumber. Test itu berjalan melalui RPC v2 terautentikasi pada
Supabase lokal. Arsip ini bukan bukti deployment production.
