# Product Requirements Document — Content Producer MVP

## 1. Document control

| Field | Value |
|---|---|
| Product | Content Producer |
| Release | MVP |
| Document version | 1.0 |
| Status | Draft for approval |
| Date | 2026-10-05 |
| Document language | Indonesian |
| Generated-content language | English |
| Primary platform | ChatGPT personal plugin with a custom MCP server |
| Data platform | Supabase |
| Primary operator | Single owner/operator |

This document defines what the MVP must do and the quality bar it must meet. Detailed database tables and implementation sequencing will be specified separately in:

- `plans/database-design.md`
- `plans/implementation-plan.md`

## 2. Executive summary

Content Producer is a private ChatGPT plugin for producing English-language Facebook Reel trivia posts. The product is designed for one operator who manages multiple Facebook Pages in the same trivia/facts niche and wants to work from multiple ChatGPT conversations in parallel without duplicate facts, conflicting edits, or duplicate calendar slots.

Each generated post is a copy-ready content package for a static-style 13-second Facebook Reel: a single information-card composition placed over a subtly moving background. The MVP generates the written content and production metadata. The operator manually copies the result to Canva and manually publishes it to Facebook.

The product is inspired by the content DNA found in three owner-curated viral reference datasets: Curious Mind, DYK, and Daily Facts. These datasets define useful patterns for subject selection, fact density, structure, tone, and CTA style. They are not treated as trusted factual sources and their wording must not be copied.

Supabase is the authoritative source of truth for workspaces, pages, facts, sources, reservations, posts, revisions, generation jobs, and calendar slots. Chat history is not an authoritative source of state. This enables several independent ChatGPT conversations to work against the same system safely.

## 3. Background and reference evidence

The repository contains three reference datasets:

| Dataset | Records |
|---|---:|
| Curious Mind | 55 |
| DYK | 103 |
| Daily Facts | 18 |
| Total | 176 |

Observed structural patterns across the combined datasets:

- Average fact count: 7.54 facts per post.
- Observed range: 5–11 facts per post.
- Themed trivia: 77 posts.
- Single-subject trivia: 68 posts.
- Mixed trivia: 24 posts.
- Most common format: `Did you know? + 8 facts + CTA`.
- Other common formats use 6, 7, or 9 facts.
- Strong recurring topics include animals, human body, food and food science, nature and science, geography, countries and cities, history, and general trivia.
- High-performing patterns favor familiar subjects paired with counterintuitive claims, concrete numbers, comparisons, records, unusual biological abilities, cultural reversals, or practical everyday value.
- Sentences are generally short, declarative, and easy to scan.

The datasets also contain repeated IDs, repeated content, formatting defects, and claims that may be outdated, exaggerated, ambiguous, or false. Therefore:

1. The datasets are style and pattern references only.
2. No dataset claim is automatically accepted as true.
3. No dataset wording may be reused verbatim as production copy.
4. All production facts require independent verification and deduplication.

## 4. Problem statement

Producing frequent trivia posts across several Facebook Pages creates five operational problems:

1. It is difficult to remember which facts have already been used across all pages.
2. Different ChatGPT conversations do not automatically share conversation history or production state.
3. Generating in parallel can cause duplicate facts, duplicate posts, overwritten revisions, or calendar collisions.
4. AI-generated facts may be inaccurate, outdated, unsafe, or too similar to existing content.
5. Raw AI output often requires manual restructuring before it can be copied into Canva.

Content Producer must solve these problems while retaining the high-surprise, fast-scanning content characteristics observed in the reference datasets.

## 5. Product vision

Create one reliable production system where the operator can ask for a post or content calendar in natural language, receive original and verified English trivia copy ready for Canva, and safely operate multiple same-niche Facebook Pages from several ChatGPT conversations at once.

The system should feel conversational in ChatGPT while behaving like a disciplined production database behind the scenes.

## 6. Goals

### 6.1 Primary goals

1. Generate original, high-quality English trivia posts based on the proven structural DNA of the three reference datasets.
2. Support multiple Facebook Pages in the same trivia/facts niche.
3. Prevent reuse of the same underlying fact anywhere in the owner's workspace.
4. Support multiple ChatGPT conversations working concurrently without data collisions.
5. Generate single posts, batches of posts, and date-based content calendars.
6. Return each post as a Canva-ready content package with minimal manual cleanup.
7. Store verifiable sources and production history for every fact and post.
8. Keep development and production environments isolated.

### 6.2 Secondary goals

1. Make every saved post reproducible by recording the blueprint version, facts, sources, and revision history.
2. Provide clear job status and recover safely from retries, timeouts, and partial failures.
3. Establish a foundation that can later support additional niches without redesigning the core platform.

### 6.3 Non-goals for MVP

The MVP will not:

- Publish directly to Facebook.
- Connect to the Facebook Graph API.
- Create or edit Canva designs through the Canva API.
- Generate background videos, images, or animations.
- Support niches other than trivia/facts.
- Support quote, psychology, motivation, or other content engines.
- Support a public multi-tenant SaaS product.
- Support multiple human team members or complex roles.
- Submit the plugin to the public plugin directory.
- Guarantee virality, reach, engagement, or millions of views.
- Automatically scrape competitor accounts.
- Copy competitor wording, branding, or visual identity.
- Automatically optimize publishing time from Facebook analytics.

## 7. Locked product decisions

The following decisions are considered fixed for the MVP unless the product owner explicitly changes them:

