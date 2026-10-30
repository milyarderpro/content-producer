# G3-T2 — Manual candidate Actions pada exact SHA

**Status:** kandidat G3, **bukan release gate/cutover**. Issue #90; base main `ebded963d9db57030aafa5555abfab6cde4c2f25`. CR-052 masih PROPOSED. Workflow lama dan `pnpm run test-all` tidak berubah.

## Kontrak eksekusi

`.github/workflows/backend-gate-candidate.yml` hanya mempunyai `workflow_dispatch` pada `main`. Input `candidate_sha` berupa 40 hex lowercase harus sama dengan `github.sha`, `git rev-parse HEAD`, dan HEAD branch main sebelum dependensi, stack, atau reset dijalankan. Source dan backend memakai checkout SHA ini secara independen dan dapat berjalan paralel. Aggregate `if: always()` mewajibkan kedua job success, kedua status PASS, SHA dan tiga SHA-256 manifest/lock/input identik, serta evidence mode yang benar. Output hilang, skipped, salah hash, atau perbedaan SHA gagal tertutup. Tidak ada path PR atau push yang memicu full kandidat otomatis.

Mode backend `ACTIONS_EXACT_CONFIG` hanya boleh melalui GitHub Actions dispatch yang terverifikasi; config Supabase di checkout diverifikasi byte-for-byte dengan `git show HEAD:supabase/config.toml`. Tidak ada salinan config overlay. Ini berarti stack memakai committed project ID `content-producer` dan port `54320..` pada hosted runner sementara yang harus kosong dari sumber daya Supabase. Tindakan ini **tidak aman di PC lokal yang dipakai pengguna**: `GATE_CONFIG_MODE=ACTIONS_EXACT_CONFIG` saja tidak memberi akses formal. Mode lokal tetap memakai `issue-88-…-disposable`/port 58000–64000 dan menghasilkan label `DIAGNOSTIC_CONFIG_OVERLAY`, bukan PASS exact-SHA.

Backend mempertahankan satu start dan satu reset, validasi 72 migration, satu MCP suite 15 file, audit katalog sebelum/ sesudah Inspector, 33 valid + 33 invalid tool calls dan owner/cross-owner denial, 41 file database serial, migration history, DB lint, **local security advisors terpisah**, final audit, whitespace, serta cleanup. Status `NOT RUN` ditulis untuk tahap wajib yang belum dilaksanakan pada kegagalan preflight/awal. Bukti JSON hanya menyimpan SHA dan hash, versi pin, label mode, nama/status/durasi tahap, count aman, lima tahap terlama, dan alasan kegagalan berupa kode tetap. Output child mentah tidak dicetak atau diunggah; jangan menyimpan token, JWT, SQL, fixture, atau payload pribadi.

## Preflight implementasi dan batas biaya

- Base SHA: `ebded963d9db57030aafa5555abfab6cde4c2f25`; branch `codex/issue-90-candidate-actions`; hanya empat path yang dimiliki Issue #90.
- Riwayat light CI: run [41001066370](https://github.com/milyarderpro/content-producer/actions/runs/41001066370) pada base SHA, success, 2026-10-30 04:06:53–04:07:47 UTC (~54 detik). Estimasi light CI PR sekitar **1 menit**, dapat bertambah untuk MCP/probe/package karena perubahan workflow memicu classifier CI.
- Historical backend candidate G3-T1: ~19m27s diagnostik, belum PASS formal. **Tidak dispatch** full candidate atau full legacy gate pada PR ini; pembuktian exact-SHA dan pembandingan di G4 setelah workflow stabil.
- Snapshot protection: main `protected=false`, required status check contexts kosong; rulesets `[]`. Endpoint detail branch protection tidak dapat dibaca konektor (403). Jangan mengubah required checks, branch rules, atau workflow lama.
- Pre-push harus memeriksa manifest/target, fokus runner/workflow, `pnpm run check`, Prettier, `git diff --check`, dan file diff. Periksa light CI pada head PR; hasil yang tidak dijalankan harus berlabel `NOT RUN`/ `BLOCKED`, bukan PASS.

## Bukti dan batas penerimaan

Reports per job berada di artifact `candidate-source-<sha>` dan `candidate-backend-<sha>` (retensi 14 hari); summary agregat menyebut kandidat serta hasil konjungsi. Tidak ada raw logs dalam artifact. Agar kesetaraan release dapat dinyatakan, G4 masih harus membandingkan gate lama dan kandidat pada SHA yang sama, menguji local advisor PASS, memastikan seluruh invariant dan fixture clean, dan menyelesaikan keputusan CR-052. CI fixture bukan bukti OAuth hosted atau business Write production.

## Issue #96 — desain dua runner database (belum dieksekusi)

Base `01531fc8dc7bb1e6f9365525b7324a8fc9686b28`, branch `codex/issue-96-isolated-db-shards`. Candidate manual-only kini memiliki source, matrix dua database runner Ubuntu independen, dan aggregate. Setiap runner memiliki Supabase stack, clean reset, MCP, Inspector 33/33, audit before/after/final, 41-file coverage melalui shard 21+20 yang disjoint, serial Vitest per runner, migration history, DB lint, advisor lokal dan cleanup. Shard list berada di `scripts/gate-db-shards.json` dan divalidasi terhadap seluruh 41 manifest entries.

Aggregate mengunduh tiga report aman, mensyaratkan kedua job success serta stage PASS, SHA/hash manifest-lock-input-partisi identik, file 41 unik, case positif per shard tanpa skip, dan Inspector count. Bukti runtime dua shard **NOT RUN** sampai PR #95/#96 digabung di final SHA; tidak dispatch dari PR ini. Satu-stack baseline [41011838448](https://github.com/milyarderpro/content-producer/actions/runs/41011838448) PASS 15m48s, DB sekitar 10m43s. Proyeksi dua stack sekitar **10m27–10m47s** wall clock dan tambahan **3–5 CI runner-minutes**, belum dibuktikan. Light CI base [41011729873](https://github.com/milyarderpro/content-producer/actions/runs/41011729873) PASS ~40s; estimasi light CI PR ~1 menit.
