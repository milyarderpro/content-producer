# Design

## Context

Lihat [proposal](proposal.md) untuk tujuan dan [delta editorial](specs/trivia-reference-editorial/spec.md) serta [delta workflow](specs/trivia-draft-workflow/spec.md) untuk kontrak hasil. Desain diperlukan karena perubahan merentang routing skill, kebijakan editorial, contoh, packaging, CI, dan penerimaan saved-copy.

Baseline source yang ditinjau: `2a98665f7e7d2ac5d63c06afe412dd3d0117c152`, plugin 0.4.0. Worktree awal bersih. Audit read-only sebelumnya pada 5 November 2026 membaca 18 draft Corious Facts; seluruhnya memakai judul khusus. Lima belas terbaru memiliki median 58 kata dan lima fakta karena setiap item di tiga plan memuat `fact_count: {mode: fixed, value: 5}`. Prompt pembuat plan tidak tersedia; penyebab pemilihan override itu belum terbukti.

Temuan yang mendasari desain:

- `content-dna.md` sudah menyebut variasi, seleksi, dan bahasa percakapan, tetapi contoh `formats.md` berupa ringkasan kasus, bukan kartu lengkap.
- `comparison` meminta konsistensi metrik pada seluruh baris; tiga draft memakai diameter/jarak yang berulang. Ini hubungan yang masuk akal, bukan bukti tunggal sebab perilaku model.
- Delapan dari 15 draft memakai satu URL untuk semua fakta. Satu sumber bukan kesalahan; risikonya adalah membawa urutan dan pilihan informasi satu artikel langsung ke copy.
- `quality-rubric.md`, CR-053 §2.5, dan TDW-06 memperlakukan gaya sebagai nonblocking pada server. Kebutuhan pemilik kini mewajibkan hasil nonakademik sebelum plugin mengirim save.
- `scripts/plugin-package.ts` memiliki allowlist 13 file dan mewajibkan semua referensi ditautkan dari `SKILL.md`; test paket dan `.github/workflows/ci.yml` juga memiliki angka 13. Menambah file saja tidak membuatnya terbundel.
- Test plugin memeriksa kontrak, istilah, tautan, dan scripted trace; belum membuktikan pilihan kata atau susunan fakta hasil model.

## Goals / Non-Goals

**Goals:**

- Menjadikan kemiripan pola referensi dan bahasa nonakademik pekerjaan penulis yang harus selesai sebelum save/revise, bukan saran sesudah draft disimpan.
- Mengajarkan keputusan melalui contoh utuh, anti-example, dan alasan editorial yang dapat diterapkan pada subjek baru.
- Menguji copy aktual yang disimpan dan dibaca kembali, dengan bukti source/preview/LIVE yang terpisah.

**Non-Goals:**

- Menjamin kepatuhan model secara deterministik atau menjanjikan jutaan views; instruction-only tetap memerlukan evaluasi semantik.
- Mengubah schema, SQL, renderer, kontrak tool, approval, security, atau config/plan/post production yang sudah ada.
- Membuat format backend keenam agar semua variasi dataset bisa dipaksakan masuk; gunakan lima format aktif dengan pemetaan jujur.
- Menambah API model, worker, service penilai, sumber wajib kedua, atau alur preview/GO rutin. Evaluasi preview adalah kegiatan QA terpisah, bukan hambatan pada produksi normal.

## Decisions

### D1 — Kewajiban penulis dipisahkan dari gate server

Sebelum implementasi, tulis change record editorial baru pada `docs/decisions/` dengan nomor berikutnya yang belum dipakai. Catat persetujuan arah pemilik pada 5 November 2026 dan scope plugin-only. Record menjelaskan override terbatas atas bahasa preferensi pada DNA frozen, aturan comparison, dan tafsir saran gaya dalam workflow; kontrak frozen tidak ditulis ulang.

Plugin wajib menyunting sampai memenuhi standar DNA sebelum mengirim Write. Backend tetap hanya menerima tiga hasil `meaning_preserved`, `caption_no_new_claim`, `no_known_substantive_issue`; jangan memperluas arti check ketiga menjadi penilaian viral, mengirim key baru, menambah error baru, atau mengklaim server menilai gaya. Catatan minor setelah standar inti terpenuhi tetap nonblocking.

