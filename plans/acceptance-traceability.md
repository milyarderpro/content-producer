# Acceptance Traceability Matrix — Content Producer MVP

## 1. Informasi dokumen

| Bagian | Keterangan |
|---|---|
| Nama produk | Content Producer |
| Versi matriks | 1.2 |
| Status | Frozen — traceability baseline Phase 0 |
| Tanggal keputusan | 7 Oktober 2026 |
| Langkah Phase 0 | 0.10 — Acceptance traceability |
| Scope implementasi MVP | Satu owner, multi-Page, niche trivia |
| Core target | Multi-niche-ready |
| Target audiens konten | US, UK, CA, AU; natural neutral American English |

Dokumen ini menghubungkan kebutuhan produk, quality gate, kebutuhan non-fungsional, keamanan, acceptance criteria, keputusan Phase 0, implementation phase, dan bukti pengujian. Matriks ini adalah rencana pembuktian; status `specified` tidak berarti source code, migration, deployment, atau test result sudah tersedia.

---

## 2. Sumber dan aturan kewenangan

Trace dibuat dari:

1. `plans/PRD.md` untuk scope, functional requirements, quality gate, non-functional requirements, security, acceptance criteria, dan required testing.
2. `plans/phase-0-decision-register.md` untuk keputusan accepted yang memperjelas atau mengganti detail baseline.
3. `plans/database-design.md` untuk schema, invariant, RPC, concurrency, RLS, dan test intent baseline.
4. `plans/module-contract.md` untuk boundary core versus niche.
5. `plans/trivia-content-dna.md` untuk contract editorial dan evaluation trivia.
6. `plans/tool-inventory.md` untuk 33 MCP tools final.
7. `plans/use-case-inventory.md` untuk 31 user goals dan 101 frozen prompt cases.
8. `plans/implementation-plan.md` untuk urutan Phase 1–11 dan verification gate.

Jika artefak lama berbeda dari keputusan accepted, keputusan Phase 0 dan artefak baru menjadi target implementasi. Perbedaan tersebut telah dipropagasikan pada langkah 0.11 sebelum specification freeze.

---

## 3. Cara membaca matriks

### 3.1 Status

| Status | Arti |
|---|---|
| `specified` | Requirement, target implementasi, dan bukti yang harus dibuat sudah ditetapkan |
| `sync_pending` | Keputusan final sudah ada, tetapi dokumen baseline lama harus diperbarui pada 0.11 |
| `implemented` | Source/migration sudah tersedia; status ini tidak dipakai selama Phase 0 |
| `verified` | Seluruh bukti yang diwajibkan lulus; status ini baru boleh dipakai setelah test run |
| `excluded` | Sengaja di luar scope dan mempunyai negative/boundary test |
| `deferred` | Dipindahkan ke post-MVP melalui keputusan eksplisit |

Semua row implementasi dalam dokumen ini berstatus `specified`. Status `sync_pending` tetap didokumentasikan untuk riwayat, tetapi tidak lagi dipakai setelah sinkronisasi 0.11.

### 3.2 Namespace bukti

| Prefix | Bukti yang akan dibuat |
|---|---|
| `ST-*` | Static/schema/configuration test |
| `DB-*` | Database unit/integration test |
| `RPC-*` | Domain RPC integration test |
| `MCP-*` | MCP protocol dan tool contract test |
| `SEC-*` | Auth, authorization, RLS, grant, privacy, dan abuse test |
| `CON-*` | Concurrency, lock, lease, dan replay test |
| `PERF-*` | Server performance test |
| `WF-*` | End-to-end user workflow test |
| `CE-*` | Deterministic content fixture/rubric evaluation |
| `EV-*` | Frozen prompt case dari `plans/use-case-inventory.md` |
| `MAN-*` | Bukti manual owner/pilot yang tidak dapat digantikan test otomatis |

`N/A-deterministic` pada kolom content evaluation berarti requirement dibuktikan secara deterministik dan tidak mempunyai perilaku editorial yang perlu dinilai model. Ini bukan gap.

### 3.3 Fase implementasi

| Kode | Phase |
|---|---|
| `P1` | Repository foundation |
| `P2` | Supabase local foundation |
| `P3` | Core database |
| `P4` | Trivia database module |
| `P5` | Transactional RPC, lifecycle, security |
| `P6` | MCP Edge Function |
| `P7` | Plugin package dan skill |
| `P8` | Full verification suite |
| `P9` | Production deployment |
| `P10` | ChatGPT integration dan pilot |
| `P11` | Stabilization dan handoff |

---

## 4. Target implementasi canonical

### 4.1 Schema dan state

| Alias | Target |
|---|---|
| `S-WORKSPACE` | `workspaces`, `niches`, ownership, defaults |
| `S-PAGE` | `pages`, `page_niche_configs`, config snapshot/version |
| `S-PLAN` | `content_plans`, `content_plan_items`, claim lease, progress, cancellation/replacement |
| `S-POST` | `posts`, revision, lifecycle, schedule, payload envelope, generation snapshot |
| `S-METRIC` | `post_metrics`, cumulative snapshot semantics |
| `S-FACT` | `trivia_facts`, canonical identity, source/freshness, lineage, reservation |
| `S-JUNCTION` | `trivia_post_facts`, ordered wording/source/hash snapshot, allocation state |
| `S-OPS` | `internal.operation_ledger`, `internal.rate_limit_buckets` |
| `S-QUALITY` | Server checks, editorial attestation, approval snapshot, content hash, warning acceptance |
| `S-AUTH` | `api` allowlist, RLS, grants, owner lookup, OAuth client context |

### 4.2 Domain operations

