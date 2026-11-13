# Hasil task 4 — fleksibilitas naskah dan renderer config2

**Selesai 12 November 2026 (Asia/Jakarta), LOCAL/FIXTURE.** Change
`add-configurable-trivia-editorial-profiles`, schema `spec-driven`, scope task 4.
[Panduan renderer](../../contracts/trivia-render-config2.md) dan
[fingerprint/verifikasi](task-4-verification.json) mencatat kontrak serta bukti.

## Perubahan

Dua migration baru dibuat melalui Supabase CLI pin 2.120.0 dan diterapkan hanya
pada stack lokal tanpa reset:

- `20261112131501_add_trivia_config2_renderer.sql`: renderer privat config2,
  ceiling D6, CTA multiline/placement, metadata opsional, fingerprint dan metrics.
- `20261112132449_isolate_config2_text_normalization.sql`: normalizer config2
  terpisah dari larangan emoji/ZWJ unconditional v1, dengan kontrol artifact dan
  privacy tetap dipertahankan. Migration pertama yang sudah applied tidak diubah.

Empat helper privat `IMMUTABLE`/invoker/search-path kosong dimiliki API owner,
tanpa caller execute atau RPC baru. Renderer memakai rules resolver task 3;
semua sembilan budget dan count efektif Page tetap membatasi ceiling mesin.
Preferensi profil tidak menjadi minimum padding atau gate tersembunyi.

CTA tetap wajib tetapi tidak mempunyai tujuan utama, hierarki, allowlist
kombinasi atau batas semantik jumlah ajakan. Goal absen/null tetap null pada
hasil primitive; labels boleh kosong/tidak lengkap/baru. Label dibatasi struktur
dan ukuran transport 4 KiB, bukan enum aksi. LF internal dipertahankan, placement
tertutup `after_facts` default atau `after_fact`+position 1..n. Fakta tidak berubah
urutan/identitas saat CTA disisipkan; blok fakta mengecualikan CTA.

NFC/CRLF→LF, metrics server dan hash deterministic diterapkan tanpa memotong
teks. Karakter berarti code point PostgreSQL sesudah NFC, termasuk setiap
komponen emoji. Unicode Emoji17.0 terpin dipakai untuk policy `forbidden`;
`optional` mempertahankan glyph/ZWJ/skin tone/flag/keycap. Lisensi disertakan.
Wrap/time/replay/loops menjadi advisori; hard budget tetap blocking. Tidak ada
kewajiban classifier CTA, loop maksimum 3 atau ratio 2,5 pada config2.

## Preflight dan identitas

Basis source `c02c5413479cebf50f39abc10149fafca757611a` + working files,
belum ada commit kandidat baru. SHA/fingerprint file task 4 ada pada JSON hasil;
ini bukan bukti G4 formal exact-SHA. Seluruh perubahan task 1–3 serta file
pengguna dipertahankan.

Workflow CI/source dan riwayat lokal tersedia diperiksa sebelum run. Estimasi
migration <1 menit, focused database 2–4 menit, `pnpm run check` 1–3 menit,
lint/advisors <1 menit. SQL dikompilasi serta diuji pada transaksi rollback
sebelum apply lokal. Tidak menjalankan full gate duplikat atau memicu Actions.
Golden config1 dan tiga hash definisi fungsi diambil sebelum migration pertama.

## Verifikasi final

| Pemeriksaan | Hasil |
| --- | --- |
| `pnpm run check` | PASS lint/typecheck, 14 file/184 test source; frontend typecheck/build dan 19 test |
| Focused database, command di bawah | PASS 4 file/73 kasus, 0 skip, 126,29 detik; 31 kasus renderer baru pada suite core existing |
| `supabase db lint --local --schema api,internal,public --level error --fail-on error` | PASS 0 temuan |
| `supabase db advisors --local --type security --fail-on error` | PASS 0 temuan, terpisah dari lint |
| Migration filenames dan history | PASS 90 versi source tepat sama dengan history stack lokal |
| ACL/cleanup akhir | PASS 33 signature API tetap, 4 helper privat, 0 caller execute; 0 definition/state/config2/renderer fixture workspace tertinggal |
| Golden config1 | PASS rendered-payload SHA-256 serta definisi `post_render_v1`, `post_render_v2`, `post_hash_v2` identik baseline sebelum migration |
| Frozen task 1, OpenSpec strict, referensi/whitespace | PASS; bukan bukti host atau LIVE |

