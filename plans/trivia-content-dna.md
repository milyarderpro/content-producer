# Trivia Content DNA — Content Producer MVP

## 1. Informasi dokumen

| Bagian | Keterangan |
|---|---|
| Nama produk | Content Producer |
| Modul | Trivia |
| `niche_key` | `trivia` |
| Versi DNA | 1.0 |
| Module/config/content version awal | 1 |
| Status | Frozen — baseline editorial MVP Phase 0 |
| Tanggal keputusan | 7 Oktober 2026 |
| Langkah Phase 0 | 0.7 — Trivia Content DNA |
| Target utama | Static information Reel sekitar 13 detik |
| Target audiens | US, UK, CA, AU, dan pembaca global |
| Bahasa | Natural neutral American English (`en-US`) |

Dokumen ini menetapkan perilaku editorial, content architecture, topic pillars, format, language style, source policy, dedup ontology, quality rubric, examples, anti-examples, dan evaluation fixtures untuk modul trivia MVP.

Dokumen ini tidak menjadikan virality atau jutaan views sebagai hasil yang dapat dijamin. DNA digunakan untuk menghasilkan konten yang konsisten dengan pola referensi viral sambil memperbaiki akurasi, keamanan, keterbacaan, dan originality.

---

## 2. Kedudukan dan batas kewenangan

Dokumen ini mengikuti:

1. Scope dan acceptance criteria pada `plans/PRD.md`.
2. Kontrak generik pada `plans/module-contract.md`.
3. Invariant data pada `plans/database-design.md`.
4. Keputusan `FACT-*` dan `QUALITY-*` pada `plans/phase-0-decision-register.md`.

Jika terjadi konflik:

- Database dan module contract tetap berwenang atas integrity, lifecycle, versioning, dedup, reservation, dan security.
- Dokumen ini berwenang atas behavior editorial trivia dan evaluasinya.
- ChatGPT melakukan research, semantic comparison, penulisan, dan editorial attestation.
- Server menghitung checks deterministik dan tidak mengklaim telah membuktikan judgment editorial.
- Owner approval tetap diperlukan untuk menjadikan post `ready`.

Langkah 0.7 hanya mengubah dokumentasi. Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.

---

## 3. Dataset referensi dan metodologi

### 3.1 Dataset yang dianalisis

| Dataset | Account | Record | Peran |
|---|---|---:|---|
| `post-coriousmind.txt` | Curious Mind | 55 | Single-subject, themed, dan mixed fast trivia |
| `post-dyk.txt` | dyk | 103 | Fast trivia, animals, science, body, history, utility |
| `post-dailyfacts.txt` | Daily Facts | 18 | Practical utility, places, dan longer explanatory lines |
| **Total** | 3 account | **176** | Pattern reference |

Terdapat 171 exact-unique content bodies. Duplicate record dan cross-post duplicate dipertahankan sebagai sinyal risiko dedup, bukan dianggap contoh tambahan yang independen.

Dataset telah dipilih pengguna dari post yang memiliki jutaan views. Dataset tidak mencakup seluruh populasi post dari setiap account sehingga tidak dapat digunakan untuk menghitung success rate, causal lift, atau jaminan performa.

### 3.2 Fungsi dataset

Dataset boleh digunakan untuk mempelajari:

- Topic dan subject selection.
- Content architecture.
- Fact count dan density.
- Hook dan CTA shape.
- Sentence rhythm.
- Surprise mechanism.
- Practical versus curiosity profile.
- Pola shareability, saveability, dan commentability.
- Candidate pairs untuk dedup fixtures.

Dataset tidak boleh digunakan sebagai:

- Sumber kebenaran fakta.
- Bukti medis, hukum, safety, atau scientific claim.
- Sumber yang dicantumkan pada canonical fact.
- Teks yang disalin atau diparafrasekan secara dekat.
- Bukti bahwa suatu format pasti viral.

### 3.3 Ringkasan pola kuantitatif

Distribusi utama seluruh dataset:

| Ukuran | Temuan |
|---|---|
| Hook | Hampir seluruh post memakai variasi `Did you know?` |
| Fact count | 8 fakta: 73 post; 7 fakta: 51; 6 fakta: 25; 9 fakta: 20 |
| Architecture utama | Themed: 77; single-subject: 68; mixed: 24; sisanya label turunan |
| Surprise labels | 627 high, 670 medium, 30 low |
| Dominant mechanisms | Human body, food science, records, historical oddities, animal abilities/behavior, comparisons, nature/science |

Density account:

| Account | Median fakta | Median kata per fact line | Median karakter per fact line | Median total karakter content |
|---|---:|---:|---:|---:|
| Curious Mind | 8 | 9 | 52 | 483 |
| dyk | 8 | 10 | 57 | 515 |
| Daily Facts | 6 | 14 | 87 | 578 |

Temuan tersebut mendukung dua profile MVP:

- `fast_trivia`: lebih banyak facts dengan kalimat lebih pendek.
- `practical_utility`: lebih sedikit facts dengan konteks tindakan/akibat yang sedikit lebih panjang.

### 3.4 Kelemahan dataset yang tidak boleh diwarisi

Dataset mengandung contoh:

- Klaim salah, terlalu luas, atau tidak mempunyai qualifier penting.
- Superlatif, ranking, hukum, dan statistik tanpa `as_of`.
- Health, food, pet, home-remedy, security, dan survival advice berisiko.
- Legend atau rumor yang ditulis seperti fakta.
- Gender/behavior generalization dan causal claim lemah.
- Klaim yang memakai satu wording dramatis tanpa evidence memadai.
- OCR/layout rusak, fragmen terbalik, dan kalimat terpotong.
- Duplicate content.
- CTA repetitif, emoji berlebihan, dan engagement bait.
- ALL CAPS yang tidak menambah makna.

Content Producer mengambil **struktur perhatian**, bukan kelemahan verifikasinya.

---

## 4. DNA inti trivia

Setiap post harus berusaha memiliki enam sifat berikut:

### 4.1 Familiar anchor

Subjek dapat dikenali tanpa penjelasan panjang: hewan umum, makanan, tubuh manusia, kota, negara, benda sehari-hari, fenomena alam, atau tokoh/penemuan terkenal.

### 4.2 Meaningful surprise

Fakta menarik karena salah satu mekanisme berikut:

- Membalik asumsi umum.
- Mengungkap kemampuan atau sifat yang tidak terduga.
- Memberi angka konkret.
- Memberi perbandingan yang mudah dibayangkan.
- Menjelaskan rekor dengan metric dan waktu jelas.
- Mengungkap origin/history yang tidak dikenal.
- Menunjukkan consequence praktis yang aman.

