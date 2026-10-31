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
SHA tersebut; status/instructions apply OpenSpec dibaca, bukan bukti acceptance
resmi atau validasi runtime. Tidak ada query production, migration/backfill,
RPC v2, uji race DB atau uji host/LIVE. Semua ID `F1`,
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
   mengganti ID atau mengubah arti data v1. Constraint/validator perlu dibuat
   version-aware melalui migration additive sesuai §1.1–1.3;
   schema existing belum dapat menerima fakta v2-native. `public.trivia_post_facts.fact_id`
   menunjuk kunci internal yang sama; `public.trivia_post_facts.public_id`
   adalah ID **binding pemakaian**, bukan identitas fakta. Semua lookup mengikat
   `workspace_id` milik owner tervalidasi; UUID yang dikirim caller tidak
   memberi kewenangan lintas workspace.
1. **Pemetaan v1 eksplisit:** untuk setiap row v1 `(workspace_id, id,
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
1. **Makna versus representasi:** kalimat canonical dan normalisasi/hash teks
   deterministik adalah lapisan identity bersama; `structured_key`,
   `structured_hash`, `subject_key`, `relation_key`, `object_key`, `numbers`,
   `qualifiers`, `ontology_version`, serta evidence/review v1 adalah envelope
   versi opsional pada identitas itu. V2 tidak merakit ontologi tersebut.
   Snapshot binding memakai versi konten post, bukan versi asal fakta; fakta
   yang lahir di v1 dapat mempunyai binding v2, dan sebaliknya hanya setelah
   evidence v1 yang benar tersedia. URL/timestamp simpan v2 bukan metadata
   verification v1 atau tanggal pemeriksaan URL.
1. **Resolusi same:** ChatGPT memutuskan `same`, `distinct` atau `uncertain`
   berdasarkan makna kandidat yang _ditemukan_; `same` terhadap fakta yang layak
   mengikat ke `public_id` lama. Tidak boleh mendaftarkan ID baru untuk
   menghindari usage/status existing. `distinct` harus mempunyai perbedaan
   proposisi yang material (relasi, angka, qualifier atau objek); subjek sama
   atau URL sama saja bukan bukti `same`. `uncertain`, kandidat wajib yang tak
   terlihat, hasil incomplete atau match `same` yang tidak layak: **ganti
   calon**, bukan mengarang distinct. Dua kandidat dalam satu set yang diketahui
   same tidak boleh lolos bersama. Ketiadaan match berarti hanya **tidak ada
   duplikasi terdeteksi dalam aturan retrieval yang berlaku**, bukan seluruh
   parafrasa sudah ditemukan atau seluruh data lama telah digabung semantik.
1. **Lineage bukan identity merge:** `supersedes_fact_id` menyatakan hubungan
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
implementasi retrieval pertama. Semua nama migration di dokumen ini relatif ke
[`supabase/migrations/`](../../supabase/migrations/).

### 1.1 Celah schema existing dan strategi yang direkomendasikan

Sekadar menambah binding URL tidak cukup. Migration create fact mewajibkan
ontologi `NOT NULL`, `source_data` 1–8 sumber, review v1, serta verified shape
dengan `verified_at`/`expires_at`. Trigger identity/source/freshness semula
memanggil `internal.trivia_validate_fact_row_v1`; migration
`20261009075733_remediate_batch_a_audit_findings.sql` lalu
`20261009113820_finalize_batch_a_contract_remediation.sql` menggantinya dengan
`internal.trivia_validate_fact_row_v2`. Helper `_v2` itu **tetap validator
evidence produk v1** (termasuk tier/type, qualifier arah, sumber dan expiry),
bukan dukungan workflow CR-053 v2. Status `needs_review` tidak melewati validasi
ontologi/source tersebut.

**Rekomendasi: perluas akar existing secara version-aware, dengan envelope v1
opsional dan evidence v2 terpisah yang dependent pada akar yang sama.**
Pertahankan seluruh ID/FK/data lama in-place. Tambahkan discriminator kehadiran
envelope v1 yang ditetapkan server, bukan satu switch eksklusif “fact v1 atau
v2”: satu fakta dapat mempunyai keduanya. Envelope v1 tetap memakai kolom
existing agar data dan pembaca historis tidak perlu dipindahkan; evidence URL
canonical v2 berada pada penyimpanan dependent berscope `(workspace_id, fact_id)`
tanpa public fact ID kedua. Ini pilihan desain P2-T1; DDL, nama kolom/tabel
tambahan, constraint dan fungsi dispatcher final milik P3-T1.

| Lapisan konseptual    | Representasi yang direkomendasikan                                                                                   | Invariant                                                                                                                                                                                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity bersama      | `(workspace_id, id, public_id)`, kalimat canonical, normalisasi/hash teks, status koreksi/lineage dan reservasi      | Satu ID; negative status berlaku lintas versi; URL/versi sumber bukan kunci identitas. Normalisasi/hash teks v1 yang existing dipertahankan agar exact lookup lintas versi tidak terbelah.                                                                                                                          |
| Envelope v1 hadir     | Ontologi/structured keys, review, sumber, freshness/risk dan verification v1 existing                                | Seluruh constraint v1 tetap wajib **bila envelope hadir**. Seluruh row legacy dibackfill sebagai hadir tanpa mengubah nilainya.                                                                                                                                                                                     |
| Envelope v1 absen     | Fakta v2-native: field khusus v1 tidak terisi, structured match tidak eligible, `verification_status = needs_review` | Migration baru mengganti unconditional `NOT NULL`/CHECK/default khusus v1 dengan validasi kondisional fail-closed: envelope lengkap-sah atau benar-benar absen, tidak partial. Jangan mengisi `unknown`, ontologi tebakan, `[]` sumber palsu, kelas stable/standard default, verified timestamp atau expiry buatan. |
| Evidence canonical v2 | Kalimat yang didukung + tepat satu URL, versi sumber v2, provenance simpan                                           | URL minimum sesuai P1; tanpa tier/expiry. Kehadiran evidence v2 tidak mempromosikan status/evidence v1. URL canonical tidak mengganti URL snapshot penggunaan lama.                                                                                                                                                 |
| Binding/usage         | Satu `trivia_post_facts` untuk semua versi, discriminator snapshot cocok dengan versi konten post                    | Reuse memakai semua usage lintas versi pada `fact_id` sama; validasi sumber bercabang per binding.                                                                                                                                                                                                                  |

Untuk envelope absen, `needs_review` adalah status awal; correction tetap dapat
menetapkan `rejected`/`invalidated`/`superseded` tanpa mengisi metadata v1.
Constraint kondisional harus menerima negative status itu dan tetap melarang
`verified` v1 tanpa envelope sah. Dispatcher ditentukan oleh discriminator
persisten yang tervalidasi, bukan flag request yang boleh melewati validator.

Alasannya: identity mapping in-place mempertahankan public ID dan junction
existing; envelope opsional menghindari metadata rekaan, sementara satu tabel
usage mempertahankan uniqueness lintas versi. Menonaktifkan trigger v1 secara
global, menyisipkan row dummy, atau memindahkan v2 ke registry identitas lain
tidak memenuhi invariant ini. Perubahan schema baru ini berada dalam override
additive/version-aware CR-053 §2.1/2.2/2.6 dan §3, bukan mengedit migration lama
atau menurunkan syarat evidence bagi operasi **v1**.

### 1.2 Fakta baru, penggunaan v1 oleh v2, dan snapshot versi

- **V2-native baru:** save v2 yang sah menyisipkan satu akar, evidence URL v2,
  binding v2 dan post dalam transaksi yang sama. Server menghitung normalisasi
  dan hash teks; tidak mengekstrak ontologi atau tanggal verifikasi dari URL.
  Envelope v1 tetap absen. Riset ChatGPT, keputusan dedup lengkap dan tiga
  editorial `pass` adalah bagian alur save yang sudah diterima, bukan tahap
  promosi fakta baru. Rollback save membatalkan seluruh sisipan itu.
- **Fakta v1 dipakai v2:** `same` memakai `public_id`/`id` lama dan URL baru yang
  diteliti untuk penggunaan v2. Jangan memperbarui `source_data`,
  `verified_at`, `expires_at`, ontologi atau review v1 melalui save/revise v2.
  Evidence URL v2 dapat hidup di samping envelope v1; snapshot penggunaan v2
  mengambil URL request yang sah, bukan mengonversi sumber v1. Save/revise
  bukan izin menulis ulang URL canonical yang sudah ada: reverify canonical
  v2 tetap jalur P5-T3; revise memperbarui URL lokal draft melalui P4-T3.
- **Dispatcher snapshot:** migration binding existing mewajibkan
  `verified_at_snapshot NOT NULL`, `is_valid_fact_usage_snapshot_v1` dan
  `fact_usage_snapshot_matches_fact_v1`. P3-T1 harus menambah discriminator
  snapshot pada junction (legacy default v1), memeriksa kesesuaiannya dengan
  `posts.content_schema_version`, dan mengganti trigger menjadi dispatcher.
  Binding v1 tetap memakai validator/sumber/expiry v1 dan verified timestamp
  nyata. Binding v2 memakai snapshot sumber versi 2 dengan `canonical_claim`
  dan `source_url` sesuai projection P1, hash teks yang konsisten, serta
  `verified_at_snapshot` kosong/tidak berlaku. Constraint timestamp wajib hanya
  untuk v1; waktu simpan terpisah tidak diisikan ke field verified.
- **Alokasi versi:** jangan melewatkan binding v2 melalui
  `post_usage_snapshot_v1` atau gate source/expiry `post_allocate_v1`.
  Dispatcher alokasi membagi evidence policy tetapi berbagi lock, FK, cek
  status/lineage, reservation aktif, dan usage scope yang sama. Snapshot v1
  harus tetap cocok dengan evidence v1 saat alokasi; snapshot v2 cocok dengan
  fakta/URL request yang divalidasi saat save/revise, bukan harus sama dengan
  URL canonical yang mungkin berbeda. Bentuk v2 tidak diterima sebagai v1.
- **Immutable usage tetap:** `post_usage_immutable_v1` melindungi sumber/hash/
  verification snapshot bahkan pada draft. P3 mempertahankan perlindungan itu
  untuk kedua versi dan juga melarang pergantian discriminator pada row yang
  sudah ada. Pembaruan URL draft v2 membuat successor binding dengan `fact_id`
  **sama**, melepas/noncurrent binding lama secara atomik; bukan UPDATE
  snapshot lama. Retained allocation post itu tidak dihitung reuse baru,
  tetapi penggunaan post lain tetap memblokir. History lama tetap utuh;
  aturan successor binding ini diimplementasikan/dibuktikan pada P4-T3.

### 1.3 Write dan Read v1 setelah fakta/pemakaian v2 ada

P3 harus mengadaptasi **private** discovery/resolver v1 agar mencari identity
bersama sebelum memutuskan insert, termasuk fakta tanpa envelope v1. Exact
normalisasi/hash tidak boleh difilter berdasarkan ada/tidaknya evidence v1.
Structured lookup hanya memakai envelope yang sungguh tersedia; ketiadaan
ontologi bukan bukti `distinct`. Untuk match yang ditemukan/diputuskan `same`,
ID tetap sama, atau operasi ditolak; tidak ada fallback insert ID paralel.

1. Bila envelope v1 sudah hadir, pertahankan guard exact/structured dan review
   material existing. Refresh/reverify v1 hanya memakai sumber v1 yang benar
   dari request sah, bukan URL canonical/snapshot v2. Alokasi/reservasi v1
   mengecek **semua** usage v1/v2 pada akar itu sebelum commit.
2. Bila envelope absen, v1 tidak boleh menyatakan `matched_existing` yang
   verified hanya karena URL v2 tersedia. Rekomendasi jalur konservatif:
   attachment envelope v1 pertama hanya pada exact normalized claim yang
   konsisten dengan input ontologi/review v1 dan paket sumber v1 tervalidasi,
   di bawah lock yang sama; hasilnya `refreshed_existing` dengan ID tetap.
   Guard meaning harus membedakan penambahan representasi v1 pertama dari
   pengubahan proposisi yang sudah direferensikan: kalimat/hash/FK/lineage dan
   snapshot v2 tidak berubah, attachment lengkap atau rollback. Ontologi
   existing tidak boleh ditimpa; konflik/ambiguity tetap `FACT_REVIEW_REQUIRED`.
   Parafrasa yang tidak dapat dibuktikan aman oleh kontrak input v1 juga
   ditolak, bukan dipaksa attach atau diberi ID baru. Ini bukan syarat v2;
   hanya operasi v1 yang meminta evidence v1.
3. Read v1 mempunyai output tertutup dengan `material_identity` wajib di
   `supabase/functions/mcp/trivia_fact.ts`; native tanpa ontologi tidak boleh
   diproyeksikan dengan metadata rekaan atau diam-diam dihilangkan agar hasil
   tampak bersih. Rekomendasi compatibility adapter: discovery internal tetap
   menemukan native/usage-nya; jika kandidat wajib itu belum dapat direpresentasi
   jujur dalam projection v1, tolak Read secara aman dengan kode existing
   `FACT_REVIEW_REQUIRED`, tanpa mengubah envelope. Setelah attachment v1 sah,
   match dapat menampilkan ID lama dan usage lintas versi dalam projection v1
   biasa. Read v2 tetap menampilkan ID/status native tanpa membutuhkan ontologi.
   Menampilkan native lengkap pada success Read v1 sebelum attachment memerlukan
   rekonsiliasi kontrak output tersendiri; P2-T1 tidak memperluas schema v1.
4. Jangan mengubah `trivia_protect_referenced_fact_meaning_v1` menjadi bypass
   umum. Adaptasi first-attachment hanya boleh menambahkan envelope yang absen
   dengan guard di atas, tidak mengubah meaning, binding atau sumber historis.
   Bila mapping tidak dapat dibuktikan konsisten, operasi terkait fail-closed.
   Correction v1 juga tidak boleh membuat successor `same` yang sebenarnya
   native existing; tolak konflik, pertahankan lineage. Adaptasi correction
   lintas versi mengikuti P5-T3, bukan menganggap helper lama sudah mendukungnya.

Urutan patch yang harus dibawa ke P3: resolver hardened
`20261011151632_harden_phase_5_5_fact_resolution.sql` →
`20261011151903_harden_phase_5_5_ordered_candidate_sets.sql` (membentuk
`internal.trivia_resolve_fact_v2` untuk **reservasi v1**) →
`20261011152154_fix_phase_5_5_review_aliases_and_post_dependencies.sql` →
`20261011152951_enforce_phase_5_5_read_limits_and_closed_replay.sql` →
`20261011153430_guard_phase_5_5_identity_and_replay_bindings.sql`.
`20261026121918_trivia_source_diagnostics.sql` mempertahankan policy v1;
`20261027075748_relax_trivia_visual_limit_and_dedup_diagnostics.sql` hanya
menambah diagnostik review pada resolver reservasi itu. Sufiks helper tersebut
tidak boleh disamakan dengan tiga tool produk v2 baru. Attachment, dispatcher,
dan sinkronisasi di atas **belum tersedia** pada source yang ditinjau.

## 2. Matriks status, reservation, usage dan kelayakan v2

Status disimpan/diturunkan pada dimensi **terpisah**; tidak menjadikan `expired`
status `verification_status` yang keenam. `needs_review` tidak berarti verified,
dan v2 tidak boleh memakai bukti v1 yang belum cukup sebagai bukti URL v2.
`verified` v1 juga **bukan** bukti otomatis bahwa URL baru sudah diteliti
ChatGPT.

| Dimensi              | State/sumber authoritative                                                                                                                     | Makna dan keputusan v2                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identitas/verifikasi | `trivia_facts.verification_status`: `needs_review`, `verified`, `rejected`, `invalidated`, `superseded`; kehadiran envelope evidence versi     | `verified` existing berarti evidence v1, bukan otomatis riset URL v2. `needs_review` dapat dipakai v2 melalui syarat di bawah tanpa promosi v1. `rejected`/`invalidated`/`superseded` selalu **not_eligible**; `same` wajib mengganti calon, bukan memakai ID lama ataupun ID pengelak.                                                                                                                                                    |
| Expiry/freshness v1  | `expires_at`, `verified_at`, `freshness_class`, `risk_class`, `source_data`                                                                    | `expires_at <= clock_timestamp()` dengan status lainnya masih layak adalah **expired-only**, bukan invalidated. v1 tetap mengikuti expiry/tier/sumber lamanya. v2 boleh menggunakan **ID lama** sesudah riset URL baru bila tidak ada blocker status/usage/reservation lain; tanpa memperpanjang, mengganti, atau memalsukan expiry/evidence v1 sebagai v2.                                                                                |
| Reservasi v1         | `reservation_status`, `reservation_token`, `reserved_for_page_id`, `reserved_until`, `reservation_context`; `internal.trivia_reservation_sets` | `reserved` dengan `reserved_until > clock_timestamp()` tetap **actively_reserved** bagi v2. Token privat; Read v2 hanya memberi eligibility aman. Waktu melewati TTL mengakhiri blocker aktif tanpa otomatis mengubah row atau versi katalog; cleanup/release yang termaterialisasi adalah mutasi tersendiri. Recheck waktu setelah lock wajib. Histori set bukan bukti reservasi masih aktif, dan expiry bukan pelepasan usage published. |
| Alokasi dan riwayat  | `trivia_post_facts`: `allocation_state` (`allocated`, `published`, `released`), `is_current`, `page_id`, `post_id`                             | `allocated` saat draft/ready adalah penggunaan aktif. `published` (termasuk post `archived`) adalah penggunaan permanen/riwayat yang memblok reuse sesuai scope. `released` tidak memblok alokasi baru tetapi **tetap** audit/history. `is_current = false` merekam binding lama yang dilepas saat revise; jangan menghapus row/snapshot.                                                                                                  |
| Eligibility v2       | Derived, **bukan** identitas/status persisten: `eligible`, `page_blocked`, `workspace_blocked`, `actively_reserved`, `not_eligible`            | Tentukan dari Page tujuan, status, history pemakaian yang masih menahan scope, dan reservasi terkini di bawah lock; Read adalah pandangan informatif, Write tetap recheck. Tidak menghapus match historis dari Read karena tak layak.                                                                                                                                                                                                      |

**`needs_review` dan eligibility v2:** label ini tidak menjadi gate promosi
melalui tier/expiry v1. Untuk fakta native maupun legacy needs_review, calon
`same` harus mempunyai keputusan makna yang selesai, URL pendukung yang sudah
diteliti ChatGPT, bentuk URL sesuai P1, serta tidak memiliki blocker koreksi,
lineage, scope atau reservasi aktif. Save/revise v2 tetap membutuhkan seluruh
validasi mekanis dan tiga editorial `pass` pada revision/hash keluaran. Bila
riset atau kesamaan belum pasti, ganti calon; jangan save. Bukti URL v2 dan
binding dicatat dalam transaksi itu tanpa mengubah status needs_review atau
mengklaim `verified` v1. Tidak ada panggilan promosi/reverify wajib tambahan.
Read memberi eligibility informatif terhadap state yang dapat diketahui;
status needs_review sendiri bukan bukti siap pakai, dan URL yang baru disertakan
Write harus divalidasi lagi. P2-T3 merinci projection/prioritas blocker, bukan
menghidupkan kembali kewajiban sumber v1. Write menegakkan **seluruh** blocker
terkini, termasuk expiry reservation sesudah menunggu lock.

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
- **Mutable post berbeda dari published history:** revise boleh mengganti copy,
  current checks dan binding menurut kontrak; ready kembali draft dengan
  `ready_at`/approval current dibersihkan. Discard draft/ready menjadi
  `discarded`, revision naik satu, quality pending, `ready_at` dan
  `approval_snapshot` null; evidence valid di-rebind ke revision penerus
  (evidence kosong tetap kosong), bukan evaluasi/approval baru. Discard tidak
  mengalokasikan fakta pengganti, tidak membuat post replacement, dan tidak
  membuka item completed otomatis. Before-evidence/approval tetap di history
  append-only; snapshot usage semua state tidak diedit. Perlindungan copy/
  sumber/approval **published/archived** tidak melarang perubahan current
  evidence/approval mutable yang memang sah. Publikasi mengikat evidence ke
  revision publikasi sesuai CR-014; archive mempertahankannya byte-identical.

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
   `INSERT ... ON CONFLICT ... DO UPDATE` _hanya_ pada kolom derivasi yang
   berubah, atau `DO NOTHING` untuk identitas tetap. Assert count, FK,
   workspace, duplicate/collision dan fingerprint historis sebelum/akhir;
   divergensi **BLOCKED**, jangan diam-diam overwrite old snapshot. Jangan
   meregenerasi `public_id`, `claim_hash_snapshot`, `source_snapshot`, approval,
   post body, timestamp v1 atau operation ledger. Proyeksi dapat dibangun ulang
   tanpa mengubah authoritative row. Status and reservation existing adalah
   state saat itu, bukan asumsi semuanya available.
1. **No-gap handoff transaksi:** pasang mekanisme sinkronisasi pada **jalur
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
1. **Versi katalog baseline A:** bentuk persistent monotonic counter per
   workspace dapat ditambahkan oleh P3 dengan atomic increment di bawah
   workspace gate pada perubahan relevan identitas baru/identity projection,
   verification/correction/lineage, alokasi/release/publish dan perubahan
   reservation yang memengaruhi eligibility. Rekomendasi menaikkan versi pada
   acquire/release/cleanup expiry yang _benar-benar termaterialisasi_ harus
   mengikuti event-set keluaran **P2-T3**, diimplementasikan P3. Lewatnya waktu
   sendiri tidak melakukan commit, cleanup, atau increment counter. Versi sama
   bukan pengganti recheck waktu/eligibility setelah lock; Read berikutnya dapat
   melihat blocker reservasi habis walau counter belum berubah.
   Read mengambil `catalog_version` dari satu snapshot konsisten;
   `expected_catalog_version` disalin persis (string desimal), dicek pada save
   di bawah workspace gate **sebelum** membuat post/fact/usage. Jika berubah,
   kembalikan `FACT_CATALOG_CONFLICT` dan rollback bisnis; Read ulang, tidak
   otomatis riset ulang URL yang tetap sah. Perubahan tidak terkait pun menolak
   Write stale sesuai **A**; jangan mengaktifkan alternatif B.
1. **Lock dan replay CR-012:** validasi caller/owner/rate/input → klaim
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
1. **Security:** implementasi harus mempertahankan owner OAuth, workspace
   isolation, RLS, minimal execute grants, tidak membuka akses langsung
   `anon`/`authenticated` ke business table/helper, dan tidak mengekspos
   `reservation_token`, `reservation_context`, internal IDs atau ledger dalam
   respons publik. `fact_public_id` hanya hasil lookup owner-scoped. P2-T1 tidak
   menetapkan DDL/grants, cutover atau waktu pensiun v1.

### Peta titik mutasi v1 dan pemilik adaptasi

P3-T1 menyiapkan constraint/dispatcher; P3-T2 menjaga visibility/no-gap write
yang masih berjalan. Adaptasi transaksi save/revise dan lifecycle lengkap
tetap milik P4/P5 pada §6; tabel ini tidak memindahkan semuanya ke P3.

| Operasi dan titik source existing                                                                                                                                                                                                                                                      | Perubahan yang terlihat dalam registry/versi katalog                                                                                                                              | Invariant transisi                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.trivia_register_and_reserve_facts`; resolver awal pada `20261011131505_phase_5_5_trivia_registration_reservation_rpcs.sql`, lalu `internal.trivia_resolve_fact_v2` hasil patch §1.3; helper `trivia_lock_identities_v1` pada `20261011131503_phase_5_5_trivia_rpc_foundation.sql` | Insert/refresh canonical, evidence/expiry **v1**, reserve v1 dan append-only `internal.trivia_reservation_sets`                                                                   | Cari juga native tanpa envelope; same memakai ID tetap atau fail-closed (§1.3). Usage v2 ikut memblokir. Ledger replay tidak mereservasi ulang; P3-T1/T2 menjaga collision, validator, sinkronisasi dan izin v1.                    |
| `api.trivia_release_facts`, helper privat `internal.trivia_release_facts_v1`/`internal.trivia_clear_expired_reservation_v1` dari `20261010081127_add_trivia_reservation_and_reuse_primitives.sql`                                                                                      | Row reserved menjadi available saat mutasi; TTL berlalu dapat mengakhiri blocker tanpa mutasi; histori set tetap                                                                  | API release mengubah row langsung, bukan memanggil kedua primitive itu. Waktu sendiri tidak increment katalog. Cleanup/release yang commit mengikuti event-set P2-T3; expiry bukan release usage. Recheck waktu setelah lock.       |
| `api.trivia_reverify_fact`, `api.trivia_correct_fact`, `internal.trivia_invalidate_fact_v1`/`internal.trivia_correct_fact_v1`; `20261011131507_phase_5_5_trivia_reverification_correction_rpcs.sql`                                                                                    | Reverify status/evidence/expiry v1; invalidate/supersede + lineage, clear reservation, affected mutable posts                                                                     | CAS `expected_fact_updated_at`, owner correction, lock affected Page/post sebelum fact; published snapshots immutable. `same` dengan predecessor non-eligible tidak diregister menjadi ID pengelak.                                 |
| `api.save_post`, `api.revise_post`, `internal.post_allocate_v1`, `internal.post_lock_facts_v1` pada `20261011164412_phase_5_6_post_transaction_foundation.sql`/`20261011164415_phase_5_6_post_write_rpcs.sql`                                                                          | New `allocated`, `is_current`, released/noncurrent saat replacement, snapshot versi                                                                                               | P3-T1 membuat binding version-aware tanpa mengubah arti v1/replay. P3-T2 menjaga visibility; P4-T1/T2/T3 membuktikan save/race/revise v2. Reuse semua versi, v1 tetap memerlukan evidence/reservasi v1, row snapshot lama retained. |
| `api.discard_post`; `20261012045018_phase_5_7_lifecycle_rpcs.sql`                                                                                                                                                                                                                      | Current `allocated -> released`, membership tetap; post discarded, revision +1, quality pending, ready_at/approval current null, checks di-rebind                                 | Tidak mengalokasikan F2/replacement. Before-evidence/approval di history tetap; usage snapshot tidak berubah. P4-T3 mengadaptasi discard v2.                                                                                        |
| `api.mark_post_posted`, `api.archive_post`, `api.approve_post`/`api.revoke_post_approval`; migration lifecycle yang sama                                                                                                                                                               | Publish `allocated -> published` dan binding evidence ke revision publikasi; archive mempertahankan published; approve/revoke mengubah approval/current checks tanpa alokasi baru | Bedakan current approval/evidence mutable yang sah dari published copy/source/approval historis yang dilindungi. Archive tidak release dan tidak menulis ulang snapshot publikasi; P5-T1/T2 menangani gate/lifecycle versi.         |
| `api.get_post`, `api.trivia_find_similar_facts`, owner-scoped read projection; `20261011015742_phase_5_2_owner_scoped_read_projections.sql` dan patch `20261011164412_phase_5_6_post_transaction_foundation.sql`                                                                       | Reader menampilkan identitas/usage snapshot pada scope benar, v2 Read dari canonical state terkini                                                                                | `get_post` v1 tetap semantik v1, v2 menampilkan status/eligibility tanpa memalsukan source verification; P2-T3 menentukan retrieval/complete, bukan P2-T1.                                                                          |

