// Supabase Edge Function entrypoint. OAuth is required before MCP transport.
import { handleHttpRequest } from './http.ts';
Deno.serve((request) => handleHttpRequest(request));
