// Phase 6.13: owner-scoped metrics facade over immutable Phase 5 public RPCs.
// Facebook analytics are never fetched; supplied observations are never inferred.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';

const version = z.literal(1);
const uuid = z.string().uuid();
const timestamp = z.string().datetime({ offset: true });
const cursor = z.string().min(1).max(512);
const count = z.number().int().min(0);
const integerFields = {
  views: count.nullable(), reach: count.nullable(),
  reactions: count.nullable(), likes: count.nullable(),
  comments: count.nullable(), shares: count.nullable(),
  saves: count.nullable(), follows: count.nullable(),
};
const nonnegative = z.number().finite().min(0);
const metricFields = {
  ...integerFields,
  watch_time_seconds: nonnegative.nullable(),
  average_watch_time_seconds: nonnegative.nullable(),
};
const inputMetrics = z.strictObject({
  views: integerFields.views.optional(), reach: integerFields.reach.optional(),
  reactions: integerFields.reactions.optional(), likes: integerFields.likes.optional(),
  comments: integerFields.comments.optional(), shares: integerFields.shares.optional(),
  saves: integerFields.saves.optional(), follows: integerFields.follows.optional(),
  watch_time_seconds: metricFields.watch_time_seconds.optional(),
  average_watch_time_seconds: metricFields.average_watch_time_seconds.optional(),
}).superRefine((m, ctx) => {
  if (!Object.values(m).some(v => v !== null && v !== undefined)) {
    ctx.addIssue({ code: 'custom', message: 'At least one observed metric is required' });
  }
  if (m.likes != null && m.reactions != null && m.likes > m.reactions) {
    ctx.addIssue({ code: 'custom', message: 'Likes cannot exceed reactions' });
  }
});
const sourceInput = z.strictObject({
  source_type: z.enum(['facebook_ui', 'facebook_export', 'user_reported', 'other']),
  metric_definition_version: version,
  source_reported_at: timestamp.nullable().optional(),
  timezone: z.string().min(1).max(100).nullable().optional(),
  note: z.string().trim().min(1).max(500).regex(/^(?!.*(?:bearer\s|access_token|refresh_token|service_role))[^\p{Cc}]+$/iu).nullable().optional(),
});
const common = { request_schema_version: version, workspace_public_id: uuid };
const recordInput = z.strictObject({
  ...common, operation_key: uuid, post_public_id: uuid,
  captured_at: timestamp, metrics: inputMetrics, source: sourceInput,
});
const historyInput = z.strictObject({
  ...common, post_public_id: uuid,
  captured_from: timestamp.optional(), captured_to: timestamp.optional(),
  limit: z.number().int().min(1).max(100).optional(), cursor: cursor.optional(),
}).refine(m => !m.captured_from || !m.captured_to || Date.parse(m.captured_from) <= Date.parse(m.captured_to), 'Invalid observation range');
const dimension = z.enum(['topic', 'format', 'interaction_goal', 'profile', 'fact_count', 'hook_pattern', 'cta_pattern']);
const metric = z.enum(['views', 'reach', 'reactions', 'likes', 'comments', 'shares', 'saves', 'follows', 'watch_time_seconds', 'average_watch_time_seconds']);
const insightInput = z.strictObject({
  ...common, page_public_id: uuid,
  niche_key: z.string().regex(/^[a-z][a-z0-9_]{1,49}$/),
  captured_from: timestamp.optional(), captured_to: timestamp.optional(),
  dimensions: z.array(dimension).min(1).max(5).refine(x => new Set(x).size === x.length, 'Duplicate dimensions'),
  metric,
  minimum_sample_size: z.number().int().min(1).max(100).optional(),
  limit: z.number().int().min(1).max(50).optional(),
}).refine(m => !m.captured_from || !m.captured_to || Date.parse(m.captured_from) <= Date.parse(m.captured_to), 'Invalid observation range');
const allMetrics = z.strictObject(metricFields);
const signed = z.number().finite().nullable();
const deltaMetrics = z.strictObject({
  views: signed, reach: signed, reactions: signed, likes: signed,
  comments: signed, shares: signed, saves: signed, follows: signed,
  watch_time_seconds: signed, average_watch_time_seconds: signed,
});
const sourceRead = z.strictObject({
  source_type: z.enum(['facebook_ui', 'facebook_export', 'user_reported', 'other']).nullable(),
  metric_definition_version: version.nullable(),
  source_reported_at: timestamp.nullable(), timezone: z.string().nullable(),
  note: z.string().nullable(),
});
const snapshot = z.strictObject({
  metric_snapshot_public_id: uuid, post_public_id: uuid, captured_at: timestamp,
  metrics: allMetrics, source: sourceRead,
  anomaly_flags: z.array(z.string().max(100)).max(50), created_at: timestamp,
});
const envelope = <T extends z.ZodType>(data: T) =>
  z.strictObject({ response_schema_version: version, data });
