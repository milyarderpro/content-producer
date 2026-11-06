# Draf Issue — Canva copy belum mengikuti DNA referensi

> Snapshot publik disanitasi: identifier QA/release dan tautan ChatGPT privat memakai alias. Isi naskah, skor, revision, content hash dan verdict dipertahankan. Hash fixture yang tercantum adalah hash bukti asli lokal; hash snapshot publik ada pada [indeks redaksi](reference-dna-public-evidence.md).

> Status terbaru: plugin **0.5.7** terpasang, retest task **6.5 PASS 10/10** dan OpenSpec **28/28**. [Laporan akhir](reference-dna-d6-retest-0.5.7-2026-11-06.md). Bagian bertanggal sebelumnya di bawah tetap bukti historis.

Status: **DRAFT LOCAL**, disiapkan untuk task 1.1 pada 5 November 2026.
Belum dikirim ke GitHub; tidak ada nomor Issue atau URL rekaan.

## Expected

Canva copy US/UK/CA/AU memakai American English natural, angle familiar,
fakta bervariasi, pembuka kuat, dan ritme Curious Mind, DYK, serta Daily Facts.
Review penulis selesai sebelum save/revise. Jumlah draft berbeda dari jumlah
fakta; count eksplisit dan config tetap berlaku.

## Actual — audit yang disanitasi

Audit read-only dalam percakapan pemilik pada 5 November 2026 membaca
18 draft Corious Facts melalui list_posts/get_post, tiga content plan, dan
generation context. Ini rekaman observasi sebelumnya, bukan run baru atau dump
respons. UUID owner/workspace/Page, claim token, operation key, dan credential
tidak disertakan. Judul dipakai sebagai locator pada set audit tersebut.

| Judul draft | Fakta | Observasi |
| --- | ---: | --- |
| Five bat myths, corrected | 5 | Label Myth/Fact berulang |
| Five moons, compared by diameter | 5 | Lima diameter, satu pola informasi |
| Inside a meerkat family | 5 | Dua poin caregiving memberi reaksi serupa |
| Safe ways to thaw frozen food | 5 | Pengingat prosedural |
| Five incredible hummingbird abilities | 5 | Ada angle konkret; bukan semua hasil lemah |
| Lightning myths, explained | 5 | Label berulang; konteks safety harus terjaga |
| Dwarf planet diameters compared | 5 | Deretan ukuran ekuator |
| Orcas have strong family traditions | 5 | Ringkasan kelompok/populasi |
| Handwashing details that matter | 5 | Dominan instruksi higiene |
| Red panda superpowers | 5 | Pembuka diet bambu lemah terhadap judul |
| Five shark myths, corrected | 5 | Penutup generik tentang variasi spesies |
| Planets: distance from the Sun | 5 | Deretan jarak dengan struktur sama |
| Elephant families stay connected | 5 | Ringkasan kehidupan keluarga |
| Five safer fridge habits | 5 | Checklist safety; bukan otomatis salah |
| Honeybees have hidden talents | 5 | Ringkasan fungsi tubuh/koloni |
| Planet sizes compared with Earth | 7 | Tujuh rasio diameter |
| Space myths, corrected | 7 | Tujuh label Myth/Fact |
| Octopuses are stranger than they look | 7 | Istilah teknis mendahului sebagian reveal |

Seluruh 18 hasil berstatus draft, quality_status passed, dan memakai judul
khusus. Pada 15 terbaru: median 58 kata, rentang 49–72, semuanya lima fakta;
delapan memakai satu URL untuk seluruh fakta. Satu URL bukan pelanggaran.
Tiga plan menetapkan setiap item ke fact_count mode fixed, value 5.
Page justru adaptive min 5, preferred 7, max 9. **Backend tidak memaksa lima
fakta.** Prompt asal dan alasan pemilihan override belum tersedia.

## Contoh actual

> Ganymede: about 5,262 km in mean diameter.
>
> Callisto: about 4,821 km in mean diameter.

> Fathers help guard the pups growing up in their groups.
>
> Even nonbreeding meerkats help care for the group's young.

> Copper-based hemocyanin gives octopus blood its striking blue color.

Kutipan menunjukkan komposisi/voice, bukan verifikasi ulang sumber.

## Batas diagnosis

