# Verifikasi packaging DNA referensi — task 4.1–4.4

Tanggal: 5 November 2026. Change: `align-plugin-reference-content-dna`.
Status: **PASS LOCAL SOURCE/FIXTURE + artefak ZIP lokal**.
Acuan: [CR-061](../decisions/2026-11-05-cr-061-plugin-reference-content-dna.md),
[design D8](../../openspec/changes/align-plugin-reference-content-dna/design.md)
dan [tasks](../../openspec/changes/align-plugin-reference-content-dna/tasks.md).

## Identitas source dan kandidat

- Base HEAD: `a9757bb770ebfdfb4845cb5fbe2a270a5d5aff25`, ditambah diff lokal task 3–4.
  Belum ada candidate commit SHA baru; hasil ini bukan exact-SHA Actions PASS.
- Manifest kandidat: **0.5.0**, nama plugin `content-producer`, satu skill,
  lima referensi core dan tujuh referensi trivia; total **15 file**.
- Perbandingan manifest dengan HEAD: hanya version berubah dari 0.4.0 ke 0.5.0.
  Identitas, author/repository/interface serta byte `.app.json` identik.
- Versi 0.5.0 belum ada pada manifest/tag lokal sebelum perubahan ini.
  Ini pemeriksaan repository lokal, bukan penetapan versi live terbaru.
- Kandidat: `artifacts/plugin-candidate/`.
- Index: `artifacts/plugin-candidate-filelist.json`,
  SHA-256 `35278c3097f9aaf2273cf8d4410f36448426c418e044e4cb1b4cc7f66d3eede4`.
- ZIP: `artifacts/content-producer-private-v0.5.0.zip`, **41636 byte**,
  SHA-256 `73b91a159d469fb1dc1e966758e5b62334df2be99b668560ca2a0da2f35ff658`.
- Artifacts diabaikan Git. Simpan ZIP/index yang sama pada handoff rilis yang
  diotorisasi; jangan menganggap HEAD saja menjelaskan diff lokal ini.

Source → kandidat → index → ZIP hasil ekstraksi memiliki byte/hash yang sama.
Nama/versi ZIP berasal dari manifest. README/changelog/schema generator, corpus
QA, companion sumber, data audit dan `dataset-reference/` tidak masuk ZIP.
Paket mempertahankan satu app owner OAuth `mcpku2`, tanpa bundled MCP atau
credential. Release terpasang yang tercatat 4 November 2026 tetap bukti v0.4.0;
tidak dibaca ulang atau diubah oleh task ini.

## Implementasi

| Task | Hasil |
| --- | --- |
| 4.1 | Kedua referensi ditambahkan ke allowlist dan policy validation. Tes paket memeriksa 15 file/tujuh niche, source/candidate/index hash, serta file baru hilang/berubah, path escaping/encoded escape, credential dan nama tool v1 pensiun. |
| 4.2 | Manifest 0.5.0; README dan CHANGELOG membedakan source/kandidat dari release terpasang. Kontrak backend dan app mapping tetap. |
| 4.3 | CI memeriksa 15 file pada direktori dan ZIP, daftar eksak dan seluruh hash ekstraksi. Companion sumber memilih root checks pada addition/deletion; tidak dijadikan isi paket. Tes menjalankan shell workflow nyata terhadap fixture, bukan menyalin logikanya ke stub. |
| 4.4 | Tes fokus/check/MCP/probe, build, verify kandidat, shell ZIP dan pemeriksaan akhir dijalankan; hasil di bawah. |

Tidak ada pengurangan cabang MCP/probe/security. Negative ZIP mencakup referensi
hilang, referensi diubah, serta referensi diganti file QA dengan jumlah tetap 15;
kasus terakhir gagal pada filelist sehingga count saja tidak dianggap cukup.
Semua negative cases paket lama kembali dieksekusi setelah blocker allowlist
task 3 teratasi.

## Preflight dan hasil eksekusi

Preflight: base HEAD di atas + diff task 3–4; scope plugin/editorial/packaging
dan CI. Perkiraan tes fokus kurang dari satu menit, check 1–3 menit, MCP
1–3 menit, serta build/verify/probe/ZIP kurang dari satu menit masing-masing.
Dasar: isi `scripts/check.ts`, script package/MCP, cabang workflow, dan hasil
lokal task 3 (root tests 3,11 detik, frontend 678 ms). Detail riwayat Actions
terbaru tidak tersedia dari percobaan konektor sebelumnya; tidak membuat URL
run atau mengklaim hasil Actions. Tidak ada push/dispatch.

