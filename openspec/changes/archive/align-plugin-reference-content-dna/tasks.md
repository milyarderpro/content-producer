# Tasks

Rencana saja. Semua checkbox tetap belum dikerjakan sampai pemilik memberi perintah apply baru. Acuan: [design](design.md), [spesifikasi editorial](specs/trivia-reference-editorial/spec.md), dan [delta workflow](specs/trivia-draft-workflow/spec.md). Izin implementasi source, commit/push/PR/merge, pemasangan, serta business Write tetap berbeda. Bukti CI/FIXTURE, preview, dan LIVE tidak saling menggantikan.

## 1. Record editorial dan baseline evaluasi

- [x] 1.1 Tautkan atau siapkan Issue remediasi dengan bukti audit 18 draft yang disanitasi, expected/actual, dan batas sebab yang belum diketahui; verifikasi tidak ada credential, token claim, atau pernyataan salah bahwa backend memaksa lima fakta. Pembuatan Issue mengikuti izin GitHub yang berlaku.
- [x] 1.2 Buat change record editorial pada nomor CR berikutnya sebelum perubahan instruksi: catat arah yang diterima pemilik, perbedaan dari baseline frozen/CR-053, kewajiban review plugin sebelum Write, serta arti tiga checks server yang tetap; verifikasi delta TDW-04/06/07 tertelusur dan tidak ada perubahan backend atau kontrak approval.
- [x] 1.3 Buat `docs/editorial/reference-dna-evaluation.md` dengan 12 prompt E01–E12, config snapshot nonrahasia, delapan dimensi/ambang D6, kontrol negatif, dan kolom versi/bukti/status; verifikasi semua kasus punya expected behavior dan pemisahan regresi/transfer, tanpa hasil PASS rekaan.
- [x] 1.4 Rekam baseline source 0.4.0, contoh hasil audit, dan baseline preview pada prompt E01–E12 bila host tersedia; verifikasi versi/model/input serta output utuh tercatat, baseline yang belum dijalankan ditandai NOT RUN, dan tidak ada Write atau perubahan draft nyata.

## 2. DNA dan atlas contoh

- [x] 2.1 Revisi `content-dna.md` dengan angle familiar, breadth topik, variasi nilai pembaca, urutan perhatian, voice nonakademik, dan prioritas instruksi/config; verifikasi walkthrough mencakup tubuh, makanan, tempat, sejarah, benda, hewan, serta alam tanpa jatah wajib tiap post.
- [x] 2.2 Tulis enam contoh lengkap pertama di `reference-patterns.md`: hewan single-subject, pets, perilaku hewan, tubuh/taboo ringan, food/myth, storage; riset klaim positif dan catat sumber per klaim di `docs/editorial/reference-example-sources.md`; verifikasi tidak ada placeholder, salinan satu post referensi, atau klaim positif yang hanya bersumber dataset.
- [x] 2.3 Lengkapi enam contoh negara, kota/tempat, sejarah/tokoh, benda, comparison, dan alam/sains; verifikasi 12 ID unik, kelima format dan dua profil terwakili, account+POST-id untuk asal pola, serta contoh transfer tidak membocorkan seluruh fakta evaluasi.
- [x] 2.4 Tambahkan anotasi opening, kontribusi setiap fakta, urutan tengah/akhir, CTA, format/config, dan kelemahan referensi yang tidak diwarisi; tambahkan minimal enam pasangan before/after menurut D5; verifikasi review naskah utuh menilai perubahan keputusan, bukan hanya penggantian kata sifat.
- [x] 2.5 Tambahkan pemeriksaan integritas corpus pada test plugin/editorial: ID/count/routing, contoh utuh, tautan internal, pemetaan format, dan pemisahan sumber dari copy publik; verifikasi negative missing-example/broken-link terdeteksi tanpa menyatakan test statis membuktikan naturalness.

## 3. Playbook dan kewajiban sebelum penyimpanan