Surprise tidak boleh diciptakan dengan exaggeration, missing qualifier, atau misleading wording.

### 4.3 Atomic clarity

Satu fact line menyampaikan satu proposisi utama. Penjelasan singkat boleh ditambahkan hanya jika diperlukan agar proposisi tidak menyesatkan.

### 4.4 Coherent collection

Facts terasa sebagai satu paket, bukan kumpulan acak. Setiap line menambah angle baru dan tidak mengulang relation yang sama dengan kata berbeda.

### 4.5 Visual scanability

Pembaca dapat menangkap satu line dalam sekali pandang. Wording konkret, active, dan tidak penuh subordinate clause.

### 4.6 Interaction value

Post memberi alasan alami untuk:

- `share`: identity, emotion, atau relevance bagi orang lain.
- `save`: utility atau reference value.
- `comment`: pilihan/opini ringan yang benar-benar terkait isi.
- `follow`: promise konsisten terhadap jenis pengetahuan berikutnya.

CTA tidak boleh menjadi pengganti kualitas konten.

---

## 5. Audiens dan standar bahasa

### 5.1 Target bahasa

- Gunakan natural American English.
- Gunakan American spelling secara konsisten: `color`, `center`, `traveling`.
- Gunakan kata yang juga mudah dipahami pembaca UK, Canada, Australia, dan global.
- Hindari slang regional, idiom sempit, dan cultural shorthand tanpa konteks.
- Jangan menerjemahkan struktur Bahasa Indonesia secara literal.

### 5.2 Tone

Tone default adalah `conversational_credible`:

- Curious, not childish.
- Energetic, not breathless.
- Accessible, not simplistic.
- Credible, not academic-heavy.
- Warm, not manipulative.

Kata seperti `shocking`, `insane`, `unbelievable`, `mind-blowing`, dan `nobody tells you` tidak menjadi default. Kata tersebut hanya boleh dipakai bila secara literal akurat, tetap jujur, dan tidak berulang; preferensi MVP adalah wording yang lebih tenang.

### 5.3 Sentence style

- Gunakan active voice bila natural.
- Satu main clause lebih disukai.
- Mulai dengan subject yang jelas.
- Gunakan common verbs.
- Hindari filler: `actually`, `literally`, `basically`, `incredibly`, kecuali material.
- Hindari hedging berlapis; gunakan qualifier yang tepat.
- Jangan memakai `yes, really` sebagai substitusi evidence.
- Jangan memakai ampersand dalam prose kecuali bagian nama resmi.
- Emoji default tidak diizinkan.

### 5.4 Angka, satuan, waktu, dan wilayah

- Gunakan digit untuk angka yang menjadi curiosity anchor atau comparison.
- Gunakan comma ribuan secara konsisten.
- Gunakan unit yang natural bagi subjek; tambahkan conversion jika membantu target lintas-negara.
- Jangan menghilangkan denominator, population, location, condition, atau measurement basis.
- Gunakan `the U.S.` dan `the UK` dalam prose; market code tetap `US`, `GB`, `CA`, `AU` di data.
- Current record, ranking, law, population, price, statistic, dan office-holder claim wajib mempunyai year/`as of` bila diperlukan.
- Approximation harus terlihat melalui `about`, `roughly`, `nearly`, atau range yang didukung source.

### 5.5 Typography

- Hook canonical: `Did you know?`
- Sentence case adalah default.
- ALL CAPS bukan default walaupun sering muncul pada dataset.
- Em dash boleh dipakai secara hemat untuk concise explanation.
- Hyphen, apostrophe, dan quotation marks harus konsisten.
- Satu blank line memisahkan hook, facts, dan CTA melalui renderer.
- Tidak ada markdown bullet, URL, source label, database ID, atau internal note dalam Canva copy.

---

## 6. Topic pillars dan bobot awal

### 6.1 Pilar 1 — Animals dan pet safety: 30%

Topic keys:

- `animals`
- `pet_safety`

Angle prioritas:

- Senses dan physical abilities.
- Communication dan social behavior.
- Adaptation dan anatomy.
- Human-animal comparison yang akurat.
- Counterintuitive pet risk dengan veterinary evidence kuat.

Hindari anthropomorphism sebagai fakta. Wording seperti `animals feel`, `mourn`, `love`, atau `understand` harus mencerminkan evidence dan tidak melebihkan interpretation.

### 6.2 Pilar 2 — Human body, food science, dan myth-busting: 20%

Topic keys:

- `human_body`
- `food_science`

Angle prioritas:

- Anatomy dan measurable functions.
- Sensory/physical phenomena.
- Stable biological comparison.
- Food classification dan chemistry.
- Correction terhadap misconception yang jelas.

Tidak boleh berubah menjadi diagnosis, treatment, disease-prevention promise, diet advice, atau universal health claim.

### 6.3 Pilar 3 — Practical utility dan food storage/home: 15%

Topic keys:

- `food_storage_home`
- `practical_utility`

Angle prioritas:

- Low-risk storage practices.
- Material/temperature/moisture effects.
- Safe household explanation.
- Simple behavior with clear consequence.

Utility harus benar-benar berguna, bukan hack spektakuler tanpa evidence. Food safety, chemicals, fire, security, first aid, dan survival membutuhkan policy sensitif atau dikeluarkan.

### 6.4 Pilar 4 — Places dan geography: 15%

Topic key:

- `geography`

Angle prioritas:

- Border/geographic oddity.
- City/state/country scale.
- Infrastructure dan landmark records.
- Place-name origin.
- Easily visualized distance/area comparison.

Ranking dan superlative harus menyebut metric serta konteks waktu. Local content harus tetap dapat dipahami pembaca di luar negara tersebut.

### 6.5 Pilar 5 — Nature dan space/science: 10%

Topic key:

- `nature_science`

Angle prioritas:

- Extreme scale.
- Physical phenomenon.
- Ecology dan adaptation.
- Astronomy comparison.
- Counterintuitive material/natural behavior.

Hindari apocalyptic framing, unsupported ecological dependency, dan absolute causal claim.

### 6.6 Pilar 6 — History, origins, inventions, dan people: 10%

Topic keys:

- `history_origins`
- `inventions_everyday`

Angle prioritas:

- Unexpected origins.
- Early versions atau rejected ideas.
- Everyday-object history.
- Documented unusual habit atau career.
- Timeline comparison.

Legend, rumor, dan disputed anecdote harus diberi label yang jujur atau tidak digunakan.

### 6.7 General trivia

Topic key `general_trivia` digunakan untuk mixed collection yang tetap memiliki editorial spine, misalnya:

- Everyday misconceptions.
- Things with misleading names.
- Unexpected scale comparisons.
- Familiar objects with strange origins.

