# Phase 0 Decision Register — Content Producer MVP

## 1. Informasi dokumen

| Bagian | Keterangan |
|---|---|
| Nama produk | Content Producer |
| Versi produk | MVP |
| Versi dokumen | 0.12 |
| Status | Frozen — Phase 0 complete |
| Tanggal baseline | 7 Oktober 2026 |
| Fase aktif | Phase 1 — siap dimulai |
| Niche implementasi MVP | Trivia |
| Tujuan | Mencatat keputusan terbuka, konflik, dependensi, pemilik keputusan, dan bukti penutupan sebelum Phase 1 dimulai |

Dokumen ini adalah register pengendali selama Phase 0. Dokumen ini tidak menggantikan PRD, database design, module contract, trivia content DNA, atau implementation plan. Sebuah keputusan dalam register ini baru menjadi bagian spesifikasi final setelah berstatus `accepted`, diterapkan pada seluruh dokumen sumber yang terkait, dan lolos audit silang pada langkah 0.12.

---

## 2. Baseline yang diaudit

Phase 0 dimulai dari empat dokumen berikut:

| Dokumen | Versi/status awal | Peran | Temuan baseline |
|---|---|---|---|
| `plans/PRD.md` | v1.1, draf utama | Kebutuhan dan batas produk | Substansi lengkap; memiliki pernyataan usang bahwa implementation plan belum dibuat dan konflik antara OAuth dengan larangan consent frontend |
| `plans/database-design.md` | v2.0, draf utama | Schema, transaksi, concurrency, security | Target schema sangat rinci; beberapa invariant dan recovery contract masih terbuka |
| `plans/implementation-plan.md` | v1.0, rencana utama | Urutan implementasi dan verification gate | Urutan fase kuat; Phase 0 belum menghasilkan seluruh deliverable wajib |
| `plans/workflow-users.md` | Panduan operasional | Alur penggunaan melalui chat | Alur utama konsisten; bergantung pada keputusan OAuth, recovery, quality gate, dan kontrak tool yang belum final |

Artefak Phase 0 yang belum tersedia pada baseline:

- `plans/module-contract.md`
- `plans/trivia-content-dna.md`
- `plans/tool-inventory.md`
- `plans/use-case-inventory.md`
- `plans/acceptance-traceability.md`

---

## 3. Hierarki sumber kebenaran

Selama Phase 0, konflik ditangani dengan urutan berikut:

1. `plans/PRD.md` untuk tujuan, ruang lingkup, kebutuhan, non-goals, dan acceptance criteria produk.
2. `plans/database-design.md` untuk schema, relasi, invariant, transaksi, concurrency, RLS, dan privilege.
3. `plans/module-contract.md` setelah dibuat untuk kontrak wajib setiap modul niche.
4. `plans/trivia-content-dna.md` setelah dibuat untuk perilaku editorial dan evaluasi niche trivia.
5. `plans/implementation-plan.md` untuk urutan implementasi, dependency, verification, dan deployment.
6. Migration, source code, dan automated tests setelah implementasi dimulai sebagai bentuk eksekusi aktual, tanpa mengizinkan implementasi mengubah requirement secara diam-diam.
7. `plans/workflow-users.md` sebagai ringkasan operasional untuk pengguna.

Register ini mencatat proses pengambilan keputusan. Jika sebuah keputusan mengubah kebutuhan produk, PRD harus diperbarui terlebih dahulu. Jika keputusan mengubah invariant database, database design harus diperbarui sebelum migration dibuat.

---

## 4. Status keputusan

| Status | Arti |
|---|---|
| `confirmed` | Sudah ditetapkan oleh dokumen baseline dan tidak sedang diperdebatkan |
| `open` | Belum mempunyai keputusan final |
| `in_progress` | Sedang dianalisis pada langkah Phase 0 aktif |
| `accepted` | Keputusan telah disetujui dan siap dipropagasikan ke dokumen terkait |
| `deferred` | Sengaja dipindahkan ke post-MVP dengan alasan dan dampak yang tercatat |
| `rejected` | Opsi ditolak dan tidak boleh masuk implementasi |
| `superseded` | Digantikan oleh keputusan yang lebih baru |
| `blocked` | Tidak dapat ditutup tanpa input pengguna atau perubahan eksternal yang spesifik |

Setiap item `accepted` wajib mempunyai:

- Ringkasan keputusan final.
- Alasan dan trade-off.
- Dokumen terdampak.
- Acceptance criteria atau test yang membuktikan implementasi.
- Tanggal keputusan.

---

## 5. Batas produk yang sudah dikonfirmasi

Keputusan berikut tetap terkunci kecuali pengguna secara eksplisit mengubah scope:

| ID | Keputusan | Status |
|---|---|---|
| SCOPE-001 | MVP digunakan oleh satu owner yang dapat mengelola beberapa Facebook Page | `confirmed` |
| SCOPE-002 | Core dirancang multi-niche, tetapi hanya modul trivia yang diimplementasikan pada MVP | `confirmed` |
| SCOPE-003 | Target audiens utama adalah US, UK, CA, dan AU; output memakai natural, neutral American English | `confirmed` |
| SCOPE-004 | Output utama adalah copy untuk Reel sekitar 13 detik, caption, hashtag, dan sumber internal | `confirmed` |
| SCOPE-005 | Video/desain, Canva automation, Facebook auto-publishing, dan Facebook Graph API tidak termasuk MVP | `confirmed` |
| SCOPE-006 | ChatGPT melakukan reasoning, research, dan penulisan; Supabase menjadi system of record dan backend MCP | `confirmed` |
| SCOPE-007 | Dataset Curious Mind, DYK, dan Daily Facts digunakan untuk mempelajari DNA, bukan sebagai sumber fakta | `confirmed` |
| SCOPE-008 | Views dan virality bukan acceptance metric yang dapat dijamin sistem | `confirmed` |
| SCOPE-009 | Tidak menggunakan OpenAI API atau embeddings pada runtime MVP | `confirmed` |
| SCOPE-010 | Pekerjaan implementasi Phase 1 tidak dimulai sebelum verification gate Phase 0 lulus | `confirmed` |

Catatan: larangan dashboard web tetap berlaku, tetapi kebutuhan minimal frontend untuk sign-in dan OAuth consent sedang dibuka sebagai keputusan khusus `AUTH-001`. Frontend autentikasi minimal tidak otomatis berarti dashboard produk.

---

## 6. Register keputusan terbuka

### 6.1 Runtime, plugin, dan autentikasi — diselesaikan pada langkah 0.2

| ID | Keputusan yang harus ditutup | Risiko jika terbuka | Status |
|---|---|---|---|
| AUTH-001 | Lokasi dan bentuk minimal sign-in serta OAuth consent frontend untuk Supabase Auth | Alur OAuth tidak dapat selesai meskipun MCP sudah berjalan | `accepted` |
| AUTH-002 | Mode identifikasi/registrasi OAuth client yang dipakai ChatGPT: CIMD, DCR, atau konfigurasi client yang didukung | Koneksi plugin gagal atau bergantung pada asumsi platform yang salah | `accepted` |
| AUTH-003 | Protected-resource metadata, authorization-server metadata, scopes, PKCE, `resource`/audience, dan `WWW-Authenticate` contract | Discovery atau token validation tidak sesuai MCP authorization | `accepted` |
| AUTH-004 | Konfigurasi Edge Function `verify_jwt = false` dan urutan middleware discovery sebelum token validation | Gateway memblokir request discovery yang belum mempunyai token | `accepted` |
| AUTH-005 | Owner identity, non-owner rejection, RLS boundary, dan larangan penggunaan user-editable metadata untuk authorization | Akses lintas-owner atau BOLA/IDOR | `accepted` |
| AUTH-006 | Session expiry, revoke behavior, reauthorization, dan error yang aman | Sesi lama atau kegagalan auth sulit dipulihkan | `accepted` |
| PLATFORM-001 | Jalur MVP: connect remote MCP sebagai custom server terlebih dahulu, kemudian package plugin dan skill | Urutan Phase 7–10 tidak cocok dengan kebutuhan registered MCP mapping | `accepted` |
| PLATFORM-002 | Batas runtime final: Supabase Edge Function, Postgres, minimal auth frontend, dan tidak ada dashboard produk | Scope infrastruktur ambigu | `accepted` |
| PLATFORM-003 | Runtime dan dependency baseline yang didukung, termasuk Deno/Node/SDK/CLI serta version pinning | Build tidak reproducible atau memakai runtime yang sudah tidak didukung | `accepted` |

### 6.2 Core transaction dan recovery — diselesaikan pada langkah 0.3

| ID | Keputusan yang harus ditutup | Risiko jika terbuka | Status |
|---|---|---|---|
| CORE-001 | Semantik `operation_key`, request fingerprint, replay, payload mismatch, retention, dan penyimpanan hasil idempotent | Retry dapat menggandakan write atau menerima payload berbeda dengan key sama | `accepted` |
| CORE-002 | Claim lease untuk `content_plan_items`: token, waktu claim, expiry, heartbeat bila perlu, dan stale recovery | Item tertahan permanen dalam status `in_progress` | `accepted` |
| CORE-003 | Aturan advisory lock serta pengecualian konflik antara plan item dan post yang berasal dari slot yang sama | Post dianggap berbenturan dengan plan item asalnya sendiri | `accepted` |
| CORE-004 | Terminal semantics plan item setelah post menjadi `posted` atau `archived` | Satu slot historis dapat menghasilkan post pengganti tanpa tindakan eksplisit | `accepted` |
| CORE-005 | Atomic boundary untuk save post, junction, reservation conversion, dan plan progress | Partial write menghasilkan data tidak sinkron | `accepted` |
| CORE-006 | Kontrak compare-and-swap `expected_revision`, conflict response, dan safe retry | Edit lama dapat menimpa edit baru | `accepted` |
| CORE-007 | Direct table `SELECT` untuk `authenticated` dibanding read-only RPC/view sebagai boundary | Data API menjadi permukaan akses lebih luas daripada MCP tools | `accepted` |
| CORE-008 | Rate-limit key, window, limit, response, dan pengecualian untuk satu owner | Requirement “reasonable rate limit” tidak dapat diuji | `accepted` |

### 6.3 Trivia fact lifecycle dan deduplikasi — diselesaikan pada langkah 0.4

| ID | Keputusan yang harus ditutup | Risiko jika terbuka | Status |
|---|---|---|---|
| FACT-001 | Definisi canonical claim dan tingkat presisi `claim_hash` serta `structured_hash` | False merge atau duplikasi canonical fact | `accepted` |
| FACT-002 | Sinyal yang boleh auto-reject/auto-match dan sinyal yang hanya menjadi candidate untuk semantic review | Ontology yang terlalu kasar menggabungkan fakta berbeda | `accepted` |
| FACT-003 | Koreksi, invalidation, versioning, dan `supersedes_fact_id` atau mekanisme ekuivalen | Fakta salah tidak dapat diganti karena hash unik | `accepted` |
| FACT-004 | Reservation TTL, reclaim, release, ownership token, dan perilaku retry | Fakta terkunci atau dipakai paralel secara tidak aman | `accepted` |
| FACT-005 | Reuse semantics `workspace_unique` dan `page_unique` untuk allocated, published, discarded, dan archived post | Fakta digunakan ulang secara tidak konsisten | `accepted` |
| FACT-006 | Source freshness, verification expiry, publisher hierarchy, dan snapshot policy | Fakta lama atau koreksi sumber tidak tertangani | `accepted` |
| FACT-007 | Gold fixtures dan ukuran evaluasi dedup v1 | Target recall/false merge tidak dapat dibuktikan | `accepted` |

### 6.4 Content quality dan approval — diselesaikan pada langkah 0.5

| ID | Keputusan yang harus ditutup | Risiko jika terbuka | Status |
|---|---|---|---|
| QUALITY-001 | Formula text budget yang menyisakan ruang untuk line break/separator | Komponen lolos individual tetapi gagal total Canva budget | `accepted` |
| QUALITY-002 | Batas panjang dan keterbacaan yang dikalibrasi untuk Reel sekitar 13 detik | Copy terlalu padat untuk format yang ditargetkan | `accepted` |
| QUALITY-003 | Pemisahan server-computed checks, AI editorial attestation, dan explicit user approval | Caller dapat menandai `ready` hanya dengan JSON yang tidak diverifikasi | `accepted` |
| QUALITY-004 | Schema, version, actor, timestamp, dan evidence untuk setiap quality check | Audit tidak dapat direproduksi setelah rubric berubah | `accepted` |
| QUALITY-005 | Syarat dan RPC transition `draft → ready`, `ready → draft`, serta terminal states | Lifecycle menerima post yang belum memenuhi quality gate | `accepted` |
| QUALITY-006 | Definisi metrics snapshot sebagai cumulative atau delta dan pemetaan likes/reactions | Insight performa menghitung data dengan arti berbeda | `accepted` |

### 6.5 Kontrak modul, tool, dan evaluasi — diselesaikan pada langkah 0.6–0.10

| ID | Keputusan/deliverable | Langkah | Status |
|---|---|---|---|
| MODULE-001 | Kontrak config, payload, format, instructions, checks, dedup, source, metrics, dan fixtures semua niche | 0.6 | `accepted` |
| DNA-001 | Topic pillars, lima format, profiles, style, hook, CTA, caption, source policy, rubric, examples, dan anti-examples trivia | 0.7 | `accepted` |
| TOOL-001 | Final MCP tool inventory dan penghapusan tool yang tumpang tindih | 0.8 | `accepted` |
| TOOL-002 | Exact input/output schema, error codes, annotations, auth schemes, dan orchestration sequence | 0.8 | `accepted` |
| USECASE-001 | Direct, indirect, edge-case, out-of-scope, interruption, dan recovery scenarios | 0.9 | `accepted` |
| TRACE-001 | Mapping setiap requirement/AC ke schema, RPC, tool, phase, automated test, dan content evaluation | 0.10 | `accepted` |

### 6.6 Sinkronisasi dokumen — diselesaikan pada langkah 0.11

| ID | Ketidaksinkronan baseline | Status |
|---|---|---|
| DOC-001 | PRD masih menyatakan `implementation-plan.md` belum dibuat | `accepted` |
| DOC-002 | PRD melarang semua hosting/frontend tambahan, tetapi OAuth consent memerlukan frontend | `accepted` |
| DOC-003 | Urutan final connection, production deployment, registered MCP mapping, dan plugin packaging belum konsisten | `accepted` |
| DOC-004 | Requirement platform terkini belum tercermin: respons token harus menerima seluruh status `2xx` | `accepted` |
| DOC-005 | Data API exposure harus dinyatakan eksplisit dan diverifikasi, bukan diasumsikan otomatis | `accepted` |
| DOC-006 | Versi runtime/dependency yang sudah tidak didukung harus dikeluarkan dari baseline implementasi | `accepted` |

### 6.7 Final audit dan specification freeze — diselesaikan pada langkah 0.12

| ID | Keputusan/deliverable | Status |
|---|---|---|
| FREEZE-001 | Seluruh artefak normatif Phase 0 lulus audit silang dan dibekukan sebagai baseline implementasi | `accepted` |
| FREEZE-002 | Composite audit FK wajib mengikat business row dan operation ledger pada workspace yang sama | `accepted` |
| FREEZE-003 | Status ready/posted/archived wajib memiliki approval snapshot selain quality pass dan ready_at | `accepted` |
| FREEZE-004 | Unique structured hash hanya berlaku pada row current yang dinilai lengkap dan deterministic-safe oleh validator server | `accepted` |
| FREEZE-005 | Correction lineage menolak self-reference di constraint dan cycle di transactional validator | `accepted` |

