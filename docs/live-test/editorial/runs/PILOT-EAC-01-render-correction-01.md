# PILOT-EAC-01 — render-correction-01

Baseline asli tetap `FAIL` di [record baseline](PILOT-EAC-01-baseline.md). Ini percobaan koreksi terpisah berdasarkan laporan pemilik; prompt persis yang ditempel dan versi plugin/backend tidak dapat dibuktikan dari laporan, sehingga `UNVERIFIED`.

- Page `f3984ee4-8ae7-4043-8c93-45765f82f46e`; format `emotional_animal_collection`; tujuh fakta meerkat yang sama, tanpa perubahan urutan/teks.
- READ sebelum Write: tujuh fakta lama masih `verified` dan `actively_reserved`; generation context tidak berubah; tidak ada draft meerkat sebelumnya.
- Tidak ada reservasi baru. Satu `save_post` baru menggunakan reservasi lama dan `canva_copy` dengan `\n\n` antara hook, tujuh fakta, dan CTA; `get_post` cocok dengan teks yang disetujui.
- Post `ebb7c6c0-e4f6-419c-a28f-1e5e8a4a5b2d`, `draft`, revision 1, 7/7 allocated, hash `4f232b18f8761023f949db0b487f5d953187f8e98adb63bd29ec110e77bc39f3`.
- Server: system checks 19/19 pass; editorial checks 18/18 pass; `risk_flags: []`, current fact warnings `[]`. `quality_status: pending`, approval `null`—tidak disebut `ready`.
- Metrics server: hook 44 chars, facts block 415 chars, CTA 36 chars, Canva total 499 chars/77 words/26 lines, estimated read 26.3 seconds, replay ratio 2.023077, estimated loops 3. Fact word counts `[9,9,9,9,10,9,9]`.
- Reviewer: DNA `KUAT` 10/12, tidak membuka atau mengaudit URL sumber per fakta. Workflow `PASS`; ini belum membuktikan perbaikan instruksi plugin pada runtime baru.
- Tidak ada `revise_post`, `approve_post`, publikasi, atau Write tambahan setelah save.

## CANVA COPY tersimpan

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

## FACEBOOK CAPTION dan HASHTAGS tersimpan

```text
There's more going on in a meerkat group than a lookout on a rock.

Helpers stay with pups, share food, and even bring safer prey for the youngsters to practice on. Others keep watch or sound the alarm.

These are behaviors scientists have actually observed in wild meerkats.
```

`#Meerkats #AnimalBehavior #WildlifeFacts`