Semua perubahan event dan mapping harus diperiksa lagi terhadap migration
terakhir, termasuk
`20261011153430_guard_phase_5_5_identity_and_replay_bindings.sql` dan
`20261012124844_restore_nonretroactive_allocation_reuse.sql`, sebelum P3
menyusun SQL. Patch `pg_get_functiondef` alokasi lain adalah
`20261011165618_harden_phase_5_6_record_resolution.sql` dan
`20261012024443_enforce_phase_5_6_text_privacy.sql`; Read `get_post` juga
mendapat patch `20261022080000_preserve_get_post_source_snapshot_nulls.sql`
(CR-049). Audit definisi efektif, bukan hanya fungsi create pertama.

## 5. Acceptance sintetis dan traceability

Prakondisi bersama: satu owner/workspace `W`, Page `PA`/`PB`/`PC`, status dan
konfigurasi ditetapkan per skenario **independen**; setiap Read dianggap lengkap
pada versi yang sesuai kecuali disebut sebaliknya. `F1` dkk adalah alias untuk
UUID publik canonical yang sudah ada, bukan nilai UUID. URL
`https://example.org/a` hanya ilustrasi; tidak divalidasi sebagai bukti riset.
Kolom outcome adalah acceptance desain, **bukan hasil eksekusi**. P3 membuktikan
schema/backfill/Read dengan fixture; save/race/revise/discard baru dapat
dibuktikan penuh pada P4 dan lifecycle/correction pada P5, sesuai §6.