---

## 7. Keputusan langkah 0.2 — Runtime dan OAuth

Semua keputusan pada bagian ini berstatus `accepted` pada 7 Oktober 2026. Keputusan akan dipropagasikan ke PRD, database design, implementation plan, dan workflow pada langkah 0.11.

### 7.1 Runtime boundary MVP

Runtime MVP terdiri dari:

1. ChatGPT sebagai host percakapan dan reasoning.
2. Satu remote MCP server bertransport Streamable HTTP pada Supabase Edge Function.
3. Supabase Auth sebagai OAuth 2.1 authorization server.
4. Supabase Postgres sebagai system of record dengan RLS.
5. Satu frontend autentikasi minimal untuk login dan consent.
6. Package plugin pribadi yang menambahkan skill/instructions setelah remote MCP terbukti bekerja.

Frontend autentikasi bukan dashboard produk dan tidak memiliki fungsi produksi konten. Frontend hanya menyediakan login, consent, deny, logout, dan error state. Tidak ada MCP App UI, dashboard admin, Canva UI, atau Facebook UI pada MVP.

Frontend harus dapat di-host sebagai React SPA pada origin HTTPS yang stabil. Pilihan vendor hosting tidak menjadi dependency arsitektur dan dipilih saat deployment; Vercel tidak diwajibkan. Provider harus mendukung HTTPS, environment variables, SPA route fallback, dan deployment versioning. Penggunaan provider gratis diperbolehkan. Pemilihan vendor tidak boleh mengubah OAuth contract atau source code inti.

MCP production menggunakan URL proyek Supabase:

```text
https://<project-ref>.supabase.co/functions/v1/mcp
```

Custom domain untuk MCP ditunda sampai post-MVP karena dapat membuat authorization-server URL hasil derivasi berbeda dari issuer Supabase. Jika custom domain kelak digunakan, `authorizationServer` wajib dikonfigurasi eksplisit ke issuer proyek Supabase dan diuji exact match.

### 7.2 Minimal authentication frontend

Frontend mempunyai route minimum:

| Route | Fungsi |
|---|---|
| `/login` | Login owner dan mempertahankan tujuan kembali termasuk `authorization_id` |
| `/oauth/consent` | Membaca authorization details, menampilkan client dan scopes, lalu approve atau deny |
| `/logout` | Mengakhiri sesi browser frontend |
| Error state | Menampilkan error aman tanpa token, secret, atau detail internal |

Keputusan implementasi:

- MVP memakai email dan password untuk owner; social login, public signup, magic link, dan MFA tidak menjadi requirement MVP.
- Public signup dinonaktifkan. Owner dibuat secara manual di Supabase Auth sebelum pilot.
- Browser hanya menerima Supabase publishable key. Secret key dan `service_role` dilarang berada di frontend.
- Consent page wajib mempertahankan dan memvalidasi `authorization_id`.
- Consent page mengambil detail melalui `getAuthorizationDetails`, menampilkan nama client dan scopes, kemudian memakai `approveAuthorization` atau `denyAuthorization`.
- Identity pada frontend diverifikasi dengan `getClaims` atau `getUser`; object user dari `getSession` tidak boleh menjadi dasar authorization.
- Supabase Auth Site URL menunjuk ke origin frontend dan Authorization Path ditetapkan menjadi `/oauth/consent`.
- Local development menggunakan frontend `http://localhost:3000` dan Supabase local stack.
- Tidak ada data konten, Page, fakta, post, atau metrics yang dibaca frontend ini.

### 7.3 OAuth client registration dan consent

MVP memakai Dynamic Client Registration (DCR):

- Supabase OAuth 2.1 server diaktifkan.
- `allow_dynamic_registration = true` diaktifkan untuk local dan production.
- ChatGPT mendaftarkan client sendiri lalu menjalankan authorization-code flow dengan PKCE `S256`.
- User approval selalu wajib; tidak ada auto-approve.
- Redirect URI harus exact dan HTTPS pada production.
- Registered clients ditinjau berkala dan grant yang tidak dikenal atau tidak digunakan direvoke.
- CIMD tidak menjadi requirement MVP karena jalur end-to-end Supabase yang dipilih menggunakan DCR.
- Pre-registered confidential client dan client secret tidak digunakan pada MVP.

Scope minimum yang diminta adalah `openid email`. `profile` dan `phone` tidak diminta. Scope tersebut menjelaskan data identitas pada consent screen; izin database tetap ditentukan oleh ownership check dan RLS, bukan oleh OIDC scope.

### 7.4 OAuth discovery dan Edge Function middleware

`supabase/config.toml` wajib memuat:

```toml
[functions.mcp]
verify_jwt = false

[auth]
site_url = "<auth-frontend-origin>"

[auth.oauth_server]
enabled = true
authorization_url_path = "/oauth/consent"
allow_dynamic_registration = true
```

`verify_jwt = false` hanya menonaktifkan JWT gate bawaan gateway agar discovery request tanpa token dapat mencapai function. Hal tersebut tidak menjadikan tool anonim. Authentication tetap diwajibkan di dalam Edge Function dengan urutan middleware:

1. `withOAuthProtectedResource()` menyediakan protected-resource metadata, CORS discovery, dan `WWW-Authenticate` challenge.
2. `withSupabase({ auth: 'user' })` memverifikasi token dan membuat Supabase client yang scoped kepada pengguna.
3. Handler MCP hanya berjalan setelah kedua tahap tersebut berhasil.

Project wajib menggunakan asymmetric JWT signing key ES256 atau RS256 dan menyediakan JWKS. Legacy HS256 ditolak.

Public surface tanpa autentikasi dibatasi pada OAuth discovery/preflight dan health HTTP yang hanya mengembalikan status/version tanpa data. Semua MCP tools, termasuk health/profile tools, memerlukan OAuth. Setiap tool mendeklarasikan `securitySchemes` OAuth secara eksplisit; nama tool dan schema final ditutup pada langkah 0.8.

### 7.5 Token validation dan resource binding

Setiap access token diperlakukan sebagai input tidak tepercaya. Sebelum tool dijalankan, sistem wajib memverifikasi:

- Signature terhadap JWKS proyek.
- Exact issuer Supabase Auth.
- `exp` dan `nbf` bila tersedia.
- Audience/resource untuk canonical MCP URL.
- Presence dari `client_id` untuk membedakan OAuth client call dari sesi Auth biasa.
- User identity yang cocok dengan workspace owner.

Canonical protected resource adalah URL MCP production lengkap. Karena default Supabase OAuth token dapat memakai audience `authenticated`, production harus memakai Custom Access Token Hook untuk token OAuth yang memiliki `client_id` agar `aud` diubah menjadi canonical MCP resource. Claim wajib lain harus dipertahankan. Token browser non-OAuth tanpa `client_id` mempertahankan audience default.

Acceptance test wajib membuktikan bahwa `resource` yang diiklankan protected-resource metadata sama dengan audience yang diterima server. Jika versi middleware/provider yang digunakan menyediakan resource binding secara native, custom hook boleh dihilangkan hanya setelah integration test membuktikan invariant yang sama; audience validation tidak boleh dinonaktifkan sebagai jalan pintas.

Code tidak boleh memeriksa keberhasilan token exchange hanya dengan status `201`. Seluruh status sukses `2xx` diterima melalui mekanisme library atau `response.ok`.

### 7.6 Owner authorization dan RLS boundary

Authentication dan authorization dipisahkan:

- Token valid membuktikan identitas pengguna.
- `workspaces.owner_user_id = auth.uid()` membuktikan hak atas workspace.
- Email, `user_metadata`, dan nilai yang dapat diedit pengguna tidak digunakan untuk authorization.
- MCP database access wajib membawa OAuth `client_id`; sesi browser biasa tidak menjadi jalur untuk mengakses operasi MCP.
- Owner workspace dibuat melalui bootstrap/seed yang terkontrol, bukan public signup.
- Non-owner dengan token valid mendapat `403` dengan stable error code `OWNER_ACCESS_REQUIRED` dan tanpa metadata workspace.
- Token hilang, invalid, atau expired mendapat `401` beserta `WWW-Authenticate` challenge.
- `service_role`/secret key tidak digunakan oleh MCP request path. Tool memakai user-scoped client dan RLS; privileged internal function hanya boleh dibuat berdasarkan aturan security pada database design.

MCP menyediakan capability profile read-only yang mengembalikan owner ID stabil dan label aman, dengan `_meta["openai/profile"] = true`. Nama final tool diputuskan pada langkah 0.8.

### 7.7 Session, revocation, dan error behavior

- ChatGPT/OAuth client menangani access token dan refresh token; MCP server tidak menyimpan token tersebut.
- Access token lifetime production maksimal 60 menit untuk MVP.
- Revocation dilakukan dengan mencabut OAuth grant/client dan session owner dari Supabase; akses token yang sudah diterbitkan dapat tetap valid sampai expiry, sehingga dampak revocation dibatasi oleh lifetime tersebut.
- Missing/expired token memicu reauthorization melalui `401` dan `WWW-Authenticate`.
- Revoked refresh token tidak boleh dapat menghasilkan access token baru.
- Production menggunakan error response ringkas; diagnostic detail hanya aktif pada local development.
- Log boleh menyimpan request ID, actor UUID, client ID, tool name, result status, latency, dan stable error code, tetapi dilarang menyimpan bearer token, refresh token, authorization code, password, atau full sensitive payload.

### 7.8 Urutan koneksi dan packaging plugin

Urutan implementasi yang diterima:

1. Bangun dan test MCP serta OAuth secara lokal dengan MCP Inspector.
2. Deploy MCP Edge Function dan minimal auth frontend.
3. Test production discovery, DCR, login, consent, token, RLS, dan tools.
4. Tambahkan remote MCP melalui ChatGPT Plugins → Add custom MCP server → Create as a plugin.
5. Install hasil koneksi pribadi dan jalankan tool evaluation set.
6. Catat registered MCP technical ID `plugin_asdk_app...` bila host menyediakan ID tersebut.
7. Package skill, manifest, assets, dan registered MCP mapping menjadi plugin pribadi yang lengkap.
8. Install melalui local/personal marketplace dan jalankan combined skill+tool evaluation.

Dengan demikian, skeleton package boleh disiapkan lebih awal, tetapi mapping final dan end-to-end package verification dilakukan setelah remote MCP berhasil terhubung. Urutan Phase 7–10 dalam implementation plan harus disesuaikan pada langkah 0.11.

### 7.9 Runtime dan dependency baseline

Baseline implementasi:

| Komponen | Keputusan |
|---|---|
| Node.js lokal/CI | Node.js 24.15.0; satu-satunya baseline runtime lokal dan CI proyek |
| Supabase CLI | Minimal 2.117.0; exact tested version dipin pada Phase 1 |
| Edge runtime | Hosted Supabase Edge Runtime, Deno 2.1-compatible |
| MCP transport | Streamable HTTP |
| MCP library | Major version yang digunakan panduan Supabase terkini; exact version dipin setelah compatibility spike |
| Supabase middleware | `@supabase/middleware` major 1 |
| Supabase server middleware | `@supabase/server` minimal 1.9.0 |
| Validation | Zod major 4 |
| Locking | Exact resolved dependency versions dan lockfile wajib dikomit pada Phase 1 |

Exact dependency tidak ditebak di Phase 0. Phase 1 melakukan install dari registry resmi, compatibility test, lalu memin exact version. Upgrade sesudahnya wajib melalui changelog review dan regression test.

### 7.10 Verification intent untuk implementasi

Verification suite wajib mencakup:

1. Protected-resource metadata dapat dibaca tanpa token.
2. `authorization_servers` exact match dengan issuer pada discovery Supabase Auth.
3. Request MCP tanpa token menghasilkan `401` dan `WWW-Authenticate` yang benar.
4. DCR, PKCE `S256`, login, approve, deny, dan redirect exact berhasil.
5. Token mempunyai signature, issuer, expiry, client ID, dan resource/audience yang benar.
6. Token milik owner dapat menjalankan tool sesuai RLS.
7. Token non-owner ditolak `403` tanpa kebocoran data.
8. Token browser biasa tanpa OAuth `client_id` tidak diterima pada MCP operation path.
9. Token expired/revoked tidak dapat digunakan atau diperbarui melampaui aturan yang ditetapkan.
10. Consent frontend tidak mengekspos secret key atau token pada log/error.
11. MCP Inspector dan ChatGPT dapat menyelesaikan flow yang sama.
12. Plugin package diuji hanya setelah remote MCP connection lulus.

### 7.11 Trade-off yang diterima

- Menambahkan frontend autentikasi minimal memperluas runtime, tetapi merupakan kebutuhan protokol dan tidak mengubah produk menjadi web dashboard.
- DCR mengurangi konfigurasi manual tetapi memungkinkan compatible clients mendaftar; risiko dibatasi dengan explicit owner consent, review/revocation client, OAuth `client_id`, ownership check, dan RLS.
- Default Supabase project URL mengurangi branding dan fleksibilitas domain, tetapi menghindari mismatch issuer pada MVP.
- Access token maksimal 60 menit berarti revocation tidak selalu instan, tetapi cukup proporsional untuk plugin pribadi satu owner.
- Custom audience hook menambah satu komponen security, tetapi mempertahankan resource binding yang diwajibkan MCP/OpenAI.

### 7.12 Verification gate langkah 0.2

Status: **lulus**.

- AUTH-001 sampai AUTH-006 berstatus `accepted`.
- PLATFORM-001 sampai PLATFORM-003 berstatus `accepted`.
- Runtime boundary membedakan MCP server, database, authorization server, dan auth frontend.
- Tidak ada dashboard produk atau MCP App UI yang masuk scope.
- OAuth registration, discovery, consent, token validation, resource binding, ownership, RLS, session, dan error behavior mempunyai invariant yang dapat diuji.
- Urutan connect-first lalu package-plugin telah ditetapkan.
- Runtime baseline tidak bergantung pada legacy Node runtime atau HS256.
- Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.
- Langkah berikutnya ditetapkan sebagai 0.3 — finalisasi core transaction dan recovery.

---

## 8. Keputusan langkah 0.3 — Core transaction dan recovery

Semua keputusan pada bagian ini berstatus `accepted` pada 7 Oktober 2026. Desain schema final akan dipropagasikan ke database design dan implementation plan pada langkah 0.11; tidak ada migration yang dibuat pada Phase 0.

### 8.1 Idempotency ledger global

Idempotensi write tidak lagi bergantung hanya pada `operation_key` yang tersebar di tabel bisnis. MVP memakai satu ledger internal:

```text
internal.operation_ledger
```

Kolom minimum:

| Kolom | Fungsi |
|---|---|
| `id` | Primary key internal |
| `workspace_id` | Scope tenant |
| `actor_user_id` | `auth.uid()` yang menjalankan operasi |
| `operation_key` | UUID v4 milik satu logical write |
| `operation_name` | Nama RPC/domain operation yang terversi |
| `request_schema_version` | Versi canonical request |
| `request_hash` | SHA-256 canonical semantic request |
| `response_snapshot` | Respons sukses minimal dan aman untuk replay |
| `target_type` | Jenis target opsional, misalnya `post` atau `content_plan` |
| `target_public_id` | Public ID target opsional |
| `created_at` | Waktu operasi dimulai |
| `completed_at` | Waktu operasi sukses |

Invariant:

- Unique `(workspace_id, operation_key)` berlaku lintas seluruh write RPC.
- Caller membuat satu UUID v4 untuk satu logical write dan memakai key yang sama hanya untuk retry operasi tersebut.
- Request hash dibangun server-side dari JSONB canonical setelah parsing dan validation, bukan dari raw JSON string.
- Canonical request memasukkan `operation_name`, schema version, workspace scope, seluruh semantic input, `expected_revision` bila ada, dan target public ID; request ID, logging metadata, dan `operation_key` sendiri dikeluarkan dari hash.
- Timestamp dinormalisasi menjadi UTC dan identifier di-resolve sebelum canonical hash dibuat.
- Key yang sama dengan operation name atau request hash berbeda menghasilkan `OPERATION_KEY_REUSED`.
- Key yang sama dengan hash yang sama mengembalikan `response_snapshot` tanpa mengulang mutation dan tanpa menaikkan revision/attempt counter.
- Ledger insert, business mutation, dan ledger completion berada dalam satu transaksi. Jika transaksi gagal, ledger row ikut rollback sehingga retry aman.
- Concurrent request dengan key sama diserialisasi oleh unique constraint/row lock; hanya satu mutation yang dapat commit.
- Ledger hanya menyimpan response minimal seperti public ID, status, revision, dan timestamp; full content, source payload, token, dan secret tidak disalin.
- Ledger dipertahankan tanpa expiry pada MVP karena volume satu owner rendah. Kebijakan retention hanya boleh ditambahkan setelah duplicate-safety horizon ditetapkan.

Business rows yang dibuat oleh satu operation memakai optional `created_by_operation_id` ke ledger untuk audit. Beberapa child rows, seperti seluruh `content_plan_items` dalam satu plan, boleh menunjuk operation ledger yang sama. Unique `operation_key` per business table yang tidak dapat menangani multi-row children akan dihapus atau diganti oleh relasi ini.

### 8.2 Claim lease dan stale recovery plan item

`content_plan_items` memperoleh kolom:

- `claim_token uuid`
- `claimed_at timestamptz`
- `claim_expires_at timestamptz`
- `claim_renewal_count integer not null default 0`

Aturan lease:

- Fresh claim mengubah `pending` atau expired `in_progress` menjadi `in_progress` dan menghasilkan claim token baru.
- Default lease adalah 30 menit.
- Claim dapat diperpanjang satu kali sampai maksimum absolut 60 menit dari `claimed_at` awal.
- Claim chunk default 1 dan maksimum 3 item agar item akhir tidak kedaluwarsa sebelum diproses.
- Claim memakai `FOR UPDATE SKIP LOCKED`, order `position, id`, lalu update+return dalam transaksi yang sama.
- `attempt_count` bertambah pada fresh claim/reclaim, tidak pada idempotent replay atau renewal.
- `started_at` menyimpan waktu percobaan pertama; `claimed_at` menyimpan awal lease aktif.
- `save_trivia_post` dan failure-report operation wajib menerima claim token yang masih cocok dan belum expired.
- Successful save mengubah item menjadi `completed` dan mengosongkan seluruh claim fields.
- Explicit safe failure mengubah item menjadi `failed`, menyimpan safe error, dan mengosongkan claim fields.
- `retry_content_plan_item` hanya mengubah `failed → pending`; attempt counter tidak direset.
- Tidak ada background worker wajib. `claim_content_plan_items` secara opportunistic dapat mengambil expired `in_progress` dan menggantinya dengan lease baru secara atomic.
- Stale token selalu ditolak dengan `PLAN_ITEM_CLAIM_MISMATCH` atau `PLAN_ITEM_CLAIM_EXPIRED`.

RPC domain minimum bertambah dengan capability untuk memperpanjang claim dan melaporkan failure secara aman. Nama MCP tool final ditentukan pada langkah 0.8.

Cancellation mengambil lock plan dan item dalam urutan ID. Item `pending`, `failed`, atau `in_progress` menjadi `cancelled` dan claim dibersihkan; item `completed` tidak diubah. Race save-versus-cancel diselesaikan oleh row lock: operasi yang commit lebih dahulu menentukan hasil, dan operasi berikutnya wajib memvalidasi ulang status serta token.

### 8.3 Schedule locking lintas tabel

Semua operasi yang membuat atau memindahkan schedule memakai transaction-level advisory lock deterministik untuk setiap `(page_id, scheduled_at)`.

Lock key dibentuk dari string berversi seperti:

```text
content-producer:schedule:v1:<page_id>:<scheduled_at-utc-microseconds>
```

String diubah menjadi bigint melalui hash PostgreSQL dengan fixed seed. Collision hanya boleh menyebabkan serialisasi tambahan; correctness tetap ditentukan oleh query ulang dan constraints setelah lock diperoleh.

Aturan:

- Timestamp dinormalisasi ke UTC sebelum key dibuat.
- Untuk reschedule, lock slot lama dan baru diambil dalam urutan numeric lock key agar tidak deadlock.
- Setelah lock, RPC memeriksa `content_plan_items` dan `posts` dalam transaksi yang sama sebelum write.
- Plan item menempati slot selama status bukan `cancelled`.
- Post menempati slot selama status bukan `discarded`; `archived` tetap menyimpan histori slot publikasi.
- Direct post tanpa plan item berbenturan dengan semua plan item non-cancelled pada slot yang sama.
- Saat menyimpan post dari plan item, row plan item asal dikecualikan dari conflict check hanya jika public/internal identity cocok dan `post.scheduled_at = item.scheduled_at`.
- Jika schedule post dan item ingin dipindah, keduanya harus dipindahkan secara atomic oleh satu RPC.
- Partial unique index per tabel tetap dipakai sebagai pertahanan lokal. Post schedule index mengecualikan hanya `discarded`, bukan `archived`.
- Conflict menghasilkan `SCHEDULE_CONFLICT` dan tidak menggeser waktu secara otomatis.

### 8.4 Terminal semantics plan item dan replacement

- `completed` berarti item pernah berhasil menghasilkan post draft.
- Satu plan item hanya boleh mempunyai satu post yang statusnya bukan `discarded`, termasuk ketika post sudah `archived`.
- Post yang pernah mencapai `posted` atau `archived` membuat plan item permanen terminal; item tidak dapat di-reset atau menghasilkan replacement.
- Post `draft` atau `ready` yang dibuang tetap tersimpan sebagai `discarded` untuk audit.
- Setelah discard pre-publication, item tetap `completed` secara default.
- Replacement hanya terjadi melalui perintah pengguna eksplisit. RPC replacement boleh mengubah `completed → pending` jika seluruh post sebelumnya untuk item itu `discarded` dan tidak ada post yang pernah `posted/archived`.
- Replacement mencatat reason dan operation ledger baru; post lama tidak dihapus.
- `failed → pending` adalah retry, sedangkan `completed → pending` setelah discarded adalah replacement. Keduanya tidak boleh memakai jalur yang ambigu.
- `cancelled` tidak dapat di-retry; pengguna membuat plan/slot baru bila ingin menghidupkannya kembali.
- Partial unique post-per-item mengecualikan hanya `discarded`, sehingga archived tetap memblokir output kedua.

### 8.5 Atomic boundary dan global lock ordering

Setiap write RPC adalah satu transaksi database. Tidak ada web research, model generation, network call, atau user interaction di dalam transaksi.

Urutan lock global:

1. Idempotency ledger key/row.
2. Advisory schedule lock keys dalam urutan numeric.
3. Content plan dan plan item rows dalam urutan ID.
4. Post rows dalam urutan ID.
5. Canonical fact rows dalam urutan ID.
6. Junction rows dalam urutan ID.

Operasi yang tidak membutuhkan lapisan tertentu melewatinya tetapi tidak boleh mengambil lock dalam urutan terbalik.

`save_trivia_post` wajib melakukan dalam satu transaksi:

1. Authenticate, authorize, canonicalize request, dan claim idempotency key.
2. Resolve/lock schedule, plan, item, post bila relevan, facts, dan junctions sesuai urutan global.
3. Memvalidasi plan item claim, reservation, reuse, source freshness, config/schema version, payload, text metrics, dan schedule.
4. Insert post draft.
5. Insert seluruh trivia junction dan verification snapshots.
6. Mengubah fact reservation menjadi allocation dengan membersihkan reservation fields.
7. Mengubah plan item menjadi `completed`, membersihkan lease, dan menghitung ulang plan state.
8. Menyelesaikan operation ledger dan commit.

Kegagalan langkah mana pun me-rollback semua langkah, termasuk ledger row. Mutation parsial tidak boleh dipulihkan dengan cleanup manual sebagai normal path.

Write RPC memakai target awal `lock_timeout = 2s` dan `statement_timeout = 15s`. Timeout dipetakan menjadi retryable `DATABASE_BUSY`; caller memakai operation key yang sama untuk retry. Threshold dapat diubah setelah load test, tetapi tidak boleh dihapus tanpa pengganti.

### 8.6 Optimistic concurrency dan revision contract

- Semua mutation terhadap post yang sudah ada menerima `expected_revision` dan `operation_key`.
- `expected_revision` menjadi bagian request hash.
- RPC mengunci post, membandingkan revision dan legal status, lalu mengubah seluruh state terkait secara atomic.
- Setiap successful logical mutation menaikkan revision tepat satu kali.
- Idempotent replay dari operation key yang sama tidak menaikkan revision lagi.
- Revision mismatch menghasilkan `REVISION_CONFLICT` dengan safe payload: post public ID, current revision, dan current status.
- Caller wajib mengambil state terbaru dan meminta keputusan/reconcile; server tidak melakukan silent merge atau automatic overwrite.
- Retry setelah reconcile adalah logical operation baru dan memakai operation key baru serta current `expected_revision`.
- Revisi post `ready` mengembalikannya ke `draft`, mengosongkan approval yang tidak lagi valid, dan menaikkan revision.
- Repeated status request dengan key yang sama mengembalikan replay. Target status sama dengan key berbeda bukan no-op dan ditolak sebagai invalid transition.

### 8.7 Data API dan RPC-only boundary

Data API mengekspos hanya schema `api`. Schema `public` yang berisi tabel bisnis dan schema `internal` tidak dimasukkan dalam exposed schemas.

Boundary:

- `anon` tidak mendapat usage/execute pada schema `api` dan tidak mendapat table privilege.
- `authenticated` mendapat usage pada `api` dan execute hanya pada RPC allowlist.
- `authenticated` tidak mendapat direct `SELECT`, `INSERT`, `UPDATE`, atau `DELETE` pada tabel bisnis.
- Semua read dan write MCP melewati RPC; tidak ada direct `.from(<business_table>)` pada Edge Function.
- Edge Function memakai user JWT dan memanggil `.schema('api').rpc(...)`.
- Semua tabel bisnis tetap mengaktifkan RLS sebagai defense in depth.
- RPC exposed memakai explicit argument types, schema validation, stable errors, dan tidak menerima workspace scope hanya berdasarkan input tanpa memeriksa `auth.uid()`.

Untuk RPC yang membutuhkan narrow elevated privilege, digunakan role khusus `content_producer_api_owner` yang:

- `NOLOGIN` dan tidak memiliki `BYPASSRLS`.
- Bukan owner tabel bisnis.
- Hanya mendapat privilege tabel/sequence yang diperlukan.
- Menjadi owner function `SECURITY DEFINER` pada schema `api`/`internal`.

Function tersebut menetapkan `search_path = ''`, memakai fully-qualified identifiers, memeriksa `auth.uid()`, OAuth `client_id`, workspace ownership, dan input di body. `EXECUTE` dicabut dari `PUBLIC`, `anon`, dan role lain, kemudian diberikan hanya ke `authenticated` untuk entry point allowlist. Karena function owner bukan table owner dan tidak mempunyai `BYPASSRLS`, RLS tetap harus berlaku dan dibuktikan dengan integration test.

`internal.operation_ledger`, rate-limit storage, serta helper internal tidak diekspos. Direct table grants dan exposed schemas ditulis eksplisit dalam migration; implementasi tidak mengandalkan default Supabase project.

### 8.8 Rate limiting

Authenticated tool calls memakai rate limiter database-backed agar konsisten pada semua Edge Function instances. Counter disimpan di `internal.rate_limit_buckets` dan di-update dengan atomic upsert.

Key bucket:

```text
(actor_user_id, oauth_client_id, limit_group, window_start)
```

Default production:

| Group | Batas | Contoh |
|---|---:|---|
| `read` | 120 request/menit | Context, list, get, profile, health |
| `expensive_read` | 20 request/menit | Similarity search dan performance insight |
| `write` | 30 request/menit | Create, revise, transition, metrics |
| `contention_write` | 20 request/menit | Claim, reserve, save, replacement |

Aturan:

- Window MVP adalah fixed one-minute UTC window.
- Limit diterapkan setelah token validation dan sebelum domain mutation.
- Pelanggaran menghasilkan HTTP/tool error `RATE_LIMITED` dengan `retry_after_seconds` dan tidak menjalankan business mutation.
- Tidak ada bypass production hanya karena actor adalah owner.
- Local automated tests boleh memakai konfigurasi limit khusus yang eksplisit.
- Batch size, payload size, dan maximum result size tetap divalidasi terpisah; rate limit bukan pengganti input limit.
- Bucket yang lebih lama dari 24 jam dapat dibersihkan opportunistic; cleanup tidak memengaruhi business correctness.
- OAuth discovery, DCR, dan login mempunyai rate limit platform/Auth sendiri dan tidak memakai business limiter ini.

### 8.9 Error contract tambahan

| Code | Makna | Retry |
|---|---|---|
| `PLAN_ITEM_CLAIM_MISMATCH` | Token tidak lagi memiliki item | Claim ulang |
| `PLAN_ITEM_CLAIM_EXPIRED` | Lease melewati expiry | Claim ulang |
| `PLAN_ITEM_REPLACEMENT_BLOCKED` | Item pernah published atau masih memiliki post non-discarded | Tidak, perbaiki intent |
| `DATABASE_BUSY` | Lock/statement timeout sementara | Ya, key sama |
| `RATE_LIMITED` | Bucket limit terlampaui | Ya, setelah retry-after |
| `DIRECT_TABLE_ACCESS_DENIED` | Jalur non-RPC mencoba tabel bisnis | Tidak |

`OPERATION_KEY_REUSED`, `REVISION_CONFLICT`, `SCHEDULE_CONFLICT`, dan error lifecycle yang sudah ada tetap dipakai.

### 8.10 Verification intent

Database/integration tests wajib membuktikan:

1. Dua request paralel dengan operation key dan payload sama menghasilkan satu mutation dan respons replay yang sama.
2. Key sama dengan payload/operation berbeda ditolak.
3. Failed transaction tidak meninggalkan ledger completion atau partial business rows.
4. Dua claim workers menerima item berbeda tanpa saling menunggu.
5. Expired item dapat direclaim; stale token tidak dapat save/fail/renew.
6. Renewal tidak melewati maksimum absolut 60 menit.
7. Cancel-versus-save dan retry-versus-claim menghasilkan satu state legal.
8. Linked plan item dan post boleh berbagi slot; direct/unrelated rows pada slot sama ditolak.
9. Reschedule dua slot berlawanan tidak deadlock karena lock ordering.
10. Archived post tetap memblokir post kedua untuk plan item dan schedule yang sama.
11. Replacement hanya berhasil setelah pre-publication discard eksplisit.
12. Setiap successful mutation menaikkan revision sekali; replay tidak menaikkan lagi.
13. Schema `public` dan `internal` tidak dapat diakses langsung melalui Data API.
14. Owner dapat memakai allowlisted RPC; non-owner, anon, dan browser session tanpa OAuth client ditolak.
15. Dedicated function owner tidak bypass RLS.
16. Rate limits konsisten pada call paralel dan mengembalikan retry-after.
17. `lock_timeout` dan `statement_timeout` dipetakan ke error aman tanpa raw SQL.
18. Database advisors tidak melaporkan privilege/RLS issue yang belum diselesaikan.