| Pemeriksaan | Hasil |
| --- | --- |
| Fokus plugin-config/package/skill/trivia + workflow-config/classification | PASS — 6 file/87 tes, 1,53 detik. |
| `pnpm run check` | PASS — lint, root typecheck, 14 file/179 tes (3,00 detik), frontend typecheck/build dan 19 tes (714 ms). |
| `pnpm run test:mcp` | PASS — Deno check/lint, 17 file/114 tes (8 detik), mock tanpa database/hosted. |
| Probe lokal seperti workflow | PASS — Deno fmt/lint/check; 3 tes (68 ms). |
| `pnpm run verify-migrations` | PASS — 85 nama migration; bukan pemeriksaan applied history/database. |
| `pnpm run package-plugin` | PASS — 15 allowlisted files. |
| `pnpm exec tsx scripts/verify-plugin-candidate.ts` | PASS — source/candidate/index identik. |
| Shell Archive and verify package entries and hashes dari CI | PASS lokal — ZIP aktual, 15 entri eksak, .app.json tunggal, tanpa bundled MCP/credential, hash ekstraksi cocok index. |
| `git diff --check` | PASS. |
| `openspec validate align-plugin-reference-content-dna --strict` | PASS. |
| Actions / instalasi / evaluasi semantik E01–E12 / LIVE saved-copy | NOT RUN pada task 4. |

Lima kegagalan paket pada [record task 3](reference-dna-writing-verification.md)
tetap bukti historis. Run terakhir di atas telah lulus sesudah perbaikan
packaging; tidak menimpa atau menyebut run lama PASS. Factual support,
naturalness model dan performa Facebook tidak dibuktikan oleh test paket.

## Filelist dan SHA-256

Path berikut relatif terhadap root plugin/kandidat, sama dengan index dan ZIP.

| Path | Byte | SHA-256 |
| --- | ---: | --- |
| `.app.json` | 132 | `51e72d5559cb963fb62fb2a69e1314eedb2d1764b9e99192114c29a6ee9e3a08` |
| `plugin.json` | 683 | `9e92eea599b7605257e0ac32df6d2ee24fb4b65d67091ec4f9249c6f7ebe32f6` |
| `skills/content-producer/SKILL.md` | 9333 | `0c48932dc5ef207ba2536a96eba10f80a619b035399d23cd4d29725e0a686e3a` |
| `skills/content-producer/references/core/lifecycle.md` | 6208 | `11e39235838073c6e9f377f7a57eb7ec4399c1f9f48a82daaaed08940c35e7d4` |
| `skills/content-producer/references/core/output-contract.md` | 4495 | `5422d41d0205358b787c8d2e70d1caaadfe8e2626ac1f02eb912d753a6612ede` |
| `skills/content-producer/references/core/source-policy.md` | 1309 | `804fc11d8a84b7233e5b768f105370b9987751902630a1efede9697edfb1d648` |
| `skills/content-producer/references/core/tool-sequences.md` | 6575 | `58f60ebc12013d66bcf6a76ce0719f143ed7002cb8e9c1011cacd7f33cd3e55f` |
| `skills/content-producer/references/core/workflow.md` | 6166 | `feea59c9b80d5aa22412959a1eb06dd3fc6d8ba23766c78b4b90e7a72d2a98a2` |
| `skills/content-producer/references/niches/trivia/content-dna.md` | 9134 | `3ddb58d073466c3895976045ed907056679766ceebf3630e5096bb3e764217d1` |
| `skills/content-producer/references/niches/trivia/dedup-ontology.md` | 1976 | `808f1f3729753ef137022115103b269228c3f32dc639cafaf53756dd53437dd7` |
| `skills/content-producer/references/niches/trivia/fact-checking.md` | 1400 | `02d2e905be1af958cde10f59f609dc8585536452aa0ebd65b4f087225cd8c8dd` |
| `skills/content-producer/references/niches/trivia/formats.md` | 8317 | `785d7f6c1ec642df006ca47ac5a9353335fddeb98d7baa57845539b67849157f` |
| `skills/content-producer/references/niches/trivia/quality-rubric.md` | 2873 | `924a494dfa96aac6a8aa9459216922857a3bc4de18f6f160438349c80f554762` |
| `skills/content-producer/references/niches/trivia/reference-patterns.md` | 25256 | `722753208b536e542af0d4fc98fe5ee388427bf9d7da5e9a084e278180a0430d` |
| `skills/content-producer/references/niches/trivia/writing-playbook.md` | 8004 | `146b7bb88685bd727f1458d1d123325c506b1f03c30061af6bc08ab776ba85a5` |

## Batas dan kelanjutan

Task 4 selesai pada source lokal dan artefak yang terverifikasi. Task 5–6
tetap terbuka: preview per prompt, review semantik dengan pemilik, pemasangan
yang diotorisasi, verifikasi release/hash pada chat baru dan retest saved-copy.
Jangan menyatakan FIXED atau menyamakan tes fixture dengan hasil LIVE.

Tidak ada commit/push/PR/merge, upload/install, deployment, DB reset/full backend
gate, perubahan config production atau business Write pada pengerjaan ini.
