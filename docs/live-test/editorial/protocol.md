# Protokol evaluasi draft tersimpan editorial trivia

**Keputusan aktif 28 Oktober 2026 — 30 kasus utama dimulai dengan [direct-save v1](main-direct-save-v1.md).** Pilot lima format sudah selesai; uji terfokus SSF/TUT setelahnya bukan pilot tambahan. Saat keputusan ini dicatat, main masih **0/30** dan prompt pertama belum ditempel pemilik. Prosedur v1 mengesampingkan checkpoint GO historis dan status “30 tidak aktif” di bagian bawah dokumen ini **hanya untuk pelaksanaan kasus utama baru**. Rubric, sanitasi, batas bukti, dan cara mencatat hasil di sini tetap berlaku. Setiap prompt yang ditempel pemilik memberi izin satu kasus/satu draft internal saja; keputusan kampanye bukan blanket approval untuk 30 Write. Tidak ada persetujuan `ready` atau publikasi. Reviewer tidak memeriksa URL per fakta, tetapi plugin/server tetap menjalankan kebijakan sumber. Jika ada pertentangan operasional antara addendum ini dan langkah baseline v7 di bawah, ikuti v1; jangan menulis ulang record historis.

**Status historis sampai 27 Oktober 2026:** kelima format pilot telah dicoba. Dua baseline menyimpan draft, satu baseline EAC gagal pada render lalu koreksinya menyimpan draft, dan baseline CMP/MVF serta satu direct-save MVF tertahan pada sumber. Dua retest terfokus setelah perubahan plugin/backend yang dilaporkan—[`MVF`](runs/PILOT-MVF-01-retest-v026-01.md) dan [`CMP`](runs/PILOT-CMP-01-retest-v026-01.md)—keduanya menyimpan draft dan cocok pada `get_post`; versi runtime persis dalam sesi tetap `UNVERIFIED`. Kelima format kini mempunyai sekurangnya satu bukti penyimpanan draft, tetapi hasil baseline yang gagal/tertahan tetap berlaku. Pada saat itu, tiga puluh kasus utama `NOT RUN`; [keputusan eksekusi final saat itu](summary.md#keputusan-eksekusi-final--hemat-waktu) meminta sintesis, bukan ekspansi otomatis. **Tujuan:** menguji kualitas naskah **dan** alur live hingga draft tersimpan, bukan seluruh 33 tool, approval `ready`, tampilan/video 13 detik, publikasi Facebook, atau prediksi views. Rencana enam task awal ada di [rencana](../../../plans/trivia-editorial-evaluation-plan.md); [Page setup](page-setup.md) adalah prasyarat, audit pola referensi ada di [sintesis](references/synthesis.md), dan progres kampanye dilacak di [Issue #47](https://github.com/milyarderpro/content-producer/issues/47).

**Pengecualian retest yang sudah dijalankan (26 Oktober 2026):** [`PILOT-MVF-01/direct-save-01`](cases.md#pilot-mvf-01--retest-direct-save-01-v8-di-luar-baseline) memakai prompt singkat yang sejak awal meminta satu draft tersimpan pada Page uji, tanpa checkpoint GO. Retest/kohort `v8-direct-save` tetap terpisah dari baseline `v7`; hasilnya `BLOCKED / POLICY_HOLD` pada reservasi, tanpa `save_post` atau draft. Jeda GO tidak menjelaskan seluruh kegagalan. Jangan mengulang retest ini dengan key baru. Larangan ekspansi saat itu adalah keputusan historis; kasus MAIN baru kini mengikuti [direct-save v1](main-direct-save-v1.md), sedangkan aturan rekonsiliasi respons Write hilang tetap berlaku.

**Addendum retest setelah perbaikan (27 Oktober 2026):** dua chat baru memakai prompt ringkas yang sejak awal mengizinkan tepat satu reservasi dan satu `save_post`, tanpa checkpoint GO. Keduanya `PASS` workflow berdasarkan laporan pemilik tentang `save_post` dan `get_post` yang cocok. Ini **bukan** penggantian diam-diam terhadap prompt baseline `v7` atau bukti bahwa akar penolakan sumber lama ditemukan. Instruksi GO pada langkah 4–5 di bawah adalah prosedur **baseline historis**, bukan syarat untuk retest `v026`. Dua retest tidak dihitung sebagai bagian dari 30 kasus utama; pada 27 Oktober masih diperlukan keputusan pemilik dan revisi protokol sebelum kampanye 30 dibuka kembali. Keputusan itu kemudian diberikan dan dicatat pada addendum aktif di atas.

## Gerbang sebelum pilot — rekam historis, bukan instruksi GO untuk retest baru

- [x] Audit tiga referensi dan matriks 35 kasus tersedia; prompt `v4` adalah baseline historis tiga pilot awal. Ketiganya acuan pola, bukan sumber fakta. Perubahan prompt berikutnya diberi revisi baru.
- [x] Owner/workspace dan Page lain dibaca ulang; usulan Page/config lengkap, slug unik, `page_unique`, `make_default: true` (default niche pada Page baru), serta dampak data disetujui untuk **payload `create_page` yang tepat**. Bukti di [preflight](preflight.md).
- [x] Page dibuat sekali dan dibaca kembali; lima format, semua target pasar, `en-US`, `config_updated_at` utuh, dan config penuh cocok dengan payload. Bukti di [preflight](preflight.md).
- [x] Tiga pilot melaporkan koneksi owner OAuth `mcpku2` dan tool READ/WRITE yang relevan berfungsi; signature dedup `comparison_direction` harus tetap diperiksa pada kasus berikutnya. Versi runtime yang tidak bisa dibuktikan diberi `UNVERIFIED`, bukan ditebak, dan dibatasi dalam interpretasi sebelum–sesudah.
- [x] Selisih ceiling frozen–source pada [Page setup](page-setup.md#selisih-batas-karakter-yang-diketahui-sebelum-baseline) dicatat sebagai risiko di luar cakupan; config default yang disetujui cocok pada schema host dan readback. Ini **bukan** bukti semua batas frozen sudah terimplementasi.
- [x] Pemilik hanya memindahkan prompt dan hasil antar-chat. Reviewer menyiapkan prompt, menilai DNA dan alur tool, serta mencatat hasil/Issue. Baseline lama memakai GO untuk satu payload final; retest `v026` memakai izin satu reservasi dan satu `save_post` langsung dalam prompt awal. Tidak ada persetujuan massal 35 kasus, `approve_post`, publikasi, release, atau cleanup otomatis.
- [x] Lokasi `results.jsonl`, `runs/<case_id>-<attempt_id>.md`, aturan sanitasi, dan dua verdict ditetapkan. Kelima format pilot telah dicoba; baseline dua format tertahan saat reservasi, lalu masing-masing mempunyai retest tersimpan. **Pada status historis ini**, keputusan perluasan 30 kasus belum diberikan; status terkini berada pada addendum aktif di awal dokumen.
- [x] Hasil preflight Page/config, izin `create_page`, dan keputusan Page `PASS`/pilot `NO-GO` terdokumentasi terpisah di [preflight](preflight.md); `results.jsonl` tidak dipakai untuk mengklaim Page sudah dibuat.

Jika satu butir belum dipenuhi, jangan menyebut kampanye siap dieksekusi hanya karena dokumen dan prompt sudah ada.

## Peran dan urutan baseline historis — bukan prosedur uji baru

Langkah 1–6 di bawah merekam desain checkpoint GO untuk baseline `v7`. Dua retest `v026` memakai izin direct-save dalam prompt awal, sebagaimana dicatat di atas. **Pada 27 Oktober belum ada prosedur aktif untuk 30 kasus utama**; keputusan mode dan protokol baru kini ada pada [direct-save v1](main-direct-save-v1.md). Jangan menyalin langkah GO historis ke prompt direct-save.

1. Selesaikan [preflight Page uji](page-setup.md): `create_page` baru dilakukan setelah pemilik menyetujui payload tepat; verifikasi seluruh config, trivia sebagai niche default pada Page baru, dan Page/config ID melalui readback. `make_default` **bukan** pengaturan default Page workspace. Page bukan aset Facebook. Catat kohort baseline: Page ID, config lengkap dan `config_updated_at`, plugin release/schema host serta backend yang benar-benar dapat dibuktikan (selain itu `UNVERIFIED`).
2. Di chat baru, pastikan plugin PRIVATE terikat ke koneksi owner OAuth `mcpku2` yang sama dan metadata tool yang terlihat tidak usang. Khusus dedup, `qualifiers.comparison_direction` harus required dengan delapan enum tertutup sesuai [ontologi](../../../plugin/skills/content-producer/references/niches/trivia/dedup-ontology.md); jangan mengubah `numbers.unit: null` menjadi `count` hanya agar pencarian lolos. Bila signature host berbeda dari kontrak/runtime, hentikan pilot sebagai `PREREQUISITE`, bukan mencoba payload spekulatif.
3. Reviewer memberikan **satu** prompt kasus dari [`cases.md`](cases.md), mengganti placeholder Page ID, dan mencatat teks prompt final. Setiap perubahan instruksi setelah `v4` memakai revisi prompt baru yang dilabeli; jangan menimpa bukti baseline lama. Kelima format pilot sudah dicoba; 30 kasus utama tetap `NOT RUN` sampai hasilnya ditriase dan keputusan perluasan dibuat.
4. Pemilik membuka **chat baru untuk setiap kasus** dengan hanya plugin PRIVATE Content Producer dan koneksi owner OAuth `mcpku2` yang sudah ada. Peran pemilik hanya menempel prompt yang reviewer siapkan dan meneruskan hasil chat pilot. Reviewer, bukan pemilik, menilai preview dan memberi satu keputusan GO/STOP. GO yang diteruskan pemilik berlaku hanya untuk Page, set fakta, dan teks editorial `content_payload` yang ditampilkan pada kasus itu: tepat satu reservasi dan satu `save_post`, tanpa permintaan izin percakapan kedua. Kontrol persetujuan host tetap berlaku. Persetujuan rencana tidak mengotorisasi 35 kasus sekaligus.
5. Dalam **satu alur dan satu chat**, plugin mengambil generation context, meneliti sumber, menilai dedup, memilih fakta, menulis copy, dan memfinalkan **set fakta serta bagian editorial `content_payload` sebelum meminta GO**. `canva_copy` harus cocok persis dengan hasil renderer dari hook, fakta berurutan, dan CTA; untuk `plain_lines`, pemisah antarkomponen adalah `\n\n`. Tampilkan preview, urutan fakta, `content_payload` tersanitasi, dan ringkasan reservasi. Sesudah GO, jangan merakit ulang atau mengubah teks editorial. ID/token binding dan metadata teknis `save_post` yang memang belum tersedia sebelum reservasi diisi hanya dari respons server; bila fakta/teks berubah, berhenti. Ambil generation context terbaru **tepat sebelum setiap fact-bearing Write**; pertahankan enam digit mikrodetik `config_updated_at` sebagai teks. Jalankan reservasi lalu paling banyak satu `save_post` dengan `content_payload.text_metrics: {}`. Setelah sukses, `get_post` membuktikan Page, copy, status `draft`, revision/hash, dan checks; metrics server adalah otoritatif. Bila konfigurasi berubah atau Write tidak pasti, berhenti tanpa operasi baru. Jangan `approve_post`, `revise_post`, posting, Canva, atau metrik dalam baseline.
6. Pemilik meneruskan **hasil chat pilot apa adanya** sampai stop/readback; ia tidak perlu memilih potongan bukti, mengaudit URL, mencatat file, atau mengelola Issue/PR. Reviewer menyimpan prompt final, copy pertama, keputusan GO, jejak tool/error, hasil readback, dan verdict editorial/workflow yang terpisah setelah sanitasi. “Pertama” berarti kandidat copy pertama yang tampak sebelum revisi. Copy yang gagal disimpan tetap `UNSAVED`. Revisi atau retest memiliki record dan izin baru.

Satu percakapan = satu skenario dan paling banyak **satu draft baru** dalam baseline. `save_post` yang terkonfirmasi ditambah `get_post` readback yang cocok (Page, post ID, status, revision/hash, format, copy/fakta) memberi workflow `PASS`, walaupun checks editorial/system masih mencatat masalah. Respons HTTP 200, izin host, teks rapi, atau pesan “saved” tanpa state bukan bukti. Respons Write yang hilang adalah `UNCONFIRMED` sampai rekonsiliasi; pertahankan `operation_key` dan payload semantik yang sama saat replay yang sah, jangan mereservasi/menyimpan ulang dengan key baru. Jika fakta tereservasi tetapi draft tidak jadi disimpan, rekonsiliasi dahulu lalu ikuti jalur `trivia_release_facts` dengan izin tepat; catat `reserved_until` secara aman tanpa token. Tidak ada approval atau publikasi otomatis.

Untuk respons `save_post` yang hilang: cari dengan `list_posts` yang dibatasi Page uji dan waktu percobaan, lalu `get_post` untuk setiap kandidat yang relevan. Cocokkan Page, fakta, format, copy, dan identitas/metadata operasi yang memang tersedia; jangan menyimpulkan “tidak tersimpan” hanya karena satu pencarian kosong atau menganggap post lain sebagai hasil percobaan. Bila satu draft cocok secara meyakinkan, catat readback tersebut dan **jangan ulangi Write**. Bila hasilnya kosong, ambigu, atau belum konsisten, tandai `UNCONFIRMED`/`BLOCKED`; tindak lanjut hanya memakai operation key dan payload semantik yang persis sama, setelah otorisasi operasi itu tetap berlaku dan risiko duplikasi ditinjau. Jangan melepaskan reservasi selama status save belum pasti. Catat bukti kecocokan/ketidakpastian tanpa menyimpan key atau token mentah.

Jika operation key atau payload semantik asli tidak lagi tersedia dalam sesi aman, **jangan membuat key baru untuk retry**; pertahankan `UNCONFIRMED` dan minta rekonsiliasi/keputusan baru. Aturan yang sama berlaku untuk respons `create_page` yang hilang.

**Tidak semua kasus wajib menghasilkan draft.** Bila klaim/sumber tidak memenuhi ambang, topik R3 ditolak, dedup tetap `uncertain`, atau pemilik tidak menyetujui payload, hentikan dengan `BLOCKED`/`POLICY_HOLD` atau `PERMISSION` yang jujur; itu dapat menunjukkan guardrail bekerja, bukan otomatis defect tool. Sebaliknya, penolakan validasi atas payload yang seharusnya disusun benar dapat menjadi `FAIL` alur plugin/pemetaan, tetapi jangan menuduh RPC rusak tanpa bukti. Uji ini menargetkan hingga 35 draft, bukan menjanjikan 35 draft tersimpan.

## Matriks dan rubric

Pilot: satu kasus per lima format dengan topik yang berbeda dari kasus utama pada format yang sama; ini mengurangi tabrakan dedup akibat draft pilot tersimpan. Utama: enam kasus per format, empat permintaan format eksplisit **terpandu** dan dua uji pemilihan format implisit **minimal**. ID, tema, format yang diharapkan, serta teks prompt dibekukan dalam `cases.md` sebelum pilot. Kasus implisit tidak menyebut nama format, jumlah fakta, hook, CTA, atau layout; ekspektasinya dicatat oleh reviewer, bukan diberikan kepada plugin. Alternatif format yang masuk akal tidak otomatis `FAIL`: nilai alasan pemilihan, batas Page config, dan `format_fit` aktual. Laporkan hasil terpandu dan minimal **terpisah**. Pilot mengkalibrasi proses dan keamanan Write, tidak dicampur ke denominator 30 kasus utama. Jika pilot gagal atau terhenti, hentikan ekspansi, triase, dan minta keputusan sebelum 30 kasus.

Gerbang pilot → utama: kelima format sudah dicoba dan dinilai; untuk setiap format harus ada sekurangnya satu draft pilot yang tersimpan dan cocok pada readback, atau keputusan tertulis pemilik untuk melanjutkan dengan bukti format tersebut tetap terbatas. Tidak boleh ada insiden Write yang belum direkonsiliasi atau risiko sumber/keamanan kritis yang belum ditriase. Kelemahan editorial yang teramati tidak otomatis dihapus melalui revisi baseline; pemilik memutuskan lanjut/ubah/berhenti setelah melihatnya. Tanpa keputusan perluasan ini, 30 kasus tetap `NOT RUN`.

Urutan 30 kasus utama dibekukan untuk mengurangi bias “semua prompt minimal di akhir”: enam putaran suffix `01`, `05`, `02`, `06`, `03`, `04`; setiap putaran berurutan `SSF`, `TUT`, `EAC`, `CMP`, `MVF`. ID kasus bukan urutan kronologis. Catat `recent_variety`/alokasi yang relevan dari context karena Page yang sama berubah setelah setiap draft. Beberapa tema lintas format sengaja berdekatan (misalnya gajah atau anjing); duplicate/reuse denial yang benar bukan defect tool. Jangan mengganti urutan atau topik tanpa record deviasi.

Jangan mengubah prompt, topik, format, atau Page config diam-diam untuk menyelamatkan satu hasil. Jika satu kasus tidak feasible, catat percobaan asli sebagai `BLOCKED`/`FAIL` menurut bukti; usulan pengganti diberi ID/revisi protokol baru dan dilaporkan **di luar denominator baseline** sampai pemilik menyetujui perubahan matriks. Perubahan config/plugin/schema host/backend yang relevan di tengah kohort juga menghentikan baseline sampai dampaknya ditinjau; jangan menggabungkan versi yang berbeda menjadi satu angka tanpa stratifikasi.

Periksa kriteria kritis yang dapat dinilai dari naskah dan hasil server: makna/qualifier, waktu/as-of, keselamatan, caption tanpa klaim baru, dan risiko penyalinan yang tampak. Plugin tetap wajib meneliti sumber independen dan server tetap menegakkan kebijakan fakta. **Reviewer kampanye ini tidak membuka atau mengaudit URL sumber per fakta**; keberadaan tautan atau klaim plugin “verified” bukan verifikasi sumber independen oleh reviewer. Catat `source_supported` sebagai status yang dilaporkan plugin/server dan batas bukti `UNVERIFIED` pada sisi reviewer bila tidak ada verifikasi independen. Jangan menyimpulkan layak terbit hanya dari skor DNA atau status draft. Catat **system_checks server aktual** secara terpisah dari penilaian editorial.

Skor DNA 0–2 per unsur: jangkar familiar, kejutan bermakna, spesifisitas, koherensi koleksi, scanability, dan utilitas/emosi. 10–12 = `KUAT`, 8–9 = `PERLU REVISI`, 0–7 = `LEMAH`. Nilai juga gaya English `en-US` yang natural bagi US/UK/CA/AU, pilihan kata umum, satu klaim utama per baris, hook jujur, CTA tunggal yang relevan, dan kesesuaian kontrak format. Jumlah fakta/kata format adalah preferensi; jangan menyamakan estimasi reviewer dengan `text_metrics` server. Evaluasi **diagnostik tanpa ambang lulus/gagal plugin**.

| Unsur DNA       | 0                                        | 1                                              | 2                                                     |
| --------------- | ---------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| Familiarity     | Jangkar tidak jelas/asing tanpa konteks  | Dikenal sebagian pembaca atau perlu penjelasan | Objek/situasi segera dikenali pembaca umum            |
| Surprise        | Datar, filler, atau shock tidak berdasar | Ada kontras menarik tetapi tidak konsisten     | Beberapa kontras bermakna yang didukung bukti         |
| Specificity     | Dominan kabur/absolut                    | Sebagian konkret, sebagian terlalu umum        | Detail konkret dengan qualifier yang diperlukan       |
| Coherence       | Fakta acak atau tema bergeser            | Mayoritas terkait, ada satu penyimpangan       | Seluruh baris mendukung satu subjek/perangkat jelas   |
| Scanability     | Padat, berbelit, atau bahasa rusak       | Dapat dibaca tetapi ritme tidak rata           | Kalimat natural, satu ide utama/baris, cepat dipindai |
| Utility/emotion | Tidak memberi nilai atau manipulatif     | Manfaat/emosi lemah                            | Manfaat praktis atau rasa ingin tahu/emosi yang wajar |

`format_fit` dinilai `FIT`, `DEVIATION`, atau `NOT REVIEWED` terhadap [lima kontrak format](../../../plugin/skills/content-producer/references/niches/trivia/formats.md): satu subjek 7–8 fakta pendek; utilitas 5–6 kondisi/tindakan/hasil; hewan emosional 7–8 perilaku teramati dalam satu payung; comparison 5–8 fakta dengan perangkat/metrik perbandingan sejajar; myth 5–7 koreksi atas mitos yang benar-benar dikenal. Angka dan panjang preferensi editorial; batas keras ditentukan system checks server pada draft tersimpan. Catat penyimpangan yang spesifik; jangan menilai format implisit salah hanya karena topiknya sukar tanpa menimbang alternatif yang dipilih.

## Record dan bukti

`results.jsonl` adalah indeks satu objek per **percobaan** yang telah dijalankan: satu baseline per case ID, sedangkan retest memakai `attempt_id` berbeda tanpa menimpa baseline. Berkas kosong berarti belum ada tes, bukan `PASS`. Salin [template bukti](run-template.md) ke `runs/<case_id>-<attempt_id>.md` setelah hasil diterima; simpan prompt yang benar-benar ditempel, trace aksi, copy pertama yang terlihat, dan readback terpisah dari pesan model. Field indeks wajib:

```json
{
  "case_id": "MAIN-SSF-01",
  "attempt_id": "baseline",
  "cohort_id": null,
  "run_at": null,
  "prompt_revision": "v4",
  "prompt_mode": "guided_explicit",
  "page_public_id": null,
  "config_updated_at": null,
  "context_recent_variety_evidence": null,
  "format_expected": "single_subject_fast",
  "format_selected": null,
  "format_selection_rationale": null,
  "execution_status": "NOT RUN",
  "block_reason": null,
  "stop_category": null,
  "workflow_verdict": "NOT RUN",
  "last_completed_stage": null,
  "failure_stage": null,
  "save_post_outcome": "NOT CALLED",
  "readback_outcome": "NOT RUN",
  "persisted_post_public_id": null,
  "editorial_basis": "NONE",
  "evidence_level": "NOT RUN",
  "plugin_version": "UNVERIFIED",
  "plugin_version_evidence": null,
  "backend_version": "UNVERIFIED",
  "backend_version_evidence": null,
  "prompt_evidence": null,
  "first_visible_copy_evidence": null,
  "saved_copy_evidence": null,
  "claim_source_evidence": [],
  "critical_checks": null,
  "critical_findings": [],
  "server_checks_evidence": null,
  "dna_scores": null,
  "format_fit": "NOT REVIEWED",
  "editorial_outcome": "NOT REVIEWED",
  "review_notes": "Contoh bentuk record saja; bukan hasil pengujian."
}
```

`execution_status` memakai `NOT RUN`, `COMPLETED`, atau `BLOCKED` untuk jalannya kasus, **bukan** kualitasnya: `COMPLETED` berarti percobaan menghasilkan bukti cukup untuk verdict workflow `PASS` atau `FAIL`, meskipun draft gagal; `BLOCKED` berarti prasyarat/izin/bukti belum cukup untuk menuntaskan percobaan. `workflow_verdict` memakai `PASS`, `FAIL`, `BLOCKED`, atau `NOT RUN`: `PASS` memerlukan sukses `save_post` **dan** `get_post` readback yang cocok; `FAIL` memerlukan bukti alur valid tidak mencapai state yang diharapkan; `BLOCKED` untuk prasyarat, izin, safe policy hold, atau state yang belum pasti. `stop_category` memakai `POLICY_HOLD`, `PERMISSION`, `PREREQUISITE`, `UNCONFIRMED`, atau `WORKFLOW_ERROR` bila alur terhenti, selain itu `null`. `last_completed_stage`/`failure_stage` memakai tahap nyata seperti `PAGE_CONTEXT`, `RESEARCH`, `DEDUP`, `RESERVATION`, `COMPOSITION`, `SAVE`, atau `READBACK`. Jika berhenti di `DEDUP`, jangan menandai kegagalan `save_post`.

`editorial_basis` bernilai `PERSISTED`, `UNSAVED`, atau `NONE`. Skor editorial boleh diberikan pada copy unsaved yang benar-benar terlihat, tetapi tidak dicampur dengan skor draft tersimpan; jika tidak ada naskah, `NOT REVIEWED`. Ini mengukur **copy pertama yang dapat diamati**, bukan kandidat internal model yang tidak tampak. `prompt_mode` memakai `guided_explicit`, `minimal_implicit`, `pilot_guided`, atau `pilot_direct_save` untuk retest dengan izin satu draft sejak prompt awal. `evidence_level` memakai `LIVE_OWNER_REPORTED` bila transkrip dan readback pemilik cukup, `CI/FIXTURE` untuk pemeriksaan terpisah, atau `NOT RUN`; jangan menyamakan laporan owner dengan observasi langsung reviewer. Isi versi plugin/backend hanya dari bukti sesi/runtime yang terlihat; selain itu `UNVERIFIED`. Catat pemetaan sumber yang dilaporkan plugin tanpa audit URL per fakta oleh reviewer. Simpan respons dan trace lengkap secara semantik setelah sanitasi, hasil Write, serta hasil `get_post`; jangan simpan token, credential, reservation/claim token, PII, atau URL/ID Facebook fiktif.

## Sintesis, Issue, dan retest

Semua kasus tetap tercatat, termasuk naskah kuat yang gagal disimpan dan naskah lemah yang berhasil disimpan. Sintesis menghitung kedua sumbu per format, memisahkan prompt terpandu/minimal, `PERSISTED`/`UNSAVED`, dan policy hold; denominator rencana 30 berbeda dari jumlah draft berhasil. Satu Issue payung menautkan kampanye; Issue khusus dibuat untuk critical editorial finding yang terbukti, kelemahan gaya/format pada sedikitnya dua kasus, atau kegagalan workflow valid dengan bukti yang cukup. Penolakan server yang benar atas payload tidak sah **bukan otomatis bug server**; triase materi, instruksi/pemetaan plugin, dan tool/RPC. Hubungkan temuan yang relevan dengan [Issue #26](https://github.com/milyarderpro/content-producer/issues/26) tanpa mengasumsikan akar sebab sama. Untuk save response yang hilang, rekonsiliasi state dan gunakan hanya replay same-key/same-payload yang sah. Perubahan plugin/backend memerlukan PR fokus, pemeriksaan sesuai risiko, dan retest live setelah versi terpasang diverifikasi. Kasus terdampak diulang bersama satu regresi dan satu kasus baru per format; draft pertama lama tetap baseline. Jika alokasi fakta di Page baseline memblokir pengulangan kasus yang sama, retest terkontrol memerlukan **Page retest baru dengan config ekuivalen dan `page_unique`**, hanya setelah izin `create_page` tersendiri; jangan membuang draft lama atau mengubah fakta untuk memaksa hasil. Catat perubahan waktu/sumber sebagai faktor pembaur. `FIXED` hanya setelah retest, bukan setelah PR/CI.
