# Verifikasi plugin terpasang dan host — task 6.2

> Snapshot publik disanitasi: identifier QA/release dan tautan ChatGPT privat memakai alias. Isi naskah, skor, revision, content hash dan verdict dipertahankan. Hash fixture yang tercantum adalah hash bukti asli lokal; hash snapshot publik ada pada [indeks redaksi](reference-dna-public-evidence.md).

Tanggal: 6 November 2026, Asia/Jakarta.
Change: [align-plugin-reference-content-dna](../../openspec/changes/align-plugin-reference-content-dna/tasks.md).
ID bukti: `DNA-HOST-CONNECT-01`.
Verdict: **PASS LIVE untuk metadata/source plugin dan integrasi Read host**.
Tidak mencakup save/readback draft atau penilaian hasil generasi baru.

## Identitas source dan rilis

| Bukti | Nilai |
| --- | --- |
| Source paket pada commit lokal | `82f698b0c7f873fc5906919ae64f34242cb49e61` |
| Plugin | Content Producer (PRIVATE-REFERENCE-026530916695) |
| Plugin ID / audience | `QA-PLUGIN-58151d60d6a8`, USER / PRIVATE |
| Versi / release aktif dari Plugin Creator | `0.5.6` / `QA-RELEASE-cb7b33da5f8d` |
| Inventory | 16 file, `next_offset: null`; 15 source + overlay existing `.codex-plugin/plugin.json` |
| App wajib | Satu `content-producer`, ID `asdk_app_6ad6ebeab5fc8191a1d2cd54b87cd96f`, `required: true` |
| Candidate index SHA-256 | `4d5ff6463ae803c9fd01b3d13b038fcd686db336430f087b2bdc25665962e169` |

Plugin Creator dibaca kembali pada task ini, bukan hanya memakai manifest/cache
atau bukti rilis sebelumnya. Inventory dan pembacaan seluruh file memberi release
ID yang sama, tanpa missing paths. Seluruh **15 file identik byte/hash** dengan
objek Git pada commit di atas, source worktree dan candidate index. Source/package
SHA kini sudah tersedia setelah commit pemilik; pending SHA pada handoff awal
task 6.1 adalah keadaan historis sebelum commit tersebut.

Dua referensi baru tersedia pada rilis:

| Path relatif root plugin | Byte | SHA-256 |
| --- | ---: | --- |
| `skills/content-producer/references/niches/trivia/reference-patterns.md` | 25.256 | `722753208b536e542af0d4fc98fe5ee388427bf9d7da5e9a084e278180a0430d` |
| `skills/content-producer/references/niches/trivia/writing-playbook.md` | 15.307 | `aa492c61cd970174883e05681699ef4ed58d48e7f65e491f5c66b8c66bd194ea` |

Tidak ada `mcp.json` atau `.mcp.json` terbundel. Overlay kompatibilitas bukan
koneksi kedua; `.app.json` hanya mendeklarasikan app owner yang sudah ada.
Tidak mengubah plugin, memasang ulang, menambah koneksi atau deployment backend.

Bukti lokal tanpa credential:
`artifacts/reference-dna-evaluation/task-6.2/source-readback-verification.json`
dan `task-6.2/installed/`. Artefak diabaikan Git; identitas dan hash penting
dipertahankan pada dokumen ini serta [record rilis](reference-dna-plugin-release-2026-11-05.md).

## Chat baru dan prompt

Chat host baru (PRIVATE-REFERENCE-6318d8d2bb4a).
Host ChatGPT web lewat Chrome, thinking effort Medium; model exact unknown.
Chat dibuat baru, lalu **Content Producer saja** dipilih dari picker mention.
Tidak memilih `mcpku2` sebagai plugin kedua.

Prompt yang dikirim:

```text
Jalankan pemeriksaan integrasi read-only pada chat baru ini untuk Content Producer. Ini QA task 6.2, bukan permintaan membuat konten. Jangan panggil tool Write apa pun, jangan buat draft/plan/Page, jangan mengubah koneksi, dan jangan browse atau memverifikasi URL sumber fakta.

1. Gunakan koneksi owner bawaan plugin untuk memanggil get_account_profile, get_workspace_context({}), lalu list_pages. Jika ada tepat satu Page bernama corious facts (case-insensitive), baca get_page_generation_context untuk Page itu dan niche trivia; jika ambigu, cukup laporkan ambiguitas tanpa memilih untuk Write.
2. Baca file runtime plugin references/niches/trivia/reference-patterns.md dan references/niches/trivia/writing-playbook.md. Laporkan judul exact masing-masing file, judul kartu RP01 dan RP12, serta satu kutipan pendek aturan reader audition pada playbook sebagai bukti referensi dapat dibaca. Jangan menulis ulang atau membuat fakta trivia.
3. Ringkas hasil tool Read yang benar-benar dipanggil: auth/owner workspace berhasil atau gagal, jumlah Page dan apakah corious facts ditemukan, format/count/en-US dari context jika tersedia. Jangan tampilkan email, owner/workspace/Page UUID, token, atau credential. Bedakan versi yang dapat dibaca dari yang tidak tersedia; jangan menebak versi plugin atau backend dari keberhasilan Read.
4. Nyatakan apakah memakai dependency owner mcpku2 yang sudah ada, apakah ada koneksi kedua yang Anda buat/pilih, dan apakah ada Write. Jawab sebagai teks biasa ringkas; tanpa HTML/widget/canvas. Jangan mengklaim save, perubahan backend atau kelulusan generasi konten.
```

