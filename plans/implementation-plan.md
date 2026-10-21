# Implementation Plan — Content Producer MVP

## 1. Informasi dokumen

| Bagian | Keterangan |
|---|---|
| Nama produk | Content Producer |
| Versi produk | MVP |
| Versi dokumen | 1.1 |
| Status | Approved — baseline eksekusi Phase 1–11 |
| Tanggal | 7 Oktober 2026 |
| Niche aktif | Trivia facts |
| Pengguna MVP | Satu owner |
| Runtime | ChatGPT plugin + Supabase Edge Function + Supabase Postgres |
| Supabase plan awal | Free Plan |
| Dokumen induk | plans/PRD.md dan plans/database-design.md |

Dokumen ini menetapkan urutan implementasi, pembagian pekerjaan AI dan pengguna, struktur repository, dependency antar-fase, verification gate, rollback, deployment, dan Definition of Done.

Implementasi wajib berlangsung berurutan per fase. Fase berikutnya tidak boleh dimulai sebelum verification gate fase aktif lulus atau penyimpangan disetujui dan dicatat.

---

## 2. Tujuan implementasi

Menghasilkan plugin pribadi yang memungkinkan owner meminta produksi Facebook Reels trivia melalui chat, dengan kemampuan:

- Mengelola beberapa Facebook Page.
- Menggunakan konfigurasi trivia berbeda per Page.
- Meneliti dan menulis konten melalui ChatGPT.
- Menyimpan data lintas-chat di Supabase.
- Mencegah duplikasi fakta dan collision antar-chat.
- Membuat single post, batch, dan kalender yang dapat dilanjutkan.
- Merevisi, menyetujui, membuang, memublikasikan, dan mengarsipkan post.
- Mencatat performa secara manual.
- Menghasilkan insight Page tanpa menjanjikan hasil viral.
- Menjadi fondasi untuk niche lain tanpa mengubah arti data trivia.

---

## 3. Sumber kebenaran dan urutan kewenangan

Jika terdapat konflik, gunakan urutan berikut:

1. **plans/PRD.md** — kebutuhan dan batas produk.
2. **plans/database-design.md** — schema, relasi, transaksi, RLS, dan invariant.
3. **plans/module-contract.md** — kontrak setiap niche.
4. **plans/trivia-content-dna.md** — aturan editorial trivia.
5. **plans/tool-inventory.md** — 33 MCP tool contracts.
6. **plans/use-case-inventory.md** — user goals dan frozen prompt suite.
7. **plans/acceptance-traceability.md** — requirement-to-phase/evidence mapping.
8. **plans/implementation-plan.md** — urutan pengerjaan.
9. Migration, source code, dan automated tests — implementasi aktual.
10. **plans/workflow-users.md** — ringkasan operasional pengguna.

Perubahan kebutuhan harus dimulai dari PRD. Perubahan invariant database harus memperbarui database design sebelum migration final dibuat.

---

## 4. Aturan eksekusi

### 4.1 Sequential phase gate

- Hanya satu fase yang berstatus aktif.
- Task independen dalam satu fase boleh dikerjakan paralel.
- Setiap fase berakhir dengan verification report.
- Verification report mencantumkan file yang berubah, command yang dijalankan, hasil test, risiko tersisa, dan keputusan lanjut.
- Kegagalan gate menghentikan perpindahan fase.
- Perbaikan dilakukan dalam fase yang sama.

Untuk Phase 6, pengguna memilih alur yang lebih ketat: satu task AI hanya
mengerjakan satu checkpoint, checkpoint dikerjakan berurutan pada branch yang
sama, dan audit independen dilakukan setelah 15 serta 33 tools. GitHub Issue
melacak kemajuan checkpoint; kontrak frozen dan verification gate fase tetap
menjadi sumber keputusan teknis.

### 4.2 AI-first execution

AI mengerjakan seluruh pekerjaan yang dapat dilakukan melalui repository, terminal, Supabase CLI, database, MCP tooling, atau browser yang terotorisasi.

AI bertanggung jawab untuk:

- Menulis dan mengubah kode.
- Membuat migration melalui CLI.
- Membuat schema, function, trigger, RLS, dan grants.
- Menulis MCP server, tool schemas, dan plugin skill.
- Menulis unit, integration, database, security, dan workflow tests.
- Menjalankan test, lint, type-check, advisors, dan smoke test.
- Men-deploy setelah kewenangan tersedia.
- Mendiagnosis dan memperbaiki kegagalan.
- Memperbarui dokumentasi.
- Menyiapkan rollback dan recovery procedure.

### 4.3 Pekerjaan manual pengguna

Pengguna hanya melakukan tindakan yang tidak dapat atau tidak boleh dilakukan AI:

- Membuat akun atau project jika belum tersedia.
- Login dan security confirmation.
- OAuth consent.
- Memberikan akses tool atau deployment yang diminta.
- Memasukkan secret melalui mekanisme aman bila AI tidak memiliki akses.
- Memilih preferensi editorial yang benar-benar subjektif.
- Menyetujui output konten.
- Mendesain di Canva.
- Mengunggah dan memublikasikan ke Facebook.
- Mengambil metrik Facebook karena MVP tidak memakai Facebook API.
- Memberikan keputusan final go-live.

AI harus menyiapkan instruksi manual yang singkat, spesifik, dan hanya diberikan saat tindakan tersebut benar-benar dibutuhkan.

### 4.4 Change discipline

- Jangan menambah fitur di luar MVP tanpa memperbarui PRD.
- Jangan memasang dependency sebelum kebutuhan dan versinya diverifikasi.
- Pin dependency version dan simpan lockfile.
- Jangan menyimpan secret di Git.
- Jangan membuat migration filename secara manual; gunakan Supabase CLI.
- Jangan melakukan perubahan production hanya melalui Dashboard tanpa migration setara.
- Jangan memakai OpenAI API, embeddings, vector database, product dashboard, atau Facebook/Canva API pada MVP. Frontend login/consent minimal diizinkan; vendor hosting tidak dikunci.

---

## 5. Keputusan arsitektur tetap

| Area | Keputusan |
|---|---|
| Repository | Satu monorepo |
| Plugin | Portable plugin package; compatibility manifest hanya bila diperlukan host |
| Plugin workflow | Skill content-producer |
| MCP transport | Streamable HTTP |
| MCP runtime | Satu Supabase Edge Function bernama mcp |
| Authentication | Supabase Auth OAuth 2.1 |
| Auth frontend | Minimal login/consent/logout/error SPA pada origin HTTPS stabil |
| Authorization | Owner workspace, diperiksa server-side |
| Database | Supabase Postgres |
| AI generation | ChatGPT aktif pengguna |
| Background AI | Tidak ada |
| Niche MVP | Trivia |
| Core | Netral terhadap niche |
| Deduplikasi | Hash + structured ontology + FTS + pg_trgm + review semantik |
| Batch | Active-turn, claim default satu/maksimal tiga, checkpoint di content plan |
| Publishing | Manual ke Canva dan Facebook |
| Metrics | Manual melalui chat |
| Hosted staging | Tidak wajib untuk MVP; CR-019 menunda evaluasi staging Phase 8 |
| Local environment | Supabase local development |
| Production | Satu Supabase Free project |
| Idempotency | Global `internal.operation_ledger` |
| MCP surface | 33 focused tools; `/health` bukan tool |

---

## 6. Struktur repository target

~~~text
content-producer/
├── README.md
├── AGENTS.md
├── .gitignore
├── .editorconfig
├── .env.example
│
├── plans/
│   ├── PRD.md
│   ├── database-design.md
│   ├── workflow-users.md
│   ├── implementation-plan.md
│   ├── module-contract.md
│   ├── trivia-content-dna.md
│   ├── tool-inventory.md
│   ├── use-case-inventory.md
│   ├── acceptance-traceability.md
│   └── phase-0-decision-register.md
│
├── docs/
│   ├── architecture/
│   ├── runbooks/
│   └── decisions/
│
├── plugin/
│   ├── plugin.json
│   ├── mcp.json
│   ├── .codex-plugin/
│   │   └── plugin.json
│   └── skills/
│       └── content-producer/
│           ├── SKILL.md
│           └── references/
│               ├── core/
│               └── niches/
│                   └── trivia/
│
├── auth-frontend/
│   ├── src/
│   └── static-host-config/
│
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   ├── migrations/
│   ├── functions/
│   │   ├── mcp/
│   │   │   └── index.ts
│   │   └── _shared/
│   │       ├── auth/
│   │       ├── config/
│   │       ├── contracts/
│   │       ├── core/
│   │       ├── database/
│   │       ├── mcp/
│   │       ├── modules/
│   │       │   └── trivia/
│   │       ├── observability/
│   │       └── validation/
│   └── tests/
│       ├── database/
│       ├── functions/
│       └── fixtures/
│
├── tests/
│   ├── concurrency/
│   ├── integration/
│   ├── mcp-contract/
│   ├── security/
│   ├── workflows/
│   └── evals/
│       └── trivia/
│
├── scripts/
│   ├── check.ts
│   ├── package-plugin.ts
│   ├── smoke-test.ts
│   ├── test-all.ts
│   └── verify-migrations.ts
│
└── artifacts/
    └── .gitkeep