| Area | Decision |
|---|---|
| Niche | Trivia/facts only |
| Number of pages | Multiple pages supported |
| Page niches | Same broad trivia/facts niche |
| Primary markets | United States, United Kingdom, Canada, Australia |
| Language baseline | Neutral international English with American English spelling baseline |
| Global readability | Required |
| Facebook format | Static-style 13-second Reel with subtly moving background |
| Production destination | Manual copy to Canva |
| Publishing | Manual Facebook publishing |
| Data store | Supabase/Postgres |
| User interface | ChatGPT conversation through a private plugin |
| Tool backend | Custom MCP server |
| State authority | Supabase, not chat history |
| Duplicate policy | No reuse of the same underlying fact across any page in the workspace |
| Parallel operation | Required in MVP |
| Development model | Local development, private GitHub repository, hosted development and production environments |

## 8. Target user

### 8.1 Primary persona: owner/operator

The primary user:

- Owns and operates several Facebook Pages.
- Produces English content for US, UK, Canadian, Australian, and globally understandable audiences.
- Uses Canva for final visual production.
- Wants to request content conversationally instead of operating a complex dashboard.
- May open several ChatGPT conversations to produce content in parallel.
- Needs confidence that facts are original, non-duplicated, and supported by sources.
- Reviews and manually publishes all final content.

### 8.2 User skill assumptions

- The operator can use ChatGPT and Canva.
- The operator should not need to understand SQL, APIs, MCP internals, or database transactions.
- Technical configuration is performed during setup, not during daily content production.

## 9. Product terminology

| Term | Definition |
|---|---|
| Workspace | The top-level owner boundary containing all pages, facts, posts, and calendars. |
| Page | A configured Facebook Page profile within the workspace. |
| Blueprint | A versioned set of content rules derived from the reference datasets. |
| Fact unit | One atomic, independently verifiable factual claim. |
| Fact cluster | A canonical meaning used to group paraphrases of the same underlying fact. |
| Candidate fact | A discovered claim that has not yet passed verification. |
| Verified fact | A fact approved for production use and supported by stored sources. |
| Reservation | A temporary exclusive claim on a fact while a post is being generated. |
| Consumed fact | A fact permanently associated with a saved post and unavailable for reuse. |
| Post package | The complete output prepared for Canva, including overlay copy, caption, CTA, and production metadata. |
| Generation job | A tracked asynchronous or synchronous request to generate posts or calendars. |
| Calendar slot | A planned publishing position for one page at a specific date and time. |
| Lock version | A version number used to prevent one chat from overwriting a newer edit. |

## 10. MVP scope

### 10.1 Included capabilities

- Personal authentication for the operator.
- One workspace.
- Multiple trivia Facebook Pages.
- Page-specific content preferences.
- Versioned content blueprint.
- Verified fact library with source records.
- Exact and semantic duplicate detection.
- Atomic fact reservation.
- Single-post generation.
- Batch post generation.
- Content-calendar generation.
- Draft revision and approval.
- Canva-ready copy output.
- Multi-chat concurrent operation.
- Idempotent write operations.
- Post and job status tracking.
- Audit events for important changes.
- Development and production isolation.
- MCP endpoint using Streamable HTTP at `/mcp`.
- OAuth-protected production tools.

### 10.2 Deferred capabilities

- Performance analytics and automatic learning from Facebook metrics.
- Multiple workspace members and permissions.
- Configurable fact-reuse cooldowns.
- Multiple languages.
- Alternative content niches.
- Custom MCP App UI or dashboard.
- Automated media generation.
- Automated scheduling and publishing.
- Public plugin distribution.

## 11. Core user journeys

### 11.1 Configure a Facebook Page

1. The operator asks to create a new Page profile.
2. The system collects or infers the Page name, slug, primary markets, time zone, topic mix, default fact count, CTA preference, and prohibited topics.
3. The system shows the proposed configuration.
4. The operator confirms.
5. The system stores the Page and returns a stable `page_id`.

### 11.2 Generate one post

1. The operator selects a Page and optionally specifies a topic or subject.
2. The system creates an idempotent generation job.
3. The system obtains verified, unused facts suitable for the Page.
4. Facts are reserved atomically.
5. The system creates a draft using the active blueprint.
6. Automated content QA validates accuracy status, uniqueness, style, length, safety, grammar, and structure.
7. If QA fails, the system attempts a bounded regeneration or returns an actionable error.
8. The post and first immutable revision are saved.
9. Reservations become permanently consumed.
10. The system returns the complete Canva-ready package and stable identifiers.

### 11.3 Generate a batch

1. The operator requests a number of posts for one Page.
2. The system confirms topic distribution and any date range.
3. One parent generation job is created with child items.
4. Required facts are reserved without overlap.
5. Each post is generated and validated independently.
6. Successful posts are saved even if another item fails.
7. Failed items report their error and release unused reservations.
8. The final response reports complete, partial, and failed counts.

### 11.4 Create a content calendar

1. The operator specifies Page, date range, posts per day, preferred times, and optional topic mix.
2. The system creates unique calendar slots.
3. It generates or attaches posts to each slot.
4. The system validates topic balance, fact uniqueness, and slot uniqueness.
5. A draft calendar is returned for review.
6. The operator may revise individual posts or approve the calendar.
7. The system does not publish to Facebook.

### 11.5 Revise a draft

