// Supabase Edge Function entrypoint. OAuth is implemented in Phase 6.2.
import { handleHttpRequest } from './http.ts';

Deno.serve(handleHttpRequest);