### 8.11 Verification gate langkah 0.3

Status: **lulus**.

- CORE-001 sampai CORE-008 berstatus `accepted`.
- Idempotency, leases, schedule locks, terminal semantics, atomicity, revision, RPC boundary, dan rate limits mempunyai invariant serta test intent.
- Tidak ada write path yang membutuhkan direct business-table access dari Edge Function.
- Tidak ada external call di dalam database transaction.
- Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.
- Langkah berikutnya ditetapkan sebagai 0.4 — finalisasi trivia fact lifecycle dan deduplication.

---

## 9. Keputusan langkah 0.4 — Trivia fact lifecycle dan deduplikasi

Semua keputusan pada bagian ini berstatus `accepted` pada 7 Oktober 2026. Keputusan ini menetapkan perilaku domain dan target evaluasi. Perubahan kolom, constraint, RPC, serta test suite baru dipropagasikan ke dokumen lain pada langkah 0.11 dan diimplementasikan setelah Phase 0.

### 9.1 Unit canonical fact dan identitas

Satu canonical fact adalah **satu proposisi atomik yang dapat dinilai benar atau salah**. Canonical fact bukan paragraf, kumpulan fakta, hook, CTA, opini, prediksi, atau wording khusus satu post.

Seluruh unsur yang dapat mengubah makna wajib menjadi bagian identitas:

- Subject dan entity yang tepat.
- Relation serta arah perbandingan.
- Object atau nilai klaim.
- Negasi.
- Angka dan unit yang sudah dinormalisasi tanpa kehilangan presisi material.
- Qualifier waktu, lokasi, populasi, kondisi, metode, dan scope.
- Status estimasi, kisaran, superlatif, atau probabilitas bila relevan.

Klaim majemuk harus dipecah sebelum registrasi. Dua wording hanya boleh berbagi canonical row jika proposisi atomiknya sama, bukan sekadar membahas topik atau subjek yang sama.

`normalized_claim` dibuat oleh normalizer deterministik, bukan parafrasa kreatif model. Normalisasi versi 1 hanya mengubah bentuk permukaan yang aman, seperti Unicode, case, whitespace, tanda baca, alias eksplisit, angka, dan unit ekuivalen. Negasi, angka, arah perbandingan, serta qualifier material tidak boleh dibuang.

Hash versi 1 memakai domain separator:

```text
claim_hash = sha256("trivia-claim:v1|" + normalized_claim)
structured_hash = sha256("trivia-structure:v1|" + structured_key)
```

`structured_key` diserialisasi deterministik dari seluruh field identitas dengan urutan key tetap, representasi angka/unit canonical, dan penanda eksplisit untuk field kosong. Hash disimpan sebagai hex lowercase 64 karakter, tetapi kecocokan hash selalu diverifikasi terhadap canonical input pembentuknya. Hash sama dengan input berbeda menghasilkan `FACT_HASH_COLLISION`; sistem tidak boleh menggabungkan row tersebut.

Invariant keunikan:

- Hanya satu canonical fact **current** per workspace untuk `claim_hash` yang sama.
- Hanya satu canonical fact current per workspace untuk `structured_hash` yang sudah dinilai lengkap dan deterministic-safe.
- Collision structured key yang belum cukup lengkap tidak boleh dipaksa menjadi merge atau row baru. Kandidat masuk review, lalu ontology/key harus menambahkan discriminator yang benar sebelum insert distinct.
- Row historis `superseded`, `invalidated`, atau `rejected` tetap disimpan. Unique enforcement final memakai current-row semantics agar successor yang sah dapat dibuat tanpa menghapus histori.
- Upgrade normalization/ontology dilakukan sebagai controlled migration dengan write freeze, full fixture run, collision report, dan manual adjudication sebelum unique constraint baru diaktifkan. Dua versi identity aktif tidak boleh berjalan diam-diam dalam satu workspace.

### 9.2 Matriks keputusan deduplikasi

| Sinyal | Keputusan otomatis | Aturan |
|---|---|---|
| Exact `claim_hash` + canonical input sama | Match canonical row | Reuse rule tetap diperiksa; bukan izin otomatis menggunakan fakta |
| Exact `structured_hash`, ontology/version sama, seluruh field material lengkap, relation berada pada deterministic-safe allowlist | Match canonical row | Canonical inputs dibandingkan sebelum match |
| Exact `structured_hash` tetapi kelengkapan/allowlist tidak terpenuhi | `review_required` | Tidak boleh insert atau merge sampai discriminator/keputusan jelas |
| FTS, trigram, entity overlap, source overlap, atau topik sama | Candidate only | Tidak pernah menjadi auto-match atau auto-reject |
| Semantic judgment oleh ChatGPT | `same`, `distinct`, atau `uncertain` | `same` memakai row lama; `distinct` harus memiliki structured discriminator; `uncertain` tidak dapat direservasi |
| Perbedaan negasi, angka material, arah perbandingan, waktu, lokasi, populasi, atau kondisi | Anti-merge signal | Tetap dapat ditampilkan sebagai kandidat terkait, tetapi tidak auto-match |
| Klaim dari dataset referensi | Discovery/candidate only | Tidak menjadi bukti kebenaran atau verification source |

Candidate retrieval mengembalikan maksimum 20 row per calon fakta, diurutkan dari exact/structured signal, kemudian FTS/trigram dan sinyal pendukung. Threshold pencarian ditetapkan saat implementasi berdasarkan gold set; threshold tidak boleh dipilih hanya agar fixture training lulus.

Sebelum row distinct dibuat, seluruh kandidat kuat harus mempunyai keputusan tercatat dengan `decision`, candidate fact public ID, identity schema version, alasan singkat, dan actor/model context yang aman. Untuk row baru, bukti ini disimpan sebagai versioned `dedup_review_snapshot` pada canonical fact; match terhadap row lama tetap dicatat pada hasil operasi tanpa menyalin full content ke idempotency ledger. Keputusan `uncertain` atau bukti sumber yang belum cukup menghasilkan `needs_review`; row tersebut tidak eligible untuk reservasi.

Pencarian, research, dan semantic comparison dilakukan di luar transaksi. Transaksi registrasi mengambil advisory/row lock deterministik untuk identity key, menjalankan ulang exact lookup, lalu insert atau memakai canonical row yang sudah ada. Dengan demikian dua request paralel tidak dapat membuat canonical duplicate setelah sama-sama melakukan research.

### 9.3 Lifecycle, koreksi, dan lineage fakta

Status canonical fact versi MVP:

| Status | Makna | Eligible untuk reservasi |
|---|---|---:|
| `needs_review` | Identitas atau bukti belum lengkap | Tidak |
| `verified` | Current fact dengan bukti dan freshness valid | Ya, jika reuse mengizinkan |
| `rejected` | Kandidat tidak pernah lolos verifikasi | Tidak |
| `invalidated` | Pernah verified, kemudian terbukti salah/tidak lagi didukung dan belum mempunyai successor | Tidak |
| `superseded` | Digantikan canonical fact baru melalui koreksi bermakna | Tidak |

Aturan koreksi:

- Field makna tidak diubah setelah fact pernah mempunyai junction, termasuk junction released.
- Refresh sumber, `verified_at`, `expires_at`, dan catatan review boleh memperbarui row yang sama hanya jika proposisi tidak berubah.
- Koreksi yang mengubah proposisi membuat row baru dengan `supersedes_fact_id`, `correction_reason`, dan timestamp. Row lama menjadi `superseded` dalam transaksi yang sama.
- Satu fact hanya boleh mempunyai satu direct successor current; lineage harus berada pada workspace yang sama, tidak boleh menunjuk diri sendiri, dan tidak boleh membentuk cycle.
- Fact yang salah tanpa pengganti menjadi `invalidated`. Fact yang sejak awal tidak memenuhi bukti menjadi `rejected`; kedua status tidak dipakai secara bergantian.
- Canonical facts dan junction tidak pernah hard-delete pada MVP.

Dampak koreksi terhadap post:

- Post `draft` yang memakai fact invalidated/superseded tetap draft dan mendapat blocking quality issue sampai fakta diganti atau successor yang sesuai diadopsi secara eksplisit.
- Post `ready` yang terkena koreksi dikembalikan ke `draft`, approval dibatalkan, revision naik satu kali, dan blocking issue dicatat secara atomic.
- Transisi `ready → posted` mengunci dan memeriksa ulang bahwa seluruh fact masih current, verified, dan fresh sehingga race koreksi-versus-publish menghasilkan satu state legal.
- Post `posted` atau `archived` tidak ditulis ulang. Junction snapshot tetap menjadi histori, sedangkan query review menandainya `needs_correction` agar owner dapat memutuskan tindakan manual di Facebook.
- Mengadopsi successor pada draft/ready adalah replacement fact biasa: reserve successor, validasi, release junction lama, dan update post secara atomic.

### 9.4 Reservation contract

MVP mempertahankan satu active reservation per canonical fact. Ini sengaja konservatif: pada mode `page_unique`, dua Page berbeda tetap tidak dapat mereservasi fact yang sama pada saat bersamaan, tetapi dapat memakainya secara berurutan bila reuse rule mengizinkan.

Aturan reservation:

- Default TTL 30 menit; konfigurasi Page boleh 5–120 menit. TTL disnapshot saat reserve dan tidak diperpanjang pada MVP.
- Satu UUID v4 `reservation_token` dapat memiliki satu set 1–9 facts untuk satu logical post.
- Token terikat pada owner, workspace, Page, reuse-scope snapshot, config version, ordered fact IDs, dan canonical request fingerprint.
- Reservation token bukan kredensial autentikasi, tetapi tetap tidak boleh ditulis ke log umum atau response yang tidak memerlukannya.
- Reserve satu set bersifat all-or-nothing. Facts dikunci dalam urutan ID; satu conflict menggagalkan seluruh set tanpa meninggalkan reservation parsial.
- Hanya fact current `verified`, belum expired, dan mempunyai sumber valid yang dapat direservasi.
- Active reservation oleh token lain selalu memblokir, terlepas dari reuse scope.
- Expired reservation diperlakukan available setelah opportunistic cleanup pada row yang sedang dikunci. Cleanup tidak membutuhkan background worker.
- Release memerlukan token dan operation key, hanya membersihkan rows yang masih dimiliki token tersebut, dan idempotent bila row sudah released/expired.
- Save memerlukan token yang sama, belum expired, Page/config yang sama, serta exact set fact IDs tanpa tambahan atau kehilangan.
- Reservation yang expired tidak dihidupkan kembali oleh replay operation key. Caller membuat logical reservation baru dengan operation key dan token baru setelah mengecek ulang eligibility.
- Tidak ada network call, model generation, atau user wait di dalam transaction reserve/save. Jika proses dibatalkan setelah reserve, caller mencoba explicit release; TTL tetap menjadi recovery terakhir.

Sepuluh request paralel terhadap canonical fact yang sama menghasilkan tepat satu active reservation. Request lain menerima conflict terstruktur dan mencari pengganti atau mencoba lagi setelah reservation berakhir; server tidak melakukan silent substitution.

### 9.5 Reuse semantics

Reuse dihitung dari canonical fact dan junction, bukan dari wording render atau counter denormalized.

| State | Memblokir `workspace_unique` | Memblokir `page_unique` pada Page yang sama | Memblokir Page lain pada `page_unique` |
|---|---:|---:|---:|
| Active reservation token lain | Ya, sementara | Ya, sementara | Ya, sementara |
| `allocated` pada post draft/ready | Ya | Ya | Tidak |
| `published` pada post posted | Ya | Ya | Tidak |
| `published` pada post archived | Ya | Ya | Tidak |
| `released` karena replace/discard | Tidak | Tidak | Tidak |
| Junction historis pada post discarded | Tidak | Tidak | Tidak |

Aturan tambahan:

- Reuse scope selalu berasal dari konfigurasi **Page tujuan**; config Page yang pernah menggunakan fact tidak mengubah rule Page lain.
- Default Page baru tetap `workspace_unique`.
- Reservation dan save sama-sama menjalankan reuse check di dalam transaksi setelah lock.
- Jika reuse scope/config berubah antara reserve dan save, save gagal dengan `FACT_RESERVATION_CONTEXT_CHANGED`; caller release/re-reserve di bawah config baru. Perubahan tidak diterapkan retroaktif ke post lama.
- Replacement draft/ready mereservasi fact baru lebih dahulu. Junction lama baru menjadi released jika seluruh validasi dan update berhasil; failure mempertahankan alokasi lama.
- Posted/archived junction tidak pernah released. Penggunaan ulang berbasis cooling period tetap di luar MVP.

### 9.6 Sumber, verifikasi, dan freshness

Source hierarchy versi 1:

| Tier | Jenis sumber | Fungsi |
|---|---|---|
| A | Pemerintah, dataset/dokumen resmi, organisasi pemilik data, paper primer peer-reviewed, universitas atau institusi ilmiah sebagai sumber asli | Bukti utama |
| B | Museum, professional/scientific association, reference publication bereputasi, review paper, atau institusi ahli dengan editorial control | Bukti kuat |
| C | Media sekunder berkualitas yang mengutip sumber asal secara dapat ditelusuri | Konfirmasi atau discovery |
| D | Social post, competitor dataset, AI output, anonymous content, aggregator, atau blog penyalin tanpa provenance | Discovery only; tidak dapat memverifikasi |

Syarat minimum:

- Stable, non-sensitive: minimal satu sumber Tier A atau B yang mendukung proposisi lengkap.
- Periodic atau volatile: minimal satu sumber A/B yang authoritative, `as_of_date`, dan satu independent confirmation A/B/C bila klaim berupa angka penting, rekor, superlatif, disputed claim, atau berisiko menyesatkan.
- Medical, legal, financial, food safety, pet safety, survival, atau claim keselamatan lain: minimal satu sumber primer/otoritatif Tier A dan satu sumber A/B independen. Jika tidak tersedia, fact tidak boleh verified.
- Dua URL yang menyalin sumber asal yang sama tidak dihitung independen.
- Field `supports` harus menjelaskan bagian proposisi dan qualifier yang didukung, bukan hanya menyebut topik.

Setiap source item menyimpan source schema version, canonical URL, title, publisher, tier/type, accessed timestamp, published/updated date bila tersedia, `as_of`, language, dan support note. Research dilakukan di luar transaksi; database memvalidasi bentuk metadata, policy result, dan expiry saat reserve/save.

Hard freshness ceiling versi 1:

| Kelas | Expiry maksimum dari `verified_at` |
|---|---:|
| `stable` | 24 bulan |
| `periodic` | 12 bulan atau sebelum expected update berikutnya, mana yang lebih cepat |
| `volatile` | 30 hari default; maksimal 90 hari hanya dengan rationale eksplisit |
| Sensitive/safety | Minimum dari kelas di atas dan 180 hari |

`as_of_date` wajib untuk periodic, volatile, current statistic, ranking, record, price, law, office holder, atau superlative yang dapat berubah. Source dapat menetapkan expiry yang lebih pendek. Fact expired tetap tersimpan sebagai histori tetapi tidak dapat reserve/save/publish sampai diverifikasi ulang.