1. The operator refers to a stable `post_id`.
2. The system loads the newest revision before editing.
3. The requested change is applied without changing the underlying fact meaning unless explicitly requested.
4. A new immutable post version is created.
5. The current post lock version increments.
6. A stale update is rejected with a conflict response instead of overwriting newer work.

### 11.6 Work from multiple chats

1. Each chat supplies an explicit `workspace_id` and `page_id` through authenticated context or tool arguments.
2. Each write request carries an idempotency key.
3. Facts are reserved in a database transaction.
4. Conflicting edits use optimistic concurrency control.
5. Calendar slots are protected by database uniqueness rules.
6. All chats receive stable IDs and must reload the current record before revision.

## 12. Content DNA specification

### 12.1 Supported post architectures

The MVP supports three primary architectures:

1. **Themed trivia** — several facts connected by a clear theme, such as unusual borders, food storage, or animal intelligence.
2. **Single-subject trivia** — several facts about one subject, such as octopuses, Iceland, eggs, or the human liver.
3. **Mixed trivia** — unrelated but individually strong facts arranged as a high-surprise sequence.

Recommended default distribution across a calendar:

| Architecture | Default share |
|---|---:|
| Themed trivia | 45% |
| Single-subject trivia | 40% |
| Mixed trivia | 15% |

Page configuration may override this distribution.

### 12.2 Fact count and copy density

- Default: 6–8 facts.
- Preferred single-card default: 6 facts.
- Allowed range: 5–9 facts.
- More than 9 facts requires an explicit operator request and must still pass layout-density QA.
- Each fact should normally contain one atomic claim.
- Each fact should normally be no longer than 18 words.
- The complete overlay copy should normally be 65–120 words, including hook and CTA.
- The text must remain scannable as one Canva composition.
- The MVP does not create multi-scene scripts or voiceover timing.

### 12.3 Hook

The default hook is `Did you know?`, matching the strongest recurring reference pattern. The system may use controlled alternatives when they remain concise and non-deceptive, for example:

- `Did you know?`
- `Most people don't know this...`
- `These facts sound made up—but they're real.`
- `Here are 6 facts you probably never learned.`

Hooks must not promise a result the post does not deliver.

### 12.4 Fact characteristics

Each post should prioritize a combination of:

- Familiar subject, surprising property.
- Counterintuitive classification.
- Concrete number or measurable comparison.
- Record, extreme, or superlative that is current and verifiable.
- Unexpected origin or historical use.
- Unusual biological ability or behavior.
- Geographic or cultural oddity.
- Practical everyday insight.

A post should avoid filling slots with ordinary facts merely to reach a target count. If insufficient strong facts exist, the system must reduce the count or report the limitation.

### 12.5 Topic strategy

Default topic families:

- Animals and animal behavior.
- Food and food science.
- Human body and safe anatomy facts.
- Nature and general science.
- Geography, countries, cities, and landmarks.
- History and origins.
- Everyday objects and inventions.
- Carefully selected general trivia.

Default calendar weighting:

| Topic family | Default share |
|---|---:|
| Animals | 25% |
| Food and food science | 20% |
| Human body | 15% |
| Nature and science | 15% |
| Geography, countries, and cities | 15% |
| History, inventions, and general trivia | 10% |

These are starting defaults, not fixed performance claims.

### 12.6 CTA style

The CTA must be one short line and should vary across a calendar. Examples:

- `Follow for more surprising facts.`
- `Which fact surprised you most?`
- `Save this for later.`
- `Share this with someone who loves trivia.`

The system must avoid engagement bait that is misleading, aggressive, repetitive, or unrelated to the post.

## 13. Language requirements

### 13.1 English variant

- Use neutral international English.
- Use American English spelling as the default baseline.
- Ensure phrasing remains natural and immediately understandable in the US, UK, Canada, Australia, and a broader global audience.
- Avoid highly regional slang, unexplained idioms, and culture-specific humor.
- Do not mix spelling conventions within one post.

### 13.2 Sentence style

- Short, direct, declarative sentences.
- Common vocabulary appropriate for a broad adult audience.
- One primary idea per sentence.
- Active voice where natural.
- Minimal jargon; explain essential technical terms briefly.
- No unnecessary introductory paragraphs.
- No emojis unless enabled in Page settings.
- No all-caps emphasis except an approved short label.

### 13.3 Numbers and measurements

- Use numerals when they improve scanning.
- Use commas consistently for thousands.
- Prefer units familiar to the target audience.
- When a measurement could confuse audiences, provide a compact dual-unit form, such as `10 ft (3 m)`.
- Dates, rankings, records, population counts, laws, prices, and superlatives must carry an `as_of` date internally.

### 13.4 Grammar and originality

- Output must pass grammar and spelling checks.
- Broken word order, incomplete lines, malformed punctuation, and OCR-like errors are release blockers.
- Copy must be newly written and must not reproduce sentences from the reference datasets or sources.
- Paraphrasing does not make an already-used underlying fact unique.

## 14. Fact quality and verification

### 14.1 Source-of-truth policy

Reference datasets, model memory, social posts, user comments, and unsourced blogs are not sufficient evidence on their own.

Every production fact must have:

- A canonical claim.
- A verification status.
- At least one stored source URL.
- Source title and publisher.
- Access date.
- A record of whether the source directly supports the claim.
- An `as_of` date for time-sensitive claims.

### 14.2 Source quality

Preferred sources, in order:

1. Government, academic, scientific, museum, institutional, or primary sources.
2. Established reference publications or reputable subject-matter organizations.
3. High-quality secondary reporting that links to its underlying evidence.

