# PILOT-CMP-01 — baseline

- Bukti: preview lengkap yang diteruskan pemilik pada 26 Oktober 2026; status `UNSAVED`, belum ada reservasi atau draft. Versi plugin/backend `UNVERIFIED`.
- Page `f3984ee4-8ae7-4043-8c93-45765f82f46e`; format `comparison`, profile `fast_trivia`, locale `en-US`, goal `comment`, render style `plain_lines`, tujuh fakta.
- Pemeriksaan lokal reviewer pada JSON `content_payload`: hook + tujuh teks fakta berurutan + CTA dengan pemisah `\n\n` identik dengan `canva_copy`; 509 karakter, 77 kata. Ini bukan metrics/checks server.
- Dedup dilaporkan 7/7 diperiksa, nol duplikat material; CMP04 `review_required: true` dinilai distinct oleh chat pilot. Plugin melaporkan sumber dan risiko pra-save; reviewer tidak membuka atau mengaudit URL sumber per fakta.
- Editorial reviewer: `format_fit: FIT`; DNA sementara 9/12 (`PERLU REVISI`): familiarity 2, surprise 1, specificity 1, coherence 2, scanability 2, utility/emotion 1. Sebagian besar kontras sudah sangat dikenal dan fakta ukuran terakhir tidak memberi metrik eksplisit. Naskah masih layak disimpan **sebagai baseline diagnostik**, bukan disetujui untuk publikasi.
- Keputusan reviewer: `GO` untuk tepat satu reservasi dan satu `save_post` pada set fakta/teks yang ditampilkan, tanpa perubahan; readback wajib. Tombol GO pada chat pilot adalah cara pemilik meneruskan keputusan ini. Approval `ready`, revisi, release, dan publikasi tidak diizinkan.
- Setelah GO, generation context READ berhasil dan copy tetap sama. Satu `trivia_register_and_reserve_facts` ditolak `FACT_SOURCE_INSUFFICIENT`; server tidak merinci klaim/sumber penyebab. Tidak ada reservasi yang terkonfirmasi, tidak ada retry, dan `save_post` **tidak dipanggil**. `list_posts` READ untuk `animals/comparison` kosong; tidak ada post ID untuk `get_post`.
- Verdict workflow: `BLOCKED / POLICY_HOLD` pada tahap reservasi, bukan `FAIL` pada `save_post`. Naskah tetap `UNSAVED`. Kegagalan kebijakan sumber yang tepat tidak membuktikan bug tool; akar spesifik dalam paket bukti belum diketahui.

## CANVA COPY pertama yang terlihat — UNSAVED

```text
Lions vs. tigers: more than just stripes.

Lions form prides; tigers usually live on their own.

Adult lions have mostly plain coats; tigers have bold stripes.

Male lions often grow manes; male tigers don't.

Wild lions: Africa and India; wild tigers: parts of Asia.

Lionesses sometimes hunt together; tigers usually hunt alone.

Lions often favor savannas; tigers inhabit forests and grasslands.

Tigers are the largest cat species; some lions outweigh smaller tigers.

Which difference surprised you most?
```

## FACEBOOK CAPTION dan HASHTAGS pertama

```text
Two big cats, two different ways of life. Prides versus solitary hunters, manes versus stripes—and size differences that depend on the individual. Which fact surprised you most?
```

`#LionFacts #TigerFacts #BigCats`