Junction snapshot bersifat immutable dan minimal berisi canonical wording/hash, identity/ontology version, source schema version, sumber yang dipakai, `verified_at`, `as_of_date`, `expires_at`, verification status, dan review evidence version. Perubahan source canonical tidak mengubah snapshot post lama.

### 9.7 Gold fixture dan target evaluasi v1

Dataset Curious Mind, DYK, dan Daily Facts dipakai untuk menemukan pasangan klaim dan pola risiko, **bukan** sebagai sumber kebenaran. Gold set v1 minimal mempunyai 150 labeled pair/case dengan cakupan setiap dataset minimal 30 kasus:

- Minimal 30 exact/surface variants.
- Minimal 40 paraphrase equivalents.
- Minimal 20 alias, singular/plural, number, atau unit equivalents.
- Minimal 50 anti-duplicates yang berbeda pada relation, negation, number, time, location, population, condition, atau comparison direction.
- Minimal 10 ambiguous/risky cases yang wajib menghasilkan review atau rejection.

Kasus boleh overlap kategori, tetapi total unique pair/case tetap minimal 150. Fixture memuat expected decision, alasan label, material fields, provenance dataset, dan reviewer. Klaim di dalam fixture dedup tidak otomatis dianggap benar secara faktual.

Set dibagi menjadi 70% development dan 30% frozen holdout. Threshold dikalibrasi pada development set; holdout hanya dipakai untuk gate. Target awal:

- Exact hash precision 100% dan recall 100% pada exact subset.
- Deterministic structured auto-match precision 100% pada subset yang eligible.
- Candidate recall@20 minimal 95% untuk known paraphrase pada frozen holdout.
- False auto-merge 0 pada seluruh anti-duplicate set.
- Seluruh ambiguous/risky case menghasilkan `review_required`, `needs_review`, atau rejection; tidak ada auto-verified/auto-merge.
- Dua run dengan input dan versi sama menghasilkan output identik.

Setiap perubahan normalizer, ontology, relation allowlist, structured serialization, FTS/trigram threshold, atau ranking menjalankan ulang seluruh fixture. Regression terhadap precision/false merge memblokir release. Perubahan label ambigu membutuhkan review manusia dan increment fixture version; tidak boleh diubah hanya untuk meluluskan implementasi.

### 9.8 Error contract tambahan

| Code | Makna | Tindakan caller |
|---|---|---|
| `FACT_HASH_COLLISION` | Hash sama tetapi canonical input berbeda | Hentikan dan audit identity implementation |
| `FACT_REVIEW_REQUIRED` | Deduplikasi atau bukti masih ambigu | Review/ganti kandidat; jangan reserve |
| `FACT_NOT_ELIGIBLE` | Status bukan current verified atau sumber tidak valid | Reverify, gunakan successor, atau ganti fact |
| `FACT_FRESHNESS_EXPIRED` | Verification melewati expiry | Research dan verifikasi ulang |
| `FACT_SOURCE_INSUFFICIENT` | Source policy tidak terpenuhi | Tambah sumber yang memenuhi tier/independence |
| `FACT_RESERVATION_CONFLICT` | Fact sedang dimiliki token lain | Pilih pengganti atau retry setelah expiry |
| `FACT_RESERVATION_EXPIRED` | Token tidak lagi aktif | Reserve ulang dengan logical operation baru |
| `FACT_RESERVATION_MISMATCH` | Token, Page, config, atau exact fact set tidak cocok | Jangan save; ambil context terbaru |
| `FACT_RESERVATION_CONTEXT_CHANGED` | Reuse scope/config berubah setelah reserve | Release dan reserve ulang |
| `FACT_REUSE_BLOCKED` | Allocation/published history melanggar scope target | Pilih fact pengganti |
| `FACT_CORRECTION_CONFLICT` | Lineage successor/status berubah paralel | Ambil current fact state lalu reconcile |

### 9.9 Verification intent

Database, domain, dan integration tests wajib membuktikan:

1. Normalisasi surface-equivalent menghasilkan exact hash yang sama.
2. Negasi, angka material, time/location qualifier, dan comparison direction tidak hilang saat normalisasi.
3. Hash collision dengan canonical input berbeda tidak pernah auto-merge.
4. Exact current duplicate memakai row lama dan tetap menjalankan reuse check.
5. Structured collision yang tidak deterministic-safe menjadi review, bukan merge atau insert diam-diam.
6. FTS/trigram/source/entity overlap hanya mengubah candidate ranking.
7. Dua registrasi paralel untuk identitas sama menghasilkan satu current canonical row.
8. Upgrade normalization/ontology gagal tertutup bila fixture atau collision adjudication belum lulus.
9. Same-meaning source refresh mempertahankan fact ID; meaning correction membuat successor baru.
10. Lineage menolak cross-workspace link, self-reference, cycle, dan dua current direct successors.
11. Invalidated/superseded/rejected fact tidak dapat reserve/save/publish.
12. Correction pada ready post mengembalikan draft dan membatalkan approval; published snapshot tidak berubah.
13. Sepuluh reserve paralel untuk fact sama menghasilkan satu active token dan tidak ada partial set.
14. Expired token tidak dapat save, release aman diulang, dan opportunistic reclaim bekerja.
15. Replay reserve yang sudah expired tidak memperpanjang TTL secara diam-diam.
16. Save menolak extra/missing fact, Page berbeda, config berbeda, atau token berbeda.
17. `workspace_unique` memblokir seluruh allocated/published workspace.
18. `page_unique` memblokir target Page tetapi mengizinkan Page lain setelah active reservation selesai.
19. Released/discarded junction tidak memblokir; posted/archived junction selalu memblokir sesuai scope.
20. Fact replacement bersifat atomic dan failure tidak melepaskan fact lama.
21. Source tier, independence, sensitive policy, `as_of`, dan expiry divalidasi.
22. Fact expired tidak dapat reserve/save/publish sampai reverified.
23. Junction snapshot tidak berubah ketika canonical source metadata diperbarui.
24. Gold development/holdout memenuhi seluruh target pada bagian 9.7.
25. Query exact, structured, candidate retrieval, reuse, dan reservation memakai index yang direncanakan dan memenuhi target p95 setelah data fixture dimuat.

### 9.10 Trade-off yang diterima

- Satu active reservation global per fact mengurangi throughput `page_unique`, tetapi menyederhanakan correctness untuk MVP satu owner.
- Tidak memakai embeddings menurunkan semantic recall potensial; risiko ditutup dengan layered candidate retrieval, ChatGPT review, dan gold holdout.
- Structured collision yang ambigu dapat menahan insert sampai ontology diperbaiki. Ini lebih aman daripada false merge yang merusak histori penggunaan.
- Hard freshness ceiling menambah pekerjaan verifikasi ulang, tetapi mencegah “verified forever” pada klaim yang berubah.
- Successor lineage dan immutable snapshots menambah metadata, tetapi memungkinkan koreksi tanpa menghapus bukti penggunaan lama.

Panduan Supabase/Postgres memengaruhi keputusan ini dengan menempatkan constraint sebagai pertahanan akhir, memakai index sesuai access pattern, menjaga transaksi reserve/save singkat, dan melakukan research/network call di luar transaction.

### 9.11 Verification gate langkah 0.4

Status: **lulus**.

- FACT-001 sampai FACT-007 berstatus `accepted`.
- Canonical identity, auto-match/candidate boundary, correction lineage, reservation, reuse, source freshness, dan evaluation target mempunyai invariant yang dapat diuji.
- Exact/structured matching tidak memperlakukan text similarity atau AI judgment sebagai unique constraint.
- Tidak ada fact non-current, expired, ambiguous, atau insufficient-source yang dapat masuk jalur publish.
- Dataset viral tetap dipakai sebagai fixture dedup dan inspirasi pola, bukan evidence kebenaran.
- Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.
- Langkah berikutnya ditetapkan sebagai 0.5 — finalisasi content quality dan approval gate.

---

## 10. Keputusan langkah 0.5 — Content quality dan approval gate

Semua keputusan pada bagian ini berstatus `accepted` pada 7 Oktober 2026. Threshold merupakan baseline MVP untuk trivia Reel sekitar 13 detik dan dapat dikalibrasi melalui fixture serta template Canva nyata, tetapi implementasi tidak boleh melonggarkan hard gate tanpa decision change yang terversi.

### 10.1 Prinsip quality gate

Quality gate memiliki tiga authority yang tidak boleh dicampur:

1. **System checks** dihitung server-side dari data canonical, konfigurasi, relasi, dan state database. Caller tidak dapat mengirim nilai `passed` untuk check ini.
2. **Editorial attestation** diberikan ChatGPT terhadap rubric berversi. Attestation adalah penilaian editorial yang dapat diaudit, bukan bukti database bahwa klaim benar.
3. **Owner approval** adalah persetujuan eksplisit dari `auth.uid()` owner terhadap content fingerprint tertentu. Approval tidak dapat menggantikan system check atau critical editorial check yang gagal.

`quality_status` adalah derived state yang hanya diubah domain RPC:

- `pending`: check/attestation/approval belum lengkap atau sudah stale.
- `failed`: minimal satu blocking system/editorial check gagal.
- `passed`: hanya setelah semua blocking check current dan owner approval berhasil dalam transaksi `draft → ready`.

Draft boleh menyimpan kegagalan content-quality agar dapat direvisi. Namun pelanggaran integritas seperti schema tidak valid, ownership salah, fact/junction tidak sah, reservation/reuse violation, atau payload berbahaya tetap menolak write dan tidak menghasilkan draft parsial.

### 10.2 Canonical rendering dan perhitungan karakter

Server menjadi authority untuk `canva_copy` dan seluruh text metrics. Caller mengirim komponen terstruktur; server merender ulang string final dan menolak bila `canva_copy` yang dikirim tidak identik dengan hasil renderer.

Sebelum dihitung:

- Unicode dinormalisasi ke NFC.
- Line ending diubah menjadi LF (`\n`).
- Outer whitespace dan trailing whitespace tiap baris dihapus.
- Tab, carriage return tersisa, NUL, dan control characters selain LF ditolak.
- Character count memakai PostgreSQL `char_length`, sehingga spasi, punctuation, prefix, dan LF dihitung. Emoji multi-code-point dapat dihitung konservatif lebih dari satu; default Page tetap melarang emoji.

Renderer versi 1:

```text
plain_lines:
  hook + "\n\n" + join(facts, "\n\n") + "\n\n" + cta

numbered:
  hook + "\n\n" + join(position + ". " + fact, "\n\n") + "\n\n" + cta
```

CTA wajib pada MVP. Hook, setiap fact, dan CTA tidak boleh mengandung LF internal; layout hanya dibuat renderer. Dengan maksimum sembilan facts, numbered prefix selalu `1. ` sampai `9. `.

Formula authoritative:

```text
facts_total_chars = char_length(rendered fact block)
canva_total_chars = char_length(final rendered Canva copy)
structural_overhead_chars = canva_total_chars
  - hook_chars
  - sum(raw fact_chars)
  - cta_chars
available_component_chars = canva_total_max_chars - structural_overhead_chars
```

`facts_total_chars` sudah memasukkan numbered prefix dan separator antarfakta. `canva_total_chars` menghitung string final persis yang disalin, sehingga line break dan separator tidak mendapat “ruang gratis”. Component budget dan final budget wajib lulus secara independen.

Default Page tetap:

| Budget | Default | Hard ceiling konfigurasi MVP |
|---|---:|---:|
| Hook | 45 chars | 90 chars |
| Satu fact | 90 chars | 120 chars |
| Rendered facts block | 500 chars | 650 chars |
| CTA | 50 chars | 100 chars |
| Final Canva copy | 600 chars | 750 chars |
| Caption, terpisah dari hashtag | 500 chars | 1.000 chars |

Config juga harus membuktikan bahwa hook, minimum fact set, CTA, dan structural overhead secara matematis dapat muat. Server selalu memeriksa output aktual; lulus budget konfigurasi tidak menjamin satu draft tertentu lulus.

Caption dan hashtag tidak dihitung ke Canva budget. Caption dihitung sebagai final normalized caption. Hashtag adalah array terpisah berisi 0–5 item unik secara case-insensitive; setiap item harus berupa satu hashtag valid tanpa whitespace, URL, atau punctuation tambahan.

### 10.3 Readability baseline untuk Reel sekitar 13 detik

Format referensi adalah static information card dengan background bergerak halus. Sistem **tidak** mengasumsikan seluruh kartu selalu selesai dibaca dalam satu playback 13 detik; pause dan replay merupakan bagian perilaku format. Namun density tetap dibatasi agar tidak menjadi dinding teks.

Word count server-side memakai token alphanumeric Unicode dengan apostrophe atau hyphen internal tetap satu kata. URL tidak boleh ada pada public copy. Metrics:

```text
estimated_read_seconds =
  round((canva_word_count / 200) * 60
        + 0.35 * (fact_count + 2), 1)

replay_ratio = estimated_read_seconds / target_video_seconds
estimated_loops = ceil(replay_ratio)
```

Baseline memakai 200 words per minute, tambahan 0,35 detik untuk perpindahan antara hook, setiap fact, dan CTA, serta `target_video_seconds = 13`. Nilai ini adalah estimator editorial, bukan janji perilaku viewer.

Visual line estimate memakai greedy word wrap deterministik berdasarkan `line_width_chars`; default 34 dengan rentang konfigurasi 24–42. Explicit blank separator line ikut dihitung karena memakai ruang vertikal. Renderer dan line-width version disimpan pada snapshot.

Hard readiness gate:

| Ukuran | Batas |
|---|---:|
| Facts | 5–9 sesuai config, atau 1–9 dengan explicit allowed waiver |
| Satu fact | Maksimal 18 kata dan component char budget |
| Hook | Maksimal 12 kata dan component char budget |
| CTA | Maksimal 14 kata dan component char budget |
| Total Canva words | Maksimal 100 kata |
| Estimated visual lines termasuk blank separators | Maksimal 28 |
| Satu fact setelah wrap | Maksimal 3 visual lines |
| Hook atau CTA setelah wrap | Maksimal 2 visual lines |
| `replay_ratio` | Maksimal 2,5 |
| `estimated_loops` | Maksimal 3 |

Preferred profile tetap 65–85 total words, fast trivia 7–8 facts dengan 8–11 kata per fact, dan practical utility 5–6 facts dengan 10–14 kata per fact. Keluar dari preferred band menghasilkan warning, bukan otomatis gagal, selama seluruh hard gate lulus.

Jumlah fact di bawah config minimum hanya dapat memakai waiver `FACT_COUNT_BELOW_CONFIG_MIN`, tetap minimal satu fact, dengan reason dan approval owner. Fixed count yang tidak terpenuhi tidak boleh di-waive diam-diam. Tidak ada waiver untuk overflow karakter, hard readability, invalid source/fact, safety, atau klaim tambahan yang belum diverifikasi. Sistem tidak pernah memotong string otomatis untuk meluluskan gate.

### 10.4 System checks dan severity

System check IDs bersifat allowlist dan versioned. Minimal mencakup:

| Kelompok | Check utama | Blocking |
|---|---|---:|
| Identity/security | Owner, workspace, Page, niche, OAuth client | Ya |
| Schema/config | Supported schema, config snapshot, renderer, format/topic/profile | Ya |
| Facts | Exact junction set/order, current verified status, freshness, source policy | Ya |
| Dedup/reuse | Dedup reviewed, reservation converted, reuse scope valid | Ya |
| Content | Renderer equality, component/final budget, prohibited artifacts | Ya |
| Readability | Hard word/line/replay thresholds | Ya |
| Output | Caption shape, hashtag shape/count, no unknown public claims | Ya |
| Lifecycle | Current revision, legal status, schedule, active output | Ya |
| Preference | Preferred word band, preferred fact count, variety signals | Tidak; warning |