```sh
pnpm exec vitest run --config vitest.database.config.ts \
  supabase/tests/database/core-primitives-and-validators.test.ts \
  supabase/tests/database/api-trivia-v2-save.test.ts \
  supabase/tests/database/pages-and-page-niche-configs.test.ts \
  supabase/tests/database/api-security-kernel.test.ts
```

Run pertama 109,95 detik: **69 PASS/3 FAIL**. Dua kasus Unicode gagal karena
helper teks v1 yang dipasang migration privacy lama selalu menolak emoji/ZWJ.
Satu fixture preset tidak menyertakan OAuth `client_id`, sehingga gagal sebelum
resolver. Perbaikan dilakukan melalui migration lanjutan dan konteks OAuth
fixture sintetis yang sesuai kontrak. Test artifact/bidi denial ditambah; tidak mengubah
expected ceiling, melemahkan izin atau menghapus kasus gagal. Run final 73/73
PASS setelah perubahan tersebut.

## Bukti perilaku

- Count 1/10/11/12 diterima; 0/13 dan posisi fakta tidak berurutan ditolak.
- Setiap ceiling karakter/kata diuji tepat batas dan +1, termasuk blok 900 dan
  full copy 1.100 karakter/160 kata. Semua sembilan limit Page yang lebih sempit
  diuji tepat batas/di bawahnya, bersama count, caption, dan hashtag policy.
- Golden copy, seluruh metrics dan fingerprint dikunci; pemanggilan ulang SQL
  atas output yang sama identik. NFC ekuivalen dan CRLF menghasilkan hash sama,
  perubahan CTA menghasilkan hash berbeda. Nomor 10–12 ikut metrics penuh.
- Like+follow Daily Facts, question+like serta like+tag DYK, wording ambigu,
  tiga-plus ajakan sintetis, label baru/40 label, array kosong dan label tidak
  lengkap diterima tanpa pemaksaan goal. Kasus sintetis bukan frekuensi corpus.
- CTA empat baris dan baris kosong tetap utuh; placement setelah fakta 6 dari 7
  menjaga fakta terakhir. Bentuk/posisi invalid dan copy placement salah ditolak.
- Teks dengan 5 baris/fakta, total >28 baris, ratio >2,5 serta 4 loops tetap diterima
  dalam budget. Ketiga preset dari resolver nyata menerima copy pendek di luar
  preferensi density, membuktikan preferensi tidak menjadi hard minimum.
- Emoji optional tidak dihapus, emoji forbidden ditolak di semua komponen teks
  produk. Digit/hashtag/asterisk biasa tetap teks. URL, markup, markdown, citation,
  UUID, tab, bidi dan zero-width privacy controls tetap ditolak.
- Jalur config1 masih menolak 10 fakta/CTA multiline dan mempertahankan byte/hash.
  Suite save config1, Page dan security kernel tetap lulus.

## Batas dan handoff

Task 4 adalah primitive core; API save/revise belum memanggil renderer config2.
Integrasi `editorial_context`, snapshot3, null goal column/readback, hash post,
approval/publication serta arrays sampai12 di seluruh lifecycle adalah task 5.
Plan/batch task 6; MCP schema/registry/pin audit task 7; plugin task 8; integrasi
lintas sistem task 9; rilis/G4 task 10. Jangan menyatakan `render_hash` sebagai
`posts.content_hash` atau memakai hasil ini sebagai bukti draft config2 LIVE.

MCP source masih 31 tool, API database 33 signature. Formal G4 manual exact final
SHA main dengan committed config dan aggregate PASS tetap wajib sebelum deploy
berizin; audit rilis akan direkonsiliasi pada kandidat akhir. Actions, formal G4,
visual QA pada template ponsel, install, deploy dan LIVE baru **NOT RUN**.
Tidak ada commit/push/PR/merge, publikasi Issue, mutasi owner production atau
klaim FIXED live pada task ini.
