# Verifikasi source — playbook dan review sebelum Write

Tanggal: 5 November 2026. Change: `align-plugin-reference-content-dna`, task
3.1–3.6. Acuan: [design D1–D4 dan D6](../../openspec/changes/align-plugin-reference-content-dna/design.md),
[CR-061](../decisions/2026-11-05-cr-061-plugin-reference-content-dna.md), dan
[tasks](../../openspec/changes/align-plugin-reference-content-dna/tasks.md).
Base SHA `a9757bb770ebfdfb4845cb5fbe2a270a5d5aff25` ditambah diff lokal task 3;
bukan exact candidate committed, release terpasang, atau bukti LIVE.

## Perubahan dan review

| Task | Implementasi dan pemeriksaan |
| --- | --- |
| 3.1 | Playbook angle → kandidat ekstra → sumber/dedup → kurasi → urutan → wording → review → context terbaru → save/readback. Walkthrough diameter dan caregiving berulang mensyaratkan seleksi/edit sebelum Write; kandidat gagal tetap diganti sesuai dedup. |
| 3.2 | Comparison setara dalam pasangan, dimensi antarbaris boleh berbeda; koreksi mitos langsung. Did you know? default, 7–8 fast/5–6 utility hanya preferensi. Lima enum format, dua profil, budget komponen/hasil dan metrik server dipertahankan. |
| 3.3 | DNA/indeks sebelum angle; dua kartu dan satu anti-example sebelum copy; playbook saat final review. Lima draft menjadi lima item tanpa implicit fixed: 5; fixed count/judul/layout sah tetap dihormati. |
| 3.4 | Workflow/output/rubrik mewajibkan penyuntingan sebelum save/revise, tanpa checkpoint GO rutin atau check DNA keempat. Tiga hasil v2, approval owner dan CAS tetap; copy yang direview, dikirim dan dibaca kembali harus cocok. |
| 3.5 | Sembilan regresi tambahan dalam suite existing: routing, budget, kontrak review, academic-pass, qualifier/format, count, copy mismatch, replay/context dan CAS/scope. Tes lama tidak dihapus. |
| 3.6 | Empat regresi tambahan untuk batas dua putaran, laporan keterbatasan, sukses pada putaran kedua, count/dedup dan hasil sebelumnya yang tetap terbukti. |

Instruksi runtime/playbook memakai English; catatan ini berbahasa Indonesia.
Tidak mengubah schema, backend, renderer, OAuth, RLS, config production atau
18 draft audit. `no_known_substantive_issue` tetap ketiadaan masalah substansi
yang diketahui, bukan naturalness atau skor DNA. Saran gaya minor setelah
standar inti terpenuhi tetap nonblocking.

## Trace sintetis yang diverifikasi

Oracle hanya berada dalam `tests/plugin-skill.test.ts`; bukan engine produksi,
generator naskah, evaluator semantik, atau tool Write. Review verdict dinyatakan
oleh fixture. Frasa qualifier dalam fixture bukan klaim fakta terverifikasi.

| Input/keadaan | Urutan yang diterima | Kontrol negatif yang ditolak |
| --- | --- | --- |
| Copy akademis, tiga check pass | Review gagal → edit/replace dengan sumber dan dedup → review copy final → context → Write → readback | Save langsung atau mengubah verdict tanpa repair; replacement belum didedup |
| Qualifier material | Frasa Some trained dogs tetap pada contoh sintetis | Mengubahnya menjadi Dogs; format keenam tidak didukung |
| Lima draft tanpa fact count | Intent adaptive lima → lima Write/readback pada fixture batch | Implicit fixed: 5; count ambigu; fixed tujuh tetapi payload lima |
| Preview/payload/readback berbeda | Payload sama dengan copy yang direview; mismatch dilaporkan pada post yang sama | Preview baik dengan payload lain; klaim verified tanpa readback; replacement melampaui scope |
| Write unknown | Replay tool, post, operation key dan payload identik → readback | Key baru, caption berubah, atau repair sebelum hasil direkonsiliasi |
| Revisi post yang sama | Scope revise eksplisit + Read CAS → review → context → revise → readback | Scope tidak tersedia; retry CAS setelah konflik tanpa Read/review baru |
| Dua putaran tetap gagal | Review gagal → repair 1 → review gagal → repair 2 → review gagal → laporan keterbatasan | Putaran ketiga, context/save filler, forced DISTINCT, atau event baru setelah stop |
| Satu dari dua draft terbukti | Output pertama/readback dipertahankan; laporan requested 2/proven 1/remaining 1 | Mengaku kedua draft selesai atau membuat post pengganti setelah stop |

