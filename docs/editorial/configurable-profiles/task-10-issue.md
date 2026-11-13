# CR-062: profil editorial trivia per Page dan katalog owner

Config1 membatasi format, density, jumlah fakta dan CTA secara global, sehingga
pola Curious Mind, DYK, Daily Facts serta referensi tambahan tidak dapat diatur
per Page. CR-062 menyediakan config2 dengan satu profil pinned, katalog
format/topik/profil versioned milik workspace dan ekstensi lewat data dalam
struktur hook–facts–CTA yang didukung.

Source task 1–9 tersedia pada kandidat lokal berbasis
`c02c5413479cebf50f39abc10149fafca757611a`, belum menjadi commit/PR baru.
Sembilan migration aditif membawa source dari 85 ke 94 migration. Owner OAuth,
workspace/RLS, default-closed grants, tiga editorial checks, CAS/replay,
approval terpisah dan compatibility config1 tetap dipertahankan.

## Penerimaan yang sudah terbukti

LOCAL/FIXTURE: 16 integrasi tiga preset+custom dengan hash runtime tetap;
11 file/174 kasus database unik setelah retest Page terarah;208 source,
19 frontend;18 file/130 MCP;Inspector 33 valid/33 invalid+lima nama v1 ditolak+
owner denial/privacy;catalog/grant/RLS/history/cleanup,5 negative controls,
DB lint dan local security advisors PASS. Paket 15 file dan ZIP/hash PASS.

Target G4 kini 33 file/238 kasus DB, 15+18 file dengan 158+80 kasus; ini inventaris
runtime, bukan bukti seluruh 238 telah dieksekusi. Perhitungan statis 200 lama
dikoreksi secara terbuka tanpa menghapus test. Full G4 manual exact final SHA
main, deployment dan LIVE config2 belum dijalankan.

## Urutan tersisa

PR+light CI → keputusan merge → final main SHA → satu G4 manual aggregate PASS
→ target/backup/preflight+dry-run yang terverifikasi → deployment berizin →
owner OAuth/plugin refresh dan retest pada Page QA dengan scope/payload eksplisit.
DNA naskah mengikuti profil referensi yang dipilih; tidak ada review layout
ponsel atau persyaratan referensi visual. Tidak ada laporan DNA/CTA baru,
OpenAI API, embeddings, reset production atau publikasi Facebook otomatis.

Rincian source/kontrak/hasil ada pada change
`openspec/changes/add-configurable-trivia-editorial-profiles/` serta
`docs/editorial/configurable-profiles/task-9-results.md`. Rencana rilis/rollback
berada pada `task-10-release-plan.md` di direktori yang sama.
