# Kontrak identitas fakta trivia lintas v1/v2 — P2-T1

**Task:** OpenSpec `simplify-trivia-draft-workflow` checklist **2.1 / P2-T1
(Identitas)**; Issue
[#108](https://github.com/milyarderpro/content-producer/issues/108). **Status:**
desain/acceptance statis, **bukan** implementasi database atau hasil tes
transaksi. **Source/base yang ditinjau:** `main` pada
`b5bbf0de27454c6a1ca6981e98e2eaa59f8060fc` (sama dengan base koordinator saat
pemeriksaan). **Kontrak P1:** [`trivia-draft-v2.md`](trivia-draft-v2.md) dan
[`tool-errors-v2.md`](tool-errors-v2.md), keduanya `cr-053-p1-v1`; fixture
`tests/fixtures/trivia-draft-v2-schema.ts`, `tests/fixtures/trivia-draft-v2.ts`
dan `tests/fixtures/tool-errors-v2.ts`. Dasar keputusan:
[CR-053](../decisions/2026-10-31-cr-053-simplified-trivia-draft-workflow.md),
[design](../../openspec/changes/simplify-trivia-draft-workflow/design.md), [spec
TFL](../../openspec/changes/simplify-trivia-draft-workflow/specs/trivia-fact-library/spec.md),
[spec
TDW](../../openspec/changes/simplify-trivia-draft-workflow/specs/trivia-draft-workflow/spec.md),
serta [PRD](../../plans/simplified-trivia-draft-workflow-prd.md).

**Batas bukti:** inspeksi source, migration berurutan, kontrak dan fixture pada
SHA tersebut; tidak ada query production, migration/backfill, RPC v2, uji race
DB, uji host/LIVE, atau validasi OpenSpec CLI pada artefak ini. Semua ID `F1`,
`F2`, `PA` dan sebagainya di bawah adalah alias sintetis, **bukan** public ID
valid yang dapat dipanggil. Rincian schema tambahan adalah usulan kontrak
implementasi P3, belum DDL yang terpasang; jangan mengartikan opsi teknis
sebagai perubahan keputusan produk.

## 1. Satu identitas canonical dan binding versi

1. **Akar authoritative** tetap `public.trivia_facts` yang sudah ada, bukan
  pustaka v2 paralel. Kunci internal adalah `trivia_facts.id` (`bigint`)
  ditambah `workspace_id` untuk FK/scope; ID eksternal stabil adalah
  `trivia_facts.public_id` (UUID). Public ID ini **persis** `fact_public_id`
  dalam Read/save/revise v2 P1, dan tetap public ID yang sama bagi v1. P3 dapat
  menambahkan proyeksi/kolom katalog pada registry ini, tetapi tidak boleh
  mengganti ID atau mengubah arti row v1. `public.trivia_post_facts.fact_id`
  menunjuk kunci internal yang sama; `public.trivia_post_facts.public_id`
  adalah ID **binding pemakaian**, bukan identitas fakta. Semua lookup mengikat
  `workspace_id` milik owner tervalidasi; UUID yang dikirim caller tidak
  memberi kewenangan lintas workspace.
2. **Pemetaan v1 eksplisit:** untuk setiap row v1 `(workspace_id, id,
  public_id)`, identitas canonical `(workspace_id, id)` dan `fact_public_id =
  public_id` adalah pemetaan satu-ke-satu; tidak ada UUID kedua, remap lossy,
  atau penggantian FK. Apabila implementasi memilih materialisasi tabel
  mapping, kunci unik wajib `(workspace_id, legacy_fact_id)` dan
  `(workspace_id, canonical_fact_id)`, dengan `canonical_fact_id =
  legacy_fact_id` untuk setiap fakta v1; verifikasi `legacy_public_id =
  canonical_public_id` dan tolak benturan (fail-closed). Mapping sebenarnya
  dapat berupa **identity mapping in-place** tanpa tabel tersendiri; pilihan
  itu meminimalkan dual write dan menjaga FK yang sudah dipakai. Untuk fakta
  baru v2, sisipkan pada registry yang sama, bukan menulis salinan v1/v2.
3. **Makna versus representasi:** `claim_text`, `normalized_claim`,
  `claim_hash`, `structured_key`, `structured_hash`, `subject_key`,
  `relation_key`, `object_key`, `numbers`, `qualifiers`,
  `normalization_version`, `ontology_version`, `dedup_review_snapshot` adalah
  data/aturan v1, bukan input wajib atau skema dedup yang diselundupkan ke v2.
  Binding v2 dapat menyimpan representasi `claim_text`, `source_url` dan versi
  kontrak (`content_schema_version = 2`) pada sisi draft/usage v2 tanpa menimpa
  snapshot v1. Bila membutuhkan tabel binding sumber tambahan di P3, FK-nya
  tetap `(workspace_id, fact_id)` ke akar tersebut, dan namespace/versi
  evidence berbeda (`v1` dengan tier/expiry versus `v2` URL minimum).
  URL/timestamp baru adalah referensi riset v2, bukan hasil migrasi metadata
  verification v1; timestamp simpan tidak boleh diklaim tanggal cek URL.
4. **Resolusi same:** ChatGPT memutuskan `same`, `distinct` atau `uncertain`
  berdasarkan makna kandidat yang *ditemukan*; `same` terhadap fakta yang layak
  mengikat ke `public_id` lama. Tidak boleh mendaftarkan ID baru untuk
  menghindari usage/status existing. `distinct` harus mempunyai perbedaan
  proposisi yang material (relasi, angka, qualifier atau objek); subjek sama
  atau URL sama saja bukan bukti `same`. `uncertain`, kandidat wajib yang tak
  terlihat, hasil incomplete atau match `same` yang tidak layak: **ganti
  calon**, bukan mengarang distinct. Dua kandidat dalam satu set yang diketahui
  same tidak boleh lolos bersama. Ketiadaan match berarti hanya **tidak ada
  duplikasi terdeteksi dalam aturan retrieval yang berlaku**, bukan seluruh
  parafrasa sudah ditemukan atau seluruh data lama telah digabung semantik.
5. **Lineage bukan identity merge:** `supersedes_fact_id` menyatakan hubungan
  koreksi/predecessor-successor, bukan izin menghapus atau mengubah identitas
  dan pemakaian predecessor. Successor berbeda makna mempunyai ID baru yang
  berlineage sah; parafrasa yang bermakna sama tetap mengacu pada identitas
  lama bila layak, tidak membuat successor palsu. `invalidated`, `superseded`,
  `rejected` tetap terindeks sebagai history hint walau tidak dapat direuse.

Dasar source: `20261009043307_create_trivia_facts.sql`,
`20261009060516_add_trivia_identity_source_freshness.sql`,
`20261010072439_create_trivia_post_facts_and_usage_snapshots.sql`,
`20261010084550_add_trivia_lineage_reverification_correction_primitives.sql`,
`20261011151632_harden_phase_5_5_fact_resolution.sql`; bentuk retrieval terkini
`20261012124852_materialize_trivia_candidate_input.sql` menggantikan asumsi
implementasi retrieval pertama.

## 2. Matriks status, reservation, usage dan kelayakan v2

Status disimpan/diturunkan pada dimensi **terpisah**; tidak menjadikan `expired`
status `verification_status` yang keenam. `needs_review` tidak berarti verified,
dan v2 tidak boleh memakai bukti v1 yang belum cukup sebagai bukti URL v2.
`verified` v1 juga **bukan** bukti otomatis bahwa URL baru sudah diteliti
ChatGPT.

| Dimensi | State/sumber authoritative | Makna dan keputusan v2 |
| --- | --- | --- |
| Identitas/verifikasi | `trivia_facts.verification_status`: `needs_review`, `verified`, `rejected`, `invalidated`, `superseded` | `verified` dapat dipertimbangkan bila dukungan URL v2, scope, history dan reservation sah. `needs_review` perlu penilaian sumber/meaning yang sah terlebih dahulu; tidak otomatis eligible. `rejected`/`invalidated`/`superseded` adalah **not_eligible**; `same` wajib mengganti calon, bukan memakai ID lama ataupun ID pengelak. |
| Expiry/freshness v1 | `expires_at`, `verified_at`, `freshness_class`, `risk_class`, `source_data` | `expires_at <= clock_timestamp()` dengan status lainnya masih layak adalah **expired-only**, bukan invalidated. v1 tetap mengikuti expiry/tier/sumber lamanya. v2 boleh menggunakan **ID lama** sesudah riset URL baru bila tidak ada blocker status/usage/reservation lain; tanpa memperpanjang, mengganti, atau memalsukan expiry/evidence v1 sebagai v2. |
| Reservasi v1 | `reservation_status`, `reservation_token`, `reserved_for_page_id`, `reserved_until`, `reservation_context`; `internal.trivia_reservation_sets` | `reserved` dengan `reserved_until > clock_timestamp()` tetap **actively_reserved** bagi v2. Token adalah detail privat; Read v2 hanya memberi eligibility aman. Expiry reservation diuji sesudah lock; set historis append-only bukan bukti reservasi masih aktif. Release/expiry menghilangkan penghalang aktif, bukan usage published. |
| Alokasi dan riwayat | `trivia_post_facts`: `allocation_state` (`allocated`, `published`, `released`), `is_current`, `page_id`, `post_id` | `allocated` saat draft/ready adalah penggunaan aktif. `published` (termasuk post `archived`) adalah penggunaan permanen/riwayat yang memblok reuse sesuai scope. `released` tidak memblok alokasi baru tetapi **tetap** audit/history. `is_current = false` merekam binding lama yang dilepas saat revise; jangan menghapus row/snapshot. |
| Eligibility v2 | Derived, **bukan** identitas/status persisten: `eligible`, `page_blocked`, `workspace_blocked`, `actively_reserved`, `not_eligible` | Tentukan dari Page tujuan, status, history pemakaian yang masih menahan scope, dan reservasi terkini di bawah lock; Read adalah pandangan informatif, Write tetap recheck. Tidak menghapus match historis dari Read karena tak layak. |

Prioritas tampilan bila beberapa blocker bersamaan dapat diputuskan P2-T3 tanpa
mengubah fakta bahwa Write menegakkan **seluruhnya**. Tidak boleh menafsirkan
`needs_review` yang belum dipastikan sebagai izin save; jangan menetapkan
transisi status baru yang melanggar constraint v1. Status v2 yang diperlukan
oleh binding/evidence baru harus didefinisikan P3 tanpa memodifikasi
`verification_status` historis secara diam-diam.

## 3. Scope Page dan riwayat non-retroaktif

- Scope diterapkan pada **Page tujuan** dan konfigurasi
  `page_niche_configs.config.fact_reuse_scope` terkini: `workspace_unique`
  menolak alokasi baru bila ID canonical mempunyai penggunaan `allocated` atau
  `published` pada **Page mana pun** dalam workspace; `page_unique` menolak bila
  pemakaian tersebut ada pada **Page tujuan**. Dua Page berbeda dalam workspace
  yang sama dapat menggunakan ID sama di bawah `page_unique`, jika tidak ada
  penghalang lain (termasuk reservasi aktif). Pemakaian di workspace lain tidak
  ditampilkan/digabung secara lintas owner.
- Contoh: Page `PA` `page_unique` lebih dahulu menerbitkan `F1`. Page `PB`
  `page_unique` boleh memakai `F1` untuk alokasi berikutnya, bila seluruh syarat
  lolos; Page `PC` `workspace_unique` **tidak** boleh membuat alokasi baru `F1`
  karena history `PA`. Jika `PB` kemudian mengubah konfigurasi menjadi
  `workspace_unique`, pemakaian `F1` lama yang saat dibuat sah **tidak
  dibatalkan**; hanya alokasi baru diuji ulang. Same-Page uniqueness tetap
  berlaku. Ini sesuai perbaikan terakhir
  `20261012124844_restore_nonretroactive_allocation_reuse.sql` (CR-016), bukan
  perilaku retroaktif dari definisi awal.
- Draft maupun ready `allocated` menghitung penggunaan. Revise yang mengganti
  fakta melepas binding belum terbit: row lama `allocation_state = released`,
  `is_current = false`; fact baru mendapat binding/current sendiri dalam
  transaksi. Discard draft/ready melepas seluruh alokasi current belum terbit
  (`released`); bukan menghapus identitas, snapshots atau riwayat. Reorder yang
  tidak mengganti identitas tidak secara otomatis membuat identitas baru.
  Publication memutasi current `allocated -> published`, archive mempertahankan
  `published` beserta `published_at`; tidak pernah menyulap published menjadi
  released.
- `source_snapshot`, `claim_hash_snapshot`, `verified_at_snapshot`,
  `rendered_text`, post `content_payload`, `generation_snapshot`,
  `approval_snapshot`, editorial/system checks dan `internal.post_write_history`
  mengikuti versi serta saat penulisannya. Perubahan
  verification/correction/source canonical setelah published tidak menulis ulang
  copy, approval, sumber maupun hash snapshot publikasi lama.

Rujukan: `20261010072439_create_trivia_post_facts_and_usage_snapshots.sql`,
`20261011164412_phase_5_6_post_transaction_foundation.sql` (CR-013,
`is_current`, immutable snapshot, `post_allocate_v1`),
`20261012045018_phase_5_7_lifecycle_rpcs.sql` (CR-014), serta
`20261012124844_restore_nonretroactive_allocation_reuse.sql`.

## 4. Backfill idempoten dan write v1 sesudah backfill (kontrak P3)

**Keputusan desain:** gunakan `trivia_facts` sebagai satu akar identity dan
`trivia_post_facts` sebagai satu sumber penggunaan authoritative. Tidak membuat
copy katalog identitas yang harus direkonsiliasi secara asinkron. Pada P3,
materialisasi/proyeksi v2 hanya boleh menjadi indeks/metadata tambahan yang
mengacu pada ID yang sama. Ledger/projection yang ditambahkan merupakan
derivasi, bukan second source of truth.

1. **Backfill additive yang bisa diulang:** dalam transaksi/migration P3 yang
  diotorisasi, baca semua `trivia_facts` per workspace dan `trivia_post_facts`
  termasuk released, non-current dan published. Simpan/derive mapping
  `(workspace_id, id, public_id)`, status/lineage, sumber evidence version dan
  usage per `trivia_post_facts.id`; key unik ID legacy membuat pengulangan
  `INSERT ... ON CONFLICT ... DO UPDATE` *hanya* pada kolom derivasi yang
  berubah, atau `DO NOTHING` untuk identitas tetap. Assert count, FK,
  workspace, duplicate/collision dan fingerprint historis sebelum/akhir;
  divergensi **BLOCKED**, jangan diam-diam overwrite old snapshot. Jangan
  meregenerasi `public_id`, `claim_hash_snapshot`, `source_snapshot`, approval,
  post body, timestamp v1 atau operation ledger. Proyeksi dapat dibangun ulang
  tanpa mengubah authoritative row. Status and reservation existing adalah
  state saat itu, bukan asumsi semuanya available.
2. **No-gap handoff transaksi:** pasang mekanisme sinkronisasi pada **jalur
  write authoritative yang sama**, sebelum/bersama backfill/cutover pembacaan
  v2. Pilihan paling sederhana: Read/reuse v2 langsung membaca
  `trivia_facts`/`trivia_post_facts`/reservasi live di transaksi, sementara
  helper RPC v1 dan v2 memperbarui `catalog_version` workspace **dalam
  transaksi mutasi yang sama**, tanpa cache asynchronous. Bila P3 membutuhkan
  materialized usage/projection, jaga dengan trigger transaksional atau semua
  titik mutasi SQL v1/v2 yang terdaftar di tabel berikut; backfill dilakukan
  setelah hook dipasang, kemudian catch-up pada gate workspace dan audit
  konsistensi sebelum mengizinkan v2 Write. Catch-up bukan job manual berkala.
  Rollback pada mutation membatalkan projection dan kenaikan versi bersama.
  Tidak boleh ada interval saat write v1 committed tetapi Read/reuse v2
  mengabaikannya.
3. **Versi katalog baseline A:** bentuk persistent monotonic counter per
  workspace dapat ditambahkan oleh P3 dengan atomic increment di bawah
  workspace gate pada perubahan relevan identitas baru/identity projection,
  verification/correction/lineage, alokasi/release/publish dan perubahan
  reservation yang memengaruhi eligibility. Rekomendasi menaikkan versi pada
  reservation acquire/release/expiry yang *benar-benar termaterialisasi* juga
  menghindari kandidat stale; keputusan terperinci event-set ada pada P2-T3/P3.
  Read mengambil `catalog_version` dari satu snapshot konsisten;
  `expected_catalog_version` disalin persis (string desimal), dicek pada save
  di bawah workspace gate **sebelum** membuat post/fact/usage. Jika berubah,
  kembalikan `FACT_CATALOG_CONFLICT` dan rollback bisnis; Read ulang, tidak
  otomatis riset ulang URL yang tetap sah. Perubahan tidak terkait pun menolak
  Write stale sesuai **A**; jangan mengaktifkan alternatif B.
4. **Lock dan replay CR-012:** validasi caller/owner/rate/input → klaim
  `internal.operation_ledger` dan replay otorisasi/key/payload identik
  **sebelum lock bisnis** → `internal.trivia_lock_workspace_v1` (workspace `FOR
  NO KEY UPDATE`) → Page/config ascending → slot schedule → plan/item → post
  ascending → advisory identity/lineage ascending → fact ascending → junction
  ascending → mutasi, history dan completion ledger. Lapisan yang tidak dipakai
  dilewati, **tidak dibalik** dan tidak mengambil lock sebelumnya sesudah lock
  berikutnya. Sesudah menunggu, rediscover Page/post/fact dan recheck config,
  token, expiry, status serta CAS. Jangan mengganti gate `FOR NO KEY UPDATE`
  menjadi `FOR UPDATE` karena risiko deadlock lock-upgrade ledger FK. Replay
  sukses operasi identik tidak mengulangi mutasi atau menaikkan versi;
  otorisasi dan validasi replay tetap berlaku. Race/correction harus diuji dua
  urutan commit, bukan hanya `Promise.all`.
5. **Security:** implementasi harus mempertahankan owner OAuth, workspace
  isolation, RLS, minimal execute grants, tidak membuka akses langsung
  `anon`/`authenticated` ke business table/helper, dan tidak mengekspos
  `reservation_token`, `reservation_context`, internal IDs atau ledger dalam
  respons publik. `fact_public_id` hanya hasil lookup owner-scoped. P2-T1 tidak
  menetapkan DDL/grants, cutover atau waktu pensiun v1.

### Peta titik mutasi v1 yang harus diadaptasi/audit P3

| Operasi dan titik source existing | Perubahan yang terlihat dalam registry/versi katalog | Invariant transisi |
| --- | --- | --- |
| `api.trivia_register_and_reserve_facts`; `internal.trivia_resolve_fact_v1` pada `20261011131505_phase_5_5_trivia_registration_reservation_rpcs.sql`, helper `trivia_lock_identities_v1` pada `20261011131503_phase_5_5_trivia_rpc_foundation.sql` | Insert/refreshed canonical row, `verified`, evidence/expiry v1, reserve v1 pada fact rows dan append-only `internal.trivia_reservation_sets` | Pelihara ID lama untuk match; periksa status/lineage/usage bersama, set/token active tanpa membocorkan token pada Read v2; ledger replay tidak mereservasi ulang. P3 audit collision/hash dan izin v1 tetap. |
| `api.trivia_release_facts`, `internal.trivia_release_facts_v1`, `internal.trivia_clear_expired_reservation_v1` | State reservation available/released/expired; histori set tetap | Expiry bukan release usage; idle token lama tak menahan reuse sesudah expiry. Mutasi nyata mengganti eligibility/versi; pemeriksaan time selalu setelah lock. |
| `api.trivia_reverify_fact`, `api.trivia_correct_fact`, `internal.trivia_invalidate_fact_v1`/`internal.trivia_correct_fact_v1`; `20261011131507_phase_5_5_trivia_reverification_correction_rpcs.sql` | Reverify status/evidence/expiry v1; invalidate/supersede + lineage, clear reservation, affected mutable posts | CAS `expected_fact_updated_at`, owner correction, lock affected Page/post sebelum fact; published snapshots immutable. `same` dengan predecessor non-eligible tidak diregister menjadi ID pengelak. |
| `api.save_post`, `api.revise_post`, `internal.post_allocate_v1`, `internal.post_lock_facts_v1` pada `20261011164412_phase_5_6_post_transaction_foundation.sql`/`20261011164415_phase_5_6_post_write_rpcs.sql` | New `allocated`, binding revision `is_current`, released/noncurrent saat replacement, source snapshot | Reuse pada Page tujuan, reservation context dan fact status diperiksa di transaksi; row usage lama retained, no duplicate. P3 tidak mengganti v1 binding schema/replay. |
| `api.discard_post`, `api.mark_post_posted`, `api.archive_post`; `20261012045018_phase_5_7_lifecycle_rpcs.sql` | `allocated -> released`, `allocated -> published`, archive mempertahankan `published`; perubahan visibility usage | Current/history dan snapshot immutable; approval/old evidence untouched; archive tidak melepaskan reuse. `approve_post`/`revoke_post_approval` mengubah lifecycle/approval tetapi tidak membuat penggunaan baru. |
| `api.get_post`, `api.trivia_find_similar_facts`, owner-scoped read projection; `20261011015742_phase_5_2_owner_scoped_read_projections.sql` dan patch `20261011164412_phase_5_6_post_transaction_foundation.sql` | Reader menampilkan identitas/usage snapshot pada scope benar, v2 Read dari canonical state terkini | `get_post` v1 tetap semantik v1, v2 menampilkan status/eligibility tanpa memalsukan source verification; P2-T3 menentukan retrieval/complete, bukan P2-T1. |

Semua perubahan event dan mapping harus diperiksa lagi terhadap migration
terakhir, termasuk
`20261011153430_guard_phase_5_5_identity_and_replay_bindings.sql` dan
`20261012124844_restore_nonretroactive_allocation_reuse.sql`, sebelum P3
menyusun SQL.

## 5. Acceptance sintetis dan traceability

Prakondisi bersama: satu owner/workspace `W`, Page `PA`/`PB`/`PC`, status dan
konfigurasi ditetapkan per skenario **independen**; setiap Read dianggap lengkap
pada versi yang sesuai kecuali disebut sebaliknya. `F1` dkk adalah alias untuk
UUID publik canonical yang sudah ada, bukan nilai UUID. URL
`https://example.org/a` hanya ilustrasi; tidak divalidasi sebagai bukti riset.
Kolom outcome adalah hasil yang **harus dibuktikan pada P3**, **bukan hasil
eksekusi**.

| Kasus; pre-state | Keputusan | Referensi ID; scope Page tujuan | Outcome desain; state/snapshot yang tetap utuh | Requirement |
| --- | --- | --- | --- | --- |
| S01: `F1` v1 verified/eligible; calon parafrasa ditemukan | `same` | **F1**, `PA page_unique` kosong | Bind ID lama, bukan insert F-new; source/snapshot v1 tidak ditulis ulang; tidak mengklaim parafrasa lain semua terdeteksi | TFL-04/07/12 |
| S02: Dua klaim subjek dan URL sama, relasi/angka material berbeda | `distinct` | **F1 vs F2**, `PA page_unique` | F2 baru sah hanya bila bukti beda makna; jangan gabung karena URL/subjek; F1 historis tetap | TFL-04/07 |
| S03: `F1` pernah published lalu invalidated | `same` | F1 **hanya history hint**; `PA` | **Ganti calon**; tidak rebind F1 atau membuat bypass F-new; published/source/approval/lineage utuh | TFL-05/07/11 |
| S04: `F1` superseded oleh F2 dengan perubahan proposisi | `same` dengan predecessor F1 | F1 **not_eligible**; `PA` | Ganti calon, jangan bypass via ID baru; relasi F1→F2, published F1 dan snapshots utuh | TFL-05/07/11 |
| S05: `F1` rejected, belum pernah terpakai | `same` | F1 **not_eligible**; `PA` | Ganti calon, tidak memakai F1 atau menciptakan ID pengelak; status/rejection tetap terlihat | TFL-05/07 |
| S06: `F1` needs_review tanpa review URL v2 yang cukup | `same` | F1, `PA` | Jangan langsung save; evaluasi URL/status sah atau ganti; evidence v1 tetap historis | TFL-05/07/11 |
| S07: `F1` verified v1 tetapi `expires_at` berlalu; **hanya** expiry terhalang | `same` setelah riset URL v2 baru | **F1**, `PA page_unique` kosong | v2 dapat bind F1 tanpa gate expiry v1; expires_at/source_data/snapshot v1 tidak dipoles jadi evidence v2 | TFL-05/07/11/12 |
| S08: `PA page_unique` mempunyai F1 `allocated` draft; `PB page_unique` kosong | `same` | F1 pada **PB** | PB dapat alokasi bila reservation/versi aman; PA tetap allocated, kedua penggunaan sah dan terpisah | TFL-07/10 |
| S09: `PA page_unique` sudah published F1; `PC workspace_unique` kosong | `same` | F1 pada **PC** | Tolak alokasi baru `workspace_blocked`; published PA, sumber dan approval utuh | TFL-05/10/11 |
| S10: `PA` dan `PB` telah sah memakai F1 saat `page_unique`; PB kemudian memilih `workspace_unique` | `same` pada permintaan alokasi **baru** PB/PC | F1; Page tujuan `workspace_unique` | Alokasi baru ditolak; kedua penggunaan lama tidak dihapus/diinvalidasi retroaktif | TFL-09/10/12 |
| S11: `PA` punya F1 `allocated` ready; discard atau revise mengganti F1 ke F2 | `distinct` bagi F2 | F1 dilepas, F2 baru pada `PA` | `released` F1 retained (non-current jika replaced); F2 allocated, draft/ready lama dan snapshots tidak ditulis ulang sebagai published | TFL-10/11/12 |
| S12: F1 published, post kemudian archived | `same` | F1 pada `PA` atau `PC workspace_unique` | Tetap `page_blocked`/`workspace_blocked`; archive tidak release, published/approval/snapshot immutable | TFL-05/10/11 |
| S13: F1 sedang direservasi v1 pada PA, token belum expired; v2 hendak save pada PB | `same` | F1, **PB page_unique** | `actively_reserved`; v2 gagal tanpa post parsial; set historis v1/token privat tetap; setelah release/expiry, Read baru dan recheck | TFL-09/10/12 |
| S14: backfill mapping F1 dan usage v1 selesai, lalu write v1 register/reserve, correction atau publish | `same` pada next Read | **F1**, seluruh Page `W` | v2 langsung melihat ID/status/usage/reservation baru dan versi katalog berubah secara commit-atomik; rerun backfill tidak menduplikasi; old snapshots utuh | TFL-04/09/10/11/12 |
| S15: v2 Read versi 42, v1 mengalokasi F2 (atau koreksi F1) lalu v2 save dengan expected 42 | `same`/distinct sesuai Read lama | F1/F2, `PA` | `FACT_CATALOG_CONFLICT`, rollback seluruh post/fact/junction baru; Read ulang sebelum percobaan baru; tidak otomatis riset URL ulang bila tetap sah | TFL-09/10/12 |
| S16: dua calon dalam set final adalah parafrasa sama, atau hasil makna `uncertain` | `same` internal set / `uncertain` | F1, `PA` | Ganti satu/keduanya; jangan kirim duplikasi atau memaksa distinct. Riwayat F1 tidak berubah | TFL-04/07 |
| S17: v1 `trivia_release_facts` atau expiry setelah backfill, dan F1 tidak punya usage | `same` pada Read baru | F1, `PB page_unique` | Reservation blocker lenyap transaksional; `internal.trivia_reservation_sets` immutable dan ledger replay tetap; ID F1 unchanged | TFL-09/10/12 |
| S18: v2 memperbarui URL untuk F1 makna sama; correction owner invalidate F1 setelah publikasi | `same` saat update URL, kemudian `same` calon baru terhadap invalidated | F1 history; `PA` | URL evidence v2 terikat F1, correction menjadikannya not eligible; calon baru diganti; published v1/v2 tidak ditulis ulang | TFL-05/07/11/12 |

**Keterlacakan TDW:** S01–S07 dan S16 mendukung keputusan dedup final untuk
`TDW` save/revise; S08–S15 dan S17 menguji prasyarat alokasi/save atomik, CAS,
conflict, rollback dan per-item draft isolation pada `TDW` save/revise, tanpa
menjalankan save v2. S11/S12/S18 menyentuh lifecycle approval/publish hanya
untuk **pelestarian history**, bukan implementasi Setujui. Lihat [spec
TDW](../../openspec/changes/simplify-trivia-draft-workflow/specs/trivia-draft-workflow/spec.md)
untuk nomor requirement normatif sebelum menulis focused tests. Fixture P1
`single.findResponse` mengandung history invalidated; penggantian status
superseded/rejected dan negative-controls dievaluasi pada
`tests/trivia-draft-v2-contracts.test.ts`. Test database v1 yang menjadi titik
perluasan: `supabase/tests/database/trivia-identity-and-source.test.ts`,
`trivia-lineage-and-reverification.test.ts`,
`trivia-reservation-and-reuse.test.ts`, `trivia-post-facts.test.ts`,
`api-trivia-facts.test.ts`, `api-trivia-correction.test.ts`,
`api-trivia-concurrency.test.ts`; helper
`supabase/tests/database/helpers/trivia-rpc.ts`. **Tidak satu pun skenario
S01–S18 dinyatakan DB PASS**.

## 6. Batas kerja dan handoff

- **P2-T2**: susun dataset berlabel parafrasa/salah-gabung termasuk historic,
  invalidated/superseded/rejected dan proposisi mirip berbeda; tetapkan ambang
  **sebelum** evaluasi. P2-T1 tidak menetapkan retrieval recall atau threshold.
- **P2-T3**: bekukan aturan kandidat wajib/limit/`complete`, `catalog_version`
  dan snapshot Read, event-set yang menaikkan versi (termasuk
  reservation/expiry), serta prioritas eligibility bila blocker bertumpuk.
  Pertahankan baseline **A**; protokol pembanding B bukan izin mengaktifkan B.
- **P3-T1**: rancang additive DDL, FK/unique/index, mapping identity in-place,
  proyeksi evidence versi v2, serta backfill idempoten dan audit row-level;
  tandai ambiguity/collision/legacy source outlier sebagai blocker data, bukan
  silent merge. Jangan menerbitkan migration sebelum review desain P2.
- **P3-T2**: adaptasi seluruh mutator v1 yang didaftar di §4 dengan hooks
  transaksional/no-gap, catalog version dan replay-safe update; buktikan
  cross-version races, old-v1 write after backfill, expiry/release, correction
  dan immutable snapshot pada fixture isolated. Save/revise v2 dan retrieval
  terperinci tetap task pemiliknya, bukan selesai melalui dokumen ini.

Tidak ditentukan di sini: dataset/threshold, cutover, observasi, rollback rilis,
pensiun v1, rilis D1 sebelum D2 atau perubahan keputusan produk. Bila audit P3
menemukan bahwa pemetaan tidak dapat mempertahankan FK/public ID/snapshot atau
urutan lock tanpa mengubah kontrak accepted, **hentikan perubahan terkait dan
ajukan keputusan terpisah**, jangan mengedit CR-053/P1/spec/expected test untuk
menyesuaikannya.