Nama RPC final mengikuti domain operation di tool inventory. Migration boleh memakai helper internal, tetapi public `api` entry point harus tetap satu-to-one dan allowlisted.

| Alias | Operations/tools utama |
|---|---|
| `O-CONTEXT` | `get_account_profile`, `get_workspace_context` |
| `O-PAGE` | `list_pages`, `create_page`, `update_page`, `get_page_generation_context` |
| `O-PLAN` | sembilan content-plan tools, termasuk claim, renew, failure, retry, replacement, cancel |
| `O-FACT` | lima trivia fact tools: find, reserve, release, reverify, correct |
| `O-POST-R` | `list_posts`, `get_post` |
| `O-POST-W` | save, revise, reschedule, approve, revoke, discard, mark posted, archive |
| `O-METRIC` | record, history, insights |

---

## 5. Functional requirement traceability

### 5.1 Workspace dan Page

| Requirement | Target schema | Operation/tool | Phase | Automated evidence | Content/prompt evidence | Status |
|---|---|---|---|---|---|---|
| `FR-WSP-001` | S-WORKSPACE | O-CONTEXT | P3/P5/P6 | DB-OWN-001, RPC-CTX-001 | EV-DR-001/002 | specified |
| `FR-WSP-002` | S-WORKSPACE, S-AUTH, S-FACT | O-CONTEXT, O-FACT | P3–P6 | DB-OWN-002, SEC-OWN-001 | EV-RC-003/004 | specified |
| `FR-PAGE-001` | S-PAGE | O-PAGE | P3/P5/P6 | DB-PAGE-001, RPC-PAGE-001 | EV-DR-003 | specified |
| `FR-PAGE-002` | S-PAGE | O-PAGE | P3/P5/P6 | DB-PAGE-002, RPC-PAGE-002 | EV-DR-003/004 | specified |
| `FR-PAGE-003` | S-PAGE, S-POST, S-FACT | `update_page` | P3/P5/P6 | DB-PAGE-003, RPC-PAGE-003 | EV-DR-004 | specified |
| `FR-PAGE-004` | S-PAGE | `list_pages`; no write while ambiguous | P6/P7/P8 | MCP-SEL-001, WF-CLARIFY-001 | EV-CL-001 | specified |
| `FR-PAGE-005` | S-PAGE | `get_workspace_context`, `get_page_generation_context` | P5–P8 | RPC-PAGE-004, MCP-SEL-002 | ambiguity/nonactive variants | specified |

### 5.2 Fakta trivia

| Requirement | Target schema | Operation/tool | Phase | Automated evidence | Content/prompt evidence | Status |
|---|---|---|---|---|---|---|
| `FR-FACT-001` | S-FACT | O-FACT | P4–P6 | DB-FACT-001, RPC-FACT-001 | CE-SOURCE-001 | specified |
| `FR-FACT-002` | S-FACT | `trivia_find_similar_facts`, reserve | P4–P6 | DB-DEDUP-001/004, RPC-DEDUP-001 | CE-DEDUP-001, EV-CL-008 | specified |
| `FR-FACT-003` | S-FACT, S-JUNCTION | reserve/save | P4/P5 | DB-REUSE-001/002 | EV-RC-015/017 | specified |
| `FR-FACT-004` | S-FACT | reserve | P4/P5 | CON-RESERVE-001 | EV-RC-015 | specified |
| `FR-FACT-005` | S-FACT | reserve/release | P4/P5 | DB-RESERVE-002, CON-RESERVE-002 | EV-RC-016/018 | specified |
| `FR-FACT-006` | S-JUNCTION, S-FACT | reserve/save | P4/P5 | DB-REUSE-003, RPC-SAVE-002 | EV-RC-017 | specified |
| `FR-FACT-007` | S-FACT | `trivia_release_facts` | P4–P6 | RPC-FACT-003, CON-REPLAY-003 | EV-RC-034/036 | specified |
| `FR-FACT-008` | S-FACT, S-JUNCTION | revise/reverify/correct | P4–P6 | DB-MEANING-001, RPC-CORRECT-001 | CE-MEANING-001, EV-DR-020/021 | specified |

### 5.3 Produksi post

| Requirement | Target schema | Operation/tool | Phase | Automated evidence | Content/prompt evidence | Status |
|---|---|---|---|---|---|---|
| `FR-POST-001` | S-POST, S-JUNCTION | generation sequence + `save_post` | P3–P8 | RPC-SAVE-001, WF-POST-001 | EV-DR-005/006 | specified |
| `FR-POST-002` | S-PLAN, S-POST | O-PLAN + `save_post` | P3–P8 | WF-BATCH-001, CON-PLAN-001 | EV-DR-016, EV-FU-006 | specified |
| `FR-POST-003` | S-PAGE, S-POST, S-QUALITY | context/save/approve | P3–P8 | RPC-QUALITY-001, CE-DNA-001 | EV-DR-005/006 | specified |
| `FR-POST-004` | S-POST, S-QUALITY | save/get | P3–P6 | DB-POST-001, MCP-POST-001 | CE-OUTPUT-001 | specified |
| `FR-POST-005` | S-JUNCTION | save/revise/get | P4–P6 | DB-JUNCTION-001/003 | CE-SOURCE-002 | specified |
| `FR-POST-006` | S-POST | `save_post` | P3/P5/P6 | RPC-SAVE-003 | EV-DR-005 | specified |
| `FR-POST-007` | S-POST, S-JUNCTION | `revise_post` | P3–P6 | RPC-REVISE-001/002 | EV-DR-009, EV-IN-006 | specified |
| `FR-POST-008` | S-POST, S-OPS | `revise_post` | P5/P6 | CON-REVISION-001, RPC-REVISE-003 | EV-RC-012/027 | specified |
| `FR-POST-009` | S-POST, S-JUNCTION, S-QUALITY | explicit lifecycle tools | P5/P6 | RPC-LIFE-001/007 | EV-DR-011–015 | specified |
| `FR-POST-010` | S-POST | `list_posts`, `get_post` | P3/P5/P6 | RPC-POST-R-001/002, MCP-PAGE-001 | EV-DR-007/008 | specified |

