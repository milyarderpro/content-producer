# Hasil Phase 1 — baseline, penerimaan, dan kontrak contoh

**Tanggal:** 31 Oktober 2026.
**Kandidat lokal:** HEAD `3b385a679770e20c5ba193b470874a35c08b786a` ditambah
working-tree diff Phase 1. Ini bukan exact-SHA release evidence atau bukti live.

## 1. Status task

- **P1-T1 selesai sebagai inventaris bukti yang tersedia:**
  [baseline](phase-1-baseline.md) membedakan source dari record historis serta
  ketidakpastian runtime, applied migration, data production, dan plugin aktif.
  Ketidakpastian itu tetap belum terverifikasi; tidak diubah menjadi PASS.
- **P1-T2 selesai:** pemilik secara eksplisit menerima
  [CR-053](../../../docs/decisions/2026-10-31-cr-053-simplified-trivia-draft-workflow.md)
  dengan baseline A. Alternatif B, 7 hari/3 chat, rilis D1 sebelum D2, pensiun
  creation v1, deployment dan Write production tidak ikut disetujui.
- **P1-T3 selesai pada lapisan kontrak/fixture:**
  [kontrak contoh](../../../docs/contracts/trivia-draft-v2.md),
  [taksonomi error](../../../docs/contracts/tool-errors-v2.md), tiga modul data
  schema/fixture/taksonomi, serta test kontrak tersedia dengan versi
  `cr-053-p1-v1`. Tidak ada implementasi handler/RPC/domain v2.

Pembagian tetap **8 fase/23 task**; hasil sesi berhenti pada **3/23**. Phase 2
tidak dimulai. Tidak ada perubahan pada PRD, plan asli, proposal/design atau delta
spec; penerimaan dan hasil dicatat pada CR/tasks serta dokumen pendukung.

## 2. Cakupan kontrak dan kontrol negatif

Contoh meliputi Read sederhana, satu draft, lima draft bertema dengan satu plan
tanpa jadwal, satu claim per giliran, summary Write dan readback projection,
hasil sebagian tiga dari lima, revisi ID tetap, serta Setujui terpisah.

Kontrol negatif mencakup field ontologi/sumber/reservasi lama, URL kosong/rusak/
credential/alamat literal lokal, precision config yang dibulatkan, final set
incomplete/uncertain, fakta historis tidak layak, budget, editorial needs_revision,
katalog/config/revision/hash stale, claim expired, dan lost response.
Replay yang telah commit memakai key/payload identik dan ID hasil semula walau
claim kini expired; save baru dengan claim expired tetap ditolak pada contoh.

Taksonomi memuat 36 nama target transisi, semua kode allowlist adapter v1 saat
ini, sepuluh kode kontrak/SQL tambahan yang sudah didefinisikan, delapan kode
v2 baru, serta normalisasi lima alias family modul. Projection error v1 tetap
envelope lama; detail stage/outcome/ID diagnostik tidak disisipkan sembarangan.

Semua ID, operation key, claim token, URL, copy dan hash fixture sintetis. Tidak
ada riset sumber, izin Write, atau data owner nyata pada contoh tersebut.

## 3. Verifikasi yang dijalankan

### Kontrak dan source/frontend — PASS lokal

- Run fokus awal `pnpm exec vitest run tests/trivia-draft-v2-contracts.test.ts`:
  **29 kasus PASS** pada versi awal fixture; kemudian dua kasus tambahan masuk
  full check final, sehingga file kontrak final mempunyai **31 kasus**.
- `pnpm run check` final: **PASS** format, ESLint, TypeScript, root Vitest
  **13 file/122 kasus**, frontend typecheck/build, serta **19 test frontend**.
  Tidak ada skipped pada hasil tersebut. Dua run awal berhenti pada lint regex
  dan narrowing TypeScript dalam test baru; keduanya diperbaiki sebelum run PASS.
- Manifest source menambahkan tepat satu file test mandatory dan asersi jumlah
  source menjadi 13. Cakupan MCP 15 file dan DB 41 file tetap; tidak ada test
  lama dilepas atau gate keamanan dikurangi.

### Kompatibilitas MCP v1 terisolasi — PASS lokal

Binary **Deno 2.9.7** disiapkan terpisah di `/tmp/opencode/deno-2.9.7` dari cache
yang tersedia; pin repository dan binary Deno default tidak diubah. Dari
`supabase/functions/`, jalankan enam file dengan command berikut:

```sh
env AI_AGENT=none APPVEYOR=1 /tmp/opencode/deno-2.9.7 test --frozen --allow-env=NODE_ENV,AI_AGENT,APPVEYOR,CI,DEBUG,TEST,MODE,MINIMAL,NO_COLOR,FORCE_COLOR,TERM,MCP_RESOURCE_URL,MCP_ISSUER_URL,MCP_OWNER_USER_ID,SUPABASE_URL,SUPABASE_ANON_KEY,MCP_AUTH_MODE mcp/foundation_test.ts mcp/trivia_fact_test.ts mcp/post_base_test.ts mcp/page_plan_test.ts mcp/plan_claim_test.ts mcp/post_approval_test.ts
```

Hasil: **6 file/36 kasus PASS**, 0 failed. Bukti ini meliputi schema/metadata,
forwarding mock RPC, input/output closed, replay/privacy, source/dedup diagnostic,
Page/plan/claim dan lifecycle yang relevan. Ini bukan full suite MCP 15/82,
database, authenticated Inspector, atau pengujian host plugin lama yang live.

### Pemeriksaan artefak

Validasi OpenSpec strict **PASS tanpa temuan**, format dokumen akhir **PASS**,
dan `git diff --check` **PASS** pada penutupan. Bukti ini hanya validitas artefak
dan working tree lokal;
tidak menyatakan backend v2 atau alur host telah berhasil.

## 4. Batas bukti dan pekerjaan yang tetap belum dijalankan

- **NOT RUN:** retrieval/dataset berlabel P2, migration/backfill P3, transaksi
  save/revise v2, race sesi DB nyata, RLS/grant audit kandidat backend v2,
  Inspector, G4 manual exact-SHA, uji host/LIVE dan cutover.
- Schema interpreter hanya test-only untuk keyword yang dipakai; bukan validator
  runtime atau pustaka JSON Schema umum. Readback projection bukan seluruh wire
  response `get_post`, dan hash fixture bukan bukti renderer/server authoritative.
- Tidak ada perubahan `supabase/`, instruksi plugin, atau source frontend;
  frontend build hanya output generated yang diabaikan Git. Tidak ada deployment,
  pemasangan plugin, bisnis Read/Write hosted, commit/push/PR, atau Phase 2.
- Record P1-T1 tentang runtime/plugin aktif tetap terbatas pada bukti yang
  tersedia. PASS fixture tidak menjadi `FIXED`, izin rilis atau penerimaan
  alternatif/ambang yang masih terbuka.
