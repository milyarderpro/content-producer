# Handoff rilis DNA referensi — task 6.1

> Snapshot publik disanitasi: identifier QA/release dan tautan ChatGPT privat memakai alias. Isi naskah, skor, revision, content hash dan verdict dipertahankan. Hash fixture yang tercantum adalah hash bukti asli lokal; hash snapshot publik ada pada [indeks redaksi](reference-dna-public-evidence.md).

> Status terbaru: plugin **0.5.7** terpasang, retest task **6.5 PASS 10/10** dan OpenSpec **28/28**. [Laporan akhir](reference-dna-d6-retest-0.5.7-2026-11-06.md). Bagian bertanggal sebelumnya di bawah tetap bukti historis.

**Update setelah commit:** source paket 0.5.6 kini terikat pada commit lokal
`82f698b0c7f873fc5906919ae64f34242cb49e61`. [Verifikasi task 6.2](reference-dna-installed-host-verification.md)
mencocokkan ulang seluruh 15 file rilis aktif dengan objek Git tersebut dan
mencatat integrasi Read host PASS. Pernyataan SHA belum tersedia di handoff
awal berikut adalah keadaan saat task 6.1 disiapkan sebelum commit. PR/Actions
dan saved-copy masih memiliki status masing-masing, bukan otomatis PASS.

Tanggal: 6 November 2026, Asia/Jakarta.
Change: [align-plugin-reference-content-dna](../../openspec/changes/align-plugin-reference-content-dna/tasks.md).
Status: **HANDOFF LOCAL SIAP**; PR/Actions belum dikirim/dijalankan oleh task ini.
Dokumen ini menyiapkan pelepasan source yang sudah dikerjakan dan paket 0.5.6
yang sudah terpasang pada task 5. Tidak menjalankan kembali pemasangan.

## Identitas kandidat dan tracking

| Komponen | Identitas / bukti |
| --- | --- |
| Repository | `milyarderpro/content-producer` |
| Issue | [Draf remediasi lokal](reference-dna-remediation-issue.md), termasuk 18 locator audit dan expected/actual; belum memiliki nomor/URL GitHub |
| Keputusan | [CR-061](../decisions/2026-11-05-cr-061-plugin-reference-content-dna.md), termasuk kalibrasi pemilik dan tindak lanjut 6 November |
| Source HEAD/base kandidat lokal | `413121c8246b5de10a2093467b21bd2704b347fc` pada `main` |
| Tracking base PR lokal | `origin/main = 2a98665f7e7d2ac5d63c06afe412dd3d0117c152`; belum refresh remote pada task ini |
| Commit lokal terkait | `a9757bb770ebfdfb4845cb5fbe2a270a5d5aff25` dan `413121c8246b5de10a2093467b21bd2704b347fc`; branch lokal ahead 2 saat pemeriksaan |
| SHA commit kandidat final 0.5.6 | **BELUM TERSEDIA**: 0.5.6 masih HEAD di atas + diff/untracked task 5.2–5.3; jangan menyebut HEAD sebagai exact-SHA 0.5.6 |
| Fingerprint snapshot payload 0.5.6 | Index 15 file SHA-256 `4d5ff6463ae803c9fd01b3d13b038fcd686db336430f087b2bdc25665962e169`; ZIP dan byte source cocok |
| Plugin | Content Producer (PRIVATE-REFERENCE-026530916695), `QA-PLUGIN-58151d60d6a8`, USER / PRIVATE |
| Versi / release tercatat | `0.5.6` / `QA-RELEASE-cb7b33da5f8d` |
| App | Satu owner OAuth `mcpku2`, `asdk_app_6ad6ebeab5fc8191a1d2cd54b87cd96f`; `.app.json` identik |
| PR / Actions run | **NOT RUN**; tidak ada URL atau nomor rekaan |

SHA final sengaja belum diisi karena scope task adalah menyiapkan handoff.
Sebelum push/PR/Actions yang diotorisasi, catat commit final yang benar-benar
memuat 0.5.6 dan hubungkan Issue/PR/run nyata ke record ini. Fingerprint paket
mengidentifikasi payload yang diuji sekarang; ia bukan pengganti commit SHA atau
bukti Actions pada commit final. Tidak membuat commit hanya untuk mengisi kolom.