Sukses setelah perbaikan kedua tetap diizinkan. Batas dua putaran mengendalikan
upaya editorial ini, bukan menghapus aturan lease/retry/reconciliation core.
Kontrol token, catalog/config, v2 payload, readback, owner approval dan jalur
historis tetap diuji oleh suite existing; fixture bukan bukti eksekusi host.

## Preflight dan hasil

Estimasi sebelum eksekusi: test fokus kurang dari satu menit;
`pnpm run check` 1–3 menit. Dasar: script lokal lint/typecheck/root tests/frontend,
run fokus task 2 422 ms dan root tests 3,22 detik. Konektor GitHub dipanggil
untuk riwayat workflow commit terdahulu tetapi tidak mengembalikan detail run
yang dapat dipakai; tidak ada Actions/push/dispatch yang dipicu.

| Pemeriksaan | Status | Bukti/batas |
| --- | --- | --- |
| Fokus plugin-skill, plugin-trivia, plugin-config | PASS | 3 file/39 tes, 369 ms; 13 regresi task 3 ditambah tes existing. |
| Lint dan root typecheck | PASS | Tahap `pnpm run check` terakhir. Narrowing helper test diperbaiki setelah percobaan pertama gagal typecheck. |
| `pnpm run check` keseluruhan | FAIL | Root tests: 164 PASS/5 FAIL dari 169, 3,11 detik. Kelima kegagalan ada di suite paket karena referensi baru belum masuk allowlist. Tidak disebut PASS. |
| Frontend typecheck/build/test terpisah | PASS | Dijalankan untuk melengkapi tahap setelah root test yang menghentikan check; 19 tes, 678 ms. |
| Review tautan source dan whitespace | PASS | Tautan runtime menuju file di skill root; `git diff --check` bersih. Ini bukan verifikasi tautan paket. |
| OpenSpec strict validate | PASS | `openspec validate align-plugin-reference-content-dna --strict`. |
| Package/ZIP/install dan preview E01–E12/LIVE | NOT RUN | Mengikuti task 4–6; tidak ada klaim FIXED, naturalness model, atau saved-copy PASS. |

Kegagalan paket yang diperkirakan: `Reference not included in candidate:
skills/content-producer/references/niches/trivia/reference-patterns.md`.
Skill/rubrik/playbook sudah merutekan file yang ada pada source, sedangkan
`CANDIDATE_FILES` masih 13 file. Task 4.1–4.4 harus menambahkan kedua referensi,
memverifikasi 15 file/hash/ZIP, menyelaraskan CI, lalu mengulang gate. Jangan
memasang snapshot task 3 ini. Pemeriksaan paket/credential/retired-tool tidak
diubah untuk menyembunyikan kegagalan; beberapa negative cases paket tertahan
oleh pemeriksaan allowlist yang lebih awal dan wajib diuji ulang pada task 4.

Tidak ada commit/push/PR/merge, pemasangan, deployment atau business Write
pada pengerjaan task 3. Task 4–6 tetap terbuka.

Follow-up task 4: [verifikasi packaging](reference-dna-package-verification.md)
merekam run baru yang menyelesaikan blocker allowlist dan lulus check. Hasil
FAIL task 3 di atas dipertahankan sebagai riwayat, bukan diubah menjadi PASS.