- [x] 3.1 Buat `writing-playbook.md` untuk angle → kandidat ekstra → riset/dedup → kurasi → urutan → wording → review → context terbaru → save/readback; verifikasi walkthrough kasus daftar diameter dan caregiving berulang berakhir dengan penggantian/penyuntingan sebelum Write, bukan save dengan catatan gaya.
- [x] 3.2 Perbarui `formats.md`: comparison setara per pasangan dengan dimensi berbeda, myth correction langsung, hook `Did you know?`, 7–8 fast/5–6 utility bila diizinkan, tanpa padding untuk target kata; verifikasi kontrak lima format, dua profil, dan semua hard budget tetap sesuai config/server.
- [x] 3.3 Perbarui `SKILL.md` dan routing untuk DNA, indeks contoh, dua contoh relevan, anti-example, dan playbook pada tahap yang tepat; verifikasi permintaan lima draft tidak membuat `fixed: 5` tanpa dasar, sedangkan fixed count/judul eksplisit tetap dihormati.
- [x] 3.4 Selaraskan core workflow, output contract, dan quality rubric: copy nonakademik selesai disunting sebelum save/revise; tiga check v2 tidak berubah; hasil publik harus dari copy readback yang sama; verifikasi tidak ada checkpoint GO rutin, field DNA baru, atau arti baru pada `no_known_substantive_issue`.
- [x] 3.5 Tambahkan regresi kontrak dan scripted trace untuk academic-pass-before-save, qualifier hilang, format tidak didukung, count ambiguity, scope/retry, dan preview/payload mismatch; verifikasi save tidak menjadi langkah berikutnya sebelum perbaikan pada trace dan semua jalur v2/CAS/readback/owner lama tetap tercakup.
- [x] 3.6 Uji jalan buntu review: aturan dua putaran perbaikan terarah dan pelaporan keterbatasan tanpa filler; verifikasi trace tidak mengurangi count diam-diam, tidak memaksa DISTINCT, tidak membuat replacement post, dan tidak membuat loop tak berbatas.

## 4. Packaging dan dokumentasi rilis

- [x] 4.1 Tambahkan dua referensi ke allowlist `scripts/plugin-package.ts` dan validasi referensi terbundel; perbarui test paket/skill/trivia menjadi 15 file dan tujuh referensi niche; verifikasi source/candidate/index hash sama serta missing-file, path escaping, credential, dan retired-tool negative cases tetap gagal dengan benar.
- [x] 4.2 Perbarui kandidat manifest ke versi baru yang belum terpakai (rencana 0.5.0), `plugin/README.md`, dan catatan perubahan plugin; verifikasi identitas plugin/app serta mapping OAuth tetap sama dan dokumentasi membedakan source, candidate, dan release terpasang.
- [x] 4.3 Sinkronkan langkah count/ZIP/hash pada `.github/workflows/ci.yml` dan dependency classification yang terdampak; tambahkan regresi workflow relevan; verifikasi file baru tidak terbuang dari ZIP, corpus QA tidak ikut paket, dan tidak ada pengurangan MCP/security checks existing.
- [x] 4.4 Setelah preflight durasi sesuai AGENTS, jalankan test fokus plugin/editorial/workflow, `pnpm run check` untuk TypeScript/config yang berubah, `pnpm run package-plugin`, dan `pnpm exec tsx scripts/verify-plugin-candidate.ts`; verifikasi hasil, SHA/scope, daftar 15 file, hash, serta `git diff --check` tercatat. Tidak menjalankan backend gate/reset untuk scope ini; jika durasi >10 menit, ikuti pelepasan pemantauan dan tunggu `lanjutkan`.

## 5. Evaluasi naskah kandidat

