# Pembaruan plugin untuk evaluasi kandidat — 5 November 2026

> Snapshot publik disanitasi: identifier QA/release dan tautan ChatGPT privat memakai alias. Isi naskah, skor, revision, content hash dan verdict dipertahankan. Hash fixture yang tercantum adalah hash bukti asli lokal; hash snapshot publik ada pada [indeks redaksi](reference-dna-public-evidence.md).

> Status terbaru: plugin **0.5.7** terpasang, retest task **6.5 PASS 10/10** dan OpenSpec **28/28**. [Laporan akhir](reference-dna-d6-retest-0.5.7-2026-11-06.md). Bagian bertanggal sebelumnya di bawah tetap bukti historis.

Status: **LIVE Plugin Creator metadata/source readback PASS**. Ini bukan
verdict semantik E01–E12 atau LIVE saved-copy PASS.

Pemilik mengizinkan pembaruan melalui Plugin Creator bila diperlukan saat
task 5, kemudian menegaskan izin melanjutkan. Urutan pelaksanaan diperluas:
baseline 12 kasus diselesaikan pada 0.4.0, lalu plugin yang sama diperbarui
untuk menjalankan kandidat pada host. Task 6 keseluruhan tidak ditandai selesai
hanya karena aksi pembaruan ini.

| Identitas | Nilai terverifikasi |
| --- | --- |
| Plugin | Content Producer (PRIVATE-REFERENCE-026530916695) |
| Plugin ID | `QA-PLUGIN-58151d60d6a8` |
| Scope / audience | USER / PRIVATE; tidak berubah |
| Release baseline | `QA-RELEASE-acfec925389b`, 0.4.0 |
| Release kandidat | `QA-RELEASE-90849b799d65`, 0.5.0 |
| Base source lokal | `a9757bb770ebfdfb4845cb5fbe2a270a5d5aff25` + diff lokal task 3–4 |
| Archive update | `artifacts/reference-dna-evaluation/content-producer-update-0.5.0.zip` |
| Archive SHA-256 | `b49c5b9825afc472f0c2c899616aec906460e8ccdec26096185823917d945dc6` |
| Archive update | 42.112 byte; 15 source files + 1 compatibility overlay |

## Read sebelum dan sesudah update

Discovery pemilik menemukan exact plugin ID; tidak memakai app OAuth sebagai
pengganti ID plugin. Inventory/read sebelum update memverifikasi 14 file:
13 source 0.4.0 identik baseline frozen dan overlay `.codex-plugin/plugin.json`.
Read terbaru tepat sebelum update tetap menunjukkan release baseline yang sama.
Update memakai `expected_release_id` tersebut dan tidak mengirim `delete_paths`.

Paket update menambahkan overlay existing dengan version 0.5.0, mempertahankan
seluruh field lain termasuk presentation/defaultPrompt. Source paket portabel
tetap 15 file seperti [laporan task 4](reference-dna-package-verification.md);
jumlah 16 pada release mencakup compatibility overlay, bukan perubahan allowlist.

Setelah `update_plugin` sukses, inventory dibaca ulang sampai `next_offset: null`:
16 file. Seluruh 15 file source dibandingkan SHA-256-nya dengan candidate index
task 4 dan semuanya identik. Overlay dibandingkan sebagai JSON: selain version,
semua field tetap identik dengan release baseline. `.app.json`, nama plugin,
author/repository/interface, app OAuth `mcpku2`, audience dan scope tidak berubah.
Tidak ada koneksi kedua, delete, backend deploy, atau perubahan data produksi.

Bukti lokal tersanitasi ada di
`artifacts/reference-dna-evaluation/installed-baseline/source-readback.json` dan
`artifacts/reference-dna-evaluation/installed-candidate/release-readback.json`.
Source baseline/kandidat juga disimpan di direktori itu untuk reproduksi.

## Batas host dan izin