| Kasus; pre-state                                                                                             | Keputusan                                                               | Referensi ID; scope Page tujuan                   | Outcome desain; state/snapshot yang tetap utuh                                                                                                                                                                                                                         | Requirement                      |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| S01: `F1` v1 verified/eligible; calon parafrasa ditemukan                                                    | `same`                                                                  | **F1**, `PA page_unique` kosong                   | Bind ID lama, bukan insert F-new; source/snapshot v1 tidak ditulis ulang; tidak mengklaim parafrasa lain semua terdeteksi                                                                                                                                              | TFL-04/07/12                     |
| S02: Dua klaim subjek dan URL sama, relasi/angka material berbeda                                            | `distinct`                                                              | **F1 vs F2**, `PA page_unique`                    | F2 baru sah hanya bila bukti beda makna; jangan gabung karena URL/subjek; F1 historis tetap                                                                                                                                                                            | TFL-04/07                        |
| S03: `F1` pernah published lalu invalidated                                                                  | `same`                                                                  | F1 **hanya history hint**; `PA`                   | **Ganti calon**; tidak rebind F1 atau membuat bypass F-new; published/source/approval/lineage utuh                                                                                                                                                                     | TFL-05/07/11                     |
| S04: `F1` superseded oleh F2 dengan perubahan proposisi                                                      | `same` dengan predecessor F1                                            | F1 **not_eligible**; `PA`                         | Ganti calon, jangan bypass via ID baru; relasi F1→F2, published F1 dan snapshots utuh                                                                                                                                                                                  | TFL-05/07/11                     |
| S05: `F1` rejected, belum pernah terpakai                                                                    | `same`                                                                  | F1 **not_eligible**; `PA`                         | Ganti calon, tidak memakai F1 atau menciptakan ID pengelak; status/rejection tetap terlihat                                                                                                                                                                            | TFL-05/07                        |
| S06: `F1` needs_review, URL v2 belum diteliti; kemudian dukungan/meaning dipastikan dalam riset              | `same`                                                                  | **F1**, `PA` tanpa blocker lain                   | Sebelum riset cukup: ganti/jangan save. Dengan keputusan lengkap, URL valid dan seluruh gate save lulus: binding v2 boleh dibuat tanpa promosi tier/expiry/verified v1; needs_review lama tidak dipalsukan                                                             | TFL-01/02/04/07; TDW-05/06/16    |
| S07: `F1` verified v1 tetapi `expires_at` berlalu; **hanya** expiry terhalang                                | `same` setelah riset URL v2 baru                                        | **F1**, `PA page_unique` kosong                   | v2 dapat bind F1 tanpa gate expiry v1; expires_at/source_data/snapshot v1 tidak dipoles jadi evidence v2                                                                                                                                                               | TFL-05/07/11/12                  |
| S08: `PA page_unique` mempunyai F1 `allocated` draft; `PB page_unique` kosong                                | `same`                                                                  | F1 pada **PB**                                    | PB dapat alokasi bila reservation/versi aman; PA tetap allocated, kedua penggunaan sah dan terpisah                                                                                                                                                                    | TFL-07/10                        |
| S09: `PA page_unique` sudah published F1; `PC workspace_unique` kosong                                       | `same`                                                                  | F1 pada **PC**                                    | Tolak alokasi baru `workspace_blocked`; published PA, sumber dan approval utuh                                                                                                                                                                                         | TFL-05/10/11                     |
| S10: `PA` dan `PB` telah sah memakai F1 saat `page_unique`; PB kemudian memilih `workspace_unique`           | `same` pada permintaan alokasi **baru** PB/PC                           | F1; Page tujuan `workspace_unique`                | Alokasi baru ditolak; kedua penggunaan lama tidak dihapus/diinvalidasi retroaktif                                                                                                                                                                                      | TFL-09/10/12                     |
| S11a: `PA` punya F1 `allocated`, post draft atau ready; owner memerintahkan discard                          | Tidak ada keputusan/alokasi F2                                          | F1 released pada **PA**                           | Post discarded, revision +1, approval/ready_at current null, checks di-rebind sesuai kontrak; usage snapshot/membership dan history tetap; item completed tidak dibuka dan replacement tidak dibuat otomatis                                                           | TFL-10/12; TDW-15                |
| S11b: `PA` punya F1 `allocated` ready; owner merevisi dengan F2 proposisi pengganti yang layak               | `distinct` bagi F2 setelah riset/dedup                                  | F1 dilepas; F2 allocated pada **PA**              | Pengaitan/perubahan alokasi atomik atau rollback; F1 released/noncurrent dengan snapshot lama, F2 current dengan snapshot baru; post menjadi draft, approval lama dibatalkan dan editorial baru diikat revision/hash                                                   | TFL-04/10/11/12; TDW-12          |
| S12: F1 published, post kemudian archived                                                                    | `same`                                                                  | F1 pada `PA` atau `PC workspace_unique`           | Tetap `page_blocked`/`workspace_blocked`; archive tidak release, published/approval/snapshot immutable                                                                                                                                                                 | TFL-05/10/11                     |
| S13: F1 sedang direservasi v1 pada PA, token belum expired; v2 hendak save pada PB                           | `same`                                                                  | F1, **PB page_unique**                            | `actively_reserved`; v2 gagal tanpa post parsial; set historis v1/token privat tetap; setelah release/expiry, Read baru dan recheck                                                                                                                                    | TFL-09/10/12                     |
| S14: backfill mapping F1 dan usage v1 selesai, lalu write v1 register/reserve, correction atau publish       | `same` pada next Read                                                   | **F1**, seluruh Page `W`                          | v2 langsung melihat ID/status/usage/reservation baru dan versi katalog berubah secara commit-atomik; rerun backfill tidak menduplikasi; old snapshots utuh                                                                                                             | TFL-04/09/10/11/12               |
| S15: v2 Read versi 42, v1 mengalokasi F2 (atau koreksi F1) lalu v2 save dengan expected 42                   | `same`/distinct sesuai Read lama                                        | F1/F2, `PA`                                       | `FACT_CATALOG_CONFLICT`, rollback seluruh post/fact/junction baru; Read ulang sebelum percobaan baru; tidak otomatis riset URL ulang bila tetap sah                                                                                                                    | TFL-09/10/12                     |
| S16: dua calon dalam set final adalah parafrasa sama, atau hasil makna `uncertain`                           | `same` internal set / `uncertain`                                       | F1, `PA`                                          | Ganti satu/keduanya; jangan kirim duplikasi atau memaksa distinct. Riwayat F1 tidak berubah                                                                                                                                                                            | TFL-04/07                        |
| S17: reservation F1 melewati TTL tanpa cleanup, lalu cleanup/release v1 sah; F1 tidak punya usage            | `same` pada Read baru                                                   | F1, `PB page_unique`                              | TTL saja mengakhiri blocker aktif tanpa commit/increment katalog. Cleanup/release yang termaterialisasi memperbarui row/versi sesuai event-set P2-T3; recheck waktu setelah lock tetap wajib. Histori set/replay dan ID F1 tetap                                       | TFL-09/10/12; TDW-11/16          |
| S18: v2 memperbarui URL untuk F1 makna sama; correction owner invalidate F1 setelah publikasi                | `same` saat update URL, kemudian `same` calon baru terhadap invalidated | F1 history; `PA`                                  | URL evidence v2 terikat F1, correction menjadikannya not eligible; calon baru diganti; published v1/v2 tidak ditulis ulang                                                                                                                                             | TFL-05/07/11/12                  |
| S19: save v2-native membuat F1 dari kalimat + URL; parafrasa kemudian ditemukan v2 pada PB                   | `same`                                                                  | **F1**, PB page_unique kosong, PA telah allocated | Satu akar; PB boleh bind bila semua gate lolos. Envelope v1 tetap absen, tidak ada ontologi/source tier/tanggal rekaan atau F-new                                                                                                                                      | TFL-01/02/04/07/10/12; TDW-05/16 |
| S20: caller v1 menemukan exact normalized identity F1 v2-native tanpa envelope v1                            | Match identity F1; bukan `distinct`                                     | **F1**, PB page_unique tanpa blocker              | Discovery tidak melewatkan F1; Read v1 yang tak dapat memproyeksikan ontologi gagal FACT_REVIEW_REQUIRED. Register v1 dengan input/evidence v1 nyata boleh first-attach secara atomik dengan ID F1; tanpa itu ditolak, tidak insert paralel dan URL v2 bukan sumber v1 | TFL-04/10/12; TDW-16             |
| S21: F1 dipakai v2 pada PA; v1 mencoba reserve/alokasi di PA atau PC workspace_unique                        | `same`, baik envelope v1 absen maupun hadir                             | **F1**, PA/PC                                     | Pemakaian v2 tetap terlihat; alokasi v1 dilarang. Dengan envelope sah hasil reuse blocked; tanpa evidence sah v1 tetap fail-closed dan tidak membuat ID bypass. PB page_unique hanya boleh dengan evidence/reservasi v1 sah dan tanpa blocker lain                     | TFL-04/10/12; TDW-05/16          |
| S22: F1 legacy punya envelope dan binding published v1; v2 memakai ID sama dengan URL baru di PB page_unique | `same`                                                                  | **F1**, PB tanpa blocker                          | Binding v1 snapshot schema 1/verified_at nyata tetap byte-identical; binding v2 snapshot schema 2/URL baru tanpa verified_at rekaan. Kedua evidence hidup berdampingan; reverify canonical v2 tidak menulis ulang keduanya                                             | TFL-01/02/04/11/12; TDW-12/15/16 |