Alternatif menambah check backend ditolak karena di luar scope. Alternatif memperkuat beberapa kata sifat saja ditolak karena tidak menyelesaikan pilihan dan komposisi fakta.

### D2 — Satu pusat aturan, dua referensi baru

| Lokasi | Perubahan dan tanggung jawab |
| --- | --- |
| `plugin/skills/content-producer/SKILL.md` | Tautkan seluruh referensi baru; arahkan pemakaian sebelum riset/penulisan; tambahkan kewajiban selesai menyunting sebelum save, serta bedakan jumlah draft dan fakta |
| `references/niches/trivia/content-dna.md` | Pusat identitas, audiens, angle, ragam topik, nilai pembaca, voice, komposisi, dan prioritas instruksi |
| `references/niches/trivia/reference-patterns.md` | Baru: 12 contoh lengkap beranotasi, indeks routing, dan pasangan contoh lemah/perbaikan |
| `references/niches/trivia/writing-playbook.md` | Baru: langkah kurasi, urutan, penyuntingan, review sebelum write, dan tindakan saat kekurangan kandidat |
| `references/niches/trivia/formats.md` | Lima format tetap; perbaiki comparison, myth correction, density dan hook; jangan menyalin seluruh DNA ke sini |
| `references/niches/trivia/quality-rubric.md` | Jelaskan review penulis vs tiga check server dan arti penerimaan hasil |
| `references/core/workflow.md` dan `output-contract.md` | Pasang langkah review sebelum write dan kesetaraan copy yang dinilai dengan readback; urutan transaksi/recovery tetap |
| `docs/editorial/` | Corpus QA, baseline audit yang disanitasi, prompt, hasil review, sumber contoh, dan checklist; tidak dibundel |

Peraturan runtime dan copy contoh ditulis dalam English yang langsung memberi contoh suara produk; dokumentasi keputusan/evaluasi berbahasa Indonesia. Tidak menambahkan SKILL lain atau mengedit cache plugin terpasang.

Routing: baca DNA dan indeks contoh sebelum memilih angle; baca dua contoh relevan dan satu anti-example sebelum copy; baca playbook untuk review final. Ini batas fokus pembacaan, bukan kewajiban membuka seluruh 176 record pada setiap generasi.

### D3 — Kurasi dari reaksi pembaca, bukan ringkasan satu artikel

Alur produksi menjadi:

1. Resolve izin, Page, intent, dan config; pertahankan count eksplisit.
2. Pilih angle familiar dan contoh relevan. Pada batch tanpa tema, variasikan subjek dan nilai pembaca menurut bobot/config, tanpa jatah kaku pada batch kecil.
3. Riset kandidat lebih banyak daripada kebutuhan dari halaman nyata. Nilai setiap kandidat: apa reveal-nya, apakah mudah dipahami, dan apa kontribusinya terhadap set.
4. Dedup sesuai v2; gunakan ID lama yang sama bila eligible. Satu artikel boleh mendukung beberapa klaim, tetapi urutan artikel tidak menjadi urutan post otomatis.
5. Kurasi set: buang fakta dasar pengisi, pengulangan pengalaman, dan daftar angka sejenis. Angka tidak dilarang; hubungan atau perbandingannya harus memberi makna bagi pembaca.
6. Susun pembuka paling kuat, variasi tengah, dan penutup berbeda yang mudah diingat. Pertahankan urutan prosedur jika keselamatan atau instruksi memang membutuhkannya.
7. Tulis dan lakukan review DNA, perbaiki dahulu, lalu nilai tiga check v2 secara jujur.
8. Baca context terbaru, kirim payload final yang telah dinilai, kemudian get_post/readback; sumber dan diagnosis tetap internal.

Playbook menyimpan alasan seleksi singkat, bukan meminta chain-of-thought atau menampilkan penalaran panjang. Saat review gagal: edit wording untuk masalah gaya; riset/ganti fakta untuk masalah nilai pembaca; jangan memoles fakta lemah dengan `incredible`. Setelah dua putaran perbaikan editorial terarah yang belum cukup, laporkan keterbatasan alih-alih loop tanpa batas atau menyimpan filler. Lease/retry tetap menurut core dan research tambahan yang wajar tetap diperbolehkan dalam scope.

### D4 — Voice dan format yang dapat ditiru

