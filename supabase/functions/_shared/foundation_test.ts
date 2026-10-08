Deno.test('Deno runtime is available for future Supabase Edge Functions', () => {
  if (typeof Deno.version.deno !== 'string' || Deno.version.deno.length === 0) {
    throw new Error('Expected a Deno runtime version.');
  }
});