`general_trivia` bukan izin menggabungkan kandidat sisa secara acak. Setiap fact tetap dipetakan ke underlying topic group untuk analytics dan variety check.

### 6.8 Topic selection rules

- Bobot adalah starting mix, bukan quota kaku untuk setiap batch kecil.
- Dalam kalender, hindari subject, relation, dan emotional beat yang sama secara berdekatan.
- Performance dapat menyesuaikan bobot setelah sample size dan post age cukup.
- Satu post tidak boleh dipilih hanya karena topiknya pernah viral; candidate strength dan source quality tetap menang.
- Niche selain trivia tidak boleh masuk melalui `general_trivia`.

---

## 7. Content architecture

Architecture adalah bentuk koleksi; `format_key` adalah behavior editorial yang lebih spesifik.

### 7.1 `single_subject`

Semua facts membahas satu entity/subject familiar dari angle berbeda.

Kelebihan:

- Coherence tinggi.
- Subject mudah dipakai pada hook/caption/CTA.
- Cocok untuk animals, body parts, foods, countries, dan inventions.

Risiko:

- Repetitif.
- Facts lemah ditambahkan hanya untuk memenuhi kuota.
- Beberapa lines menjadi variasi klaim yang sama.

### 7.2 `themed`

Facts membahas beberapa entity dalam satu functional atau conceptual theme.

Contoh theme:

- Food storage mistakes.
- Unusual borders.
- Animal communication.
- Objects invented for unexpected reasons.

Theme harus cukup sempit sehingga pembaca dapat menjelaskan hubungan seluruh facts dalam satu kalimat.

### 7.3 `mixed`

Facts berasal dari beberapa domain tetapi terikat satu editorial device, misalnya myth reversal atau scale comparison.

Mixed tidak boleh menjadi daftar fakta acak. Maksimum domain switching harus tetap menghasilkan rhythm dan tidak menurunkan source quality.

### 7.4 Architecture–format compatibility

| Format | Single-subject | Themed | Mixed |
|---|---:|---:|---:|
| `single_subject_fast` | Ya | Tidak | Tidak |
| `themed_utility` | Opsional | Ya | Tidak |
| `emotional_animal_collection` | Ya | Ya | Tidak |
| `comparison` | Ya | Ya | Ya, jika comparison device konsisten |
| `myth_vs_fact` | Ya | Ya | Ya, jika misconception device konsisten |

Architecture disimpan pada generation snapshot untuk evaluasi dan analytics, walaupun `format_key` tetap menjadi dimensi utama.

---

## 8. Lima format editorial

### 8.1 `single_subject_fast`

**Tujuan:** curiosity/follow melalui deep-but-fast exploration satu subject.

**Default profile:** `fast_trivia`.

**Preferred:**

- 7–8 facts.
- 8–11 kata per fact.
- Minimal 3 high-surprise facts untuk 7–8 facts.
- Angle mix: anatomy/property, behavior/function, comparison/number, history/origin, one closing standout.

**Sequence:**

1. Strong accessible surprise.
2. Familiar misconception atau vivid ability.
3. Different mechanism.
4. Concrete number/comparison.
5. Less obvious context.
6. Emotional/practical beat jika relevan.
7. Strong closing fact.

**Jangan:** mengulang subject name secara mekanis pada setiap line bila pronoun tetap jelas; jangan menambah weak filler untuk mencapai 8.

### 8.2 `themed_utility`

**Tujuan:** save/share melalui low-risk practical knowledge.

**Default profile:** `practical_utility`.

**Preferred:**

- 5–6 facts.
- 10–14 kata per fact.
- Setiap line memiliki object + condition/action + outcome.
- One practical theme; no random curiosity filler.

**Sequence:**

1. Most broadly useful item.
2. Common mistake.
3. Counterintuitive method.
4. Explanation or condition.
5. Another familiar item.
6. Memorable closing save-worthy line.

**Jangan:** memberi instruction berisiko, precise safety guarantee, home remedy, fire/security/survival hack, atau food handling rule tanpa policy sensitif dan authoritative sources.

### 8.3 `emotional_animal_collection`

**Tujuan:** share/follow melalui wonder, empathy, dan recognizable animal behavior.

**Default profile:** `fast_trivia`.

**Preferred:**

- 7–8 facts.
- Satu species atau satu theme behavior yang jelas.
- Mix cognition, communication, senses, social behavior, dan physical ability.
- Emotion berasal dari observed behavior, bukan human motive yang diasumsikan.

**Sequence:** curiosity → relatable behavior → unusual ability → social/emotional peak → memorable close.

**Jangan:** memakai `loyal`, `jealous`, `mourns`, `gives gifts`, `protects`, atau psychological verb lain tanpa source dan qualifier yang sesuai.

### 8.4 `comparison`

**Tujuan:** share/comment melalui scale, contrast, dan side-by-side understanding.

**Default profile:** `fast_trivia`, dengan 5–8 facts sesuai complexity.

**Preferred:**

- Comparison basis konsisten.
- Unit, direction, population, place, atau time period jelas.
- Parallel grammar membantu scanning.
- Vivid reference dipakai jika tidak menyesatkan.

Comparison types:

- A versus B.
- Then versus now.
- Object versus familiar scale.
- Record/measurement sequence.
- Classification contrast.

**Jangan:** membandingkan metric berbeda, memilih denominator manipulatif, menghilangkan year, atau memakai `largest/best/most` tanpa basis.

### 8.5 `myth_vs_fact`

**Tujuan:** comment/save melalui correction terhadap belief familiar.

**Default profile:** `fast_trivia` atau `practical_utility` sesuai subject.

**Preferred:**

- 5–7 corrections.
- Myth harus benar-benar umum atau dinyatakan sebagai misconception, bukan straw man.
- Fact line langsung menyatakan correction dan reason singkat bila diperlukan.
- Wording tidak memperkuat myth dengan mengulangnya secara dramatis.

Template:

```text
[Common belief] isn't quite right—[accurate correction].
```

**Jangan:** membuat medical/health myth content tanpa evidence yang memenuhi sensitive-source policy; jangan mengubah uncertain research menjadi definitive correction.

---

## 9. Length profiles dan density

### 9.1 `fast_trivia`

| Attribute | Preferred |
|---|---:|
| Facts | 7–8 |
| Kata per fact | 8–11 |
| Total Canva words | 65–85 |
| Fact line chars | Target sekitar 45–70; hard config berlaku |
| Architecture | Single-subject, themed, atau structured mixed |

Profile ini mengambil rhythm Curious Mind dan dyk: cepat, satu klaim per line, dengan variety tinggi.

### 9.2 `practical_utility`

