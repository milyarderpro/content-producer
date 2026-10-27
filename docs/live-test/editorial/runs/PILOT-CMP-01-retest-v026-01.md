# PILOT-CMP-01 — retest-v026-01

- Bukti: laporan chat plugin yang diteruskan pemilik pada 27 Oktober 2026 (`LIVE_OWNER_REPORTED`), bukan raw trace reviewer. Pemilik mengonfirmasi plugin tampak sebagai v0.2.6 sebelum retest; release ID/versi backend tidak ada dalam laporan sesi, sehingga atribusi runtime ketat tetap `UNVERIFIED`.
- Page uji `f3984ee4-8ae7-4043-8c93-45765f82f46e`; `comparison` lions vs. tigers, `en-US`, tujuh fakta. `config_updated_at` sesi tidak tersedia. Baseline yang tertahan pada reservasi tetap record terpisah.
- Prompt reviewer meminta satu draft langsung, mengizinkan satu reservasi dan satu `save_post` tanpa checkpoint GO, memperbolehkan pilihan klaim baru yang layak, dan melarang revisi/approval/publikasi/draft kedua. Teks persis yang ditempel pemilik tidak dikirim ulang; byte prompt `UNVERIFIED`.

## Alur dan state tersimpan

Laporan mengurutkan `get_account_profile` → `get_workspace_context` → `list_pages` → `get_page_generation_context` → riset → `trivia_find_similar_facts` → context/evidence preflight → `trivia_register_and_reserve_facts` → context sebelum save → `save_post` → `get_post`. Kedua business Write berhasil masing-masing sekali, tanpa retry. Tujuh fakta dilaporkan `verified` dan dialokasikan 7/7; enam `stable`, satu `periodic` tentang distribusi liar pada 2026. Empat belas rekaman Tier B dilaporkan, dua per fakta, dari lembaga zoologi/konservasi. Reviewer **tidak mengaudit URL atau dukungan per klaim secara independen**.

`save_post` dan `get_post` dilaporkan cocok: post `f5e1adda-404d-41d9-a46c-0adbf2f10d64`, status `draft`, revision 1, hash `94ac399cc081b324beff874826aacaecc335348a7c036e6995bfdcdf0152c630`. Seluruh 18 blocking system checks `passed`; editorial 18/18 `pass`, `risk_flags` kosong. `trivia.profile.preferred_band` adalah `needs_review` nonblocking karena fakta keenam 12 kata, di atas preferensi `fast_trivia` 8–11 kata. `system_checks.overall_status: passed`, `quality_status: pending`, `approval: null`; bukan `ready` atau publikasi. Metrik server: 502 karakter Canva, 77 kata, 26 visual lines, estimated read 26,3 detik, replay ratio 2,023077, estimated loops 3. Ini bukan pengukuran tontonan Reel 13 detik.

**Verdict workflow: `PASS`** berdasarkan save dan readback yang dilaporkan cocok. **Batas:** fakta/sumber dan alur prompt berbeda dari baseline; keberhasilan ini tidak membuktikan akar penolakan lama atau cabang diagnostik CR-050. Peringatan preferensi bukan kegagalan hard limit.

## CANVA COPY pertama yang tersimpan

```text
Lions vs. tigers: 7 real differences

Social life: Lions form prides; tigers are usually solitary.

Coats: Lions wear tawny fur; tigers have dark stripes.

Males: Lions usually grow manes; tigers have none.

Habitat: Lions use grasslands; tigers can live in mangroves.

Hunting: Lions may hunt together; tigers usually hunt alone.

Range (2026): Lions in Africa and India; tigers in parts of Asia.

IDs: Lions have unique whisker spots; tigers have unique stripes.

Which difference surprised you most?
```

FACEBOOK CAPTION:

```text
Lions and tigers may look like close cousins, but their social lives, markings, habitats, and hunting habits tell different stories. Which contrast caught your eye?
```

HASHTAGS: `#LionsVsTigers #BigCatFacts #WildlifeTrivia`.

## Review DNA terpisah dari checks server

`format_fit: FIT`; struktur label paralel membantu memindai tujuh perbandingan dan CTA mempunyai satu tujuan komentar. Bahasa `en-US` umumnya natural. Skor reviewer **9/12 — `PERLU REVISI`**: familiarity 2, surprise 1, specificity 1, coherence 2, scanability 2, utility/emotion 1. Hook “7 real differences” umum; social life dan hunting sebagian mengulang kontras yang sama; beberapa perbedaan awal mudah ditebak. Fakta identifikasi individu lebih menarik tetapi ditempatkan terakhir, sedangkan label “IDs” terasa mekanis bagi pembaca umum. Perbandingan habitat memilih contoh berbeda, bukan satu metrik yang benar-benar sejajar; catat sebagai peluang editorial, bukan klaim fakta salah yang terbukti. Reviewer tidak mengaudit fakta/sumber per klaim dan tidak menyetujui publikasi.