### 5.4 Kalender dan plan

| Requirement | Target schema | Operation/tool | Phase | Automated evidence | Content/prompt evidence | Status |
|---|---|---|---|---|---|---|
| `FR-PLAN-001` | S-PLAN | `create_content_plan` | P3–P6 | RPC-PLAN-001 | EV-DR-016 | specified |
| `FR-PLAN-002` | S-PAGE, S-PLAN, S-POST | plan/save/reschedule | P3–P6 | DB-SCHEDULE-001, RPC-PLAN-002 | EV-DR-010/016 | specified |
| `FR-PLAN-003` | S-PLAN, S-POST | plan/save/reschedule | P3/P5 | CON-SCHEDULE-001 | EV-RC-014 | specified |
| `FR-PLAN-004` | S-PLAN, S-POST | `reschedule_post` | P5/P6 | RPC-SCHEDULE-001, CON-SCHEDULE-002 | EV-DR-010 | specified |
| `FR-PLAN-005` | S-PLAN, S-POST | list/get plans, `list_posts` | P5/P6 | RPC-CALENDAR-001 | EV-IN-004/009 | specified |
| `FR-PLAN-006` | none; intentional boundary | no Facebook write tool | P6–P8 | ST-TOOL-BOUNDARY-001 | EV-NG-001/002 | excluded |
| `FR-PLAN-007` | S-PLAN | `create_content_plan` | P3/P5/P6 | DB-PLAN-001, RPC-PLAN-001 | EV-DR-016 | specified |
| `FR-PLAN-008` | S-PLAN, S-OPS | claim/failure/retry/get | P3–P6 | RPC-PLAN-RESUME-001, CON-LEASE-001 | EV-FU-006/007, EV-IN-010 | specified |

### 5.5 Output

| Requirement | Target schema | Operation/tool | Phase | Automated evidence | Content/prompt evidence | Status |
|---|---|---|---|---|---|---|
| `FR-OUT-001` | S-POST, S-QUALITY | save/get | P3–P8 | RPC-RENDER-001, CE-OUTPUT-001 | CE-DNA-OUTPUT-001 | specified |
| `FR-OUT-002` | S-POST | save/get | P3–P8 | DB-PAYLOAD-001, MCP-POST-002 | CE-OUTPUT-002 | specified |
| `FR-OUT-003` | S-JUNCTION, S-POST | get post | P4–P8 | MCP-PRIV-001, CE-SOURCE-003 | CE-DNA-SOURCE-001 | specified |
| `FR-OUT-004` | S-POST | save/get/list | P5/P6 | MCP-POST-003 | EV-DR-005/007/008 | specified |
| `FR-OUT-005` | S-FACT, S-QUALITY | context/save/get/approve | P4–P8 | RPC-QUALITY-002 | CE-RISK-001, EV-RC-019/020 | specified |

### 5.6 Performa konten

| Requirement | Target schema | Operation/tool | Phase | Automated evidence | Content/prompt evidence | Status |
|---|---|---|---|---|---|---|
| `FR-METRIC-001` | S-METRIC | `record_post_performance` | P3/P5/P6 | RPC-METRIC-001 | EV-DR-017 | specified |
| `FR-METRIC-002` | S-METRIC | record/history | P3/P5/P6 | DB-METRIC-001, RPC-METRIC-002 | EV-IN-011 | specified |
| `FR-METRIC-003` | S-METRIC, S-POST, S-JUNCTION | `get_performance_insights` | P3–P6 | RPC-INSIGHT-001 | EV-DR-018, EV-IN-012 | specified |
| `FR-METRIC-004` | response contract/skill | insights | P6–P8 | MCP-INSIGHT-001 | EV-FU-010, CE-INSIGHT-001 | specified |

Coverage: **42/42 functional requirements** mempunyai target schema atau explicit boundary, operation, implementation phase, automated evidence, dan content/prompt evidence atau deterministic N/A.

---

## 6. Quality-gate traceability

PRD baseline 25.1 dan 25.2 belum memberi ID individual. Matriks menetapkan alias stabil berikut; alias telah dipropagasikan ke PRD pada 0.11.

### 6.1 System checks

| Alias | Requirement ringkas | Target | Phase | Automated evidence | Content evidence |
|---|---|---|---|---|---|
| `QG-SYS-001` | Owner/workspace/Page/niche valid | S-AUTH, S-PAGE | P3–P6 | SEC-OWN-001/003 | N/A-deterministic |
| `QG-SYS-002` | Config dan content schema version valid | S-PAGE, S-POST | P3–P5 | DB-CONFIG-001, RPC-SCHEMA-001 | N/A-deterministic |
| `QG-SYS-003` | Fact count sesuai config/waiver | S-PAGE, S-QUALITY | P3/P5 | RPC-QUALITY-003 | CE-LENGTH-001 |
| `QG-SYS-004` | Fact IDs dan junction set/order valid | S-FACT, S-JUNCTION | P4/P5 | DB-JUNCTION-001/002 | N/A-deterministic |
| `QG-SYS-005` | Metadata sumber minimum tersedia | S-FACT, S-JUNCTION | P4/P5 | DB-SOURCE-001 | CE-SOURCE-001 |
| `QG-SYS-006` | Reservation dan reuse valid | S-FACT, S-JUNCTION | P4/P5 | DB-REUSE-001/003, CON-RESERVE-001 | N/A-deterministic |
| `QG-SYS-007` | Slot jadwal tidak bentrok | S-PLAN, S-POST | P3/P5 | CON-SCHEDULE-001/002 | N/A-deterministic |
| `QG-SYS-008` | Component dan final text budget lulus | S-QUALITY | P3/P5 | RPC-BUDGET-001/004 | CE-BUDGET-001/003 |
| `QG-SYS-009` | Public copy bebas URL/ID/JSON/artefak teknis | S-QUALITY | P5 | RPC-RENDER-002 | CE-OUTPUT-003 |
| `QG-SYS-010` | Revision dan status transition valid | S-POST, S-OPS | P5 | RPC-LIFE-001/007, CON-REVISION-001 | N/A-deterministic |