System checks dihitung pada save, revise, approval, dan sebelum publish. Expensive research/AI tidak berjalan di transaksi; RPC hanya memakai evidence yang sudah tersimpan dan state database current.

Pada save/revise draft, hasil system checks disimpan walaupun content-quality check gagal. Pada `draft → ready`, seluruh blocking checks dihitung ulang setelah row locks diperoleh. Snapshot lama tidak boleh dipercaya hanya karena pernah `passed`.

### 10.5 Editorial attestation

Editorial rubric minimum:

- Setiap rendered fact mempertahankan arti canonical claim dan source support.
- Time-sensitive context/as-of terlihat bila dibutuhkan agar wording tidak menyesatkan.
- Tidak ada medical, legal, financial, food/pet safety, atau survival advice yang tidak layak.
- Natural neutral American English konsisten dan dapat dipahami US, UK, CA, AU.
- Hook jujur, relevan, dan tidak overpromise.
- CTA sesuai interaction goal serta tidak memakai deceptive engagement bait.
- Caption tidak menambahkan klaim yang belum mempunyai canonical/source evidence.
- Hashtag relevan dan tidak spammy.
- Grammar, punctuation, wording, line breaks, dan visual density layak.
- Teks tidak menyalin dataset referensi atau source secara substansial.

Setiap criterion bernilai `pass`, `fail`, atau `needs_review`. Critical criteria adalah meaning preservation, source support, time context, safety, unverified caption claim, dan substantial copying. Critical `fail` atau `needs_review` selalu memblokir ready. Style warning noncritical boleh diterima owner dengan warning ID dan alasan, tetapi tidak diubah menjadi `pass`.

Attestation harus mengikat current `content_hash`, rubric version, dan evidence paths. Free-form statement seperti `all good` tidak dapat menggantikan criteria terstruktur. Model name boleh disimpan sebagai optional diagnostic label, tetapi tidak menjadi authorization atau bukti kualitas.

### 10.6 Evidence schema dan content fingerprint

`content_hash` dihitung server-side sebagai SHA-256 atas canonical JSON berversi yang mencakup:

- Page, niche, format, topic, interaction goal.
- Hook, ordered fact public IDs dan rendered wording, CTA.
- Caption dan ordered normalized hashtags.
- Content/config/renderer schema versions serta quality-relevant generation snapshot.
- Junction verification/source snapshot identifiers yang dipakai output.

Schedule, operational timestamps, metrics, safe error text, dan database internal IDs tidak masuk content hash. Perubahan schedule tetap memakai revision/concurrency rules, tetapi bukan perubahan editorial fingerprint.

`system_checks` schema minimum:

```text
schema_version, gate_version, evaluated_at, evaluator="server",
post_revision, content_hash, config_version, renderer_version,
overall_status, checks[{id, severity, status, expected, actual, evidence}]
```

`editorial_checks` schema minimum:

```text
schema_version, rubric_version, evaluated_at, evaluator="chatgpt",
optional evaluator_label, post_revision, content_hash,
overall_status, criteria[{id, severity, status, note, evidence_paths}],
risk_flags[]
```

`approval_snapshot` disimpan terpisah:

```text
schema_version, approved_by_user_id, approved_at,
approved_revision, content_hash, operation_id,
accepted_warning_ids[], warning_acceptance_reason
```

Invariant:

- Timestamp berasal dari server; owner/model tidak mengirim authoritative time.
- System evidence hanya ditulis server. Editorial evidence diterima hanya melalui RPC schema validator.
- Approval actor selalu berasal dari verified `auth.uid()`, bukan field input.
- Semua snapshot wajib cocok pada content hash current.
- Setiap JSON evidence dibatasi 32 KiB; full source documents, chat transcript, token, dan secret tidak disalin.
- Evidence menggunakan public IDs atau stable check paths, bukan raw SQL/internal stack traces.

### 10.7 Explicit approval dan lifecycle

Domain operation approval menerima post public ID, `expected_revision`, `expected_content_hash`, `operation_key`, explicit approval intent, serta optional accepted nonblocking warning IDs/reason.

`draft → ready` dilakukan dalam satu transaksi:

1. Claim idempotency key dan lock post sesuai global order.
2. Verifikasi owner, OAuth client, status draft, expected revision/hash, dan config/schema version.
3. Lock/validate fact serta junction yang relevan.
4. Hitung ulang blocking system checks dan content hash.
5. Validasi editorial attestation current serta warning acceptance.
6. Simpan approval snapshot dari `auth.uid()`.
7. Set `quality_status = passed`, status `ready`, `ready_at`, dan revision + 1.
8. Complete ledger lalu commit.

Approval harus berasal dari perintah pengguna yang jelas untuk menyetujui/menjadikan ready. ChatGPT tidak boleh menyimpulkan approval hanya karena pengguna meminta melihat, merangkum, atau memperbaiki post.

Behavior lifecycle:

- Save awal selalu menghasilkan `draft`; batch tidak pernah auto-approve.
- Content revision pada `ready` mengubahnya ke `draft`, menghapus `ready_at`/approval current, dan membuat check/attestation stale.
- Owner dapat mencabut approval secara eksplisit; `ready → draft`, quality menjadi pending, reason tercatat, revision naik.
- Fact correction/invalidation mengikuti keputusan 0.4 dan dapat mengembalikan ready ke draft secara atomic.
- `ready → posted` memerlukan perintah publikasi manual terpisah dan memeriksa ulang content hash, approval, current/fresh facts, serta blocking system checks.
- `posted → archived` tidak menjalankan ulang editorial gate dan tidak mengubah historical approval/evidence.
- `draft/ready → discarded` tetap tindakan eksplisit dan tidak membutuhkan quality pass.
- Posted, archived, dan discarded tetap terminal terhadap content revision.

Idempotent replay dengan operation key yang sama tidak membuat approval kedua atau menaikkan revision. Current target/status dengan key baru tidak dianggap approval replay dan harus mengikuti legal-transition check.

### 10.8 Waiver policy

Waiver tidak mengubah hasil check; ia hanya merekam penerimaan warning yang memang allowlisted. MVP mengizinkan:

- `FACT_COUNT_BELOW_CONFIG_MIN`, selama total facts tetap 1–9 dan alasan editorial diberikan.
- Noncritical preferred-profile warning, seperti total words di luar preferred 65–85 tetapi masih di dalam hard gate.
- Noncritical style preference yang ditandai rubric sebagai warning, bukan safety/accuracy issue.

Waiver dilarang untuk ownership/auth, schema, reservation/reuse, canonical fact eligibility, source/freshness, dedup ambiguity, hard budget/readability, critical editorial criteria, unsafe advice, substantial copying, revision conflict, atau schedule conflict.

### 10.9 Metrics snapshot semantics

Seluruh numeric engagement field pada `post_metrics` adalah **cumulative totals observed at `captured_at`**, bukan delta sejak snapshot sebelumnya. `null` berarti tidak tersedia/tidak dicatat; `0` berarti platform atau pengguna secara eksplisit melaporkan nol. Sistem tidak mengubah null menjadi zero.

Definisi:

| Field | Arti |
|---|---|
| `views` | Total plays/views yang ditampilkan source pada waktu capture |
| `reach` | Total unique accounts/persons reached menurut source |
| `reactions` | Total seluruh Facebook reactions, termasuk Like bila source melaporkannya demikian |
| `likes` | Optional subset reaction bertipe Like; jika keduanya ada, `likes <= reactions` |
| `comments`, `shares`, `saves`, `follows` | Cumulative totals yang diatribusikan source ke post pada waktu capture |
| `watch_time_seconds` | Cumulative total watch time |
| `average_watch_time_seconds` | Point-in-time average yang dilaporkan source; bukan cumulative sum |

Schema target mempertahankan `likes` sebagai nullable field terpisah dan menamai total reaction secara eksplisit sebagai `reactions`. Manual input yang hanya berkata “likes” masuk `likes`, bukan diasumsikan sama dengan total reactions. Ambiguitas harus diklarifikasi atau field lain dibiarkan null.

Aturan snapshot:

- `captured_at` adalah waktu observasi; optional `source_reported_at`, `source_type`, timezone, dan metric-definition version disimpan dalam payload tervalidasi.
- Snapshot baru di-insert; observasi baru tidak meng-update histori lama.
- Insight latest memakai snapshot terbaru per post. Time-series mengurutkan snapshot; cumulative snapshots tidak pernah dijumlahkan.
- Delta dihitung saat query hanya antara dua snapshot dengan definition/source compatible. Negative delta tidak di-clamp; ia ditandai sebagai correction/anomaly karena platform dapat menghapus engagement atau merevisi angka.
- Monotonic increase tidak menjadi database constraint.
- Angka negatif, NaN/infinity, atau nilai di luar bigint/numeric range ditolak.
- Metrics tetap observational, tidak membuktikan sebab-akibat dan tidak mengubah quality/lifecycle post.

### 10.10 Error contract tambahan

| Code | Makna | Tindakan caller |
|---|---|---|
| `CONTENT_RENDER_MISMATCH` | Canva copy berbeda dari renderer canonical | Gunakan output server-rendered |
| `TEXT_BUDGET_EXCEEDED` | Component atau total character budget gagal | Tulis ulang; jangan truncate |
| `READABILITY_LIMIT_EXCEEDED` | Hard word/line/replay threshold gagal | Ringkas atau kurangi fact melalui jalur legal |
| `QUALITY_SYSTEM_CHECK_FAILED` | Blocking deterministic check gagal | Perbaiki check IDs yang dikembalikan |
| `QUALITY_EDITORIAL_INCOMPLETE` | Attestation hilang, stale, fail, atau needs-review | Jalankan review ulang |
| `QUALITY_EVIDENCE_STALE` | Revision/content hash tidak lagi cocok | Hitung dan attest ulang current content |
| `APPROVAL_REQUIRED` | Operasi membutuhkan explicit owner approval | Minta keputusan pengguna |
| `APPROVAL_STALE` | Approval tidak cocok dengan content current | Approve ulang setelah review |
| `WAIVER_NOT_ALLOWED` | Check critical mencoba di-waive | Perbaiki konten/data; jangan override |
| `METRIC_DEFINITION_AMBIGUOUS` | Likes/reactions/source tidak jelas | Klarifikasi atau simpan field yang diketahui saja |

### 10.11 Verification intent

Automated database/domain/integration tests wajib membuktikan:

1. Renderer menghasilkan output deterministik untuk plain dan numbered style.
2. CRLF, trailing whitespace, separator, numbered prefix, dan LF dihitung sesuai canonical rule.
3. Caller-supplied Canva copy yang berbeda satu karakter ditolak.
4. Component lulus tetapi final total overflow tetap gagal.
5. Caption/hashtag tidak masuk Canva budget dan masing-masing tetap divalidasi.
6. Metrics kata, visual line, read seconds, ratio, dan loops identik pada repeated run.
7. Default profile 65–85 words lulus bila seluruh hard gate terpenuhi.
8. Lebih dari 100 words, 28 visual lines, 2,5 replay ratio, atau per-component hard limit memblokir ready.
9. Draft dengan content-quality failure dapat disimpan, tetapi invalid ownership/schema/fact/reuse tidak meninggalkan draft.
10. Caller tidak dapat mengirim system check `passed` atau server timestamp sendiri.
11. Editorial attestation dengan old content hash/revision ditolak sebagai stale.
12. Critical editorial fail/needs-review tidak dapat di-waive.
13. Nonblocking warning hanya dapat diterima dengan allowlisted ID dan reason.
14. Ambiguous chat language tidak memicu approval; explicit approval memicu tepat satu transition.
15. Approval dengan old revision/hash gagal tanpa mengubah post.
16. Successful approval menyimpan actor dari auth, evidence, ready timestamp, revision, dan idempotency result secara atomic.
17. Content revision, approval revoke, atau fact correction mengembalikan ready ke draft dan menginvalidasi approval.
18. Publish memeriksa ulang current hash, fact freshness, source, dan blocking checks.
19. Discard tidak memerlukan pass tetapi tetap explicit; terminal states menolak revision.
20. Evidence JSON melewati schema/size limit dan tidak menyimpan token, source document penuh, atau chat transcript.
21. Metrics null berbeda dari zero dan cumulative snapshots tidak dijumlahkan.
22. Likes/reactions constraint berlaku ketika keduanya tersedia.
23. Negative observed metric ditolak, sedangkan negative derived delta diberi anomaly flag tanpa mengubah histori.
24. Idempotent metric retry tidak membuat snapshot duplikat.
25. Parallel approve/revise, approve/correct-fact, dan approve/discard menghasilkan satu legal state melalui locks serta expected revision.

### 10.12 Trade-off yang diterima

- 13 detik tidak diperlakukan sebagai kewajiban membaca seluruh kartu sekali jalan karena format referensi memang mendorong pause/replay; hard density tetap mencegah copy ekstrem.
- Estimasi words-per-minute dan visual wrap bukan pengukuran Canva yang sempurna. Versioned renderer, template fixture, dan hard character budget membuatnya reproducible serta dapat dikalibrasi.
- Draft dapat menyimpan quality failure agar workflow revisi tidak kehilangan pekerjaan, tetapi integritas facts/security tetap fail-closed.
- Editorial attestation tetap membutuhkan judgment ChatGPT; pemisahan authority mencegah database mengklaim telah membuktikan kualitas semantik.
- Metrics cumulative lebih mudah direkonsiliasi dengan screenshot/manual entry, tetapi insight harus memakai latest/delta query dan tidak boleh menjumlahkan seluruh snapshots.

Panduan Supabase/Postgres memengaruhi keputusan ini dengan menjaga approval transaction singkat, menghitung check deterministik dekat dengan data, dan mempertahankan RLS/ownership pada setiap RPC. Current Supabase breaking changes tidak mengubah kontrak domain quality ini; explicit grants dan RPC-only boundary dari langkah 0.3 tetap berlaku.

### 10.13 Verification gate langkah 0.5

Status: **lulus**.

- QUALITY-001 sampai QUALITY-006 berstatus `accepted`.
- Formula render, text budget, readability, evidence, authority, approval lifecycle, waiver, dan metrics semantics bersifat versioned serta dapat diuji.
- Tidak ada caller-supplied boolean yang dapat sendirian membuat post `ready`.
- Owner approval tidak dapat melewati blocking system atau critical editorial failure.
- Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.
- Langkah berikutnya ditetapkan sebagai 0.6 — membuat kontrak modul niche.

---

## 11. Keputusan langkah 0.6 — Module contract

`plans/module-contract.md` versi 1.0 diterima pada 7 Oktober 2026 sebagai kontrak normatif bagi semua modul niche.

Kontrak menetapkan:

- Batas tanggung jawab core, ChatGPT, dan modul niche.
- Descriptor modul, capability flags, versioning, dan compatibility matrix.
- Config schema, projection, content envelope, body niche, dan generation snapshot.
- Format, topic, profile, interaction goal, renderer, dan generation instructions.
- Pemisahan system checks, editorial attestation, dan explicit owner approval.
- Mode dedup, reusable library opsional, reservation, junction, release, correction, dan lineage.
- Source/freshness/attribution policy serta performance dimensions.
- Domain capability, error family, security isolation, dan evaluation fixtures.
- Checklist untuk menambahkan niche baru tanpa mengubah arti data trivia.