| Attribute | Preferred |
|---|---:|
| Facts | 5–6 |
| Kata per fact | 10–14 |
| Total Canva words | 65–85 |
| Fact line chars | Target sekitar 65–90; hard config berlaku |
| Architecture | Themed atau narrow single-subject |

Profile ini mengambil explanatory density Daily Facts tanpa mengikuti klaim safety yang lemah.

### 9.3 Hard readiness limits

Hard limits mengikuti QUALITY-001/002:

- Facts mengikuti Page config 5–9, atau explicit allowed waiver 1–9.
- Maksimum 18 kata per fact.
- Hook maksimum 12 kata.
- CTA maksimum 14 kata.
- Total Canva copy maksimum 100 kata.
- Maksimum 28 estimated visual lines.
- Satu fact maksimum 3 estimated visual lines.
- Hook/CTA maksimum 2 estimated visual lines.
- `replay_ratio` maksimum 2.5.
- `estimated_loops` maksimum 3.
- Component dan final character budget selalu authoritative.

Preferred range menghasilkan warning; hard limit memblokir `ready` dan tidak dapat di-waive.

### 9.4 Surprise mix

Surprise label adalah editorial signal, bukan fakta database.

Target:

- 5–6 facts: minimal 2 high-surprise.
- 7–9 facts: minimal 3 high-surprise.
- Low-surprise maksimum 1 dan hanya jika memberi context/utility penting.
- Jangan menempatkan seluruh high-surprise facts di akhir.
- Surprise tidak mengalahkan source strength.

Target berasal dari dataset yang hampir seluruhnya menggunakan high/medium surprise, tetapi tidak menjadi blocking system check karena judgment-nya semantik.

---

## 10. Pemilihan dan urutan fakta

### 10.1 Candidate scoring editorial

Setiap verified candidate diberi penilaian 0–2 pada:

- `familiar_anchor`
- `surprise_strength`
- `specificity`
- `visualizability`
- `utility_or_emotion`
- `sentence_compactness`
- `collection_fit`

Score hanya membantu selection. Score tidak membuktikan kebenaran dan tidak dapat mengalahkan source, freshness, dedup, atau safety failure.

### 10.2 Selection rules

- Pilih proposition atomic.
- Pilih angle yang saling berbeda.
- Hindari dua facts dengan subject–relation yang sama.
- Hindari facts yang hanya berbeda angka minor atau synonym.
- Angka digunakan jika menambah comprehension, bukan hanya spectacle.
- Satu post sebaiknya memiliki minimal satu fact konkret yang mudah diceritakan kembali.
- Utility post harus memiliki consequence jelas.
- Animal post menyeimbangkan ability, behavior, anatomy, dan comparison.
- Mixed post membutuhkan editorial device yang konsisten.
- Candidate dengan source paling kuat menang jika novelty setara.

### 10.3 Ordering rules

1. Fact pertama harus kuat dan mudah dipahami tanpa context panjang.
2. Dua fact pertama tidak boleh keduanya weak/setup facts.
3. Mekanisme atau sentence opening divariasikan.
4. Fact dengan qualifier lebih berat ditempatkan setelah context terbentuk.
5. Jangan menempatkan dua statistics berturut-turut jika rhythm menjadi monoton.
6. Penultimate/closing fact harus memorable, useful, emotional, atau visually vivid.
7. CTA tidak boleh menjadi fact kedelapan/sembilan terselubung.

### 10.4 Rejection rules

Candidate ditolak jika:

- Source tidak mendukung exact proposition.
- Klaim memerlukan qualifier yang membuatnya tidak lagi ringkas dan format tidak dapat menampungnya secara jujur.
- Surprise bergantung pada misleading omission.
- Claim hanya legend/rumor tanpa framing.
- Candidate duplicate, uncertain, stale, atau reuse-blocked.
- Wording tidak dapat dipadatkan tanpa kehilangan makna.
- Safety risk tidak proporsional untuk trivia card.
- Candidate hanya merupakan opinion, prediction, atau motivational statement.

---

## 11. Hook contract

### 11.1 Default

```text
Did you know?
```

Default dipilih karena:

- Sangat konsisten pada tiga dataset.
- Cepat dikenali.
- Tidak menghabiskan visual space.
- Tidak membuat unsupported promise.

### 11.2 Allowed hook families

**Neutral curiosity**

```text
Did you know?
```

**Subject promise**

```text
How much do you know about octopuses?
```

**Honest counterintuition**

```text
These everyday facts are surprisingly easy to miss.
```

**Counted value**

```text
Here are 6 food-storage facts worth saving.
```

**Myth correction**

```text
Some familiar “facts” aren't quite true.
```

### 11.3 Hook checks

- Maksimum config/hard word and character limit.
- Sesuai dengan actual subject/format/count.
- Tidak memakai fake scarcity: `before it's deleted`.
- Tidak memakai unverifiable social proof: `nobody knows this`.
- Tidak memakai fear bait.
- Tidak menjanjikan shock bila collection hanya medium surprise.
- Tidak mengandung source claim baru.
- Tidak memakai ALL CAPS sebagai default.

---

## 12. Fact-line writing contract

### 12.1 Bentuk ideal

```text
Clear subject + precise verb + surprising property + essential qualifier.
```

Contoh struktur:

```text
[Animal] can detect [signal] from [distance/condition].
[Food] lasts longer when [safe condition], because [brief mechanism].
[Place] spans [measurement]—about [familiar comparison].
[Belief] isn't accurate; [correction with scope].
```

### 12.2 Atomicity

Satu line tidak boleh menggabungkan dua proposition independen hanya karena subject sama.

Acceptable:

```text
An octopus has three hearts.
```

Needs split or rewrite:

```text
Octopuses have three hearts, blue blood, excellent memory, and can escape jars.
```

### 12.3 Meaning preservation

- Negation tidak boleh hilang.
- Correlation tidak menjadi causation.
- `may/can` tidak menjadi `does/always`.
- Some species tidak menjadi seluruh species.
- Record lokal tidak menjadi world record.
- Estimate tidak menjadi exact number.
- Legend tidak menjadi documented event.
- Current statistic tidak menjadi timeless statement.
- Safety advice tidak kehilangan condition, temperature, dosage boundary, atau jurisdiction.

### 12.4 Compression order

Saat line terlalu panjang:

1. Hapus filler.
2. Ganti phrase panjang dengan common equivalent.
3. Pindahkan nonessential context ke caption hanya jika bukan claim baru dan tidak diperlukan untuk truthfulness.
4. Gunakan angka/satuan yang lebih ringkas tanpa kehilangan precision.
5. Pilih candidate lain jika qualifier penting tidak muat.

Jangan menghapus condition, time, population, location, unit, negation, atau uncertainty yang material.

---

## 13. CTA contract