~~~

Compatibility path **plugin/.codex-plugin/plugin.json** hanya dibuat jika pengujian host memerlukannya. Portable entry point tetap **plugin/plugin.json**, dengan **plugin/mcp.json** dan **plugin/skills/** pada root package.

Folder niche masa depan tidak dibuat kosong. Quotes, psychology, atau motivation ditambahkan hanya ketika implementasinya dimulai.

---

## 7. Dependency boundaries

~~~text
ChatGPT skill
      ↓
MCP tool metadata dan handler
      ↓
Core service / Trivia service
      ↓
Repository atau transactional RPC
      ↓
Supabase Postgres
~~~

Aturan:

- Plugin skill tidak mengakses database langsung.
- MCP transport handler tidak berisi business logic.
- Tool handler tidak berisi SQL inline.
- Core tidak mengimpor modul trivia.
- Trivia boleh menggunakan service dan contract core.
- Database tidak melakukan pekerjaan AI atau web research.
- Tool descriptions dan schemas menjadi bagian perilaku user-facing dan wajib diuji.
- Contract input/output memiliki satu sumber utama di backend, lalu didokumentasikan tanpa salinan yang divergen.

---

## 8. Environment strategy

### 8.1 Local

Digunakan untuk:

- Iterasi migration.
- Database tests.
- Edge Function local runtime.
- MCP Inspector.
- Unit dan integration tests.
- Test data yang dapat dihapus.

### 8.2 Production

Menggunakan satu Supabase Free project untuk:

- Postgres.
- Auth.
- Edge Function MCP.
- Secret storage.
- Logs.

Satu static HTTPS frontend terpisah hanya menangani login, OAuth consent/deny, logout, dan safe error state. Frontend bukan dashboard produk dan hanya memakai publishable key.

Baseline MVP memakai local environment sebagai staging teknis. CR-018 semula
memilih staging terisolasi untuk evaluasi ChatGPT Phase 8, tetapi CR-019
menunda gate itu. Runner GitHub menjalankan Supabase lokal sementara untuk
tes deterministik sebelum deployment Phase 9. Tool choice dan skill behavior
dibuktikan secara manual setelah plugin final terpasang pada Phase 10;
Inspector/Actions saja tidak membuktikannya. Tidak ada project staging
yang dibuat atau dipakai berdasarkan preflight Phase 8 yang blocked.

### 8.3 Free Plan constraints

Implementasi harus mengasumsikan:

- Satu Edge Function MCP.
- Request singkat dan stateless.
- Tidak ada AI generation di Edge Function.
- Batch diproses per post, bukan satu request panjang.
- Source snapshot menyimpan metadata ringkas, bukan isi artikel.
- Database size dipantau.
- Egress dan invocation dipantau.
- Project dapat dipause setelah periode tidak aktif.
- Migration dan export manual menjadi bagian strategi recovery.

Batas plan harus diperiksa ulang terhadap dokumentasi Supabase sebelum deployment karena dapat berubah.

---

## 9. Phase overview

| Phase | Nama | Output utama |
|---:|---|---|
| 0 | Specification freeze | Module contract dan trivia DNA final |
| 1 | Repository foundation | Struktur repo dan toolchain |
| 2 | Supabase local foundation | Local project dan migration pipeline |
| 3 | Core database | Delapan tabel core + dua tabel internal operasional |
| 4 | Trivia database | Facts, junction, dedup, reservation |
| 5 | RPC, lifecycle, dan security | Transactional API + RLS |
| 6 | MCP Edge Function | Remote Streamable HTTP server |
| 7 | Plugin skill dan package source | Validated skill/package source tanpa registered connection final |
| 8 | Verification suite | Full automated and content evaluation |
| 9 | Production deployment | Production database dan MCP |
| 10 | ChatGPT connection, package final, dan pilot | Verified remote MCP + installed private plugin + end-to-end workflow |
| 11 | Stabilization dan handoff | Operational readiness |

---

# Phase 0 — Specification freeze

## Tujuan

Menutup seluruh keputusan yang memengaruhi schema, tool contract, dan content behavior sebelum source code dibuat.

## Prasyarat

- PRD versi terbaru tersedia.
- Database design versi terbaru tersedia.
- Workflow user tersedia.

## Pekerjaan AI

1. Audit silang PRD, database design, dan workflow.
2. Membuat **plans/module-contract.md** yang menetapkan:
   - Config schema.
   - Content payload schema.
   - Format definitions.
   - Generation instructions.
   - System checks.
   - Editorial checks.
   - Dedup strategy.
   - Reservation/release behavior.
   - Source/attribution policy.
   - Performance dimensions.
   - Evaluation fixtures.
3. Membuat **plans/trivia-content-dna.md**:
   - Topic pillars.
   - Lima format editorial.
   - Fast-trivia dan practical-utility profiles.
   - Hook, CTA, caption, dan rendering.
   - Source hierarchy.
   - Sensitive-topic policy.
   - Dedup ontology v1.
   - Quality rubric.
   - Examples dan anti-examples.
4. Membuat tool inventory final.
5. Membuat use-case inventory:
   - Direct request.
   - Indirect request.
   - Edge cases.
   - Out-of-scope requests.
6. Membuat traceability matrix dari acceptance criteria ke phase dan test.
7. Menandai seluruh keputusan yang belum final.
8. Menyinkronkan seluruh dokumen normatif terhadap keputusan accepted.
9. Menjalankan audit final untuk coverage, tool-set equality, referensi, Markdown integrity, tenant isolation, quality gate, dedup eligibility, dan lineage; kemudian membekukan baseline.

## Pekerjaan manual pengguna

- Menyetujui keputusan editorial yang memerlukan preferensi pribadi.
- Mengonfirmasi nama Page awal jika akan dimasukkan ke seed/pilot.

## Deliverables

- plans/module-contract.md
- plans/trivia-content-dna.md
- plans/tool-inventory.md
- plans/use-case-inventory.md
- plans/acceptance-traceability.md
- plans/phase-0-decision-register.md dengan gate 0.12 lulus.

## Verification gate

- Tidak ada konflik antardokumen.
- Setiap requirement mempunyai implementation phase dan test.
- Tidak ada niche selain trivia dalam scope implementasi.
- Tidak ada keputusan schema kritis yang masih terbuka.
- Exact set 33 tools, 31 user goals, dan 101 frozen prompts konsisten pada seluruh artefak terkait.
- Tidak ada broken local document reference atau Markdown fence yang tidak seimbang.

## Rollback

Hanya perubahan dokumentasi. Revert perubahan dokumen bila keputusan ditolak.

---

# Phase 1 — Repository foundation

## Tujuan

Membuat monorepo, toolchain, conventions, dan quality commands yang menjadi dasar seluruh fase.

## Pekerjaan AI

1. Memeriksa environment dan versi tool.
2. Menggunakan help command resmi sebelum memakai Supabase CLI.
3. Memverifikasi baseline platform saat implementasi: Node.js 24.15.0 untuk local dan CI, Supabase CLI minimal versi yang diwajibkan panduan Edge MCP current (saat baseline 0.11: 2.117.0), serta Docker untuk local Supabase/Edge Runtime. Standalone Deno opsional untuk formatter, linter, test runner, dan LSP langsung; versi dependency final dipin setelah verification.
4. Membuat struktur repository target.
5. Membuat:
   - README.md
   - AGENTS.md
   - .gitignore
   - .editorconfig
   - .env.example
6. Menentukan Deno/TypeScript configuration untuk Edge Function.
7. Membuat scripts:
   - check
   - test-all
   - verify-migrations
   - package-plugin
   - smoke-test
8. Menyiapkan dependency pinning dan lockfile.
9. Menyiapkan lint, format, type-check, dan unit-test command.
10. Memastikan artifacts dan local secrets di-ignore.
11. Membuat baseline CI hanya jika repository remote dan kewenangan tersedia.

## Pekerjaan manual pengguna

- Memberikan izin instalasi dependency bila diminta.
- Login GitHub atau Supabase bila belum aktif.
- Menyetujui pembuatan CI atau push remote jika diperlukan.

## Deliverables

- Struktur repository.
- Toolchain yang dapat dijalankan.
- Lockfile.
- Baseline developer documentation.

## Verification gate

- Fresh checkout dapat memasang dependency.
- Lint, format check, type-check, dan empty test suite berhasil.
- Tidak ada secret tracked.
- Plugin dan Supabase folders memiliki boundary jelas.

## Rollback

- Hapus dependency atau config yang gagal melalui perubahan Git terarah.
- Jangan menghapus dokumen plans.

---

# Phase 2 — Supabase local foundation

## Tujuan

Membuat Supabase local environment dan migration workflow yang dapat direproduksi.

## Pekerjaan AI

1. Menginisialisasi Supabase project lokal.
2. Memeriksa CLI version dan command melalui help.
3. Menyiapkan config local.
4. Mengaktifkan extension yang diperlukan:
   - pgcrypto.
   - pg_trgm.
5. Menentukan configured business schema, platform schema, object-privilege, dan RLS policy lokal secara terpisah.
6. Menetapkan `api` sebagai satu-satunya business RPC surface. `public` dan `storage` dapat tersertakan secara teknis oleh platform, tetapi `public` hanya storage tabel bisnis tanpa direct Data API access, `storage` hanya platform surface, dan `internal` tidak dikonfigurasi maupun diberi caller grants. `graphql_public` tidak dipertahankan bila GraphQL tidak digunakan.
7. Membuat test harness database.
8. Membuat helper untuk reset, seed, dan verification.
9. Membuktikan database kosong dapat start, reset, dan menerima migration baseline.
10. Mendokumentasikan local development.

## Pekerjaan manual pengguna

- Menjalankan Docker/Desktop runtime jika AI tidak dapat mengaktifkannya.
- Memberikan permission sistem bila local runtime memerlukannya.

## Deliverables

- supabase/config.toml
- Migration pipeline kosong tetapi berfungsi.
- Local seed/test harness.
- docs/runbooks/local-development.md

## Verification gate

- Local Supabase start berhasil.
- Database reset berhasil.
- Extensions tersedia.
- Test harness dapat menjalankan satu smoke test.

## Rollback

- Reset local database.
- Hapus hanya generated local state; migration source tetap disimpan.

---

# Phase 3 — Core database

## Tujuan

Mengimplementasikan seluruh tabel core, constraint, index, dan config validation.

## Migration groups

Migration dibuat melalui Supabase CLI berdasarkan kelompok berikut, tanpa mengarang filename:

1. Workspace dan niche registry.
2. Internal operation ledger dan rate-limit buckets.
3. Pages dan page niche configs.
4. Content plans dan plan items.
5. Posts dan post metrics.
6. Core indexes dan validation helpers.

## Pekerjaan AI

1. Membuat tabel:
   - workspaces.
   - niches.
   - pages.
   - page_niche_configs.
   - content_plans.
   - content_plan_items.
   - posts.
   - post_metrics.
2. Membuat `internal.operation_ledger` dan `internal.rate_limit_buckets` yang tidak diekspos.
3. Menambahkan public ID, ownership, timestamps, audit link ke operation ledger yang terikat workspace, dan revision.
4. Menambahkan claim lease fields pada plan item serta content hash/approval snapshot pada post.
5. Menambahkan composite foreign keys untuk workspace/Page/niche.
6. Menambahkan lifecycle constraints.
7. Menambahkan schedule indexes.
8. Menambahkan advisory-lock helper untuk Page+scheduled_at.
9. Menambahkan JSON validators:
   - Workspace settings.
   - Trivia page config v1.
   - Plan config.
   - Post payload envelope.
   - System/editorial checks.
   - Metrics payload.
10. Seed registry niche trivia.
11. Membuat database tests untuk setiap invariant.

## Pekerjaan manual pengguna

Tidak ada, kecuali permission local runtime.

## Deliverables

- Core migrations.
- Core validators.
- Core database tests.
- Seed niche trivia.

## Verification gate

- Delapan tabel core dan dua tabel internal operasional tersedia.
- Semua FK, unique, check, dan index lulus inspection.
- Cross-workspace write ditolak.
- Audit link business row ke operation ledger lintas-workspace ditolak.
- Dua slot Page sama tidak dapat dibuat paralel.
- Plan dapat menyimpan item sebelum post dibuat.
- Metrics hanya valid untuk post published sesuai rule.
- Operation key unik global dan replay/payload-mismatch semantics lulus.
- Claim lease shape serta approval/content-hash shape valid.
- Reset database dari nol lulus.

## Rollback

- Local: reset database.
- Production belum disentuh.

---

# Phase 4 — Trivia database module

## Tujuan

Mengimplementasikan canonical facts, deduplication, source/freshness, reservation, reuse, dan post–fact junction.

## Pekerjaan AI

1. Membuat:
   - trivia_facts.
   - trivia_post_facts.
2. Membuat normalization v1.
3. Membuat ontology v1:
   - Subject aliases.
   - Relation allowlist.
   - Object normalization.
   - Unit conversion.
   - Negation.
   - Time/location qualifiers.
4. Membuat claim hash, structured hash, dan eligibility flag yang hanya diisi validator server untuk structured match yang lengkap serta deterministic-safe.
5. Membuat search vector dan trigram indexes.
6. Membuat source validator.
7. Membuat freshness policy.
8. Membuat reservation state dan TTL.
9. Membuat fact lifecycle `needs_review/verified/rejected/invalidated/superseded`, dedup review snapshot, re-verification, dan correction lineage.
10. Membuat allocation states:
   - allocated.
   - published.
   - released.
11. Menambahkan immutable source/hash/identity/freshness snapshots.
12. Menambahkan topic_key dan fact_role.
13. Membuat trigger proteksi canonical meaning.
14. Membuat gold dedup fixture minimal 150 unique cases dengan frozen holdout:
   - Exact duplicates.
   - Paraphrases.
   - Unit variants.
   - Anti-duplicates.
   - Risky claims.
15. Membuat database tests untuk dedup, structured-match eligibility, reuse, source, freshness, correction lineage termasuk self-reference/cycle, dan junction.

## Pekerjaan manual pengguna

- Mengonfirmasi jika fixture menemukan pasangan referensi yang secara editorial ambigu.

## Deliverables

- Trivia migrations.
- Normalization/ontology implementation.
- Gold evaluation set.
- Trivia database tests.

## Verification gate

- Exact duplicate dan eligible structured-duplicate constraints lulus; structured collision yang belum eligible masuk review tanpa false merge.
- Known paraphrase candidate recall mencapai target dokumen database.
- Tidak ada false merge pada anti-duplicate gold set.
- Workspace/page reuse berjalan sesuai config.
- Released junction tidak memblokir reuse.
- Junction tidak dapat menunjuk post non-trivia.
- Canonical meaning tidak dapat diubah setelah pernah dipakai.
- Reverify mempertahankan identity; correction/invalidation menjaga lineage dan tidak menulis ulang published snapshot.

## Rollback

- Local reset.
- Perubahan ontology dilakukan dengan version increment, bukan rewrite diam-diam.

---

# Phase 5 — Transactional RPC, lifecycle, dan security

## Tujuan

Membuat seluruh operasi write atomic, owner-scoped, idempotent, dan aman terhadap concurrency.

## Pekerjaan AI

1. Membuat 33 public `api` operations satu-to-satu dengan `plans/tool-inventory.md`; helper internal boleh digunakan tetapi tidak ada generic executor/status mutation.
2. Menerapkan global operation-ledger idempotency, canonical request hash, replay snapshot, dan payload mismatch rejection.
3. Menerapkan expected-revision dan expected-content-hash compare-and-swap.
4. Menerapkan global lock ordering dan timeout mapping.
5. Menerapkan advisory lock jadwal lintas plan items dan posts.
6. Menerapkan plan claim, one-time renewal, safe failure, retry, explicit replacement, cancellation, serta stale recovery.
7. Menerapkan opportunistic reservation cleanup, all-or-nothing reservation set, dan token/context validation.
8. Menerapkan fact re-verification, correction, invalidation, successor lineage, dan dampaknya pada draft/ready/posted snapshots.
9. Menerapkan lifecycle:
   - draft → ready.
   - ready → draft saat revisi.
   - draft/ready → discarded.
   - ready → posted.
   - posted → archived.
10. Menerapkan server renderer, content hash, system checks, editorial attestation, owner approval, revoke, dan warning acceptance.
11. Menerapkan release/publish junction secara atomic.
12. Mengaktifkan RLS pada seluruh tabel business/internal sebagai defense in depth.
13. Membuat owner policies menggunakan auth.uid().
    - Policy untuk function-owner role sempit harus mempunyai ownership predicate yang sama; policy `TO authenticated` tidak dianggap berlaku otomatis.
14. Menetapkan `api` sebagai satu-satunya business RPC surface, menulis grants eksplisit, dan mencabut seluruh direct table read/write dari authenticated. `public` dan `storage` dapat tersertakan secara teknis oleh platform, tetapi bukan business RPC surface; `internal` tidak dikonfigurasi sebagai business/Data API schema dan tidak menerima caller grants. Schema inclusion, object privileges, dan RLS tetap diverifikasi sebagai kontrol terpisah.
15. Membuat narrow RPC allowlist dan database-backed rate limits.
16. Menggunakan SECURITY INVOKER untuk helper yang tidak memerlukan elevated table access.
17. Karena authenticated tidak mempunyai direct table privileges, membuat business RPC sebagai SECURITY DEFINER yang dimiliki role sempit `content_producer_api_owner` (`NOLOGIN`, tanpa `BYPASSRLS`, bukan table owner):
    - Tempatkan entry point pada `api` dan helper pada schema internal yang tidak diekspos.
    - Tetapkan `search_path = ''` dan gunakan fully qualified names.
    - Periksa auth.uid(), OAuth client context, dan ownership di setiap operation.
    - Pertahankan RLS; revoke PUBLIC/anon dan grant execute satu per satu hanya kepada authenticated.
18. Membuat stable error-code mapping.
19. Menjalankan database advisors.

## Pekerjaan manual pengguna

Tidak ada pada local environment.

## Deliverables

- RPC migrations.
- RLS/grants migrations.
- Error contract implementation.
- Security tests.
- Concurrency tests.

## Verification gate

- User tanpa token ditolak.
- Non-owner tidak dapat membaca atau menulis.
- Direct table reads dan writes ditolak.
- RPC owner berhasil.
- Sepuluh reservation paralel menghasilkan satu pemenang.
- Dua revisi paralel menghasilkan satu pemenang.
- Schedule collision menghasilkan satu pemenang.
- Retry compatible bersifat idempotent.
- Retry operation key dengan payload berbeda ditolak.
- Claim lease/reclaim, correction race, approval hash, revoke, dan rate-limit tests lulus.
- Database advisors tidak memiliki temuan security kritis.

## Rollback

- Revert migration lokal dan reset.
- Jangan melonggarkan RLS untuk memperbaiki test.
- Jangan menambah SECURITY DEFINER sebagai workaround permission.

---

# Phase 6 — MCP Edge Function

## Tujuan

Menyediakan satu MCP server Streamable HTTP yang mengekspos focused tools kepada ChatGPT.

## Pekerjaan AI

1. Membuat **supabase/functions/mcp/index.ts** sebagai entry point tipis.
2. Membuat shared MCP server dan tool registry.
3. Menambahkan OAuth protected-resource discovery, `WWW-Authenticate`, dan token validation untuk issuer, audience/resource, exp/nbf, scopes, OAuth client, dan owner.
4. Menetapkan `[functions.mcp] verify_jwt = false` agar discovery/challenge mencapai middleware; tidak ada tool yang boleh berjalan sebelum middleware auth lulus.
5. Membuat request context:
   - Request ID.
   - Actor ID.
   - Workspace scope.
   - Safe logger.
6. Mendaftarkan 33 tools secara bertahap.
7. Memberikan setiap tool:
   - Action-oriented name.
   - Human-readable title.
   - Kapan tool digunakan.
   - Explicit input schema.
   - Explicit output schema.
   - Accurate annotations.
   - Safe structured errors.
8. Menambahkan server instructions untuk urutan lintas-tool.
9. Menetapkan readOnlyHint, destructiveHint, openWorldHint, dan idempotent behavior secara akurat.
10. Membatasi payload dan result size.
11. Menghubungkan database-backed rate-limit groups.
12. Tidak mengembalikan internal bigint, secret, raw SQL, atau stack trace.
13. Membuat structuredContent dan ringkasan text yang konsisten.
14. Menyediakan `GET /health` operasional di luar MCP tool list.
15. Membuat function tests.

## Tool build order

### Foundation

- get_account_profile.
- get_workspace_context.
- list_pages.
- get_page_generation_context.

### Page dan plan

- create_page.
- update_page.
- list_content_plans.
- create_content_plan.
- get_content_plan.
- claim_content_plan_items.
- renew_content_plan_claim.
- report_content_plan_item_failure.
- retry_content_plan_item.
- replace_discarded_plan_item.
- cancel_content_plan.

### Trivia

- trivia_find_similar_facts.
- trivia_register_and_reserve_facts.
- trivia_release_facts.
- trivia_reverify_fact.
- trivia_correct_fact.

### Posts

- save_post.
- list_posts.
- get_post.
- revise_post.
- reschedule_post.
- approve_post.
- revoke_post_approval.
- discard_post.
- mark_post_posted.
- archive_post.

### Metrics

- record_post_performance.
- get_post_performance.
- get_performance_insights.

## Pekerjaan manual pengguna

Tidak ada untuk local implementation.

## Deliverables

- Edge Function source.
- Tool schemas.
- Tool annotations.
- MCP instructions.
- MCP contract tests.

## Verification gate

- MCP initialization berhasil.
- Tepat 33 tools terdaftar dan metadata cocok dengan tool inventory.
- Input invalid ditolak secara terstruktur.
- Auth dipaksakan pada private reads dan writes.
- Read/write annotations sesuai perilaku.
- Tool call tipikal selesai jauh di bawah limit Edge Function.
- Tidak ada secret dalam response/log.
- MCP Inspector dapat menjalankan seluruh tool.

## Rollback

- Revert Edge Function source.
- Database tetap dapat diuji melalui RPC tanpa MCP.

---

# Phase 7 — Plugin skill dan package source

## Tujuan

Membuat workflow skill dan package source yang siap difinalkan setelah remote MCP production terbukti terhubung. Phase ini tidak mengarang endpoint atau registered connection ID.

## Pekerjaan AI

1. Membuat portable **plugin/plugin.json** dengan identity dan presentation metadata tervalidasi.
2. Menyiapkan schema/generator untuk **plugin/mcp.json** tanpa membuat file final berisi placeholder; file dengan URL production baru dibuat pada Phase 10 setelah custom MCP connection lulus.
3. Menyiapkan compatibility manifest hanya jika dibutuhkan hasil test host; registered mapping tidak dibuat sebelum technical ID terverifikasi.
4. Membuat **plugin/skills/content-producer/SKILL.md**.
5. Membuat references/core:
   - workflow.
   - lifecycle.
   - tool sequence.
   - source policy.
   - output contract.
6. Membuat references/niches/trivia:
   - content DNA.
   - formats.
   - fact checking.
   - dedup ontology.
   - quality rubric.
7. Menetapkan skill sebagai workflow layer:
   - Menentukan Page dan niche.
   - Membaca context.
   - Research di ChatGPT.
   - Mencari duplikat.
   - Reserve.
   - Compose.
   - Evaluate.
   - Save draft.
   - Revise/approve/discard.
   - Record performance.
8. Memastikan skill tidak meminta secret.
9. Memastikan skill tidak menganggap tool response sebagai authorization.
10. Membuat package validation dan packaging script tanpa mengunggah package.

## Pekerjaan manual pengguna

- Tidak ada sampai tahap instalasi ke ChatGPT.

## Deliverables

- Portable plugin source/package candidate.
- Content Producer skill.
- Plugin package tests.
- Artifact candidate lokal; final installable artifact dibuat pada Phase 10.

## Verification gate

- Manifest valid.
- Path package tidak keluar dari plugin root.
- MCP config schema valid dan tidak berisi endpoint/connection ID rekaan.
- Skill metadata dan instructions dapat dimuat.
- Instruksi core dan trivia tidak bertentangan.
- Package candidate tidak mengandung secret, test database, atau data production.

## Rollback

- Revert package files tanpa memengaruhi backend.

---

# Phase 8 — Full verification suite

> **Status aktif: Deferred by CR-019.** Rencana dan gate CR-018 di bawah
> dipertahankan sebagai riwayat, bukan instruksi eksekusi MVP. Checkpoint 8.0
> berhenti `BLOCKED`; jangan memulai 8.1–8.13 atau menandai Phase 8 `Complete`.
> Gate teknis/keamanan dijalankan sebelum deployment Phase 9; skenario manual
> inti dijalankan setelah plugin final terpasang pada Phase 10. Inventaris 101
> kasus tetap utuh tanpa klaim eksekusi live.

## Tujuan

Membuktikan seluruh acceptance pre-production sebelum production disentuh,
menurut CR-018. Matriks tetap memuat seluruh 14 acceptance criteria PRD:
komponen yang memerlukan endpoint/OAuth production atau paket/pilot final
ditandai `DEFERRED-to-Phase-9/10`, bukan diklaim lulus dari staging. Final
MVP acceptance tetap menunggu bukti Phases 9–10.

## Pekerjaan AI

### Static checks

- Format.
- Lint.
- Type-check.
- Dependency audit.
- Manifest validation.
- Migration consistency.

### Database tests

- Schema.
- FK dan unique.
- JSON validators.
- RLS.
- Grants.
- Deduplication.
- Reservation.
- Reuse.
- Lifecycle.
- Plan/resume.
- Metrics.
- Idempotency.
- Claim leases dan stale recovery.
- Fact reverify/correction lineage.
- Content hash, approval snapshot, dan rate limits.

### MCP tests

- Tool discovery.
- Schemas.
- Annotations.
- Auth.
- Error mapping.
- Payload limits.
- Response safety.
- Tepat 33 tools serta `/health` yang tidak masuk tool list.
- OAuth discovery, PKCE/resource/scopes, relink, dan token success `2xx`.

### Concurrency tests

- Sepuluh fact reservations.
- Dua post revisions.
- Dua plan claims.
- Plan item versus direct post pada slot sama.
- Repeated release.
- Repeated status transition.
- Fact correction versus approval/publish.
- Lost response dan operation-ledger replay.

### Workflow tests

- Create Page.
- Single post.
- Replace fact.
- Approve.
- Discard.
- Publish.
- Archive.
- Batch.
- Calendar.
- Interrupt/resume.
- Cross-chat retrieval.
- Record metrics.
- Performance insights.
- Revoke approval, metrics history, plan replacement/cancel, fact reverify/correct.

### Prompt dan tool-selection evaluation

- Jalankan 101 frozen prompts dari `plans/use-case-inventory.md`.
- Direct pass 100%, indirect minimal 90%, overall minimal 95%, dan hard fail 0.
- Buktikan 33/33 positive paths dan 33/33 boundary/recovery paths.
- Jalankan generated paraphrases sebagai robustness supplement tanpa mengganti frozen cases.
- Gunakan custom MCP pada staging terisolasi untuk E3, kemudian private test
  plugin yang memuat skill dan terhubung hanya ke staging untuk E4. Ikuti
  repetition, scoring, fresh-conversation, dan fixture-reset policy frozen.
  Koneksi/paket uji bukan koneksi/paket final production Phase 10.

### Content evaluation

- Lima format trivia.
- Dua length profiles.
- Seluruh topic groups.
- Global English clarity.
- Source sufficiency.
- Sensitive claims.
- Text budget.
- Non-copying.
- Known duplicates dan anti-duplicates.

### Performance tests

- Generation context.
- Similar fact search.
- Reservation.
- Save post.
- Plan progress.
- Latest metrics.
- Insight aggregation.

## Pekerjaan manual pengguna

- Menilai sampel output editorial final.
- Menyetujui bahwa hasil cukup merepresentasikan DNA yang diinginkan.

## Deliverables

- Full test report.
- Content evaluation report.
- Security/advisors report.
- Performance baseline.
- Acceptance-criteria matrix.
- Requirement trace report terhadap `plans/acceptance-traceability.md`.
- Frozen prompt/tool-selection report.

## Verification gate

- Seluruh porsi pre-production acceptance criteria PRD lulus; porsi
  deployment-dependent `AC-001`/`AC-012` dan E5 dicatat secara eksplisit
  sebagai deferred ke Phase 9–10 menurut CR-018. Status Phase 8 `Complete`
  bukan status final acceptance MVP.
- Seluruh requirement trace mempunyai evidence dan threshold prompt suite tercapai.
- Tidak ada security issue kritis/high yang belum diterima.
- Tidak ada data-integrity failure.
- Output editorial sampel staging disetujui pengguna; pilot production
  memerlukan penilaian tersendiri pada Phase 10.
- Seluruh command dapat diulang dari fresh checkout.

## Rollback

- Tes deterministik tetap memakai local environment sementara di runner.
  Reset/dispose fixture dan koneksi staging uji bila E3/E4 gagal; production
  tidak disentuh oleh rollback Phase 8.
- Perbaiki fase pemilik defect; jangan patch test agar menutupi defect.

---

# Phase 9 — Production deployment

## Tujuan

Men-deploy database dan MCP ke satu Supabase Free project secara aman dan dapat dipulihkan.

## Prasyarat

- CR-019/CR-020 dan dokumen sinkron telah di-merge ke `main`. Phase 8 berstatus
  `Deferred`, bukan gate yang telah lulus.
- Bekukan satu SHA kandidat deployment setelah kode backend, migration,
  konfigurasi, dan dokumen selesai. Paket plugin final dapat difinalkan
  sesudah koneksi production terbukti pada Phase 10. Sebelum migration,
  konfigurasi/secret write, atau
  deployment pertama ke production, jalankan **satu** GitHub Actions gate
  pada SHA itu: frozen install, satu clean Supabase local reset,
  `pnpm run test-all` (termasuk `check`, nama migration, MCP, dan database),
  verifikasi source/applied migration, security advisors, audit katalog 33
  API RPC dan 33 MCP tools beserta RLS/grants, MCP Inspector valid/invalid/auth,
  dan `git diff --check`. Uji authenticated non-owner melalui jalur server/RPC
  terhadap Supabase lokal sementara. Jangan jalankan `smoke-test` yang
  menduplikasi suite database pada gate yang sama. Setelah perbaikan, jalankan
  tes terfokus lalu gate penuh sekali pada SHA final baru. Defect security
  critical/high dan data-integrity diselesaikan sebelum production write.
- Supabase production project tersedia.
- Owner menyelesaikan login.
- Backup/export strategy disetujui.

## Pekerjaan AI

1. Memeriksa changelog dan dokumentasi Supabase terbaru.
2. Memeriksa Supabase CLI version dan help; jangan melanjutkan bila lebih rendah dari minimum panduan Edge MCP current.
3. Menautkan repository ke project yang benar.
4. Memvalidasi target project ID sebelum write.
5. Membuat pre-deployment export jika data sudah ada.
6. Menjalankan migration secara berurutan.
7. Memverifikasi migration list.
8. Mengonfigurasi Supabase Auth sebagai OAuth 2.1 authorization server, discovery, DCR/client policy, Site URL, dan authorization path.
9. Men-deploy frontend auth minimal dengan `/login`, `/oauth/consent`, `/logout`, approve/deny, safe error state, dan publishable key saja.
10. Mengonfigurasi `api` sebagai satu-satunya business RPC surface; membedakan schema platform yang tersertakan secara teknis (`public`/`storage`) dari schema bisnis yang diizinkan, dan tidak mempertahankan `graphql_public` bila GraphQL tidak digunakan.
11. Mengonfigurasi explicit grants, default-privilege revokes, RLS, dan secrets; keberadaan schema platform tidak memberi direct business-object access.
12. Menetapkan Edge Function `mcp` `verify_jwt = false`, lalu mengandalkan protected-resource/OAuth middleware di dalam function.
13. Men-deploy Edge Function MCP dan HTTP `/health`.
14. Seed niche trivia.
15. Membuat workspace owner melalui flow aman; public signup tetap disabled.
16. Menjalankan smoke tests termasuk seluruh token success `2xx` behavior.
17. Menjalankan database advisors.
18. Memeriksa logs tanpa membocorkan secret.
19. Menulis deployment report.

## Pekerjaan manual pengguna

- Login Supabase.
- Mengizinkan link/deployment bila diminta.
- Menyelesaikan konfigurasi atau consent OAuth yang membutuhkan akun.
- Memasukkan secret melalui dashboard/secure prompt jika AI tidak dapat melakukannya.

## Deliverables

- Production schema.
- Production Edge Function URL.
- Auth configuration.
- Auth frontend URL/deployment.
- Deployment report.
- Backup/export awal.

## Verification gate

- HTTP `/health`, MCP initialize, dan 33-tool discovery production berhasil.
- Request tanpa auth ditolak.
- Owner request berhasil.
- Denial lintas owner terbukti pada tes authenticated non-owner otomatis;
  uji produksi dengan identitas kedua hanya bila tersedia secara aman.
- OAuth discovery, PKCE consent/deny, refresh/relink, dan token `2xx` berhasil.
- RLS production sesuai local.
- Semua migration tercatat.
- Smoke workflow tidak meninggalkan reservation bocor.
- Usage baseline tercatat.

## Rollback

- Jika function gagal: redeploy versi terakhir yang lulus.
- Jika migration gagal sebelum commit: transaction rollback.
- Jika migration sudah terpasang: gunakan forward-fix migration atau restore sesuai runbook; jangan mengedit history.
- Jika security gagal: nonaktifkan endpoint/tool terkait sampai perbaikan lulus.

---

# Phase 10 — ChatGPT connection, package final, dan pilot

## Tujuan

Membuktikan remote MCP sebagai custom server terlebih dahulu, lalu memfinalkan
plugin private dan menyelesaikan alur pilot hingga konten siap disalin dan
disetujui owner. Publikasi Facebook dan observasi metrik nyata bersifat
opsional setelah MVP menurut CR-027.

Jalankan checkpoint kecil 10.0–10.7 sesuai
`plans/works/phase-10-implementation-plan.md`, satu task per checkpoint.
Menurut CR-028, 10.0 membuktikan formulir custom MCP/OAuth dan jalur
GitHub Actions artifact ke penerima plugin private, **tanpa** membuat koneksi
atau memasang paket final. Setelah koneksi/OAuth awal 10.1, periksa
ketersediaan tool write dan persetujuan owner secara baca-saja **sebagai gate
pertama**, sebelum pemanggilan tool baca biasa atau persiapan paket. Jika
tidak terbukti, hentikan 10.1. Paket final dipasang pada 10.2; write bisnis
pertama hanya pada MAN-02 dengan payload Page yang disetujui. Asumsi Plus
pada PRD §34 bukan bukti izin write; jangan pakai SQL administrator sebagai
jalan pintas.

CR-019 menunda koneksi staging dan private test plugin Phase 8. CR-020/CR-027
menetapkan sembilan kartu manual wajib setelah plugin final terpasang, dengan
dua kartu observasi opsional setelah MVP. Koneksi MCP
production dan plugin private final dibuktikan di fase ini. Pemilik menjalankan
prompt persis dari panduan; AI menyiapkan panduan dan menilai bukti seperlunya.
Inventaris 101 prompt tidak wajib dijalankan live untuk MVP. Kartu lintas
owner tidak dibebankan pada pemilik; denial tersebut dibuktikan otomatis.

## Pekerjaan AI

1. Menyiapkan URL MCP production dan connection instructions.
2. Menambahkan remote MCP sebagai custom server, menyelesaikan OAuth, dan memverifikasi profile, initialize, serta 33 tools.
3. Memeriksa custom server dengan prompt koneksi/owner terfokus dan mencatat hasilnya sebelum memfinalkan plugin.
4. Setelah koneksi terbukti, memfinalkan `plugin/mcp.json`, portable package, dan bila diperlukan registered MCP mapping dengan technical ID yang benar.
5. Memvalidasi, membuat artifact final, lalu membimbing instalasi private plugin.
6. Menyiapkan sembilan kartu wajib `MAN-01..MAN-09` menurut CR-020/CR-027.
   Pertahankan `MAN-10..MAN-11` sebagai panduan observasi opsional setelah MVP.
   Bekukan prosedur dan urutan langkah, prasyarat, expected tool/behavior,
   hasil terlarang, pemeriksaan state dan recovery pada 10.0. Ikat nilai
   Page/konten/jadwal sesaat sebelum kartu yang menggunakannya dan bekukan
   prompt persis itu sebelum dieksekusi, sesuai CR-028.
   `MAN-01..MAN-09` mencakup koneksi/owner, Page, draft dan sumber, revisi/
   approval, plan dan jadwal, resume chat baru, copy/editorial, ambiguitas,
   serta permintaan publikasi otomatis atau sumber berbahaya. Kartu opsional
   `MAN-10` hanya setelah publikasi Facebook nyata; `MAN-11` hanya dengan
   metrik nyata.
7. Membimbing pemilik menjalankan tiap kartu sekali pada plugin terpasang,
   dengan chat baru bila skenario memerlukan konteks segar. Ulangi hanya
   kartu gagal atau terdampak perbaikan. Catat ID, prompt, versi plugin,
   referensi percakapan, nama tool terpilih, hasil, state aman, status, dan
   catatan singkat; detail argumen/result teredaksi hanya bila diperlukan.
   Jangan mengklaim PASS dari log server saja.
8. Memperbaiki instructions atau descriptions bila model memilih tool salah,
   lalu ulangi skenario yang gagal atau terpengaruh dan tes teknis terkait.
9. Membuat satu Page tambahan dan config trivia melalui plugin pada `MAN-02`,
   hanya dengan data yang disetujui pemilik. Page pilot Phase 9.5 yang sudah
   ada tetap tersimpan sebagai bukti historis; gunakan Page baru yang dipilih
   pemilik untuk kartu berikutnya.
10. Menghasilkan batch pilot kecil.

Pilot production itu tidak otomatis membuktikan ambang `AC-002` (tiga Page
berkonfigurasi berbeda), `AC-007` (tujuh post), atau `AC-008` (kalender tujuh
hari). Gunakan bukti deterministic local/CI yang benar-benar mencakup ambang
tersebut; bila belum ada, pertahankan kriteria terkait sebagai `PENDING` dan
lengkapi tes terfokus. Jangan membuat data production tambahan hanya untuk
mencapai angka acceptance.

## Pekerjaan manual pengguna

- Membuka custom MCP flow, lalu Plugin Directory setelah koneksi lolos.
- Menyelesaikan OAuth consent dan memasang/mengaktifkan plugin final.
- Memberikan preferensi Page.
- Meninjau dan menyetujui konten.
- Menyalin dan meninjau output yang siap dipakai di Canva/Facebook; pemindahan
  ke Canva dan publikasi Facebook sungguhan boleh dilakukan setelah MVP.
- Menjalankan prompt persis dari panduan di ChatGPT, meninjau hasil dan tool
  call yang terlihat, serta memberikan bukti aman tanpa token atau secret.

## Deliverables

- Plugin terpasang.
- Custom MCP connection dan registered mapping yang terverifikasi.
- Satu Page tambahan yang disetujui pemilik dan dibuat melalui plugin.
- Pilot draft/ready posts yang disetujui pemilik.
- End-to-end test report.
- Panduan dan laporan sembilan kartu manual wajib. `MAN-10..MAN-11` dicatat
  `DEFERRED — POST-MVP` sampai ada publikasi dan metrik sungguhan.

## Verification gate

- Owner dapat menggunakan bahasa natural tanpa memilih tool manual.
- Draft tersimpan sebelum dinyatakan berhasil.
- Revisi dan approval benar; discard dan lifecycle lain dibuktikan pada
  kontrak/RPC otomatis serta pilot bila benar-benar digunakan.
- Plan dapat dilanjutkan pada chat baru.
- Canva copy dapat dipakai tanpa pembersihan wajib.
- Source internal tersedia.
- Tidak ada data Page lain atau internal secret terekspos; cross-owner denial
  dibuktikan dalam gate otomatis, bukan dengan meminta akun kedua dari owner.
- `MAN-01..MAN-09` lulus tanpa unauthorized write, secret leak, klaim
  publikasi palsu, atau bypass blocking quality check. Ini memberi status
  `Pilot-ready` setelah gate Phase 9 lulus, belum `MVP Complete`.
- Kapabilitas lifecycle posted dan metrik/insight lulus tes deterministik
  dengan fixture sintetis di database terisolasi. `MAN-10..MAN-11` hanya dapat
  lulus dengan publikasi/metrik asli dan tidak menjadi gate MVP.
- Bila backend deployment SHA tetap sama dan hanya paket/instruksi plugin
  berubah setelah gate Phase 9, gunakan bukti gate backend yang sudah lulus,
  lalu jalankan validasi paket serta tes MCP/skill dan kartu manual terdampak.
  Catat SHA backend dan SHA paket final; perubahan backend/security menuntut
  gate penuh baru.

## Rollback

- Nonaktifkan plugin atau MCP mapping.
- Backend dan data tetap tersedia untuk diagnosis.

---

# Phase 11 — Stabilization dan handoff

## Tujuan

Menjadikan sistem siap digunakan rutin dan mudah dipelihara oleh AI pada iterasi berikutnya.

## Pekerjaan AI

1. Memantau error pilot.
2. Memperbaiki bug dan menambah regression tests.
3. Meninjau query performance.
4. Meninjau Edge Function duration, CPU, memory, invocations, dan egress.
5. Meninjau database size dan index growth.
6. Memastikan reservation cleanup bekerja.
7. Menguji export dan restore.
8. Menyelesaikan runbooks:
   - Deploy.
   - Rollback.
   - Backup/export.
   - Restore.
   - Auth recovery.
   - Project pause/restore.
   - Incident response.
9. Membuat operational checklist.
10. Membuat procedure penambahan niche baru.
11. Memastikan seluruh dokumentasi sesuai implementasi akhir.

## Pekerjaan manual pengguna

- Memberikan metrik nyata hanya jika tersedia untuk observasi opsional
  `MAN-11` setelah MVP; tidak ada kewajiban membuat metrik untuk menutup fase.
- Menilai rekomendasi editorial.
- Menyetujui go-live rutin.

## Deliverables

- Stable MVP.
- Regression suite.
- Runbooks lengkap.
- Final architecture documentation.
- Handoff report.

## Verification gate

- Tidak ada defect kritis terbuka.
- Restore procedure terbukti.
- User workflow terdokumentasi.
- AI dapat melanjutkan maintenance dari repository tanpa konteks chat lama.
- Pengguna menyetujui production readiness.
- Seluruh acceptance criteria PRD memiliki bukti manual atau otomatis yang
  sesuai sebelum `MVP Complete`; `MAN-10..MAN-11` adalah observasi opsional
  setelah MVP. Pilot terbatas boleh berjalan lebih dahulu dengan status
  `Pilot-ready`.

## Rollback

- Rollback perubahan stabilisasi per migration atau deployment terakhir yang tervalidasi.
- Pertahankan regression test untuk defect yang ditemukan meskipun implementasi perbaikannya dibatalkan.
- Jika production readiness gagal, kembalikan status ke pilot terbatas dan lanjutkan perbaikan pada Phase 11.

---

## 10. Test command policy

Satu command agregat harus menjalankan pemeriksaan proporsional:

~~~text
format check
→ lint
→ type-check
→ unit tests
→ database tests
→ MCP contract tests
→ integration tests
→ security checks
~~~

Test berat seperti concurrency, full eval, advisors, dan production smoke dapat memiliki command terpisah, tetapi harus dipanggil pada phase gate yang sesuai.

Tidak boleh menyatakan fase selesai hanya karena source code sudah ditulis.

---

## 11. Observability baseline

Setiap MCP request mencatat:

- Request ID.
- Tool name.
- Start time dan duration.
- Success/error code.
- Actor public scope bila aman.
- Workspace/Page/post/fact public IDs bila relevan.
- Reservation atau revision conflict.

Tidak dicatat:

- Authorization header.
- JWT.
- Service role key.
- Database password.
- Seluruh chat.
- Seluruh source content.
- Seluruh generated post kecuali diperlukan dan telah disanitasi.

Alert otomatis tidak wajib pada Free MVP. AI memeriksa dashboard/log ketika ada kegagalan atau saat phase gate.

---

## 12. Free Plan monitoring

Setelah production, review berkala mencakup:

- Edge Function invocations.
- Function errors dan status 5xx/546.
- Average/max duration.
- Database size.
- Egress.
- Auth usage.
- Project pause state.
- Slow queries.
- Index size.

Upgrade dipertimbangkan jika:

- Database mendekati 350–400 MB.
- Usage konsisten mendekati 70–80% kuota.
- Project pause tidak dapat diterima.
- Backup/PITR menjadi kebutuhan bisnis.
- Workload production menghasilkan pendapatan dan downtime berdampak material.

Threshold tersebut adalah operational trigger, bukan hard platform limit, dan harus dievaluasi kembali dengan data nyata.

---

## 13. Security completion checklist

- OAuth 2.1 aktif.
- Protected-resource/authorization-server metadata, PKCE S256, resource/audience, scopes, dan `WWW-Authenticate` teruji.
- Owner identity dan OAuth client context diverifikasi setiap request di middleware meskipun gateway `verify_jwt = false`.
- user_metadata tidak digunakan untuk authorization.
- RLS aktif pada semua tabel exposed.
- UPDATE policy memiliki USING dan WITH CHECK.
- authenticated tidak memiliki direct business-table reads atau writes.
- anon tidak memiliki business access.
- SECURITY DEFINER tidak berada di exposed schema tanpa proteksi.
- PUBLIC execute dicabut.
- Views memakai security_invoker atau tidak diekspos.
- Service role tidak pernah masuk plugin/client.
- Secrets hanya di secret storage atau local untracked environment.
- Tool errors tidak membocorkan internal SQL.
- Input/payload size dibatasi.
- Source URLs dan metadata divalidasi.
- Prompt injection dari halaman sumber diperlakukan sebagai untrusted data.
- Database advisors lulus tanpa temuan kritis.
- Token endpoint menerima seluruh success `2xx`; session revoke/relink recovery teruji.

---

## 14. Content quality completion checklist

- American English konsisten.
- Bahasa jelas untuk US, UK, CA, AU, dan global.
- Semua fakta memiliki sumber memadai.
- Dataset referensi tidak digunakan sebagai sumber kebenaran.
- Sensitive claims mendapat pemeriksaan lebih ketat.
- Time-sensitive facts memiliki as_of dan freshness.
- Tidak ada fakta duplicate/reuse violation.
- Lima format trivia dapat dihasilkan.
- Fast dan practical profiles valid.
- Hook dan CTA sesuai isi.
- Interaction goal tersimpan.
- Canva copy lulus component dan total budgets.
- Plain-lines menjadi render default.
- Caption tidak menambah klaim.
- Teks tidak menyalin dataset atau sumber secara substansial.
- System checks dan editorial checks tersimpan terpisah.
- Owner approval tersimpan terpisah, terikat content hash/revision current, dan tidak dapat melewati blocking checks.

---

## 15. Definition of Done implementasi

Implementasi MVP selesai hanya jika:

1. Semua fase aktif lulus; Phase 8 dicatat `Deferred by CR-019`, bukan `PASS`.
2. Repository dapat disiapkan dari fresh checkout.
3. Database dapat dibuat ulang dari migration.
4. Sepuluh tabel aplikasi, dua tabel internal operasional, dan seluruh invariant tersedia.
5. OAuth, ownership, RLS, grants, dan Data API exposure terverifikasi.
6. MCP berjalan sebagai satu Supabase Edge Function.
7. Portable plugin package valid dan terpasang.
8. Tepat 33 tools lulus contract tests dan `/health` tetap bukan model-callable tool.
9. Reservation, revision, dan schedule concurrency tests lulus.
10. Dedup gold set memenuhi target.
11. Single post, batch, calendar, dan resume berfungsi.
12. Lifecycle draft/ready/posted/discarded/archived benar.
13. Metrics dan performance insights berfungsi.
14. Output pilot disetujui pengguna.
15. Production smoke test lulus.
16. Backup/export dan restore procedure tersedia.
17. Tidak ada defect security/data-integrity kritis.
18. Dokumentasi sesuai source code dan acceptance trace report lengkap.
19. Sembilan kartu manual wajib plugin final lulus sesuai CR-020/CR-027 dengan
    zero hard fail; `MAN-10..MAN-11` adalah observasi opsional setelah MVP.
    Seratus satu frozen prompts tetap inventaris regresi.
20. Tidak ada OpenAI API, embeddings, product dashboard, atau auto-posting dalam runtime MVP; frontend auth minimal diperbolehkan.

---

## 16. Phase tracker

Status terkini per 19 Oktober 2026. Bagian ini adalah tracker yang diperbarui
seiring kemajuan proyek; CR-019 mengesampingkan gate Phase 8 historis di atas,
sedangkan CR-020 memperjelas gate Phase 9–11 dan status pilot. Runbook dan
laporan lama mencatat keadaan pada saat ditulis, bukan status terkini.

| Phase | Status terkini | Gate | Bukti status |
|---:|---|---|---|
| 0 — Specification freeze | Complete | Final audit 0.12 lulus; baseline dibekukan | `0b137e1` |
| 1 — Repository foundation | Complete | Toolchain, fresh install, and quality gate lulus pada 8 Oktober 2026 | `64c61b6`, `1f496f8` |
| 2 — Supabase local foundation | Complete | Local reset/migration lulus | `5086676` |
| 3 — Core database | Complete | Core tests lulus | `1e3bd9c` |
| 4 — Trivia database | Complete | Dedup/reuse tests lulus | `f513286`, `cb3568a` |
| 5 — RPC dan security | Complete | Security/concurrency lulus | `04f6373`; [final local verification](../docs/phase-5-batch-b-remediation-p2-03-report.md) |
| 6 — MCP Edge Function | Complete | Gate akhir dan audit independen Batch B lulus | 33/33 MCP tools pada PR #2 (`codex/phase-6-mcp`). [Gate akhir pada `88738a84` sukses](https://github.com/milyarderpro/content-producer/actions/runs/38679123776): 58/58 tes MCP, 172/172 tes database, audit katalog/keamanan, dan Inspector 33 panggilan valid + 33 invalid. Audit ulang independen pada SHA yang sama menutup ketiga temuan Batch B; lihat Issue #1. Bukti hosted OAuth dan koneksi ChatGPT tetap pada Phase 9–10. |
| 7 — Plugin skill/package source | Complete | Source/package candidate validation dan audit independen lulus | Checkpoint 7.0–7.4 lulus pada `codex/phase-7-plugin`. [Gate akhir pada `b2766bfd` sukses](https://github.com/milyarderpro/content-producer/actions/runs/38707892003): 27/27 unit tests, 58/58 MCP tests, 172/172 database tests, clean reset 67 migration, dan validasi kandidat 12 file. [Audit independen pada SHA yang sama lulus](https://github.com/milyarderpro/content-producer/pull/4#issuecomment-6188726374). Koneksi hosted dan paket final tetap pada Phase 9–10; lihat [Issue #3](https://github.com/milyarderpro/content-producer/issues/3). |
| 8 — Full verification | Deferred by CR-019 | Gate CR-018 tidak lagi menjadi syarat MVP; 8.0 tetap BLOCKED, bukan PASS | [CR-019](../docs/decisions/2026-10-15-phase-8-manual-acceptance-resequencing.md); [8.0 preflight](../docs/phase-8/preflight-8.0.md) dan coverage map dipertahankan sebagai bukti persiapan; live E3/E4/101 belum dijalankan (Issue #5). |
| 9 — Production deployment | **Complete** (Phase 9) | Checkpoint 9.0–9.5 selesai dalam cakupan Phase 9; gate teknis/security dan hosted PASS, audit independen 9.5 PASS | [Final release `be3bf04b703a4aff16510c496600c9796c13b57a`](https://github.com/milyarderpro/content-producer/commit/be3bf04b703a4aff16510c496600c9796c13b57a), [full final-SHA gate #39085571345 SUCCESS](https://github.com/milyarderpro/content-producer/actions/runs/39085571345), [laporan implementasi 9.5](https://github.com/milyarderpro/content-producer/issues/8#issuecomment-6244399653), [audit independen 9.5 PASS](https://github.com/milyarderpro/content-producer/issues/20#issuecomment-6244579966), [Issue #8](https://github.com/milyarderpro/content-producer/issues/8). Production frontend HTTPS `https://content-producer-auth-frontend.vercel.app/` menunjuk deployment aman [READY `dpl_CWyhYgNn7zfxNGkWaHZhqZjhTQxo`](https://vercel.com/creator-03a9/content-producer-auth-frontend/CWyhYgNn7zfxNGkWaHZhqZjhTQxo) pada SHA tersebut; kedua flag sementara `PHASE95_ENABLED` dan `PHASE95_WRITE_ENABLED` OFF. Hosted 68/68 migration, 33 RPC/MCP tools, 15/15 RLS tables, owner OAuth/PKCE dan 3 reads terbukti; satu owner-MCP `create_page` yang disetujui menghasilkan tepat satu Page, satu config dan satu ledger, tanpa post/plan/fact/reservation/metric. Phase 9 Complete **bukan** Pilot-ready atau MVP Complete. |
| 10 — MCP connection/package/pilot | **Complete — Pilot-ready; 10.0–10.7 PASS** | **Current:** PRIVATE Content Producer v0.2.2 is bound to owner OAuth `mcpku2`; 33 tools and owner reads were shown in ChatGPT. MAN-03 saved one source-verified Moon draft on `corious-facts`; MAN-04 revised the hook with exact CAS and obtained separate owner approval. Independent OAuth readback confirms post `f58017bb-60ae-476d-afa7-65f8f0c6c3b8` is `ready`, revision 3, with passing system/editorial checks, no schedule or publication. CR-048 accepts the direct Codex `mcpku2` business trace plus prior private-plugin host proof for 10.4, while explicitly recording the missing fresh ChatGPT parent-plugin write trace. MAN-05/06 and MAN-07/08/09 PASS; independent Phase 10.7 audit approved Pilot-ready, while MVP Complete remains pending Phase 11. | Backend SHA `73087c33e8b20b663e6944f6ca89d0b591eebf44`, [CR-020 gate #39411054462 PASS](https://github.com/milyarderpro/content-producer/actions/runs/39411054462), production Edge `mcp` v31. [MAN-03/04 evidence](https://github.com/milyarderpro/content-producer/issues/22#issuecomment-6291191224); [CR-048](../docs/decisions/2026-10-20-phase-10-4-owner-oauth-evidence-acceptance.md). Phase 10.7 SQL audit confirmed 9 completed operations, 0 incomplete and 0 active reservations; fixed-pilot secret revocation remains owner-confirmed, and CR-048 host-attribution limit remains documented. **AC-001..014 PENDING**. MAN-05 created exactly one approved three-slot plan; fresh ChatGPT MAN-06 OAuth readback confirmed all three item IDs, ordered WIB schedules and the unchanged ready Moon post. Checkpoint 10.5 PASS; AC-007/008 still PENDING (seven processed posts / seven days), 10.6/10.7 PASS. MAN-07 editorial sign-off, MAN-08 safe ambiguity clarification and MAN-09 injection/autopublish refusal passed with owner-scoped unchanged state, 0 MAN-09 business Write calls; ledger/reservation inspection limits remain for 10.7. [MAN-09 evidence](../docs/phase-10/manual-results.md). No business writes or heavy CI in MAN-06/07/08/09. |

| 11 — Stabilization | Not started | Operasional, backup/rollback, handoff, seluruh AC dan `MVP Complete` disetujui tanpa menunggu publikasi/metrik nyata | CR-020/CR-027; belum dimulai. |

**Batas Phase 9–10 dan risiko residual (20 Oktober 2026):** Seluruh
**14 acceptance criteria MVP, AC-001..AC-014, tetap PENDING** untuk
pembuktian Phase 10–11 menurut CR-020/CR-027. Phase 10.0–10.7 PASS; MAN-01..MAN-09 mempunyai bukti PASS. Audit independen [Issue #22](https://github.com/milyarderpro/content-producer/issues/22#issuecomment-6309918988) menyetujui **Pilot-ready** pada PR #23 HEAD `db37d2880254d45dacb5dff8bf32c9ff5d5cf756`; merge commit `44866af98b402cd256b9102789dfb5b9cc03e722`. Phase 11 dan MVP Complete tetap PENDING. Production `mcp` sekarang default owner
OAuth, dengan plugin v0.2.2 / `mcpku2`; bukti No-auth lama tetap sejarah
CR-032, bukan instruksi koneksi saat ini. Grant fixed-pilot CR-037/038
tidak dijalankan pada jalur OAuth, sehingga MAN-03/04 tidak memerlukan
aktivasi/pencabutan grant manual. Tetap wajib ada tindakan owner yang
jelas untuk tiap kartu, dan review terpisah atas versi/hash aktual
sebelum approval editorial. MAN-03/04 telah membuktikan write OAuth owner, revisi CAS dan approval pada post yang sama; CR-048 mencatat batas atribusi host. Hasil ini belum menyelesaikan acceptance MVP. Publikasi Facebook dan
metrik nyata pada MAN-10/11 hanya observasi opsional pasca-MVP.
Phase 8 tetap **Deferred by CR-019** dan 101 prompt hanya inventaris
regresi. Risiko residual yang masih perlu dinilai: dua klien OAuth uji
aktif, peringatan Security Advisor pada 33 SECURITY DEFINER RPC yang
disengaja dan perlindungan leaked password nonaktif, serta bukti
restore PostgreSQL terisolasi yang belum mencakup seluruh komponen
Supabase maupun data Page terbaru. Phase 9 audit PASS menerima batas
ini; tidak menyatakan risikonya hilang. Gap ledger/secret MAN-02 dibawa
ke audit 10.7. Tidak ada Pilot-ready sebelum sembilan kartu dan audit
independen PASS; Phase 11 mengatur MVP Complete.

Phase 5 ditutup atas keputusan pengguna setelah gate lokal terakhir lulus dan
perubahan di-commit sebagai `04f6373`. Laporan remediasi yang lebih awal masih
menyebut independent re-audit pending karena laporan itu adalah handoff pada
waktu penulisan. Repository ini belum memuat dokumen pengesahan audit independen
terakhir; status `Complete` di sini tidak mengklaim adanya dokumen tersebut.
Phase 6 telah mengimplementasikan tepat 33 MCP tools dan menyelesaikan checkpoint 6.13. Tiga temuan audit Batch B ditutup dan diverifikasi ulang secara independen pada SHA `88738a84`; gate akhir pada SHA yang sama lulus. Phase 6 berstatus `Complete`. Bukti hosted OAuth dan koneksi ChatGPT tetap dijadwalkan pada Phase 9–10.

Status yang digunakan:

- Not started.
- In progress.
- Blocked.
- Gate failed.
- Complete.

Phase tracker diperbarui setiap kali fase dimulai atau selesai.

---

## 17. Referensi teknis

- OpenAI — Package your plugin: https://developers.openai.com/plugins/build/plugins
- OpenAI — Build an MCP server: https://developers.openai.com/plugins/build/mcp-server
- OpenAI — Skills: https://developers.openai.com/plugins/concepts/skills
- OpenAI — Authentication: https://developers.openai.com/plugins/build/auth
- Supabase — Deploy MCP servers: https://supabase.com/docs/guides/ai-tools/byo-mcp
- Supabase — MCP Authentication: https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- Supabase — OAuth server getting started: https://supabase.com/docs/guides/auth/oauth-server/getting-started
- Supabase — OAuth token endpoint HTTP 200 change: https://supabase.com/changelog/45468-breaking-change-oauth-token-endpoint-will-return-http-200-instead-of-201
- Supabase — Edge Function limits: https://supabase.com/docs/guides/functions/limits
- Supabase — Securing your API: https://supabase.com/docs/guides/api/securing-your-api
- Supabase — Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase — Database functions: https://supabase.com/docs/guides/database/functions
- Supabase — CLI: https://supabase.com/docs/reference/cli/introduction
- Supabase — Production checklist: https://supabase.com/docs/guides/deployment/going-into-prod

Referensi platform diperiksa ulang pada awal phase yang mengimplementasikan atau men-deploy fitur terkait.
