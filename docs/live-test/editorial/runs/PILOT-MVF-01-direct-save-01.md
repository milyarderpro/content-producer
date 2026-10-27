# PILOT-MVF-01 — direct-save-01

- Bukti: hasil chat baru yang diteruskan pemilik pada 26 Oktober 2026. Prompt `v8-direct-save` yang disiapkan reviewer ada di [`cases.md`](../cases.md); versi plugin/backend `UNVERIFIED`.
- Page `f3984ee4-8ae7-4043-8c93-45765f82f46e`; format `myth_vs_fact`, locale `en-US`; enam koreksi mitos tanaman. Prompt sejak awal meminta tepat satu draft tersimpan tanpa checkpoint GO.
- Chat pilot melaporkan riset dan dedup selesai, lalu satu `trivia_register_and_reserve_facts` ditolak `FACT_SOURCE_INSUFFICIENT` tanpa identitas fakta atau field penyebab. Tidak ada retry, reservasi berhasil yang terkonfirmasi, `save_post`, `get_post`, post ID, draft kedua, approval, revisi, atau publikasi. `system_checks` dan `editorial_checks` server tidak tersedia.
- Naskah pertama terlihat dan berstatus `UNSAVED`. Reviewer menilai `format_fit: FIT`, DNA sementara 10/12 (`KUAT`): familiarity 2, surprise 2, specificity 1, coherence 2, scanability 2, utility/emotion 1. Pebbles, misting, dan peonies memberi kejutan; “soggy soil zone” agak canggung dan `pH` lebih teknis daripada gaya umum yang diinginkan. Ini bukan verifikasi fakta independen atau persetujuan terbit.
- Hasil format `myth_vs_fact` dan caption dipisahkan dengan benar; CTA bertujuan komentar. Sumber hanya dilaporkan sebagai nama/domain enam lembaga penyuluhan universitas, bukan payload `sources` lengkap. Reviewer tidak membuka atau mengaudit URL per fakta.
- Verdict workflow: `BLOCKED / POLICY_HOLD` pada reservasi. Kegagalan juga terjadi tanpa jeda GO, sehingga jeda itu **bukan penyebab tunggal**; akar spesifik `FACT_SOURCE_INSUFFICIENT` tetap belum diketahui. Jangan mengubah baseline `PILOT-MVF-01` atau menyebut server rusak tanpa payload/diagnostik tambahan.

## Tindak lanjut diagnosis dari chat pilot

Chat pilot kemudian menyatakan bahwa setiap kandidat memakai satu sumber Tier B, tanpa sumber Tier A atau sumber independen kedua. Ini adalah **laporan chat, bukan payload reservasi asli**; respons server tetap tidak menunjukkan fakta atau field yang ditolak. Menurut validator pada source lokal, satu sumber A/B dengan objek evidence valid cukup untuk klaim `stable` + `standard`. Syarat Tier A dan dua sumber independen berlaku untuk `sensitive`; kasus `periodic`/`volatile` memiliki syarat `as_of` dan, pada kondisi tertentu, independensi tambahan. Karena versi backend live `UNVERIFIED`, kontrak lokal ini tidak boleh dianggap bukti penyebab pada server live.

Dengan demikian, ketiadaan sumber A atau sumber kedua **tidak sendiri membuktikan** alasan penolakan jika keenam kandidat benar-benar `stable` + `standard`. Bentuk dan metadata objek `sources` juga dapat menghasilkan kode error yang sama—misalnya URL HTTPS literal, field wajib, atau pasangan `tier`/`source_type`—tetapi belum ada bukti yang menunjuk salah satunya. Langkah berikutnya ialah memeriksa request tersanitasi/fixture dan diagnostik validasi secara offline dalam Issue #49; tidak perlu audit URL per fakta atau retry live baru untuk memperoleh dugaan lain.

## CANVA COPY pertama yang terlihat — UNSAVED

```text
6 plant myths that sound true (but aren't)

Myth: Pebbles improve drainage. Fact: They raise the soggy soil zone.

Myth: Plants need daily water. Fact: Water needs vary by plant and conditions.

Myth: Used coffee grounds acidify soil. Fact: They don't reliably lower pH.

Myth: Misting keeps plants humid. Fact: Its humidity boost fades fast.

Myth: More fertilizer means healthier plants. Fact: Too much can burn roots.

Myth: Peonies need ants to bloom. Fact: They bloom without ants.

Which one fooled you? Tell us below.
```

## FACEBOOK CAPTION dan HASHTAGS pertama

```text
From pebbles in pots to ants on peonies, these familiar plant-care beliefs deserve a second look. Which correction surprised you most?
```

`#PlantMyths #GardeningFacts #PlantCare`