**Keterlacakan TDW spesifik** (melengkapi TFL pada tiap kasus):

| Kasus/bagian                           | Requirement TDW dan batas                                                                                                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01–S07, S16, S19; §1–2                | TDW-04 seleksi sebelum copy; TDW-05 resolusi/alokasi satu draft; TDW-06 penolakan identity/URL/editorial yang gagal. S03–S05/S16 memerlukan penggantian calon, bukan bukti save berhasil.                   |
| S08–S10, S13–S15, S19, S21; §3–4       | TDW-02 reuse/config Page; TDW-05 transaksi utuh atau rollback. S15 khusus versi katalog mengikuti TFL-09; bukan klaim bukti replay.                                                                         |
| S14/S17 dan §4 lock/replay             | TDW-11 key/payload identik, replay tidak memutasi; CAS membaca/review ulang. S17 membedakan expiry waktu dari mutasi cleanup. Uji lost-response lengkap tetap P4-T2, tidak dibuktikan oleh contoh TTL saja. |
| S11b, S18 bagian URL lokal, S22; §1.2  | TDW-12 revise/pengaitan atomik dan pembatalan approval; TDW-07 readback sumber/checks pada versi yang tepat.                                                                                                |
| S11a, S12, S18 bagian history, S22; §3 | TDW-15 discard tanpa replacement dan published/archive history; TDW-13/14 hanya batas approval/publikasi terpisah, bukan implementasi gate di P2-T1.                                                        |
| S01/S07/S14, S19–S22; §1.1–1.3         | TDW-16 compatibility ID, Read dan evidence v1/v2; tidak mengklaim success projection v1 dapat memuat native tanpa envelope.                                                                                 |