Keputusan penting:

1. Reusable library, dedup, reservation, source requirement, dan correction lineage adalah capabilities eksplisit; niche baru tidak dipaksa memakai model trivia.
2. Core menyimpan envelope serta lifecycle, sedangkan modul memvalidasi isi config/body dan menyediakan deterministic renderer serta checks.
3. Relasi item niche yang membutuhkan integritas selalu memakai tabel/junction khusus niche; JSON ID tidak menjadi sumber relasi.
4. Semua versi historis dibaca melalui compatibility matrix dan tidak ditafsirkan dengan schema aktif secara diam-diam.
5. Domain capability tidak otomatis menjadi MCP tool. Tool final dipilih berdasarkan user goal pada langkah 0.8.
6. Detail editorial trivia tetap menjadi scope `plans/trivia-content-dna.md` pada langkah 0.7.

### 11.1 Trade-off dan dampak

- Generic envelope dipertahankan untuk integrasi core, tetapi body, validator, renderer, checks, serta library tetap dimiliki setiap modul.
- Compatibility matrix menambah beban maintenance, tetapi melindungi arti histori saat schema berubah.
- Capability flags menambah descriptor, tetapi menghindari asumsi bahwa setiap niche memerlukan facts, dedup, reservation, atau sources dengan bentuk trivia.
- Domain capability dipisahkan dari MCP tool sehingga tool inventory 0.8 dapat berangkat dari user goal, bukan mengekspos semua fungsi internal.
- Dokumen yang terdampak adalah module contract secara langsung; PRD, database design, implementation plan, workflow, dan traceability akan menerima propagasi final pada 0.11.
- Bukti implementasi nantinya berasal dari compatibility tests, validator/renderer golden fixtures, quality fixtures, dan capability-specific integration/concurrency tests yang diwajibkan kontrak.

### 11.2 Verification gate langkah 0.6

Status: **lulus**.

- `MODULE-001` berstatus `accepted`.
- `plans/module-contract.md` tersedia dan berstatus accepted.
- Config, payload, format, instructions, quality, dedup, reservation, source, metrics, versioning, security, dan fixtures tercakup.
- Trivia mempunyai conformance mapping, tetapi kontrak tetap dapat dipakai niche tanpa reusable library.
- Tidak ada keputusan schema kritis baru yang dibiarkan terbuka.
- Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.
- Langkah berikutnya ditetapkan sebagai 0.7 — membuat trivia content DNA.

---

## 12. Keputusan langkah 0.7 — Trivia Content DNA

`plans/trivia-content-dna.md` versi 1.0 diterima pada 7 Oktober 2026 sebagai baseline editorial modul trivia MVP.

DNA diturunkan dari 176 reference records: 55 Curious Mind, 103 dyk, dan 18 Daily Facts. Setelah exact duplicate grouping, terdapat 171 exact-unique content bodies. Dataset dipakai untuk pattern discovery dan risk mining, bukan sebagai factual source atau performance guarantee.

Kontrak editorial menetapkan:

- Familiar anchor, meaningful surprise, atomic clarity, coherent collection, scanability, dan interaction value sebagai DNA inti.
- Neutral American English untuk audiens US, UK, CA, AU, dan global.
- Enam topic groups, sebelas topic keys, dan default weights.
- Architecture `single_subject`, `themed`, dan `mixed` yang selalu mempunyai editorial spine.
- Lima format: `single_subject_fast`, `themed_utility`, `emotional_animal_collection`, `comparison`, dan `myth_vs_fact`.
- Profile `fast_trivia` dan `practical_utility` dengan density yang terukur.
- Hook, fact-line, CTA, caption, hashtag, rendering, ordering, dan rejection rules.
- Source hierarchy, freshness, risk classes, dan sensitive-topic exclusions.
- Dedup ontology v1, relation families, critical/noncritical rubric, examples, anti-examples, dan fixture gates.
- Performance learning sebagai hypothesis-based adaptation yang tidak pernah melemahkan quality gate.

### 12.1 Trade-off dan dampak

- `Did you know?` menjadi default karena konsisten dan ringkas; variation tetap diperbolehkan agar kalender tidak monoton.
- Five format taxonomy lebih sempit daripada seluruh variasi dataset, tetapi menghasilkan config, evaluation, dan analytics yang dapat diulang.
- Fast density menerima kebutuhan pause/replay pada Reel 13 detik, sementara hard readability gate membatasi density ekstrem.
- Source dan safety policy yang konservatif dapat menolak claim viral; trade-off diterima untuk melindungi akurasi serta reputasi Page.
- General trivia tetap tersedia tetapi wajib memakai coherence device; candidate sisa tidak boleh dipaketkan secara acak.
- Engagement dataset tidak digunakan sebagai causal proof karena selection bias, duplicate records, dan context Page tidak lengkap.
- Dokumen terdampak langsung adalah trivia DNA dan decision register; propagasi ke PRD, database design, implementation plan, workflow, serta traceability dilakukan pada 0.11.

### 12.2 Verification gate langkah 0.7

Status: **lulus**.

- `DNA-001` berstatus `accepted`.
- `plans/trivia-content-dna.md` tersedia dan berstatus accepted.
- Seluruh deliverable editorial 0.7 tercakup dan mempunyai evaluation intent.
- Dataset referensi tidak menjadi source of truth atau template yang disalin.
- Content safety, source sufficiency, freshness, dedup, dan non-copying bersifat critical.
- DNA sesuai module contract tanpa mengubah core schema.
- Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.
- Langkah berikutnya ditetapkan sebagai 0.8 — finalisasi MCP tool inventory.

---

## 13. Keputusan langkah 0.8 — MCP tool inventory

`plans/tool-inventory.md` versi 1.0 diterima pada 7 Oktober 2026 sebagai kontrak normatif MCP tools untuk MVP.

Inventory final mempunyai 33 focused tools dalam kelompok identity/context, Page, content plan, trivia fact, post lifecycle, dan performance. Setiap tool mempunyai satu tujuan, title/description, input/output schema, OAuth scheme, annotations, rate group, stable error family, dan posisi orchestration.

Keputusan utama:

- Seluruh MCP tools bersifat privat dan mendeklarasikan OAuth `openid email` per tool; authorization tetap memakai validated identity, OAuth client, ownership, RPC policy, dan RLS.
- Semua tool memakai `openWorldHint: false` karena hanya beroperasi pada bounded private workspace. Web research dilakukan ChatGPT di luar MCP server.
- `health_check` dipindahkan menjadi HTTP `/health`, bukan model-callable tool.
- `list_niches` diserap oleh module catalog pada `get_workspace_context`.
- `get_posts` dipecah menjadi `list_posts` dan `get_post`.
- Generic `update_post_status` dihapus dan diganti tool lifecycle eksplisit: `approve_post`, `revoke_post_approval`, `discard_post`, `mark_post_posted`, dan `archive_post`.
- Plan mendapat tool claim, renew, failure report, retry, explicit replacement, dan cancel sehingga lease/recovery contract 0.3 dapat dijalankan.
- Trivia mendapat jalur reverify serta correction/invalidation sehingga freshness dan lineage contract 0.4 dapat dijalankan.
- Semua write memakai operation key; post mutation memakai revision dan, bila relevan, content hash; Page/config dan fact mutation memakai current `updated_at` sebagai compare-and-swap token.
- Error result memakai stable safe code dan recovery; raw SQL, stack trace, internal ID, credential, serta unrelated telemetry dilarang.
- Tidak ada generic executor, arbitrary SQL/RPC, hidden operation, Facebook publishing, analytics fetch, background generation, atau MCP-side web research.

### 13.1 Trade-off dan dampak

- Jumlah tool meningkat dari baseline 19 menjadi 33 karena generic mutation dipecah dan recovery paths ditambahkan. Biaya metadata/test lebih besar, tetapi annotation, confirmation, auth, dan side effect menjadi akurat.
- Annotation destructive digunakan secara konservatif untuk overwrite, cancellation, fact correction, discard, mark-posted, dan archive.
- Batas satu plan 100 items, claim maksimal tiga items, dan response 256 KiB menjaga Edge Function tetap bounded; batch lebih besar dibagi menjadi beberapa plan.
- Exact schema dan tool names menjadi public compatibility surface. Breaking change memerlukan versioning/migration, bukan edit diam-diam.
- PRD, database design, implementation plan, workflow, dan mapping RPC masih memuat daftar lama di beberapa tempat; propagasi final tetap dilakukan secara terkendali pada langkah 0.11.

### 13.2 Verification gate langkah 0.8

Status: **lulus**.

- `TOOL-001` dan `TOOL-002` berstatus `accepted`.
- `plans/tool-inventory.md` tersedia dan berstatus accepted.
- Seluruh 33 tools mempunyai contract serta annotation eksplisit.
- Overlap tool lama dan missing recovery operations mempunyai keputusan final.
- OAuth, authorization, result minimization, idempotency, concurrency, rate limit, serta error recovery tercakup.
- Orchestration single post, batch, revision, approval, publication record, dan metrics ditetapkan.
- Contract-test intent tersedia untuk metadata, auth, read, write, sequence, Inspector, dan ChatGPT evaluation.
- Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.
- Langkah berikutnya ditetapkan sebagai 0.9 — membuat use-case inventory.

---

## 14. Keputusan langkah 0.9 — Use-case inventory

`plans/use-case-inventory.md` versi 1.0 diterima pada 7 Oktober 2026 sebagai inventory user goal dan evaluation plan MVP.

Inventory menetapkan 31 supported/clarification user goals serta 101 frozen prompt cases dalam kategori direct, indirect, follow-up, ambiguity/clarification, edge/interruption/concurrency/recovery, dan out-of-scope/negative.

Keputusan utama:

- Evaluation dipisahkan menjadi schema/handler, RPC/domain, MCP protocol, tool selection, full workflow, dan editorial layers.
- Seluruh 33 MCP tools mempunyai minimal satu positive path dan satu boundary, confirmation, conflict, invalid, atau recovery path.
- Direct requests wajib 100% pass; indirect requests minimal 90%; overall prompt suite minimal 95% tanpa hard fail.
- Auth, non-owner, browser token tanpa OAuth client, idempotent replay, lost response, rate limit, revision conflict, schedule conflict, reservation expiry, lease expiry, quality block, fact correction race, metrics ambiguity, interruption, dan cross-chat resume mempunyai fixture.
- Consequential action tidak boleh dipanggil ketika referent atau intent ambigu. Approval, discard, cancellation, replacement, fact correction, posted, dan archive memerlukan explicit intent sesuai kontraknya.
- Request Facebook upload/scheduling, analytics fetch, video/Canva, non-trivia niche, hard delete, arbitrary SQL, background AI, server-side OpenAI API, cross-owner data, bypass quality, verbatim competitor copying, dan virality guarantee diperlakukan sebagai intentional exclusions.
- Evaluation record menyimpan version/digest, expected versus actual tools, redacted arguments/results, state assertions, confirmation, score, dan hard-fail codes tanpa token atau secret.
- Prompt cases dijalankan ulang setelah tool name, description, schema, annotation, auth, skill, plugin, host, atau model behavior berubah.

### 14.1 Trade-off dan dampak

- Frozen suite membutuhkan maintenance tetapi membuat regression lintas release dapat dibandingkan.
- Model behavior probabilistik tidak dijadikan database integrity mechanism; deterministic invariant tetap wajib 100% pada RPC/integration tests.
- Indonesia dan English sama-sama diuji karena bahasa perintah owner berbeda dari bahasa output konten.
- Generated paraphrases ditambahkan saat Phase 8 untuk robustness tanpa mengubah frozen 101 prompts.
- Dokumen terdampak langsung adalah use-case inventory dan decision register; propagasi final ke implementation/testing plan dilakukan pada 0.11.

### 14.2 Verification gate langkah 0.9

Status: **lulus**.

- `USECASE-001` berstatus `accepted`.
- `plans/use-case-inventory.md` tersedia dan berstatus accepted.
- Happy path, ambiguity, interruption, concurrency, recovery, security, confirmation, dan negative boundaries tercakup.
- Tool coverage adalah 33/33 untuk positive dan boundary/recovery paths.
- Scoring, hard fail, repetition, fixture reset, environment gates, dan evidence record tersedia.
- Tool selection pass tidak dianggap sebagai content-quality atau database/security pass.
- Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.
- Langkah berikutnya ditetapkan sebagai 0.10 — membuat acceptance traceability matrix.

---

## 15. Keputusan langkah 0.10 — Acceptance traceability

`plans/acceptance-traceability.md` versi 1.0 diterima pada 7 Oktober 2026 sebagai matriks traceability normatif MVP.

Matriks menghubungkan 42 functional requirements, 20 quality checks, 36 atomic non-functional requirements, 20 security/untrusted-data requirements, 17 recovery categories, dan 14 acceptance criteria ke target schema, domain operation/MCP tool, implementation phase, automated evidence, serta content/prompt/manual evidence yang relevan.

Keputusan utama:

- Status Phase 0 hanya `specified` atau `sync_pending`; tidak ada artefak yang dinyatakan `implemented` atau `verified` sebelum source dan hasil test tersedia.
- Deterministic database/security/MCP tests, prompt/workflow evaluation, content evaluation, dan manual owner pilot adalah empat bukti berbeda dan tidak dapat saling menggantikan.
- Butir quality gate, NFR, security, dan recovery yang belum memiliki ID pada PRD diberi alias stabil agar dapat ditelusuri dan dipropagasikan pada langkah 0.11.
- Requirement yang tidak membutuhkan penilaian editorial memakai `N/A-deterministic`, bukan dibiarkan tanpa evidence.
- Seluruh 33 tools dan 101 frozen prompt cases terhubung ke verification strategy Phase 8.
- Sebelas gap sinkronisasi didaftarkan; semuanya mempunyai keputusan target dan tidak membutuhkan perubahan scope atau pilihan baru dari pengguna.
- `AC-001` harus mengganti tool `health_check` lama dengan HTTP `GET /health` plus MCP initialize/list-tools.
- `AC-012` harus memperjelas bahwa minimal authentication frontend diizinkan, sedangkan product dashboard tetap dilarang.

### 15.1 Trade-off dan dampak

- Matriks memakai planned evidence IDs sebelum test files dibuat agar setiap implementasi mempunyai exit condition sejak awal. ID tersebut menjadi nama logical test; lokasi file final ditetapkan saat struktur repository dibuat.
- Mapping memakai target keputusan Phase 0, bukan mempertahankan RPC/schema lama yang sudah superseded. Karena itu beberapa row berstatus `sync_pending` sampai propagasi 0.11 selesai.
- Trace bersifat many-to-many: satu requirement dapat membutuhkan beberapa layer test, dan satu test dapat membuktikan beberapa requirements. Phase 8 tetap wajib menghasilkan evidence per requirement, bukan hanya total test pass.

### 15.2 Verification gate langkah 0.10

Status: **lulus**.

- `TRACE-001` berstatus `accepted`.
- `plans/acceptance-traceability.md` tersedia dan berstatus accepted.
- 42/42 functional requirements, 20/20 quality checks, 36/36 NFR aliases, 20/20 security aliases, 17/17 recovery categories, dan 14/14 acceptance criteria mempunyai trace.
- Setiap acceptance criterion mempunyai implementation owner, phase, automated evidence, serta prompt/content/manual evidence atau deterministic N/A yang eksplisit.
- Gap antardokumen telah dipisahkan dari gap keputusan: seluruh gap yang ditemukan mempunyai target accepted untuk 0.11.
- Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.
- Langkah berikutnya ditetapkan sebagai 0.11 — sinkronisasi seluruh dokumen.