const recordOutput = envelope(z.strictObject({
  metric_snapshot_public_id: uuid, post_public_id: uuid, captured_at: timestamp,
  metrics: allMetrics, anomaly_flags: z.array(z.string().max(100)).max(50),
  replayed: z.boolean(),
}));
const period = z.strictObject({ from: timestamp.nullable(), to: timestamp.nullable() });
const historyOutput = envelope(z.strictObject({
  post_public_id: uuid, observation_period: period,
  metric_definition_version: version.nullable(),
  snapshots: z.array(snapshot).max(100), latest_snapshot: snapshot.nullable(),
  compatible_deltas: z.array(z.strictObject({
    from_captured_at: timestamp, to_captured_at: timestamp, delta: deltaMetrics,
    negative_delta: z.boolean(), caveat: z.string().max(500),
  })).max(100),
  next_cursor: cursor.nullable(), has_more: z.boolean(),
}));
const dimensionValues = z.strictObject({
  topic: z.string().nullable().optional(), format: z.string().nullable().optional(),
  interaction_goal: z.string().nullable().optional(), profile: z.string().nullable().optional(),
  fact_count: count.nullable().optional(), hook_pattern: z.string().nullable().optional(),
  cta_pattern: z.string().nullable().optional(),
});
const numericSummary = z.strictObject({
  median: z.number().finite(), mean: z.number().finite(),
  min: z.number().finite(), max: z.number().finite(),
});
const insightsOutput = envelope(z.strictObject({
  scope: z.strictObject({ workspace_public_id: uuid, page_public_id: uuid, niche_key: z.string() }),
  observation_period: z.strictObject({
    requested_from: timestamp.nullable(), requested_to: timestamp.nullable(),
    observed_from: timestamp.nullable(), observed_to: timestamp.nullable(),
  }),
  metric_definition_version: version.nullable(),
  eligible_post_count: count, excluded_post_count: count,
  excluded_reasons: z.strictObject({
    not_published: count, no_snapshot_in_period: count, missing_metric: count,
    unknown_source_or_definition: count, missing_dimension: count, invalid_observation_age: count,
  }),
  groups: z.array(z.strictObject({
    dimension_values: dimensionValues, sample_size: count,
    age_distribution: z.strictObject({
      min_days: z.number().finite(), median_days: z.number().finite(),
      max_days: z.number().finite(),
    }),
    metric_summary: numericSummary.nullable(), observed_period: period,
    evidence_strength: z.enum(['insufficient', 'exploratory', 'notable']),
    caveats: z.array(z.string().min(1).max(500)).min(1).max(20),
  })).max(50),
}));
const securitySchemes = [{ type: 'oauth2', scopes: ['openid', 'email'] }];
const readAnnotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const writeAnnotations = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
export const POST_METRICS_TOOL_NAMES = ['record_post_performance', 'get_post_performance', 'get_performance_insights'] as const;

export function registerPostMetricsTools(server: McpServer, context?: RequestContext): void {
  if (!context) return;
  const scoped = context;
  server.registerTool('record_post_performance', {
    title: 'Record post performance',
    description: 'Use this when the user provides observed Facebook metrics for a posted or archived post. It appends one immutable snapshot and does not fetch or infer missing metrics.',
    inputSchema: recordInput, outputSchema: recordOutput, annotations: writeAnnotations,
    _meta: { securitySchemes },
  }, args => invoke('record_post_performance', scoped, {
    p_request_schema_version: args.request_schema_version, p_workspace_public_id: args.workspace_public_id,
    p_operation_key: args.operation_key, p_post_public_id: args.post_public_id,
    p_captured_at: args.captured_at, p_metrics: args.metrics, p_source: args.source,
  }, recordOutput));
  server.registerTool('get_post_performance', {
    title: 'Get post performance history',
    description: 'Use this to inspect metric snapshots and compatible deltas for one post. Cumulative snapshots are never summed.',
    inputSchema: historyInput, outputSchema: historyOutput, annotations: readAnnotations,
    _meta: { securitySchemes },
  }, args => invoke('get_post_performance', scoped, {
    p_request_schema_version: args.request_schema_version, p_workspace_public_id: args.workspace_public_id,
    p_post_public_id: args.post_public_id,
    ...(args.captured_from === undefined ? {} : { p_captured_from: args.captured_from }),
    ...(args.captured_to === undefined ? {} : { p_captured_to: args.captured_to }),
    p_limit: args.limit ?? 20,
    ...(args.cursor === undefined ? {} : { p_cursor: args.cursor }),
  }, historyOutput));
  server.registerTool('get_performance_insights', {
    title: 'Get performance insights',
    description: 'Use this to compare evidence-backed performance patterns for a Page and niche. It returns sample sizes and periods and never claims correlation is causation.',
    inputSchema: insightInput, outputSchema: insightsOutput, annotations: readAnnotations,
    _meta: { securitySchemes },
  }, args => invoke('get_performance_insights', scoped, {
    p_request_schema_version: args.request_schema_version, p_workspace_public_id: args.workspace_public_id,
    p_page_public_id: args.page_public_id, p_niche_key: args.niche_key,
    ...(args.captured_from === undefined ? {} : { p_captured_from: args.captured_from }),
    ...(args.captured_to === undefined ? {} : { p_captured_to: args.captured_to }),
    p_dimensions: args.dimensions, p_metric: args.metric,
    p_minimum_sample_size: args.minimum_sample_size ?? 5, p_limit: args.limit ?? 20,
  }, insightsOutput));
}