For unstable, disputed, numerical, legal, health, safety, or superlative claims, the system should require either a primary source or two independent reputable sources.

### 14.3 Fact lifecycle

```text
candidate → verifying → verified → reserved → consumed
                ↘ rejected
                ↘ duplicate
reserved → released
reserved → expired
```

Only `verified` facts may be selected for production. `reserved` and `consumed` facts are unavailable to other jobs.

### 14.4 Time-sensitive facts

Claims involving current laws, rankings, populations, prices, office holders, records, or operating status must be marked time-sensitive.

- They require an `as_of` date.
- They require revalidation after a configured interval.
- Expired facts cannot be used until revalidated.
- The public copy should include a year when omission could mislead.

### 14.5 Safety-sensitive topics

The following categories require stricter validation and manual review:

- Medical or health claims.
- Food safety and storage advice.
- Pet toxicity or pet safety.
- Survival instructions.
- Laws and legal restrictions.
- Claims that could encourage dangerous behavior.

The MVP must not generate diagnosis, treatment, dosage, legal advice, financial advice, or dangerous instructions. Human-body content should remain educational and non-clinical unless the operator explicitly requests a reviewed exception.

## 15. Duplicate prevention requirements

### 15.1 Duplicate definition

Two claims are duplicates when they communicate the same underlying factual proposition, even if:

- Wording differs.
- Units differ.
- Sentence order differs.
- One version uses a comparison.
- One version adds non-essential context.

Example duplicate pair:

```text
Octopuses have three hearts.
An octopus has a total of 3 hearts.
```

### 15.2 Detection layers

The system must use layered duplicate detection:

1. Exact normalized text comparison.
2. Deterministic claim hash.
3. Canonical semantic key or subject–predicate–value representation.
4. Semantic similarity check against previously verified and consumed facts.
5. Source overlap and entity comparison as supporting signals.

### 15.3 Duplicate scope

- A consumed fact is blocked across the entire workspace, not merely one Page.
- A fact used on Page A cannot later be used on Page B.
- A failed job must not permanently consume a fact unless a post was saved.
- A released or expired reservation may become available again.
- Deliberate reuse or cooldown policies are post-MVP features.

### 15.4 Related facts

Related facts may be treated as distinct only when each has a materially different atomic claim. The system should be conservative: when uncertain, flag the candidate for review rather than silently treating it as new.

## 16. Canva-ready post package

Every successful generation must return a structured post package containing:

| Field | Required | Purpose |
|---|---:|---|
| `post_id` | Yes | Stable identifier |
| `page_id` | Yes | Target Page |
| `status` | Yes | Draft, approved, etc. |
| `topic` | Yes | Broad content category |
| `theme` | Yes | Specific organizing theme |
| `architecture` | Yes | Themed, single-subject, or mixed |
| `hook` | Yes | Opening line |
| `facts` | Yes | Ordered display facts |
| `cta` | Yes | Closing line |
| `canva_copy` | Yes | Clean line-broken text ready to paste |
| `caption` | Yes | Facebook caption |
| `hashtags` | Yes | Small relevant set, configurable |
| `visual_direction` | Yes | Background subject and movement suggestion |
| `fact_count` | Yes | Number of displayed facts |
| `source_summary` | Yes | Internal verification summary, not part of Canva copy |
| `quality_result` | Yes | Automated QA result |
| `version` | Yes | Revision number |

`canva_copy` must:

- Contain no JSON, markdown labels, citations, internal IDs, or implementation notes.
- Preserve intentional line breaks.
- Require no cleanup before copying into Canva.
- Keep each fact visually separable.
- End with one CTA line.

## 17. Page management requirements

### FR-PAGE-001 — Create a Page

The operator can create a Page profile with a unique name and slug.

### FR-PAGE-002 — Configure Page defaults

Each Page supports:

- Display name.
- Status: active or paused.
- Primary and secondary target markets.
- Time zone.
- Default locale.
- Topic weights.
- Allowed and prohibited topics.
- Default post architecture mix.
- Default fact count.
- CTA preferences.
- Emoji preference.
- Default publishing cadence.
- Active blueprint version.

### FR-PAGE-003 — Keep page identity separate

Posts, calendars, and settings must always belong to an explicit Page. No write tool may infer a Page from ambiguous conversational context when more than one candidate exists.

### FR-PAGE-004 — Share facts across the workspace

Although Page configurations are separate, fact-usage history is shared across all Pages to enforce workspace-wide uniqueness.

## 18. Content generation requirements

### FR-GEN-001 — Generate a single post

The system must generate one complete post package from a Page, topic constraints, and optional user direction.

### FR-GEN-002 — Generate a batch

The system must generate multiple posts in one tracked job without fact overlap between items.

### FR-GEN-003 — Use verified facts only

No production draft may be finalized using an unverified candidate fact.

### FR-GEN-004 — Record the blueprint

Every post must record the exact blueprint version used.

### FR-GEN-005 — Support explicit variation

The operator may request changes to topic, architecture, fact count, CTA style, or tone within the allowed content specification.

### FR-GEN-006 — Preserve original meaning during rewriting

Style revisions must not silently change numbers, qualifiers, dates, entities, or factual meaning.

### FR-GEN-007 — Avoid weak filler

When fewer strong verified facts are available than requested, the system must reduce the fact count with an explanation or fail clearly. It must not invent filler.

### FR-GEN-008 — Return stable identifiers