### 13.1 Interaction-goal mapping

| Goal | CTA pattern |
|---|---|
| `share` | `Share this with someone who loves animal facts.` |
| `save` | `Save this for your next grocery trip.` |
| `comment` | `Which fact surprised you most?` |
| `follow` | `Follow for more surprising facts.` |

CTA harus disesuaikan subject dan tidak perlu memakai nama Page.

### 13.2 CTA rules

- Satu line.
- Maksimum config/hard limits.
- Hanya satu primary interaction goal.
- Tidak menambah claim baru.
- Tidak menjanjikan hadiah atau benefit palsu.
- Tidak memaksa multiple actions: `like, comment, share, and follow`.
- Tidak memakai codeword engagement bait seperti `Comment MAP!` tanpa kebutuhan percakapan nyata.
- Tidak memakai `smash`, `prove`, `only smart people`, atau guilt language.
- Variasikan CTA pada kalender; jangan mengulang exact CTA secara berurutan.

### 13.3 CTA selection

- Utility → `save` lebih natural.
- Emotional animals → `share` atau `follow`.
- Comparison/myth → `comment` bila pertanyaan tidak menguji keyakinan politik/sensitif.
- General fast trivia → `follow`.

---

## 14. Caption dan hashtag contract

### 14.1 Caption

Caption:

- Maksimum 500 karakter secara default.
- Menguatkan theme tanpa menyalin seluruh Canva copy.
- Boleh mengundang refleksi ringan.
- Tidak menambah fact, number, recommendation, atau causal claim baru.
- Menggunakan locale/tone yang sama.
- Tidak memuat source URL pada public caption MVP.
- Tidak memakai clickbait yang lebih kuat daripada hook.

Template:

```text
[One-sentence theme framing] [Optional non-factual interaction prompt]
```

### 14.2 Hashtags

- Default 3; allowed 0–5.
- Unique secara case-insensitive.
- Relevan terhadap subject, format, dan Page identity.
- Gunakan readable PascalCase bila multiword.
- Hindari generic spam seperti `#Viral`, `#FYP`, atau unrelated trending tags.
- Hashtag bukan evidence dan tidak masuk Canva copy.

---

## 15. Rendering contract trivia v1

### 15.1 Default style

`plain_lines`:

```text
hook

fact 1

fact 2

...

cta
```

`numbered` hanya digunakan ketika:

- Urutan penting.
- Checklist/steps aman membutuhkan reference number.
- Comparison pairs menjadi lebih jelas.
- User secara eksplisit memilih dan budget mengizinkan.

### 15.2 Renderer authority

- Caller mengirim components, bukan final layout authoritative.
- Server merender ulang dan menghitung metrics.
- Hook, fact, dan CTA tidak boleh memiliki LF internal.
- `facts_total_chars` mencakup prefix dan separators.
- Final copy menghitung seluruh LF dan punctuation.
- Caption/hashtags terpisah.
- Renderer tidak memperbaiki grammar atau memotong teks; content harus direvisi sebelum render pass.

### 15.3 Visual rhythm

- Hindari seluruh lines dengan opening identik.
- Pertahankan line lengths relatif seimbang bila meaning memungkinkan.
- Satu line panjang dapat diterima jika facts lain pendek dan hard limits lulus.
- Jangan memadatkan dengan semicolon chain.
- Jangan menambah decorative emoji/bullets pada default template.

---

## 16. Source hierarchy dan verification policy

### 16.1 Source tiers

| Tier | Sumber | Kegunaan |
|---|---|---|
| A | Government, official dataset/document, source-owning organization, primary peer-reviewed paper, original university/scientific institution | Primary evidence |
| B | Museum, professional/scientific association, reputable reference publication, review paper, expert institution | Strong evidence |
| C | High-quality secondary media with traceable original sources | Confirmation/discovery |
| D | Social post, dataset referensi, AI output, anonymous content, aggregator, copied blog | Discovery only |

### 16.2 Minimum evidence

- Stable non-sensitive fact: minimal satu Tier A atau B yang mendukung proposition lengkap.
- Periodic/volatile fact: authoritative A/B, `as_of`, dan independent confirmation untuk angka penting, record, superlative, atau disputed claim.
- Medical, legal, financial, food safety, pet safety, survival, atau safety-related fact: minimal satu Tier A dan satu independent A/B; jika tidak tersedia, jangan gunakan.
- Dua halaman yang menyalin sumber sama bukan independent evidence.
- Source support note harus memetakan exact proposition dan qualifier.

### 16.3 Topic-specific source preference

| Topic | Preferensi |
|---|---|
| Animals/pet safety | Veterinary bodies, zoological/scientific institutions, peer-reviewed research, government animal-health sources |
| Human body | Government health/science institutions, medical associations, peer-reviewed papers, university medical sources |
| Food science/storage | FDA/USDA/CDC atau counterpart resmi, food-science institutions, peer-reviewed sources |
| Geography/places | Government/statistical offices, mapping authorities, official city/state/country institutions |
| Nature/space | NASA/NOAA/USGS atau counterpart, universities, scientific institutions, peer-reviewed sources |
| History/origins | Archives, museums, official historical institutions, primary documents, reputable reference works |
| Inventions/brands | Patent/history records, company archives for company-specific history, independent historical confirmation |

Company-owned sources dapat mendukung fact mengenai dirinya sendiri tetapi tidak otomatis cukup untuk superiority claim.

### 16.4 Freshness

| Class | Maximum expiry |
|---|---:|
| Stable | 24 bulan dari `verified_at` |
| Periodic | 12 bulan atau expected update berikutnya |
| Volatile | 30 hari default; maksimal 90 hari dengan rationale |
| Sensitive/safety | Minimum kelas di atas dan 180 hari |

Fact expired tetap historis tetapi tidak dapat reserve/save/publish sebelum re-verification.

---

## 17. Sensitive-topic policy

### 17.1 Risk classes

| Class | Contoh | Default behavior |
|---|---|---|
| R0 — stable trivia | Anatomy count, documented origin, stable geography | Standard verification |
| R1 — changing/contextual | Rankings, records, population, laws, prices | `as_of`, freshness, stronger wording control |
| R2 — safety-sensitive | Food/pet safety, health, household chemicals, survival | Two-source rule, critical review, conservative wording |
| R3 — unsuitable for MVP card | Diagnosis, dosage, treatment, legal/financial advice, dangerous hacks | Reject/out of scope |

### 17.2 Human body dan health

Allowed:

- General anatomy.
- Stable physiological function.
- Documented sensory/physical phenomena.

Disallowed:

- Disease risk reduction promises.
- Diagnosis by symptom.
- Treatment, dosage, supplement, or cure advice.
- Universal claims from small observational studies.
- Shame-based body facts.

