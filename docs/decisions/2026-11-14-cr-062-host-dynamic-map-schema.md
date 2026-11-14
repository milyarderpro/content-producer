# CR-062 — Representasi wire dynamic map untuk connector (Issue #148)

Tanggal14November2026. Scope: kompatibilitas metadata input MCP; kontrak domain,
RPC, validator runtime, izin owner, RLS, grants, migration dan payload tidak berubah.

Positive QA task10 pada mcpv39 ditolak connector sebelum MCP pada density key
compact_pair: additionalProperties. Katalog sebelum/sesudah revision0 dan kosong;
Page/post belum dibuat. Respons host tidak mempunyai MCP diagnostic ID. Bukti
publik disanitasi tanpa _meta privat. Issue145 merupakan defect terpisah yang
sudah FIXED melalui LIVE retest.

Wire lama mengubah propertyNames + typed additionalProperties menjadi
patternProperties + additionalProperties:false. JSON Schema-nya ekuivalen,
tetapi connector yang diamati menolak key map sah. Kembalikan representasi map
ke propertyNames.pattern + typed additionalProperties. Strict object domain
lain tetap additionalProperties:false; tidak memakai true, passthrough atau
menghapus regex/nilai. Zod dan SQL tetap menolak key/value/size yang tidak sah.
Wrapper union tetap closed, local-ref factoring dan semua field tetap utuh.

Regresi memeriksa tools/list aktual pada seluruh10lokasi map: create_page3,
update_page3 dan update_trivia_editorial_catalog4. Typed fallback, regex key,
nilai density/weight, strict value object, roundtrip factoring serta batas size
runtime tetap diperiksa, termasuk kasus negatif. Keberhasilan CI bukan bukti connector
menerima metadata baru. Rilis melalui PR/Actions/G4 exact final main SHA;
refresh koneksi existing bila diperlukan dan replay key/payload semantik identik
baru setelah state direkonsiliasi. Jangan menggunakan SQL owner impersonation
atau mengubah key menjadi enum lama untuk menyembunyikan kegagalan data-only.

MCP bertambah1test menjadi18file/132kasus, DB33file/238 tetap. Semua nama33valid/
33invalid, retired5 dan owner denial tetap. Estimasi check1–2menit/MCP<1menit;
G4 12–15menit dari run43561690208 11m12s. Dispatch G4 lalu akhiri pemantauan
sesuai AGENTS. Issue148/task10 belum selesai sampai uji connector/live write
serta readback terkait terbukti; hasil host FAIL tetap dipertahankan.

Dokumentasi resmi OpenAI MCP server menjelaskan input schema dan pengujian tool,
namun tidak menetapkan perilaku clamp ini; diagnosis connector berasal dari
reproduksi aktual, bukan klaim semua host menolak patternProperties.
Referensi: https://developers.openai.com/plugins/build/mcp-server