Source perubahan dibanding tracking base mencakup plugin, packaging/tests,
classifier CI, OpenSpec dan dokumentasi. Tidak mengubah source backend,
migration, security config atau runtime dependency backend. Source SHA backend
dan bukti G4 pada [operations](../operations.md) tetap terpisah.

## Paket yang diserahkan

Semua path artefak berikut **lokal dan diabaikan Git**. Paket/index perlu
disimpan sebagai artefak rilis atau lampiran yang diotorisasi; commit dokumen
saja tidak membuat ZIP tersedia di GitHub.

| Artefak | Entri / byte | SHA-256 |
| --- | --- | --- |
| `artifacts/content-producer-private-v0.5.6.zip` | 15 / 47.066 | `0b239c72c22772f844fae7e5b241e2d32c97be31c711a4036b844f447bb13599` |
| `artifacts/reference-dna-evaluation/content-producer-update-0.5.6.zip` | 16 / 47.519 | `3b81b9bb055dae42f87ecfbda16105c8951ffd6ea5318436d51bbb8355068155` |
| `artifacts/plugin-candidate-filelist.json` | 15 source files / 2.872 | `4d5ff6463ae803c9fd01b3d13b038fcd686db336430f087b2bdc25665962e169` |
| Rollback base: `artifacts/content-producer-private-v0.5.5.zip` | 15 / 45.953 | `0e8bd1b1a292d3259fbce595037e7cf784fdcfa0fcd1efb2c98df0e466c06f94` |
| Rollback base: `artifacts/reference-dna-evaluation/content-producer-update-0.5.5.zip` | 16 / 46.406 | `d9e0b15375c6656ea0d960c4fec708bfab83262e499b8cedff03e942b71c95cb` |

Entri ke-16 adalah overlay existing `.codex-plugin/plugin.json`, bukan
koneksi MCP kedua. Verifikasi task 6.1 membaca kedua ZIP, index, source dan
readback lokal 0.5.6: **15/15 byte/hash sama**. Perbandingan ZIP update 0.5.5
dan 0.5.6 hanya berbeda pada manifest, overlay version, SKILL dan playbook.
JSON kedua manifest hanya berubah version; app/interface/defaultPrompt tetap.
Tidak ada corpus QA, dataset, README atau credential dalam payload portabel.

Paket Actions hasil rebuild dapat mempunyai hash ZIP berbeda karena metadata
arsip/tooling. Verifikasi 15 entri dan hash byte masing-masing terhadap index,
lalu rekam SHA-256 ZIP Actions itu sendiri; jangan melabelinya dengan hash ZIP
lokal di atas. Cocokkan juga index dengan source pada commit final tersebut.

## Hasil pemeriksaan dan batas penerimaan

