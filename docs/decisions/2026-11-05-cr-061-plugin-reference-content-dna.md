# CR-061 — DNA referensi sebagai kewajiban penulisan plugin

> Snapshot publik disanitasi: identifier QA/release dan tautan ChatGPT privat memakai alias. Isi naskah, skor, revision, content hash dan verdict dipertahankan. Hash fixture yang tercantum adalah hash bukti asli lokal; hash snapshot publik ada pada [indeks redaksi](../editorial/reference-dna-public-evidence.md).

**Status:** Accepted — arah editorial dan implementasi task 1.1–1.4;
perubahan instruksi/runtime serta penerimaan hasil belum terbukti.
**Tanggal:** 5 November 2026.
**Change:** `align-plugin-reference-content-dna`.

## Otoritas dan dasar

Pemilik meminta seluruh Canva copy mengikuti DNA Curious Mind, DYK, dan Daily
Facts, termasuk topik, komposisi, urutan dan American English nonakademik untuk
US/UK/CA/AU. Sesudah proposal/design disiapkan, pemilik secara eksplisit meminta
apply task 1.1 hingga 1.4 berurutan. Ini izin dokumentasi baseline dan keputusan,
bukan izin mengerjakan task berikutnya, commit/push/PR/merge, memasang paket,
deployment, atau business Write. Tidak ada asumsi persetujuan release.

Dasar: [draf Issue dan audit](../editorial/reference-dna-remediation-issue.md),
[proposal](../../openspec/changes/align-plugin-reference-content-dna/proposal.md),
[design D1–D8](../../openspec/changes/align-plugin-reference-content-dna/design.md),
[delta workflow](../../openspec/changes/align-plugin-reference-content-dna/specs/trivia-draft-workflow/spec.md),
dan [delta editorial TRE-01–11](../../openspec/changes/align-plugin-reference-content-dna/specs/trivia-reference-editorial/spec.md).

## Override terbatas terhadap baseline

[DNA frozen](../../plans/trivia-content-dna.md) dan
[CR-053 §2.5](2026-10-31-cr-053-simplified-trivia-draft-workflow.md)
dipertahankan sebagai rekam kontrak; tidak ditulis ulang. Perubahan berikut
berlaku sebagai arah implementasi plugin, bukan perubahan validator server:

| Acuan | Keputusan editorial baru | Batas yang tetap |
| --- | --- | --- |
| DNA §5, §10, §19; saran gaya CR-053 | Penulis wajib memperbaiki angle, variasi, urutan dan naturalness sebelum Write | Preferensi minor setelah review selesai tetap nonblocking; tidak ada skor backend |
| DNA §8 comparison; formats lama | Kesetaraan metrik berlaku dalam pasangan; dimensi antarbaris boleh berbeda | Unit, scope, waktu dan qualifier material tidak boleh hilang |
| Hook/density | Default Did you know?, umumnya 7–8 fast atau 5–6 utility | Fixed count/judul eksplisit dan hard budget mengendalikan; tanpa padding |
| Pemilihan fakta | Satu set memberi variasi nilai pembaca; contoh lengkap dan playbook mengarahkan | Dataset bukan bukti kebenaran atau teks produksi untuk disalin |

## Review sebelum Write dan penelusuran workflow

| Delta | Kewajiban plugin | Bukti yang dibutuhkan |
| --- | --- | --- |
| TDW-04 | Pilih angle; riset kandidat ekstra; dedup; buang filler/spesifikasi monoton sebelum copy final | Seleksi/replacement yang sah; tidak memaksa DISTINCT |
| TDW-06 | Selesaikan review dan penyuntingan DNA sebelum save_post_v2/revise_post_v2 | Copy final dinilai; naskah lemah diperbaiki dahulu atau keterbatasan dilaporkan |
| TDW-07 | Cocokkan copy yang dinilai dengan get_post readback | Page, fakta/URL, copy, status, revision/hash dan checks sesuai; mismatch bukan DNA PASS |

Review internal bukan checkpoint GO rutin. Sesudah dua putaran perbaikan
terarah belum cukup, laporkan keterbatasan; jangan menyimpan filler, mengurangi
count diam-diam, atau mengulang tanpa batas. Tidak meminta chain-of-thought.

## Tiga hasil v2 dan approval tidak berubah

- `meaning_preserved`: makna fakta dan copy tetap sesuai.
- `caption_no_new_claim`: caption tidak menambah klaim yang belum didukung.
- `no_known_substantive_issue`: tidak ada masalah substansi yang diketahui;
  tidak diperluas menjadi skor gaya, DNA, atau virality.

