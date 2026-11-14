# Perbaikan generation context config1 — Issue #145

Tanggal 14 November 2026. [Issue #145](https://github.com/milyarderpro/content-producer/issues/145)
terbuka sampai retest LIVE. [Record koreksi kontrak](../../decisions/2026-11-14-cr-062-config1-generation-context-output.md)
menjelaskan kompatibilitas yang dipulihkan; bukan perubahan domain/izin.

## Masalah dan perubahan

SQL CR-062 menyertakan module.config_schema_versions:[1,2] pada context config1.
Validator output facade belum mengenal field tersebut pada cabang config1,
sehingga Page existing gagal dengan RPC_RESPONSE_INVALID. Fixture MCP lama
belum memuat field itu; Inspector valid context hanya memakai Page config2.

Tambahkan penerimaan optional exact tuple [1,2] pada module config1; bentuk
historis tanpa field tetap diterima, field/versi asing tetap ditolak. Tidak ada
migration, perubahan business RPC, auth/owner/grant, data Page/post atau paket
plugin. Metadata input tool tidak berubah dan tidak perlu upload plugin baru.

Regresi MCP meniru bentuk SQL config1 saat ini, menjaga config/copy dan timestamp
6digit, serta menolak extra field, versi [1,3]/[2,1]/null. Inspector G4 juga
membaca fixture config1 melalui database nyata dan OAuth sintetis lokal sebelum
jalur config2. Tambahan compatibility Read tidak menggantikan 33 nama valid,
33invalid, lima nama v1 ditolak atau owner denial.

## Bukti lokal dan rilis

- Sebelum fix: regresi baru FAIL tepat pada current SQL config1 context rejected,
  diagnostic RPC_RESPONSE_INVALID; 1failed/6filtered pada run fokus.
- Sesudah fix: seluruh MCP18file/**131kasus PASS**,0failed, sekitar14detik.
  Test historis tanpa field dan kontrol OAuth/owner/protocol tetap lulus.
- Check pertama:202PASS/6FAIL. Lima failure terkait inventaris130 yang belum
  mengikuti penambahan1test; satu timeout proses aggregate5detik saat check
  paralel dengan Deno. Failure dicatat, bukan ditutup dengan menaikkan timeout.
- Manifest/fixture aggregate direkonsiliasi menjadi131; DB33file/238kasus tetap.
  Check diulang terpisah: **208source/19frontend PASS**, lint/typecheck/build PASS.
- git diff --check PASS. G4 database/Inspector baru **NOT RUN** sampai dispatch
  final main SHA. Hasil lokal bukan LIVE PASS atau FIXED.

Rilis mengikuti PR/Actions/merge dan satu G4 formal exact final main SHA,
committed config. Estimasi sebelum dispatch13–16menit dari run43543996820
12m40s; dispatch lalu akhiri respons sesuai AGENTS, tanpa polling berulang.
Backend terpasang tetap v38 sampai gate baru PASS dan deployment terverifikasi.
Retest minimal mengambil owner/workspace/Page/context yang sama serta readback
versi/hash runtime; tidak membuat atau mengubah draft untuk menguji Read ini.
Task10 tetap9/10 sampai seluruh syarat akhirnya dipenuhi.