Fixture P1
`single.findResponse` mengandung history invalidated; penggantian status
superseded/rejected dan negative-controls dievaluasi pada
`tests/trivia-draft-v2-contracts.test.ts`. Test database v1 yang menjadi titik
perluasan: `supabase/tests/database/trivia-identity-and-source.test.ts`,
`trivia-lineage-and-reverification.test.ts`,
`trivia-reservation-and-reuse.test.ts`, `trivia-post-facts.test.ts`,
`api-trivia-facts.test.ts`, `api-trivia-correction.test.ts`,
`api-trivia-concurrency.test.ts`; helper
`supabase/tests/database/helpers/trivia-rpc.ts`. **Tidak satu pun skenario
S01–S22 (termasuk S11a/S11b) dinyatakan DB PASS**. Pembacaan test v1
`api-post-save-revise.test.ts` dan `api-post-lifecycle.test.ts` juga menjadi
dasar pemisahan replacement, discard, current approval dan published history;
test tersebut tidak dijalankan pada task dokumen ini.

## 6. Batas kerja dan handoff

- **P2-T2**: susun dataset berlabel parafrasa/salah-gabung termasuk historic,
  invalidated/superseded/rejected dan proposisi mirip berbeda; tetapkan ambang
  **sebelum** evaluasi. P2-T1 tidak menetapkan retrieval recall atau threshold.
