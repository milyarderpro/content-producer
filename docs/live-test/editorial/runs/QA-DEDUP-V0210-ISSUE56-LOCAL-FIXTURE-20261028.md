# Issue #56 — regresi fixture dedup lokal

**Tanggal:** 28 Oktober 2026. **Bukti:** `CI/FIXTURE` lokal, bukan `LIVE`.
**Branch lokal:** `codex/issue-56-local-dedup-regression`, dibuat dari
`f37714aec51e7618438dc95881eeef6b3738c2c0` (`origin/main` lokal, source
plugin v0.2.10). Tidak ada commit, push, PR, merge, perubahan plugin/backend,
atau koneksi Supabase production dalam pengujian ini.

## Cakupan

Fixture sintetis di `tests/fixtures/issue-56-dedup-recovery.ts` menyediakan tiga
kandidat dan respons mock `trivia_find_similar_facts`. Setiap respons **server
mock** lengkap; untuk B, fixture tertentu mengurangi **tampilan yang terlihat**
setelah batas server dengan penanda `host display truncated`, tiga dari dua puluh
match, dan `review_required` yang tidak terlihat. Ini mensimulasikan truncation
presentasi, bukan membuktikan RPC production mengirim respons rusak.

`tests/issue-56-dedup-recovery.test.ts` menjalankan prosedur referensi yang
ditulis dalam tes: satu READ awal per kandidat, alasan yang dicatat sebelum READ
ulang untuk posisi tidak lengkap, maksimal satu READ ulang tertarget, lalu review
semantik hanya bila semua hasil dapat diperiksa. Mock tool hanya menyediakan
READ; tidak tersedia metode registrasi, reservasi, penyimpanan, atau publikasi.
Tes juga memeriksa jejak prosedur secara terpisah dan menyisipkan peristiwa
`WRITE` sintetis hanya sebagai kontrol negatif; peristiwa itu tidak memanggil
tool bisnis.
Keputusan semantik sintetis B diturunkan dari tiga primary key terstruktur;
fixture memeriksa 20 ID unik dan label `relation`/`other` terhadap field yang
terlihat. Ini bukan penilaian semantik oleh AI host.

## Perintah dan hasil aktual

| Perintah                                                                                                     | Hasil                                                                                            |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `pnpm exec prettier --write tests/fixtures/issue-56-dedup-recovery.ts tests/issue-56-dedup-recovery.test.ts` | Selesai; dua file diformat.                                                                      |
| `pnpm exec vitest run tests/issue-56-dedup-recovery.test.ts`                                                 | **PASS**: 1 file, 3 tes.                                                                         |
| `pnpm run check`                                                                                             | **PASS**: format, lint, typecheck, 66/66 tes root, frontend typecheck/build, 19/19 tes frontend. |
| `pnpm exec vitest run tests/issue-56-dedup-recovery.test.ts --reporter=verbose --silent=false`               | **PASS**: 1 file, 3 tes; jejak ringkas di bawah.                                                 |

Pemeriksaan format pertama untuk record Markdown ini sempat **FAIL** karena
format tabel. Setelah `pnpm exec prettier --write` pada record, `pnpm run check`
final **PASS**. Kegagalan sementara itu tidak mengubah verdict tiga fixture.
Saat menambah kontrol negatif, tes fokus sempat **FAIL** karena pemeriksa jejak
menolak peristiwa setelah HOLD sebelum memeriksa larangan `WRITE`. Pemeriksa
diperbaiki dan perintah verbose di atas dijalankan ulang: **PASS 3/3**.

## Jejak dan verdict fixture

1. `complete-no-retry` — **PASS**. Urutan READ `A#1@20 → B#1@20 → C#1@20`;
   ketiganya lengkap, tidak ada `RETRY_REASON` atau READ kedua. B
   `review_required:true`: 20/20 ID direview (1 `same`, 19 `distinct`).
2. `clipped-targeted-retry` — **PASS**. Urutan READ
   `A#1@20 → B#1@20 → C#1@20 → B#2@20`. Setelah observasi B pertama
   `host display truncated + review_required missing`, jejak mencatat
   `RETRY_REASON ISSUE56_B` **sebelum** B#2. A/C tidak diulang; B#2 lengkap,
   lalu 20/20 review B selesai.
3. `clipped-twice-hold` — **PASS**. Urutan READ sama seperti skenario 2.
   B#2 masih `host display truncated + review_required missing`; peristiwa
   akhir `HOLD ISSUE56_B`. Tidak ada READ ketiga, review atas data B yang tidak
   lengkap, atau business Write.

Ketiga skenario memakai `max_matches_per_candidate:20` pada setiap panggilan
mock. `candidate_key` yang terlihat diperiksa terhadap kandidat yang diminta;
respons server mock juga diperiksa memuat tepat satu kandidat dengan key itu.

Pemeriksa jejak menolak retry bila respons pertama lengkap atau alasan belum
dicatat. Kontrol negatif sengaja menghapus alasan, mengosongkan alasan,
menambahkan READ ketiga pada B, serta menyisipkan `WRITE` sebelum dan setelah
HOLD; semua jejak tersebut ditolak sesuai aturan. Penghapusan satu keputusan
review dari 20 juga ditolak. Ini menguji bahwa assertion dapat menangkap
pelanggaran tersebut, bukan hanya menerima tiga jejak sukses yang dibuat tes.

## Batas bukti dan keputusan

**Hasil lokal:** prosedur referensi dalam tes menghasilkan urutan READ, alasan
retry, review lengkap, dan hold sesuai kontrak plugin v0.2.10 pada tiga fixture.
Ini membuktikan fixture dan assertion lokal, **bukan** bahwa ChatGPT dengan
plugin PRIVATE akan memilih panggilan yang sama atau bahwa host LIVE akan
menampilkan truncation yang sama. Tidak ada raw trace MCP host, fingerprint
runtime sesi, atau validasi server atas `dedup_reviews` dalam tes ini.

Issue #56 tetap **OPEN** dan kampanye MAIN tetap **PAUSE 9/30**. `FIXED` tidak
boleh diklaim. Langkah berikutnya adalah review lokal atas fixture, lalu satu
uji READ-only host yang benar-benar mengamati respons tidak lengkap dan
menyimpan jejak keputusan sebelum targeted READ; jika truncation tidak terjadi,
laporkan `INCOMPLETE_RESPONSE_TARGETED_RETRY: NOT_TRIGGERED`.