Default `Did you know?`, plain lines, blank line antar fakta, satu CTA natural; jangan mengubah casing/emoji melawan config. Hook khusus, numbered, serta label `Myth:`/`Fact:` tetap boleh bila diminta atau diperlukan. Pilih 7–8 fakta fast trivia dan 5–6 utility bila config mengizinkan; explicit fixed count mengendalikan, bukan preferensi. Target 65–85 kata adalah panduan, bukan minimum. Kalimat singkat tidak dipanjangkan dan qualifier tidak dipotong agar mencapai target.

Bahasa: reveal dulu, kata sehari-hari, active verbs, contractions natural, angka konkret bila bernilai, maksimal satu gagasan utama per baris. Technical term, nama peneliti, tahun, dan atribusi dipertahankan hanya ketika material. Hindari nada instruksional generik, jargon, pengulangan pembuka, dan klaim emosi hewan yang tidak didukung. Satuan mengikuti konteks US/global dan budget; konversi tidak wajib pada setiap angka. Target market tetap US/UK/CA/AU meskipun config Page tertentu hanya mencatat US; jangan mengubah config tanpa izin.

Contoh arah edit dari klaim draft tersimpan, bukan verifikasi fakta baru:

| Pola lama | Arah edit |
| --- | --- |
| `Copper-based hemocyanin gives octopus blood its striking blue color.` | `An octopus's copper-based blood is blue.` |
| `Myth: Bats are blind. Fact: Bats can see.` | `Bats can see—they aren't blind.` |
| Lima diameter berurutan | Riset perbandingan/kemampuan yang mudah dibayangkan; jangan menciptakan angka atau analogi |
| Dua jenis pembantu merawat anak | Pilih satu; pengganti menambah sudut sensorik, komunikasi, atau adaptasi |

Comparison: like-for-like pada setiap pasangan metrik; dimensi antarpoin dapat berbeda. Menurut addendum feedback pemilik task 5.4, kontras bermakna boleh dibangun lintas baris atau terhadap baseline jelas; tidak wajib dua kota di setiap baris. Pasangan yang hanya menyebut fasilitas berbeda tetap gagal seleksi. Myth: koreksi langsung tanpa label mekanis. Mixed: satu umbrella yang jelas cukup jika ada pemetaan format aktif yang sah; tidak dipaksa ke `single_subject_fast`. Jika config tidak mendukung pola yang diminta, jelaskan keterbatasan alih-alih mengganti makna atau format diam-diam.

### D5 — Dua belas contoh positif lengkap, bukan kutipan produksi

`reference-patterns.md` berisi 12 kartu asli yang ditulis dari pola referensi: hewan single-subject, pets, kumpulan perilaku hewan, tubuh/taboo ringan, makanan/myth, storage, negara, kota/tempat, sejarah/tokoh, benda sehari-hari, comparison, dan alam/sains. Lima format dan dua profil terwakili dengan pemetaan yang eksplisit.

Setiap kartu memiliki ID, sumber pola `account + POST-id`, tema/format/profil, hook–seluruh fakta–CTA tanpa placeholder, serta anotasi pembuka, kontribusi per baris, variasi tengah, penutup, CTA, dan batas yang tidak diwarisi. Sedikitnya enam pasangan before/after menguji monoton angka, pembuka lemah, jargon, pengulangan reaksi, myth berlabel, dan CTA kaku.

Kartu positif bukan salinan satu post dataset atau urutan lengkapnya. Klaim positif diperiksa secara independen saat implementasi, dengan sumber per klaim dicatat di companion `docs/editorial/reference-example-sources.md`; source URL bukan bagian Canva copy. Kartu bukan facts bank yang boleh disave ulang tanpa riset/dedup terkini. Contoh klaim meragukan dari dataset hanya boleh muncul sebagai anti-example berlabel. Kutipan pendek secukupnya untuk anotasi pola; jangan membundel semua dataset atau data private audit.

### D6 — Evaluasi semantik dengan kasus regresi dan transfer

Siapkan `docs/editorial/reference-dna-evaluation.md` dengan 12 kasus berikut. Untuk QA preview, gunakan prefix yang sama pada kedua versi: `For this evaluation, return an unsaved Canva copy preview only. Follow the supplied Page config. Do not call any Write tool.` Ini bukan prompt produksi. Simpan input config/intent, versi paket, model jika terlihat, output utuh, sumber jika riset dilakukan, dan verdict terpisah; baseline yang belum dijalankan tetap NOT RUN.

