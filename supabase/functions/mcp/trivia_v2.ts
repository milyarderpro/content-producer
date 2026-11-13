// CR-053/054/056: transport shapes only; identity and transactions stay in RPCs.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { postInputText, unicodeText, editorialKey, postEditorialContext, ctaPlacement } from './editorial_schemas.ts';
import { invoke } from './foundation.ts';

export const uuidV2 = z.string().uuid();
export const preciseTimestamp = z.string().datetime({ offset: true }).regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}(Z|[+-]\d{2}:\d{2})$/,
);
export const catalogVersion = z.string().regex(/^(0|[1-9][0-9]*)$/).max(19);
export const hashV2 = z.string().regex(/^[0-9a-f]{64}$/);
const candidateKey = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const claim = unicodeText(500);
// No fetch/DNS or source-content verification in the MCP adapter.
export const sourceUrlV2 = z.string().min(1).max(2048).url().refine((value) => {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password &&
      !/^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.test|.*\.invalid)$/.test(host) &&
      !/^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) &&
      !(host.includes(':') && /^(::|fc|fd|fe[89ab])/i.test(host));
  } catch {
    return false;
  }
}, 'Use a public http/https source URL without credentials');
const review = z.strictObject({
  fact_public_id: uuidV2,
  decision: z.enum(['same', 'distinct']),
  reason: z.string().min(1).max(300).optional(),
});
export const factV2 = z.strictObject({
  position: z.number().int().min(1).max(9),
  candidate_key: candidateKey,
  claim_text: claim,
  source_url: sourceUrlV2,
  dedup: z.discriminatedUnion('decision', [
    z.strictObject({ complete: z.literal(true), decision: z.literal('same'),
      fact_public_id: uuidV2, reviews: z.array(review).min(1).max(20) }),
    z.strictObject({ complete: z.literal(true), decision: z.literal('distinct'),
      fact_public_id: z.null(), reviews: z.array(review).max(20) }),
  ]),
});
const editorialResult = z.enum(['pass', 'needs_revision']);
export const editorialInputV2 = z.strictObject({
  meaning_preserved: editorialResult,
  caption_no_new_claim: editorialResult,
  no_known_substantive_issue: editorialResult,
});
export const contentV2 = z.strictObject({
  schema_version: z.literal(2),
  hook: z.string().min(1).max(120),
  body: z.strictObject({
    subject: z.string().min(1).max(120).optional(),
    facts: z.array(z.strictObject({ position: z.number().int().min(1).max(9),
      text: z.string().min(1).max(90) })).min(1).max(9),
  }),
  cta: z.string().min(1).max(120),
  canva_copy: z.string().min(1).max(3000),
  caption: z.string().max(500),
  hashtags: z.array(z.string().min(1).max(80)).max(5),
  render_style: z.enum(['plain_lines', 'numbered']),
  text_metrics: z.strictObject({}),
});
const contentConfig2Base = contentV2.extend({hook:postInputText(120),caption:postInputText(500,0),body:contentV2.shape.body.extend({subject:postInputText(120).optional(),facts:z.array(z.strictObject({position:z.number().int().min(1).max(12),text:postInputText(160)})).min(1).max(12)}),cta:postInputText(180),canva_copy:postInputText(1100),cta_placement:ctaPlacement.optional()});
export const contentConfig2 = contentConfig2Base.refine(v=>new TextEncoder().encode(JSON.stringify(v)).length<=16384,'Content payload exceeds 16 KiB');
export const contentConfig2Output = contentConfig2Base.extend({hook:unicodeText(120),caption:unicodeText(500,0),
 body:contentConfig2.shape.body.extend({subject:unicodeText(120).optional(),facts:z.array(z.strictObject({position:z.number().int().min(1).max(12),text:unicodeText(160)})).min(1).max(12)}),
 cta:unicodeText(180),canva_copy:unicodeText(1100),cta_placement:ctaPlacement});
export const systemEvidenceV2 = z.strictObject({
  schema_version: z.literal(2), post_revision: z.number().int().min(1),
  content_hash: hashV2, overall_status: z.enum(['passed', 'failed']),
  checks: z.array(z.strictObject({ id: z.string().min(1).max(120),
    status: z.enum(['passed', 'failed']) })).max(50),
});
export const editorialEvidenceV2 = z.strictObject({
  schema_version: z.literal(2), post_revision: z.number().int().min(1),
  content_hash: hashV2, overall_status: z.enum(['passed', 'failed']),
  checks: editorialInputV2,
});
const common = { request_schema_version: z.literal(2), workspace_public_id: uuidV2 };
const write = {
  ...common, operation_key: z.string().uuid({ version: 'v4' }),
  config_public_id: uuidV2, expected_config_updated_at: preciseTimestamp,
  expected_catalog_version: catalogVersion, content_schema_version: z.literal(2),
  format_key: z.enum(['single_subject_fast', 'themed_utility',
    'emotional_animal_collection', 'comparison', 'myth_vs_fact']),
  topic_key: z.string().regex(/^[a-z][a-z0-9_]{1,79}$/),
  interaction_goal: z.enum(['share', 'save', 'comment', 'follow']),
  facts: z.array(factV2).min(1).max(9), content_payload: contentV2,
  editorial_checks: editorialInputV2,
};
const findInput = z.strictObject({ ...common, page_public_id: uuidV2,
  candidates: z.array(z.strictObject({ candidate_key: candidateKey,
    claim_text: claim })).min(1).max(9) });