- **P2-T3**: bekukan aturan kandidat wajib/limit/`complete`, `catalog_version`
  dan snapshot Read, event-set yang menaikkan versi (termasuk
  reservation/expiry), serta prioritas eligibility bila blocker bertumpuk.
  Pertahankan baseline **A**; protokol pembanding B bukan izin mengaktifkan B.
- **P3-T1 — schema additive**: implementasikan akar identity in-place,
  discriminator/envelope v1 opsional, evidence/binding v2, constraint/trigger
  version-aware §1.1–1.3, scoped FK/uniqueness, ACL/RLS/grant. Verifikasi shape
  native/two-evidence dan denial pada fixture schema (S19–S22), tanpa
  menyebut fixture insert sebagai success save/lifecycle v2. Jangan menerbitkan
  migration sebelum review desain P2.
- **P3-T2 — backfill dan indeks**: backfill/mapping/index idempoten, digest
  sumber/snapshot/approval/isi legacy, konsistensi write **v1 berikutnya**,
  hooks/versi katalog sesuai P2-T3, no-gap discovery/resolver dan first-attachment
  aman §1.3; audit collision/ambiguity/fixture sebagai blocker, bukan silent
  merge. Buktikan bagian schema/legacy write S14/S17/S20–S22 dengan fixture
  terisolasi; race yang memerlukan save v2 menunggu P4-T2.