### 6.2 Editorial checks

| Alias | Requirement ringkas | Target | Phase | Automated/fixture evidence | Prompt/manual evidence |
|---|---|---|---|---|---|
| `QG-ED-001` | Claim didukung sumber | S-QUALITY, S-JUNCTION | P4/P5/P8 | CE-SOURCE-001/004 | MAN-EDITORIAL-001 |
| `QG-ED-002` | Time-sensitive context jelas | S-QUALITY | P5/P8 | CE-TIME-001 | EV-RC-018/019 |
| `QG-ED-003` | Safety advice tidak layak ditolak | S-QUALITY | P5/P8 | CE-SAFETY-001/005 | MAN-EDITORIAL-002 |
| `QG-ED-004` | Neutral American English global | S-QUALITY | P7/P8 | CE-LANGUAGE-001/004 | MAN-EDITORIAL-003 |
| `QG-ED-005` | Hook sesuai isi/format | S-QUALITY | P7/P8 | CE-HOOK-001/005 | MAN-EDITORIAL-004 |
| `QG-ED-006` | CTA sesuai interaction goal | S-QUALITY | P7/P8 | CE-CTA-001/004 | MAN-EDITORIAL-005 |
| `QG-ED-007` | Caption tidak menambah klaim | S-QUALITY | P5/P8 | CE-CAPTION-001/003 | MAN-EDITORIAL-006 |
| `QG-ED-008` | Hashtag relevan dan tidak berlebihan | S-QUALITY | P5/P8 | CE-HASHTAG-001/003 | MAN-EDITORIAL-007 |
| `QG-ED-009` | Grammar, line break, density, readability layak | S-QUALITY | P5/P8 | CE-READ-001/006 | MAN-EDITORIAL-008 |
| `QG-ED-010` | Tidak menyalin referensi/sumber secara substansial | S-QUALITY | P7/P8 | CE-COPY-001/004 | EV-NG-013, MAN-EDITORIAL-009 |

Ready gate dibuktikan oleh `RPC-APPROVAL-001/006`, `WF-APPROVAL-001`, EV-DR-011, EV-RC-013/029, dan EV-NG-008. System checks, editorial attestation, dan owner approval tetap tiga authority terpisah.

---

## 7. Non-functional requirement traceability

PRD baseline bagian 26 belum memberi ID individual. Alias di bawah mengikuti urutan butir PRD dan telah menjadi ID canonical setelah sinkronisasi 0.11.

### 7.1 Keandalan data

| Alias | Requirement | Target/phase | Evidence |
|---|---|---|---|
| `NFR-DATA-001` | Supabase satu-satunya production system of record | S-WORKSPACE–S-OPS; P2–P9 | ST-ARCH-001, WF-CROSSCHAT-001 |
| `NFR-DATA-002` | Constraint penting ditegakkan DB | S-PAGE–S-JUNCTION; P3–P5 | DB-CONSTRAINT-001 suite |
| `NFR-DATA-003` | Reservasi fakta transactional | S-FACT; P4/P5 | CON-RESERVE-001, RPC-FACT-002 |
| `NFR-DATA-004` | Retry tidak merusak state | S-OPS; P3/P5 | CON-REPLAY-001/006 |
| `NFR-DATA-005` | Post wajib mempunyai Page valid | S-POST/S-PAGE; P3 | DB-FK-001, SEC-OWN-003 |
| `NFR-DATA-006` | Fact usage wajib melalui post junction valid | S-JUNCTION; P4 | DB-JUNCTION-001/003 |

### 7.2 Performa server

| Alias | Requirement | Target/phase | Evidence |
|---|---|---|---|
| `NFR-PERF-001` | Read sederhana p95 ≤ 2 detik | P3–P8 | PERF-READ-001 |
| `NFR-PERF-002` | Duplicate candidate search p95 ≤ 3 detik | P4/P5/P8 | PERF-DEDUP-001 |
| `NFR-PERF-003` | Reservation/write sederhana p95 ≤ 3 detik | P4/P5/P8 | PERF-WRITE-001 |
| `NFR-PERF-004` | Index/query tuning sebelum layanan baru | P3–P8 | PERF-PLAN-001, MAN-ARCH-001 |

Waktu research dan generation ChatGPT tidak masuk target server.

### 7.3 Parallelism

| Alias | Requirement | Target/phase | Evidence |
|---|---|---|---|
| `NFR-CONC-001` | Sepuluh reservasi tidak menghasilkan double ownership | S-FACT; P4/P5/P8 | CON-RESERVE-001 |
| `NFR-CONC-002` | Revision lama ditolak | S-POST; P5/P8 | CON-REVISION-001 |
| `NFR-CONC-003` | Slot Page sama tidak ganda | S-PLAN/S-POST; P3/P5/P8 | CON-SCHEDULE-001/002 |

