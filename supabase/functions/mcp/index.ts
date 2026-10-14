// Supabase Edge Function entrypoint. OAuth middleware precedes user-auth middleware.
import { createEdgeHandler } from './edge.ts';

Deno.serve(createEdgeHandler());