- **P3-T3 — pencarian database**: RPC Read v2 lintas versi dan dataset retrieval
  P2, candidate/complete/catalog snapshot/owner scope, status historis dan usage.
  Buktikan bagian retrieval S01–S10/S12–S22 dengan state fixture yang relevan,
  tanpa mengklaim transaksi v2 sudah dijalankan. Ambang mengikuti keluaran P2,
  bukan ditetapkan dokumen ini.
- **P4-T1 — save atomik**: buktikan resolusi ID, URL/binding versi, shared reuse,
  katalog/config, renderer/editorial dan rollback seluruh draft (S01–S10,
  S13–S16, S19/S21/S22 sejauh save). Tidak ada reserve paket v2.
- **P4-T2 — benturan/replay**: buktikan overlap sesi dan kedua urutan commit
  v1/v2, shared identity/scope, katalog stale S13–S15/S21, operation key/payload
  identik, lost-response/claim expired dan rollback tanpa data parsial.
- **P4-T3 — revise/readback/discard**: implementasikan dan buktikan S11a/S11b,
  URL draft makna sama, successor binding immutable §1.2, CAS, editorial baru,
  ready ke draft, serta projection `get_post`/list v1/v2 (S18/S22 bagian draft).
- **P5-T1/T2/T3**: T1 gate Setujui menggunakan mekanis/editorial P4; T2
  approval/publish/revoke/archive/reschedule/metrics terkait menurut versi
  (S12/S22 history); T3 reverify canonical URL, invalidasi/supersesi, dampak pada
  post mutable serta snapshot published utuh (S03–S07/S14/S18/S22 sesuai
  operasi). Jangan memindahkan seluruh pembuktian lifecycle/correction ke P3.

Seluruh penjabaran di atas mengikuti
[`tasks.md`](../../openspec/changes/simplify-trivia-draft-workflow/tasks.md);
baseline tetap **8 fase/23 task**. Ini handoff acceptance, bukan perubahan
checklist atau izin melanjutkan P2-T2/P2-T3 maupun implementasi fase berikutnya.

Tidak ditentukan di sini: dataset/threshold, cutover, observasi, rollback rilis,
pensiun v1, rilis D1 sebelum D2 atau perubahan keputusan produk. Bila audit P3
menemukan bahwa pemetaan tidak dapat mempertahankan FK/public ID/snapshot atau
urutan lock tanpa mengubah kontrak accepted, **hentikan perubahan terkait dan
ajukan keputusan terpisah**, jangan mengedit CR-053/P1/spec/expected test untuk
menyesuaikannya.