Ketiganya tetap pass/needs_revision terikat revision/hash. Tidak ada key,
error, source quota, tier/expiry, atau gate server baru. quality_status passed
bukan bukti naturalness/DNA. Server tetap menghitung metrik resmi dan menegakkan
struktur/URL/jumlah/format/budget/reuse. Persetujuan owner atas revision/hash
tetap terpisah. Review tidak mengotorisasi correction/discard/publikasi.

## Bukti dan batas penerimaan

Scope dokumen task 1: Issue lokal, keputusan, corpus evaluasi dan baseline.
Tidak mengubah plugin, backend, SQL, renderer, enum format, OAuth/RLS, dedup,
CAS, config, plan, atau 18 draft nyata. Packaging/source/preview/LIVE adalah
bukti berbeda. Kualitas akhir memerlukan evaluasi E01–E12 serta retest saved-copy
yang diotorisasi; tidak menyatakan FIXED dari record ini.

## Addendum — feedback pemilik pada task 5.4, 5 November 2026

Pemilik menolak penerimaan editorial A/E02, C/E10 dan D/E11, serta meminta
revisi bahasa ringan B/E07. [Feedback utuh](../editorial/reference-dna-owner-review.md)
menjadi arah remediasi berikutnya; skor tinggi reviewer sebelumnya tidak
menggantikan penilaian ini.

- Variasi dinilai dari pengalaman pembaca. Sinyal suara, lookout dan penjagaan
  dapat mengulang fungsi yang sama walaupun proposisinya berbeda.
- Pasangan comparison harus menghasilkan kontras yang layak diceritakan,
  bukan sekadar fakta bahwa kota berbeda. Tidak wajib dua kota pada setiap
  baris: kontras bisa terbaca lintas baris atau terhadap baseline yang jelas.
  Kesetaraan metrik tetap wajib bila ada perbandingan metrik; tidak boleh
  menamai daftar fitur biasa sebagai comparison demi format.
- Urutan sejarah dinilai sesudah nama/tanggal diabaikan: alur gagal → diperbaiki
  → dipakai masih timeline. Pindahkan reveal kuat dan ganti langkah penghubung
  yang tidak memberi kejutan berbeda.
- Kerangka yang disetujui dengan revisi bahasa ringan dipertahankan; kata
  sehari-hari dipilih tanpa menghapus mekanisme atau qualifier material.

Ini penyempurnaan intent yang sama berdasarkan arahan eksplisit pemilik,
termasuk koreksi terhadap kewajiban dua sisi pada setiap baris dari iterasi
plugin sebelumnya. Tidak mengubah lima enum format, config/backend, fakta
production, tiga attestations, dedup atau izin Write. Penerimaan task 5.2–5.3
dibuka kembali untuk hasil terdampak; bukti dan skor lama tetap historis.

## Tindak lanjut retest 6 November 2026

[C5](../editorial/reference-dna-preview-candidate-0.5.5.md) menunjukkan kalibrasi
0.5.5 masih dapat menghasilkan klasifikasi kaku dan fakta tengah yang lemah.
0.5.6 memperjelas reader audition pada kartu utuh, klasifikasi dengan bahasa
sehari-hari, dan pemilihan reveal tengah/akhir; julukan sejarah harus dipahami
dari kalimat itu sendiri. Satu konteks ringan tetap boleh; perubahan ini bukan
larangan seluruh istilah ilmiah atau perintah memaksimalkan shock setiap baris.
Batas dua repair, count/config dan tiga attestations tetap. Tidak menambahkan
fakta evaluasi transfer ke atlas atau mengubah backend.

Sesuai instruksi eksplisit pemilik, C6 tidak melakukan verifikasi bukti URL.
Perubahan input QA ini dicatat; tidak mengklaim factual certification atau
perbandingan riset identik B1. [Review akhir](../editorial/reference-dna-review-2026-11-06.md)
menutup penilaian hasil akhir preview setelah repair terarah, bukan membuktikan
semua generasi pertama otomatis lulus. Penerimaan manual R2/task 5.4 tidak
diganti dan saved-copy task 6 tetap terpisah.

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

Instruksi pemilik memperluas scope ke remediasi 6.5, pemasangan plugin yang sama,
revisi copy/kurasi/format empat draft QA dan retest. Tidak mengubah canonical claim,
completed plan, kontrak backend atau approval. Format post hasil revisi mengikuti
Page config; item completed tetap intent historis.

[Detail keputusan pelaksanaan dan batas bukti](../editorial/reference-dna-d6-retest-0.5.7-2026-11-06.md).