Unggahan dua file source QA ke ChatGPT sempat ditolak review otomatis; pemilik
kemudian memberi izin eksplisit. Browser juga meminta Allow access to file URLs.
Pemilik mengizinkan pengaktifan sementara, tetapi navigasi ke halaman internal
Chrome ditolak kebijakan browser, sehingga pengaturan itu tidak diubah oleh
agent. Tidak ada pengaturan ekstensi yang perlu dipulihkan oleh agent.

Evaluasi kemudian memakai plugin yang sama pada chat baru di host ChatGPT,
dengan prefix/config/prompt frozen dan tanpa business Write. Upload source QA
melalui Chrome tidak digunakan. Ini bukan upaya melewati kebijakan halaman
internal; jalur update memakai tool Plugin Creator yang didukung dan telah
diotorisasi secara terpisah. Beberapa respons host perlu Reload response agar
teks yang sudah dihasilkan dapat dibaca.

Hasil per kasus, qualifier, budget dan review pemilik tetap menentukan penerimaan
editorial. Update release tidak menyatakan FIXED, tidak menyetujui draft,
dan tidak memberi bukti save/readback bisnis. Tidak ada commit/push/PR/merge
atau backend/database mutation pada langkah update plugin ini.

## Update remediasi task 5.2–5.3

Pada 5 November 2026 plugin yang sama kembali diperbarui melalui Plugin Creator.
Setiap update menggunakan expected release hasil read sebelumnya; tidak ada
delete paths, perubahan audience/identity/App/OAuth atau koneksi kedua.
Setiap release dibaca balik seluruh 16 file: hash 15 source cocok candidate
index saat itu, compatibility overlay hanya berubah version.

| Versi | Release | Alasan | Bukti preview |
| --- | --- | --- | --- |
| 0.5.1 | `QA-RELEASE-148a95d2f61c` | Review juga pada preview; curation/voice/comparison/qualifier | [C2, 12 kasus](reference-dna-preview-candidate-0.5.1.md) |
| 0.5.2 | `QA-RELEASE-2fbb876b33b8` | Rumus separator setelah block C2 E10 505/500 | [C3, lima retest](reference-dna-preview-candidate-0.5.2.md) |
| 0.5.3 | `QA-RELEASE-4904e8dc1282` | Care beats berulang pada broad cooperation card diperjelas di SKILL/playbook | E02 retest terarah; lihat review semantik |

| Versi | ZIP portabel 15 file SHA-256 | ZIP update 16 file SHA-256 |
| --- | --- | --- |
| 0.5.1 | `b757305755fc3d4002856f4175b5c0899eb22daee974efee17f21ea6939af551` | `619449870e6fcf3ab4ecd0ec8888d361d6f525dfe18e9e1f4c6be96318a454ab` |
| 0.5.2 | `2b5e6bd6c0bd5158de0068b00440e3d277c3ab778bf0f66051c0329bf0f4ecaf` | `231985a843402d8e3f049ab93587344a7678394db576ca02ade01d714bf21389` |
| 0.5.3 | `9a52c6623da65663f0822a8487eb16f11f0262bf250d83c5b88862967595f1f5` | `6f5c412aefdc3af42a6dcedf0677facd99cf4324ff4d6a6fbac1aec382a27632` |

Path portabel mengikuti `artifacts/content-producer-private-v<VERSI>.zip`;
ZIP update mengikuti `artifacts/reference-dna-evaluation/content-producer-update-<VERSI>.zip`.
Ukuran final 0.5.3: portabel 44.161 byte, update 44.615 byte.
Final candidate index SHA-256:
`6373303f644035480e9bdc5840464bf23dd9685fc9f24b48a2fab7002263e766`.
Readback source/hash per versi berada pada direktori
`artifacts/reference-dna-evaluation/installed-0.5.1/`, `installed-0.5.2/`
dan `installed-0.5.3/`; bukan credential atau bukti penyimpanan post.

### Pemeriksaan perbaikan dan batas bukti

Preflight base SHA `a9757bb770ebfdfb4845cb5fbe2a270a5d5aff25` + diff
task 3–5, plugin-only. Estimasi fokus/build/verify <1 menit, check 1–3 menit,
berdasarkan job script dan run lokal sebelumnya. Tidak ada dispatch/push/Actions
atau gate backend baru. Source backend/transport/security tidak diubah.