Every job, reservation, post, version, calendar, and slot must have a stable ID returned in structured tool output.

## 19. Quality-control requirements

Every draft must pass automated checks before it can be marked `ready_for_review`:

1. All facts are verified and source-backed.
2. No fact is duplicated or already consumed.
3. The copy matches the active Page and blueprint.
4. Fact count is within the allowed range.
5. Word count and per-fact length are within configured limits.
6. Grammar and spelling pass.
7. English variant is consistent.
8. The hook accurately represents the content.
9. The CTA is short and relevant.
10. No citations or internal metadata leak into Canva copy.
11. No prohibited or unsafe content is present.
12. Time-sensitive facts are current.
13. Each fact remains semantically faithful to the verified claim.
14. Output does not copy reference-dataset or source wording.

Quality results must be stored, not merely shown in chat.

## 20. Post lifecycle and revision requirements

### 20.1 Post states

```text
generating → draft → ready_for_review → approved → scheduled → published
      ↘ failed                         ↘ archived
```

The MVP may use a subset in the UI, but persisted state transitions must be explicit and validated.

### 20.2 Versioning

- Post revisions are immutable records.
- Editing creates a new version rather than overwriting old content.
- One version is marked current.
- Revision history includes author, timestamp, request, and blueprint version.
- The system must be able to return the current version and previous versions.

### 20.3 Approval

- Generated posts begin as drafts.
- The operator can approve a draft.
- Approval does not publish it to Facebook.
- A revision after approval returns the post to an appropriate review state.

## 21. Calendar requirements

### FR-CAL-001 — Create calendar

Create a draft calendar for one Page using a date range, cadence, time zone, and optional topic distribution.

### FR-CAL-002 — Prevent duplicate slots

One Page cannot have two calendar entries occupying the same configured slot.

### FR-CAL-003 — Balance content

The calendar should avoid excessive repetition of topic family, subject, architecture, CTA, or geographic focus on adjacent posts.

### FR-CAL-004 — Support empty and filled slots

The system may create planning slots before generating posts, or generate posts and attach them immediately.

### FR-CAL-005 — Manual publishing

Calendar status is informational. The system does not publish or schedule through Facebook.

### FR-CAL-006 — Reschedule safely

Moving a post must validate the destination slot and preserve audit history.

## 22. Parallel-work and concurrency requirements

Parallel safety is an MVP release requirement, not a later optimization.

### 22.1 Atomic fact reservation

Fact selection and reservation must occur in one database transaction. A client-side sequence of `select` followed by `insert` is not acceptable.

When two jobs request the same eligible fact simultaneously:

- Only one reservation may succeed.
- The losing job must automatically select another eligible fact or return a clear shortage result.
- The same fact must never appear in two successful drafts.

### 22.2 Reservation lease

- Reservations have an expiration time.
- A completed post converts its reservations to consumed usage.
- A failed or cancelled job releases reservations.
- An abandoned job cannot lock facts permanently.
- Reservation cleanup must be safe to retry.

### 22.3 Idempotency

Every write operation must accept or derive an idempotency key.

- Repeating the same request must return the original result.
- Network retries must not create duplicate jobs, posts, versions, or calendar slots.
- Idempotency keys are scoped to the authenticated workspace.

### 22.4 Optimistic concurrency

Posts and other editable records must use a lock version or equivalent conditional update.

- Updates include the version the caller read.
- Stale updates fail with a conflict response.
- The error identifies the current version and instructs the caller to reload.
- Silent last-write-wins behavior is prohibited.

### 22.5 Parallel capacity target

The MVP must pass a test of at least 10 simultaneous fact-reservation or post-generation initiations without duplicate fact assignment or duplicate job creation.

## 23. Generation-job requirements

Job states:

```text
queued → processing → completed
                  ↘ partially_completed
                  ↘ failed
                  ↘ cancelled
```

Each job records:

- Workspace and Page.
- Requesting authenticated user.
- Job type.
- Idempotency key.
- Input parameters.
- Current state.
- Progress counts.
- Created, started, and completed timestamps.
- Error code and safe error detail.
- Result IDs.

Long-running batch and calendar requests must return a job ID promptly rather than holding an MCP call open indefinitely.

## 24. Proposed MCP capability surface

Exact tool schemas will be finalized during implementation planning. The MVP needs focused tools covering these capabilities:

### 24.1 Infrastructure

- `system_ping` — read-only connection test.
- `get_system_status` — authenticated health and environment summary without secrets.
- `get_profile` — stable authenticated profile for account identification.

### 24.2 Pages

- `list_pages`
- `get_page`
- `create_page`
- `update_page`

### 24.3 Generation

- `generate_post`
- `generate_post_batch`
- `get_generation_job`
- `cancel_generation_job`

### 24.4 Posts

- `list_posts`
- `get_post`
- `revise_post`
- `approve_post`
- `archive_post`

### 24.5 Calendars

- `create_content_calendar`
- `get_content_calendar`
- `update_calendar_slot`

Tools must have narrow responsibilities, explicit input schemas, structured output schemas, accurate read/write/destructive annotations, stable identifiers, authorization checks, and model-readable errors.

Internal database actions such as reserving facts, expiring leases, or creating immutable versions should not be exposed as low-level user tools unless required for recovery.

## 25. Authentication and authorization

### 25.1 Authentication

- The production MCP server uses OAuth 2.1 compatible with the MCP authorization flow.
- The ChatGPT connection represents the authenticated operator.
- Anonymous access is allowed only for a harmless development `system_ping` if explicitly enabled.
- Private data and every write action require authentication.

