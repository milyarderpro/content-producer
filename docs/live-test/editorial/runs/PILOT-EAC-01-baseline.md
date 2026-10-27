# PILOT-EAC-01 — baseline

- Bukti: preview, hasil reserve/save, dan payload `content_payload` yang dikirim pemilik dalam percakapan. Revisi prompt dilaporkan `v6-go-once`; versi plugin/backend `UNVERIFIED`.
- Page `f3984ee4-8ae7-4043-8c93-45765f82f46e`; format `emotional_animal_collection`; topik meerkats.
- Editorial: DNA `KUAT` 10/12 pada copy `UNSAVED`; sumber per URL tidak diaudit reviewer. Ini bukan approval `ready`.
- Workflow `FAIL`: 7/7 fakta verified dan reserved; EAC06 dicatat `distinct` pada dedup review. Satu `save_post` ditolak `INVALID_ARGUMENT / CONTENT_RENDER_MISMATCH`. `list_posts` setelah error tidak menemukan draft meerkat baru. Tidak ada post ID, revision, allocations, atau checks tersimpan.
- Akar masalah terbukti pada payload: antar-teks fakta di `canva_copy` memakai satu LF (`\n`), sedangkan renderer `plain_lines` menggabungkannya dengan dua LF (`\n\n`). Server menolak payload yang tidak cocok; bug backend tidak terbukti.
- Reservasi dilaporkan berlaku sampai `2026-10-26T08:57:00Z`; status pelepasan atau pemakaian lanjut belum terkonfirmasi. Tidak ada retry, release, revisi, approval, atau publikasi pada baseline.

## CANVA COPY pertama yang terlihat — tidak tersimpan

```text
Meerkat pups aren't raised by parents alone.
Some helpers babysit pups while others head out foraging.
Groupmates feed pups even when they aren't the parents.
Older meerkats give younger pups dead prey to practice.
They sometimes remove scorpion stings before sharing the prey.
One meerkat watches from above while others search for food.
Lookouts give alarm calls when they spot a predator.
Meerkats recruit groupmates to mob threats like nearby snakes.
Share this example of real teamwork.
```

Retest memakai attempt baru dan tidak mengganti catatan baseline gagal.