| Kasus | Prompt inti yang dibekukan | Sasaran |
| --- | --- | --- |
| E01 regresi | `Create a fast trivia card about red pandas.` | Pembuka bukan diet umum; beberapa angle berbeda |
| E02 regresi | `Create an emotional animal card about meerkat cooperation.` | Tidak menduplikasi caregiving; perilaku teramati, bukan motif rekaan |
| E03 transfer | `Compare African and Asian elephants for a general audience.` | Pasangan setara, dimensi berbeda, bahasa sederhana |
| E04 regresi | `Create a card correcting common bat myths.` | Koreksi langsung, tanpa parade label atau advice yang menyesatkan |
| E05 regresi | `Create surprising comparisons about moons in our solar system.` | Hubungan mudah dibayangkan, bukan tabel diameter |
| E06 transfer | `Create a fast trivia card about human teeth.` | Aneh/relatable, tidak berubah menjadi bab anatomi |
| E07 transfer | `Create a fast trivia card about rice.` | Botani, sejarah, atau skala bervariasi; bukan tabel nutrisi |
| E08 transfer | `Create useful storage facts about berries and leafy greens.` | Object/action/condition/outcome; aman dan saveable |
| E09 transfer | `Create a trivia card about unusual everyday life in Australia.` | Angle culture/place familiar; fakta berubah diverifikasi |
| E10 transfer | `Compare surprising features of Canadian cities.` | Kontras bermakna, tidak memaksa dua kota pada setiap baris atau menjadi tabel geografi |
| E11 transfer | `Create a card about the surprising history of the zipper.` | Benda familiar dengan origin/usage berbeda; bukan kronologi datar |
| E12 transfer | `Create a card about unexpected abilities of trees.` | Bahasa konkret, tanpa mengubah mekanisme menjadi motif manusia |

Untuk delapan kasus transfer, gunakan subjek/detail yang tidak menyalin kartu positif; bila ada overlap subjek, fakta/angle yang dinilai harus ditahan dari contoh. Tambahkan kontrol terisolasi untuk permintaan lima draft tanpa fact count, `fixed: 5` eksplisit, literal data table yang memang diminta, format tidak didukung, qualifier penting, serta preview/payload/readback mismatch. Kontrol boleh fixture; scripted trace bukan bukti kualitas AI.

Review per naskah memakai delapan dimensi 0–2: familiarity/angle, surprise atau utility, komposisi, urutan, naturalness, kedekatan pola referensi, scanability/format, dan CTA. `2` berarti jelas memenuhi dengan kutipan alasan; `1` berarti memenuhi tetapi masih minor; `0` berarti perlu revisi substantif. Lulus kandidat: setiap kasus minimal 13/16, tidak ada dimensi 0, naturalness wajib 2, serta akurasi/qualifier/config/budget tidak bermasalah. Baseline gagal harus membaik pada dimensi gagal tanpa menurunkan akurasi. Semua kasus wajib dinilai; rata-rata tidak menutupi FAIL. Angka ini alat penerimaan QA, bukan field/backend gate atau janji viral.

Reviewer membaca naskah sebagai pembaca biasa dan menandai kutipan yang terasa seperti buku pelajaran. Static check/keyword/readability score tidak menggantikan review. Pemilik meninjau contoh dan hasil sebagai konfirmasi standar editorial; tidak menjadi checkpoint tambahan pada setiap draft normal.

### D7 — Penerimaan saved-copy membutuhkan retest yang diotorisasi

Setelah kandidat terpasang dan scope Write tersedia, retest minimal lima kasus: single-subject (E01), utility (E08), emotional (E02), comparison (E03 atau E05), myth (E04). Setiap draft harus melalui v2 research/dedup/save/readback, dinilai dengan rubrik yang sama dari `get_post`, serta terbukti mempertahankan copy yang disunting. Uji batch count terpisah pada objek uji dengan izin scoped count. Jangan mengubah 18 draft audit atau memakai klaim yang sama melawan `workspace_unique`.

Utamakan Page uji yang disetujui. Jika fakta sudah teralokasi, pilih fakta baru dalam angle yang sama dan catat perubahan input; jangan merusak dedup demi perbandingan. Simpan bukti yang disanitasi di hasil live yang berlaku dan tautkan Issue. Source/preview PASS tidak cukup untuk `FIXED`. Bila izin, runtime, atau host belum tersedia, task retest tetap terbuka dengan BLOCKED/NOT RUN dan implementasi tidak diklaim tuntas end-to-end.