- 0.5.1: fokus 6 file/87 tes PASS 1,49 detik; check PASS root 179 + frontend 19;
  package/verify 15 file PASS.
- Run awal fokus/check sempat FAIL pada frasa kontrak hook yang berubah.
  Frasa kontrak dipertahankan dengan tambahan penjelasan literal; expected test
  tidak diubah. Kegagalan awal tidak dihapus dari laporan.
- 0.5.2: fokus 4 file/47 tes PASS 927 ms; check root 179 PASS 3,50 detik
  dan frontend 19 PASS 664 ms; package/verify 15 file PASS.
- 0.5.3: check lint/typecheck/root 14 file/179 tes PASS 3,69 detik;
  frontend typecheck/build/19 tes PASS 651 ms. Package/verify 15 file PASS.
  Seluruh ZIP diekstrak/dibaca kembali dan hash tiap file cocok index.

Riset URL tidak diulang lengkap setelah arahan pemilik untuk mempercepat.
Kualitas naskah, budget lokal, source readback dan LIVE saved-copy tetap bukti
berbeda. Review dan retest ada pada [laporan semantik](reference-dna-semantic-review.md).
Belum ada owner voice acceptance task 5.4 atau LIVE saved-copy task 6.

## Update 0.5.4 setelah feedback pemilik

Tanggal 5 November 2026. Release `QA-RELEASE-a40895d54c6f`.
Expected release sebelum update `QA-RELEASE-4904e8dc1282`.
Identity, USER/PRIVATE, app dan semua compatibility fields dipertahankan;
hanya version serta instruksi editorial yang berubah. Readback semua 16 file:
15 source hash cocok index dan overlay JSON selain version identik.

- ZIP portabel `artifacts/content-producer-private-v0.5.4.zip`, 45.517 byte,
  SHA-256 `35a08b09a959420cf6be39ef81028771c447b93ff198735152df76b1f4a421b8`.
- ZIP update `artifacts/reference-dna-evaluation/content-producer-update-0.5.4.zip`,
  45.970 byte, SHA-256 `0d27af2d55cd882bcd9b76e052ac2fe66effc29251f43240e2bcc13d4dc32e56`.
- Index SHA-256 `a982bea1c4c277904a9baf1349545a7d1baf7fe6ed0d627eff99e9fc8c747c1f`.
- `pnpm run check`: lint/typecheck PASS, 14 file/179 root tests PASS 3,40 detik,
  frontend typecheck/build/19 tests PASS 688 ms.
- Package/verify: 15 file PASS; ZIP extraction file hashes cocok.
- Preflight: source base a9757bb + diff task 3–5, fokus instruksi/config plugin;
  estimasi check 1–3 menit, package/verify <1 menit berdasar run sebelumnya.
  Tidak ada backend gate, Actions/push/deploy atau business Write.
- Readback tersanitasi: `artifacts/reference-dna-evaluation/installed-0.5.4/`.

Feedback pemilik membatalkan penerimaan reviewer sebelumnya pada A/C/D dan
meminta bahasa B diperbaiki. Instruksi/rubrik/record direvisi; [R1](reference-dna-owner-revision-r1.md)
adalah editorial revision dari pool yang sudah tersedia, **bukan hasil rerun
host 0.5.4**. Rerun dan owner acceptance tetap terbuka. Tidak ada klaim FIXED.

## Update 0.5.5 — kalibrasi feedback R1

Tanggal 5 November 2026. Release `QA-RELEASE-856cae14200c`,
expected release sebelum update `QA-RELEASE-a40895d54c6f`.
Perubahan hanya instruksi/versi: subject jelas setelah generic hook, istilah
ilmiah singkat boleh, baris ringan dapat memberi jeda, karier/adopsi biasa
bukan payoff otomatis. Tidak memasukkan fakta transfer ke atlas.

- Portabel 15 file: `artifacts/content-producer-private-v0.5.5.zip`,
  45.953 byte, SHA-256 `0e8bd1b1a292d3259fbce595037e7cf784fdcfa0fcd1efb2c98df0e466c06f94`.
