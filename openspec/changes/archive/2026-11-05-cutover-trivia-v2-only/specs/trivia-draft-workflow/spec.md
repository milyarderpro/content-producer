# Spec Delta

## REMOVED Requirements

### Requirement: TDW-16 Tool v2 terpisah dan post v1 tetap kompatibel

**Reason:** Setelah cutover, seluruh post lama termasuk v1 dihapus sesuai reset yang disetujui, dan operasi konten v1 ditutup. Kewajiban melayani plugin dan post v1 bertentangan dengan tujuan v2 saja.

**Migration:** `trivia_find_similar_facts_v2`, `save_post_v2`, dan `revise_post_v2` menjadi alur draft; tool umum melayani post v2 baru. Lima nama khusus v1 dan overload maintenance v1 ditolak. Backup lokal dan laporan reset menjadi jalur pemulihan insiden, bukan runtime v1.

### Requirement: TDW-17 Pensiun pembuatan v1 menunggu bukti dan keputusan

**Reason:** Pemilik telah memutuskan pensiun seluruh operasi v1 dan reset konten, serta menerima risiko plugin lama. Kriteria transisi bertahap pada requirement ini diganti dengan prasyarat rilis cutover yang terukur.

**Migration:** Ikuti gate G4 exact-SHA, backup, preflight, penutupan RPC/Edge v1, reset transaksional, dan retest host pada `trivia-v2-only-runtime` serta `content-data-reset`. Tidak ada klaim cutover lulus sebelum bukti production tersedia.