const saveInput1 = z.strictObject({ ...write, page_public_id: uuidV2,
  niche_key: z.literal('trivia'), scheduled_at: z.string().datetime({ offset: true }).nullable(),
  plan_item: z.strictObject({ plan_item_public_id: uuidV2, claim_token: uuidV2 }).nullable() });
const reviseInput1 = z.strictObject({ ...write, post_public_id: uuidV2,
  expected_revision: z.number().int().min(1), expected_content_hash: hashV2,
  revision_reason: z.string().min(1).max(500) });
const writeConfig2 = {...write,format_key:editorialKey,topic_key:editorialKey,interaction_goal:write.interaction_goal.nullable().optional(),
  editorial_context:postEditorialContext,facts:z.array(factV2.extend({position:z.number().int().min(1).max(12)})).min(1).max(12),content_payload:contentConfig2};
const saveInput = z.union([saveInput1.extend({editorial_context:z.null().optional()}),saveInput1.extend(writeConfig2)]);
const reviseInput = z.union([reviseInput1.extend({editorial_context:z.null().optional()}),reviseInput1.extend(writeConfig2)]);
const envelope = <T extends z.ZodType>(data: T) =>
  z.strictObject({ response_schema_version: z.literal(2), data });
const findOutput = envelope(z.strictObject({ catalog_version: catalogVersion,
  candidates: z.array(z.strictObject({ candidate_key: candidateKey, complete: z.boolean(),
    matches: z.array(z.strictObject({ fact_public_id: uuidV2, claim_text: claim,
      status: z.enum(['needs_review', 'verified', 'rejected', 'invalidated', 'superseded']),
      fact_updated_at: preciseTimestamp,
      reuse_eligibility: z.enum(['eligible', 'page_blocked', 'workspace_blocked',
        'actively_reserved', 'not_eligible']),
      used_on_page: z.boolean(), used_in_workspace: z.boolean(),
    })).max(20) })).min(1).max(9) }));
const writeOutput = envelope(z.strictObject({
  post: z.strictObject({ post_public_id: uuidV2, page_public_id: uuidV2,
    content_schema_version: z.literal(2), status: z.literal('draft'),
    revision: z.number().int().min(1), content_hash: hashV2 }),
  plan: z.strictObject({ plan_public_id: uuidV2, requested_count: z.number().int().min(1).max(100),
    status: z.enum(['pending', 'in_progress', 'partially_completed', 'completed', 'failed', 'cancelled']),
    progress: z.strictObject({ pending: z.number().int().min(0), in_progress: z.number().int().min(0),
      completed: z.number().int().min(0), failed: z.number().int().min(0),
      cancelled: z.number().int().min(0) }) }).nullable(), replayed: z.boolean(),
}));
export const TRIVIA_V2_TOOL_NAMES = [
  'trivia_find_similar_facts_v2', 'save_post_v2', 'revise_post_v2',
] as const;
export function registerTriviaV2Tools(server: McpServer, context?: RequestContext): void {
  if (!context) return;
  const securitySchemes = [{ type: 'oauth2', scopes: ['openid', 'email'] }];
  server.registerTool('trivia_find_similar_facts_v2', {
    title: 'Find trivia facts v2',
    description: 'Find canonical matches from candidate sentences for a Page. Review all matches; incomplete results require replacing the candidate. No ontology or source metadata required.',
    inputSchema: findInput, outputSchema: findOutput,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { securitySchemes },
  }, (args) => invoke('trivia_find_similar_facts_v2', context,
    Object.fromEntries(Object.entries(args).map(([k, v]) => ['p_' + k, v])), findOutput));
  server.registerTool('save_post_v2', {
    title: 'Save trivia draft v2',
    description: 'Atomically save one reviewed draft with one source URL per fact and current catalog/config. No separate reservation. Read back with get_post; approval remains separate.',
    inputSchema: saveInput, outputSchema: writeOutput,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    _meta: { securitySchemes },
  }, (args) => invoke('save_post_v2', context,
    Object.fromEntries(Object.entries(args).map(([k, v]) => ['p_' + k, v])), writeOutput));
  server.registerTool('revise_post_v2', {
    title: 'Revise trivia draft v2',
    description: 'Revise v2 draft/ready content with current revision/hash and catalog/config. New editorial checks are required; ready returns to draft. Read back the same post.',
    inputSchema: reviseInput, outputSchema: writeOutput,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    _meta: { securitySchemes },
  }, (args) => invoke('revise_post_v2', context,
    Object.fromEntries(Object.entries(args).map(([k, v]) => ['p_' + k, v])), writeOutput));
}
