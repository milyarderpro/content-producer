import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { FOUNDATION_TOOL_NAMES, registerFoundationTools } from './foundation.ts';
import { PAGE_PLAN_TOOL_NAMES, registerPagePlanTools } from './page_plan.ts';
import { PLAN_CLAIM_TOOL_NAMES, registerPlanClaimTools } from './plan_claim.ts';

import { PLAN_RECOVERY_TOOL_NAMES, registerPlanRecoveryTools } from './plan_recovery.ts';

export const MCP_TOOL_COUNT =
  FOUNDATION_TOOL_NAMES.length +
  PAGE_PLAN_TOOL_NAMES.length +
  PLAN_CLAIM_TOOL_NAMES.length +
  PLAN_RECOVERY_TOOL_NAMES.length;
export function registerTools(server: McpServer, context?: RequestContext): void {
  registerFoundationTools(server, context);
  registerPagePlanTools(server, context);
  registerPlanClaimTools(server, context);
  registerPlanRecoveryTools(server, context);
}