### 25.2 Authorization

- The authenticated identity may access only its authorized workspace.
- Every Page, fact, post, job, and calendar operation validates workspace membership server-side.
- The model must never be trusted to enforce authorization.
- Tool arguments containing a foreign `workspace_id` or `page_id` must be rejected.

### 25.3 Supabase security

- Row Level Security is enabled on every table in an exposed schema.
- Grants and RLS policies are both configured explicitly.
- RLS policies use trusted ownership or membership data, not user-editable metadata.
- Secret/service-role credentials remain server-side and are never exposed in ChatGPT, browser code, logs, or tool results.
- Privileged database functions are minimized, isolated, and reviewed.
- Development and production credentials are separate.

## 26. High-level data requirements

The detailed database design is out of scope for this document, but the MVP needs durable entities for:

- Workspaces.
- Workspace membership or ownership.
- Pages and Page settings.
- Content blueprints and versions.
- Topics and Page topic weights.
- Facts and canonical semantic identity.
- Fact sources and verification results.
- Generation jobs.
- Fact reservations and consumption records.
- Posts.
- Immutable post versions.
- Content calendars.
- Calendar slots.
- Audit events.

The database design must enforce important invariants through constraints and transactions, not only through application code.

## 27. Architecture requirements

### 27.1 Logical architecture

```text
ChatGPT conversation(s)
        ↓
Private Content Producer plugin
        ↓ Streamable HTTP / OAuth
Custom MCP server
        ├── authorization and validation
        ├── generation orchestration
        ├── fact research and verification
        ├── deduplication and reservation
        ├── content QA
        └── post/calendar services
        ↓
Supabase/Postgres
        ├── authoritative application state
        ├── transactional concurrency controls
        └── audit history
```

### 27.2 Responsibility boundaries

**ChatGPT/plugin** is responsible for:

- Conversational user experience.
- Following the content-production workflow.
- Collecting missing user intent.
- Presenting tool results clearly.
- Drafting or refining copy only from approved fact payloads.

**MCP server** is responsible for:

- Authentication and authorization.
- Validating every request.
- Orchestrating generation.
- Enforcing source, duplicate, reservation, and concurrency rules.
- Persisting data.
- Returning structured results.

**Supabase** is responsible for:

- Authoritative durable state.
- Uniqueness and relational integrity.
- Transactions and locking.
- RLS and data isolation.
- Migration history and backups.

## 28. Environment and release requirements

### 28.1 Environments

| Environment | Purpose | Data |
|---|---|---|
| Local | Development and automated tests | Disposable fixtures |
| Development | ChatGPT integration and acceptance testing | Non-production test data |
| Production | Real content production | Authoritative production data |

Development and production must use separate Supabase projects, secrets, and MCP deployments.

### 28.2 Source control

- Private GitHub repository.
- Feature branches for work.
- Development deployment from an approved development branch.
- Production deployment from the protected main branch.
- Database migrations stored in Git.
- Dependency versions pinned through a committed lockfile.
- Secrets excluded from Git.

### 28.3 MCP deployment

- Stable HTTPS production endpoint ending in `/mcp`.
- Streamable HTTP transport.
- Health endpoint separate from MCP transport.
- Logs and metrics for initialization and tool calls.
- Timeouts and rate limits.
- Backward-compatible tool changes where possible.

## 29. Non-functional requirements

### 29.1 Reliability

- No partial transaction may consume a fact without a corresponding persisted usage record.
- Retried writes must be idempotent.
- Batch failures must preserve successful items and release unused resources.
- Database backups and a restore procedure are required before production launch.

### 29.2 Performance

Targets exclude time spent waiting on unavailable external research providers.

| Operation | Target |
|---|---:|
| Simple read tool, p95 | ≤ 2 seconds |
| Create job acknowledgment, p95 | ≤ 2 seconds |
| Single post from existing verified facts, p95 | ≤ 90 seconds |
| Seven-post batch | ≤ 10 minutes |
| 30-slot calendar job | ≤ 20 minutes |

Long operations should use asynchronous jobs with progress retrieval.

### 29.3 Availability

- MVP monthly availability target: 99.0%, excluding announced maintenance and upstream ChatGPT/Supabase outages.
- Health checks must distinguish server failure from dependency failure.

### 29.4 Observability

The system must log:

- Request and correlation IDs.
- Authenticated profile ID, safely represented.
- Workspace, Page, job, and entity IDs.
- Tool name and outcome.
- Duration and error code.
- Reservation and conflict events.

The system must not log:

- OAuth access tokens.
- Supabase secret keys.
- Database credentials.
- Full sensitive request headers.
- Unnecessary conversation content.

### 29.5 Maintainability

- Business rules separated from MCP transport handlers.
- Focused modules for pages, facts, generation, posts, calendars, and auth.
- Database migrations reproducible from an empty environment.
- Automated tests required for invariants and tool contracts.

### 29.6 Cost control

- Batch sizes have configurable limits.
- Expensive research and generation operations are rate-limited.
- Retries are bounded.
- Duplicate and cached fact checks occur before unnecessary generation work.
- Development cannot accidentally use production credentials or production data.

## 30. Error-handling requirements

Errors returned to ChatGPT must be structured and actionable.