---

## 16. Keputusan langkah 0.11 — Sinkronisasi seluruh dokumen

Sinkronisasi lintas dokumen diselesaikan pada 7 Oktober 2026. Baseline tersinkronisasi terdiri dari:

| Dokumen | Versi/status setelah sinkronisasi |
|---|---|
| `plans/PRD.md` | 1.2 — baseline tersinkronisasi Phase 0 |
| `plans/database-design.md` | 2.1 — baseline tersinkronisasi Phase 0 |
| `plans/implementation-plan.md` | 1.1 — baseline tersinkronisasi Phase 0 |
| `plans/workflow-users.md` | 1.1 — baseline tersinkronisasi Phase 0 |
| `plans/acceptance-traceability.md` | 1.1 — seluruh 11 trace gaps closed |

Keputusan yang dipropagasikan:

- PRD tidak lagi menyatakan implementation plan/module/DNA belum tersedia; hierarki kini mencakup tool inventory, use-case inventory, dan traceability.
- Tool surface lama diganti dengan 33 focused tools. `/health` menjadi endpoint operasional, module catalog berada pada workspace context, read post dipisah list/get, dan lifecycle memakai explicit tools.
- Global operation ledger dan database-backed rate-limit buckets menggantikan operation key unik yang tersebar pada tabel bisnis.
- Plan item mempunyai claim lease, one-time renewal, stale recovery, safe failure, retry, explicit replacement, dan cancellation semantics.
- Fact lifecycle mencakup re-verification, correction, invalidation, successor lineage, current-row uniqueness, dan immutable published snapshots.
- Quality gate memakai server renderer/content hash, server checks, editorial attestation, dan owner approval snapshot sebagai authority terpisah.
- Data API hanya mengekspos schema `api`; `authenticated` tidak mendapat direct table read/write. Public/internal schemas dan helper storage tidak diekspos.
- Edge Function memakai `verify_jwt = false` hanya agar discovery/challenge mencapai middleware; middleware tetap memvalidasi token, OAuth client, scope/resource, dan owner sebelum tool berjalan.
- Minimal auth frontend diizinkan untuk login/consent/deny/logout/error state, sedangkan product dashboard tetap di luar scope. Vendor static hosting tidak dikunci dan Vercel tidak diwajibkan.
- OAuth token client menerima seluruh success `2xx`, bukan hanya `201`.
- Implementation order membuktikan remote custom MCP terlebih dahulu, kemudian memfinalkan registered mapping dan plugin package.
- Dependency baseline diverifikasi ulang saat implementasi; proyek memakai Node.js 24.15.0 untuk local dan CI, Supabase CLI 2.117.0+ untuk local Supabase, dan Docker Edge Runtime untuk Edge Functions. Standalone Deno hanya tooling langsung opsional.
- Acceptance suite sekarang mewajibkan 33-tool coverage dan 101 frozen prompt cases dengan threshold use-case inventory.

### 16.1 Trade-off dan dampak

- Dua tabel internal operasional menambah schema surface, tetapi menghilangkan idempotency yang tidak konsisten lintas write dan memberi rate limit yang sama pada seluruh Edge instances.
- RPC-only reads memperbesar jumlah projection functions, tetapi mengurangi Data API surface dan membuat ownership/result minimization dapat diuji per operation.
- Final package bergeser ke Phase 10 setelah production MCP connection terbukti. Phase 7 tetap menyiapkan skill/package source agar pekerjaan editorial tidak menunggu deployment.
- Stable aliases ditambahkan pada quality, NFR, security, dan recovery requirements di PRD; alias ini tidak mengubah intent produk.

### 16.2 Verification gate langkah 0.11

Status: **lulus**.

- `DOC-001` sampai `DOC-006` berstatus `accepted`.
- Sebelas `TR-GAP-*` berstatus `closed_0.11`.
- PRD, database design, implementation plan, workflow, dan acceptance traceability memakai tool surface, lifecycle, quality, auth, Data API, dan packaging order yang sama.
- Tidak ada baseline yang masih mengharuskan tool `health_check`, `list_niches`, `get_posts`, atau `update_post_status`.
- Tidak ada business-table direct read/write grant kepada `authenticated` pada target design.
- Tidak ada klaim bahwa Vercel wajib atau seluruh frontend dilarang; boundary minimal auth frontend konsisten.
- Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.
- Langkah berikutnya ditetapkan sebagai 0.12 — final audit dan specification freeze.

---

## 17. Keputusan langkah 0.12 — Final audit dan specification freeze

Final audit diselesaikan pada 7 Oktober 2026. Audit dilakukan terhadap seluruh artefak normatif, referensi dokumen, requirement trace, tool surface, frozen prompt inventory, status keputusan, dan reference DDL.

Perbaikan defensif yang ditemukan dan ditutup sebelum freeze:

1. Audit link `created_by_operation_id` pada plan, plan item, post, dan metrics diubah menjadi composite foreign key `(workspace_id, created_by_operation_id)` agar tidak dapat menunjuk operation ledger milik workspace lain.
2. Reference DDL posts sekarang memaksa `approval_snapshot` ada pada status `ready`, `posted`, dan `archived`; validasi kecocokan hash/revision tetap dilakukan transactional RPC.
3. `trivia_facts.structured_match_eligible` ditambahkan sebagai authority server-side. Partial unique structured hash hanya berlaku pada current row yang lengkap dan deterministic-safe; collision lain tetap masuk review.
4. Correction lineage memperoleh CHECK anti-self-reference; cycle dan successor semantics tetap divalidasi secara transactional.
5. Metadata seluruh artefak normatif dan phase tracker diperbarui untuk menyatakan baseline Phase 0 telah dibekukan.

### 17.1 Baseline beku

| Artefak | Versi/status freeze |
|---|---|
| `plans/PRD.md` | 1.2 — frozen |
| `plans/database-design.md` | 2.2 — frozen |
| `plans/implementation-plan.md` | 1.1 — approved execution baseline |
| `plans/workflow-users.md` | 1.1 — frozen |
| `plans/module-contract.md` | 1.0 — frozen |
| `plans/trivia-content-dna.md` | 1.0 — frozen |
| `plans/tool-inventory.md` | 1.0 — frozen, tepat 33 tools |
| `plans/use-case-inventory.md` | 1.0 — frozen, 31 goals dan 101 prompts |
| `plans/acceptance-traceability.md` | 1.2 — frozen |

Freeze berarti Phase 1 wajib mengimplementasikan baseline ini. Perubahan sesudah freeze diperbolehkan hanya melalui change record yang menjelaskan alasan, artefak terdampak, compatibility/migration effect, dan test yang harus diperbarui. Freeze bukan klaim bahwa source, migration, deployment, atau test implementation sudah tersedia.

### 17.2 Verification gate langkah 0.12

Status: **lulus**.

- Tidak ada decision item kritis berstatus `open`, `in_progress`, atau `blocked`.
- Seluruh 42 FR, 20 quality requirements, 36 NFR, 20 security requirements, 17 recovery categories, dan 14 AC tetap mempunyai trace.
- Tool inventory, PRD, dan implementation plan memakai exact set 33 tools; `/health` tetap endpoint operasional, bukan tool.
- Use-case baseline tetap berisi 31 goals dan 101 frozen prompts.
- Semua referensi lokal `plans/*.md` tersedia dan seluruh Markdown fence seimbang.
- Reference DDL konsisten dengan tenant isolation, quality approval, deterministic-safe dedup, dan correction lineage decisions.
- Tidak ada direct business-table grant kepada `authenticated` dan tidak ada source code, migration, deployment, atau resource cloud yang dibuat pada Phase 0.
- Phase 0 dinyatakan complete; langkah berikutnya adalah Phase 1 — Repository foundation.

---

## 18. Constraint platform terverifikasi pada baseline

Constraint berikut dicatat sebagai fakta platform dan harus dipropagasikan saat keputusan terkait diselesaikan:

1. Private data dan write actions pada MCP memerlukan autentikasi; server tetap wajib memverifikasi issuer, audience/resource, expiration, dan scopes pada setiap request.
2. ChatGPT mendukung OAuth 2.1 authorization-code flow dengan PKCE dan mendukung CIMD, DCR, atau predefined client sesuai kemampuan authorization server.
3. Supabase Auth sebagai OAuth authorization server untuk MCP memerlukan web frontend untuk sign-in dan consent; consent screen tidak disediakan otomatis oleh Supabase.
4. Endpoint Edge Function authenticated MCP tetap memerlukan `verify_jwt = false` agar unauthenticated discovery request mencapai OAuth middleware; token kemudian diverifikasi oleh middleware di dalam function.
5. Implementasi tidak boleh mengharuskan respons token OAuth tepat `201`; seluruh respons sukses `2xx` harus diterima. Supabase mengubah respons sukses endpoint token menjadi `200` pada 1 Juni 2026.
6. Exposure tabel baru ke Data API tidak boleh diasumsikan otomatis. Project configuration, grants, exposed schemas, dan RLS harus diverifikasi secara eksplisit.
7. Plugin dengan existing remote MCP sebaiknya membuktikan koneksi MCP terlebih dahulu sebelum finalisasi registered connection mapping dan package plugin.

Referensi platform:

- [OpenAI — Authentication for plugins](https://developers.openai.com/plugins/build/auth)
- [OpenAI — Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
- [OpenAI — Package your plugin](https://developers.openai.com/plugins/build/plugins)
- [Supabase — Deploy MCP servers](https://supabase.com/docs/guides/ai-tools/byo-mcp)
- [Supabase changelog — OAuth token endpoint HTTP 200](https://supabase.com/changelog/45468-breaking-change-oauth-token-endpoint-will-return-http-200-instead-of-201)
- [Supabase changelog — breaking changes](https://supabase.com/changelog?types=breaking-change)

---

## 19. Urutan penutupan register

| Langkah | Fokus | Exit condition |
|---|---|---|
| 0.1 | Baseline dan decision register | Seluruh konflik serta keputusan terbuka tercatat dan mempunyai langkah penyelesaian |
| 0.2 | Runtime dan OAuth | AUTH-* serta PLATFORM-* mempunyai keputusan final |
| 0.3 | Core transaction | CORE-* mempunyai invariant dan test intent final |
| 0.4 | Fact lifecycle dan dedup | FACT-* mempunyai keputusan final dan evaluasi yang terukur |
| 0.5 | Content quality | QUALITY-* mempunyai schema, authority, dan threshold final |
| 0.6 | Module contract | `plans/module-contract.md` lengkap dan konsisten dengan core |
| 0.7 | Trivia DNA | `plans/trivia-content-dna.md` lengkap dan dapat dievaluasi |
| 0.8 | Tool inventory | Setiap tool mempunyai satu tujuan, schema, auth, annotation, dan error contract |
| 0.9 | Use-case inventory | Happy path, edge case, recovery, dan out-of-scope tercakup |
| 0.10 | Traceability | Setiap requirement dan acceptance criterion dapat ditelusuri ke implementasi serta test |
| 0.11 | Sinkronisasi | Tidak ada konflik antardokumen; semua keputusan accepted telah dipropagasikan |
| 0.12 | Final audit/freeze | Semua gate lulus dan tidak ada item kritis berstatus open/in_progress/blocked |

---

## 20. Aturan perubahan selama Phase 0

1. Satu langkah Phase 0 diselesaikan sebelum langkah berikutnya dimulai.
2. Keputusan teknis yang tidak mengubah intent pengguna dapat memakai rekomendasi paling aman dan sederhana, tetapi tetap dicatat beserta alasannya.
3. Keputusan yang mengubah scope, biaya, workflow utama, atau preferensi editorial pengguna memerlukan persetujuan pengguna.
4. Setiap perubahan kebutuhan diperbarui terlebih dahulu pada PRD.
5. Setiap perubahan invariant database diperbarui pada database design sebelum migration dibuat.
6. Tidak ada source code, migration, deployment, atau resource production yang dibuat selama Phase 0.
7. Tidak ada keputusan yang dianggap selesai hanya karena sudah disebut dalam chat; keputusan harus dicatat dalam repository.
8. Setiap langkah berakhir dengan ringkasan file berubah, item register ditutup, risiko tersisa, dan langkah berikutnya.

---

## 21. Verification gate langkah 0.1

Langkah 0.1 dinyatakan selesai apabila:

- Semua dokumen baseline telah terinventarisasi.
- Seluruh deliverable Phase 0 yang belum tersedia telah tercatat.
- Batas produk yang sudah stabil dibedakan dari keputusan yang masih terbuka.
- Setiap keputusan terbuka mempunyai ID unik dan langkah penyelesaian.
- Constraint platform yang dapat mengubah desain sudah dicatat.
- Tidak ada source code, migration, atau deployment yang dibuat.
- Langkah berikutnya ditetapkan sebagai 0.2 — finalisasi arsitektur runtime dan OAuth.

---

## 22. Riwayat keputusan

| Tanggal | Langkah | Perubahan | Status |
|---|---|---|---|
| 7 Oktober 2026 | 0.1 | Membuat baseline, mengunci scope yang stabil, dan mendaftarkan seluruh keputusan terbuka | Selesai |
| 7 Oktober 2026 | 0.2 | Menetapkan runtime boundary, auth frontend, DCR, discovery, token/resource validation, owner authorization, session policy, connection order, dan runtime baseline | Selesai |
| 7 Oktober 2026 | 0.3 | Menetapkan idempotency ledger, claim lease, schedule locking, terminal item semantics, atomic boundary, revision contract, RPC-only Data API, dan rate limits | Selesai |
| 7 Oktober 2026 | 0.4 | Menetapkan canonical fact identity, dedup decision boundary, correction lineage, reservation/reuse, source freshness, serta gold evaluation target | Selesai |
| 7 Oktober 2026 | 0.5 | Menetapkan canonical renderer, text/readability gate, quality authority/evidence, explicit approval lifecycle, waiver policy, dan metrics snapshot semantics | Selesai |
| 7 Oktober 2026 | 0.6 | Membuat kontrak generik modul niche untuk config, payload, renderer, quality, dedup/reservation, source, performance, compatibility, security, dan fixtures | Selesai |
| 7 Oktober 2026 | 0.7 | Membuat baseline editorial trivia dari tiga dataset: topic, format, profiles, language, source/safety, ontology, rubric, examples, dan fixtures | Selesai |
| 7 Oktober 2026 | 0.8 | Menetapkan 33 focused MCP tools beserta schema, OAuth, annotations, errors, orchestration, recovery paths, dan contract tests | Selesai |
| 7 Oktober 2026 | 0.9 | Menetapkan 31 user goals, 101 frozen prompts, 33-tool coverage, recovery/negative cases, scoring, hard fails, dan execution protocol | Selesai |
| 7 Oktober 2026 | 0.10 | Membuat trace 42 FR, 20 quality checks, 36 NFR aliases, 20 security aliases, 17 recovery categories, 14 AC, serta sebelas gap sinkronisasi | Selesai |
| 7 Oktober 2026 | 0.11 | Menyinkronkan PRD, database design, implementation plan, workflow, dan traceability; menutup DOC-001..006 serta TR-GAP-001..011 | Selesai |
| 7 Oktober 2026 | 0.12 | Melakukan final audit, menutup empat invariant defensif, membekukan sembilan artefak normatif, dan menyatakan Phase 0 complete | Selesai |
