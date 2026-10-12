import { describe, expect, it } from 'vitest';

type Operation = {
  name: string;
  functionName: string;
  rateGroup: 'read' | 'expensive_read' | 'write' | 'contention_write';
  write: boolean;
  requiredGuards: string[];
  testOwner: string;
};

export const phaseFiveOperationMap: readonly Operation[] = [
  {
    name: 'get_account_profile',
    functionName: 'api.get_account_profile',
    rateGroup: 'read',
    write: false,
    requiredGuards: [],
    testOwner: 'api-read-rpcs.test.ts',
  },
  {
    name: 'get_workspace_context',
    functionName: 'api.get_workspace_context',
    rateGroup: 'read',
    write: false,
    requiredGuards: [],
    testOwner: 'api-read-rpcs.test.ts',
  },
  {
    name: 'list_pages',
    functionName: 'api.list_pages',
    rateGroup: 'read',
    write: false,
    requiredGuards: [],
    testOwner: 'api-read-rpcs.test.ts',
  },
  {
    name: 'create_page',
    functionName: 'api.create_page',
    rateGroup: 'write',
    write: true,
    requiredGuards: ['operation_key'],
    testOwner: 'api-page-plan-writes.test.ts',
  },
  {
    name: 'update_page',
    functionName: 'api.update_page',
    rateGroup: 'write',
    write: true,
    requiredGuards: [
      'operation_key',
      'expected_page_updated_at',
      'expected_config_updated_at when config changes',
    ],
    testOwner: 'api-page-plan-writes.test.ts',
  },
  {
    name: 'get_page_generation_context',
    functionName: 'api.get_page_generation_context',
    rateGroup: 'read',
    write: false,
    requiredGuards: [],
    testOwner: 'api-read-rpcs.test.ts',
  },
  {
    name: 'list_content_plans',
    functionName: 'api.list_content_plans',
    rateGroup: 'read',
    write: false,
    requiredGuards: [],
    testOwner: 'api-read-rpcs.test.ts',
  },
  {
    name: 'create_content_plan',
    functionName: 'api.create_content_plan',
    rateGroup: 'write',
    write: true,
    requiredGuards: ['operation_key'],
    testOwner: 'api-page-plan-writes.test.ts',
  },
  {
    name: 'get_content_plan',
    functionName: 'api.get_content_plan',
    rateGroup: 'read',
    write: false,
    requiredGuards: [],
    testOwner: 'api-read-rpcs.test.ts',
  },
  {
    name: 'claim_content_plan_items',
    functionName: 'api.claim_content_plan_items',
    rateGroup: 'contention_write',
    write: true,
    requiredGuards: ['operation_key'],
    testOwner: 'api-plan-lifecycle.test.ts',
  },
  {
    name: 'renew_content_plan_claim',
    functionName: 'api.renew_content_plan_claim',
    rateGroup: 'contention_write',
    write: true,
    requiredGuards: ['operation_key', 'claim_token'],
    testOwner: 'api-plan-lifecycle.test.ts',
  },
  {
    name: 'report_content_plan_item_failure',
    functionName: 'api.report_content_plan_item_failure',
    rateGroup: 'contention_write',
    write: true,
    requiredGuards: ['operation_key', 'claim_token'],
    testOwner: 'api-plan-lifecycle.test.ts',
  },
  {
    name: 'retry_content_plan_item',
    functionName: 'api.retry_content_plan_item',
    rateGroup: 'write',
    write: true,
    requiredGuards: ['operation_key'],
    testOwner: 'api-plan-lifecycle.test.ts',
  },
  {
    name: 'replace_discarded_plan_item',
    functionName: 'api.replace_discarded_plan_item',
    rateGroup: 'write',
    write: true,
    requiredGuards: ['operation_key', 'explicit_replacement'],
    testOwner: 'api-plan-lifecycle.test.ts',
  },
  {
    name: 'cancel_content_plan',
    functionName: 'api.cancel_content_plan',
    rateGroup: 'write',
    write: true,
    requiredGuards: ['operation_key', 'explicit_cancellation'],
    testOwner: 'api-plan-lifecycle.test.ts',
  },
  {
    name: 'trivia_find_similar_facts',
    functionName: 'api.trivia_find_similar_facts',
    rateGroup: 'expensive_read',
    write: false,
    requiredGuards: [],
    testOwner: 'api-trivia-rpcs.test.ts',
  },
  {
    name: 'trivia_register_and_reserve_facts',
    functionName: 'api.trivia_register_and_reserve_facts',
    rateGroup: 'contention_write',
    write: true,
    requiredGuards: ['operation_key', 'expected_config_updated_at'],
    testOwner: 'api-trivia-rpcs.test.ts',
  },
  {
    name: 'trivia_release_facts',
    functionName: 'api.trivia_release_facts',
    rateGroup: 'contention_write',
    write: true,
    requiredGuards: ['operation_key', 'reservation_token'],
    testOwner: 'api-trivia-rpcs.test.ts',
  },
  {
    name: 'trivia_reverify_fact',
    functionName: 'api.trivia_reverify_fact',
    rateGroup: 'write',
    write: true,
    requiredGuards: ['operation_key', 'expected_fact_updated_at'],
    testOwner: 'api-trivia-rpcs.test.ts',
  },
  {
    name: 'trivia_correct_fact',
    functionName: 'api.trivia_correct_fact',
    rateGroup: 'contention_write',
    write: true,
    requiredGuards: ['operation_key', 'expected_fact_updated_at', 'explicit_correction'],
    testOwner: 'api-trivia-rpcs.test.ts',
  },
  {
    name: 'list_posts',
    functionName: 'api.list_posts',
    rateGroup: 'read',
    write: false,
    requiredGuards: [],
    testOwner: 'api-read-rpcs.test.ts',
  },
  {
    name: 'get_post',
    functionName: 'api.get_post',
    rateGroup: 'read',
    write: false,
    requiredGuards: [],
    testOwner: 'api-read-rpcs.test.ts',
  },
  {
    name: 'save_post',
    functionName: 'api.save_post',
    rateGroup: 'contention_write',
    write: true,
    requiredGuards: [
      'operation_key',
      'reservation_token',
      'expected_config_updated_at',
      'claim_token when plan-bound',
    ],
    testOwner: 'api-post-save-revise.test.ts',
  },
  {
    name: 'revise_post',
    functionName: 'api.revise_post',
    rateGroup: 'contention_write',
    write: true,
    requiredGuards: ['operation_key', 'expected_revision', 'expected_content_hash'],
    testOwner: 'api-post-save-revise.test.ts',
  },
  {
    name: 'reschedule_post',
    functionName: 'api.reschedule_post',
    rateGroup: 'write',
    write: true,
    requiredGuards: ['operation_key', 'expected_revision'],
    testOwner: 'api-post-reschedule.test.ts',
  },
  {
    name: 'approve_post',
    functionName: 'api.approve_post',
    rateGroup: 'write',
    write: true,
    requiredGuards: [
      'operation_key',
      'expected_revision',
      'expected_content_hash',
      'explicit_approval',
    ],
    testOwner: 'api-post-lifecycle.test.ts',
  },
  {
    name: 'revoke_post_approval',
    functionName: 'api.revoke_post_approval',
    rateGroup: 'write',
    write: true,
    requiredGuards: [
      'operation_key',
      'expected_revision',
      'expected_content_hash',
      'explicit_revocation',
    ],
    testOwner: 'api-post-lifecycle.test.ts',
  },
  {
    name: 'discard_post',
    functionName: 'api.discard_post',
    rateGroup: 'contention_write',
    write: true,
    requiredGuards: ['operation_key', 'expected_revision', 'explicit_discard'],
    testOwner: 'api-post-lifecycle.test.ts',
  },
  {
    name: 'mark_post_posted',
    functionName: 'api.mark_post_posted',
    rateGroup: 'contention_write',
    write: true,
    requiredGuards: [
      'operation_key',
      'expected_revision',
      'expected_content_hash',
      'explicit_publication_confirmation',
    ],
    testOwner: 'api-post-lifecycle.test.ts',
  },
  {
    name: 'archive_post',
    functionName: 'api.archive_post',
    rateGroup: 'write',
    write: true,
    requiredGuards: ['operation_key', 'expected_revision', 'explicit_archive'],
    testOwner: 'api-post-lifecycle.test.ts',
  },
  {
    name: 'record_post_performance',
    functionName: 'api.record_post_performance',
    rateGroup: 'write',
    write: true,
    requiredGuards: ['operation_key'],
    testOwner: 'api-metrics.test.ts',
  },
  {
    name: 'get_post_performance',
    functionName: 'api.get_post_performance',
    rateGroup: 'read',
    write: false,
    requiredGuards: [],
    testOwner: 'api-read-rpcs.test.ts',
  },
  {
    name: 'get_performance_insights',
    functionName: 'api.get_performance_insights',
    rateGroup: 'expensive_read',
    write: false,
    requiredGuards: [],
    testOwner: 'api-read-rpcs.test.ts',
  },
];

describe('Phase 5 operation map', () => {
  it('keeps the frozen 33-operation inventory machine-readable', () => {
    expect(phaseFiveOperationMap).toHaveLength(33);
    expect(new Set(phaseFiveOperationMap.map((operation) => operation.name)).size).toBe(33);
    expect(new Set(phaseFiveOperationMap.map((operation) => operation.functionName)).size).toBe(33);
    expect(phaseFiveOperationMap.filter((operation) => operation.write)).toHaveLength(22);
    expect(phaseFiveOperationMap.filter((operation) => !operation.write)).toHaveLength(11);
    expect(
      phaseFiveOperationMap
        .filter((operation) => operation.requiredGuards.length === 0)
        .map((operation) => operation.name),
    ).toEqual([
      'get_account_profile',
      'get_workspace_context',
      'list_pages',
      'get_page_generation_context',
      'list_content_plans',
      'get_content_plan',
      'trivia_find_similar_facts',
      'list_posts',
      'get_post',
      'get_post_performance',
      'get_performance_insights',
    ]);
  });
});
