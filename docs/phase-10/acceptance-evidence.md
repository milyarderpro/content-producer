# Phase 10 — MVP acceptance evidence register (AC-001..AC-014)

**Tanggal penyusunan:** 21 Oktober 2026. **Repository/PR:** `milyarderpro/content-producer`, branch `codex/phase-10-plugin`, [draft PR #23](https://github.com/milyarderpro/content-producer/pull/23). **Status:** evidence mapping untuk review auditor independen Phase 10.7; **bukan** sertifikasi audit, `Pilot-ready`, `MVP Complete`, atau perubahan status Phase 10.

## 1. Kriteria, status, dan jenis bukti

Matriks berikut memakai persyaratan aktual [PRD §31](../../plans/PRD.md), [acceptance traceability §10](../../plans/acceptance-traceability.md), dan [runbook Phase 10 §12](../../plans/works/phase-10-implementation-plan.md), dengan [CR-020](../decisions/2026-10-15-phase-9-10-risk-based-mvp-acceptance.md), [CR-027](../decisions/2026-10-18-phase-10-mvp-evidence-boundary.md), serta [CR-048](../decisions/2026-10-20-phase-10-4-owner-oauth-evidence-acceptance.md).

- **PASS** hanya bila keseluruhan butir AC terkait sudah mempunyai bukti memadai dan dapat ditelusuri, bukan sekadar desain, cakupan tes, atau satu demonstrasi parsial.
- **PENDING** berarti setidaknya satu butir, cakupan minimum, atau penilaian penerimaan independen belum selesai; bukti parsial yang telah PASS pada tingkat tes/kartu tetap ditunjukkan secara eksplisit.
- **Production/host:** tindakan nyata owner OAuth, deployment, Page, post, plan dan pembacaan langsung; bukan fixture sintetis.
- **Local/CI:** tes deterministik pada database terisolasi/fixture, inspeksi kontrak MCP, pemeriksaan keamanan, dan package CI. Keberhasilan suatu test suite tidak otomatis membuktikan semua AC atau aksi production.
- **Phase 11:** penutupan operasional, bukti acceptance per butir, risiko, backup/restore, dokumentasi dan handoff sebelum `MVP Complete`. Temuan Phase 10.7 harus diaudit dan diputuskan oleh auditor independen, bukan implementer.

**Keputusan status per 21 Oktober 2026: AC-001..AC-014 seluruhnya PENDING untuk final MVP acceptance**, konsisten dengan tracker [§16](../../plans/implementation-plan.md). Di bawah ini, setiap row menyatakan apa yang telah teramati dan celah spesifik. Tidak ada AC otomatis menjadi PASS hanya karena checkpoint 10.0–10.6 dan MAN-01..09 telah PASS. Bukti yang belum ditinjau secara independen tidak dinaikkan menjadi PASS.

## 2. Baseline bukti yang boleh digunakan kembali

- **Production Phase 9:** [Issue #8](https://github.com/milyarderpro/content-producer/issues/8), [audit independen Phase 9.5 PASS di Issue #20](https://github.com/milyarderpro/content-producer/issues/20#issuecomment-6244579966), dan [gate final Phase 9 #39085571345](https://github.com/milyarderpro/content-producer/actions/runs/39085571345), source SHA `be3bf04b703a4aff16510c496600c9796c13b57a`. Bukti tersebut merekam owner OAuth, 33 tool, denial, RLS/privileges serta pilot awal; deployment dan state saat itu bersifat historis.
- **Backend production Phase 10 yang berlaku:** SHA sumber `73087c33e8b20b663e6944f6ca89d0b591eebf44`, [full CR-020 gate #39411054462 — SUCCESS](https://github.com/milyarderpro/content-producer/actions/runs/39411054462); Supabase Edge `mcp` v31 ACTIVE, OAuth owner. Reuse gate ini mensyaratkan backend, migration, konfigurasi keamanan, dan dependensi runtime yang relevan tidak berubah (CR-044). Jangan menyamakan SHA sumber backend dengan HEAD dokumentasi PR.
- **Private plugin/host:** Content Producer v0.2.2 PRIVATE dengan registered `mcpku2` OAuth, 33 MCP tools (11 Read/22 Write), owner reads dan host `ask_before_writes`; [Issue #22](https://github.com/milyarderpro/content-producer/issues/22), [manual evidence ledger](manual-results.md). Bukti versi/binding yang dilaporkan tidak selalu menyertakan hash archive yang dibaca ulang pada setiap kartu.
- **Kartu production MAN-01..09:** PASS dalam batas masing-masing, termasuk [CR-048](../decisions/2026-10-20-phase-10-4-owner-oauth-evidence-acceptance.md) untuk MAN-03/04; MAN-05 satu plan tiga item; MAN-06 retrieval fresh chat; [MAN-07 owner sign-off](https://github.com/milyarderpro/content-producer/issues/22#issuecomment-6293251813); [MAN-08 safety clarification](https://github.com/milyarderpro/content-producer/issues/22#issuecomment-6293441443); [MAN-09 prompt-injection refusal](https://github.com/milyarderpro/content-producer/issues/22#issuecomment-6293741305). Detail prompt, tool trace, ID, revision/hash dan keterbatasan ada di [manual-results.md](manual-results.md).
- **Package/PR check:** [light CI #39551438376 — SUCCESS](https://github.com/milyarderpro/content-producer/actions/runs/39551438376), documentation/package HEAD `cb8a664d9f985ba9084a974dc62bb12cab7a51b0` sebelum dokumen ini ditambahkan. CI ringan mencakup formatting, project check, focused MCP/package tests, dan archive validation; **bukan** pengganti backend gate atau audit final.
- **Unit/integration evidence** berikut merujuk ke file tes nyata yang dijalankan oleh full gate atau focused suite yang dicatat; tidak menyatakan 101 frozen prompt telah dieksekusi di ChatGPT. Phase 8 tetap `Deferred by CR-019`.

## 3. Bukti per acceptance criterion

### AC-001 — Koneksi, OAuth dan MCP — PENDING

- **Production/host terbukti parsial:** OAuth owner `mcpku2` terhubung ke plugin PRIVATE v0.2.2; tiga owner reads dan discovery 33 tool berhasil. Hosted Supabase MCP v31 dan OAuth/unauthenticated boundary didukung record Phase 9–10; HTTP `GET /health` menggantikan tool `health_check` sesuai TOOL-001.
- **Local/CI:** gate backend mencakup OAuth/PKCE/resource audience, token/owner denial dan MCP discovery/Inspector; lihat [OAuth production tests](../../supabase/functions/mcp/oauth_production_test.ts) serta [Phase 9 audit](https://github.com/milyarderpro/content-producer/issues/20).
- **Masih perlu:** auditor mengonsolidasikan seluruh subbutir PRD (Streamable HTTP, metadata OAuth, 2xx, denial dan hosted health) terhadap versi runtime saat ini serta penutupan acceptance Phase 11. Bukti direct connector tidak identik dengan trace parent plugin untuk setiap write (CR-048).

### AC-002 — Multi-Page dan konfigurasi — PENDING

- **Production/host:** hanya **2 Page aktif**, `phase-9-5-pilot-trivia` dan `corious-facts`; kedua konfigurasi trivia yang terlihat cocok, bukan pembuktian tiga Page berbeda. MAN-02 membuat satu Page tambahan secara owner-authorized.
- **Local/CI:** [api-page-plan-writes.test.ts](../../supabase/tests/database/api-page-plan-writes.test.ts) mempunyai tes eksplisit tiga Page dengan konfigurasi trivia berbeda serta pilihan config/default dan isolasi.
- **Masih perlu:** bukti yang diterima auditor untuk ambang **minimal 3 Page**, variasi fixed/adaptive, reuse scope, dan pemisahan Page/niche. **Jangan** membuat Page production ketiga hanya untuk memaksa status PASS tanpa instruksi pemilik.

### AC-003 — Satu post siap produksi — PENDING

- **Production/host:** MAN-03/04 menyimpan, merevisi, dan menyetujui satu post `f58017bb-60ae-476d-afa7-65f8f0c6c3b8` menjadi `ready`, revision 3, hash `e944cf8975954f4041489e499ed20e1934181fd1f711b3f4756f62abe26abec3`; tujuh NASA fact bindings terverifikasi, Canva copy/caption/hashtags terpisah, 19/19 system dan 18/18 editorial checks lulus.
- **Local/CI:** [save/revise](../../supabase/tests/database/api-post-save-revise.test.ts), [approval quality](../../supabase/tests/database/api-post-approval-quality.test.ts), dan [render quality](../../supabase/tests/database/api-post-render-quality.test.ts) menguji kontrak source, snapshot, budget, dan approval.
- **Masih perlu:** review final cakupan seluruh butir termasuk adaptive 5–9/quality exception dan bukti minimum perbandingan terhadap berbagai konfigurasi; Phase 11 final acceptance. Owner menyetujui copy tertentu, bukan semua variasi content generation.

### AC-004 — Dedup exact/parafrasa dan reuse — PENDING

- **Production/host:** satu post memegang tujuh fakta teralokasi; MAN-03 menunjukkan reserve/verified facts, **bukan** eksplorasi penuh exact/paraphrase atau perbandingan kedua kebijakan reuse.
- **Local/CI:** [api-trivia-facts.test.ts](../../supabase/tests/database/api-trivia-facts.test.ts), [fact schema and reuse tests](../../supabase/tests/database/trivia-reservation-and-reuse.test.ts) mencakup exact/structured/reviewed similar serta workspace/page uniqueness pada fixture.
- **Masih perlu:** auditor memeriksa hasil untuk semua subbutir, termasuk keputusan ChatGPT mengganti kandidat parafrasa; jangan menyamakan pencarian kandidat dengan keputusan semantik yang telah dilakukan pada production.

### AC-005 — Sepuluh reservasi paralel — PENDING

- **Production/host:** tidak ada uji concurrency sepuluh reservasi di production, dan uji itu tidak perlu dipaksakan terhadap data owner.
- **Local/CI terbukti:** [api-trivia-concurrency.test.ts](../../supabase/tests/database/api-trivia-concurrency.test.ts) memuat kasus `CON-RESERVE-001` yang secara eksplisit menjalankan **10** public reservation calls dan menegaskan satu pemilik aktif, dengan conflict/replay aman; gate backend SUCCESS.
- **Masih perlu:** penilaian auditor atas kecukupan bukti deterministik ini untuk semua butir AC dan sign-off acceptance Phase 11. Jangan menyebut fixture sebagai sepuluh reservasi production.

### AC-006 — Revisi aman dan CAS — PENDING

- **Production/host:** MAN-04 melakukan satu revisi hook menggunakan exact revision/hash CAS, lalu persetujuan editorial terpisah dan readback. Fakta tidak diganti pada revisi production tersebut.
- **Local/CI:** [api-post-save-revise.test.ts](../../supabase/tests/database/api-post-save-revise.test.ts) memeriksa partial/full replacement, ordering, snapshots dan rollback; [post concurrency](../../supabase/tests/database/api-post-concurrency.test.ts) membahas konflik/stale CAS.
- **Masih perlu:** konfirmasi penerimaan makna saat fakta diganti dan cakupan semua konflik/race di fixture/editorial, plus review Phase 11. Jangan klaim semantic fact replacement dilakukan di production.

### AC-007 — Batch minimal tujuh post dan resume — PENDING

- **Production/host:** MAN-05 menciptakan **satu plan dengan 3 item**, semuanya `pending`, tanpa klaim, post hasil batch, atau percobaan item. **0/7 post batch diproses**, sehingga ambang tujuh post tidak terbukti.
- **Local/CI:** [api-plan-lifecycle.test.ts](../../supabase/tests/database/api-plan-lifecycle.test.ts), [api-plan-concurrency.test.ts](../../supabase/tests/database/api-plan-concurrency.test.ts), dan [api-post-save-revise.test.ts](../../supabase/tests/database/api-post-save-revise.test.ts) menguji claim/renewal/expiry, retry, rollback, recovery, dan save pada item plan. Tes 100-item plan creation bukan bukti tujuh post terselesaikan.
- **Masih perlu:** bukti deterministik end-to-end untuk **minimal tujuh post yang benar-benar diproses**, kegagalan parsial, resume dan ringkasan, dinilai auditor/Phase 11. Tidak mengarang tujuh post production.

### AC-008 — Kalender tujuh hari — PENDING

- **Production/host:** tiga slot internal pada **22, 24, 26 Oktober 2026 pukul 21.00 WIB** tersimpan dengan urutan/progress, bukan kalender tujuh hari; tidak ada linked post dengan `scheduled_at`, dan ini **bukan** jadwal Facebook.
- **Local/CI:** [api-page-plan-writes.test.ts](../../supabase/tests/database/api-page-plan-writes.test.ts) menguji slot ordered/atomic dan konflik schedule; [api-plan-concurrency.test.ts](../../supabase/tests/database/api-plan-concurrency.test.ts) menguji slot collision/race.
- **Masih perlu:** demonstrasi atau fixture deterministik kalender **tujuh hari** dan pemeriksaan `scheduled_at` per post, uniqueness dan retrieval progress; review Phase 11. Tiga tanggal terpisah tidak memenuhi tujuh hari.

### AC-009 — Lifecycle manual tanpa Facebook API — PENDING

- **Production/host:** draft → ready terbukti; post masih `ready` dengan `published_at=null`, tanpa metrics. MAN-09 menolak autopublish dan fake `posted`; **tidak** ada publikasi nyata atau perubahan `posted` di production.
- **Local/CI:** [api-post-lifecycle.test.ts](../../supabase/tests/database/api-post-lifecycle.test.ts) menguji status eksplisit, discarded/release, archive/immutability dan publication fields dengan fixture sintetis di database terisolasi.
- **Masih perlu:** acceptance reviewer memastikan seluruh transisi, invariants dan batas no-Facebook terpenuhi oleh tes deterministik. [CR-027](../decisions/2026-10-18-phase-10-mvp-evidence-boundary.md) **tidak** mensyaratkan Facebook post sungguhan untuk MVP.

### AC-010 — American English dan copy-ready — PENDING

- **Production/host:** MAN-07 menampilkan exact Canva copy, caption dan hashtags; owner menyetujui revision 3 tanpa revisi. Teks US English 77 kata, Canva 478 karakter dan checks editorial 18/18 PASS untuk sampel Moon.
- **Local/CI:** aturan kualitas pada [render tests](../../supabase/tests/database/api-post-render-quality.test.ts), [plugin trivia tests](../../tests/plugin-trivia.test.ts) dan rubric tercatat pada [manual-results.md](manual-results.md).
- **Masih perlu:** penerimaan representativitas bahasa US/UK/CA/AU dan konsistensi output di lebih dari satu sampel/format serta final review Phase 11; satu post tidak membuktikan cakupan seluruh pasar.

### AC-011 — Tanpa layanan AI tambahan — PENDING

- **Production/host:** output generation dan editorial berlangsung melalui ChatGPT; tidak ada bukti penggunaan OpenAI Platform API, embedding, atau vector DB dalam trace kartu, tetapi **absence of observed calls** bukan audit menyeluruh.
- **Local/source:** [package.json](../../package.json), [module contract](../../plans/module-contract.md), dan [plugin skill](../../plugin/skills/content-producer/SKILL.md) menunjukkan batas desain; tes/static review terfokus perlu dikaitkan dengan requirement negatif ini.
- **Masih perlu:** audit dependency, environment/secret dan jalur jaringan pada sumber/deployment saat ini serta review Phase 11 sebelum PASS; jangan menyimpulkan tidak ada seluruh outbound API hanya dari chat trace.

### AC-012 — Supabase Edge dan frontend autentikasi minimal — PENDING

- **Production/host:** Edge Function MCP hosted di Supabase (v31 ACTIVE) dan frontend auth minimal Vercel telah diuji pada Phase 9; tidak ada dashboard produk atau Facebook API dalam scope yang terdokumentasi.
- **Local/CI:** [Phase 9 hosted evidence](https://github.com/milyarderpro/content-producer/issues/8), [independent 9.5 audit](https://github.com/milyarderpro/content-producer/issues/20#issuecomment-6244579966), [frontend tests](../../auth-frontend/tests) dan focused MCP OAuth tests.
- **Masih perlu:** auditor mengonfirmasi deployment aktif/route auth dan batas tidak ada dashboard terhadap runtime terbaru, serta operasional/handoff Phase 11. Vercel digunakan untuk frontend minimal, **bukan** backend MCP/database.

### AC-013 — Snapshot performa dan insights hati-hati — PENDING

- **Production/host:** `latest_metrics=null`, dan MAN-09 `get_post_performance` pada post `ready` secara benar menolak dengan `POST_NOT_PUBLISHED`. Tidak ada Facebook post ID atau metrik asli dan **tidak ada** metrik palsu di production.
- **Local/CI:** [api-metrics-insights.test.ts](../../supabase/tests/database/api-metrics-insights.test.ts), [api-metrics.test.ts](../../supabase/tests/database/api-metrics.test.ts) dan [api-metrics-concurrency.test.ts](../../supabase/tests/database/api-metrics-concurrency.test.ts) menguji snapshot kumulatif, delta, median, pembatasan klaim kausal, dan history menggunakan fixture sintetis.
- **Masih perlu:** auditor/Phase 11 menilai cakupan semua subbutir termasuk views/comments/shares, ID/URL publikasi, snapshot bertanggal dan analisis dimensi. [CR-027](../decisions/2026-10-18-phase-10-mvp-evidence-boundary.md) membolehkan pembuktian deterministik; metrik Facebook nyata **bukan** syarat MVP.

### AC-014 — Fondasi multi-niche — PENDING

- **Production/host:** registry/modul niche `trivia` aktif; Page memiliki `page_niche_configs`. Tidak ada klaim bahwa niche kedua telah diimplementasi atau dipakai di production.
- **Local/source:** [module contract](../../plans/module-contract.md), [workspaces/niches tests](../../supabase/tests/database/workspaces-and-niches.test.ts), [pages/config tests](../../supabase/tests/database/pages-and-page-niche-configs.test.ts), dan [post/plan schema](../../supabase/tests/database/posts-and-post-metrics.test.ts) menunjukkan pemisahan core versus trivia.
- **Masih perlu:** review independen bahwa penambahan niche baru tidak mengubah arti data trivia, boundary core/niche benar, dan penerimaan Phase 11; tidak perlu menciptakan modul production baru untuk sekadar meluluskan checklist.

## 4. Batas bukti, risiko residual, dan tanggung jawab Phase 11

- **CR-048 / host attribution:** MAN-03/04 reservation, save, revise dan approval dilakukan melalui **direct Codex `mcpku2` owner OAuth calls**, bukan fresh ChatGPT parent-`@Content Producer`-selected write trace. Owner secara eksplisit menerima gabungan bukti plugin PRIVATE + owner OAuth readback untuk checkpoint 10.4; ini **tidak mengubah fakta asal trace**. Tidak boleh membuat ulang post/approval production untuk menciptakan bukti yang hilang. MAN-05 juga punya catatan atribusi direct `mcpku2`; audit 10.7 mempertahankan batas ini.
- **Ledger/reservation inspection:** API Read owner mencocokkan Page/post/plan sebelum/sesudah MAN-08/09 dan trace menunjukkan 0 business Write calls, tetapi operasi SQL `internal.operation_ledger` dan seluruh reservation rows **tidak dapat diperiksa independen** melalui jalur tersebut. Jangan mengartikan tidak adanya perubahan proyeksi publik sebagai bukti mutlak tidak ada write database.
- **MAN-02 owner secret confirmation:** pemilik mengonfirmasi penghapusan secret/grant sementara dari alur historical fixed-pilot; penghapusannya dan jumlah ledger pasca-write belum dibaca independen di production. Ini tidak membenarkan admin/service-role bypass; bawakan ke auditor.
- **OAuth test clients:** dua klien OAuth uji pernah tersisa; status, kegunaan dan keputusan pencabutan harus diperiksa/diotorisasi pemilik pada review keamanan. Jangan mencabutnya tanpa izin.
- **Hosted Security Advisor:** WARN terkait 33 intentional owner-gated `SECURITY DEFINER` API RPC dan leaked-password protection yang belum diaktifkan telah dinilai pada audit sebelumnya; WARN bukan klaim nol risiko dan memerlukan disposition terbaru pada 10.7/11.
- **Backup/restore:** bukti restore PostgreSQL terisolasi sebelumnya tidak mencakup seluruh komponen Supabase dan data Page terbaru; Phase 11 wajib meninjau kelengkapan, RPO/RTO, rollback, backup, dan handoff sebelum final MVP acceptance.
- **Legacy No-auth route:** fixed-pilot/No-auth adalah historical atau explicit rollback-only, **bukan** default production sekarang; evaluasi potensi aktivasi tidak sengaja tetap bagian audit keamanan.
- **Non-goals dan batas production:** Content Producer tidak mengunggah ke Facebook, menjadwalkan lewat Facebook API atau mengukur Facebook otomatis. Plan schedule internal tidak membuktikan post terbit. `MAN-10` (publikasi manual nyata) dan `MAN-11` (metrik nyata) adalah **DEFERRED — POST-MVP** menurut CR-027, bukan kartu gagal/belum lulus untuk gate MVP. 101 prompt frozen tetap inventory regresi; Phase 8 deferred.
- **Audit independen:** penulis dokumen ini hanya merekonsiliasi sumber dan bukti; belum melakukan audit 10.7, inspeksi SQL production, pengulangan sembilan kartu, atau pemberian PASS final. Auditor lain harus menilai risikonya, bukti per-AC dan tidak adanya critical/high defect sebelum memutuskan Phase 10/Pilot-ready. Phase 11 menutup seluruh AC yang applicable, backup/restore, operasional dan handoff sebelum `MVP Complete`.

## 5. Keputusan sementara dan stop condition

**AC-001..AC-014: 14 PENDING / 0 PASS sebagai final MVP acceptance saat dokumen dibuat.** Ini tidak membatalkan PASS pada bukti CI tertentu, Phase 9.5, atau MAN-01..09: status tersebut hanya berlaku pada batas tes/kartu/checkpoint masing-masing. Penutupan AC dan risiko harus berdasarkan bukti yang disetujui secara independen, bukan sekadar jumlah test atau checklist.

**Phase 10.7 PENDING; Phase 10 In progress; Pilot-ready PENDING; MVP Complete PENDING; PR #23 OPEN/DRAFT/unmerged.** Dokumen ini hanyalah perbaikan temuan berupa pemetaan evidence. Tidak ada perubahan kode, deployment, data bisnis, publication ID, metric snapshot atau full backend gate.