### 17.3 Food dan pet safety

- State species/product, hazard, condition, and scope precisely.
- Do not imply all exposures have identical severity.
- Do not provide emergency treatment instructions.
- Avoid shelf-life guarantees without temperature/container conditions.
- Region-specific storage practice must reflect official guidance for target audience or explain regional difference.
- Pet safety must rely on veterinary/toxicology authority.

### 17.4 Practical utility

Reject tips involving:

- Fire-starting or improvised combustion.
- Intruder/security bypass claims.
- Water purification guarantees.
- First aid/home remedy treatment.
- Chemical mixtures with uncertain reaction.
- Unsafe food handling.
- Wilderness navigation/rescue instruction presented without context.

These patterns appear in reference data but are not inherited by MVP DNA.

### 17.5 Law, records, dan superlatives

- Law requires jurisdiction, exact scope, authoritative source, and current/as-of date.
- Historical law must be labeled historical.
- `largest`, `oldest`, `best`, `safest`, `busiest`, dan similar claims require metric, geography, and time context.
- Ranking publisher and year must be known even if not all details fit public line.
- If qualifier cannot fit honestly, select another fact.

### 17.6 Psychology dan human behavior

Psychology is not a default topic key in MVP. Reject:

- Gender stereotypes.
- Appearance/intelligence claims.
- Personality claims from unsupported statistics.
- Deterministic behavior claims.
- Mental-health advice.

Robust cognitive science may enter `nature_science` or `human_body` only with strong evidence and precise scope.

---

## 18. Dedup ontology v1

### 18.1 Canonical unit

Satu trivia fact adalah satu proposition atomic yang dapat dinilai true/false. Hook, CTA, caption, collection theme, opinion, dan wording style bukan canonical fact.

### 18.2 Structured identity fields

```text
subject_entity
subject_type
relation
object_entity_or_value
object_type
normalized_number
normalized_unit
comparison_operator_and_direction
negation
time_qualifier
location_qualifier
population_qualifier
condition_qualifier
method_or_metric
estimate_or_range_flag
scope
```

Seluruh material qualifier masuk structured key. Field kosong diserialisasi eksplisit; key order tetap.

### 18.3 Relation families

Deterministic-safe bila field lengkap:

- `has_count`
- `has_measurement`
- `is_classified_as`
- `is_located_in`
- `originated_in_time_place`
- `has_named_part_or_property`
- `holds_record_by_metric_as_of`

Selalu membutuhkan semantic review atau stricter discriminator:

- `can_perform`
- `behaves_as`
- `communicates_by`
- `affects`
- `causes`
- `reduces_or_increases_risk`
- `is_safe_or_toxic_for`
- `recommended_practice`
- `is_illegal_or_required_in`
- `is_best_or_safest`

Relation allowlist dapat berkembang hanya bersama fixture dan ontology version increment.

### 18.4 Same versus distinct

Same canonical claim:

```text
An octopus has three hearts.
Octopuses have a total of 3 hearts.
```

Distinct claims:

```text
An octopus has three hearts.
Two octopus hearts pump blood to the gills.
```

Anti-merge examples:

```text
Some deer can jump about 10 feet.
All deer can jump more than 10 feet.
```

```text
The record was reported in 2024.
The record is current in 2026.
```

Number, unit, direction, time, location, population, condition, negation, dan claim strength tidak boleh hilang.

### 18.5 Candidate review

- Exact normalized claim match dapat memakai row current yang sama setelah canonical input verification.
- Structured match hanya auto-match pada deterministic-safe relation dengan seluruh fields material lengkap.
- FTS, trigram, same topic, same source, entity overlap, dan similar wording hanya candidate signals.
- ChatGPT memberi keputusan `same`, `distinct`, atau `uncertain` beserta reason.
- `uncertain` tidak dapat direservasi.
- Distinct decision harus menunjukkan discriminator material.
- Dataset reference hanya candidate source untuk fixture, bukan verification evidence.

### 18.6 Correction dan lineage

- Source refresh tanpa meaning change mempertahankan canonical fact.
- Meaning change membuat successor baru dan old row menjadi `superseded`.
- Unsupported old claim menjadi `invalidated`.
- Rejected candidate tidak diubah menjadi invalidated historical fact.
- Posted snapshot tidak ditulis ulang.
- Ready post yang terkena correction kembali ke draft dan approval menjadi stale.

---

## 19. Quality rubric v1

### 19.1 Critical editorial criteria

| Criterion ID | Pass condition |
|---|---|
| `trivia.meaning_preserved` | Rendered wording mempertahankan canonical proposition dan qualifiers |
| `trivia.source_supported` | Evidence mendukung exact wording, bukan hanya topic |
| `trivia.time_context_valid` | Changing claim mempunyai `as_of`/time context yang memadai |
| `trivia.safety_appropriate` | Tidak ada unsafe advice atau misleading risk statement |
| `trivia.caption_no_new_claim` | Caption tidak menambah claim tanpa canonical evidence |
| `trivia.substantial_copying_absent` | Tidak menyalin dataset/source secara substansial |

`fail` atau `needs_review` pada criterion critical selalu memblokir `ready`.

### 19.2 Noncritical editorial criteria

| Criterion ID | Pass condition |
|---|---|
| `trivia.hook_honest` | Hook akurat terhadap isi dan tidak overpromise |
| `trivia.collection_coherent` | Seluruh facts memiliki editorial spine |
| `trivia.fact_atomic` | Satu main proposition per line |
| `trivia.surprise_substantive` | Interest berasal dari claim, bukan exaggeration |
| `trivia.variety_sufficient` | Relation/angle/opening tidak repetitif |
| `trivia.english_global_clear` | Neutral American English jelas bagi target markets |
| `trivia.number_context_clear` | Unit, metric, scope, dan comparison mudah dipahami |
| `trivia.cta_goal_aligned` | CTA sesuai satu interaction goal |
| `trivia.caption_supportive` | Caption menguatkan theme tanpa duplikasi berlebihan |
| `trivia.hashtags_relevant` | Hashtags sedikit, unik, dan relevan |
| `trivia.visual_rhythm_clear` | Line lengths dan breaks mudah dipindai |
| `trivia.format_conformant` | Output mengikuti format/profile yang dipilih |

Noncritical fail dapat memblokir ready jika menghasilkan grammar/layout yang tidak layak. Warning hanya dapat diterima owner jika ID allowlisted.

### 19.3 DNA strength score

Untuk ranking draft, bukan quality authorization, nilai 0–2 diberikan pada:

- Familiarity.
- Surprise.
- Specificity.
- Coherence.
- Scanability.
- Utility/emotion.

