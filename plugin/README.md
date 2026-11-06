# Source paket plugin PRIVATE

Manifest source kandidat versi `0.5.7`. Packaging bukan instalasi atau bukti
hasil generasi. App owner OAuth `mcpku2` dipertahankan; tidak ada perubahan backend.

Allowlist pada [plugin-package.ts](../scripts/plugin-package.ts) memuat 15 file:
manifest, mapping app, satu skill, lima referensi core dan tujuh referensi trivia.
README, changelog, dataset dan corpus QA tidak masuk paket.

Sesudah preflight durasi, jalankan `pnpm run package-plugin` lalu
`pnpm exec tsx scripts/verify-plugin-candidate.ts`. Hasil kandidat/filelist/hash
berada di `artifacts/` yang diabaikan Git. CI memeriksa ZIP dan seluruh hash.

DNA mengatur pilihan topik, variasi payoff, urutan dan bahasa en-US sehari-hari.
Atlas contoh asli dan playbook mengarahkan review sebelum preview/save/revise.
Sumber contoh per klaim ada pada
[companion developer](../docs/editorial/reference-example-sources.md).
Dasar keputusan ada pada [CR-061](../docs/decisions/2026-11-05-cr-061-plugin-reference-content-dna.md).
Lihat [changelog](CHANGELOG.md) untuk kalibrasi berikutnya.

Remediasi 0.5.7 terkait Issue #134–#136: qualifier per kalimat, kurasi payoff
berulang, penjelasan objek bernama, dan format yang mengikuti perangkat editorial.
Kontrak v2, context/CAS/dedup, tiga checks dan approval owner tetap.
Test source/fixture tidak membuktikan kualitas copy host; retest saved-copy
pada runtime yang terverifikasi tetap diperlukan sebelum klaim FIXED.