- Update 16 file: `artifacts/reference-dna-evaluation/content-producer-update-0.5.5.zip`,
  46.406 byte, SHA-256 `d9e0b15375c6656ea0d960c4fec708bfab83262e499b8cedff03e942b71c95cb`.
- Index SHA-256 `eb1b8cdcbd65138b3be82a7689bf3e13ddc272cd81fe527b4a9c74840e8b2085`.
- Readback seluruh 15 hash source cocok; compatibility fields selain version
  tetap, app/identity/audience tetap. Bukti `installed-0.5.5/` di artefak QA.
- Preflight check 1–3 menit, package/verify <1 menit, berdasarkan run sebelumnya;
  source a9757bb + diff plugin-only. Tidak ada Actions/push/backend gate.
- `pnpm run check` PASS: lint/typecheck, root 14 file/179 tes 4,65 detik,
  frontend typecheck/build/19 tes 676 ms. Package/verify/ZIP hashes PASS.

Pemilik menerima A dengan edit subject dan B tanpa perubahan. C/D masih
direvisi pada [R2](reference-dna-owner-revision-r2.md). Ini bukan retest host
0.5.5, bukan LIVE-save, bukan FIXED. Tidak ada backend/data production Write.

## Update 0.5.6 — retest naskah 6 November 2026

Release `QA-RELEASE-cb7b33da5f8d` memperbarui release
`QA-RELEASE-856cae14200c` pada identitas PRIVATE USER yang sama.
Scope plugin-only: reader audition, seleksi tengah/penutup, bahasa klasifikasi
sehari-hari dan julukan sejarah yang perlu penjelasan. Tidak ada backend/data Write.

- Source dasar 413121c + diff instruksi dan manifest 0.5.6.
- Preflight check 1–3 menit; package/verify <1 menit, basis run 0.5.5.
- Check PASS: lint/typecheck; 14 file/179 test root, 3,84 detik; frontend
  typecheck/build/19 test, 804 ms. Package dan verify PASS, 15 file.
- ZIP portabel 47.066 byte, SHA-256
  `0b239c72c22772f844fae7e5b241e2d32c97be31c711a4036b844f447bb13599`.
- ZIP update 47.519 byte, SHA-256
  `3b81b9bb055dae42f87ecfbda16105c8951ffd6ea5318436d51bbb8355068155`.
- Readback seluruh 15 file cocok byte/hash source; overlay existing hanya
  berubah versi. App, audience dan metadata lain dipertahankan. Bukti lokal
  `artifacts/reference-dna-evaluation/installed-0.5.6/`.

[C5](reference-dna-preview-candidate-0.5.5.md) tetap merekam FAIL/BLOCKED.
Retest editorial tanpa verifikasi URL adalah bukti terpisah, bukan LIVE-save.

## Handoff task 6.1 — 6 November 2026

[Handoff PR/Actions/paket dan rollback](reference-dna-release-handoff.md)
menautkan base SHA, fingerprint snapshot, hasil checks, arsip 0.5.6/0.5.5
dan batas bukti. ZIP/index/source/readback 0.5.6 diperiksa ulang: 15/15 cocok.
Ini persiapan lokal; tidak ada pemasangan ulang, rollback, push/PR/Actions,
merge, backend deployment atau business Write baru.

## Verifikasi host task 6.2 — 6 November 2026

[DNA-HOST-CONNECT-01](reference-dna-installed-host-verification.md) PASS LIVE
untuk metadata/source dan integrasi Read di chat baru. Rilis aktif tetap
0.5.6, `QA-RELEASE-cb7b33da5f8d`; 15 file cocok
commit `82f698b0c7f873fc5906919ae64f34242cb49e61`. Host melaporkan empat
Read berhasil, Page unik dan akses atlas/playbook. Satu dependency owner
existing; tidak ada koneksi baru/Write oleh coordinator. Ini bukan raw trace
lengkap, bukan versi backend atau bukti saved-copy; tasks 6.3–6.5 terbuka.

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