Interpretasi:

| Score total | Arti |
|---|---|
| 10–12 | Strong DNA fit |
| 8–9 | Usable dengan improvement opportunity |
| 0–7 | Weak collection; revise atau ganti candidates |

Score tidak dapat menutupi critical failure, source insufficiency, dedup ambiguity, atau hard rendering failure.

### 19.4 System check IDs trivia

Minimal:

- `trivia.schema.config_supported`
- `trivia.schema.content_supported`
- `trivia.format.allowed`
- `trivia.topic.allowed`
- `trivia.profile.allowed`
- `trivia.facts.count_valid`
- `trivia.facts.order_and_junction_match`
- `trivia.facts.current_verified`
- `trivia.facts.fresh`
- `trivia.sources.policy_passed`
- `trivia.dedup.review_complete`
- `trivia.reuse.allowed`
- `trivia.reservation.converted`
- `trivia.render.exact_match`
- `trivia.render.component_budget`
- `trivia.render.final_budget`
- `trivia.readability.hard_limits`
- `trivia.output.no_prohibited_artifacts`

Semantic criteria seperti surprise quality, naturalness, meaning preservation, dan caption claim scope tetap editorial, bukan pseudo-deterministic system check.

---

## 20. Examples dan anti-examples

Contoh berikut menunjukkan bentuk editorial. Setiap factual wording tetap harus melalui research dan canonical source verification sebelum produksi.

### 20.1 Hook

Good:

```text
Did you know?
```

```text
Here are 6 food-storage facts worth saving.
```

Bad:

```text
THESE INSANE FACTS WILL CHANGE YOUR LIFE!!!
```

Alasan: overpromise, ALL CAPS, punctuation berlebihan.

### 20.2 Atomic fact

Good:

```text
An octopus has three hearts.
```

Bad:

```text
Octopuses have three hearts, blue blood, amazing memory, and escape almost anything.
```

Alasan: multiple propositions, vague exaggeration, sulit diverifikasi sebagai satu unit.

### 20.3 Qualifier preservation

Good:

```text
Some bamboo species can grow rapidly under ideal conditions.
```

Bad:

```text
Bamboo always grows several feet every day.
```

Alasan: species, condition, rate, dan uncertainty hilang.

### 20.4 Record/superlative

Good:

```text
In the 2025 ranking, the airport led by annual passenger traffic.
```

Bad:

```text
It is the world's best and busiest airport.
```

Alasan: dua metric dicampur, publisher/year tidak jelas, `best` subjective.

### 20.5 Practical utility

Good shape:

```text
Store [food] under [officially supported condition] to slow [specific change].
```

Bad:

```text
This one trick keeps any food fresh for weeks.
```

Alasan: universal guarantee, missing condition, unsafe implication.

### 20.6 Animal emotion

Good:

```text
Researchers have observed [specific social behavior] in [species].
```

Bad:

```text
These animals are more loyal and loving than humans.
```

Alasan: anthropomorphism, value judgment, unsupported comparison.

### 20.7 Myth correction

Good:

```text
Brown and white eggs have similar nutrition; shell color comes from breed.
```

Bad:

```text
Everything you know about eggs is a lie.
```

Alasan: sensational, undefined, not a correction.

### 20.8 CTA

Good:

```text
Which fact surprised you most?
```

Bad:

```text
Like, comment, share, and follow if you're smart!
```

Alasan: multi-action pressure dan manipulative identity bait.

### 20.9 Caption

Good:

```text
Everyday objects often have stranger histories than their modern designs suggest. Which one would you look up first?
```

Bad:

```text
These inventions prove ancient people were smarter than us, and one was secretly banned worldwide.
```

Alasan: menambah broad/unverified claims yang tidak ada pada facts.

### 20.10 Layout

Good:

```text
Did you know?

Fact one.

Fact two.

Follow for more surprising facts.
```

Bad:

```text
Did you know? Fact one. Fact two. Fact three. FOLLOW NOW!!!
```

Alasan: tidak scanable dan renderer mismatch.

---

## 21. Evaluation fixtures v1

### 21.1 Dataset-derived baseline

Seluruh 176 record dapat dipakai untuk pattern discovery dan risk mining. Sebelum menjadi fixture berlabel:

- Exact duplicates dikelompokkan.
- OCR/layout anomaly ditandai.
- Factual truth tidak diasumsikan.
- Engagement disimpan sebagai observation, bukan expected outcome.
- Text tidak disalin menjadi production template.

### 21.2 Editorial fixture minimum

Minimal 50 full-post cases:

- 25 expected-pass cases, minimal 5 per format.
- 25 anti/edge cases, minimal 5 per format.
- Setiap allowed topic key muncul minimal 4 kali; case boleh overlap.
- Kedua profiles masing-masing minimal 15 cases.
- US, UK, CA, dan AU masing-masing mempunyai context case yang tetap jelas global.
- Minimal 10 source-insufficient/time-sensitive cases.
- Minimal 10 sensitive-topic cases.
- Minimal 10 substantial-copying/paraphrase-risk cases.
- Minimal 10 caption-new-claim cases.

### 21.3 Rendering boundary fixtures

Wajib mencakup:

- Component pass tetapi final total overflow.
- Line break dan numbered prefix overflow.
- Lima long facts yang perlu rewrite/waiver.
- Sembilan short facts yang masih muat.
- Fact tepat di limit dan satu character di atas limit.
- Hook/CTA tepat di word/character limit.
- 28 versus 29 estimated visual lines.
- `replay_ratio` 2.5 versus lebih tinggi.
- CRLF, trailing spaces, Unicode, emoji, dan control-character cases.

### 21.4 Format fixtures

Setiap format mempunyai:

- Clear conforming example.
- Wrong architecture example.
- Weak collection-fit example.
- Correct facts dengan wrong ordering.
- Correct format dengan dishonest hook.
- Correct body dengan mismatched CTA.

### 21.5 Dedup fixtures

Mengikuti FACT-007:

- Minimal 150 labeled pair/cases.
- Exact/surface, paraphrase, number/unit alias, anti-duplicate, dan ambiguous cases.
- 70% development dan 30% frozen holdout.
- False auto-merge 0.
- Candidate recall@20 minimal 95% pada known paraphrase holdout.

### 21.6 Evaluation gate

- Deterministic config/payload/renderer/system checks: 100% expected result.
- Tidak ada false pass pada source, safety, time-context, copying, atau caption-new-claim critical cases.
- Semua five formats dan two profiles dapat menghasilkan valid draft.
- Semua topic keys mempunyai minimal satu expected-pass production-shaped case.
- American English/global clarity cases tidak memakai unexplained regional slang.
- Exact same versions/input menghasilkan exact same renderer output.
- Rubric/fixture label tidak diubah hanya untuk meluluskan implementasi.