| Bukti | Status dan scope |
| --- | --- |
| Check source 0.5.6 | PASS LOCAL: lint/typecheck, 14 file/179 root tests (3,84 detik), frontend typecheck/build/19 tests (804 ms); [record rilis](reference-dna-plugin-release-2026-11-05.md#update-056--retest-naskah-6-november-2026) |
| Package/verify | PASS LOCAL 15 file; task 6.1 mencocokkan ulang ZIP/index/source/readback, tanpa rebuild yang tidak perlu |
| MCP/probe terkait perubahan workflow | PASS LOCAL pada task 4: MCP 17 file/114 kasus, probe 3 kasus; [record task 4](reference-dna-package-verification.md). Historis pada scope itu, bukan run baru exact-SHA 0.5.6 |
| Source rilis terpasang | PASS readback pada task 5, 15 source + overlay; [release evidence](reference-dna-plugin-release-2026-11-05.md). Task 6.1 memeriksa ulang salinan bukti lokal, tidak mengklaim sesi owner baru |
| Review naskah | [12 kasus final PREVIEW](reference-dna-review-2026-11-06.md), 13–16/16, dengan reuse historis dan prompt-assisted repair |
| Penerimaan pemilik | [A–D R2](reference-dna-owner-revision-r2.md) diterima pada task 5.4; berbeda dari output host baru |
| Verifikasi ulang source URL | Tidak dilakukan, sesuai instruksi pemilik; bukan factual certification baru |
| Actions exact final SHA | NOT RUN |
| Owner connection pada chat baru | Task 6.2 masih terbuka |
| Lima format saved-copy + batch + penilaian readback | Tasks 6.3–6.5 NOT RUN |

Sebagian generasi awal 0.5.6 masih gagal, kemudian diperbaiki lewat prompt QA
tambahan. Kelulusan hasil akhir tidak membuktikan review mandiri host konsisten.
E02/E06/E11 tepat 13 dan bukan contoh unggulan. Handoff ini tidak menyatakan
FIXED, keberhasilan business Write atau peningkatan views.

## Draf PR siap disalin

Branch usulan setelah otorisasi: `codex/align-plugin-reference-content-dna`,
base `main`. Refresh base terlebih dahulu agar dua commit lokal dan seluruh
diff yang dimaksud masuk cakupan; jangan membuat PR berisi task 5 saja tanpa
perubahan atlas/packaging dari commit sebelumnya.

Judul:

```text
feat(plugin): align Canva copy with reference content DNA
```

Isi:

> Canva copy sebelumnya sering berupa spesifikasi berulang atau ringkasan
> akademis. Plugin kini memakai DNA, 12 kartu contoh beranotasi, dan playbook
> kurasi untuk memilih fakta, mengatur urutan, serta menyunting American English
> sebelum menampilkan preview atau menyimpan draft. Default hook/count tetap
> mengikuti instruksi dan config; tiga attestations server tetap.
>
> Paket 0.5.6 mempertahankan app owner OAuth dan menambahkan dua referensi runtime
> pada allowlist 15 file. Packaging/CI menguji daftar dan hash ZIP serta pemisahan
> corpus QA. Backend dan data production tidak berubah.
>
> Validasi lokal: 179 root + 19 frontend tests, package/verify, dan readback
> 15 file PASS. Review 12 hasil akhir PREVIEW mencapai 13–16/16, dengan reuse
> hasil historis dan beberapa prompt repair; bukan first-pass PASS menyeluruh.
> Actions pada commit final dan saved-copy lima format/batch belum dijalankan.
> Tracking: draf Issue remediasi, CR-061 dan handoff task 6.1; isi nomor Issue,
> commit final, URL Actions dan hash artefak nyata saat tersedia.

Saat dipindahkan ke GitHub, gunakan link repository ke record audit/CR/review
dan ganti status pending hanya berdasarkan bukti baru. Jangan menggunakan
`Closes #...` sebelum nomor Issue benar-benar tersedia. Pembuatan Issue dan PR
mengikuti izin masing-masing; draf di atas tidak mengirim pesan ke GitHub.

## Handoff Actions pada commit final

Workflow: [CI - source, MCP, dan paket](../../.github/workflows/ci.yml).
Job `preflight`: `Locked install, affected checks, verified final ZIP`.
PR/push ke main terpicu otomatis; dispatch manual tanpa base memilih semua
pemeriksaan ringan. Diff terhadap tracking base memuat workflow/package/tests,
sehingga cakupan yang diperkirakan meliputi root/frontend checks, migration
filenames, MCP/probe, serta package/ZIP. Tidak menghapus cabang wajib.

Estimasi perencanaan **2–6 menit** setelah pemicu yang diotorisasi, basis:
check lokal 1–3 menit dalam preflight task 5, root tests 3,84 detik, MCP task 4
8 detik, serta riwayat light CI 29–40 detik yang tercatat pada
[testing](../testing.md). Cold install/network dapat memperpanjang; ini bukan
run baru atau jaminan durasi. Sebelum pemicu nyata, periksa job/riwayat yang
tersedia lagi, tetapkan final SHA, scope dan estimasi.

1. Hubungkan Issue/CR dan final commit SHA dengan PR; pastikan izin push/PR
   sudah mencakup aksi yang akan dilakukan. Pertahankan perubahan pengguna.
2. Gunakan pemeriksaan fokus yang diwajibkan classifier; local check/package
   yang source-nya identik boleh dirujuk dengan fingerprint, tetapi bukan
   pengganti status Actions exact final SHA.
3. Setelah pemicu sah, rekam URL run, checkout/head SHA, status job, log
   ringkas dan artefak `content-producer-private-v0.5.6` beserta index.
   Retention workflow saat ini 14 hari; simpan bukti yang diperlukan sebelum habis.
4. Cocokkan manifest, 15 entri, semua hash ekstraksi dan scope perubahan.
   Periksa required checks aktual sebelum keputusan merge; tidak mengasumsikan
   kondisi branch protection historis masih berlaku.
5. Jika estimasi >10 menit, mulai hanya run yang sudah diotorisasi, laporkan
   sekali SHA/URL/estimasi/status lalu lepaskan pemantauan chat segera.
   Jika run melampaui 10 menit, hentikan polling dan tunggu `lanjutkan`.
6. Gunakan G4 hanya bila scope berubah menjadi backend/security yang
   mensyaratkannya. Untuk handoff plugin-only ini tidak membuat full backend
   gate/reset baru atau deployment backend.

Task 6.1 tidak menjalankan langkah pemicu tersebut. PR, Actions, merge dan
pengunggahan ulang tetap belum dilakukan pada pengerjaan task ini.

## Prosedur rollback paket

Rollback **belum dijalankan**. Dasar pemulihan terakhir yang tersedia adalah
instruksi 0.5.5, release tercatat
`QA-RELEASE-856cae14200c`; source/hash-nya telah dibaca balik
pada task 5 dan arsipnya diperiksa task 6.1. Kompatibel dengan app/backend yang
sama, tetapi bukan jaminan DNA first-pass yang lebih baik.

1. Tentukan regresi dan keputusan pemulihan yang diotorisasi. Baca release
   terkini sebelum perubahan; jangan menganggap ID 0.5.6 masih current saat itu.
2. Ambil instruksi 0.5.5 dari arsip yang hash-nya tercatat di atas atau source
   release yang terverifikasi. Pertahankan plugin ID, app, USER/PRIVATE,
   `.app.json`, interface/defaultPrompt dan seluruh field di luar scope.
3. Kemas konten instruksi lama dengan **versi SemVer baru yang lebih tinggi
   dan belum dipakai**; sinkronkan manifest root dan compatibility overlay.
   Jangan mengandalkan upload manifest 0.5.5 yang lebih rendah atau mengklaim
   hash ZIP pemulihan baru tetap sama dengan arsip dasarnya.
4. Validasi 15 source files, tautan/routing dan hash ZIP yang baru. Update lewat
   identitas plugin yang sama dengan `expected_release_id` hasil read terbaru.
   Konflik release memerlukan pembacaan/review ulang, bukan retry membabi buta.
5. Baca kembali seluruh source/version dan metadata; cocokkan dengan paket
   pemulihan, catat release/hash baru, kemudian lakukan retest host yang
   relevan pada chat baru dalam scope yang sah. Rollback sukses tidak otomatis
   membuktikan saved-copy PASS.

Pemulihan ini hanya paket instruksi. Tidak mereset database, mengubah migration,
mengaktifkan fixed-pilot, membuat koneksi OAuth kedua atau menghapus draft.
Bila arsip lokal hilang, baca source release lama lewat Plugin Creator sebelum
membangun pemulihan; jangan memakai file yang identitasnya tidak diketahui.

## Kelanjutan

Task 6.1 selesai sebagai persiapan handoff. Commit final, Issue/PR/Actions dan
artefak tahan lama masih harus dihubungkan saat tindakan itu diotorisasi.
Task 6.2 melanjutkan verifikasi host/owner; 6.3–6.5 memerlukan scope Page,
payload/count dan bukti saved-copy/batch yang sesuai. Tidak ada business Write
pada task ini.

## Pemeriksaan penutupan task 6.1

PASS pada 6 November 2026: review isi dan tautan lokal, whitespace dokumen
baru, `git diff --check`, `openspec validate align-plugin-reference-content-dna
--strict`, serta `pnpm run verify-migrations` (85 nama, sekitar 0,53 detik;
bukan applied history database). Scope dokumentasi; check source/package
0.5.6 direuse karena payload/hash tidak berubah. Tidak ada pemicu Actions.


## Saved-copy task 6.3 — 6 November 2026

[Pengujian lima format](reference-dna-saved-copy-2026-11-06.md) PASS LIVE
pada plugin 0.5.6/source `82f698b0c7f873fc5906919ae64f34242cb49e61`.
Lima draft QA baru terbaca exact bersama sources/checks, revision 1 dan
quality passed; copy direview serta sebagian disunting sebelum save.
Tidak mengubah source paket atau backend, tidak mengedit 18 draft audit.
Pool riset sebelumnya dipakai tanpa membuka ulang URL. Ini bukan
first-pass atau batch PASS; task 6.4–6.5 tetap NOT RUN dan belum FIXED.


## Batch task 6.4 — 6 November 2026

[Run batch](reference-dna-batch-2026-11-06.md) PASS LIVE pada scope
count/config/progress/readback: satu plan, lima draft, fakta 7/7/7/6/6,
tanpa fact-count override, seluruh ID/revision/hash/checks terbukti.
Source/plugin tetap 0.5.6 pada SHA di atas. Ada budget repair item 2 dan
catatan qualifier/komposisi/pemetaan format untuk task 6.5.
D6 **NOT RUN**, belum FIXED dan bukan klaim seluruh naskah siap produksi.


## D6 task 6.5 — 6 November 2026

[Review naskah tersimpan](reference-dna-d6-saved-review-2026-11-06.md)
selesai untuk 10 post revision 1, tetapi penerimaan **FAIL: 6 PASS/4 FAIL**.
Lima format terarah lulus; batch hanya trees yang lulus. Kontrol count/progres
6.4 tidak dibatalkan, sedangkan seluruh hasil batch belum sesuai DNA.
Tracking [#134](https://github.com/milyarderpro/content-producer/issues/134),
[#135](https://github.com/milyarderpro/content-producer/issues/135),
[#136](https://github.com/milyarderpro/content-producer/issues/136).
Paket tetap 0.5.6/source SHA di atas; belum patch/PR/Actions/upgrade/retest,
belum FIXED. Task 6.5 tetap unchecked, progres **27/28**; jangan archive
atau menyatakan penerimaan end-to-end selesai dari hasil ini.

## Retest 0.5.7 — task 6.5 tuntas, 6 November 2026

**LIVE PASS: 10/10 saved-copy; 28/28 task selesai.** Empat kasus gagal
B1/B2/B3/B5 diperbaiki melalui host baru pada post QA yang sama; D6 masing-masing
15/15/16/14, tanpa 0, E=2, qualifier/config/budget lulus. Enam saved-copy
regresi identik dan tetap PASS; bukan enam generasi baru. Lima format dan
kelima output batch lulus; plan tetap completed 5/5, inventaris tetap 10.
Tidak ada post pengganti atau perubahan completed item/config/production.
Hasil adalah penerimaan sesudah repair terarah, bukan first-pass atau jaminan viral.

Source PR #137: `8069bb1bfd03316700e0dca9cfb4c6c8e880229a`;
[Actions 42176824421](https://github.com/milyarderpro/content-producer/actions/runs/42176824421)
PASS 53 detik. Lokal check PASS 184 source + 19 frontend; packaging/verify
15 file PASS. Plugin PRIVATE yang sama kini **0.5.7**, release
`QA-RELEASE-10c52114aae7`, readback source 15/15 sama.
PR [#137](https://github.com/milyarderpro/content-producer/pull/137) masih OPEN,
belum merge; Issue #134–#136 CLOSED/COMPLETED setelah retest. Tidak ada backend
change/deploy atau G4 baru. Metadata QA privat tetap lokal, source PR disanitasi.
Tidak membuka/verifikasi ulang URL sumber; pool/snapshot QA lama, bukan
sertifikasi faktual baru. FAIL 0.5.6 tetap historis, tidak ditimpa.

[Laporan dan exact copy final](reference-dna-d6-retest-0.5.7-2026-11-06.md).