### D8 — Paket, regresi, dan rilis terukur

Tambahkan dua referensi ke `CANDIDATE_FILES`: 13 menjadi 15 file, tetap satu skill dan mapping app owner yang sama. Sinkronkan validasi tautan/secret/retired-tool pada seluruh referensi, test jumlah/negative cases, verifikasi hash ZIP ekstraksi, `plugin/README.md`, dan langkah paket CI. Jumlah file bukan alasan menghapus pemeriksaan allowlist/hash. Evaluasi tidak masuk ZIP.

Rencana versi kandidat 0.5.0, gunakan nomor belum terpakai bila source bergerak sebelum apply. Pertahankan identitas plugin/app; jangan menyunting cache. Tes fokus: plugin-config/package/skill/trivia ditambah regresi editorial dan klasifikasi dependency CI yang terdampak. Perubahan TypeScript/config menjalankan `pnpm run check` sesuai AGENTS; packaging dan verify kandidat wajib. Tidak menjalankan DB reset, G4, atau full backend gate untuk perubahan ini. Jika workflow CI tersentuh, cabang pemeriksaan yang memang terpicu tetap dijalankan; jangan melemahkan MCP/security checks untuk menghemat durasi.

## Risks / Trade-offs

- [Model tetap dapat gagal menaati instruksi] → Review sebelum write, corpus semantik, retest persisted-copy; tidak mengklaim jaminan deterministik plugin-only.
- [Banyak larangan membuat copy semakin hambar] → Utamakan contoh positif dan seleksi angle, jelaskan batas secara singkat; jangan mengganti suara referensi dengan bahasa kepatuhan.
- [Contoh disalin atau dianggap bukti] → Kartu original dengan sumber terpisah, label pola, dedup tetap wajib; transfer set mencegah hafalan dianggap kualitas.
- [Review gaya menambah field/gate terselubung] → Change record dan delta membatasi kewajiban pada plugin; tiga checks/backend tidak berubah.
- [Format yang aktif tidak mencakup semua campuran referensi] → Gunakan variasi sah; catat keterbatasan tanpa enum baru atau pemetaan palsu.
- [Penambahan referensi terlewat pada ZIP/CI] → Allowlist, tautan, count, dan hash aktual diperiksa bersama, termasuk negative missing-file case.
- [Retest live menggandakan atau memakai fakta terlarang] → Objek/izin uji spesifik, scope count terpisah, readback, canonical ID, dan recovery yang sama.

## Migration Plan

1. Setelah perintah apply baru, tautkan/buat Issue sesuai izin dan terima change record editorial sebelum mengubah aturan kontrak. Proposal ini bukan implementasi atau izin publikasi.
2. Buat contoh dan evaluasi sumber, ubah instruksi serta packaging, lalu jalankan check terpilih dengan estimasi durasi/candidate SHA. Source 0.4.0 menjadi pembanding, bukan snapshot live yang diasumsikan.
3. Review corpus dan hasil preview. Kandidat belum siap diklaim berhasil secara live walau seluruh check lokal lulus.
4. Setelah izin commit/push/PR/merge/pemasangan yang relevan, rilis paket pada identitas yang sama; verifikasi versi dan hash terpasang, lalu chat baru dengan Content Producer dan dependensi owner yang sama.
5. Retest lima format plus kontrol batch; simpan status per kasus dan bukti readback. Tidak menandai semua task selesai dari packaging saja.
6. Bila regresi, kembali ke paket sebelumnya yang terverifikasi melalui izin rilis yang sesuai. Tidak rollback backend, menghapus post, atau mengubah snapshot. Perbaiki instruksi dan ulang kasus gagal dengan bukti baru.

Pada setiap pemeriksaan CI/Actions kelak: periksa job/riwayat, catat SHA/scope/estimasi sebelum run. Jika perkiraan >10 menit, mulai run yang telah diizinkan, laporkan URL/status sekali, lalu hentikan pemantauan sampai `lanjutkan`. Tidak ada CI, riset sumber contoh, generasi uji, atau Write live yang dijalankan oleh pembuatan rencana ini.
