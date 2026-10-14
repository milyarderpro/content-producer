import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { POST_BASE_TOOL_NAMES, registerPostBaseTools } from './post_base.ts';
import { POST_EDIT_TOOL_NAMES, registerPostEditTools } from './post_edit.ts';
import { POST_APPROVAL_TOOL_NAMES, registerPostApprovalTools } from './post_approval.ts';
import { POST_PUBLICATION_TOOL_NAMES, registerPostPublicationTools } from './post_publication.ts';
import { FOUNDATION_TOOL_NAMES, registerFoundationTools } from './foundation.ts';
import { PAGE_PLAN_TOOL_NAMES, registerPagePlanTools } from './page_plan.ts';
import { PLAN_CLAIM_TOOL_NAMES, registerPlanClaimTools } from './plan_claim.ts';

import { PLAN_RECOVERY_TOOL_NAMES, registerPlanRecoveryTools } from './plan_recovery.ts';
import { TRIVIA_FACT_TOOL_NAMES, registerTriviaFactTools } from './trivia_fact.ts';
import {
  TRIVIA_CORRECTION_TOOL_NAMES,
  registerTriviaCorrectionTools,
} from './trivia_correction.ts';

export const MCP_TOOL_COUNT =
  FOUNDATION_TOOL_NAMES.length +
  PAGE_PLAN_TOOL_NAMES.length +
  PLAN_CLAIM_TOOL_NAMES.length +
  PLAN_RECOVERY_TOOL_NAMES.length +
  TRIVIA_FACT_TOOL_NAMES.length +
  TRIVIA_CORRECTION_TOOL_NAMES.length +
  POST_BASE_TOOL_NAMES.length +
  POST_EDIT_TOOL_NAMES.length +
  POST_APPROVAL_TOOL_NAMES.length +
  POST_PUBLICATION_TOOL_NAMES.length;
export function registerTools(server: McpServer, context?: RequestContext): void {
  registerFoundationTools(server, context);
  registerPagePlanTools(server, context);
  registerPlanClaimTools(server, context);
  registerPlanRecoveryTools(server, context);
  registerTriviaFactTools(server, context);
  registerTriviaCorrectionTools(server, context);
  registerPostBaseTools(server, context);
  registerPostEditTools(server, context);
  registerPostApprovalTools(server, context);
  registerPostPublicationTools(server, context);
}