### 7.4 Maintainability

| Alias | Requirement | Target/phase | Evidence |
|---|---|---|---|
| `NFR-MAINT-001` | Business rules terpisah dari MCP transport | P5/P6 | ST-BOUNDARY-001 |
| `NFR-MAINT-002` | Aturan generik terpisah dari trivia | P3/P4 | ST-MODULE-001 |
| `NFR-MAINT-003` | Core tidak mengimpor trivia | P1/P3/P4 | ST-MODULE-002 |
| `NFR-MAINT-004` | Modul niche mempunyai contract lengkap berversi | P4/P7 | ST-MODULE-003, CE-FIXTURE-001 |
| `NFR-MAINT-005` | Schema dapat dibuat ulang dari migrations | P2–P5 | ST-MIGRATION-001 |
| `NFR-MAINT-006` | Dependency dipin dan lockfile disimpan | P1/P2/P6/P7 | ST-DEPS-001 |
| `NFR-MAINT-007` | Tool contract mempunyai automated tests | P6/P8 | MCP-CONTRACT-001 suite |
| `NFR-MAINT-008` | Niche baru tidak mewajibkan rewrite trivia | P3/P4/P8 | ST-MODULE-004, module conformance fixture |

### 7.5 Observability dan privacy

| Alias | Requirement | Target/phase | Evidence |
|---|---|---|---|
| `NFR-OBS-001` | Log request ID | P6 | MCP-LOG-001 |
| `NFR-OBS-002` | Log nama tool | P6 | MCP-LOG-002 |
| `NFR-OBS-003` | Log start/duration | P6 | MCP-LOG-003 |
| `NFR-OBS-004` | Log success/failure | P6 | MCP-LOG-004 |
| `NFR-OBS-005` | Log safe relevant public IDs | P6 | MCP-LOG-005 |
| `NFR-OBS-006` | Log safe error code | P5/P6 | MCP-LOG-006 |
| `NFR-OBS-007` | Log reservation conflict | P5/P6 | MCP-LOG-007 |
| `NFR-OBS-008` | Tidak log database secret | P6/P8 | SEC-LOG-001 |
| `NFR-OBS-009` | Tidak log Authorization header | P6/P8 | SEC-LOG-002 |
| `NFR-OBS-010` | Tidak log seluruh chat | P6/P8 | SEC-LOG-003 |
| `NFR-OBS-011` | Tidak log source/output penuh tanpa kebutuhan | P6/P8 | SEC-LOG-004 |

Catatan: PRD menyajikan empat larangan log, sehingga observability mempunyai 11 atomic aliases, bukan 13.

### 7.6 Biaya

| Alias | Requirement | Target/phase | Evidence |
|---|---|---|---|
| `NFR-COST-001` | Tidak ada biaya OpenAI API terpisah | P1/P6/P7 | ST-NETWORK-001, ST-SECRET-001 |
| `NFR-COST-002` | AI mengikuti akun ChatGPT pengguna | P7/P10 | MAN-PILOT-001 |
| `NFR-COST-003` | Infrastruktur hanya Supabase + layanan dev/deploy yang dipilih | P1/P9 | ST-ARCH-002 |
| `NFR-COST-004` | Tanpa embeddings/vector/paid worker MVP | P1–P8 | ST-DEPS-002, ST-TOOL-BOUNDARY-002 |

Coverage: **36/36 atomic NFR aliases** mempunyai implementation phase dan test evidence.

---

## 8. Security, authorization, dan untrusted-data traceability

### 8.1 Access model dan minimum controls

| Alias | Requirement | Target/phase | Evidence |
|---|---|---|---|
| `SEC-AUTH-001` | Private single-owner plugin | S-AUTH; P5–P10 | SEC-OWN-001, MAN-PILOT-002 |
| `SEC-AUTH-002` | OAuth 2.1 identity valid pada tiap request | S-AUTH; P6/P9 | SEC-OAUTH-001/008 |
| `SEC-AUTH-003` | Authorization server-side, bukan model/user metadata | S-AUTH; P5/P6 | SEC-OWN-002/004 |
| `SEC-CTRL-001` | Hanya tool yang dibutuhkan | P6 | ST-TOOL-ALLOWLIST-001 |
| `SEC-CTRL-002` | Tidak ada hard-delete tool | P6 | ST-TOOL-BOUNDARY-003, EV-NG-010 |
| `SEC-CTRL-003` | Input schema ketat | P5/P6 | RPC-INPUT-001, MCP-SCHEMA-001 |
| `SEC-CTRL-004` | Payload size dibatasi | P6 | MCP-LIMIT-001 |
| `SEC-CTRL-005` | Rate limit database-backed | S-OPS; P5/P6 | SEC-RATE-001/004 |
| `SEC-CTRL-006` | Token dan ownership diverifikasi | S-AUTH; P5/P6 | SEC-OAUTH-002, SEC-OWN-001 |
| `SEC-CTRL-007` | Least privilege praktis | S-AUTH; P5 | SEC-GRANT-001/004 |
| `SEC-CTRL-008` | Service role key tidak pernah ke ChatGPT | P5/P6 | SEC-SECRET-001 |
| `SEC-CTRL-009` | Secret hanya secret storage/env lokal | P2/P6/P9 | ST-SECRET-002 |
| `SEC-CTRL-010` | RLS + USING/WITH CHECK pada exposed data | S-AUTH; P5 | SEC-RLS-001/006 |
| `SEC-CTRL-011` | Exposed schema/grant eksplisit | S-AUTH; P5 | SEC-GRANT-002, ST-SUPABASE-001 |
| `SEC-CTRL-012` | SECURITY DEFINER dibatasi dan diuji | S-AUTH; P5 | SEC-FUNCTION-001/005 |
| `SEC-CTRL-013` | Credential tidak masuk response/log | P6 | SEC-RESPONSE-001, SEC-LOG-001/004 |

