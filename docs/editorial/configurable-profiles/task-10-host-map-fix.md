# Kompatibilitas map katalog dengan connector — Issue #148

Tanggal 14 November 2026. Scope sisa task10: positive LIVE config2/data-only,
minimal satu Page QA, satu format/topic/profile custom, satu draft + satu revisi.
Backend awal adalah SHA04ca90cb, mcpv39; Issue145 FIXED LIVE tetap utuh.

## Reproduksi dan batas hasil

Owner/workspace, lima Page existing dan katalog dibaca lewat OAuth. Katalog
revision0, definitions kosong dan complete=true. Payload format baru memakai
qa_shoreline_pair, architecture single_subject, density key compact_pair,
count2/2, words_per_fact8/18,total30/65. Payload lengkap direview sebelum Write.
Connector menolak change.payload.density_preferences.compact_pair dengan
keyword additionalProperties sebelum MCP; tidak ada MCP diagnostic ID.
Read katalog sesudahnya tetap0/kosong. Tidak ada definisi, Page atau post baru.
Metadata host privat tidak disalin ke repo/Issue. Ini bukan kegagalan save_post_v2.

Wire aktual memakai propertyNames + patternProperties typed +
additionalProperties:false. Parser connector yang diamati menganggap key map
sah sebagai extra. [Keputusan representasi](../../decisions/2026-11-14-cr-062-host-dynamic-map-schema.md)
mempertahankan propertyNames + typed additionalProperties, dengan batas regex,
nilai, size dan strict domain object yang sama. Wrapper union/ref factoring,
registered Zod validators, RPC, identity/owner, grant/RLS dan migration tidak
berubah. Tidak menambahkan OpenAI API atau melewati connector lewat SQL.

## Verifikasi perbaikan lokal

Regresi membaca tools/list aktual untuk seluruh10lokasi map pada tiga tool
yang memakai helper yang sama: create_page3, update_page3, katalog4. Typed
fallback, regex key, density/weight dan strict value object diperiksa, termasuk
key/value/size negatif. Red sebelum fix:1FAIL/14filtered, pesan connector
strips valid dynamic density key. Sesudah fix: **18file/132MCP PASS**,0failed,
sekitar10detik. Manifest bertambah1kasus; DB33file/238 dan33tool valid/invalid,
retired5 serta owner denial tidak dikurangi. Check source/frontend dicatat
sesudah run final selesai. JSON/ref/whitespace ditinjau sesuai scope.

## Rilis dan kelanjutan

PR/Actions kemudian G4 manual exact final main SHA sebelum deploy yang sudah
diotorisasi. Estimasi sebelum dispatch12–15menit dari run43561690208 11m12s;
dispatch lalu melepas pemantauan chat sesuai AGENTS, bukan menunggu10menit.
Runtime production tetapv39 sampai gate dan deployment baru terverifikasi.
Refresh tools pada app/koneksi existing bila perlu; tidak upload paket identik
atau membuat koneksi kedua. Penyiapan endpoint probe tambahan dihentikan sesuai
arahan pemilik agar tetap fokus; tidak ada plugin tambahan atau tunnel publik
yang dibuat. Penerimaan connector kandidat sebelum deploy belum terbukti. LIVE FIXED memerlukan connector publish/readback.

Setelah rilis: baca katalog terkini; rekonsiliasi hasil; replay operation key dan
payload semantik format yang sama jika masih sesuai. Topic/profile/Page/save/
revise belum dipanggil. Stable keys/payload asli hanya ada di artifact lokal
tersanitasi task-10-host-map-attempt.json. Jangan mengarang reference/hash atau
membuat duplicate output. Ambil baseline fingerprint baru sesudah fix sebelum
memulai kembali demonstrasi data-only; percobaan awal170hash bukan bukti source
identik lintas perbaikan. Hash tujuh tabel existing tersimpan untuk perbandingan.

Task10 tetap unchecked9/10. Review naskah/runtime mengikuti profil tertulis dan
kontrol fakta/sumber/dedup/attestation; tidak ada QA layout ponsel. Hasil host
FAIL tidak diubah menjadi PASS hanya karena CI/G4 atau metadata deploy sukses.

Check lokal sempat timeout pada test CLI aggregate (dua proses pnpm/tsx dalam
batas5detik), termasuk saat check tunggal. Invocation test memakai Node aktif
langsung dengan --import tsx untuk menghapus startup package-manager berulang;
script CLI, exit assertions, kasus238/239 dan timeout tetap sama. Tidak
mengubah gate/backend runtime. Hasil check final dicatat setelah run selesai.

Verifikasi final kandidat14November: pnpm run check **PASS** (208source,
19frontend, lint/typecheck/build); pnpm run test:mcp **18file/132PASS**,
0failed, sekitar14detik; git diff --check PASS. Audit read-only sebelumnya
memverifikasi Inspector authenticated33valid/33invalid, retired5, owner denial,
config1/config2 dan katalog/grant/RLS/fixture. Audit itu memakai wire/runtime
yang sama; perubahan lanjutan hanya memperluas satu regresi dan mengurangi
overhead invocation test CLI. Ini bukti LOCAL/FIXTURE, bukan LIVE connector PASS.

Scope rilis hanya helper representasi schema, regresi, inventaris kasus dan
dokumentasi defect. Tidak ada perubahan migration, SQL, RPC, izin owner, RLS,
config deployment atau paket plugin. Production tetap mcpv39; Issue148 OPEN
dan task10 unchecked sampai retest/readback di plugin existing selesai.

## Hasil final14November2026

PR149 merged pada90a16e1; G443571709067 aggregate/strict report PASS12m29s.
Edge mcpv40 ACTIVE,26/26 provider file byte-match source gated. Replay format
memakai key/payload semantik yang sama setelah katalog direkonsiliasi0; kini
publish/readback berhasil. Topic/profile, satu Page QA baru, save dan revise
pada satu draft juga PASS dengan readback tepat. **Issue148 FIXED LIVE**.
[Bukti final](task-10-final-live.json) memuat hasil dan batas scope. Bagian OPEN,
NOT RUN dan9/10 di atas adalah checkpoint historis, bukan status final.
