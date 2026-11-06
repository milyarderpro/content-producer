import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { batch, single, lostResponseReplay, partialProgress } from './fixtures/trivia-draft-v2.js';

const root = join(process.cwd(), 'plugin', 'skills', 'content-producer');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const names = [
  'workflow.md',
  'lifecycle.md',
  'tool-sequences.md',
  'source-policy.md',
  'output-contract.md',
];

describe('Phase 7.2 core skill source contract', () => {
  it('parses skill name and descriptive activation metadata', () => {
    const skill = read('SKILL.md');
    const frontmatter = /^---\n([\s\S]+?)\n---\n/.exec(skill)?.[1];
    expect(frontmatter).toBeDefined();
    expect(frontmatter).toMatch(/^name: content-producer$/m);
    expect(frontmatter).toMatch(/^description: .{70,}$/m);
    expect(skill).toContain('Activate for user goals');
    expect(skill).toContain('Do not activate');
    expect(skill).toContain('source package');
  });

  it('links five real core references without escaping the skill root', () => {
    const paths = ['SKILL.md', ...names.map((name) => 'references/core/' + name)];
    for (const name of names) {
      expect(read('SKILL.md')).toContain('(references/core/' + name + ')');
    }
    for (const path of paths) {
      const content = read(path);
      const base = dirname(join(root, path));
      for (const match of content.matchAll(/\]\(([^)#]+\.md)(?:#[^)]*)?\)/g)) {
        const target = resolve(base, match[1]);
        expect(target.startsWith(resolve(root) + sep)).toBe(true);
        expect(existsSync(target)).toBe(true);
        expect(realpathSync(target).startsWith(realpathSync(root) + sep)).toBe(true);
      }
    }
  });

  it('lists 31 active names and excludes five retired trivia v1 tools', () => {
    const inventory = readFileSync(join(process.cwd(), 'plans', 'tool-inventory.md'), 'utf8');
    const frozen = Array.from(
      inventory.matchAll(/^\|\s*\d+\s*\|\s*\x60([a-z_]+)\x60\s*\|/gm),
      (match) => match[1],
    );
    const listed = Array.from(
      read('references/core/tool-sequences.md').matchAll(/^\|\s*\d+\s*\|\s*([a-z0-9_]+)\s*\|/gm),
      (match) => match[1],
    );
    expect(frozen).toHaveLength(33);
    const retired = new Set(['trivia_find_similar_facts', 'trivia_register_and_reserve_facts',
      'trivia_release_facts', 'save_post', 'revise_post']);
    expect(listed).toEqual([...frozen.filter((name) => !retired.has(name)),
      'trivia_find_similar_facts_v2', 'save_post_v2', 'revise_post_v2']);
    expect(listed).toHaveLength(31);
  });

  it('covers clarification, retry, stale state and manual boundaries', () => {
    const sequences = read('references/core/tool-sequences.md');
    for (const id of [
      'EV-CL-001',
      'EV-CL-003',
      'EV-CL-006',
      'EV-RC-007',
      'EV-RC-009',
      'EV-RC-012',
      'EV-RC-021',
      'EV-RC-029',
      'EV-NG-001',
      'EV-NG-006',
      'EV-NG-011',
      'EV-RC-032',
    ]) {
      expect(sequences).toContain('| ' + id + ' |');
    }
    const lifecycle = read('references/core/lifecycle.md');
    expect(lifecycle).toContain('OPERATION_KEY_REUSED');
    expect(lifecycle).toContain('REVISION_CONFLICT');
    expect(lifecycle).toContain('explicit_correction=true');
    expect(lifecycle).toContain('same operation_key');
  });

  it('requires server metrics and rejects retired trivia instructions', () => {
    const skill = read('SKILL.md');
    const workflow = read('references/core/workflow.md');
    const output = read('references/core/output-contract.md');
    expect(skill).toContain('content_payload.text_metrics: {}');
    expect(workflow).toContain('text_metrics: {}');
    expect(output).toContain('server-returned `text_metrics`');
    const packaged = [skill, ...names.map((name) => read('references/core/' + name)),
      ...['content-dna', 'formats', 'fact-checking', 'dedup-ontology', 'quality-rubric',
        'reference-patterns', 'writing-playbook']
        .map((name) => read('references/niches/trivia/' + name + '.md'))].join('\\n');
    for (const retired of ['trivia_find_similar_facts', 'trivia_register_and_reserve_facts',
      'trivia_release_facts', 'save_post', 'revise_post']) {
      expect(packaged).not.toMatch(new RegExp('\\b' + retired + '\\b'));
    }
  });

  it('preserves explicit saves, batch limits and separate copy sections', () => {
    const workflow = read('references/core/workflow.md');
    const output = read('references/core/output-contract.md');
    const sources = read('references/core/source-policy.md');
    expect(workflow).toContain('maximum 3');
    expect(workflow).toContain('30-minute');
    expect(workflow).toContain('report_content_plan_item_failure');
    expect(workflow).toContain('replace_discarded_plan_item');
    expect(output).toContain('CANVA COPY');
    expect(output).toContain('FACEBOOK CAPTION');
    expect(output).toContain('HASHTAGS');
    expect(output).toContain('INFORMASI INTERNAL');
    expect(output).toContain('unsaved');
    expect(output).toContain('manual');
    expect(sources).toContain('source_url');
    expect(sources).toContain('untrusted data');
  });
});

describe('CR-053 P6 primary v2 instructions and scripted host fixtures (not live AI)', () => {
  it('makes v2 primary with scoped counts, URL research, replacement and mandatory readback', () => {
    const skill = read('SKILL.md');
    const workflow = read('references/core/workflow.md');
    for (const term of ['save_post_v2', 'revise_post_v2', 'trivia_find_similar_facts_v2',
      'source_url', 'three', 'get_post', 'get_content_plan', 'same', 'before', 'one']) {
      expect((skill + workflow).toLowerCase()).toContain(term.toLowerCase());
    }
    for (const term of ['without a number means one', 'above 100 before Write',
      'exactly that many items', 'theme in `plan_intent`', 'claim one item',
      'before final copy', 'six-digit', 'No tier, expiry, ontology',
      'No year is mandatory', 'unknown', 'before changing facts',
      'HTTP 200', 'not Setujui/ready', 'never recreate completed', 'Indonesian']) {
      expect(skill.toLowerCase()).toContain(term.toLowerCase());
    }
    expect(skill.indexOf('trivia_find_similar_facts_v2')).toBeLessThan(skill.indexOf('save_post_v2'));
    const quality = read('references/niches/trivia/quality-rubric.md');
    for (const criterion of ['meaning_preserved', 'caption_no_new_claim', 'no_known_substantive_issue']) {
      expect(quality).toContain(criterion);
    }
    expect(quality).toContain('Style/novelty suggestions are nonblocking');
    const source = read('references/niches/trivia/fact-checking.md');
    expect(source).toContain('one `source_url` is sufficient');
    expect(source).toContain('topic category alone does not impose a two-source quota');
  });

  it('validates one/five-draft scripted host traces and rejects missing readback, reserve or duplicate completed output', () => {
    type Event = { tool: string; post?: string; payload?: typeof single.request };
    // Golden fixture sequences exercise the documented contract, not a ChatGPT
    // decision engine. Actual rendered host execution remains P7.
    const steps = (example: typeof single): Event[] => [
      { tool: 'trivia_find_similar_facts_v2' }, { tool: 'get_page_generation_context' },
      { tool: 'save_post_v2', post: example.response.data.post.post_public_id, payload: example.request },
      { tool: 'get_post', post: example.response.data.post.post_public_id },
    ];
    const verify = (events: Event[], expected: number, completed: string[] = []) => {
      const saves = events.filter(e => e.tool === 'save_post_v2');
      expect(saves).toHaveLength(expected);
      expect(new Set(saves.map(e => e.post)).size).toBe(expected);
      expect(events.some(e => e.tool.includes('reserve'))).toBe(false);
      for (const save of saves) {
        expect(completed).not.toContain(save.post);
        const i = events.indexOf(save);
        expect(events[i - 1].tool).toBe('get_page_generation_context');
        expect(events[i + 1]).toMatchObject({ tool: 'get_post', post: save.post });
        expect(save.payload?.request_schema_version).toBe(2);
        for (const fact of save.payload!.facts) {
          expect(fact.source_url).toMatch(/^https?:\/\//);
          expect(Object.keys(fact).sort()).toEqual(['candidate_key', 'claim_text', 'dedup', 'position', 'source_url']);
        }
      }
    };
    verify(steps(single), 1);
    expect(single.request.plan_item).toBeNull();
    const five: Event[] = [{ tool: 'create_content_plan' }, ...batch.flatMap(example => [
      { tool: 'claim_content_plan_items' }, ...steps(example), { tool: 'get_content_plan' },
    ])];
    verify(five, 5);
    const completed = batch.slice(0, 3).map(e => e.response.data.post.post_public_id);
    const resumed: Event[] = [{ tool: 'get_content_plan' }, ...batch.slice(3).flatMap(example => [
      { tool: 'claim_content_plan_items' }, ...steps(example), { tool: 'get_content_plan' },
    ])];
    verify(resumed, 2, completed);
    expect(resumed[0].tool).toBe('get_content_plan');
    expect(() => verify(steps(single).filter(e => e.tool !== 'get_post'), 1)).toThrow();
    expect(() => verify([{ tool: 'trivia_register_and_reserve_facts' }, ...steps(single)], 1)).toThrow();
    expect(() => verify(steps(batch[0]), 1, completed)).toThrow();
    expect(lostResponseReplay.request).toEqual(batch[3].request);
    expect(lostResponseReplay.response.data.post.post_public_id).toBe(batch[3].response.data.post.post_public_id);
    expect(partialProgress.progress.completed).toBe(completed.length);
  });

  it('separates public copy from internal evidence and reports Indonesian progress/unknown honestly', () => {
    const output = read('references/core/output-contract.md');
    for (const term of ['Diminta 5 draft; 3 terbukti', '2 tersisa', 'FACT_REUSE_BLOCKED',
      'Hasil Write belum', 'RPC_RESPONSE_INVALID', 'ID diagnostik', 'host refusal',
      'actions actually tried', 'HTTP 200', 'sources/checks']) expect(output).toContain(term);
    const fields = [single.request.content_payload.canva_copy, single.request.content_payload.caption,
      ...single.request.content_payload.hashtags].join('\n');
    expect(fields).not.toContain(single.request.facts[0].source_url);
    expect(fields).not.toContain(single.response.data.post.post_public_id);
    const sequence = read('references/core/tool-sequences.md');
    expect(sequence).toContain('31 active tools, 11 Read/20 Write');
    expect(sequence).toContain('Shared reads/plan/lifecycle');
    expect(sequence).toContain('not deployment evidence');
  });
});


// CR-061: test-only scripted contract oracle. The declared review verdicts and
// synthetic copy are NOT an LLM evaluator or proof of factual/natural writing.
type EditorialRequest = typeof single.request & {
  post_public_id?: string; expected_revision?: number; expected_content_hash?: string;
};
type EditorialEvent =
  | { kind: 'intent'; drafts: number | null; factCount: 'adaptive' | number; explicitFixed?: number }
  | { kind: 'review'; copy: string; ready: boolean; repeatedPayoff?: boolean; weakEnding?: boolean; comparisonDevice?: 'paired' | 'adjacent' | 'baseline' | 'none' }
  | { kind: 'repair'; method: 'edit' | 'replace'; sourced?: boolean; deduped?: boolean; forcedDistinct?: boolean }
  | { kind: 'context'; timestamp: string; catalog: string }
  | { kind: 'read_post'; post: string; revision: number; hash: string }
  | { kind: 'write'; tool: 'save_post_v2' | 'revise_post_v2'; request: EditorialRequest;
      post: string; result: 'success' | 'unknown' | 'revision_conflict' }
  | { kind: 'readback'; post: string; copy: string }
  | { kind: 'report'; outcome: 'verified' | 'mismatch' | 'unknown' }
  | { kind: 'limit'; requested: number; proven: number; remaining: number; reason: string };
type EditorialScope = { drafts: number; revisePost?: string; requiredQualifier?: string; factBoundaries?: { position: number; terms: string[] }[] };

const allowedEditorialFormats = new Set(['single_subject_fast', 'themed_utility',
  'emotional_animal_collection', 'comparison', 'myth_vs_fact']);
function rejectTrace(message: string): never { throw new Error(message); }

function verifyEditorialTrace(events: EditorialEvent[], scope: EditorialScope): void {
  let intent: Extract<EditorialEvent, { kind: 'intent' }> | undefined;
  let review: Extract<EditorialEvent, { kind: 'review' }> | undefined;
  let needsRepair = false;
  let pending: Extract<EditorialEvent, { kind: 'write' }> | undefined;
  let unknown: string | undefined;
  let matched = false;
  let rounds = 0;
  let exhausted = false;
  let stopped = false;
  const created = new Set<string>();
  const proven = new Set<string>();
  const cas = new Map<string, { revision: number; hash: string }>();
  for (const [i, event] of events.entries()) {
    if (stopped) rejectTrace('attempt already stopped');
    if (exhausted && event.kind !== 'limit') rejectTrace('two-round limit requires a limitation report');
    if (unknown && event.kind !== 'write' && event.kind !== 'report')
      rejectTrace('reconcile unknown before changing copy');
    switch (event.kind) {
      case 'intent':
        intent = event;
        if (typeof event.factCount === 'number' && event.factCount !== event.explicitFixed)
          rejectTrace('draft count became implicit fact count');
        break;
      case 'review':
        if (needsRepair) rejectTrace('repair required before another review');
        review = event;
        needsRepair = !event.ready;
        exhausted = !event.ready && rounds === 2;
        break;
      case 'repair':
        if (event.forcedDistinct) rejectTrace('never force DISTINCT');
        if (!needsRepair) rejectTrace('repair must address a failed review');
        if (event.method === 'replace' && (!event.sourced || !event.deduped))
          rejectTrace('replacement needs source and dedup');
        rounds++;
        review = undefined; needsRepair = false;
        break;
      case 'context':
        break;
      case 'read_post':
        cas.set(event.post, { revision: event.revision, hash: event.hash });
        break;
      case 'write': {
        const request = event.request;
        const signature = JSON.stringify({ tool: event.tool, request, post: event.post });
        const replay = unknown !== undefined;
        if (replay && signature !== unknown) rejectTrace('unknown replay must keep key and payload');
        if (!replay) {
          if (!intent || intent.drafts === null || intent.drafts !== scope.drafts)
            rejectTrace('unresolved draft count');
          if (!review?.ready || needsRepair) rejectTrace('finish DNA repair before Write');
          if (review.copy !== request.content_payload.canva_copy)
            rejectTrace('review/payload mismatch');
          if (scope.requiredQualifier && !review.copy.includes(scope.requiredQualifier))
            rejectTrace('material qualifier lost');
          // Manually annotated, synthetic contract cases only; not an AI evaluator.
          for (const boundary of scope.factBoundaries ?? []) {
            const line = request.content_payload.body.facts.find(f => f.position === boundary.position)?.text ?? '';
            if (boundary.terms.some(term => !line.toLowerCase().includes(term.toLowerCase())))
              rejectTrace('material boundary must remain on its fact');
          }
          if (review.repeatedPayoff || review.weakEnding)
            rejectTrace('curate repeated payoff or weak ending before Write');
          if (request.format_key === 'comparison' && review.comparisonDevice === 'none')
            rejectTrace('comparison needs an actual device');
          if (!allowedEditorialFormats.has(request.format_key)) rejectTrace('unsupported format');
          if (typeof intent.factCount === 'number' && request.facts.length !== intent.factCount)
            rejectTrace('fixed fact count changed');
          if (event.tool === 'save_post_v2') {
            if (created.has(event.post)) rejectTrace('duplicate saved post');
            if (created.size >= scope.drafts) rejectTrace('draft scope exceeded');
            created.add(event.post);
          } else {
            if (scope.revisePost !== event.post || request.post_public_id !== event.post)
              rejectTrace('revision needs same-post scope');
            const state = cas.get(event.post);
            if (!state || request.expected_revision !== state.revision ||
                request.expected_content_hash !== state.hash) rejectTrace('fresh reviewed CAS required');
          }
          const context = events[i - 1];
          if (context?.kind !== 'context' || context.timestamp !== request.expected_config_updated_at ||
              context.catalog !== request.expected_catalog_version) rejectTrace('fresh exact context required');
        }
        if (request.request_schema_version !== 2 ||
            JSON.stringify(request.content_payload.text_metrics) !== '{}') rejectTrace('v2 metrics contract');
        if (Object.keys(request.editorial_checks).sort().join(',') !==
            'caption_no_new_claim,meaning_preserved,no_known_substantive_issue' ||
            Object.values(request.editorial_checks).some(v => v !== 'pass'))
          rejectTrace('exactly three honest pass attestations');
        if (event.result === 'unknown') unknown = signature;
        else {
          unknown = undefined;
          if (event.result === 'revision_conflict') {
            cas.delete(event.post); review = undefined; pending = undefined;
          } else { pending = event; matched = false; }
        }
        break;
      }
      case 'readback':
        if (!pending || event.post !== pending.post) rejectTrace('same-post readback required');
        matched = event.copy === pending.request.content_payload.canva_copy;
        if (matched) { proven.add(event.post); rounds = 0; }
        break;
      case 'report':
        if (event.outcome === 'verified' && (!pending || !matched || unknown))
          rejectTrace('readback not verified');
        if (event.outcome === 'mismatch' && (!pending || matched))
          rejectTrace('no observed mismatch');
        if (event.outcome === 'unknown' && !unknown) rejectTrace('no unknown outcome');
        break;
      case 'limit':
        if (!exhausted || !event.reason.trim() || event.requested !== scope.drafts ||
            event.proven !== proven.size || event.remaining !== scope.drafts - proven.size)
          rejectTrace('limitation must report requested/proven/remaining honestly');
        stopped = true;
        break;
    }
  }
  if (exhausted && !stopped) rejectTrace('exhausted review must report limitation');
  if (pending && !['report', 'limit'].includes(events.at(-1)?.kind ?? ''))
    rejectTrace('report observed outcome');
}

const editorialRequest = (): EditorialRequest => structuredClone(single.request);
const intentEvent = (drafts: number | null = 1): Extract<EditorialEvent, { kind: 'intent' }> =>
  ({ kind: 'intent', drafts, factCount: 'adaptive' });
const contextEvent = (request: EditorialRequest): EditorialEvent =>
  ({ kind: 'context', timestamp: request.expected_config_updated_at, catalog: request.expected_catalog_version });
const readyEvent = (request: EditorialRequest): EditorialEvent =>
  ({ kind: 'review', copy: request.content_payload.canva_copy, ready: true });
const writeEvent = (request: EditorialRequest): Extract<EditorialEvent, { kind: 'write' }> =>
  ({ kind: 'write', tool: 'save_post_v2', request, post: 'synthetic-post', result: 'success' });
const savedTrace = (request = editorialRequest()): EditorialEvent[] => [
  intentEvent(), readyEvent(request), contextEvent(request), writeEvent(request),
  { kind: 'readback', post: 'synthetic-post', copy: request.content_payload.canva_copy },
  { kind: 'report', outcome: 'verified' },
];

describe('CR-061 writing obligations and scripted traces (SOURCE/FIXTURE only)', () => {
  it('routes DNA/index before angle and two cards/anti-example before composition', () => {
    const skill = read('SKILL.md');
    for (const path of ['content-dna', 'reference-patterns', 'writing-playbook']) {
      expect(skill).toContain('(references/niches/trivia/' + path + '.md)');
    }
    for (const text of ['read DNA and the pattern index before choosing an angle',
      'two', 'relevant complete cards', 'one relevant anti-example before composing',
      'playbook for final review', 'Draft count is not fact count',
      'five drafts never imply', 'explicit fixed count/title/layout']) expect(skill).toContain(text);
  });

  it('keeps all hard budgets and teaches varied comparison/direct correction without padding', () => {
    const formats = read('references/niches/trivia/formats.md');
    for (const term of ['within each pair', 'dimensions may differ between lines',
      'literal table', 'Correct it directly', 'labels are optional',
      'Default hook \x60Did you know?\x60.', 'not a minimum', 'fixed: 5',
      '18 words/fact', '12 in hook', '14 in CTA', '100 Canva words',
      '3 wrapped lines/fact', '2 wrapped lines for hook or CTA',
      '\x60replay_ratio\x60 2.5', '\x60estimated_loops\x60 3',
      'hook 45 chars, fact 90, rendered facts block 500, CTA 50, full Canva copy 600, caption 500',
      '90, 120, 650, 100, 750 and 1,000']) expect(formats).toContain(term);
  });

  it('requires pre-Write editing, unchanged three checks and same readback across contracts', () => {
    const files = ['SKILL.md', 'references/core/workflow.md', 'references/core/output-contract.md',
      'references/niches/trivia/quality-rubric.md', 'references/niches/trivia/writing-playbook.md'];
    for (const path of files) {
      const text = read(path).replace(/\s+/g, ' ');
      expect(text).toMatch(/before (?:save\/revise|Write)/);
      expect(text).toContain('no_known_substantive_issue');
      expect(text).toMatch(/not a (?:DNA\/style|style)/);
      expect(text).toContain('readback');
      expect(text).toContain('same post');
      expect(text).toMatch(/(?:No|no) (?:new DNA field or )?routine (?:preview\/GO|preview\/GO checkpoint)/);
    }
    const rubric = read('references/niches/trivia/quality-rubric.md');
    for (const term of ['not a fourth attestation', 'quality_status: passed',
      'Explicit owner Setujui', 'revision/hash', 'Static tests cannot prove naturalness'])
      expect(rubric).toContain(term);
  });

  it('stops an academically worded card with three pass checks until repair and renewed review', () => {
    const request = editorialRequest();
    const bad: EditorialEvent = { kind: 'review', copy: 'Academic synthetic draft', ready: false };
    const trace: EditorialEvent[] = [intentEvent(), bad, contextEvent(request), writeEvent(request)];
    expect(Object.values(request.editorial_checks)).toEqual(['pass', 'pass', 'pass']);
    expect(() => verifyEditorialTrace(trace, { drafts: 1 })).toThrow(/finish DNA repair/);
    const repaired: EditorialEvent[] = [intentEvent(), bad,
      { kind: 'repair', method: 'edit' }, ...savedTrace(request).slice(1)];
    expect(() => verifyEditorialTrace(repaired, { drafts: 1 })).not.toThrow();
    expect(() => verifyEditorialTrace([intentEvent(), bad, readyEvent(request)], { drafts: 1 }))
      .toThrow(/repair required/);
    expect(() => verifyEditorialTrace([intentEvent(), bad,
      { kind: 'repair', method: 'replace', sourced: true, deduped: false },
      ...savedTrace(request).slice(1)], { drafts: 1 })).toThrow(/source and dedup/);
  });

  it('rejects qualifier loss or an unsupported format before any accepted Write', () => {
    // Phrase is a synthetic semantic guard for this case, not a claim verification.
    const request = editorialRequest();
    request.content_payload.hook = 'Some trained dogs — synthetic fixture';
    request.content_payload.canva_copy = [request.content_payload.hook,
      ...request.content_payload.body.facts.map(f => f.text), request.content_payload.cta].join('\n\n');
    expect(() => verifyEditorialTrace(savedTrace(request),
      { drafts: 1, requiredQualifier: 'Some trained dogs' })).not.toThrow();
    const shortened = structuredClone(request);
    shortened.content_payload.canva_copy = shortened.content_payload.canva_copy.replace('Some trained dogs', 'Dogs');
    expect(() => verifyEditorialTrace(savedTrace(shortened),
      { drafts: 1, requiredQualifier: 'Some trained dogs' })).toThrow(/qualifier lost/);
    const unsupported = editorialRequest(); unsupported.format_key = 'invented_format';
    expect(() => verifyEditorialTrace(savedTrace(unsupported), { drafts: 1 })).toThrow(/unsupported format/);
  });

  it('distinguishes five drafts from fixed facts and blocks ambiguous count', () => {
    const adaptive: EditorialEvent = { kind: 'intent', drafts: 5, factCount: 'adaptive' };
    expect(() => verifyEditorialTrace([adaptive], { drafts: 5 })).not.toThrow();
    const five: EditorialEvent[] = [adaptive, ...batch.flatMap((example) => {
      const request = structuredClone(example.request);
      const post = example.response.data.post.post_public_id;
      return [readyEvent(request), contextEvent(request), { ...writeEvent(request), post },
        { kind: 'readback' as const, post, copy: request.content_payload.canva_copy },
        { kind: 'report' as const, outcome: 'verified' as const }];
    })];
    expect(() => verifyEditorialTrace(five, { drafts: 5 })).not.toThrow();
    expect(() => verifyEditorialTrace([{ ...adaptive, factCount: 5 }], { drafts: 5 }))
      .toThrow(/implicit fact count/);
    const fixed: EditorialEvent = { ...intentEvent(), factCount: 5, explicitFixed: 5 };
    expect(() => verifyEditorialTrace([fixed, ...savedTrace().slice(1)], { drafts: 1 })).not.toThrow();
    expect(() => verifyEditorialTrace([intentEvent(null), ...savedTrace().slice(1)], { drafts: 1 }))
      .toThrow(/unresolved draft count/);
  });

  it('rejects reviewed/preview payload drift and does not turn a mismatched readback into success', () => {
    const trace = savedTrace();
    const request = editorialRequest(); request.content_payload.canva_copy = 'Formal different payload';
    trace[3] = writeEvent(request);
    expect(() => verifyEditorialTrace(trace, { drafts: 1 })).toThrow(/review\/payload mismatch/);
    const mismatch = savedTrace(); mismatch[4] = { kind: 'readback', post: 'synthetic-post', copy: 'Different' };
    expect(() => verifyEditorialTrace(mismatch, { drafts: 1 })).toThrow(/readback not verified/);
    mismatch[5] = { kind: 'report', outcome: 'mismatch' };
    expect(() => verifyEditorialTrace(mismatch, { drafts: 1 })).not.toThrow();
    expect(() => verifyEditorialTrace(savedTrace().filter(e => e.kind !== 'readback'), { drafts: 1 }))
      .toThrow(/readback not verified/);
    const replacement = editorialRequest(); replacement.operation_key = 'synthetic-new-operation';
    expect(() => verifyEditorialTrace([...mismatch, readyEvent(replacement), contextEvent(replacement),
      { ...writeEvent(replacement), post: 'replacement-post' }], { drafts: 1 })).toThrow(/scope exceeded/);
  });

  it('preserves exact context, bounded scope and identical unknown replay before changes', () => {
    const request = editorialRequest();
    const lost = { ...writeEvent(request), result: 'unknown' as const };
    const prefix: EditorialEvent[] = [intentEvent(), readyEvent(request), contextEvent(request), lost];
    expect(() => verifyEditorialTrace([...prefix, writeEvent(request),
      ...savedTrace(request).slice(4)], { drafts: 1 })).not.toThrow();
    const changed = structuredClone(request); changed.operation_key = 'synthetic-new-key';
    expect(() => verifyEditorialTrace([...prefix, writeEvent(changed)], { drafts: 1 }))
      .toThrow(/keep key and payload/);
    const changedCopy = structuredClone(request); changedCopy.content_payload.caption = 'Changed on retry';
    expect(() => verifyEditorialTrace([...prefix, writeEvent(changedCopy)], { drafts: 1 }))
      .toThrow(/keep key and payload/);
    expect(() => verifyEditorialTrace([...prefix, { kind: 'repair', method: 'edit' }], { drafts: 1 }))
      .toThrow(/reconcile unknown/);
    const rounded = savedTrace(); rounded[2] = { kind: 'context',
      timestamp: request.expected_config_updated_at.replace('123456', '123000'),
      catalog: request.expected_catalog_version };
    expect(() => verifyEditorialTrace(rounded, { drafts: 1 })).toThrow(/fresh exact context/);
  });

  it('requires explicit same-post revision scope and fresh reviewed CAS after conflict', () => {
    const request = editorialRequest();
    Object.assign(request, { post_public_id: 'existing-post', expected_revision: 3,
      expected_content_hash: 'synthetic-reviewed-hash' });
    const write: EditorialEvent = { ...writeEvent(request), tool: 'revise_post_v2', post: 'existing-post' };
    const before: EditorialEvent[] = [intentEvent(),
      { kind: 'read_post', post: 'existing-post', revision: 3, hash: 'synthetic-reviewed-hash' },
      readyEvent(request), contextEvent(request)];
    const after: EditorialEvent[] = [
      { kind: 'readback', post: 'existing-post', copy: request.content_payload.canva_copy },
      { kind: 'report', outcome: 'verified' }];
    const scope = { drafts: 1, revisePost: 'existing-post' };
    expect(() => verifyEditorialTrace([...before, write, ...after], scope)).not.toThrow();
    expect(() => verifyEditorialTrace([...before, write, ...after], { drafts: 1 })).toThrow(/same-post scope/);
    const conflict: EditorialEvent = { ...write, result: 'revision_conflict' };
    const retry = [intentEvent(), ...before.slice(1), conflict, readyEvent(request), contextEvent(request), write];
    expect(() => verifyEditorialTrace(retry, scope)).toThrow(/fresh reviewed CAS/);
    expect(() => verifyEditorialTrace([...before, conflict, ...before.slice(1), write, ...after], scope))
      .not.toThrow();
  });
});

const exhaustedEditorialTrace = (drafts = 1): EditorialEvent[] => {
  const failed: EditorialEvent = { kind: 'review', copy: 'Synthetic weak collection', ready: false };
  return [intentEvent(drafts), failed, { kind: 'repair', method: 'edit' }, failed,
    { kind: 'repair', method: 'replace', sourced: true, deduped: true }, failed];
};
const limitEvent = (drafts = 1, proven = 0): EditorialEvent =>
  ({ kind: 'limit', requested: drafts, proven, remaining: drafts - proven,
    reason: 'Two directed rounds still lack an eligible varied set.' });

describe('CR-061 two-round dead-end recovery (scripted fixture, not live AI)', () => {
  it('requires bounded repair and honest limitation reporting in all entry points', () => {
    for (const path of ['SKILL.md', 'references/core/workflow.md',
      'references/niches/trivia/quality-rubric.md', 'references/niches/trivia/writing-playbook.md']) {
      const text = read(path).replace(/\s+/g, ' ');
      expect(text).toContain('two directed editorial repair rounds still fail');
      expect(text).toMatch(/report (?:the limitation|limitations)/);
      expect(text).toMatch(/(?:silently reduc|silent count reduction)/);
      expect(text).toMatch(/(?:forced?|forcing) DISTINCT/);
      expect(text).toMatch(/replacement post/);
    }
    const playbook = read('references/niches/trivia/writing-playbook.md');
    expect(playbook).toContain('third automatic repair round');
    expect(playbook).toContain('Walkthrough A — the diameter list');
    expect(playbook).toContain('Walkthrough B — two caregiving lines');
  });

  it('stops after two failed repair rounds and rejects filler saves or a third loop', () => {
    const exhausted = exhaustedEditorialTrace();
    expect(() => verifyEditorialTrace([...exhausted, limitEvent()], { drafts: 1 })).not.toThrow();
    expect(() => verifyEditorialTrace(exhausted, { drafts: 1 })).toThrow(/must report limitation/);
    expect(() => verifyEditorialTrace([...exhausted, { kind: 'repair', method: 'edit' }],
      { drafts: 1 })).toThrow(/two-round limit/);
    const request = editorialRequest();
    expect(() => verifyEditorialTrace([...exhausted, contextEvent(request), writeEvent(request)],
      { drafts: 1 })).toThrow(/two-round limit/);
    expect(() => verifyEditorialTrace([...exhausted, limitEvent(), ...savedTrace()],
      { drafts: 1 })).toThrow(/already stopped/);
  });

  it('permits success in round two but rejects forced DISTINCT or silent fixed-count reduction', () => {
    const request = editorialRequest();
    const roundTwo = exhaustedEditorialTrace().slice(0, -1);
    expect(() => verifyEditorialTrace([...roundTwo, ...savedTrace(request).slice(1)],
      { drafts: 1 })).not.toThrow();
    const forced: EditorialEvent[] = [intentEvent(),
      { kind: 'review', copy: 'Weak set', ready: false },
      { kind: 'repair', method: 'replace', sourced: true, deduped: true, forcedDistinct: true }];
    expect(() => verifyEditorialTrace(forced, { drafts: 1 })).toThrow(/never force DISTINCT/);
    const fixedSeven: EditorialEvent = { kind: 'intent', drafts: 1, factCount: 7, explicitFixed: 7 };
    expect(() => verifyEditorialTrace([fixedSeven, ...savedTrace(request).slice(1)],
      { drafts: 1 })).toThrow(/fixed fact count changed/);
  });

  it('preserves already read-back output and reports the exact remaining count without replacement', () => {
    const first = savedTrace();
    first[0] = intentEvent(2);
    const blockedSecond = exhaustedEditorialTrace(2).slice(1);
    const stopped = [...first, ...blockedSecond, limitEvent(2, 1)];
    expect(() => verifyEditorialTrace(stopped, { drafts: 2 })).not.toThrow();
    expect(stopped.filter(e => e.kind === 'write')).toHaveLength(1);
    expect(() => verifyEditorialTrace([...first, ...blockedSecond, limitEvent(2, 2)],
      { drafts: 2 })).toThrow(/honestly/);
    const replacement = editorialRequest(); replacement.operation_key = 'synthetic-replacement';
    expect(() => verifyEditorialTrace([...stopped, readyEvent(replacement),
      contextEvent(replacement), { ...writeEvent(replacement), post: 'replacement-post' }],
      { drafts: 2 })).toThrow(/already stopped/);
  });
});


describe('CR-061 saved-copy regression decisions #134–#136 (synthetic trace, not D6)', () => {
  it('requires scope and approximation on the affected fact, not another line or caption', () => {
    const request = editorialRequest();
    const text = 'About half within the observed sample — synthetic fixture.';
    request.content_payload.body.facts[0].text = text;
    const assemble = () => {
      request.content_payload.canva_copy = [
        request.content_payload.hook,
        ...request.content_payload.body.facts.map(f => f.text),
        request.content_payload.cta,
      ].join('\n\n');
    };
    const scope: EditorialScope = { drafts: 1,
      factBoundaries: [{ position: 1, terms: ['about', 'within the observed sample'] }] };
    assemble();
    expect(() => verifyEditorialTrace(savedTrace(request), scope)).not.toThrow();
    request.content_payload.body.facts[0].text = 'Half of everything — synthetic fixture.';
    request.content_payload.caption = text;
    request.content_payload.body.facts[1].text = text;
    assemble();
    expect(() => verifyEditorialTrace(savedTrace(request), scope))
      .toThrow(/boundary must remain on its fact/);
  });

  it('does not accept a ready flag and three pass attestations over a known repeated payoff or weak ending', () => {
    for (const defect of [{ repeatedPayoff: true }, { weakEnding: true }]) {
      const request = editorialRequest();
      const events = savedTrace(request);
      events[1] = { ...readyEvent(request) as Extract<EditorialEvent, { kind: 'review' }>, ...defect };
      expect(() => verifyEditorialTrace(events, { drafts: 1 }))
        .toThrow(/curate repeated payoff or weak ending/);
    }
  });

  it('rejects comparison with no device even when its enum and CTA are valid', () => {
    const request = editorialRequest();
    request.format_key = 'comparison';
    for (const device of ['paired', 'adjacent', 'baseline', 'none'] as const) {
      const events = savedTrace(request);
      events[1] = { ...readyEvent(request) as Extract<EditorialEvent, { kind: 'review' }>,
        comparisonDevice: device };
      if (device === 'none')
        expect(() => verifyEditorialTrace(events, { drafts: 1 })).toThrow(/actual device/);
      else expect(() => verifyEditorialTrace(events, { drafts: 1 })).not.toThrow();
    }
  });
});