Respons sempat menampilkan error pemuatan saat generasi berlangsung. Ketika
diobservasi lagi, hasil lengkap tersedia; klik Reload yang dicoba sudah tidak
menemukan tombol itu. Tidak ada regenerasi, perubahan prompt atau retry business
Write untuk menyelesaikan pengujian. UI mencatat `Worked for 1m`.

## Hasil host yang disanitasi

Respons host melaporkan:

| Read / objek | Hasil |
| --- | --- |
| `get_account_profile` | BERHASIL |
| `get_workspace_context({})` | BERHASIL |
| `list_pages` | BERHASIL; 4 Page aktif, 0 nonaktif |
| Resolusi `corious facts` | Tepat satu kecocokan case-insensitive; niche trivia aktif |
| `get_page_generation_context` | BERHASIL untuk Page tersebut |
| Context | 5 format, 11 topik, 2 profil; adaptive min 5 / preferred 7 / max 9; `plain_lines`, `en-US` |
| Varietas/performa | 12 recent-variety entries; 0 performance signals |

Nama/judul referensi yang dilaporkan host cocok dengan readback:

- `Reference patterns — complete Canva cards`.
- RP01: `Octopus surprises`.
- RP12: `Volcanic materials with odd properties`.
- `Trivia writing playbook — finish the card before Write`.
- Kutipan playbook: `Do a reader audition before counting`.

Kutipan terakhir cocok dengan aturan tambahan 0.5.6. Gabungan inventory/hash
rilis aktif dan hasil chat baru menjadi bukti ketersediaan referensi; keberadaan
file source lokal saja tidak dipakai sebagai bukti akses host.

Host juga melaporkan workspace response schema 1, module version 1, config
schema version 1 dan content schema versions [1]. Nilai tersebut adalah metadata
yang dilaporkan respons, **bukan versi deployment backend** atau kesimpulan
tentang cutover. Respons secara eksplisit menyatakan versi package/runtime dan
backend deployment tidak tersedia untuk diverifikasi melalui Read ini. Versi
plugin 0.5.6 ditetapkan dari Plugin Creator, bukan ditebak dari angka tersebut.

## Koneksi dan batas bukti

Host menyatakan memakai dependency owner `mcpku2` existing, tidak membuat atau
memilih koneksi kedua, memanggil 0 Write, dan tidak membuat draft/plan/Page.
Coordinator juga tidak memanggil tool business Write atau mengubah koneksi.
Tidak melakukan browsing/verifikasi URL sumber fakta.

Bukti host adalah respons/UI yang terlihat, **bukan raw invocation trace lengkap
atau audit database sebelum/sesudah**. Klaim count/hasil empat Read di atas
ditandai sebagai laporan host. Bukti source/release dibandingkan secara
independen lewat Plugin Creator dan objek Git. Tidak memperluas Read PASS
menjadi bukti authorization untuk Write atau keberhasilan save.

Tidak ada backend deployment dilakukan pada task ini; keberhasilan owner Read
tidak membuktikan backend berubah maupun mengidentifikasi commit live-nya.
Tidak menghasilkan post baru atau menyatakan FIXED. Task 6.3–6.5 tetap terbuka.

## Pemeriksaan dan kelanjutan

Scope perubahan repository hanya dokumentasi/checklist. Pemeriksaan akhir:
review isi dan referensi lokal, whitespace dan `git diff --check`, validasi
OpenSpec. Check source/package task 5 dan light migration-name check task 6.1
dapat dirujuk; source paket serta 85 nama migration tidak berubah. Tidak
menjalankan ulang full source/backend gate, Actions atau deployment untuk
laporan ini.

Task 6.2 selesai untuk versi/hash, referensi runtime dan koneksi owner pada
chat baru. Pengujian berikutnya adalah task 6.3, dengan objek/payload serta
scope Write yang sesuai dan bukti saved-copy yang dinilai terpisah.

Pemeriksaan akhir PASS: seluruh tautan lokal/whitespace pada laporan terkait,
`git diff --check` dan validasi OpenSpec strict. Tree migration sama dengan
source yang sebelumnya lolos pemeriksaan 85 nama; tidak membuat run duplikat.
