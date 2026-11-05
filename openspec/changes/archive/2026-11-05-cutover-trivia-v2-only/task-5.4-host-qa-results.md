# Task 5.4 — Plugin PRIVATE, host QA v2 dan cleanup

**Tanggal:** 4 November 2026. **Status:** PASS LIVE untuk scope task 5.4.
Pemilik meminta melanjutkan seluruh task, mengizinkan QA langsung melalui Chrome
dan alternatif melalui plugin bila Chrome tidak dapat digunakan. Chrome sempat
timeout saat koneksi awal, lalu pulih; QA positif tetap dilakukan di chat baru
ChatGPT dengan hanya parent plugin Content Producer.

## Plugin yang benar-benar terpasang

Plugin `plugins_6ad5bf91a278819182951ebb312eca06`, scope USER, discoverability
PRIVATE, diperbarui melalui Plugin Creator **0.3.0 → 0.4.0**.
Release lama `pluginrel_6ae8a89e7920819193898a565017ca8c`; release terpasang
`pluginrel_6aeb5dffa8688191831a1f71f107d8fd`.
[Content Producer](https://chatgpt.com/plugins/plugins_6ad5bf91a278819182951ebb312eca06).

Source paket/check pada `352347c420fa389212718010b4c9d835064f0ff9`.
Kandidat 13 file lolos verifikasi byte/hash. ZIP upload mempunyai 13 file tersebut
ditambah satu overlay `.codex-plugin/plugin.json` yang sudah ada, hanya versi
diselaraskan; bukan komponen atau koneksi baru.
SHA-256 ZIP `f6237162fc7e81350d5111912db126ecbdace6f40ec5e325f1e9885047750fc4`.
Readback seluruh inventory tanpa pagination lanjutan membuktikan **13/13 file
identik dengan source kandidat**, overlay identik dengan metadata lama yang
versinya dinaikkan. App binding, presentation, identitas dan audience tetap;
satu app required `asdk_app_6ad6ebeab5fc8191a1d2cd54b87cd96f` (owner OAuth
`mcpku2`), tanpa MCP connection kedua. Empat suite plugin fokus **26/26 PASS**
(931 ms); ini CI/FIXTURE lokal, terpisah dari LIVE.

## QA host CUT-V2-HOST-01

[Bukti chat baru](https://chatgpt.com/c/6aeb5f61-1de4-83ec-80e1-a9ff95fe4635).
Parent-plugin mention menunjuk ID Content Producer di atas. Host melakukan
profile/workspace/Page/context Read, membuka sumber, memeriksa sembilan kandidat
dengan dedup v2 dan menyajikan tujuh fakta final beserta payload sebelum save.
Setelah payload ditinjau, persetujuan dibatasi ke satu save dengan operation key
yang sama. Host memeriksa ulang tujuh kandidat dan context tepat sebelum Write.

- Workspace `cad2885e-952e-41b3-9eae-d2d9d75d533d`.
- Page `3c7dc8b2-43db-42b5-abd6-d334aac0ff83`,
  **Content Producer QA Sandbox (Verified)**.
- Config `ca8dd895-48e7-498e-93c6-cff1347852c9`,
  timestamp teks `2026-10-21T16:08:12.627461Z`; catalog sebelum save `"0"`.
- Satu draft octopus, `single_subject_fast`/`animals`, en-US, tanpa plan/jadwal.
- Post `ff10ff32-788a-45c2-80d6-3b4f6fd64b4b`, dibuat
  `2026-11-04T16:43:01.776481Z`, schema **2**, status **draft**, revision **1**.
- Hash `dbaaa6d1b4a7e36b7a1066d076773504ec7f7e71a1395129e71b8e0c46d06847`.
- Host melaporkan `save_post_v2` sukses, `replayed=false`, lalu
  `get_post(include_sources=true, include_checks=true)`. Readback owner OAuth
  independen pada sesi operator mengonfirmasi Page, copy, tujuh fakta/URL/binding,
  revision/hash, **5/5 mechanical passed**, **3/3 editorial pass**, quality passed,
  approval/publication null. Metrik server: 531 karakter Canva, 76 kata.
- Bukti host berupa UI/respons chat yang diamati dan screenshot; bukan klaim
  memiliki raw invocation trace lengkap. State juga dibuktikan lewat Read OAuth
  dan hitungan database terpisah; bukan hanya narasi host atau HTTP 200.

Sumber yang dibuka ulang operator:
[Natural History Museum](https://www.nhm.ac.uk/discover/octopuses-keep-surprising-us-here-are-eight-examples-how.html)
dan [Smithsonian Magazine](https://www.smithsonianmag.com/science-nature/why-dont-octopus-suckers-stick-their-own-skin-180951465/).
Tidak ada approval ready, publikasi, metrik Facebook, draft kedua atau fallback v1.
Metadata modul masih menampilkan versi/config schema 1; tool dedicated v2 dan
post schema 2 terbukti berfungsi. Tidak mengubah metadata registry atau
menyimpulkan defect save dari angka metadata tersebut.

## Cleanup dan readback final

Preflight database masih nol konten sebelum QA. Setelah save tepat:
1 post, 7 fakta, 7 evidence, 7 binding, 1 history, 1 catalog dan 1 ledger konten;
plan/item/event/metrics/reservasi nol.
`scripts/cutover-cleanup-qa.sql` dijalankan transaksional melalui Supabase
execute_sql dengan tiga UUID workspace/Page/post yang tepat. Bagian psql hanya
disubstitusi literal; logika scope/lock/urutan delete/postcondition tetap.
Assertion tambahan di bawah lock mensyaratkan revision/hash draft dan comparator
identitas sama dengan preflight. Seluruh assertion lolos dan transaksi selesai.

Readback terpisah sesudahnya:

| Objek | Sebelum QA | Sesudah save | Sesudah cleanup |
| --- | ---: | ---: | ---: |
| Post | 0 | 1 | 0 |
| Fakta/evidence/binding (masing-masing) | 0 | 7 | 0 |
| History/catalog/ledger konten (masing-masing) | 0 | 1 | 0 |
| Plan/item/event/metrics/reservasi (masing-masing) | 0 | 0 | 0 |

Owner `get_post` mengembalikan **POST_NOT_FOUND** untuk ID QA, dan
`list_posts` seluruh workspace kosong (`has_more=false`).
Tetap **1 akun, 1 workspace, 4 Page, 4 config, 5 ledger Page, 85 migration**.
Fingerprint JSON comparator akun/workspace/Page/config/niche tanpa newline
sebelum/sesudah QA dan cleanup sama dengan backup/reset:
`6c68ad6e9a3d2891852878f57dd0fcced0ccd1cbaec1d3ae328227174450030a`.
Checksum file comparator dengan newline juga cocok
(`7d659cfdd270a0b48215ff8993d2b57868ca9c1c7dee3b1205ccefb3ca85ad6e`);
perbedaan dua checksum ini hanya representasi newline, bukan perubahan data.

Katalog connector aktif **31 tool**, **0 dari lima nama v1**. Audit database
final **0 RPC bernama v1**. Bukti direct RPC 404/PGRST202 dan MCP unknown tool
dari [task 5.2](task-5.2-release-results.md) dipertahankan untuk backend yang sama;
tidak mengulang business Write v1 historis. Seluruh konten/ledger replay konten
kembali nol. Tidak ada migration atau redeploy baru pada sesi ini.