Required categories include:

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `PAGE_NOT_FOUND`
- `INSUFFICIENT_VERIFIED_FACTS`
- `FACT_RESERVATION_CONFLICT`
- `DUPLICATE_FACT`
- `STALE_VERSION`
- `CALENDAR_SLOT_CONFLICT`
- `INVALID_STATE_TRANSITION`
- `QUALITY_CHECK_FAILED`
- `RATE_LIMITED`
- `DEPENDENCY_UNAVAILABLE`
- `INTERNAL_ERROR`

An error result must include:

- Safe human-readable explanation.
- Stable error code.
- Whether retry is safe.
- Relevant stable IDs.
- Recommended next action.

Secrets, stack traces, SQL, and internal credentials must never be returned.

## 31. Audit requirements

Important actions must create immutable audit events, including:

- Page created or updated.
- Fact verified, rejected, reserved, released, or consumed.
- Generation job created, completed, failed, or cancelled.
- Post created, revised, approved, archived, or scheduled.
- Calendar created or slot changed.
- Conflict detected.

Audit entries must include timestamp, actor, request ID, entity type, entity ID, action, and safe change metadata.

## 32. Success metrics

### 32.1 Product-quality metrics

| Metric | MVP target |
|---|---:|
| Duplicate consumed facts across workspace | 0 |
| Successful posts with stored source support | 100% |
| Successful posts passing required automated QA | 100% |
| Silent stale-edit overwrites | 0 |
| Duplicate calendar slots | 0 |
| Duplicate records caused by request retry | 0 |
| Successful output containing malformed Canva copy | 0 known cases at release |

### 32.2 Operational metrics

| Metric | MVP target |
|---|---:|
| Successful tool calls excluding upstream outages | ≥ 99% |
| Jobs that release reservations after terminal failure | 100% |
| Conflict responses with actionable error information | 100% |
| Critical secrets found in repository or logs | 0 |

### 32.3 User-value metrics

- The operator can generate a usable post without manually restructuring its copy.
- The operator can create a one-week calendar for any configured Page in one conversational workflow.
- Two or more chats can work simultaneously without manual coordination of facts.
- The operator can identify the Page, facts, sources, and revision behind every generated post.

Facebook views and virality are monitored outside the MVP system and are not acceptance criteria because distribution performance is not controlled by the product alone.

## 33. Acceptance criteria

The MVP is ready for production only when all critical scenarios pass.

### AC-001 — MCP connection

- ChatGPT discovers the production MCP endpoint.
- `system_ping` succeeds.
- Tool metadata and schemas load without errors.

### AC-002 — Authenticated isolation

- An authenticated operator can access the authorized workspace.
- An invalid or foreign workspace/Page identifier is rejected.
- Anonymous callers cannot use private or write tools.

### AC-003 — First Page

- The operator can create a Page and retrieve it by stable ID.
- Its configured locale, markets, topic weights, and blueprint are preserved.

### AC-004 — Single-post generation

- A request produces a saved draft containing 5–9 verified facts.
- Every fact has source records.
- The post passes required QA.
- `canva_copy` can be pasted without cleanup.

### AC-005 — Workspace-wide deduplication

- A fact consumed by Page A cannot be generated for Page B.
- A paraphrase of that fact is also rejected.

### AC-006 — Parallel reservation

- At least 10 simultaneous requests execute.
- No fact is assigned to more than one successful draft.
- Losing transactions recover with alternate facts or a clear shortage result.

### AC-007 — Retry safety

- Repeating a write with the same idempotency key creates only one logical result.
- The caller receives the original job or entity ID.

### AC-008 — Stale edit protection

- Two chats load the same post version.
- One chat saves a revision.
- The second chat's stale update is rejected and cannot overwrite the newer revision.

### AC-009 — Failed-job cleanup

- A generation job fails after reserving facts.
- Its unconsumed reservations are released or expire.
- The facts become eligible again.

### AC-010 — Calendar collision

- Two chats attempt to create the same Page slot.
- Only one slot succeeds.
- The other receives `CALENDAR_SLOT_CONFLICT`.

### AC-011 — Batch partial failure

- One item in a batch fails QA.
- Successful items remain saved.
- Failed item reservations are released.
- The parent job reports `partially_completed` with clear counts.

### AC-012 — Language quality

- Output uses consistent American English spelling.
- It remains understandable for UK, Canadian, Australian, and global English readers.
- It contains no unexplained regional slang.

### AC-013 — Time-sensitive claim

- An expired time-sensitive fact is not used.
- Revalidation can return it to verified status.

### AC-014 — Environment isolation

- Development cannot read or write production data.
- Development and production use different Supabase projects and credentials.

## 34. Testing requirements

### 34.1 Unit tests

- Normalization and claim hashing.
- Semantic-key generation rules.
- Content length and structure validation.
- State-transition validation.
- Error mapping.
- Idempotency behavior.

### 34.2 Database tests

- Unique constraints.
- Transactional reservations.
- Reservation expiry and cleanup.
- Optimistic locking.
- Calendar slot collision.
- RLS allow and deny cases.
- Migration from an empty database.

### 34.3 MCP contract tests

- Initialization.
- Tool discovery.
- Valid and invalid input schemas.
- Structured output schemas.
- Authentication challenge.
- Safety annotations.
- Error results.

### 34.4 Content evaluation set

Maintain repeatable evaluation prompts covering:

- Direct single-post request.
- Indirect single-post request.
- Page ambiguity.
- Topic shortage.
- Batch generation.
- Calendar generation.
- Revision using a stable ID.
- Unsupported niche request.
- Unsafe fact request.
- Duplicate-fact attempt.
- Parallel-chat operation.
- Requests that should not call a tool.