### 8.2 Prompt injection dan untrusted data

| Alias | Requirement | Target/phase | Evidence |
|---|---|---|---|
| `SEC-UNTRUST-001` | Website/source diperlakukan sebagai data | P7/P8 | CE-INJECTION-001, use-case injection suite |
| `SEC-UNTRUST-002` | Instruksi dari source diabaikan | P7/P8 | CE-INJECTION-002 |
| `SEC-UNTRUST-003` | MCP tidak mengeksekusi perintah dari source | P6/P8 | MCP-INJECTION-001 |
| `SEC-UNTRUST-004` | URL dan source metadata divalidasi | S-FACT; P4/P5 | DB-SOURCE-002, RPC-SOURCE-001 |

---

## 9. Error dan recovery traceability

Alias berikut mengikuti tabel error PRD bagian 28. Stable error code final berada di tool inventory.

| Alias | Kondisi | Operation owner | Evidence |
|---|---|---|---|
| `ERR-001` | Tidak terautentikasi | OAuth middleware | SEC-OAUTH-001, EV-RC-001 |
| `ERR-002` | Tidak memiliki akses | ownership/RLS | SEC-OWN-002, EV-RC-003 |
| `ERR-003` | Page tidak ditemukan | O-PAGE | RPC-PAGE-404-001 |
| `ERR-004` | Page ambigu | orchestration | MCP-SEL-001, EV-CL-001 |
| `ERR-005` | Niche tidak aktif/ambigu | context/orchestration | RPC-NICHE-001, EV-RC-006 |
| `ERR-006` | Canonical fact sudah ada | O-FACT | RPC-DEDUP-001 |
| `ERR-007` | Reuse tidak diizinkan | O-FACT | DB-REUSE-001/002 |
| `ERR-008` | Reservasi kalah | reserve | CON-RESERVE-001 |
| `ERR-009` | Reservasi expired | reserve/save | CON-RESERVE-002, EV-RC-016 |
| `ERR-010` | Sumber tidak cukup | fact/quality | CE-SOURCE-004 |
| `ERR-011` | Fixed/adaptive count tidak terpenuhi | quality | RPC-QUALITY-003 |
| `ERR-012` | Text budget overflow | render/quality | RPC-BUDGET-001/004 |
| `ERR-013` | Revision conflict | post mutation | CON-REVISION-001 |
| `ERR-014` | Schedule conflict | plan/post mutation | CON-SCHEDULE-001/002 |
| `ERR-015` | Plan terputus | O-PLAN | RPC-PLAN-RESUME-001 |
| `ERR-016` | Input tidak valid | all RPC/tools | RPC-INPUT-001, MCP-SCHEMA-001 |
| `ERR-017` | Database unavailable/busy | Edge/RPC mapping | MCP-DEPENDENCY-001, lost-response fixture |

Cleanup setelah kegagalan dibuktikan oleh `RPC-ROLLBACK-001`, `CON-REPLAY-001`, dan `EV-RC-034/036`; tidak ada keberhasilan yang boleh dikarang ketika commit tidak terbukti.

---

## 10. Acceptance criteria traceability

| AC | Requirement coverage | Schema/operation owner | Phase | Automated evidence | Content/prompt/manual evidence | Status |
|---|---|---|---|---|---|---|
| `AC-001` | OAuth, owner, MCP connect/discovery | S-AUTH, O-CONTEXT, `/health` | P2/P5–P10 | SEC-OAUTH-001/008, MCP-DISC-001/004 | EV-RC-001/004, MAN-CONNECT-001 | specified |
| `AC-002` | Multi-Page/config/reuse/defaults | S-PAGE | P3/P5/P6/P8 | DB-PAGE-001/006, RPC-PAGE-001/004 | EV-DR-003/004 | specified |
| `AC-003` | Single production-ready post | S-PAGE/S-FACT/S-JUNCTION/S-POST/S-QUALITY | P3–P8 | WF-POST-001, RPC-SAVE-001, RPC-APPROVAL-001 | CE-DNA-001, EV-DR-005/006/011, MAN-EDITORIAL-001 | specified |
| `AC-004` | Exact/paraphrase dedup + reuse modes | S-FACT/S-JUNCTION | P4/P5/P8 | DB-DEDUP-001/004, DB-REUSE-001/003 | CE-DEDUP-001/004, EV-CL-008 | specified |
| `AC-005` | 10-way reservation | S-FACT | P4/P5/P8 | CON-RESERVE-001 | EV-RC-015 | specified |
| `AC-006` | Meaning-safe CAS revision | S-POST/S-FACT/S-JUNCTION/S-OPS | P4/P5/P8 | CON-REVISION-001, RPC-REVISE-001/003 | CE-MEANING-001, EV-DR-009/IN-006 | specified |
| `AC-007` | Batch, checkpoint, resume | S-PLAN/S-POST/S-OPS | P3/P5/P6/P8 | WF-BATCH-001, RPC-PLAN-RESUME-001, CON-LEASE-001 | EV-DR-016, EV-FU-006/007 | specified |
| `AC-008` | Seven-day calendar, unique slots, progress | S-PLAN/S-POST | P3/P5/P6/P8 | WF-CALENDAR-001, CON-SCHEDULE-001 | EV-DR-010/016, EV-IN-004 | specified |
| `AC-009` | Explicit lifecycle; no FB upload | S-POST/S-JUNCTION/S-QUALITY | P5/P6/P8 | RPC-LIFE-001/007, ST-TOOL-BOUNDARY-001 | EV-DR-011–015, EV-NG-001/002 | specified |
| `AC-010` | American English + global clarity + usable copy | S-QUALITY | P7/P8/P10 | CE-LANGUAGE-001/004, CE-OUTPUT-001 | MAN-EDITORIAL-003, pilot sample | specified |
| `AC-011` | No OpenAI API/embeddings/vector DB | dependency/network boundary | P1/P6–P8 | ST-NETWORK-001, ST-DEPS-002, ST-SECRET-001 | EV-NG-007 | specified |
| `AC-012` | Supabase Edge MCP; minimal auth frontend; no product dashboard | runtime/deployment | P2/P6/P9/P10 | ST-ARCH-002, MCP-DISC-001 | MAN-CONNECT-001 | specified |
| `AC-013` | Manual performance snapshots + cautious insights | S-METRIC | P3/P5/P6/P8 | DB-METRIC-001, RPC-METRIC-001/002, RPC-INSIGHT-001 | EV-DR-017/018, EV-FU-010 | specified |
| `AC-014` | Multi-niche core, trivia-specific data | module boundary | P1/P3/P4/P8 | ST-MODULE-001/004 | module conformance fixture | specified |