---

## 22. Performance learning contract

### 22.1 Dimensi yang dibandingkan

- Page.
- Topic group dan topic key.
- Format.
- Architecture.
- Profile.
- Interaction goal.
- Fact count.
- Surprise mix.
- Hook family.
- CTA family.
- Publication period dan post age.
- Target market/locale snapshot.

### 22.2 Interpretation rules

- Metrics adalah cumulative observed totals.
- Bandingkan post dengan umur yang serupa.
- Tampilkan sample size.
- Jangan menyimpulkan format menyebabkan performance.
- Jangan mengubah bobot berdasarkan satu outlier.
- Jangan menggunakan dataset referensi eksternal sebagai baseline Page sendiri.
- Performa tinggi tidak melegalkan fact/source/safety failure.
- Performa rendah tidak otomatis berarti format buruk; topic, design, distribution, timing, dan Page maturity adalah confounders.

### 22.3 Adaptation rules

- Awali dari default format/topic weights.
- Setelah Page mempunyai cukup post comparable, insight boleh merekomendasikan perubahan bobot.
- Perubahan config tetap memerlukan owner approval.
- Pertahankan exploration share agar Page tidak mengulang satu format terus-menerus.
- Jangan mengubah hard quality/safety gate berdasarkan engagement.

Minimum sample size numerik untuk automated recommendation ditetapkan setelah pilot karena distribusi Page baru belum tersedia. Sebelum itu, insight harus memakai bahasa `early signal`, bukan `winner`.

---

## 23. Generation workflow trivia

1. Resolve owner, workspace, Page, dan niche.
2. Ambil current Page+niche config serta performance context.
3. Pilih topic, format, architecture, profile, dan interaction goal.
4. Bentuk candidate brief dengan variety constraints.
5. Research candidate facts dari source yang memenuhi policy.
6. Pecah claims menjadi proposition atomic dan tentukan freshness/risk class.
7. Jalankan candidate dedup lookup.
8. Nilai candidates sebagai same/distinct/uncertain; uncertain tidak dilanjutkan.
9. Register/verify dan reserve exact selected set secara atomic.
10. Tulis hook, ordered fact lines, CTA, caption, dan hashtags.
11. Jalankan canonical renderer serta system checks.
12. Jika gagal content quality, revise wording atau legally replace candidate; jangan truncate.
13. Simpan draft dan junction/source snapshots secara atomic.
14. Buat editorial attestation terhadap current content hash.
15. Tampilkan post package dan warnings kepada pengguna.
16. Hanya explicit owner approval yang menjalankan `draft → ready`.
17. Publish tetap manual; status `posted` hanya setelah perintah pengguna.

Jika proses dibatalkan setelah reservation tetapi sebelum save, caller mencoba release. TTL adalah recovery terakhir, bukan normal flow.

---

## 24. Config v1 conformance

### 24.1 Allowed formats dan bobot default

| Format | Bobot |
|---|---:|
| `single_subject_fast` | 35 |
| `themed_utility` | 20 |
| `emotional_animal_collection` | 20 |
| `comparison` | 15 |
| `myth_vs_fact` | 10 |

Total harus 100.

### 24.2 Allowed topics

```text
animals
pet_safety
food_science
food_storage_home
practical_utility
human_body
nature_science
geography
history_origins
inventions_everyday
general_trivia
```

### 24.3 Default production settings

```text
fact_count.mode = adaptive
fact_count.min = 5
fact_count.preferred = 7
fact_count.max = 9
fact_reuse_scope = workspace_unique
render_style = plain_lines
english_variant = en-US
tone = conversational_credible
emoji_allowed = false
regional_slang_allowed = false
hashtags.default_count = 3
hashtags.range = 0..5
```

### 24.4 Default text budget

```text
hook_max_chars = 45
fact_max_chars = 90
facts_total_max_chars = 500
cta_max_chars = 50
canva_total_max_chars = 600
caption_max_chars = 500
```

Hard ceilings, canonical counting, readability, waiver, and approval behavior mengikuti keputusan 0.5.

---

## 25. Trade-off yang diterima

- Default `Did you know?` meningkatkan consistency tetapi dapat terasa repetitif; variation diperbolehkan hanya ketika tetap jujur dan ringkas.
- Fast trivia mendorong pause/replay dan tidak selalu selesai dibaca dalam satu loop 13 detik; hard density limits mencegah card menjadi text wall.
- Natural American English dipilih untuk konsistensi utama; neutral vocabulary menjaga aksesibilitas UK, CA, AU.
- Animals dan practical utility memiliki share/save potential kuat, tetapi membutuhkan guardrail lebih ketat terhadap anthropomorphism serta safety advice.
- Five format taxonomy lebih sempit daripada seluruh variasi dataset; batas ini memudahkan evaluasi dan analytics pada MVP.
- General trivia tetap diizinkan, tetapi coherence device diwajibkan agar tidak menjadi kumpulan candidate sisa.
- Conservative source/safety policy akan menolak beberapa claim viral. Kehilangan novelty diterima demi akurasi dan reputasi Page.
- Engagement data dipakai untuk hypothesis dan adaptation, bukan causal proof atau izin menurunkan quality gate.

---

## 26. Verification gate langkah 0.7

Status: **lulus**.

- `DNA-001` mempunyai topic pillars, five formats, two profiles, language/style, hook, fact, CTA, caption, hashtag, rendering, source, safety, dedup ontology, rubric, examples, anti-examples, dan fixtures.
- DNA diturunkan dari seluruh 176 reference records tanpa memperlakukan dataset sebagai source of truth.
- Curious Mind/dyk fast density dan Daily Facts utility density diterjemahkan menjadi profile yang terukur.
- Pola negatif dataset ditandai dan dilarang diwarisi.
- Audience US, UK, CA, dan AU dilayani melalui neutral American English.
- Five formats dan seluruh allowed topic keys mempunyai aturan evaluasi.
- Safety/source/dedup critical failure tidak dapat ditutupi engagement atau DNA strength score.
- Dokumen sesuai dengan module contract dan keputusan FACT/QUALITY 0.4–0.6.
- Tidak ada source code, migration, deployment, atau resource cloud yang dibuat.
- Langkah berikutnya adalah 0.8 — finalisasi MCP tool inventory.

---

## 27. Referensi internal

- `dataset-reference/post-coriousmind.txt`
- `dataset-reference/post-dyk.txt`
- `dataset-reference/post-dailyfacts.txt`
- `plans/PRD.md`
- `plans/database-design.md`
- `plans/module-contract.md`
- `plans/phase-0-decision-register.md`
- `plans/implementation-plan.md`
