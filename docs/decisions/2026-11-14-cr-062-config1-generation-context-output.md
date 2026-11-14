# CR-062 — Koreksi output generation context config1 (Issue #145)

Tanggal 14 November 2026. Scope: pemulihan kompatibilitas facade MCP dengan
kontrak SQL CR-062 yang sudah diterima; tidak mengubah keputusan izin, business
RPC, migration, config Page, atau bentuk public copy.

LIVE QA owner OAuth pada Edge mcp v38 menemukan RPC_RESPONSE_INVALID pada
get_page_generation_context config1. SQL CR-062 menambahkan
module.config_schema_versions:[1,2], tetapi legacyContextData.module memakai
strictObject tanpa field tersebut. Fixture MCP config1 belum memuat bentuk
SQL baru, sementara Inspector G4 memakai Page config2 untuk context valid.

Facade menerima field versi exact [1,2] secara opsional pada cabang config1.
Opsional mempertahankan reader untuk bentuk rollback historis tanpa field;
present-but-invalid tetap ditolak. Strict object dan cabang config2 tetap utuh.
Tidak menghapus field database atau melonggarkan validator menjadi passthrough.

Regresi wajib membuktikan bentuk config1 aktual PASS, presisi enam mikrodetik,
rejection field/versi asing, dan reader historis. Inspector authenticated
menambah Read context pada fixture config1 database nyata sebelum jalur config2;
33 nama tool valid/invalid, retired tools dan owner denial tetap dijalankan.
Tidak mengganti hasil historis FAIL menjadi PASS.

Perbaikan melalui Issue/PR/Actions; jalankan check dan MCP fokus. Untuk menutup
celah integrasi pada rilis task10, jalankan G4 formal exact final main SHA dengan
committed config sebelum deployment yang diotorisasi. PASS lama pada 30e8b3e
bersifat historis. Estimasi G4 13–16 menit berdasarkan run43543996820 12m40s:
dispatch lalu akhiri pemantauan chat sesuai AGENTS. FIXED memerlukan retest
owner OAuth setelah bundle runtime baru terverifikasi. Task10 tetap unchecked
hingga sisa acceptance yang disepakati terpenuhi.

Inventaris MCP bertambah tepat satu test: 18 file/130 menjadi 18 file/131 kasus.
Manifest dan fixture bukti aggregate diperbarui sesuai hitungan source; target
DB33file/238kasus,33nama valid/invalid dan keamanan tidak berkurang. Kegagalan
check pertama karena manifest130 serta timeout proses pada run paralel dicatat
sebagai diagnostik, kemudian check diulang setelah inventaris sesuai.
