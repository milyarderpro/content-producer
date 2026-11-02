# Hasil P7 — integrasi dan remediasi G4

**Tanggal:** 2 November 2026. **Change:** `simplify-trivia-draft-workflow`.
**Issue:** [#118](https://github.com/milyarderpro/content-producer/issues/118).
**Status:** P7-T1 belum selesai; P7-T2 NOT RUN pada host ChatGPT nyata.
Checkbox tetap terbuka sampai kriteria task lengkap terbukti.

## Kandidat awal dan kegagalan formal

Pemilik mengizinkan push P3–P6 dan dispatch G4 pada
`05b13d108beb198b1edc3d6a23103b12c3dc5eba`. Working tree bersih sebelum push.

| Bukti Actions exact-SHA | Hasil |
| --- | --- |
| [Light CI 41445158990](https://github.com/milyarderpro/content-producer/actions/runs/41445158990) | PASS source/frontend, MCP, probe, paket/ZIP |
| [G4 41445159466](https://github.com/milyarderpro/content-producer/actions/runs/41445159466), source | PASS |
| Kedua shard G4 | FAIL `migration-names`: `REQUIRED_EVIDENCE_MISSING` |
| Aggregate G4 | FAIL karena kedua shard belum PASS |

Kedua report memakai SHA, manifest/lock/input/partition hash sama. Start, satu
reset per shard dan cleanup PASS. Suite DB, MCP shard 1, Inspector, audit,
history, lint dan advisors NOT RUN karena berhenti pada assertion jumlah.
Runner masih mencari 75 nama migration; source final P5/P6 sudah 84. Tidak ada
bukti business RPC gagal dari run ini. Estimasi awal 10–15 menit; run berhenti
lebih awal karena guard tersebut, bukan full gate selesai lebih cepat.

## Remediasi yang diizinkan

Pemilik mengizinkan remediasi sampai tuntas setelah kegagalan dilaporkan.
Pada tindak lanjut, pemilik memberi izin berkelanjutan untuk commit, push, PR,
merge setelah review/light CI PASS, dan dispatch G4 dalam pekerjaan ini, sehingga
izin pelepasan Git tersebut tidak perlu ditanyakan ulang. Scope deployment,
pemasangan plugin, hosted OAuth dan business Write tetap mengikuti objek/runtime
yang diizinkan untuk tindakan masing-masing.
Basis source remediasi adalah `05b13d1` + working diff. Kontrak diterima
CR-053/054/056 menjadi dasar rekonsiliasi; baseline historis tidak ditimpa.

1. Runner memeriksa **84** nama migration. Audit aktif memeriksa history sama
   dengan seluruh manifest dan SHA-256 byte migration, termasuk 67 migration
   archived yang tetap dibandingkan dengan manifest frozen.
2. Comparator 72-migration lama dipertahankan di
   `scripts/legacy-catalog-audit.ts`. Entry point aktif tetap
   `scripts/phase-6-catalog-audit.ts`; runner/workflow memanggilnya seperti semula.
   Query historis Phase 5 dikembalikan ke allowlist 33 aslinya; audit v2 hanya
   memperluas query dalam memori dengan tiga nama baru, bukan mengubah snapshot
   hasil historis menjadi expected baru.
3. Inventaris aktual **36 nama/38 signature** dan **17 tabel dengan RLS**.
   Dua overload maintenance CR-056 diperiksa secara eksplisit; overload lain
   tidak diterima. Private definers baru hanya enam helper katalog/trigger P3
   yang sudah didefinisikan migration; semuanya `postgres`, `search_path=''`,
   tanpa grant caller. Closed grants/default ACL, role owner tanpa login/
   bypass/membership, ledger/token, privilege kolom/history dan cleanup tetap
   diperiksa.
4. Pin terpisah `scripts/trivia-v2-catalog-pin.json` mengikat **manifest source
   84 migration** ke sembilan section katalog: fungsi lengkap beserta digest
   definisi/owner/security/settings/ACL, objek/RLS, kolom, constraint, indeks,
   trigger, policy, schema dan default ACL. Fingerprint tidak menyertakan OID,
   sequence position, timestamp runtime atau versi patch PostgreSQL. Hash
   section dan manifest menjadi input identitas G4 lintas shard.
5. Basis pin adalah katalog lokal fixture-kosong dengan 84 migration applied
   yang cocok source. Review delta terhadap archive menemukan **24 perubahan
   source fungsi lama**, semuanya sesuai projection/dispatcher/validasi/rate/
   lifecycle P3–P5 dan CR-046/049/050/051; tidak ada fungsi lama dihapus atau
   perubahan metadata/ACL fungsi lama. Audit membandingkan semua fungsi lama
   dan hanya menerima nama delta tersebut; hash final tetap wajib cocok.
   Penambahan 38 fungsi/signature mencakup hook OAuth CR-021, tiga nama tool v2,
   dua overload maintenance, serta helper P3–P5. Pin bukan regenerated expected
   saat gate berjalan: drift source/schema/ACL tetap FAIL. Pembuktian pada satu
   reset bersih masing-masing shard Actions masih diperlukan.
6. Cleanup helper v2 diperbaiki agar menghapus event plan fixture sebelum post
   yang dirujuk `content_plan_item_events_discarded_post_public_id_fkey`.
   Ini urutan cleanup fixture terisolasi, bukan perubahan migration/FK bisnis.
7. Input SQL/pin audit baru memilih source checks serta backend review di light
   CI; regresi classifier dan negative control pin menguji penolakan drift.

## Verifikasi lokal

Preflight membaca job/history sebelum run. Source check diestimasi 1–3 menit,
test fokus <1 menit, audit read-only <1 menit; Inspector 2–5 menit. Tidak
menjalankan full gate lokal duplikat atau menyebut overlay sebagai rilis formal.

| Pemeriksaan | Hasil / batas |
| --- | --- |
| Audit katalog read-only lokal awal | PASS 84 source/applied, 36/38 RPC, 17/17 RLS, closed grants, exact pin dan nol fixture |
| `pnpm run check` awal remediasi | PASS 14 file/154 root + 19 frontend, lint/typecheck/build |
| Percobaan Inspector pertama | Terputus timeout terminal 120 detik saat kasus negatif; **bukan PASS** |
| Rekonsiliasi setelah timeout | Fixture dan container tepat milik percobaan dibersihkan; ditemukan/diperbaiki urutan FK cleanup event/post; audit kosong PASS |
| Inspector lengkap diulang | PASS initialize/list, **36 valid/36 invalid**, owner isolation/denial, HTTP read/write/replay/CAS, tiga tool v2 dan readback, privacy |
| Audit sesudah Inspector lengkap | PASS, section pin identik dan nol sisa fixture/fault |
| `pnpm run check` final remediasi | PASS 14 file/156 root + 19 frontend, lint/typecheck/build; termasuk pin dan classifier baru |
| `scripts/trivia-v2-catalog-controls.ts` | PASS lima negative control nyata yang di-rollback (grant anon, RLS off, helper baru, policy `true`, constraint hilang); audit akhir kembali PASS |
| `git diff --check` dan validasi OpenSpec strict | PASS |

Light CI PR [#119](https://github.com/milyarderpro/content-producer/pull/119)
run [41448899109](https://github.com/milyarderpro/content-producer/actions/runs/41448899109)
pada `6a80c8d` menemukan `LOCAL_DATABASE_TARGET_MISMATCH` saat import pure
validator di source test: helper database diinisialisasi terlalu awal. Perbaikan
membatasi dynamic import helper hanya pada eksekusi audit/collector, sehingga
source tests tidak memerlukan stack Docker. Tidak mengubah keputusan izin DB
atau melewati guard target ketika audit benar-benar dijalankan.

Inspector menggunakan loopback, JWT sintetis dan PostgREST/database lokal nyata;
URL/metadata publikasi fixture sintetis bukan peristiwa Facebook nyata. Ini
LOCAL/INTEGRATION FIXTURE, bukan ChatGPT host, OAuth production atau LIVE.

## Pekerjaan yang masih diperlukan

- PR fokus, review/light CI pada exact head, merge, lalu G4 manual pada SHA main
  hasil merge; izin pelepasan Git sudah diberikan pada tindak lanjut pemilik.
- G4 manual **exact final SHA main**, committed config, source + kedua shard +
  aggregate PASS; tinjau hash/report, inventory DB 46/221, MCP 17/127,
  Inspector 36/36, history/lint/advisors mandiri, audit sebelum/sesudah/akhir,
  satu reset per shard dan cleanup.
- P7-T2 setelah P7-T1: host/runtime/plugin yang benar-benar tersedia dan
  fixture/objek berizin, satu/lima draft bertema, replacement/hard budget,
  readback per draft, partial/resume, error/lost response. Bukti versi, ID,
  revision/hash serta jumlah diminta/terbukti/tersisa masih harus direkam.
  Scripted fixture P6 dan Inspector tidak menggantikan pengujian host tersebut.

## Follow-up G4 setelah PR #119

[PR #119](https://github.com/milyarderpro/content-producer/pull/119) di-merge ke
`main` pada `7e69737f7fcd79a1e7ad0252d74aa6338738fa25` setelah review serta
[light CI 41449141494](https://github.com/milyarderpro/content-producer/actions/runs/41449141494)
PASS exact head `dc0bad6` (53 detik). G4 formal kemudian dijalankan pada exact
SHA merge tersebut:
[run 41449416985](https://github.com/milyarderpro/content-producer/actions/runs/41449416985).

- Source, migration-names, audit-before/after **kedua shard**, MCP **127** serta
  Inspector **36 valid/36 invalid + owner denial** PASS. Ini juga membuktikan
  pin katalog baru cocok pada clean reset Actions masing-masing shard, bukan
  hanya pada stack lokal pembuat pin.
- Kedua command suite DB FAIL (`STAGE_COMMAND_FAILED`); cleanup PASS.
  History/lint/advisors/final audit NOT RUN; aggregate FAIL. Run berlangsung
  sekitar 11m17s; hasil tersebut bukan G4 PASS.
- Tidak ada perubahan source backend/migration/pin dari remediasi lanjutan ini.
  Diagnosis lokal mereproduksi **7 kegagalan dari 54 kasus** pada tujuh file
  inventaris/keamanan lama (157,57 detik). Seluruh kegagalan awal berhenti pada
  assertion jumlah signature 33/34/36, sementara state yang sah sudah 38.
- Rekonsiliasi expected mengikuti CR-053/056: **36 nama/38 signature**, dua
  overload maintenance dengan **empat signature lengkap yang diperiksa exact**,
  dan tiga nama v2 pada allowlist transisi. Daftar nama Read serta Page/plan
  memeriksa kedua duplikasi nama maintenance dan seluruh nama v2 secara tepat.
  Phase 5 operation map tetap inventaris historis 33 nama; hanya allowlist
  acceptance kini diperluas eksplisit. Tidak ada skip, penghapusan assertion
  keamanan, perubahan migration atau pelebaran grant untuk membuat test lulus.
- Pengulangan tujuh file: **6 file/50 kasus PASS**, satu file acceptance masih
  menemukan allowlist operasi yang hanya diperluas sampai P3. Setelah menambah
  tepat `save_post_v2`/`revise_post_v2` dan assertion 36 nama unik, file itu
  diulang sendiri: **1 file/4 kasus PASS** (22,50 detik). Dengan demikian seluruh
  54 kasus fokus memiliki bukti PASS pada source masing-masing yang tidak berubah
  sesudah run relevan; bukan klaim satu run tujuh file final yang belum dilakukan.
- `pnpm run check` final PASS **14 file/156 root + 19 frontend**;
  audit katalog akhir PASS, tanpa sisa fixture dan pin tidak berubah.

Remediasi lanjutan tetap memerlukan PR/light CI dan satu G4 formal pada exact
SHA main final yang baru. P7-T1/P7-T2 tetap belum dicentang; tidak ada deployment,
pemasangan plugin atau business Write production pada pekerjaan ini.