Catatan `AC-001`: baseline PRD lama menyebut tool `health_check`; keputusan `TOOL-001` menghapus tool tersebut dan menetapkan HTTP `GET /health` plus MCP initialize/list-tools sebagai bukti availability. PRD telah disinkronkan pada 0.11.

Catatan `AC-012`: “tidak ada dashboard produk” tetap berlaku, sedangkan keputusan `AUTH-001`/`PLATFORM-002` mengizinkan frontend autentikasi minimal untuk login, consent, deny, logout, dan error state. Wording ini telah dipropagasikan pada 0.11.

Coverage: **14/14 acceptance criteria** mempunyai implementation owner, phase, automated evidence, dan content/prompt/manual evidence. Tidak ada row `sync_pending` setelah sinkronisasi 0.11.

---

## 11. Keputusan Phase 0 ke bukti implementasi

| Decision | Target implementasi | Phase pemilik | Evidence minimum |
|---|---|---|---|
| `SCOPE-001..010` | Arsitektur, boundary, output, target market | P1–P10 | ST-ARCH-001/002, CE-LANGUAGE, negative boundary suite |
| `AUTH-001..006` | Auth frontend, OAuth metadata/PKCE/client, token validation, session recovery | P2/P6/P9/P10 | SEC-OAUTH-001/008, MAN-CONNECT-001 |
| `PLATFORM-001..003` | Remote MCP-first, runtime boundary, pinned supported dependencies | P1/P2/P6/P7/P9 | ST-DEPS-001, MCP-DISC-001, deployment smoke |
| `CORE-001` | `internal.operation_ledger` | P3/P5 | CON-REPLAY-001/006 |
| `CORE-002` | Plan claim lease/renewal/recovery | P3/P5/P6 | CON-LEASE-001/004 |
| `CORE-003` | Cross-table schedule advisory lock | P3/P5 | CON-SCHEDULE-001/002 |
| `CORE-004` | Terminal plan item/replacement semantics | P3/P5/P6 | RPC-PLAN-TERM-001/004 |
| `CORE-005` | Atomic save/junction/allocation/plan progress | P4/P5 | RPC-ROLLBACK-001/003 |
| `CORE-006` | Expected revision CAS | P3/P5 | CON-REVISION-001 |
| `CORE-007` | RPC-only `api` boundary | P5 | SEC-GRANT-001/004 |
| `CORE-008` | Database-backed rate limits | P5/P6 | SEC-RATE-001/004 |
| `FACT-001..002` | Canonical identity + semantic decision boundary | P4/P8 | DB-DEDUP suite, CE-DEDUP suite |
| `FACT-003` | Correction/invalidation/supersession lineage | P4/P5/P6 | RPC-CORRECT-001/005 |
| `FACT-004..005` | Reservation and reuse lifecycle | P4/P5 | CON-RESERVE suite, DB-REUSE suite |
| `FACT-006` | Freshness/source snapshots | P4/P5/P8 | DB-SOURCE suite, CE-TIME suite |
| `FACT-007` | Gold dedup fixtures | P4/P8 | CE-DEDUP gold report |
| `QUALITY-001..002` | Canonical renderer, budgets, readability | P3/P5/P8 | RPC-BUDGET suite, CE-READ suite |
| `QUALITY-003..005` | Three authorities, evidence, lifecycle | P3/P5/P6/P8 | RPC-APPROVAL suite, WF-APPROVAL-001 |
| `QUALITY-006` | Cumulative metrics semantics | P3/P5/P6 | DB-METRIC-001, RPC-METRIC suite |
| `MODULE-001` | Module interface/conformance | P1/P3/P4/P7/P8 | ST-MODULE suite |
| `DNA-001` | Trivia editorial behavior | P7/P8/P10 | CE-DNA report, MAN-EDITORIAL suite |
| `TOOL-001..002` | 33 exact MCP contracts | P6/P8 | MCP-CONTRACT suite, 33/33 discovery/schema coverage |
| `USECASE-001` | 31 goals, 101 frozen prompts | P7/P8/P10 | prompt evaluation report; direct 100%, indirect ≥90%, overall ≥95%, zero hard fail |
| `TRACE-001` | Dokumen ini + Phase 8 acceptance report | P0/P8 | trace coverage audit dan final test report |
| `FREEZE-001..005` | Frozen baseline, tenant-scoped audit FK, approval shape, eligible structured dedup, lineage safety | P0/P3/P4/P5 | static freeze audit, DB-SCOPE-LEDGER-001, DB-QUALITY-SHAPE-001, DB-DEDUP-ELIGIBLE-001, RPC-CORRECT-001/005 |

