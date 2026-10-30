# Issue #95 — profil hotspot database dan pilihan optimasi G2-T3

**Status:** profil diagnostik diterima; optimasi transport Issue #95 di bawah
menjadi draft PR fokus. Basis source `01531fc8dc7bb1e6f9365525b7324a8fc9686b28`
(`main`, 30 Oktober 2026).
Satu run profil serial lokal **PASS** pada salinan source kandidat dengan hanya
`project_id` dan port config runtime sementara diganti untuk isolasi. Ini bukti
**lokal/diagnostik**, bukan exact-SHA Actions atau full gate baru. Pembanding
Actions exact-SHA ialah [run #41011838448](https://github.com/milyarderpro/content-producer/actions/runs/41011838448),
yang sudah PASS sebelum profil ini; CR-020/044 dan [matriks G1](invariant-matrix.md)
tetap berlaku. Tidak ada profil kedua, full gate tambahan, atau deployment.

## Metode, isolasi, dan batas pengukuran

- Worktree analisis `codex/issue-95-db-hotspot-profile` dibuat dari SHA di atas;
  checkout pengguna yang sudah ada tidak disentuh. Profil memakai `git archive`
  dari SHA yang sama ke `/tmp/issue-95-db-profile-20261030/runner`. Hanya config
  salinan ini memakai `project_id=issue-95-db-profile-20261030` dan port
  `61320..61329`; source test/fixture identik dengan kandidat. Tidak ada metadata
  linked project. Stack DB divalidasi pada nama, network, volume, port `61322`,
  dan status running sebelum reset. Setelah run, stack/volume sementara dihapus;
  stack pengguna `content-producer` pada port `54321/54322` tetap ada.
- Supabase CLI `2.120.0`, Node `24.15.0`, pnpm `10.33.2`; bantuan CLI `start`,
  `db reset`, dan `stop` diperiksa. Satu start dan satu `db reset --local` pada
  stack sementara, lalu satu `vitest run --config vitest.database.config.ts`
  dengan `fileParallelism: false`, 41 file manifest. Tidak ada Inspector/MCP,
  advisor, audit gate, atau source check dalam run profil ini.
- Waktu file berasal dari reporter Vitest. Wrapper proses sementara pada PATH
  hanya menghitung durasi `pnpm exec supabase db query` dan `docker exec ... psql`;
  argumen SQL, JWT, kredensial, stdout/stderr mentah tidak dicatat. Wrapper
  menambah sedikit overhead proses, sehingga angka ini diagnostik. Durasi proses
  asinkron dapat tumpang tindih; jumlah waktu proses **tidak** sama dengan waktu
  dinding yang dapat dihemat.

| Tahap lokal                      |                            Hasil |                   Durasi |
| -------------------------------- | -------------------------------: | -----------------------: |
| Start stack sementara            |                             PASS |                 83,242 s |
| Satu clean reset lokal           |                             PASS |                 42,573 s |
| Suite database serial            | **41/41 file, 182/182 tes PASS** | **929,807 s (15m29,8s)** |
| Jumlah waktu file di reporter    |                          41 file |                920,111 s |
| Selisih startup/reporting Vitest |                                — |          sekitar 9,696 s |
| Cleanup stack sementara          |                             PASS |        tidak diprofilkan |

Run Actions kandidat yang sudah ada mencatat total **15m48s**, tahap database
**642,960 s**, Inspector **104,340 s**, start **91,353 s**, reset **31,369 s**.
Angka lokal tidak boleh ditempel langsung sebagai prediksi Actions: hardware,
cache, rate limit, dan jadwal race berbeda.

## Hotspot file dan biaya proses query

| Peringkat | File                                     | Tes |    Lokal | Cakupan dominan                                                    |
| --------: | ---------------------------------------- | --: | -------: | ------------------------------------------------------------------ |
|         1 | `api-plan-lifecycle.test.ts`             |  12 | 72,073 s | Claim/renew/fail/retry/cancel, replay token, owner, rollback, busy |
|         2 | `api-trivia-public-gold.test.ts`         |   2 | 65,080 s | 105 development + 45 holdout pasangan lewat RPC owner              |
|         3 | `api-post-lifecycle-concurrency.test.ts` |   6 | 65,059 s | Dua sesi, dua urutan commit, lock, CAS, replay, cancel/busy        |
|         4 | `api-post-lifecycle.test.ts`             |   8 | 61,229 s | Lima transisi, v6/v7 replay, rollback, publication                 |
|         5 | `api-post-approval-quality.test.ts`      |   9 | 52,880 s | Waiver, source/freshness, stale evidence, approval                 |
|         6 | `api-page-plan-writes.test.ts`           |  18 | 52,240 s | Tiga write RPC Page/config/plan dan race slot                      |
|         7 | `api-batch-b-remediation.test.ts`        |   8 | 43,191 s | Reuse lintas Page, profil, legacy v1, race A/B                     |
|         8 | `api-plan-concurrency.test.ts`           |   8 | 33,696 s | Claim/lease/cancel terpisah sesi                                   |
|         9 | `trivia-candidate-retrieval.test.ts`     |   6 | 31,983 s | Helper kandidat privat, fixture gold/holdout/checksum              |
|        10 | `api-security-kernel.test.ts`            |   8 | 31,787 s | Role, RLS/grant, JWT, ledger dan rate limit                        |

Lima teratas berjumlah **316,321 s**, sekitar **34,0%** suite lokal; sepuluh
teratas **509,218 s**, sekitar **54,8%**. Itu batas atas penghapusan _seluruh_
file, bukan penghematan yang sah: tiap file menjaga invariant unik di bawah.

| Proses selama satu suite         | Jumlah | Total waktu proses |   Median |      p95 |
| -------------------------------- | -----: | -----------------: | -------: | -------: |
| `supabase db query` melalui pnpm |    133 |          207,339 s | 1.066 ms | 5.492 ms |
| `docker exec ... psql`           |  5.426 |          803,569 s |    92 ms |   248 ms |

Total proses **1.010,908 s** melebihi wall suite karena proses race berjalan
bersamaan dan satu proses dapat memanggil proses lain. Jangan menjumlahkan
potensi penghematan kedua baris. Sebanyak 133 panggilan CLI masih ada terutama
pada tes schema/fixture lama (`pages-and-page-niche-configs`,
`operation-ledger-and-rate-limit-buckets`, `workspaces-and-niches`,
`trivia-candidate-retrieval`, dan sejenisnya). Prior Issue #76 mengukur 76
panggilan CLI 118,101 s menjadi 77 sesi psql 17,889 s; Issue #78 mengukur 74
panggilan 74,981 s menjadi 74 sesi psql 8,721 s. Dengan rentang historis
sekitar **0,9–1,3 s per panggilan**, migrasi 133 panggilan tersisa memberi
**perkiraan proses 120–173 s**, batas keras 207,339 s pada run ini. Perkiraan
wall suite lebih hati-hati **90–150 s** karena tumpang tindih, SQL mahal, dan
overhead wrapper; belum terbukti pada Actions. Adapter harus menjaga koneksi
lokal tervalidasi, sesi independen, role/JWT `set local`, kode error, JSON/null,
dan redaksi seperti perubahan #76/#78. Pangkas peluncuran proses, bukan
assertion atau fixture.

`api-trivia-public-gold` menjalankan sekitar empat panggilan psql per pasangan
(insert, dua RPC untuk repeatability, delete) pada 150 pasangan. Batched transport
berpotensi mengurangi sebagian dari 65 s, tetapi satu transaksi/sesi untuk semua
pasangan belum setara dengan sesi terpisah sekarang. Kecuali desain mempertahankan
dua panggilan RPC, identitas owner, isolasi tiap pasangan, urutan, error per
`fixture_id`, dan cleanup, penghematan **0 s yang boleh dihitung**. Demikian pula
`pg_sleep` dan wait lock dalam file concurrency adalah bagian bukti race; tidak
boleh dipotong sebagai optimasi waktu.

## Audit tumpang tindih: pemetaan kasus lama → penjaga yang tetap berjalan

Tabel berikut memetakan calon pengganti yang tampak serupa. Semua **ditolak
sebagai usulan penghapusan saat ini** karena assertion/fixture/session yang
hilang tercantum eksplisit. Karena itu penghematan aman dari penghapusan tes
**0 s** pada kandidat ini. `role/JWT` di bawah berarti `authenticated` dengan
claims owner/client yang dipasang helper kecuali disebut lain. Tiap row tetap
memerlukan tes PASS pada SHA yang sama bila kelak dirancang ulang.

| Kasus lama → calon penjaga                                                                                                                              | Fixture, role/JWT, sesi, status/error, invariant dan celah                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |                 Keputusan/hemat sah |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------: |
| `api-plan-lifecycle` `CORE-001/002` replay kosong dan 1/2/3 claim → `api-plan-concurrency` `CON-PLAN/REPLAY`                                            | Keduanya fixture plan owner OAuth; yang lama satu sesi per RPC, menyimpan token awal sesudah renew, expire, reclaim, fail, cancel, lalu menuntut `PLAN_ITEM_CLAIM_MISMATCH`, empty replay dan ledger tanpa token bocor. Calon memakai dua sesi worker dan duplicate key, menuntut satu mutasi/dua item berbeda. Sesi race tidak membuktikan seluruh status dan snapshot token lama; kasus lama juga tidak membuktikan race.                                                                                                                                                                                                                                                                                                                                                             |                **Tetap wajib; 0 s** |
| `api-trivia-public-gold` development/holdout → `trivia-candidate-retrieval` development/frozen holdout                                                  | Sama-sama 150 fixture dedup-v1, tetapi lama menjalankan 105/45 pasangan melalui `api.trivia_find_similar_facts` dengan JWT owner dalam transaksi terpisah, dua hasil identik, sinyal `exact_claim`/`exact_structured`, anti-merge, tanpa `source_overlap`. Calon menguji helper privat lewat SQL admin serta provenance, checksum dan canonical uniqueness. Jalur publik/role dan status sukses per pasangan tidak terganti; helper privat/checksum juga tidak terganti oleh publik.                                                                                                                                                                                                                                                                                                    |       **Keduanya tetap wajib; 0 s** |
| `api-post-lifecycle-concurrency` `CON-LIFECYCLE`, `CON-FACT-APPROVAL`, `CON-REPLAY`, `DATABASE-BUSY` → `api-post-lifecycle` `RPC-LIFE`, rollback/replay | Fixture post+fact owner OAuth sama, tetapi lama memakai holder/waiter **dua sesi** dan dua urutan commit; menuntut `REVISION_CONFLICT`/`DATABASE_BUSY`, satu winner, lock identity, tidak ada partial write, dan replay key sama setelah cancel. Calon satu sesi per call serial menguji kelima transisi, v6/v7 immutable history dan rollback fault. Serial tidak menjaga race; race tidak menjaga seluruh riwayat v1.                                                                                                                                                                                                                                                                                                                                                                 |       **Keduanya tetap wajib; 0 s** |
| `api-post-approval-quality` `RPC-APPROVAL all-pass` → `api-batch-b-remediation` `P2-01 fresh all-pass`                                                  | Keduanya fixture 7 fakta `fast_trivia`, owner JWT, tanpa sesi race, jalur `save_post` → `approve_post` sukses. Lama memakai delapan kata per fakta dan memeriksa 65 kata, `WAIVER_NOT_ALLOWED` bila ID warning tidak aktif, `VALIDATION_FAILED` untuk alasan tanpa warning, `accepted_warning_ids=[]`, alasan `null`, lalu `posted`. Calon memakai 7×8 kata dan memeriksa `pending` sebelum approval, `ready` lalu revision kembali `draft`, approval snapshot null, replay save/revise; tidak memeriksa kedua error atau metadata null dan tidak publish. Menghapus lama sekarang kehilangan assertion itu. Penggabungan kelak harus memindahkan semuanya ke skenario dengan fixture teks setara dan tetap membuktikan publish tanpa mengganggu revision; biaya tambahan belum diukur. | **Tetap wajib; hemat terbukti 0 s** |
| `api-post-lifecycle` `RPC-LIFE`/rollback/v6-v7 → `api-batch-b-remediation` `P1-01`/`P2-01`                                                              | Fixture sama-sama post/fact owner JWT, tanpa race pada kasus pertama. Lama menjaga semua binding, provenance, lima transisi dan replay v6/v7 plus fault rollback dan `INTERNAL_ERROR`; calon menjaga reuse lintas Page, status `pending` dan exact replay save/revise. Kasus legacy normalization lain di file calon juga tidak menutup seluruh transisi/history.                                                                                                                                                                                                                                                                                                                                                                                                                       |                **Tetap wajib; 0 s** |
| `pages-and-page-niche-configs` satu kasus direct table → `api-page-plan-writes` `AC-002`, `SEC-5.3`, `update_page`                                      | Lama membuat **dua workspace, tiga Page, niche development kedua** via SQL admin (tanpa JWT), menuntut constraint SQL/foreign key/default partial unique, slug sama lintas workspace, RLS, dan tidak ada direct grant. Calon memakai RPC owner JWT, satu workspace dengan tiga config, error `PAGE_VERSION_CONFLICT`/`OWNER_ACCESS_REQUIRED` dan atomic ledger. RPC tidak membuktikan constraint direct SQL maupun niche kedua; optimasi adapter boleh, penghapusan tidak.                                                                                                                                                                                                                                                                                                              |                **Tetap wajib; 0 s** |
| `api-page-plan-writes` catalog 33 RPC → `api-phase-five-acceptance` `SEC-*`, `api-security-kernel` catalog, audit katalog gate                          | Semuanya introspeksi admin tanpa JWT/race. Audit dan kedua case menjaga 33 fungsi, grant caller, RLS/ACL; kasus lama juga memeriksa daftar nama 33, owner `SECURITY DEFINER`/`search_path`, `api_owner_create=false`, direct grant khusus Page/item. Belum ada pemetaan assertion satu-per-satu pada calon untuk semua field itu. Bahkan jika lengkap, satu query katalog pada file yang tetap berjalan hanya menghemat sekitar **0,1–1 s**, bukan 52 s durasi file.                                                                                                                                                                                                                                                                                                                    |       **Tetap wajib sekarang; 0 s** |
| `operation-ledger-and-rate-limit-buckets` direct SQL → `api-security-kernel`/`api-plan-lifecycle` replay                                                | Fixture lama dua workspace + rate actor via SQL admin, tanpa JWT, menuntut constraint UUID v4/hash, unique scoped key, bucket checks dan SQL constraint error. Calon owner JWT melalui RPC menuntut `OPERATION_KEY_REUSED`/`RATE_LIMITED` dan rollback. Error SQL dan constraint dasar tidak ditutup oleh respons RPC.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |                **Tetap wajib; 0 s** |

Dengan demikian tidak ada penghapusan/merge yang memenuhi pemetaan lengkap
`fixture + role/JWT + sesi + status/error + invariant` pada source saat ini.
Waktu lima file terlama **bukan** target pemangkasan yang bisa diklaim. Tes
`api-plan-lifecycle`, kedua gold/private helper, kedua lifecycle serial/race,
`api-post-approval-quality`, direct schema/ledger, serta performance p95 dan
source diagnostics mempunyai cakupan unik dan **tetap wajib**. Khusus performance,
`api-trivia-populated-performance` menjaga p95 pada 5.001 fakta dan planner
normal; `api-phase-five-acceptance` menjaga p95 read/write metrics. Memindahkan
atau menghapusnya karena variansi waktu akan menghilangkan kontrak performa.

## Rancangan dua shard database Actions yang terisolasi

Ini **rancangan**, bukan perubahan workflow atau hasil run dua shard. Dua job
`ubuntu-24.04` terpisah checkout exact SHA dan hash manifest/lock/input yang
sama. **Masing-masing** memulai stack Supabase sendiri di VM sendiri, satu clean
reset dari 72 migration, fixture sendiri, dan audit final kebersihan state.
Tidak ada dua file berjalan paralel pada satu database bersama; setiap shard
menjalankan daftar file serial (`fileParallelism: false`). Job A menjalankan
MCP/Inspector dan pemeriksaan backend non-DB yang wajib. Job B mengulang
validasi migration history, lint, local security advisors dan audit pada stack
sendiri. Aggregate mewajibkan kedua PASS, jumlah file **41 unik**/tes **182**,
manifest hash/lock/input/SHA identik dan tidak ada skipped/missing; kegagalan
satu shard menggagalkan gate. Source job tetap independen seperti kandidat kini.

Pembagian indikatif _longest processing time first_ dari **durasi lokal**:

| Shard | File | Total lokal | Isi utama                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----- | ---: | ----------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A     |   20 |   460,073 s | `api-plan-lifecycle`, `api-post-lifecycle`, `api-page-plan-writes`, `api-plan-concurrency`, `trivia-candidate-retrieval`, `pages-and-page-niche-configs`, `api-post-concurrency`, `api-metrics`, `api-trivia-correction`, `api-trivia-concurrency`, `api-metrics-concurrency`, `api-metrics-insights`, `trivia-reservation-and-reuse`, `api-read-rpcs`, `baseline`, `api-trivia-source-diagnostics`, `content-plans-and-plan-items`, `trivia-post-facts`, `trivia-facts-schema`, `trivia-audit-remediation`                                                                                                                 |
| B     |   21 |   460,038 s | `api-trivia-public-gold`, `api-post-lifecycle-concurrency`, `api-post-approval-quality`, `api-batch-b-remediation`, `api-security-kernel`, `api-post-reschedule`, `operation-ledger-and-rate-limit-buckets`, `api-post-save-revise`, `api-post-render-quality`, `api-trivia-facts`, `workspaces-and-niches`, `api-phase-five-acceptance`, `api-trivia-populated-performance`, `trivia-lineage-and-reverification`, `core-primitives-and-validators`, `api-source-evidence-mcp-compat`, `final-remediation`, `posts-and-post-metrics`, `trivia-identity-and-source`, `oauth-resource-audience-hook`, `phase-5-operation-map` |

Ini partition file, bukan izin memindahkan kepemilikan invariant. Seluruh input
fixture disalin ke tiap job; output evidence berlabel shard agar tidak saling
menimpa. `phase-5-operation-map` yang diimpor acceptance tetap di B. Karena
rate limit berbasis menit dan race memakai sesi/lock, keseimbangan Actions bisa
bergeser; gunakan timing Actions kandidat final untuk memvalidasi, bukan
mengasumsikan selisih lokal 35 ms akan tetap berlaku.

Model dari run Actions: database 642,960 s dibelah proporsional menjadi
**sekitar 321,5 s per shard**. Bagian backend selain database saat ini
`948 - 642,960 ≈ 305 s`, sehingga lintasan kritis A diperkirakan
`305 + 321,5 ≈ 626,5 s` (**10m27s**) ditambah sekitar 0–20 s aggregate.
Penghematan wall terhadap 15m48s ialah **sekitar 5m01–5m21**; tanpa optimasi
query, target ≤10m **belum terjamin**. B memerlukan start+reset sendiri
(`91,353 + 31,369 ≈ 123 s`) serta history/lint/advisor/audit/checkout;
sekitar 180–240 s overhead tambahan pada job B. Jumlah waktu proses database
yang dijalankan tetap 643 s bila skala linier, sehingga biaya compute bertambah
sekitar **3–4 menit runner**, atau **sekitar 3–5 menit tertagih** setelah
pembulatan per job dan variasi setup. Jika seluruh MCP/Inspector juga diulang
di B, biaya tambahan mendekati 5 menit tanpa manfaat cakupan yang jelas.

Jika perbaikan transport 133 query menghasilkan penghematan Actions yang
setara **60–120 s pada tahap database** dan terbagi cukup rata, lintasan A
turun kira-kira 30–60 s menjadi **9m27–9m57s** sebelum aggregate. Ini
_skenario_, bukan hasil ukur; 60–120 s belum dibuktikan di Actions dan
ketimpangan shard dapat menghapus margin. Target proyek hanya dapat dinyatakan
tercapai sesudah G4 exact-SHA dan tiga run Actions pada kandidat final.

## Kesimpulan untuk pemilihan satu PR optimasi

1. Prioritas berbasis bukti: kurangi 133 proses CLI yang tersisa sambil menjaga
   seluruh kasus/assertion dan sesi; uji khusus error/JSON/JWT/target DB yang
   terdampak. Sumber potensi penghematan lokal: sekitar 90–150 s wall suite,
   belum terverifikasi pada Actions.
2. Dua shard berstack dan fixture terpisah adalah pilihan struktural terbesar:
   estimasi hemat 5 menit wall dengan tambahan 3–5 menit CI tertagih; masih
   membutuhkan penghematan query dan pembuktian G4 untuk target ≤10m.
3. Tidak ada tes yang direkomendasikan untuk dihapus sekarang: hemat aman
   **0 s**. Kasus yang tampak mirip di atas berbeda pada role, fixture, sesi,
   error, atau invariant. File ownership PR terintegrasi dapat dibagi menurut
   adapter CLI lama, helper/transport psql, dan runner/workflow dua shard,
   tetapi satu pemilik integrasi harus menjaga manifest 41 file serta matriks
   G1/CR-020/044 sebelum cutover.

## Implementasi dan bukti fokus Issue #95

Implementasi ini mengganti transport **semua 133** panggilan `supabase db query`
pada 16 file milik Issue #95. `local-query.ts` menerima SQL hanya lewat stdin
`docker exec -i <ID tervalidasi> psql`, lalu mengembalikan hasil mentah,
`row_to_json` per baris, atau kode proses sesi asinkron. Resolver yang semula
di `plan-lifecycle.ts` dipakai bersama tanpa mengubah aturan validasinya:
`project_id`, port konfigurasi, ID 64 digit heksadesimal, nama container,
status running, network, volume, dan binding port harus cocok **sebelum SQL**.
Error hanya boleh menyebut `SCHEDULE_CONFLICT`, identifier constraint SQL yang
terbatas, atau kode gagal generik; SQL, nilai, JWT, stdout, dan stderr mentah
tidak diteruskan. Sesi race tetap proses/koneksi psql independen. Satu
`supabase status --output json` di `baseline` tetap memakai CLI karena menguji
status stack, bukan query DB; tidak ada panggilan `supabase db query` runtime
yang dibiarkan.

Seluruh bagian `describe(...)` dalam 16 file identik byte-for-byte dengan
baseline SHA, termasuk fixture, role/JWT, sesi race, status/error, assertion,
dan cleanup. Sebanyak **122** pemanggilan `expect` TypeScript dan assertion
`DO $$` tetap sama; **26/26** kasus tidak ditambah, dihapus, atau diubah
expected-nya. Query hasil baris memakai `row_to_json`, menjaga boolean,
angka, JSON bersarang, dan `null`; hasil dan constraint penting dibuktikan
oleh kasus langsung. Error race `SCHEDULE_CONFLICT` tetap terbaca.

| Bukti lokal pada 30 Oktober 2026        | Sebelum, profil 41 file yang diterima | Sesudah, 16 file serial |
| --------------------------------------- | ------------------------------------: | ----------------------: |
| File/kasus yang relevan                 |                                 16/26 |          **16/26 PASS** |
| Jumlah waktu reporter untuk 16 file     |                             155,486 s |                       — |
| Wall run fokus, termasuk startup Vitest |                                     — |                52,711 s |
| `supabase db query` melalui pnpm        |                                   133 |                   **0** |
| `docker exec … psql` pengganti          |                                     — |    133; 46,227 s proses |

Selisih konservatif antara jumlah waktu file sebelumnya dan wall run fokus
sesudahnya ialah **102,775 s (≈1m43s; 66,1%)**. Ini perbandingan diagnostik
lintas dua run: baseline berasal dari 16 file di dalam run serial 41 file,
sedangkan sesudah dari run fokus mandiri dengan startup termasuk di angka.
`207,339 - 46,227 = 161,112 s` adalah selisih jumlah waktu proses transport,
**bukan** penghematan wall; sesi race tumpang tindih. Penghematan di Actions
dan pada full gate belum diukur, sehingga angka 90–150 s di atas tetap
perkiraan, bukan janji.

Tes sesudah memakai satu salinan source dengan `project_id`
`issue-95-db-transport-20261030` dan port `61420..61429`, terpisah dari stack
pengguna. Satu start, validasi target ID, satu clean `db reset --local`, dan
tepat 16 file manifest milik PR berjalan serial (`fileParallelism: false`);
tidak ada run ulang 41 file atau full gate. Setelahnya `supabase stop
--project-id issue-95-db-transport-20261030 --no-backup` berhasil dan tidak
tersisa container maupun volume berlabel project itu. Empat uji negatif
terisolasi dengan Docker tiruan membuktikan port, network, nama target, dan
ID container yang salah berhenti pada `inspect` tanpa `exec`/SQL. Dua uji
redaksi membuktikan teks error/nilai tidak bocor, sambil mempertahankan nama
constraint yang memang diassert. Setelah pengetatan redaksi, dua file yang
bergantung pada error (`core-primitives-and-validators` dan
`operation-ledger-and-rate-limit-buckets`) PASS lagi pada stack tersebut.

`pnpm run check` PASS (format, ESLint, TypeScript, tes root 85/85, frontend
typecheck/build/19 tes). Pemeriksaan format file fokus dan `git diff --check`
PASS. Ini bukti CI lokal/fokus, **bukan** PASS Actions atau G4 exact-SHA.
