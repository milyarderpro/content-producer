# Kontrak dan referensi perencanaan

Dokumen kontrak frozen berikut tetap menjadi acuan teknis, dilengkapi keputusan
yang diterima dalam `docs/decisions/`. Panduan yang lebih ringkas untuk pekerjaan
baru ada di [docs/README.md](../docs/README.md).

| Dokumen                                               | Peran                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| [PRD](PRD.md)                                         | Kebutuhan dan batas produk                                       |
| [Database design](database-design.md)                 | Model data, transaksi, dan invariant                             |
| [Module contract](module-contract.md)                 | Batas core/niche dan versioning                                  |
| [Tool inventory](tool-inventory.md)                   | Kontrak 33 tool, dengan override keputusan yang relevan          |
| [Trivia content DNA](trivia-content-dna.md)           | Kontrak editorial trivia                                         |
| [Workflow pengguna](workflow-users.md)                | Alur penggunaan yang direncanakan                                |
| [Decision register](phase-0-decision-register.md)     | Keputusan baseline                                               |
| [Use-case inventory](use-case-inventory.md)           | Inventaris kebutuhan dan 101 kasus, bukan bukti sudah dieksekusi |
| [Acceptance traceability](acceptance-traceability.md) | Pemetaan requirement/AC, bukan hasil acceptance terkini          |

Rencana kerja rinci di `plans/works/` telah dipindahkan ke
[archive/plans/works](../archive/README.md#rencana-fase-dan-tracker-historis--14-file).
[Implementation plan](implementation-plan.md) sekarang menjadi pengarah singkat
ke arsip dan mempertahankan anchor tracker lama. Referensi path literal di record
lama dapat ditelusuri melalui tabel lokasi pada indeks arsip.

Kontrak di atas tidak ikut dipindah atau diubah. Sebagian menjadi input langsung
test/packaging; perubahan lokasi maupun semantiknya perlu rekonsiliasi pembaca
dan keputusan kontrak yang sesuai.