---

## 12. Tool, use-case, dan test closure

`plans/use-case-inventory.md` sudah membuktikan desain coverage:

- 33/33 tools mempunyai positive user-goal path.
- 33/33 tools mempunyai boundary, invalid, confirmation, conflict, atau recovery path.
- 31 supported/clarification use cases tercatat.
- 101 frozen prompt cases tercatat: 21 direct, 12 indirect, 10 follow-up, 8 clarification, 36 recovery/concurrency, dan 14 negative/out-of-scope.

Phase 8 wajib menghasilkan tiga laporan terpisah:

1. **Deterministic report** — static, database, RPC, security, concurrency, MCP contract, dan performance.
2. **Prompt/workflow report** — 101 frozen cases, generated paraphrases, exact tools, confirmation, and state assertions.
3. **Content evaluation report** — five formats, two profiles, all allowlisted topic groups, language, sources, safety, budgets, readability, dedup/anti-dedup, copying, dan owner pilot review.

Satu jenis laporan tidak dapat menggantikan yang lain. Tool-selection pass tidak membuktikan database integrity atau kualitas editorial; content rubric pass tidak membuktikan authorization atau atomicity.

---

## 13. Closure register sinkronisasi 0.11

| Gap | Konflik baseline | Keputusan yang dipropagasikan | Dokumen | Status |
|---|---|---|---|---|
| `TR-GAP-001` | PRD `AC-001` mengharuskan tool `health_check` | `/health` operasional + MCP initialize/list-tools | PRD, implementation plan | closed_0.11 |
| `TR-GAP-002` | Daftar MCP/RPC lama berisi 14–19 operasi | 33 focused tools dengan lifecycle/recovery eksplisit | PRD, database design, implementation plan, workflow | closed_0.11 |
| `TR-GAP-003` | Global operation ledger/rate buckets belum ada | S-OPS dari CORE-001/008 | database design, implementation plan | closed_0.11 |
| `TR-GAP-004` | Plan renew/failure/replacement/cancel belum lengkap | CORE-002/004 dan O-PLAN final | seluruh dokumen operasional | closed_0.11 |
| `TR-GAP-005` | Fact reverify/correct/invalidate belum lengkap | FACT-003/006 dan O-FACT final | seluruh dokumen operasional | closed_0.11 |
| `TR-GAP-006` | Content hash/three authorities/approval belum lengkap | QUALITY-001..005 | seluruh dokumen operasional | closed_0.11 |
| `TR-GAP-007` | PRD bullet belum mempunyai stable IDs | Alias trace dipropagasikan | PRD | closed_0.11 |
| `TR-GAP-008` | Phase 6 belum memakai 33 tools | Tool inventory v1.0 authoritative | implementation plan | closed_0.11 |
| `TR-GAP-009` | Acceptance suite belum memakai 101 prompts | Use-case inventory v1.0 authoritative | PRD, implementation plan | closed_0.11 |
| `TR-GAP-010` | Auth frontend/no-dashboard ambigu | Minimal auth frontend; product dashboard dilarang | PRD, implementation plan, workflow | closed_0.11 |
| `TR-GAP-011` | Token `2xx`, Data API, runtime baseline tidak konsisten | DOC-004..006 dipropagasikan | PRD, database design, implementation plan | closed_0.11 |

Semua sebelas gap telah ditutup. Tidak ada gap yang memerlukan perubahan scope atau pilihan baru dari pengguna.

---

## 14. Verification gate langkah 0.10

Status: **lulus**.

- 42/42 functional requirements memiliki trace.
- 20/20 quality checks memiliki alias, owner, phase, dan evidence.
- 36/36 non-functional aliases memiliki phase dan evidence.
- 20/20 security/untrusted-data aliases memiliki phase dan evidence.
- 17/17 recovery categories memiliki operation owner dan evidence.
- 14/14 acceptance criteria memiliki implementation owner, phase, dan test/evaluation evidence.
- 33/33 tools dan 101/101 frozen prompt cases terhubung ke verification strategy.
- Deterministic test, prompt/workflow evaluation, content evaluation, dan manual pilot evidence dibedakan secara eksplisit.
- Tidak ada item yang ditandai `implemented` atau `verified` tanpa source/test result.
- Seluruh konflik yang ditemukan telah ditutup pada sinkronisasi 0.11.
- Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.

Langkah 0.12 telah menutup final audit dan membekukan baseline. Langkah berikutnya adalah **Phase 1 — Repository foundation**.

---

## 15. Closure final audit dan freeze 0.12

Status: **lulus**.

- Requirement coverage tetap lengkap: 42 FR, 20 quality, 36 NFR, 20 security, 17 recovery, dan 14 AC.
- Exact tool surface tetap 33 pada inventory, PRD, dan implementation plan; use-case baseline tetap 31 goals dan 101 frozen prompts.
- Empat invariant defensif yang ditemukan saat audit telah memiliki target implementation evidence: tenant-scoped ledger FK, mandatory approval snapshot pada ready states, server-owned structured-match eligibility, dan anti-self/cycle correction lineage.
- Seluruh referensi dokumen lokal tersedia, Markdown fence seimbang, dan tidak ada decision kritis berstatus terbuka.
- Matriks ini tetap merupakan rencana pembuktian. Tidak ada item yang dinaikkan menjadi `implemented` atau `verified` sebelum source dan hasil test tersedia.
- Phase 0 dibekukan; perubahan berikutnya wajib melalui change record dan pembaruan trace.