### 34.5 Adversarial tests

- Source text containing prompt-injection instructions.
- User-supplied claim asking the system to skip verification.
- Foreign workspace or Page ID.
- Replayed request.
- Invalid OAuth token.
- Oversized batch.
- Malformed tool arguments.
- Source disagreement.

## 35. Privacy, safety, and content policy

- Collect only data necessary for content production.
- Do not store full ChatGPT conversations unless explicitly required and disclosed.
- Treat all external source content as untrusted input.
- Ignore instructions embedded inside sources.
- Do not expose internal prompts, secrets, tokens, or system configuration.
- Avoid claims targeting protected groups or demeaning cultures and nationalities.
- Avoid graphic, hateful, sexual, or exploitative trivia.
- Avoid fabricated quotations and false attribution.
- Avoid presenting legends, rumors, or disputed claims as established facts.
- Clearly label folklore or legend when deliberately included.
- Do not use engagement tactics that depend on misinformation.

## 36. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Factual hallucination | Loss of trust or harmful content | Verified-fact gate, stored sources, QA, manual review for risky topics |
| Semantic duplicates | Repetitive Pages | Canonical claims, semantic keys, similarity search, workspace-wide reservation |
| Concurrent collisions | Duplicate or overwritten work | Transactions, uniqueness constraints, idempotency, optimistic locking |
| Outdated laws or records | Misinformation | `as_of` dates, expiry, revalidation |
| Dataset copyright imitation | Unoriginal content | Pattern-only use, originality checks, no verbatim reuse |
| Excessive text density | Poor visual usability | Fact and word limits, Canva-copy QA |
| Model inconsistency | Variable quality | Versioned blueprint, structured tools, repeatable eval set |
| OAuth complexity | Delayed integration | Implement early with established identity provider and isolated dev testing |
| External-source outage | Failed research | Async jobs, retries, clear dependency errors, verified-fact buffer |
| Cost growth | Unsustainable operation | Batch limits, caching, bounded retries, usage monitoring |
| Prompt injection from sources | Data leakage or unwanted actions | Treat source content as data, least privilege, tool authorization, output validation |
| Overreliance on virality references | Unrealistic expectations | Optimize controllable content quality; do not guarantee distribution results |

## 37. Dependencies

The MVP depends on:

- ChatGPT personal plugin support and custom MCP server connection.
- Stable HTTPS hosting for the MCP server.
- OAuth 2.1 compatible authentication.
- Supabase projects for development and production.
- A private GitHub repository and deployment workflow.
- Access to reputable public information sources or a research provider.
- A generation model available through the selected ChatGPT/plugin workflow or server orchestration.
- The operator's manual Canva and Facebook workflow.

## 38. Production release gates

Production launch requires:

- PRD approved.
- Database design approved.
- Implementation plan approved.
- Threat model reviewed.
- Development and production environments isolated.
- All database migrations reproducible.
- RLS and authorization tests passing.
- Critical acceptance criteria passing.
- Parallel collision test passing.
- No known high-severity security findings.
- Secrets scan clean.
- Backup and restore procedure tested.
- Content evaluation set meets the quality bar.
- Production MCP connection tested from a new ChatGPT conversation.
- Rollback procedure documented.

## 39. Post-MVP roadmap candidates

These items are intentionally excluded from MVP but supported by the architecture direction:

1. Manual or automated Facebook performance import.
2. Topic and architecture recommendations based on observed Page performance.
3. Additional content niches with separate blueprints and fact policies.
4. Multiple users, roles, and approval workflows.
5. Canva integration.
6. Facebook scheduling and publishing integration.
7. Custom dashboard or MCP App UI.
8. Configurable fact-reuse windows.
9. Multiple languages and localized Page variants.
10. Public or commercial plugin distribution.

## 40. Open implementation decisions

The following decisions belong in the database design or implementation plan and do not block approval of this PRD:

- TypeScript versus Python MCP implementation; TypeScript is the current default recommendation.
- Hosting provider for development and production.
- OAuth identity-provider choice and client-registration method.
- Research/search provider and source-ingestion strategy.
- Exact semantic-similarity technology and threshold.
- Whether generation runs entirely in ChatGPT or partly through a server-side model API.
- Queue implementation for long-running batch jobs.
- Reservation lease duration.
- Final rate limits and maximum batch sizes.
- Production domain names.

## 41. Reference links

- OpenAI, Build an MCP server: https://developers.openai.com/plugins/build/mcp-server
- OpenAI, Plugin authentication: https://developers.openai.com/plugins/build/auth
- OpenAI, Package your plugin: https://developers.openai.com/plugins/build/plugins
- OpenAI, Connect and test your plugin: https://developers.openai.com/plugins/deploy/connect-chatgpt
- Supabase, Managing environments: https://supabase.com/docs/guides/deployment/managing-environments
- Supabase, Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase, Securing the Data API: https://supabase.com/docs/guides/api/securing-your-api

## 42. Approval

Approval of this PRD confirms:

1. The MVP scope and exclusions are correct.
2. Workspace-wide permanent fact uniqueness is the intended default.
3. Multi-page and multi-chat parallel safety are release requirements.
4. Output remains manual-copy to Canva and manual-publish to Facebook.
5. Trivia/facts is the only MVP niche.
6. Detailed database design and implementation planning may proceed from this document.

