// CR-039: the explicitly owner-accepted public No-auth MVP pilot write policy.
// This is NOT caller authentication. Workspace identity is derived server-side
// from MCP_OWNER_USER_ID via the authenticated/RLS local-transaction adapter.
// Do not accept a workspace or identity from HTTP as authoritative.
const uuid4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const reads = new Set([
  'get_account_profile', 'get_workspace_context', 'list_pages',
  'get_page_generation_context', 'list_content_plans',
  'get_content_plan', 'list_posts', 'get_post',
  'trivia_find_similar_facts', 'get_post_performance',
  'get_performance_insights',
]);

/** Extra MCP boundary, not a substitute for Phase 5 RPC validation/RLS. */
export function isPermittedMvpPilotRpc(
  tool: string,
  workspacePublicId: string | null,
  params: Record<string, unknown>,
): boolean {
  if (reads.has(tool)) return true; // Profile read has no workspace argument.
  if (!workspacePublicId || params.p_workspace_public_id !== workspacePublicId) return false;
  return (
    params.p_request_schema_version === 1 &&
    typeof params.p_operation_key === 'string' &&
    uuid4.test(params.p_operation_key)
  );
}
