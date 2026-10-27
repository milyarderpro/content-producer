# PILOT-MVF-01 — baseline

- Bukti: checkpoint preview dan hasil setelah GO yang diteruskan pemilik pada 26 Oktober 2026. Prompt mengacu pada kartu `PILOT-MVF-01` revisi `v7` di [`cases.md`](../cases.md); transkrip prompt yang benar-benar ditempel tidak tersedia dalam bukti ini. Versi plugin/backend `UNVERIFIED`.
- Page `f3984ee4-8ae7-4043-8c93-45765f82f46e`; format `myth_vs_fact`, profile `practical_utility`, locale `en-US`, goal `comment`, render style `plain_lines`, enam fakta.
- Pemeriksaan lokal reviewer pada JSON `content_payload`: hook + enam teks fakta berurutan + CTA dengan pemisah `\n\n` identik dengan `canva_copy`; 494 karakter, 74 kata. Ini bukan metrics/checks server.
- Plugin melaporkan riset sumber dan dedup untuk keenam koreksi. Reviewer tidak membuka atau mengaudit URL sumber per fakta, dan checkpoint tidak membuktikan paket bukti reservasi terstruktur siap diterima server.
- Editorial reviewer: `format_fit: FIT`; DNA sementara 10/12 (`KUAT`): familiarity 2, surprise 2, specificity 1, coherence 2, scanability 2, utility/emotion 1. Hook masih generik; koreksi mitos penyiraman di bawah sinar matahari kurang menjelaskan mekanismenya. Naskah layak disimpan sebagai baseline diagnostik, bukan otomatis layak terbit.
- Keputusan reviewer: `GO` untuk tepat satu reservasi dan satu `save_post` pada fakta/teks yang ditampilkan, tanpa perubahan; readback wajib. Keputusan itu terlalu dini karena kesiapan bukti sumber untuk reservasi belum terlihat. Pemilik menekan tombol GO; tidak ada approval `ready` atau publikasi.
- Setelah GO, pemeriksaan pra-Write dilaporkan berhasil. Satu `trivia_register_and_reserve_facts` ditolak `FACT_SOURCE_INSUFFICIENT`; server tidak merinci fakta, URL, atau field penyebab. Tidak ada reservasi berhasil yang terkonfirmasi, retry, `save_post`, post ID, atau draft baru. Tidak ada `get_post` karena post ID baru tidak ada.
- Chat pilot mengusulkan hipotesis MVF06 memakai dua referensi dari penelitian Drexel yang sama. Itu **belum** membuktikan penyebab penolakan; aturan tertulis untuk klaim stabil non-sensitif mensyaratkan satu sumber A/B yang mendukung proposisi lengkap, bukan selalu dua sumber independen.
- Tindak lanjut yang diteruskan pemilik: chat pilot menyatakan URL sumber di checkpoint hanya tersedia sebagai referensi, bukan URL HTTPS literal yang diperlukan `trivia_register_and_reserve_facts`, dan upaya mengakses kembali referensi gagal. Ini diagnosis chat pilot, **bukan** payload asli atau alasan spesifik server. Salinan checkpoint yang diterima reviewer justru menampilkan tautan Markdown dengan URL HTTPS literal untuk enam koreksi. Kesenjangan yang perlu ditriase adalah pemindahan URL/metadata dari hasil riset/teks checkpoint ke objek `sources` terstruktur pada pemanggilan tool; jangan menyimpulkan URL tidak pernah ada atau bahwa MVF06 pasti penyebabnya. Tidak ada retry/Write baru berdasarkan laporan tindak lanjut ini.
- Verdict workflow: `BLOCKED / POLICY_HOLD` pada tahap reservasi. Kegagalan spesifik belum terlokalisasi; jangan menyebut bug server atau akibat panjang prompt sebagai fakta terbukti. Ini kegagalan kedua pada checkpoint `v7` setelah CMP dan menunjukkan alur persetujuan reviewer perlu diubah sebelum ekspansi.

## CANVA COPY pertama yang terlihat — UNSAVED

```text
Six plant myths worth checking.

Myth: Rocks help pots drain. Fact: They can leave soil soggy.

Myth: Used coffee grounds acidify soil. Fact: They're nearly neutral.

Myth: Wilted leaves mean thirst. Fact: Waterlogged roots can cause wilting.

Myth: More fertilizer means better growth. Fact: Excess can burn roots.

Myth: Watering in sunlight burns leaves. Fact: That's generally false.

Myth: Houseplants noticeably clean room air. Fact: Ventilation does far more.

Which myth have you heard?
```

## FACEBOOK CAPTION dan HASHTAGS pertama

```text
From rocks in pots to the air-cleaning promise of houseplants, these six familiar plant myths deserve a closer look.
```

`#PlantMyths #GardeningFacts #PlantScience`