Aturan comparison satu metrik dan contoh paket yang abstrak konsisten dengan
hasil monoton, tetapi belum membuktikan penyebab tunggal. Prompt lengkap,
model pembuat, dan release ChatGPT aktif belum diketahui. Source 0.4.0 sama
dengan cache lokal saat audit, bukan bukti instalasi host. quality_status passed
tidak mengukur DNA, naturalness, atau performa Facebook. Tidak menuduh backend
atau save_post gagal, tidak menyatakan FIXED atau causal lift views.

## Scope dan penerimaan

Acuan: [proposal](../../openspec/changes/align-plugin-reference-content-dna/proposal.md),
[design D1–D8](../../openspec/changes/align-plugin-reference-content-dna/design.md),
dan [tasks](../../openspec/changes/align-plugin-reference-content-dna/tasks.md).
Perbaikan plugin/examples serta packaging/evaluasi; kontrak backend, approval,
dedup, CAS dan data/config production tetap. E01–E12 untuk preview pembanding;
retest saved-copy mengikuti izin terpisah. Source/fixture bukan bukti LIVE.

- [x] Expected/actual dan 18 locator tercatat tanpa data autentikasi.
- [x] Override plan dibedakan dari batas Page/backend.
- [x] Hipotesis dan penyebab belum diketahui dipisahkan.
- [ ] Publikasikan/tautkan Issue sesuai izin GitHub.
- [ ] Tautkan PR/Actions serta retest ketika tersedia.

## Handoff pelepasan source

[Draf PR, Actions, paket dan rollback](reference-dna-release-handoff.md)
siap sebagai handoff lokal task 6.1 pada 6 November 2026. Issue/PR belum
dikirim; nomor dan URL tetap belum tersedia. Persiapan ini tidak mengubah
checkbox publikasi Issue atau klaim LIVE/FIXED di atas.


## Observasi batch 0.5.6 — task 6.4, 6 November 2026

[DNA-BATCH-056-01](reference-dna-batch-2026-11-06.md) membuktikan kontrol
jumlah/progres lima draft tanpa override fact count. Simpan catatan berikut
untuk review D6 task 6.5 sebelum menetapkan defect/patch/retest:

- Item 2 sempat ditolak server untuk facts block >500; final output berhasil
  setelah pemadatan. Ini laporan host, raw error code belum tersedia.
- Item 1 merender qualifier Io/rasio lebih luas daripada canonical.
- Item 2/3 menyisakan sudut berdekatan; item 5 memakai comparison untuk
  kumpulan Australia yang kontrasnya belum jelas dan opening belum menyebut
  negara. Semua copy/hash/ID tersimpan pada laporan dan fixture.
- Server quality passed tidak menyelesaikan penilaian tersebut. Tidak merevisi
  output atau menyatakan FIXED pada task 6.4. Nomor GitHub/PR/Actions belum ada
  dan tidak direka; draf lokal ini tetap handoff remediasi.


## Tracking nyata hasil D6 — 6 November 2026

Draf audit awal tetap rekaman lokal. Follow-up task 6.5 kini mempunyai tiga
Issue GitHub **open**:
[#134 qualifier](https://github.com/milyarderpro/content-producer/issues/134),
[#135 komposisi](https://github.com/milyarderpro/content-producer/issues/135),
[#136 pemetaan format](https://github.com/milyarderpro/content-producer/issues/136).
Payload Issue memakai ringkasan tersanitasi; URL chat privat dan metadata
internal post/release tidak dikirim. Pembuatan awal terinterupsi dan direkonsiliasi
tanpa duplikat; payload lengkap ditolak auto-review, alternatif sanitasi berhasil.

[Review 80 dimensi](reference-dna-d6-saved-review-2026-11-06.md) menemukan
6 PASS/4 FAIL. B1 score 15 tetap FAIL gate qualifier; B2 score 10 gagal
komposisi/ending; B3 score 13 tetap FAIL C=0; B5 score 9 gagal G=0 dan E=1.
Jangan menyembunyikan hasil tersebut dengan quality_status passed atau rata-rata.
Patch instruksi, PR/Actions dan retest belum dilakukan; belum FIXED dan task
6.5 tetap terbuka. Tidak memperluas ini menjadi izin backend/business Write.

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