- [x] 5.1 Jalankan ulang 12 prompt preview E01–E12 dengan versi kandidat dan input yang sama seperti baseline, memakai host yang tersedia tanpa Write; verifikasi hasil utuh, sumber riset, versi/model bila terlihat, serta perubahan input yang diperlukan tercatat dan tidak ada klaim LIVE-save.
- [x] 5.2 Review semantik tiap output dengan kutipan bukti untuk delapan dimensi; verifikasi semua kasus minimal 13/16, tanpa dimensi 0, naturalness 2, dan tidak ada masalah akurasi/qualifier/config/budget; bandingkan dimensi gagal baseline tanpa menutup FAIL dengan rata-rata.
- [x] 5.3 Perbaiki instruksi/contoh pada dimensi yang gagal lalu ulang kasus gagal beserta regresi terkait; verifikasi hasil baru tercatat sebagai attempt baru, sumber/makna tetap sah, dan test/package terdampak dijalankan ulang tanpa menimpa bukti gagal.
- [x] 5.4 Sajikan contoh dan laporan pembanding kepada pemilik untuk konfirmasi kesesuaian suara referensi; verifikasi feedback dan revisi tercatat, tanpa menjadikan review corpus ini checkpoint setiap draft produksi atau mengklaim source checks sebagai bukti hasil live.

## 6. Integrasi paket terpasang dan retest saved-copy

- [x] 6.1 Siapkan handoff PR/Actions/paket sesuai izin yang berlaku dan dokumentasikan verifikasi rilis serta rollback; verifikasi Issue/CR, candidate SHA, hasil checks, versi, dan hash paket tertaut. Commit/push/merge/pemasangan tidak dilakukan hanya karena checkbox ini ada.
- [x] 6.2 Setelah pemasangan yang diotorisasi, verifikasi versi/hash plugin terpasang dan koneksi owner pada percakapan baru; verifikasi referensi baru tersedia dan tidak ada koneksi MCP kedua atau asumsi backend berubah.
- [x] 6.3 Setelah izin objek/payload Write yang tepat, uji minimal lima format pada Page uji dengan fakta eligible: E01, E08, E02, E03/E05, E04; verifikasi riset/dedup/save/get_post sources+checks, status draft, revision/hash, dan exact Canva copy sama dengan copy yang telah direview. Jangan mengedit 18 draft audit atau melewati workspace reuse.
- [x] 6.4 Uji batch dengan scoped count yang disetujui dan tanpa instruksi fact count; verifikasi jumlah item tepat, pilihan fakta mengikuti profil/config, tidak ada override lima fakta tanpa dasar, serta progres dan ID setiap draft dibuktikan readback.
- [x] 6.5 Nilai copy tersimpan dengan rubrik D6 dan catat LIVE PASS/FAIL/BLOCKED/NOT RUN di workflow hasil live yang berlaku; verifikasi lima format dan kontrol batch lulus sebelum klaim FIXED, dengan SHA/version/post evidence yang disanitasi. Jika izin atau host belum tersedia, task tetap terbuka dan handoff menyebut batas bukti.

> Status pelaksanaan 6.5 (6 November 2026): [review 10 naskah tersimpan](../../../docs/editorial/reference-dna-d6-saved-review-2026-11-06.md) sudah dinilai, **6 PASS/4 FAIL**. Checkbox tetap terbuka untuk remediasi/retest kasus gagal; belum FIXED. Tracking Issue #134–#136. Hasil count/progres 6.4 tetap PASS pada scope-nya.

## Workflow follow-up

- Setelah implementasi dan penerimaan yang relevan selesai, gunakan workflow archive secara eksplisit untuk menyinkronkan delta spec dan mengarsipkan change; jangan mengedit main specs pada tahap proposal.
- Verifikasi hasil archive dan tautan keputusan/evaluasi tanpa mengubah hasil historis atau menganggap archive sebagai izin publikasi/deployment/business Write.

> Penyelesaian 6.5: [retest 0.5.7](../../../docs/editorial/reference-dna-d6-retest-0.5.7-2026-11-06.md) **LIVE PASS 10/10**, lima format dan lima output batch lulus; plan tetap 5/5. Source/PR #137/Actions dan versi terpasang dibuktikan terpisah. Issue #134–#136 closed; progres **28/28**. Hasil setelah repair terarah; FAIL lama dipertahankan dan tidak ada verifikasi ulang URL sumber.
