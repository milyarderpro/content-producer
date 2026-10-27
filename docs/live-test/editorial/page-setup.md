# Spesifikasi Page internal khusus evaluasi trivia

**Status:** Page uji sudah dibuat sekali dengan persetujuan payload terpisah dan [readback penuh cocok](preflight.md). Page public ID: `f3984ee4-8ae7-4043-8c93-45765f82f46e`; kelima format pilot sudah dicoba. Dua baseline tertahan pada reservasi, lalu [retest terpisah](summary.md#retest-terfokus-setelah-perbaikan--bukan-bagian-dari-30-utama) masing-masing menyimpan draft. `create_page` membuat **record Page di Content Producer**, bukan Page Facebook sungguhan. Ini Write production pada workspace owner; tidak ada tool `delete_page` dalam inventaris 33 tool. Draft, fakta, dan riwayat uji juga menjadi data nyata. Persetujuan Page tidak menjadi persetujuan massal atas reservasi atau `save_post` pada kasus berikutnya.

## Preflight sebelum `create_page`

Langkah dan prompt berikut merekam prosedur yang **sudah dilaksanakan** untuk Page baseline di [preflight](preflight.md); jangan menjalankan `create_page` ulang hanya karena membaca panduan ini.

1. Melalui plugin PRIVATE dengan owner OAuth `mcpku2`, baca `get_account_profile`, `get_workspace_context({})`, lalu `list_pages`. Pastikan workspace owner yang dimaksud dan tidak ada Page uji ekuivalen; hasil daftar kosong bukan izin otomatis membuat Page.
2. Pemilik meninjau usulan `name`, `slug`, timezone IANA, `target_markets`, `fact_reuse_scope`, **seluruh** config JSON, dan dampak permanen Page. Nilai di bawah ini adalah proposal, bukan persetujuan Write. Cocokkan dengan schema/validator runtime yang terpasang; jika berbeda dari source, hentikan dan rekonsiliasi sebelum membuat Page.
3. Tampilkan payload `create_page` lengkap untuk ditinjau: `request_schema_version: 1`, `workspace_public_id` dari konteks owner, UUID v4 `operation_key` baru, `config_schema_version: 1`, seluruh field Page/config, dan `make_default: true` secara eksplisit. Field itu menjadikan **niche trivia default pada Page baru**, bukan menjadikan Page ini default workspace atau mengubah Page lain. Minta izin **untuk operasi dan payload itu**. Jangan mencantumkan token/secret dalam bukti.
4. Setelah sukses, baca kembali `list_pages` dan `get_page_generation_context` untuk Page public ID yang dikembalikan. Bandingkan **seluruh** config dengan payload yang disetujui, catat ID dan `config_updated_at` sebagai teks persis dari server, serta verifikasi `enabled_niches` memuat trivia aktif/default pada Page baru. Jika respons create hilang, rekonsiliasi state dan replay hanya `operation_key` + payload semantik yang sama; jangan membuat Page kedua.

Prompt pertama untuk pemilik, di **chat baru** dengan hanya plugin PRIVATE Content Producer dan koneksi owner OAuth `mcpku2` yang sudah ada; ini **Read-only**, bukan persetujuan membuat Page:

> Lakukan preflight Read-only untuk kampanye evaluasi trivia. Panggil `get_account_profile({})`, `get_workspace_context({})`, lalu `list_pages` pada workspace owner yang sama; ikuti `next_cursor` sampai seluruh Page relevan terbaca. Tampilkan workspace public ID, Page yang ada beserta slug dan niche aktif/default, dan apakah slug usulan `trivia-editorial-test-2026` sudah dipakai. Periksa definisi tool yang terlihat dalam sesi ini untuk `create_page`, `get_page_generation_context`, `trivia_find_similar_facts`, `trivia_register_and_reserve_facts`, `trivia_release_facts`, `save_post`, `list_posts`, dan `get_post`; khusus kandidat trivia, laporkan apakah `qualifiers.comparison_direction` required dengan delapan enum tertutup. Laporkan versi plugin/backend hanya bila ada bukti sesi yang dapat dilihat; selain itu tulis `UNVERIFIED`. Jangan panggil `create_page`, reservasi, release, `save_post`, atau Write lain. Jangan meminta atau menampilkan token/secret. Jika definisi tool tidak dapat diperiksa, tulis `UNVERIFIED`, bukan menebak.

Simpan respons tersanitasi dan keputusan lanjut/berhenti memakai [template preflight](preflight-template.md). Setelah Read ini, siapkan payload `create_page` lengkap **di luar prompt di atas** dan minta persetujuan owner yang terpisah sebelum memanggil Write.

## Konfigurasi yang diusulkan untuk ditinjau pemilik

| Field                       | Usulan / keputusan yang masih diperlukan                                                                                                                                      | Alasan                                                                                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`, `slug`              | Usulan `Trivia Editorial Test (Internal)` / `trivia-editorial-test-2026`; pastikan slug belum dipakai                                                                         | Menandai record uji secara jelas; tetap butuh persetujuan payload                                                                                                                    |
| `timezone`                  | Usulan `America/New_York` (IANA); konfirmasi pemilik sebelum Write                                                                                                            | Pasar US utama; tidak ada jadwal dalam kampanye, tetapi field wajib                                                                                                                  |
| `target_markets`            | `US`, `GB`, `CA`, `AU`                                                                                                                                                        | `GB` adalah kode dua huruf untuk UK pada schema                                                                                                                                      |
| `niche_key`, bahasa, tone   | `trivia`, `en-US`, `conversational_credible`                                                                                                                                  | Sesuai kontrak trivia dan target pembaca                                                                                                                                             |
| `allowed_formats`           | Kelima `format_key`: `single_subject_fast`, `themed_utility`, `emotional_animal_collection`, `comparison`, `myth_vs_fact`                                                     | Satu Page dipakai untuk seluruh matriks                                                                                                                                              |
| `format_weights`            | Usulan 20/20/20/20/20; jumlah wajib 100                                                                                                                                       | Netral untuk kasus pemilihan format implisit; bukan jaminan distribusi output                                                                                                        |
| `allowed_topics`            | Semua topic key trivia yang relevan dengan 35 kasus; usulan seluruh 11 key yang didukung                                                                                      | Menghindari kasus valid tertolak karena Page config                                                                                                                                  |
| `topic_group_weights`       | Usulan default sumber 30/20/15/15/10/10; jumlah wajib 100                                                                                                                     | Bobot tema bukan hasil audit views atau kuota kampanye                                                                                                                               |
| `fact_count`, `profiles`    | Usulan adaptive min 5, preferred 7, max 9; `fast_trivia`: 7–8 fakta, 8–11 kata/fakta, total 65–85 kata; `practical_utility`: 5–6 fakta, 10–14 kata/fakta, total 65–85 kata    | Mengakomodasi lima format tanpa memaksa satu jumlah fakta                                                                                                                            |
| `render_style`, CTA, budget | Usulan `plain_lines`; goal `share`, `save`, `comment`, `follow`; budget hook/fakta/blok fakta/CTA/Canva 45/90/500/50/600 karakter, caption 500; hashtag default/min/max 3/0/5 | Server menghitung hasil final; tidak ada bypass hard limits                                                                                                                          |
| `fact_reuse_scope`          | Usulan `page_unique`, konfirmasi setelah melihat Page lain dan dampak workspace                                                                                               | Mengizinkan retest kelak di Page baru dengan fakta sama; **tidak** mengisolasi canonical fact library. `workspace_unique` dapat memblokir fakta yang sudah dialokasikan di Page lain |
| `make_default`              | Usulan `true` secara eksplisit                                                                                                                                                | Mengatur niche default **di Page baru**; tidak mengganti Page lama. Default tool jika field dihilangkan juga `true`                                                                  |

### Selisih batas karakter yang diketahui sebelum baseline

[Keputusan frozen QUALITY-002](../../../plans/phase-0-decision-register.md) dan [panduan format plugin](../../../plugin/skills/content-producer/references/niches/trivia/formats.md) menyebut ceiling konfigurasi hook/fakta/blok fakta/CTA/Canva/caption `90/120/650/100/750/1000`. [Schema MCP saat ini](../../../supabase/functions/mcp/schemas.ts) dan [validator SQL](../../../supabase/migrations/20261008132513_add_core_validators_primitives_and_indexes.sql) membatasi field yang sama pada `90/90/500/100/600/500`. Ini **ketidaksesuaian kontrak–implementasi yang belum diselesaikan**, bukan izin mengubah frozen contract atau menganggap runtime production pasti sama dengan source lokal.

Proposal Page di bawah memakai `45/90/500/50/600/500`, yaitu default yang berada dalam **kedua** rentang. Kampanye baseline hanya menilai Page dengan config yang disetujui dan berhasil dibaca kembali; jangan menguji ceiling tinggi melalui `update_page`, memotong klaim penting agar lolos, atau menyebut penolakan batas tinggi sebagai hasil dari 35 prompt. Catat selisih ini sebagai risiko terpisah untuk triase kontrak/perbaikan setelah baseline. Bila schema host atau readback Page tidak menerima/menjaga proposal default ini, `NO-GO` sebelum pilot. Angka efektif runtime yang dapat dibuktikan, bukan angka aspiratif dalam panduan, menentukan interpretasi hasil simpan.

Sumber bentuk config adalah [schema MCP](../../../supabase/functions/mcp/schemas.ts), [handler Page](../../../supabase/functions/mcp/page_plan.ts), dan [default config source](../../../supabase/migrations/20261008132513_add_core_validators_primitives_and_indexes.sql). Berikut `config` yang disetujui dan **cocok dengan readback Page live pada 2026-10-26**; blok ini bukan izin membuat Page lain:

```json
{
  "allowed_formats": [
    "single_subject_fast",
    "themed_utility",
    "emotional_animal_collection",
    "comparison",
    "myth_vs_fact"
  ],
  "format_weights": {
    "single_subject_fast": 20,
    "themed_utility": 20,
    "emotional_animal_collection": 20,
    "comparison": 20,
    "myth_vs_fact": 20
  },
  "allowed_topics": [
    "animals",
    "pet_safety",
    "food_science",
    "food_storage_home",
    "practical_utility",
    "human_body",
    "nature_science",
    "geography",
    "history_origins",
    "inventions_everyday",
    "general_trivia"
  ],
  "topic_group_weights": {
    "animals_pet_safety": 30,
    "human_body_food_myth": 20,
    "practical_utility": 15,
    "places_geography": 15,
    "nature_space": 10,
    "history_inventions_people": 10
  },
  "fact_count": { "mode": "adaptive", "min": 5, "preferred": 7, "max": 9 },
  "profiles": {
    "fast_trivia": {
      "fact_count_min": 7,
      "fact_count_max": 8,
      "words_per_fact_min": 8,
      "words_per_fact_max": 11,
      "total_words_min": 65,
      "total_words_max": 85
    },
    "practical_utility": {
      "fact_count_min": 5,
      "fact_count_max": 6,
      "words_per_fact_min": 10,
      "words_per_fact_max": 14,
      "total_words_min": 65,
      "total_words_max": 85
    }
  },
  "fact_reuse_scope": "page_unique",
  "render_style": "plain_lines",
  "allowed_interaction_goals": ["share", "save", "comment", "follow"],
  "text_budget": {
    "hook_max_chars": 45,
    "fact_max_chars": 90,
    "facts_total_max_chars": 500,
    "cta_max_chars": 50,
    "canva_total_max_chars": 600
  },
  "caption": { "max_chars": 500 },
  "hashtags": { "default_count": 3, "min_count": 0, "max_count": 5 },
  "style": {
    "english_variant": "en-US",
    "tone": "conversational_credible",
    "emoji_allowed": false,
    "regional_slang_allowed": false
  }
}
```

Blok tersebut adalah `config` dari payload yang disetujui, **bukan payload `create_page` lengkap atau izin replay**: identitas workspace, operation key, `name`/`slug`/timezone dan `target_markets` berada di luar `config`. Readback live telah dicatat di [preflight](preflight.md); source HEAD saja bukan bukti config live. Jika Page config nanti berubah, hentikan kohort dan revisi dasar perbandingan; jangan menyisipkan perubahan diam-diam.

## Batas data dan izin setelah Page dibuat

- Page uji hanya memberi konteks generasi; pembuatan draft normal masih memerlukan riset, dedup Read, `trivia_register_and_reserve_facts`, `save_post`, dan readback `get_post`.
- Setiap reservasi dan save adalah Write production dengan konsekuensi berbeda. Pemilik meninjau payload konkretnya per kasus sebelum menyetujui; tidak ada izin blanket untuk 35 post. Jika reservasi ditinggalkan, lepaskan sesuai alur plugin dengan izin tepat; jangan menunggu TTL sebagai jalan pintas.
- Kasus utama baru dimulai setelah lima pilot dan dampak pada workspace dinilai. Target maksimum baseline adalah 35 draft (5 pilot + 30 utama), tetapi safety/source hold dapat menghasilkan lebih sedikit; Page terpisah **bukan workspace terisolasi**.
- Bekukan konfigurasi Page selama satu kohort. Jika ada perubahan config, versi plugin, schema host, atau backend yang relevan, hentikan kohort dan catat batas versi sebelum melanjutkan. Untuk retest kasus yang faktanya sudah dialokasikan pada Page ini, Page retest terpisah dengan config ekuivalen mungkin diperlukan; itu **bukan** izin otomatis membuat Page kedua.
- Draft tetap `draft`; jangan `approve_post`, `mark_post_posted`, memublikasikan ke Facebook, mencatat metrik fiktif, atau melakukan cleanup/discard tanpa keputusan baru. Riwayat tidak hilang hanya karena draft kemudian discarded.
