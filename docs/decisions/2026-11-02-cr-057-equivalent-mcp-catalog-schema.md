# CR-057 — Representasi katalog MCP ekuivalen untuk P6

**Status: Accepted**, 2 November 2026. Pemilik menjawab “ya saya setuju” pada
usulan penyesuaian representasi schema/metadata untuk mempertahankan 36 tool,
batas fixed-pilot <100000 byte, closed-object, dan validasi v1/v2.

## Keputusan

- Wire `inputSchema` boleh memfaktorkan subtree identik menjadi referensi lokal
  `#/$defs/sN` dalam schema tool yang sama. Tidak ada referensi network/lintas tool.
- Wrapper object yang ditambahkan SDK pada union cabang strict ditutup dengan
  `additionalProperties: false` dan union nama property cabang. `anyOf` dan
  constraint tiap cabang tetap utuh; properties wrapper tidak menggantikannya.
- Test mengekspansi semua referensi dan membandingkan dengan schema SDK setelah
  normalisasi karakter CR-034 dan closure ekuivalen tersebut. Cabang union dan
  unknown-property denial tetap diuji lewat runtime MCP.
- Validator Zod, input/output versi 1/2, metadata OAuth/profile, seluruh 36 nama,
  batas ukuran katalog dan default-closed pilot tetap dipertahankan. Approval ini
  tidak mengizinkan peningkatan batas ukuran atau penghapusan tool/constraint.

Ini penyelesaian penghambat representasi P6, bukan bukti host/LIVE, izin
deployment, pemasangan plugin, pensiun creation v1, atau business Write.
